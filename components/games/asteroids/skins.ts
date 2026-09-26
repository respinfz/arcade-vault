// Skins visuales de Asteroides, modeladas sobre el objeto SKINS de
// references/started-games/03-tetris/game.js. Cada skin define su paleta por entidad y un
// `style` que el motor interpreta para dibujar rocas, nave, balas y partículas.
// `stars` es la decoración opcional del fondo (equivalente al `grid` del Tetris).
// Todas se diseñan para el tema oscuro/CRT de la plataforma: fondo siempre oscuro.

export type SkinStyle = "flat" | "glow" | "rounded" | "pixel";

export interface AsteroidsSkin {
  label: string;
  style: SkinStyle;
  boardBg: string;
  stars?: string; // campo de estrellas decorativo; sin él no se dibuja
  colors: {
    ship: string;
    flame: string;
    bullet: string;
    asteroid: [string, string, string]; // por tamaño: 1 (chico), 2 (mediano), 3 (grande)
    particle: string | null; // null = la partícula toma el color de lo que explotó
    hud: string;
  };
}

export const SKINS = {
  retro: {
    label: "Retro",
    style: "flat",
    boardBg: "#000",
    colors: {
      ship: "#fff",
      flame: "rgba(255, 130, 0, 0.85)",
      bullet: "#fff",
      asteroid: ["#fff", "#fff", "#fff"],
      particle: "#fff",
      hud: "#fff",
    },
  },
  neon: {
    label: "Neón",
    style: "glow",
    boardBg: "#05050a",
    stars: "rgba(120, 140, 255, 0.35)",
    colors: {
      ship: "#00f5ff",
      flame: "#ff9100",
      bullet: "#f5ff00",
      asteroid: ["#00ff88", "#b44cff", "#ff2bd6"],
      particle: null,
      hud: "#00f5ff",
    },
  },
  pastel: {
    label: "Pastel",
    style: "rounded",
    boardBg: "#151324",
    stars: "rgba(230, 215, 255, 0.28)",
    colors: {
      ship: "#bde0fe",
      flame: "#ffd6a5",
      bullet: "#fbe7a1",
      asteroid: ["#a0e7e5", "#ffb3ba", "#cdb4db"],
      particle: null,
      hud: "#f1e6ff",
    },
  },
  pixel: {
    label: "Pixel art",
    style: "pixel",
    boardBg: "#0a0c18",
    stars: "rgba(180, 200, 255, 0.4)",
    colors: {
      ship: "#5bd7ef",
      flame: "#f0912e",
      bullet: "#f5c518",
      asteroid: ["#d6a05f", "#9aa4b0", "#a8805a"],
      particle: null,
      hud: "#f5c518",
    },
  },
} satisfies Record<string, AsteroidsSkin>;

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
