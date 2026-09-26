"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CANVAS_H, CANVAS_W, FroggerEngine, type EngineInput } from "./engine";
import { DEFAULT_SKIN } from "./skins";

const WIDTH = CANVAS_W; // 640
const HEIGHT = CANVAS_H; // 560
const MOVE_CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export interface FroggerGameHandle {
  restart: () => void;
  forceGameOver: () => void;
  // Controles táctiles: cada llamada equivale a pulsar una flecha (un salto)
  pressUp: () => void;
  pressDown: () => void;
  pressLeft: () => void;
  pressRight: () => void;
}

export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: string; // id de skin visual (ver ./skins); inválido o ausente = "retro"
}

export const FroggerGame = forwardRef<FroggerGameHandle, FroggerGameProps>(
  function FroggerGame(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver, skin },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FroggerEngine | null>(null);
    const inputRef = useRef<EngineInput>({ keys: {}, justPressed: {} });

    const pausedRef = useRef(paused);
    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    // Skin: se aplica en caliente sin recrear el motor ni el loop (no reinicia la partida)
    const skinRef = useRef(skin ?? DEFAULT_SKIN);
    // En pausa el loop no redibuja: un cambio de skin pide un frame nuevo.
    const redrawRef = useRef(false);
    useEffect(() => {
      skinRef.current = skin ?? DEFAULT_SKIN;
      engineRef.current?.setSkin(skinRef.current);
      redrawRef.current = true;
    }, [skin]);

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
        // Alimentan el mismo input que el teclado: el motor lo consume como
        // una pulsación nueva y la guarda en pendingDir.
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

      const engine = new FroggerEngine(ctx, WIDTH, HEIGHT, inputRef.current);
      engine.setSkin(skinRef.current);
      engineRef.current = engine;

      let raf = 0;
      let lastTime: number | null = null;
      let prevScore = engine.score;
      let prevLives = engine.lives;
      let prevLevel = engine.level;
      let prevState = engine.state;
      let wasPaused = false;

      onScoreChangeRef.current(prevScore);
      onLivesChangeRef.current(prevLives);
      onLevelChangeRef.current(prevLevel);

      const loop = (ts: number) => {
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        // En pausa se congela update() y la imagen no cambia: se dibuja solo en el
        // primer frame de la pausa y cuando cambia la skin. El loop sigue vivo, así que
        // al reanudar el dt sigue acotado a 0.05 s.
        const paused = pausedRef.current;
        if (!paused) {
          engine.update(dt);
          engine.draw();
        } else if (!wasPaused || redrawRef.current) {
          engine.draw();
        }
        redrawRef.current = false;
        wasPaused = paused;

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
        // lives llega a 0 en el mismo frame que el gameover: onLivesChange(0) se
        // emite justo arriba, antes de onGameOver(score).
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

    // Solo flechas: P / Esc no pausan el canvas por su cuenta (la pausa es de la
    // plataforma, vía la prop `paused`).
    useEffect(() => {
      const input = inputRef.current;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.target instanceof Element &&
          e.target.closest("select, input, textarea")
        )
          return;
        if (!MOVE_CODES.includes(e.code)) return;
        input.justPressed[e.code] = !input.keys[e.code];
        input.keys[e.code] = true;
        e.preventDefault();
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        input.keys[e.code] = false;
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    // El tablero (640×560) es casi cuadrado y la CRT es 4:3: object-fit lo escala sin
    // deformarlo, con franjas negras a los lados.
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
          objectFit: "contain",
        }}
      />
    );
  },
);
