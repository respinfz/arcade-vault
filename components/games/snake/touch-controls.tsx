"use client";

import type { RefObject } from "react";
import type { SnakeGameHandle } from "./snake-game";

export interface TouchControlsProps {
  gameRef: RefObject<SnakeGameHandle | null>;
}

export function TouchControls({ gameRef }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-controls-dpad">
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover hacia arriba"
          onPointerDown={() => gameRef.current?.pressUp()}
        >
          ▲
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover hacia la izquierda"
          onPointerDown={() => gameRef.current?.pressLeft()}
        >
          ◀
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover hacia la derecha"
          onPointerDown={() => gameRef.current?.pressRight()}
        >
          ▶
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover hacia abajo"
          onPointerDown={() => gameRef.current?.pressDown()}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
