# SPEC 08 — Juego: Arkanoid

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-22
> **Objective:** Portar el juego de `references/started-games/04-arkanoid/` a un componente React real jugable en `/juegos/arkanoid/jugar`, reemplazando la tarjeta placeholder `bloque-buster` del catálogo, con motor propio sin sprites ni sonido, HUD sincronizado, controles táctiles y leaderboard real en `av_scores`.

## Por qué existe este spec

`references/started-games/04-arkanoid/` trae un clon de Arkanoid (pala, bola, 5 niveles fijos con dificultad creciente, vidas) en HTML5 Canvas + JS vanilla, con sprites (`assets/spritesheet-breakout.png`) y sonido. La tarjeta `bloque-buster` ya existente en `av_games` ("BLOQUE BUSTER" — rebota la pelota y destruye muros de neón, categoría `ARCADE`, cover `cover-bricks`) describe exactamente este tipo de juego pero hoy es una simulación falsa. Este spec reemplaza `bloque-buster` por una tarjeta nueva `arkanoid` con el motor real portado, siguiendo el patrón de SPEC 05 (motor/componente/táctil) y SPEC 06 (catálogo/leaderboard en Supabase), igual que SPEC 05 reemplazó `rocas` por `asteroides` y SPEC 07 reemplazó `caida` por `tetris`.

## Scope

**In:**

- Reemplazar la entrada `bloque-buster` de `av_games` por una entrada nueva `arkanoid` (vía migración SQL): mismo `cat` (`ARCADE`) y mismos valores decorativos `color: cyan`, `best: 28450`, `plays: "12.4K"` que tenía `bloque-buster` (sin inventar números nuevos), con `title`, `short`, `long` y `cover` nuevos, propios de este juego.
- Renombrar la clase `.cover-bricks` de `app/globals.css` (y su `::after`) a `.cover-arkanoid`, sin cambiar sus reglas visuales — no requiere `/frontend-design` porque el arte ya existe y no cambia, solo el nombre de la clase.
- Portar la lógica de `references/started-games/04-arkanoid/game.js` (pala, bola, bloques, colisiones, explosiones, 5 niveles fijos, vidas) a `components/games/arkanoid/engine.ts`, en TypeScript, sin variables globales de `window`/`canvas`, dibujando todo con figuras vectoriales (`fillRect`/`arc`) en vez de sprites — no se porta `assets/spritesheet-breakout.png` ni `assets/spritesheet.js`.
- Canvas lógico fijo 800×600 (igual que `asteroids`/`tetris`), con el campo de juego (bloques + pala + bola) rediseñado a un área centrada de 480 de ancho, en vez de reescalar el canvas 480×640 original — ver "Data model" para las coordenadas exactas.
- Crear `components/games/arkanoid/arkanoid-game.tsx`: componente `"use client"` con un `<canvas>` que monta el motor, expone `restart()`/`forceGameOver()`/`pressLeft(held)`/`pressRight(held)`/`pressLaunch()` vía `forwardRef`, y notifica `score`/`lives`/`level`/game-over a `jugar-client.tsx` mediante props callback, igual que `AsteroidsGame`.
- Conservar el HUD que dibuja el motor dentro del canvas (marcador, nivel, vidas), sincronizado con `.player-hud` del reproductor (ambos leen los mismos campos públicos del motor). Se quita el campo "High score" del HUD original (viene de `localStorage`, redundante con el "Mejor global" real de `av_scores`/SPEC 06) y se quita la pantalla de inicio ("ARKANOID — Presiona ESPACIO para empezar"): el motor arranca directo en `'playing'`, con la bola pegada a la pala esperando Espacio para lanzarla.
- Conservar el overlay in-canvas de "Nivel X completado — Presiona ESPACIO para continuar" como sub-estado del motor (`'levelComplete'`) — no es un fin de partida, es una transición entre niveles; el motor deja de mover pala/bola mientras dura y solo avanza al detectar Espacio.
- Al perder las 3 vidas, o al limpiar todos los bloques del nivel 5 (último nivel fijo), el motor pasa a `'gameover'` y dispara el modal "FIN DEL JUEGO" de la plataforma con el puntaje final — sin distinción visual de victoria/derrota en el modal.
- Integrar pausa real (congela `update(dt)`, conserva el último frame) y "JUGAR DE NUEVO" (`restart()` real) igual que el resto de juegos con motor.
- Controles de teclado (`←`/`→` mover pala, `Espacio` lanzar bola/continuar nivel), agregados/quitados solo mientras el componente está montado.
- Controles táctiles nuevos (`components/games/arkanoid/touch-controls.tsx`): dos botones ◀/▶ (mover pala, "mantener presionado") en la esquina inferior izquierda usando dos de los tres slots de `.touch-controls-move` (se omite el tercero, no hace falta botón central), y un único botón `.touch-btn-fire` ("lanzar bola / continuar nivel", "tap") en la esquina inferior derecha. Visibles solo con `matchMedia('(pointer: coarse)')`.
- Agregar la entrada `arkanoid` a `components/games/registry.ts` (ya existe, creado en SPEC 07 — no se vuelve a crear).
- El resto de los juegos del catálogo (`serpentina`, `gloton`, `invasores`, `asteroides`, `tetris`, `ranaria`, `duelo-pixel`) siguen exactamente igual.

