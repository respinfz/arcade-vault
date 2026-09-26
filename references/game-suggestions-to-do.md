# Sugerencias de juegos (to-do)

Registro de juegos sugeridos para Arcade Vault. Lo mantiene el agente **`game-planner`** (`.claude/agents/game-planner.md`): lo lee antes de proponer y lo actualiza al terminar, para no repetir sugerencias y respetar las decisiones tomadas. También se puede editar a mano.

## Pendientes

| Juego             | Slug                | Categoría | Puntaje | Esfuerzo | Estado      | Sugerido   | Motivo                                                                                                                                                            |
| ----------------- | ------------------- | --------- | ------- | -------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INVASORES         | `invasores`         | SHOOTER   | 32/35   | M        | recomendado | 2026-09-23 | Reemplaza placeholder; puntaje por alien + OVNI, oleadas infinitas; táctil ◀/▶ + FUEGO reutiliza el layout de Asteroides. Sin assets: dibujo procedural.          |
| RANARIA           | `ranaria`           | ARCADE    | 29/35   | M        | sugerido    | 2026-09-23 | Reemplaza placeholder; mecánica nueva (cruce por carriles), cruceta de 4 botones como Snake. Tercer ARCADE.                                                       |
| GLOTÓN            | `gloton`            | ARCADE    | 28/35   | L        | sugerido    | 2026-09-23 | Reemplaza placeholder; gran encaje de puntaje pero IA de 4 fantasmas + laberinto = esfuerzo alto. Tercer ARCADE.                                                  |
| DUELO PIXEL       | `duelo-pixel`       | VERSUS    | 27/35   | S        | sugerido    | 2026-09-23 | Única vía para cubrir VERSUS (vacía), pero solo vs CPU y el puntaje para leaderboard es débil (rallies/goles).                                                    |
| FUGA NEÓN         | `fuga-neon`         | ARCADE    | 31/35   | S        | sugerido    | 2026-09-23 | Top del eje ARCADE. Runner infinito (Canabalt/Chrome Dino); saltar/agacharse, 2 botones táctiles. Riesgo: generador procedural con tramos imposibles.             |
| TÚNEL VECTORIAL   | `tunel-vectorial`   | SHOOTER   | 31/35   | M        | sugerido    | 2026-09-23 | Top del eje SHOOTER. Tempest: tubo pseudo-3D por carriles; ◀/▶ + FUEGO + ZAP. Riesgo: proyección pseudo-3D y legibilidad en pantallas chicas.                     |
| SALTO ORBITAL     | `salto-orbital`     | ARCADE    | 30/35   | M        | sugerido    | 2026-09-23 | Doodle Jump; solo ◀/▶, HUD "Altura" vía `hudLivesLabel`. Riesgo: cámara vertical y garantizar plataformas alcanzables.                                            |
| CARRETERA NEÓN    | `carretera-neon`    | VERSUS    | 30/35   | M        | sugerido    | 2026-09-23 | Top del eje VERSUS. Road Fighter/Spy Hunter: tráfico + rivales CPU + combustible. Riesgo: sin IA rival propia se siente ARCADE. Candidato a ocupar `duelo-pixel`. |
| COLUMNAS          | `columnas`          | PUZZLE    | 30/35   | S        | sugerido    | 2026-09-23 | Top del eje PUZZLE. Columns: reutiliza grilla y táctil de Tetris. Riesgo: demasiado parecido a TETRIS.                                                            |
| ESCUADRÓN ESTELAR | `escuadron-estelar` | SHOOTER   | 29/35   | M        | sugerido    | 2026-09-23 | Shmup vertical (1942/Xevious) con jefes y power-ups. Riesgo: solapa con INVASORES; diseño de oleadas.                                                             |
| BURBUJAS NEÓN     | `burbujas`          | PUZZLE    | 29/35   | M        | sugerido    | 2026-09-23 | Puzzle Bobble: apuntar y disparar sobre grilla hexagonal. Más diverso que COLUMNAS. Riesgo: geometría hexagonal y apuntado táctil.                                |
| ALETEO            | `aleteo`            | ARCADE    | 28/35   | S        | sugerido    | 2026-09-23 | Flappy Bird; un solo botón. Riesgo: puntajes bajos (decenas) y solapa con FUGA NEÓN.                                                                              |
| CIEMPIÉS          | `ciempies`          | SHOOTER   | 28/35   | M        | sugerido    | 2026-09-23 | Centipede: segmentos que se parten y dejan hongos. Riesgo: cruceta + fuego a la vez en táctil (autofuego).                                                        |
| ARENA NEÓN        | `arena-neon`        | SHOOTER   | 28/35   | M        | sugerido    | 2026-09-23 | Twin-stick (Robotron/Geometry Wars) con multiplicador por gemas. Riesgo: dos crucetas en móvil / autoapuntado.                                                    |
| CANASTA NEÓN      | `canasta-neon`      | VERSUS    | 28/35   | S        | sugerido    | 2026-09-23 | Básquet de feria (Pop-A-Shot) con timing de ángulo/fuerza; 1 botón. Riesgo: sin rival real, cae en ARCADE.                                                        |
| TANDA DE PENALES  | `tanda-penales`     | VERSUS    | 28/35   | S        | sugerido    | 2026-09-23 | Penales vs CPU (patear y atajar), muerte súbita infinita. VERSUS "puro". Riesgo: estética de cancha en neón; IA predecible.                                       |
| DEFENSA ORBITAL   | `defensa-orbital`   | SHOOTER   | 27/35   | S        | sugerido    | 2026-09-23 | Missile Command. Riesgo: mira con cruceta es torpe; tocar el canvas exige extender el contrato táctil.                                                            |
| PANELES           | `paneles`           | PUZZLE    | 27/35   | L        | sugerido    | 2026-09-23 | Tetris Attack / Panel de Pon. Riesgo: timings de cadenas complejos y 6 botones táctiles.                                                                          |
| ESCALADA          | `escalada`          | ARCADE    | 26/35   | L        | sugerido    | 2026-09-23 | Donkey Kong (personajes propios): vigas, escaleras, barriles. Riesgo: el mayor esfuerzo del lote ARCADE.                                                          |
| PIRÁMIDE          | `piramide`          | ARCADE    | 26/35   | M        | sugerido    | 2026-09-23 | Q*bert isométrico. Riesgo: mapeo diagonal de flechas y orden de dibujado isométrico.                                                                              |
| PUÑO NEÓN         | `puno-neon`         | VERSUS    | 26/35   | M/L      | sugerido    | 2026-09-23 | Punch-Out!! vs escalera de rivales CPU. Riesgo: animaciones procedurales y balance de patrones.                                                                   |
| JOYAS RELÁMPAGO   | `joyas`             | PUZZLE    | 26/35   | M        | sugerido    | 2026-09-23 | Bejeweled Blitz (90 s). Riesgo: sin tap directo sobre el canvas el cursor se siente lento.                                                                        |
| CIRCUITO TURBO    | `circuito-turbo`    | VERSUS    | 25/35   | L        | sugerido    | 2026-09-23 | Super Sprint / Micro Machines vs 3 CPU. Riesgo: IA con waypoints + física de derrape; el más costoso.                                                             |
| TUBERÍAS          | `tuberias`          | PUZZLE    | 25/35   | M        | sugerido    | 2026-09-23 | Pipe Mania. Riesgo: ritmo de planificación, techo de puntaje poco evidente.                                                                                       |

