import { useState, useCallback } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { MapBuilder } from './components/MapBuilder'
import { GameMenu } from './components/GameMenu'
import { LEVELS, type LevelData } from './game/levels'
import { TILE_DSP } from './game/AutoTile'
import { PLAYER_H, PLAYER_W } from './game/constants'

const IS_DEV = import.meta.env.DEV
const GATE_SPAWN_DISTANCE_TILES = 2

type Side = 'left' | 'right' | 'top' | 'bottom'
type Gate = NonNullable<LevelData['gates']>[number]
type Rect = { x: number; y: number; w: number; h: number }

function getGateSide(gate: Gate, level: LevelData): Side {
  if (gate.w >= gate.h) {
    return gate.row <= level.rows / 2 ? 'top' : 'bottom'
  }
  return gate.col <= level.cols / 2 ? 'left' : 'right'
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function isSolid(level: LevelData, col: number, row: number): boolean {
  return level.zones.some(zone =>
    col >= zone.col &&
    col < zone.col + zone.w &&
    row >= zone.row &&
    row < zone.row + zone.h,
  )
}

function collidesWithLevel(level: LevelData, x: number, y: number): boolean {
  const playerRect = { x, y, w: PLAYER_W, h: PLAYER_H }
  return level.zones.some(zone =>
    overlaps(playerRect, {
      x: zone.col * TILE_DSP,
      y: zone.row * TILE_DSP,
      w: zone.w * TILE_DSP,
      h: zone.h * TILE_DSP,
    }),
  )
}

function clampSpawn(level: LevelData, x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(0, level.cols * TILE_DSP - PLAYER_W)
  const maxY = Math.max(0, level.rows * TILE_DSP - PLAYER_H)
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  }
}

function buildSurfaceSpawn(level: LevelData, col: number, row: number): { x: number; y: number } {
  const x = col * TILE_DSP + (TILE_DSP - PLAYER_W) / 2
  const y = row * TILE_DSP - PLAYER_H
  return clampSpawn(level, x, y)
}

function isSolidAtPixel(level: LevelData, x: number, y: number): boolean {
  if (x < 0 || y < 0) return false
  return isSolid(level, Math.floor(x / TILE_DSP), Math.floor(y / TILE_DSP))
}

function hasStandingSupport(level: LevelData, x: number, row: number): boolean {
  const footY = row * TILE_DSP + 1
  return (
    isSolidAtPixel(level, x + 4, footY) ||
    isSolidAtPixel(level, x + PLAYER_W / 2, footY) ||
    isSolidAtPixel(level, x + PLAYER_W - 4, footY)
  )
}

function findOffsetSpawn(level: LevelData, gate: Gate, side: Side): { x: number; y: number } | null {
  const gateLeft = gate.col * TILE_DSP
  const gateTop = gate.row * TILE_DSP
  const gateW = gate.w * TILE_DSP
  const gateH = gate.h * TILE_DSP
  const gateCenterX = gateLeft + gateW / 2
  const gateCenterY = gateTop + gateH / 2
  const offsetPx = GATE_SPAWN_DISTANCE_TILES * TILE_DSP

  const preferred = side === 'left'
    ? { x: gateLeft + gateW + offsetPx, y: gateCenterY - PLAYER_H / 2 }
    : side === 'right'
      ? { x: gateLeft - PLAYER_W - offsetPx, y: gateCenterY - PLAYER_H / 2 }
      : side === 'top'
        ? { x: gateCenterX - PLAYER_W / 2, y: gateTop + gateH + offsetPx }
        : { x: gateCenterX - PLAYER_W / 2, y: gateTop - PLAYER_H - offsetPx }

  for (let step = 0; step <= 4; step++) {
    const tweak = step * TILE_DSP
    const candidate = side === 'left'
      ? { x: preferred.x + tweak, y: preferred.y }
      : side === 'right'
        ? { x: preferred.x - tweak, y: preferred.y }
        : side === 'top'
          ? { x: preferred.x, y: preferred.y + tweak }
          : { x: preferred.x, y: preferred.y - tweak }
    const spawn = clampSpawn(level, candidate.x, candidate.y)
    if (!collidesWithLevel(level, spawn.x, spawn.y)) return spawn
  }

  return null
}

