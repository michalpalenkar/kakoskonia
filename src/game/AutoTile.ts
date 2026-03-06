/**
 * Auto-tile system for kakoskonia_tilemap.png
 *
 * Source tile grid: 12 cols × 4 rows, each tile 128×128 px (total 1536×512).
 * Display tile size: 64×64 px (2× downscale for crisp pixel art).
 *
 * The tileset uses a depth-gradient system with 4 color levels:
 *   White  → outer edge facing air
 *   Brown  → first inner ring (adjacent to white-edge tiles)
 *   Light gray → second ring
 *   Dark gray  → deep interior
 *
 * Rule: white edges NEVER connect to white edges (pipe-game rule).
 * Each tile variant is designed for a specific pattern of solid/air neighbours.
 *
 * Bitmask conventions used throughout this file:
 *
 *   Cardinal mask  (cardMask): N=1, E=2, S=4, W=8  (bit SET = neighbour IS solid)
 *   Diagonal bits used per cardMask context – always:
 *     bit 0 = first relevant diagonal IS MISSING
 *     bit 1 = second relevant diagonal IS MISSING (for 3/4-solid cases)
 *   All-solid diagonal mask: NW=1, NE=2, SW=4, SE=8 (bit SET = diagonal IS MISSING)
 *
 * Full tile map derived from pixel analysis of kakoskonia_tilemap.png:
 *
 *  cardMask → air-facing → tile position(s)
 *    0  (isolated)   NESW → (7,3)
 *    1  N solid      ESW  → (0,2)
 *    2  E solid      NSW  → (0,3)
 *    3  NE solid     SW   → (9,2) base / (1,2) NE inner corner
 *    4  S solid      NEW  → (0,0)
 *    5  NS solid     EW   → (0,1)
 *    6  ES solid     NW   → (9,0) base / (1,0) SE inner corner
 *    7  NES solid    W    → (9,1)/(3,0)/(3,1)/(1,1) [ne×se missing combos]
 *    8  W solid      NES  → (2,3)
 *    9  NW solid     ES   → (11,2) base / (2,2) NW inner corner
 *   10  EW solid     NS   → (1,3)
 *   11  NEW solid    S    → (10,2)/(6,1)/(5,1)/(5,3) [nw×ne missing combos]
 *   12  SW solid     NE   → (11,0) base / (2,0) SW inner corner
 *   13  NSW solid    E    → (11,1)/(7,0)/(7,1)/(2,1) [nw×sw missing combos]
 *   14  ESW solid    N    → (10,0)/(5,0)/(6,0)/(5,2) [se×sw missing combos]
 *   15  all solid    —    → 16-way diagonal lookup (NW/NE/SW/SE each missing or not)
 */

/** Source tile size in the tilemap (px) */
const SRC = 128;

/** Display tile size (px) — every tile is rendered at this size */
export const TILE_DSP = 64;

interface TileSrc { sx: number; sy: number }

const tile = (col: number, row: number): TileSrc =>
  ({ sx: col * SRC, sy: row * SRC });

// ── Cardinal-only tiles (no relevant diagonals) ───────────────────────────
const ISOLATED  = tile( 7, 3); // cardMask  0 – no neighbours
const N_CAP     = tile( 0, 2); // cardMask  1 – N solid, ESW air
const E_CAP     = tile( 0, 3); // cardMask  2 – E solid, NSW air
const S_CAP     = tile( 0, 0); // cardMask  4 – S solid, NEW air
const W_CAP     = tile( 2, 3); // cardMask  8 – W solid, NES air
const NS_STRIP  = tile( 0, 1); // cardMask  5 – NS solid, EW air
const EW_STRIP  = tile( 1, 3); // cardMask 10 – EW solid, NS air

// ── L-corner tiles (2 adjacent solid sides, 1 relevant diagonal each) ────
// cardMask 6  (ES solid, NW air) – relevant diagonal: SE
const ES_0 = tile( 9, 0); // SE solid   → no inner corner
const ES_1 = tile( 1, 0); // SE missing → inner corner at SE

// cardMask 12 (SW solid, NE air) – relevant diagonal: SW
const SW_0 = tile(11, 0); // SW solid
const SW_1 = tile( 2, 0); // SW missing → inner corner at SW

// cardMask 3  (NE solid, SW air) – relevant diagonal: NE
const NE_0 = tile( 9, 2); // NE solid
const NE_1 = tile( 1, 2); // NE missing → inner corner at NE

// cardMask 9  (NW solid, ES air) – relevant diagonal: NW
const NW_0 = tile(11, 2); // NW solid
const NW_1 = tile( 2, 2); // NW missing → inner corner at NW

// ── T-junction tiles (3 adjacent solid sides, 2 relevant diagonals each) ─
// sub-index: bit 0 = first diagonal missing, bit 1 = second diagonal missing

// cardMask 7  (NES solid, W air) – diagonals: NE (bit 0), SE (bit 1)
const W_AIR: TileSrc[] = [
  tile( 9, 1), // 0  NE solid,  SE solid
  tile( 3, 0), // 1  NE missing, SE solid
  tile( 3, 1), // 2  NE solid,  SE missing
  tile( 1, 1), // 3  NE missing, SE missing
];

