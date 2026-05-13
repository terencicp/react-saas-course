# `ZodCoding`

Hybrid live-coding widget for Zod 4. One pane mounts the in-browser TypeScript LanguageService (same engine as [`TypeCoding`](./type-coding.md)) — so `z.infer<typeof S>` resolves and `^?` queries work — and a second pane spins up a sandboxed iframe that imports the **real** `zod` from `esm.sh` and runs each pinned scenario through `schema.safeParse(input)`.

Reach for this widget when the lesson lands the senior pitch for Zod: "one declaration produces both the static type AND the runtime contract." Showing the inferred type update alongside the per-fixture pass/fail in the same card is the whole point. Pure type-shape exercises (`satisfies`, branded types, `as const`) belong in [`TypeCoding`](./type-coding.md) instead.

## Import

```ts
import ZodCoding from '../../../../components/live-coding/ZodCoding/ZodCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `starter` | `string` | yes | — | TS code the editor opens with. May include Twoslash `^?` query markers. |
| `schemaName` | `string` | yes | — | Name of the schema `const` the lesson is testing (e.g. `'UserSchema'`). The runtime looks this up after the student code runs and calls `.safeParse(input)` on it. |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `fixtures` | `Fixture[]` | no | `[]` | Test scenarios — each pins an input and whether the schema should accept or reject it. The fixtures table renders below the editor; rows flip ✓/✗ as the student types. |
| `maxHeight` | `number` | no | `360` | Editor height cap, in px. |

### `Fixture`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Short label rendered in the fixtures table. |
| `input` | `unknown` | yes | — | Value passed to `schema.safeParse(input)`. Any JSON-serializable value. |
| `expect` | `'pass' \| 'fail'` | yes | — | Whether the schema should accept (`pass`) or reject (`fail`) this input. |
| `errorContains` | `string` | no | — | When `expect === 'fail'`, optional substring the Zod error must contain. Lets the lesson assert *why* the input is rejected, not just that it is. |

## Constraints & gotchas

- The runtime imports `zod` from esm.sh on iframe boot — one network call per page load. After that, parsing is local.
- The student writes `import { z } from 'zod';` in the starter (it's normal Zod code). The hosting runtime handles resolution.
- There's no separate "criteria checklist" and no TS diagnostics panel — in Zod, runtime and type follow from the same declaration, so the fixtures table is the only grading surface. Genuine TS syntax errors surface as a harness error row at the top of the table (e.g. `z.objject is not a function`).
- The fixtures table doubles as the type-shape check: if a fixture passes, the type took the right shape. Don't try to also wire `expectedQueries` here — they're not supported.
- `^?` queries still work — render the inferred type below the editor as informational context (e.g. so the student sees `bio?: string | undefined` appear when they add `.optional()`).
- The widget reuses the chip-style controls (Reset/Feedback overlaid on the editor) because typing is the trigger — there is no Run button.

## Example

Required-vs-optional with a `^?` query that students watch:

````mdx
<ZodCoding
  schemaName="ProfileSchema"
  instructions="Make `bio` optional so the `optional bio` scenario passes. Watch the `^?` query — it should flip from `bio: string` to `bio?: string | undefined` as you do."
  starter={`import { z } from 'zod';

export const ProfileSchema = z.object({
  name: z.string(),
  bio: z.string(),
});

type Profile = z.infer<typeof ProfileSchema>;
//   ^?
`}
  fixtures={[
    { name: 'full profile', input: { name: 'Ada', bio: 'mathematician' }, expect: 'pass' },
    { name: 'optional bio',  input: { name: 'Ada' },                       expect: 'pass' },
  ]}
/>
````

Discriminated union, where one fixture proves the impossible-state rejection:

````mdx
<ZodCoding
  schemaName="StateSchema"
  instructions="Rewrite as a discriminated union on `status` so the impossible 'loaded with error' case is rejected at the runtime contract."
  starter={`import { z } from 'zod';

export const StateSchema = z.object({
  status: z.string(),
  loaded: z.boolean().optional(),
  error: z.string().optional(),
  user: z.object({ name: z.string() }).optional(),
});

type State = z.infer<typeof StateSchema>;
//   ^?
`}
  fixtures={[
    { name: 'loading',                        input: { status: 'loading' },                                expect: 'pass' },
    { name: 'error state',                    input: { status: 'error', error: 'boom' },                   expect: 'pass' },
    { name: 'loaded user',                    input: { status: 'loaded', user: { name: 'Ada' } },          expect: 'pass' },
    { name: 'loaded with error (impossible)', input: { status: 'loaded', error: 'boom' },                  expect: 'fail' },
  ]}
/>
````
