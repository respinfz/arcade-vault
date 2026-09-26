# Medición de FPS del reproductor

`measure-fps.js` mide la fluidez de un juego en `/juegos/<id>/jugar` con el MCP de Playwright (`mcp__playwright__browser_run_code_unsafe`), sin dependencias npm nuevas. Se creó para el [SPEC 13](../../specs/13-rendimiento-frogger.md) y sirve para cualquier juego de la plataforma.

## 1. Levantar el build de producción

Mide siempre contra `npm run start`, nunca contra `next dev`: el modo desarrollo añade trabajo (HMR, React en modo dev) que falsea los FPS.

```bash
npm run build
npm run start            # http://localhost:3000
# si el 3000 está ocupado por `npm run dev`:
npx next start -p 3100   # http://localhost:3100
```

## 2. Ejecutar la medición

El MCP ejecuta cada llamada en un sandbox nuevo (sin `process`, `URL`, `setTimeout` ni globales persistentes). Por eso los parámetros se pasan en el **hash de la página actual**:

1. `browser_navigate` a la URL base con `#perf=` y la lista de corridas `juego:skin:modo`, separadas por comas:

   ```
   http://localhost:3000/#perf=frogger:retro:desktop,frogger:glow:mobile
   ```

2. `browser_run_code_unsafe` con `filename: "scripts/perf/measure-fps.js"`.

La URL base de las corridas es el origen de esa página (así funciona igual en `:3000` o `:3100`). Sin `#perf=`, el script mide `RUNS` contra `BASE_URL` (constantes al principio del archivo).

Cada corrida:

1. aplica el modo: viewport, emulación táctil y throttling de CPU por CDP;
2. abre el reproductor, fija `localStorage["av_skin:<id>"]` y recarga;
3. espera 2 s de calentamiento y mide durante 10 s los intervalos entre `requestAnimationFrame`.

Al terminar, el navegador vuelve a escritorio sin throttling ni táctil. Cada corrida tarda unos 15 s (más en modo móvil). El MCP corta las llamadas de alrededor de un minuto (el navegador se cierra con `Target page, context or browser has been closed`), así que agrupa **como mucho 3 corridas por llamada**.

| Modo      | Viewport | Táctil (`(pointer: coarse)`)              | CPU                                             |
| --------- | -------- | ----------------------------------------- | ----------------------------------------------- |
| `desktop` | 1280×800 | no                                        | sin límite                                      |
| `mobile`  | 390×844  | sí (`Emulation.setTouchEmulationEnabled`) | 4× más lenta (`Emulation.setCPUThrottlingRate`) |

Los juegos sin skins ignoran la skin: usa `retro`.

## 3. Resultado

Devuelve un objeto por corrida (o un array si hay varias):

```json
{
  "game": "frogger",
  "skin": "retro",
  "mode": "desktop",
  "avgFps": 60,
  "p95FrameMs": 16.9,
  "maxFrameMs": 17.1,
  "framesOver33ms": 0,
  "frames": 600
}
```

| Campo            | Significado                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| `avgFps`         | Frames medidos ÷ tiempo medido. A 60 Hz, el máximo es ~60.                         |
| `p95FrameMs`     | El 95 % de los frames tardó como mucho esto. A 60 Hz, un frame ideal dura 16,7 ms. |
| `maxFrameMs`     | El peor frame de la ventana (el tirón más grande).                                 |
| `framesOver33ms` | Frames de más de 33 ms: se perdió al menos un refresco, un tirón visible.          |
| `frames`         | Total de frames medidos (para calcular el % de `framesOver33ms`).                  |

## 4. Umbrales del SPEC 13

Cada skin del juego, en ambos modos, debe cumplir:

- `avgFps ≥ 55`
- `p95FrameMs < 20`
- `framesOver33ms ≤ 1 %` de `frames`

## 5. Limitaciones

- El modo `mobile` aproxima un teléfono (CPU 4×, táctil), pero no mide la GPU móvil ni el throttling térmico. Conviene confirmarlo con una prueba manual en un teléfono real.
- Si el navegador no sincroniza `requestAnimationFrame` a 60 Hz, las cifras absolutas se desvían. Compara siempre _antes_ y _después_ en el mismo equipo y el mismo navegador.
- Un pico aislado en `maxFrameMs` (p. ej. una pausa del GC o una carga tardía) es ruido. Si aparece, repite la corrida.
