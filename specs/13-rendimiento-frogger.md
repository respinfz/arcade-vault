# SPEC 13 — Rendimiento de Frogger y del reproductor

> **Status:** Implemented
> **Depends on:** SPEC 11, SPEC 12
> **Date:** 2026-09-26
> **Objective:** Eliminar los tirones y FPS bajos de Frogger (móvil y escritorio) cacheando su render sin cambiar su aspecto ni su jugabilidad, y quitar del reproductor `/juegos/[id]/jugar` los efectos CSS que repintan en cada frame, verificándolo con una medición de FPS reproducible en Playwright.

## Por qué existe este spec

Frogger va a tirones tanto en el teléfono como en escritorio. Al revisar el código aparecen dos focos de costo por frame:

**En el motor (`components/games/frogger/engine.ts`)**, `draw()` rehace en cada frame trabajo que no cambia:

- `drawBackground()` redibuja entero el fondo estático: río con ondas (~32 `fillRect`), zonas seguras con puntos (~64), líneas de carretera, rejilla, seto y las 5 bocas (con `shadowBlur` en la skin `glow`).
- `paint()` aplica el estilo de la skin a cada entidad en cada frame:
  - `glow` usa `shadowBlur = 12` por entidad. Es el efecto canvas 2D más caro, sobre todo en GPU móviles.
  - `rounded` crea un `createLinearGradient` nuevo por entidad y aplica `clip()`.
  - `pixel` recorre la textura celda a celda (`pixelTexture`) con cientos de `fillRect`.
- `shade()` parsea el hex y arma un string `rgb(...)` en cada llamada, varias veces por entidad y por frame, lo que genera basura para el GC (pausas = tirones).
- En pausa, el loop sigue llamando a `draw()` 60 veces por segundo aunque la imagen no cambie.

**En el CSS del reproductor (`app/globals.css`)**, compartido por todos los juegos:

- `.av-bg::before` anima `background-position` (`gridscroll`) en bucle infinito. Esa propiedad no la resuelve el compositor, así que repinta una capa del tamaño del viewport en cada frame, compitiendo con el canvas.
- `.crt-screen::after` (scanlines) usa `mix-blend-mode: multiply` encima del canvas, lo que obliga a mezclar esa capa con el canvas en cada frame. Con un color negro semitransparente, `multiply` y la mezcla normal dan **exactamente el mismo resultado** (`(1−α)·C` en ambos casos), así que puede quitarse sin cambio visual.
- `.av-bg::after` (`mix-blend-mode: overlay`) y `.av-noise` (`feTurbulence`) son capas fijas de viewport completo que también participan en la composición.

Este spec optimiza a fondo solo Frogger. El arreglo del CSS vive en el reproductor, así que también beneficia a `asteroides`, `tetris`, `arkanoid` y `snake` sin tocar sus motores.

## Scope

**In:**

- **Herramienta de medición** `scripts/perf/measure-fps.js` (versionada, sin dependencias npm nuevas): función para `mcp__playwright__browser_run_code_unsafe` (recibe `page`) que:
  - fija la skin con `localStorage["av_skin:<id>"]` y recarga el reproductor `/juegos/<id>/jugar` servido por `npm run start`;
  - opcionalmente aplica throttling de CPU por CDP (`Emulation.setCPUThrottlingRate`, rate 4) y emulación táctil (`Emulation.setTouchEmulationEnabled`, para que `(pointer: coarse)` sea verdadero, la misma técnica que usa `mobile-porter`), con viewport 390×844 en el modo móvil;
  - espera 2 s de calentamiento y mide durante 10 s los intervalos entre `requestAnimationFrame` desde la página;
  - devuelve `{ game, skin, mode, avgFps, p95FrameMs, maxFrameMs, framesOver33ms }`.
