import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    let started = false;

    game.init().then(() => {
      started = true;
      game.start();
    });

    return () => {
      if (started) game.stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100vw', height: '100vh' }}
    />
  );
}
