---
name: spec-impl-game
description: Implementa un spec aprobado de juego nuevo exactamente igual que /spec-impl y, al terminar, lanza en secuencia (nunca en paralelo) los agentes skin-designer y luego mobile-porter sobre ese juego.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run lint:*), Bash(npm run build:*)
---

# /spec-impl-game — Implementar un juego + skins + móvil

Este comando es `/spec-impl` con dos pasos extra al final. La implementación **no se reescribe aquí**: se delega en el skill `spec-impl`, y solo cuando termina se encadenan los agentes `skin-designer` → `mobile-porter`.

## Session context

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Reglas generales

- Las fases van en orden estricto: **A → B → C → D → E**. No avances si la anterior no terminó bien.
- Los agentes se lanzan **uno después del otro, nunca en paralelo**: `mobile-porter` no se lanza hasta que `skin-designer` haya terminado y lo hayas resumido.
- **Nunca commitees** (ni tú ni los agentes). Commitear es decisión del usuario.
- Si la Fase A se detiene (spec no aprobado, spec no encontrado, el usuario corta la implementación, etc.) **no se lanza ningún agente**.
- Todo el copy hacia el usuario, en **español**.

---

### Fase A — Implementación (delegada a `/spec-impl`)

1. Lee `.claude/skills/spec-impl/SKILL.md` con Read.
2. Ejecuta sus **Fases 1 a 4 al pie de la letra**, usando como argumento `$ARGUMENTS` y como "Session context" el bloque de arriba (es el mismo que usa `spec-impl`). Eso incluye: localizar el spec, validar que su estado significa **Approved** (con su mensaje de error estándar si no), comprobar el working tree, crear/cambiar a la rama `spec-NN-slug` según `AutoCreateBranch`, mostrar el resumen del spec y **pedir confirmación antes de cada paso**.
3. Chequeo extra, justo después de validar el estado (Fase 2 de `spec-impl`): el spec debe **añadir un juego jugable** (nueva carpeta en `components/games/`, entrada en `GAME_REGISTRY` de `components/games/registry.ts` y migración de `av_games`). Si no es así, avisa:

   ```
   ⚠️ Este spec no parece añadir un juego jugable al catálogo.
   /spec-impl-game solo tiene sentido para juegos nuevos (luego lanza skin-designer y mobile-porter).
   Usa /spec-impl [spec] en su lugar.
   ```

   y detente.

4. Al terminar el último paso del plan, **no** muestres el mensaje final de `spec-impl` ("✅ All steps of the plan are implemented…"). En su lugar di:

   ```
   ✅ Todos los pasos del plan están implementados.
   Sigo con la puerta de calidad y después lanzo skin-designer y mobile-porter (en ese orden).
   ```

   y pasa a la Fase B.

---

### Fase B — Puerta de calidad

1. Resuelve el **id del juego** (el `id` de `av_games`, que es la clave de `GAME_REGISTRY`) y su **carpeta**:
   - `git diff components/games/registry.ts` → la entrada nueva y su import.
   - La migración nueva en `supabase/migrations/` que inserta la fila en `av_games`.
   - Ojo: el id no siempre coincide con la carpeta (p. ej. `asteroides` → `components/games/asteroids/`).
2. Ejecuta `npm run lint` y `npm run build`. Si fallan, corrige los errores (son parte de la implementación del spec) y repite hasta que pasen. Los agentes deben partir de un árbol que compila.
3. Muestra:

   ```
   🎮 Juego listo para skins y móvil
   Id:      <id>
   Carpeta: components/games/<carpeta>/
   Rama:    <rama activa>
   Build:   ✅
   ```

---

### Fase C — Agente `skin-designer`

1. Lanza **un único** agente con la herramienta Agent, `subagent_type: "skin-designer"`. Prompt (rellena los valores):

   ```
   Juego: <id> (carpeta components/games/<carpeta>/).
   Acaba de implementarse con el spec specs/<NN-slug>.md en la rama <rama>.
   Diseña e implementa su sistema de skins siguiendo tu contrato (≥3 skins, `retro` por defecto = look actual,
   setSkin() en el engine, `skins` en la entrada del registry, selector compartido en JugarClient,
   persistencia solo en localStorage["av_skin:<id>"]) y regístralo en references/game-with-themes.md.
   Termina con `npm run lint` y `npm run build` en verde.
   No hagas commits.
   ```

2. **Espera la notificación de que el agente terminó.** No lances nada más mientras tanto y no inventes su resultado.
3. Resume al usuario lo que hizo: skins creadas, archivos tocados, estado de lint/build, registro actualizado.
4. Si el agente falló, se detuvo (p. ej. no reconoció el juego) o dejó el build roto → **detente**, informa y pregunta al usuario cómo seguir. No lances `mobile-porter`.

---

### Fase D — Agente `mobile-porter`

Solo cuando la Fase C terminó bien.

1. Lanza **un único** agente con la herramienta Agent, `subagent_type: "mobile-porter"`. Prompt:

   ```
   Juego: <id> (carpeta components/games/<carpeta>/).
   Acaba de implementarse con el spec specs/<NN-slug>.md en la rama <rama> y skin-designer ya le añadió skins
   (selector en JugarClient, `skins` en el registry, setSkin() en el engine): no rompas nada de eso.
   Pórtalo al contrato táctil de SPEC 11 (touch-controls.tsx en .touch-console bajo la CRT, entrada
   TouchControls en el registry, botones ≥56px / ≥64px, sin overlays sobre el canvas) sin tocar escritorio.
   Verifica por emulación táctil a 360×640 y 390×844 en vertical y en escritorio, y regístralo en
   references/mobile-ported-games.md. Termina con `npm run lint` y `npm run build` en verde.
   No hagas commits.
   ```

2. **Espera la notificación de que el agente terminó.**
3. Resume al usuario: archivos tocados, resultado de la verificación en cada viewport, estado de lint/build, registro actualizado.
4. Si falló → informa y detente (no intentes arreglarlo por tu cuenta sin preguntar).

---

### Fase E — Cierre

1. Ejecuta `npm run lint` y `npm run build` una última vez.
2. Muestra `git status --short` con todo lo tocado por la implementación y los dos agentes.
3. Mensaje final:

   ```
   ✅ Juego <id> implementado, con skins y soporte móvil.

   Siguientes pasos (tuyos):
     1. Verifica uno a uno los criterios de aceptación del spec.
     2. Si pasan, cambia su estado a "Implemented" y actualiza references/implemented-games.md si aún no lo está.
     3. Revisa el diff y haz el commit final antes de abrir el PR de esta rama.
   ```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 12-juego-ranaria

  Fase A  →  Delegada a spec-impl: encuentra el spec, valida "Approved",
             crea/cambia a spec-12-juego-ranaria, implementa paso a paso con pausas
  Fase B  →  Resuelve id "ranaria", lint + build en verde
  Fase C  →  skin-designer (espera a que termine) → resumen
  Fase D  →  mobile-porter (solo después de C) → resumen
  Fase E  →  lint + build finales, git status, recordatorio de criterios / estado / commit

/spec-impl-game 13-algo  (estado: Draft / Borrador)

  Fase A  →  spec-impl se detiene con su mensaje de error estándar
             No crea rama, no toca código, no lanza agentes
```
