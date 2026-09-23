// Motor de Tetris portado de references/started-games/03-tetris/game.js.
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por constructor.
// A diferencia del original (tablero 300×600 con panel DOM lateral), este motor pinta un panel
// in-canvas (SCORE/LINES/LEVEL/NEXT/COMBO) dentro de un canvas lógico 800×600, mismo tamaño que
// components/games/asteroids/engine.ts.

export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

export type GameState = "playing" | "gameover";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_X = 40; // margen izquierdo del tablero dentro del canvas lógico
const BOARD_WIDTH = COLS * BLOCK; // 300
const BOARD_HEIGHT = ROWS * BLOCK; // 600
const PANEL_X = BOARD_X + BOARD_WIDTH;

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N - tuerca (centro hueco)
  [[9]], // B - bomba (power-up, 1×1)
  [[10]], // R - rayo (power-up, 1×1)
];

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9aa0a6", // N - tuerca (gris metálico)
  "#37474f", // B - bomba (gris carbón)
  "#283593", // R - rayo (índigo oscuro)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const COMBO_MAX_MULT = 5;
const COMBO_COLORS: Record<number, string> = {
  2: "#ffd54f",
  3: "#ffb74d",
  4: "#e57373",
  5: "#ba68c8",
};

const NUT_TYPE = 8;
const NUT_CHANCE = 1 / 15; // ~1 de cada 15 piezas

const BOMB_TYPE = 9;
const RAYO_TYPE = 10;
const POWER_LINES = 10; // aparece un power-up cada 10 líneas (bomba y rayo alternan)
const BOMB_SCORE_PER_BLOCK = 50;
const RAYO_SCORE_PER_BLOCK = 50;
const BLAST_MS = 300; // duración del destello de la explosión

// Repetición de movimiento mientras se mantiene una tecla/botón (teclado y táctil comparten
// esta lógica: el DOM ya deduplica el primer keydown vía justPressed, ver tetris-game.tsx).
const MOVE_DAS_DELAY = 170; // ms antes de empezar a repetir
const MOVE_DAS_REPEAT = 50; // ms entre repeticiones tras el delay inicial
const SOFT_DROP_REPEAT = 50; // ms entre pasos de caída suave mientras se mantiene ↓

interface Piece {
  type: number;
  shape: number[][];
  dir: "h" | "v" | null;
  x: number;
  y: number;
}

interface Blast {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  t: number;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

export class TetrisEngine {
  score = 0;
  lines = 0; // ocupa el lugar de "vidas" en el HUD del reproductor (rótulo "Líneas")
  level = 1;
  state: GameState = "playing";
  combo = 0; // multiplicador visible solo en el panel in-canvas

  private board: number[][] = createBoard();
  private current!: Piece;
  private next!: Piece;
  private dropAccum = 0;
  private dropInterval = 1000;
  private powerPending: number | null = null;
  private nextPowerLines = POWER_LINES;
  private nextPowerType = BOMB_TYPE;
  private blasts: Blast[] = [];
  private now = 0; // reloj interno del motor (ms), avanza con dt en vez de usar performance.now()
  private moveTimers = { left: 0, right: 0, down: 0 };

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

  restart() {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.state = "playing";
    this.combo = 0;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.powerPending = null;
    this.nextPowerLines = POWER_LINES;
    this.nextPowerType = BOMB_TYPE;
    this.blasts = [];
    this.now = 0;
    this.moveTimers = { left: 0, right: 0, down: 0 };
    this.next = this.randomPiece();
    this.spawn();
  }

  forceGameOver() {
    this.state = "gameover";
  }

  private randomPiece(): Piece {
    let type: number;
    if (this.powerPending) {
      type = this.powerPending;
      this.powerPending = null;
    } else if (Math.random() < NUT_CHANCE) {
      type = NUT_TYPE;
    } else {
      type = Math.floor(Math.random() * 7) + 1;
    }
    const shape = PIECES[type]!.map((row) => [...row]);
    const dir = type === RAYO_TYPE ? (Math.random() < 0.5 ? "h" : "v") : null;
    return {
      type,
      shape,
      dir,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  private collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  private rotateCW(shape: number[][]): number[][] {
    const rows = shape.length,
      cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  private tryRotate() {
    if (this.current.type === RAYO_TYPE) {
      this.current.dir = this.current.dir === "h" ? "v" : "h";
      return;
    }
    const rotated = this.rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collide(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private tryMove(dx: number) {
    if (
      !this.collide(this.current.shape, this.current.x + dx, this.current.y)
    ) {
      this.current.x += dx;
    }
  }

  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] =
            this.current.shape[r][c];
  }

  private comboMult(): number {
    return Math.max(1, Math.min(this.combo, COMBO_MAX_MULT));
  }

  private clearLines(isPowerUp: boolean) {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.combo++;
      const mult = this.comboMult();
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level * mult;
      this.level = 1 + Math.floor(this.lines / 10);
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
      if (this.lines >= this.nextPowerLines) {
        this.powerPending = this.nextPowerType;
        this.nextPowerType =
          this.nextPowerType === BOMB_TYPE ? RAYO_TYPE : BOMB_TYPE;
        this.nextPowerLines =
          (Math.floor(this.lines / POWER_LINES) + 1) * POWER_LINES;
      }
    } else if (!isPowerUp) {
      // una pieza normal que no limpia líneas rompe la cadena; los power-ups la congelan
      this.combo = 0;
    }
  }

  private collapseColumn(c: number) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!this.board[r][c]) continue;
      this.board[write][c] = this.board[r][c];
      if (write !== r) this.board[r][c] = 0;
      write--;
    }
  }

