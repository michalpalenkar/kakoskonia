import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef   = useRef<Game | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
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
  }, []);

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