- `scripts/perf/README.md` (en español): cómo levantar `npm run build && npm run start`, cómo invocar el script desde el MCP de Playwright, qué significan las métricas y los umbrales de este spec.
- **Medición base** (antes de tocar código) de Frogger en sus 4 skins × 2 modos (escritorio 1280×800 sin throttling; móvil 390×844 táctil con CPU 4×), y de los otros 4 juegos en su skin por defecto × 2 modos (solo informativa). Los resultados se anotan en la sección _Resultados de medición_ al final de este spec.
- **Frogger: fondo estático cacheado.** El motor renderiza el fondo estático (todo lo de `drawBackground()` excepto las ranas de las bocas ocupadas) una vez en un canvas offscreen por skin, y en cada frame lo copia con un solo `drawImage`. La caché se invalida en `setSkin()`. Las ranas de las bocas ocupadas se siguen dibujando encima en cada frame.
- **Frogger: sprites de entidades cacheados.** Cada forma de entidad (coche, camión, tronco de cada longitud, tortuga en cada fase visual: normal / aviso / sumergida) se pre-renderiza por skin en un canvas offscreen, con su halo `glow`, gradiente `rounded` o textura `pixel` ya aplicados, y se dibuja con `drawImage`. El sprite incluye un margen para el halo (≥ `shadowBlur`). La caché se invalida en `setSkin()` y se construye bajo demanda (no hace falta pre-generar todo al arrancar).
- **Frogger: posiciones enteras.** Las entidades se dibujan en `Math.round(x)` para que `drawImage` no interpole subpíxeles. La posición lógica (`col` fraccionaria) no cambia.
- **Frogger: `shade()` memoizado** con un `Map<string, string>` de módulo (clave `hex|amt`): ningún string de color se genera en el camino caliente después del primer frame con una skin.
- **Frogger: la rana y el HUD interno** (score, vidas, nivel, barra de tiempo) se siguen dibujando directo en cada frame: son pocos elementos y animados. Solo se ajusta lo necesario para que no creen gradientes, strings ni objetos nuevos por frame cuando pueda evitarse sin cambiar el aspecto.
- **Frogger: pausa sin redibujo continuo.** En `frogger-game.tsx`, mientras `paused` es verdadero, el loop sigue vivo pero solo llama a `engine.draw()` en el primer frame de la pausa y cuando cambia la skin; al reanudar vuelve a dibujar cada frame. El `dt` al reanudar sigue acotado por el `Math.min(..., 0.05)` existente.
- **Frogger: respaldo sin `OffscreenCanvas`.** El motor no accede a `window`/`document` (contrato de plataforma). Si `typeof OffscreenCanvas === "undefined"`, dibuja como hoy, sin caché.
- **Frogger: glow en móvil, solo si hace falta.** Si tras las cachés el modo móvil con skin `glow` no cumple el umbral, el motor expone `setLowFx(on: boolean)`. `frogger-game.tsx` lo activa con `useCoarsePointer()`, y en ese modo los sprites `glow` se generan sin `shadowBlur`, con un trazo doble semitransparente en su lugar. Si el umbral se cumple sin esto, **no se implementa** `setLowFx`.
- **CSS del reproductor, solo en `/jugar`**, con selectores acotados a la presencia del reproductor (`body:has(.av-player)`); el resto del sitio queda igual:
  - `.av-bg::before`: `animation: none` (el grid de perspectiva queda quieto detrás del reproductor);
  - `.crt-screen::after`: se quita `mix-blend-mode: multiply` (resultado idéntico, ver arriba);
  - `.av-bg::after` y `.av-noise`: se les quita el blend / se aplanan **solo si** la medición muestra que aportan costo y el cambio no se nota alrededor de la CRT. Si no aportan, no se tocan.
- **Medición final** con la misma matriz que la base, anotada en _Resultados de medición_.

**Out of scope (for future specs):**

- Optimizar los motores de `asteroides`, `tetris`, `arkanoid` y `snake` (su `shadowBlur`, gradientes, etc.). Solo reciben la mejora del CSS del reproductor, y su medición es informativa. Si alguno queda por debajo del umbral, va a un spec propio.
- Añadir recomendaciones de rendimiento a `.claude/skills/spec-juego/platform-contract.md`.
- Cambiar la jugabilidad de Frogger: velocidades, colisiones, puntuación, temporizador, timestep fijo o cualquier cambio de la velocidad efectiva.
- Cambiar el tamaño lógico del canvas (640×560) o escalarlo por `devicePixelRatio`.
- Optimizar el CSS del resto del sitio (Inicio, Biblioteca, etc.).
- Añadir `@playwright/test` u otra dependencia al proyecto, o un script `npm run perf`.
- Contador de FPS visible en el juego.

## Data model

No hay datos persistentes, tablas ni migraciones nuevos. Solo aparecen estructuras en memoria dentro del motor de Frogger:

```ts
// components/games/frogger/engine.ts

// Memo de colores derivados: evita parsear hex y crear strings en cada frame.
const shadeCache = new Map<string, string>(); // clave `${hex}|${amt}`

// Sprite pre-renderizado de una entidad para la skin activa.
interface Sprite {
  canvas: OffscreenCanvas;
  ox: number; // desplazamiento del origen dentro del sprite (margen del halo)
  oy: number;
}

// En FroggerEngine (privado):
//   bgLayer: OffscreenCanvas | null            — fondo estático de la skin activa
//   sprites: Map<string, Sprite>               — clave p. ej. `car|1|#ff3b6b`, `turtle|warn`, `log|3`
//   lowFx: boolean                             — solo si hace falta (ver Scope)
// setSkin() vacía bgLayer y sprites.
```

Resultado del script de medición:

```ts
interface FpsResult {
  game: string; // id del juego, p. ej. "frogger"
  skin: string; // id de skin, p. ej. "glow"
  mode: "desktop" | "mobile"; // mobile = 390×844, táctil, CPU 4×
  avgFps: number;
  p95FrameMs: number;
  maxFrameMs: number;
  framesOver33ms: number; // frames "perdidos" (tirones visibles)
}
```

> **Nota de implementación:** el modelo final difiere en detalles (claves de sprite sin color, `entityKeys`, sin `lowFx`, `frames` en el resultado). Ver _Hallazgos y soluciones aplicadas → Modelo de datos final_.

## Implementation plan

1. **Herramienta de medición.** Crear `scripts/perf/measure-fps.js` y `scripts/perf/README.md`. Validar el script contra `npm run start` en un juego cualquiera. El sistema queda igual; solo se añade la herramienta.
2. **Medición base.** Correr la matriz completa (Frogger 4 skins × 2 modos; los otros 4 juegos en skin por defecto × 2 modos) y anotarla en _Resultados de medición → Antes_. Tomar capturas de referencia de Frogger en cada skin (escritorio y 390×844), en pausa, para comparar después.
3. **CSS del reproductor.** Aplicar las reglas `body:has(.av-player)` para `.av-bg::before` y `.crt-screen::after`. Volver a medir Frogger en `retro` en ambos modos para aislar el efecto. Decidir con datos si `.av-bg::after` / `.av-noise` se tocan.
4. **`shade()` memoizado** en el motor de Frogger. El juego sigue funcionando igual.
5. **Fondo estático cacheado** (`bgLayer`, invalidación en `setSkin()`, respaldo sin `OffscreenCanvas`). Verificar las 4 skins contra las capturas de referencia.
6. **Sprites de entidades cacheados** (incluidas las fases de las tortugas y el margen del halo) y **posiciones enteras**. Verificar las 4 skins contra las capturas.
7. **Pausa sin redibujo continuo** en `frogger-game.tsx`. Verificar que cambiar de skin en pausa actualiza la imagen y que al reanudar el juego sigue sin saltos.
8. **Medición intermedia** de Frogger (4 skins × 2 modos). Si `glow` en móvil no cumple el umbral, implementar `setLowFx()` + `useCoarsePointer()` y volver a medir; si cumple, saltar este paso y anotarlo.
9. **Medición final** de la matriz completa → _Resultados de medición → Después_. Comparación visual final contra las capturas de referencia.
10. `npm run lint` y `npm run build` sin errores. Cambiar el estado de este spec a `Implemented`.

## Acceptance criteria

- [x] Existen `scripts/perf/measure-fps.js` y `scripts/perf/README.md`, y el script devuelve un `FpsResult` al ejecutarlo con el MCP de Playwright contra `npm run start`.
- [x] La sección _Resultados de medición_ de este spec tiene las tablas _Antes_ y _Después_ con la matriz completa (Frogger 4 skins × 2 modos, y los otros 4 juegos × 2 modos).
- [x] Frogger, en **cada una** de sus 4 skins y en **ambos** modos (escritorio sin throttling; móvil 390×844 táctil con CPU 4×): `avgFps ≥ 55` y `p95FrameMs < 20`.
- [x] Frogger, en cada skin y modo: `framesOver33ms` en la medición final ≤ 1 % de los frames medidos.
- [x] Comparando con las capturas de referencia, las 4 skins de Frogger no tienen diferencias visibles en escritorio. La única excepción permitida es el glow sin blur en móvil, y solo si se implementó `setLowFx()`.
- [x] La jugabilidad de Frogger no cambia: no hay diffs en velocidades, colisiones, puntuación, temporizador ni en `update()`, salvo refactors sin efecto funcional. Una partida manual en escritorio y en 390×844 táctil (saltar, subir a un tronco, llenar una boca, morir por coche y por agua, game over y modal "FIN DEL JUEGO") se comporta igual que antes.
- [x] Cambiar de skin durante la partida y durante la pausa actualiza la imagen al instante, sin reiniciar la partida.
- [x] `engine.ts` de Frogger no referencia `window` ni `document`, y funciona (sin caché) si `OffscreenCanvas` no existe.
- [x] En `/juegos/[id]/jugar`, `.av-bg::before` no tiene animación activa y `.crt-screen::after` no usa `mix-blend-mode` (verificable con `getComputedStyle`). En `/` y `/biblioteca` ambos siguen como antes.
- [x] `asteroides`, `tetris`, `arkanoid` y `snake` siguen jugándose y viéndose igual (salvo el grid de fondo quieto); sus FPS finales no son peores que los de base.
- [x] `npm run lint` y `npm run build` terminan sin errores.

## Decisions taken and discarded

- **Solo Frogger a fondo; los otros juegos, solo medición.** Así el spec queda acotado. Si la medición informativa muestra problemas en otro juego, va a su propio spec. Descartado: optimizar los 5 juegos aquí (demasiado grande).
- **El CSS del reproductor sí entra, pero solo en `/jugar`.** El costo es compartido y el arreglo es barato y afecta a todos los juegos. El resto del sitio conserva su fondo animado. Descartado: tocarlo en todo el sitio, o dejarlo fuera y optimizar solo el motor.
- **Grid de fondo quieto durante el juego.** Es un cambio visible _alrededor_ de la CRT, aceptado a cambio de no repintar el viewport en cada frame. El "look idéntico" aplica al contenido del juego.
- **Quitar `multiply` en las scanlines no cambia la imagen**: para negro semitransparente es matemáticamente igual a la mezcla normal.
- **Cachés en `OffscreenCanvas` dentro del motor**, con respaldo sin caché si no existe. Así se respeta el contrato de "motor sin `window`/`document`". Descartado: que el componente inyecte una fábrica de canvas (más API sin beneficio real).
- **Look idéntico en todas las skins.** El glow se pre-renderiza en sprites en lugar de quitarse. Solo si el móvil no llega al umbral se degrada el glow con `(pointer: coarse)`. Descartado: quitar el blur en móvil de entrada.
- **Sin cambios de jugabilidad ni timestep fijo.** El problema es de render; tocar el `dt` cambiaría la sensación del juego. El `Math.min(dt, 0.05)` actual se mantiene.
- **Verificación con Playwright + CDP (CPU 4×, táctil) y un script versionado sin dependencias.** Es reproducible y reutilizable para los otros juegos. Descartado: la prueba solo manual (no es verificable) y añadir `@playwright/test` (dependencia innecesaria si se usa el MCP).
- **Umbral: `avgFps ≥ 55`, `p95 < 20 ms`, ≤ 1 % de frames > 33 ms.** Da margen sobre 60 Hz y captura los tirones, no solo la media.
- **(Durante la implementación) `setLowFx()` no se implementó:** tras las cachés, `neon` (glow) en móvil ya cumple el umbral con el glow completo (ver _Paso 8_).
- **(Durante la implementación) ESLint ignora `references/**` y `.playwright-mcp/**`.** `npm run lint` ya fallaba en `main` por las plantillas y juegos vanilla de `references/`, que no forman parte de la app. Para que el criterio de lint sea verificable se añadieron a `globalIgnores` en `eslint.config.mjs`. Es un cambio fuera del alcance original, acordado al implementar.
- **(Durante la implementación) Parámetros del script por hash de URL.** El MCP de Playwright ejecuta cada llamada en un sandbox sin `process`, `URL` ni globales persistentes, así que `measure-fps.js` lee las corridas de `#perf=juego:skin:modo,...` en la página actual (ver `scripts/perf/README.md`). El resultado incluye además `frames`, para calcular el 1 %.

## Identified risks

- **El headless con throttling no es un teléfono real.** CPU 4× aproxima, pero no mide la GPU móvil ni el throttling térmico. Mitigación: tras la medición automática, hacer también una prueba manual en un teléfono real y anotarla en los resultados.
- **Sprites con halo recortado.** Si el margen del sprite es menor que el alcance del `shadowBlur`, el glow se corta. Mitigación: margen ≥ `shadowBlur` y comparar con las capturas de referencia.
- **Fases de las tortugas.** El parpadeo de aviso y la inmersión deben mapearse bien a sprites distintos. Si se cachea una sola fase, se pierde la señal de peligro, lo que afecta la jugabilidad percibida. Mitigación: verificarlo en la partida manual.
- **`:has()` en navegadores viejos.** Sin soporte, las reglas simplemente no aplican y el reproductor queda como hoy: degradación segura.
- **Memoria de las cachés.** Son pocos sprites por skin (decenas) de tamaño ≤ 160×60 px, y se liberan al cambiar de skin. Riesgo bajo.
- **Frecuencia de `requestAnimationFrame` en headless.** Si Chromium headless no sincroniza `requestAnimationFrame` a 60 Hz, las métricas absolutas pueden sesgarse. Mitigación: comparar siempre _Antes_ vs _Después_ en el mismo entorno y validar el script en el paso 1.

## Hallazgos y soluciones aplicadas

Registro de lo que se encontró al implementar y cómo se resolvió, como referencia para optimizar otros juegos o repetir la medición.

### Qué causaba los tirones (con datos)

| #   | Hallazgo                                                                                                                                                                             | Evidencia                                                                                                                               | Peso real                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **El costo dependía de la skin, no del juego.** `retro` (flat) ya iba a 60 FPS; las skins con efectos por entidad se hundían.                                                        | Base en escritorio: `retro` 60, `neon` 37,2, `pastel` 44,9 y `pixel` 41,9 FPS. En móvil, cifras casi iguales.                           | **Causa principal.** Sin los efectos de `paint()` por entidad no había problema. |
| 2   | **`shadowBlur` por entidad (`neon`/glow)** era lo más caro: unas 30 entidades con blur 12 en cada frame.                                                                             | `neon` era la peor skin en ambos modos: 53–59 % de frames > 33 ms.                                                                      | Alto                                                                             |
| 3   | **Gradiente + `clip()` por entidad (`pastel`/rounded)** y **textura celda a celda (`pixel`)**.                                                                                       | `pastel` 32–35 % y `pixel` 33–40 % de frames perdidos.                                                                                  | Alto                                                                             |
| 4   | **Grid de fondo animado (`gridscroll` en `.av-bg::before`)**: anima `background-position`, así que repinta una capa del tamaño del viewport en cada frame.                           | Solo con el CSS (paso 3): `neon` subió de unos 37 a unos 46 FPS en ambos modos, y `retro` en móvil pasó de 4 a 0 frames perdidos.       | Medio (unos 9 FPS), compartido por los 5 juegos                                  |
| 5   | **Scanlines con `mix-blend-mode: multiply`** sobre el canvas.                                                                                                                        | Con negro semitransparente da el mismo resultado que la mezcla normal: diferencia máxima de 2 niveles de color por redondeo, invisible. | Bajo, pero gratis de quitar                                                      |
| 6   | **`.av-bg::after` (overlay) y `.av-noise` (`feTurbulence`)**: sospechosos, pero **sin costo medible**.                                                                               | A/B en `neon`: 48,5 y 49,4 FPS con ellos frente a 50,7 y 49,8 sin ellos, dentro del ruido.                                              | Nulo; **no se tocaron**                                                          |
| 7   | **Redibujo en pausa**: el loop llamaba a `draw()` 60 veces por segundo con la imagen congelada.                                                                                      | 2.074 `drawImage`/s en pausa antes; 0 después.                                                                                          | Batería y calor, no FPS                                                          |
| 8   | **Basura por frame**: `shade()` parseaba el hex y creaba un string `rgb(...)` en cada llamada; el HUD creaba strings `SCORE n`/`NIVEL n` y la rana un gradiente nuevo en cada frame. | Por inspección del código.                                                                                                              | Bajo (menos pausas de GC)                                                        |
| 9   | Los otros 4 juegos (`asteroides`, `tetris`, `arkanoid`, `snake`) **ya iban a 60 FPS** en ambos modos.                                                                                | Tabla _Antes_.                                                                                                                          | No necesitan su propio spec por ahora                                            |

### Soluciones aplicadas

**`app/globals.css`** (solo en `/jugar`, con `body:has(.av-player)`):

- `.av-bg::before { animation: none; }`: el grid de perspectiva queda quieto detrás del reproductor. En el resto del sitio sigue animado.
- `.crt-screen::after { mix-blend-mode: normal; }`: el resultado es idéntico al de `multiply` para negro semitransparente, sin forzar la mezcla con el canvas.

**`components/games/frogger/engine.ts`:**

- **`shade()` memoizado:** `shadeCache: Map<string, string>` de módulo, clave `` `${hex}|${amt}` ``.
- **Fondo estático cacheado:**
  - `drawBackground()` se dividió en `drawStaticBackground()` (río, zonas seguras, carretera, rejilla, seto y bocas vacías) y `drawGoalFrogs()` (ranas de las bocas ocupadas, cada frame).
  - `getBgLayer()` pinta la parte estática una vez en un `OffscreenCanvas` (`bgLayer`), y en cada frame se copia con un solo `drawImage`.
- **`drawInto(target, fn)`:** redirige `this.ctx` a un contexto offscreen mientras dura `fn`. Así todas las rutinas de dibujo existentes pintan sin cambios en el canvas visible o en una caché. El tipo de `ctx` pasó a ser `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`, compatible con el componente.
- **Sprites de entidades:**
  - `drawCar`, `drawTruck`, `drawLog` y `drawTurtles` ahora reciben `(x, ancho, y, …)` en lugar de la entidad, y `drawEntityShape(e, lane, x, y)` despacha a la función de cada tipo.
  - `getSprite()` construye bajo demanda un `OffscreenCanvas` de `(ancho + 2·SPRITE_PAD) × (CELL + 2·SPRITE_PAD)` con la forma ya pintada: halo, gradiente o textura incluidos.
  - **`SPRITE_PAD = 20`:** el `shadowBlur` 12 se extiende más allá de 12 px (la gaussiana llega a unos 1,5 × blur); con 20 px el halo no se recorta.
  - **Claves sin color ni skin:** `car|dir|fila%3|ancho`, `truck|dir|ancho`, `log|ancho`, `turtle|ancho` y, en tortugas, `…|warn` o `…|sub`. La caché se vacía en `setSkin()`, así que la clave no necesita la skin.
  - **Claves precalculadas por entidad** en un `WeakMap<Entity, Record<TurtlePhase, string>>`, para no crear strings en cada frame. Al reconstruir los carriles (subida de nivel), las entidades viejas se liberan solas.
  - **`turtlePhase(e)`:** extrae sin cambios la lógica del parpadeo de aviso (`normal`, `warn`, `sub`), para que cada fase tenga su sprite y la señal de peligro se conserve.
  - **Posiciones enteras:** `ctx.drawImage(sprite.canvas, Math.round(x) - ox, y - oy)`. La `col` lógica sigue siendo fraccionaria.
- **Rana y HUD:**
  - el brillo `rounded` de la rana se crea una vez (`frogGloss`, con `FROG_BOX` constante en coordenadas locales), y `paint()` acepta un gradiente ya creado;
  - `SCORE` y `NIVEL` se regeneran solo cuando cambia el valor (`hudScore`/`hudScoreText`, `hudLevel`/`hudLevelText`).
- **Respaldo:** si `typeof OffscreenCanvas === "undefined"` (o `getContext` falla), `getBgLayer()`/`getSprite()` devuelven `null` y se dibuja directo, píxel a píxel igual que el original. El motor sigue sin tocar `window`/`document`.
- **`setSkin()`:** además de la skin, vacía `bgLayer` y `sprites`.

**`components/games/frogger/frogger-game.tsx`:**

- **Pausa:** el loop sigue vivo, pero en pausa solo llama a `engine.draw()` en el primer frame de la pausa (`wasPaused`) o si `redrawRef` está marcado.
- **Cambio de skin:** el efecto de la skin marca `redrawRef = true`.
- **`dt`:** `lastTime` se actualiza también en pausa, así que al reanudar el `dt` no salta (y sigue acotado a 0,05 s).

**`eslint.config.mjs`:** `references/**` y `.playwright-mcp/**` en `globalIgnores`, porque `npm run lint` ya fallaba en `main` por las plantillas de `references/`.

**`scripts/perf/measure-fps.js` y `README.md`:** herramienta de medición reutilizable para cualquier juego (ver su README).

**No se implementó `setLowFx()`:** con las cachés, `neon` en móvil llega a 60 FPS con el glow completo.

### Modelo de datos final

```ts
// components/games/frogger/engine.ts
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const shadeCache = new Map<string, string>(); // `${hex}|${amt}` → "rgb(r,g,b)"
interface Sprite {
  canvas: OffscreenCanvas;
  ox: number;
  oy: number;
} // ox = oy = SPRITE_PAD
const SPRITE_PAD = 20;
type TurtlePhase = "normal" | "warn" | "sub";
const FROG_BOX: Box = { x: -12, y: -14, w: 24, h: 28 };

// FroggerEngine (privado)
//   bgLayer: OffscreenCanvas | null
//   sprites: Map<string, Sprite>                       — p. ej. "car|1|0|1", "log|3", "turtle|2|warn"
//   entityKeys: WeakMap<Entity, Record<TurtlePhase, string>>
//   frogGloss: CanvasGradient | null
//   hudScore / hudScoreText, hudLevel / hudLevelText   — textos del HUD cacheados
```

`FpsResult` añade `frames: number` (frames medidos) para calcular el criterio del 1 %.

### Problemas encontrados durante la implementación (y cómo se resolvieron)

- **El MCP de Playwright ejecuta cada `browser_run_code_unsafe` en un sandbox aislado:** sin `process`, `URL`, `setTimeout` ni globales que persistan entre llamadas.
  - **Parámetros:** el script los lee del hash de la página actual (`browser_navigate` a `…/#perf=juego:skin:modo,...`), con una regex en lugar de `URL`.
  - **Esperas:** van dentro de `page.evaluate` (en la página sí hay timers).
- **Con `filename`, el MCP envuelve el archivo como `await (<archivo>)(page)`:** el archivo tiene que ser una sola expresión de función **sin `;` final**. Prettier lo añadiría (y el hook lo ejecuta), así que la función lleva `// prettier-ignore`, y `/* eslint-disable @typescript-eslint/no-unused-expressions */` para ESLint.
- **El MCP solo lee archivos dentro del repo** (o de `.playwright-mcp/`). Los scripts auxiliares temporales se pusieron en `.playwright-mcp/` y se borraron al terminar.
- **Llamadas largas:** el MCP corta las llamadas de alrededor de un minuto (el navegador se cierra con `Target page, context or browser has been closed`), así que se mide **como mucho 3 corridas por llamada**.
- **Llamadas colgadas:** una llamada colgada sigue ejecutándose en el servidor del MCP aunque se detenga desde el cliente, y encola todas las siguientes. Se resolvió con `/mcp` → `playwright` → _Reconnect_. Para no repetirlo, todo script auxiliar fija `page.setDefaultTimeout(15000)`, así que falla en vez de colgarse.
- **Capturas no deterministas:** entre cargas, la pausa cae en un instante distinto de la partida y las entidades salen desplazadas, lo que hace inútil un diff de píxeles.
  - **`page.clock` no sirvió:** `install()` deja correr el tiempo real, y con `pauseAt()` antes de cargar la hidratación no terminaba.
  - **`screenshot()` se cuelga con el rAF retenido:** espera un `requestAnimationFrame` real de la página.
  - **Solución:** un init script retiene `requestAnimationFrame` en una cola y expone `__avStep(n)`, que la avanza con timestamps fijos de 1/60 s. El canvas se lee con `toDataURL()` y esa imagen se captura en **otra pestaña**, con su rAF normal. Dos corridas dan 0 píxeles de diferencia.
- **Referencias del motor original:** se generaron copiando temporalmente `engine.ts` de `HEAD`, compilando y capturando, y restaurando después la versión nueva.
- **Diferencias esperadas al redondear posiciones:** un 1,4–2,8 % de píxeles cambia en los bordes de las entidades (desplazamiento ≤ 0,5 px). Para separarlo de un error real, se comparó el render con sprites contra el dibujo directo del mismo motor (respaldo sin `OffscreenCanvas`, idéntico al original) en frames con tortugas en aviso y sumergidas.
- **Validar jugabilidad sin partida manual:**
  - **Motores en paralelo:** el `engine.ts` original y el nuevo se compilaron con `typescript` (`transpileModule`) y se ejecutaron en Node con un contexto 2D simulado (un `Proxy` de no-ops), comparando el estado completo frame a frame.
  - **Agente con anticipación:** clona el motor y simula 45 frames antes de cada salto; cubre troncos y bocas.
  - **Replay en el navegador:** las secuencias que encontró el simulador (primera boca, muerte en el río) se reprodujeron en el navegador con `__avStep`, comprobando que la puntuación y el frame de la muerte coinciden.
- **Hook `eslint --fix` entre ediciones parciales:** al añadir `let wasPaused` en una edición y reasignarlo en la siguiente, el `--fix` intermedio lo convirtió en `const` y el build falló con `cannot reassign to a variable declared with const`. Lección: meter en una misma edición la declaración y su uso, o revisar el build tras ediciones encadenadas.
- **Finales de línea:** los archivos escritos con Python en Windows salían con CRLF y Prettier los marcaba; se normalizaron con `prettier --write`.
- **Nombres de skin:** el spec habla de la skin `glow`, pero los ids son `retro` (flat), `neon` (glow), `pastel` (rounded) y `pixel` (pixel). Las tablas usan los ids.
- **Puerto:** con `next dev` en el 3000, las mediciones se hicieron con `npx next start -p 3100`. `measure-fps.js` toma el origen de la URL de `#perf=`.
- **`.playwright-mcp/`:** el MCP lo crea en la raíz del repo (logs y snapshots) y **no está en `.gitignore`**. Hay que borrarlo o ignorarlo antes de cada commit.

