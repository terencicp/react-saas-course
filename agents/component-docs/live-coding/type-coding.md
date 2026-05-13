# `TypeCoding`

Type-only live-coding widget. CodeMirror over an in-browser TypeScript LanguageService (via `@typescript/vfs`). **The student's code is never executed** — the exercise is "make tsc quiet" and (optionally) resolve Twoslash-style `^?` queries to the expected types. The checker re-runs ~300ms after the student stops typing.

Reach for this widget for `satisfies`, branded types, discriminated unions, `keyof` / `typeof` refactors — anything where the exercise is about the *type*, not the runtime. For Zod (one declaration produces both the type and the runtime contract), use [`ZodCoding`](./zod-coding.md).

## Import

```ts
import TypeCoding from '../../../../components/live-coding/TypeCoding/TypeCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `starter` | `string` | yes | — | TS code the editor opens with. May contain Twoslash `^?` query markers (see below). |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `expectedQueries` | `ExpectedQuery[]` | no | `[]` | Type-query criteria — each pins a `^?` marker's resolved type to a substring. |
| `expectedErrors` | `ExpectedError[]` | no | `[]` | Diagnostic-message criteria — each requires a TS error containing a substring (optionally pinned to a line). |
| `maxHeight` | `number` | no | `320` | Editor height cap, in px. |

### `ExpectedQuery`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `line` | `number` | yes | — | 1-indexed line of the `^?` marker. |
| `contains` | `string` | yes | — | Substring that must appear in the resolved type's display string (e.g. `'"red" \| "green" \| "blue"'`). |

### `ExpectedError`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `contains` | `string` | yes | — | Substring the diagnostic message must contain. |
| `line` | `number` | no | — | 1-indexed line the error must be on. Omit to accept the error anywhere. |

## Twoslash `^?` queries

In the `starter` source, add a `^?` comment under the expression whose type you want surfaced:

```ts
const c: ColorName = 'red';
//       ^?
```

The widget renders the resolved type below the editor as the student types. With `expectedQueries`, each line+substring pair becomes a row in the criteria checklist.

## "This line should fail to type-check" lessons

When a lesson wants to prove "the type system would catch this bug", don't make an error a checklist target — that inverts the natural "errors are bad, fix them" model. Use the real TypeScript idiom **`// @ts-expect-error`** on the line above the should-fail line. The directive itself errors with `"Unused '@ts-expect-error' directive"` when the line below *doesn't* error — same goal, normal polarity: the student's job stays "make all errors go away".

## Constraints & gotchas

- No runtime. The student can write `console.log(...)` and it won't run.
- The "Fix all errors" criterion is auto-added only when **no** `expectedQueries` and **no** `expectedErrors` are declared. Once the lesson pins explicit criteria, "no errors remain" is implicit (the bottom diagnostics panel makes leftover errors loud).
- The criteria checklist sits *above* the editor (the only widget that does this — `criteriaPosition='above'`), so the goal reads first.
- The checker takes ~1 second to boot on first paint — the editor shows a "Booting type-checker…" pill until ready.
- `^?` queries that point to nothing (no expression on the line above) resolve to nothing and the criterion stays unmet.

## Example

`satisfies` exercise — checking that the keys stay narrow:

````mdx
<TypeCoding
  instructions="Replace the annotation `: Record<string, string>` with `satisfies Record<string, string>` so the inferred `ColorName` keeps the literal keys."
  starter={`const colors: Record<string, string> = {
  red: '#f00',
  green: '#0f0',
  blue: '#00f',
};

type ColorName = keyof typeof colors;
//   ^?
`}
  expectedQueries={[
    { line: 8, contains: '"red" | "green" | "blue"' },
  ]}
/>
````

Discriminated union with both an `expectedQueries` row and an implicit "fix the errors" goal:

````mdx
<TypeCoding
  instructions="Rewrite State as a discriminated union on `status` so the errors inside `handle` go away."
  starter={`type State = {
  isLoading: boolean;
  isError: boolean;
  data?: { items: string[] };
  error?: Error;
};

function handle(state: State): string | number {
  if (state.status === 'loading') return 'loading…';
  if (state.status === 'error') return state.error.message;
  //                                     ^?
  return state.data.items.length;
}`}
  expectedQueries={[
    { line: 11, contains: '"error"' },
  ]}
/>
````
