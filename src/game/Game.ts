import { Player } from './entities/Player';
import { Camera } from './Camera';
import { TileMap } from './TileMap';
import { LEVEL_ZONES, TILE_COLS, TILE_ROWS, SPAWN_X, SPAWN_Y } from './levelData';
import { WORLD_W, WORLD_H, PLAYER_W, PLAYER_H } from './constants';
import { loadImage, loadSpriteTransparent } from './spriteUtils';
import type { InputState, SpriteSheet } from './types';

const bgUrl      = new URL('../assets/bg.png',                 import.meta.url).href;
const tilemapUrl = new URL('../assets/kakoskonia_tilemap.png', import.meta.url).href;
const idleUrl    = new URL('../assets/steady-sprite.png',      import.meta.url).href;
const runUrl     = new URL('../assets/run-sprite.png',         import.meta.url).href;
const jumpUrl    = new URL('../assets/jump-sprite.png',        import.meta.url).href;

/** Camera zoom — 1.25× makes the player appear 25% larger */
const ZOOM = 1.25;
const FIXED_DT = 1 / 60;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player: Player;
  private camera: Camera;
  private tileMap!: TileMap;

  private bgImg!: HTMLImageElement;
  private tilemapImg!: HTMLImageElement;

  private keys: Record<string, boolean> = {};
  private prevJump = false;
  private input: InputState = {
    left: false, right: false, jump: false, jumpJustPressed: false, down: false,
  };

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = new Player(SPAWN_X, SPAWN_Y - PLAYER_H);
    this.camera = new Camera();
  }

  async init() {
    const [bgImg, tilemapImg, idleCanvas, runCanvas, jumpCanvas] = await Promise.all([
      loadImage(bgUrl),
      loadImage(tilemapUrl),
      loadSpriteTransparent(idleUrl),
      loadSpriteTransparent(runUrl),
      loadSpriteTransparent(jumpUrl),
    ]);

    this.bgImg      = bgImg;
    this.tilemapImg = tilemapImg;

    // Build tile grid + collision rects
    this.tileMap = new TileMap(TILE_COLS, TILE_ROWS, LEVEL_ZONES);
    const colliders = this.tileMap.buildCollisionRects();

    // Sprite sheets
    // steady-sprite.png  4305 × 2114  3 frames  fps 8
    // run-sprite.png     3031 × 2114  2 frames  fps 12
    // jump-sprite.png    8134 × 1330  7 frames  fps 10
    this.player.sprites = {
      idle: makeSheet(idleCanvas, 3,  8),
      run:  makeSheet(runCanvas,  2, 12),
      jump: makeSheet(jumpCanvas, 7, 10),
    };

    // Capture collider list on the player (we pass it each update)
    // Store on game instance for the loop
    this._colliders = colliders;

    this.resizeCanvas();
    this.camera.snap(
      this.player.x, this.player.y, PLAYER_W, PLAYER_H,
      this.canvas.width  / ZOOM,
      this.canvas.height / ZOOM,
    );

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup',   this.onKeyUp);
    window.addEventListener('resize',  this.resizeCanvas);
  }

  private _colliders: import('./types').Rect[] = [];

  start() {
    this.running  = true;
    this.lastTime = performance.now();
    this.rafId    = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup',   this.onKeyUp);
    window.removeEventListener('resize',  this.resizeCanvas);
  }

  private loop = (time: number) => {
    if (!this.running) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.accumulator += Math.min(rawDt, 0.1);

    const evw = this.canvas.width  / ZOOM;
    const evh = this.canvas.height / ZOOM;

    while (this.accumulator >= FIXED_DT) {
      this.updateInput();
      this.player.update(this.input, this._colliders);
      this.camera.update(
        this.player.x, this.player.y, PLAYER_W, PLAYER_H,
        evw, evh, this.player.facingLeft,
      );
      this.accumulator -= FIXED_DT;
    }

    this.render(evw, evh);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateInput() {
    const jump = !!(
      this.keys['z'] || this.keys['Z'] ||
      this.keys['x'] || this.keys['X'] ||
      this.keys[' '] ||
      this.keys['ArrowUp'] ||
      this.keys['w'] || this.keys['W']
    );
    this.input = {
      left:  !!(this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A']),
      right: !!(this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']),
      jump,
      jumpJustPressed: jump && !this.prevJump,
      down:  !!(this.keys['ArrowDown']  || this.keys['s'] || this.keys['S']),
    };
    this.prevJump = jump;
  }

  private render(evw: number, evh: number) {
    const { ctx, canvas } = this;
    const vw   = canvas.width;
    const vh   = canvas.height;
    const camX = this.camera.x;
    const camY = this.camera.y;

    ctx.clearRect(0, 0, vw, vh);
    this.drawBg(camX, camY, vw, vh);

    ctx.save();
    ctx.scale(ZOOM, ZOOM);

    // Atmospheric overlay in world-space
    ctx.fillStyle = 'rgba(10, 8, 20, 0.32)';
    ctx.fillRect(0, 0, evw, evh);

    // Auto-tiled level
    this.tileMap.render(ctx, this.tilemapImg, camX, camY, evw, evh);

    // Player
    this.player.draw(ctx, camX, camY);

    ctx.restore();

    this.drawHUD(vw);
  }

  private drawBg(camX: number, camY: number, vw: number, vh: number) {
    const { ctx, bgImg } = this;
    const scale  = Math.max(vw / bgImg.naturalWidth, vh / bgImg.naturalHeight);
    const drawW  = bgImg.naturalWidth  * scale;
    const drawH  = bgImg.naturalHeight * scale;

    const maxOffsetX = drawW - vw;
    const tx         = Math.max(0, Math.min(camX / (WORLD_W - vw / ZOOM), 1));
    const offsetX    = -(tx * maxOffsetX * 0.4);

    const maxOffsetY = Math.max(0, drawH - vh);
    const ty         = Math.max(0, Math.min(camY / (WORLD_H - vh / ZOOM), 1));
    const offsetY    = -(ty * maxOffsetY * 0.15);

    ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);

    // Fill any uncovered gap at the bottom with ground colour
    if (drawH + offsetY < vh) {
      ctx.fillStyle = '#4a5a38';
      ctx.fillRect(0, drawH + offsetY, vw, vh - (drawH + offsetY));
    }
  }

  private drawHUD(vw: number) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(220, 210, 200, 0.6)';
    ctx.font      = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('WASD / Arrows · Jump: W/Space/Z · Double-jump: press again in air', vw - 14, 22);
  }

  private resizeCanvas = () => {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
      e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key] = false;
  };
}

function makeSheet(canvas: HTMLCanvasElement, frames: number, fps: number): SpriteSheet {
  return { canvas, frames, frameW: Math.floor(canvas.width / frames), frameH: canvas.height, fps };
}
