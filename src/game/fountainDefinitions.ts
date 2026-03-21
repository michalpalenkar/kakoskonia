const fountainModules = import.meta.glob('../assets/fountains/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface FountainAsset {
  id: string;
  label: string;
  filename: string;
  url: string;
}

function toLabel(id: string): string {
  return id.replace(/[_-]+/g, ' ');
}

export const FOUNTAIN_ASSETS: FountainAsset[] = Object.entries(fountainModules)
  .map(([path, url]) => {
    const file = path.split('/').pop() ?? path;
    const id = file.replace(/\.[^.]+$/, '');
    return { id, label: toLabel(id), filename: file, url };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const FOUNTAIN_ASSET_BY_ID: Record<string, FountainAsset> = Object.fromEntries(
  FOUNTAIN_ASSETS.map(asset => [asset.id, asset]),
);
