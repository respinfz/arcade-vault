# SPEC 11 — Reproductor móvil táctil

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-25
> **Objective:** Que los juegos jugables de Arcade Vault se jueguen cómodamente en un teléfono con pantalla táctil en vertical: los controles táctiles pasan de estar superpuestos al canvas a una consola debajo de la pantalla CRT montada por `JugarClient`, el HUD se compacta y el reproductor completo (HUD + pantalla + consola) entra en la pantalla sin scroll ni zoom accidentales.

## Por qué existe este spec

Los cuatro juegos con motor real (`asteroides`, `tetris`, `arkanoid`, `snake`) ya tienen `touch-controls.tsx`, pero todos se dibujan **encima** del canvas (`.touch-controls` es `position: absolute; inset: 0` dentro de `.crt-screen`). En un teléfono en vertical de 360px de ancho, la pantalla 4:3 queda de ~255px de alto, y los botones de 44–64px de las esquinas inferiores tapan justo la zona donde se juega (la nave de Asteroides, la pala de Arkanoid, el fondo del pozo de Tetris). Además:

- Cada `touch-controls.tsx` repite la misma detección `useSyncExternalStore` + `matchMedia("(pointer: coarse)")`.
- El reproductor (`.av-player`: `margin: 32px auto`, `padding: 0 24px 64px`, HUD con stats de 16px y cuatro botones) no tiene layout propio para móvil: HUD, pantalla y controles no entran juntos en la pantalla.
- Tocar el canvas o mantener presionado un botón puede hacer scroll, zoom con doble toque, seleccionar texto o abrir el menú contextual del navegador.
- Si el jugador cambia de app o de pestaña a media partida, el juego sigue corriendo y pierde vidas.

Este spec resuelve esos problemas para los 4 juegos actuales y actualiza el contrato de plataforma (`.claude/skills/spec-juego/platform-contract.md`) para que INVASORES (SPEC 10, `Approved`, aún sin implementar) y los juegos futuros nazcan con la consola.

## Scope

**In:**

- Hook compartido `lib/hooks/use-coarse-pointer.ts` (`useCoarsePointer(): boolean`), con la detección actual (`useSyncExternalStore` sobre `matchMedia("(pointer: coarse)")`, snapshot de servidor `false`). Reemplaza la copia duplicada de cada `touch-controls.tsx`.
- `JugarClient` usa `useCoarsePointer()` y:
  - agrega la clase `av-player--touch` a `.av-player` cuando es táctil;
  - renderiza la consola `<div className="touch-console">` **debajo de `.crt`** (fuera de `.crt-screen`) con `<entry.TouchControls gameRef={gameRef} />` adentro, solo si es táctil y `entry?.TouchControls` existe;
  - marca la consola como inactiva (`.touch-console.is-inactive`: atenuada, `pointer-events: none`) mientras `paused` u `over`, para que un toque en pausa no quede encolado en el motor.
- Los 4 `touch-controls.tsx` (`asteroids`, `tetris`, `arkanoid`, `snake`) dejan de detectar el puntero (sin `useSyncExternalStore`, sin `return null`) y siempre renderizan sus botones; se mantienen su markup, sus handlers de "mantener presionado"/"tap", sus `aria-label` y la API de `gameRef`. No se cambia ningún `engine.ts` ni `<slug>-game.tsx`.
- CSS de la consola en `app/globals.css`, diseñado con `/frontend-design` (estética gamepad neón/CRT coherente con el tema):
  - `.touch-console`: bloque en flujo bajo la pantalla, ancho igual al de `.crt`, con el grupo de movimiento a la izquierda y el/los botón(es) de acción a la derecha (o centrado para la cruceta de Snake).
  - `.touch-controls`, `.touch-controls-move`, `.touch-controls-dpad`, `.touch-btn-fire`, `.touch-btn-drop` pasan de `position: absolute` sobre el canvas a layout en flujo dentro de `.touch-console` (se conservan los nombres de clase y el posicionamiento por `:nth-child` de cada grid, para no tocar el markup de cada juego).
  - Botones con área táctil mínima de **56×56px** (acción principal ≥ 64px).
