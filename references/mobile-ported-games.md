# Juegos portados a móvil

Registro de juegos de Arcade Vault adaptados al reproductor táctil de SPEC 11 (`specs/11-reproductor-movil-tactil.md`). Lo mantiene el subagente `mobile-porter`. Los juegos portados por el propio SPEC 11 (`asteroides`, `tetris`, `arkanoid`, `snake`) no se listan aquí salvo que se auditen de nuevo.

## frogger — FROGGER

- **Fecha:** 2026-09-26
- **Controles táctiles:** ▲ saltar arriba (tap) · ◀ saltar a la izquierda (tap) · ▶ saltar a la derecha (tap) · ▼ saltar abajo (tap). Cada toque es un salto de una celda (equivale a una pulsación de flecha); no hay acción de "mantener".
- **Layout:** cruceta `.touch-controls-dpad` reutilizada tal cual (la misma de Snake, verde neón), sin CSS nuevo.
- **Verificación:** 360×640 ✅ · 390×844 ✅ · escritorio ✅ (Playwright con `hasTouch`/`isMobile`: botones 56×56 dentro de `.touch-console` bajo `.crt`, un toque = una celda, consola `.is-inactive` en pausa y fin, `visibilitychange` pausa, sin errores de consola; en escritorio sin consola y con teclado funcionando). Desborde horizontal de 42px en ambos viewports causado por el nav global del sitio, igual en Snake: preexistente y fuera del reproductor.
- **Archivos:** `components/games/frogger/touch-controls.tsx` (nuevo), `components/games/frogger/frogger-game.tsx` (handle con `pressUp/pressDown/pressLeft/pressRight`), `components/games/registry.ts` (`TouchControls`).
