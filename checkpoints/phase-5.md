# Phase 5 checkpoint — Testing

Date: 2026-07-02

## What's done
- `src/server/presets-io.test.ts` (8 tests) — all against a **temp copy** of presets.ts, never the real file:
  - backup naming: `yyyyddmm-epoch-presets.ts` scheme incl. zero-padding
  - `themeIdentifier` sanitizing (dashes/spaces/leading digits)
  - load: all 6 built-ins present, `color-mix` values evaluated as strings, nous dark palette intact
  - round trip: save → reload gives deep-equal data; backup lands next to the file; regenerated text contains every export Hermes imports (`EMOJI_FALLBACK`, `DEFAULT_TYPOGRAPHY`, `nousTheme`, `BUILTIN_THEMES`, `BUILTIN_THEME_LIST`, `DEFAULT_SKIN_NAME`)
  - edits persist (change mono primary + description → reload → present)
  - serializer escapes quotes, omits absent optional sections
- `src/components/ColorField.test.ts` (3 tests) — pure paths of `cssColorToHex`.
- **11/11 passing** (`npm test`). `npm run build` (tsc strict + vite) clean.
- Live end-to-end against the real file was done in Phase 4 (backup created, data-identical reload).

## Not covered (known gaps)
- No DOM-level React tests (would need jsdom + testing-library); the KeepDialog 10 s countdown and canvas color probing were exercised manually in the browser, not in CI.
- Hermes' own `presets.test.ts` was not run (would require running Hermes' toolchain inside `~/.hermes`, which this project avoids). If it asserts on file *text* rather than exported data, restore from the newest backup.

## Commands
```bash
npm test        # vitest
npm run build   # typecheck + production bundle
npm run dev     # the app, http://localhost:5199
```
