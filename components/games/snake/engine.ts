// Motor de Snake diseñado desde cero (no hay game.js de referencia en
// references/started-games/ para este juego — ver specs/09-juego-snake.md).
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por
// constructor, igual que arkanoid/tetris/asteroids. A diferencia de esos motores (física
// continua por frame), este mueve por grilla/tick: update(dt) sigue recibiendo el dt real
// de la plataforma, pero acumula ese tiempo y solo avanza la serpiente una celda cuando el
// acumulador supera el intervalo del tick vigente (ver tickIntervalMs()).
// Apariencia: todo el dibujo lee de la skin activa (ver ./skins y setSkin()).

import { SKINS, resolveSkin, type SkinId, type SnakeSkin } from "./skins";

export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

export type GameState = "playing" | "gameover";

const COLS = 20;
const ROWS = 15;
const CELL = 40; // 20*40=800, 15*40=600 → mismo canvas lógico 800×600 de los otros motores

const HUD_HEIGHT = 22; // franja translúcida superior con SCORE/NIVEL, se dibuja sobre la grilla

const SCORE_PER_FRUIT = 10;
const FRUITS_PER_LEVEL = 5;

const BASE_TICK_MS = 150;
const TICK_STEP_MS = 10; // se resta por cada nivel ganado
const MIN_TICK_MS = 60; // piso mínimo de velocidad

const FRUITS_IMAGE_SRC = "/games/snake/fruits.png";

interface Vector {
  x: number;
  y: number;
}

const UP: Vector = { x: 0, y: -1 };
const DOWN: Vector = { x: 0, y: 1 };
const LEFT: Vector = { x: -1, y: 0 };
const RIGHT: Vector = { x: 1, y: 0 };

const TURN_KEYS: Record<string, Vector> = {
  ArrowUp: UP,
  KeyW: UP,
  ArrowDown: DOWN,
  KeyS: DOWN,
  ArrowLeft: LEFT,
  KeyA: LEFT,
  ArrowRight: RIGHT,
  KeyD: RIGHT,
};

function isOpposite(a: Vector, b: Vector): boolean {
  return a.x === -b.x && a.y === -b.y;
}

interface Cell {
  x: number;
  y: number;
}

interface Fruit extends Cell {
  sprite: string;
}

// Atlas de 21 sprites de fruta portado de references/source-assets/snake-assets/sprites.js
// (mismos x/y/w/h; la imagen fuente se carga aparte, ver FRUITS_IMAGE_SRC).
const FRUIT_ATLAS: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
const FRUIT_SPRITE_KEYS = Object.keys(FRUIT_ATLAS);

/* Aclara (amt > 0) u oscurece (amt < 0) un color '#rrggbb' (como shade() del Tetris). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
}

/* Textura de píxeles determinista (no parpadea entre frames) sobre una celda,
   portada de drawPixelTexture() del Tetris. */
function drawPixelTexture(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  color: string,
) {
  const n = 4;
  const cell = size / n;
  const light = shade(color, 0.16);
  const dark = shade(color, -0.16);
  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const h = (ix * 7 + iy * 13 + ix * iy * 3) % 5;
      if (h === 0) ctx.fillStyle = light;
      else if (h === 1) ctx.fillStyle = dark;
      else continue;
      ctx.fillRect(
        px + 1 + ix * cell,
        py + 1 + iy * cell,
        cell - 0.5,
        cell - 0.5,
      );
    }
  }
  // borde oscuro de la celda
  ctx.strokeStyle = shade(color, -0.32);
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
}

export class SnakeEngine {
  score = 0;
  lives = 1; // fijo mientras state === "playing"; el HUD del reproductor muestra siempre 1
  level = 1; // sube cada 5 frutas comidas, acorta el intervalo del tick de movimiento
  state: GameState = "playing";
  skin: SkinId = "retro"; // solo apariencia; cambiarla no toca el estado de la partida

