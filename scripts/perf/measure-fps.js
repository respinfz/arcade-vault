// Medición de FPS del reproductor /juegos/<id>/jugar (SPEC 13).
//
// Se ejecuta con el MCP de Playwright: `browser_run_code_unsafe` con
// `filename: "scripts/perf/measure-fps.js"`. El MCP envuelve el archivo como
// `await (<archivo>)(page)`, por eso es una única expresión de función, sin
// punto y coma final (de ahí el `prettier-ignore`). Ver scripts/perf/README.md.
//
// Parámetros: cada ejecución del MCP es un sandbox nuevo (sin `process` ni
// globales persistentes), así que se leen del hash de la página actual. Antes de
// ejecutar el script se navega (`browser_navigate`) a:
//   http://localhost:3000/#perf=frogger:glow:mobile,snake:retro:desktop
// Cada corrida es `juego:skin:modo` (modo = desktop | mobile) y la URL base es el
// origen de esa página. Sin `#perf=`, mide RUNS contra BASE_URL (abajo).
// Devuelve un FpsResult si hay una sola corrida, o un array si hay varias.

/* eslint-disable @typescript-eslint/no-unused-expressions */
// prettier-ignore
async (page) => {
  const RUNS = [{ game: "frogger", skin: "retro", mode: "desktop" }];
  const BASE_URL = "http://localhost:3000"; // `npm run start`
  const WARMUP_MS = 2000; // calentamiento antes de medir
  const MEASURE_MS = 10000; // ventana de medición
  const DROPPED_MS = 33; // frame "perdido" (tirón visible a 60 Hz)

  const MODES = {
    desktop: { width: 1280, height: 800, cpuRate: 1, touch: false },
    mobile: { width: 390, height: 844, cpuRate: 4, touch: true },
  };

  // El sandbox tampoco tiene `URL`: origen y hash se extraen con una regex.
  const [, origin = "", spec = ""] =
    /^(https?:\/\/[^/#?]+)[^#]*(?:#perf=(.*))?$/.exec(page.url()) ?? [];
  const runs = spec
    ? decodeURIComponent(spec)
        .split(",")
        .map((r) => {
          const [game, skin, mode] = r.split(":");
          return { game, skin, mode };
        })
    : RUNS;
  const baseUrl = spec ? origin : BASE_URL;

  const cdp = await page.context().newCDPSession(page);
  const results = [];

  try {
    for (const { game, skin = "retro", mode = "desktop" } of runs) {
      const m = MODES[mode];
      if (!m) throw new Error(`Modo desconocido: ${mode}`);

      // Emulación antes de cargar: (pointer: coarse) se resuelve ya en el primer render.
      await page.setViewportSize({ width: m.width, height: m.height });
      await cdp.send(
        "Emulation.setTouchEmulationEnabled",
        m.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
      );
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: m.cpuRate });

      // La skin se lee de localStorage al montar el reproductor: se fija y se recarga.
      const url = `${baseUrl}/juegos/${game}/jugar`;
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(
        ([key, value]) => localStorage.setItem(key, value),
        [`av_skin:${game}`, skin],
      );
      await page.reload({ waitUntil: "load" });
      await page.locator(".crt-screen canvas").first().waitFor({ timeout: 30000 });

      // Intervalos entre requestAnimationFrame medidos desde la propia página.
      const deltas = await page.evaluate(
        ([warmupMs, measureMs]) =>
          new Promise((resolve) => {
            const out = [];
            let start = 0;
            let last = 0;
            const tick = (t) => {
              if (!start) start = t;
              const elapsed = t - start;
              if (elapsed >= warmupMs) {
                if (last) out.push(t - last);
                last = t;
              }
              if (elapsed < warmupMs + measureMs) requestAnimationFrame(tick);
              else resolve(out);
            };
            requestAnimationFrame(tick);
          }),
        [WARMUP_MS, MEASURE_MS],
      );

      const total = deltas.reduce((a, b) => a + b, 0);
      const sorted = [...deltas].sort((a, b) => a - b);
      const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
      const round1 = (n) => Math.round(n * 10) / 10;

      results.push({
        game,
        skin,
        mode,
        avgFps: round1(total > 0 ? (deltas.length * 1000) / total : 0),
        p95FrameMs: round1(p95),
        maxFrameMs: round1(sorted[sorted.length - 1] ?? 0),
        framesOver33ms: deltas.filter((d) => d > DROPPED_MS).length,
        frames: deltas.length,
      });
    }
  } finally {
    // Deja el navegador como estaba (escritorio, sin throttling ni táctil).
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => {});
    await cdp
      .send("Emulation.setTouchEmulationEnabled", { enabled: false })
      .catch(() => {});
    await page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
    await cdp.detach().catch(() => {});
  }

  return results.length === 1 ? results[0] : results;
}
