# Game jam — CARRETERA NEÓN

- **Juego pedido:** CARRETERA NEÓN (Road Fighter / Spy Hunter). Retoma la sugerencia `carretera-neon` del `game-planner` (`references/game-suggestions-to-do.md`: `VERSUS`, 30/35, esfuerzo M, "tráfico + rivales CPU + combustible").
- **Tema:** ninguno — las variantes se basan solo en el juego.
- **Fecha:** 2026-09-27
- **`game-id`:** `carretera-neon`
- **Título:** CARRETERA NEÓN
- **Categoría:** `VERSUS`
- **Color / cover:** `yellow` / `.cover-carretera-neon` (clase nueva, sin colisión)
- **Placeholder que reemplaza:** ninguno — es una fila nueva en `av_games`, sin `delete`. El `game-planner` la anotó como "candidato a ocupar `duelo-pixel`". Se descartó porque el copy de `duelo-pixel` promete un Pong y DUELO PIXEL sigue siendo una sugerencia pendiente propia (27/35). Si se prefiere ocuparlo, basta con agregar `delete from av_games where id = 'duelo-pixel';` a la migración y heredar `color: cyan`, `best: 24`, `plays: '4.2K'` (el `best` de 24 es de goles de Pong y no sirve como fallback de este juego).

## Concepto

Carrera vertical nocturna sobre una autopista neón de 4 carriles: el auto del jugador esquiva tráfico civil, se pelea con rivales CPU y administra un tanque de combustible que se vacía. El canvas es 800×600 con la ruta centrada (400 px) y el HUD in-canvas en los márgenes; todo se dibuja con figuras vectoriales, sin assets.

**Encaje con la plataforma: 30/35** (matriz del `game-planner`: puntaje competitivo, rejugabilidad, factibilidad, táctil, estética, diversidad, reutilización). Llena la categoría `VERSUS`, que hoy solo tiene el placeholder `duelo-pixel`. Su punto débil es la reutilización: no hay material en `references/`.

**Adaptaciones necesarias:**

- El "versus" es contra CPU. El riesgo anotado por el `game-planner` ("sin IA rival propia se siente ARCADE") se ataca con IA de rivales en las tres variantes, con más peso de la A a la C.
- Road Fighter tiene dos marchas y Spy Hunter tiene armas. Se reducen a 1–3 acciones además de doblar, para que el táctil quepa en la consola de SPEC 11.
- El combustible, que en el original es el "tiempo" de la partida, entra de forma distinta según la variante: como HUD, como segunda condición de derrota o como recurso por etapa.

## Variantes

Las tres comparten el `game-id` `carretera-neon`, así que son **mutuamente excluyentes**: se implementa solo una.

| Variante                                                         | Mecánica/twist                                                                                                                                                  | Puntaje                                                                            | HUD (Vidas/Nivel)                                            | Táctil                                                                                          | Esfuerzo | Encaje /35 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------- | ---------- |
| [A — Autopista clásica](variante-a-autopista-clasica.md)         | Crucero automático + "a fondo". Rivales "bloqueadores". Chocar cuesta combustible; fin al vaciarse el tanque. Bordes no chocan.                                 | Metros + 100 por adelantamiento + 50 por bidón                                     | "Combustible" (0–100) vía `hudLivesLabel` / nivel cada 3000 m | ◀/▶ en `.touch-controls-move` + `.touch-btn-fire` "A FONDO" (mantener). Layout de Arkanoid, sin CSS nuevo. | S/M      | 28         |
| [B — Embestidas y rebufo](variante-b-embestidas-y-rebufo.md)     | Contacto lateral = empujón y vallas letales: sacar rivales es la fuente de puntos. Embestidores desde nivel 3. Rebufo carga turbo; el turbo destruye rivales.   | Metros + `250 × racha` (x1–x4) por KO + 25 por rozón + 50 por bidón                | 3 vidas reales (corazones) / nivel cada 2500 m               | ◀/▲/▶ + `.touch-btn-fire` "TURBO". Layout de Asteroides, sin CSS nuevo.                          | M        | 31         |
| [C — Gran Premio nocturno](variante-c-gran-premio.md)            | Etapas de 5000 m contra 5 rivales con nombre y personalidad (simulados también fuera de pantalla); llegar entre los 3 primeros o eliminado. Freno, turbo, puente de 3 carriles. | Metros + `100 × etapa` por adelantamiento + bonus por puesto `× etapa` + combustible × 10 | "Posición" (1–6) vía `hudLivesLabel` / nivel = etapa          | ◀/▶ + consola nueva `.touch-pedals` (acelerar, frenar, turbo). CSS nuevo con `/frontend-design`. | L        | 28         |

Desglose del encaje (puntaje competitivo, rejugabilidad, factibilidad, táctil, estética, diversidad, reutilización):

- **A:** 4 · 4 · 5 · 5 · 4 · 4 · 2 = 28.
- **B:** 5 · 5 · 4 · 5 · 5 · 5 · 2 = 31.
- **C:** 5 · 5 · 3 · 3 · 5 · 5 · 2 = 28.

## Recomendación

**Variante B — Embestidas y rebufo.** Es la única que resuelve de lleno el riesgo del `game-planner`: cada rival es un duelo (lo sacas contra la valla o te saca él), y eso justifica la categoría `VERSUS` sin necesitar posiciones ni etapas. La racha de KO multiplicada da un techo de puntaje alto que separa a los expertos en el leaderboard, mejor que los metros de la A. Reutiliza tal cual el layout táctil de Asteroides (sin CSS nuevo) y se queda en esfuerzo M, el que estimó el `game-planner`.

La A es la opción más barata, pero su "versus" es débil: el rival solo estorba. La C es la más rica y la más `VERSUS` de las tres, pero su IA en dos niveles, el rubber-banding y la consola de pedales nueva la llevan a L, con más riesgo de balance. Puede llegar más adelante como spec de extensión sobre la B (modo Gran Premio), sin cambiar el `game-id`.

## Siguiente paso

1. Mover la variante elegida a `specs/14-juego-carretera-neon.md` (el próximo número libre en `specs/` es `14`).
2. Cambiar `SPEC GJ` por `SPEC 14` en el header y quitar "(Variante X: …)" del título.
3. Revisar todas las decisiones marcadas "Decidido por el agente game-jam — revisar." y confirmarlas o ajustarlas. En especial, confirmar si CARRETERA NEÓN va como fila nueva o si reemplaza a `duelo-pixel`.
4. Pasar el `Status` a `Approved`.
5. Ejecutar `/spec-impl 14-juego-carretera-neon` (o `/spec-impl-game 14-juego-carretera-neon` para encadenar `skin-designer` y `mobile-porter`).
