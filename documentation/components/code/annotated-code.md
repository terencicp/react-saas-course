# `AnnotatedCode` + `AnnotatedStep`

Stepped walkthrough of a single code block. The block is written **once** as the `code` prop on `<AnnotatedCode>`; each `<AnnotatedStep>` declares only a highlight `meta` string and the prose that explains it. The parent renders Previous/Next buttons and a `N / Total` counter; only one step is visible at a time.

## Imports

```ts
import AnnotatedCode from '../../../../components/code/annotated-code/AnnotatedCode.astro';
import AnnotatedStep from '../../../../components/code/annotated-code/AnnotatedStep.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `AnnotatedCode`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `code` | `string` | yes | — | The code shown in every step. Leading/trailing blank lines and common indentation are stripped, so you can author a template literal with normal MDX indentation. |
| `lang` | `string` | yes | — | Expressive Code language identifier (`ts`, `tsx`, `js`, `bash`, `sql`, etc.). |
| `maxLines` | `number` | no | — (no cap) | Caps the visible code-block height to ~`maxLines` lines and adds vertical scroll. On step change, scrolls the active step's first highlight into view. |

### `AnnotatedStep`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `meta` | `string` | no | `''` (no highlight) | Expressive Code meta — same syntax as a fenced block's meta after the language tag. See **Highlight syntax** below. |
| `color` | `'green' \| 'red' \| 'blue' \| 'orange' \| 'violet'` | no | — (neutral grey) | Re-tints **every** highlight in this step (line ranges, quoted strings, regex) with one color. |

## Slot / structure

- `<AnnotatedStep>` must be a **direct child** of `<AnnotatedCode>`. It carries no visible chrome on its own — it only contributes `meta` + prose to its parent.
- Each step's slot is plain prose (markdown / inline JSX). No fenced code block — the code lives on the parent.
- The Prev/Next bar + counter are rendered by `<AnnotatedCode>` automatically.

## Highlight syntax (`meta` prop)

Standard Expressive Code meta — same as what you'd write after a fence's language tag:

| Syntax | `meta` value | Effect |
| --- | --- | --- |
| Line range | `"{1-3}"` | Highlight lines 1–3 |
| Quoted string | ``meta={`"useState" "count"`}`` | Highlight every occurrence of each quoted token |
| Regex | `"/set\\w+/"` | Highlight regex matches |
| Combined | ``meta={`{1-2} "query"`}`` | Mix any of the above |

When the value contains `"`, write it inside a `meta={`…`}` template literal so MDX doesn't fight you over quoting.

The `color` prop on the step tints all three kinds uniformly — you can't color individual highlights differently within a single step.

Under the hood, `color="green"` sets `data-mark-color="green"` on the step container. The same five colors (`green`, `red`, `blue`, `orange`, `violet`) are available on **any** Expressive Code block — wrap a plain fence in `<div data-mark-color="…">` and `<CodeVariant>` panes the same way. See [Colored marks](../starlight/code.md#colored-marks--data-mark-color-wrapper) in the plain-fences doc. The palette lives in `src/styles/custom.css`; edit there to add or recolor.

## Constraints & gotchas

- At least two steps. A single step renders disabled controls with nothing to do.
- The `code` prop is the single source of truth — changing the source updates every step in one place.
- `lang` and `maxLines` go on the **parent** `<AnnotatedCode>`, not on individual steps.

## Example

Four steps, all three marker features (`{range}`, `"string"`, `/regex/`, `color`), and `maxLines` on the parent — the 8-line block is written exactly once:

````mdx
<AnnotatedCode lang="ts" maxLines={8} code={`
export async function GET(req: NextRequest) {
  const sessionId = (await cookies()).get('session_id')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionId));
  return NextResponse.json({ user });
}
`}>
  <AnnotatedStep meta="{1}">
    The route's GET handler signature.
  </AnnotatedStep>

  <AnnotatedStep meta={`{2-5} "cookies()"`} color="orange">
    Read the session cookie and short-circuit when it's missing. `color="orange"` tints both the line range and the quoted `cookies()` mark.
  </AnnotatedStep>

  <AnnotatedStep meta={`{6} /eq\\(.+\\)/`} color="green">
    Look up the user. The regex marks the Drizzle predicate.
  </AnnotatedStep>
</AnnotatedCode>
````
