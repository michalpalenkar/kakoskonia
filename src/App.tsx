import { useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { MapBuilder } from './components/MapBuilder'
import { GameMenu } from './components/GameMenu'
import type { LevelData } from './game/levels'

const IS_DEV = import.meta.env.DEV

type Screen = { type: 'menu' } | { type: 'game'; level: LevelData } | { type: 'mapBuilder' }

function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'menu' })

  if (screen.type === 'mapBuilder') {
    return <MapBuilder onBack={() => setScreen({ type: 'menu' })} />
  }

  if (screen.type === 'game') {
    return <GameCanvas level={screen.level} onBack={() => setScreen({ type: 'menu' })} />
  }

  return (
    <GameMenu
      onPlay={(level) => setScreen({ type: 'game', level })}
      onMapBuilder={IS_DEV ? () => setScreen({ type: 'mapBuilder' }) : undefined}
    />
  )
}

export default App
