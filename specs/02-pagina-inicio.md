# SPEC 02 — Página de Inicio (landing) de Arcade Vault

> **Status:** Approved
> **Date:** 2026-09-20
> **Depends on:** SPEC 01
> **Objective:** Implementar la pantalla de Inicio (landing marketing) en `/`, portada desde `references/templates/home-about/home.jsx`, moviendo la Biblioteca (pantalla actual de `/`) a `/biblioteca` y actualizando el nav y los links internos en consecuencia.

## Por qué existe este spec

El spec 01 decidió que `/` renderizara directamente la Biblioteca, ya que en ese momento no existía una pantalla de Inicio separada. `references/templates/home-about/` agrega un nuevo prototipo estático (`home.jsx`, `nav.jsx` con 4 links) donde Inicio y Biblioteca son pantallas distintas. Este spec adopta esa estructura: reserva `/` para la landing de marketing y mueve el catálogo a su propia ruta.

## Scope

**In:**

- Nueva pantalla de Inicio en `/`, portada de `references/templates/home-about/home.jsx`, con sus secciones en orden: Hero (título, subtítulo, CTAs "Explorar juegos"/"Crear cuenta", siluetas pixeladas flotantes decorativas), "¿Por qué Arcade Vault?" (grid de 4 features con íconos pixel-art), "Juegos disponibles ahora" (rail de 6 mini-tarjetas desde `GAMES`, tomadas de `lib/data.ts`, con link a "Ver todos los juegos"), "Stats" (3 bloques de números decorativos), "Actividad en vivo" (ticker de últimas puntuaciones + top 5 jugadores del día, ambos con datos estáticos portados tal cual del template), "Precios" (tarjeta de plan único gratuito + FAQ), CTA final ("¿Listo para jugar?").
- Animación de aparición al hacer scroll (clases `.reveal`/`.reveal.in` vía `IntersectionObserver`), portada tal cual del template.
- Mover el contenido actual de `app/page.tsx` (pantalla Biblioteca: hero, buscador, chips, grid de `GameCard`) a `app/biblioteca/page.tsx`, sin cambios de comportamiento.
- Actualizar `components/nav.tsx`: agregar el link "Inicio" apuntando a `/` (activo sólo en `/` exacto), cambiar el link "Biblioteca" para apuntar a `/biblioteca` (activo en `/biblioteca` y `/juegos/*`, igual que hoy), en el nav de escritorio y en el panel móvil. El logo sigue apuntando a `/`.
- Actualizar todos los links/redirects internos que hoy apuntan a `/` con la intención de "volver al catálogo", para que apunten a `/biblioteca`:
  - `app/juegos/[id]/page.tsx` — botón "Volver al vault".
  - `app/juegos/[id]/jugar/page.tsx` — botón "Volver al vault" (`router.push`).
  - `app/salon-de-la-fama/page.tsx` — botón de volver.
  - `app/auth/page.tsx` — redirect tras iniciar sesión / registrarse / jugar como invitado (`router.push`).
- Los CTAs de la propia pantalla de Inicio que en el template navegan a "biblioteca" (`EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS`, `EMPEZAR GRATIS`, `INSERTAR MONEDA`) apuntan a `/biblioteca`; los que navegan a "auth" (`CREAR CUENTA`) apuntan a `/auth`; el de "salón" (`VER SALÓN →`) apunta a `/salon-de-la-fama`; los clicks en las mini-tarjetas de juego navegan a `/juegos/[id]`.
- Portar a `app/globals.css` los selectores CSS de Inicio ausentes hoy, tomados de `references/templates/home-about/styles.css`: `.home`, `.home-hero*`, `.home-title*`, `.home-sub`, `.home-ctas`, `.home-silos*` y sus `@keyframes float`, `.home-section`, `.section-head`, `.kicker` (regla común), `.section-title`, `.section-rule`, `.feature-grid`, `.feature-card*`, `.mini-rail`, `.mini-card*`, `.home-stats*`, `.stat-*`, `.activity-grid`, `.activity-card*`, `.ac-*`, `.ticker`, `.tick-row`, `.tk-*`, `.top-list`, `.top-row*`, `.tp-*`, `.lb-link`, `.pricing-grid`, `.price-card*`, `.pc-*`, `.pricing-faq`, `.faq-*`, `.home-final*`, `.final-*`, `.reveal`/`.reveal.in`.