### Receta reutilizable para otros juegos

1. **Medir primero:** `npm run build && npx next start -p 3100`, y `measure-fps.js` con cada skin en escritorio y móvil. Si solo algunas skins caen, el costo está en los efectos por entidad (`shadowBlur`, gradientes, texturas), no en la lógica.
2. **Fondo estático** en una capa `OffscreenCanvas` por skin: un solo `drawImage` por frame. Lo dinámico que va encima (aquí, las ranas en las bocas) se dibuja aparte.
3. **Un sprite por forma y fase visual,** con margen ≥ 1,5 × `shadowBlur`, claves precalculadas por entidad (`WeakMap`) y caché vaciada en `setSkin()`.
4. **Posiciones enteras** al hacer `drawImage` de sprites (la posición lógica no cambia).
5. **Sin objetos nuevos en el camino caliente:** colores memoizados, gradientes constantes creados una vez y textos del HUD solo al cambiar el valor.
6. **Sin redibujo en pausa,** salvo el primer frame y los cambios de skin.
7. **Respaldo sin `OffscreenCanvas`** que dibuja como antes. Sirve además como referencia exacta para los diffs de píxeles.
8. **Verificar:** capturas deterministas (rAF manual + `toDataURL`) contra el motor original, y motores en paralelo en Node para demostrar que la jugabilidad no cambió.

