import type { TileZone } from '../TileMap';
import type { EnemyTypeId } from '../enemyDefinitions';

export type { TileZone };

/** Shorthand constructor for a rectangular tile zone. */
export const z = (col: number, row: number, w: number, h: number): TileZone =>
  ({ col, row, w, h });

export interface EnemyPlacement {
  type: EnemyTypeId;
  col: number;
  row: number;
  damage: number;
  moving: boolean;
}

/** Shorthand constructor for enemy placement with editable instance values. */
export const e = (
  type: EnemyTypeId,
  col: number,
  row: number,
  damage: number,
  moving: boolean,
): EnemyPlacement => ({ type, col, row, damage, moving });

export interface LevelElement {
  id: string;
  col: number;
  row: number;
}

/** Shorthand constructor for decorative element placement. */
export const el = (
  id: string,
  col: number,
  row: number,
): LevelElement => ({ id, col, row });

export interface FountainPlacement {
  id: string;
  col: number;
  row: number;
}

/** Shorthand constructor for fountain placement. */
export const fn = (
  id: string,
  col: number,
  row: number,
): FountainPlacement => ({ id, col, row });

export interface GateZone {
  col: number;
  row: number;
  w: number;
  h: number;
  targetLevelId: string;
}

/** Shorthand constructor for gate zone. */
export const gt = (
  col: number,
  row: number,
  w: number,
  h: number,
  targetLevelId: string,
): GateZone => ({ col, row, w, h, targetLevelId });
