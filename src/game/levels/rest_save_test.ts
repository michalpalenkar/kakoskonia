import { TILE_DSP } from '../AutoTile';
import { z, e, el, fn } from './levelTools';
import type { TileZone, EnemyPlacement, LevelElement, FountainPlacement } from './levelTools';

export const LEVEL_ID = 'f6a7b8c9-d0e1-4fb2-d3e4-f5a6b7c8d9e0';

export const TILE_COLS = 100;
export const TILE_ROWS = 23;

export const SPAWN_X = 3 * TILE_DSP;
export const SPAWN_Y = 5 * TILE_DSP - 1;

export const LEVEL_ZONES: TileZone[] = [
  z(  0,  0, 100,  1),
  z(  0,  1,   1, 22),
  z( 99,  1,   1, 22),
  z(  1,  5,  11,  1),
  z( 11,  6,   2,  1),
  z( 12,  7,   2,  1),
  z( 13,  8,   3,  1),
  z( 15,  9,   3,  1),
  z( 22,  9,   6,  1),
  z( 17, 10,   5,  1),
  z(  1, 22,  98,  1),
];

export const ENEMIES: EnemyPlacement[] = [
  e('husenica',   9,  4, 2, true),
  e('husenica',  24,  8, 2, true),
];

export const FOUNTAINS: FountainPlacement[] = [
  fn('rodina',  19,  7),
];