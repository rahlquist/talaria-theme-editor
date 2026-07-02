# Phase 2 checkpoint — Color picker component

Date: 2026-07-02

## What's done
- `src/components/ColorField.tsx` — the single control used for every color token:
  - Text input is source of truth; accepts any CSS color (`#hex`, `color-mix(...)`, named).
  - Native `<input type="color">` overlaid on the swatch for visual picking. Non-hex values (Hermes uses `color-mix` tints) are resolved to `#rrggbb` via a 1×1 canvas probe (`cssColorToHex`) to seed the picker; picking writes plain hex back.
  - Optional tokens (`midground`, `sidebarBackground`, …) render a "+ set" affordance when unset and an "×" unset button when set, so fallback behavior (`ring` ← `midground` etc.) stays reachable.
  - External value changes (revert timer, switching themes) resync local text state via a ref guard.

## Key decisions
- One component for hex *and* computed colors instead of blocking non-hex — editing a tint keeps the string editable as text, and the picker offers its rasterized equivalent.
- `cssColorToHex` exported separately so tests (Phase 5) can cover the pure hex paths without a DOM.

## File state
Adds `src/components/ColorField.tsx` to the Phase 1 tree. No changes to other files.