**Out of scope (para specs futuros):**

- Sprites (`assets/spritesheet-breakout.png`, `assets/spritesheet.js`) — se descartan a favor de dibujo vectorial con colores planos, igual que `asteroids`/`tetris`. Confirmado explícitamente por el usuario.
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`) y la tecla `M` de mute — ningún juego portado hasta ahora tiene audio; se descarta en este spec también. Confirmado explícitamente por el usuario.
- "High score" local en `localStorage` (`arkanoid:highScore:v1` en el original) — el "Mejor global" real ya lo resuelve `av_games`/`av_scores` (SPEC 06); agregar una segunda fuente de "mejor puntaje" sería redundante y engañoso. Confirmado explícitamente por el usuario.
- Pantalla de inicio propia ("ARKANOID — Presiona ESPACIO para empezar") — el motor arranca jugando de inmediato. Confirmado explícitamente por el usuario.
- Loop infinito de niveles tras completar el nivel 5 — completar el nivel 5 termina la partida (fin de partida real). Confirmado explícitamente por el usuario.
- Cualquier otro juego del catálogo — cada uno tiene su propio spec.
- Conectar el leaderboard a datos que no sean `av_scores` — ya lo resuelve SPEC 06, data-driven, sin cambios necesarios.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

```sql
-- Reemplaza el placeholder "bloque-buster" por el juego real "arkanoid" (SPEC 08).
delete from av_games where id = 'bloque-buster';

insert into av_games (id, title, short, long, cat, cover, color, best, plays) values
  ('arkanoid', 'ARKANOID', 'Rebota la bola y destruye 5 niveles de muros de neón.', 'Controlás una pala luminosa que devuelve una bola de plasma contra murallas de bloques cromáticos. Sobreviví cinco niveles de dificultad creciente, con paredes cada vez más angostas y una bola cada vez más veloz, sin perder tus tres vidas.', 'ARCADE', 'cover-arkanoid', 'cyan', 28450, '12.4K');
```

No se agregan interfaces nuevas a `lib/types.ts` — `Game`/`Score`/`ScoreEntry` de SPEC 01/06 ya alcanzan.

Forma del motor (`components/games/arkanoid/engine.ts`):

```ts
export type GameState = "playing" | "levelComplete" | "gameover";