## Resultados de medición

_Se completa durante la implementación (pasos 2, 8 y 9)._

Entorno: Chromium del MCP de Playwright en Windows 11, `next start` (build de producción), `scripts/perf/measure-fps.js` (2 s de calentamiento + 10 s de medición). Escritorio = 1280×800 sin throttling; móvil = 390×844 táctil con CPU 4×. Las skins de Frogger son `retro` (flat), `neon` (glow), `pastel` (rounded) y `pixel` (pixel). Entre paréntesis, frames > 33 ms / frames medidos.

### Antes

| Juego      | Skin   | Modo       | avgFps | p95 (ms) | max (ms) | frames > 33 ms |
| ---------- | ------ | ---------- | ------ | -------- | -------- | -------------- |
| frogger    | retro  | escritorio | 60,0   | 16,9     | 17,6     | 0 (0/600)      |
| frogger    | neon   | escritorio | 37,2   | 50,0     | 83,1     | 195 (195/371)  |
| frogger    | pastel | escritorio | 44,9   | 33,4     | 50,1     | 142 (142/449)  |
| frogger    | pixel  | escritorio | 41,9   | 33,5     | 50,1     | 168 (168/418)  |
| frogger    | retro  | móvil      | 59,6   | 16,8     | 33,4     | 4 (4/596)      |
| frogger    | neon   | móvil      | 36,0   | 50,0     | 50,1     | 212 (212/361)  |
| frogger    | pastel | móvil      | 43,8   | 33,5     | 50,0     | 152 (152/438)  |
| frogger    | pixel  | móvil      | 44,2   | 33,4     | 50,1     | 146 (146/442)  |
| asteroides | retro  | escritorio | 60,0   | 16,9     | 17,2     | 0 (0/600)      |
| tetris     | retro  | escritorio | 60,0   | 16,8     | 17,3     | 0 (0/600)      |
| arkanoid   | retro  | escritorio | 60,0   | 16,9     | 17,6     | 0 (0/600)      |
| snake      | retro  | escritorio | 60,0   | 16,9     | 17,3     | 0 (0/600)      |
| asteroides | retro  | móvil      | 60,0   | 16,8     | 17,4     | 0 (0/600)      |
| tetris     | retro  | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |
| arkanoid   | retro  | móvil      | 59,9   | 16,8     | 33,2     | 1 (1/599)      |
| snake      | retro  | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |

