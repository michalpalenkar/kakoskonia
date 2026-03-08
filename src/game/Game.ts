import { Player } from './entities/Player';
import { Camera } from './Camera';
import { TileMap } from './TileMap';
import { PLAYER_H } from './constants';
import { TILE_DSP as TILE_SIZE } from './AutoTile';
import { loadImage, loadSpriteTransparent } from './spriteUtils';
import type { InputState, SpriteSheet } from './types';
import type { LevelData } from './levels';
import { ENEMY_BY_ID, type EnemyTypeId } from './enemyDefinitions';
import { ELEMENT_ASSETS } from './elementDefinitions';

const healthBarUrl = new URL('../assets/health-bar.png',         import.meta.url).href;

const BG_PRESETS: Record<string, string> = {
  bg: new URL('../assets/bg/bg.png', import.meta.url).href,
  'bg-kedy-pucdej': new URL('../assets/bg/bg-kedy-pucdej.png', import.meta.url).href,
  'bg-kedy-pucdej-watercolor': new URL('../assets/bg/kedy pucdej pozadie1.png', import.meta.url).href,
};
const BGM_PRESETS: Record<string, string> = {
  'kedy-pucdej': `${import.meta.env.BASE_URL}music/kedy-pucdej.mp3`,
  dunaj: `${import.meta.env.BASE_URL}music/Dunaj.mp3`,
  hlavacikova: `${import.meta.env.BASE_URL}music/Hlavacikova.mp3`,
};
const BG_FALLBACK_COLOR = '#334863';
const tilemapUrl = new URL('../assets/kakoskonia_tilemap.png', import.meta.url).href;
const idleUrl    = new URL('../assets/steady-sprite.png',      import.meta.url).href;
const runUrl     = new URL('../assets/run-sprite.png',         import.meta.url).href;
const verticalJumpUrl = new URL('../assets/vertical_jump2.png', import.meta.url).href;
const forwardJumpUrl = new URL('../assets/forward_jump_sprite.png', import.meta.url).href;
const fallUrl    = new URL('../assets/fall_sprite.png',        import.meta.url).href;

/** Camera zoom — 1.25× makes the player appear 25% larger */
const ZOOM = 1.25;
const FIXED_DT = 1 / 60;

interface RuntimeElement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  img: HTMLImageElement;
}

interface SkyCloud {
  x01: number;
  y01: number;
  w01: number;
  h01: number;
  speed: number;
  alpha: number;
}

interface RuntimeEnemy {
  type: EnemyTypeId;
  x: number;
  y: number;
  w: number;
  h: number;
  damage: number;
  moving: boolean;
  dir: -1 | 1;
  speed: number;
}

interface GameHooks {
  onGameOver?: (message: string) => void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

  private player: Player;
  private camera: Camera;
  private tileMap!: TileMap;

  private bgImg: HTMLImageElement | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmUnlocked = false;
  private tilemapImg!: HTMLImageElement;
  private healthBarImg!: HTMLImageElement;
  private elementImgs: Record<string, HTMLImageElement> = {};
  private elements: RuntimeElement[] = [];
  private enemyImgs: Partial<Record<EnemyTypeId, HTMLImageElement>> = {};
  private enemies: RuntimeEnemy[] = [];
  private enemyHitCooldown = 0;
  private gameOver = false;
  private gameOverAnnounced = false;
  private shakeFrames = 0;
  private shakeMagnitude = 0;
  private skyClouds: SkyCloud[] = [];

  private keys: Record<string, boolean> = {};
  private prevJump = false;
  private prevDash = false;
  private input: InputState = {
    left: false, right: false,
    jump: false, jumpJustPressed: false,
    dash: false, dashJustPressed: false,
    down: false,
  };

  // Touch input state (set externally by the UI overlay)
  touch: { left: boolean; right: boolean; jump: boolean } = { left: false, right: false, jump: false };

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  private level: LevelData;
  private hooks: GameHooks;