export class ArkanoidEngine {
  score = 0;
  lives = 3;
  level = 1; // 1..5, mapea directo a "Nivel" del .player-hud
  state: GameState = "playing";
  // ...
}
```

`lives` ocupa "Vidas" en `.player-hud` sin necesidad de `hudLivesLabel` (a diferencia de `tetris`, este juego sí tiene vidas en el sentido de Asteroids).

Coordenadas del canvas lógico 800×600 (rediseño del campo 480×640 original, centrado en vez de reescalado):

- Grilla de bloques: `BLOCK_COLS = 15`, `BLOCK_ROWS = 7`, `BLOCK_W = 32`, `BLOCK_H = 16` (idénticos al original: 480×112px), posicionada en `x = 160` (centrado: `(800 - 480) / 2`), `y = 30` (debajo de una franja de HUD de 20px de alto).
- Pala: mismos anchos por nivel que el original (122 a 162px según `LEVELS[i].paddleWidth`), misma velocidad (6px/frame), reposicionada a `y = 560` (antes `y = 600` sobre un canvas de 640 de alto).
- Bola: mismo tamaño (16×16) y velocidad base `BALL_SPEED = 15` (3x la velocidad original de 5, decisión explícita del usuario tras jugar la primera implementación), multiplicada por `ballSpeedMultiplier` de cada nivel, reposicionada relativa a la nueva `y` de la pala.
- Los márgenes izquierdo/derecho (160px cada uno) quedan como fondo decorativo, sin controles ni HUD adicional ahí.
- Efecto de rotura de bloque: en vez de las 4 frames de sprite del original, un flash simple (rectángulo del color de la fila, opacidad de 1 a 0 en ~150ms) en la posición del bloque roto.

## Implementation plan

1. Migración `supabase/migrations/<timestamp>_add_game_arkanoid.sql` con el `delete`/`insert` del modelo de datos de arriba. Aplicar con `npx supabase db push` y confirmar con `mcp__supabase__list_tables` que `av_games` ya no tiene `bloque-buster` y sí tiene `arkanoid`.
2. En `app/globals.css`, renombrar el bloque `.cover-bricks` (líneas ~687–708) y su `::after` a `.cover-arkanoid`, sin cambiar sus reglas.
3. Crear `components/games/arkanoid/engine.ts`: portar de `game.js` las funciones `createBlocks`, `updatePaddle`, `launchBall`, `updateBall`, `checkPaddleCollision`, `checkBlockCollision`, `checkWinCondition`, `checkBallLost`, `advanceLevel`, `resetGame` (como `restart()`), y las constantes `LEVELS`/`ROW_COLORS`/`COLOR_POINTS`, a TypeScript, con las coordenadas rediseñadas del modelo de datos. El motor recibe `ctx`/`width`/`height`/`input` (`{ keys, justPressed }`) por constructor, sin `window`/`document`/`canvas` globales. `draw()` dibuja bloques/pala/bola/flashes de rotura con figuras vectoriales y el HUD (`SCORE`/`NIVEL n/5`/`VIDAS`) en una franja superior de 20px, sin "High score". Se agrega el sub-estado `'levelComplete'` (overlay "Nivel X completado — Presiona ESPACIO para continuar", congela pala/bola hasta que `justPressed['Space']` avance al siguiente nivel) y se quita la pantalla de inicio y el overlay de "GAME OVER" propio del original.
4. Crear `components/games/arkanoid/arkanoid-game.tsx` (`"use client"`), siguiendo el patrón de `asteroids-game.tsx`: canvas 800×600, loop de `requestAnimationFrame` pausable con la prop `paused`, listeners `keydown`/`keyup` (`preventDefault` en flechas/espacio) solo mientras está montado, `forwardRef` con `restart()`/`forceGameOver()`/`pressLeft(held)`/`pressRight(held)`/`pressLaunch()`, props `paused`/`onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` diffeadas cada frame contra el estado público del motor. `onGameOver` se dispara cuando `state` pasa a `'gameover'` (por 0 vidas o nivel 5 completado, sin distinción).
5. Crear `components/games/arkanoid/touch-controls.tsx`: dos botones ◀/▶ ("mantener presionado", `onPointerDown/Up/Leave/Cancel`) usando los slots `:nth-child(1)` y `:nth-child(3)` de `.touch-controls-move` (se omite el `:nth-child(2)` central), y un botón `.touch-btn-fire` ("lanzar bola / continuar nivel", "tap", `onPointerDown`). Detección de táctil vía `useSyncExternalStore` sobre `matchMedia('(pointer: coarse)')`, `return null` si no aplica.
6. Agregar la entrada `arkanoid` a `components/games/registry.ts` (`Component: ArkanoidGame`, `TouchControls`), sin tocar `jugar-client.tsx` (ya consume el registry desde SPEC 07).
7. Recorrer manualmente con `npm run dev`: la tarjeta "ARKANOID" aparece en Biblioteca e Inicio con su cover propio; `/juegos/arkanoid/jugar` es jugable con teclado (mover pala, lanzar bola, romper bloques suma puntaje), perder las 3 vidas o completar el nivel 5 abre el modal "FIN DEL JUEGO", "PAUSA"/"REANUDAR"/"JUGAR DE NUEVO" funcionan como en `asteroids`, guardar la puntuación la persiste en `av_scores` y aparece en `/juegos/arkanoid` y en la tab correspondiente de `/salon-de-la-fama`. Con devtools en modo táctil aparecen los 3 botones on-screen. Confirmar que `bloque-buster` ya no aparece en ningún lado y que los demás juegos siguen sin cambios. `npm run build` sin errores de TypeScript ni ESLint.

## Acceptance criteria

- [ ] `av_games` ya no tiene ninguna fila con `id: "bloque-buster"`, y sí tiene una fila `id: "arkanoid"` con `title: "ARKANOID"`.
- [ ] `/biblioteca` y `/` muestran la tarjeta "ARKANOID" con su cover propio (`cover-arkanoid`), sin clase CSS faltante.
- [ ] `/juegos/arkanoid` muestra portada, copy y stats; el leaderboard muestra "aún no hay puntajes" si `av_scores` no tiene filas para `arkanoid`.
- [ ] En `/juegos/arkanoid/jugar`, `←`/`→` mueven la pala y `Espacio` lanza la bola cuando está pegada a la pala; romper bloques suma el puntaje correspondiente a su fila/color.
- [ ] El HUD del reproductor (`.player-hud`) y el HUD in-canvas (`SCORE`/`NIVEL`/`VIDAS`, sin "High score") muestran siempre los mismos valores, sin desincronizarse.
- [ ] Al limpiar todos los bloques de un nivel (1 a 4), aparece el overlay in-canvas "Nivel X completado" y el juego no reanuda hasta presionar Espacio.
- [ ] Al perder las 3 vidas, o al limpiar todos los bloques del nivel 5, se abre automáticamente el modal "FIN DEL JUEGO" con el puntaje final.
- [ ] El botón "PAUSA" congela pala/bola/bloques (el loop deja de llamar `update(dt)`) y "REANUDAR" continúa exactamente donde quedó.
- [ ] El botón "FIN" abre el modal con el puntaje actual en cualquier momento de la partida.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (pala centrada, bola pegada, nivel 1, 3 vidas, puntaje 0).
- [ ] Guardar la puntuación inserta una fila en `av_scores` (`{ gameId: "arkanoid", score, name }`), visible recargando `/juegos/arkanoid` y en la tab de `/salon-de-la-fama`.
- [ ] Con `matchMedia('(pointer: coarse)')` verdadero aparecen los 3 botones táctiles (◀/▶/lanzar) y controlan la pala/bola; con mouse/teclado normal no aparecen.
- [ ] Salir de `/juegos/arkanoid/jugar` no deja listeners de teclado activos en `window`.
- [ ] El resto de los juegos del catálogo siguen exactamente igual (sin cambios de comportamiento).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** juego portado de `references/started-games/04-arkanoid/`, código tal cual `game.js` lo implementa (no hay features del README que difieran del código en este caso).
- **Sí:** reemplaza la tarjeta placeholder `bloque-buster` con un id nuevo `arkanoid` (`DELETE` + `INSERT`), en vez de reusar el id/copy de `bloque-buster` tal cual o solo reescribir su copy — decisión explícita del usuario, mismo patrón que `asteroides` reemplazó a `rocas`.
- **Sí:** se heredan los valores decorativos `color: cyan`, `best: 28450`, `plays: "12.4K"` de `bloque-buster` en vez de inventar números nuevos; `short`/`long` sí se redactan de nuevo para describir el juego real portado. Confirmado explícitamente por el usuario.
- **Sí:** `.cover-bricks` se renombra a `.cover-arkanoid` (mismo arte CSS) en vez de mantenerse con el nombre viejo — sigue el mismo patrón que SPEC 05 (`cover-rocas` → `cover-asteroides`), ya que el id viejo (`bloque-buster`) desaparece del catálogo.
- **Sí:** canvas lógico 800×600 con el campo de juego rediseñado (centrado, 480 de ancho) en vez de preservar el canvas 480×640 original — sigue el patrón que estableció `tetris` (SPEC 07) para juegos cuyo aspect ratio original no es 4:3. Confirmado explícitamente por el usuario.
- **No:** sprites (`spritesheet-breakout.png`) — se dibuja todo con figuras vectoriales, consistente con `asteroids`/`tetris` y evitando un pipeline de carga de imágenes nuevo. Confirmado explícitamente por el usuario.
- **No:** sonido (`ball-bounce.mp3`/`break-sound.mp3`) ni mute — ningún juego portado tiene audio todavía. Confirmado explícitamente por el usuario.
- **No:** "High score" en el HUD in-canvas ni su persistencia en `localStorage` — el "Mejor global" real ya lo cubre `av_games`/`av_scores`. Confirmado explícitamente por el usuario.
- **No:** pantalla de inicio propia ("Presiona ESPACIO para empezar") — el motor arranca jugando de inmediato, como `asteroids`/`tetris`. Confirmado explícitamente por el usuario.
- **Sí:** se conserva el overlay in-canvas de "Nivel X completado" como sub-estado `'levelComplete'` del motor — es una transición intermedia, no un fin de partida, así que no compite con el modal de la plataforma. Confirmado explícitamente por el usuario.
- **Sí:** completar el nivel 5 dispara `'gameover'` y el modal "FIN DEL JUEGO" (sin distinción de victoria/derrota), en vez de un loop infinito de niveles — mantiene una partida de duración finita, consistente con que ni `asteroids` ni `tetris` tienen estado de "victoria". Confirmado explícitamente por el usuario.
- **Sí:** el `lives` del motor mapea directo a "Vidas" en `.player-hud`, sin `hudLivesLabel` — a diferencia de `tetris`, este juego sí tiene vidas en el sentido de `asteroids`.
- **Sí:** controles táctiles con solo 2 de los 3 slots de `.touch-controls-move` (◀/▶, se omite el central) más un único botón `.touch-btn-fire` para "lanzar bola / continuar nivel" — el juego original no tiene una tercera acción sostenida (no hay "propulsar" ni equivalente). Confirmado explícitamente por el usuario.
- **Sí:** se agrega la entrada al registry existente (`components/games/registry.ts`, creado en SPEC 07) en vez de crearlo — ya existe.

## Risks

| Riesgo                                                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comprimir la zona de caída vertical entre bloques y pala (de ~488px en el original a ~418px en el canvas rediseñado) cambia levemente el ritmo del juego, dándole menos tiempo de reacción al jugador.                                                        | Aceptado como consecuencia esperada de encajar un campo de juego 480×640 dentro de un canvas 800×600 — la velocidad de la bola y el ancho de pala por nivel se mantienen idénticos al original, solo cambia la distancia disponible. Ajustes finos quedan para iteración futura si el juego resulta injustamente difícil. |
| El sub-estado `'levelComplete'` es nuevo respecto al `GameState` de `asteroids`/`tetris` (que solo usan `'playing'`/`'gameover'`); si `arkanoid-game.tsx` no lo excluye explícitamente del chequeo de `onGameOver`, podría confundirse con un fin de partida. | El chequeo de `onGameOver` solo dispara cuando `state === 'gameover'` (no `'levelComplete'`), igual que el patrón ya usado en `asteroids-game.tsx`; se verifica explícitamente en el paso 7 del plan y en el criterio de aceptación de "Nivel X completado".                                                              |

## Lo que **no** está en este spec

- Sprites del juego original (`spritesheet-breakout.png`, `spritesheet.js`).
- Sonido y mute.
- "High score" local en `localStorage`.
- Pantalla de inicio propia.
- Loop infinito de niveles tras el nivel 5.
- Cualquier otro juego del catálogo.
- Persistencia de una partida en curso entre sesiones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