- Layout compacto en `.av-player--touch`:
  - márgenes/padding reducidos de `.av-player`;
  - `.player-hud` en una fila: stats (Jugador, Puntuación, Vidas/Líneas, Nivel) con fuente menor, botones PAUSA/FIN/SALIR en tamaño pequeño y el selector de skin conservado;
  - `.crt-bottom` (tira decorativa "SEÑAL OK · CRT-83 · 60 HZ") oculta;
  - `.crt` con ancho limitado para que HUD + pantalla + consola entren en la altura visible (`100dvh` menos el nav).
- Prevención de gestos accidentales, solo en el reproductor en modo táctil: `touch-action: none`, `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none` y `overscroll-behavior: contain` en `.crt-screen` y `.touch-console`; `onContextMenu={e => e.preventDefault()}` en ambos. El resto del sitio conserva su scroll y zoom normales.
- Pausa automática al perder foco: `JugarClient` escucha `visibilitychange` y, si `document.hidden` y la partida no terminó, hace `setPaused(true)`. No reanuda sola: el jugador pulsa REANUDAR. Aplica a todos los dispositivos y también a los placeholders con simulación falsa.
- Actualizar la documentación del contrato:
  - `.claude/skills/spec-juego/platform-contract.md`, sección "Controles táctiles": la detección y el montaje los hace `JugarClient`; `TouchControls` siempre renderiza; los botones van en la consola, no sobre el canvas; tamaños mínimos nuevos.
  - `references/implemented-games.md` (párrafo introductorio) y la línea de `touch-controls.tsx` en `CLAUDE.md`.

**Out of scope (para specs futuros):**

- Layout dedicado para orientación horizontal (landscape): el reproductor funciona girado, pero sin diseño específico ni aviso de "gira tu dispositivo".
- Pantalla completa (Fullscreen API) y bloqueo de orientación.
- Bloquear el zoom global del sitio (`viewport` con `maximumScale: 1` en `app/layout.tsx`): descartado por accesibilidad.
- Toggle manual para mostrar/ocultar la consola en dispositivos híbridos (laptop táctil, tablet con teclado).
- Controles por gestos (swipe/arrastre sobre el canvas) y vibración (Vibration API).
- Rediseñar los controles de cada juego (qué botones tiene cada uno): se mantienen los actuales.
- Adaptar para móvil el resto de las pantallas (Inicio, Biblioteca, Detalle, Salón de la Fama, Auth, Acerca de) y el modal "FIN DEL JUEGO" más allá de verificar que sigue usable.
- Controles táctiles para los placeholders con simulación falsa (`gloton`, `ranaria`, `duelo-pixel`): no tienen `TouchControls`, así que no muestran consola.
- Implementar INVASORES: SPEC 10 lo hará siguiendo el contrato actualizado aquí.
- Prueba en un teléfono físico: la verificación de este spec es por emulación.
- Tests automatizados — no hay test runner configurado en el repo.

## Data model

Este spec no introduce datos persistidos ni cambios de esquema en Supabase. Lo único nuevo es un hook:

```ts
// lib/hooks/use-coarse-pointer.ts
"use client";

// true en dispositivos cuyo puntero principal es táctil ("(pointer: coarse)").
// Snapshot de servidor false: el primer render (SSR/hidratación) es siempre "no táctil".
export function useCoarsePointer(): boolean;
```

Contrato de `TouchControls` (sin cambios en la firma, sí en la responsabilidad):

```ts
// components/games/<slug>/touch-controls.tsx
export interface TouchControlsProps {
  gameRef: RefObject<XGameHandle | null>;
}
// Siempre renderiza sus botones dentro de <div className="touch-controls">.
// No detecta el tipo de puntero ni se posiciona sobre el canvas: JugarClient
// decide si montarlo y lo coloca dentro de .touch-console.
export function TouchControls({ gameRef }: TouchControlsProps): JSX.Element;
```

Estructura resultante del reproductor en modo táctil:

```
.av-player.av-player--touch
├── .player-hud            (compacto, 1 fila)
├── .crt
│   └── .crt-screen        (canvas + overlay de pausa; sin controles encima)
└── .touch-console[.is-inactive]
    └── .touch-controls    (markup propio de cada juego)
```

## Implementation plan

