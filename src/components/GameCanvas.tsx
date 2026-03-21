import React, { useEffect, useRef, useState } from "react";
import { Game } from "../game/Game";
import type { LevelData } from "../game/levels";

interface Props {
  level: LevelData;
  savedX?: number;
  savedY?: number;
  savedHealth?: number;
  onBack?: () => void;
}

const KEYBOARD_HINTS = [
  { key: "← / A", action: "Move left" },
  { key: "→ / D", action: "Move right" },
  { key: "↑ / W / Space / Z / X", action: "Jump" },
  { key: "C", action: "Dash" },
  { key: "E", action: "Interact / Use" },
  { key: "ESC", action: "Back to menu" },
];

export function GameCanvas({ level, savedX, savedY, savedHealth, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setGameOverMessage(null);
    const game = new Game(canvas, level, { onGameOver: setGameOverMessage }, savedX, savedY, savedHealth);
    gameRef.current = game;
    let cancelled = false;

    game.init().then(() => {
      if (cancelled) {
        game.stop();
        return;
      }
      game.start();
    });

    return () => {
      cancelled = true;
      game.stop();
      gameRef.current = null;
    };
  }, [level, session]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onBack) {
        onBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  function makeTouch(key: "left" | "right" | "jump") {
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
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    border: "2px solid rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    color: "rgba(255,255,255,0.85)",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <style>{`
        .touch-controls { display: none; }
        @media (hover: none) and (pointer: coarse) {
          .touch-controls { display: contents; }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {onBack && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
          <button
            onClick={() => setHintsOpen((o) => !o)}
            title="Keyboard hints"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(20,20,36,0.6)",
              color: "rgba(180,170,210,0.7)",
              border: "1px solid rgba(100,90,130,0.5)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "monospace",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ?
          </button>
          {hintsOpen && (
            <div
              style={{
                position: "absolute",
                top: 36,
                right: 0,
                background: "rgba(14,12,26,0.92)",
                border: "1px solid rgba(100,90,130,0.4)",
                borderRadius: 6,
                backdropFilter: "blur(6px)",
                padding: "10px 14px",
                display: "grid",
                gridTemplateColumns: "auto auto",
                columnGap: 16,
                rowGap: 6,
                fontSize: 11,
                fontFamily: "monospace",
                color: "#aaa",
                whiteSpace: "nowrap",
              }}
            >
              {KEYBOARD_HINTS.map(({ key, action }) => (
                <React.Fragment key={key}>
                  <span style={{ color: "#c8b8e8" }}>{key}</span>
                  <span>{action}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {gameOverMessage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5, 5, 12, 0.62)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              width: "min(92vw, 460px)",
              background: "rgba(20,20,36,0.97)",
              border: "1px solid #6a3c52",
              borderRadius: 12,
              padding: "22px 24px",
              fontFamily: "monospace",
              boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ color: "#f49ab9", fontSize: 26, marginBottom: 10 }}>
              Game Over
            </div>
            <div
              style={{
                color: "#ddd",
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {gameOverMessage}
            </div>
            <button
              onClick={() => setSession((prev) => prev + 1)}
              style={{
                border: "1px solid #c85a7b",
                background: "#7b2b47",
                color: "#fff",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 14,
                fontFamily: "monospace",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="touch-controls">
        {/* Left button */}
        <div
          style={{ ...btnStyle, bottom: 32, left: 24 }}
          {...makeTouch("left")}
        >
          ◀
        </div>

        {/* Right button */}
        <div
          style={{ ...btnStyle, bottom: 32, left: 112 }}
          {...makeTouch("right")}
        >
          ▶
        </div>

        {/* Jump button */}
        <div
          style={{ ...btnStyle, bottom: 32, right: 24 }}
          {...makeTouch("jump")}
        >
          ▲
        </div>
      </div>
    </div>
  );
}
