// Motor de Frogger diseñado desde cero (no hay game.js de referencia en
// references/started-games/ para este juego — ver specs/12-juego-frogger.md).
// Sin variables globales de window/document/canvas: recibe ctx, ancho/alto e input por
// constructor, igual que snake/arkanoid/tetris/asteroids. La rana se mueve por saltos
// discretos de una celda (animación de 120 ms); el tráfico y el río se desplazan en
// continuo (col fraccionaria) y hacen loop al salir por un borde.
// Todo se dibuja con primitivas canvas: no se carga ninguna imagen.
// Apariencia: todo el dibujo lee de la skin activa (ver ./skins y setSkin()).

import { SKINS, resolveSkin, type FroggerSkin, type SkinId } from "./skins";

export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

export type GameState = "playing" | "gameover";

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
export const CANVAS_W = COLS * CELL; // 640 — se escala con CSS al contenedor
export const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

type Direction = "up" | "down" | "left" | "right";

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  phaseT?: number; // solo tortugas: ms transcurridos dentro del ciclo visible → sumergida
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

const LEVEL_SPEED_FACTOR = 1.15; // +15 % de velocidad por nivel

// Ciclo de inmersión de cada grupo de tortugas (temporizador independiente por grupo).
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
const TURTLE_WARN_MS = 1000; // parpadeo de aviso antes de sumergirse

interface LaneDef {
  row: number;
  type: Entity["type"];
  width: number; // celdas por entidad
  count: number; // entidades en el carril (≥ 2)
  speed: number; // px/frame a 60 fps en el nivel 1
  dir: 1 | -1;
  offset: number; // desfase inicial en celdas para que los carriles no arranquen alineados
}

// Carretera (filas 8–12): sentidos alternos, 1.5–4 px/frame, huecos de ≥ 4 celdas.
// Río (filas 1–6): sentidos alternos, 1–3 px/frame, huecos de ≥ 2.5 celdas.
const LANE_DEFS: LaneDef[] = [
  { row: 1, type: "log", width: 3, count: 3, speed: 1.5, dir: 1, offset: 0 },
  { row: 2, type: "turtle", width: 2, count: 4, speed: 2, dir: -1, offset: 1 },
  { row: 3, type: "log", width: 4, count: 3, speed: 2.5, dir: 1, offset: 3 },
  {
    row: 4,
    type: "turtle",
    width: 3,
    count: 3,
    speed: 1.2,
    dir: -1,
    offset: 2,
  },
  { row: 5, type: "log", width: 2, count: 4, speed: 1, dir: 1, offset: 1.5 },
  {
    row: 6,
    type: "turtle",
    width: 3,
    count: 3,
    speed: 1.8,
    dir: -1,
    offset: 0,
  },
  { row: 8, type: "truck", width: 3, count: 2, speed: 1.8, dir: -1, offset: 2 },
  { row: 9, type: "car", width: 1, count: 2, speed: 4, dir: 1, offset: 0 },
  {
    row: 10,
    type: "truck",
    width: 2,
    count: 3,
    speed: 2.5,
    dir: -1,
    offset: 4,
  },
  { row: 11, type: "car", width: 1, count: 3, speed: 2, dir: 1, offset: 1 },
  { row: 12, type: "car", width: 1, count: 3, speed: 1.5, dir: -1, offset: 3 },
];

// Longitud del circuito de un carril: al salir por un borde la entidad reaparece en
// col = -width (o col = COLS), así que el periodo del loop es COLS + width celdas.
function trackLength(width: number): number {
  return COLS + width;
}

function buildLanes(level: number): Lane[] {
  const factor = Math.pow(LEVEL_SPEED_FACTOR, level - 1);
  let turtleGroup = 0;
  return LANE_DEFS.map((def) => {
    const spacing = trackLength(def.width) / def.count;
    const entities: Entity[] = [];
    for (let i = 0; i < def.count; i++) {
      const col = (def.offset + i * spacing) % trackLength(def.width);
      const entity: Entity = {
        col: col - def.width,
        width: def.width,
        type: def.type,
      };
      if (def.type === "turtle") {
        entity.submerged = false;
        // Como en el arcade original, solo UN grupo por carril se sumerge; el resto flota
        // siempre. Si se hundieran todos, la fila 6 (la única entrada al río desde la
        // mediana) sería una trampa en un tercio de cada ciclo. Los buceadores de cada
        // carril arrancan desfasados dentro de la fase visible.
        if (i === 0) entity.phaseT = (turtleGroup++ * 900) % TURTLE_VISIBLE_MS;
      }
      entities.push(entity);
    }
    return { row: def.row, speed: def.speed * factor, dir: def.dir, entities };
  });
}

const JUMP_MS = 120; // duración de la animación de salto de una celda
const FRAME_MS = 16; // las velocidades se expresan en px por frame de ~16 ms

