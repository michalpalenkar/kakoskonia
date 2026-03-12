/**
 * Dual-grid auto-tile system using a 5-tile tilesheet (128×640 px).
 *
 * Tilesheet layout (assets/tiles/default.png):
 *   Tile 0 (y=  0): edge        – 1 corner filled (convex corner piece)
 *   Tile 1 (y=128): double_nook – 2 diagonal corners filled
 *   Tile 2 (y=256): straight    – 2 adjacent corners filled (straight border)
 *   Tile 3 (y=384): nook        – 3 corners filled (concave inner corner)
 *   Tile 4 (y=512): fill        – all 4 corners filled (solid interior)
 *
 * How dual-grid works:
 *   The world grid stores which cells are solid (logical tiles).
 *   The visual grid is offset by half a tile in both axes, so each visual
 *   tile sits at the intersection of 4 world cells. The 4 corners
 *   (TL, TR, BL, BR) determine which of the 5 tile shapes to draw and
 *   with what flip/rotation. With 4 binary corners there are 16 combos,
 *   all covered by the 5 tiles + horizontal/vertical mirroring (+ 90°
 *   rotation for 2 straight-tile orientations).
 *
 * Base tile orientations (as drawn in the tilesheet):
 *   edge:        BR filled
 *   double_nook: TR+BL filled (anti-diagonal)
 *   straight:    TR+BR filled (right side)
 *   nook:        TR+BL+BR filled (TL empty)
 *   fill:        all filled
 *
 * Transform table (fX = flipX, fY = flipY):
 *   mask  corners     tile        fX  fY  rotation
 *   0000  (empty)     —
 *   0001  TL          edge        ✓   ✓
 *   0010  TR          edge            ✓
 *   0011  TL+TR       straight                -90° (CCW)
 *   0100  BL          edge        ✓
 *   0101  TL+BL       straight    ✓
 *   0110  TR+BL       double_nook
 *   0111  TL+TR+BL    nook        ✓   ✓
 *   1000  BR          edge
 *   1001  TL+BR       double_nook ✓
 *   1010  TR+BR       straight
 *   1011  TL+TR+BR    nook            ✓
 *   1100  BL+BR       straight                +90° (CW)
 *   1101  TL+BL+BR    nook        ✓
 *   1110  TR+BL+BR    nook
 *   1111  fill         fill
 */

/** Source tile size in the tilesheet (px). */
const SRC = 128;

/** Expected tilesheet dimensions. */
export const SHEET_W = 128;
export const SHEET_H = 640;

/** Display tile size (px) — each visual tile renders at this size. */
export const TILE_DSP = 64;

// ── Tile indices in the tilesheet ──────────────────────────────────────────
const EDGE = 0; // y = 0
const DOUBLE_NOOK = 1; // y = 128
const STRAIGHT = 2; // y = 256
const NOOK = 3; // y = 384
const FILL = 4; // y = 512

/**
 * Tile descriptor: which tile index + horizontal/vertical flips + optional
 * rotation in radians (only used for straight top/bottom orientations).
 */
interface TileInfo {
  tile: number; // index into tilesheet (0–4)
  flipX: boolean; // mirror horizontally (left ↔ right)
  flipY: boolean; // mirror vertically   (top ↔ bottom)
  rot: number; // rotation in radians (0, π/2, or -π/2)
}

const F = false,
  TT = true;
const CW = Math.PI / 2; // 90° clockwise
const CCW = -Math.PI / 2; // 90° counter-clockwise

/**
 * Lookup table indexed by corner mask (0–15).
 * null = empty (don't draw).
 */
