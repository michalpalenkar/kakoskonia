import {
  MOVE_SPEED, JUMP_VEL, JUMP_CUT_VY, DOUBLE_JUMP_VEL,
  GRAVITY_UP, GRAVITY_DOWN, MAX_FALL,
  COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  DASH_SPEED, DASH_FRAMES, DASH_COOLDOWN_FRAMES,
  LEDGE_ASSIST_UP_PX, LEDGE_ASSIST_DOWN_PX,
  PLAYER_W, PLAYER_H, PLAYER_DRAW_H,
} from '../constants';
import type { Rect, InputState, SpriteSheet, AnimState } from '../types';

const WATER_MOVE_FACTOR = 0.6;
const WATER_SINK_SPEED = 2.5;
const WATER_MAX_FALL = 4;
const WATER_JUMP_VEL = -10;
const CROUCH_H = 64;
const CROUCH_W = 56;
const FORWARD_JUMP_SPEED_THRESHOLD = 0.8;
const FALL_LAND_SPLIT = 0.57;
const VERTICAL_JUMP_SPLIT = 0.5;
const FORWARD_JUMP_SPLIT = 0.5;
const FORWARD_JUMP_CROUCH_FRAMES = 3;
const LEDGE_ANIM_FRAMES = 11;
const LEDGE_SPRITE_FACES_LEFT = false;

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  grounded = false;
  facingLeft = true;   // sprites face LEFT by default
  health = 5;
  maxHealth = 5;
  inWater = false;
  onWaterSurface = false;

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
  private knockbackFrames = 0;
  private knockbackVx = 0;
  private airborneFromJump = false;
  private jumpTakeoffType: 'vertical' | 'forward' | null = null;
  private forwardJumpCrouchTimer = 0;
  private hitboxW = PLAYER_W;
  private hitboxH = PLAYER_H;
  private ledgeTimer = 0;
  private ledgeTarget: { x: number; y: number } | null = null;

  sprites: Partial<Record<string, SpriteSheet>> = {};

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(input: InputState, colliders: Rect[], waterRects: Rect[] = []) {
    if (this.ledgeTimer > 0) {
      this.ledgeTimer--;
      this.vx = 0;
      this.vy = 0;
      this.grounded = false;
      if (this.animState !== 'ledge') {
        this.animState = 'ledge';
        this.animFrame = 0;
        this.animTimer = 0;
      }
      this.updateLedgeFrame();
      if (this.ledgeTimer <= 0 && this.ledgeTarget) {
        this.x = this.ledgeTarget.x;
        this.y = this.ledgeTarget.y;
        this.ledgeTarget = null;
        this.grounded = true;
        this.airborneFromJump = false;
        this.jumpTakeoffType = null;
        this.forwardJumpCrouchTimer = 0;
        this.animState = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
      }
      return;
    }

    this.updateCrouchState(colliders);

    // ── Water detection ─────────────────────────────────────────────────────
    this.inWater = false;
    this.onWaterSurface = false;
    for (const wr of waterRects) {
      if (this.overlapsRect(wr)) {
        this.inWater = true;
        // Surface = player's vertical center is above the water rect top + half tile
        const playerMidY = this.y + this.hitboxH / 2;
        if (playerMidY <= wr.y + this.hitboxH * 0.4) {
          this.onWaterSurface = true;
        }
        break;
      }
    }

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
    const moveSpeed = this.inWater ? MOVE_SPEED * WATER_MOVE_FACTOR : MOVE_SPEED;
    if (this.knockbackFrames > 0) {
      this.vx = this.knockbackVx;
      this.knockbackFrames--;
    } else if (this.dashTimer > 0 && !this.inWater) {
      this.vx = this.dashDir * DASH_SPEED;
      this.facingLeft = this.dashDir < 0;
      this.dashTimer--;
    } else if (input.left) {
      this.vx = -moveSpeed;
      this.facingLeft = true;
    } else if (input.right) {
      this.vx = moveSpeed;
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
      if (this.inWater) {
        // In water: only jump when on surface
        if (this.onWaterSurface) {
          this.vy = WATER_JUMP_VEL;
          this.airborneFromJump = true;
          this.jumpTakeoffType = Math.abs(this.vx) > FORWARD_JUMP_SPEED_THRESHOLD ? 'forward' : 'vertical';
          this.forwardJumpCrouchTimer = this.jumpTakeoffType === 'forward' ? FORWARD_JUMP_CROUCH_FRAMES : 0;
          this.jumpBuffer = 0;
        }
      } else if (this.coyoteTimer > 0) {
        // First jump (ground or coyote)
        this.vy = JUMP_VEL;
        this.airborneFromJump = true;
        this.jumpTakeoffType = Math.abs(this.vx) > FORWARD_JUMP_SPEED_THRESHOLD ? 'forward' : 'vertical';
        this.forwardJumpCrouchTimer = this.jumpTakeoffType === 'forward' ? FORWARD_JUMP_CROUCH_FRAMES : 0;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
      } else if (this.doubleJumpAvailable) {
        // Double jump: triggered by a fresh press while in the air
        this.vy = DOUBLE_JUMP_VEL;
        this.airborneFromJump = true;
        this.jumpTakeoffType = Math.abs(this.vx) > FORWARD_JUMP_SPEED_THRESHOLD ? 'forward' : 'vertical';
        this.forwardJumpCrouchTimer = this.jumpTakeoffType === 'forward' ? FORWARD_JUMP_CROUCH_FRAMES : 0;
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
      if (this.inWater) {
        // In water: slow sink, dampen upward velocity
        if (this.vy < 0) {
          this.vy = Math.min(this.vy + GRAVITY_UP * 1.5, 0);
        } else {
          this.vy = Math.min(this.vy + 0.15, WATER_SINK_SPEED);
        }
        // Swim up with up key
        if (input.jump && !input.jumpJustPressed) {
          this.vy = Math.max(this.vy - 0.6, -WATER_MAX_FALL);
        }
        // Swim down with down key
        if (input.down) {
          this.vy = Math.min(this.vy + 0.4, WATER_MAX_FALL);
        }
      } else {
        const grav = this.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
        this.vy = Math.min(this.vy + grav, MAX_FALL);
      }
    }

    // Fast fall (not in water)
    if (this.dashTimer === 0 && !this.inWater && input.down && !this.grounded && this.vy > 0) {
      this.vy = Math.min(this.vy + 0.6, MAX_FALL);
    }

    const wasGrounded = this.grounded;
    const wasFalling = this.vy > 0;

    // ── Collision resolution ───────────────────────────────────────────────
    this.resolveCollisions(colliders, input);
    const justLanded = !wasGrounded && this.grounded && wasFalling;
    const landedFromJump = justLanded && this.airborneFromJump;

    // ── Animation state machine ────────────────────────────────────────────
    let newState: AnimState;
    if (landedFromJump) {
      newState = 'land';
    } else if (!this.grounded) {
      newState = this.vy < 0 ? 'jump' : 'fall';
    } else if (this.animState === 'land') {
      newState = 'land';
    } else {
      newState = Math.abs(this.vx) > 0.1 ? 'run' : 'idle';
    }

    if (newState !== this.animState) {
      this.animState = newState;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    if (this.grounded && this.animState !== 'land') {
      this.airborneFromJump = false;
      this.jumpTakeoffType = null;
      this.forwardJumpCrouchTimer = 0;
    }

    // ── Advance animation frame ────────────────────────────────────────────
    const spriteKey = this.getSpriteKeyForAnim();
    const sheet = this.sprites[spriteKey];
    if (sheet) {
      if (this.animFrame >= sheet.frames) this.animFrame = this.animFrame % sheet.frames;
      this.animTimer++;
      const interval = Math.max(1, Math.round(60 / sheet.fps));
      if (this.animTimer >= interval) {
        this.animTimer = 0;
        if (this.animState === 'fall') {
          if (spriteKey === 'jumpVertical') {
            // Vertical jump descending phase: second part of vertical_jump sequence.
            const split = this.getVerticalJumpSplit(sheet.frames);
            if (this.animFrame < split) this.animFrame = split;
            else this.animFrame = Math.min(this.animFrame + 1, Math.max(0, sheet.frames - 1));
          } else {
            // In-air falling uses the first sequence only.
            const split = this.getFallLandSplit(sheet.frames);
            const fallEnd = Math.max(0, split - 1);
            this.animFrame = Math.min(this.animFrame + 1, fallEnd);
          }
        } else if (this.animState === 'jump' && spriteKey === 'jumpVertical') {
          // Vertical jump rising phase: first part only.
          const split = this.getVerticalJumpSplit(sheet.frames);
          const riseEnd = Math.max(0, split - 1);
          this.animFrame = Math.min(this.animFrame + 1, riseEnd);
        } else if (this.animState === 'jump' && spriteKey === 'jumpForward') {
          // Forward jump rising phase:
          // brief crouch (first phase) only right after jump press, then second phase.
          const split = this.getForwardJumpSplit(sheet.frames);
          const glideFrame = Math.min(split, Math.max(0, sheet.frames - 1));
          if (this.forwardJumpCrouchTimer > 0) {
            this.forwardJumpCrouchTimer--;
            this.animFrame = 0;
          } else {
            this.animFrame = glideFrame;
          }
        } else if (this.animState === 'land') {
          // Landing crouch uses the second sequence only, once.
          const split = this.getFallLandSplit(sheet.frames);
          const landStart = Math.min(split, Math.max(0, sheet.frames - 1));
          if (this.animFrame < landStart) this.animFrame = landStart;
          else if (this.animFrame < sheet.frames - 1) this.animFrame++;
          else this.animState = Math.abs(this.vx) > 0.1 ? 'run' : 'idle';
        } else {
          // Loop: idle/run/jump cycle all frames continuously.
          this.animFrame = (this.animFrame + 1) % sheet.frames;
        }
      }
    }
  }

  private resolveCollisions(colliders: Rect[], input: InputState) {
    let usedLedgeAssist = false;

    // ── X ──────────────────────────────────────────────────────────────────
    this.x += this.vx;
    for (const r of colliders) {
      if (!this.overlaps(r)) continue;
      if (this.tryLedgeAssist(r, colliders, input)) {
        usedLedgeAssist = true;
        break;
      }
      if (this.tryAutoCrouch(colliders, r)) continue;
      if (this.vx > 0) this.x = r.x - this.hitboxW;
      else if (this.vx < 0) this.x = r.x + r.w;
      this.vx = 0;
    }

    if (usedLedgeAssist) {
      this.vy = 0;
      return;
    }

    // ── Y ──────────────────────────────────────────────────────────────────
    this.grounded = false;
    this.y += this.vy;
    for (const r of colliders) {
      if (!this.overlaps(r)) continue;
      if (this.vy >= 0) {
        this.y = r.y - this.hitboxH;
        this.grounded = true;
      } else {
        this.y = r.y + r.h;
      }
      this.vy = 0;
    }
  }

  overlapsRect(r: Rect): boolean {
    return (
      this.x < r.x + r.w &&
      this.x + this.hitboxW > r.x &&
      this.y < r.y + r.h &&
      this.y + this.hitboxH > r.y
    );
  }

  private overlaps(r: Rect): boolean {
    return (
      this.x < r.x + r.w &&
      this.x + this.hitboxW > r.x &&
      this.y < r.y + r.h &&
      this.y + this.hitboxH > r.y
    );
  }

  private tryLedgeAssist(hit: Rect, colliders: Rect[], input: InputState): boolean {
    if (this.vx === 0) return false;
    if (this.grounded) return false;
    if (!this.airborneFromJump) return false;
    if (this.vy > 6) return false; // too fast downward -> do not auto-climb

    const climbDir = this.vx > 0 ? 1 : -1;
    if ((climbDir > 0 && !input.right) || (climbDir < 0 && !input.left)) return false;

    // Only allow ledge grab when jump is not high enough to cleanly overfly the top.
    const targetY = hit.y - this.hitboxH;
    if (this.y <= targetY + 2) return false;
    // If still strongly rising, keep normal jump arc instead of forcing ledge.
    if (this.vy < -1.8) return false;

    const playerBottom = this.y + this.hitboxH;
    const topDelta = playerBottom - hit.y;

    // Must be near the top edge of the obstacle.
    if (topDelta < -LEDGE_ASSIST_DOWN_PX || topDelta > LEDGE_ASSIST_UP_PX) return false;

    const edgeInset = 4;
    const targetX = climbDir > 0
      ? hit.x + edgeInset
      : hit.x + hit.w - this.hitboxW - edgeInset;
    if (!this.canStandAt(targetX, targetY, colliders, hit)) return false;

    this.ledgeTarget = { x: targetX, y: targetY };
    this.ledgeTimer = LEDGE_ANIM_FRAMES;
    this.vx = 0;
    this.vy = 0;
    this.facingLeft = climbDir < 0;
    this.animState = 'ledge';
    this.animFrame = 0;
    this.animTimer = 0;
    return true;
  }

  private canStandAt(x: number, y: number, colliders: Rect[], ignore: Rect): boolean {
    for (const r of colliders) {
      if (r === ignore) continue;
      if (
        x < r.x + r.w &&
        x + this.hitboxW > r.x &&
        y < r.y + r.h &&
        y + this.hitboxH > r.y
      ) return false;
    }
    return true;
  }

  private updateCrouchState(colliders: Rect[]) {
    if (this.hitboxW >= PLAYER_W && this.hitboxH >= PLAYER_H) return;
    const desiredX = this.x + (this.hitboxW - PLAYER_W) / 2;
    const desiredY = this.y - (PLAYER_H - this.hitboxH);
    if (!this.collidesAt(desiredX, desiredY, PLAYER_W, PLAYER_H, colliders)) {
      this.x = desiredX;
      this.y = desiredY;
      this.hitboxW = PLAYER_W;
      this.hitboxH = PLAYER_H;
    }
  }

  private tryAutoCrouch(colliders: Rect[], ignore: Rect): boolean {
    if (this.hitboxW <= CROUCH_W && this.hitboxH <= CROUCH_H) return false;
    const centerX = this.x + this.hitboxW / 2;
    const bottomY = this.y + this.hitboxH;
    const crouchX = centerX - CROUCH_W / 2;
    const crouchY = bottomY - CROUCH_H;
    if (this.collidesAt(crouchX, crouchY, CROUCH_W, CROUCH_H, colliders, ignore)) return false;
    this.x = crouchX;
    this.y = crouchY;
    this.hitboxW = CROUCH_W;
    this.hitboxH = CROUCH_H;
    return true;
  }

  private collidesAt(x: number, y: number, w: number, h: number, colliders: Rect[], ignore?: Rect): boolean {
    for (const r of colliders) {
      if (r === ignore) continue;
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const spriteKey = this.getSpriteKeyForAnim();
    const sheet = this.sprites[spriteKey];

    if (!sheet) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.x - camX, this.y - camY, this.hitboxW, this.hitboxH);
      return;
    }

    let frame = this.animFrame % Math.max(1, sheet.frames);
    if (this.animState === 'fall') {
      if (spriteKey === 'jumpVertical') {
        frame = Math.max(this.getVerticalJumpSplit(sheet.frames), frame);
      } else {
        frame = Math.min(frame, Math.max(0, this.getFallLandSplit(sheet.frames) - 1));
      }
    } else if (this.animState === 'ledge') {
      frame = Math.min(frame, Math.max(0, sheet.frames - 1));
    } else if (this.animState === 'jump' && spriteKey === 'jumpVertical') {
      frame = Math.min(frame, Math.max(0, this.getVerticalJumpSplit(sheet.frames) - 1));
    } else if (this.animState === 'jump' && spriteKey === 'jumpForward') {
      const split = this.getForwardJumpSplit(sheet.frames);
      frame = this.forwardJumpCrouchTimer > 0 ? 0 : Math.min(split, Math.max(0, sheet.frames - 1));
    } else if (this.animState === 'land') {
      frame = Math.max(this.getFallLandSplit(sheet.frames), frame);
      frame = Math.min(frame, Math.max(0, sheet.frames - 1));
    }

    const sx = frame * sheet.frameW;
    const sizeMul = spriteKey === 'ledge'
      ? 1.2
      : (spriteKey === 'jumpVertical' || spriteKey === 'jumpForward' || spriteKey === 'fall') ? 1.3 : 1;
    const drawH = PLAYER_DRAW_H * sizeMul;
    const scale = drawH / sheet.frameH;
    const dw = sheet.frameW * scale;
    const dh = drawH;
    const screenX = this.x - camX;
    const topOffset = spriteKey === 'ledge' ? drawH * -0.14 : 0;
    const screenY = this.y - camY - (drawH - this.hitboxH) - topOffset;
    const ledgeOffsetX = spriteKey === 'ledge' ? (this.facingLeft ? -dw * 0.2 : dw * 0.2) : 0;
    const landOffsetX = this.animState === 'land' ? (this.facingLeft ? 10 : -10) : 0;
    const centerX = screenX + this.hitboxW / 2 + ledgeOffsetX + landOffsetX;

    // Most sprites face LEFT by default.
    // Ledge sprite has its own authored facing direction.
    const spriteFacesLeft = spriteKey === 'ledge' ? LEDGE_SPRITE_FACES_LEFT : true;
    const shouldFlip = spriteFacesLeft ? !this.facingLeft : this.facingLeft;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (shouldFlip) {
      ctx.translate(centerX, screenY);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet.canvas, sx, 0, sheet.frameW, sheet.frameH,
        -dw / 2, 0, dw, dh);
    } else {
      ctx.drawImage(sheet.canvas, sx, 0, sheet.frameW, sheet.frameH,
        centerX - dw / 2, screenY, dw, dh);
    }
    ctx.restore();
  }

  applyKnockback(direction: -1 | 1, horizontalSpeed: number, verticalSpeed: number, frames: number) {
    this.knockbackVx = direction * Math.abs(horizontalSpeed);
    this.knockbackFrames = Math.max(1, Math.floor(frames));
    this.vy = verticalSpeed;
    this.airborneFromJump = false;
    this.jumpTakeoffType = null;
    this.forwardJumpCrouchTimer = 0;
    this.grounded = false;
  }

  getHitboxWidth() {
    return this.hitboxW;
  }

  getHitboxHeight() {
    return this.hitboxH;
  }

  private getSpriteKeyForAnim(): string {
    if (this.animState === 'ledge') return 'ledge';
    if (this.animState === 'land') return 'fall';
    if (this.animState === 'jump') return 'jumpForward';
    if (this.animState === 'fall') return 'fall';
    return this.animState;
  }

  private updateLedgeFrame() {
    const sheet = this.sprites.ledge;
    if (!sheet) return;
    const half = Math.ceil(LEDGE_ANIM_FRAMES / 2);
    this.animFrame = this.ledgeTimer > half ? 0 : Math.min(1, sheet.frames - 1);
  }

  private getFallLandSplit(frames: number): number {
    if (frames <= 1) return 0;
    return Math.max(1, Math.min(frames - 1, Math.floor(frames * FALL_LAND_SPLIT)));
  }

  private getVerticalJumpSplit(frames: number): number {
    if (frames <= 1) return 0;
    return Math.max(1, Math.min(frames - 1, Math.floor(frames * VERTICAL_JUMP_SPLIT)));
  }

  private getForwardJumpSplit(frames: number): number {
    if (frames <= 1) return 0;
    return Math.max(1, Math.min(frames - 1, Math.floor(frames * FORWARD_JUMP_SPLIT)));
  }
}