  private snake: Cell[] = [];
  private direction: Vector = RIGHT;
  private pendingDirection: Vector = RIGHT;
  private turnedThisTick = false;
  private fruit: Fruit | null = null;
  private fruitsEaten = 0;
  private tickAccumMs = 0;
  private image: HTMLImageElement;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
    private input: EngineInput,
  ) {
    this.image = new Image();
    this.image.src = FRUITS_IMAGE_SRC;
    this.restart();
  }

  private pressed(code: string): boolean {
    const val = this.input.justPressed[code];
    this.input.justPressed[code] = false;
    return !!val;
  }

  restart(): void {
    this.score = 0;
    this.level = 1;
    this.state = "playing";
    this.fruitsEaten = 0;
    this.tickAccumMs = 0;
    this.turnedThisTick = false;
    this.direction = RIGHT;
    this.pendingDirection = RIGHT;

    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    this.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];

    this.spawnFruit();
  }

  // Cambia la skin en caliente: no reinicia ni altera puntaje/estado.
  setSkin(id: string): void {
    this.skin = resolveSkin(id);
  }

  private get activeSkin(): SnakeSkin {
    return SKINS[this.skin];
  }

  forceGameOver(): void {
    this.state = "gameover";
  }

  private tickIntervalMs(): number {
    return Math.max(
      MIN_TICK_MS,
      BASE_TICK_MS - (this.level - 1) * TICK_STEP_MS,
    );
  }

  private tryTurn(newDirection: Vector) {
    if (this.turnedThisTick) return;
    if (isOpposite(newDirection, this.direction)) return;
    if (
      newDirection.x === this.pendingDirection.x &&
      newDirection.y === this.pendingDirection.y
    )
      return;
    this.pendingDirection = newDirection;
    this.turnedThisTick = true;
  }

  private handleInput() {
    for (const code of Object.keys(TURN_KEYS)) {
      if (this.pressed(code)) this.tryTurn(TURN_KEYS[code]);
    }
  }

  private spawnFruit() {
    const occupied = new Set(this.snake.map((c) => `${c.x},${c.y}`));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      this.fruit = null;
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    const sprite =
      FRUIT_SPRITE_KEYS[Math.floor(Math.random() * FRUIT_SPRITE_KEYS.length)];
    this.fruit = { x: cell.x, y: cell.y, sprite };
  }

  private advance() {
    this.direction = this.pendingDirection;
    const head = this.snake[0];
    const newHead: Cell = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS
    ) {
      this.state = "gameover";
      return;
    }

    const willEat =
      this.fruit !== null &&
      newHead.x === this.fruit.x &&
      newHead.y === this.fruit.y;
    const bodyToCheck = willEat ? this.snake : this.snake.slice(0, -1);
    if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      this.state = "gameover";
      return;
    }

    this.snake.unshift(newHead);
    if (willEat) {
      this.score += SCORE_PER_FRUIT;
      this.fruitsEaten++;
      if (this.fruitsEaten % FRUITS_PER_LEVEL === 0) this.level++;
      this.spawnFruit();
    } else {
      this.snake.pop();
    }
  }

  update(dt: number): void {
    if (this.state !== "playing") return;

    this.handleInput();
    this.tickAccumMs += dt * 1000;

    while (
      this.tickAccumMs >= this.tickIntervalMs() &&
      this.state === "playing"
    ) {
      this.tickAccumMs -= this.tickIntervalMs();
      this.advance();
      this.turnedThisTick = false;
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    const sk = this.activeSkin;
    ctx.fillStyle = sk.boardBg;
    ctx.fillRect(0, 0, this.width, this.height);

    if (!sk.grid) return;
    ctx.strokeStyle = sk.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, this.height);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(this.width, r * CELL);
      ctx.stroke();
    }
  }

  // "Plato" bajo la fruta según el estilo: halo (glow), disco suave (rounded) o
  // baldosa texturizada (pixel). Retro no dibuja nada.
  private drawFruitBack(fx: number, fy: number) {
    const ctx = this.ctx;
    const sk = this.activeSkin;
    const color = sk.colors.fruitBack;
    if (!color) return;
    const px = fx * CELL;
    const py = fy * CELL;
    const cx = px + CELL / 2;
    const cy = py + CELL / 2;

    if (sk.style === "glow") {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = CELL * 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (sk.style === "rounded") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.46, 0, Math.PI * 2);
      ctx.fill();
    } else if (sk.style === "pixel") {
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      if (color.startsWith("#")) drawPixelTexture(ctx, px, py, CELL, color);
    }
  }

  private drawFruit() {
    if (!this.fruit) return;
    this.drawFruitBack(this.fruit.x, this.fruit.y);
    if (!this.image.complete) return;
    const sprite = FRUIT_ATLAS[this.fruit.sprite];
    const scale = Math.min(CELL / sprite.w, CELL / sprite.h) * 0.85;
    const dw = sprite.w * scale;
    const dh = sprite.h * scale;
    const dx = this.fruit.x * CELL + (CELL - dw) / 2;
    const dy = this.fruit.y * CELL + (CELL - dh) / 2;
    this.ctx.drawImage(
      this.image,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      dx,
      dy,
      dw,
      dh,
    );
  }

  // Un segmento de la serpiente, ramificado por `style` como drawBlock() del Tetris.
  private drawSegment(cx: number, cy: number, color: string) {
    const ctx = this.ctx;
    const sk = this.activeSkin;
    const px = cx * CELL;
    const py = cy * CELL;

    if (sk.style === "glow") {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = CELL * 0.45;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px + 3, py + 3, CELL - 6, CELL - 6, 4);
      ctx.fill();
      ctx.restore();
      // núcleo oscuro para que el segmento no se empaste con el glow
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(px + CELL * 0.3, py + CELL * 0.3, CELL * 0.4, CELL * 0.4);
    } else if (sk.style === "rounded") {
      const r = CELL * 0.32;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 2, CELL - 4, CELL - 4, r);
      ctx.fill();
      // brillo superior redondeado
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.roundRect(
        px + CELL * 0.2,
        py + CELL * 0.14,
        CELL * 0.44,
        CELL * 0.22,
        r * 0.5,
      );
      ctx.fill();
    } else if (sk.style === "pixel") {
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      drawPixelTexture(ctx, px, py, CELL, color);
    } else {
      // flat (retro): el look original, celda redondeada de color plano
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 6);
      ctx.fill();
    }
  }

  // Ojos de la cabeza mirando hacia la dirección actual (solo skins con `eye`).
  private drawEyes(head: Cell) {
    const eye = this.activeSkin.colors.eye;
    if (!eye) return;
    const ctx = this.ctx;
    const pixel = this.activeSkin.style === "pixel";
    const d = this.direction;
    const cx = head.x * CELL + CELL / 2 + d.x * CELL * 0.14;
    const cy = head.y * CELL + CELL / 2 + d.y * CELL * 0.14;
    const side = CELL * 0.2; // separación lateral (perpendicular a la dirección)
    const white = CELL * 0.11;
    const pupil = CELL * 0.06;
    for (const s of [-1, 1]) {
      const ex = cx - d.y * side * s;
      const ey = cy + d.x * side * s;
      const qx = ex + d.x * pupil * 0.6;
      const qy = ey + d.y * pupil * 0.6;
      if (pixel) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(ex - white, ey - white, white * 2, white * 2);
        ctx.fillStyle = eye;
        ctx.fillRect(qx - pupil, qy - pupil, pupil * 2, pupil * 2);
      } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex, ey, white, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = eye;
        ctx.beginPath();
        ctx.arc(qx, qy, pupil, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawSnake() {
    const { colors } = this.activeSkin;
    // De la cola a la cabeza: la cabeza queda encima (importa con el halo de glow)
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const segment = this.snake[i];
      const color =
        i === 0 ? colors.head : i % 2 === 0 ? colors.bodyAlt : colors.body;
      this.drawSegment(segment.x, segment.y, color);
    }
    if (this.snake.length > 0) this.drawEyes(this.snake[0]);
  }

  private drawHUD() {
    const ctx = this.ctx;
    const sk = this.activeSkin;
    ctx.fillStyle = sk.colors.hudBg;
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    ctx.save();
    ctx.fillStyle = sk.colors.hud;
    ctx.font = sk.style === "pixel" ? "bold 12px monospace" : "12px monospace";
    if (sk.style === "glow") {
      ctx.shadowColor = sk.colors.hud;
      ctx.shadowBlur = 8;
    }

    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 8, 15);

    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${this.level}`, this.width - 8, 15);
    ctx.restore();
  }

  draw(): void {
    this.drawGrid();
    this.drawFruit();
    this.drawSnake();
    this.drawHUD();
  }
}
