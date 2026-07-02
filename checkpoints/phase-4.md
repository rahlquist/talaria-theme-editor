# Phase 4 checkpoint — Export / persistence layer

Date: 2026-07-02

## What's done
- `POST /api/themes` (vite.config.ts middleware) → `saveThemes()` in `src/server/presets-io.ts`:
  1. **Backup first**: copies the current presets.ts to `yyyyddmm-epoch-presets.ts` in the same directory (e.g. `20260207-1783000161766-presets.ts` — year, day, month, then epoch ms, exactly the requested scheme).
  2. **Regenerate**: writes a fresh presets.ts containing every export Hermes consumes — `EMOJI_FALLBACK`, `DEFAULT_TYPOGRAPHY` (+ the SYSTEM_SANS/SYSTEM_MONO consts), one exported const per theme (`nousTheme`, `midnightTheme`, …, names sanitized via `themeIdentifier()`), `BUILTIN_THEMES`, `BUILTIN_THEME_LIST`, `DEFAULT_SKIN_NAME`.
- UI: "Save to presets.ts (N edited)" button in the grid header; success line shows the backup path; per-card "edited" badges clear once saved.
- The **only** paths ever written inside `~/.hermes` are `presets.ts` and its backups in that one directory.

## Verified (live, against the real file)
- POSTed the loaded themes back unchanged: backup file appeared with correct name; `GET /api/themes` after the rewrite returned **data-identical** themes (deep JSON equality) and correct `defaultSkinName`.
- `color-mix(...)` values survive as string literals (CSS resolves them at paint time — rendering unchanged).

## Key decisions
- Backup is unconditional on every save — cheap insurance; the epoch component guarantees uniqueness.
- Values are emitted as resolved literals rather than trying to reconstruct the original `nousTint()` helper calls — a hand-edited tint would otherwise be unrepresentable. The original expression-based file is always recoverable from the first backup.

## File state
No new files — persistence lives in `src/server/presets-io.ts` + `vite.config.ts` (Phase 1) and `src/App.tsx` (Phase 3). This phase verified it end-to-end.
