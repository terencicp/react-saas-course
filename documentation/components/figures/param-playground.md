# `ParamPlayground` + `Param` + `Preview` + `Readout`

Self-contained interactive figure: a column of controls (sliders, dropdowns, toggles, color pickers) drives a live preview whose CSS reads each control's value as a custom property. Optional chips below the preview echo a single param's value or evaluate a JS expression over the param env.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import ParamPlayground from '../../../../components/figures/param-playground/ParamPlayground.astro';
import Param from '../../../../components/figures/param-playground/Param.astro';
import Preview from '../../../../components/figures/param-playground/Preview.astro';
import Readout from '../../../../components/figures/param-playground/Readout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `ParamPlayground`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `caption` | `string` | no | — | Small caption rendered above the controls/preview grid. Plain text only. |

### `Param`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier the preview reads as `var(--<id>)` and that `<Readout of=…>` / `<Readout expr=…>` reference. Must be a valid CSS custom-property suffix and a valid JS identifier. |
| `kind` | `'slider' \| 'select' \| 'toggle' \| 'color'` | yes | — | Control type. See below. |
| `label` | `string` | yes | — | Plain-text label shown above the control. |
| `default` | `number \| string \| boolean` | no | first option / `min` / `false` / `'#3b82f6'` | Initial value. Sliders clamp to `[min, max]`; selects fall back to the first option when the value isn't in `options`. |
| `min` | `number` | no (slider) | `0` | Slider lower bound. |
| `max` | `number` | no (slider) | `100` | Slider upper bound. |
| `step` | `number` | no (slider) | `1` | Slider step. |
| `suffix` | `string` | no (slider) | `''` | Unit appended to the CSS variable. With `suffix="px"`, `var(--width)` resolves to e.g. `220px` — directly usable in `width: var(--width)`. The raw numeric value (without suffix) is what `<Readout expr=…>` sees. |
| `options` | `string[] \| { value: string; label?: string }[]` | yes (select) | `[]` | Select options. |
| `on` | `string` | no (toggle) | `'true'` | Value emitted when the toggle is checked. |
| `off` | `string` | no (toggle) | `'false'` | Value emitted when the toggle is unchecked. |

### `Preview`

No props. Default slot is the preview content. Each `<Param id="…">` exposes `var(--<id>)` on the preview wrapper — the raw value with the param's `suffix` appended (e.g. `220px`, `oklch(0.62 0.18 210)`, `border-box`, `#3b82f6`). Use it in any CSS property: `width: var(--width)`, `background: var(--brand)`, `box-sizing: var(--boxSizing)`.

### `Readout`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `label` | `string` | yes | — | Plain-text label rendered as the chip's caption. |
| `of` | `string` | one of `of` / `expr` | — | Echo this param's current value (with optional `suffix`). |
| `expr` | `string` | one of `of` / `expr` | — | JS expression evaluated against the param env. Numeric params are numbers, others are strings. Example: `boxSizing === 'border-box' ? width : width + padding * 2`. |
| `suffix` | `string` | no | `''` | Appended to the rendered value. |

### Expression env helpers

Inside `<Readout expr="…">` these names are also in scope:

| Name | Signature | Purpose |
| --- | --- | --- |
| `wcagContrast` | `(a: string, b: string) => number` | WCAG 2.1 relative-luminance contrast ratio between two CSS colors. Accepts any color string the browser can resolve (`#hex`, `oklch(...)`, `rgb(...)`, named colors, etc.). Returns the rounded ratio. |
| `wcagPasses` | `(a, b, level?: 'AA' \| 'AAA', size?: 'normal' \| 'large') => boolean` | `true` when the ratio meets `level` (default `'AA'`) at `size` (default `'normal'`). Thresholds: AA 4.5 / AA-large 3 / AAA 7 / AAA-large 4.5. |
| `Math` | global | Standard JS `Math` — useful for `Math.round`, `Math.min`, etc. |

