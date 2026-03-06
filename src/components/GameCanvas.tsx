import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';
import type { LevelData } from '../game/levels';

interface Props {
  level: LevelData;
  onBack?: () => void;
}

export function GameCanvas({ level, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef   = useRef<Game | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas, level);
    gameRef.current = game;
    let started = false;

    game.init().then(() => {
      started = true;
      game.start();
    });

    return () => {
      if (started) game.stop();
      gameRef.current = null;
    };
  }, [level]);

  function makeTouch(key: 'left' | 'right' | 'jump') {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        if (gameRef.current) gameRef.current.touch[key] = true;
      },
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        if (gameRef.current) gameRef.current.touch[key] = false;
      },
    };
  }

  const btnStyle: React.CSSProperties = {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    color: 'rgba(255,255,255,0.85)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .touch-controls { display: none; }
        @media (hover: none) and (pointer: coarse) {
          .touch-controls { display: contents; }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
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
            zIndex: 10,
          }}
        >
          Menu
        </button>
      )}

      <div className="touch-controls">
        {/* Left button */}
        <div style={{ ...btnStyle, bottom: 32, left: 24 }} {...makeTouch('left')}>◀</div>

        {/* Right button */}
        <div style={{ ...btnStyle, bottom: 32, left: 112 }} {...makeTouch('right')}>▶</div>

        {/* Jump button */}
        <div style={{ ...btnStyle, bottom: 32, right: 24 }} {...makeTouch('jump')}>▲</div>
      </div>
    </div>
  );
}
