import { TILE_DSP } from '../AutoTile';
import { z, e, el, fn, gt } from './levelTools';
import type { TileZone, EnemyPlacement, LevelElement, FountainPlacement, GateZone } from './levelTools';

export const LEVEL_ID = 'd404804a-cb4d-4675-b668-956587f2cad7';

export const TILE_COLS = 41;
export const TILE_ROWS = 31;

export const SPAWN_X = 7 * TILE_DSP;
export const SPAWN_Y = 16 * TILE_DSP - 1;

export const LEVEL_ZONES: TileZone[] = [
  z(  0,  0,  41,  1),
  z(  0,  1,   1, 30),
  z(  8,  1,   1,  5),
  z( 16,  1,   1,  4),
  z( 40,  1,   1, 30),
  z( 17,  4,   1,  3),
  z(  7,  5,   1,  4),
  z( 18,  6,   1,  2),
  z( 19,  7,   1,  2),
  z(  6,  8,   1,  4),
  z( 10,  8,   5,  1),
  z( 20,  8,   1,  6),
  z(  1, 11,   5,  1),
  z( 21, 13,  14,  1),
  z( 35, 14,   4,  1),
  z(  1, 15,   4,  1),
  z(  4, 16,   3,  1),
  z(  7, 17,   2,  1),
  z(  8, 18,   2,  1),
  z(  9, 19,   2,  1),
  z( 21, 19,  14,  1),
  z( 10, 20,   2,  1),
  z( 21, 20,   1,  4),
  z( 35, 20,   3,  1),
  z( 11, 21,   1,  2),
  z( 38, 21,   2,  1),
  z( 12, 22,   1,  2),
  z( 13, 23,   1,  3),
  z( 22, 24,   1,  2),
  z( 14, 25,   1,  2),
  z( 15, 26,   1,  2),
  z( 23, 26,   1,  3),
  z( 16, 27,   1,  2),
  z( 17, 28,   1,  3),
  z( 24, 28,   1,  3),
  z(  1, 30,  16,  1),
  z( 18, 30,   6,  1),
  z( 25, 30,  15,  1),
];

export const GATES: GateZone[] = [
  gt(  3, 12,   1,  3, 'df2344fa-bc5b-42eb-989a-d0300f6c1acb'),
  gt( 17, 27,   6,  1, 'df2344fa-bc5b-42eb-989a-d0300f6c1acb'),
  gt( 34, 14,   1,  5, 'df2344fa-bc5b-42eb-989a-d0300f6c1acb'),
  gt(  9,  5,   8,  1, 'df2344fa-bc5b-42eb-989a-d0300f6c1acb'),
];