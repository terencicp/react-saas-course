# `ReactCoding`

CodeMirror TSX editor wired to a same-origin `srcdoc` iframe rendering the student's component. TSX → JS via esbuild-wasm; React 19 from esm.sh via an in-iframe import map; Tailwind v4 from the Play CDN.

Three grading modes, all driven by props:

- **Tests** — `tests` block with jest-flavoured assertions against the rendered DOM. The canonical pass/fail grading.
- **Target match** — `target={...}` adds a side-by-side "Target | Your output" preview. Pure visual comparison, no auto-check.
- **Exploration** — neither `tests` nor `target`. The card is a sandbox.

## Import

```ts
import ReactCoding from '../../../components/live-coding/ReactCoding/ReactCoding.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `starter` | `string` | yes | — | TSX the editor opens with. Must export an `App` component (e.g. `export function App() { … }`). |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `tests` | `string` | no | — | Source for the test block (calls `test(...)` / `expect(...)` against the rendered DOM). |
| `target` | `string` | no | — | TSX for the reference output. When set, the preview splits into Target \| Your output. No auto pass/fail check runs — the student matches visually. |
| `tailwind` | `boolean` | no | `true` | Wire Tailwind v4 Play CDN into the iframe. On by default (most React exercises in this course use Tailwind). |
| `live` | `boolean` | no | `false` | Auto-rebuild on every keystroke. Hides the Run button; Reset/Feedback render as chips overlaid on the editor. Default off — flip on for visual / target-match exercises where instant feedback is the point. |
| `hidePreview` | `boolean` | no | `false` | Collapse the preview iframe (kept in the DOM so the runtime still mounts). Useful when the exercise is purely about JSX output that the tests check, not what the student sees. Ignored when `target` is set. |
| `maxHeight` | `number` | no | `320` | Editor height cap, in px. |

## Assertion surface

Inside the in-iframe runner (`tests` block):

- `test(name, fn)`
- `expect(x).toBe / .toEqual / .toBeNull / .toBeUndefined / .toBeTruthy / .toBeFalsy / .toContain / .toMatch`
- `.not.*` negation on every matcher

Tests run after React mounts the `App` component. `document` is the iframe's document — use `document.querySelector`, `getBoundingClientRect`, `getComputedStyle`, etc.

## Constraints & gotchas

- The component the iframe renders is whatever the editor `export`s as `App`. Other named exports are ignored.
- Tailwind v4 Play CDN loads on every iframe boot — slightly heavier than `HtmlCssCoding`'s vanilla preview, but still well under a second.
- Diagnostic error text on failing tests is hidden from the student (visible to the AI feedback prompt). Don't write tests that depend on the student seeing the error — write the assertion so the failure name communicates the problem.
- AI feedback renders when there are `tests` OR a `target` (target-match exercises get feedback by comparing the student's TSX to the reference TSX).
- For short starters (≤3 lines) in `live` mode, Feedback/Reset chips automatically switch to a compact side-by-side layout instead of the default diagonal.

## Example

Tests-graded — form semantics:

````mdx
<ReactCoding
  hidePreview
  instructions="Wire the label to the email input, set the right input type, mark it required, and give the button a submit type."
  starter={`export function App() {
  return (
    <form>
      <label>Email</label>
      <input />
      <button>Sign up</button>
    </form>
  );
}`}
  tests={`
test('label is associated via htmlFor', () => {
  expect(document.querySelector('label')?.getAttribute('for')).toBe('email');
});
test('input has id="email" and type="email"', () => {
  const input = document.querySelector('input');
  expect(input?.id).toBe('email');
  expect(input?.type).toBe('email');
});
test('input is required', () => {
  expect(document.querySelector('input')?.required).toBe(true);
});
`}
/>
````

Target-match with live update:

````mdx
<ReactCoding
  live
  instructions="Match the target — same indigo background, white text, padding, rounded corners, hover state."
  target={`export function App() {
  return (
    <button className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-500">
      Save
    </button>
  );
}`}
  starter={`export function App() {
  return <button>Save</button>;
}`}
/>
````
