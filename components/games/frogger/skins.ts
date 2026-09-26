// Skins visuales de Frogger, modeladas sobre el objeto SKINS de
// references/started-games/03-tetris/game.js. Cada skin define su paleta por entidad
// (carretera, río, zonas seguras, bocas, rana, coches, camiones, troncos, tortugas, HUD)
// y un `style` que el motor interpreta para rellenar cada forma:
//   - flat:    relleno plano (look original del juego).
//   - glow:    núcleo oscuro teñido + contorno con shadowBlur del color de la entidad.
//   - rounded: formas más redondeadas con brillo superior y borde suave.
//   - pixel:   formas rectas con textura de celdas (luces/sombras) y borde oscuro.
// Todas se diseñan para el tema oscuro/CRT de la plataforma: fondo siempre oscuro.
// Los colores que el motor aclara/oscurece (entidades rellenas) van en '#rrggbb'.

export type SkinStyle = "flat" | "glow" | "rounded" | "pixel";

export interface FroggerSkin {
  label: string;
  style: SkinStyle;
  boardBg: string; // asfalto (fondo general del tablero)
  grid?: string; // rejilla tenue por columnas; sin él no se dibuja
  colors: {
    roadLine: string; // líneas discontinuas entre carriles
    river: string;
    riverWave: string;
    safe: string; // aceras (fila 7 y base)
    safeDot: string;
    hedge: string; // '#rrggbb' — seto de la fila de metas
    hedgeDark: string;
    goal: string; // interior de las bocas
    goalBorder: string;
    frog: string; // '#rrggbb'
    frogDark: string; // patas
    eyeWhite: string;
    eyePupil: string;
    carColors: [string, string, string]; // '#rrggbb', uno por carril (row % 3)
    wheel: string;
    glass: string; // parabrisas
    truckBody: string; // '#rrggbb'
    truckCab: string; // '#rrggbb'
    truckStripe: string; // nervaduras del remolque
    log: string; // '#rrggbb'
    logDark: string; // vetas
    logRing: string; // anillo del extremo
    turtle: string; // '#rrggbb'
    turtleDark: string; // patas y escamas
    turtleWarn: string; // '#rrggbb' — parpadeo antes de sumergirse
    turtleSubmerged: string; // aro que queda cuando están bajo el agua
    glowCore: string; // núcleo oscuro del estilo glow (los demás lo ignoran)
    hud: string; // franja del HUD
    hudText: string;
    timeBg: string;
    timeOk: string;
    timeWarn: string;
    timeLow: string;
  };
}

