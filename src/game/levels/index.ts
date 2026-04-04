import type { TileZone } from "../TileMap";
import type {
  EnemyPlacement,
  LevelElement,
  FountainPlacement,
} from "./levelTools";
import * as dunaj from "./dunaj";
import * as evin_level from "./evin_level";
import * as hlavacikova from "./hlavacikova";
import * as kedy_pucdej from "./kedy_pucdej";
import * as rest_save_test from "./rest_save_test";
import * as tami_level_backup from "./tami_level_backup";
import * as vyhlad_na_rakusko from "./vyhlad_na_rakusko";

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
}

export const LEVELS: LevelData[] = [
  {
    id: dunaj.LEVEL_ID,
    name: "Dunaj",
    cols: dunaj.TILE_COLS,
    rows: dunaj.TILE_ROWS,
    spawnX: dunaj.SPAWN_X,
    spawnY: dunaj.SPAWN_Y,
    zones: dunaj.LEVEL_ZONES,
    waterZones: (dunaj as any).WATER_ZONES ?? [],
    bgPreset: (dunaj as any).BG_PRESET ?? undefined,
    bgmPreset: (dunaj as any).BGM_PRESET ?? undefined,
    tilePreset: (dunaj as any).TILE_PRESET ?? undefined,
    enemies: (dunaj as any).ENEMIES ?? [],
    elements: (dunaj as any).ELEMENTS ?? [],
    fountains: (dunaj as any).FOUNTAINS ?? [],
  },
  {
    id: evin_level.LEVEL_ID,
    name: "Evin level",
    cols: evin_level.TILE_COLS,
    rows: evin_level.TILE_ROWS,
    spawnX: evin_level.SPAWN_X,
    spawnY: evin_level.SPAWN_Y,
    zones: evin_level.LEVEL_ZONES,
    waterZones: (evin_level as any).WATER_ZONES ?? [],
    bgPreset: (evin_level as any).BG_PRESET ?? undefined,
    bgmPreset: (evin_level as any).BGM_PRESET ?? undefined,
    tilePreset: (evin_level as any).TILE_PRESET ?? undefined,
    enemies: (evin_level as any).ENEMIES ?? [],
    elements: (evin_level as any).ELEMENTS ?? [],
    fountains: (evin_level as any).FOUNTAINS ?? [],
  },
  {
    id: hlavacikova.LEVEL_ID,
    name: "Hlavacikova",
    cols: hlavacikova.TILE_COLS,
    rows: hlavacikova.TILE_ROWS,
    spawnX: hlavacikova.SPAWN_X,
    spawnY: hlavacikova.SPAWN_Y,
    zones: hlavacikova.LEVEL_ZONES,
    waterZones: (hlavacikova as any).WATER_ZONES ?? [],
    bgPreset: (hlavacikova as any).BG_PRESET ?? undefined,
    bgmPreset: (hlavacikova as any).BGM_PRESET ?? undefined,
    tilePreset: (hlavacikova as any).TILE_PRESET ?? undefined,
    enemies: (hlavacikova as any).ENEMIES ?? [],
    elements: (hlavacikova as any).ELEMENTS ?? [],
    fountains: (hlavacikova as any).FOUNTAINS ?? [],
  },
  {
    id: kedy_pucdej.LEVEL_ID,
    name: "Kedy pucdej",
    cols: kedy_pucdej.TILE_COLS,
    rows: kedy_pucdej.TILE_ROWS,
    spawnX: kedy_pucdej.SPAWN_X,
    spawnY: kedy_pucdej.SPAWN_Y,
    zones: kedy_pucdej.LEVEL_ZONES,
    waterZones: (kedy_pucdej as any).WATER_ZONES ?? [],
    bgPreset: (kedy_pucdej as any).BG_PRESET ?? undefined,
    bgmPreset: (kedy_pucdej as any).BGM_PRESET ?? undefined,
    tilePreset: (kedy_pucdej as any).TILE_PRESET ?? undefined,
    enemies: (kedy_pucdej as any).ENEMIES ?? [],
    elements: (kedy_pucdej as any).ELEMENTS ?? [],
    fountains: (kedy_pucdej as any).FOUNTAINS ?? [],
  },
  {
    id: rest_save_test.LEVEL_ID,
    name: "Rest save test",
    cols: rest_save_test.TILE_COLS,
    rows: rest_save_test.TILE_ROWS,
    spawnX: rest_save_test.SPAWN_X,
    spawnY: rest_save_test.SPAWN_Y,
    zones: rest_save_test.LEVEL_ZONES,
    waterZones: (rest_save_test as any).WATER_ZONES ?? [],
    bgPreset: (rest_save_test as any).BG_PRESET ?? undefined,
    bgmPreset: (rest_save_test as any).BGM_PRESET ?? undefined,
    tilePreset: (rest_save_test as any).TILE_PRESET ?? undefined,
    enemies: (rest_save_test as any).ENEMIES ?? [],
    elements: (rest_save_test as any).ELEMENTS ?? [],
    fountains: (rest_save_test as any).FOUNTAINS ?? [],
  },
  {
    id: tami_level_backup.LEVEL_ID,
    name: "Tami level backup",
    cols: tami_level_backup.TILE_COLS,
    rows: tami_level_backup.TILE_ROWS,
    spawnX: tami_level_backup.SPAWN_X,
    spawnY: tami_level_backup.SPAWN_Y,
    zones: tami_level_backup.LEVEL_ZONES,
    waterZones: (tami_level_backup as any).WATER_ZONES ?? [],
    bgPreset: (tami_level_backup as any).BG_PRESET ?? undefined,
    bgmPreset: (tami_level_backup as any).BGM_PRESET ?? undefined,
    tilePreset: (tami_level_backup as any).TILE_PRESET ?? undefined,
    enemies: (tami_level_backup as any).ENEMIES ?? [],
    elements: (tami_level_backup as any).ELEMENTS ?? [],
    fountains: (tami_level_backup as any).FOUNTAINS ?? [],
  },
  {
    id: vyhlad_na_rakusko.LEVEL_ID,
    name: "Vyhlad na rakusko",
    cols: vyhlad_na_rakusko.TILE_COLS,
    rows: vyhlad_na_rakusko.TILE_ROWS,
    spawnX: vyhlad_na_rakusko.SPAWN_X,
    spawnY: vyhlad_na_rakusko.SPAWN_Y,
    zones: vyhlad_na_rakusko.LEVEL_ZONES,
    waterZones: (vyhlad_na_rakusko as any).WATER_ZONES ?? [],
    bgPreset: (vyhlad_na_rakusko as any).BG_PRESET ?? undefined,
    bgmPreset: (vyhlad_na_rakusko as any).BGM_PRESET ?? undefined,
    tilePreset: (vyhlad_na_rakusko as any).TILE_PRESET ?? undefined,
    enemies: (vyhlad_na_rakusko as any).ENEMIES ?? [],
    elements: (vyhlad_na_rakusko as any).ELEMENTS ?? [],
    fountains: (vyhlad_na_rakusko as any).FOUNTAINS ?? [],
  },
];
