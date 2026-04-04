import { TILE_DSP } from '../AutoTile';
import { z, e } from './levelTools';
import type { TileZone, EnemyPlacement } from './levelTools';

export const LEVEL_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

export const TILE_COLS = 100;
export const TILE_ROWS = 23;

export const SPAWN_X = 1 * TILE_DSP;
export const SPAWN_Y = 3 * TILE_DSP - 1;
export const BGM_PRESET = 'dunaj';

export const LEVEL_ZONES: TileZone[] = [
  z(  0,  0, 100,  1),
  z(  0,  1,   1, 22),
  z(  7,  1,   8, 15),
  z( 99,  1,   1, 22),
  z(  1,  3,   1, 13),
  z(  2,  4,   1, 12),
  z(  3,  6,   1, 10),
  z(  4,  9,   1,  7),
  z( 15,  9,   1,  7),
  z( 18, 17,   2,  6),
  z( 17, 18,   1,  5),
  z( 15, 19,   2,  4),
  z(  1, 22,  14,  1),
  z( 20, 22,  79,  1),
];

export const WATER_ZONES: TileZone[] = [
  z(  1, 19,  14,  3),
];
