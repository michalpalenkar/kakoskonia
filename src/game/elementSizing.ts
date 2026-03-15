export interface ElementTileRatio {
  ratioW: number;
  ratioH: number;
}

/**
 * Convert source image pixel size to tile ratios (tile base: 128x128).
 * Oversized tall-plant exports are normalized to 1x2 tiles.
 */
export function computeElementTileRatio(widthPx: number, heightPx: number): ElementTileRatio {
  const rawW = widthPx / 128;
  const rawH = heightPx / 128;

  const aspect = rawH / Math.max(0.001, rawW);
  const looksLikeOversizedTallPlant =
    rawW > 2 &&
    rawH > 4 &&
    aspect > 1.8 &&
    aspect < 2.2;

  if (looksLikeOversizedTallPlant) {
    return { ratioW: 1, ratioH: 2 };
  }

  return { ratioW: rawW, ratioH: rawH };
}