// cardMask 11 (NEW solid, S air) – diagonals: NW (bit 0), NE (bit 1)
const S_AIR: TileSrc[] = [
  tile(10, 2), // 0  NW solid,  NE solid
  tile( 6, 1), // 1  NW missing, NE solid
  tile( 5, 1), // 2  NW solid,  NE missing
  tile( 5, 3), // 3  NW missing, NE missing
];

// cardMask 13 (NSW solid, E air) – diagonals: NW (bit 0), SW (bit 1)
const E_AIR: TileSrc[] = [
  tile(11, 1), // 0  NW solid,  SW solid
  tile( 7, 0), // 1  NW missing, SW solid
  tile( 7, 1), // 2  NW solid,  SW missing
  tile( 2, 1), // 3  NW missing, SW missing
];

// cardMask 14 (ESW solid, N air) – diagonals: SE (bit 0), SW (bit 1)
const N_AIR: TileSrc[] = [
  tile(10, 0), // 0  SE solid,  SW solid
  tile( 5, 0), // 1  SE missing, SW solid
  tile( 6, 0), // 2  SE solid,  SW missing
  tile( 5, 2), // 3  SE missing, SW missing
];

// ── All-solid tiles (cardMask 15) – 4 diagonal bits: NW=1,NE=2,SW=4,SE=8 ─
const FILL = tile(10, 1); // pure interior fill (all diagonals solid or all missing)

const ALL_SOLID: TileSrc[] = [
  FILL,         //  0 – no missing diagonals (deep interior)
  tile( 9, 3),  //  1 – NW missing
  tile( 8, 3),  //  2 – NE missing
  tile( 4, 0),  //  3 – NW + NE missing
  tile(11, 3),  //  4 – SW missing
  tile( 7, 2),  //  5 – NW + SW missing
  tile( 8, 0),  //  6 – NE + SW missing (diagonal pair)
  tile( 3, 2),  //  7 – NW + NE + SW missing
  tile(10, 3),  //  8 – SE missing
  tile( 8, 1),  //  9 – NW + SE missing (diagonal pair)
  tile( 8, 2),  // 10 – NE + SE missing
  tile( 4, 2),  // 11 – NW + NE + SE missing
  tile( 4, 1),  // 12 – SE + SW missing
  tile( 3, 3),  // 13 – NW + SE + SW missing
  tile( 4, 3),  // 14 – NE + SE + SW missing
  FILL,         // 15 – all diagonals missing (fall back to fill)
];

// ── Public API ────────────────────────────────────────────────────────────

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

  switch (cardMask) {
    // ── No neighbours ──────────────────────────────────────────────────
    case  0: return ISOLATED;

    // ── Single neighbour (cap tiles) ──────────────────────────────────
    case  1: return N_CAP;
    case  2: return E_CAP;
    case  4: return S_CAP;
    case  8: return W_CAP;

    // ── Opposite neighbours (strip tiles) ─────────────────────────────
    case  5: return NS_STRIP;
    case 10: return EW_STRIP;

    // ── L-corners (2 adjacent solid) – check the shared diagonal ──────
    case  6: return isSolid( 1,  1) ? ES_0 : ES_1;  // ES solid → SE diag
    case 12: return isSolid(-1,  1) ? SW_0 : SW_1;  // SW solid → SW diag
    case  3: return isSolid( 1, -1) ? NE_0 : NE_1;  // NE solid → NE diag
    case  9: return isSolid(-1, -1) ? NW_0 : NW_1;  // NW solid → NW diag

    // ── T-junctions (3 adjacent solid) – check 2 shared diagonals ─────
    case  7: { // NES solid, W air  — NE & SE diagonals
      const d = (!isSolid( 1, -1) ? 1 : 0) | (!isSolid( 1,  1) ? 2 : 0);
      return W_AIR[d];
    }
    case 11: { // NEW solid, S air  — NW & NE diagonals
      const d = (!isSolid(-1, -1) ? 1 : 0) | (!isSolid( 1, -1) ? 2 : 0);
      return S_AIR[d];
    }
    case 13: { // NSW solid, E air  — NW & SW diagonals
      const d = (!isSolid(-1, -1) ? 1 : 0) | (!isSolid(-1,  1) ? 2 : 0);
      return E_AIR[d];
    }
    case 14: { // ESW solid, N air  — SE & SW diagonals
      const d = (!isSolid( 1,  1) ? 1 : 0) | (!isSolid(-1,  1) ? 2 : 0);
      return N_AIR[d];
    }

    // ── All solid – resolve inner corners via diagonal mask ───────────
    default: { // cardMask === 15
      const diagMask =
        (!isSolid(-1, -1) ? 1 : 0) |  // NW missing
        (!isSolid( 1, -1) ? 2 : 0) |  // NE missing
        (!isSolid(-1,  1) ? 4 : 0) |  // SW missing
        (!isSolid( 1,  1) ? 8 : 0);   // SE missing
      return ALL_SOLID[diagMask];
    }
  }
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
