# `MultipleChoice` + `McqChoice` + `McqWhy`

Single multiple-choice question. Mark the right answer(s) with `correct` on `<McqChoice>`. With one `correct` choice, the card runs in click-and-reveal mode (the student's click immediately reveals right/wrong). With two or more, it switches to multi-select / submit-to-check mode automatically — a Check button appears and the student picks all that apply before submitting.

The optional `<McqWhy>` slot is the explanation, prefixed `Correct.` or `Not quite.` in the reveal. Inside a `<Quiz>` (see [quiz.md](../quiz/quiz.md)), `<MultipleChoice>` cards roll up into a shared score bar.

To properly help the student self-check its knowledge, it's important that answers are not literally exactly what's in the prose otherwise the student is not thinking, it's just pattern-matching.

## Imports

```ts
import MultipleChoice from '../../../../components/exercises/multiple-choice/MultipleChoice.astro';
import McqChoice from '../../../../components/exercises/multiple-choice/McqChoice.astro';
import McqWhy from '../../../../components/exercises/multiple-choice/McqWhy.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `MultipleChoice`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `src` | `string` | no | — | Source pill — typically a chapter reference like `'0.2.1.1'`. Only renders when the card sits inside a `<Quiz>`. |

### `McqChoice`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `correct` | `boolean` | no | `false` | Mark this option as a valid answer. Two or more `correct` choices switch the card to multi-select / submit mode. |

### `McqWhy`

No props. Optional explanation revealed alongside the answer.

## Slots

- **`MultipleChoice` default** — question prose first, then `<McqChoice>` options, then an optional `<McqWhy>`. The question can include inline code, fenced code blocks, etc.
- **`McqChoice` default** — option text. Inline markdown works; a fenced code block becomes the entire answer ("which snippet does X?").
- **`McqWhy` default** — explanation markdown. Auto-prefixed with `Correct.` / `Not quite.` based on the result.

## Constraints & gotchas

- Multi-select mode is auto-detected from the number of `correct` marks. Don't try to force one mode or the other manually.
- Bullets show letters (A, B, C, …) in single-correct mode and check-squares in multi-select mode. The styling is purely visual; the underlying click handling is the same.
- The "Try again" button reappears after a wrong answer in single-correct mode. In multi-select, the Check button is re-enabled.
- Inside a `<Quiz>`, the card auto-fills its header with the source pill and "Question N of M". Standalone, the header is hidden.

## Example

Single correct, prose options:

````mdx
<MultipleChoice>
  In modern JavaScript, which keyword creates a binding that **can't be reassigned**?

  <McqChoice>`var`</McqChoice>
  <McqChoice>`let`</McqChoice>
  <McqChoice correct>`const`</McqChoice>
  <McqChoice>`final`</McqChoice>

  <McqWhy>`const` locks the binding. The value can still mutate (e.g. you can `push` into a `const` array), but you can't point the name at something else.</McqWhy>
</MultipleChoice>
````

Single correct, code block in the question, fenced code as answers:

````mdx
<MultipleChoice>
  Which snippet copies an array without mutating the original?

  <McqChoice>
    ```js
    const b = a;
    ```
  </McqChoice>
  <McqChoice correct>
    ```js
    const b = [...a];
    ```
  </McqChoice>
  <McqChoice>
    ```js
    const b = a.sort();
    ```
  </McqChoice>
</MultipleChoice>
````

Multi-select (auto-detected from two `correct` marks):

````mdx
<MultipleChoice>
  Which of these are **block-scoped** in JavaScript? Select all that apply.

  <McqChoice correct>`let`</McqChoice>
  <McqChoice correct>`const`</McqChoice>
  <McqChoice>`var`</McqChoice>

  <McqWhy>`let` and `const` are block-scoped. `var` is function-scoped.</McqWhy>
</MultipleChoice>
````
