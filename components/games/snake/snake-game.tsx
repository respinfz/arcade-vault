"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { SnakeEngine, type EngineInput } from "./engine";

const WIDTH = 800;
const HEIGHT = 600;
const PREVENT_DEFAULT_CODES = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

export interface SnakeGameHandle {
  restart: () => void;
  forceGameOver: () => void;
  pressUp: () => void;
  pressDown: () => void;
  pressLeft: () => void;
  pressRight: () => void;
}

export interface SnakeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export const SnakeGame = forwardRef<SnakeGameHandle, SnakeGameProps>(
  function SnakeGame(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SnakeEngine | null>(null);
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
        restart: () => {
          const engine = engineRef.current;
          engine?.restart();
          if (!engine) return;
          // jugar-client.tsx resetea su HUD con setLives(3) en el mismo
          // click, justo después de este restart(); como lives del motor no
          // cambia (sigue en 1), un simple diff score/lives/level en el loop
          // de rAF no alcanzaría a corregirlo. Se reemite en una macrotarea
          // separada -a esta misma instancia de engine/callbacks- para que
          // corra después de que ese setLives(3) ya se aplicó.
          setTimeout(() => {
            onScoreChangeRef.current(engine.score);
            onLivesChangeRef.current(engine.lives);
            onLevelChangeRef.current(engine.level);
          }, 0);
        },
        forceGameOver: () => engineRef.current?.forceGameOver(),
        pressUp: () => {
          inputRef.current.justPressed["ArrowUp"] = true;
        },
        pressDown: () => {
          inputRef.current.justPressed["ArrowDown"] = true;
        },
        pressLeft: () => {
          inputRef.current.justPressed["ArrowLeft"] = true;
        },
        pressRight: () => {
          inputRef.current.justPressed["ArrowRight"] = true;
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const engine = new SnakeEngine(ctx, WIDTH, HEIGHT, inputRef.current);
      engineRef.current = engine;

      let raf = 0;
      let lastTime: number | null = null;
      let prevScore = engine.score;
      let prevLives = engine.lives;
      let prevLevel = engine.level;
      let prevState = engine.state;

      onScoreChangeRef.current(prevScore);
      onLivesChangeRef.current(prevLives);
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
        if (engine.lives !== prevLives) {
          prevLives = engine.lives;
          onLivesChangeRef.current(prevLives);
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
        const code =
          e.code === "KeyW"
            ? "ArrowUp"
            : e.code === "KeyS"
              ? "ArrowDown"
              : e.code === "KeyA"
                ? "ArrowLeft"
                : e.code === "KeyD"
                  ? "ArrowRight"
                  : e.code;
        input.justPressed[code] = !input.keys[code];
        input.keys[code] = true;
        if (PREVENT_DEFAULT_CODES.includes(e.code)) e.preventDefault();
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        const code =
          e.code === "KeyW"
            ? "ArrowUp"
            : e.code === "KeyS"
              ? "ArrowDown"
              : e.code === "KeyA"
                ? "ArrowLeft"
                : e.code === "KeyD"
                  ? "ArrowRight"
                  : e.code;
        input.keys[code] = false;
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
