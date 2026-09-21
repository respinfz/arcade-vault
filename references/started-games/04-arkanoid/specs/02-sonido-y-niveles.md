# SPEC 02 — Sonido y niveles con dificultad progresiva

> **Status:** Implemented
> **Depends on:** SPEC 01 (MVP jugable de Arkanoid)
> **Date:** 2026-09-17
> **Objective:** Agregar efectos de sonido a los rebotes y roturas de bloques, e introducir 5 niveles fijos de dificultad creciente (velocidad de bola, ancho de pala y complejidad del layout) que se atraviesan secuencialmente hasta una pantalla final de "juego completado".

---

## Scope

**In:**

- Reproducir `assets/sounds/ball-bounce.mp3` cuando la bola rebota contra la pared (izquierda/derecha/superior) o contra la pala. No se reproduce al golpear un bloque.
- Reproducir `assets/sounds/break-sound.mp3` cuando un bloque se rompe, junto con la animación de explosión ya existente.
- Control de mute con la tecla `M`: alterna silenciar/activar ambos efectos. Solo vive en memoria (`state.muted`), no se persiste entre sesiones.
- 5 niveles fijos, diseñados a mano, con dificultad creciente en tres ejes:
  - Velocidad de la bola: multiplicador sobre la velocidad base, +15% por nivel (1.00x, 1.15x, 1.30x, 1.45x, 1.60x).
  - Ancho de la pala: -10px por nivel desde 162px, con piso de 80px (162, 152, 142, 132, 122px para los niveles 1-5; el piso de 80px no se alcanza en 5 niveles pero queda como salvaguarda).
  - Layout de bloques: el nivel 1 usa la grilla completa 15x7 del MVP; los niveles 2-5 introducen huecos y patrones cada vez más complejos (definidos abajo en Data model).
- El puntaje por color de bloque se mantiene igual en todos los niveles (gray=1, red=2, yellow=3, cyan=4, magenta=5, hotpink=6, green=7).
- Al romper todos los bloques vivos del nivel actual, se muestra un overlay "Nivel N completado"; Espacio avanza al siguiente nivel, conservando `score` y `lives`, y aplicando el `paddleWidth`, `ballSpeedMultiplier` y `layout` del nuevo nivel.
- Al completar el nivel 5, se muestra un overlay distinto "Juego completado" con el score final y el high score; Espacio reinicia la partida completa desde el nivel 1 (score y vidas reseteados, high score conservado).
- Perder todas las vidas en cualquier nivel dispara el overlay de game over ya existente del MVP, sin cambios de comportamiento.
- El HUD muestra el nivel actual (ej. "Nivel 2/5") junto a score, vidas y high score.
- Cada partida nueva (incluyendo recarga de página) siempre empieza en el nivel 1; no se persiste el nivel entre sesiones.

**Out of scope (para futuros specs):**

- Persistir el nivel actual entre recargas de página.
- Control de volumen o preferencia de mute persistida.
- Niveles generados proceduralmente.
- Bloques resistentes (que requieran más de un golpe).
- Música de fondo.
- Puntaje escalado por nivel (multiplicadores de score).
- Más de 5 niveles o modo infinito.

---

## Data model

Extensiones sobre el `state` del MVP (spec 01):

```js
const state = {
  // ...campos existentes (status, score, lives, highScore, paddle, ball, blocks, explosions)
  level: 1,       // 1..5, nivel actual
  muted: false,   // alternado con la tecla M
};
```

Nuevo estado `status` posible: `'completed'` (además de `'start' | 'playing' | 'paused' | 'gameover' | 'win'`), usado cuando se termina el nivel 5. El `status: 'win'` del MVP queda reemplazado por este flujo de niveles (ya no se usa para una única grilla).

Definición de niveles (nuevo arreglo, vive en `game.js`):

