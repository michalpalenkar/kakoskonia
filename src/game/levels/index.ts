import type { TileZone } from '../TileMap';
import * as level1 from './level1';
import * as level2 from './level2';
import * as level_miso from './level_miso';

export interface LevelData {
  id: number;
  name: string;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  zones: TileZone[];
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: 'Level 1',
    cols: level1.TILE_COLS,
    rows: level1.TILE_ROWS,
    spawnX: level1.SPAWN_X,
    spawnY: level1.SPAWN_Y,
    zones: level1.LEVEL_ZONES,
  },
  {
    id: 2,
    name: 'Level 2',
    cols: level2.TILE_COLS,
    rows: level2.TILE_ROWS,
    spawnX: level2.SPAWN_X,
    spawnY: level2.SPAWN_Y,
    zones: level2.LEVEL_ZONES,
  },
  {
    id: 3,
    name: 'Level miso',
    cols: level_miso.TILE_COLS,
    rows: level_miso.TILE_ROWS,
    spawnX: level_miso.SPAWN_X,
    spawnY: level_miso.SPAWN_Y,
    zones: level_miso.LEVEL_ZONES,
  },
];