Una corrida previa de validación (paso 1) de `frogger/retro/escritorio` dio 53,9 FPS con un único pico de 929 ms (1/539). Se trata como ruido de carga, porque no se repitió.

Capturas de referencia (en pausa, sin overlay de pausa, sin scanlines ni nav, 1,5 s tras cargar): las 4 skins × escritorio y 390×844. Se guardan fuera del repo, en el scratchpad de la sesión.

### Paso 3 — solo CSS del reproductor

Con las reglas `body:has(.av-player)` (grid quieto y scanlines sin `multiply`), sin cambios en el motor:

| Juego   | Skin  | Modo       | avgFps | p95 (ms) | max (ms) | frames > 33 ms |
| ------- | ----- | ---------- | ------ | -------- | -------- | -------------- |
| frogger | retro | escritorio | 60,0   | 16,9     | 17,0     | 0 (0/600)      |
| frogger | retro | móvil      | 60,0   | 16,8     | 17,8     | 0 (0/600)      |
| frogger | neon  | escritorio | 46,2   | 33,4     | 50,0     | 132 (132/462)  |
| frogger | neon  | móvil      | 45,5   | 33,4     | 166,5    | 121 (121/454)  |

**`.av-bg::after` y `.av-noise`: no se tocan.** Prueba A/B en `neon`/escritorio (estilo inyectado solo en la prueba: `.av-bg::after` con mezcla normal y `.av-noise` oculto), dos corridas de cada variante:

- con los efectos actuales: 48,5 y 49,4 FPS (91 y 77 frames > 33 ms);
- sin ellos: 50,7 y 49,8 FPS (72 y 78 frames > 33 ms).

La diferencia está dentro del ruido.

### Paso 8 — medición intermedia de Frogger

Con los pasos 3–7 (CSS del reproductor, `shade()` memoizado, fondo y sprites cacheados, posiciones enteras y pausa sin redibujo):

| Juego   | Skin   | Modo       | avgFps | p95 (ms) | max (ms) | frames > 33 ms |
| ------- | ------ | ---------- | ------ | -------- | -------- | -------------- |
| frogger | retro  | escritorio | 60,0   | 16,9     | 17,2     | 0 (0/600)      |
| frogger | neon   | escritorio | 60,0   | 16,9     | 17,4     | 0 (0/600)      |
| frogger | pastel | escritorio | 60,0   | 16,9     | 21,9     | 0 (0/600)      |
| frogger | pixel  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| frogger | retro  | móvil      | 60,0   | 16,8     | 17,0     | 0 (0/600)      |
| frogger | neon   | móvil      | 60,0   | 16,8     | 17,3     | 0 (0/600)      |
| frogger | pastel | móvil      | 59,9   | 16,8     | 33,4     | 1 (1/599)      |
| frogger | pixel  | móvil      | 59,9   | 16,8     | 33,2     | 1 (1/599)      |

