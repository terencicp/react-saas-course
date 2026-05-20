# `ZodPlaygroundCallout`

Collapsible callout that lazy-loads the [marilari88 Zod Playground](https://zod-playground.vercel.app/) with a schema (and optional sample values, Zod version, `zod/mini` flag) prefilled. Thin URL builder over [`SandboxCallout`](./sandbox-callout.md) — the schema + values are `JSON.stringify`'d, LZ-compressed at build time, and dropped into `?appdata=…`. No `lz-string` ships on the lesson page (the compress path is inlined into the component).

## Import

```ts
import ZodPlaygroundCallout from '../../../../components/embeds/ZodPlaygroundCallout.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | — | `<iframe title>` and default basis for the button label. |
| `schema` | `string` | yes | — | Schema source shown in the Monaco editor. **Must end with `return schema`** — the playground evaluates the body as a function and uses the return value. |
| `values` | `string[]` | no | `['{}']` | Sample values, one per right-pane validator. Strings are pasted as-is, so wrap JS string literals in double quotes (e.g. `'"hi@example.com"'`). |
| `version` | `string` | no | `'4.1.16'` | Zod version the playground's version-picker loads. |
| `isZodMini` | `boolean` | no | `false` | Load `zod/mini` instead of the full surface. |
| `height` | `number` | no | `540` | Iframe height in pixels. |
| `label` | `string` | no | `Open: {title}` | Bold text on the collapsed row. Keep an `Open …` prefix so the toggle reads naturally. |

## Slot

The default slot is the **message** — one sentence of framing rendered next to the label.

## Constraints & gotchas

- **`return schema` is mandatory.** The playground evaluates the editor body via `new Function`, so a missing return silently yields `undefined` and the right pane reports "schema is not defined".
- **Values are JS expressions, not JSON.** Strings need quotes; you can write `new File([...], 'a.png', { type: 'image/png' })` and it'll evaluate. JSON-shaped values still work because JSON is a subset of JS expressions.
- **No type-checker pane.** The playground runs the schema for real but doesn't show inferred types — for Monaco hover on `z.infer<typeof schema>`, fall back to [`TSPlaygroundCallout`](./ts-playground-callout.md) with Zod imported, or use [`ZodCoding`](../live-coding/zod-coding.md) for a graded exercise.
- **`appdata` payload caps around browser URL limits** (~64 KB compressed). For schemas bigger than a few hundred lines, link out to a hosted Zod Playground share URL via plain [`SandboxCallout`](./sandbox-callout.md).

## Example

````mdx
<ZodPlaygroundCallout
  title="Email validator"
  schema={`const schema = z.string().email()
return schema`}
  values={[`"hi@example.com"`, `"not-an-email"`, `42`]}
  height={500}
>
  Open the live playground with this email validator and three sample inputs prefilled.
</ZodPlaygroundCallout>
````
