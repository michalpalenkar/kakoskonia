import type { TileZone } from '../TileMap';

export type { TileZone };

/** Shorthand constructor for a rectangular tile zone. */
export const z = (col: number, row: number, w: number, h: number): TileZone =>
  ({ col, row, w, h });
