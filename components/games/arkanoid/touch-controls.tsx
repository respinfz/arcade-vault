"use client";

import type { RefObject } from "react";
import type { ArkanoidGameHandle } from "./arkanoid-game";

export interface TouchControlsProps {
  gameRef: RefObject<ArkanoidGameHandle | null>;
}

export function TouchControls({ gameRef }: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-controls-move">
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover la pala a la izquierda"
          onPointerDown={() => gameRef.current?.pressLeft(true)}
          onPointerUp={() => gameRef.current?.pressLeft(false)}
          onPointerLeave={() => gameRef.current?.pressLeft(false)}
          onPointerCancel={() => gameRef.current?.pressLeft(false)}
        >
          ◀
        </button>
        {/* Slot central omitido: este juego no tiene una tercera acción sostenida.
            Se deja como marcador de posición para que el ▶ caiga en :nth-child(3). */}
        <div aria-hidden="true" />
        <button
          type="button"
          className="touch-btn"
          aria-label="Mover la pala a la derecha"
          onPointerDown={() => gameRef.current?.pressRight(true)}
          onPointerUp={() => gameRef.current?.pressRight(false)}
          onPointerLeave={() => gameRef.current?.pressRight(false)}
          onPointerCancel={() => gameRef.current?.pressRight(false)}
        >
          ▶
        </button>
      </div>
      <button
        type="button"
        className="touch-btn touch-btn-fire"
        aria-label="Lanzar bola / continuar nivel"
        onPointerDown={() => gameRef.current?.pressLaunch()}
      >
        ●
      </button>
    </div>
  );
}
