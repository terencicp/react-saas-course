# `CodeReview` + `ReviewFile` + `ReviewIssue` + `ReviewWhy`

PR-style code-review exercise. The student sees a multi-file diff, clicks lines to leave inline review comments, and presses **Submit review**. Each on-line comment is sent to an AI model — via OpenRouter, using the reader's own key (shared with the AI chat) — that grades it against the issue's `kernel`, a short rubric phrase naming the single defect the senior reviewer would flag. The reveal panel shows ✓ (caught) or ✗ (missed) for every seeded plant.

Two or more `<ReviewFile>` children render inside Starlight's `<Tabs>`; a single file renders inline. Lines display 1-based numbers counting every rendered line (ins + del + context).

## Imports

```ts
import CodeReview from '../../../components/exercises/code-review/CodeReview.astro';
import ReviewFile from '../../../components/exercises/code-review/ReviewFile.astro';
import ReviewIssue from '../../../components/exercises/code-review/ReviewIssue.astro';
import ReviewWhy from '../../../components/exercises/code-review/ReviewWhy.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `CodeReview`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `instructions` | `string` | no | — | Lead-in prepended to the default "Click any line to leave a review comment…" prompt. |

### `ReviewFile`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Filename rendered in the file header (single-file mode) or tab label (multi-file mode). |

### `ReviewIssue`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `file` | `string` | yes | — | Filename — must match a `<ReviewFile name="...">` exactly. |
| `line` | `number` | yes | — | 1-based line index in the rendered source (every line counts, including `ins=` and `del=` ones). |
| `kernel` | `string` | no | — | Short rubric phrase naming the single defect. **The only thing sent to the AI grader.** Authoring this separately from the slot keeps the bar where the lesson author meant it. If omitted, the grader falls back to the flattened slot text. |

### `ReviewWhy`

No props. Optional overall debrief rendered above the issue list after submit.

## Slots

- **`CodeReview` default** — `<ReviewFile>` blocks, `<ReviewIssue>` declarations, and an optional `<ReviewWhy>`. Order doesn't matter; the runtime sorts them.
- **`ReviewFile` default** — exactly one fenced Expressive Code block. Use `ins={...}` / `del={...}` meta for diff gutters.
- **`ReviewIssue` default** — long-form senior reveal shown after submit (markdown / inline JSX). The LLM never sees this; only `kernel` is fed to the grader.
- **`ReviewWhy` default** — overall lesson takeaway, rendered as the top of the reveal panel.

## Grading

Two modes:

- **Comments graded** (default, when an OpenRouter key is set) — every line that received at least one comment is sent to the model along with the `kernel` and a small code window around the target line. The model scores 0–10 against an "identifies the defect" rubric; ≥4 passes. Senior reveal text is **hidden** on caught rows in this mode (the student already nailed it).
- **Lines graded** (fallback when grading errors out) — any comment on the correct line passes, regardless of substance. Senior reveal shows for every plant. The header reads "Lines graded".

A plant is "caught" iff at least one comment lands on its exact `file:line` (and passes the grader, in Comments mode). Plants with no comments on their line are always missed.

## Constraints & gotchas

- `line` counts **every rendered line in source order**, including added/deleted lines (`ins=`, `del=`). The lesson author needs to count carefully when adding multi-line diffs.
- `kernel` should be a single sentence naming the defect ("missing tenant-scope filter"), not a paragraph. The slot holds the paragraph.
- The reveal panel's "missed" reveals can be educational on their own — students who skip a plant still learn what they should have flagged.
- The grader uses the shared OpenRouter client in `src/components/ai-chat/lib/exercise-feedback.ts` with the reader's BYOK key (the same one the AI chat stores). Submitting with comments but no key opens the chat panel to add one; if a graded request errors out, the card degrades to "Lines graded".

## Example

Single file, one plant — the student must flag swapping a type assertion for a runtime parse:

````mdx
<CodeReview>
  <ReviewFile name="src/users/parse.ts">
    ```ts del={3} ins={4}
    import { User } from './schema';
    export function getUser(data: unknown) {
      const result = data as User;
      const result = User.parse(data);
      return result;
    }
    ```
  </ReviewFile>

  <ReviewIssue file="src/users/parse.ts" line={4} kernel="`as User` is a type-level lie that skips runtime validation; `User.parse` is the right call">
    Good move from `as User` to `User.parse(data)` — but the comment should call out **why**: `as` is a type-level lie, the runtime never checks the shape. `User.parse` actually validates.
  </ReviewIssue>

  <ReviewWhy>
    The lesson here isn't the fix; it's spotting the *shape* of the bug. Anywhere an `as` is doing the work of a parse is a candidate for the same flag.
  </ReviewWhy>
</CodeReview>
````

Multi-file diff with three plants and custom instructions:

````mdx
<CodeReview instructions="Pretend you're reviewing this PR for a teammate.">
  <ReviewFile name="src/api/users.ts">
    ```ts del={4} ins={5} del={9} ins={10-12}
    import { db } from '@/lib/db';
    import { usersTable } from '@/lib/schema';

    export async function getUser(id: string) {
      return db.select().from(usersTable).where({ id });
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id));
      return row;
    }

    export async function listUsers() { return db.select().from(usersTable); }
    export async function listUsers(limit = 50) {
      return db.select().from(usersTable).limit(limit);
    }
    ```
  </ReviewFile>

  <ReviewFile name="src/api/users.test.ts">
    ```ts ins={3-6}
    import { listUsers } from './users';

    test('listUsers returns at most `limit` rows', async () => {
      const rows = await listUsers(2);
      expect(rows.length).toBeLessThanOrEqual(2);
    });
    ```
  </ReviewFile>

  <ReviewIssue file="src/api/users.ts" line={6} kernel="`eq` is used but not imported — this won't compile">
    The `eq(...)` import is missing here — this would fail to compile.
  </ReviewIssue>

  <ReviewIssue file="src/api/users.ts" line={11} kernel="magic-number default of 50 for `limit` — needs a named constant or justification">
    Adding `limit` is the right instinct, but a default of 50 is a magic number.
  </ReviewIssue>

  <ReviewIssue file="src/api/users.test.ts" line={5} kernel="test only asserts the upper bound — would pass against an empty result">
    The test only checks the upper bound. It would still pass against `listUsers` returning `[]`.
  </ReviewIssue>
</CodeReview>
````
