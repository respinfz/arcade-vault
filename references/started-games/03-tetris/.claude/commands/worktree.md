---
description: Crea un git worktree aislado en .trees/<nombre> y ejecuta ahí las instrucciones dadas
argument-hint: <descripción del trabajo a realizar en el worktree>
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Task
---

## Contexto

Requerimiento del usuario para este worktree:

$ARGUMENTS

## Tu tarea

1. **Determina un nombre** corto en `kebab-case` (2-4 palabras) que resuma el requerimiento de arriba. Ejemplos: `fix-rotacion-nut`, `sonido-menu-pausa`, `refactor-clearlines`. Este será `<nombre>`.

2. **Crea el worktree** con una rama nueva del mismo nombre, partiendo de la rama actual:

   ```bash
   git worktree add .trees/<nombre> -b <nombre>
   ```

   Si `.trees/<nombre>` ya existe, añade un sufijo numérico (`-2`, `-3`, …) al nombre y reintenta.

3. **Asegura que `.trees/` esté ignorado** por git: si `.gitignore` no contiene una línea `.trees/`, añádela (en la raíz del repo principal, no dentro del worktree).

4. **Trabaja exclusivamente dentro de `.trees/<nombre>/`** de aquí en adelante. Todas las rutas de Read/Edit/Write/Bash deben apuntar a ese directorio. No toques archivos del repo principal (`C:\claudes\03-tetris\*` fuera de `.trees/`), salvo el paso 3 del `.gitignore`.

5. **Ejecuta el requerimiento** descrito en el contexto: implementa los cambios, sigue las convenciones de `CLAUDE.md`, y verifica lo que puedas.

6. **Commitea en la rama del worktree** cuando termines (no en `main` ni en la rama principal actual). Deja el worktree listo para revisión; no hagas merge ni push salvo que el requerimiento lo pida.

7. **Reporta**: nombre del worktree, ruta, rama, resumen de cambios y cómo probarlos.

### Notas

- Para eliminar el worktree después: `git worktree remove .trees/<nombre>` y `git branch -D <nombre>`.
- El worktree comparte el `.git` del repo; ramas y commits son visibles desde el repo principal.