```js
// Cada layout es un arreglo de 7 strings de 15 caracteres (filas de arriba hacia abajo:
// green, hotpink, magenta, cyan, yellow, red, gray). 'X' = bloque presente, '.' = hueco.
const LEVELS = [
  {
    id: 1,
    ballSpeedMultiplier: 1.00,
    paddleWidth: 162,
    layout: [
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
    ],
  },
  {
    id: 2,
    ballSpeedMultiplier: 1.15,
    paddleWidth: 152,
    layout: [
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
      'XXXXXXX.XXXXXXX',
    ],
  },
  {
    id: 3,
    ballSpeedMultiplier: 1.30,
    paddleWidth: 142,
    layout: [
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
      'XXX.XXXXXXX.XXX',
    ],
  },
  {
    id: 4,
    ballSpeedMultiplier: 1.45,
    paddleWidth: 132,
    layout: [
      '..XXXXXXXXXXX..',
      '.XXXXXXXXXXXXX.',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXX',
      '.XXXXXXXXXXXXX.',
      '..XXXXXXXXXXX..',
    ],
  },
  {
    id: 5,
    ballSpeedMultiplier: 1.60,
    paddleWidth: 122,
    layout: [
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
      '.X.X.X.X.X.X.X.',
      'X.X.X.X.X.X.X.X',
    ],
  },
];
```

Sonido (objetos `Audio`, sin nuevos assets ni módulos, viven en `game.js`):

```js
const sounds = {
  ballBounce: new Audio('assets/sounds/ball-bounce.mp3'),
  breakBlock: new Audio('assets/sounds/break-sound.mp3'),
};

function playSound(audio) {
  if (state.muted) return;
  audio.currentTime = 0;
  audio.play();
}
```

Convenciones:

- El color de cada bloque lo determina su fila (igual que en el MVP); el layout solo indica presencia (`X`) o hueco (`.`) por columna, evitando repetir el color en cada celda.
- `state.blocks` se regenera a partir de `LEVELS[state.level - 1].layout` cada vez que empieza una partida o se avanza de nivel, igual que hoy se regenera desde la grilla fija.
- Los valores de `LEVELS` son el punto de partida: los patrones exactos de huecos pueden ajustarse visualmente durante la implementación sin cambiar la intención de este spec (dificultad creciente por velocidad, ancho de pala y complejidad de layout).

---

## Implementation plan

1. Crear los objetos `Audio` para `ball-bounce.mp3` y `break-sound.mp3` en `game.js`, agregar `state.muted = false` y el manejo de la tecla `M` para alternarlo (verificar en consola que el estado cambia, sin afectar todavía el gameplay).
2. Reproducir `ball-bounce.mp3` en cada rebote de la bola contra una pared o contra la pala, respetando `state.muted`.
3. Reproducir `break-sound.mp3` al romper un bloque, junto con la animación de explosión existente, respetando `state.muted`.
4. Agregar el arreglo `LEVELS` con sus 5 configuraciones y `state.level = 1`; generar `state.blocks` a partir de `LEVELS[state.level - 1].layout` en vez de la grilla fija usada en el MVP.
5. Aplicar el `paddleWidth` del nivel actual al iniciar o reiniciar una partida y al avanzar de nivel, recentrando la pala.
6. Aplicar el `ballSpeedMultiplier` del nivel actual a la velocidad base de la bola al lanzarla, tanto al empezar el nivel como al reenganchar la bola tras perder una vida dentro del mismo nivel.
7. Detectar "nivel completado" (todos los bloques del layout actual con `alive: false`) y mostrar el overlay "Nivel N completado" con instrucción de presionar Espacio.
8. Al presionar Espacio en ese overlay: si `state.level < 5`, incrementar `state.level` y regenerar bloques, pala y bola con los parámetros del nuevo nivel, conservando `score` y `lives`; si `state.level === 5`, pasar a `status: 'completed'`.
9. Implementar el overlay de `status: 'completed'` ("Juego completado") mostrando score final y high score; Espacio reinicia la partida completa desde `state.level = 1`, con `score` y `lives` reseteados y `highScore` conservado.
10. Agregar el nivel actual al HUD (ej. "Nivel 2/5"), junto al score, vidas y high score ya existentes.
11. Verificación manual de punta a punta: sonido en cada rebote y rotura, mute con `M`, progresión visible de dificultad nivel a nivel, overlay de nivel completado, y overlay final tras el nivel 5.

---

## Acceptance criteria