**Out of scope (para specs futuros):**

- La pantalla "Acerca de" (`about.jsx`) y su formulario de contacto — no se agrega ningún link "Acerca de" al nav en este spec.
- Cualquier dato real detrás de "Actividad en vivo" / "Top jugadores" (hoy son arrays estáticos hardcodeados, igual que en la referencia; no se conectan a `seededScores` ni a partidas reales).
- Sistema de créditos/monedas funcional (el contador del nav sigue siendo decorativo, sin cambios).
- Lógica real de cualquier juego, autenticación real, persistencia en backend, multijugador, tests automatizados — mismo alcance que excluye el spec 01.

## Data model

Esta pantalla no introduce estructuras de datos nuevas. Reutiliza `GAMES` de `lib/data.ts` (spec 01) para el rail "Juegos disponibles ahora" (primeros 6 elementos, mismo orden que en `GAMES`). El ticker de "Actividad en vivo" y el "Top jugadores" usan arrays literales embebidos en el componente de la página (mismos valores del template: jugador, juego, puntaje, tiempo relativo / ranking), sin persistirse ni tipar en `lib/types.ts`.

## Implementation plan

1. Crear `app/biblioteca/page.tsx` moviendo tal cual el contenido actual de `app/page.tsx` (hero, buscador, chips de categoría, grid de `GameCard`, estado "sin resultados").
2. Reescribir `app/page.tsx` (`"use client"`) portando `references/templates/home-about/home.jsx`: hero con siluetas flotantes, grid de features con íconos pixel-art, rail de mini-tarjetas de juego (`GAMES.slice(0, 6)`, navegando a `/juegos/[id]` con `next/link` o `useRouter`), bloque de stats, sección de actividad (ticker + top jugadores, datos estáticos), sección de precios (tarjeta + FAQ), CTA final. El hook de scroll-reveal (`IntersectionObserver` sobre `.reveal`) vive en un `useEffect` dentro de este archivo.
3. Actualizar `components/nav.tsx`: agregar el link "Inicio" (`href="/"`, activo sólo si `pathname === "/"`) antes de "Biblioteca" tanto en el nav de escritorio como en el panel móvil; cambiar el `href` de "Biblioteca" a `/biblioteca` y su condición de activo a `pathname === "/biblioteca" || pathname.startsWith("/juegos")`.
4. Actualizar los links/redirects que hoy apuntan a `/` para que apunten a `/biblioteca`: `app/juegos/[id]/page.tsx` (botón "Volver al vault"), `app/juegos/[id]/jugar/page.tsx` (`router.push` del botón "Volver al vault"), `app/salon-de-la-fama/page.tsx` (botón de volver), `app/auth/page.tsx` (los dos `router.push` tras login/registro/invitado).
5. Portar a `app/globals.css` los selectores CSS listados en el scope, tomados de `references/templates/home-about/styles.css` (líneas ~925–1070 y ~1620–1700 aproximadamente), sin incluir los selectores exclusivos de `about.jsx` (`.about-*`, `.contact-*`, `.highlight-*`, `.terminal-success`, `.faq` ya cubierto arriba pertenece a home).
6. Recorrer manualmente `/`, `/biblioteca`, y desde ahí navegar a `/juegos/[id]`, `/salon-de-la-fama` y `/auth` con `npm run dev`, confirmar que los botones "volver"/"crear cuenta"/"iniciar sesión" navegan a la ruta correcta, que el nav resalta "Inicio" sólo en `/` y "Biblioteca" en `/biblioteca` y en `/juegos/*`, y que `npm run build` termina sin errores de TypeScript ni ESLint.

## Acceptance criteria