  constructor(canvas: HTMLCanvasElement, level: LevelData, hooks: GameHooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.level = level;
    this.hooks = hooks;
    this.player = new Player(level.spawnX, level.spawnY - PLAYER_H);
    this.camera = new Camera();
    this.skyClouds = this.buildSkyClouds();
  }

  async init() {
    // Load bg image for the level's preset (if any)
    const bgPreset = this.level.bgPreset;
    const bgUrlForLevel = bgPreset ? BG_PRESETS[bgPreset] : undefined;
    const bgPromise = bgUrlForLevel ? loadImage(bgUrlForLevel).catch(() => null) : Promise.resolve(null);
    const enemyEntries = Object.entries(ENEMY_BY_ID) as [EnemyTypeId, (typeof ENEMY_BY_ID)[EnemyTypeId]][];
    const elementAssets = ELEMENT_ASSETS;

    const [bgImg, tilemapImg, healthBarImg, idleCanvas, runCanvas, verticalJumpCanvas, forwardJumpCanvas, fallCanvas, ...restAssets] = await Promise.all([
      bgPromise,
      loadImage(tilemapUrl),
      loadImage(healthBarUrl),
      loadSpriteTransparent(idleUrl),
      loadSpriteTransparent(runUrl),
      loadSpriteTransparent(verticalJumpUrl),
      loadSpriteTransparent(forwardJumpUrl),
      loadSpriteTransparent(fallUrl),
      ...enemyEntries.map(([id, enemy]) => loadImage(enemy.spriteUrl).then(img => ({ id, img }))),
      ...elementAssets.map(asset => loadImage(asset.url).then(img => ({ id: asset.id, img }))),
    ]);

    const enemyImgsLoaded = restAssets.slice(0, enemyEntries.length) as { id: EnemyTypeId; img: HTMLImageElement }[];
    const elementImgsLoaded = restAssets.slice(enemyEntries.length) as { id: string; img: HTMLImageElement }[];

    this.bgImg      = bgImg;
    this.tilemapImg = tilemapImg;
    this.healthBarImg = healthBarImg;
    this.enemyImgs = {};
    this.elementImgs = {};
    for (const loaded of enemyImgsLoaded) {
      this.enemyImgs[loaded.id] = loaded.img;
    }
    for (const loaded of elementImgsLoaded) {
      this.elementImgs[loaded.id] = loaded.img;
    }

    // Build tile grid + collision rects
    this.tileMap = new TileMap(this.level.cols, this.level.rows, this.level.zones, this.level.waterZones ?? []);
    const colliders = this.tileMap.buildCollisionRects();
    this._waterRects = this.tileMap.buildWaterRects();
    this.enemies = this.buildLevelEnemies();
    this.elements = this.buildLevelElements();

    // Sprite sheets
    // steady-sprite.png  900 × 450  2 frames  fps 8
    // run-sprite.png           600 × 418 2 frames fps 12
    // vertical_jump2.png       600 × 418 2 frames fps 10
    // forward_jump_sprite.png  600 × 418 2 frames fps 10
    // fall_sprite.png          600 × 418 2 frames fps 10
    this.player.sprites = {
      idle:         makeSheet(idleCanvas, 2,  8),
      run:          makeSheet(runCanvas,  2, 12),
      jumpVertical: makeSheet(verticalJumpCanvas, 2, 10),
      jumpForward:  makeSheet(forwardJumpCanvas, 2, 10),
      fall:         makeSheet(fallCanvas, 2, 10),
    };

    // Capture collider list on the player (we pass it each update)
    // Store on game instance for the loop
    this._colliders = colliders;

    this.resizeCanvas();
    const worldW = this.tileMap.cols * TILE_SIZE;
    const worldH = this.tileMap.rows * TILE_SIZE;
    this.camera.snap(
      this.player.x, this.player.y, this.player.getHitboxWidth(), this.player.getHitboxHeight(),
      this.canvas.width / this.dpr / ZOOM,
      this.canvas.height / this.dpr / ZOOM,
      worldW,
      worldH,
    );

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup',   this.onKeyUp);
    window.addEventListener('resize',  this.resizeCanvas);
    window.addEventListener('pointerdown', this.onAudioUnlock);
    window.addEventListener('touchstart', this.onAudioUnlock, { passive: true });

    this.setupBgmForLevel();
  }

