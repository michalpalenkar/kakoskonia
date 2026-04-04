import type { TileZone } from '../TileMap';
import type { EnemyPlacement, LevelElement, FountainPlacement, GateZone } from './levelTools';
import * as dunaj from './dunaj';
import * as evin_level from './evin_level';
import * as hlavacikova from './hlavacikova';
import * as kedy_pucdej from './kedy_pucdej';
import * as level_1_gates from './level_1_gates';
import * as level_2_gates from './level_2_gates';
import * as rest_save_test from './rest_save_test';
import * as tami_level_backup from './tami_level_backup';
import * as vyhlad_na_rakusko from './vyhlad_na_rakusko';

export interface LevelData {
  id: string;
  name: string;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  zones: TileZone[];
  waterZones?: TileZone[];
  bgPreset?: string;
  bgmPreset?: string;
  tilePreset?: string;
  enemies?: EnemyPlacement[];
  elements?: LevelElement[];
  fountains?: FountainPlacement[];
  gates?: GateZone[];
}

type LevelModule = {
  LEVEL_ID?: string;
  TILE_COLS: number;
  TILE_ROWS: number;
  SPAWN_X: number;
  SPAWN_Y: number;
  LEVEL_ZONES: TileZone[];
  WATER_ZONES?: TileZone[];
  BG_PRESET?: string;
  BGM_PRESET?: string;
  TILE_PRESET?: string;
  ENEMIES?: EnemyPlacement[];
  ELEMENTS?: LevelElement[];
  FOUNTAINS?: FountainPlacement[];
  GATES?: GateZone[];
};

function defineLevel(level: LevelModule, fallbackId: string, name: string): LevelData {
  return {
    id: level.LEVEL_ID ?? fallbackId,
    name,
    cols: level.TILE_COLS,
    rows: level.TILE_ROWS,
    spawnX: level.SPAWN_X,
    spawnY: level.SPAWN_Y,
    zones: level.LEVEL_ZONES,
    waterZones: level.WATER_ZONES ?? [],
    bgPreset: level.BG_PRESET ?? undefined,
    bgmPreset: level.BGM_PRESET ?? undefined,
    tilePreset: level.TILE_PRESET ?? undefined,
    enemies: level.ENEMIES ?? [],
    elements: level.ELEMENTS ?? [],
    fountains: level.FOUNTAINS ?? [],
    gates: level.GATES ?? [],
  };
}

export const LEVELS: LevelData[] = [
  defineLevel(dunaj as LevelModule, 'dunaj', 'Dunaj'),
  defineLevel(evin_level as LevelModule, 'evin_level', 'Evin level'),
  defineLevel(hlavacikova as LevelModule, 'hlavacikova', 'Hlavacikova'),
  defineLevel(kedy_pucdej as LevelModule, 'kedy_pucdej', 'Kedy pucdej'),
  defineLevel(level_1_gates as LevelModule, 'level_1_gates', 'Level 1 gates'),
  defineLevel(level_2_gates as LevelModule, 'level_2_gates', 'Level 2 gates'),
  defineLevel(rest_save_test as LevelModule, 'rest_save_test', 'Rest save test'),
  defineLevel(tami_level_backup as LevelModule, 'tami_level_backup', 'Tami level backup'),
  defineLevel(vyhlad_na_rakusko as LevelModule, 'vyhlad_na_rakusko', 'Vyhlad na rakusko'),
];
