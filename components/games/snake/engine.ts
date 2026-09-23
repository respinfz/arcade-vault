// Motor de Snake diseñado desde cero (no hay game.js de referencia en
// references/started-games/ para este juego — ver specs/09-juego-snake.md).
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por
// constructor, igual que arkanoid/tetris/asteroids. A diferencia de esos motores (física
// continua por frame), este mueve por grilla/tick: update(dt) sigue recibiendo el dt real
// de la plataforma, pero acumula ese tiempo y solo avanza la serpiente una celda cuando el
// acumulador supera el intervalo del tick vigente (ver tickIntervalMs()).

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

const SNAKE_COLOR = "#00ff88"; // var(--green)
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

export class SnakeEngine {
  score = 0;
  lives = 1; // fijo mientras state === "playing"; el HUD del reproductor muestra siempre 1
  level = 1; // sube cada 5 frutas comidas, acorta el intervalo del tick de movimiento
  state: GameState = "playing";

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
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "#1c2a22";
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

  private drawFruit() {
    if (!this.fruit || !this.image.complete) return;
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

  private drawSnake() {
    const ctx = this.ctx;
    ctx.fillStyle = SNAKE_COLOR;
    for (const segment of this.snake) {
      const x = segment.x * CELL + 1;
      const y = segment.y * CELL + 1;
      const size = CELL - 2;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6);
      ctx.fill();
    }
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 8, 15);

    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${this.level}`, this.width - 8, 15);
  }

  draw(): void {
    this.drawGrid();
    this.drawFruit();
    this.drawSnake();
    this.drawHUD();
  }
}
