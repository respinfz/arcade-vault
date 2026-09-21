# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is an **Arkanoid game** built with plain HTML, CSS, and JavaScript — **zero dependencies** (no build tools, no npm packages, no bundler). The game is implemented: `index.html` loads `assets/spritesheet.js` and `game.js`, which contains the entire game (state, update loop, rendering, input) in a single file, plain `<script>` style with no modules.

Specs implemented so far (see `specs/`):
- `specs/01-mvp-arkanoid.md` — MVP: 480x640 canvas, paddle/ball/block collisions, lives, score, win/lose overlays, high score in `localStorage`.
- `specs/02-sonido-y-niveles.md` — sound effects (bounce/break), mute toggle (`M`), and 5 fixed levels with increasing ball speed, shrinking paddle width, and progressively sparser block layouts.

Both are marked `Implemented`. Check `specs/` before assuming architecture or scope — it reflects the actual data model (levels, scoring, layouts) more precisely than skimming `game.js` alone.

## Development workflow: spec-driven

This repo uses a two-phase, spec-driven workflow imported as custom skills (see `skills-lock.json`, sourced from `Klerith/fernando-skills`):

- **`/spec <description>`** (`.agents/skills/spec/SKILL.md`) — turns a feature description into a written spec through a clarifying-questions phase, then writes `specs/NN-slug.md` (numbered sequentially, using `.agents/skills/spec/template.md` as the structure). New specs start in `Draft` state and must be manually marked `Approved` by a human before implementation.
- **`/spec-impl <NN-slug>`** (`.agents/skills/spec-impl/SKILL.md`) — implements an `Approved` spec. It refuses to run on any other state (`Draft`, `In review`, `Implemented`, `Obsolete`). On success it creates/switches to a git branch named `spec-NN-slug` (controlled by `AutoCreateBranch` in `specs/.spec-config.yml`, default `true`), then implements the plan **one step at a time**, pausing after each step for review. It never commits automatically.

Practical implications for any agent working here:
- Don't write game code directly unless a corresponding approved spec exists (or the user explicitly asks to skip the process). For new features, write a new `specs/NN-slug.md` via `/spec` rather than editing `game.js` ad hoc.
- Check `specs/` for the current state of the project before making architectural assumptions — it's the source of truth for scope/data model, and is more reliable than inferring intent from `game.js` alone.
- Never mark a spec `Approved` — that transition is made by the human.

## Assets available for implementation

- `assets/spritesheet-breakout.png` — the sprite sheet image.
- `assets/spritesheet.js` — plain `<script>`-style helper (no exports/modules) that loads the sheet onto an offscreen canvas and draws from it:
  - `loadSpritesheet(cb)` — loads the image once, queues/fires callbacks when ready.
  - `drawSprite(ctx, name, x, y, w, h)` — draws by logical name (`'paddle'`, `'ball'`, or `'block_<color>'`, e.g. `'block_red'`).
  - `drawFrame(ctx, frame, x, y, w, h)` — draws an explicit `{sx, sy, sw, sh}` frame, used for animations.
  - `SPRITES` — static frame coordinates for `paddle`, `ball`, and `blocks.{gray,red,yellow,cyan,magenta,hotpink,green}`.
  - `EXPLOSION_FRAMES` — 4-frame explosion animation per block color, paired with `EXPLOSION_DURATION` (150ms).
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — sound effects for the ball bouncing and blocks breaking, played via plain `Audio` objects in `game.js` (see `sounds` / `playSound`), gated by `state.muted`.

Any future game code should reuse these rather than introducing new asset-loading abstractions or a bundler.
