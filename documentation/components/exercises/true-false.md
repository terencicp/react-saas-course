# `TrueFalse` + `Statement` + `Why`

True/False drill played as a round. Each `<Statement>` carries an `answer` of `'true'` or `'false'` and an optional `<Why>` explanation. Statements **shuffle** on each round; the student answers one at a time, watching pip-progress at the top. After the last card, a score panel and a collapsible card-by-card review appear, with each statement's `<Why>` surfaced on the review row.

## Imports

```ts
import TrueFalse from '../../../../components/exercises/true-false/TrueFalse.astro';
import Statement from '../../../../components/exercises/true-false/Statement.astro';
import Why from '../../../../components/exercises/true-false/Why.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `TrueFalse`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Mark each statement True or False" prompt. |

### `Statement`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `answer` | `'true' \| 'false'` | yes | — | The correct verdict. |

### `Why`

No props. Optional explanation revealed in the end-of-round review.

## Slots

- **`TrueFalse` default** — one or more `<Statement>` children.
- **`Statement` default** — the claim. Inline markdown + a fenced Expressive Code block both work (the review row preserves the formatting).
- **`Why` default** — explanation rendered under the statement in the review. Markdown works.

## Constraints & gotchas

- The stage sizes to the tallest statement (CSS grid stack) — surrounding layout doesn't reflow as the round progresses.
- "Shuffle and play again" re-randomises the order and resets the pips/score.
- Inside the round there's no per-card "Why" reveal — that's deliberate, to keep the round moving. The review at the end is where every explanation lands.
- Score message thresholds: perfect = "Perfect score", within 2 of perfect = "Great work", else "Try again". (No prop to customise.)

## Example

Round of three with custom instructions and inline `<Why>` on each card:

````mdx
<TrueFalse instructions="Each claim is about how React's rendering model behaves under the hood.">
  <Statement answer="true">
    Setting state to the same value React already has (using `Object.is` equality) skips the re-render.
    <Why>React bails out of the update if the new state equals the old by `Object.is`. Useful for primitives — but for objects, "same reference" is what counts, so a fresh object with identical fields *will* re-render.</Why>
  </Statement>

  <Statement answer="false">
    A component re-renders only when its own state or props change.
    <Why>It also re-renders when its parent re-renders, regardless of whether props changed — unless wrapped in `React.memo`.</Why>
  </Statement>

  <Statement answer="true">
    `useEffect` callbacks run *after* the browser has painted the new DOM.
    <Why>Effects are deferred so they don't block paint. If you need to read layout before paint, use `useLayoutEffect`.</Why>
  </Statement>
</TrueFalse>
````

Statement with a fenced code block embedded:

````mdx
<TrueFalse>
  <Statement answer="true">
    In TypeScript, narrowing inside a `typeof x === "string"` branch tightens `x` to `string`.

    ```ts
    function f(x: string | number) {
      if (typeof x === "string") {
        // x is string here
      }
    }
    ```

    <Why>Control-flow analysis narrows the union based on the guard. Outside the branch, `x` is back to `string | number`.</Why>
  </Statement>

  <Statement answer="false">
    `Array.prototype.sort()` returns a new array and leaves the original untouched.
    <Why>It sorts in place *and* returns the same array reference. Use `arr.toSorted()` (ES2023) when you want a non-mutating copy.</Why>
  </Statement>
</TrueFalse>
````
