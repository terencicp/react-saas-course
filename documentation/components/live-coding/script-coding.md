# `ScriptCoding`

Basic live-coding widget with assertions. CodeMirror editor + a runner that executes the student's code and a tiny jest-flavoured `test`/`expect` shim. Two runners:

- **`vanilla`** (default) — own iframe sandbox, ~80 KB, instant boot, **plain JS only**.
- **`sandpack`** — drives CodeSandbox's in-browser bundler. ~150 KB plus a network call to `sandpack.codesandbox.io`. Supports JSX/TS/Tailwind/npm imports.

Reach for this widget when the exercise is "implement a function and verify it with assertions" — algorithms, utility-function refactors, etc. For DOM/visual exercises use `HtmlCssCoding` or `ReactCoding` instead.

## Import

```ts
import ScriptCoding from '../../../components/live-coding/ScriptCoding/ScriptCoding.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `starter` | `string` | yes | — | Code the editor opens with. |
| `tests` | `string` | yes | — | Source for the test block (calls `test(...)` / `expect(...)`). |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `runner` | `'vanilla' \| 'sandpack'` | no | `'vanilla'` | Pick the execution backend. `sandpack` boots a bundler iframe ("Booting bundler…" status); Run is disabled until ready. |
| `maxHeight` | `number` | no | `320` | Editor height cap, in px. |

## Assertion surface

Same on both runners:

- `test(name, fn)`
- `expect(x).toBe / .toEqual / .toBeTruthy / .toBeFalsy / .toBeCloseTo / .toThrow / .toContain`
- `.not.*` negation on every matcher

`console.log` from inside the sandbox is piped into the Console pane below the test results.

## Constraints & gotchas

- Vanilla runner does **not** parse JSX/TS. If the lesson needs `.tsx` or `.ts` syntax or an `import` from npm, flip `runner="sandpack"`.
- Sandpack runner makes a one-time network call to `sandpack.codesandbox.io` per page load. Don't ship a lesson that pins it as the sole interaction in an offline-first context.
- `tests` is **required** on this widget — the run cycle is "Run tests", and there's no exploration mode. If you want pure sandboxing of JS, prefer `HtmlCssCoding` with an empty `tests`.
- The Sandpack runner's status pill is enabled by default (so the Boot/Ready state is visible). The vanilla runner hides the status pill.

## Example

Vanilla runner — pure function:

````mdx
<ScriptCoding
  instructions="Write a function that returns the sum of two numbers."
  starter={`function add(a, b) {
  // your code here
}`}
  tests={`
test('adds two positive numbers', () => {
  expect(add(2, 3)).toBe(5);
});
test('handles zero', () => {
  expect(add(0, 0)).toBe(0);
});
`}
/>
````

Sandpack runner — when the lesson needs TS or imports:

````mdx
<ScriptCoding
  runner="sandpack"
  instructions="Same problem, but typed and bundled."
  starter={`export function add(a: number, b: number): number {
  // your code here
  return 0;
}`}
  tests={`
test('adds two positive numbers', () => {
  expect(add(2, 3)).toBe(5);
});
`}
/>
````
