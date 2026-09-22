# SPEC 05 — Primer juego real: Asteroides

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-21
> **Objective:** Portar el juego Asteroids ya creado en `references/started-games/02-asteroids/` a un componente React real que se juega en `/juegos/asteroides/jugar`, agregando su tarjeta al catálogo e integrando ese juego con el HUD, la pausa, el game over, el guardado de puntaje y controles táctiles que ya existen en la plataforma.

## Por qué existe este spec

Los specs 01–04 dejaron las 5 pantallas y la plomería de Supabase listas, pero el Reproductor (`/juegos/[id]/jugar`) sigue siendo una simulación falsa para los 8 juegos del catálogo: el puntaje sube solo por temporizador y no hay lógica real de ningún juego. `references/started-games/02-asteroids/` ya trae un clon jugable de Asteroids en HTML5 Canvas + JS vanilla, sin dependencias. Este spec es el primero en conectar un juego de verdad a la plataforma, y por lo tanto define el patrón (ubicación del código, forma de exponer score/vidas/nivel/game-over al HUD del reproductor, soporte táctil) que los próximos 7 juegos deberían seguir.

El juego real se agrega como una tarjeta **nueva** del catálogo, `ASTEROIDES` (id `asteroides`), y no reutiliza la tarjeta `ROCAS` ya existente en `lib/data.ts` (que tenía una descripción parecida pero era solo un placeholder mock): `ROCAS` se elimina del catálogo en este spec.

## Scope

**In:**

