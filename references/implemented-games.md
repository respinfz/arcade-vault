# Juegos implementados

Juegos de Arcade Vault con motor real (canvas + `engine.ts` propio), registrados en `components/games/registry.ts`. Todos guardan su puntaje en el leaderboard (`av_scores`), integran el HUD, la pausa y el modal "FIN DEL JUEGO" del reproductor, y muestran controles táctiles en dispositivos `(pointer: coarse)`: `JugarClient` detecta el puntero (`useCoarsePointer()`) y monta el `TouchControls` de cada juego en una consola (`.touch-console`) debajo de la pantalla CRT, nunca sobre el canvas (SPEC 11).

Se omiten los placeholders del catálogo que solo corren la simulación falsa de puntaje (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).

| Juego      | ID           | Categoría | Spec                                  | Ruta                 |
| ---------- | ------------ | --------- | ------------------------------------- | -------------------- |
| ASTEROIDES | `asteroides` | SHOOTER   | [05](../specs/05-juego-asteroides.md) | `/juegos/asteroides` |
| TETRIS     | `tetris`     | PUZZLE    | [07](../specs/07-juego-tetris.md)     | `/juegos/tetris`     |
| ARKANOID   | `arkanoid`   | ARCADE    | [08](../specs/08-juego-arkanoid.md)   | `/juegos/arkanoid`   |
| SNAKE      | `snake`      | ARCADE    | [09](../specs/09-juego-snake.md)      | `/juegos/snake`      |

---

## ASTEROIDES

_Pulveriza rocas espaciales en gravedad cero._

Tu nave triangular flota en un campo de asteroides toroidal. Dispara y rota para partir rocas grandes en fragmentos cada vez más pequeños, esquiva los impactos y sobrevive nivel tras nivel.

- **Código:** `components/games/asteroids/`
- **Teclado:** `←`/`→` rotar · `↑` propulsar · `Espacio` disparar
- **Táctil:** ◀/▶ rotar y ▲ propulsar (mantener presionado) · ● FUEGO (tap)
- **Fin de partida:** la nave se queda sin vidas.
- **Skins:** `retro` (default) · `neon` · `pastel` · `pixel` — ver [game-with-themes.md](game-with-themes.md#asteroides--asteroides).

## TETRIS

_Encaja piezas, limpia líneas y encadena combos explosivos._

Tablero de diez columnas con las piezas estándar más la **tuerca**, una pieza hueca. Cada diez líneas cae un power-up: la **bomba** pulveriza un área 3×3 y el **rayo** barre una fila o columna entera. Limpiar líneas en turnos consecutivos multiplica el puntaje hasta x5.

- **Código:** `components/games/tetris/`
- **Teclado:** `←`/`→` mover · `↓` soft drop · `↑` o `X` rotar · `Espacio` hard drop
- **Táctil:** ◀/▼/▶ (mantener presionado) · rotar (tap) · hard drop (tap)
- **HUD:** muestra **Líneas** en lugar de Vidas.
- **Fin de partida:** una pieza nueva colisiona al aparecer.

## ARKANOID

_Rebota la bola y destruye 5 niveles de muros de neón._

Controlás una pala luminosa que devuelve una bola de plasma contra murallas de bloques. Cinco niveles de dificultad creciente, con paredes cada vez más angostas y una bola cada vez más veloz.

- **Código:** `components/games/arkanoid/`
- **Teclado:** `←`/`→` mover pala · `Espacio` lanzar bola / continuar nivel
- **Táctil:** ◀/▶ mover · lanzar (tap)
- **Fin de partida:** se pierden las tres vidas.
- **Skins:** `retro` (default) · `neon` · `pastel` · `pixel` — ver [game-with-themes.md](game-with-themes.md#arkanoid--arkanoid).

## SNAKE

_Crece comiendo fruta sin morder tu propia cola._

Guía a la serpiente por una grilla neón cazando frutas (21 sprites en `public/games/snake/fruits.png`). Cada fruta vale 10 puntos, alarga la serpiente y acelera el ritmo.

- **Código:** `components/games/snake/`
- **Teclado:** flechas o `W`/`A`/`S`/`D`
- **Táctil:** cruceta de 4 botones ▲/▼/◀/▶ (tap)
- **Fin de partida:** choque contra un borde o contra el propio cuerpo.
- **Skins:** `retro` (default) · `neon` · `pastel` · `pixel` — ver [game-with-themes.md](game-with-themes.md#snake--snake).