  private _colliders: import('./types').Rect[] = [];
  private _waterRects: import('./types').Rect[] = [];

  start() {
    this.running  = true;
    this.lastTime = performance.now();
    this.tryStartBgm();
    this.rafId    = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup',   this.onKeyUp);
    window.removeEventListener('resize',  this.resizeCanvas);
    window.removeEventListener('pointerdown', this.onAudioUnlock);
    window.removeEventListener('touchstart', this.onAudioUnlock);
    this.stopBgm();
  }

  private loop = (time: number) => {
    if (!this.running) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.accumulator += Math.min(rawDt, 0.1);

    const evw = this.canvas.width / this.dpr / ZOOM;
    const evh = this.canvas.height / this.dpr / ZOOM;
    const worldW = this.tileMap.cols * TILE_SIZE;
    const worldH = this.tileMap.rows * TILE_SIZE;

    while (this.accumulator >= FIXED_DT) {
      if (!this.gameOver) {
        this.updateInput();
        if (!this.bgmUnlocked && this.bgmAudio && (
          this.input.left || this.input.right || this.input.jump || this.input.dash || this.input.down
        )) {
          this.tryStartBgm();
        }
        this.updateEnemies();
        const enemyColliders = this.enemies.map(enemy => ({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }));
        this.player.update(this.input, this._colliders.concat(enemyColliders), this._waterRects);
        this.applyEnemyDamageToPlayer();
        this.camera.update(
          this.player.x, this.player.y, this.player.getHitboxWidth(), this.player.getHitboxHeight(),
          evw, evh, this.player.facingLeft, worldW, worldH,
        );
      }
      if (this.shakeFrames > 0) this.shakeFrames--;
      this.accumulator -= FIXED_DT;
    }

    this.render(evw, evh, worldW, worldH);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateInput() {
    const jump = !!(
      this.keys['z'] || this.keys['Z'] ||
      this.keys['x'] || this.keys['X'] ||
      this.keys[' '] ||
      this.keys['ArrowUp'] ||
      this.keys['w'] || this.keys['W'] ||
      this.touch.jump
    );
    const dash = !!(this.keys['c'] || this.keys['C']);
    this.input = {
      left:  !!(this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A'] || this.touch.left),
      right: !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'] || this.touch.right),
      jump,
      jumpJustPressed: jump && !this.prevJump,
      dash,
      dashJustPressed: dash && !this.prevDash,
      down:  !!(this.keys['ArrowDown']  || this.keys['s'] || this.keys['S']),
    };
    this.prevJump = jump;
    this.prevDash = dash;
  }

  private render(evw: number, evh: number, worldW: number, worldH: number) {
    const { ctx, canvas } = this;
    const vw   = canvas.width / this.dpr;
    const vh   = canvas.height / this.dpr;
    const shakeX = this.shakeFrames > 0 ? (Math.random() * 2 - 1) * this.shakeMagnitude : 0;
    const shakeY = this.shakeFrames > 0 ? (Math.random() * 2 - 1) * this.shakeMagnitude : 0;
    const camX = this.camera.x + shakeX;
    const camY = this.camera.y + shakeY;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, vw, vh);
    this.drawBg(camX, camY, vw, vh, worldW, worldH);

    ctx.save();
    ctx.scale(ZOOM, ZOOM);

    // Atmospheric overlay in world-space
    ctx.fillStyle = 'rgba(10, 8, 20, 0.32)';
    ctx.fillRect(0, 0, evw, evh);

    // Auto-tiled level
    this.tileMap.render(ctx, this.tilemapImg, camX, camY, evw, evh, true);

    // Enemies
    this.drawEnemies(camX, camY, evw, evh);

    // Player
    this.player.draw(ctx, camX, camY);

    // Decorative elements
    this.drawElements(camX, camY, evw, evh);

    ctx.restore();

    this.drawHealthBar();
  }

  // Source rects from health-bar.png (332×199)
  // Big portrait head (static)
  private static HUD_PORTRAIT = { sx: 0, sy: 0, sw: 216, sh: 199 };
  // Full health icon (small alien face)
  private static HUD_FULL     = { sx: 214, sy: 25, sw: 54, sh: 70 };
  // Empty health slot (dark oval)
  private static HUD_EMPTY    = { sx: 276, sy: 25, sw: 52, sh: 70 };

  private drawHealthBar() {
    const { ctx } = this;
    const { health, maxHealth } = this.player;
    const portrait = Game.HUD_PORTRAIT;
    const full  = Game.HUD_FULL;
    const empty = Game.HUD_EMPTY;

    const portraitH = 48;
    const portraitW = portraitH * (portrait.sw / portrait.sh);
    const x0 = 12;
    const y0 = 10;

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    // Static portrait
    ctx.drawImage(
      this.healthBarImg,
      portrait.sx, portrait.sy, portrait.sw, portrait.sh,
      x0, y0, portraitW, portraitH,
    );

    // Health icons next to portrait
    const slotH = 24;
    const gap = 2;
    let dx = x0 + portraitW + 4;
    const dy = y0 + (portraitH - slotH) / 2;
    for (let i = 0; i < maxHealth; i++) {
      const src = i < health ? full : empty;
      const dw = slotH * (src.sw / src.sh);
      ctx.drawImage(
        this.healthBarImg,
        src.sx, src.sy, src.sw, src.sh,
        dx, dy, dw, slotH,
      );
      dx += dw + gap;
    }
    ctx.restore();
  }

  private drawBg(camX: number, camY: number, vw: number, vh: number, worldW: number, worldH: number) {
    const { ctx } = this;
    const bgImg = this.bgImg;

    if (!bgImg) {
      ctx.fillStyle = BG_FALLBACK_COLOR;
      ctx.fillRect(0, 0, vw, vh);
      return;
    }

    const scale  = Math.max(vw / bgImg.naturalWidth, vh / bgImg.naturalHeight);
    const drawW  = bgImg.naturalWidth  * scale;
    const drawH  = bgImg.naturalHeight * scale;

    const maxOffsetX = drawW - vw;
    const txDenom    = Math.max(1, worldW - vw / ZOOM);
    const tx         = Math.max(0, Math.min(camX / txDenom, 1));
    const offsetX    = -(tx * maxOffsetX * 0.4);

    const maxOffsetY = Math.max(0, drawH - vh);
    const tyDenom    = Math.max(1, worldH - vh / ZOOM);
    const ty         = Math.max(0, Math.min(camY / tyDenom, 1));
    const offsetY    = -(ty * maxOffsetY * 0.15);

    ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);

    const isKedy =
      this.level.bgPreset === 'bg-kedy-pucdej' ||
      this.level.bgPreset === 'bg-kedy-pucdej-watercolor';
    if (isKedy) {
      this.drawMovingClouds(vw, vh);
      ctx.fillStyle = 'rgba(24, 56, 38, 0.22)';
      ctx.fillRect(0, 0, vw, vh);
    }

    if (drawH + offsetY < vh) {
      ctx.fillStyle = isKedy ? '#2e4a2e' : '#4a5a38';
      ctx.fillRect(0, drawH + offsetY, vw, vh - (drawH + offsetY));
    }
  }

