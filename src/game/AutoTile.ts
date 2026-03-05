/**
 * Auto-tile system for kakoskonia_tilemap.png
 *
 * Source tile grid: 12 cols × 4 rows, each tile 128×128 px (total 1536×512).
 * Display tile size: 64×64 px (2× downscale for crisp pixel art).
 *
 * Each solid cell picks its tile based on which of its 8 neighbours are solid
 * (standard "blob" / Wang-tile auto-tile logic):
 *
 *   Cardinal bitmask: N=1, E=2, S=4, W=8
 *
 * When all 4 cardinal neighbours are solid (mask=15), diagonal neighbours are
 * checked to select inner-corner tiles (concave stone corners).
 *
 * Visual tile layout used from the tilemap:
 *
 *   (col  0, row 0): top-left outer corner      — TL
 *   (col  1, row 0): top outer edge (repeating) — TOP
 *   (col 11, row 0): top-right outer corner     — TR
 *   (col  0, row 1): left outer wall (repeat.)  — WL
 *   (col  1, row 1): interior fill              — FIL
 *   (col 11, row 1): right outer wall (repeat.) — WR
 *   (col  0, row 3): bottom-left outer corner   — BL
 *   (col  1, row 3): bottom outer edge (repeat) — BOT
 *   (col 11, row 3): bottom-right outer corner  — BR
 *
 *   Inner concave corners (all cardinals solid, one diagonal empty):
 *   (col  2, row 0): inner corner at NW          — iTL
 *   (col  9, row 0): inner corner at NE          — iTR
 *   (col  2, row 3): inner corner at SW          — iBL
 *   (col  9, row 3): inner corner at SE          — iBR
 */

/** Source tile size in the tilemap (px) */
const SRC = 128;

/** Display tile size (px) — every tile is rendered at this size */
export const TILE_DSP = 64;

interface TileSrc { sx: number; sy: number }

// ── Named tile source rects ───────────────────────────────────────────────────
const tile = (col: number, row: number): TileSrc =>
  ({ sx: col * SRC, sy: row * SRC });

const TL  = tile( 0, 0);  // top-left outer corner
const TOP = tile( 1, 0);  // top edge
const TR  = tile(11, 0);  // top-right outer corner
const WL  = tile( 0, 1);  // left wall
const FIL = tile( 1, 1);  // interior fill
const WR  = tile(11, 1);  // right wall
const BL  = tile( 0, 3);  // bottom-left outer corner
const BOT = tile( 1, 3);  // bottom edge
const BR  = tile(11, 3);  // bottom-right outer corner

// Inner concave corners — shown when all 4 cardinals are solid but one
// diagonal neighbour is air (creates a visible concave notch in the stone)
const iTL = tile( 2, 0);  // concave notch at top-left
const iTR = tile( 9, 0);  // concave notch at top-right
const iBL = tile( 2, 3);  // concave notch at bottom-left
const iBR = tile( 9, 3);  // concave notch at bottom-right

// ── Cardinal lookup table (16 entries) ───────────────────────────────────────
// Index: cardMask = (N?1:0)|(E?2:0)|(S?4:0)|(W?8:0)
// A bit is SET when the corresponding neighbour IS solid.
// Reading each case: which FACES are EXPOSED (bit=0) → pick matching corner/edge.
const CARDINAL: TileSrc[] = [
  TL,   // 0b0000  (none solid)   isolated → TL fallback
  BL,   // 0b0001  N              hanging stub → BL approximation
  TL,   // 0b0010  E              left cap → TL approximation
  BL,   // 0b0011  N+E            bottom-left exposed        → BL ✓
  TOP,  // 0b0100  S              top-cap (floating row)     → TOP ✓
  WL,   // 0b0101  N+S            vertical strip             → WL
  TL,   // 0b0110  E+S            top+left exposed           → TL ✓
  WL,   // 0b0111  N+E+S          left exposed               → WL ✓
  TR,   // 0b1000  W              right cap                  → TR approximation
  BR,   // 0b1001  N+W            bottom-right exposed       → BR ✓
  TOP,  // 0b1010  E+W            horizontal strip           → TOP
  BOT,  // 0b1011  N+E+W          bottom exposed             → BOT ✓
  TR,   // 0b1100  S+W            top-right exposed          → TR ✓
  WR,   // 0b1101  N+S+W          right exposed              → WR ✓
  TOP,  // 0b1110  E+S+W          top exposed                → TOP ✓
  FIL,  // 0b1111  all cardinals  → check diagonals below
];

// ── Diagonal lookup when cardMask=15 ─────────────────────────────────────────
// diagMask bits: 0=NW missing, 1=NE missing, 2=SW missing, 3=SE missing
// (bit SET means that diagonal neighbour is AIR — i.e. a concave notch exists)
const DIAGONAL: TileSrc[] = [
  FIL,  // 0b0000  all diagonals solid  → pure interior fill
  iTL,  // 0b0001  NW air               → inner concave at NW (top-left notch)
  iTR,  // 0b0010  NE air               → inner concave at NE (top-right notch)
  FIL,  // 0b0011  NW+NE air            → two top concaves → fill (no single tile)
  iBL,  // 0b0100  SW air               → inner concave at SW (bottom-left notch)
  FIL,  // 0b0101  NW+SW air            → left column concaves → fill
  FIL,  // 0b0110  NE+SW air            → anti-diagonal → fill
  FIL,  // 0b0111  NW+NE+SW air         → fill
  iBR,  // 0b1000  SE air               → inner concave at SE (bottom-right notch)
  FIL,  // 0b1001  NW+SE air            → diagonal pair → fill
  FIL,  // 0b1010  NE+SE air            → right column concaves → fill
  FIL,  // 0b1011
  FIL,  // 0b1100  SW+SE air            → bottom concaves → fill
  FIL,  // 0b1101
  FIL,  // 0b1110
  FIL,  // 0b1111  all diagonals air    → fill
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the tilemap source rect for the tile at this grid position.
 * `isSolid(dx, dy)` should return true if the neighbour at (col+dx, row+dy) is solid.
 */
export function getAutoTileSrc(isSolid: (dx: number, dy: number) => boolean): TileSrc {
  const N = isSolid( 0, -1);
  const E = isSolid( 1,  0);
  const S = isSolid( 0,  1);
  const W = isSolid(-1,  0);

  const cardMask = (N ? 1 : 0) | (E ? 2 : 0) | (S ? 4 : 0) | (W ? 8 : 0);

  if (cardMask !== 15) return CARDINAL[cardMask];

  // All 4 cardinals solid — resolve inner corners via diagonals.
  // A diagonal is only relevant if both adjacent cardinals are solid (always true here).
  const nwMissing = !isSolid(-1, -1);  // NW air → concave at TL of this tile
  const neMissing = !isSolid( 1, -1);  // NE air → concave at TR
  const swMissing = !isSolid(-1,  1);  // SW air → concave at BL
  const seMissing = !isSolid( 1,  1);  // SE air → concave at BR

  const diagMask =
    (nwMissing ? 1 : 0) |
    (neMissing ? 2 : 0) |
    (swMissing ? 4 : 0) |
    (seMissing ? 8 : 0);

  return DIAGONAL[diagMask];
}

/** Draw one auto-tile (128×128 source → 64×64 display). */
export function drawAutoTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  src: TileSrc,
  dx: number,
  dy: number,
) {
  ctx.drawImage(img, src.sx, src.sy, SRC, SRC, dx, dy, TILE_DSP, TILE_DSP);
}
