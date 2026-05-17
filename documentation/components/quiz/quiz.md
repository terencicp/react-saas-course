# `Quiz`

Per-chapter quiz shell. Wraps a set of `<MultipleChoice>` cards (see [multiple-choice.md](../exercises/multiple-choice.md)). The shell adds a sticky score bar at the top of the page, a clickable progress dot per question, an end-of-quiz summary with a per-source breakdown, and persists picks to `localStorage` so a reload resumes mid-quiz.

Each `<MultipleChoice>` keeps its own click → reveal flow; the Quiz shell listens for the `mcq:answered` event each card emits and aggregates the results.

## Imports

```ts
import Quiz from '../../../../components/quiz/Quiz.astro';
import MultipleChoice from '../../../../components/exercises/multiple-choice/MultipleChoice.astro';
import McqChoice from '../../../../components/exercises/multiple-choice/McqChoice.astro';
import McqWhy from '../../../../components/exercises/multiple-choice/McqWhy.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `sources` | `Record<string, string>` | yes | — | Map from source ID (e.g. `'0.X.Y.1'`) to a human-readable note title. The IDs appear as chips on each `<MultipleChoice src="…">` card and group rows in the end-of-quiz "Score by topic" breakdown. |

## Slot

The default slot is one or more `<MultipleChoice src="…">` cards. Each card declares its `src` so the Quiz can:

1. Render a `(src)` pill on the card header.
2. Show the matching `sources[src]` title as the chip's tooltip.
3. Group results by `src` in the end-of-quiz summary.

Cards without `src` are still scored but land in the "ungrouped" row of the breakdown.

## What the shell adds

- **Sticky score bar** — `Quiz progress`, `N / total`, plus one clickable dot per question. Dots flip green/red as cards are answered; clicking jumps to that question.
- **Intro paragraph** — auto-generated; describes question count, answer model, and the source-chip convention.
- **Auto-fill per-card header** — the source pill and "Question N of M" line on each `<MultipleChoice>` are populated by the shell (the bare card hides its header when used standalone).
- **Auto-scroll** — when a card is answered correctly, the page smoothly scrolls to the next unanswered card.
- **End-of-quiz summary** — overall `N / total · pct%`, a one-line verdict graded against thresholds (100 / ≥85 / ≥65 / under), a per-source breakdown, and two buttons: **Try all again** (reset) and **Review N missed** (filter to wrong cards only).
- **localStorage persistence** — keyed by `location.pathname`. Picks are restored on page load; a reload resumes mid-quiz. Reset clears the entry.

## Constraints & gotchas

- The shell relies on each card emitting `mcq:answered` and listening for `mcq:reset` / `mcq:restore`. Only `<MultipleChoice>` cards from this codebase implement those events — other exercise types don't roll into the Quiz score.
- The `src` strings on cards must exist as keys in `sources` for the title tooltip and breakdown row to render meaningfully. Cards with a `src` not in `sources` show the bare ID with no title.
- The score bar is `position: sticky` under the Starlight nav (`top: var(--sl-nav-height)`). On long quizzes this is desirable; if a lesson nests a Quiz inside an unusual container, sticky positioning may misbehave.
- Verdict thresholds are hardcoded (100% / 85% / 65%). No prop to customise.

## Example

Three questions tagged by source, one of them multi-select (auto-detected from two `correct` marks):

````mdx
<Quiz sources={{
  '4.7.4': 'State as a snapshot',
  '4.7.5': 'Updater functions',
  '4.8.1': 'useState basics',
}}>
  <MultipleChoice src="4.7.4">
    Calling `setCount(count + 1)` three times in the same handler results in count incrementing by…

    <McqChoice>3</McqChoice>
    <McqChoice correct>1</McqChoice>
    <McqChoice>9</McqChoice>

    <McqWhy>Each call reads the same snapshot of `count`. They all resolve to `count + 1`. Use the updater form (`prev => prev + 1`) to stack.</McqWhy>
  </MultipleChoice>

  <MultipleChoice src="4.7.5">
    Which form correctly increments `count` three times per click?

    <McqChoice>
      ```js
      setCount(count + 1);
      setCount(count + 1);
      setCount(count + 1);
      ```
    </McqChoice>
    <McqChoice correct>
      ```js
      setCount(prev => prev + 1);
      setCount(prev => prev + 1);
      setCount(prev => prev + 1);
      ```
    </McqChoice>

    <McqWhy>The updater form reads from the queue, so each call stacks on top of the previous one.</McqWhy>
  </MultipleChoice>

  <MultipleChoice src="4.8.1">
    Which of these belong in `useState`? **Select all that apply.**

    <McqChoice correct>A modal's open/closed flag</McqChoice>
    <McqChoice correct>The current page number in a paginated list</McqChoice>
    <McqChoice>The user's auth token (used by every page)</McqChoice>
    <McqChoice>A computed value derived from another piece of state</McqChoice>

    <McqWhy>Component-local UI state belongs in `useState`. Cross-cutting state (auth) goes in a store. Derived values shouldn't be stored at all.</McqWhy>
  </MultipleChoice>
</Quiz>
````
