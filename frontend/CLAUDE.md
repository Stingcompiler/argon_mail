# UI rules for this frontend

Read before building or changing any screen or card. The project annex is
[`docs/ui-profile.md`](../docs/ui-profile.md) (platforms, widths, RTL, fonts,
numerals, colour modes, chosen direction, representative screens); the review
and its decisions are in [`docs/ui-cards-review.md`](../docs/ui-cards-review.md).
Decisions recorded there are not reopened.

## Direction: «الأسطح المصبوغة» (tinted surfaces)

- A service type tile carries its area's tint over its whole surface
  (`.service-tile.tint-<colour>`). The icon sits on the tint directly in the
  tint's dark tone. The name is shown in full: no line clamp.
- The area header is the area's tint, with no icon. The area's large card
  (`CategoryCard`, the stamp frame) stays as it is.
- Numbers in the dashboard go in one flat strip (`.summary-strip`), never a card
  per number.

## Banned patterns (when used only to mark status or add "a look")

- A coloured stripe on the edge of a box (border, inset shadow or pseudo-element).
- An icon inside a lightly tinted circle or square.
- A stat card per number; equal rows of identical cards by default.
- An icon beside every heading.
- Gradients on buttons or headings, gradient text.
- Continuous motion on static elements.
- A card inside a card with no functional need.

Status is said once, in text, supported by colour, never by colour alone.

Functional exceptions are allowed: progress indicators, focus outlines, field
borders, page-wide alert bars, the active item marker in navigation or a list,
a quote rule. Mark any other exception in the same CSS line with
`/* ui-allow: <reason> */`.

## Before you commit UI work

```bash
npm run check:colours   # every colour from a token in app/globals.css
npm run lint:ui         # the banned patterns; silent when clean
E2E_LOGIN=… E2E_PASSWORD=… npm run shots -- <label>   # then look at shots/<label>/
```

The text check catches known shapes only. It does not replace looking at the
screenshots at 390, 768, 1280 and 1920 px.

## Type (D-0007, docs/design/DESIGN.md)

- One family: IBM Plex Sans Arabic + IBM Plex Sans, 400/500/600/700. Name fonts
  only through `--font-ui`, `--font-mono`, `--font-display`. Use the `--fs-*`
  scale.
- Nothing under 12 px outside `.badge`; small text keeps line-height ≥ 1.6. No
  `fontSize`/`fontFamily`/`fontWeight` inline in components.
- Every number shown goes in `.num` (or `[data-num]` on a numeric column, which
  aligns to the end). Use `<Num>` for a whole number and `<Nums text>` for a
  sentence with numbers (dates, prices). Text people typed carries `data-free`.
  `e2e/numbers.spec.ts` fails on a bare digit.

## Other rules

- Arabic RTL: use logical properties (`margin-inline-start`, `text-align: start`).
  Mirror only directional icons. Use Western digits (0–9).
- Respect `prefers-reduced-motion`. No decorative motion that runs on its own.
- Tap targets are 44 px on phones; inputs stay at 16 px.
- Do not add a UI library; build on the shared components listed in the profile.
