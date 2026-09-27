# Juegos revisados por rendimiento

Registro de juegos de Arcade Vault revisados y optimizados según SPEC 13 (`specs/13-rendimiento-frogger.md`). Lo mantiene el subagente `game-performance-booster`. `frogger` fue optimizado por el propio SPEC 13 y no se lista aquí salvo que se audite de nuevo.

Umbrales (cada skin, escritorio 1280×800 y móvil 390×844 táctil con CPU 4×): `avgFps ≥ 55`, `p95FrameMs < 20`, `framesOver33ms ≤ 1 %`.

## arkanoid — Arkanoid

- **Fecha:** 2026-09-26
- **Checklist SPEC 13:** `1 ❌→✅` (shadowBlur en ~105 ladrillos, pala, borde y HUD en `neon`; queda solo el de la bola y los destellos) · `3 ❌→✅` (textura pixel celda a celda por ladrillo y en la pala) · `4 ❌→✅` (fondo, campo, rejilla y borde redibujados en cada frame) · `5 ❌→✅` (`shade()` sin memo, con regex) · `6 ❌→✅` (strings del HUD y de la fuente en cada frame; el `filter` de `updateBreakFlashes` es lógica de juego y no se tocó) · `7 ❌→✅` (redibujo en pausa); el resto ✅ (2: sin gradientes ni `clip()`; 8: posiciones de sprites siempre enteras; 9: `dt` acotado a 0,05 y `lastTime` avanzando en pausa; 10: sin `window`/`document`, con respaldo; 11: CSS compartido intacto, sin CSS propio que anime).
- **FPS antes → después** (medido con 4 instancias compitiendo por la CPU/GPU; en la base hasta `retro` caía a 53 FPS, así que la base está degradada por el entorno):
  - `retro` escritorio: 53,5 / p95 33,4 / 56 de 535 → 60,0 / 16,8 / 0 de 593
  - `neon` escritorio: 44,5 / 33,4 / 99 de 445 → 59,9 / 16,8 / 1 de 599
  - `pastel` escritorio: 48,0 / 33,6 / 53 de 486 → 60,0 / 16,9 / 0 de 600
  - `pixel` escritorio: 47,8 / 33,5 / 97 de 478 → 59,1 / 16,9 / 5 de 591 (0,85 %)
  - `retro` móvil: 33,2 / 33,5 / 27 de 322 (pausa de 1,4 s por el entorno) → 59,6 / 16,8 / 3 de 596
  - `neon` móvil: 43,1 / 33,4 / 110 de 431 → 56,6 / 18,1 / 0 de 566 (repetido: 56,5 / 18,2 / 0 de 565; una primera corrida dio 53,4 con un pico aislado de 915 ms)
  - `pastel` móvil: sin medir en la base (el entorno no lo permitió) → 60,0 / 16,8 / 0 de 600
  - `pixel` móvil: sin medir en la base → 59,8 / 16,8 / 2 de 598
- **Optimizaciones:** `shade()` memoizado (`shadeCache`); fondo estático (canvas, campo, rejilla y borde con halo) en un `OffscreenCanvas` por skin; un sprite por ladrillo según color lógico (en `pixel`, 5 variantes según `semilla % 5`, con clave precalculada en un `WeakMap`), pintado en sus coordenadas reales para conservar la textura; sprite de la pala por ancho (en `pixel`, también por `x % 20`); en `retro` los ladrillos siguen con `fillRect`; textos y fuente del HUD cacheados; `drawInto()`; `setSkin()` vacía las cachés; respaldo sin `OffscreenCanvas`; sin redibujo en pausa (`wasPaused`/`redrawRef`). La bola, los destellos y el overlay de nivel se dibujan directo (posición fraccionaria / alpha por operación). No hizo falta `setLowFx`.
- **Verificación:** aspecto ✅ (rAF manual + `toDataURL`, 6 frames × 4 skins contra el motor de `HEAD`: `retro`, `neon` y `pixel` idénticos píxel a píxel; `pastel` difiere en unos 200 px por 1 nivel de color, por redondeo de la composición; respaldo sin `OffscreenCanvas` idéntico en las 4). Una capa offscreen para el texto del HUD se descartó porque el texto salía con otro espaciado. Jugabilidad ✅ (motores original y nuevo en Node en paralelo: 450.000 frames entre aleatorio, agente y rondas aceleradas hasta el nivel 4, con y sin `OffscreenCanvas` simulado, 0 diferencias). Pausa ✅ (0 `drawImage`/`fillRect`/`fillText` por segundo; cambiar de skin en pausa dibuja un solo frame; se reanuda sin errores). Lint/build ✅.
- **Pendiente:** `neon` en móvil es la más justa (≈56,5 FPS, p95 ≈18 ms): conviene repetir la medición sin otras cargas y probar en un teléfono real. Si no llega, el siguiente paso es cachear el halo de la bola (implica redondear su posición).
- **Archivos:** `components/games/arkanoid/engine.ts`, `components/games/arkanoid/arkanoid-game.tsx`.

