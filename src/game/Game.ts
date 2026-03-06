import { Player } from './entities/Player';
import { Camera } from './Camera';
import { TileMap } from './TileMap';
import { PLAYER_W, PLAYER_H } from './constants';
import { TILE_DSP as TILE_SIZE } from './AutoTile';
import { loadImage, loadSpriteTransparent } from './spriteUtils';
import type { InputState, SpriteSheet } from './types';
import type { LevelData } from './levels';

const bgUrl      = new URL('../assets/bg.png',                 import.meta.url).href;
const tilemapUrl = new URL('../assets/kakoskonia_tilemap.png', import.meta.url).href;
const idleUrl    = new URL('../assets/steady-sprite.png',      import.meta.url).href;
const runUrl     = new URL('../assets/run-sprite.png',         import.meta.url).href;
const jumpUrl    = new URL('../assets/jump-sprite.png',        import.meta.url).href;
const natureUrls = [
  new URL('../assets/nature/grass.png', import.meta.url).href,
  new URL('../assets/nature/flower.png', import.meta.url).href,
  new URL('../assets/nature/bush.png', import.meta.url).href,
  new URL('../assets/nature/bush2.png', import.meta.url).href,
  new URL('../assets/nature/bush3.png', import.meta.url).href,
  new URL('../assets/nature/tree.png', import.meta.url).href,
];

/** Camera zoom — 1.25× makes the player appear 25% larger */
const ZOOM = 1.25;
const FIXED_DT = 1 / 60;
const OVERLAY_DENSITY = 0.58;
const FLOWER_ASSET_INDEX = 1; // natureUrls[1] === flower.png

interface NatureOverlay {
  x: number;
  y: number;
  w: number;
  h: number;
  img: HTMLImageElement;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player: Player;
  private camera: Camera;
  private tileMap!: TileMap;

  private bgImg!: HTMLImageElement;
  private tilemapImg!: HTMLImageElement;
  private natureImgs: HTMLImageElement[] = [];
  private overlays: NatureOverlay[] = [];

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

  constructor(canvas: HTMLCanvasElement, level: LevelData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.level = level;
    this.player = new Player(level.spawnX, level.spawnY - PLAYER_H);
    this.camera = new Camera();
  }

  async init() {
    const [bgImg, tilemapImg, idleCanvas, runCanvas, jumpCanvas, ...natureImgs] = await Promise.all([
      loadImage(bgUrl),
      loadImage(tilemapUrl),
      loadSpriteTransparent(idleUrl),
      loadSpriteTransparent(runUrl),
      loadSpriteTransparent(jumpUrl),
      ...natureUrls.map(loadImage),
    ]);

    this.bgImg      = bgImg;
    this.tilemapImg = tilemapImg;
    this.natureImgs = natureImgs;

    // Build tile grid + collision rects
    this.tileMap = new TileMap(this.level.cols, this.level.rows, this.level.zones);
    const colliders = this.tileMap.buildCollisionRects();
    this.overlays = this.buildNatureOverlays();

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
    const worldW = this.tileMap.cols * TILE_SIZE;
    const worldH = this.tileMap.rows * TILE_SIZE;
    this.camera.snap(
      this.player.x, this.player.y, PLAYER_W, PLAYER_H,
      this.canvas.width  / ZOOM,
      this.canvas.height / ZOOM,
      worldW,
      worldH,
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
    const worldW = this.tileMap.cols * TILE_SIZE;
    const worldH = this.tileMap.rows * TILE_SIZE;

    while (this.accumulator >= FIXED_DT) {
      this.updateInput();
      this.player.update(this.input, this._colliders);
      this.camera.update(
        this.player.x, this.player.y, PLAYER_W, PLAYER_H,
        evw, evh, this.player.facingLeft, worldW, worldH,
      );
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
    const vw   = canvas.width;
    const vh   = canvas.height;
    const camX = this.camera.x;
    const camY = this.camera.y;

    ctx.clearRect(0, 0, vw, vh);
    this.drawBg(camX, camY, vw, vh, worldW, worldH);

    ctx.save();
    ctx.scale(ZOOM, ZOOM);

    // Atmospheric overlay in world-space
    ctx.fillStyle = 'rgba(10, 8, 20, 0.32)';
    ctx.fillRect(0, 0, evw, evh);

    // Auto-tiled level
    this.tileMap.render(ctx, this.tilemapImg, camX, camY, evw, evh);

    // Player
    this.player.draw(ctx, camX, camY);

    // Foreground nature overlays
    this.drawNatureOverlays(camX, camY, evw, evh);

    ctx.restore();

    this.drawHUD(vw);
  }

  private drawBg(camX: number, camY: number, vw: number, vh: number, worldW: number, worldH: number) {
    const { ctx, bgImg } = this;
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
    ctx.fillText('WASD / Arrows · Jump: W/Space/Z · Dash: C · Double-jump: press again in air', vw - 14, 22);
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

  private buildNatureOverlays(): NatureOverlay[] {
    if (this.natureImgs.length === 0) return [];
    const overlays: NatureOverlay[] = [];
    const rand = seededRand((this.level.id * 73856093) ^ (this.level.cols * 19349663) ^ (this.level.rows * 83492791));
    const occupied = new Set<string>();
    const flower = this.natureImgs[FLOWER_ASSET_INDEX] ?? this.natureImgs[0];
    const globalScale = TILE_SIZE / Math.max(1, flower.naturalWidth);

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        if (!this.tileMap.isSolid(c, r)) continue;
        if (this.tileMap.isSolid(c, r - 1)) continue; // only tile tops exposed to air
        if (rand() > OVERLAY_DENSITY) continue;

        const img = this.natureImgs[Math.floor(rand() * this.natureImgs.length)];
        const targetW = img.naturalWidth * globalScale;
        const targetH = img.naturalHeight * globalScale;
        const widthTiles = Math.max(1, Math.ceil(targetW / TILE_SIZE));
        const startCol = c - Math.floor((widthTiles - 1) / 2);
        const endCol = startCol + widthTiles - 1;
        if (startCol < 0 || endCol >= this.level.cols) continue;

        let hasRoom = true;
        for (let cc = startCol; cc <= endCol; cc++) {
          if (!this.tileMap.isSolid(cc, r) || this.tileMap.isSolid(cc, r - 1) || occupied.has(`${r}:${cc}`)) {
            hasRoom = false;
            break;
          }
        }
        if (!hasRoom) continue;

        const embedY = 4 + rand() * 6;
        for (let cc = startCol; cc <= endCol; cc++) occupied.add(`${r}:${cc}`);
        overlays.push({
          x: startCol * TILE_SIZE + (widthTiles * TILE_SIZE - targetW) / 2,
          y: r * TILE_SIZE - targetH + embedY,
          w: targetW,
          h: targetH,
          img,
        });
      }
    }

    return overlays;
  }

  private drawNatureOverlays(camX: number, camY: number, viewW: number, viewH: number) {
    const { ctx } = this;
    for (const o of this.overlays) {
      if (o.x + o.w < camX || o.x > camX + viewW || o.y + o.h < camY || o.y > camY + viewH) continue;
      ctx.drawImage(o.img, o.x - camX, o.y - camY, o.w, o.h);
    }
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
