import { useEffect, useRef, useState, useCallback } from 'react';
import { getAutoTileSrc, drawAutoTile, TILE_DSP as T } from '../game/AutoTile';
import {
  listLevels, loadLevel, saveLevel, saveAsLevel, deleteLevel,
  generateRandomLevel, type LevelInfo,
} from './levelApi';

const DEFAULT_COLS = 100;
const DEFAULT_ROWS = 23;
const MIN_COLS = 2;
const MIN_ROWS = 2;
const PINCH_ZOOM_SENSITIVITY = 0.55;
const PINCH_DEADZONE = 0.02;

const tilemapUrl = new URL('../assets/kakoskonia_tilemap.png', import.meta.url).href;

type Tool = 'tile' | 'player';

const key = (col: number, row: number) => `${col},${row}`;
const isEdge = (col: number, row: number, cols: number, rows: number) =>
  col === 0 || col === cols - 1 || row === 0 || row === rows - 1;

function buildInitialGrid(cols: number, rows: number): Set<string> {
  const g = new Set<string>();
  for (let c = 0; c < cols; c++) { g.add(key(c, 0)); g.add(key(c, rows - 1)); }
  for (let r = 1; r < rows - 1; r++) { g.add(key(0, r)); g.add(key(cols - 1, r)); }
  return g;
}

function extractZones(
  grid: Set<string>,
  cols: number,
  rows: number,
): { col: number; row: number; w: number; h: number }[] {
  const cells: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (const k of grid) {
    const [c, r] = k.split(',').map(Number);
    if (c >= 0 && c < cols && r >= 0 && r < rows) cells[r][c] = true;
  }

  const visited: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const zones: { col: number; row: number; w: number; h: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!cells[r][c] || visited[r][c]) continue;
      let w = 0;
      while (c + w < cols && cells[r][c + w] && !visited[r][c + w]) w++;
      let h = 1;
      outer: while (r + h < rows) {
        for (let dc = 0; dc < w; dc++) {
          if (!cells[r + h][c + dc] || visited[r + h][c + dc]) break outer;
        }
        h++;
      }
      for (let dr = 0; dr < h; dr++)
        for (let dc = 0; dc < w; dc++)
          visited[r + dr][c + dc] = true;
      zones.push({ col: c, row: r, w, h });
    }
  }
  return zones;
}

function exportLevelData(
  grid: Set<string>,
  playerPos: { col: number; row: number } | null,
  cols: number,
  rows: number,
): string {
  const zones = extractZones(grid, cols, rows);

  const pad = (n: number, len: number) => String(n).padStart(len);
  const zonesStr = zones
    .map(z => `  z(${pad(z.col, 3)}, ${pad(z.row, 2)}, ${pad(z.w, 3)}, ${pad(z.h, 2)}),`)
    .join('\n');

  const spawnCol = playerPos?.col ?? 5;
  // row is the tile the player marker occupies; feet are at bottom of that tile
  const spawnRow = playerPos != null ? playerPos.row + 1 : Math.max(1, rows - 4);

  return [
    `import { TILE_DSP } from '../AutoTile';`,
    `import { z } from './levelTools';`,
    `import type { TileZone } from './levelTools';`,
    ``,
    `export const TILE_COLS = ${cols};`,
    `export const TILE_ROWS = ${rows};`,
    ``,
    `export const SPAWN_X = ${spawnCol} * TILE_DSP;`,
    `export const SPAWN_Y = ${spawnRow} * TILE_DSP - 1;`,
    ``,
    `export const LEVEL_ZONES: TileZone[] = [`,
    zonesStr,
    `];`,
  ].join('\n');
}

