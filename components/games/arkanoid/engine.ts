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

// Contexto visible o de una caché offscreen (SPEC 13): las rutinas de dibujo sirven
// para ambos sin cambios.
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// Forma pre-renderizada (ladrillo o pala) para la skin activa. (ox, oy) es el
// desplazamiento del origen de la forma dentro del sprite: el margen del halo.
interface Sprite {
  canvas: OffscreenCanvas;
  ox: number;
  oy: number;
}

// Margen de los sprites: el shadowBlur más grande (14, pala neón) llega a ~1,5 × blur.
const SPRITE_PAD = 22;

// Fuentes del HUD precalculadas (antes se armaba el string en cada frame).
const HUD_FONT = "12px monospace";
const HUD_FONT_BOLD = "bold 12px monospace";

function roundRectPath(
  ctx: Ctx2D,
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

// Memo de colores derivados (SPEC 13): shade() parseaba el hex y creaba un string
// en cada llamada, varias veces por ladrillo y por frame.
const shadeCache = new Map<string, string>(); // clave `${color}|${amt}`

// Aclara (amt > 0) u oscurece (amt < 0) un color '#rrggbb'. Solo se usa con las skins
// que definen sus colores en hex (pixel); ante otro formato devuelve el color tal cual.
function shade(color: string, amt: number): string {
  const key = `${color}|${amt}`;
  const cached = shadeCache.get(key);
  if (cached !== undefined) return cached;
  let out = color;
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const n = parseInt(color.slice(1), 16);
    const clamp = (v: number) =>
      Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    out = `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
  }
  shadeCache.set(key, out);
  return out;
}

// Textura de píxeles determinista (no parpadea entre frames) sobre un rectángulo, en
// celdas de `cell` px, con luces/sombras y borde oscuro (drawPixelTexture del Tetris).
function drawPixelTexture(
  ctx: Ctx2D,
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
  ctx: Ctx2D,
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

  // Cachés de render (SPEC 13), solo apariencia: se vacían en setSkin() y no
  // participan de la lógica de juego. Sin OffscreenCanvas quedan vacías y todo se
  // dibuja directo, como el original.
  private bgLayer: OffscreenCanvas | null = null; // fondo + campo + rejilla + borde
  private brickSprites = new Map<string, Sprite>(); // clave: color lógico (+ variante pixel)
  private paddleSprites = new Map<number, Sprite>(); // clave numérica: ancho (+ fase pixel)
  // Clave de la variante pixel de cada ladrillo, precalculada para no crear strings
  // por frame. Los ladrillos de un nivel viejo se liberan solos.
  private pixelBrickKeys = new WeakMap<Block, string>();
  // Textos del HUD cacheados: se regeneran solo cuando cambia su valor.
  private hudScore = -1;
  private hudLevel = -1;
  private hudLives = -1;
  private hudScoreText = "";
  private hudLevelText = "";
  private hudLivesText = "";

  constructor(
    private ctx: Ctx2D,
    private width: number,
    private height: number,
    private input: EngineInput,
  ) {
    this.restart();
  }

  // Cambia la skin en caliente (id inválido = "retro"). No reinicia la partida.
  setSkin(id: string | null | undefined) {
    this.skin = resolveSkin(id);
    this.bgLayer = null;
    this.brickSprites.clear();
    this.paddleSprites.clear();
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

  // Ejecuta `draw` sobre otro contexto (una caché offscreen): las rutinas de dibujo
  // usan this.ctx, así que se redirige mientras dura (técnica de Frogger).
  private drawInto(target: Ctx2D, draw: () => void) {
    const main = this.ctx;
    this.ctx = target;
    try {
      draw();
    } finally {
      this.ctx = main;
    }
  }

  // Canvas offscreen con su contexto; null sin OffscreenCanvas (el motor no toca
  // window/document): quien llama dibuja directo.
  private newLayer(
    w: number,
    h: number,
  ): {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
  } | null {
    if (typeof OffscreenCanvas === "undefined") return null;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    return ctx ? { canvas, ctx } : null;
  }

  // Fondo estático de la skin activa (canvas + campo + rejilla + borde), pintado una
  // vez y copiado con un solo drawImage por frame.
  private drawBackground(sk: ArkanoidSkin) {
    if (!this.bgLayer) {
      const layer = this.newLayer(this.width, this.height);
      if (layer) {
        this.drawInto(layer.ctx, () => this.drawStaticBackground(sk));
        this.bgLayer = layer.canvas;
      }
    }
    if (this.bgLayer) this.ctx.drawImage(this.bgLayer, 0, 0);
    else this.drawStaticBackground(sk);
  }

  private drawStaticBackground(sk: ArkanoidSkin) {
    const ctx = this.ctx;
    ctx.fillStyle = sk.outerBg;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawBoard(sk);
  }

  // Sprite de un ladrillo (con halo, redondeo o textura ya aplicados). Se pinta en
  // las coordenadas reales del primer ladrillo que lo pide (trasladando el contexto),
  // así la textura pixel conserva su semilla; la clave distingue sus 5 variantes.
  private getBrickSprite(
    sk: ArkanoidSkin,
    block: Block,
    key: string,
  ): Sprite | null {
    const cached = this.brickSprites.get(key);
    if (cached) return cached;
    const layer = this.newLayer(
      block.w + SPRITE_PAD * 2,
      block.h + SPRITE_PAD * 2,
    );
    if (!layer) return null;
    layer.ctx.translate(SPRITE_PAD - block.x, SPRITE_PAD - block.y);
    drawBrick(
      layer.ctx,
      sk,
      block.x,
      block.y,
      block.w,
      block.h,
      sk.colors.bricks[block.color],
    );
    const sprite: Sprite = {
      canvas: layer.canvas,
      ox: SPRITE_PAD,
      oy: SPRITE_PAD,
    };
    this.brickSprites.set(key, sprite);
    return sprite;
  }

  // Clave de sprite de un ladrillo. En pixel la textura depende de la semilla por
  // posición, y el patrón solo varía con (semilla % 5): 5 variantes por color.
  private brickKey(sk: ArkanoidSkin, block: Block): string {
    if (sk.style !== "pixel") return block.color;
    let key = this.pixelBrickKeys.get(block);
    if (key === undefined) {
      // misma semilla que drawPixelTexture(x + 1, y + 1, …) en drawBrick()
      const seed =
        Math.floor((block.x + 1) / 4) * 3 + Math.floor((block.y + 1) / 4) * 5;
      key = `${block.color}|${seed % 5}`;
      this.pixelBrickKeys.set(block, key);
    }
    return key;
  }

  private drawBricks(sk: ArkanoidSkin) {
    const ctx = this.ctx;
    // flat: un fillRect por ladrillo ya es lo más barato; se dibuja como el original
    const useSprites = sk.style !== "flat";
    for (const block of this.blocks) {
      if (!block.alive) continue;
      const sprite = useSprites
        ? this.getBrickSprite(sk, block, this.brickKey(sk, block))
        : null;
      if (sprite) {
        // posiciones de ladrillo siempre enteras: la copia es exacta
        ctx.drawImage(sprite.canvas, block.x - sprite.ox, block.y - sprite.oy);
      } else {
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
    }
  }

  // La pala cambia de ancho por nivel y se mueve de a 6 px desde posiciones enteras.
  // En pixel su textura depende de x: el patrón se repite cada 20 px (semilla % 5 con
  // celdas de 4 px), así que la clave incluye x % 20.
  private drawPaddle(sk: ArkanoidSkin) {
    const { x, y, w, h } = this.paddle;
    if (sk.style !== "flat" && Number.isInteger(x) && Number.isInteger(w)) {
      const key = sk.style === "pixel" ? w * 20 + (x % 20) : w * 20;
      let sprite = this.paddleSprites.get(key);
      if (!sprite) {
        const layer = this.newLayer(w + SPRITE_PAD * 2, h + SPRITE_PAD * 2);
        if (layer) {
          layer.ctx.translate(SPRITE_PAD - x, SPRITE_PAD - y);
          this.drawInto(layer.ctx, () => this.drawPaddleShape(sk, x, y, w, h));
          sprite = { canvas: layer.canvas, ox: SPRITE_PAD, oy: SPRITE_PAD };
          this.paddleSprites.set(key, sprite);
        }
      }
      if (sprite) {
        this.ctx.drawImage(sprite.canvas, x - sprite.ox, y - sprite.oy);
        return;
      }
    }
    this.drawPaddleShape(sk, x, y, w, h);
  }

  private drawPaddleShape(
    sk: ArkanoidSkin,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const ctx = this.ctx;
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

  // El campo vacío (drawBoard) va en la capa de fondo, ver drawBackground().
  private drawField() {
    const sk = this.sk;
    this.drawBricks(sk);

    // Destellos: pocos y con alpha por operación; se dibujan directo como el original.
    for (const flash of this.breakFlashes) this.drawFlash(sk, flash);

    this.drawPaddle(sk);
    this.drawBall(sk);
  }

  // Aplica color/fuente del texto según la skin (halo en neón, negrita en pixel).
  private setTextStyle(sk: ArkanoidSkin, size: number, bold = false) {
    const ctx = this.ctx;
    ctx.fillStyle = sk.colors.hud;
    ctx.font =
      size === 12 && !bold
        ? sk.style === "pixel"
          ? HUD_FONT_BOLD
          : HUD_FONT
        : `${bold || sk.style === "pixel" ? "bold " : ""}${size}px monospace`;
    if (sk.style === "glow") {
      ctx.shadowColor = sk.colors.hud;
      ctx.shadowBlur = 8;
    }
  }

  // Los textos del HUD se dibujan directo en cada frame (en una capa offscreen el
  // texto sale con otro espaciado), pero sus strings solo se regeneran cuando
  // cambia el valor: sin basura por frame.
  private drawHUD() {
    const ctx = this.ctx;
    const sk = this.sk;
    ctx.fillStyle = sk.colors.hudBg;
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    if (this.hudScore !== this.score) {
      this.hudScore = this.score;
      this.hudScoreText = `SCORE ${this.score}`;
    }
    if (this.hudLevel !== this.level) {
      this.hudLevel = this.level;
      this.hudLevelText = `NIVEL ${this.level}/5`;
    }
    if (this.hudLives !== this.lives) {
      this.hudLives = this.lives;
      this.hudLivesText = `VIDAS ${this.lives}`;
    }

    ctx.save();
    this.setTextStyle(sk, 12);

    ctx.textAlign = "left";
    ctx.fillText(this.hudScoreText, 8, 14);

    ctx.textAlign = "center";
    ctx.fillText(this.hudLevelText, this.width / 2, 14);

    ctx.textAlign = "right";
    ctx.fillText(this.hudLivesText, this.width - 8, 14);
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
    this.drawBackground(this.sk);
    this.drawField();
    this.drawHUD();

    if (this.state === "levelComplete") this.drawLevelCompleteOverlay();
  }
}
