// Motor de Asteroides portado de references/started-games/02-asteroids/game.js.
// Sin variables globales de window/canvas: recibe ctx, ancho/alto e input por constructor.
// El aspecto visual sale de la skin activa (./skins); la lógica de juego no depende de ella.

import {
  DEFAULT_SKIN,
  SKINS,
  resolveSkin,
  type AsteroidsSkin,
  type SkinId,
} from "./skins";

export interface EngineInput {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

export type GameState = "playing" | "dead" | "gameover";

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

type Vert = [number, number];

// Siluetas en coordenadas locales (apuntando a +x)
const SHIP_VERTS: Vert[] = [
  [20, 0], // nariz
  [-12, -9], // ala izquierda
  [-7, 0], // muesca trasera
  [-12, 9], // ala derecha
];
const LIFE_VERTS: Vert[] = [
  [9, 0],
  [-6, -5],
  [-3, 0],
  [-6, 5],
];

/* ---- Helpers de dibujo por skin (equivalentes a drawBlock() del Tetris) ---- */

/* Aclara (amt > 0) u oscurece (amt < 0) un color '#rgb' o '#rrggbb'. */
function shade(hex: string, amt: number): string {
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
}

function maxRadius(verts: Vert[]): number {
  return Math.max(...verts.map(([vx, vy]) => Math.hypot(vx, vy)));
}

function polyPath(ctx: CanvasRenderingContext2D, verts: Vert[]) {
  ctx.beginPath();
  ctx.moveTo(verts[0][0], verts[0][1]);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i][0], verts[i][1]);
  ctx.closePath();
}

/* Contorno suavizado: curvas cuadráticas entre los puntos medios de cada arista. */
function smoothPath(ctx: CanvasRenderingContext2D, verts: Vert[]) {
  const n = verts.length;
  const mid = (i: number): Vert => {
    const a = verts[i % n];
    const b = verts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const m0 = mid(0);
  ctx.beginPath();
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) {
    const v = verts[i % n];
    const m = mid(i);
    ctx.quadraticCurveTo(v[0], v[1], m[0], m[1]);
  }
  ctx.closePath();
}

function pointInPoly(x: number, y: number, verts: Vert[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/* Rasteriza un polígono rotado sobre una rejilla alineada al mundo (celdas de `cell`
   px): color base + textura determinista de luces/sombras + borde oscuro, como
   drawPixelTexture() del Tetris. La textura se ancla al centro del cuerpo, así que no
   parpadea al desplazarse. */
function drawPixelPoly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  verts: Vert[],
  color: string,
  cell: number,
) {
  const R = maxRadius(verts);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const gx0 = Math.floor((x - R) / cell);
  const gy0 = Math.floor((y - R) / cell);
  const cols = Math.ceil((x + R) / cell) - gx0 + 1;
  const rows = Math.ceil((y + R) / cell) - gy0 + 1;
  const ox = Math.floor(x / cell);
  const oy = Math.floor(y / cell);

  const mask: boolean[] = new Array(cols * rows);
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const dx = (gx0 + ix + 0.5) * cell - x;
      const dy = (gy0 + iy + 0.5) * cell - y;
      // coordenadas locales (rotación inversa)
      mask[iy * cols + ix] = pointInPoly(
        dx * cos + dy * sin,
        -dx * sin + dy * cos,
        verts,
      );
    }
  }
  const at = (ix: number, iy: number) =>
    ix >= 0 && iy >= 0 && ix < cols && iy < rows && mask[iy * cols + ix];

  const light = shade(color, 0.16);
  const dark = shade(color, -0.2);
  const edge = shade(color, -0.4);
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      if (!at(ix, iy)) continue;
      const isEdge =
        !at(ix - 1, iy) ||
        !at(ix + 1, iy) ||
        !at(ix, iy - 1) ||
        !at(ix, iy + 1);
      const rx = gx0 + ix - ox;
      const ry = gy0 + iy - oy;
      const h = (((rx * 7 + ry * 13 + rx * ry * 3) % 5) + 5) % 5;
      ctx.fillStyle = isEdge ? edge : h === 0 ? light : h === 1 ? dark : color;
      ctx.fillRect((gx0 + ix) * cell, (gy0 + iy) * cell, cell, cell);
    }
  }
}

