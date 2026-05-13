# `HtmlCssCoding`

Tabbed CodeMirror panes (HTML + CSS, plus an optional JS pane) driving a same-origin `srcdoc` iframe. Lighter than `ReactCoding` — no bundler, no import map, no worker. The student's HTML lands in `<body>`, their CSS in a `<style>`, their JS (if any) in a `<script>`. By default the preview rebuilds on every keystroke (`live: true`); pass `live={false}` for a Run button.

Optional `tests` run against the rendered DOM with a jest-flavoured `test`/`expect` shim — useful for layout exercises where "did flex put the boxes side by side" can be verified with `getBoundingClientRect` and `getComputedStyle`.

## Import

```ts
import HtmlCssCoding from '../../../../components/live-coding/HtmlCssCoding/HtmlCssCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `html` | `string` | yes | — | Starter for the HTML pane. Goes into `<body>`. |
| `css` | `string` | yes | — | Starter for the CSS pane. Wrapped in `<style>`. |
| `js` | `string` | no | — | When provided, a third tab appears and the script runs after DOM mount. Pass `''` (empty) to surface a blank JS pane the student can fill in. |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `tests` | `string` | no | — | Source for the test block (calls `test(...)` / `expect(...)` against the rendered DOM). Omit for a pure exploration card. |
| `tailwind` | `boolean` | no | `false` | Wire Tailwind v4 Play CDN into the iframe. Off by default — opt in for utility-class exercises that don't justify spinning up `ReactCoding`. |
| `live` | `boolean` | no | `true` | Auto-rebuild on every keystroke. When `true`, the Run button is hidden and Reset/Feedback render as chips inside the editor. Set `false` for a classic Run toolbar. |
| `maxHeight` | `number` | no | `360` | Editor height cap, in px. |

## Assertion surface

Inside the in-iframe runner (`tests` block):

- `test(name, fn)`
- `expect(x).toBe(y) / .toEqual(y) / .toBeNull() / .toBeUndefined() / .toBeTruthy() / .toBeFalsy() / .toContain(y) / .toMatch(re)`
- `.not.*` negation on every matcher

Tests run after the DOM is mounted. `document` is the iframe's document. `getComputedStyle`, `getBoundingClientRect`, classlist checks, etc. all work.

## Constraints & gotchas

- The preview iframe is **same-origin** — Inspect Element on the rendered output works, students can use devtools normally.
- The JS tab appears only when `js` is a string. Pass `js={''}` (not `null`/`undefined`) to make it appear empty.
- Diagnostic error text on test failures stays in the DOM (so the AI feedback prompt can read it) but is hidden from the student — the noisy mid-typing error spam isn't helpful.
- AI feedback button is present whenever there are `tests`; with no tests, the card is exploration-only and feedback isn't shown.

## Example

Cascade exercise with live preview (no tests, no Run button):

````mdx
<HtmlCssCoding
  instructions="Set .card's background to red, then change text color to white."
  html={`<div class="card">
  <h2>Hello</h2>
  <p>Style me.</p>
</div>`}
  css={`.card {
  padding: 16px;
  border-radius: 8px;
  /* your styles */
}`}
/>
````

Layout exercise with DOM-based tests:

````mdx
<HtmlCssCoding
  instructions="Lay the three boxes out horizontally with a 12px gap. Use flexbox on .row."
  html={`<div class="row">
  <div class="box">1</div>
  <div class="box">2</div>
  <div class="box">3</div>
</div>`}
  css={`.row { /* your layout */ }
.box { background: #e0e7ff; padding: 12px 16px; border-radius: 6px; }`}
  tests={`
test('row uses flexbox', () => {
  expect(getComputedStyle(document.querySelector('.row')).display).toBe('flex');
});
test('boxes are side by side', () => {
  const [a, b] = document.querySelectorAll('.box');
  expect(b.getBoundingClientRect().left > a.getBoundingClientRect().right).toBe(true);
});
`}
/>
````

Event-delegation exercise with a JS pane:

````mdx
<HtmlCssCoding
  instructions="Wire the button to toggle .hidden on #panel."
  html={`<button id="toggle">Toggle</button>
<div id="panel">Now you see me.</div>`}
  css={`.hidden { display: none; }`}
  js={`// add a click listener on #toggle that flips .hidden on #panel`}
  tests={`
test('clicking toggle hides the panel', () => {
  document.getElementById('toggle').click();
  expect(document.getElementById('panel').classList.contains('hidden')).toBe(true);
});
`}
/>
````
