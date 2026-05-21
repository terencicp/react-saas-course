# `RenderTracking` + `TrackedNode` + `Trigger` + `Implementation`

A tree of labeled "components" (rounded boxes) with per-node render-count badges. The author declares the tree, declares a set of trigger buttons, and tags each trigger with the node ids that re-render when it fires. Clicking a trigger increments those badges and briefly flashes the boxes. An optional `<Implementation>` wrapper turns the toolbar into a tab strip — same external surface, two trigger→renders mappings — for "without memo vs with memo", "slice selector vs atomic selector", "object state vs split state" comparisons.

The render count is **simulated** from the author's mapping. It does not observe a real React tree.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import RenderTracking from '../../../components/figures/render-tracking/RenderTracking.astro';
import TrackedNode from '../../../components/figures/render-tracking/TrackedNode.astro';
import Trigger from '../../../components/figures/render-tracking/Trigger.astro';
import Implementation from '../../../components/figures/render-tracking/Implementation.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `RenderTracking`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | no | — | Short heading above the toolbar. Plain text. |

### `TrackedNode`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier referenced by every `<Trigger renders="…">` that re-renders this node. Must be unique within a single `<RenderTracking>`. |
| `label` | `string` | yes | — | Component label, rendered as `<Label />` inside the node box. |

Recursive: nested `<TrackedNode>` children inside the default slot become the box's tree children.

### `Trigger`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier for the trigger. Used as a stable key when the same action exists across multiple `<Implementation>` variants. |
| `label` | `string` | yes | — | Button text. Free-form — natural language ("type in Name") or code-like ("setState({ name: 'Ada' })") both read fine. |
| `renders` | `string` | yes | — | Comma-separated list of `<TrackedNode>` ids that re-render when this trigger fires. E.g. `"form,name,email"`. |

### `Implementation`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier for the implementation variant. |
| `label` | `string` | yes | — | Tab label. Code-like text reads as monospace ("`useStore(s => s.name)`"). |
| `default` | `boolean` | no | `false` | Mark this variant as the initially selected tab. If none of the variants has `default`, the first declared wins. |

## Slots

- **`RenderTracking` default** — any mix of `<TrackedNode>`, `<Trigger>`, and `<Implementation>` children, in any order. The script reads the placeholders at mount and builds the visible UI.
- **`TrackedNode` default** — nested `<TrackedNode>` children. Any other content is ignored.
- **`Implementation` default** — the `<Trigger>` buttons that belong to this variant.

## Authoring

Without an implementation toggle:

```mdx
<RenderTracking title="A single setState">
  <TrackedNode id="app" label="App">
    <TrackedNode id="counter" label="Counter" />
  </TrackedNode>

  <Trigger id="bump" label="setState in Counter" renders="counter" />
</RenderTracking>
```

With an implementation toggle:

```mdx
<RenderTracking title="One object, or two state slots?">
  <TrackedNode id="form" label="Form">
    <TrackedNode id="name" label="NameField" />
    <TrackedNode id="email" label="EmailField" />
  </TrackedNode>

  <Implementation id="object" label="useState({ name, email })" default>
    <Trigger id="type-name" label="type in Name" renders="form,name,email" />
    <Trigger id="type-email" label="type in Email" renders="form,name,email" />
  </Implementation>

  <Implementation id="split" label="useState(name) + useState(email)">
    <Trigger id="type-name" label="type in Name" renders="form,name" />
    <Trigger id="type-email" label="type in Email" renders="form,email" />
  </Implementation>
</RenderTracking>
```

Switching tabs resets all badge counts to zero. A reset affordance in the top-right header zeros counts without changing the active tab.

## Constraints & gotchas

- `<TrackedNode>`, `<Trigger>`, and `<Implementation>` must be **direct children** of `<RenderTracking>` (or, for `<TrackedNode>` children, direct children of their parent `<TrackedNode>`; for `<Trigger>`, direct children of their owning `<Implementation>`). The script walks the placeholder tree via `:scope >` selectors; deeper nesting is invisible.
- `<TrackedNode id>` must be unique within a single `<RenderTracking>` — `renders="…"` resolves ids globally across the whole tree.
- Triggers must live **either** at the root **or** inside an `<Implementation>` — not both. When `<Implementation>` is present, the root trigger row is empty until a tab is active.
- `renders` is a flat comma-separated string for ergonomic MDX authoring. Whitespace is trimmed. Empty entries are dropped.
- The render count is **simulated** — the badge increments come from the author's `renders` list. The component does not wrap a real React tree.
- The component renders its own card chrome — don't wrap it in `<Figure>` (you'll get nested padding and borders).
- The badge ping (opacity fade-in on every increment) and node flash (background/border tint) honor `prefers-reduced-motion: reduce`.

## When to reach for it

- A lesson explains *what causes a render* (state update here, in a parent, via context, via a store update) and the misconception lives in **which boxes light up** — not in a paragraph of prose.
- A lesson compares two implementations of the same external surface (with `memo` / without; slice selector / atomic selector; object state / split state). The toggle reveals the render asymmetry; the rest is reading the badges.
- The decision is local and small (a 2–6 box tree). For longer event sequences or multi-track timelines, reach for `DiagramSequence` or a `ScrubbableTimeline`-style component.
- The lesson is in Unit 4 (React mechanics) or Unit 16 (Zustand selectors). Those are the units this component was designed against — ≈10 chapter-specific proposals fold into it. See [`Component proposals.md` § 4](../../Pedagogical%20approach/Component%20proposals.md) for the proposal list and v1 scope decisions.

## Example

Selector-contract comparison from Chapter 082 / 083 — slice selector returns a fresh object on every store update, so every consumer re-renders; atomic selectors per field isolate the consumers.

```mdx
<RenderTracking title="One selector vs many">
  <TrackedNode id="form" label="CustomerWizard">
    <TrackedNode id="name" label="NameField" />
    <TrackedNode id="email" label="EmailField" />
    <TrackedNode id="plan" label="PlanField" />
  </TrackedNode>

  <Implementation id="slice" label="useStore(s => ({ name, email, plan }))" default>
    <Trigger id="set-name" label="setState({ name: 'Ada' })" renders="form,name,email,plan" />
    <Trigger id="set-email" label="setState({ email: 'ada@…' })" renders="form,name,email,plan" />
    <Trigger id="set-plan" label="setState({ plan: 'pro' })" renders="form,name,email,plan" />
  </Implementation>

  <Implementation id="atomic" label="useStore(s => s.name) per field">
    <Trigger id="set-name" label="setState({ name: 'Ada' })" renders="name" />
    <Trigger id="set-email" label="setState({ email: 'ada@…' })" renders="email" />
    <Trigger id="set-plan" label="setState({ plan: 'pro' })" renders="plan" />
  </Implementation>
</RenderTracking>
```

Three more demos (baseline flash, the three triggers, object vs split state) live in [the demo page](../../../src/content/docs/0%20Demos/figures/render-tracking-demo.mdx).
