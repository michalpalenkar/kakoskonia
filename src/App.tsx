import { useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { MapBuilder } from './components/MapBuilder'

const IS_DEV = import.meta.env.DEV

function App() {
  const [showMapBuilder, setShowMapBuilder] = useState(false)

  if (showMapBuilder) {
    return <MapBuilder onBack={() => setShowMapBuilder(false)} />
  }

  return (
    <div style={{ position: 'relative' }}>
      <GameCanvas />
      {IS_DEV && (
        <button
          onClick={() => setShowMapBuilder(true)}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            padding: '8px 16px',
            background: 'rgba(20,20,36,0.88)',
            color: '#aac',
            border: '1px solid #556',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
          }}
        >
          Map Builder
        </button>
      )}
    </div>
  )
}

export default App
