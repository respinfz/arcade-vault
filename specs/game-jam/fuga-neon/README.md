# Game jam — FUGA NEÓN

- **Tema:** Ciudad cyberpunk
- **Fecha:** 2026-09-23
- **`game-id`:** `fuga-neon`
- **Título:** FUGA NEÓN
- **Categoría:** `ARCADE`
- **Color / cover:** `magenta` / `.cover-fuga-neon` (clase nueva, sin colisión)
- **Placeholder que reemplaza:** ninguno — es una fila nueva en `av_games`, sin `delete`.

## Concepto

Un mensajero sin licencia huye por las azoteas de una megaciudad bajo la lluvia, saltando entre edificios mientras la ciudad acelera. Es un runner infinito de canvas 800×600, con puntaje por metros recorridos (más bonus según la variante) y controles de uno a tres botones. Retoma la sugerencia `fuga-neon` del `game-planner` (31/35 en `references/game-suggestions-to-do.md`).

Se eligió frente a estos conceptos, puntuados con la misma matriz del `game-planner` (máx. 35):

| Concepto descartado                                                  | Encaje | Motivo                                                                                                                                                       |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cruce de autopista aérea (Frogger cyberpunk, reemplazando `ranaria`) | 29/35  | Reutiliza placeholder y la cruceta de Snake, pero cambiaría el tema del placeholder `ranaria`, que el `game-planner` ya sugirió portar como Frogger clásico. |
| Ciclos de luz (Tron vs CPU, `VERSUS`, reemplazando `duelo-pixel`)    | 25/35  | Cubriría `VERSUS`, pero es casi Snake con rival, y el puntaje para leaderboard (rondas ganadas) es débil.                                                    |

Ningún juego del lote coincide con uno implementado (`asteroides`, `tetris`, `arkanoid`, `snake`) ni descartado.

## Variantes

Las tres comparten el `game-id` `fuga-neon`, así que son **mutuamente excluyentes**: se implementa solo una.

| Variante                                                   | Mecánica/twist                                                                                               | Puntaje                                      | HUD (Vidas/Nivel)                                  | Táctil                                                                      | Esfuerzo | Encaje /35 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- | -------- | ---------- |
| [A — Azotea clásica](variante-a-azotea-clasica.md)         | Solo saltar (altura variable, coyote time). Huecos + 2 obstáculos bajos.                                     | Metros (`distance / 10`)                     | "Vidas" fijo en 1 / nivel cada 800 m               | 1 botón: `.touch-btn-fire` (Saltar, mantener). Sin CSS nuevo.               | S        | 29         |
| [B — Drones y chips](variante-b-drones-y-chips.md)         | Saltar + deslizar. Láseres y drones desbloqueados por nivel. Chips con racha x1–x4. Plataforma de rescate.   | Metros + chips `25 × xN`                     | "Vidas" = 3 reales (corazones) / nivel cada 800 m  | 2 botones: `.touch-btn-fire` + `.touch-btn-drop` (mantener). Sin CSS nuevo. | M        | 31         |
| [C — Hackeo y distritos](variante-c-hackeo-y-distritos.md) | B + pulso EMP (`X`) con carga 0–3 que también es blindaje. 3 distritos cíclicos, torretas, azoteas que caen. | Metros + chips `25 × xN` + EMP (150/50 × xN) | "Carga" 0–3 vía `hudLivesLabel` / nivel = distrito | 3 botones: fire + drop reutilizados + `.touch-btn-hack` nuevo (tap).        | L        | 28         |

Desglose del encaje (puntaje competitivo, rejugabilidad, factibilidad, táctil, estética, diversidad, reutilización):

- **A:** 4 · 4 · 5 · 5 · 4 · 4 · 3 = 29.
- **B:** 5 · 5 · 4 · 5 · 5 · 4 · 3 = 31.
- **C:** 5 · 5 · 3 · 4 · 5 · 4 · 2 = 28.

## Recomendación

**Variante B — Drones y chips.** Es la que mejor encarna el tema (la vigilancia de la ciudad se esquiva con la mecánica, no solo se ve en el fondo). Los chips con multiplicador separan a los jugadores en el leaderboard mejor que los metros solos de la A. Además reutiliza los dos botones táctiles de Tetris sin CSS nuevo y mantiene un esfuerzo M. La C es la más rica, pero su motor es el más grande de la plataforma y su curva de "una vida + carga" necesita balance fino. Puede llegar después como spec de extensión sobre la B (EMP y distritos), sin cambiar el `game-id`.

## Siguiente paso

1. Mover la variante elegida a `specs/10-juego-fuga-neon.md` (el próximo número libre en `specs/` es `10`).
2. Cambiar `SPEC GJ` por `SPEC 10` en el header y quitar "(Variante X: …)" del título.
3. Revisar todas las decisiones marcadas "Decidido por el agente game-jam (tema: Ciudad cyberpunk) — revisar." y confirmarlas o ajustarlas.
4. Pasar el `Status` a `Approved`.
5. Ejecutar `/spec-impl 10-juego-fuga-neon`.
