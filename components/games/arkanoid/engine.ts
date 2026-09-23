// Motor de Arkanoid portado de references/started-games/04-arkanoid/game.js.
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por
// constructor. El campo de juego original (480×640) se rediseña centrado dentro de un
// canvas lógico 800×600 (mismo tamaño que asteroids/tetris) — ver specs/08-juego-arkanoid.md.
// Paleta/pala/bola se dibujan con figuras vectoriales (fillRect/arc), sin sprites ni sonido.

export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

export type GameState = "playing" | "levelComplete" | "gameover";

const HUD_HEIGHT = 20; // franja superior con SCORE/NIVEL/VIDAS
const FIELD_TOP = HUD_HEIGHT; // techo del campo de juego: la bola rebota acá
const FIELD_X = 160; // (800 - 480) / 2 — centra el campo de 480px de ancho
const FIELD_WIDTH = 480;

const BLOCK_COLS = 15;
const BLOCK_ROWS = 7;
const BLOCK_W = 32;
const BLOCK_H = 16;
const BLOCKS_X = FIELD_X;
const BLOCKS_Y = 30; // debajo de la franja de HUD, con un margen de 10px

// Filas de arriba hacia abajo con su puntaje asociado (idéntico al original).
const ROW_COLORS = [
  "green",
  "hotpink",
  "magenta",
  "cyan",
  "yellow",
  "red",
  "gray",
];
const COLOR_POINTS: Record<string, number> = {
  gray: 1,
  red: 2,
  yellow: 3,
  cyan: 4,
  magenta: 5,
  hotpink: 6,
  green: 7,
};

// Cada layout es un arreglo de 7 strings de 15 caracteres (filas de arriba hacia abajo,
// mismo orden que ROW_COLORS). 'X' = bloque presente, '.' = hueco.
interface Level {
  ballSpeedMultiplier: number;
  paddleWidth: number;
  layout: string[];
}

const LEVELS: Level[] = [
  {
    ballSpeedMultiplier: 1.0,
    paddleWidth: 162,
    layout: [
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
    ],
  },
  {
    ballSpeedMultiplier: 1.15,
    paddleWidth: 152,
    layout: [
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
      "XXXXXXX.XXXXXXX",
    ],
  },
  {
    ballSpeedMultiplier: 1.3,
    paddleWidth: 142,
    layout: [
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
      "XXX.XXXXXXX.XXX",
    ],
  },
  {
    ballSpeedMultiplier: 1.45,
    paddleWidth: 132,
    layout: [
      "..XXXXXXXXXXX..",
      ".XXXXXXXXXXXXX.",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXX",
      ".XXXXXXXXXXXXX.",
      "..XXXXXXXXXXX..",
    ],
  },
  {
    ballSpeedMultiplier: 1.6,
    paddleWidth: 122,
    layout: [
      "X.X.X.X.X.X.X.X",
      ".X.X.X.X.X.X.X.",
      "X.X.X.X.X.X.X.X",
      ".X.X.X.X.X.X.X.",
      "X.X.X.X.X.X.X.X",
      ".X.X.X.X.X.X.X.",
      "X.X.X.X.X.X.X.X",
    ],
  },
];

const PADDLE_Y = 560; // antes y=600 sobre un canvas de 640 de alto
const PADDLE_H = 14;
const PADDLE_SPEED = 6; // px/frame, idéntico al original (update() se llama 1x por rAF)

const BALL_SIZE = 16;
const BALL_SPEED = 5; // px/frame antes de aplicar ballSpeedMultiplier
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 grados desde la vertical

const BREAK_FLASH_MS = 150;

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  attached: boolean;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
}

interface BreakFlash {
  x: number;
  y: number;
  color: string;
  remainingMs: number;
}

function createBlocks(layout: string[]): Block[] {
  const blocks: Block[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    const color = ROW_COLORS[row];
    for (let col = 0; col < BLOCK_COLS; col++) {
      if (layout[row][col] !== "X") continue;
      blocks.push({
        x: BLOCKS_X + col * BLOCK_W,
        y: BLOCKS_Y + row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color,
        points: COLOR_POINTS[color],
        alive: true,
      });
    }
  }
  return blocks;
}

export class ArkanoidEngine {
  score = 0;
  lives = 3;
  level = 1; // 1..5, mapea directo a "Nivel" del .player-hud
  state: GameState = "playing";

  private paddle!: Paddle;
  private ball!: Ball;
  private blocks: Block[] = [];
  private breakFlashes: BreakFlash[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
    private input: EngineInput,
  ) {
    this.restart();
  }

  private pressed(code: string): boolean {
    const val = this.input.justPressed[code];
    this.input.justPressed[code] = false;
    return !!val;
  }

  private applyLevelPaddleWidth() {
    this.paddle.w = LEVELS[this.level - 1].paddleWidth;
    this.paddle.x = FIELD_X + (FIELD_WIDTH - this.paddle.w) / 2;
  }

  private attachBall() {
    this.ball.attached = true;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.paddle = { x: 0, y: PADDLE_Y, w: 0, h: PADDLE_H, speed: PADDLE_SPEED };
    this.ball = {
      x: 0,
      y: 0,
      w: BALL_SIZE,
      h: BALL_SIZE,
      vx: 0,
      vy: 0,
      attached: true,
    };
    this.blocks = createBlocks(LEVELS[0].layout);
    this.breakFlashes = [];
    this.applyLevelPaddleWidth();
    this.attachBall();
  }

  forceGameOver() {
    this.state = "gameover";
  }

