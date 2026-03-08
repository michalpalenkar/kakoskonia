const elementModules = import.meta.glob('../assets/elements/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface ElementAsset {
  id: string;
  label: string;
  filename: string;
  url: string;
}

function toLabel(id: string): string {
  return id.replace(/[_-]+/g, ' ');
}

export const ELEMENT_ASSETS: ElementAsset[] = Object.entries(elementModules)
  .map(([path, url]) => {
    const file = path.split('/').pop() ?? path;
    const id = file.replace(/\.[^.]+$/, '');
    return { id, label: toLabel(id), filename: file, url };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const ELEMENT_ASSET_BY_ID: Record<string, ElementAsset> = Object.fromEntries(
  ELEMENT_ASSETS.map(asset => [asset.id, asset]),
);
