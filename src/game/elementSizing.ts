export interface ElementTileRatio {
  ratioW: number;
  ratioH: number;
}

/**
 * Convert source image pixel size to tile ratios (tile base: 128x128).
 * Oversized tall-plant exports are normalized to 1x2 tiles.
 */
export function computeElementTileRatio(
  widthPx: number,
  heightPx: number,
  elementId?: string,
): ElementTileRatio {
  const normalizedId = (elementId ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Hand-tuned overrides for specific assets.
  if (
    normalizedId === 'electrix box' ||
    normalizedId === 'electrix_box' ||
    normalizedId === 'electrix-box' ||
    normalizedId === 'electric box' ||
    normalizedId === 'electric_box' ||
    normalizedId === 'electric-box'
  ) {
    return { ratioW: 0.9, ratioH: 2 };
  }

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
