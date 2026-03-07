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
