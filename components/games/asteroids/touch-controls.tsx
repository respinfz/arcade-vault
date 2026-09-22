"use client";

import { useSyncExternalStore, type RefObject } from "react";
import type { AsteroidsGameHandle } from "./asteroids-game";

export interface TouchControlsProps {
  gameRef: RefObject<AsteroidsGameHandle | null>;
}

function subscribeToPointerType(callback: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function isCoarsePointerServerSnapshot() {
  return false;
}

export function TouchControls({ gameRef }: TouchControlsProps) {
  const isTouchDevice = useSyncExternalStore(
    subscribeToPointerType,
    isCoarsePointer,
    isCoarsePointerServerSnapshot,
  );

  if (!isTouchDevice) return null;

  return (
    <div className="touch-controls">
      <div className="touch-controls-move">
        <button
          type="button"
          className="touch-btn"
          aria-label="Rotar a la izquierda"
          onPointerDown={() => gameRef.current?.pressLeft(true)}
          onPointerUp={() => gameRef.current?.pressLeft(false)}
          onPointerLeave={() => gameRef.current?.pressLeft(false)}
          onPointerCancel={() => gameRef.current?.pressLeft(false)}
        >
          ◀
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Propulsar"
          onPointerDown={() => gameRef.current?.pressThrust(true)}
          onPointerUp={() => gameRef.current?.pressThrust(false)}
          onPointerLeave={() => gameRef.current?.pressThrust(false)}
          onPointerCancel={() => gameRef.current?.pressThrust(false)}
        >
          ▲
        </button>
        <button
          type="button"
          className="touch-btn"
          aria-label="Rotar a la derecha"
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
        aria-label="Disparar"
        onPointerDown={() => gameRef.current?.pressShoot()}
      >
        ●
      </button>
    </div>
  );
}
