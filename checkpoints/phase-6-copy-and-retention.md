# Phase 6 checkpoint — Copy theme + backup retention

Date: 2026-07-02

## What's done
- **Copy theme**: each grid card has a Copy button → `CopyDialog` prompts for a
  display label and a unique slug name (auto-derived from the label until
  hand-edited; validated against existing names). Create → deep-clones the
  source theme, then `persist()`:
  backup presets.ts (same `yyyyddmm-epoch-presets.ts` pattern) → write the
  file with the copy included → on success the editor opens directly on the
  new theme.
- **Backup retention**: "Keep backups" number field in the grid header
  (persisted to localStorage, key `hermes-theme-editor.maxBackups`, default 10,
  clamped 1–999). Sent as `maxBackups` with every POST; server-side
  `pruneBackups()` (src/server/presets-io.ts) deletes the oldest backups
  beyond the limit **after** each save. Only filenames matching
  `^\d{8}-\d+-presets\.ts$` are ever deleted; sorted by the epoch component;
  limit clamps to ≥1. Save status line reports how many were pruned.
- `saveThemes()` gained an optional `maxBackups` param and now returns
  `{ backupPath, pruned }`.

## Verified
- 14/14 vitest tests (3 new: prune keeps newest N and ignores non-backup
  files; repeated `saveThemes` holds the count at the limit; limit 0 clamps
  to keeping 1). `tsc --noEmit` clean.
- Live: POST with `maxBackups: 5` against the real file → backup created,
  `pruned: []` (2 backups ≤ limit).

## Key decisions
- Copy saves immediately (per spec) rather than joining the dirty-set — the
  new theme exists in presets.ts before the editor opens, so "Discard draft"
  inside the editor reverts to the freshly saved copy.
- Pruning happens server-side on save (not on a timer) — the limit is
  enforced exactly when new backups appear.

## File state
```
src/components/CopyDialog.tsx   (new)
src/components/ThemeCard.tsx    (Copy button, actions row)
src/App.tsx                     (persist() helper, copy flow, Keep backups field)
src/server/presets-io.ts        (pruneBackups, saveThemes maxBackups)
vite.config.ts                  (maxBackups pass-through, pruned in response)
src/server/presets-io.test.ts   (+3 tests)
src/styles.css                  (modal + backup-limit styles)
```
