import { useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { MapBuilder } from './components/MapBuilder'
import { GameMenu } from './components/GameMenu'
import type { LevelData } from './game/levels'

const IS_DEV = import.meta.env.DEV

function getPlayParam(): LevelData | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('play')
  if (!encoded) return null
  try {
    return JSON.parse(atob(encoded))
  } catch { return null }
}

type Screen = { type: 'menu' } | { type: 'game'; level: LevelData } | { type: 'mapBuilder' }

const isPlayTest = !!getPlayParam()

function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const level = getPlayParam()
    if (level) return { type: 'game', level }
    return { type: 'menu' }
  })

  if (screen.type === 'mapBuilder') {
    return <MapBuilder onBack={() => setScreen({ type: 'menu' })} />
  }

  if (screen.type === 'game') {
    return <GameCanvas level={screen.level} onBack={isPlayTest ? undefined : () => setScreen({ type: 'menu' })} />
  }

  return (
    <GameMenu
      onPlay={(level) => setScreen({ type: 'game', level })}
      onMapBuilder={IS_DEV ? () => setScreen({ type: 'mapBuilder' }) : undefined}
    />
  )
}

export default App
