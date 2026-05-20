# Plain code blocks (Expressive Code)

Starlight renders every fenced code block through **Expressive Code** (EC) — no imports, just a triple-backtick fence with a language and optional fence-meta directives.

EC plugins enabled in [astro.config.mjs](astro.config.mjs): built-in syntax highlighting, frames, text markers, word wrap; `plugin-line-numbers` (opt-in per block, off site-wide); `plugin-collapsible-sections` (opt-in per block).

Live reference for every feature: [`0 Demos/code/code-blocks-demo`](src/content/docs/0%20Demos/code/code-blocks-demo.mdx).

## Basic fence

````md
```ts
const x: number = 1;
```
````

The token after the backticks is the **language identifier** (`ts`, `tsx`, `js`, `astro`, `html`, `css`, `json`, `yaml`, `bash`, `sql`, `diff`, … ~100 via Shiki). Omit it only for free-form text — you lose highlighting otherwise.

## Frames

EC wraps each block in a frame — editor tab or terminal window — chosen automatically by language.

**Editor title.** Always set it with the `title="…"` attribute — one rule, no exceptions.

````md
```ts title="src/lib/db.ts"
export const db = drizzle(connectionString);
```
````

EC can also derive a title from a leading file-path comment, but that detection fails silently on paths with parentheses (Next.js route groups like `(app)`), so the course standardises on `title="…"`.

**Terminal frame** is automatic for shell languages (`bash`, `sh`, `zsh`, `powershell`, …). Override the frame with `frame="none"` (strip it — good inside another component), `frame="code"` (force editor), `frame="terminal"` (force terminal), or `frame="auto"` (default, language-driven).

## Highlighting (text markers)

Focus the student's attention. All of these compose on one fence.

- **Line ranges `{…}`** — neutral highlight on whole lines: `{4}`, `{1, 4, 7-8}`, `{1-3}`.
- **Quoted tokens `"…"`** — highlight every occurrence of a literal string; mix quote types to avoid escaping (`"this 'inner' text"`).
- **Regex `/…/`** — highlight pattern matches; capture groups narrow the highlight to the group.
- **Insert/delete `ins=…` / `del=…`** — same syntax as the markers above (lines, strings, regex) but green/red, for diffs without using `diff` as the language.

````md
```ts {1-3} "useState" /set\w+/ ins={5} del="old"
```
````

**`diff` language** is the alternative for line-level diffs; add `lang="ts"` to keep syntax highlighting on top (leading whitespace after `+`/`-` is preserved):

````md
```diff lang="ts"
 function add(a, b) {
-  return a - b;
+  return a + b;
 }
```
````

**Mark color.** The neutral mark is a soft grey. Wrap a fence in `<div data-mark-color="…">` to re-tint **every** mark inside it — `green`, `red`, `blue`, `orange`, `violet` (each theme has its own legible stops). Always prefer a colored mark to grey; treat blue as the default. Blank lines around the fence inside the wrapper are required so MDX still parses it.

````mdx
<div data-mark-color="blue">

```ts {2} "useState"
const [count, setCount] = useState(0);
```

</div>
````

## Word wrap — `wrap`

Use for lines over ~90 chars you don't want to scroll horizontally. Variants: `wrap=false` (explicit off — the default), `wrap preserveIndent=false` (continuation starts at column 1, good for terminal output), `wrap hangingIndent=2` (indent continuations by 2 spaces).

## Line numbers — `showLineNumbers`

Opt-in per block. `startLineNumber=42` sets a custom start (useful for snippets from larger files). Other meta still targets **source** line numbers, so `{1-3}` hits the first three lines regardless of `startLineNumber`.

````md
```ts showLineNumbers startLineNumber=42 title="src/lib/math.ts"
export function add(a: number, b: number) {
  return a + b;
}
```
````

## Collapsible sections — `collapse={…}`

Hides a line range behind an "expand" affordance — keeps boilerplate (imports, scaffolding) out of the way of the lines that matter. Comma-separate multiple ranges: `collapse={1-5, 10-12}`.

## Programmatic `<Code>` component (rare)

Only when the code string lives in a variable or an imported file:

```mdx
import { Code } from '@astrojs/starlight/components';

<Code code={someVar} lang="ts" title="src/foo.ts" />
```

Props: `code` (required), `lang`, `title`, `frame`, `mark`, `ins`, `del`, `wrap`. For hand-authored snippets a literal fence is shorter and reads better.

## Quick reference — fence-meta cheat sheet

````md
```ts                                          ← language only
```ts title="src/foo.ts"                        ← editor frame, explicit title
```bash                                        ← terminal frame (auto)
```sh frame="none"                             ← no frame
```ts {1, 4, 7-8}                              ← line highlights (single/list/range)
```ts "useState" "count"                       ← string marks
```ts /set\w+/                                 ← regex mark
```ts del={2} ins={3}                          ← line-level diff colors
```ts ins="new" del="old"                      ← inline diff colors
```diff lang="ts"                              ← diff language with TS highlighting
```ts wrap                                     ← word wrap on
```ts showLineNumbers startLineNumber=42       ← line numbers, custom start
```ts collapse={1-5, 10-12}                    ← collapse line ranges
```ts {1-3} "token" ins={5} title="src/foo.ts" ← combine freely
```

<div data-mark-color="blue"> … </div>           ← retint marks (green|red|blue|orange|violet)
````
