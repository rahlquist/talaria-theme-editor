# Phase 7 checkpoint — Configurable backup path + theme removal

Date: 2026-07-02

## What's done
- **Backup dir field** (grid header, localStorage key
  `hermes-theme-editor.backupDir`): empty → backups land next to presets.ts
  (unchanged default); otherwise `resolveBackupDir()` expands a leading `~`,
  resolves the path, and `mkdir -p`s it on first use. Sent as `backupDir`
  with every POST; `pruneBackups()` prunes in the active backup directory.
- **Remove button** per card (danger-styled, next to Copy): confirm prompt →
  backup (same pattern/dir) → presets.ts rewritten without the theme.
  Guards:
  - button disabled when only one theme remains ("never remove all"),
    plus a belt-and-braces check in the handler, **plus** a server-side
    refusal (`saveThemes` throws on an empty list; the POST handler also
    rejects empty arrays) so no client bug can write a themeless file.
  - removing the theme that is `DEFAULT_SKIN_NAME` repoints the default to
    the first remaining theme before writing (Hermes falls back to the
    default skin name, so it must always exist).
- `saveThemes()` signature: options object `{ maxBackups?, backupDir? }`.

## Verified
- 19/19 vitest tests (5 new: custom-dir backup + prune isolation from the
  presets dir, empty-list refusal, `resolveBackupDir` default/tilde/relative).
- Live: POST with `backupDir` pointing at a fresh directory → directory
  created, backup written there, prune scoped there. `tsc --noEmit` clean.

## Key decisions
- The backup path is a client setting (localStorage), not stored in
  presets.ts — the file stays purely Hermes theme data.
- Retention is enforced per-directory: switching backup dirs doesn't delete
  anything in the old location.

## File state
```
src/server/presets-io.ts        (resolveBackupDir; backupDir in backup/prune/save; empty-list guard)
vite.config.ts                  (backupDir pass-through)
src/App.tsx                     (Backup dir field, removeTheme flow, default-skin repoint)
src/components/ThemeCard.tsx    (Remove button, lastTheme guard)
src/styles.css                  (btn--danger, path input)
src/server/presets-io.test.ts   (+5 tests)
```
