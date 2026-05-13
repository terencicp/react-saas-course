# `Tokens`

Token-identification drill on a fenced code block. The student clicks each token that matches the prompt (correct picks = green, decoy picks = red, both with a strikethrough/check after Check). Drop a single fenced Expressive Code block in the slot — Expressive Code highlights it first, then the runtime walks the rendered DOM and wraps each listed string in a clickable token.

## Import

```ts
import Tokens from '../../../../components/exercises/Tokens.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `targets` | `string[]` | yes | — | Strings that count as correct picks. Each string wraps the **first un-wrapped occurrence** of that substring in source order. To make multiple occurrences clickable, repeat the string in the array. |
| `decoys` | `string[]` | no | `[]` | Clickable but wrong picks — same wrapping rules. Without decoys, every clickable thing is a correct answer (less interesting). |
| `prompt` | `string` | no | `'Click each matching token, then press Check.'` | Plain-text prompt rendered above the code block. |

## Slot

Exactly **one fenced Expressive Code block**. Standard EC meta (`{lines}`, `"strings"`, `/regex/`) still works on the fence — the tokenizer runs after EC renders.

## Constraints & gotchas

- Strings are processed **longest-first**, so a short string (`==`) won't claim the prefix of a longer one (`===`). User-given order is preserved within the same length.
- The match scans the flattened text of the rendered block, so a string like `"admin"` (with quotes) matches the rendered tokens including the open and close quote characters. EC splits highlighted strings into multiple sibling spans; the wrapper bridges them.
- Multi-occurrence clickability requires repeating the string in the array — each entry wraps the first **un-wrapped** match.
- The Check button greys out once every clickable token has been resolved. Reset clears all marks but keeps the wraps.

## Example

Find the loose-equality bugs — `==` is correct, `===` is the decoy:

````mdx
<Tokens
  targets={['==', '==']}
  decoys={['===', '===']}
>
```js
function isReady(input) {
  if (input == null) return false;
  if (typeof input === "string") return input.length === 0;
  return input == 0;
}
```
</Tokens>
````

Find every function invocation:

````mdx
<Tokens
  targets={['reduce', 'log', 'forEach', 'log']}
  decoys={['arr', 'total', 'sum', 'n', 'console']}
>
```js
const arr = [1, 2, 3];
const total = arr.reduce((sum, n) => sum + n, 0);
console.log(total);
arr.forEach((n) => console.log(n));
```
</Tokens>
````
