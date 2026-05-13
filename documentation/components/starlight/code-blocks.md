# Plain code blocks (Expressive Code)

Starlight renders every fenced code block through **Expressive Code** (EC). No imports, no wrapper component — just a triple-backtick fence with a language and optional fence-meta directives.

Installed EC plugins (configured in [astro.config.mjs](astro.config.mjs)):

- Built-in: syntax highlighting, frames, text markers, word wrap.
- `@expressive-code/plugin-line-numbers` — opt-in per block with `showLineNumbers`. Defaulted to **off** site-wide so existing blocks are unaffected.
- `@expressive-code/plugin-collapsible-sections` — opt-in per block with `collapse={…}`.

A live reference for every fence feature below: [`0 Demos/code/code-blocks-demo`](src/content/docs/0%20Demos/code/code-blocks-demo.mdx).

## Basic fence

````md
```ts
const x: number = 1;
```
````

The token after the opening backticks is the **language identifier**. Common ones: `ts`, `tsx`, `js`, `jsx`, `astro`, `html`, `css`, `json`, `yaml`, `bash`, `sh`, `md`, `mdx`, `sql`, `diff`. (~100 languages via Shiki.) Omit the language only for truly free-form text — you lose highlighting otherwise.

## Frames

EC wraps each block in a "frame" — either an editor tab or a terminal window — chosen automatically by language.

### Editor frame with a title

Two ways to set a tab title. They render identically; pick whichever reads cleaner.

**`title="…"` attribute:**

````md
```ts title="src/lib/db.ts"
import { drizzle } from 'drizzle-orm/postgres-js';
export const db = drizzle(connectionString);
```
````

**Leading file-path comment** (first 4 lines, starts with `//`, `<!--`, `/*`, or `#`):

````md
```ts
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
export const db = drizzle(connectionString);
```
````

The comment is **stripped** from the rendered code once it becomes the title.

### Terminal frame

Automatic for shell languages (`bash`, `sh`, `zsh`, `powershell`, etc.). Optional title:

````md
```bash title="Install dependencies"
npm install drizzle-orm
```
````

### Overriding the frame

| Value | Effect |
| --- | --- |
| `frame="none"` | Strip the frame entirely — useful inside another component or for inline-feeling snippets. |
| `frame="code"` | Force an editor frame (e.g. show a shell config as if it were an editor file). |
| `frame="terminal"` | Force a terminal frame. |
| `frame="auto"` | Default — language-driven. |

````md
```sh frame="none"
echo "no chrome around this line"
```
````

## Highlighting (text markers)

Highlight text to focus the student's attention. Mix any of these on the same fence — they compose.

### Line ranges — `{…}`

Neutral highlight on whole lines. Single line, list, range, or all three:

````md
```ts {4}
```
```ts {1, 4, 7-8}
```
```ts {1-3}
```
````

### Quoted tokens — `"…"`

Highlight every occurrence of a literal string:

````md
```ts "useState" "count"
const [count, setCount] = useState(0);
```
````

Mix quote types to avoid escaping: `"this 'inner' text"`.

### Regex — `/…/`

Highlight pattern matches. Capture groups narrow the highlight to the group; non-capturing groups match the full pattern:

````md
```ts /set\w+/
const [count, setCount] = useState(0);
```
````

### Insert / delete markers — `ins=…` / `del=…`

Same syntax as the neutral markers, but green / red, for showing diffs without using `diff` as the language:

````md
```ts del={2} ins={3}
function add(a, b) {
  return a - b;
  return a + b;
}
```
````

Works with strings and regex too:

````md
```ts ins="Promise.all" del="await"
const [a, b] = await Promise.all([fa(), fb()]);
```
````

### `diff` language (alternative for line-level diffs)

````md
```diff lang="ts"
 function add(a, b) {
-  return a - b;
+  return a + b;
 }
```
````

`lang="ts"` keeps TypeScript syntax highlighting on top of the diff markers. Leading whitespace after `+`/`-` is preserved correctly.

## Word wrap

For long lines you don't want to scroll horizontally, use when lines are more than 90 characters:

````md
```ts wrap
const longString = 'a very long string that would otherwise overflow the container horizontally and force a scroll'
```
````

Variants:
- `wrap=false` — explicitly disable (default is no wrap).
- `wrap preserveIndent=false` — wrapped continuation starts at column 1 (good for terminal output).
- `wrap hangingIndent=2` — add 2 spaces of indent to wrapped continuations.

## Line numbers — `showLineNumbers`, `startLineNumber=…`

Opt-in per block. Other meta (line ranges, string marks, etc.) keep targeting **source** line numbers, not the displayed numbers — so `{1-3}` still hits the first three lines even if `startLineNumber=100`.

````md
```ts showLineNumbers
export function add(a: number, b: number) {
  return a + b;
}
```
````

Custom start number, useful for snippets from larger files:

````md
```ts showLineNumbers startLineNumber=42 title="src/lib/math.ts"
export function add(a: number, b: number) {
  return a + b;
}
```
````

## Collapsible sections — `collapse={…}`

Hides a line range behind an "expand" affordance. Useful for keeping boilerplate (imports, scaffolding) out of the way of the lines that matter.

````md
```ts collapse={1-5}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const [user] = await db.select().from(usersTable);
  return NextResponse.json({ user });
}
```
````

Multiple ranges, comma-separated:

````md
```ts collapse={1-5, 10-12}
…
```
````

## Programmatic `<Code>` component (rare)

For the unusual case where the code string lives in a variable or a file — e.g. an imported snippet:

```ts
import { Code } from '@astrojs/starlight/components';
```

```mdx
<Code code={someVar} lang="ts" title="src/foo.ts" />
```

Key props: `code` (required), `lang`, `title`, `frame`, `mark`, `ins`, `del`, `wrap`. Use only when a literal fence won't work — for hand-authored snippets the fence is shorter and reads better.

## Quick reference — fence-meta cheat sheet

````md
```ts                                              ← language only
```ts title="src/foo.ts"                            ← editor frame, explicit title
```ts                                              ← editor frame, title from leading // comment
```bash                                            ← terminal frame (auto)
```sh frame="none"                                 ← no frame
```ts {1-3}                                        ← line range highlight
```ts {1, 4, 7-8}                                  ← mixed lines
```ts "useState" "count"                           ← string marks
```ts /set\w+/                                     ← regex mark
```ts del={2} ins={3}                              ← line-level diff colors
```ts ins="new" del="old"                          ← inline diff colors
```diff lang="ts"                                  ← real diff language with TS highlighting
```ts wrap                                         ← word wrap on
```ts showLineNumbers                              ← line numbers on (opt-in)
```ts showLineNumbers startLineNumber=42           ← line numbers starting at 42
```ts collapse={1-5}                               ← collapse lines 1–5
```ts collapse={1-5, 10-12}                        ← multiple collapse ranges
```ts {1-3} "token" ins={5} title="src/foo.ts"     ← combine freely
````
