# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implemented
> **Depends on:** Ninguno (primer spec del proyecto)
> **Date:** 2026-09-17
> **Objective:** Construir una versión mínima jugable de Arkanoid, con un nivel fijo de bloques, pala y bola controladas por teclado, sistema de vidas y puntaje, y persistencia del high score en localStorage.

---

## Scope

**In:**

- Canvas de 480x640 px con pala, bola y una grilla fija de bloques (15 columnas x 7 filas, sin huecos, tamaño nativo del sprite 32x16).
- Movimiento de la pala por teclado (flechas izquierda/derecha), limitado a los bordes del canvas.
- Bola que arranca pegada a la pala y se lanza con la tecla Espacio; rebota en paredes izquierda/derecha/superior y en la pala con ángulo de rebote variable según el punto de impacto.
- Colisión bola-bloque: el bloque impactado se rompe, suma puntos según su color y dispara la animación de explosión (`EXPLOSION_FRAMES`, 4 frames / 150ms) ya disponible en `assets/spritesheet.js`.
- Puntaje por color: gray=1, red=2, yellow=3, cyan=4, magenta=5, hotpink=6, green=7. Filas ordenadas de arriba hacia abajo: green, hotpink, magenta, cyan, yellow, red, gray.
- Sistema de vidas: 3 vidas iniciales. Si la bola cae por debajo de la pala se pierde una vida y la bola se reengancha a la pala (si quedan vidas).
- Condición de derrota (0 vidas) y de victoria (los 105 bloques rotos), cada una con su overlay dibujado en el canvas.
- Pantalla de inicio con overlay en canvas ("Presiona ESPACIO para empezar") y high score guardado.
- Pausa con la tecla P o Escape, que congela la actualización del juego y muestra un overlay "PAUSA".
- HUD (score, vidas, high score) dibujado en la parte superior del canvas durante la partida.
- Persistencia del high score en `localStorage`, bajo una clave versionada.
- Reinicio de partida desde las pantallas de game over/victoria presionando Espacio, conservando el high score.
- Reutilización de `assets/spritesheet.js` y `assets/spritesheet-breakout.png` para dibujar pala, bola, bloques y explosiones, sin introducir un bundler ni módulos.

**Out of scope (for future specs):**

- Sonido (`assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3`), aunque los assets ya existen en el repo.
- Power-ups (agrandar pala, multi-bola, etc.).
- Múltiples niveles o progresión de niveles.
- Control de la pala por mouse o táctil.
- Ranking histórico de puntajes (solo se guarda el mejor puntaje, no una lista).
- Aumento progresivo de la velocidad de la bola u otras mecánicas de dificultad creciente.

---

## Data model

