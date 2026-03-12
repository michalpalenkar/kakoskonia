const tileAssetModules = import.meta.glob('../assets/tiles/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function toPresetId(path: string): string {
  const filename = path.split('/').pop() ?? path;
  return filename.replace(/\.[^.]+$/, '');
}

function toLabel(presetId: string): string {
  return presetId
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const DEFAULT_TILE_PRESET = 'default';

export const TILE_PRESETS: Record<string, string> = Object.fromEntries(
  Object.entries(tileAssetModules)
    .map(([path, url]) => [toPresetId(path), url])
    .sort(([a], [b]) => a.localeCompare(b)),
);

export const TILE_PRESET_OPTIONS: { value: string; label: string }[] = Object.keys(TILE_PRESETS).map(value => ({
  value,
  label: toLabel(value),
}));

const firstAvailableTilePreset = Object.keys(TILE_PRESETS)[0];

export function resolveTilePresetUrl(tilePreset?: string): string {
  const fallbackPreset = TILE_PRESETS[DEFAULT_TILE_PRESET] != null
    ? DEFAULT_TILE_PRESET
    : firstAvailableTilePreset;
  if (!fallbackPreset) throw new Error('No tile presets found in src/assets/tiles');
  if (!tilePreset) return TILE_PRESETS[fallbackPreset];
  return TILE_PRESETS[tilePreset] ?? TILE_PRESETS[fallbackPreset];
}
