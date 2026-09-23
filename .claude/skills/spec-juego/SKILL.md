---
name: spec-juego
description: Diseña el spec para agregar un juego jugable nuevo (con su leaderboard real) a Arcade Vault. Porta un juego de references/started-games/ o lo diseña desde cero, siguiendo el patrón de SPEC 05 y SPEC 06. Úsalo antes de /spec-impl cuando haya que sumar un juego al catálogo.
disable-model-invocation: true
argument-hint: "<nombre del juego o carpeta de references/started-games/>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /spec-juego — Spec para un juego nuevo con leaderboard

## Session context

Fecha de hoy (úsala para el header del spec, nunca la inventes):
!`date +%F`

Specs que ya existen (para el siguiente número):
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Orígenes portables disponibles en references/started-games/:
!`ls references/started-games/ 2>/dev/null || echo "No hay carpeta references/started-games/"`

Juegos ya portados y si el registry ya existe:
!`ls components/games/ 2>/dev/null || echo "No hay juegos portados todavía"`

Migraciones de Supabase existentes:
!`ls supabase/migrations/ 2>/dev/null || echo "No hay migraciones todavía"`

Clases de cover art ya usadas en app/globals.css:
!`grep -o "^\.cover-[a-z-]*" app/globals.css 2>/dev/null || echo "No se pudo leer app/globals.css"`

---

Este skill produce el spec de **un juego jugable nuevo con motor real y
leaderboard**, listo para que `/spec-impl` lo implemente. **No escribe
código, no toca la base de datos y no crea ni aplica ninguna migración** —
solo el archivo `.md` en `specs/`. La única salida de este comando es ese
archivo.

## Filosofía

Arcade Vault ya resolvió este problema una vez, a mano, en SPEC 05 (portar
Asteroids) y SPEC 06 (catálogo y leaderboard reales en Supabase). Ese
contrato — motor sin globales, componente con `forwardRef`, táctil condicional,
HUD sincronizado, leaderboard data-driven — está destilado en
`platform-contract.md` (en la misma carpeta que este skill). Este skill existe
para que cada juego nuevo respete ese contrato sin tener que releer los dos
specs completos ni reinventar decisiones ya tomadas.

Léelo junto con `template.md` (también en esta carpeta) en la Fase 1: el
primero te da la API exacta que el spec debe describir, el segundo la
estructura exacta que el spec debe tener.

Este skill es una **especialización de `/spec`**, no un reemplazo: antes de
escribir ningún archivo, lee el skill `/spec` (`.claude/skills/spec/SKILL.md`
y su `.claude/skills/spec/template.md`) para heredar sus reglas generales de
formato — el header con blockquote, los estados válidos, "una idea por
oración", "nombres concretos", "sin TODOs", "sin código largo", el criterio de
"cuándo dejar de preguntar", y el modo rápido (spec completo de una vez) vs.
sección por sección. `template.md` de esta carpeta especializa esas reglas
para juegos, pero no las repite todas — si tienes dudas de formato que este
skill no cubre, resuélvelas con lo que dice `/spec`, no improvises.

## Flujo del comando

Responde siempre en el idioma del prompt inicial. Los specs de este repo se
escriben en español, con las etiquetas del header (`Status`/`Depends on`/
`Date`/`Objective`) en inglés — sigue esa misma convención mixta.

### Fase 1 — Contexto

Antes de redactar una sola línea del spec, lee en este orden — es una
secuencia de lecturas obligatoria, no opcional, aunque creas que ya conoces el
contenido:

1. **`.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`** — el
   skill genérico `/spec` del que este comando se especializa. De ahí sale el
   formato base del header, los estados válidos, las reglas globales del
   documento y el criterio de cuándo escribir todo de una vez vs. sección por
   sección. Todo spec de juego debe cumplir esas reglas además de las propias
   de este skill.
2. `CLAUDE.md` y `AGENTS.md` del repo, si no los tienes ya en contexto.
3. `specs/05-juego-asteroides.md` y `specs/06-catalogo-y-leaderboard-supabase.md`
   completos — son el precedente exacto que este spec debe igualar en forma
   (idioma, encabezados, nivel de detalle).
4. `platform-contract.md` y `template.md` de esta misma carpeta — especializan
   lo leído en el paso 1 para el dominio de "agregar un juego".