## asteroides — Asteroides

- **Fecha:** 2026-09-26
- **Checklist SPEC 13:** `3 ❌→✅` (textura pixel celda a celda: sigue siendo por frame, pero en un solo `drawImage`) · `4 ❌→✅` · `5 ❌→✅` · `6 ❌→✅` · `7 ❌→✅`. Siguen en ❌, sin costo medible y dejados a propósito: `1` (`shadowBlur` por entidad en `neon`: 14 en rocas/nave, 10 en balas, 6 en partículas, 8 en el HUD) y `2` (`clip()` por roca en `pastel`). El resto ✅ (8 no aplica: no había `drawImage` de sprites).
- **Costo de JS por frame** (medida determinista: rAF retenido, 300 frames, `BrowserContext` propio; media / p95 en ms), original → nuevo:
  - CPU 1×: `retro` 0,07/0,2 → 0,13/0,5 · `neon` 0,19/0,2 → 0,07/0,2 · `pastel` 0,30/0,6 → 0,12/0,3 · `pixel` **3,86/7,7 → 0,34/0,7**
  - CPU 4×: `retro` 1,57/8,2 → 1,33/6,2 · `neon` 2,01/6,9 → 0,85/4,1 · `pastel` 1,94/7,8 → 1,71/5,6 · `pixel` **17,89/30,4 → 2,97/9,5** (el original superaba el presupuesto de 16,7 ms por frame)
- **FPS antes → después** (`measure-fps.js`, `avgFps` / `p95` / frames > 33 ms). Las otras 3 instancias del agente medían en paralelo, así que hay mucho ruido; se da la mejor corrida después y el rango observado:
  - `retro` escritorio: 60,0 / 16,8 / 0 → 60,0 / 16,8 / 0
  - `neon` escritorio: 60,0 / 16,8 / 0 → 60,0 / 16,8 / 0 (51,5–60 con contención)
  - `pastel` escritorio: 60,0 / 16,8 / 0 → 60,0 / 16,8 / 0 (54–60 con contención)
  - `pixel` escritorio: **46,7 / 33,6 / 116 de 467** (entre 16 y 51 FPS en 4 corridas) → 60,0 / 16,9 / 0 de 600 (47,5–60 con contención)
  - `retro` móvil: 60,0 / 16,8 / 0 → 60,0 / 16,8 / 0
  - `neon` móvil: 59,8 / 16,8 / 2 de 598 → 59,7 / 16,8 / 1 de 597
  - `pastel` móvil: 59,9 / 16,8 / 1 de 599 → 59,8 / 16,8 / 2 de 598
  - `pixel` móvil: **31,7 / 33,5 / 118 de 334** (entre 2,6 y 38,4 FPS en 4 corridas) → 59,8 / 16,8 / 2 de 598
- **Optimizaciones:**
  - `pixel`: la rasterización de rocas y nave no se puede cachear como sprite (depende de la rotación y de una rejilla alineada al mundo). Las celdas se escriben a 1 px por celda en un `ImageData` reutilizado y se copian con un solo `drawImage` escalado ×celda, sin suavizado. Antes eran unos 250 `fillRect` por cuerpo. La máscara y los tonos usan buffers reutilizados. Agruparlas primero en un `rect()` por tono no aportó una mejora medible, así que queda solo como respaldo sin `OffscreenCanvas`.
  - Fondo estático (color y estrellas) en un `OffscreenCanvas` por skin, copiado con un `drawImage` por frame, usando `drawInto()` como en Frogger.
  - Además: `shade()` memoizado, `maxRadius()` cacheado por silueta, textos del HUD cacheados y bucles indexados en `draw()`.
  - `setSkin()` vacía la capa del fondo.
  - En pausa no se redibuja (`wasPaused`/`redrawRef`), salvo el primer frame y al cambiar de skin.
  - No se cachearon sprites con halo en `neon`: el coste medido ya era bajo. `setLowFx` no hizo falta.
- **Verificación:** aspecto ✅ · jugabilidad ✅ · pausa ✅ · lint/build ✅
  - **Aspecto:** capturas deterministas (rAF retenido, `Math.random` sembrado, teclas simuladas; 6 frames × 4 skins) con 0 píxeles de diferencia frente al motor de `HEAD`, con y sin `OffscreenCanvas`. Las posiciones no se redondean: no hacía falta.
  - **Jugabilidad:** motores original y nuevo en Node con contexto simulado, 4 skins × dt fijo e irregular × 6000 frames, entradas pseudoaleatorias y un bot que llega al nivel 3 con muertes; 0 diferencias.
  - **Pausa:** 0 llamadas de dibujo en 60 frames de pausa; un solo redibujo al cambiar de skin en pausa, que sigue pausado; sin errores en consola.
