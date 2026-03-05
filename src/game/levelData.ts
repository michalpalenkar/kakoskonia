import type { TileZone } from './TileMap';
import { TILE_DSP } from './AutoTile';

export const TILE_COLS = 100;
export const TILE_ROWS = 23;

// Player spawn (pixel coords) — standing on ground (tile row 19)
export const SPAWN_X = 5 * TILE_DSP;
export const SPAWN_Y = 19 * TILE_DSP - 1;

/**
 * Level zones (solid tile blocks). World: 100 × 23 tiles at 64 px/tile.
 *
 * Physics reference (60 fps, JUMP_VEL = -14.5, GRAVITY_UP = 0.55):
 *   Single jump:  ≈ 3 tiles vertical reach,  ≈ 5 tiles horizontal
 *   Double jump:  ≈ 5 tiles vertical total,  ≈ 9 tiles horizontal
 *   (double jump resets mid-air; horizontal reach combines both jumps)
 *
 * Platform height deltas on the main path are ≤ 3 tiles (single-jump).
 * Optional high routes use ≤ 5-tile deltas (double-jump).
 * Horizontal gaps on main path are ≤ 4 tiles wide.
 */
const z = (col: number, row: number, w: number, h: number): TileZone =>
  ({ col, row, w, h });

export const LEVEL_ZONES: TileZone[] = [

  // ── Boundaries ───────────────────────────────────────────────────────────
  z(  0,  0, 100,  1),   // ceiling
  z(  0,  0,   1, 23),   // left wall
  z( 99,  0,   1, 23),   // right wall

  // ── Ground floor (split around the pit at x = 17–20) ─────────────────────
  z(  1, 19,  16,  4),   // left ground  (x = 1–16)
  z( 21, 19,  78,  4),   // right ground (x = 21–98)
  // Pit at x = 17–20 (4 tiles wide).  Player can jump over or use bridge above.
  // Bottom of pit (y=22) is the ceiling row of the zone below, so no tile there.
  // The 4-tile horizontal gap is jumpable in a single jump.

  // ── Section 1: Entry ramp (x = 1–16) ─────────────────────────────────────
  // Player spawns at (5, 18) on ground (y=19).
  // Each ledge is ≤ 3 rows above the previous reachable surface.
  z(  3, 17,  5,  2),    // ledge A  (+2 above ground y=19) — single jump ✓
  z(  9, 15,  4,  2),    // ledge B  (+2 above A) ✓
  z( 14, 13,  4,  2),    // ledge C  (+2 above B) ✓
  z(  8, 11,  4,  2),    // ledge D  (+2 above C, leftward)  optional high route

  // ── Bridge over the pit (x = 17–21) ──────────────────────────────────────
  z( 16, 17,  6,  2),    // bridge spans gap — reachable from ground or ledge A ✓
  // (horiz. gap from ground at x=16 to bridge at x=16 = same tile, no gap)

  // ── Section 2: Right of pit (x = 21–40) ─────────────────────────────────
  z( 24, 15,  4,  2),    // +2 from bridge (y=17) ✓
  z( 29, 17,  4,  2),    // -2 back down ✓
  z( 34, 15,  4,  2),    // +2 ✓
  z( 39, 17,  3,  2),    // -2 ✓

  // Upper chamber (double-jump route, +2 above ledge at y=15)
  z( 25, 12,  4,  2),    // +3 from y=15 ✓ single jump (barely)
  z( 30,  9,  3,  2),    // +3 from y=12 ✓
  z( 35, 12,  4,  2),    // -3 ✓

  // ── Section 3: Vertical ascent (x = 40–58) ───────────────────────────────
  z( 43, 15,  3,  2),    // +2 from ground (y=19 at x=43) ✓
  z( 47, 13,  3,  2),    // +2 ✓
  z( 44, 11,  3,  2),    // +2 ✓
  z( 48,  9,  3,  2),    // +2 ✓
  z( 44,  7,  3,  2),    // +2 (double jump assists) ✓
  z( 50,  9,  3,  2),    // from y=7 +2 right ✓
  z( 54, 12,  3,  2),    // -3 descent ✓
  z( 57, 15,  3,  2),    // -3 ✓

  // ── Section 4: Horizontal run (x = 57–74) ────────────────────────────────
  z( 60, 17,  4,  2),    // -2 ✓
  z( 65, 15,  4,  2),    // +2 ✓
  z( 70, 17,  4,  2),    // -2 ✓
  z( 74, 15,  3,  2),    // +2 ✓

  // Elevated high route above section 4 (double jump)
  z( 60, 11,  4,  2),    // +4 from y=15 — double jump ✓
  z( 65,  9,  4,  2),    // +2 ✓
  z( 70, 11,  4,  2),    // +2 ✓

  // ── Section 5: Final approach (x = 74–98) ────────────────────────────────
  z( 77, 17,  4,  2),    // -2 from y=15 ✓
  z( 82, 15,  3,  2),    // +2 ✓
  z( 78, 12,  4,  2),    // +3 ✓
  z( 85, 15,  3,  2),    // -3 ✓
  z( 89, 17,  3,  2),    // -2 ✓
  z( 92, 15,  2,  2),    // +2 ✓
  z( 89, 11,  4,  2),    // +4 double jump ✓
  z( 94, 13,  3,  2),    // -2 ✓
  z( 97, 16,  2,  2),    // -3 ✓
];
