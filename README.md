# Talaria Theme Editor

Standalone visual (WYSIWYG) editor for the
[Hermes Agent](https://github.com/nousresearch/hermes-agent) desktop theme
presets — runs entirely outside Hermes and touches nothing in `~/.hermes`
except `themes/presets.ts` (always backed up first as
`yyyyddmm-epoch-presets.ts`).

> **⚠️ Proof of concept.** This is a POC built for personal use and is not
> recommended for production. It rewrites your Hermes `presets.ts` (backups
> are taken on every save, but still — use at your own risk).

Created by Richard Ahlquist together with [Claude](https://claude.com/claude-code)
(Anthropic's Claude Code). Not affiliated with or endorsed by Nous Research.
Licensed under the [MIT License](LICENSE).

## Run

```bash
npm install     # first time (if esbuild is blocked: npm approve-scripts esbuild)
npm run dev     # → http://localhost:5199
```

## Use

1. The grid mirrors Hermes' appearance settings — one thumbnail per theme in
   presets.ts. Click **Edit theme** on any card.
2. Change colors (every token, light + dark palettes), label/description, and
   fonts (`fontSans` / `fontMono` stacks, `fontUrl` stylesheet). Font *size*
   is not stored in presets.ts, so the zoom slider affects the preview only.
3. **Apply to preview** paints your draft into the mock Hermes window and pops
   the fail-safe: **Keep changes** within 10 seconds or everything reverts.
4. Kept edits mark the theme "edited". **Save to presets.ts** backs up the
   current file and writes the new one; the backup path is shown on success.
5. **Copy** on any card prompts for a new label + name (unique slug), then
   immediately backs up presets.ts, writes the copied theme into it, and
   drops you straight into the editor for the copy.
6. The **Keep backups** field in the header caps how many
   `yyyyddmm-epoch-presets.ts` backups are retained — after every save the
   oldest ones beyond the limit are deleted (only files matching the backup
   pattern are ever touched). The setting persists in the browser.
7. The **Backup dir** field sets where backups are written (empty = next to
   presets.ts; `~` expands; the directory is created if missing). Pruning
   applies to whichever directory is active.
8. **Remove** on a card deletes that theme from presets.ts (after a confirm,
   with the usual backup first). Removing the last remaining theme is never
   allowed, and if you remove the default theme, `DEFAULT_SKIN_NAME` is
   repointed to the first remaining one.

## Develop

- `npm test` — vitest (serializer round trips run against temp copies)
- `npm run build` — strict typecheck + production bundle
- `checkpoints/` — per-phase build log; `REAPPLY.md` — how to re-sync with
  future Hermes versions and integrate the button into Hermes' own menu.