## Slots

- **`ParamPlayground` default** — any mix of `<Param>`, `<Preview>`, and `<Readout>` children, in any order. The script reorganizes them at runtime into the controls column, preview wrapper, and readouts row.
- **`Preview` default** — the preview content. Plain HTML / MDX / components. Read params via `var(--<id>)` in inline `style` or in a `<style>` block scoped to the preview.

## Authoring

```mdx
<ParamPlayground>
  <Param id="hue" kind="slider" label="Hue" min={0} max={360} default={210} />
  <Param id="dark" kind="toggle" label="Dark" on="dark" off="light" default={false} />
  <Preview>
    <div style="background: oklch(0.7 0.15 var(--hue));">…</div>
  </Preview>
  <Readout label="Hue" of="hue" />
  <Readout label="CSS" expr="'oklch(0.7 0.15 ' + hue + ')'" />
</ParamPlayground>
```

## Constraints & gotchas

- `<Param>`, `<Preview>`, and `<Readout>` must be **direct children** of `<ParamPlayground>`. The script finds them via `[data-pp-param]`, `[data-pp-preview]`, and `[data-pp-readout]`; deeper nesting is invisible to it.
- `<Param id>` must be unique within a single `<ParamPlayground>` — duplicate IDs collide on the same CSS custom property and the same key in the readout env.
- Slider values pipe to CSS with the `suffix` baked in. Reach for `suffix="px"` (or `deg`, `%`, `rem`, `ms`, …) so the preview can write `width: var(--width)` rather than `width: calc(var(--width) * 1px)`.
- `<Readout expr>` is evaluated with `new Function`. Author content is trusted (course MDX). A syntax error or runtime throw renders `—` in the chip and surfaces the error message on `data-pp-readout-error` for debugging.
- This component is a complete figure card — don't wrap it in `<Figure>` (you'll get nested padding and borders).
- The component renders no preview frame chrome — no fake browser bar, no width drag handle, no class-context toggle. That's `PreviewFrame`'s job (a separate component, not yet built).

## When to reach for it

- A senior decision is best taught by *manipulating* it: token values, OKLCH channels, layout numerics, ICU plural counts, viewport widths.
- A static `Figure` would freeze the comparison the student needs to *feel* by sliding through. The proposals report flags `ParamPlayground` as "the single biggest expressiveness gap in the toolkit" — when nothing else carries live cause-and-effect, this is the primitive.
- The preview's reactions can be expressed in pure CSS. If the lesson needs JS branching inside the preview (e.g., `URL.canParse(input)` succeeds/fails styling), wait for the React-props injection path or fall back to `ReactCoding`.

## Example

A box-model sizer that exercises slider + select + computed `expr` readouts:

```mdx
<ParamPlayground>
  <Param id="width" kind="slider" label="Width" min={80} max={360} default={220} suffix="px" />
  <Param id="padding" kind="slider" label="Padding" min={0} max={48} default={16} suffix="px" />
  <Param id="border" kind="slider" label="Border" min={0} max={12} default={4} suffix="px" />
  <Param id="boxSizing" kind="select" label="Box sizing" options={['content-box', 'border-box']} default="border-box" />
  <Preview>
    <div
      style="
        width: var(--width);
        padding: var(--padding);
        border: var(--border) solid hsl(217, 91%, 60%);
        background: hsl(217, 91%, 95%);
        box-sizing: var(--boxSizing);
      "
    >
      box
    </div>
  </Preview>
  <Readout label="Declared" of="width" suffix="px" />
  <Readout
    label="Rendered outer"
    expr="boxSizing === 'border-box' ? width : width + padding * 2 + border * 2"
    suffix="px"
  />
</ParamPlayground>
```

Two more demos (token console with a live WCAG contrast chip, OKLCH color lab) live in [the playground demo page](../../../src/content/docs/0%20Demos/figures/param-playground-demo.mdx).
