// Motor de Arkanoid portado de references/started-games/04-arkanoid/game.js.
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por
// constructor. El campo de juego original (480×640) se rediseña centrado dentro de un
// canvas lógico 800×600 (mismo tamaño que asteroids/tetris) — ver specs/08-juego-arkanoid.md.
// Paleta/pala/bola se dibujan con figuras vectoriales (fillRect/arc), sin sprites ni sonido.
// El aspecto visual sale de la skin activa (./skins); la lógica de juego no depende de ella.

import {
  DEFAULT_SKIN,
  SKINS,
  resolveSkin,
  type ArkanoidSkin,
  type BrickColor,
  type SkinId,
} from "./skins";

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

// Filas de arriba hacia abajo con su puntaje asociado (idéntico al original). Son colores
// lógicos: la skin activa decide el color real con que se pinta cada fila.
const ROW_COLORS: BrickColor[] = [
  "green",
  "hotpink",
  "magenta",
  "cyan",
  "yellow",
  "red",
  "gray",
];
const COLOR_POINTS: Record<BrickColor, number> = {
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
const BALL_SPEED = 15; // px/frame antes de aplicar ballSpeedMultiplier (3x la velocidad original de 5)
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
  color: BrickColor;
  points: number;
  alive: boolean;
}

interface BreakFlash {
  x: number;
  y: number;
  color: BrickColor;
  remainingMs: number;
}

/* ---- Helpers de dibujo por skin (equivalentes a drawBlock() del Tetris) ---- */

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Aclara (amt > 0) u oscurece (amt < 0) un color '#rrggbb'. Solo se usa con las skins
// que definen sus colores en hex (pixel); ante otro formato devuelve el color tal cual.
function shade(color: string, amt: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const n = parseInt(color.slice(1), 16);
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
}

// Textura de píxeles determinista (no parpadea entre frames) sobre un rectángulo, en
// celdas de `cell` px, con luces/sombras y borde oscuro (drawPixelTexture del Tetris).
function drawPixelTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  cell = 4,
) {
  const light = shade(color, 0.18);
  const dark = shade(color, -0.2);
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  // semilla por posición en el mundo: cada ladrillo tiene su propio patrón
  const seed = Math.floor(x / cell) * 3 + Math.floor(y / cell) * 5;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const v = (ix * 7 + iy * 13 + ix * iy * 3 + seed) % 5;
      if (v === 0) ctx.fillStyle = light;
      else if (v === 1) ctx.fillStyle = dark;
      else continue;
      ctx.fillRect(x + ix * cell, y + iy * cell, cell, cell);
    }
  }
  // bisel: fila superior clara, borde oscuro alrededor
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, 2);
  ctx.strokeStyle = shade(color, -0.4);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

