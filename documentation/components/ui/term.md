# `Term`

Inline vocabulary callout. Wraps a word or short phrase in prose with a dashed underline and shows a short definition in a hover/focus tooltip. Use for terms the reader can probe in place, instead of breaking the paragraph to define them.

## Import

```ts
import Term from '../../../../components/ui/Term.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `definition` | `string` | yes | — | Plain text shown in the tooltip. Newlines (`\n`) are preserved, so short multi-line definitions render across lines. |

## Slot

The default slot is the **term itself** — the word or short phrase to underline in the prose flow. Keep it inline: a single word or a tight noun phrase, not a sentence.

## Constraints & gotchas

- Plain-text tooltip only — no MDX, no links, no inline code formatting inside `definition`. For long or richly-formatted explanations, fall back to an `Aside` or a paragraph.
- The tooltip is rendered into `document.body` and positioned with Floating UI (`top` placement, flips/shifts to stay on screen). It's keyboard-reachable — the term is focusable and the tooltip shows on focus.
- For tooltips on tokens *inside a code block*, use `CodeTooltips` instead; `Term` is prose-only.

## Example

A paragraph with two inline terms, the second using a multi-line definition:

```mdx
A React component holds its own piece of UI state with a <Term definition="React hook that returns a [value, setter] pair. Calling the setter re-renders the component with the new value.">useState</Term> hook, while side effects like fetching or subscribing belong in a <Term definition={"React Context.\nProvider at the top, useContext at the bottom.\nGood for theme, auth user, locale — not for fast-changing state."}>context</Term>.
```
