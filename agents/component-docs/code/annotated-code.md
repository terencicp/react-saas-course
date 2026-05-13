# `AnnotatedCode` + `AnnotatedStep`

Stepped walkthrough of a single code block. Each `<AnnotatedStep>` is one "slide" — its own Expressive Code block with highlights, plus prose explaining what's highlighted. The parent renders Previous/Next buttons and a `N / Total` counter; only one step is visible at a time.

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
| `maxLines` | `number` | no | — (no cap) | Caps the visible code-block height to ~`maxLines` lines and adds vertical scroll. On step change, scrolls the active step's first highlight into view. |

### `AnnotatedStep`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `color` | `'green' \| 'red' \| 'blue' \| 'orange' \| 'violet'` | no | — (neutral grey) | Re-tints **every** highlight in this step (line ranges, quoted strings, regex) with one color. |

## Slot / structure

- `<AnnotatedStep>` must be a **direct child** of `<AnnotatedCode>`. It has no useful output on its own.
- Each step's slot holds:
  1. **One fenced Expressive Code block.**
  2. **Prose below it** (markdown / inline JSX). No wrapper element — just write it after the fence.
- The Prev/Next bar + counter are rendered by `<AnnotatedCode>` automatically.

## Highlight syntax (inside the fence)

Standard Expressive Code meta — passed through unchanged. Mix freely on the same fence:

| Syntax | Example | Effect |
| --- | --- | --- |
| Line range | ` ```ts {1-3} ` | Highlight lines 1–3 |
| Quoted string | ` ```ts "useState" "count" ` | Highlight every occurrence of each quoted token |
| Regex | ` ```ts /set\w+/ ` | Highlight regex matches |
| Combined | ` ```ts {1-2} "query" ` | Mix any of the above |

The `color` prop on the step tints all three kinds uniformly — you can't color individual highlights differently within a single step.

## Constraints & gotchas

- At least two steps. A single step renders disabled controls with nothing to do.
- Exactly one code block per step. Multiple blocks aren't supported by the styling.
- The same source code typically appears in *every* step — only the highlights change between them. Copy the full block into each step and adjust the meta.
- `maxLines` goes on the **parent** `<AnnotatedCode>`, not on individual steps.

## Example

Three steps, all four marker features (`{range}`, `"string"`, `/regex/`, `color`), and `maxLines` on the parent:

````mdx
<AnnotatedCode maxLines={8}>
  <AnnotatedStep>
    ```ts {1}
    export async function GET(req: NextRequest) {
      const sessionId = (await cookies()).get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionId));
      return NextResponse.json({ user });
    }
    ```
    The route's GET handler signature.
  </AnnotatedStep>

  <AnnotatedStep color="orange">
    ```ts {2-5} "cookies()"
    export async function GET(req: NextRequest) {
      const sessionId = (await cookies()).get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionId));
      return NextResponse.json({ user });
    }
    ```
    Read the session cookie and short-circuit when it's missing. `color="orange"` tints both the line range and the quoted `cookies()` mark.
  </AnnotatedStep>

  <AnnotatedStep color="green">
    ```ts {6} /eq\(.+\)/
    export async function GET(req: NextRequest) {
      const sessionId = (await cookies()).get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionId));
      return NextResponse.json({ user });
    }
    ```
    Look up the user. The regex marks the Drizzle predicate.
  </AnnotatedStep>
</AnnotatedCode>
````
