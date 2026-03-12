import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const LEVELS_DIR = resolve(__dirname, 'src/game/levels');
const INDEX_FILE = join(LEVELS_DIR, 'index.ts');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function getLevelFiles(): string[] {
  return readdirSync(LEVELS_DIR)
    .filter(f => /^level\d+\.ts$/.test(f) || (/\.ts$/.test(f) && f !== 'index.ts' && f !== 'levelTools.ts'))
    .map(f => f.replace('.ts', ''));
}

function extractArrayBlock(content: string, exportName: string): string | null {
  const start = content.indexOf(`export const ${exportName}`);
  if (start < 0) return null;
  const open = content.indexOf('[', start);
  if (open < 0) return null;
  const close = content.indexOf('];', open);
  if (close < 0) return null;
  return content.slice(open, close);
}

function parseZoneBlock(content: string, exportName: string): { col: number; row: number; w: number; h: number }[] {
  const block = extractArrayBlock(content, exportName);
  if (!block) return [];
  const zones: { col: number; row: number; w: number; h: number }[] = [];
  const zoneRegex = /z\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  let m: RegExpExecArray | null = null;
  while ((m = zoneRegex.exec(block)) !== null) {
    zones.push({ col: +m[1], row: +m[2], w: +m[3], h: +m[4] });
  }
  return zones;
}

function parseEnemiesBlock(content: string): { type: string; col: number; row: number; damage: number; moving: boolean }[] {
  const block = extractArrayBlock(content, 'ENEMIES');
  if (!block) return [];
  const enemies: { type: string; col: number; row: number; damage: number; moving: boolean }[] = [];
  const enemyRegex = /e\(\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(true|false)\s*\)/g;
  let m: RegExpExecArray | null = null;
  while ((m = enemyRegex.exec(block)) !== null) {
    enemies.push({
      type: m[1],
      col: +m[2],
      row: +m[3],
      damage: +m[4],
      moving: m[5] === 'true',
    });
  }
  return enemies;
}

function parseElementsBlock(content: string): { id: string; col: number; row: number }[] {
  const block = extractArrayBlock(content, 'ELEMENTS');
  if (!block) return [];
  const elements: { id: string; col: number; row: number }[] = [];
  const elementRegex = /el\(\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  let m: RegExpExecArray | null = null;
  while ((m = elementRegex.exec(block)) !== null) {
    elements.push({
      id: m[1],
      col: +m[2],
      row: +m[3],
    });
  }
  return elements;
}

function parseLevelFile(filename: string): {
  name: string;
  cols: number;
  rows: number;
  spawnCol: number;
  spawnRow: number;
  zones: { col: number; row: number; w: number; h: number }[];
  waterZones?: { col: number; row: number; w: number; h: number }[];
  bgPreset?: string;
  bgmPreset?: string;
  tilePreset?: string;
  enemies?: { type: string; col: number; row: number; damage: number; moving: boolean }[];
  elements?: { id: string; col: number; row: number }[];
} | null {
  const filepath = join(LEVELS_DIR, `${filename}.ts`);
  if (!existsSync(filepath)) return null;
  const content = readFileSync(filepath, 'utf-8');

  const colsMatch = content.match(/TILE_COLS\s*=\s*(\d+)/);
  const rowsMatch = content.match(/TILE_ROWS\s*=\s*(\d+)/);
  const spawnXMatch = content.match(/SPAWN_X\s*=\s*(\d+)\s*\*\s*TILE_DSP/);
  const spawnYMatch = content.match(/SPAWN_Y\s*=\s*(\d+)\s*\*\s*TILE_DSP/);

  if (!colsMatch || !rowsMatch) return null;

  const zones = parseZoneBlock(content, 'LEVEL_ZONES');
  const waterZones = parseZoneBlock(content, 'WATER_ZONES');
  const enemies = parseEnemiesBlock(content);
  const elements = parseElementsBlock(content);
  const bgPresetMatch = content.match(/BG_PRESET\s*=\s*'([^']+)'/);
  const bgmPresetMatch = content.match(/BGM_PRESET\s*=\s*'([^']+)'/);
  const tilePresetMatch = content.match(/TILE_PRESET\s*=\s*'([^']+)'/);

  return {
    name: filename,
    cols: +colsMatch[1],
    rows: +rowsMatch[1],
    spawnCol: spawnXMatch ? +spawnXMatch[1] : 1,
    spawnRow: spawnYMatch ? +spawnYMatch[1] : 5,
    zones,
    ...(waterZones.length ? { waterZones } : {}),
    ...(bgPresetMatch ? { bgPreset: bgPresetMatch[1] } : {}),
    ...(bgmPresetMatch ? { bgmPreset: bgmPresetMatch[1] } : {}),
    ...(tilePresetMatch ? { tilePreset: tilePresetMatch[1] } : {}),
    ...(enemies.length ? { enemies } : {}),
    ...(elements.length ? { elements } : {}),
  };
}

