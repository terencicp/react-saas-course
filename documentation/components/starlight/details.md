# `<details>`

Collapsible disclosure widget — a clickable summary line that expands to reveal hidden content. Native HTML element styled by Starlight: grey left border that turns blue on hover, chevron rotates and the body expands on click.

Use for reveal-on-demand content: reference solutions, expected answers, optional deep-dives the reader can skip.

## Import

None — native HTML element. Works as-is in any MDX file.

## Attributes

| Attribute | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `open` | boolean attribute | no | absent (collapsed) | Render expanded by default. Omit to start collapsed. |

## Children

- A single `<summary>` element as the first child — the always-visible clickable label. Plain text or short inline markup.
- Any markdown / MDX as the body — prose, code fences, lists, components.

Leave a blank line after `<summary>` so the MDX parser treats the body as markdown.

## Example

````mdx
<details>
<summary>Reveal the reference solution</summary>

```ts
const pluck = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];
```

`<T, K extends keyof T>` declares two type parameters — `T` for the object, `K` constrained to a key of `T`. The return type is the indexed access `T[K]`, so at each call site `K` narrows to the literal key the caller passed.

</details>
````
