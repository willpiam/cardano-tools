---
name: Commit page polish
overview: Fix footer link colors on the dark commit page, remove the redundant Ethereum gas line from ChainPicker, and eliminate horizontal overflow (especially verify tools and inputs) on mobile and desktop via flex-safe widths and fluid WrappedTextBlock usage.
todos:
  - id: footer-links
    content: Style .commit-page .bottom-area links for dark bg + focus/hover
    status: completed
  - id: chainpicker-copy
    content: Remove Ethereum heads-up paragraph from ChainPicker.tsx
    status: completed
  - id: wrapped-text
    content: Make WrappedTextBlock fluid-safe (maxWidth 100%); fix VerifyHash/DecryptAES widths
    status: completed
  - id: flex-overflow
    content: Add min-width:0 / width:100% rules for wizard-card children and tool panels in simple.css
    status: completed
  - id: inputs-mobile
    content: Harden textarea/input/select + password-section + choice-grid for narrow viewports
    status: completed
  - id: cleanup-tailwind
    content: Strip dead Tailwind strings from DecryptAES/VerifyHash/FileHashViewer (optional but small)
    status: completed
isProject: false
---

# Commit page: links, overflow, Ethereum copy

## 1. Footer links on dark background

**Problem:** [`src/pages/Commit.tsx`](src/pages/Commit.tsx) renders plain `<a>` tags inside `.bottom-area`; they inherit global link styles (often low contrast on black).

**Change:** In [`src/simple.css`](src/simple.css), add scoped rules under `.commit-page .bottom-area` (or `.bottom-area` if only used here):

- Link color: a soft pastel that reads on black (e.g. `#c4d4ff` or `#e9d5ff`), `text-decoration: underline` or subtle border-bottom.
- `:hover` / `:focus-visible`: slightly brighter + clear focus ring for keyboard users.
- Optionally reduce `margin-top: 7rem` on small viewports so the footer sits closer to content on mobile.

No JSX change required unless you prefer semantic classes on the anchors (e.g. `className="commit-footer-link"`).

## 2. Remove Ethereum “Heads up” line

**Change:** In [`src/components/ChainPicker.tsx`](src/components/ChainPicker.tsx), delete the conditional block (lines 39–43) that renders *“Heads up: Ethereum commitments cost real gas…”*. Keep the gas idea in the **Ethereum choice card** body copy (*“Costs real gas”*) so information is not lost.

## 3. Verification tools overflowing the wizard (root cause)

**Primary culprit:** [`src/components/VerifyHash.tsx`](src/components/VerifyHash.tsx) passes `width={512}` to [`WrappedTextBlock`](src/components/WrappedTextBlock.tsx). In a flex column (`.wizard-card`), children default to `min-width: auto`, so the row’s **minimum content width becomes 512px** and the pastel cards **widen past the cream card** (matches your screenshot).

**Secondary:** [`src/components/DecryptAES.tsx`](src/components/DecryptAES.tsx) uses `width={300}` on `WrappedTextBlock` for decrypted output — same class of issue on narrow screens.

**Changes:**

| File | Action |
|------|--------|
| [`VerifyHash.tsx`](src/components/VerifyHash.tsx) | Pass `width="100%"` (or omit and rely on default after WrappedTextBlock change). Remove obsolete `width={512}` comment. |
| [`DecryptAES.tsx`](src/components/DecryptAES.tsx) | Pass `width="100%"` for decrypted message block. |
| [`WrappedTextBlock.tsx`](src/components/WrappedTextBlock.tsx) | Add `maxWidth: '100%'` to the merged inline style always. When `width` is a number, prefer CSS `width: '100%'` + `maxWidth: computedWidth` **or** simply `width: '100%'` for all call sites that need fluid layout (simplest: default fluid — `width: '100%'`, `maxWidth: '100%'`, keep optional `maxWidth` prop if any caller needs a cap). |
| [`src/simple.css`](src/simple.css) | **Flex containment:** `.wizard-card { min-width: 0; }` and `.wizard-card > * { min-width: 0; }` (or target `.wizard-card > .verify-hash`, `.aes-decrypt`, `.file-hash-viewer` only). Ensures flex children can shrink below intrinsic content width. |
| [`src/simple.css`](src/simple.css) | **Tool panels:** ensure `.verify-hash`, `.aes-decrypt`, `.file-hash-viewer` use `width: 100%`, `box-sizing: border-box`, and optional `overflow-x: auto` only for monospace hash rows if needed. |

## 4. Inputs and other overflow (mobile + desktop)

**Global textarea:** [`src/simple.css`](src/simple.css) already has `textarea { width: 100%; }` — add `max-width: 100%`, `min-width: 0`, `box-sizing: border-box` in the same rule and mirror for `.themed-surface textarea, input, select`.

**`.password-input-section`** ([`src/simple.css`](src/simple.css) ~L85–92): `flex-direction: row` + `max-width: 380px` fights narrow viewports. Add a `@media (max-width: 520px)` rule: `flex-direction: column; align-items: stretch; max-width: none;` so password + label stack.

**Choice grid:** `.choice-grid` / `.choice-card` — add `min-width: 0` on grid children (`.choice-card { min-width: 0; }`) so two-column layout does not force horizontal scroll on small screens.

**Optional cleanup:** Remove dead Tailwind class strings from [`DecryptAES.tsx`](src/components/DecryptAES.tsx) and [`VerifyHash.tsx`](src/components/VerifyHash.tsx) / [`FileHashViewer.tsx`](src/components/FileHashViewer.tsx) (`flex`, `w-full`, `border-gray-300`, etc.) — Tailwind is not active in this project; replacing with existing `pw-*` helpers or bare structure avoids confusion and duplicates borders with [`simple.css`](src/simple.css) tool-card rules.

## 5. Verification pass

- Resize browser (or devtools) to ~360px width: verify step — no horizontal scroll; hash block wraps; decrypt output wraps.
- Desktop ~1280px: wizard card stays centered; nested panels align flush inside cream card.
- Footer links readable and hover/focus visible.
- Chain step: Ethereum selected — no extra “Heads up” paragraph.

## Files touched (expected)

- [`src/simple.css`](src/simple.css) — footer links, flex `min-width`, inputs/textarea, password section media query, choice-card `min-width`, optional tool-panel tweaks.
- [`src/components/VerifyHash.tsx`](src/components/VerifyHash.tsx) — fluid `WrappedTextBlock` width.
- [`src/components/DecryptAES.tsx`](src/components/DecryptAES.tsx) — fluid width; optional class cleanup.
- [`src/components/WrappedTextBlock.tsx`](src/components/WrappedTextBlock.tsx) — `maxWidth: '100%'` and fluid default behavior.
- [`src/components/ChainPicker.tsx`](src/components/ChainPicker.tsx) — remove heads-up paragraph.
- Optionally [`src/components/FileHashViewer.tsx`](src/components/FileHashViewer.tsx) — strip dead Tailwind for consistency.

No routing or business logic changes.