// Temporizador de viaje: 15 s en el nivel 1, −1 s por nivel, mínimo 8 s. Se reinicia en
// cada viaje de la rana (al ocupar una boca, al morir y al empezar ronda).
const BASE_TIME_MS = 15000;
const TIME_STEP_MS = 1000;
const MIN_TIME_MS = 8000;

// HUD interno: franja translúcida sobre la fila 0 con SCORE / NIVEL / vidas, y la barra
// de tiempo justo debajo. Las bocas destino se dibujan en el resto de la fila 0.
const HUD_HEIGHT = 18;
const TIME_BAR_H = 4;
const GOAL_TOP = HUD_HEIGHT + TIME_BAR_H;

// 5 bocas destino de 2 columnas cada una, separadas por setos de 1 columna:
// setos en 0, 3, 6, 9, 12, 15 → bocas en 1–2, 4–5, 7–8, 10–11, 13–14.
const GOAL_COLS = [1, 4, 7, 10, 13];
const GOAL_WIDTH = 2;

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const DIR_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

// Memo de colores derivados: evita parsear hex y crear strings en cada frame.
const shadeCache = new Map<string, string>(); // clave `${hex}|${amt}`

/* Aclara (amt > 0) u oscurece (amt < 0) un color '#rrggbb' (como shade() del Tetris). */
function shade(hex: string, amt: number): string {
  const key = `${hex}|${amt}`;
  const cached = shadeCache.get(key);
  if (cached) return cached;
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  const out = `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}

// Caja que envuelve una forma: la usan el brillo (rounded) y la textura (pixel).
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PIXEL_CELL = 5; // px de cada "píxel" de la textura del estilo pixel

// Contexto de dibujo: el del canvas visible o el de una capa offscreen (caché).
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// Sprite pre-renderizado de una entidad para la skin activa.
interface Sprite {
  canvas: OffscreenCanvas;
  ox: number; // desplazamiento del origen dentro del sprite (margen del halo)
  oy: number;
}

// Caja del cuerpo de la rana en sus coordenadas locales (centro en 0,0).
const FROG_BOX: Box = { x: -12, y: -14, w: 24, h: 28 };

// Margen del sprite alrededor de la entidad: cabe el halo de glow (shadowBlur 12).
const SPRITE_PAD = 20;

// Fase visual de un grupo de tortugas: a flote, parpadeo de aviso o sumergida.
type TurtlePhase = "normal" | "warn" | "sub";

function turtlePhase(e: Entity): TurtlePhase {
  if (e.submerged) return "sub";
  // Aviso: en el último segundo a flote el caparazón parpadea antes de sumergirse.
  const warn =
    e.phaseT !== undefined &&
    e.phaseT > TURTLE_VISIBLE_MS - TURTLE_WARN_MS &&
    Math.floor(e.phaseT / 150) % 2 === 0;
  return warn ? "warn" : "normal";
}

const GOAL_POINTS = 50;
const ROUND_POINTS = 200;

function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

function isRoadRow(row: number): boolean {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}

// Las colisiones usan el centro de la rana (col + 0.5): tras viajar en un tronco su
// col deja de ser entera, y así la comparación es la misma en carretera y en río.
function entityCovers(e: Entity, frog: Frog): boolean {
  const center = frog.col + 0.5;
  return center >= e.col && center < e.col + e.width;
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (!isRoadRow(frog.row)) return false;
  const lane = lanes.find((l) => l.row === frog.row);
  return !!lane && lane.entities.some((e) => entityCovers(e, frog));
}

// Tronco o tortugas a flote bajo la rana, o null (agua o tortuga sumergida).
function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  if (!isRiverRow(frog.row)) return null;
  const lane = lanes.find((l) => l.row === frog.row);
  const entity = lane?.entities.find((e) => entityCovers(e, frog));
  if (!entity || entity.submerged === true) return null;
  return entity;
}

// Índice de la boca libre bajo la rana, o null si cae en un seto o en una boca ocupada.
function checkGoal(frog: Frog, goals: boolean[]): number | null {
  if (frog.row !== ROW_GOALS) return null;
  const center = frog.col + 0.5;
  const i = GOAL_COLS.findIndex(
    (gc) => center >= gc && center < gc + GOAL_WIDTH,
  );
  if (i === -1 || goals[i]) return null;
  return i;
}

function timeForLevel(level: number): number {
  return Math.max(MIN_TIME_MS, BASE_TIME_MS - (level - 1) * TIME_STEP_MS);
}

export class FroggerEngine {
  score = 0;
  lives = 3;
  level = 1;
  state: GameState = "playing";
  skin: SkinId = "retro"; // solo apariencia; cambiarla no toca el estado de la partida

  private lanes: Lane[] = [];
  private frog: Frog = {
    col: 0,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: 0,
    targetRow: ROW_START,
  };
  private facing: Direction = "up";
  private pendingDir: Direction | null = null;
  private goals: boolean[] = GOAL_COLS.map(() => false);
  private timeLeftMs = BASE_TIME_MS;
  private bestRowThisTrip = ROW_START; // fila más alta (índice menor) alcanzada en el viaje

  // Fondo estático de la skin activa, pintado una vez y copiado cada frame con un
  // solo drawImage. null = sin construir (o sin OffscreenCanvas: se dibuja directo).
  private bgLayer: OffscreenCanvas | null = null;
  // Sprites de entidades de la skin activa (clave: forma + fase, ver spriteKey()).
  private sprites = new Map<string, Sprite>();
  private entityKeys = new WeakMap<Entity, Record<TurtlePhase, string>>();
  private frogGloss: CanvasGradient | null = null; // brillo rounded de la rana
  // Textos del HUD, regenerados solo cuando cambia su valor.
  private hudScore = -1;
  private hudScoreText = "";
  private hudLevel = -1;
  private hudLevelText = "";

  constructor(
    private ctx: Ctx2D,
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

  restart(): void {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.goals = GOAL_COLS.map(() => false);
    this.lanes = buildLanes(this.level);
    this.pendingDir = null;
    this.resetFrog();
  }

  forceGameOver(): void {
    this.state = "gameover";
  }

  // Cambia solo la apariencia: no reinicia la partida ni toca puntaje/estado.
  setSkin(id: string): void {
    this.skin = resolveSkin(id);
    // Las cachés de dibujo son por skin
    this.bgLayer = null;
    this.sprites.clear();
  }

  private get activeSkin(): FroggerSkin {
    return SKINS[this.skin];
  }

  // Rana de vuelta a la base, centrada, con el temporizador lleno: empieza un viaje nuevo.
  private resetFrog(): void {
    const col = Math.floor(COLS / 2) - 1;
    // Se muta en el sitio: update() conserva una referencia a this.frog durante el frame.
    Object.assign(this.frog, {
      col,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: col,
      targetRow: ROW_START,
    });
    this.facing = "up";
    this.timeLeftMs = timeForLevel(this.level);
    this.bestRowThisTrip = ROW_START;
    this.pendingDir = null; // una tecla pulsada antes de morir no arrastra al viaje nuevo
  }

  private handleInput(): void {
    for (const code of Object.keys(MOVE_KEYS)) {
      if (this.pressed(code)) this.pendingDir = MOVE_KEYS[code];
    }
  }

  private startJump(dir: Direction): void {
    const { dc, dr } = DIR_DELTA[dir];
    const targetRow = this.frog.row + dr;
    const targetCol = this.frog.col + dc;
    this.facing = dir;
    // No se sale por abajo ni por arriba, ni por los bordes laterales.
    if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
    if (targetCol < 0 || targetCol > COLS - 1) return;
    this.frog.animating = true;
    this.frog.animT = 0;
    this.frog.targetCol = targetCol;
    this.frog.targetRow = targetRow;
  }

  // Resuelve la celda donde acaba de aterrizar la rana.
  private land(): void {
    const frog = this.frog;
    frog.col = frog.targetCol;
    frog.row = frog.targetRow;
    frog.animating = false;

    // Un aterrizaje mortal no puntúa la fila.
    if (frog.row === ROW_GOALS) {
      this.reachGoal();
      return;
    }
    if (isRiverRow(frog.row) && !getSupport(frog, this.lanes)) {
      this.killFrog(); // (b) cae al agua
      return;
    }
    if (checkRoadCollision(frog, this.lanes)) {
      this.killFrog(); // (a) vehículo
      return;
    }
    this.scoreRowAdvance();
  }

  // +10 por cada fila alcanzada por primera vez en este viaje.
  private scoreRowAdvance(): void {
    if (this.frog.row < this.bestRowThisTrip) {
      this.bestRowThisTrip = this.frog.row;
      this.score += 10;
    }
  }

  // Boca libre → se ocupa, +10 de la fila, +50 y bonus de tiempo, y empieza un viaje
  // nuevo. Boca ya ocupada o seto entre bocas → muerte.
  private reachGoal(): void {
    const goal = checkGoal(this.frog, this.goals);
    if (goal === null) {
      this.killFrog();
      return;
    }
    this.scoreRowAdvance();
    this.goals[goal] = true;
    this.score += GOAL_POINTS + Math.floor(this.timeLeftMs / 1000) * 10;
    if (this.goals.every(Boolean)) this.completeRound();
    else this.resetFrog();
  }

  // Las 5 bocas llenas: +200, sube el nivel (tráfico +15 % y −1 s de tiempo), bocas
  // vacías y carriles reconstruidos. React se entera del nivel por el diff del loop.
  private completeRound(): void {
    this.score += ROUND_POINTS;
    this.level++;
    this.goals = GOAL_COLS.map(() => false);
    this.lanes = buildLanes(this.level);
    this.resetFrog();
  }

  // Resta una vida. Con vidas → la rana vuelve a la base con el tiempo lleno. Sin vidas
  // → gameover: update() deja de avanzar y el componente emite onLivesChange(0) y luego
  // onGameOver(score) al detectar el cambio en el loop.
  private killFrog(): void {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives === 0) {
      this.frog.animating = false;
      this.state = "gameover";
      return;
    }
    this.resetFrog();
  }

  // Desplazamiento en celdas de un carril para este frame.
  private laneDelta(lane: Lane, dtMs: number): number {
    return (lane.speed * lane.dir * (dtMs / FRAME_MS)) / CELL;
  }

  // Rana quieta en el río: viaja con el tronco/tortugas que la sostienen. Muere si se
  // queda sin apoyo (tortuga sumergida) o si el apoyo la saca por un borde lateral.
  private rideRiver(dtMs: number): void {
    const frog = this.frog;
    const lane = this.lanes.find((l) => l.row === frog.row);
    if (!lane) return;
    const support = getSupport(frog, this.lanes);
    if (!support) {
      this.killFrog(); // (c) la tortuga se sumergió bajo la rana
      return;
    }
    frog.col += this.laneDelta(lane, dtMs);
    frog.targetCol = frog.col;
    const center = frog.col + 0.5;
    if (center < 0 || center >= COLS) this.killFrog(); // (d) sale por el borde
  }

  private moveLanes(dtMs: number): void {
    for (const lane of this.lanes) {
      const delta = this.laneDelta(lane, dtMs);
      for (const e of lane.entities) {
        e.col += delta;
        if (lane.dir > 0 && e.col >= COLS) e.col -= trackLength(e.width);
        if (lane.dir < 0 && e.col + e.width <= 0) e.col += trackLength(e.width);
        if (e.type === "turtle" && e.phaseT !== undefined) {
          e.phaseT = (e.phaseT + dtMs) % TURTLE_CYCLE_MS;
          e.submerged = e.phaseT >= TURTLE_VISIBLE_MS;
        }
      }
    }
  }

  update(dt: number): void {
    if (this.state !== "playing") return;
    const dtMs = dt * 1000;

    this.handleInput();
    this.moveLanes(dtMs);

    const frog = this.frog;
    if (!frog.animating) {
      // Quieta: arrastre del río y tráfico que le pasa por encima.
      if (isRiverRow(frog.row)) this.rideRiver(dtMs);
      else if (checkRoadCollision(frog, this.lanes)) this.killFrog();
    }
    if (this.state !== "playing") return;
    if (!frog.animating && this.pendingDir) {
      this.startJump(this.pendingDir);
      this.pendingDir = null;
    }
    if (frog.animating) {
      frog.animT += dtMs;
      if (frog.animT >= JUMP_MS) this.land();
    }
    if (this.state !== "playing") return;

    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs);
    if (this.timeLeftMs === 0) this.killFrog(); // (e) se agotó el tiempo
  }

  // ───────────────────────────── dibujo ─────────────────────────────

  private rowY(row: number): number {
    return row * CELL;
  }

  // Radio de esquina según el estilo: pixel = recto, rounded = más redondeado.
  private radius(r: number, h: number): number {
    const style = this.activeSkin.style;
    if (style === "pixel") return 0;
    if (style === "rounded") return Math.min(h / 2, r * 1.8 + 2);
    return r;
  }

  // Textura de píxeles determinista (no parpadea entre frames) relativa a la caja, para
  // que viaje con la entidad; portada de drawPixelTexture() del Tetris.
  private pixelTexture(box: Box, color: string): void {
    const ctx = this.ctx;
    const light = shade(color, 0.16);
    const dark = shade(color, -0.16);
    const nx = Math.ceil(box.w / PIXEL_CELL);
    const ny = Math.ceil(box.h / PIXEL_CELL);
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const h = (ix * 7 + iy * 13 + ix * iy * 3) % 5;
        if (h === 0) ctx.fillStyle = light;
        else if (h === 1) ctx.fillStyle = dark;
        else continue;
        ctx.fillRect(
          box.x + ix * PIXEL_CELL,
          box.y + iy * PIXEL_CELL,
          PIXEL_CELL,
          PIXEL_CELL,
        );
      }
    }
  }

  // Brillo superior del estilo rounded para una caja.
  private glossGradient(box: Box): CanvasGradient {
    const g = this.ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
    g.addColorStop(0, "rgba(255,255,255,0.45)");
    g.addColorStop(0.45, "rgba(255,255,255,0)");
    return g;
  }

  // Rellena la forma que traza `path` según el `style` de la skin activa (equivale a las
  // ramas flat/glow/rounded/pixel de drawBlock() del Tetris). `color` en '#rrggbb'.
  // `gloss`: brillo rounded ya creado para `box` (lo reutiliza la rana en cada frame).
  private paint(
    path: () => void,
    color: string,
    box: Box,
    gloss?: CanvasGradient,
  ): void {
    const ctx = this.ctx;
    const skin = this.activeSkin;
    switch (skin.style) {
      case "glow": {
        // Núcleo oscuro teñido + contorno con halo: el color no se empasta.
        ctx.save();
        ctx.fillStyle = skin.colors.glowCore;
        path();
        ctx.fill();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "rounded": {
        // Relleno + brillo superior + borde suave apenas más oscuro.
        ctx.fillStyle = color;
        path();
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = gloss ?? this.glossGradient(box);
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.restore();
        ctx.strokeStyle = shade(color, -0.22);
        ctx.lineWidth = 1.5;
        path();
        ctx.stroke();
        break;
      }
      case "pixel": {
        // Relleno + textura de celdas recortada a la forma + borde oscuro.
        ctx.fillStyle = color;
        path();
        ctx.fill();
        ctx.save();
        ctx.clip();
        this.pixelTexture(box, color);
        ctx.restore();
        ctx.strokeStyle = shade(color, -0.35);
        ctx.lineWidth = 2;
        path();
        ctx.stroke();
        break;
      }
      default:
        ctx.fillStyle = color;
        path();
        ctx.fill();
    }
  }

  // Rectángulo (redondeado según el estilo) pintado con paint().
  private paintRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
  ): void {
    const rad = this.radius(r, h);
    this.paint(
      () => {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, rad);
      },
      color,
      { x, y, w, h },
    );
  }

  // Ejecuta `draw` sobre otro contexto (una capa offscreen): todas las rutinas de
  // dibujo usan this.ctx, así que se redirige mientras dura.
  private drawInto(target: Ctx2D, draw: () => void): void {
    const main = this.ctx;
    this.ctx = target;
    try {
      draw();
    } finally {
      this.ctx = main;
    }
  }

  // Capa del fondo estático para la skin activa; se construye la primera vez.
  // null sin OffscreenCanvas (el motor no toca window/document): se dibuja directo.
  private getBgLayer(): OffscreenCanvas | null {
    if (this.bgLayer) return this.bgLayer;
    if (typeof OffscreenCanvas === "undefined") return null;
    const layer = new OffscreenCanvas(this.width, this.height);
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return null;
    this.drawInto(layerCtx, () => this.drawStaticBackground());
    this.bgLayer = layer;
    return layer;
  }

  private drawBackground(): void {
    const layer = this.getBgLayer();
    if (layer) this.ctx.drawImage(layer, 0, 0);
    else this.drawStaticBackground();
    this.drawGoalFrogs();
  }

  // Ranas de las bocas ocupadas: cambian durante la partida, van sobre la capa.
  private drawGoalFrogs(): void {
    const h = CELL - GOAL_TOP;
    GOAL_COLS.forEach((gc, i) => {
      if (!this.goals[i]) return;
      this.drawFrogShape(
        (gc + GOAL_WIDTH / 2) * CELL,
        GOAL_TOP + h / 2,
        0.6,
        "up",
        false,
      );
    });
  }

  // Todo lo que no cambia con una skin fija: río, zonas seguras, carretera, rejilla,
  // seto y bocas (vacías).
  private drawStaticBackground(): void {
    const ctx = this.ctx;
    const skin = this.activeSkin;
    const c = skin.colors;
    ctx.fillStyle = skin.boardBg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Río (filas 1–6) con ondas suaves
    const riverY = this.rowY(ROW_RIVER_TOP);
    const riverH = (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL;
    ctx.fillStyle = c.river;
    ctx.fillRect(0, riverY, this.width, riverH);
    ctx.fillStyle = c.riverWave;
    for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
      for (let col = 0; col < COLS; col++) {
        if ((col + r) % 3 === 0)
          ctx.fillRect(col * CELL + 8, this.rowY(r) + 26, 14, 2);
      }
    }

    // Zonas seguras (fila 7 y fila 13)
    for (const r of [ROW_SAFE_MID, ROW_START]) {
      ctx.fillStyle = c.safe;
      ctx.fillRect(0, this.rowY(r), this.width, CELL);
      ctx.fillStyle = c.safeDot;
      for (let col = 0; col < COLS; col++) {
        ctx.fillRect(col * CELL + 6, this.rowY(r) + 8, 3, 3);
        ctx.fillRect(col * CELL + 24, this.rowY(r) + 26, 3, 3);
      }
    }

    // Líneas discontinuas entre carriles de carretera
    ctx.fillStyle = c.roadLine;
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      const y = this.rowY(r) - 1;
      for (let x = 6; x < this.width; x += 40) ctx.fillRect(x, y, 22, 2);
    }

    // Rejilla tenue por columnas (solo skins con `grid`)
    if (skin.grid) {
      ctx.fillStyle = skin.grid;
      for (let col = 1; col < COLS; col++)
        ctx.fillRect(col * CELL, CELL, 1, this.height - CELL);
    }

    // Fila de metas: seto con 5 bocas de borde dorado
    ctx.fillStyle = skin.style === "glow" ? c.glowCore : c.hedge;
    ctx.fillRect(0, 0, this.width, CELL);
    if (skin.style === "pixel")
      this.pixelTexture({ x: 0, y: 0, w: this.width, h: CELL }, c.hedge);
    ctx.fillStyle = c.hedgeDark;
    for (let col = 0; col < COLS; col++)
      ctx.fillRect(col * CELL + 4, GOAL_TOP + 4, 6, 6);
    if (skin.style === "glow") {
      // Borde inferior del seto como tubo de neón
      ctx.save();
      ctx.shadowColor = c.hedge;
      ctx.shadowBlur = 10;
      ctx.fillStyle = c.hedge;
      ctx.fillRect(0, CELL - 2, this.width, 2);
      ctx.restore();
    }
    GOAL_COLS.forEach((gc) => {
      const x = gc * CELL + 3;
      const w = GOAL_WIDTH * CELL - 6;
      const h = CELL - GOAL_TOP;
      ctx.save();
      ctx.fillStyle = c.goal;
      ctx.strokeStyle = c.goalBorder;
      ctx.lineWidth = skin.style === "pixel" ? 3 : 2;
      if (skin.style === "glow") {
        ctx.shadowColor = c.goalBorder;
        ctx.shadowBlur = 10;
      }
      if (skin.style === "rounded") {
        ctx.beginPath();
        ctx.roundRect(x, GOAL_TOP, w, h, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + 1, GOAL_TOP + 1, w - 2, h - 2, 5);
        ctx.stroke();
      } else {
        ctx.fillRect(x, GOAL_TOP, w, h);
        ctx.strokeRect(x + 1, GOAL_TOP + 1, w - 2, h - 2);
      }
      ctx.restore();
    });
  }

  // Ruedas de un vehículo: pares arriba/abajo en cada x (cuadradas en pixel).
  private drawWheels(xs: number[], y: number, inset: number, r: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.activeSkin.colors.wheel;
    for (const wx of xs) {
      if (this.activeSkin.style === "pixel") {
        ctx.fillRect(wx - r, y + inset - r, r * 2, r * 2);
        ctx.fillRect(wx - r, y + CELL - inset - r, r * 2, r * 2);
        continue;
      }
      ctx.beginPath();
      ctx.arc(wx, y + inset, r, 0, Math.PI * 2);
      ctx.arc(wx, y + CELL - inset, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Las formas de las entidades reciben la esquina (x, y) y el ancho en px: así se
  // pintan igual en el canvas (respaldo) o en su sprite (con el margen del halo).
  private drawCar(
    x: number,
    w: number,
    y: number,
    dir: 1 | -1,
    color: string,
  ): void {
    const ctx = this.ctx;
    this.drawWheels([x + 8, x + w - 8], y, 9, 5);
    // carrocería
    this.paintRect(x + 3, y + 8, w - 6, CELL - 16, 6, color);
    // parabrisas hacia el sentido de la marcha
    ctx.fillStyle = this.activeSkin.colors.glass;
    const wsX = dir > 0 ? x + w - 16 : x + 8;
    ctx.fillRect(wsX, y + 12, 8, CELL - 24);
  }

  private drawTruck(x: number, w: number, y: number, dir: 1 | -1): void {
    const ctx = this.ctx;
    const c = this.activeSkin.colors;
    const cabW = 26;
    const cabX = dir > 0 ? x + w - cabW - 2 : x + 2;
    const trailerX = dir > 0 ? x + 2 : x + cabW + 4;
    const trailerW = w - cabW - 6;
    this.drawWheels([x + 10, x + w / 2, x + w - 10], y, 7, 4.5);
    this.paintRect(trailerX, y + 6, trailerW, CELL - 12, 0, c.truckBody);
    ctx.fillStyle = c.truckStripe;
    for (let lx = trailerX + 8; lx < trailerX + trailerW - 4; lx += 10)
      ctx.fillRect(lx, y + 8, 2, CELL - 16);
    this.paintRect(cabX, y + 8, cabW, CELL - 16, 4, c.truckCab);
    ctx.fillStyle = c.glass;
    ctx.fillRect(dir > 0 ? cabX + cabW - 9 : cabX + 3, y + 12, 6, CELL - 24);
  }

  private drawLog(x: number, w: number, y: number): void {
    const ctx = this.ctx;
    const c = this.activeSkin.colors;
    this.paintRect(x + 2, y + 6, w - 4, CELL - 12, 12, c.log);
    // vetas
    ctx.strokeStyle = c.logDark;
    ctx.lineWidth = 2;
    for (let lx = x + 14; lx < x + w - 14; lx += 18) {
      ctx.beginPath();
      ctx.moveTo(lx, y + 12);
      ctx.lineTo(lx + 10, y + 12);
      ctx.moveTo(lx + 6, y + CELL - 13);
      ctx.lineTo(lx + 16, y + CELL - 13);
      ctx.stroke();
    }
    // anillo del extremo (cuadrado en pixel)
    ctx.strokeStyle = c.logRing;
    if (this.activeSkin.style === "pixel") {
      ctx.strokeRect(x + w - 15, y + CELL / 2 - 10, 10, 20);
      return;
    }
    ctx.beginPath();
    ctx.ellipse(x + w - 10, y + CELL / 2, 5, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawTurtles(
    x: number,
    count: number,
    y: number,
    phase: TurtlePhase,
  ): void {
    const ctx = this.ctx;
    const skin = this.activeSkin;
    const c = skin.colors;
    const cy = y + CELL / 2;
    for (let i = 0; i < count; i++) {
      const cx = x + i * CELL + CELL / 2;
      if (phase === "sub") {
        // Aro discontinuo: en skins de contorno (neon) un aro continuo se confunde con
        // una tortuga a flote.
        ctx.save();
        ctx.strokeStyle = c.turtleSubmerged;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = c.turtleDark;
      for (const [ox, oy] of [
        [-12, -11],
        [12, -11],
        [-12, 11],
        [12, 11],
      ]) {
        if (skin.style === "pixel") {
          ctx.fillRect(cx + ox - 4, cy + oy - 4, 8, 8);
          continue;
        }
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      this.paint(
        () => {
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        },
        phase === "warn" ? c.turtleWarn : c.turtle,
        { x: cx - 15, y: cy - 15, w: 30, h: 30 },
      );
      // escamas
      ctx.strokeStyle = c.turtleDark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        ctx.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
        ctx.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      }
      ctx.stroke();
    }
  }

  // Dibuja la forma de una entidad con su esquina en (x, y).
  private drawEntityShape(e: Entity, lane: Lane, x: number, y: number): void {
    const w = e.width * CELL;
    if (e.type === "car")
      this.drawCar(
        x,
        w,
        y,
        lane.dir,
        this.activeSkin.colors.carColors[lane.row % 3],
      );
    else if (e.type === "truck") this.drawTruck(x, w, y, lane.dir);
    else if (e.type === "log") this.drawLog(x, w, y);
    else this.drawTurtles(x, e.width, y, turtlePhase(e));
  }

  // Clave del sprite de una entidad: forma y fase visual, sin depender de la skin (la
  // caché se vacía al cambiarla). Se calcula una vez por entidad para no crear strings
  // en cada frame.
  private spriteKey(e: Entity, lane: Lane): string {
    let keys = this.entityKeys.get(e);
    if (!keys) {
      const base =
        e.type === "car"
          ? `car|${lane.dir}|${lane.row % 3}|${e.width}`
          : e.type === "truck"
            ? `truck|${lane.dir}|${e.width}`
            : `${e.type}|${e.width}`;
      keys = { normal: base, warn: `${base}|warn`, sub: `${base}|sub` };
      this.entityKeys.set(e, keys);
    }
    return e.type === "turtle" ? keys[turtlePhase(e)] : keys.normal;
  }

  // Sprite de la entidad para la skin activa, construido bajo demanda. null sin
  // OffscreenCanvas: la entidad se dibuja directo.
  private getSprite(e: Entity, lane: Lane): Sprite | null {
    if (typeof OffscreenCanvas === "undefined") return null;
    const key = this.spriteKey(e, lane);
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const canvas = new OffscreenCanvas(
      e.width * CELL + SPRITE_PAD * 2,
      CELL + SPRITE_PAD * 2,
    );
    const spriteCtx = canvas.getContext("2d");
    if (!spriteCtx) return null;
    this.drawInto(spriteCtx, () =>
      this.drawEntityShape(e, lane, SPRITE_PAD, SPRITE_PAD),
    );
    const sprite: Sprite = { canvas, ox: SPRITE_PAD, oy: SPRITE_PAD };
    this.sprites.set(key, sprite);
    return sprite;
  }

  private drawLanes(): void {
    const ctx = this.ctx;
    for (const lane of this.lanes) {
      const y = this.rowY(lane.row);
      for (const e of lane.entities) {
        const x = e.col * CELL;
        const sprite = this.getSprite(e, lane);
        // Posición entera: drawImage no interpola subpíxeles (col sigue fraccionaria).
        if (sprite)
          ctx.drawImage(
            sprite.canvas,
            Math.round(x) - sprite.ox,
            y - sprite.oy,
          );
        else this.drawEntityShape(e, lane, x, y);
      }
    }
  }

  // Rana: cuerpo elíptico 24×28 (28×24 de perfil), ojos mirando hacia `facing` y patas
  // extendidas mientras salta. Colores y relleno según la skin activa.
  private drawFrogShape(
    cx: number,
    cy: number,
    scale: number,
    facing: Direction,
    jumping: boolean,
  ): void {
    const ctx = this.ctx;
    const skin = this.activeSkin;
    const c = skin.colors;
    const pixel = skin.style === "pixel";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(
      facing === "up"
        ? 0
        : facing === "right"
          ? Math.PI / 2
          : facing === "down"
            ? Math.PI
            : -Math.PI / 2,
    );
    ctx.scale(scale, scale);

    const leg = jumping ? 8 : 3;
    ctx.save();
    if (skin.style === "glow") {
      ctx.shadowColor = c.frogDark;
      ctx.shadowBlur = 8;
    }
    ctx.strokeStyle = c.frogDark;
    ctx.lineWidth = 4;
    ctx.lineCap = pixel ? "square" : "round";
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-14 - leg / 2, -10 - leg);
    ctx.moveTo(10, -6);
    ctx.lineTo(14 + leg / 2, -10 - leg);
    ctx.moveTo(-10, 6);
    ctx.lineTo(-14 - leg / 2, 10 + leg);
    ctx.moveTo(10, 6);
    ctx.lineTo(14 + leg / 2, 10 + leg);
    ctx.stroke();
    ctx.restore();

    // El brillo de la rana es siempre el mismo (coordenadas locales): se crea una vez.
    if (skin.style === "rounded")
      this.frogGloss ??= this.glossGradient(FROG_BOX);
    this.paint(
      () => {
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
      },
      c.frog,
      FROG_BOX,
      this.frogGloss ?? undefined,
    );

    for (const ex of [-6, 6]) {
      ctx.fillStyle = c.eyeWhite;
      if (pixel) {
        ctx.fillRect(ex - 4, -13, 8, 8);
        ctx.fillStyle = c.eyePupil;
        ctx.fillRect(ex - 2, -13, 4, 4);
        continue;
      }
      ctx.beginPath();
      ctx.arc(ex, -9, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.eyePupil;
      ctx.beginPath();
      ctx.arc(ex, -10.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFrog(): void {
    const f = this.frog;
    const t = f.animating ? Math.min(1, f.animT / JUMP_MS) : 0;
    const col = f.col + (f.targetCol - f.col) * t;
    const row = f.row + (f.targetRow - f.row) * t;
    const cx = col * CELL + CELL / 2;
    // En la fila de metas se centra en la parte de la boca que no tapa el HUD.
    const cy =
      row < 1
        ? GOAL_TOP + (CELL - GOAL_TOP) / 2 + (CELL / 2) * row
        : row * CELL + CELL / 2;
    this.drawFrogShape(cx, cy, row < 1 ? 0.8 : 1, this.facing, f.animating);
  }

  private drawHud(): void {
    const ctx = this.ctx;
    const skin = this.activeSkin;
    const c = skin.colors;
    const glow = skin.style === "glow";
    ctx.fillStyle = c.hud;
    ctx.fillRect(0, 0, this.width, HUD_HEIGHT);

    ctx.save();
    if (glow) {
      ctx.shadowColor = c.hudText;
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = c.hudText;
    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    // Los textos solo se regeneran cuando cambia el valor (sin strings nuevos por frame).
    if (this.score !== this.hudScore) {
      this.hudScore = this.score;
      this.hudScoreText = `SCORE ${this.score}`;
    }
    if (this.level !== this.hudLevel) {
      this.hudLevel = this.level;
      this.hudLevelText = `NIVEL ${this.level}`;
    }
    ctx.fillText(this.hudScoreText, 8, HUD_HEIGHT / 2 + 1);
    ctx.textAlign = "center";
    ctx.fillText(this.hudLevelText, this.width / 2, HUD_HEIGHT / 2 + 1);

    // Vidas: un icono de rana por vida, alineados a la derecha (cuadrados en pixel)
    if (glow) ctx.shadowColor = c.frog;
    ctx.fillStyle = c.frog;
    for (let i = 0; i < this.lives; i++) {
      const lx = this.width - 12 - i * 18;
      if (skin.style === "pixel") {
        ctx.fillRect(lx - 6, HUD_HEIGHT / 2 - 6, 12, 12);
        continue;
      }
      ctx.beginPath();
      ctx.arc(lx, HUD_HEIGHT / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Barra de tiempo: verde → amarillo → rojo según lo que queda
    const ratio = this.timeLeftMs / timeForLevel(this.level);
    ctx.fillStyle = c.timeBg;
    ctx.fillRect(0, HUD_HEIGHT, this.width, TIME_BAR_H);
    const barColor =
      ratio > 0.5 ? c.timeOk : ratio > 0.25 ? c.timeWarn : c.timeLow;
    ctx.save();
    if (glow) {
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(0, HUD_HEIGHT, this.width * ratio, TIME_BAR_H);
    ctx.restore();
  }

  draw(): void {
    this.drawBackground();
    this.drawLanes();
    this.drawFrog();
    this.drawHud();
  }
}