function findSpawnBehindTopGate(level: LevelData, gate: Gate): { x: number; y: number } | null {
  const spawn = clampSpawn(
    level,
    (gate.col + gate.w / 2) * TILE_DSP - PLAYER_W / 2,
    (gate.row + gate.h) * TILE_DSP,
  )
  return collidesWithLevel(level, spawn.x, spawn.y) ? null : spawn
}

function findStandingSpawnAboveBottomGate(level: LevelData, gate: Gate): { x: number; y: number } | null {
  const gateLeft = gate.col * TILE_DSP
  const gateRight = (gate.col + gate.w) * TILE_DSP

  for (let row = gate.row - 1; row >= 0; row--) {
    const y = row * TILE_DSP - PLAYER_H
    const leftCandidates: number[] = []
    const rightCandidates: number[] = []

    for (let x = 0; x <= level.cols * TILE_DSP - PLAYER_W; x++) {
      if (collidesWithLevel(level, x, y)) continue
      if (!hasStandingSupport(level, x, row)) continue
      if (x + PLAYER_W <= gateLeft) {
        leftCandidates.push(x)
      } else if (x >= gateRight) {
        rightCandidates.push(x)
      }
    }

    if (leftCandidates.length === 0 && rightCandidates.length === 0) continue

    if (leftCandidates.length > 0) {
      return { x: leftCandidates[leftCandidates.length - 1], y }
    }

    if (rightCandidates.length > 0) {
      return { x: rightCandidates[0], y }
    }
  }

  return null
}

function findGateSpawn(level: LevelData, gate: Gate, side: Side): { x: number; y: number } {
  if (side === 'top') {
    const behindGateSpawn = findSpawnBehindTopGate(level, gate)
    if (behindGateSpawn) return behindGateSpawn
  }

  if (side === 'bottom') {
    const standingSpawn = findStandingSpawnAboveBottomGate(level, gate)
    if (standingSpawn) return standingSpawn
  }

  const offsetSpawn = findOffsetSpawn(level, gate, side)
  if (offsetSpawn) return offsetSpawn

  return {
    x: level.spawnX,
    y: level.spawnY - PLAYER_H,
  }
}

function getPlayParam(): LevelData | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('play')
  if (!encoded) return null
  try {
    return JSON.parse(atob(encoded))
  } catch { return null }
}

type Screen =
  | { type: 'menu' }
  | { type: 'game'; level: LevelData; savedX?: number; savedY?: number; savedHealth?: number }
  | { type: 'mapBuilder' }

const isPlayTest = !!getPlayParam()

function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const level = getPlayParam()
    if (level) return { type: 'game', level }
    return { type: 'menu' }
  })

  const handleGateTransition = useCallback((targetLevelId: string, entrySide: Side) => {
    const targetLevel = LEVELS.find(l => l.id === targetLevelId)
    if (!targetLevel) return

    // The player enters from the opposite side of their exit
    const oppSide = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const
    const spawnSide = oppSide[entrySide]

    // Find a return gate on the target level matching spawnSide
    const targetGates = targetLevel.gates ?? []
    const returnGate = targetGates.find(g => getGateSide(g, targetLevel) === spawnSide)

    let spawnX: number
    let spawnY: number

    if (returnGate) {
      const spawn = findGateSpawn(targetLevel, returnGate, spawnSide)
      spawnX = spawn.x
      spawnY = spawn.y
    } else {
      // Fallback to level spawn
      spawnX = targetLevel.spawnX
      spawnY = targetLevel.spawnY - PLAYER_H
    }

    setScreen({ type: 'game', level: targetLevel, savedX: spawnX, savedY: spawnY })
  }, [])

  if (screen.type === 'mapBuilder') {
    return <MapBuilder onBack={() => setScreen({ type: 'menu' })} />
  }

  if (screen.type === 'game') {
    return (
      <GameCanvas
        level={screen.level}
        savedX={screen.savedX}
        savedY={screen.savedY}
        savedHealth={screen.savedHealth}
        onBack={isPlayTest ? undefined : () => setScreen({ type: 'menu' })}
        onGateTransition={handleGateTransition}
      />
    )
  }

  return (
    <GameMenu
      onPlay={(level, savedX, savedY, savedHealth) =>
        setScreen({ type: 'game', level, savedX, savedY, savedHealth })
      }
      onMapBuilder={IS_DEV ? () => setScreen({ type: 'mapBuilder' }) : undefined}
    />
  )
}

export default App
