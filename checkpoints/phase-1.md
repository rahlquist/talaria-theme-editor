# Phase 1 checkpoint — Core theme data structure + types

Date: 2026-07-02

## What's done
- Standalone Vite + React + TypeScript app scaffolded in `~/projects/theme_editor_claude` (git repo, `main` branch). Runs entirely outside Hermes: `npm run dev` → http://localhost:5199.
- `src/types.ts` — mirror of Hermes' `DesktopTheme` / `DesktopThemeColors` / `DesktopThemeTypography` / `DesktopTerminalPalette` interfaces, plus `REQUIRED_COLOR_KEYS` / `OPTIONAL_COLOR_KEYS` ordered key lists that drive the editor form.
- `src/server/presets-io.ts` — Node-side IO:
  - `loadThemes()` reads `~/.hermes/hermes-agent/apps/desktop/src/themes/presets.ts`, transpiles with esbuild (`loader: 'ts'`), imports via data: URL → returns the *evaluated* theme objects (tint helpers already resolved).
  - `backupFilename()` / `backupPresets()` — `yyyyddmm-epoch-presets.ts` copies next to the original.
  - `serializeTheme()` / `generatePresetsFile()` / `saveThemes()` — regenerate presets.ts preserving every export Hermes consumes: `EMOJI_FALLBACK`, `DEFAULT_TYPOGRAPHY`, per-theme consts (`nousTheme`…), `BUILTIN_THEMES`, `BUILTIN_THEME_LIST`, `DEFAULT_SKIN_NAME`.
- `vite.config.ts` — `hermes-theme-api` dev-server middleware plugin: `GET /api/themes` (load) and `POST /api/themes` (backup + save). No separate backend process.
- Minimal `App.tsx` proving the pipeline: lists all 6 themes (nous, midnight, ember, mono, cyberpunk, slate) with swatches.

## Verified
`curl http://localhost:5199/api/themes` returns all six themes, `defaultSkinName: nous`, and `color-mix(in srgb, #0053FD 5%, #FFFFFF)` strings intact.

## File state
```
package.json  tsconfig.json  vite.config.ts  index.html
src/main.tsx  src/App.tsx  src/styles.css  src/types.ts
src/server/presets-io.ts
```

## Reapplication Summary
- **Theme data structure**: `DesktopTheme { name, label, description, colors: DesktopThemeColors, darkColors?, typography?: Partial<DesktopThemeTypography>, terminal?, darkTerminal? }`. `DesktopThemeColors` has 19 required string tokens (background/foreground, card/popover/muted/secondary/accent pairs, primary pair, border, input, ring, destructive pair) and 7 optional (midground, midgroundForeground, composerRing, sidebarBackground, sidebarBorder, userBubble, userBubbleBorder). Colors are any CSS color string — hex or `color-mix(...)`. Typography: `fontSans`, `fontMono` (full CSS font stacks), optional `fontUrl` stylesheet link. **No font-size fields exist in presets.ts** (sizing lives in Hermes' styles.css), so the editor covers colors + fonts + fontUrl only.
- **Key decisions**:
  - Evaluate presets.ts (esbuild transpile → import) instead of parsing it — immune to formatting changes across Hermes versions; only the export names are contracted.
  - Regenerate the whole file on save with resolved literals; helper constants Hermes imports elsewhere (`EMOJI_FALLBACK`, `DEFAULT_TYPOGRAPHY`) are re-emitted verbatim so `context.tsx`/`user-themes.ts` imports keep working.
  - Backup naming exactly as requested: `yyyyddmm-epoch-presets.ts` (year, **day**, month) in the same directory.
  - API as Vite middleware so one `npm run dev` is the entire standalone app.
- **Commands to recreate**:
  ```bash
  cd ~/projects/theme_editor_claude
  npm install        # may need: npm approve-scripts esbuild
  npm run dev        # serves UI + API on http://localhost:5199
  npm test           # vitest (Phase 5)
  ```
