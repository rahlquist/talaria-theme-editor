# Phase 3 checkpoint — Preview / live edit UI

Date: 2026-07-02

## What's done
- `src/components/PreviewPane.tsx` — WYSIWYG mock of the Hermes desktop window (sidebar, user + assistant chat bubbles, mono code block, primary/secondary/accent/destructive chips, popover, composer with ring). Painted **entirely from CSS variables** (`--dt-*`) set from the theme object — the same runtime mechanism Hermes uses, so what you see is what Hermes paints. `fontUrl` stylesheets are injected as `<link>` so Google-Font previews are real. Light/dark palette toggle; preview-only zoom slider (font size is not a presets.ts field).
- `src/components/KeepDialog.tsx` — the fail-safe: after Apply, a "Keep changes?" dialog counts down from 10 s (exported `TIMEOUT_SECONDS`); on timeout or "Revert now" the draft is discarded, on "Keep changes" it's committed.
- `src/components/ThemeCard.tsx` — thumbnail grid card mirroring Hermes' appearance-settings `ThemePreview` (sidebar strip, bubbles, composer ring, primary pill) with the **Edit theme** button near the thumbnail, plus default/edited badges.
- `src/components/Editor.tsx` — the edit screen: meta (label/description), full color form (19 required + 7 optional tokens, light/dark tabs, add/remove dark palette), typography (fontSans/fontMono/fontUrl). Flow: edits build a draft → preview keeps showing the committed theme → **Apply to preview** paints the draft + opens KeepDialog → Keep commits, Revert/timeout restores.
- `src/App.tsx` — grid ↔ editor navigation, per-theme dirty tracking, Save button (wired in Phase 4).
- `src/styles.css` — full chrome + preview styling.

## Verified
`tsc --noEmit` clean; dev server serves the UI at http://localhost:5199 (HTTP 200). Interactive flows exercised in Phase 5.

## Key decisions
- Preview shows the *committed* theme until Apply (per spec: "waiting for an apply button to be pressed is ok"); the 10 s revert window then gates the draft. A broken palette can never silently stick.
- Countdown implemented as a 1 s-tick `setTimeout` chain keyed on `secondsLeft` so the displayed number, the progress bar, and the actual revert all share one state value.
- Optional color tokens are editable *as optional* (set/unset), preserving Hermes' fallback chain (`midground` ← `ring`, `composerRing` ← `midground`, sidebar/bubble ← base colors) instead of baking fallbacks into the file.

## File state
```
src/App.tsx                    (rewritten: grid + editor shell + save)
src/components/ColorField.tsx  (Phase 2)
src/components/PreviewPane.tsx
src/components/KeepDialog.tsx
src/components/ThemeCard.tsx
src/components/Editor.tsx
src/styles.css                 (full UI styles)
```