- Agregar la entrada `asteroides` a `GAMES` en `lib/data.ts` (`id: "asteroides"`, `title: "ASTEROIDES"`, categoría `SHOOTER`, color `yellow`, cover `cover-asteroides`), y **eliminar** la entrada `rocas` existente.
- Portar la clase `.cover-rocas` de `app/globals.css` a `.cover-asteroides` (mismo arte CSS, solo renombrada), y eliminar el bloque `.cover-rocas` original.
- Corregir la fila estática del ticker "Actividad en vivo" en `app/page.tsx` que hoy dice `"Rocas"` (jugador `VAULT_07`) para que diga `"Asteroides"`, ya que ese juego deja de existir en el catálogo.
- Portar la lógica de `references/started-games/02-asteroids/game.js` (naves, asteroides, balas, partículas, colisiones, niveles, vidas, envolvimiento toroidal) a `components/games/asteroids/engine.ts`, en TypeScript, sin variables globales de `window`/`canvas`.
- Crear `components/games/asteroids/asteroids-game.tsx`: componente `"use client"` con un `<canvas>` que monta el motor del paso anterior, expone `restart()` y `forceGameOver()` vía `forwardRef`, y notifica cambios de `score`/`lives`/`level`/game-over a la página del Reproductor mediante props callback.
- Conservar el HUD que `game.js` dibuja dentro del canvas (`drawHUD`/`drawLifeIcon`: SCORE, NIVEL, íconos de vida) tal cual, y mantenerlo **sincronizado** con el `.player-hud` del reproductor: ambos leen el mismo estado real (`score`/`lives`/`level`) del motor, así que nunca muestran valores distintos entre sí. Solo se quita `drawOverlay()` para el estado `'gameover'` (el texto "GAME OVER" con reinicio por Espacio), porque ese flujo pasa a manejarlo el modal "FIN DEL JUEGO" de la plataforma.
- Integrar el game over real (nave sin vidas) con el modal "FIN DEL JUEGO" ya existente en `/juegos/[id]/jugar`: al llegar a 0 vidas se abre automáticamente ese modal con el puntaje final, igual que si se apretara "FIN" manualmente.
- Implementar pausa real: el botón "PAUSA" del reproductor congela el loop del motor (no se llama más a `update(dt)`; se conserva el último frame dibujado) reutilizando el overlay "EN PAUSA" que ya existe en la pantalla.
- El botón "JUGAR DE NUEVO" del modal de fin de partida reinicia el motor real (`restart()`) además del estado del HUD.
- Controles de teclado (`←`/`→` rotar, `↑` propulsar, `Espacio` disparar), agregados/quitados solo mientras el componente del juego está montado (sin listeners globales persistentes de `game.js`).
- Controles táctiles nuevos (`components/games/asteroids/touch-controls.tsx`): botones on-screen ◀/▶ (rotar) y ▲ (propulsar) abajo a la izquierda del `.crt-screen`, botón ● FUEGO abajo a la derecha; rotar/propulsar son "mantener presionado", disparar es "tap". Solo se muestran si se detecta un dispositivo táctil (`matchMedia('(pointer: coarse)')`).
- Canvas interno a resolución fija 800×600 (igual que la referencia), escalado por CSS dentro de `.crt-screen` (que ya es `aspect-ratio: 4/3`) para verse bien en cualquier ancho de pantalla, sin tocar la física del juego.
- El resto de los 7 juegos del catálogo (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen exactamente igual que hoy: simulación falsa en `/juegos/[id]/jugar` (puntaje que sube solo, sin motor real, sin controles táctiles).

**Out of scope (para specs futuros):**

- Cualquier otro de los 7 juegos restantes del catálogo — cada uno se implementa en su propio spec, siguiendo el patrón que deje este.
- Conectar el leaderboard de `/juegos/asteroides` y `/salon-de-la-fama` a los puntajes reales guardados en `av_scores` — ambas pantallas siguen usando `seededScores` (datos mock), exactamente igual que para los demás juegos. `av_scores` sigue guardándose (spec 01) pero ninguna pantalla lo lee todavía.
- Power-ups, tipos de asteroide especiales ("estrella fugaz") u otras features que el `README.md` de la referencia menciona pero que `game.js` no implementa — se porta el juego tal cual está en el código, no lo que documenta el README (ver nota de `references/started-games/02-asteroids/CLAUDE.md`: el README describe features que no existen en el código).
- Persistencia del progreso de una partida entre sesiones (guardar/restaurar una partida en curso) — como hoy, cerrar o recargar `/juegos/asteroides/jugar` pierde la partida en curso.
- Sonido/música — `game.js` no tiene audio y este spec no agrega ninguno.
- Gestos táctiles (arrastrar para rotar, etc.) — los controles táctiles son botones fijos, no gestos sobre el canvas.
- Tests automatizados — no hay test runner configurado en el repo (igual que specs anteriores).

## Data model

```ts
// lib/data.ts — nueva entrada en GAMES, reemplaza a "rocas"
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pulveriza rocas espaciales en gravedad cero.",
  long: "Tu nave triangular flota en el vacío absoluto de un campo de asteroides toroidal. Dispara y rota para partir rocas grandes en fragmentos cada vez más pequeños, esquiva los impactos y sobrevive nivel tras nivel.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "yellow",
  best: 41200,
  plays: "15.6K",
}
```

No se agregan interfaces nuevas a `lib/types.ts` (`Game`, `ScoreEntry`, etc. de SPEC 01 ya alcanzan). El estado interno del motor del juego (posición/velocidad de nave y asteroides, balas, partículas, `score`/`lives`/`level`/`state`) vive únicamente dentro de `components/games/asteroids/engine.ts` y `asteroids-game.tsx`, sin persistirse ni tipar como parte del modelo de datos de la plataforma — solo se exponen hacia afuera los números que ya modela `ScoreEntry` (`score`, `name`, `game`) al guardar vía `saveScore()` existente.

## Implementation plan

1. Actualizar `lib/data.ts`: eliminar la entrada `rocas` de `GAMES` y agregar la entrada `asteroides` del modelo de datos de arriba.
2. En `app/globals.css`, renombrar el bloque `.cover-rocas` (y sus `::before`/`::after`) a `.cover-asteroides`, sin cambiar sus reglas.
3. En `app/page.tsx`, corregir la fila del ticker de "Actividad en vivo" que dice `"Rocas"` para que diga `"Asteroides"`.
4. Crear `components/games/asteroids/engine.ts`: portar de `game.js` las clases `Bullet`, `Asteroid`, `Ship`, `Particle`, las constantes `RADII`/`SPEEDS`/`POINTS`, los helpers `wrap`/`dist`/`rand`/`randInt`, y las funciones `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update(dt)`, a TypeScript. El motor recibe el `CanvasRenderingContext2D`, el ancho/alto lógico (800×600) y un objeto de input (`keys`/`justPressed` equivalentes) como parámetros de construcción, en vez de leer `window`/`canvas` globales. Se conservan `drawHUD`/`drawLifeIcon` en la función `draw()` tal cual `game.js` (SCORE/NIVEL/vidas dibujados dentro del canvas); se quita únicamente `drawOverlay()` para el estado `'gameover'`.
5. Crear `components/games/asteroids/asteroids-game.tsx` (`"use client"`): monta el `<canvas width={800} height={600}>`, instancia el motor del paso 4 en un `useEffect`, corre el loop vía `requestAnimationFrame` (pausable con la prop `paused`), agrega/quita los listeners `keydown`/`keyup` (con `preventDefault` en flechas/espacio) solo mientras está montado. Expone por `forwardRef` los métodos `restart()` (reinicia el motor) y `forceGameOver()` (fuerza fin de partida al puntaje actual). Recibe props `paused: boolean`, `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)`, invocadas en el mismo momento en que el motor actualiza esos valores internamente (el mismo tick que dibuja el HUD del canvas), para que el `.player-hud` del reproductor y el HUD del canvas nunca queden desincronizados. `onGameOver` se dispara automáticamente cuando `state` pasa a `'gameover'`.
6. Crear `components/games/asteroids/touch-controls.tsx`: botones ◀/▶/▲ (mantener presionado, `onPointerDown`/`onPointerUp`/`onPointerLeave`) y ● FUEGO (tap, `onPointerDown`) que llaman a métodos del mismo ref del paso 5 (`pressLeft(held)`, `pressRight(held)`, `pressThrust(held)`, `pressShoot()`, agregados al `forwardRef` de `asteroids-game.tsx`). Se renderiza condicionalmente según `window.matchMedia('(pointer: coarse)').matches`, chequeado en un `useEffect` (default `false` en el primer render para evitar mismatch de hidratación).
7. Actualizar `app/juegos/[id]/jugar/page.tsx`: cuando `game.id === "asteroides"`, renderizar `<AsteroidsGame ref={gameRef} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={(finalScore) => { setScore(finalScore); setOver(true); }} />` junto a `<TouchControls gameRef={gameRef} />` dentro de `.crt-screen`, en vez del `.game-arena` decorativo; desactivar para este juego el `useEffect` que hoy incrementa el puntaje solo por temporizador. El botón "FIN" llama a `gameRef.current?.forceGameOver()` cuando el juego es real (en vez de `setOver(true)` directo); el botón "JUGAR DE NUEVO" del modal llama a `gameRef.current?.restart()` además de resetear `score`/`lives`/`level`/`paused`/`over`/`saved` del estado local. Para cualquier otro `id`, el comportamiento actual (simulación falsa, `.game-arena` decorativo) no cambia.
8. Agregar en `app/globals.css` los estilos de `.touch-controls` y sus botones (superpuestos sobre `.crt-screen`, esquinas inferior-izquierda/derecha, tamaño mínimo 44×44px, fondo translúcido con la paleta neón ya existente).
9. Recorrer manualmente con `npm run dev`: la tarjeta "ASTEROIDES" aparece en Biblioteca e Inicio y su Detalle muestra su copy; en `/juegos/asteroides/jugar` los controles de teclado mueven la nave, disparar destruye asteroides y suma puntaje real al HUD, perder las 3 vidas abre el modal "FIN DEL JUEGO" automáticamente, "PAUSA" congela el juego y "REANUDAR" lo continúa, "FIN" también abre el modal con el puntaje actual, "JUGAR DE NUEVO" reinicia una partida nueva, y guardar la puntuación la agrega a `localStorage["av_scores"]`. Con las devtools en modo dispositivo táctil, confirmar que aparecen los botones on-screen y controlan la nave. Confirmar que `/juegos/bloque-buster/jugar` (u otro juego existente) sigue con la simulación falsa sin cambios. Confirmar que `npm run build` termina sin errores de TypeScript ni de ESLint.

## Acceptance criteria

- [ ] `GAMES` en `lib/data.ts` ya no tiene ninguna entrada con `id: "rocas"`, y sí tiene una entrada `id: "asteroides"` con `title: "ASTEROIDES"`.
- [ ] `/biblioteca` y `/` (Inicio) muestran la tarjeta "ASTEROIDES" con su cover propio (`cover-asteroides`), sin errores de clase CSS faltante.
- [ ] El ticker de "Actividad en vivo" en `/` ya no muestra el texto `"Rocas"`.
- [ ] `/juegos/asteroides` (Detalle) muestra portada, tags, descripción y stats de la nueva tarjeta, y su leaderboard mock (`seededScores`) sin cambios de comportamiento respecto a los demás juegos.
- [ ] En `/juegos/asteroides/jugar`, las flechas rotan/propulsan la nave y Espacio dispara balas que destruyen asteroides.
- [ ] El HUD del reproductor (Puntuación/Vidas/Nivel) y el HUD propio dentro del canvas (SCORE/NIVEL/íconos de vida de `game.js`) muestran siempre los mismos valores en tiempo real, sin desincronizarse entre sí.
- [ ] Al perder las 3 vidas, se abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final alcanzado, sin overlay ni reinicio propio de `game.js`.
- [ ] El botón "PAUSA" detiene el movimiento de nave/asteroides/balas (el loop deja de actualizarse) y muestra "EN PAUSA"; "REANUDAR" continúa la partida exactamente donde quedó.
- [ ] El botón "FIN" abre el modal "FIN DEL JUEGO" con el puntaje actual en cualquier momento de la partida, incluso antes de perder todas las vidas.
- [ ] Guardar la puntuación en el modal escribe una entrada `{ game: "asteroides", score, name }` en `localStorage["av_scores"]`.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (nave al centro, 3 vidas, nivel 1, puntaje 0), no solo el estado visual del HUD.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero (emulación táctil en devtools), aparecen los botones on-screen ◀/▶/▲/FUEGO y controlan la nave; con mouse/teclado normal (sin puntero táctil) no aparecen.
- [ ] Navegar a `/juegos/bloque-buster/jugar` (o cualquier otro de los 7 juegos restantes) muestra exactamente la misma simulación falsa que antes de este spec, sin controles táctiles ni motor real.
- [ ] Salir de `/juegos/asteroides/jugar` (botón "SALIR" o navegación) no deja escuchando en `window` los listeners de teclado del juego (verificable revisando que jugar en otra pantalla no dispara `preventDefault` sobre flechas/espacio).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** el juego real es una tarjeta nueva `asteroides`, no una reutilización de la tarjeta `rocas` existente — decisión explícita del usuario; `rocas` se elimina del catálogo en este mismo spec para no dejar dos tarjetas conceptualmente duplicadas.
- **Sí:** reusar el copy visual (`cover-rocas` → `cover-asteroides`) y los valores decorativos `best`/`plays` que tenía `rocas`, en vez de inventar números nuevos sin base — minimiza el riesgo de contenido arbitrario; el `short`/`long` sí se redacta de nuevo, inspirado en el `README.md` de la referencia portada.
- **Sí:** se mantienen los dos HUD — el propio del canvas (`drawHUD`/`drawLifeIcon` de `game.js`) y el `.player-hud` del reproductor — sincronizados entre sí porque ambos leen el mismo estado real (`score`/`lives`/`level`) del motor. Decisión revertida explícitamente por el usuario respecto a la primera versión de este spec, que proponía quitar el HUD del canvas para no duplicarlo.
- **No:** quitar el HUD del canvas — se descartó la idea de un HUD único; el usuario prefiere conservar la estética original del juego portado siempre que quede sincronizada con la del reproductor.
- **Sí:** se sigue quitando `drawOverlay()` (el texto "GAME OVER" con reinicio por Espacio) del canvas — esa parte no es "HUD" (puntaje/vidas/nivel) sino el flujo de fin de partida, que la plataforma ya resuelve con el modal "FIN DEL JUEGO"; no fue parte de lo que el usuario pidió revertir.
- **Sí:** el game over real (sin vidas) dispara automáticamente el modal "FIN DEL JUEGO" de la plataforma, reemplazando el overlay/reinicio-por-Espacio propio de `game.js` — mantiene un único flujo de fin de partida y guardado de puntaje, consistente con los demás juegos cuando se implementen. Confirmado explícitamente por el usuario.
- **Sí:** "PAUSA" congela el loop del motor (no se llama a `update(dt)`) reutilizando el overlay "EN PAUSA" ya existente, en vez de quitar el botón para este juego — mantiene la misma UI de reproductor para todos los juegos aunque `game.js` no tuviera pausa nativa. Confirmado explícitamente por el usuario.
- **Sí:** el código portado vive en `components/games/asteroids/` (carpeta dedicada por juego) en vez de inline en `app/juegos/[id]/jugar/page.tsx` — establece el patrón para los próximos 7 juegos. Confirmado explícitamente por el usuario.
- **Sí:** se agregan controles táctiles (botones on-screen fijos ◀/▶/▲/FUEGO, visibles solo en dispositivos táctiles) en este mismo spec, en vez de dejarlos para un spec futuro — decisión explícita del usuario de ampliar el alcance para que el primer juego real sea jugable en móvil desde el día uno.
- **No:** controles por gestos (arrastrar para rotar, tocar para disparar) — más complejos de ajustar/testear que botones fijos, y el usuario eligió explícitamente el layout de botones.
- **No:** conectar `av_scores` al leaderboard de Detalle/Salón de la Fama en este spec — decisión explícita del usuario de mantenerlo mock por ahora, igual que los demás juegos; se hace en un spec futuro si se decide reemplazar `seededScores` por datos reales en general.
- **No:** portar power-ups ni el asteroide "estrella fugaz" mencionados en el `README.md` de la referencia — `CLAUDE.md` de esa carpeta documenta explícitamente que esas features no existen en `game.js`; este spec porta el código tal cual está, no el README.
- **Sí:** resolución interna del canvas fija en 800×600, escalada por CSS dentro de `.crt-screen` (ya `aspect-ratio: 4/3`) — evita reescribir la física/coordenadas del juego (`W`/`H` en `engine.ts`) para simplemente adaptarse a distintos anchos de pantalla.

## Risks

| Riesgo                                                                                                                                                                                                     | Mitigación                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los listeners de teclado (`keydown`/`keyup` con `preventDefault`) quedan activos fuera de `/juegos/asteroides/jugar` si no se limpian bien                                                                 | Se agregan/quitan en el `useEffect` de montaje/desmontaje de `asteroids-game.tsx`, verificado explícitamente en el paso 9 del plan y en el criterio de aceptación correspondiente.                                                    |
| Los botones táctiles pueden ser difíciles de presionar con precisión en pantallas chicas, especialmente rotar+propulsar al mismo tiempo                                                                    | Tamaño mínimo 44×44px por botón (paso 8) y layout separado en dos esquinas (rotar/propulsar a la izquierda, disparo a la derecha) para minimizar toques accidentales; ajustes finos de UX quedan para iteración futura si hace falta. |
| Detección de dispositivo táctil vía `matchMedia('(pointer: coarse)')` puede fallar en laptops híbridas con pantalla táctil + teclado, mostrando botones innecesarios o escondiéndolos donde sí hacen falta | Aceptado como heurística estándar para este MVP; no bloquea el uso de teclado en ningún caso, solo agrega o quita el overlay de botones.                                                                                              |
| Bajar el framerate en dispositivos móviles de gama baja (canvas + partículas)                                                                                                                              | Fuera de alcance optimizar rendimiento en este spec; `game.js` ya clampea `dt` a 0.05s para evitar saltos físicos si el framerate cae.                                                                                                |

## Lo que **no** está en este spec

- Cualquier otro de los 7 juegos restantes del catálogo.
- Conectar el leaderboard de Detalle/Salón de la Fama a los puntajes reales (`av_scores`).
- Power-ups, asteroide "estrella fugaz" u otras features no implementadas en `game.js`.
- Persistencia de una partida en curso entre sesiones.
- Sonido o música.
- Controles táctiles por gestos.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