1. **Hook compartido.** Crear `lib/hooks/use-coarse-pointer.ts` con la lógica de detección que hoy vive en `components/games/asteroids/touch-controls.tsx`. Nada lo usa todavía; `npm run build` pasa.
2. **Consola en `JugarClient`.** En `components/jugar/jugar-client.tsx`: llamar a `useCoarsePointer()`, agregar `av-player--touch` a `.av-player`, sacar `{entry.TouchControls && …}` de `.crt-screen` y renderizarlo dentro de `<div className={"touch-console" + (paused || over ? " is-inactive" : "")}>` después de `.crt`, solo si `isTouch && entry?.TouchControls`. Agregar `onContextMenu` preventivo a `.crt-screen` y `.touch-console`. Como los `touch-controls.tsx` aún detectan por su cuenta, el sistema sigue funcionando (doble chequeo, mismo resultado).
3. **Simplificar los 4 `touch-controls.tsx`.** Quitar `subscribeToPointerType`/`isCoarsePointer`/`isCoarsePointerServerSnapshot`, el `useSyncExternalStore` y el `return null` en `asteroids`, `tetris`, `arkanoid` y `snake`. Markup, handlers y `aria-label` quedan idénticos.
4. **CSS de consola y layout táctil** (con `/frontend-design`). En `app/globals.css`: estilos de `.touch-console` y `.is-inactive`; reescribir `.touch-controls`, `.touch-controls-move`, `.touch-btn`, `.touch-btn-fire`, `.touch-btn-drop` y `.touch-controls-dpad` para layout en flujo dentro de la consola (conservando la asignación de `grid-area` por `:nth-child`), con tamaños ≥ 56px / 64px; reglas `.av-player--touch` para padding, HUD compacto, `.crt-bottom` oculto, ancho máximo de `.crt` según la altura visible, y `touch-action`/`user-select`/`-webkit-touch-callout`/`overscroll-behavior` en `.crt-screen` y `.touch-console`. Verificar que en escritorio (sin `av-player--touch`) el reproductor se ve exactamente igual que antes.
5. **Pausa por visibilidad.** En `JugarClient`, `useEffect` con listener de `visibilitychange` (limpiado al desmontar) que llama `setPaused(true)` cuando `document.hidden && !over`.
6. **Documentación.** Actualizar la sección "Controles táctiles" de `.claude/skills/spec-juego/platform-contract.md`, el párrafo introductorio de `references/implemented-games.md` y la línea de `touch-controls.tsx` en `CLAUDE.md`.
7. **Verificación por emulación** (ver criterios) y `npm run build`.

## Acceptance criteria

- [x] `npm run build` termina sin errores de TypeScript ni ESLint.
- [x] Existe `lib/hooks/use-coarse-pointer.ts` y es el único lugar del repo que consulta `matchMedia("(pointer: coarse)")`.
- [x] Ningún `components/games/*/touch-controls.tsx` contiene `useSyncExternalStore`, `matchMedia` ni `return null`.
- [x] En emulación táctil (Chrome DevTools device mode o Playwright con `hasTouch: true, isMobile: true`), en 360×640 y 390×844 en vertical, para `asteroides`, `tetris`, `arkanoid` y `snake`:
  - [x] ningún botón táctil se superpone al canvas: todos están dentro de `.touch-console`, debajo de `.crt`;
  - [x] cada botón mide al menos 56×56px y el de acción principal (`.touch-btn-fire`) al menos 64×64px;
  - [x] con la página scrolleada al inicio del reproductor, el HUD, la pantalla completa y la consola completa son visibles a la vez sin scroll vertical;
  - [x] el HUD muestra Jugador, Puntuación, Vidas/Líneas, Nivel, PAUSA, FIN, SALIR y (si el juego tiene skins) el selector de skin, sin desbordar horizontalmente;
  - [x] cada control del juego responde según `references/implemented-games.md` ("mantener presionado" se mantiene mientras el dedo está abajo y se suelta al levantarlo o salir del botón; "tap" actúa una vez);
  - [x] tocar/arrastrar sobre el canvas o la consola no hace scroll de la página, no hace zoom con doble toque, no selecciona texto y una pulsación larga no abre el menú contextual;
  - [x] con el juego en pausa o en "FIN DEL JUEGO", la consola se ve atenuada y tocar sus botones no tiene efecto al reanudar/reiniciar;
  - [x] el modal "FIN DEL JUEGO" permite escribir las iniciales, guardar la puntuación y pulsar JUGAR DE NUEVO / VOLVER AL VAULT.
