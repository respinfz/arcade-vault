"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TetrisEngine, type EngineInput } from "./engine";

const WIDTH = 800;
const HEIGHT = 600;
const PREVENT_DEFAULT_CODES = [
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

export interface TetrisGameHandle {
  restart: () => void;
  forceGameOver: () => void;
  pressLeft: (held: boolean) => void;
  pressRight: (held: boolean) => void;
  pressSoftDrop: (held: boolean) => void;
  pressRotate: () => void;
  pressHardDrop: () => void;
}

export interface TetrisGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

// Marca el código como recién presionado solo en la transición (no en repeticiones del
// SO ni en llamadas repetidas de un botón táctil mantenido) — el motor usa esto para
// mover una vez de inmediato y luego repetir con su propio DAS mientras `keys[code]` siga en true.
function pressHeld(input: EngineInput, code: string, held: boolean) {
  if (held && !input.keys[code]) input.justPressed[code] = true;
  input.keys[code] = held;
}

export const TetrisGame = forwardRef<TetrisGameHandle, TetrisGameProps>(
  function TetrisGame(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<TetrisEngine | null>(null);
    const inputRef = useRef<EngineInput>({ keys: {}, justPressed: {} });

    const pausedRef = useRef(paused);
    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    const onScoreChangeRef = useRef(onScoreChange);
    const onLivesChangeRef = useRef(onLivesChange);
    const onLevelChangeRef = useRef(onLevelChange);
    const onGameOverRef = useRef(onGameOver);
    useEffect(() => {
      onScoreChangeRef.current = onScoreChange;
      onLivesChangeRef.current = onLivesChange;
      onLevelChangeRef.current = onLevelChange;
      onGameOverRef.current = onGameOver;
    }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

    useImperativeHandle(
      ref,
      () => ({
        restart: () => engineRef.current?.restart(),
        forceGameOver: () => engineRef.current?.forceGameOver(),
        pressLeft: (held: boolean) => {
          pressHeld(inputRef.current, "ArrowLeft", held);
        },
        pressRight: (held: boolean) => {
          pressHeld(inputRef.current, "ArrowRight", held);
        },
        pressSoftDrop: (held: boolean) => {
          pressHeld(inputRef.current, "ArrowDown", held);
        },
        pressRotate: () => {
          inputRef.current.justPressed["KeyX"] = true;
        },
        pressHardDrop: () => {
          inputRef.current.justPressed["Space"] = true;
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const engine = new TetrisEngine(ctx, WIDTH, HEIGHT, inputRef.current);
      engineRef.current = engine;

      let raf = 0;
      let lastTime: number | null = null;
      let prevScore = engine.score;
      let prevLines = engine.lines;
      let prevLevel = engine.level;
      let prevState = engine.state;

      onScoreChangeRef.current(prevScore);
      onLivesChangeRef.current(prevLines);
      onLevelChangeRef.current(prevLevel);

      const loop = (ts: number) => {
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        if (!pausedRef.current) {
          engine.update(dt);
        }
        engine.draw();

        if (engine.score !== prevScore) {
          prevScore = engine.score;
          onScoreChangeRef.current(prevScore);
        }
        if (engine.lines !== prevLines) {
          prevLines = engine.lines;
          onLivesChangeRef.current(prevLines);
        }
        if (engine.level !== prevLevel) {
          prevLevel = engine.level;
          onLevelChangeRef.current(prevLevel);
        }
        if (engine.state === "gameover" && prevState !== "gameover") {
          onGameOverRef.current(engine.score);
        }
        prevState = engine.state;

        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        engineRef.current = null;
      };
    }, []);

    useEffect(() => {
      const input = inputRef.current;

      const handleKeyDown = (e: KeyboardEvent) => {
        input.justPressed[e.code] = !input.keys[e.code];
        input.keys[e.code] = true;
        if (PREVENT_DEFAULT_CODES.includes(e.code)) e.preventDefault();
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        input.keys[e.code] = false;
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    );
  },
);
