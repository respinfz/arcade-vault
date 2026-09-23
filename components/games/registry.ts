// Registro de juegos con motor real (canvas + engine.ts propio), portados desde la
// simulación falsa de jugar-client.tsx. Un juego sin entrada aquí sigue usando esa
// simulación decorativa sin cambios.

import type {
  ComponentType,
  ForwardRefExoticComponent,
  RefAttributes,
  RefObject,
} from "react";
import { ArkanoidGame } from "@/components/games/arkanoid/arkanoid-game";
import { TouchControls as ArkanoidTouchControls } from "@/components/games/arkanoid/touch-controls";
import { AsteroidsGame } from "@/components/games/asteroids/asteroids-game";
import { TouchControls as AsteroidsTouchControls } from "@/components/games/asteroids/touch-controls";
import { TetrisGame } from "@/components/games/tetris/tetris-game";
import { TouchControls as TetrisTouchControls } from "@/components/games/tetris/touch-controls";

export interface GameHandle {
  restart: () => void;
  forceGameOver: () => void;
}

export interface GameRegistryEntry {
  Component: ForwardRefExoticComponent<
    {
      paused: boolean;
      onScoreChange(score: number): void;
      onLivesChange(lives: number): void; // para tetris recibe engine.lines
      onLevelChange(level: number): void;
      onGameOver(finalScore: number): void;
    } & RefAttributes<GameHandle>
  >;
  TouchControls?: ComponentType<{ gameRef: RefObject<GameHandle | null> }>;
  hudLivesLabel?: string; // default "Vidas"; "Líneas" para tetris
}

// Cada juego expone un handle más específico que GameHandle (p. ej. AsteroidsGameHandle
// agrega pressLeft/pressRight/...). RefObject<T> es invariante en T (su `current` es
// mutable), así que TS no acepta la relación de subtipo estructural aquí aunque en
// runtime cualquier handle específico cumple GameHandle sin problema; se castea en este
// único punto de registro en vez de debilitar los tipos de cada componente.
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  arkanoid: {
    Component: ArkanoidGame as unknown as GameRegistryEntry["Component"],
    TouchControls:
      ArkanoidTouchControls as unknown as GameRegistryEntry["TouchControls"],
  },
  asteroides: {
    Component: AsteroidsGame as unknown as GameRegistryEntry["Component"],
    TouchControls:
      AsteroidsTouchControls as unknown as GameRegistryEntry["TouchControls"],
  },
  tetris: {
    Component: TetrisGame as unknown as GameRegistryEntry["Component"],
    TouchControls:
      TetrisTouchControls as unknown as GameRegistryEntry["TouchControls"],
    hudLivesLabel: "Líneas",
  },
};
