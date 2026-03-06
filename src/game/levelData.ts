import type { TileZone } from './TileMap';
import { TILE_DSP } from './AutoTile';

const z = (col: number, row: number, w: number, h: number): TileZone =>
  ({ col, row, w, h });

export const TILE_COLS = 20;
export const TILE_ROWS = 57;

export const SPAWN_X = 1 * TILE_DSP;
export const SPAWN_Y = 5 * TILE_DSP - 1;

export const LEVEL_ZONES: TileZone[] = [
  z(  0,  0,  20,  1),
  z(  0,  1,   1, 56),
  z( 19,  1,   1, 56),
  z(  1,  6,   3,  1),
  z(  3,  7,   1,  8),
  z(  4, 14,   1,  4),
  z(  5, 17,   2,  1),
  z(  6, 18,   2,  1),
  z( 15, 18,   3,  1),
  z( 14, 19,   2,  1),
  z( 13, 20,   1,  1),
  z( 11, 21,   2,  1),
  z( 10, 22,   2,  1),
  z(  9, 23,   2,  1),
  z(  9, 24,   1,  6),
  z(  8, 29,   1,  1),
  z(  6, 30,   2,  1),
  z(  5, 31,   1,  1),
  z(  1, 37,   5,  1),
  z(  6, 38,   1,  2),
  z(  7, 39,   1,  2),
  z(  7, 43,   1,  2),
  z(  8, 44,   1,  3),
  z( 11, 45,   5,  1),
  z(  9, 46,   1,  2),
  z( 11, 46,   1,  4),
  z( 15, 46,   2,  1),
  z( 10, 47,   1,  1),
  z( 16, 47,   1,  3),
  z( 12, 49,   1,  2),
  z( 17, 49,   1,  3),
  z( 13, 51,   1,  1),
  z( 14, 52,   3,  1),
  z(  1, 56,  18,  1),
];