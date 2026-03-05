/**
 * Removes the background from a sprite image using flood-fill from all edges.
 * Only pixels connected to the image border (above the RGB threshold) become
 * transparent — preserving the bird's white feathers.
 */
export function loadSpriteTransparent(
  src: string,
  threshold = 240
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      const visited = new Uint8Array(w * h);

      // Iterative flood-fill (BFS) starting from all edge pixels
      const queue: number[] = [];

      const isBackground = (idx: number): boolean => {
        const p = idx * 4;
        return d[p] >= threshold && d[p + 1] >= threshold && d[p + 2] >= threshold;
      };

      const enqueue = (x: number, y: number) => {
        const idx = y * w + x;
        if (visited[idx]) return;
        if (!isBackground(idx)) return;
        visited[idx] = 1;
        queue.push(idx);
      };

      // Seed from all four edges
      for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
      for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

      while (queue.length > 0) {
        const idx = queue.pop()!;
        d[idx * 4 + 3] = 0; // make transparent
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0)     enqueue(x - 1, y);
        if (x < w - 1) enqueue(x + 1, y);
        if (y > 0)     enqueue(x, y - 1);
        if (y < h - 1) enqueue(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
