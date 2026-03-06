import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import type { Server } from 'node:http';

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

function parseLevelFile(filename: string): {
  name: string;
  cols: number;
  rows: number;
  spawnCol: number;
  spawnRow: number;
  zones: { col: number; row: number; w: number; h: number }[];
} | null {
  const filepath = join(LEVELS_DIR, `${filename}.ts`);
  if (!existsSync(filepath)) return null;
  const content = readFileSync(filepath, 'utf-8');

  const colsMatch = content.match(/TILE_COLS\s*=\s*(\d+)/);
  const rowsMatch = content.match(/TILE_ROWS\s*=\s*(\d+)/);
  const spawnXMatch = content.match(/SPAWN_X\s*=\s*(\d+)\s*\*\s*TILE_DSP/);
  const spawnYMatch = content.match(/SPAWN_Y\s*=\s*(\d+)\s*\*\s*TILE_DSP/);

  if (!colsMatch || !rowsMatch) return null;

  const zones: { col: number; row: number; w: number; h: number }[] = [];
  const zoneRegex = /z\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  let m;
  while ((m = zoneRegex.exec(content)) !== null) {
    zones.push({ col: +m[1], row: +m[2], w: +m[3], h: +m[4] });
  }

  return {
    name: filename,
    cols: +colsMatch[1],
    rows: +rowsMatch[1],
    spawnCol: spawnXMatch ? +spawnXMatch[1] : 1,
    spawnRow: spawnYMatch ? +spawnYMatch[1] : 5,
    zones,
  };
}

function rebuildIndex() {
  const files = getLevelFiles();
  const imports = files.map(f => `import * as ${f} from './${f}';`).join('\n');
  const entries = files
    .map((f, i) => {
      const displayName = f.replace(/([a-z])(\d)/g, '$1 $2').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ');
      return `  {\n    id: ${i + 1},\n    name: '${displayName}',\n    cols: ${f}.TILE_COLS,\n    rows: ${f}.TILE_ROWS,\n    spawnX: ${f}.SPAWN_X,\n    spawnY: ${f}.SPAWN_Y,\n    zones: ${f}.LEVEL_ZONES,\n  },`;
    })
    .join('\n');

  const content = `import type { TileZone } from '../TileMap';
${imports}

export interface LevelData {
  id: number;
  name: string;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  zones: TileZone[];
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
      server.middlewares.use('/api/levels', (req: any, res: any) => {
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