export const SKINS = {
  retro: {
    label: "Retro",
    style: "flat",
    boardBg: "#07070c",
    colors: {
      roadLine: "rgba(255,255,255,0.18)",
      river: "#0a1f4a",
      riverWave: "rgba(120,180,255,0.10)",
      safe: "#0f3a1a",
      safeDot: "rgba(120,255,140,0.10)",
      hedge: "#3fa34d",
      hedgeDark: "#2c7a37",
      goal: "#0b2a12",
      goalBorder: "#ffd23f",
      frog: "#39ff14",
      frogDark: "#1f9e0a",
      eyeWhite: "#fff",
      eyePupil: "#000",
      carColors: ["#ff3b3b", "#ffd23f", "#3b8bff"],
      wheel: "#111",
      glass: "rgba(200,240,255,0.85)",
      truckBody: "#9aa0a8",
      truckCab: "#ff7a1a",
      truckStripe: "rgba(0,0,0,0.18)",
      log: "#7a4a22",
      logDark: "#5a3416",
      logRing: "#a0683a",
      turtle: "#2fae5a",
      turtleDark: "#1c7a3c",
      turtleWarn: "#8fd49a",
      turtleSubmerged: "rgba(47,174,90,0.35)",
      glowCore: "#000",
      hud: "rgba(0,0,0,0.55)",
      hudText: "#ffffff",
      timeBg: "rgba(0,0,0,0.6)",
      timeOk: "#39ff14",
      timeWarn: "#ffd23f",
      timeLow: "#ff3b3b",
    },
  },
  neon: {
    label: "Neón",
    style: "glow",
    boardBg: "#05050a",
    colors: {
      roadLine: "rgba(255,43,214,0.4)",
      river: "#030b1e",
      riverWave: "rgba(0,245,255,0.16)",
      safe: "#0d0718",
      safeDot: "rgba(214,31,255,0.2)",
      hedge: "#39ff14",
      hedgeDark: "rgba(57,255,20,0.22)",
      goal: "#02060a",
      goalBorder: "#f5ff00",
      frog: "#39ff14",
      frogDark: "#2bd90f",
      eyeWhite: "#e8fff0",
      eyePupil: "#05050a",
      carColors: ["#ff2b6d", "#f5ff00", "#00a8ff"],
      wheel: "#1c1c30",
      glass: "rgba(0,245,255,0.75)",
      truckBody: "#b48cff",
      truckCab: "#ff8a1a",
      truckStripe: "rgba(180,140,255,0.3)",
      log: "#ff9f1a",
      logDark: "rgba(255,159,26,0.5)",
      logRing: "#ffc15a",
      turtle: "#00ffa3",
      turtleDark: "rgba(0,255,163,0.55)",
      turtleWarn: "#ff2bd6",
      turtleSubmerged: "rgba(0,255,163,0.3)",
      glowCore: "#07070f",
      hud: "rgba(5,5,10,0.78)",
      hudText: "#00f5ff",
      timeBg: "rgba(0,0,0,0.7)",
      timeOk: "#39ff14",
      timeWarn: "#f5ff00",
      timeLow: "#ff2b6d",
    },
  },
  pastel: {
    label: "Pastel",
    style: "rounded",
    boardBg: "#171527",
    colors: {
      roadLine: "rgba(241,230,255,0.22)",
      river: "#1b2346",
      riverWave: "rgba(160,231,229,0.14)",
      safe: "#1a2a26",
      safeDot: "rgba(181,234,215,0.14)",
      hedge: "#86c9a0",
      hedgeDark: "#6aae86",
      goal: "#15202a",
      goalBorder: "#ffe5a8",
      frog: "#c1f0a8",
      frogDark: "#8cc97a",
      eyeWhite: "#fff",
      eyePupil: "#2a2440",
      carColors: ["#ffb3ba", "#ffe5a8", "#a8c8ff"],
      wheel: "#2a2440",
      glass: "rgba(241,230,255,0.85)",
      truckBody: "#cdb4db",
      truckCab: "#ffc8a2",
      truckStripe: "rgba(42,36,64,0.2)",
      log: "#d4a373",
      logDark: "#b08158",
      logRing: "#e8c39e",
      turtle: "#a0e7e5",
      turtleDark: "#6fb8b6",
      turtleWarn: "#ffb3ba",
      turtleSubmerged: "rgba(160,231,229,0.3)",
      glowCore: "#171527",
      hud: "rgba(23,21,39,0.8)",
      hudText: "#f1e6ff",
      timeBg: "rgba(0,0,0,0.5)",
      timeOk: "#b5ead7",
      timeWarn: "#ffe5a8",
      timeLow: "#ffb3ba",
    },
  },
  pixel: {
    label: "Pixel art",
    style: "pixel",
    boardBg: "#0a0c18",
    grid: "rgba(120,140,210,0.07)",
    colors: {
      roadLine: "rgba(245,197,24,0.45)",
      river: "#141f5c",
      riverWave: "rgba(120,160,255,0.22)",
      safe: "#2a1f4a", // acera violeta, guiño al Frogger de 1981
      safeDot: "rgba(200,170,255,0.14)",
      hedge: "#2e8b3a",
      hedgeDark: "#1f6b2a",
      goal: "#0c1a10",
      goalBorder: "#f5c518",
      frog: "#5fcf4a",
      frogDark: "#3a8f2c",
      eyeWhite: "#fff",
      eyePupil: "#10131f",
      carColors: ["#e04040", "#f5c518", "#3a7bff"],
      wheel: "#10131f",
      glass: "#9fdcff",
      truckBody: "#b8bcc8",
      truckCab: "#e07020",
      truckStripe: "rgba(16,19,31,0.3)",
      log: "#8b5a2b",
      logDark: "#5c3a1a",
      logRing: "#b07a45",
      turtle: "#d83c3c", // tortugas rojas, como en el arcade original
      turtleDark: "#8a2020",
      turtleWarn: "#ff9a9a",
      turtleSubmerged: "rgba(216,60,60,0.35)",
      glowCore: "#0a0c18",
      hud: "rgba(10,12,24,0.85)",
      hudText: "#f5c518",
      timeBg: "rgba(0,0,0,0.6)",
      timeOk: "#5fcf4a",
      timeWarn: "#f5c518",
      timeLow: "#e04040",
    },
  },
} satisfies Record<string, FroggerSkin>;

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