// Ladrillo (o destello de ladrillo) según el `style` de la skin.
function drawBrick(
  ctx: CanvasRenderingContext2D,
  sk: ArkanoidSkin,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  if (sk.style === "glow") {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();
    // núcleo oscuro para que la fila no se empaste con el glow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
  } else if (sk.style === "rounded") {
    roundRectPath(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 5);
    ctx.fillStyle = color;
    ctx.fill();
    // brillo superior redondeado
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    roundRectPath(ctx, x + 5, y + 3, w - 14, 4, 2);
    ctx.fill();
  } else if (sk.style === "pixel") {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    drawPixelTexture(ctx, x + 1, y + 1, w - 2, h - 2, color);
  } else {
    // flat (retro): color plano, idéntico al dibujo original
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
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
  skin: SkinId = DEFAULT_SKIN; // solo apariencia: cambiarla no toca el estado de juego

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

  // Cambia la skin en caliente (id inválido = "retro"). No reinicia la partida.
  setSkin(id: string | null | undefined) {
    this.skin = resolveSkin(id);
  }

  private get sk(): ArkanoidSkin {
    return SKINS[this.skin];
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
    // Posiciona la bola ya mismo (no solo en la próxima rama "attached" de updateBall):
    // si el jugador presiona Espacio en el primerísimo frame, launchBall() se dispara
    // antes de que updateBall() llegue a correr con la bola todavía pegada a la pala.
    this.ball.x = this.paddle.x + this.paddle.w / 2 - this.ball.w / 2;
    this.ball.y = this.paddle.y - this.ball.h;
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

  // Fondo del campo + rejilla y borde opcionales de la skin.
  private drawBoard(sk: ArkanoidSkin) {
    const ctx = this.ctx;
    const fieldH = this.height - FIELD_TOP;
    ctx.fillStyle = sk.boardBg;
    ctx.fillRect(FIELD_X, FIELD_TOP, FIELD_WIDTH, fieldH);

    if (sk.grid) {
      ctx.strokeStyle = sk.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = FIELD_X + BLOCK_W; x < FIELD_X + FIELD_WIDTH; x += BLOCK_W) {
        ctx.moveTo(x + 0.5, FIELD_TOP);
        ctx.lineTo(x + 0.5, this.height);
      }
      for (let y = FIELD_TOP + BLOCK_W; y < this.height; y += BLOCK_W) {
        ctx.moveTo(FIELD_X, y + 0.5);
        ctx.lineTo(FIELD_X + FIELD_WIDTH, y + 0.5);
      }
      ctx.stroke();
    }

    if (sk.fieldBorder) {
      ctx.save();
      if (sk.style === "glow") {
        ctx.shadowColor = sk.fieldBorder;
        ctx.shadowBlur = 8;
      }
      ctx.strokeStyle = sk.fieldBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(FIELD_X - 1, FIELD_TOP, FIELD_WIDTH + 2, fieldH + 2);
      ctx.restore();
    }
  }

  private drawFlash(sk: ArkanoidSkin, flash: BreakFlash) {
    const ctx = this.ctx;
    const alpha = Math.max(0, flash.remainingMs / BREAK_FLASH_MS);
    const color = sk.colors.bricks[flash.color];
    ctx.globalAlpha = alpha;
    if (sk.style === "flat") {
      // retro: rectángulo completo que se desvanece, como el original
      ctx.fillStyle = color;
      ctx.fillRect(flash.x, flash.y, BLOCK_W, BLOCK_H);
    } else {
      drawBrick(ctx, sk, flash.x, flash.y, BLOCK_W, BLOCK_H, color);
      // destello blanco neutro encima de la forma de la skin
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = "#fff";
      ctx.fillRect(flash.x + 2, flash.y + 2, BLOCK_W - 4, BLOCK_H - 4);
    }
    ctx.globalAlpha = 1;
  }

  private drawPaddle(sk: ArkanoidSkin) {
    const ctx = this.ctx;
    const { x, y, w, h } = this.paddle;
    const color = sk.colors.paddle;

    if (sk.style === "glow") {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    } else if (sk.style === "rounded") {
      roundRectPath(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      roundRectPath(ctx, x + h / 2, y + 2, w - h, 4, 2);
      ctx.fill();
    } else if (sk.style === "pixel") {
      // "Vaus": cuerpo texturizado con extremos de acento
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      drawPixelTexture(ctx, x, y, w, h, color);
      const accent = sk.colors.paddleAccent;
      if (accent) {
        const capW = 12;
        ctx.fillStyle = accent;
        ctx.fillRect(x, y, capW, h);
        ctx.fillRect(x + w - capW, y, capW, h);
        drawPixelTexture(ctx, x, y, capW, h, accent);
        drawPixelTexture(ctx, x + w - capW, y, capW, h, accent);
      }
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
  }

  private drawBall(sk: ArkanoidSkin) {
    const ctx = this.ctx;
    const { x, y, w } = this.ball;
    const r = w / 2;
    const cx = x + r;
    const cy = y + r;
    const color = sk.colors.ball;

    if (sk.style === "pixel") {
      // círculo rasterizado en celdas de 4 px (cruz 4×4 sin esquinas) con luz y sombra
      const c = w / 4;
      ctx.fillStyle = color;
      ctx.fillRect(x + c, y, c * 2, w);
      ctx.fillRect(x, y + c, w, c * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(x + c * 2, y + c * 2, c, c);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + c, y + c, c, c);
      return;
    }

    ctx.save();
    if (sk.style === "glow") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (sk.style === "glow") {
      // núcleo blanco: la bola se distingue de los ladrillos del mismo tono
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (sk.style === "rounded") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawField() {
    const ctx = this.ctx;
    const sk = this.sk;
    this.drawBoard(sk);

    for (const block of this.blocks) {
      if (!block.alive) continue;
      drawBrick(
        ctx,
        sk,
        block.x,
        block.y,
        block.w,
        block.h,
        sk.colors.bricks[block.color],
      );
    }

    for (const flash of this.breakFlashes) this.drawFlash(sk, flash);

    this.drawPaddle(sk);
    this.drawBall(sk);
  }

  // Aplica color/fuente del texto según la skin (halo en neón, negrita en pixel).
  private setTextStyle(sk: ArkanoidSkin, size: number, bold = false) {
    const ctx = this.ctx;
    ctx.fillStyle = sk.colors.hud;
    ctx.font = `${bold || sk.style === "pixel" ? "bold " : ""}${size}px monospace`;
    if (sk.style === "glow") {
      ctx.shadowColor = sk.colors.hud;
      ctx.shadowBlur = 8;
    }
  }

  private drawHUD() {
    const ctx = this.ctx;
    const sk = this.sk;
    ctx.fillStyle = sk.colors.hudBg;
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    ctx.save();
    this.setTextStyle(sk, 12);

    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 8, 14);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}/5`, this.width / 2, 14);

    ctx.textAlign = "right";
    ctx.fillText(`VIDAS ${this.lives}`, this.width - 8, 14);
    ctx.restore();
  }

  private drawLevelCompleteOverlay() {
    const ctx = this.ctx;
    const sk = this.sk;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    this.setTextStyle(sk, 28, true);
    ctx.textAlign = "center";
    ctx.fillText(
      `Nivel ${this.level} completado`,
      this.width / 2,
      this.height / 2 - 16,
    );

    this.setTextStyle(sk, 14);
    ctx.fillText(
      "Presiona ESPACIO para continuar",
      this.width / 2,
      this.height / 2 + 20,
    );
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.sk.outerBg;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawField();
    this.drawHUD();

    if (this.state === "levelComplete") this.drawLevelCompleteOverlay();
  }
}
