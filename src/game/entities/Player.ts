import {
  MOVE_SPEED, JUMP_VEL, JUMP_CUT_VY, DOUBLE_JUMP_VEL,
  GRAVITY_UP, GRAVITY_DOWN, MAX_FALL,
  COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  DASH_SPEED, DASH_FRAMES, DASH_COOLDOWN_FRAMES,
  LEDGE_ASSIST_UP_PX, LEDGE_ASSIST_DOWN_PX,
  PLAYER_W, PLAYER_H, PLAYER_DRAW_H,
} from '../constants';
import type { Rect, InputState, SpriteSheet, AnimState } from '../types';

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  grounded = false;
  facingLeft = true;   // sprites face LEFT by default

  animState: AnimState = 'idle';
  animFrame = 0;
  animTimer = 0;

  private coyoteTimer = 0;
  private jumpBuffer = 0;
  private doubleJumpAvailable = false;
  private dashTimer = 0;
  private dashCooldown = 0;
  private airDashAvailable = true;
  private dashDir = -1;

  sprites: Partial<Record<string, SpriteSheet>> = {};

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(input: InputState, colliders: Rect[]) {
    if (this.dashCooldown > 0) this.dashCooldown--;

    if (this.grounded) {
      this.airDashAvailable = true;
    }

    if (input.dashJustPressed && this.dashTimer === 0 && this.dashCooldown === 0) {
      const canDash = this.grounded || this.airDashAvailable;
      if (canDash) {
        if (!this.grounded) this.airDashAvailable = false;
        this.dashDir = input.left ? -1 : input.right ? 1 : (this.facingLeft ? -1 : 1);
        this.dashTimer = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN_FRAMES;
        this.vy = 0;
      }
    }

    // ── Horizontal movement ────────────────────────────────────────────────
    if (this.dashTimer > 0) {
      this.vx = this.dashDir * DASH_SPEED;
      this.facingLeft = this.dashDir < 0;
      this.dashTimer--;
    } else if (input.left) {
      this.vx = -MOVE_SPEED;
      this.facingLeft = true;
    } else if (input.right) {
      this.vx = MOVE_SPEED;
      this.facingLeft = false;
    } else {
      this.vx = 0;
    }

    // ── Coyote time (allows jumping just after walking off an edge) ────────
    if (this.grounded) {
      this.coyoteTimer = COYOTE_FRAMES;
      this.doubleJumpAvailable = true;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    // ── Jump buffer (queues jump if pressed slightly before landing) ───────
    if (input.jumpJustPressed) {
      this.jumpBuffer = JUMP_BUFFER_FRAMES;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
    }

    // ── Jump logic ─────────────────────────────────────────────────────────
    if (input.jumpJustPressed && this.dashTimer === 0) {
      if (this.coyoteTimer > 0) {
        // First jump (ground or coyote)
        this.vy = JUMP_VEL;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
      } else if (this.doubleJumpAvailable) {
        // Double jump: triggered by a fresh press while in the air
        this.vy = DOUBLE_JUMP_VEL;
        this.doubleJumpAvailable = false;
        this.jumpBuffer = 0;
      }
    }

    // ── Variable jump height (jump cut on early release) ───────────────────
    if (this.dashTimer === 0 && !input.jump && this.vy < JUMP_CUT_VY) {
      this.vy = JUMP_CUT_VY;
    }

    // ── Gravity (asymmetric: lighter up, heavier down) ─────────────────────
    if (this.dashTimer === 0) {
      const grav = this.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
      this.vy = Math.min(this.vy + grav, MAX_FALL);
    }

    // Fast fall
    if (this.dashTimer === 0 && input.down && !this.grounded && this.vy > 0) {
      this.vy = Math.min(this.vy + 0.6, MAX_FALL);
    }

    // ── Collision resolution ───────────────────────────────────────────────
    this.resolveCollisions(colliders);

    // ── Animation state machine ────────────────────────────────────────────
    const newState: AnimState = !this.grounded
      ? (this.vy < 0 ? 'jump' : 'fall')
      : (Math.abs(this.vx) > 0.1 ? 'run' : 'idle');

    if (newState !== this.animState) {
      this.animState = newState;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    // ── Advance animation frame ────────────────────────────────────────────
    const spriteKey = this.animState === 'fall' ? 'jump' : this.animState;
    const sheet = this.sprites[spriteKey];
    if (sheet) {
      this.animTimer++;
      const interval = Math.max(1, Math.round(60 / sheet.fps));
      if (this.animTimer >= interval) {
        this.animTimer = 0;
        if (this.animState === 'fall') {
          // Hold in the latter half of the jump sheet
          const fallStart = Math.floor(sheet.frames * 0.57);
          const fallEnd = Math.max(fallStart, sheet.frames - 2);
          this.animFrame = Math.min(this.animFrame + 1, fallEnd);
          if (this.animFrame < fallStart) this.animFrame = fallStart;
        } else {
          // Loop: idle and run both cycle all frames continuously
          this.animFrame = (this.animFrame + 1) % sheet.frames;
        }
      }
    }
  }

  private resolveCollisions(colliders: Rect[]) {
    let usedLedgeAssist = false;

    // ── X ──────────────────────────────────────────────────────────────────
    this.x += this.vx;
    for (const r of colliders) {
      if (!this.overlaps(r)) continue;
      if (this.tryLedgeAssist(r, colliders)) {
        usedLedgeAssist = true;
        break;
      }
      if (this.vx > 0) this.x = r.x - PLAYER_W;
      else if (this.vx < 0) this.x = r.x + r.w;
      this.vx = 0;
    }

    if (usedLedgeAssist) {
      this.grounded = true;
      this.vy = 0;
      return;
    }

    // ── Y ──────────────────────────────────────────────────────────────────
    this.grounded = false;
    this.y += this.vy;
    for (const r of colliders) {
      if (!this.overlaps(r)) continue;
      if (this.vy >= 0) {
        this.y = r.y - PLAYER_H;
        this.grounded = true;
      } else {
        this.y = r.y + r.h;
      }
      this.vy = 0;
    }
  }

  private overlaps(r: Rect): boolean {
    return (
      this.x < r.x + r.w &&
      this.x + PLAYER_W > r.x &&
      this.y < r.y + r.h &&
      this.y + PLAYER_H > r.y
    );
  }

  private tryLedgeAssist(hit: Rect, colliders: Rect[]): boolean {
    if (this.vx === 0) return false;
    if (this.vy > 6) return false; // too fast downward -> do not auto-climb

    const playerBottom = this.y + PLAYER_H;
    const topDelta = playerBottom - hit.y;

    // Must be near the top edge of the obstacle.
    if (topDelta < -LEDGE_ASSIST_DOWN_PX || topDelta > LEDGE_ASSIST_UP_PX) return false;

    const targetY = hit.y - PLAYER_H;
    if (!this.canStandAt(this.x, targetY, colliders, hit)) return false;

    this.y = targetY;
    return true;
  }

  private canStandAt(x: number, y: number, colliders: Rect[], ignore: Rect): boolean {
    for (const r of colliders) {
      if (r === ignore) continue;
      if (
        x < r.x + r.w &&
        x + PLAYER_W > r.x &&
        y < r.y + r.h &&
        y + PLAYER_H > r.y
      ) return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const spriteKey = this.animState === 'fall' ? 'jump' : this.animState;
    const sheet = this.sprites[spriteKey];

    if (!sheet) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.x - camX, this.y - camY, PLAYER_W, PLAYER_H);
      return;
    }

    let frame = this.animFrame;
    if (this.animState === 'fall') {
      frame = Math.max(Math.floor(sheet.frames * 0.6), frame);
      frame = Math.min(frame, Math.max(0, sheet.frames - 2));
    }

    const sx    = frame * sheet.frameW;
    const scale = PLAYER_DRAW_H / sheet.frameH;
    const dw    = sheet.frameW * scale;
    const dh    = PLAYER_DRAW_H;
    const screenX = this.x - camX;
    const screenY = this.y - camY - (PLAYER_DRAW_H - PLAYER_H);

    // Sprites face LEFT by default — flip when facing right
    ctx.save();
    if (!this.facingLeft) {
      ctx.translate(screenX + PLAYER_W / 2, screenY);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet.canvas, sx, 0, sheet.frameW, sheet.frameH,
        -dw / 2, 0, dw, dh);
    } else {
      ctx.drawImage(sheet.canvas, sx, 0, sheet.frameW, sheet.frameH,
        screenX + PLAYER_W / 2 - dw / 2, screenY, dw, dh);
    }
    ctx.restore();
  }
}