- [ ] `/` muestra la pantalla de Inicio (hero con título/subtítulo/CTAs, siluetas flotantes, sección de features, rail de 6 juegos, stats, actividad en vivo, precios, CTA final), no la Biblioteca.
- [ ] `/biblioteca` muestra el contenido que antes estaba en `/` (hero de biblioteca, buscador, chips, grid completo de `GameCard`), con el mismo comportamiento de filtrado que tenía en spec 01.
- [ ] El botón "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" del Inicio navegan a `/biblioteca`.
- [ ] El botón "CREAR CUENTA" del hero y "EMPEZAR GRATIS →" de precios navegan a `/auth`.
- [ ] El botón "VER SALÓN →" de la sección de actividad navega a `/salon-de-la-fama`.
- [ ] El botón "INSERTAR MONEDA →" del CTA final navega a `/biblioteca`.
- [ ] Click en una mini-tarjeta de juego del rail "Juegos disponibles ahora" navega a `/juegos/[id]` con el `id` correcto.
- [ ] Las secciones marcadas `reveal` aparecen con fade-in al hacer scroll hasta ellas (clase `.in` se agrega vía `IntersectionObserver`).
- [ ] El nav muestra "Inicio" resaltado como activo sólo en `/`, y "Biblioteca" resaltado como activo en `/biblioteca` y en `/juegos/[id]` (con o sin `/jugar`).
- [ ] El logo del nav navega a `/`.
- [ ] El botón "VOLVER AL VAULT" en `/juegos/[id]` y en `/juegos/[id]/jugar` navega a `/biblioteca`.
- [ ] El botón de volver en `/salon-de-la-fama` navega a `/biblioteca`.
- [ ] Enviar el formulario de `/auth` (login, registro, o "jugar como invitado") navega a `/biblioteca` en vez de a `/`.
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** `/` pasa a ser la pantalla de Inicio (landing) y la Biblioteca se muda a `/biblioteca`, revirtiendo la decisión del spec 01 de que `/` fuera directamente la Biblioteca — ahora que existe una landing de marketing separada en la referencia, mantener ambas pantallas en la misma ruta ya no es posible. Decisión confirmada explícitamente por el usuario en la fase de clarificación de este spec.
- **Sí:** portar los arrays estáticos de "Actividad en vivo" y "Top jugadores" tal cual están en `home.jsx` (mismos nombres, puntajes y tiempos), sin generarlos desde `seededScores`/`PLAYERS` — consistente con la decisión ya tomada en spec 01 de portar contenido mock sin inventar datos nuevos. Confirmado explícitamente por el usuario.
- **No:** agregar el link "Acerca de" al nav en este spec — la página `about.jsx` queda fuera de alcance y se implementará en un spec futuro; agregar el link ahora generaría una ruta rota (404). Confirmado explícitamente por el usuario.
- **No:** una ruta `/inicio` separada para la landing — `/` es la convención esperable para la página de entrada de un sitio con landing + catálogo, y es la que se alinea con cómo el nav de la referencia trata "Inicio" como el primer link.
- **Sí:** el hook de scroll-reveal (`IntersectionObserver`) vive inline en `app/page.tsx` en vez de extraerse a un hook reutilizable — sólo esta pantalla lo usa por ahora.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Links externos o marcadores existentes que apuntaban a `/` esperando ver la Biblioteca dejan de funcionar como antes | Es un proyecto en desarrollo sin usuarios reales todavía; se documenta el cambio de ruta en este spec y se actualizan todos los links internos conocidos (paso 4 del plan de implementación). |
| Los datos estáticos del ticker de actividad quedan desincronizados si más adelante cambian los valores de `GAMES` (hoy coinciden con los `best` de cada juego) | Aceptado como parte del alcance "solo visual" de este spec; si se implementa actividad real, será en un spec futuro que reemplace estos arrays por datos dinámicos. |

## Lo que **no** está en este spec

- La pantalla "Acerca de" y su formulario de contacto.
- Datos reales o dinámicos para "Actividad en vivo" y "Top jugadores".
- Sistema de créditos/monedas funcional.
- Lógica real de cualquier juego, autenticación real, backend, multijugador, tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