  private drawMovingClouds(vw: number, vh: number) {
    const { ctx } = this;
    const t = performance.now() / 1000;
    const skyH = vh * 0.6;

    for (const c of this.skyClouds) {
      const w = vw * c.w01;
      const h = vh * c.h01;
      const baseX = c.x01 * vw;
      const x = (baseX + t * c.speed * vw) % (vw + w) - w * 0.5;
      const y = c.y01 * skyH;

      const g = ctx.createRadialGradient(x, y, w * 0.2, x, y, w);
      g.addColorStop(0, `rgba(200, 226, 245, ${c.alpha})`);
      g.addColorStop(1, 'rgba(200, 226, 245, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w, y - h, w * 2, h * 2);
    }
  }

  private buildLevelEnemies(): RuntimeEnemy[] {
    const source = this.level.enemies ?? [];
    const enemies: RuntimeEnemy[] = [];
    for (const enemy of source) {
      const def = ENEMY_BY_ID[enemy.type as EnemyTypeId];
      if (!def) continue;
      enemies.push({
        type: def.id,
        x: enemy.col * TILE_SIZE,
        y: enemy.row * TILE_SIZE,
        w: def.tilesW * TILE_SIZE,
        h: def.tilesH * TILE_SIZE,
        damage: Math.max(1, enemy.damage || def.collisionDamage),
        moving: !!enemy.moving,
        dir: 1,
        speed: 70,
      });
    }
    return enemies;
  }

  private updateEnemies() {
    const dt = FIXED_DT;
    if (this.enemyHitCooldown > 0) this.enemyHitCooldown--;

    for (const enemy of this.enemies) {
      if (!enemy.moving) continue;
      const nextX = enemy.x + enemy.dir * enemy.speed * dt;
      const maxX = this.tileMap.cols * TILE_SIZE - enemy.w;

      const hitsWall = this.rectHitsColliders(nextX, enemy.y, enemy.w, enemy.h);
      const hasGroundAhead = this.hasGroundInFront(nextX, enemy);
      const outOfBounds = nextX < 0 || nextX > maxX;
      if (hitsWall || !hasGroundAhead || outOfBounds) {
        enemy.dir = enemy.dir === 1 ? -1 : 1;
        continue;
      }
      enemy.x = nextX;
    }
  }

  private applyEnemyDamageToPlayer() {
    if (this.enemyHitCooldown > 0) return;
    for (const enemy of this.enemies) {
      if (!this.rectsTouchOrOverlap(
        this.player.x,
        this.player.y,
        this.player.getHitboxWidth(),
        this.player.getHitboxHeight(),
        enemy.x,
        enemy.y,
        enemy.w,
        enemy.h,
      )) continue;
      this.player.health = Math.max(0, this.player.health - enemy.damage);
      const playerCenter = this.player.x + this.player.getHitboxWidth() / 2;
      const enemyCenter = enemy.x + enemy.w / 2;
      const knockDir = playerCenter >= enemyCenter ? 1 : -1;
      // 8 px/frame for 8 frames ~= one tile knockback (64 px).
      this.player.applyKnockback(knockDir, 8, -8.5, 8);
      this.shakeFrames = 10;
      this.shakeMagnitude = 5;
      this.enemyHitCooldown = 42;
      if (this.player.health <= 0) this.triggerGameOver();
      break;
    }
  }

  private drawEnemies(camX: number, camY: number, viewW: number, viewH: number) {
    const { ctx } = this;
    for (const enemy of this.enemies) {
      if (enemy.x + enemy.w < camX || enemy.x > camX + viewW || enemy.y + enemy.h < camY || enemy.y > camY + viewH) continue;
      const img = this.enemyImgs[enemy.type];
      if (img) {
        ctx.drawImage(img, enemy.x - camX, enemy.y - camY, enemy.w, enemy.h);
      } else {
        ctx.fillStyle = '#af495c';
        ctx.fillRect(enemy.x - camX, enemy.y - camY, enemy.w, enemy.h);
      }
      ctx.strokeStyle = 'rgba(20, 10, 20, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x - camX, enemy.y - camY, enemy.w, enemy.h);
    }
  }

  private hasGroundInFront(nextX: number, enemy: RuntimeEnemy): boolean {
    const probeX = enemy.dir > 0 ? nextX + enemy.w + 1 : nextX - 1;
    const probeY = enemy.y + enemy.h + 1;
    const col = Math.floor(probeX / TILE_SIZE);
    const row = Math.floor(probeY / TILE_SIZE);
    return this.tileMap.isSolid(col, row);
  }

  private rectHitsColliders(x: number, y: number, w: number, h: number): boolean {
    for (const r of this._colliders) {
      if (this.rectsOverlap(x, y, w, h, r.x, r.y, r.w, r.h)) return true;
    }
    return false;
  }

  private rectsOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number,
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private rectsTouchOrOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number,
  ): boolean {
    return ax <= bx + bw && ax + aw >= bx && ay <= by + bh && ay + ah >= by;
  }