  private explode(cx: number, cy: number) {
    let destroyed = 0;
    for (let r = cy - 1; r <= cy + 1; r++) {
      for (let c = cx - 1; c <= cx + 1; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (this.board[r][c]) {
          this.board[r][c] = 0;
          destroyed++;
        }
      }
    }
    for (let c = Math.max(0, cx - 1); c <= Math.min(COLS - 1, cx + 1); c++)
      this.collapseColumn(c);
    this.score += destroyed * BOMB_SCORE_PER_BLOCK * this.level;
    this.blasts.push({
      x: cx - 1,
      y: cy - 1,
      w: 3,
      h: 3,
      color: "#ffb74d",
      t: this.now,
    });
  }

  private strike(x: number, y: number, dir: "h" | "v" | null) {
    let destroyed = 0;
    if (dir === "h") {
      for (let c = 0; c < COLS; c++) if (this.board[y][c]) destroyed++;
      this.board.splice(y, 1);
      this.board.unshift(new Array(COLS).fill(0));
      this.blasts.push({
        x: 0,
        y,
        w: COLS,
        h: 1,
        color: "#ffee58",
        t: this.now,
      });
    } else {
      for (let r = 0; r < ROWS; r++) {
        if (this.board[r][x]) {
          this.board[r][x] = 0;
          destroyed++;
        }
      }
      this.blasts.push({
        x,
        y: 0,
        w: 1,
        h: ROWS,
        color: "#ffee58",
        t: this.now,
      });
    }
    this.score += destroyed * RAYO_SCORE_PER_BLOCK * this.level;
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!this.collide(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private softDrop() {
    if (!this.collide(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private lockPiece() {
    const type = this.current.type;
    const isPowerUp = type === BOMB_TYPE || type === RAYO_TYPE;
    const bx = this.current.x,
      by = this.current.y,
      bdir = this.current.dir;
    this.merge();
    if (type === BOMB_TYPE) this.explode(bx, by);
    else if (type === RAYO_TYPE) this.strike(bx, by, bdir);
    this.clearLines(isPowerUp);
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = this.randomPiece();
    if (this.collide(this.current.shape, this.current.x, this.current.y)) {
      this.state = "gameover";
    }
  }

  private handleHold(
    code: string,
    dtMs: number,
    key: "left" | "right" | "down",
    action: () => void,
    repeatMs: number,
    initialDelayMs: number,
  ) {
    if (this.pressed(code)) {
      action();
      this.moveTimers[key] = 0;
      return;
    }
    if (this.input.keys[code]) {
      this.moveTimers[key] += dtMs;
      if (this.moveTimers[key] >= initialDelayMs) {
        action();
        this.moveTimers[key] -= repeatMs;
      }
    } else {
      this.moveTimers[key] = 0;
    }
  }

  private handleInput(dtMs: number) {
    const rotateUp = this.pressed("ArrowUp");
    const rotateX = this.pressed("KeyX");
    if (rotateUp || rotateX) this.tryRotate();

    if (this.pressed("Space")) {
      this.hardDrop();
      return;
    }

    this.handleHold(
      "ArrowLeft",
      dtMs,
      "left",
      () => this.tryMove(-1),
      MOVE_DAS_REPEAT,
      MOVE_DAS_DELAY,
    );
    this.handleHold(
      "ArrowRight",
      dtMs,
      "right",
      () => this.tryMove(1),
      MOVE_DAS_REPEAT,
      MOVE_DAS_DELAY,
    );
    this.handleHold(
      "ArrowDown",
      dtMs,
      "down",
      () => this.softDrop(),
      SOFT_DROP_REPEAT,
      SOFT_DROP_REPEAT,
    );
  }

  update(dt: number) {
    if (this.state === "gameover") return;
    const dtMs = dt * 1000;
    this.now += dtMs;

    this.handleInput(dtMs);
    // handleInput() puede terminar la partida (hardDrop/softDrop -> lockPiece -> spawn);
    // se re-lee this.state con un cast porque TS no invalida el narrowing de un campo
    // de instancia tras una llamada a método propio.
    if ((this.state as GameState) === "gameover") return;

    this.dropAccum += dtMs;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (
        !this.collide(this.current.shape, this.current.x, this.current.y + 1)
      ) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
  }

  private drawBlock(
    px: number,
    py: number,
    colorIndex: number,
    size: number,
    alpha = 1,
    dir: "h" | "v" | null = null,
  ) {
    if (!colorIndex) return;
    const ctx = this.ctx;
    const color = COLORS[colorIndex]!;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px + 1, py + 1, size - 2, 4);

    if (colorIndex === BOMB_TYPE) {
      const cx = px + size / 2;
      const cy = py + size / 2 + size * 0.06;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffb74d";
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.12, cy - size * 0.24);
      ctx.lineTo(cx + size * 0.24, cy - size * 0.4);
      ctx.stroke();
    }
    if (colorIndex === RAYO_TYPE) {
      ctx.fillStyle = "rgba(255,238,88,0.35)";
      if (dir === "v") ctx.fillRect(px + size / 2 - 2, py + 1, 4, size - 2);
      else ctx.fillRect(px + 1, py + size / 2 - 2, size - 2, 4);
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.moveTo(px + size * 0.58, py + size * 0.14);
      ctx.lineTo(px + size * 0.3, py + size * 0.56);
      ctx.lineTo(px + size * 0.48, py + size * 0.56);
      ctx.lineTo(px + size * 0.4, py + size * 0.86);
      ctx.lineTo(px + size * 0.7, py + size * 0.44);
      ctx.lineTo(px + size * 0.52, py + size * 0.44);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBoard() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(BOARD_X, 0, BOARD_WIDTH, BOARD_HEIGHT);

    ctx.strokeStyle = "#22222e";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK, 0);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_HEIGHT);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, r * BLOCK);
      ctx.lineTo(BOARD_X + BOARD_WIDTH, r * BLOCK);
      ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        this.drawBlock(BOARD_X + c * BLOCK, r * BLOCK, this.board[r][c], BLOCK);

    this.blasts = this.blasts.filter((b) => this.now - b.t < BLAST_MS);
    for (const b of this.blasts) {
      const p = (this.now - b.t) / BLAST_MS;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = p < 0.5 ? "#fff3e0" : b.color;
      ctx.fillRect(
        BOARD_X + b.x * BLOCK,
        b.y * BLOCK,
        b.w * BLOCK,
        b.h * BLOCK,
      );
      ctx.globalAlpha = 1;
    }

    if (this.state === "playing") {
      const gy = this.ghostY();
      for (let r = 0; r < this.current.shape.length; r++)
        for (let c = 0; c < this.current.shape[r].length; c++)
          if (this.current.shape[r][c])
            this.drawBlock(
              BOARD_X + (this.current.x + c) * BLOCK,
              (gy + r) * BLOCK,
              this.current.shape[r][c],
              BLOCK,
              0.2,
              this.current.dir,
            );

      for (let r = 0; r < this.current.shape.length; r++)
        for (let c = 0; c < this.current.shape[r].length; c++)
          if (this.current.shape[r][c])
            this.drawBlock(
              BOARD_X + (this.current.x + c) * BLOCK,
              (this.current.y + r) * BLOCK,
              this.current.shape[r][c],
              BLOCK,
              1,
              this.current.dir,
            );
    }
  }

  private drawPanel() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(PANEL_X, 0, this.width - PANEL_X, this.height);

    const labelX = PANEL_X + 30;
    let y = 50;

    const stat = (label: string, value: string) => {
      ctx.font = "13px monospace";
      ctx.fillStyle = "#9aa0a6";
      ctx.textAlign = "left";
      ctx.fillText(label, labelX, y);
      ctx.font = "28px monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(value, labelX, y + 32);
      y += 90;
    };

    stat("SCORE", this.score.toLocaleString());
    stat("LINES", String(this.lines));
    stat("LEVEL", String(this.level));

    ctx.font = "13px monospace";
    ctx.fillStyle = "#9aa0a6";
    ctx.fillText("NEXT", labelX, y);
    const cell = 24;
    const boxSize = 4 * cell;
    const boxX = labelX;
    const boxY = y + 14;
    ctx.strokeStyle = "#22222e";
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        this.drawBlock(
          boxX + (offX + c) * cell,
          boxY + (offY + r) * cell,
          shape[r][c],
          cell,
          1,
          this.next.dir,
        );
    y = boxY + boxSize + 40;

    ctx.font = "13px monospace";
    ctx.fillStyle = "#9aa0a6";
    ctx.textAlign = "left";
    ctx.fillText("COMBO", labelX, y);
    const mult = this.comboMult();
    ctx.font = "28px monospace";
    ctx.fillStyle = mult >= 2 ? COMBO_COLORS[mult] || "#ba68c8" : "#fff";
    ctx.fillText(`x${mult}`, labelX, y + 32);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBoard();
    this.drawPanel();

    ctx.strokeStyle = "#22222e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PANEL_X, 0);
    ctx.lineTo(PANEL_X, this.height);
    ctx.stroke();
  }
}
