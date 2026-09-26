// Skins visuales de Snake, modeladas sobre el objeto SKINS de
// references/started-games/03-tetris/game.js. Cada skin define su paleta por entidad y un
// `style` que el motor interpreta para dibujar la serpiente (cabeza + cuerpo), el soporte
// de la fruta y el HUD. Las frutas siguen siendo los sprites de /games/snake/fruits.png en
// todas las skins (son multicolores y legibles sobre fondo oscuro); la skin solo cambia el
// "plato" que se dibuja debajo (`fruitBack`).
// Todas se diseñan para el tema oscuro/CRT de la plataforma: fondo siempre oscuro.

export type SkinStyle = "flat" | "glow" | "rounded" | "pixel";

export interface SnakeSkin {
  label: string;
  style: SkinStyle;
  boardBg: string;
  grid?: string; // líneas de la grilla; sin él no se dibujan
  colors: {
    head: string; // '#rrggbb' (el estilo pixel lo aclara/oscurece)
    body: string; // '#rrggbb'
    bodyAlt: string; // segmentos alternos (rayas); igual a body = sin rayas
    eye: string | null; // pupilas de la cabeza; null = cabeza sin ojos (retro)
    fruitBack: string | null; // halo/plato bajo la fruta; null = nada
    hud: string;
    hudBg: string;
  };
}

export const SKINS = {
  retro: {
    label: "Retro",
    style: "flat",
    boardBg: "#0a0a12",
    grid: "#1c2a22",
    colors: {
      head: "#00ff88", // var(--green), igual que el cuerpo: look original
      body: "#00ff88",
      bodyAlt: "#00ff88",
      eye: null,
      fruitBack: null,
      hud: "#fff",
      hudBg: "rgba(0, 0, 0, 0.5)",
    },
  },
  neon: {
    label: "Neón",
    style: "glow",
    boardBg: "#05050a",
    grid: "rgba(0, 245, 255, 0.07)",
    colors: {
      head: "#00f5ff",
      body: "#ff2bd6",
      bodyAlt: "#d61fff",
      eye: "#05050a",
      fruitBack: "#f5ff00",
      hud: "#00f5ff",
      hudBg: "rgba(5, 5, 10, 0.7)",
    },
  },
  pastel: {
    label: "Pastel",
    style: "rounded",
    boardBg: "#151324",
    grid: "rgba(230, 215, 255, 0.06)",
    colors: {
      head: "#ffb3ba",
      body: "#a0e7e5",
      bodyAlt: "#b5ead7",
      eye: "#2a2440",
      fruitBack: "rgba(241, 230, 255, 0.1)",
      hud: "#f1e6ff",
      hudBg: "rgba(21, 19, 36, 0.75)",
    },
  },
  pixel: {
    label: "Pixel art",
    style: "pixel",
    boardBg: "#0a0c18",
    grid: "rgba(120, 140, 210, 0.08)",
    colors: {
      head: "#8ee06a",
      body: "#5fcf4a",
      bodyAlt: "#48b03a",
      eye: "#10131f",
      fruitBack: "#1e2340",
      hud: "#f5c518",
      hudBg: "rgba(10, 12, 24, 0.8)",
    },
  },
} satisfies Record<string, SnakeSkin>;

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
