# `Dropdowns` + `Choice`

Fill-in-the-blank drill where each blank is a `<select>`. Two authoring modes:

- **Inline prose** — drop a `<Choice answer="…" options={[…]} />` at each blank in the prose slot.
- **Fenced code block** — write `___` (three underscores) at each blank inside a fenced block and pass an `answers` prop on `<Dropdowns>` listing the answers in source order. The block is highlighted by Expressive Code first; the runtime then swaps each `___` for a `<select>`.

## Imports

```ts
import Dropdowns from '../../../../components/exercises/dropdowns/Dropdowns.astro';
import Choice from '../../../../components/exercises/dropdowns/Choice.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `Dropdowns`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `answers` | `{ answer: string; options: string[] }[]` | no | `[]` | Used only with the **fenced code block** mode. One entry per `___` placeholder in the slot, in source order. |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Pick the right option…" prompt. |

### `Choice`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `answer` | `string` | yes | — | The option value that is correct. Must appear in `options`. |
| `options` | `string[]` | yes | — | The list of options shown in the dropdown. Rendered in author order; a blank option is prepended automatically. |

## Slot

`<Dropdowns>` default — prose or a fenced code block (or both). Use `<Choice>` directly inside prose; use `___` inside a fenced block.

## Constraints & gotchas

- The two authoring modes can be combined in the same `<Dropdowns>` if needed, but it's rare. Pick one per card.
- For the fenced mode, the number of `___` tokens must match `answers.length` — extras stay as literal text, missing entries leave later blanks unfilled.
- Comparison is exact string match — case-sensitive, whitespace-sensitive. Quote your strings the same way in `answer` and `options`.
- On Check, blanks that are still empty are reported separately from wrong picks ("`N still blank`"); the student doesn't get a wrong-answer mark for empties.

## Example

Inline prose with three dropdowns:

````mdx
<Dropdowns>
  HTTP <Choice answer="GET" options={['GET', 'POST', 'PUT', 'DELETE']} /> is the
  default safe method for fetching a resource. <Choice answer="POST" options={['GET', 'POST', 'PUT', 'DELETE']} /> creates a new resource, while <Choice answer="DELETE" options={['GET', 'POST', 'PUT', 'DELETE']} /> removes one.
</Dropdowns>
````

Fenced code block with three blanks:

````mdx
<Dropdowns answers={[
  { answer: '===', options: ['===', '==', '='] },
  { answer: 'isArray', options: ['isArray', 'isList', 'is'] },
  { answer: 'typeof', options: ['typeof', 'instanceof', 'type'] },
]}>
```ts
function classify(input: unknown) {
  if (typeof input ___ "string") {
    return "text";
  }
  if (Array.___(input)) {
    return "list";
  }
  return ___ input;
}
```
</Dropdowns>
````