function rebuildIndex() {
  const files = getLevelFiles();
  const imports = files.map(f => `import * as ${f} from './${f}';`).join('\n');
  const entries = files
    .map((f, i) => {
      const displayName = f.replace(/([a-z])(\d)/g, '$1 $2').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ');
      return `  {\n    id: ${i + 1},\n    name: '${displayName}',\n    cols: ${f}.TILE_COLS,\n    rows: ${f}.TILE_ROWS,\n    spawnX: ${f}.SPAWN_X,\n    spawnY: ${f}.SPAWN_Y,\n    zones: ${f}.LEVEL_ZONES,\n    waterZones: (${f} as any).WATER_ZONES ?? [],\n    bgPreset: (${f} as any).BG_PRESET ?? undefined,\n    bgmPreset: (${f} as any).BGM_PRESET ?? undefined,\n    tilePreset: (${f} as any).TILE_PRESET ?? undefined,\n    enemies: (${f} as any).ENEMIES ?? [],\n    elements: (${f} as any).ELEMENTS ?? [],\n  },`;
    })
    .join('\n');

  const content = `import type { TileZone } from '../TileMap';
import type { EnemyPlacement, LevelElement } from './levelTools';
${imports}

export interface LevelData {
  id: number;
  name: string;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  zones: TileZone[];
  waterZones?: TileZone[];
  bgPreset?: string;
  bgmPreset?: string;
  tilePreset?: string;
  enemies?: EnemyPlacement[];
  elements?: LevelElement[];
}

export const LEVELS: LevelData[] = [
${entries}
];
`;
  writeFileSync(INDEX_FILE, content);
}

export default function levelsPlugin(): Plugin {
  return {
    name: 'vite-plugin-levels',
    configureServer(server) {
      server.middlewares.use('/api/levels', (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');

        // GET /api/levels — list all levels
        if (req.method === 'GET' && (!req.url || req.url === '/' || req.url === '')) {
          const files = getLevelFiles();
          const levels = files.map(f => {
            const data = parseLevelFile(f);
            return { filename: f, ...(data || { cols: 0, rows: 0, zones: [] }) };
          });
          res.end(JSON.stringify(levels));
          return;
        }

        // GET /api/levels/load?name=level1
        if (req.method === 'GET' && req.url?.startsWith('/load')) {
          const url = new URL(req.url, 'http://localhost');
          const name = url.searchParams.get('name');
          if (!name) { res.statusCode = 400; res.end('{"error":"name required"}'); return; }
          const data = parseLevelFile(name);
          if (!data) { res.statusCode = 404; res.end('{"error":"not found"}'); return; }
          res.end(JSON.stringify(data));
          return;
        }

        // POST /api/levels/save-as — { name, content }
        if (req.method === 'POST' && req.url?.startsWith('/save-as')) {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { name, content } = JSON.parse(body);
              const slug = slugify(name);
              const filepath = join(LEVELS_DIR, `${slug}.ts`);
              if (existsSync(filepath)) {
                res.statusCode = 409;
                res.end(JSON.stringify({ error: 'A level with this name already exists' }));
                return;
              }
              writeFileSync(filepath, content);
              rebuildIndex();
              res.end(JSON.stringify({ ok: true, filename: slug }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        // POST /api/levels/save — { filename, content }
        if (req.method === 'POST' && req.url?.startsWith('/save')) {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { filename, content } = JSON.parse(body);
              const filepath = join(LEVELS_DIR, `${filename}.ts`);
              writeFileSync(filepath, content);
              rebuildIndex();
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        // POST /api/levels/delete — { filename }
        if (req.method === 'POST' && req.url?.startsWith('/delete')) {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { filename } = JSON.parse(body);
              const filepath = join(LEVELS_DIR, `${filename}.ts`);
              if (!existsSync(filepath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'not found' }));
                return;
              }
              unlinkSync(filepath);
              rebuildIndex();
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        res.statusCode = 404;
        res.end('{"error":"not found"}');
      });
    },
  };
}