## Descartados

| Juego | Slug | Fecha | Motivo |
| ----- | ---- | ----- | ------ |

## Implementados

| Juego      | Slug         | Categoría | Spec                                  |
| ---------- | ------------ | --------- | ------------------------------------- |
| ASTEROIDES | `asteroides` | SHOOTER   | [05](../specs/05-juego-asteroides.md) |
| TETRIS     | `tetris`     | PUZZLE    | [07](../specs/07-juego-tetris.md)     |
| ARKANOID   | `arkanoid`   | ARCADE    | [08](../specs/08-juego-arkanoid.md)   |
| SNAKE      | `snake`      | ARCADE    | [09](../specs/09-juego-snake.md)      |

## Placeholders por reemplazar

- `gloton` — GLOTÓN (ARCADE): laberinto con puntos y fantasmas.
- `invasores` — INVASORES (SHOOTER): filas alienígenas que descienden.
- `ranaria` — RANARIA (ARCADE): cruzar autopista y río.
- `duelo-pixel` — DUELO PIXEL (VERSUS): dos paletas y una pelota.

## Preferencias y criterios del usuario

- _(sin registros todavía)_

## Historial

- 2026-09-23 — Archivo creado con el estado inicial del catálogo.
- 2026-09-23 — Primera sesión de planificación: evaluados los 4 placeholders. Recomendado INVASORES (`invasores`, 32/35); alternativas RANARIA (29) y GLOTÓN (28); DUELO PIXEL (27) queda en espera por su puntaje débil para leaderboard. Estados sincronizados con `registry.ts` (4 implementados).
- 2026-09-23 — Segunda sesión: 20 juegos nuevos en 4 ejes (5 por eje, 4 agentes en paralelo). Top por eje: FUGA NEÓN (ARCADE, 31), TÚNEL VECTORIAL (SHOOTER, 31), CARRETERA NEÓN (VERSUS, 30), COLUMNAS (PUZZLE, 30). Ninguno supera a INVASORES (32), que sigue como recomendado. Pendiente: `CATS` no tiene DEPORTES/CARRERAS; los de ese eje se registraron como VERSUS. Quedó fuera DOCTOR VIRUS (`doctor-virus`, Dr. Mario) por ser un tercer "bloques que caen".
