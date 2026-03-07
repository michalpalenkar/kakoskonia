import { getAutoTileSrc, drawAutoTile, TILE_DSP as T } from './AutoTile';
import type { Rect } from './types';

export interface TileZone {
  col: number;
  row: number;
  w: number;
  h: number;
}

/**
 * Sparse tile grid built from rectangular zones.
 * Provides:
 *   - solid-cell query (used by auto-tile neighbour checks)
 *   - merged collision rects (horizontal run-length encoded per row)
 *   - camera-culled rendering via auto-tile sprite selection
 */
export class TileMap {
  readonly cols: number;
  readonly rows: number;
  private readonly grid: Uint8Array;
  private readonly waterGrid: Uint8Array;

  constructor(cols: number, rows: number, zones: TileZone[], waterZones: TileZone[] = []) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Uint8Array(cols * rows);
    this.waterGrid = new Uint8Array(cols * rows);
    for (const z of zones) this.fillZone(z, this.grid);
    for (const z of waterZones) this.fillZone(z, this.waterGrid);
  }

  private fillZone({ col, row, w, h }: TileZone, target: Uint8Array) {
    for (let r = row; r < row + h; r++) {
      if (r < 0 || r >= this.rows) continue;
      for (let c = col; c < col + w; c++) {
        if (c < 0 || c >= this.cols) continue;
        target[r * this.cols + c] = 1;
      }
    }
  }

  isSolid(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.grid[row * this.cols + col] !== 0;
  }

  isWater(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.waterGrid[row * this.cols + col] !== 0;
  }

  /** Build water rects (same merge approach as collision rects). */
  buildWaterRects(): Rect[] {
    const rects: Rect[] = [];
    for (let r = 0; r < this.rows; r++) {
      let runStart = -1;
      for (let c = 0; c <= this.cols; c++) {
        const water = c < this.cols && this.isWater(c, r);
        if (water && runStart === -1) {
          runStart = c;
        } else if (!water && runStart !== -1) {
          rects.push({ x: runStart * T, y: r * T, w: (c - runStart) * T, h: T });
          runStart = -1;
        }
      }
    }
    return rects;
  }

  /**
   * Build physics collision rects by merging horizontal solid runs per row.
   * Each resulting rect is exactly T px tall and spans one or more tiles wide.
   */
  buildCollisionRects(): Rect[] {
    const rects: Rect[] = [];
    for (let r = 0; r < this.rows; r++) {
      let runStart = -1;
      for (let c = 0; c <= this.cols; c++) {
        const solid = c < this.cols && this.isSolid(c, r);
        if (solid && runStart === -1) {
          runStart = c;
        } else if (!solid && runStart !== -1) {
          rects.push({ x: runStart * T, y: r * T, w: (c - runStart) * T, h: T });
          runStart = -1;
        }
      }
    }
    return rects;
  }

  /**
   * Render all visible solid tiles with auto-tile sprite selection.
   * camX/camY are in world pixels; viewW/viewH are the (unzoomed) viewport size.
   */
  render(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    hideTopRow = false,
  ) {
    const c0 = Math.max(0, Math.floor(camX / T));
    const c1 = Math.min(this.cols - 1, Math.ceil((camX + viewW) / T));
    const r0 = Math.max(0, Math.floor(camY / T));
    const r1 = Math.min(this.rows - 1, Math.ceil((camY + viewH) / T));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.isSolid(c, r)) continue;
        if (hideTopRow && r === 0 && c > 0 && c < this.cols - 1) continue;
        const isVisible = hideTopRow
          ? (dc: number, dr: number) => {
              const nc = c + dc, nr = r + dr;
              if (nr === 0 && nc > 0 && nc < this.cols - 1) return false;
              return this.isSolid(nc, nr);
            }
          : (dc: number, dr: number) => this.isSolid(c + dc, r + dr);
        const src = getAutoTileSrc(isVisible);
        drawAutoTile(ctx, img, src, c * T - camX, r * T - camY);
      }
    }

    // Water tiles
    ctx.save();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.isWater(c, r)) continue;
        const dx = c * T - camX;
        const dy = r * T - camY;
        // Surface tile (no water above) gets a lighter top
        const isSurface = !this.isWater(c, r - 1);
        if (isSurface) {
          ctx.fillStyle = 'rgba(30, 100, 200, 0.25)';
          ctx.fillRect(dx, dy, T, T * 0.3);
          ctx.fillStyle = 'rgba(20, 80, 180, 0.35)';
          ctx.fillRect(dx, dy + T * 0.3, T, T * 0.7);
        } else {
          ctx.fillStyle = 'rgba(20, 80, 180, 0.35)';
          ctx.fillRect(dx, dy, T, T);
        }
      }
    }
    ctx.restore();
  }
}