/* Dibuja un cuerpo poligonal (roca, nave, icono de vida, llama) según el `style` de la
   skin. `lineWidth` aplica a los estilos de trazo (flat/glow); `cell` al pixel;
   `smooth` suaviza el contorno en rounded (rocas). */
function drawBody(
  ctx: CanvasRenderingContext2D,
  sk: AsteroidsSkin,
  x: number,
  y: number,
  rot: number,
  verts: Vert[],
  color: string,
  opts: { lineWidth: number; cell: number; smooth?: boolean },
) {
  if (sk.style === "pixel") {
    drawPixelPoly(ctx, x, y, rot, verts, color, opts.cell);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineJoin = "round";

  if (sk.style === "glow") {
    // núcleo oscuro para que el halo no empaste el interior
    polyPath(ctx, verts);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = opts.lineWidth + 0.8;
    ctx.stroke();
    ctx.restore();
    // filo interior brillante
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  } else if (sk.style === "rounded") {
    const R = maxRadius(verts);
    if (opts.smooth) {
      smoothPath(ctx, verts);
    } else {
      polyPath(ctx, verts);
      // trazo grueso del mismo color = esquinas redondeadas
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, R * 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.fill();
    if (opts.smooth) {
      // borde apenas más oscuro para separar rocas superpuestas
      ctx.strokeStyle = shade(color, -0.28);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // brillo superior, siempre arriba aunque el cuerpo rote
    ctx.clip();
    ctx.rotate(-rot);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-R * 0.18, -R * 0.34, R * 0.34, R * 0.14, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // flat (retro): trazo vectorial clásico
    polyPath(ctx, verts);
    ctx.strokeStyle = color;
    ctx.lineWidth = opts.lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number, width: number, height: number) {
    this.x = wrap(this.x + this.vx * dt, width);
    this.y = wrap(this.y + this.vy * dt, height);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, sk: AsteroidsSkin) {
    const color = sk.colors.bullet;
    if (sk.style === "pixel") {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(this.x / 2) * 2 - 2,
        Math.round(this.y / 2) * 2 - 2,
        4,
        4,
      );
      return;
    }
    ctx.save();
    ctx.fillStyle = color;
    let r = this.radius;
    if (sk.style === "glow") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      r = 2.5;
    } else if (sk.style === "rounded") {
      r = 3;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: Vert[];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number, width: number, height: number) {
    this.x = wrap(this.x + this.vx * dt, width);
    this.y = wrap(this.y + this.vy * dt, height);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, sk: AsteroidsSkin) {
    const color = sk.colors.asteroid[this.size - 1];
    drawBody(ctx, sk, this.x, this.y, this.rot, this.verts, color, {
      lineWidth: 1.5,
      cell: 5,
      smooth: true,
    });
  }
}

class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;

  constructor(
    private width: number,
    private height: number,
  ) {
    this.reset();
  }

  reset() {
    this.x = this.width / 2;
    this.y = this.height / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, this.width);
    this.y = wrap(this.y + this.vy * dt, this.height);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, sk: AsteroidsSkin) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    const flameOn = this.thrusting && Math.random() > 0.35;
    const flameLen = flameOn ? rand(6, 14) : 0;

    // Llama del propulsor rellena, detrás de la nave (glow/rounded/pixel)
    if (flameOn && sk.style !== "flat") {
      const flame: Vert[] = [
        [-8, -4],
        [-8 - flameLen, 0],
        [-8, 4],
      ];
      drawBody(ctx, sk, this.x, this.y, this.angle, flame, sk.colors.flame, {
        lineWidth: 1.5,
        cell: 3,
      });
    }

    // Silueta clásica: triángulo con muesca trasera
    drawBody(ctx, sk, this.x, this.y, this.angle, SHIP_VERTS, sk.colors.ship, {
      lineWidth: 1.5,
      cell: 3,
    });

    // Retro: la llama es un trazo abierto sobre la nave, como el original
    if (flameOn && sk.style === "flat") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - flameLen, 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = sk.colors.flame;
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;
  color: string; // color de lo que explotó (lo usan las skins con particle: null)

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, sk: AsteroidsSkin) {
    const color = sk.colors.particle ?? this.color;
    ctx.save();
    ctx.globalAlpha = this.ttl / this.life;
    if (sk.style === "pixel") {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(this.x / 3) * 3,
        Math.round(this.y / 3) * 3,
        3,
        3,
      );
      ctx.restore();
      return;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    if (sk.style === "glow") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
    } else if (sk.style === "rounded") {
      ctx.lineCap = "round";
      ctx.lineWidth = 2.5;
    }
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.restore();
  }
}

