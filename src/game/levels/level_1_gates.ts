import { TILE_DSP } from '../AutoTile';
import { z, e, el, fn, gt } from './levelTools';
import type { TileZone, EnemyPlacement, LevelElement, FountainPlacement, GateZone } from './levelTools';

export const LEVEL_ID = 'df2344fa-bc5b-42eb-989a-d0300f6c1acb';

export const TILE_COLS = 37;
export const TILE_ROWS = 23;

export const SPAWN_X = 10 * TILE_DSP;
export const SPAWN_Y = 10 * TILE_DSP - 1;

export const LEVEL_ZONES: TileZone[] = [
  z(  0,  0,  37,  1),
  z(  0,  1,   1, 22),
  z( 15,  1,   1,  7),
  z( 21,  1,   1,  3),
  z( 27,  1,   1,  2),
  z( 36,  1,   1, 22),
  z( 26,  2,   1,  2),
  z( 20,  3,   1,  2),
  z( 25,  3,   1,  5),
  z( 18,  4,   2,  1),
  z( 17,  5,   2,  1),
  z( 26,  5,   1,  3),
  z( 16,  6,   2,  1),
  z( 24,  6,   1,  2),
  z(  1,  7,  14,  1),
  z( 22,  7,   2,  1),
  z( 27,  7,   9,  1),
  z( 20,  8,   3,  1),
  z(  1, 11,  14,  1),
  z( 18, 11,  18,  1),
  z( 14, 12,   1, 11),
  z( 18, 12,   1, 11),
  z(  1, 22,  13,  1),
  z( 15, 22,   3,  1),
  z( 19, 22,  17,  1),
];

export const GATES: GateZone[] = [
  gt(  5,  8,   1,  3, 'd404804a-cb4d-4675-b668-956587f2cad7'),
  gt( 32,  8,   1,  3, 'd404804a-cb4d-4675-b668-956587f2cad7'),
  gt( 15, 17,   3,  1, 'd404804a-cb4d-4675-b668-956587f2cad7'),
  gt( 22,  3,   3,  1, 'd404804a-cb4d-4675-b668-956587f2cad7'),
];
