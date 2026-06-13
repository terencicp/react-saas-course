# `TextAnswer` + `AnswerWhy`

Free-text answer drill. The student types a free-form answer into a textarea and presses **Submit answer**. An AI model — via OpenRouter, using the reader's own key (shared with the AI chat) — streams a one-paragraph verdict: the first word is `Pass.` or `Fail.` (driving the panel color and headline), the rest streams live into the panel as tokens arrive. The grader is told to weave the `<AnswerWhy>` explanation into its paragraph so the student walks away understanding the principle.

If the request errors out or never produces a verdict word, the script falls back to **keyword grading**: any one string in the required `keywords` array appearing (case-insensitive substring) in the answer is enough to pass. The fallback path streams the `<AnswerWhy>` text verbatim. The feedback panel labels which path was used (`Graded by AI` vs `Graded by keyword match`). Submitting with no key instead opens the chat panel so the reader can add one, then re-submit.

## Imports

```ts
import TextAnswer from '../../../components/exercises/text-answer/TextAnswer.astro';
import AnswerWhy from '../../../components/exercises/text-answer/AnswerWhy.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `TextAnswer`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `rubric` | `string` | yes | — | What the answer must include to pass. Sent to the grader. Write it as a concrete checklist sentence, not a question. |
| `keywords` | `string[]` | yes | — | Fallback substrings for keyword grading. **Required** — every card needs a working offline path. Author with synonyms ("stale", "doesn't update", "out of sync") so plausible phrasings match. |
| `lines` | `number` | no | `4` | Initial textarea height in rows. The textarea is also vertically resizable. |
| `placeholder` | `string` | no | `'Write your answer…'` | Textarea placeholder. |

### `AnswerWhy` — required inside the slot

No props. The senior-quality explanation. **Must be present** — the component throws at build time if no `<AnswerWhy>` is found. Its content is fed to the AI grader (so the feedback paragraph can weave the principle in) and rendered verbatim in the keyword-fallback path. **Never rendered to the page in the AI path.**

## Slots

- **`TextAnswer` default** — question prose + optional fenced code block + a **required** `<AnswerWhy>`.
- **`AnswerWhy` default** — the senior explanation. Markdown / inline code / links all work.

## Constraints & gotchas

- The `<AnswerWhy>` slot is enforced at build time. Missing it = build error. Empty `keywords` array = build error.
- The AI grader receives: the rubric, the `<AnswerWhy>` text, the flattened question, and the student's answer. It does **not** see the `keywords` (those are pure offline).
- Cmd/Ctrl-Enter inside the textarea submits.
- The card locks after submit — answer remains visible but greyed out. There's no "Try again" path; if the lesson needs retry, the student would re-load.
- Streamed paragraphs trim leading whitespace after the verdict word to avoid the dangling space some models emit between `Pass.` and the explanation.

## Example

Short prose answer:

````mdx
<TextAnswer
  rubric="The answer should explain that derived state must be recomputed on each render from the current props or state, otherwise a useState mirror only updates on mount and goes stale."
  keywords={["stale", "re-sync", "doesn't update", "out of sync", "initial value", "only runs once", "mount"]}
  lines={3}
>

In React, why is mirroring a prop into `useState` (e.g. `const [name, setName] = useState(props.name)`) considered an anti-pattern?

<AnswerWhy>The local state is initialized once and never re-syncs with the prop. Any update to `props.name` from the parent won't reach the child until something explicitly calls `setName` — derived values should be recomputed from props on every render instead.</AnswerWhy>

</TextAnswer>
````

With a fenced code block in the question:

````mdx
<TextAnswer
  rubric="The answer should identify that the dependency array is missing — the effect captures the initial value of count and the interval will always log 0."
  keywords={["dependency", "deps", "closure", "stale", "captures", "only runs once", "missing"]}
  lines={4}
>

What's wrong with this `useEffect`, and how would you fix it?

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => console.log(count), 1000);
    return () => clearInterval(id);
  }, []);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

<AnswerWhy>The empty dependency array means the effect only runs once — the interval closes over `count = 0` forever. Fix by adding `count` to the deps, or by using a ref / functional setState so the latest value is read without re-subscribing.</AnswerWhy>

</TextAnswer>
````