**`setLowFx()` no se implementa:** `neon` (glow) en móvil cumple el umbral sin degradar el glow (60 FPS, p95 16,8 ms, 0 frames > 33 ms).

### Después

Build final (pasos 3–7; sin `setLowFx()`), mismo entorno y script que _Antes_.

| Juego      | Skin   | Modo       | avgFps | p95 (ms) | max (ms) | frames > 33 ms |
| ---------- | ------ | ---------- | ------ | -------- | -------- | -------------- |
| frogger    | retro  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| frogger    | neon   | escritorio | 60,0   | 16,9     | 17,5     | 0 (0/600)      |
| frogger    | pastel | escritorio | 59,9   | 16,9     | 33,2     | 1 (1/599)      |
| frogger    | pixel  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| frogger    | retro  | móvil      | 60,0   | 16,8     | 17,0     | 0 (0/600)      |
| frogger    | neon   | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |
| frogger    | pastel | móvil      | 59,9   | 16,8     | 33,2     | 1 (1/599)      |
| frogger    | pixel  | móvil      | 60,0   | 16,8     | 17,1     | 0 (0/600)      |
| asteroides | retro  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| tetris     | retro  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| arkanoid   | retro  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| snake      | retro  | escritorio | 60,0   | 16,9     | 17,1     | 0 (0/600)      |
| asteroides | retro  | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |
| tetris     | retro  | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |
| arkanoid   | retro  | móvil      | 60,0   | 16,8     | 17,1     | 0 (0/600)      |
| snake      | retro  | móvil      | 60,0   | 16,8     | 16,9     | 0 (0/600)      |

Frogger cumple el umbral en las 4 skins y ambos modos: `avgFps ≥ 59,9`, `p95 ≤ 16,9 ms` y como mucho 1 frame > 33 ms de 599 (0,17 %). Los otros 4 juegos quedan iguales o mejor que en _Antes_.

**Comparación visual.** Para comparar el contenido del canvas (640×560) sin depender del tiempo de carga, se capturó en modo determinista: `requestAnimationFrame` retenido y avanzado 90 frames de 1/60 s, y lectura con `toDataURL()`. Así la escena es la misma en cada corrida (0 píxeles de diferencia entre dos corridas). Las referencias se tomaron con el `engine.ts` original (`HEAD`).

- Paso 5 (fondo cacheado) y el respaldo sin `OffscreenCanvas`: **idénticos píxel a píxel** al original en las 4 skins.
- Final (sprites + posiciones enteras): cambia el 1,4–2,8 % de los píxeles, solo en los bordes de las entidades (y en `pixel` también en las celdas de su textura). Es el desplazamiento de ≤ 0,5 px por `Math.round(x)`. No hay halos recortados ni cambios de color o forma. Las fases de las tortugas (a flote, aviso y sumergida) coinciden con el dibujo directo en el frame 150.

### Verificación de los criterios de aceptación

- **Jugabilidad (estático):** el diff de `engine.ts` no toca `update()`, `moveLanes`, `rideRiver`, `land`, las colisiones, la puntuación, el temporizador ni las constantes de velocidad. Solo cambia el código de dibujo y sus cachés.
- **Jugabilidad (dinámico):** se compiló con `typescript` el `engine.ts` original (`HEAD`) y el actual, y ambos se ejecutaron sin navegador con las mismas entradas y el mismo `dt`, comparando frame a frame todo el estado de juego (score, vidas, nivel, estado, carriles, rana, bocas, tiempo). **0 diferencias** en:
  - 240.000 frames aleatorios: 3.444 muertes en carretera, 200 en el río, 1.193 game over, 458 cambios de skin; `dt` de 1/60, irregular y acotado a 0,05.
  - 120.000 frames de un agente con anticipación: 116 bocas llenadas y 71.684 frames sobre troncos o tortugas.
  - 120.000 frames con rondas aceleradas: 104 rondas completadas, hasta el nivel 5.
- **Partida en el navegador** (build de producción, rAF avanzado a mano para reproducir las secuencias del simulador), en escritorio con teclado y en 390×844 táctil con los botones de `.touch-console`:
  - saltos y subida a troncos o tortugas;
  - boca llenada (280 puntos, igual que el simulador), con la rana dibujada en la boca ocupada;
  - muerte por coche (♥♥♥ → ♥♥);
  - muerte por agua en el frame exacto que predice el simulador (♥♥♥ → ♥♥);
  - game over con el modal "FIN DEL JUEGO".
- **Skin en partida y en pausa:** en pausa, 0 `drawImage` por segundo. Al cambiar de skin en pausa se redibuja un solo frame con la nueva skin, sin reanudar ni reiniciar; jugando también cambia al instante (paso 7).
- **Sin `window`/`document` y respaldo:** `engine.ts` solo los menciona en comentarios. Sin `OffscreenCanvas`, el render es idéntico píxel a píxel al original.
- **CSS:** en `/juegos/[id]/jugar` (Frogger y los otros 4 juegos), `animation-name: none` y `mix-blend-mode: normal`. En `/` y `/biblioteca`, `gridscroll` sigue activo.
- **Otros juegos:** sus motores no aparecen en el diff. Cargan y dibujan sin errores de consola, y sus FPS finales son iguales o mejores que los de base.
- **Lint y build:** `npm run lint` y `npm run build` terminan sin errores (con `references/**` ignorado, ver _Decisiones_).

Queda como recomendación (mitigación del riesgo _headless ≠ teléfono_, no criterio): probar Frogger en un teléfono real.