```js
// Estado global del juego (un único objeto mutable, sin persistencia salvo highScore)
const state = {
  status: 'start', // 'start' | 'playing' | 'paused' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  highScore: 0, // se carga desde localStorage al iniciar

  paddle: { x: 159, y: 600, w: 162, h: 14, speed: 6 }, // speed en px/frame

  ball: {
    x: 240, y: 592, w: 16, h: 16,
    vx: 0, vy: 0,
    attached: true, // true mientras está pegada a la pala, sin lanzar
  },

  blocks: [
    // 15 columnas x 7 filas = 105 bloques
    // { x, y, w: 32, h: 16, color: 'green', points: 7, alive: true }
  ],

  explosions: [
    // animaciones de explosión en curso
    // { x, y, color, startTime }
  ],
};
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda.
- Velocidades en píxeles/frame (el juego asume ~60fps vía `requestAnimationFrame`, sin corrección por deltaTime en este MVP).
- Los bloques se generan una vez al iniciar/reiniciar la partida, llenando el ancho del canvas (15 x 32px = 480px) sin márgenes entre columnas.

Persistencia (`localStorage`):

```js
// Clave: 'arkanoid:highScore:v1'
// Valor: JSON.stringify({ value: number })
```

La clave versionada (`:v1`) permite migrar el formato en el futuro sin romper partidas guardadas previamente.

---

## Implementation plan

1. Crear `index.html` con el `<canvas>` de 480x640, cargando `assets/spritesheet.js` y un nuevo `game.js` vía `<script>` planos (sin módulos). Al cargar, llamar `loadSpritesheet` y dibujar una escena estática (pala centrada, bola sobre la pala, grilla de 105 bloques por color) para verificar visualmente que los assets se leen bien.
2. Implementar el bucle principal (`requestAnimationFrame`) y el estado inicial `status: 'start'`: overlay en canvas con título y "ESPACIO para empezar", mostrando el high score leído de `localStorage` (0 si no existe).
3. Implementar el movimiento de la pala con `ArrowLeft`/`ArrowRight`, limitado a los bordes del canvas.
4. Implementar el lanzamiento de la bola con Espacio (pasa de `attached: true` a `false` con una velocidad inicial) y su movimiento en línea recta, con rebote en las paredes izquierda, derecha y superior.
5. Implementar la colisión bola-pala con ángulo de rebote variable: el punto de impacto respecto al centro de la pala determina el ángulo de salida.
6. Implementar la colisión bola-bloques: al impactar un bloque vivo, marcarlo `alive: false`, sumar sus puntos al `score`, y agregar una entrada a `state.explosions` para reproducir `EXPLOSION_FRAMES` en esa posición.
7. Implementar la pérdida de vida: si la bola cae por debajo de la pala, decrementar `lives`, reenganchar la bola a la pala (`attached: true`) si quedan vidas, o pasar a `status: 'gameover'` si `lives` llega a 0.
8. Implementar la condición de victoria: cuando todos los bloques tienen `alive: false`, pasar a `status: 'win'`.
9. Implementar los overlays de game over y victoria en canvas, mostrando el score final, el high score y "ESPACIO para reiniciar"; al presionar Espacio en estos estados, regenerar `blocks`, `score`, `lives` y la bola, conservando `highScore`.
10. Implementar la persistencia del high score: leer `arkanoid:highScore:v1` al cargar la página; cada vez que `score` supere `highScore`, actualizar el estado y reescribir la clave en `localStorage`.
11. Implementar la pausa con `P`/`Escape`: alterna entre `playing` y `paused`, deteniendo la actualización (no el dibujado) y mostrando un overlay "PAUSA" sobre el último frame.
12. Implementar el HUD (score, vidas, high score) dibujado en la franja superior del canvas durante `playing` y `paused`.

---

## Acceptance criteria

- [ ] Abrir `index.html` en el navegador no genera errores en la consola.
- [ ] Las flechas izquierda/derecha mueven la pala sin que salga de los límites del canvas.
- [ ] Presionar Espacio en la pantalla de inicio comienza la partida con la bola pegada a la pala.
- [ ] Presionar Espacio con la bola pegada la lanza en línea recta hacia arriba.
- [ ] La bola rebota correctamente en las paredes izquierda, derecha y superior sin salir del canvas.
- [ ] El ángulo de rebote de la bola en la pala varía según si el impacto es en el centro o en los extremos.
- [ ] Al romper un bloque se suma el puntaje correspondiente a su color (gray=1, red=2, yellow=3, cyan=4, magenta=5, hotpink=6, green=7) y se reproduce la animación de explosión de 4 frames en esa posición.
- [ ] Si la bola cae por debajo de la pala y quedan vidas, se pierde una vida y la bola se reengancha a la pala.
- [ ] Al llegar a 0 vidas se muestra la pantalla de game over con el score final y el high score.
- [ ] Al romper los 105 bloques se muestra la pantalla de victoria con el score final y el high score.
- [ ] El high score persiste tras recargar la página (se lee de `localStorage` al iniciar).
- [ ] Presionar `P` o `Escape` durante la partida pausa el juego y muestra "PAUSA"; presionar de nuevo reanuda.
- [ ] Presionar Espacio en la pantalla de game over o victoria reinicia una partida nueva (bloques, score y vidas reseteados) conservando el high score.

---

## Decisions

- **Sí:** control de la pala solo por teclado (flechas). Mantiene el MVP simple con un único modo de input; mouse queda fuera de alcance.
- **Sí:** un único nivel fijo (15x7 bloques). Suficiente para un MVP jugable de punta a punta sin definir un sistema de progresión de niveles.
- **No:** power-ups. Se deja para un spec futuro; el foco de este MVP es el loop base de rebote/ruptura/puntaje.
- **Sí:** 3 vidas iniciales. Estándar del género Arkanoid/Breakout.
- **Sí:** overlays de inicio/pausa/game over/victoria dibujados directamente en el canvas, sin HTML/CSS superpuesto. Evita mezclar dos sistemas de renderizado y es consistente con el stack sin dependencias.
- **Sí:** pausa con `P`/`Escape`. Necesaria para que el MVP sea cómodamente jugable.
- **Sí:** ángulo de rebote variable en la pala según punto de impacto. Es el comportamiento esperado en Arkanoid clásico.
- **Sí:** puntos por color en escala 1-7 (gray a green), con las filas ordenadas de mayor a menor puntaje de arriba hacia abajo. Recompensa llegar a las filas superiores.
- **No:** sonido en este MVP. Los assets (`ball-bounce.mp3`, `break-sound.mp3`) ya existen en el repo pero se integran en un spec posterior para no ampliar el alcance ahora.
- **Sí:** grilla de bloques a tamaño nativo del sprite (32x16), sin huecos, 15 columnas cubriendo exactamente los 480px de ancho del canvas. Evita tener que escalar sprites o calcular márgenes.
- **Sí:** `localStorage` con clave versionada (`arkanoid:highScore:v1`) guardando solo el mejor puntaje. No hay necesidad de un historial ni de IndexedDB para un solo número.
- **No:** aumento progresivo de la velocidad de la bola u otra mecánica de dificultad creciente. No fue pedido y ampliaría el alcance del MVP.
- **No:** corrección de movimiento por deltaTime. El MVP asume ~60fps vía `requestAnimationFrame`; se documenta como limitación conocida en vez de resolverse ahora.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado o bloqueado (modo privado) | El juego sigue funcionando en memoria; si falla la lectura/escritura, `highScore` simplemente no persiste entre sesiones. |
| Falla de carga de `assets/spritesheet-breakout.png` (ruta incorrecta, `file://` bloqueado) | `spritesheet.js` ya loguea el error en consola (`console.error('Failed to load spritesheet')`); el criterio de aceptación de "sin errores en consola" detecta este caso durante la verificación manual. |
| Velocidad de fotogramas variable entre navegadores/monitores (sin deltaTime) | Riesgo aceptado y documentado en Decisions; queda como candidato a revisar en un spec futuro si se nota game feel inconsistente. |

---

## What is **not** in this spec

- Sonido (aunque los assets ya están disponibles en `assets/sounds/`).
- Power-ups.
- Múltiples niveles o progresión de niveles.
- Control por mouse o táctil.
- Ranking histórico de puntajes.
- Aumento progresivo de dificultad (velocidad de la bola, etc.).

Cada uno de estos, si se decide implementar, va en su propio spec.
