# `ReactTestingCallout`

Collapsible callout that lazy-loads [Testing Playground](https://testing-playground.com) prefilled with HTML markup and an optional starter `screen.*` query. The playground analyses the markup and suggests the best React Testing Library query, ranked by the [priority guide](https://testing-library.com/docs/queries/about/#priority). Thin URL builder over [`SandboxCallout`](./sandbox-callout.md) — the markup and query are LZ-compressed at build time and dropped into the hash (`#markup=…&query=…`). No `lz-string` ships on the lesson page (the compress path is inlined into the component).

## Import

```ts
import ReactTestingCallout from '../../../../components/embeds/ReactTestingCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | no | `'Testing Playground'` | `<iframe title>` and default basis for the button label. |
| `html` | `string` | yes | — | HTML markup the playground renders in the left pane. |
| `query` | `string` | no | — | Starter `screen.*` query prefilled in the right pane. |
| `embed` | `boolean` | no | `false` | Use the `/embed` route (no marketing chrome) instead of the main page. |
| `panes` | `string` | no | — | Comma-separated panes to show in `/embed` mode: `markup`, `query`, `preview`, `suggestions`. Only honoured when `embed` is `true`. |
| `height` | `number` | no | `600` | Iframe height in pixels. Both panes need room — bump for forms or nested markup. |
| `label` | `string` | no | `Open: {title}` | Bold text on the collapsed row. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label.

## Constraints & gotchas

- **Markup is `unindent`'d before compression** to match upstream behaviour — so round-trips through the live site don't re-indent and drift the hash. Use a template literal; indentation inside it is normalised.
- **The query pane is plain JS** — write it as you'd write it in a Vitest test (`screen.getByRole(...)`, optional `expect(...)` assertions). The playground evaluates against the markup live.
- **The `logTestingPlaygroundURL()` loop is the killer feature** of the underlying tool — for failing tests, the URL is minted by `@testing-library/dom` rather than authored by hand. This component covers the inverse case: seeding the playground from a lesson.

## Example

````mdx
<ReactTestingCallout
  title="Login form"
  html={`<form>
    <label for="email">Email</label>
    <input id="email" type="email" />
    <button type="submit">Sign in</button>
  </form>`}
  query={`screen.getByLabelText(/email/i)`}
  height={620}
>
  `getByLabelText` is the top-of-ladder query for labelled form controls.
</ReactTestingCallout>
````
