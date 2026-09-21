# Juego de Arkanoid

Juego de Arkanoid construido con HTML, CSS y JavaScript puro — cero dependencias (sin build tools, sin npm, sin bundler).

## Cómo jugar

Abrí `index.html` en el navegador (no requiere servidor ni instalación).

**Controles:**

- `←` / `→` — mover la pala.
- `Espacio` — lanzar la bola / avanzar de nivel / reiniciar al perder o ganar.
- `P` o `Esc` — pausar/reanudar.
- `M` — silenciar/activar los efectos de sonido.

## Estado actual

El juego está implementado según los specs en `specs/`:

- **`specs/01-mvp-arkanoid.md`** — MVP jugable: canvas de 480x640, pala y bola controladas por teclado, colisiones con bloques (15x7, puntaje por color), sistema de vidas, condiciones de victoria/derrota y high score persistido en `localStorage`.
- **`specs/02-sonido-y-niveles.md`** — efectos de sonido en rebotes y roturas de bloques, mute con `M`, y 5 niveles fijos con dificultad progresiva (velocidad de bola, ancho de pala y layouts de bloques con huecos crecientes).

## Estructura

- `index.html` — canvas del juego y carga de scripts.
- `game.js` — todo el juego (estado, loop, colisiones, niveles, render) en un solo archivo, sin módulos.
- `assets/spritesheet.js` — helper para cargar y dibujar sprites (`loadSpritesheet`, `drawSprite`, `drawFrame`) desde `assets/spritesheet-breakout.png`.
- `assets/sounds/` — efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).

## Workflow de desarrollo

Este repo usa un workflow spec-driven (`/spec` y `/spec-impl`, ver `CLAUDE.md` para el detalle). Cualquier feature nueva debe pasar primero por un spec aprobado antes de implementarse.
