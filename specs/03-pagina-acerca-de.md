# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Approved
> **Date:** 2026-09-20
> **Depends on:** SPEC 02
> **Objective:** Implementar la pantalla "Acerca de" en `/acerca-de`, portada tal cual de `references/templates/home-about/about.jsx`, con su formulario de contacto enviando correos reales vía Resend a través de una Server Action.

## Por qué existe este spec

El spec 02 excluyó explícitamente la pantalla "Acerca de" (`about.jsx`) y su formulario de contacto, dejando el link fuera del nav para no generar una ruta rota. Este spec cierra ese pendiente: agrega la pantalla, la conecta al nav, y — a diferencia de todo lo implementado hasta ahora (spec 01 y 02 son 100% estáticos/mock) — le da al formulario de contacto un envío de correo real usando Resend, el primer punto de integración con un servicio externo en el proyecto.

## Scope

**In:**

- Nueva pantalla en `/acerca-de`, portada de `references/templates/home-about/about.jsx`, con sus secciones en orden: Hero ("ACERCA DE ARCADE VAULT", misión, fila de 3 highlights con íconos pixel-art: "Hecho con ❤️ para jugadores", "Juegos en HTML — corren en cualquier navegador", "Proyecto en constante crecimiento"), divisor animado de píxeles, sección de Contacto (intro + 3 tips + formulario: Nombre, Correo electrónico, Mensaje).
- Animación de aparición al hacer scroll (`.reveal`/`.reveal.in` vía `IntersectionObserver`), reutilizando el mismo patrón ya portado en spec 02 (sin duplicar la lógica del hook, se declara localmente igual que en `app/page.tsx`).
- Validación en cliente: shake (animación `.shake` de 400ms) si nombre, correo o mensaje están vacíos, o si el correo no tiene formato válido (regex simple tipo `algo@algo.algo`). Ninguno de estos casos llama a la Server Action.
- Envío real del formulario vía Server Action (`"use server"`) que llama a la API de Resend:
  - Remitente: `onboarding@resend.dev` (dominio de prueba de Resend, no requiere verificar dominio propio).
  - Destinatario: `respinofz@gmail.com` (correo de la cuenta de Resend usada; el dominio de prueba solo permite enviar a ese correo).
  - `reply_to`: el correo que el usuario escribió en el formulario, para poder responderle directo.
  - Asunto: `Nuevo mensaje de contacto — Arcade Vault`. Cuerpo: nombre, correo y mensaje del formulario.
  - La API key se lee de `process.env.RESEND_API_KEY` (variable de entorno, no se commitea).
- Tres estados del formulario tras enviar:
  - **Enviando:** el botón se deshabilita y muestra un texto de carga mientras la Server Action está en curso (`useTransition`).
  - **Éxito:** se reemplaza el formulario por el bloque `terminal-success` del template (con el nombre del usuario interpolado), igual que hoy en el prototipo estático. Incluye el botón "ENVIAR OTRO MENSAJE" que limpia el estado y vuelve a mostrar el formulario vacío.
  - **Error:** si Resend falla (API key inválida, red caída, rate limit, etc.), se muestra un mensaje de error inline dentro de la tarjeta del formulario (estética terminal/pixel, coherente con el resto), el formulario NO se limpia (se conservan nombre/correo/mensaje ya escritos) y el usuario puede reintentar enviando de nuevo.
