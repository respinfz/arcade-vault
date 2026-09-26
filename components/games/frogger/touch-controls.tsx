"use client";

import type { RefObject } from "react";
import type { FroggerGameHandle } from "./frogger-game";

export interface TouchControlsProps {
  gameRef: RefObject<FroggerGameHandle | null>;
}

// Cruceta de 4 direcciones (reutiliza .touch-controls-dpad de Snake): cada toque es
// un salto de una celda, así que todos los botones son de "tap" (solo onPointerDown).
// El orden del markup importa: el CSS asigna arriba/izquierda/derecha/abajo por
// :nth-child(1|2|3|4).
export function TouchControls({ gameRef }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-controls-dpad">
        <button
          type="button"
          className="touch-btn"
          aria-label="Saltar hacia arriba"
          onPointerDown={() => gameRef.current?.pressUp()}
        >
          ▲
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Saltar hacia la izquierda"
          onPointerDown={() => gameRef.current?.pressLeft()}
        >
          ◀
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Saltar hacia la derecha"
          onPointerDown={() => gameRef.current?.pressRight()}
        >
          ▶
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Saltar hacia abajo"
          onPointerDown={() => gameRef.current?.pressDown()}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
