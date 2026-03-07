import type { TileZone } from '../TileMap';
import type { EnemyPlacement } from './levelTools';
import * as hlavacikova from './hlavacikova';
import * as kedy_pucdej from './kedy_pucdej';
import * as tami_level_backup from './tami_level_backup';
import * as vyhlad_na_rakusko from './vyhlad_na_rakusko';

function optionalModuleField<T>(mod: object, field: string): T | undefined {
  if (!(field in mod)) return undefined;
  return (mod as Record<string, unknown>)[field] as T;
}

export interface LevelData {
  id: number;
  name: string;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  zones: TileZone[];
  waterZones?: TileZone[];
  bgPreset?: string;
  enemies?: EnemyPlacement[];
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: 'Hlavacikova',
    cols: hlavacikova.TILE_COLS,
    rows: hlavacikova.TILE_ROWS,
    spawnX: hlavacikova.SPAWN_X,
    spawnY: hlavacikova.SPAWN_Y,
    zones: hlavacikova.LEVEL_ZONES,
    waterZones: optionalModuleField<TileZone[]>(hlavacikova, 'WATER_ZONES') ?? [],
    bgPreset: optionalModuleField<string>(hlavacikova, 'BG_PRESET'),
    enemies: optionalModuleField<EnemyPlacement[]>(hlavacikova, 'ENEMIES') ?? [],
  },
  {
    id: 2,
    name: 'Kedy pucdej',
    cols: kedy_pucdej.TILE_COLS,
    rows: kedy_pucdej.TILE_ROWS,
    spawnX: kedy_pucdej.SPAWN_X,
    spawnY: kedy_pucdej.SPAWN_Y,
    zones: kedy_pucdej.LEVEL_ZONES,
    waterZones: optionalModuleField<TileZone[]>(kedy_pucdej, 'WATER_ZONES') ?? [],
    bgPreset: optionalModuleField<string>(kedy_pucdej, 'BG_PRESET'),
    enemies: optionalModuleField<EnemyPlacement[]>(kedy_pucdej, 'ENEMIES') ?? [],
  },
  {
    id: 3,
    name: 'Tami level backup',
    cols: tami_level_backup.TILE_COLS,
    rows: tami_level_backup.TILE_ROWS,
    spawnX: tami_level_backup.SPAWN_X,
    spawnY: tami_level_backup.SPAWN_Y,
    zones: tami_level_backup.LEVEL_ZONES,
    waterZones: optionalModuleField<TileZone[]>(tami_level_backup, 'WATER_ZONES') ?? [],
    bgPreset: optionalModuleField<string>(tami_level_backup, 'BG_PRESET'),
    enemies: optionalModuleField<EnemyPlacement[]>(tami_level_backup, 'ENEMIES') ?? [],
  },
  {
    id: 4,
    name: 'Vyhlad na rakusko',
    cols: vyhlad_na_rakusko.TILE_COLS,
    rows: vyhlad_na_rakusko.TILE_ROWS,
    spawnX: vyhlad_na_rakusko.SPAWN_X,
    spawnY: vyhlad_na_rakusko.SPAWN_Y,
    zones: vyhlad_na_rakusko.LEVEL_ZONES,
    waterZones: optionalModuleField<TileZone[]>(vyhlad_na_rakusko, 'WATER_ZONES') ?? [],
    bgPreset: optionalModuleField<string>(vyhlad_na_rakusko, 'BG_PRESET'),
    enemies: optionalModuleField<EnemyPlacement[]>(vyhlad_na_rakusko, 'ENEMIES') ?? [],
  },
];