  private triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.shakeFrames = 22;
    this.shakeMagnitude = 8;
    if (this.gameOverAnnounced) return;
    this.gameOverAnnounced = true;
    const messages = [
      'You got absolutely bonked. Retry and bonk them back.',
      'Hero temporarily offline. Press Retry to continue the legend.',
      'That enemy had plot armor. Retry and rewrite the script.',
      'Game over, but your comeback arc is loading.',
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    this.hooks.onGameOver?.(msg);
  }


  private resizeCanvas = () => {
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width  = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key] = true;
    this.tryStartBgm();
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
      e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key] = false;
  };

  private onAudioUnlock = () => {
    this.tryStartBgm();
  };

  private setupBgmForLevel() {
    const preset = this.level.bgmPreset;
    const bgmUrl = preset ? BGM_PRESETS[preset] : undefined;
    if (!bgmUrl) {
      if (preset) console.warn(`[BGM] Unknown preset "${preset}" on level "${this.level.name}"`);
      return;
    }
    console.info(`[BGM] Level "${this.level.name}" preset "${preset}" -> ${bgmUrl}`);
    const audio = new Audio(bgmUrl);
    audio.addEventListener('error', () => {
      console.warn(`[BGM] Failed to load audio from ${bgmUrl}`);
    });
    audio.loop = true;
    audio.volume = 0.5;
    audio.preload = 'auto';
    this.bgmAudio = audio;
    this.bgmUnlocked = false;
    this.tryStartBgm();
  }

  private tryStartBgm() {
    if (!this.running || this.bgmUnlocked || !this.bgmAudio) return;
    this.bgmAudio.play().then(() => {
      this.bgmUnlocked = true;
      window.removeEventListener('pointerdown', this.onAudioUnlock);
      window.removeEventListener('touchstart', this.onAudioUnlock);
    }).catch((err) => {
      console.warn('[BGM] Play blocked/failed:', err);
    });
  }

  private stopBgm() {
    if (!this.bgmAudio) return;
    this.bgmAudio.pause();
    this.bgmAudio.currentTime = 0;
    this.bgmAudio = null;
    this.bgmUnlocked = false;
  }

  private buildLevelElements(): RuntimeElement[] {
    const placed = this.level.elements ?? [];
    const out: RuntimeElement[] = [];
    for (const entry of placed) {
      const img = this.elementImgs[entry.id];
      if (!img) continue;
      const ratioW = img.naturalWidth / 128;
      const ratioH = img.naturalHeight / 128;
      out.push({
        id: entry.id,
        x: entry.col * TILE_SIZE,
        y: entry.row * TILE_SIZE,
        w: ratioW * TILE_SIZE,
        h: ratioH * TILE_SIZE,
        img,
      });
    }
    return out;
  }

  private drawElements(camX: number, camY: number, viewW: number, viewH: number) {
    const { ctx } = this;
    for (const element of this.elements) {
      if (
        element.x + element.w < camX || element.x > camX + viewW ||
        element.y + element.h < camY || element.y > camY + viewH
      ) continue;
      ctx.drawImage(element.img, element.x - camX, element.y - camY, element.w, element.h);
    }
  }

  private buildSkyClouds(): SkyCloud[] {
    const rand = seededRand((this.level.id * 123457) ^ 0x53a9c5d7);
    const out: SkyCloud[] = [];
    for (let i = 0; i < 10; i++) {
      out.push({
        x01: rand(),
        y01: 0.06 + rand() * 0.5,
        w01: 0.14 + rand() * 0.23,
        h01: 0.05 + rand() * 0.1,
        speed: 0.006 + rand() * 0.02,
        alpha: 0.09 + rand() * 0.09,
      });
    }
    return out;
  }

}

function makeSheet(canvas: HTMLCanvasElement, frames: number, fps: number): SpriteSheet {
  return { canvas, frames, frameW: Math.floor(canvas.width / frames), frameH: canvas.height, fps };
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
