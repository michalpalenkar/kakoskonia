import { TILE_DSP } from '../AutoTile';
import { z } from './levelTools';
import type { TileZone } from './levelTools';

export const TILE_COLS = 30;
export const TILE_ROWS = 40;

export const SPAWN_X = 2 * TILE_DSP;
export const SPAWN_Y = 5 * TILE_DSP - 1;

export const LEVEL_ZONES: TileZone[] = [
  // ceiling
  z(  0,  0, 30,  1),
  // left wall
  z(  0,  1,  1, 39),
  // right wall
  z( 29,  1,  1, 39),
  // floor
  z(  1, 39, 28,  1),

  // starting platform (top-left)
  z(  1,  6,  5,  1),

  // zigzag descent right
  z(  8,  8,  4,  1),
  z( 14,  10,  3,  1),
  z( 19,  8,  4,  1),
  z( 24,  6,  4,  1),

  // mid-left platforms
  z(  2, 12,  3,  1),
  z(  6, 14,  2,  1),
  z(  3, 17,  4,  1),

  // central tower
  z( 13, 13,  1,  8),
  z( 14, 13,  1,  1),
  z( 12, 20,  3,  1),

  // right side platforms
  z( 20, 14,  3,  1),
  z( 24, 12,  3,  1),
  z( 18, 17,  2,  1),
  z( 22, 18,  4,  1),
  z( 25, 19,  1,  4),

  // lower section - left
  z(  1, 22,  4,  1),
  z(  6, 24,  3,  1),
  z(  2, 27,  2,  1),
  z(  5, 28,  1,  4),

  // lower section - center
  z( 10, 23,  2,  1),
  z( 14, 25,  3,  1),
  z( 11, 27,  2,  1),
  z( 13, 29,  1,  3),

  // lower section - right
  z( 19, 22,  3,  1),
  z( 23, 24,  4,  1),
  z( 20, 27,  2,  1),
  z( 26, 27,  2,  1),

  // bottom platforms
  z(  2, 32,  3,  1),
  z(  7, 33,  2,  1),
  z( 11, 34,  4,  1),
  z( 17, 33,  3,  1),
  z( 22, 32,  2,  1),
  z( 26, 34,  2,  1),

  // near-floor stepping
  z(  4, 37,  2,  1),
  z(  9, 37,  3,  1),
  z( 15, 36,  2,  1),
  z( 20, 37,  4,  1),
  z( 26, 37,  2,  1),
];
