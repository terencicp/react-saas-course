# `Matching` + `Pair`

Two-column matching drill. Each `<Pair>` has two named slots — `left` and `right` — that accept inline markdown. Both columns shuffle independently on render. The student clicks a left pill, then a right pill; they lock in with a coloured dot and an SVG curve. Re-clicking a locked pill undoes the pairing. **Check** marks each pair green (correct) or red (wrong).

## Imports

```ts
import Matching from '../../../../components/exercises/matching/Matching.astro';
import Pair from '../../../../components/exercises/matching/Pair.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `Matching`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Click an item on the left, then its match on the right…" prompt. |

### `Pair`

No props. The pairing identity is implicit — the `<Pair>` *position* in source order is what the grader uses.

## Slots

- **`Matching` default** — one or more `<Pair>` children.
- **`Pair` `left`** and **`right`** (named) — content of each side. Use `<Fragment slot="left">…</Fragment>` / `<Fragment slot="right">…</Fragment>`. Inline markdown works — backticks become `<code>`, `*emphasis*`, links, etc.

## Constraints & gotchas

- The pairing is keyed by `<Pair>` index. Reordering `<Pair>` blocks in source changes the answer key (but since both columns shuffle anyway, source order has no visual effect).
- Up to 8 distinct hues are used for the connector lines; with more pairs, colours repeat. Eight pairs is the comfortable upper bound.
- The SVG curves reposition on `resize`; if you nest a `<Matching>` inside a container that changes width post-mount via JS, the lines may not follow.
- Both pills in a wrong pair show a dashed red border so colorblind students can distinguish them from "right" without relying on hue.

## Example

Terms-and-definitions matching with inline code on the left:

````mdx
<Matching>
  <Pair>
    <Fragment slot="left">`number`</Fragment>
    <Fragment slot="right">Primitive type — copied by value.</Fragment>
  </Pair>
  <Pair>
    <Fragment slot="left">`Array`</Fragment>
    <Fragment slot="right">Reference type — variables hold a pointer.</Fragment>
  </Pair>
  <Pair>
    <Fragment slot="left">`undefined`</Fragment>
    <Fragment slot="right">A declared variable that hasn't been assigned.</Fragment>
  </Pair>
</Matching>
````

Code-to-outcome matching with custom instructions:

````mdx
<Matching instructions="Match each React hook to the problem it's designed to solve.">
  <Pair>
    <Fragment slot="left">`useState`</Fragment>
    <Fragment slot="right">Track a value that changes over time and triggers re-renders</Fragment>
  </Pair>
  <Pair>
    <Fragment slot="left">`useEffect`</Fragment>
    <Fragment slot="right">Run a side effect after render (subscriptions, fetches, DOM)</Fragment>
  </Pair>
  <Pair>
    <Fragment slot="left">`useMemo`</Fragment>
    <Fragment slot="right">Cache an expensive computed value between renders</Fragment>
  </Pair>
</Matching>
````