- [x] Al rebotar la bola contra una pared o la pala se reproduce `ball-bounce.mp3`; al golpear un bloque no se reproduce este sonido.
- [x] Al romper un bloque se reproduce `break-sound.mp3` junto con la animación de explosión.
- [x] Presionar `M` alterna el mute; con mute activo no suena ningún efecto nuevo hasta desactivarlo.
- [x] Una partida nueva siempre arranca en el nivel 1, con el layout completo (15x7 sin huecos) y la pala en 162px de ancho.
- [x] Al romper todos los bloques del nivel actual se muestra el overlay "Nivel N completado".
- [x] Presionar Espacio en ese overlay avanza a `state.level + 1`, actualiza el layout de bloques, el ancho de la pala y la velocidad de la bola según la configuración del nuevo nivel, y conserva `score` y `lives`.
- [x] El ancho de la pala y la velocidad de la bola son visiblemente distintos entre el nivel 1 y el nivel 5.
- [x] Al completar el nivel 5 se muestra el overlay "Juego completado" (distinto del de nivel intermedio) con el score final y el high score.
- [x] Presionar Espacio en el overlay de "Juego completado" reinicia la partida desde el nivel 1, con score y vidas reseteados y el high score conservado.
- [x] Perder todas las vidas en cualquier nivel muestra el overlay de game over existente, sin cambios respecto al MVP.
- [x] Recargar la página siempre inicia una partida nueva en el nivel 1; el nivel no se persiste.
- [x] El HUD muestra el nivel actual junto a score, vidas y high score.

---

## Decisions

- **Sí:** 5 niveles fijos, diseñados a mano. Da un final claro al juego ("Juego completado") sin la complejidad de generación procedural.
- **Sí:** la dificultad escala en tres ejes combinados: velocidad de bola (+15%/nivel), ancho de pala (-10px/nivel, piso de 80px) y complejidad del layout (huecos crecientes). Recomendado por combinar mecánicas clásicas de Arkanoid sin tocar el modelo de bloques.
- **No:** bloques resistentes (2+ golpes). Se descarta para no expandir el modelo de datos de bloques (`alive` sigue siendo booleano) en este spec.
- **Sí:** `ball-bounce.mp3` solo en pared/pala y `break-sound.mp3` solo en bloques rotos, para evitar que ambos sonidos se superpongan en el mismo impacto contra un bloque.
- **Sí:** mute con la tecla `M`, guardado solo en memoria (`state.muted`), sin persistencia entre sesiones. Suficiente para el alcance pedido, sin agregar otra clave de `localStorage`.
- **No:** puntaje escalado por nivel. Los puntos por color se mantienen iguales en los 5 niveles (gray=1...green=7), consistente con el spec 01.
- **No:** persistencia del nivel actual entre recargas de página. Solo el high score persiste, igual que en el MVP.
- **Sí:** overlay distinto "Juego completado" al terminar el nivel 5, separado del overlay intermedio "Nivel N completado". Reemplaza el `status: 'win'` del MVP, que quedaba pensado para una única grilla.
- **Sí:** al perder una vida dentro de un nivel, la pala y la velocidad de la bola mantienen los parámetros de ese nivel (no vuelven a los del nivel 1).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Rebotes muy seguidos podrían intentar reproducir el mismo `Audio` superpuesto | Se reinicia `currentTime = 0` antes de cada `play()` sobre la misma instancia; un rebote muy inmediato corta el sonido anterior en vez de sonar simultáneo. |
| Política de autoplay del navegador podría bloquear el primer sonido sin interacción previa | Mitigado porque el primer sonido posible siempre ocurre después de que el jugador ya presionó Espacio para lanzar la bola, lo cual cuenta como gesto de usuario. |
| El piso de 80px de ancho de pala nunca se alcanza dentro de los 5 niveles (mínimo real es 122px) | Aceptado: el piso queda como salvaguarda para si se agregan más niveles en un spec futuro, no afecta el comportamiento de esta versión. |

---

## What is **not** in this spec

- Persistencia del nivel actual entre recargas de página.
- Control de volumen o preferencia de mute persistida entre sesiones.
- Niveles generados proceduralmente.
- Bloques resistentes (más de un golpe para romperse).
- Música de fondo.
- Puntaje escalado por nivel.
- Más de 5 niveles o modo infinito.

Cada uno de estos, si se decide implementar, va en su propio spec.
