# `PredictOutput` + `Why`

"Predict what this program prints" drill. Wrap a fenced code block in the slot; pass the program's literal stdout via `expected`. The student types into a console-styled textarea and presses **Check**. The script trims trailing whitespace per line and trailing blank lines before comparing.

An optional `<Why>` slot is revealed on a wrong answer (alongside the expected output after the second wrong attempt). On a correct answer, the panel collapses to a green check + "Correct" label.

## Imports

```ts
import PredictOutput from '../../../../components/exercises/predict-output/PredictOutput.astro';
import Why from '../../../../components/exercises/predict-output/Why.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `PredictOutput`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `expected` | `string` | yes | — | The program's literal stdout. Use a template string for multi-line output: ``expected={`line one\nline two`}``. |
| `placeholder` | `string` | no | `'Type the predicted output…'` | Textarea placeholder. |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Predict what this program prints…" prompt. |

The textarea height auto-sizes to the line count of `expected` (so the box mirrors the volume of output being predicted).

### `Why`

No props. Optional explanation revealed on a wrong answer.

## Slots

- **`PredictOutput` default** — question prose (optional) + one fenced code block (the program) + an optional `<Why>`. Inline markdown works.
- **`Why` default** — explanation rendered into the wrong-feedback panel.

## Constraints & gotchas

- Comparison is exact after normalization: per-line trailing whitespace stripped, leading/trailing blank lines stripped. Internal blank lines and leading whitespace are significant.
- Multi-line `expected` is easiest as a template string with `\n` separators or a raw multi-line string. Don't add a trailing newline — it'd be trimmed anyway.
- On the **first** wrong attempt, the expected output is **withheld** so the student gets a chance to fix it themselves. From the second attempt on, it's revealed.
- Cmd/Ctrl-Enter inside the textarea submits.
- Once correct, the input is disabled (no Try-again button — they got it).

## Example

Single-line output:

````mdx
<PredictOutput expected="Hello, world!">

```js
const greet = (name) => `Hello, ${name}!`;
console.log(greet("world"));
```

<Why>Template literals splice the argument straight into the string.</Why>

</PredictOutput>
````

Multi-line output (template-string form):

````mdx
<PredictOutput expected={`3
3
3`}>

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

<Why>`var` is function-scoped — every callback closes over the **same** `i`, which has run up to `3` by the time the timers fire. Swap `var` for `let` and you get `0 1 2`.</Why>

</PredictOutput>
````
