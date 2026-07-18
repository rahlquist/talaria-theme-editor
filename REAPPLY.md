# Reapplication guide (for future models / future Hermes versions)

This standalone editor reads and writes exactly one Hermes file:
`~/.hermes/hermes-agent/apps/desktop/src/themes/presets.ts`
(plus timestamped `yyyyddmm-epoch-presets.ts` backups beside it — year/DAY/month order, then epoch ms).
**No other file under `~/.hermes` may be touched.**

## The contract with Hermes (check these when Hermes updates)

1. **Types** — `~/.hermes/.../src/themes/types.ts` defines `DesktopTheme`,
   `DesktopThemeColors`, `DesktopThemeTypography`, `DesktopTerminalPalette`.
   `src/types.ts` here is a hand-copied mirror plus `REQUIRED_COLOR_KEYS` /
   `OPTIONAL_COLOR_KEYS` (these arrays drive the editor form). If Hermes adds
   or renames tokens: re-copy the interfaces and update the two key arrays.
2. **Exports** — Hermes imports from presets.ts (grep `from './presets'`):
   `EMOJI_FALLBACK`, `DEFAULT_TYPOGRAPHY`, `nousTheme`, `BUILTIN_THEMES`,
   `BUILTIN_THEME_LIST`, `DEFAULT_SKIN_NAME`. The generator
   (`generatePresetsFile` in `src/server/presets-io.ts`) must keep emitting
   every one of these. A round-trip test in `src/server/presets-io.test.ts`
   asserts the list — extend it if Hermes starts importing more.
3. **Loading strategy** — presets.ts is *evaluated*, not parsed: esbuild
   `transform(loader:'ts')` → `import()` from a data: URL. This works as long
   as presets.ts has **no runtime imports** (only `import type`). If a future
   version adds runtime imports, switch `loadThemes()` to `esbuild.build`
   with `bundle: true` and mark the imports' resolutions appropriately.
4. **Rendering** — Hermes writes theme colors to CSS custom properties; the
   preview (`src/components/PreviewPane.tsx`) does the same via `--dt-*` vars.
   Hermes styles itself with Tailwind v4 over those vars; the editor is plain
   CSS on purpose (zero build coupling).
5. **Font size** — not a presets.ts concept (sizing lives in Hermes'
   styles.css). If a future presets.ts grows typography size fields, add them
   next to fontSans/fontMono in `Editor.tsx` and the serializer picks them up
   only if added to `serializeTheme`.

## Integrating the Edit button into Hermes itself (when modification is allowed)

Target: `~/.hermes/hermes-agent/apps/desktop/src/app/settings/appearance-settings.tsx`,
inside `filteredThemes.map(theme => …)` — each card is a `div.group.relative`
holding the select `<button>` (with `<ThemePreview …/>`) and an absolutely
positioned remove button. Add a sibling absolutely-positioned button
(e.g. `right-9 top-1.5`, same classes as the Trash2 remove button, a `Pencil`
lucide icon) that opens this editor:

```tsx
<button
  aria-label="Edit theme"
  className="absolute right-9 top-1.5 grid size-6 place-items-center rounded-md bg-(--ui-bg-elevated)/80 text-(--ui-text-tertiary) opacity-0 backdrop-blur-sm transition hover:text-(--ui-text-primary) focus-visible:opacity-100 group-hover:opacity-100"
  onClick={() => window.open('http://localhost:5199', '_blank')}
  title="Edit theme"
  type="button"
>
  <Pencil className="size-3.5" />
</button>
```

(Deep-linking a specific theme: this app can trivially read a `?theme=name`
query param in `src/App.tsx` and call `setEditing(name)` on load.)
After saving from the editor, Hermes must re-read presets.ts (restart, or
whatever hot-reload the dev build provides).

## Rebuilding this project from scratch

```bash
cd ~/projects/talaria-theme-editor
npm install                  # if esbuild's binary is blocked: npm approve-scripts esbuild
npm run dev                  # UI + API on http://localhost:5199
npm test                     # 19 vitest tests (temp-copy round trips)
npm run build                # strict tsc + vite bundle
```

> Note: `npm run build` produces a static `dist/` bundle, but the editing
> API only runs as Vite **dev-server middleware**. To actually write
> `presets.ts` you must use `npm run dev` — a static `dist/` alone is UI-only.

Architecture in one paragraph: a Vite dev server is the whole app. A config
plugin (`hermesThemeApi` in vite.config.ts) serves `GET/POST /api/themes`,
delegating to `src/server/presets-io.ts` (load = esbuild-evaluate presets.ts;
save = copy backup, regenerate file from JSON). The React UI
(`src/App.tsx`) shows a three-pane layout: a theme list (`ThemeList`) with an
Edit/Copy/Remove button per theme; `ThemeEditor.tsx` holds the draft (colors
grouped Surface/Muted/Brand/Accent/Borders/Destructive/Sidebar/Bubbles, light +
dark palettes, typography) and previews the committed theme in `PreviewPane`
(mock Hermes window painted from `--dt-*` CSS vars); the bottom **Apply Changes**
button writes the draft to `presets.ts` and pops `KeepDialog` — a 10-second
countdown that reverts `presets.ts` from its backup unless "Keep changes" is
clicked. Per-phase state dumps live in `checkpoints/phase-{1..7}*.md`.