- **Pendiente:** confirmar en un teléfono real (el headless con CPU 4× no mide la GPU móvil ni el throttling térmico). Repetir la matriz de FPS con el equipo sin otras mediciones en paralelo.
- **Archivos:** `components/games/asteroids/engine.ts`, `components/games/asteroids/asteroids-game.tsx`

## snake — Snake

- **Fecha:** 2026-09-26
- **Checklist SPEC 13:** `1 ❌→✅ · 3 ❌→✅ · 4 ❌→✅ · 5 ❌→✅ · 6 ❌→✅ · 7 ❌→✅`; 2, 8, 9, 10 y 11 ya en ✅. El `shadowBlur` del texto del HUD en `neon` (2 `fillText` por frame) se mantiene directo: cachearlo en `OffscreenCanvas` cambiaba el rasterizado del texto.
- **Medición:** la matriz estándar (`measure-fps.js`) mide casi solo la serpiente inicial de 3 segmentos, que choca con la pared en ~1,5 s y deja el modal de fin de juego. Por eso se añadió un **estrés de 150 segmentos**: la serpiente se alarga y se congela desde el motor, alcanzado por la fibra de React, sin cambiar el código. Se midió en paralelo con otras 3 instancias en el mismo equipo y con el navegador del MCP compartido, así que las cifras absolutas tienen ruido. La comparación fiable es el **banco A/M/B alternado** en un `BrowserContext` propio: A = motor original, M = sin sprites, B = final; 2 × 3 s por variante; serpiente de 150 segmentos; 1280×800 sin límite de CPU y 390×844 con CPU 4×.
- **FPS antes → después (banco, 150 segmentos; avgFps · p95 · frames > 33 ms):**
  - neon escritorio: 29,4 · 50,0 ms · 135/175 → **60,0 · 16,8 ms · 0/360**
  - neon móvil: 28,9 · 50,0 ms · 147/173 → **57,2 · 16,8 ms · 13/344** (3,8 %, un pico aislado de 100 ms; en el reproductor real, 59,9 · 16,8 ms · 1/599)
  - pixel escritorio: 49,1 · 33,4 ms · 51/295 → 55,4 · 33,4 ms · 27/332 (`draw()` de 0,92 a 0,82 ms: los frames perdidos son del entorno compartido)
  - pixel móvil: 59,2 · 16,8 ms · 5/355 → 59,9 · 16,8 ms · 1/359 (`draw()` de 5,8 a 4,1 ms de media)
  - pastel escritorio / móvil: 57,5 / 58,0 → 58,9 / 59,2 (sin sprites: se dibuja directo igual que antes)
  - retro escritorio / móvil: 59,5 / 59,0 → 60,0 / 60,0 (sin sprites)
- **FPS en el reproductor real, después (contexto propio):**
  - estrés de 150 segmentos: retro 54,4 / 60,0 · neon 56,5 / 59,9 · pastel 47,4 / 57,6 · pixel 57,5 / 60,0 (escritorio / móvil).
  - matriz estándar: retro 59,4 / 47,6 · neon 57,0 / 41,1 · pastel 53,5 / 49,0 · pixel 57,8 / 59,2.
  - Los frames perdidos en escritorio son de 33 ms justos (un vsync). Aparecen también en skins cuyo camino de dibujo quedó casi igual (retro, pastel) y con `draw()` ≈ 1 ms, así que son contención de CPU/compositor por las 4 instancias en paralelo. Hay que repetir la medición con el equipo libre.
- **Antes, en el reproductor real (pestaña compartida, sesgado):** matriz estándar retro/neon/pastel escritorio 59,9/59,8/59,9 y retro/pastel/neon móvil 59,8–60. Estrés de 150: neon 18,5 (escritorio) y 20,1 (móvil), retro 42,4/48,2, pastel 41,0/46,0, pixel 35,1/46,3. Se midió en pestañas del contexto compartido: `requestAnimationFrame` solo corre en la pestaña al frente y las otras instancias le quitaban el foco, así que algunas corridas salieron inválidas (p. ej. pixel 0,2 FPS).
- **Optimizaciones:**
  - `shade()` memoizado (`shadeCache`).
  - Fondo y grilla en un `OffscreenCanvas` por skin (`getBgLayer()` + `drawInto()`).
  - Un sprite por color de segmento y otro para el plato de la fruta, con margen de 32 px, **solo en `glow` y `pixel`**. En `flat`/`rounded`, copiar el sprite no aportaba (el banco lo mostró) y se dibuja directo.
  - Posiciones enteras (celdas × 40, sin cambio).
  - Textos del HUD cacheados y sin array por frame en `drawEyes()`.
  - Sin redibujo en pausa (`wasPaused`/`redrawRef` en `snake-game.tsx`).
  - `setSkin()` vacía las cachés y hay respaldo sin `OffscreenCanvas`.
  - Aporte medido: M (memo + fondo + HUD) ≈ +3–5 FPS en neon; los sprites de glow, el resto (+25 FPS). No hizo falta `setLowFx()`.