- Agregar el link "Acerca de" (`href="/acerca-de"`) al nav (`components/nav.tsx`), tanto en el nav de escritorio como en el panel móvil, en la misma posición que el template: después de "Salón de la Fama" y antes del botón de sesión/auth. Activo solo en `pathname === "/acerca-de"`.
- Portar a `app/globals.css` los selectores CSS de "Acerca de"/Contacto ausentes hoy, tomados de `references/templates/home-about/styles.css` (líneas ~1072–1146): `.about`, `.about-hero*`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight*`, `.about-divider`, `.div-bar`, `.div-pixels*`, `@keyframes pxblink`, `.about-contact`, `.contact-grid`, `.contact-intro*`, `.contact-title`, `.contact-sub`, `.contact-tips*`, `.contact-form*`, `@keyframes shake`, `.terminal-success`, `.term-bar*`, `.term-body*`. (`.field`, `.reveal`/`.reveal.in`, `.fade-in`, `.kicker`, `@keyframes blink` ya existen en `app/globals.css` de specs anteriores y se reutilizan sin cambios.)
- Agregar la dependencia `resend` (SDK oficial) a `package.json`.
- Crear `.env.example` documentando `RESEND_API_KEY` (sin valor real), para dejar constancia de la variable requerida sin commitear el secreto.

**Out of scope (para specs futuros):**

- Persistencia de los mensajes de contacto en una base de datos — el mensaje solo se envía por correo, no se guarda en ningún lado del lado de la aplicación.
- Rate limiting o protección anti-spam (captcha, honeypot, límite de envíos por IP) — cualquier visitante puede enviar el formulario las veces que quiera.
- Dominio propio verificado en Resend — se usa el dominio de prueba `onboarding@resend.dev`, con su limitación de solo poder enviar a la cuenta dueña de la API key. Migrar a un dominio propio es un cambio de configuración futuro, no de código.
- Notificaciones o confirmación por correo al usuario que llena el formulario (hoy solo recibe el equipo de Arcade Vault, no hay auto-respuesta al remitente).
- Autenticación real, backend genérico, multijugador, tests automatizados — mismo alcance que excluyen los specs 01 y 02.

## Data model

Esta pantalla no introduce estructuras de datos persistentes nuevas (no hay tabla, archivo ni `lib/types.ts` nuevo). Sí introduce:

- Un tipo de entrada para la Server Action, ej. `type ContactInput = { name: string; email: string; message: string }`, definido junto a la propia action.
- Un tipo de resultado para comunicar éxito/error al cliente, ej. `type ContactResult = { ok: true } | { ok: false; error: string }`.

Ambos viven en `app/acerca-de/actions.ts` (o `lib/actions/contact.ts`, a decidir en implementación siguiendo la convención de carpetas del proyecto), sin persistirse entre requests.

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y agregarla a `package.json`.
2. Crear `app/acerca-de/actions.ts` con la directiva `"use server"`: función `sendContactMessage(input: ContactInput): Promise<ContactResult>` que valida server-side que los tres campos no estén vacíos y que el correo tenga formato válido (defensa en profundidad además de la validación de cliente), instancia `new Resend(process.env.RESEND_API_KEY)`, llama a `resend.emails.send({ from: "onboarding@resend.dev", to: "respinofz@gmail.com", reply_to: input.email, subject: "Nuevo mensaje de contacto — Arcade Vault", text: ... })`, y devuelve `{ ok: true }` o `{ ok: false, error: ... }` según el resultado (sin lanzar excepciones sin capturar hacia el cliente).
3. Crear `app/acerca-de/page.tsx` (`"use client"`) portando `references/templates/home-about/about.jsx`: hero con highlights (`HighlightIcon` con los 3 SVG pixel-art tal cual del template), divisor animado, sección de contacto con el formulario controlado (`name`, `email`, `msg` en estado local). El submit: valida vacíos/formato de correo (dispara `shake` si falla), si pasa llama a `sendContactMessage` dentro de `useTransition`, y según el resultado muestra el estado de éxito (`terminal-success`, con botón "ENVIAR OTRO MENSAJE" que resetea el formulario) o el estado de error (mensaje inline, formulario conservado). El hook de scroll-reveal (`IntersectionObserver` sobre `.reveal`) vive en un `useEffect` local, igual que en `app/page.tsx` (spec 02).
4. Actualizar `components/nav.tsx`: agregar el link "Acerca de" (`href="/acerca-de"`, activo solo si `pathname === "/acerca-de"`) después de "Salón de la Fama" y antes del botón de auth, tanto en el nav de escritorio como en el panel móvil.
5. Portar a `app/globals.css` los selectores CSS listados en el scope, tomados de `references/templates/home-about/styles.css` (líneas ~1072–1146), sin volver a portar `.field`, `.reveal`/`.reveal.in`, `.fade-in`, `.kicker` ni `@keyframes blink` (ya existen).
6. Crear `.env.example` en la raíz del repo con `RESEND_API_KEY=` (sin valor) y una línea de comentario indicando que se obtiene desde el dashboard de Resend.
7. El usuario configura `RESEND_API_KEY` en su `.env.local` local (no commiteado) con su API key real de Resend.
8. Recorrer manualmente `/acerca-de` con `npm run dev`: confirmar que el nav resalta "Acerca de" solo en esa ruta, que las secciones `reveal` aparecen al hacer scroll, que enviar el formulario vacío o con correo inválido dispara el shake sin llamar a Resend, que un envío válido muestra el estado de carga y luego el `terminal-success` con el nombre correcto, que llega el correo real a `respinofz@gmail.com` con `reply-to` al correo ingresado, que "ENVIAR OTRO MENSAJE" limpia el formulario, y que forzar un error (ej. `RESEND_API_KEY` inválida temporalmente) muestra el estado de error conservando los datos escritos. Confirmar que `npm run build` termina sin errores de TypeScript ni ESLint.

## Acceptance criteria

- [ ] `/acerca-de` muestra la pantalla "Acerca de" (hero con misión y 3 highlights, divisor animado, sección de contacto con intro + tips + formulario).
- [ ] El nav muestra "Acerca de" resaltado como activo solo en `/acerca-de`, en el nav de escritorio y en el panel móvil.
- [ ] Enviar el formulario con algún campo vacío dispara la animación `shake` y no envía ningún correo.
- [ ] Enviar el formulario con un correo de formato inválido dispara `shake` y no envía ningún correo.
- [ ] Enviar el formulario con datos válidos muestra un estado de carga mientras se procesa, y no se puede enviar dos veces en simultáneo.
- [ ] Un envío exitoso reemplaza el formulario por el bloque `terminal-success` con el nombre del usuario interpolado en mayúsculas.
- [ ] El correo enviado llega a `respinofz@gmail.com`, con remitente `onboarding@resend.dev`, `reply-to` igual al correo ingresado en el formulario, y el asunto/cuerpo con los datos enviados.
- [ ] El botón "ENVIAR OTRO MENSAJE" del estado de éxito limpia el formulario y permite enviar un nuevo mensaje.
- [ ] Si el envío falla (ej. `RESEND_API_KEY` inválida), se muestra un mensaje de error inline sin perder los datos ya escritos en el formulario, y el usuario puede reintentar.
- [ ] Las secciones marcadas `reveal` aparecen con fade-in al hacer scroll hasta ellas.
- [ ] `.env.example` documenta `RESEND_API_KEY` sin exponer ningún valor real; `.env.local` con la key real no está commiteado (`.env*` ya está en `.gitignore`).
- [ ] `npm run build` completa sin errores de TypeScript ni de ESLint.

## Decisiones tomadas y descartadas

- **Sí:** ruta `/acerca-de` en vez de `/about` — consistente con las rutas en español ya existentes del proyecto (`/biblioteca`, `/salon-de-la-fama`). Confirmado explícitamente por el usuario.
- **Sí:** agregar el link "Acerca de" al nav en este spec, revirtiendo la exclusión explícita del spec 02 — ahora que la ruta existe, ya no genera un 404. Confirmado explícitamente por el usuario.
- **Sí:** usar una Server Action (`"use server"`) en vez de un Route Handler (`app/api/.../route.ts`) para el envío — es el patrón recomendado por Next.js 16 para mutaciones desde formularios, evita definir un endpoint HTTP aparte, y el formulario ya es un componente cliente que puede invocarla directo con `useTransition`. Confirmado explícitamente por el usuario.
- **Sí:** remitente `onboarding@resend.dev` (dominio de prueba de Resend) y destinatario fijo `respinofz@gmail.com`, en vez de configurar un dominio propio — el proyecto no tiene un dominio verificado en Resend todavía; usar el dominio de prueba permite enviar correos reales sin esa configuración adicional, con la limitación conocida de que solo puede enviar al correo dueño de la cuenta de Resend. Confirmado explícitamente por el usuario.
- **Sí:** agregar un estado de error inline con reintento (en vez de un `alert()` del navegador) — el template original solo contempla el camino feliz (mock, sin backend real); al conectar un servicio externo real, los fallos son posibles y un `alert()` rompería la estética pixel/terminal del resto de la pantalla. Confirmado explícitamente por el usuario.
- **Sí:** agregar validación de formato de correo en cliente (regex simple) antes de llamar a la Server Action, además de la validación de campos vacíos que ya traía el template. Confirmado explícitamente por el usuario.
- **No:** guardar los mensajes de contacto en una base de datos o archivo — el alcance de este spec es únicamente el envío por correo; cualquier persistencia queda para un spec futuro si se necesita un historial de mensajes.
- **No:** rate limiting o protección anti-spam — el proyecto está en desarrollo sin tráfico real todavía; se documenta como riesgo aceptado (ver abajo) en vez de resolverse en este spec.
- **Sí:** `RESEND_API_KEY` se lee desde variables de entorno (`.env.local`, no commiteado) en vez de pedirle la key al usuario para escribirla en el código — es una credencial, y `.env*` ya está en `.gitignore` del proyecto. El destinatario (`respinofz@gmail.com`) sí queda hardcodeado en el código (no es secreto) para no introducir una variable de entorno adicional innecesaria.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin dominio propio verificado en Resend, el envío solo funciona hacia `respinofz@gmail.com` — si en el futuro se quiere recibir en otra dirección, hay que verificar un dominio en Resend primero | Aceptado como parte del alcance de este spec; migrar a dominio propio es un spec/tarea de configuración futura, no requiere cambios de código más allá de la variable `to`. |
| Sin rate limiting, el formulario puede ser usado para enviar spam o agotar la cuota gratuita de Resend | Aceptado como riesgo conocido dado que el proyecto no tiene tráfico real todavía; si se vuelve un problema, un spec futuro puede agregar un captcha o límite por IP/sesión. |
| Si `RESEND_API_KEY` no está configurada en `.env.local`, todo envío falla en producción/desarrollo | Mitigado por el estado de error inline (el usuario ve el fallo en vez de una pantalla en blanco o un crash) y por `.env.example` documentando la variable requerida. |

## Lo que **no** está en este spec

- Persistencia de mensajes de contacto en base de datos.
- Rate limiting o protección anti-spam.
- Dominio propio verificado en Resend.
- Auto-respuesta por correo al usuario que llena el formulario.
- Autenticación real, backend genérico, multijugador, tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
