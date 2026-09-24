# Game jam — INVASORES

- **Juego pedido:** INVASORES (estilo Space Invaders).
- **Tema:** ninguno impuesto — estética neón/CRT de la plataforma.
- **Fecha:** 2026-09-23
- **`game-id`:** `invasores`
- **Título:** INVASORES
- **Categoría:** `SHOOTER`
- **Color / cover:** `green` / `.cover-invasores` (reemplaza a `.cover-invaders`; la A solo la renombra, la B y la C la rediseñan con `/frontend-design`).
- **Placeholder que reemplaza:** `invasores` (mismo `id`): `delete` + `insert`, heredando `color: green`, `best: 54190` y `plays: "18.0K"`. El `delete` borra en cascada los puntajes de `av_scores` que haya dejado la simulación falsa.
- **Sugerencia que retoma:** retoma la sugerencia `invasores` del `game-planner` (`references/game-suggestions-to-do.md`, 32/35, esfuerzo M, estado "recomendado").

## Concepto

Un cañón defiende el suelo de una formación de alienígenas de neón que marcha de lado a lado y baja un escalón en cada borde, cada vez más rápido a medida que quedan menos. El cañón se cubre tras escudos destructibles, derriba un OVNI misterioso para sumar un bonus y resiste oleadas infinitas. Es el primer SHOOTER de "defensa fija" de la plataforma, complementario a ASTEROIDES (movimiento libre y toroidal).

**Encaje con la plataforma (matriz del `game-planner`): 32/35.** Puntaje competitivo claro (puntos por alien + OVNI), rejugabilidad alta (oleadas infinitas), canvas 800×600 natural, un jugador, sin dependencias ni assets (los aliens son bitmaps de píxeles definidos en código), controles de pocos botones que reutilizan clases táctiles existentes, y reemplaza un placeholder.

**Adaptaciones necesarias (todas resueltas en las variantes):**

- No hay material en `references/started-games/` ni `references/source-assets/`: el motor se diseña desde cero.
- El `id` nuevo coincide con el del placeholder (a diferencia de SPEC 07/08/09): `delete` + `insert` del mismo `id`.
- El nombre de la clase `.cover-invaders` no sigue la convención `.cover-<id>`: pasa a `.cover-invasores`.
- Mover y disparar a la vez en móvil exige multitouch: FUEGO es de tipo "mantener" en las tres variantes.
- La marcha acelerada (el último alien va muy rápido) y las balas rápidas exigen pasos acotados y colisión barrida para no atravesar objetivos con `dt` de hasta 0,05 s.

## Variantes

Las tres comparten el `game-id` `invasores`, así que son **mutuamente excluyentes**: se implementa solo una.

| Variante                                                   | Mecánica/twist                                                                                                                                                                                             | Puntaje                                                                           | HUD (Vidas/Nivel)                                                       | Táctil                                                                                          | Esfuerzo | Encaje /35 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------- | ---------- |
| [A — Clásico](variante-a-clasico.md)                       | Space Invaders 1978: una bala propia a la vez, 5×11 aliens, 4 escudos, OVNI, oleadas que empiezan más abajo.                                                                                               | 10/20/30 por alien + OVNI 50–300. Vida extra a los 1500.                          | "Vidas" = 3 reales (corazones) / nivel = oleada                         | ◀/▶ (`.touch-controls-move`, slots 1 y 3) + FUEGO (`.touch-btn-fire`, mantener). Sin CSS nuevo. | S        | 31         |
| [B — Sobrecarga y racha](../../10-juego-invasores.md) ✅ elegida | Clásico + ráfaga de hasta 3 balas limitada por calor (bloqueo de 1,6 s al 100%) + racha de aciertos que multiplica x1–x5; fallar la corta.                                                                 | Base × multiplicador (alien y OVNI) + bonus `100 × oleada`. Vida extra cada 5000. | "Vidas" = 3 reales (corazones) / nivel = oleada; calor y `xN` in-canvas | Igual que A. Sin CSS nuevo.                                                                     | M        | 32         |
| [C — Asedio de la nodriza](variante-c-asedio-nodriza.md)   | B sin calor + 3 formaciones rotativas, aliens blindados y divisores (minis en zigzag), nodriza cada 5 oleadas, cápsulas del OVNI (doble/blindaje/bomba), bomba, asalto que hace retroceder a la formación. | Base × multiplicador + nodriza `1000 × n` + bonus de oleada.                      | "Blindaje" 0–5 vía `hudLivesLabel` / nivel = oleada                     | ◀/▶ + FUEGO (mantener) + BOMBA (`.touch-btn-drop` reutilizado, tap). Sin CSS nuevo.             | L        | 30         |

Desglose del encaje (puntaje competitivo, rejugabilidad, factibilidad, táctil, estética, diversidad, reutilización):

- **A:** 4 · 4 · 5 · 5 · 4 · 4 · 5 = 31.
- **B:** 5 · 5 · 4 · 5 · 5 · 4 · 4 = 32.
- **C:** 5 · 5 · 3 · 4 · 5 · 4 · 4 = 30.

## Recomendación

**Variante B — Sobrecarga y racha.** Conserva intacto el Space Invaders reconocible de la A (formación, escudos, OVNI, 3 vidas) y le agrega una sola idea que cambia cómo se juega: la ráfaga con calor más la racha que se corta al fallar. Eso convierte cada disparo en una decisión y separa mucho mejor a los jugadores en el leaderboard que la tabla fija 10/20/30 de la A. Además hace el juego más amable en móvil que una sola bala. No agrega CSS de controles ni cambia el HUD del reproductor, y se mantiene en el esfuerzo M que estimó el `game-planner`. La A es una buena opción si se prioriza entregar rápido. La C es la más rica, pero su motor sería el más grande de la plataforma y su balance (Blindaje, asaltos, cápsulas) necesita varias iteraciones. Sus sistemas pueden llegar después como spec de extensión sobre la B, sin cambiar el `game-id`.

## Siguiente paso

1. Mover la variante elegida a `specs/10-juego-invasores.md` (el próximo número libre en `specs/` hoy es `10`; si antes se aprueba otra jam, como `fuga-neon`, usar el siguiente libre).
2. Cambiar `SPEC GJ` por `SPEC 10` en el header y quitar "(Variante X: …)" del título.
3. Revisar todas las decisiones marcadas "Decidido por el agente game-jam — revisar." y confirmarlas o ajustarlas.
4. Pasar el `Status` a `Approved`.
5. Ejecutar `/spec-impl 10-juego-invasores`.