const DUAL_GRID_LUT: (TileInfo | null)[] = [
  /* 0  0000 empty        */ null,
  /* 1  0001 TL           */ { tile: EDGE, flipX: TT, flipY: TT, rot: 0 },
  /* 2  0010 TR           */ { tile: EDGE, flipX: F, flipY: TT, rot: 0 },
  /* 3  0011 TL+TR        */ { tile: STRAIGHT, flipX: F, flipY: TT, rot: CCW },
  /* 4  0100 BL           */ { tile: EDGE, flipX: TT, flipY: F, rot: 0 },
  /* 5  0101 TL+BL        */ { tile: STRAIGHT, flipX: F, flipY: TT, rot: 0 },
  /* 6  0110 TR+BL        */ { tile: DOUBLE_NOOK, flipX: F, flipY: F, rot: 0 },
  /* 7  0111 TL+TR+BL     */ { tile: NOOK, flipX: F, flipY: F, rot: CW },
  /* 8  1000 BR           */ { tile: EDGE, flipX: F, flipY: F, rot: 0 },
  /* 9  1001 TL+BR        */ { tile: DOUBLE_NOOK, flipX: TT, flipY: F, rot: 0 },
  /* 10 1010 TR+BR        */ { tile: STRAIGHT, flipX: TT, flipY: TT, rot: 0 },
  /* 11 1011 TL+TR+BR     */ { tile: NOOK, flipX: TT, flipY: F, rot: CW },
  /* 12 1100 BL+BR        */ { tile: STRAIGHT, flipX: F, flipY: TT, rot: CW },
  /* 13 1101 TL+BL+BR     */ { tile: NOOK, flipX: F, flipY: TT, rot: CW },
  /* 14 1110 TR+BL+BR     */ { tile: NOOK, flipX: TT, flipY: TT, rot: CW },
  /* 15 1111 fill          */ { tile: FILL, flipX: F, flipY: F, rot: 0 },
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate that the loaded tilesheet has the expected dimensions.
 */
export function validateTilesheet(img: HTMLImageElement): boolean {
  return img.naturalWidth === SHEET_W && img.naturalHeight === SHEET_H;
}

/**
 * Compute the corner mask for a visual tile at dual-grid position (vc, vr).
 * The visual grid is offset by half a tile, so visual tile (vc, vr) samples
 * the 4 world cells at (vc-1, vr-1), (vc, vr-1), (vc-1, vr), (vc, vr).
 */
export function getDualGridMask(
  isSolid: (col: number, row: number) => boolean,
  vc: number,
  vr: number,
): number {
  const tl = isSolid(vc - 1, vr - 1) ? 1 : 0;
  const tr = isSolid(vc, vr - 1) ? 2 : 0;
  const bl = isSolid(vc - 1, vr) ? 4 : 0;
  const br = isSolid(vc, vr) ? 8 : 0;
  return tl | tr | bl | br;
}

/**
 * Draw a single dual-grid visual tile using flips and optional rotation.
 */
export function drawDualGridTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  mask: number,
  dx: number,
  dy: number,
): void {
  const info = DUAL_GRID_LUT[mask];
  if (!info) return; // empty — nothing to draw

  const sy = info.tile * SRC;
  const { flipX, flipY, rot } = info;
  const overlap = 1;
  const drawSize = TILE_DSP + overlap * 2;

  // Fast path: no transforms at all
  if (!flipX && !flipY && rot === 0) {
    ctx.drawImage(img, 0, sy, SRC, SRC, dx - overlap, dy - overlap, drawSize, drawSize);
    return;
  }

  const half = TILE_DSP / 2;
  ctx.save();
  ctx.translate(dx + half, dy + half);

  // Apply flips via scale
  if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

  // Apply rotation (90° CW or CCW for straight top/bottom)
  if (rot !== 0) ctx.rotate(rot);

  ctx.drawImage(img, 0, sy, SRC, SRC, -half - overlap, -half - overlap, drawSize, drawSize);
  ctx.restore();
}

/**
 * Render all visible dual-grid tiles for the given viewport.
 * The visual grid has (cols+1) × (rows+1) positions, offset by half a tile.
 */
export function renderDualGrid(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  isSolid: (col: number, row: number) => boolean,
  cols: number,
  rows: number,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  const halfT = TILE_DSP / 2;

  // Cull to visible range
  const vc0 = Math.max(0, Math.floor((camX + halfT) / TILE_DSP));
  const vc1 = Math.min(cols, Math.ceil((camX + viewW + halfT) / TILE_DSP));
  const vr0 = Math.max(0, Math.floor((camY + halfT) / TILE_DSP));
  const vr1 = Math.min(rows, Math.ceil((camY + viewH + halfT) / TILE_DSP));

  for (let vr = vr0; vr <= vr1; vr++) {
    for (let vc = vc0; vc <= vc1; vc++) {
      const mask = getDualGridMask(isSolid, vc, vr);
      if (mask === 0) continue;
      const screenX = vc * TILE_DSP - halfT - camX;
      const screenY = vr * TILE_DSP - halfT - camY;
      drawDualGridTile(ctx, img, mask, screenX, screenY);
    }
  }
}
