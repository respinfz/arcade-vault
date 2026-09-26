# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Arcade Vault ("Es una plataforma para jugar online y competir por la mayor cantidad de puntos" — an online arcade platform to play and compete for high scores). UI copy, specs, commit-facing docs and code comments are in **Spanish**; keep that convention.

Implemented so far (specs 01–09, all `Implemented`):

- **Screens**: Inicio (`/`), Biblioteca (`/biblioteca`), Detalle (`/juegos/[id]`), Reproductor (`/juegos/[id]/jugar`), Salón de la Fama (`/salon-de-la-fama`), Auth (`/auth`), Acerca de (`/acerca-de`, with a Resend contact form).
- **Supabase**: game catalog (`av_games`) and real leaderboard (`av_scores`).
- **Playable games** (canvas + own engine): `asteroides`, `tetris`, `arkanoid`, `snake` — details (controls, mechanics, spec, code folder) in @references/implemented-games.md; keep it updated when adding a game. The remaining catalog entries (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) are placeholders that run a fake score simulation in the player.
- **Auth is fake**: `UserProvider` stores only a player name in `localStorage["av_user"]`; there is no Supabase Auth yet.

## Commands

```bash
npm run dev     # dev server
npm run build   # production build — the acceptance gate for every spec (no TS/ESLint errors)
npm run start   # run production build
npm run lint    # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner. A `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`) runs `eslint --fix` + Prettier on every `Write`/`Edit` of `.ts/.tsx/.js/.jsx/.mjs/.cjs` (Prettier only for `.md/.mdx`) and reports unfixable ESLint issues back as context — fix those before moving on.

## Critical: this is not the Next.js you know

Next.js `16.3.5` (React 19.2) is newer than this model's training data and has breaking API/convention changes. **Before writing or editing any Next.js code**, read the bundled docs at `node_modules/next/dist/docs/` (sections: `01-getting-started`, `02-guides`, `03-api-reference`, `04-glossary.md`) — do not rely on prior Next.js knowledge. This requirement is enforced via `AGENTS.md`, which `next dev` regenerates automatically; do not remove the import in this file.

## Spec-driven workflow

Every feature goes through a spec in `specs/NN-slug.md` (next number: `11`). Project skills live in `.claude/skills/` (mirrored in `.agents/skills/`, tracked in `skills-lock.json`); all are user-invoked only (`disable-model-invocation`):

- **`/spec <feature>`** — guided spec designer (from `Klerith/fernando-skills`). Template: `.claude/skills/spec/template.md`.
- **`/spec-juego <game or references/started-games/ folder>`** — project-specific skill to spec a new playable game with leaderboard. Its `platform-contract.md` is the technical contract every game must follow (engine shape, React component, touch controls, registry entry, catalog migration, cover art). Read it before touching anything under `components/games/`.
- **`/spec-impl <NN-spec-name>`** — implements a spec whose status is `Approved`. With `specs/.spec-config.yml` → `AutoCreateBranch: true` it creates/switches to branch `spec-NN-slug` automatically. After implementing, set the spec's status to `Implemented`.
- **`/frontend-design`** — **always use it to design user interfaces** (new screens, cover art, touch-control layouts).

Project subagent **`game-planner`** (`.claude/agents/game-planner.md`) plans and decides which game fits the platform next; it keeps its memory of past suggestions in `references/game-suggestions-to-do.md` (read before proposing, updated after). Its output feeds `/spec-juego`.

Project subagent **`game-jam`** (`.claude/agents/game-jam.md`) receives a specific game to implement (required — it never picks one on its own; use `game-planner` first if undecided) plus an optional theme, and autonomously writes 2–3 complete alternative specs (variants, all `Draft`) plus a comparison `README.md` in `specs/game-jam/<game-id>/`. The chosen variant is moved to `specs/NN-juego-<slug>.md` before `/spec-impl`.

Project subagent **`skin-designer`** (`.claude/agents/skin-designer.md`) receives the id of an already-implemented game (required) and implements directly a visual skin system modeled on `references/started-games/03-tetris/` (≥3 skins, all readable on the dark theme; `retro` default = current look). Skins live in `components/games/<slug>/skins.ts`, the engine exposes `setSkin()`, the registry entry lists `skins`, and a shared selector in `JugarClient` persists the choice only in `localStorage["av_skin:<id>"]` (never Supabase). It records every game with skins in `references/game-with-themes.md`.

Project subagent **`mobile-porter`** (`.claude/agents/mobile-porter.md`) receives the id of an already-implemented game without mobile support (required) and ports its player to the SPEC 11 touch contract (`touch-controls.tsx` rendered in `.touch-console` below the CRT, registry `TouchControls` entry, ≥56px / ≥64px buttons, no overlays on the canvas), without touching desktop. It verifies by Playwright touch emulation at 360×640 and 390×844 portrait plus desktop, runs lint + build, and records ported games in `references/mobile-ported-games.md`.

Branches are merged into `main` via PRs, one per spec.

## Architecture

- **App Router** (`app/`): pages are async **Server Components** that fetch data from Supabase and hand it to a `"use client"` component in `components/<area>/` (e.g. `app/page.tsx` → `components/home/home-client.tsx`, `app/juegos/[id]/jugar/page.tsx` → `components/jugar/jugar-client.tsx`). Exceptions: `app/auth/page.tsx` is fully client-side.
- **Route typing**: use the generated global types `PageProps<"/juegos/[id]">` / `LayoutProps<"/">` (from `.next/types/`, regenerated by `next dev`/`next build`); `params` is a Promise and must be awaited. Don't hand-write prop types.
- **Root layout** (`app/layout.tsx`): `lang="es"`, fonts `Press_Start_2P` (`--font-press-start`) and `JetBrains_Mono` (`--font-jetbrains-mono`), wraps everything in `UserProvider` and renders `Nav` (`components/nav.tsx`).
- **Styling**: almost everything is hand-written CSS in `app/globals.css` (neon/CRT arcade theme; color tokens `--cyan`, `--magenta`, `--yellow`, `--green`, `--ink`, `--line`, …; `.cover-<slug>` cover-art classes; `.crt-screen` 4:3 player; `.touch-*` touch-control classes). Tailwind CSS v4 is installed (`@tailwindcss/postcss`, no config file) but the design comes from these classes. Visual references for screens live in `references/templates/`.
- **Path alias**: `@/*` maps to the repo root.

### Data layer (Supabase)

- Clients: `lib/supabase/server.ts` (`createServerClient` + `cookies()`, for Server Components / Server Actions) and `lib/supabase/client.ts` (`createBrowserClient`). Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.template`; real values in `.env.local`).
- Reads: `lib/supabase/queries.ts` (`getGames`, `getGameById`, `getTopScores`, `getUserBestScore`) map snake_case rows to the camelCase types in `lib/types.ts` (`Game`, `Score`, `ScoreEntry`, `User`).
- Client-side refetches go through Server Actions in `lib/actions/scores.ts`. Score writes happen in the browser via `saveScore` in `components/providers/user-provider.tsx`.
- Schema changes are **SQL migrations** in `supabase/migrations/` (Supabase CLI; the `supabase` MCP server is configured in `.mcp.json`). `av_games` is read-only from the app (RLS: public select only) — the catalog is seeded/changed only via migrations. `av_scores` allows public select + insert.
- `lib/data.ts` only holds static UI data (`CATS` filter list, etc.); the game catalog no longer lives there.
- `app/api/supabase-health/route.ts` is a health-check endpoint.

### Games

- `components/games/registry.ts` — `GAME_REGISTRY` maps a game `id` (same as `av_games.id`) to `{ Component, TouchControls?, hudLivesLabel? }`. `JugarClient` uses the entry if present; games without an entry fall back to the fake simulation.
- Each game lives in `components/games/<slug>/`:
  - `engine.ts` — framework-agnostic class (`constructor(ctx, width, height, input)`, `restart()`, `forceGameOver()`, `update(dt)`, `draw()`), exposing `score`/`lives`/`level`/`state` as public fields polled each frame. No `window`/`document` access.
  - `<slug>-game.tsx` — `forwardRef` component with a `requestAnimationFrame` loop, keyboard listeners, and callbacks `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`. The platform's "FIN DEL JUEGO" modal replaces the original game-over overlay.
  - `touch-controls.tsx` — always renders its buttons (no pointer detection of its own); `JugarClient` detects `(pointer: coarse)` via `useCoarsePointer()` (`lib/hooks/use-coarse-pointer.ts`) and mounts it in `.touch-console`, below the CRT screen (never over the canvas).
- Adding a game = new folder + registry entry + migration inserting the `av_games` row (deleting the placeholder it replaces) + `.cover-<slug>` CSS. Leaderboard, Hall of Fame and catalog pages need no changes (they are data-driven).
- Source material for ports: `references/started-games/` (original vanilla-JS games) and `references/source-assets/` (sprites). Sprite assets used at runtime go in `public/games/<slug>/` (e.g. `public/games/snake/fruits.png`).

### Other integrations

- **Resend**: `app/acerca-de/actions.ts` (`sendContactMessage` Server Action) sends the contact form using `RESEND_API_KEY`.