Del session context de arriba, anota además:

- El siguiente número de spec (el mayor existente en `specs/` + 1, con dos
  dígitos).
- Si `components/games/registry.ts` ya existe (cambia el paso 6 del plan:
  crearlo vs. solo agregar una entrada).
- Los `id` ya usados en juegos portados y las clases `.cover-*` ya
  ocupadas, para no chocar con ellas.

### Fase 2 — Origen del juego

Resuelve `$ARGUMENTS` contra la lista de `references/started-games/` del
session context.

**Si hay una carpeta que coincide** (por nombre exacto o por contenido obvio,
p. ej. `tetris` → `03-tetris`):

1. Lee completos `index.html`, el `game.js` (o el archivo JS principal) y el
   `CLAUDE.md` de esa carpeta. Si existe `style.css`, léelo también.
2. **Regla dura: se porta lo que hace el código, no lo que promete el
   `README.md`.** `references/started-games/02-asteroids/CLAUDE.md` advierte
   explícitamente que su propio README describe power-ups y un asteroide
   "estrella fugaz" que `game.js` nunca implementó — SPEC 05 los dejó fuera de
   alcance por esa razón exacta. Verifica el `CLAUDE.md` de la carpeta elegida
   por si trae la misma advertencia para este juego, y si el README describe
   algo que no ves en el código, no lo incluyas en el scope sin decirlo.
3. Identifica dónde cae este juego en los cinco ejes donde las referencias
   existentes divergen entre sí (son las preguntas caras de la Fase 3):
   - **Resolución del canvas** (tamaño lógico fijo a portar).
   - **HUD in-canvas vs. panel DOM** — si el original usa elementos HTML
     para el marcador (como Tetris), decide qué se porta al `.player-hud` de
     la plataforma y qué se descarta o se simplifica a HUD in-canvas.
   - **Forma del estado** — variables sueltas, objeto único de estado, o
     enum de fases — no importa cuál sea, pero el motor nuevo lo expone igual
     que exige `platform-contract.md` (campos públicos `score`/`level`/etc.).
   - **Timing** — `dt` variable en segundos vs. paso fijo por frame.
   - **Assets/persistencia externos** — sprites, audio, `localStorage` de
     records/skins/opciones. Todo lo que no sea "motor + HUD + leaderboard de
     la plataforma" es candidato a quedar fuera de scope; pregúntalo, no lo
     asumas.

**Si no hay ninguna carpeta que coincida** (juego diseñado desde cero): antes
de seguir, pregunta la mecánica central, la tabla/fórmula de puntaje, cómo
progresan los niveles (si los hay) y la condición exacta de fin de partida.
Sin esto no se puede describir el motor en la Fase 3.

### Fase 3 — Preguntas

Usa `AskUserQuestion` en bloques de 3 a 5, con tu recomendación marcada
primero. Cubre siempre estas categorías (omite una solo si ya quedó resuelta
en la Fase 2):

1. **Ficha de catálogo.** `id` kebab-case (verifica que no choque con los ya
   usados del session context), `title` en mayúsculas, `short`/`long`
   (copy), `cat` ∈ `ARCADE|PUZZLE|SHOOTER|VERSUS`, `color` ∈
   `cyan|magenta|yellow|green`, `best`/`plays` decorativos (número plausible,
   no inventes algo absurdo). Si reemplaza una tarjeta placeholder existente
   del catálogo (como `asteroides` reemplazó a `rocas`), pregúntalo
   explícitamente y anótalo para el `delete` en la migración.
2. **Mapeo al HUD de la plataforma.** Qué campo del motor llena "Vidas" y
   cuál "Nivel" en `.player-hud`. Si el juego no tiene un concepto de vidas
   (p. ej. Tetris), la pregunta no es opcional: ¿se oculta esa columna del
   HUD, se reutiliza con otro rótulo (p. ej. líneas, combo), o se muestra un
   valor fijo? El spec debe cerrar esto.
3. **Recorte de features al portar.** Qué se deja fuera de lo que trae el
   juego original: paneles DOM, menús de pausa propios, selectores de
   skin/tema, tablas de records en `localStorage`, audio. Prioridad: menos es
   más — el reproductor de la plataforma ya cubre pausa/game-over/leaderboard,
   así que la versión propia del juego casi siempre se descarta salvo que el
   usuario pida conservarla.