  private launchBall() {
    const multiplier = LEVELS[this.level - 1].ballSpeedMultiplier;
    this.ball.attached = false;
    this.ball.vx = 0;
    this.ball.vy = -BALL_SPEED * multiplier;
  }

  private advanceLevel() {
    this.level += 1;
    this.blocks = createBlocks(LEVELS[this.level - 1].layout);
    this.breakFlashes = [];
    this.applyLevelPaddleWidth();
    this.attachBall();
    this.state = "playing";
  }

  private updatePaddle() {
    if (this.input.keys["ArrowLeft"]) this.paddle.x -= this.paddle.speed;
    if (this.input.keys["ArrowRight"]) this.paddle.x += this.paddle.speed;
    this.paddle.x = Math.max(
      FIELD_X,
      Math.min(FIELD_X + FIELD_WIDTH - this.paddle.w, this.paddle.x),
    );
  }

  private checkPaddleCollision() {
    const ball = this.ball;
    const paddle = this.paddle;
    if (ball.vy <= 0) return; // solo rebota si la bola va cayendo

    const collides =
      ball.x < paddle.x + paddle.w &&
      ball.x + ball.w > paddle.x &&
      ball.y < paddle.y + paddle.h &&
      ball.y + ball.h > paddle.y;
    if (!collides) return;

    const ballCenterX = ball.x + ball.w / 2;
    const paddleCenterX = paddle.x + paddle.w / 2;
    const relativeIntersect = Math.max(
      -1,
      Math.min(1, (ballCenterX - paddleCenterX) / (paddle.w / 2)),
    );

    const angle = relativeIntersect * MAX_BOUNCE_ANGLE;
    const speed = Math.hypot(ball.vx, ball.vy);

    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    ball.y = paddle.y - ball.h;
  }

  private checkBlockCollision() {
    const ball = this.ball;

    for (const block of this.blocks) {
      if (!block.alive) continue;

      const collides =
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y;
      if (!collides) continue;

      block.alive = false;
      this.score += block.points;
      this.breakFlashes.push({
        x: block.x,
        y: block.y,
        color: block.color,
        remainingMs: BREAK_FLASH_MS,
      });

      const overlapX = Math.min(
        ball.x + ball.w - block.x,
        block.x + block.w - ball.x,
      );
      const overlapY = Math.min(
        ball.y + ball.h - block.y,
        block.y + block.h - ball.y,
      );
      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }

      break; // un solo bloque por frame
    }
  }

  private checkWinCondition() {
    if (!this.blocks.every((block) => !block.alive)) return;
    this.state = this.level === 5 ? "gameover" : "levelComplete";
  }

  private checkBallLost() {
    const ball = this.ball;
    if (ball.y <= this.height) return;

    this.lives -= 1;
    if (this.lives <= 0) {
      this.state = "gameover";
    } else {
      this.attachBall();
    }
  }

  private updateBall() {
    const ball = this.ball;

    if (ball.attached) {
      ball.x = this.paddle.x + this.paddle.w / 2 - ball.w / 2;
      ball.y = this.paddle.y - ball.h;
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x <= FIELD_X) {
      ball.x = FIELD_X;
      ball.vx *= -1;
    } else if (ball.x + ball.w >= FIELD_X + FIELD_WIDTH) {
      ball.x = FIELD_X + FIELD_WIDTH - ball.w;
      ball.vx *= -1;
    }

    if (ball.y <= FIELD_TOP) {
      ball.y = FIELD_TOP;
      ball.vy *= -1;
    }

    this.checkPaddleCollision();
    this.checkBlockCollision();
    this.checkWinCondition();
    this.checkBallLost();
  }

  private updateBreakFlashes(dt: number) {
    const dtMs = dt * 1000;
    for (const flash of this.breakFlashes) flash.remainingMs -= dtMs;
    this.breakFlashes = this.breakFlashes.filter((f) => f.remainingMs > 0);
  }

  update(dt: number) {
    if (this.state === "gameover") return;

    if (this.state === "levelComplete") {
      if (this.pressed("Space")) this.advanceLevel();
      return;
    }

    this.updatePaddle();
    const spacePressed = this.pressed("Space");
    if (this.ball.attached && spacePressed) this.launchBall();
    this.updateBall();
    this.updateBreakFlashes(dt);
  }

  private drawField() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(FIELD_X, FIELD_TOP, FIELD_WIDTH, this.height - FIELD_TOP);

    for (const block of this.blocks) {
      if (!block.alive) continue;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
    }

    for (const flash of this.breakFlashes) {
      ctx.globalAlpha = Math.max(0, flash.remainingMs / BREAK_FLASH_MS);
      ctx.fillStyle = flash.color;
      ctx.fillRect(flash.x, flash.y, BLOCK_W, BLOCK_H);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      this.ball.x + this.ball.w / 2,
      this.ball.y + this.ball.h / 2,
      this.ball.w / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 8, 14);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}/5`, this.width / 2, 14);

    ctx.textAlign = "right";
    ctx.fillText(`VIDAS ${this.lives}`, this.width - 8, 14);
  }

  private drawLevelCompleteOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    ctx.font = "bold 28px monospace";
    ctx.fillText(
      `Nivel ${this.level} completado`,
      this.width / 2,
      this.height / 2 - 16,
    );

    ctx.font = "14px monospace";
    ctx.fillText(
      "Presiona ESPACIO para continuar",
      this.width / 2,
      this.height / 2 + 20,
    );
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawField();
    this.drawHUD();

    if (this.state === "levelComplete") this.drawLevelCompleteOverlay();
  }
}
