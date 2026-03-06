import { useState } from 'react';
import { LEVELS, type LevelData } from '../game/levels';

interface Props {
  onPlay: (level: LevelData) => void;
  onMapBuilder?: () => void;
}

export function GameMenu({ onPlay, onMapBuilder }: Props) {
  const [selected, setSelected] = useState(0);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0814 0%, #1a1228 50%, #0d1117 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#ddd',
      }}
    >
      <h1
        style={{
          fontSize: 48,
          marginBottom: 8,
          letterSpacing: 6,
          color: '#c8b8e8',
          textShadow: '0 0 20px rgba(160,120,220,0.4)',
        }}
      >
        KAKOSKONIA
      </h1>
      <p style={{ fontSize: 14, color: '#776', marginBottom: 48 }}>Select a level</p>

      <select
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value))}
        style={{
          width: 280,
          padding: '14px 20px',
          background: 'rgba(20, 16, 36, 0.9)',
          border: '2px solid #a078dc',
          borderRadius: 8,
          color: '#e0d0f8',
          fontSize: 18,
          fontFamily: 'monospace',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23a078dc\' fill=\'none\' stroke-width=\'2\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 16px center',
        }}
      >
        {LEVELS.map((level, i) => (
          <option key={level.id} value={i}>{level.name}</option>
        ))}
      </select>

      <button
        onClick={() => onPlay(LEVELS[selected])}
        style={{
          marginTop: 40,
          padding: '14px 48px',
          background: '#a078dc',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 20,
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: 2,
        }}
      >
        PLAY
      </button>

      {onMapBuilder && (
        <button
          onClick={onMapBuilder}
          style={{
            marginTop: 24,
            padding: '10px 32px',
            background: 'transparent',
            border: '1px solid #556',
            borderRadius: 6,
            color: '#aac',
            fontSize: 12,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          Map Builder
        </button>
      )}
    </div>
  );
}
