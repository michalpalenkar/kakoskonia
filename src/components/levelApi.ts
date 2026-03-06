export interface LevelInfo {
  filename: string;
  name: string;
  cols: number;
  rows: number;
  spawnCol: number;
  spawnRow: number;
  zones: { col: number; row: number; w: number; h: number }[];
}

export async function listLevels(): Promise<LevelInfo[]> {
  const res = await fetch('/api/levels');
  return res.json();
}

export async function loadLevel(name: string): Promise<LevelInfo> {
  const res = await fetch(`/api/levels/load?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function saveLevel(filename: string, content: string): Promise<void> {
  const res = await fetch('/api/levels/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}

export async function saveAsLevel(name: string, content: string): Promise<string> {
  const res = await fetch('/api/levels/save-as', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.filename;
}

export async function deleteLevel(filename: string): Promise<void> {
  const res = await fetch('/api/levels/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}

/** Generate a random playable level grid within given dimensions */
export function generateRandomLevel(cols: number, rows: number): {
  grid: Set<string>;
  playerCol: number;
  playerRow: number;
} {
  const key = (c: number, r: number) => `${c},${r}`;
  const grid = new Set<string>();
  const has = (c: number, r: number) => grid.has(key(c, r));
  const set = (c: number, r: number) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) grid.add(key(c, r));
  };

  // borders
  for (let c = 0; c < cols; c++) { set(c, 0); set(c, rows - 1); }
  for (let r = 1; r < rows - 1; r++) { set(0, r); set(cols - 1, r); }

  const innerW = cols - 2;
  const innerH = rows - 2;
  const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const chance = (p: number) => Math.random() < p;

  // Track platforms for reachability: each has { row, startCol, endCol }
  type Plat = { row: number; c0: number; c1: number };
  const platforms: Plat[] = [];

  const addPlat = (c0: number, row: number, w: number, thickness: number = 1) => {
    const c1 = Math.min(cols - 2, c0 + w - 1);
    for (let r = row; r < row + thickness && r < rows - 1; r++) {
      for (let c = c0; c <= c1; c++) set(c, r);
    }
    platforms.push({ row, c0, c1 });
    return { c0, c1 };
  };

  // ── Generate platform layers from top to bottom ──

  // Vertical spacing adapts to level height
  const avgGap = Math.max(3, Math.min(5, Math.floor(innerH / 10)));
  let curRow = rand(3, 5);
  let lastC0 = rand(1, Math.max(1, Math.floor(innerW * 0.3)));
  let lastC1 = lastC0 + rand(3, Math.min(8, innerW - 2));

  // First platform (spawn platform) — always wide enough
  const spawnW = Math.max(4, rand(4, Math.min(10, innerW - 2)));
  const spawnStart = rand(1, Math.max(1, innerW - spawnW));
  const sp = addPlat(spawnStart, curRow, spawnW);
  lastC0 = sp.c0;
  lastC1 = sp.c1;

  const playerCol = rand(sp.c0 + 1, sp.c1);
  const playerRow = curRow - 1;

  curRow += rand(avgGap, avgGap + 2);

  while (curRow < rows - 3) {
    const lastMid = Math.floor((lastC0 + lastC1) / 2);
    // Max horizontal jump ~8 tiles, so keep platforms reachable
    const jumpReach = 8;

    // Decide pattern for this layer
    const pattern = Math.random();

    if (pattern < 0.25 && innerW > 10) {
      // ── Staircase: 2-3 small stepped platforms ──
      const steps = rand(2, 3);
      const dir = chance(0.5) ? 1 : -1;
      let sc = dir > 0
        ? Math.max(1, lastMid - rand(2, 5))
        : Math.min(cols - 5, lastMid + rand(0, 3));

      for (let s = 0; s < steps && curRow < rows - 3; s++) {
        const sw = rand(2, 4);
        const clamped = Math.max(1, Math.min(cols - 1 - sw, sc));
        const p = addPlat(clamped, curRow, sw);
        if (s === 0) { lastC0 = p.c0; }
        lastC1 = p.c1;
        sc += dir * rand(3, 5);
        curRow += rand(2, 3);
      }
    } else if (pattern < 0.45 && innerW > 12) {
      // ── Wide shelf with gap(s) ──
      const shelfW = rand(Math.floor(innerW * 0.5), innerW);
      const shelfStart = Math.max(1, Math.min(cols - 1 - shelfW,
        lastMid - Math.floor(shelfW / 2)));
      // Place shelf tiles but leave 1-2 gaps
      const numGaps = rand(1, 2);
      const gapPositions = new Set<number>();
      for (let g = 0; g < numGaps; g++) {
        gapPositions.add(shelfStart + rand(2, shelfW - 3));
      }
      for (let c = shelfStart; c < shelfStart + shelfW && c < cols - 1; c++) {
        if (!gapPositions.has(c) && !gapPositions.has(c - 1)) {
          set(c, curRow);
        }
      }
      platforms.push({ row: curRow, c0: shelfStart, c1: Math.min(cols - 2, shelfStart + shelfW - 1) });
      lastC0 = shelfStart;
      lastC1 = Math.min(cols - 2, shelfStart + shelfW - 1);
      curRow += rand(avgGap, avgGap + 2);
    } else if (pattern < 0.65) {
      // ── L-shape or T-shape platform ──
      const baseW = rand(4, Math.min(8, innerW - 2));
      const baseStart = Math.max(1, Math.min(cols - 1 - baseW,
        lastMid - Math.floor(baseW / 2) + rand(-3, 3)));
      const p = addPlat(baseStart, curRow, baseW);

      // Vertical arm
      const armCol = chance(0.5) ? p.c0 : p.c1;
      const armH = rand(2, 4);
      const armDir = chance(0.6) ? 1 : -1; // down or up
      for (let dr = 1; dr <= armH; dr++) {
        const ar = curRow + armDir * dr;
        if (ar > 0 && ar < rows - 1) set(armCol, ar);
      }

      // Optional crossbar for T-shape
      if (chance(0.4)) {
        const crossRow = curRow + (armDir > 0 ? armH : -armH);
        if (crossRow > 0 && crossRow < rows - 1) {
          const crossW = rand(2, 4);
          const crossStart = Math.max(1, armCol - Math.floor(crossW / 2));
          for (let c = crossStart; c < crossStart + crossW && c < cols - 1; c++) {
            set(c, crossRow);
          }
        }
      }

      lastC0 = p.c0;
      lastC1 = p.c1;
      curRow += rand(avgGap, avgGap + 2);
    } else if (pattern < 0.80) {
      // ── Chunky block / pillar ──
      const blockW = rand(2, 4);
      const blockH = rand(2, 4);
      const bc = Math.max(1, Math.min(cols - 1 - blockW,
        lastMid + rand(-jumpReach, jumpReach) - Math.floor(blockW / 2)));
      for (let dr = 0; dr < blockH && curRow + dr < rows - 1; dr++) {
        for (let dc = 0; dc < blockW; dc++) {
          set(bc + dc, curRow + dr);
        }
      }
      platforms.push({ row: curRow, c0: bc, c1: bc + blockW - 1 });

      // Add a connecting thin platform to ensure reachability
      if (chance(0.6)) {
        const bridgeW = rand(2, 4);
        const bridgeC = chance(0.5) ? bc - bridgeW - 1 : bc + blockW + 1;
        const clampedBridge = Math.max(1, Math.min(cols - 1 - bridgeW, bridgeC));
        addPlat(clampedBridge, curRow, bridgeW);
      }

      lastC0 = bc;
      lastC1 = bc + blockW - 1;
      curRow += blockH + rand(2, avgGap);
    } else {
      // ── Standard platform with embellishments ──
      const platW = rand(3, Math.min(8, innerW - 2));
      const platStart = Math.max(1, Math.min(cols - 1 - platW,
        lastMid + rand(-jumpReach, jumpReach) - Math.floor(platW / 2)));
      const thickness = chance(0.3) ? 2 : 1;
      const p = addPlat(platStart, curRow, platW, thickness);

      // Wall on one side
      if (chance(0.4)) {
        const wallSide = chance(0.5) ? p.c0 : p.c1;
        const wallH = rand(1, 3);
        for (let dr = 1; dr <= wallH; dr++) {
          if (curRow - dr > 0) set(wallSide, curRow - dr);
        }
      }

      // Small floating stepping stone nearby
      if (chance(0.5) && innerW > 8) {
        const stoneW = rand(1, 2);
        const stoneOff = chance(0.5) ? p.c1 + rand(2, 4) : p.c0 - rand(2, 4) - stoneW;
        const stoneC = Math.max(1, Math.min(cols - 2, stoneOff));
        const stoneR = curRow - rand(1, 2);
        if (stoneR > 1) {
          for (let dc = 0; dc < stoneW; dc++) set(stoneC + dc, stoneR);
        }
      }

      lastC0 = p.c0;
      lastC1 = p.c1;
      curRow += rand(avgGap, avgGap + 2);
    }

    // ── Occasional wall segments from borders ──
    if (chance(0.15)) {
      const wallLen = rand(2, Math.min(5, Math.floor(innerW * 0.3)));
      const wallRow = curRow - rand(1, 2);
      if (wallRow > 1 && wallRow < rows - 2) {
        const fromLeft = chance(0.5);
        for (let dc = 0; dc < wallLen; dc++) {
          set(fromLeft ? 1 + dc : cols - 2 - dc, wallRow);
        }
      }
    }
  }

  // ── Scatter a few single-tile decorative blocks ──
  const scatterCount = Math.floor(innerW * innerH * 0.008);
  for (let i = 0; i < scatterCount; i++) {
    const sc = rand(2, cols - 3);
    const sr = rand(2, rows - 3);
    if (!has(sc, sr) && !has(sc, sr - 1) && !has(sc, sr + 1)) {
      set(sc, sr);
    }
  }

  return { grid, playerCol, playerRow: Math.max(1, playerRow) };
}
