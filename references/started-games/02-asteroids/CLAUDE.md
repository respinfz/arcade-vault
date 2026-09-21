# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Asteroids arcade clone built with plain HTML5 Canvas and vanilla ES6+ JavaScript — no frameworks, no bundler, no dependencies, no build step. The entire game lives in `game.js`, loaded directly by `index.html`.

## Running

Open `index.html` directly in a browser, or serve it locally:

```bash
npx serve .
```

There is no build, lint, or test tooling in this repo — it's a single static page plus one script.

## Architecture (`game.js`)

The file is organized top-to-bottom as: input handling → math utils → entity classes → global game state → update loop → draw loop → `requestAnimationFrame` driver. There is no module system; everything is a top-level `const`/`class`/`function` in one script, and mutable game state (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`) lives in module-level `let` variables rather than being passed around.

Key points a change is likely to touch:

- **Coordinate space is toroidal.** `wrap(v, max)` wraps positions across both canvas edges (width `W=800`, height `H=600`); every entity's `update()` wraps `x`/`y` through it so movement, spawning, and collision math must account for wraparound.
- **Entities are plain classes with `update(dt)` / `draw()` / a `dead` flag**: `Bullet`, `Asteroid`, `Ship`, `Particle`. Nothing extends a shared base class — the convention is just interface-by-duck-typing. Follow this pattern for any new entity type.
- **Asteroids size down via `split()`**: size `3` (large) → two size `2` (medium) → two size `1` (small, no further split). `RADII`, `SPEEDS`, and `POINTS` arrays are indexed by size (index `0` unused), so any new size tier needs entries in all three.
- **Collision detection is O(n·m) circle-distance checks** done inline in `update()` (bullets×asteroids, ship×asteroids) using `dist()`. There's no spatial partitioning — fine at current entity counts, but a concern if density grows a lot.
- **Game state machine**: `state` is one of `'playing' | 'dead' | 'gameover'`, driven by `killShip()`/`nextLevel()`/`initGame()`. `update()` branches on `state` at the top and returns early for `'dead'`/`'gameover'`, so new mechanics generally belong in the `'playing'` branch.
- **Input**: `keys[code]` is held-state, `justPressed[code]` (read via `pressed(code)`, which consumes it) is edge-triggered — use `pressed()` for one-shot actions (shooting, restart) and `keys[...]` for continuous ones (rotation, thrust).
- **Frame loop**: `loop(ts)` computes `dt` in seconds (clamped to `0.05` max to avoid physics blowups on tab-switch/lag) and calls `update(dt)` then `draw()` each frame.

## Notes

The README (in Spanish) describes power-ups and a "shooting star" asteroid type as included features; neither exists in `game.js` as of this writing. Don't assume README feature descriptions are implemented — check the code.