- **Verificación:**
  - Aspecto ✅, con capturas deterministas (rAF retenido, `Math.random` sembrado, 3 escenas por skin) contra el build de `HEAD`: retro y pastel idénticos; neon con ≤ 3 niveles de color de diferencia; pixel con ≤ 0,06 % de píxeles distintos. El respaldo sin `OffscreenCanvas` es idéntico píxel a píxel en las 4 skins.
  - Jugabilidad ✅: motor original y nuevo en paralelo en Node, 1.120.000 frames (aleatorio, `dt` fijo, irregular y acotado, agente que come hasta 52 segmentos y nivel 10, cambios de skin), con y sin `OffscreenCanvas`, **0 diferencias**.
  - Pausa ✅: 0 `drawImage`/`fillRect` por segundo en pausa; cambiar de skin en pausa redibuja un frame sin reanudar; sin errores de consola.
  - Lint y build ✅.
- **Pendiente:**
  - Repetir la matriz con el equipo libre, sin otras instancias midiendo: las cifras absolutas de _Después_ están sesgadas por contención.
  - Probar en un teléfono real (GPU móvil, throttling térmico).
  - Recomendación para un spec aparte: `measure-fps.js` debería medir en un `BrowserContext` propio y con una partida viva (la de snake muere en ~1,5 s y la ventana mide el modal).
- **Archivos:** `components/games/snake/engine.ts`, `components/games/snake/snake-game.tsx`.

## tetris — Tetris

- **Fecha:** 2026-09-26
- **Checklist SPEC 13:** `6 ❌→✅ · 7 ❌→✅ · 4 ❌ (se deja: no hace falta)`; el resto ✅ (sin `shadowBlur`, gradientes ni texturas; sin colores derivados; sin `drawImage`; `dt` acotado a 0,05 s y `lastTime` al día en pausa; motor sin `window`/`document`; sin CSS propio). Tetris no tiene skins: se mide solo `retro`.
- **FPS antes → después** (avgFps · p95 · frames > 33 ms):
  - `retro` escritorio: 60,0 · 16,8 ms · 0/600 → 59,6 · 16,8 ms · 2/596 (0,34 %)
  - `retro` móvil: 59,9 · 16,8 ms · 1/599 → 60,0 · 16,8 ms · 0/600
  - Ya cumplía antes. Las mediciones se hicieron con otras 3 instancias midiendo y compilando en el mismo equipo y navegador: en los picos de carga, tanto `HEAD` como la versión nueva caían por igual (p. ej. `HEAD` 45,8 FPS en escritorio y 16,4 en móvil), mientras que una página vacía seguía a 60. Las cifras finales son de un momento de carga baja.
- **Optimizaciones:** solo los arreglos baratos de la receta:
  - pausa sin redibujo continuo en `tetris-game.tsx` (`wasPaused` / `redrawRef`); `restart()` y `forceGameOver()` piden un frame para que la imagen quede al día bajo el modal;
  - textos del panel (`SCORE` con `toLocaleString()`, `LINES`, `LEVEL`, `xN` del combo) regenerados solo al cambiar el valor;
  - el closure `stat` creado en cada frame pasa a ser el método `drawStat()`;
  - los destellos vencidos se descartan en el mismo array en lugar de crear uno nuevo con `filter()` cada frame.
  - No se cacheó el fondo del tablero (relleno + 28 líneas de rejilla) ni se crearon sprites: con estilo plano no hace falta.
- **Verificación:** aspecto ✅ (capturas deterministas con rAF retenido y `Math.random` sembrado: hash de `toDataURL()` idéntico al original en los 5 puntos de control, incluido el frame tras reanudar) · jugabilidad ✅ (motor original y nuevo en Node con contexto 2D simulado: 240.000 frames, `dt` fijo e irregular, con power-ups, destellos, combos y niveles hasta 7; 0 diferencias de estado y 0 diferencias en la traza de llamadas al contexto) · pausa ✅ (0 `fillRect`/`fillText`/`stroke` en 60 frames pausados, antes 4.500/540/1.740; FIN en pausa redibuja un solo frame; sin errores de consola) · lint/build ✅.
- **Pendiente:** (opcional) cachear el fondo del tablero en un `OffscreenCanvas` si en un teléfono real aparecen tirones. Probar en un teléfono real.
- **Archivos:** `components/games/tetris/engine.ts`, `components/games/tetris/tetris-game.tsx`
