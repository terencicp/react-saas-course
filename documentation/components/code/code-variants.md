# `CodeVariants` + `CodeVariant`

Tabbed side-by-side comparison of two or more versions of the same code. Wraps Starlight's `<Tabs>` in a card. Each tab holds one fenced Expressive Code block plus prose explaining that variant.

## Imports

```ts
import CodeVariants from '../../../components/code/code-variants/CodeVariants.astro';
import CodeVariant from '../../../components/code/code-variants/CodeVariant.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `CodeVariants`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `syncKey` | `string` | no | — | Forwarded to Starlight `<Tabs>`. Multiple `<CodeVariants>` blocks on the same page that share a `syncKey` switch tabs in lockstep. |
| `maxLines` | `number` | no | `16` | Caps every variant's visible code-block height to ~`maxLines` lines and adds vertical scroll. Applies uniformly across all tabs so the card doesn't resize when switching variants. Pass `0` to disable the cap. |

### `CodeVariant`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `label` | `string` | yes | — | Text shown on the tab strip. |
| `icon` | `string` | no | — | Starlight icon name, prefixed on the tab. |

## Slot / structure

- `<CodeVariant>` must be a **direct child** of `<CodeVariants>`. Neither stands alone.
- Each variant's slot holds:
  1. **One fenced Expressive Code block.**
  2. **Prose below it** (markdown — bold, inline code, links all fine). Keep it to **one paragraph, six lines max** — the card is meant to be a quick A/B/C glance, not a long-form explanation. If the variant needs more, lead with the one-paragraph framing inside the tab and continue the discussion in regular prose below the `<CodeVariants>` block.
- No nested components.

Any variant-specific framing ("fast / slow", "leaks tokens", "cached") goes in the **first sentence of the prose**, not in props. The component has no header decorations.

## Highlight syntax (inside the fence)

Standard Expressive Code meta. Mix freely:

| Syntax | Example | Effect |
| --- | --- | --- |
| Line range | ` ```ts {2-4} ` | Plain highlight |
| Deletion | ` ```ts del={2} ` | Red strikethrough line |
| Insertion | ` ```ts ins={2-3} ` | Green added-line mark |
| Quoted string | ` ```ts "Promise.all" ` | Highlight tokens |
| Regex | ` ```ts /\bawait\b/ ` | Regex matches |

`del=` and `ins=` are especially useful for before/after framing.

### Per-pane mark color

Each pane's fence can be wrapped in `<div data-mark-color="…">` to re-tint that pane's `{line}` / `"token"` / `/regex/` marks. Five colors: `green`, `red`, `blue`, `orange`, `violet`. Same hook used by `<AnnotatedStep color="…">`; see [Colored marks](../starlight/code.md#colored-marks--data-mark-color-wrapper) for the full story and how to add colors. Blank lines around the inner fence are required so MDX parses it as markdown.

The wrapper is layout-transparent — the EC frame still sits flush with the card edges, and the prose underneath keeps its divider. The pane CSS keys off `:has(> .expressive-code)` to recognize the wrapper, so a `<div data-mark-color>` wrapping a fence is treated the same as a bare fence for layout. If you add a second wrapper around the fence for some other reason, mirror that selector or it'll get treated as prose (1rem of side padding, indented from the card edge).

````mdx
<CodeVariants>
  <CodeVariant label="useState">
    <div data-mark-color="green">

    ```ts {2}
    const [count, setCount] = useState(0);
    ```

    </div>
    **Local, ephemeral.** Component-scoped state, forgotten on unmount.
  </CodeVariant>

  <CodeVariant label="Zustand">
    <div data-mark-color="orange">

    ```ts {1}
    const count = useCounterStore((s) => s.count);
    ```

    </div>
    **Global, selector-based.** State lives outside React.
  </CodeVariant>
</CodeVariants>
````

## Constraints & gotchas

- Two or more variants per `<CodeVariants>`.
- Every `<CodeVariant>` needs `label` — omit it and the tab is blank.
- Every variant needs **at least one fence** in the slot, or Expressive Code errors out.
- The prose immediately after the fence gets a top border separating it from the code — only the first prose block gets that treatment.

## Example

Three variants with `del=` and `ins=` markers, and `syncKey` on the parent so the same tab stays active across other `<CodeVariants>` blocks with the same key on this page:

````mdx
<CodeVariants syncKey="loader-style">
  <CodeVariant label="Naive">
    ```ts del={2}
    export async function loader() {
      return { user: await getUser(), apiKey: process.env.STRIPE_KEY };
    }
    ```
    **Leaks tokens to the client.** Returning the Stripe secret from a loader puts it in the page payload — anyone with devtools can read it.
  </CodeVariant>

  <CodeVariant label="Better">
    ```ts ins={2-3}
    export async function loader() {
      const user = await getUser();
      return { user };
    }
    ```
    **Server-only, but still fetches on every request.** Secret stays on the server; every hit re-fetches the user.
  </CodeVariant>

  <CodeVariant label="Best">
    ```ts ins={2}
    export async function loader() {
      const user = await getCachedUser();
      return { user };
    }
    ```
    **Cached, revalidated on auth events.** Sub-millisecond reads.
  </CodeVariant>
</CodeVariants>
````
