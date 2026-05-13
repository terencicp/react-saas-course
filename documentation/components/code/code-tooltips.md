# `CodeTooltips`

Hover tooltips on tokens or substrings inside a single Expressive Code block. Useful for short inline definitions that would otherwise force the reader out of the code block into a paragraph.

## Import

```ts
import CodeTooltips from '../../../../components/code/CodeTooltips.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `tooltips` | `Record<string, string>` | yes | — | Map from substring → tooltip text. Each key is matched in the rendered code and wrapped with a dashed-underline hover target. |

### Key-matching rules

- **Identifier-shaped keys** — match `^[A-Za-z0-9_$]+$` (e.g. `useState`, `tokenA`) — are matched at **word boundaries**, so `state` will *not* hit inside `useState`.
- **Non-identifier keys** — anything else (e.g. `'=>'`, `'as const'`, `'!=='`) — substring-match anywhere.
- Keys are processed **longest-first**, so a long key claims its span before a shorter overlapping key gets a chance.
- Once a token is wrapped, later keys won't re-wrap it.

### Tooltip values

- Plain text. Newlines (`\n`) are preserved, so short multi-line explanations work.
- Same value is reused for every occurrence of the key in the block.

## Slot

Exactly **one fenced Expressive Code block**. Author it as a normal fence — no special comment markers or meta directives needed. Highlighting is driven purely by the `tooltips` map.

You can still use EC meta on the fence (`{lines}`, `"strings"`, etc.) — the tooltip wrapping runs after EC renders.

## Constraints & gotchas

- One fence per `<CodeTooltips>` wrapper. Don't put multiple blocks or prose inside the slot.
- Pure substring matching — if the same characters appear inside a string literal *and* as an identifier, both are wrapped. Pick more specific keys to avoid this.
- No parent or sibling components required; works standalone.

## Example

Identifier key with a multi-line tooltip, plus a non-identifier operator key and a multi-word phrase key:

````mdx
<CodeTooltips tooltips={{
  useState: 'React hook.\nReturns [value, setter].\nRe-renders when the setter is called.',
  '=>': 'Arrow function.',
  'as const': 'Narrows to a readonly tuple of literal types — roles is readonly ["admin", "user"], not string[].',
}}>
```tsx
import { useState } from 'react';

const roles = ['admin', 'user'] as const;

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```
</CodeTooltips>
````