- [x] Sin emulación táctil (escritorio), el reproductor de los 4 juegos no muestra consola ni la clase `av-player--touch`, y su layout es visualmente igual al de antes del spec; el teclado sigue funcionando.
- [x] Los placeholders (`gloton`, `ranaria`, `duelo-pixel`) no muestran consola en modo táctil y su simulación sigue funcionando.
- [x] Al disparar `visibilitychange` con la pestaña oculta durante una partida, el reproductor queda "EN PAUSA" y al volver sigue en pausa hasta pulsar REANUDAR; si la partida ya terminó, el modal no cambia.
- [x] Fuera del reproductor (p. ej. `/biblioteca`), el scroll y el zoom del navegador siguen funcionando normalmente.
- [x] `platform-contract.md`, `references/implemented-games.md` y `CLAUDE.md` describen el nuevo contrato (detección y montaje en `JugarClient`, consola bajo la pantalla).

## Decisions taken and discarded

- **Consola bajo el canvas en vez de overlay.** En vertical el canvas 4:3 deja libre toda la mitad inferior de la pantalla; usarla para los controles evita tapar el juego y permite botones grandes. Descartados: overlay semitransparente (sigue tapando la zona de juego) y layout distinto según orientación (landscape queda fuera).
- **`JugarClient` monta la consola y detecta el puntero.** Centraliza la decisión en un solo lugar y elimina 4 copias de la misma detección. Descartado: que cada juego se reposicione solo por CSS (seguiría duplicando lógica y cada juego nuevo tendría que acordarse).
- **Se conservan los nombres de clase y el markup de cada `touch-controls.tsx`.** Solo cambia su CSS, así que el cambio en los juegos se limita a borrar la detección. Descartado: rediseñar los botones de cada juego.
- **Detección con `(pointer: coarse)`, sin toggle manual.** Es el criterio actual y cubre teléfonos y tablets. Los dispositivos híbridos quedan para otro spec.
- **Prevención de gestos solo en el reproductor.** `touch-action`/`user-select` en `.crt-screen` y `.touch-console`. Descartado: `maximumScale: 1` global en `viewport`, que rompe el zoom de accesibilidad en todo el sitio.
- **Pausa automática por `visibilitychange`, sin reanudación automática.** Evita perder vidas al recibir una llamada o cambiar de app. Aplica también en escritorio porque la lógica vive en `JugarClient` y el comportamiento es deseable en ambos.
- **Consola inactiva en pausa/fin.** Evita que un toque en pausa quede encolado en el motor (p. ej. un disparo de Asteroides) y se ejecute al reanudar.
- **`.crt-bottom` oculto en modo táctil.** Es decorativo y ocupa altura que en un teléfono hace falta para que la consola entre sin scroll.
- **Verificación solo por emulación.** Decisión del usuario; no se exige teléfono físico.

## Identified risks

- **La emulación no cubre todo.** DevTools/Playwright no reproducen el rebote de scroll de iOS Safari, la barra de direcciones que cambia `100dvh` ni la latencia real de los toques. Mitigación: usar `dvh` y `touch-action`/`overscroll-behavior` estándar; si aparece un problema en un teléfono real, se corrige en un spec aparte.
- **Dispositivos híbridos.** Una laptop táctil con mouse reporta `pointer: fine` y no verá la consola; una tablet con teclado Bluetooth sí la verá. Queda aceptado (toggle manual fuera de alcance).
- **Handlers `onPointerLeave` en botones más grandes.** Con el layout nuevo, arrastrar el dedo de ◀ a ▶ sigue soltando ◀ (por `onPointerLeave`) pero no presiona ▶ hasta un toque nuevo. Es el comportamiento actual; no se cambia.
- **SPEC 10 (INVASORES) describe el contrato viejo** ("visibles solo con `matchMedia`", overlay sobre el canvas). Al implementarlo después de este spec, su `touch-controls.tsx` debe seguir el contrato nuevo de `platform-contract.md` (sin detección propia); si se implementa antes, hay que simplificarlo como los otros 4.
- **Regresión visual en escritorio.** Reescribir las clases `.touch-*` y agregar reglas al reproductor podría alterar el layout de escritorio. Mitigación: todas las reglas nuevas del reproductor van bajo `.av-player--touch` o `.touch-console`, que no existen en escritorio.