export class AsteroidsEngine {
  score = 0;
  lives = 3;
  level = 1;
  state: GameState = "playing";
  skin: SkinId = DEFAULT_SKIN;

  private ship: Ship;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private deadTimer = 0;
  // Campo de estrellas decorativo: semilla fija para que no cambie entre frames
  private stars: { x: number; y: number; s: number }[] = [];

  constructor(
    private ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
    private input: EngineInput,
  ) {
    this.ship = new Ship(this.width, this.height);
    this.spawnAsteroids(4);

    let seed = 1337;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 90; i++)
      this.stars.push({
        x: rnd() * this.width,
        y: rnd() * this.height,
        s: rnd() < 0.15 ? 2 : 1,
      });
  }

  // Cambia solo la apariencia: no reinicia la partida ni toca score/estado.
  setSkin(id: string | null | undefined) {
    this.skin = resolveSkin(id);
  }

  private get sk(): AsteroidsSkin {
    return SKINS[this.skin];
  }

  private pressed(code: string): boolean {
    const val = this.input.justPressed[code];
    this.input.justPressed[code] = false;
    return !!val;
  }

  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, this.width);
        y = rand(0, this.height);
      } while (Math.hypot(x - this.width / 2, y - this.height / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  restart() {
    this.ship = new Ship(this.width, this.height);
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.spawnAsteroids(4);
  }

  forceGameOver() {
    this.state = "gameover";
  }

  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  // `tint`: tamaño de la roca (1..3) o 0 para la nave. Define el color que guardan
  // las partículas, usado por las skins que las tiñen (particle: null).
  private explode(x: number, y: number, count = 8, tint = 0) {
    const colors = this.sk.colors;
    const color = tint > 0 ? colors.asteroid[tint - 1] : colors.ship;
    for (let i = 0; i < count; i++)
      this.particles.push(new Particle(x, y, color));
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.state = "gameover";
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  update(dt: number) {
    if (this.state === "gameover") {
      // El reinicio ("JUGAR DE NUEVO") lo maneja la plataforma vía restart(),
      // no el propio motor: solo se sigue animando la explosión pendiente.
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt, this.width, this.height));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }

    // Disparar
    if (this.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, this.input.keys);
    this.bullets.forEach((b) => b.update(dt, this.width, this.height));
    this.asteroids.forEach((a) => a.update(dt, this.width, this.height));
    this.particles.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * 5, a.size);
          newAsteroids.push(...a.split());
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.asteroids.length === 0) this.nextLevel();
  }

  private drawLifeIcon(x: number, y: number) {
    const sk = this.sk;
    drawBody(this.ctx, sk, x, y, -Math.PI / 2, LIFE_VERTS, sk.colors.ship, {
      lineWidth: 1.2,
      cell: 2,
    });
  }

  private drawStars() {
    const sk = this.sk;
    if (!sk.stars) return;
    const ctx = this.ctx;
    ctx.fillStyle = sk.stars;
    for (const st of this.stars) {
      if (sk.style === "rounded") {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (sk.style === "pixel") {
        // alineadas a la rejilla de 2 px
        ctx.fillRect(Math.round(st.x / 2) * 2, Math.round(st.y / 2) * 2, 2, 2);
      } else {
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
    }
  }

  private drawHUD() {
    const ctx = this.ctx;
    const sk = this.sk;
    ctx.save();
    ctx.fillStyle = sk.colors.hud;
    ctx.font = sk.style === "pixel" ? "bold 15px monospace" : "15px monospace";
    if (sk.style === "glow") {
      ctx.shadowColor = sk.colors.hud;
      ctx.shadowBlur = 8;
    }

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, this.width / 2, 26);
    ctx.restore();

    for (let i = 0; i < this.lives; i++)
      this.drawLifeIcon(this.width - 16 - i * 22, 18);
  }

  draw() {
    const ctx = this.ctx;
    const sk = this.sk;
    ctx.fillStyle = sk.boardBg;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawStars();

    this.particles.forEach((p) => p.draw(ctx, sk));
    this.asteroids.forEach((a) => a.draw(ctx, sk));
    this.bullets.forEach((b) => b.draw(ctx, sk));
    this.ship.draw(ctx, sk);

    this.drawHUD();
  }
}