4. **Controles.** Teclas exactas (mapeo `KeyboardEvent.code`), y el layout
   táctil correspondiente: qué botones, en qué esquina, cuáles son
   "mantener presionado" y cuáles "tap".
5. **Semántica de pausa/reinicio.** Confirma (no asumas) que "PAUSA" debe
   congelar `update(dt)` conservando el último frame dibujado, y que "JUGAR DE
   NUEVO" debe llamar `restart()` del motor real, no solo resetear el estado
   visual del HUD — es el comportamiento estándar de la plataforma desde
   SPEC 05, pero confírmalo si el juego tiene alguna particularidad (p. ej.
   pantalla de inicio propia).

**Cuándo dejar de preguntar:** cuando puedas responder sin inventar nada:
qué archivos van a aparecer o cambiar, cuál es el primer y el último paso
ejecutable, y cómo se verifica que el juego quedó terminado.

### Fase 4 — Escribir el spec

Sigue `template.md` sección por sección. Si ya tienes todo de la Fase 2 y 3
sin haber tenido que asumir nada, escribe el spec completo de una sola vez
(no muestres sección por sección ni pidas confirmación intermedia). Si algo
quedó vago, complétalo sección por sección mostrando cada una y esperando
confirmación antes de seguir — igual que hace `/spec`.

Reglas de contenido específicas de este dominio (además de las de
`template.md`):

- `**Depends on:** SPEC 05, SPEC 06` siempre.
- El bloque SQL de `av_games` va dentro del spec como código — **no lo
  ejecutes, no llames ninguna tool de Supabase.**
- El paso del registry en el plan de implementación depende de lo que viste
  en el session context: "crear `components/games/registry.ts`" solo si
  `components/games/` no lo tiene todavía; si no, "agregar la entrada de
  `<slug>` al registry existente".
- Los criterios de aceptación son siempre booleanos y siguen la base fija de
  `template.md` — amplíalos con lo específico del juego, nunca los recortes.

### Fase 5 — Guardar y parar

1. Determina el número del archivo: mayor existente en `specs/` + 1,
   zero-padded a dos dígitos.
2. Genera el slug kebab-case desde el título del juego (p. ej. `juego-tetris`).
3. Usa la fecha del session context para `**Date:**` — nunca la inventes.
4. Escribe `specs/NN-juego-<slug>.md`. No pidas permiso para escribirlo ni
   preguntes si el nombre está bien — anuncia la ruta en la confirmación
   final. Si el archivo ya existe, avisa en vez de sobreescribir.
5. Estado siempre `Draft`. Nunca lo marques `Approved`.
6. Confirma al usuario:
   - Ruta del archivo creado.
   - Que queda en `Draft` y que debe re-leerlo antes de aprobarlo.
   - Que el siguiente paso es `/spec-impl NN-juego-<slug>`.
   - **Para ahí.** No propongas implementar, no escribas código, no toques
     Supabase.

## Hard rules

- **Nunca escribas el archivo del spec sin haber leído antes
  `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` en esta
  misma sesión** (Fase 1, paso 1). No lo des por sabido de memoria ni lo
  saltees aunque el resto del contexto ya esté completo.
- **Nunca escribas código ni toques `components/`, `app/`, `lib/` o
  `supabase/`.** La única escritura de este comando es el `.md` en `specs/`.
- **Nunca crees ni apliques una migración**, ni uses ninguna tool MCP de
  Supabase. El SQL vive dentro del spec como bloque de código; `/spec-impl`
  lo materializa.
- **Nunca marques el spec como `Approved`.**
- **Porta el código, no el README** de la carpeta de referencia — si divergen,
  gana el `game.js`.
- **Valida colisiones** de `id` contra los juegos ya portados y de clase
  `.cover-<slug>` contra las ya usadas, ambas del session context.
- **No propongas implementar el spec después de guardarlo.** Tu trabajo
  termina con el archivo escrito.

## Arguments

`$ARGUMENTS` es el nombre del juego o el nombre (parcial) de una carpeta de
`references/started-games/`, no necesariamente el slug final del `id` — ese
se confirma en la Fase 3. Si viene vacío, pregunta primero qué juego se quiere
agregar y si viene de una carpeta de referencia o se diseña desde cero.
