# Juegos con skins / temas

Registro de juegos de Arcade Vault con skins visuales (estilo `references/started-games/03-tetris/`). Lo mantiene el subagente `skin-designer`.

Persistencia: `localStorage["av_skin:<id>"]` (nunca Supabase). Selector común en `components/jugar/jugar-client.tsx`.

## arkanoid — Arkanoid

- **Fecha:** 2026-09-25
- **Skins:** `retro` (default, flat) · `neon` (glow) · `pastel` (rounded) · `pixel` (pixel)
- **Por skin:**
  - `retro`: canvas `#000`, campo `#0a0a12`; ladrillos rectangulares planos con los colores CSS originales por fila (green/hotpink/magenta/cyan/yellow/red/gray), pala cian `#00f5ff`, bola blanca, HUD blanco. Idéntico al look previo.
  - `neon`: campo `#05050d` con rejilla cian tenue y borde cian con halo; ladrillos con `shadowBlur` del color de su fila y núcleo oscuro (verde, rosa, magenta, cian, amarillo, rojo, lila grisáceo); pala cian con glow y núcleo oscuro; bola amarilla con halo y núcleo blanco; HUD/overlay cian con halo. Halo cian en el marco del CRT.
  - `pastel`: campo violáceo oscuro `#161427` (no el fondo claro de la referencia) con borde lila sutil; ladrillos redondeados con brillo superior en menta/rosa/lila/aqua/crema/coral/gris lavanda; pala celeste tipo cápsula con brillo; bola durazno con reflejo; HUD lila claro.
  - `pixel`: campo `#0a0c18` con rejilla tenue y borde `#2a3050`; ladrillos con textura determinista de celdas de 4 px (luces/sombras), bisel claro y borde oscuro en paleta NES; pala "Vaus" plateada con extremos rojos texturizados; bola rasterizada en celdas de 4 px; HUD amarillo en negrita.
- **Archivos:** `components/games/arkanoid/skins.ts`, `engine.ts` (`setSkin()`, `drawBrick()`/`drawPaddle()`/`drawBall()` por `style`; los ladrillos guardan un color lógico que la skin traduce), `arkanoid-game.tsx` (prop `skin`, teclas ignoradas si el foco está en el `<select>`), `components/games/registry.ts` (`skins`). Reutiliza el selector de `JugarClient` y los halos `.crt[data-skin]` de `app/globals.css`.

## asteroides — Asteroides

- **Fecha:** 2026-09-25
- **Skins:** `retro` (default, flat) · `neon` (glow) · `pastel` (rounded) · `pixel` (pixel)
- **Por skin:**
  - `retro`: fondo `#000` sin estrellas; nave, rocas, balas, partículas y HUD en trazo vectorial blanco; llama naranja abierta. Idéntico al look previo.
  - `neon`: fondo `#05050a` con estrellas tenues azuladas; contornos con `shadowBlur` del color de la entidad y núcleo oscuro (nave cian, rocas magenta/violeta/verde por tamaño grande/mediano/chico, balas amarillas); partículas teñidas con el color de lo que explotó; HUD cian con halo. Halo cian en el marco del CRT.
  - `pastel`: fondo oscuro violáceo `#151324` (no el fondo claro de la referencia); rocas rellenas con contorno suavizado, borde apenas más oscuro y brillo superior (lavanda/rosa/menta); nave celeste con esquinas redondeadas; balas redondas crema; partículas de trazo redondeado; HUD lila claro.
  - `pixel`: fondo `#0a0c18` con estrellas de 2 px; rocas y nave rasterizadas en una rejilla alineada al mundo (celdas 5 px rocas, 3 px nave, 2 px iconos de vida) con textura determinista de luces/sombras y borde oscuro; balas y partículas cuadradas; HUD amarillo en negrita. Marco del CRT más recto.
- **Archivos:** `components/games/asteroids/skins.ts`, `engine.ts` (`setSkin()`, `drawBody()` por `style`), `asteroids-game.tsx` (prop `skin`), `components/games/registry.ts` (`skins`), `components/jugar/jugar-client.tsx` (selector), `app/globals.css` (`.skin-select`, halos `.crt[data-skin]`).

## snake — Snake

- **Fecha:** 2026-09-25
- **Skins:** `retro` (default, flat) · `neon` (glow) · `pastel` (rounded) · `pixel` (pixel)
- **Frutas:** siguen siendo los sprites de `public/games/snake/fruits.png` en todas las skins (multicolores, legibles en oscuro); la skin solo agrega un "plato" (`fruitBack`) debajo.
- **Por skin:**
  - `retro`: fondo `#0a0a12`, grilla `#1c2a22`; serpiente entera verde `#00ff88` en celdas redondeadas (radio 6), sin ojos; fruta sin plato; HUD blanco sobre franja negra translúcida. Idéntico al look previo.
  - `neon`: fondo `#05050a`, grilla cian muy tenue; cuerpo magenta/violeta alternado y cabeza cian con `shadowBlur` y núcleo oscuro; ojos blancos con pupila oscura mirando hacia donde avanza; fruta dentro de un aro amarillo con halo; HUD cian con glow. Halo cian en el marco del CRT (CSS compartido).
  - `pastel`: fondo violáceo oscuro `#151324` (no el fondo claro de la referencia); cuerpo menta/aqua alternado y cabeza rosa, segmentos muy redondeados con brillo superior; ojos redondos; fruta sobre un disco lila translúcido; HUD lila claro.
  - `pixel`: fondo `#0a0c18` con grilla tenue; cuerpo verde en dos tonos y cabeza verde clara con textura determinista de luces/sombras por celda y borde oscuro; ojos cuadrados; fruta sobre baldosa `#1e2340` texturizada; HUD amarillo en negrita.
- **Archivos:** `components/games/snake/skins.ts`, `engine.ts` (`setSkin()`, `drawSegment()`/`drawFruitBack()` por `style`, `drawEyes()`), `snake-game.tsx` (prop `skin`; ignora teclas dirigidas al `<select>`), `components/games/registry.ts` (`skins`). Selector y CSS reutilizados de la plataforma.