export function MapBuilder({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [cols, setCols] = useState(DEFAULT_COLS);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const colsRef = useRef(DEFAULT_COLS);
  const rowsRef = useRef(DEFAULT_ROWS);

  const gridRef = useRef<Set<string>>(buildInitialGrid(DEFAULT_COLS, DEFAULT_ROWS));
  const playerRef = useRef<{ col: number; row: number } | null>(null);
  const camRef = useRef({ panX: -T, panY: -T, zoom: 1 });

  const [tool, setTool] = useState<Tool>('tile');
  const toolRef = useRef<Tool>('tile');
  const [hasPlayer, setHasPlayer] = useState(false);

  // File management state
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [levelsList, setLevelsList] = useState<LevelInfo[]>([]);
  const [loadSelected, setLoadSelected] = useState(0);
  const [saveAsName, setSaveAsName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // drag state (mouse / single touch)
  const dragRef = useRef({
    active: false,
    mode: 'place' as 'place' | 'remove',
    lastCol: -1,
    lastRow: -1,
  });

  // pan state (right-click / middle-click)
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });

  // pinch state
  const pinchRef = useRef({
    active: false,
    initialDist: 0,
    initialZoom: 1,
    initialPanX: 0,
    initialPanY: 0,
    initialMidWX: 0,
    initialMidWY: 0,
    midScreenX: 0,
    midScreenY: 0,
  });
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const resizeRef = useRef({
    active: false,
    edge: null as null | 'right' | 'bottom',
  });

  // ── helpers ──────────────────────────────────────────────────────────────

  const screenToWorld = (sx: number, sy: number) => {
    const { panX, panY, zoom } = camRef.current;
    return { wx: panX + sx / zoom, wy: panY + sy / zoom };
  };

  const worldToGrid = (wx: number, wy: number) => ({
    col: Math.floor(wx / T),
    row: Math.floor(wy / T),
  });

  const isSolid = (col: number, row: number) => gridRef.current.has(key(col, row));

  const canvasRect = () => canvasRef.current!.getBoundingClientRect();

  const resizeGrid = useCallback((nextCols: number, nextRows: number) => {
    const safeCols = Math.max(MIN_COLS, nextCols);
    const safeRows = Math.max(MIN_ROWS, nextRows);
    if (safeCols === colsRef.current && safeRows === rowsRef.current) return;

    const prevCols = colsRef.current;
    const prevRows = rowsRef.current;
    const nextGrid = new Set<string>();
    for (const k of gridRef.current) {
      const [c, r] = k.split(',').map(Number);
      if (c < 0 || c >= safeCols || r < 0 || r >= safeRows) continue;
      // Drop previous perimeter so level edges are always moved to new bounds.
      if (isEdge(c, r, prevCols, prevRows)) continue;
      nextGrid.add(k);
    }
    for (let c = 0; c < safeCols; c++) {
      nextGrid.add(key(c, 0));
      nextGrid.add(key(c, safeRows - 1));
    }
    for (let r = 1; r < safeRows - 1; r++) {
      nextGrid.add(key(0, r));
      nextGrid.add(key(safeCols - 1, r));
    }
    gridRef.current = nextGrid;

    const player = playerRef.current;
    if (player) {
      playerRef.current = {
        col: Math.max(0, Math.min(safeCols - 1, player.col)),
        row: Math.max(0, Math.min(safeRows - 1, player.row)),
      };
      setHasPlayer(true);
    }

    colsRef.current = safeCols;
    rowsRef.current = safeRows;
    setCols(safeCols);
    setRows(safeRows);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { panX, panY, zoom } = camRef.current;
    const vw = canvas.width;
    const vh = canvas.height;

    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = '#111118';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.scale(zoom, zoom);

    const viewW = vw / zoom;
    const viewH = vh / zoom;
    const mapCols = colsRef.current;
    const mapRows = rowsRef.current;

    const c0 = Math.max(0, Math.floor(panX / T) - 1);
    const c1 = Math.min(mapCols, Math.ceil((panX + viewW) / T) + 1);
    const r0 = Math.max(0, Math.floor(panY / T) - 1);
    const r1 = Math.min(mapRows, Math.ceil((panY + viewH) / T) + 1);

    // dashed grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    for (let c = c0; c <= c1; c++) {
      const sx = c * T - panX;
      ctx.beginPath(); ctx.moveTo(sx, r0 * T - panY); ctx.lineTo(sx, r1 * T - panY); ctx.stroke();
    }
    for (let r = r0; r <= r1; r++) {
      const sy = r * T - panY;
      ctx.beginPath(); ctx.moveTo(c0 * T - panX, sy); ctx.lineTo(c1 * T - panX, sy); ctx.stroke();
    }
    ctx.restore();

    // tiles
    const img = imgRef.current;
    if (img) {
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          if (!isSolid(c, r)) continue;
          const src = getAutoTileSrc((dc, dr) => isSolid(c + dc, r + dr));
          drawAutoTile(ctx, img, src, c * T - panX, r * T - panY);
        }
      }
    }

    // player marker
    const pp = playerRef.current;
    if (pp) {
      const px = pp.col * T - panX;
      const py = pp.row * T - panY;
      ctx.save();
      ctx.fillStyle = 'rgba(255,210,50,0.35)';
      ctx.fillRect(px + 6, py, 52, T);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(px + 6, py, 52, T);
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${14 / zoom}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', px + T / 2, py + T / 2);
      ctx.restore();
    }

    // map bounds + resize edges
    ctx.save();
    ctx.strokeStyle = 'rgba(80,140,255,0.9)';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(-panX, -panY, mapCols * T, mapRows * T);

    ctx.strokeStyle = 'rgba(80,140,255,0.7)';
    ctx.lineWidth = 6 / zoom;
    ctx.beginPath();
    ctx.moveTo(mapCols * T - panX, -panY);
    ctx.lineTo(mapCols * T - panX, mapRows * T - panY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-panX, mapRows * T - panY);
    ctx.lineTo(mapCols * T - panX, mapRows * T - panY);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, []);

  // RAF loop
  useEffect(() => {
    let id = 0;
    const loop = () => { render(); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [render]);

  // canvas init + tilemap load + resize
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // fit world vertically on first mount
      if (camRef.current.zoom === 1) {
        const z = Math.min(window.innerWidth / (colsRef.current * T), window.innerHeight / (rowsRef.current * T)) * 0.9;
        camRef.current.zoom = z;
        camRef.current.panX = -(window.innerWidth / z - colsRef.current * T) / 2;
        camRef.current.panY = -(window.innerHeight / z - rowsRef.current * T) / 2;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const img = new Image();
    img.src = tilemapUrl;
    img.onload = () => { imgRef.current = img; };

    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── tile painting helpers ─────────────────────────────────────────────────

  const applyTile = (col: number, row: number, mode: 'place' | 'remove') => {
    const mapCols = colsRef.current;
    const mapRows = rowsRef.current;
    if (col < 0 || col >= mapCols || row < 0 || row >= mapRows || isEdge(col, row, mapCols, mapRows)) return;
    if (mode === 'place') gridRef.current.add(key(col, row));
    else gridRef.current.delete(key(col, row));
  };

  const startDrag = (col: number, row: number) => {
    const mode = isSolid(col, row) && !isEdge(col, row, colsRef.current, rowsRef.current) ? 'remove' : 'place';
    dragRef.current = { active: true, mode, lastCol: col, lastRow: row };
    applyTile(col, row, mode);
  };

  const continueDrag = (col: number, row: number) => {
    const d = dragRef.current;
    if (!d.active || (col === d.lastCol && row === d.lastRow)) return;
    d.lastCol = col; d.lastRow = row;
    applyTile(col, row, d.mode);
  };

  // ── mouse events ──────────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);

    if (e.button === 1 || e.button === 2) {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      return;
    }

    const rect = canvasRect();
    const { wx, wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const { col, row } = worldToGrid(wx, wy);
    const tol = 14 / camRef.current.zoom;
    const rightX = colsRef.current * T;
    const bottomY = rowsRef.current * T;
    const nearRight = Math.abs(wx - rightX) <= tol && wy >= 0 && wy <= bottomY;
    const nearBottom = Math.abs(wy - bottomY) <= tol && wx >= 0 && wx <= rightX;

    if (nearRight || nearBottom) {
      const edge: 'right' | 'bottom' = nearRight && nearBottom
        ? (Math.abs(wx - rightX) < Math.abs(wy - bottomY) ? 'right' : 'bottom')
        : (nearRight ? 'right' : 'bottom');
      resizeRef.current = { active: true, edge };
      return;
    }

    if (toolRef.current === 'player') {
      if (col >= 0 && col < colsRef.current && row >= 0 && row < rowsRef.current) { playerRef.current = { col, row }; setHasPlayer(true); }
      return;
    }
    startDrag(col, row);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();

    if (panRef.current.active) {
      const cam = camRef.current;
      cam.panX -= (e.clientX - panRef.current.lastX) / cam.zoom;
      cam.panY -= (e.clientY - panRef.current.lastY) / cam.zoom;
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
      return;
    }

    if (resizeRef.current.active) {
      const rect = canvasRect();
      const { wx, wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const edge = resizeRef.current.edge;
      if (edge === 'right') resizeGrid(Math.round(wx / T), rowsRef.current);
      else if (edge === 'bottom') resizeGrid(colsRef.current, Math.round(wy / T));
      return;
    }

    if (!dragRef.current.active) return;
    const rect = canvasRect();
    const { wx, wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const { col, row } = worldToGrid(wx, wy);
    continueDrag(col, row);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    dragRef.current.active = false;
    panRef.current.active = false;
    resizeRef.current.active = false;
    resizeRef.current.edge = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = camRef.current;
    const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06;
    const newZoom = Math.max(0.1, Math.min(6, cam.zoom * factor));
    const wx = cam.panX + sx / cam.zoom;
    const wy = cam.panY + sy / cam.zoom;
    cam.panX = wx - sx / newZoom;
    cam.panY = wy - sy / newZoom;
    cam.zoom = newZoom;
  };

  const onContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // ── touch events ──────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches))
      touchesRef.current.set(t.identifier, { x: t.clientX, y: t.clientY });

    const count = touchesRef.current.size;

    if (count === 2) {
      dragRef.current.active = false;
      const [a, b] = Array.from(touchesRef.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const midSX = (a.x + b.x) / 2;
      const midSY = (a.y + b.y) / 2;
      const rect = canvasRect();
      const { wx, wy } = screenToWorld(midSX - rect.left, midSY - rect.top);
      const cam = camRef.current;
      pinchRef.current = {
        active: true, initialDist: dist, initialZoom: cam.zoom,
        initialPanX: cam.panX, initialPanY: cam.panY,
        initialMidWX: wx, initialMidWY: wy,
        midScreenX: midSX - rect.left, midScreenY: midSY - rect.top,
      };
    } else if (count === 1) {
      const t = Array.from(touchesRef.current.values())[0];
      const rect = canvasRect();
      const { wx, wy } = screenToWorld(t.x - rect.left, t.y - rect.top);
      const { col, row } = worldToGrid(wx, wy);
      if (toolRef.current === 'player') {
        if (col >= 0 && col < colsRef.current && row >= 0 && row < rowsRef.current) { playerRef.current = { col, row }; setHasPlayer(true); }
        return;
      }
      startDrag(col, row);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRect();

    for (const t of Array.from(e.changedTouches)) {
      touchesRef.current.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    const count = touchesRef.current.size;
    const pinch = pinchRef.current;

    if (count === 2 && pinch.active) {
      const [a, b] = Array.from(touchesRef.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const rawScale = dist / pinch.initialDist;
      if (Math.abs(rawScale - 1) < PINCH_DEADZONE) return;
      const dampedScale = Math.pow(rawScale, PINCH_ZOOM_SENSITIVITY);
      const newZoom = Math.max(0.1, Math.min(6, pinch.initialZoom * dampedScale));
      const cam = camRef.current;
      cam.zoom = newZoom;
      // pan so initial world midpoint stays under initial screen midpoint
      cam.panX = pinch.initialMidWX - pinch.midScreenX / newZoom;
      cam.panY = pinch.initialMidWY - pinch.midScreenY / newZoom;
    } else if (count === 1) {
      const prev = Array.from(e.changedTouches);
      // single-finger: drag tiles
      for (const t of prev) {
        const { wx, wy } = screenToWorld(t.clientX - rect.left, t.clientY - rect.top);
        const { col, row } = worldToGrid(wx, wy);
        continueDrag(col, row);
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches))
      touchesRef.current.delete(t.identifier);
    if (touchesRef.current.size < 2) pinchRef.current.active = false;
    if (touchesRef.current.size === 0) dragRef.current.active = false;
  };

  // ── tool change ───────────────────────────────────────────────────────────

  const changeTool = (t: Tool) => {
    setTool(t);
    toolRef.current = t;
  };

  // ── file management actions ─────────────────────────────────────────────

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const loadGridFromLevel = (data: LevelInfo) => {
    const newGrid = new Set<string>();
    for (const z of data.zones) {
      for (let r = z.row; r < z.row + z.h; r++) {
        for (let c = z.col; c < z.col + z.w; c++) {
          newGrid.add(key(c, r));
        }
      }
    }
    gridRef.current = newGrid;
    playerRef.current = { col: data.spawnCol, row: data.spawnRow - 1 };
    setHasPlayer(true);
    colsRef.current = data.cols;
    rowsRef.current = data.rows;
    setCols(data.cols);
    setRows(data.rows);
    // reset camera
    const z = Math.min(window.innerWidth / (data.cols * T), window.innerHeight / (data.rows * T)) * 0.9;
    camRef.current = {
      zoom: z,
      panX: -(window.innerWidth / z - data.cols * T) / 2,
      panY: -(window.innerHeight / z - data.rows * T) / 2,
    };
  };

  const handleNew = () => {
    setCurrentFilename(null);
    colsRef.current = DEFAULT_COLS;
    rowsRef.current = DEFAULT_ROWS;
    setCols(DEFAULT_COLS);
    setRows(DEFAULT_ROWS);
    gridRef.current = buildInitialGrid(DEFAULT_COLS, DEFAULT_ROWS);
    playerRef.current = null;
    setHasPlayer(false);
    const z = Math.min(window.innerWidth / (DEFAULT_COLS * T), window.innerHeight / (DEFAULT_ROWS * T)) * 0.9;
    camRef.current = {
      zoom: z,
      panX: -(window.innerWidth / z - DEFAULT_COLS * T) / 2,
      panY: -(window.innerHeight / z - DEFAULT_ROWS * T) / 2,
    };
    showStatus('New level');
  };

  const handleLoad = async () => {
    try {
      const levels = await listLevels();
      setLevelsList(levels);
      setLoadSelected(0);
      setModalError(null);
      setShowLoadModal(true);
    } catch (e) {
      showStatus('Failed to load levels list');
    }
  };

  const handleLoadSelect = async (filename: string) => {
    try {
      const data = await loadLevel(filename);
      loadGridFromLevel(data);
      setCurrentFilename(filename);
      setShowLoadModal(false);
      showStatus(`Loaded ${filename}`);
    } catch (e) {
      setModalError(String(e));
    }
  };

  const handleSave = async () => {
    if (!currentFilename) {
      setShowSaveAsModal(true);
      setSaveAsName('');
      setModalError(null);
      return;
    }
    try {
      const content = exportLevelData(gridRef.current, playerRef.current, colsRef.current, rowsRef.current);
      await saveLevel(currentFilename, content);
      showStatus(`Saved ${currentFilename}`);
    } catch (e) {
      showStatus(`Save failed: ${e}`);
    }
  };

  const handleSaveAs = async () => {
    setSaveAsName('');
    setModalError(null);
    setShowSaveAsModal(true);
  };

  const handleSaveAsConfirm = async () => {
    if (!saveAsName.trim()) { setModalError('Name is required'); return; }
    try {
      const content = exportLevelData(gridRef.current, playerRef.current, colsRef.current, rowsRef.current);
      const filename = await saveAsLevel(saveAsName.trim(), content);
      setCurrentFilename(filename);
      setShowSaveAsModal(false);
      showStatus(`Saved as ${filename}`);
    } catch (e) {
      setModalError(String(e));
    }
  };

  const handleGenerate = () => {
    const { grid, playerCol, playerRow } = generateRandomLevel(colsRef.current, rowsRef.current);
    gridRef.current = grid;
    playerRef.current = { col: playerCol, row: playerRow };
    setHasPlayer(true);
    showStatus('Generated random level');
  };

  const handleDeleteStart = async () => {
    if (!currentFilename) { showStatus('No level loaded to delete'); return; }
    try {
      const levels = await listLevels();
      setLevelsList(levels);
      setModalError(null);
      setShowDeleteModal(true);
    } catch (e) {
      showStatus('Failed to fetch levels');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentFilename) return;
    try {
      await deleteLevel(currentFilename);
      setShowDeleteModal(false);
      showStatus(`Deleted ${currentFilename}`);
      handleNew();
    } catch (e) {
      setModalError(String(e));
    }
  };

  const handleTryPlay = () => {
    const zones = extractZones(gridRef.current, colsRef.current, rowsRef.current);
    const spawnCol = playerRef.current?.col ?? 5;
    const spawnRow = playerRef.current != null ? playerRef.current.row + 1 : Math.max(1, rowsRef.current - 4);
    const levelData = {
      id: 0,
      name: currentFilename || 'Test Level',
      cols: colsRef.current,
      rows: rowsRef.current,
      spawnX: spawnCol * T,
      spawnY: spawnRow * T - 1,
      zones,
    };
    const encoded = btoa(JSON.stringify(levelData));
    const base = window.location.pathname;
    window.open(`${base}?play=${encoded}`, '_blank');
  };

  // ── styles ────────────────────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    background: 'rgba(20,20,36,0.92)',
    color: '#ccc',
    border: '1px solid #444',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'monospace',
    backdropFilter: 'blur(4px)',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: tool === 'player' ? 'crosshair' : 'cell', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* File management + tool selector — top left */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
        background: 'rgba(20,20,36,0.92)',
        border: '1px solid #444', borderRadius: 8, padding: '8px 10px',
        backdropFilter: 'blur(4px)',
      }}>
        {/* File buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>FILE</span>
          {([
            ['New', handleNew, false, false],
            ['Load', handleLoad, false, false],
            ['Save', handleSave, true, true],
            ['Save As', handleSaveAs, false, true],
            ['Regenerate', handleGenerate, false, false],
            ['Delete', handleDeleteStart, true, false],
          ] as [string, () => void, boolean, boolean][])
            .filter(([, , needsLoaded]) => !needsLoaded || currentFilename)
            .map(([label, handler, , needsPlayer]) => {
              const disabled = needsPlayer && !hasPlayer;
              return (
                <button
                  key={label}
                  onClick={disabled ? undefined : handler}
                  title={disabled ? 'Place a player spawn first' : undefined}
                  style={{
                    ...btnBase,
                    padding: '4px 10px',
                    fontSize: 11,
                    background: label === 'Delete' ? 'rgba(80,20,20,0.8)' : 'rgba(40,40,60,0.8)',
                    border: `1px solid ${label === 'Delete' ? '#633' : '#3a3a55'}`,
                    color: label === 'Delete' ? '#e88' : '#ccc',
                    ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                  }}
                >
                  {label}
                </button>
              );
            })}
          {currentFilename && (
            <span style={{ color: '#7a8', fontSize: 11, fontFamily: 'monospace', marginLeft: 8 }}>
              [{currentFilename}]
            </span>
          )}
        </div>

        <div style={{ color: '#b8c7ff', fontSize: 11, fontFamily: 'monospace' }}>
          Level size: {cols} cols x {rows} rows
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>TOOL</span>
        {(['tile', 'player'] as Tool[]).map(t => (
          <button
            key={t}
            onClick={() => changeTool(t)}
            style={{
              ...btnBase,
              background: tool === t ? '#3a5fc8' : 'rgba(40,40,60,0.8)',
              color: tool === t ? '#fff' : '#999',
              border: `1px solid ${tool === t ? '#5a7fe8' : '#3a3a55'}`,
              padding: '5px 12px',
            }}
          >
            {t === 'tile' ? 'Tile' : 'Player'}
          </button>
        ))}
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace', marginLeft: 8 }}>
          Scroll=zoom / RMB=pan / Drag blue edge to resize
        </span>
        </div>
      </div>

      {/* Status message — top center */}
      {statusMsg && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', background: 'rgba(30,100,60,0.92)', color: '#7fe8a0',
          border: '1px solid #3a8a5a', borderRadius: 6, fontSize: 13, fontFamily: 'monospace',
          backdropFilter: 'blur(4px)', zIndex: 20,
        }}>
          {statusMsg}
        </div>
      )}

      {/* Top right buttons */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onBack} style={btnBase}>
          Back to Menu
        </button>
        <button
          onClick={hasPlayer ? handleTryPlay : undefined}
          title={!hasPlayer ? 'Place a player spawn first' : undefined}
          style={{
            ...btnBase,
            background: 'linear-gradient(135deg, #1a1a3e, #2a1a4e)',
            border: '1px solid #7a5af5',
            color: '#c8b8ff',
            boxShadow: '0 0 12px rgba(122,90,245,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
            letterSpacing: '0.5px',
            ...(!hasPlayer ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
          }}
        >
          Try to Play
        </button>
      </div>

      {/* ── Load Modal ─────────────────────────────────────────────────── */}
      {showLoadModal && (
        <div style={modalOverlay} onClick={() => setShowLoadModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Load Level</h3>
            {modalError && <div style={modalErrorStyle}>{modalError}</div>}
            {levelsList.length === 0 ? (
              <p style={{ color: '#888', fontSize: 13 }}>No levels found.</p>
            ) : (
              <select
                value={loadSelected}
                onChange={e => setLoadSelected(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 12px', background: 'rgba(10,10,20,0.9)',
                  border: '1px solid #556', borderRadius: 6, color: '#ddd', fontSize: 14,
                  fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
                }}
              >
                {levelsList.map((l, i) => (
                  <option key={l.filename} value={i}>
                    {l.filename} ({l.cols}x{l.rows})
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {levelsList.length > 0 && (
                <button
                  onClick={() => handleLoadSelect(levelsList[loadSelected].filename)}
                  style={{ ...btnBase, background: '#3a5fc8', color: '#fff', border: '1px solid #5a7fe8' }}
                >
                  Load
                </button>
              )}
              <button onClick={() => setShowLoadModal(false)} style={btnBase}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save As Modal ──────────────────────────────────────────────── */}
      {showSaveAsModal && (
        <div style={modalOverlay} onClick={() => setShowSaveAsModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={modalTitle}>Save As</h3>
            {modalError && <div style={modalErrorStyle}>{modalError}</div>}
            <input
              type="text"
              placeholder="Level name (e.g. forest_ruins)"
              value={saveAsName}
              onChange={e => { setSaveAsName(e.target.value); setModalError(null); }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAsConfirm(); }}
              style={{
                width: '100%', padding: '10px 12px', background: 'rgba(10,10,20,0.9)',
                border: '1px solid #556', borderRadius: 6, color: '#ddd', fontSize: 14,
                fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSaveAsConfirm} style={{ ...btnBase, background: '#3a5fc8', color: '#fff', border: '1px solid #5a7fe8' }}>
                Save
              </button>
              <button onClick={() => setShowSaveAsModal(false)} style={btnBase}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
      {showDeleteModal && (
        <div style={modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...modalTitle, color: '#e88' }}>Delete Level</h3>
            {modalError && <div style={modalErrorStyle}>{modalError}</div>}
            <p style={{ color: '#ccc', fontSize: 14, fontFamily: 'monospace', margin: '12px 0' }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>{currentFilename}</strong>?
              <br />This will remove the file and update all exports. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleDeleteConfirm}
                style={{ ...btnBase, background: 'rgba(180,40,40,0.9)', color: '#fff', border: '1px solid #a33' }}
              >
                Yes, Delete
              </button>
              <button onClick={() => setShowDeleteModal(false)} style={btnBase}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal styles ─────────────────────────────────────────────────────────────

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};

const modalBox: React.CSSProperties = {
  background: 'rgba(20,20,36,0.98)', border: '1px solid #556', borderRadius: 12,
  padding: '24px 28px', minWidth: 320, maxWidth: 420, fontFamily: 'monospace',
  backdropFilter: 'blur(8px)',
};

const modalTitle: React.CSSProperties = {
  color: '#c8b8e8', fontSize: 20, marginTop: 0, marginBottom: 16,
};

const modalErrorStyle: React.CSSProperties = {
  color: '#e88', fontSize: 12, marginBottom: 12, padding: '6px 10px',
  background: 'rgba(180,40,40,0.2)', borderRadius: 4, border: '1px solid #633',
};
