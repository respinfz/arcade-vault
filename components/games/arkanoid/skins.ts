// Skins visuales de Arkanoid, modeladas sobre el objeto SKINS de
// references/started-games/03-tetris/game.js. Cada skin define su paleta por entidad y un
// `style` que el motor interpreta para dibujar ladrillos, pala, bola y destellos.
// Los ladrillos conservan su color lógico (fila → puntaje) en el motor; la skin solo
// traduce ese color lógico a un color visible. `grid` es la decoración opcional del campo.
// Todas se diseñan para el tema oscuro/CRT de la plataforma: fondo siempre oscuro.

export type SkinStyle = "flat" | "glow" | "rounded" | "pixel";

// Colores lógicos de fila (de abajo hacia arriba: 1 a 7 puntos), definidos en engine.ts.
export type BrickColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export interface ArkanoidSkin {
  label: string;
  style: SkinStyle;
  outerBg: string; // fondo del canvas fuera del campo de juego
  boardBg: string; // fondo del campo de juego (480 px centrados)
  grid?: string; // rejilla decorativa del campo; sin ella no se dibuja
  fieldBorder?: string; // borde del campo; sin él no se dibuja
  colors: {
    bricks: Record<BrickColor, string>;
    paddle: string;
    paddleAccent?: string; // extremos de la pala (estilo "Vaus" en pixel)
    ball: string;
    hud: string; // texto del HUD y del overlay de nivel completado
    hudBg: string;
  };
}

export const SKINS = {
  retro: {
    label: "Retro",
    style: "flat",
    outerBg: "#000",
    boardBg: "#0a0a12",
    colors: {
      bricks: {
        gray: "gray",
        red: "red",
        yellow: "yellow",
        cyan: "cyan",
        magenta: "magenta",
        hotpink: "hotpink",
        green: "green",
      },
      paddle: "#00f5ff",
      ball: "#fff",
      hud: "#fff",
      hudBg: "rgba(0, 0, 0, 0.5)",
    },
  },
  neon: {
    label: "Neón",
    style: "glow",
    outerBg: "#000",
    boardBg: "#05050d",
    grid: "rgba(0, 245, 255, 0.05)",
    fieldBorder: "rgba(0, 245, 255, 0.4)",
    colors: {
      bricks: {
        gray: "#8a93c8",
        red: "#ff3b5c",
        yellow: "#f5ff00",
        cyan: "#00f5ff",
        magenta: "#ff2bd6",
        hotpink: "#ff7ab8",
        green: "#00ff88",
      },
      paddle: "#00f5ff",
      ball: "#f5ff00",
      hud: "#00f5ff",
      hudBg: "rgba(0, 0, 0, 0.6)",
    },
  },
  pastel: {
    label: "Pastel",
    style: "rounded",
    outerBg: "#0d0b18",
    boardBg: "#161427",
    fieldBorder: "rgba(241, 230, 255, 0.18)",
    colors: {
      bricks: {
        gray: "#c9c6dd",
        red: "#ffadad",
        yellow: "#fbe7a1",
        cyan: "#a0e7e5",
        magenta: "#e0b0ff",
        hotpink: "#ffb3c6",
        green: "#b5ead7",
      },
      paddle: "#bde0fe",
      ball: "#ffd6a5",
      hud: "#f1e6ff",
      hudBg: "rgba(13, 11, 24, 0.7)",
    },
  },
  pixel: {
    label: "Pixel art",
    style: "pixel",
    outerBg: "#05060d",
    boardBg: "#0a0c18",
    grid: "rgba(180, 200, 255, 0.06)",
    fieldBorder: "#2a3050",
    colors: {
      bricks: {
        gray: "#9aa4b0",
        red: "#e04040",
        yellow: "#f5c518",
        cyan: "#3fc5e8",
        magenta: "#b347d9",
        hotpink: "#f06ba8",
        green: "#3cb043",
      },
      paddle: "#b8c0d0",
      paddleAccent: "#e04040",
      ball: "#f5f5f5",
      hud: "#f5c518",
      hudBg: "rgba(5, 6, 13, 0.75)",
    },
  },
} satisfies Record<string, ArkanoidSkin>;

export type SkinId = keyof typeof SKINS;

export const DEFAULT_SKIN: SkinId = "retro";

// Devuelve un id válido: ante un valor desconocido (p. ej. localStorage manipulado)
// cae en la skin por defecto.
export function resolveSkin(id: string | null | undefined): SkinId {
  return id && Object.hasOwn(SKINS, id) ? (id as SkinId) : DEFAULT_SKIN;
}

// Lista para el selector de la plataforma (registry → JugarClient).
export const SKIN_OPTIONS = (Object.keys(SKINS) as SkinId[]).map((id) => ({
  id,
  label: SKINS[id].label,
}));
