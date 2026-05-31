sources:
  14.1: The DOM as a live tree of typed nodes
  14.2: "Attributes vs. properties: parsed state vs. live state"
  14.3: "The event model: capture, bubble, delegate"

questions:
  - source: 14.1
    question: |
      You loop over a to-do list to delete every completed item, removing each one as you go:

      ```js
      const list = document.getElementById('list');
      for (let i = 0; i < list.children.length; i++) {
        if (list.children[i].classList.contains('done')) {
          list.children[i].remove();
        }
      }
      ```

      Two completed items sit next to each other and the second one survives. Why, and what is the fix?
    choices:
      - text: |
          `list.children` is a *live* collection: removing an item shifts every later element down by one index, so the loop's `i++` steps right over the item that just slid into the removed slot. Snapshot first — iterate `[...list.children]` — so the list you walk can't shift under you.
        correct: true
      - text: |
          `classList.contains('done')` is case-sensitive and misses the second item's class. Compare against `className` directly instead.
        correct: false
      - text: |
          `.remove()` is asynchronous, so the second deletion hasn't finished when the loop ends. Await each removal before continuing.
        correct: false
    why: |
      `element.children` is a live `HTMLCollection` — it reflects the tree *right now*, so a removal instantly re-indexes everything after it. Remove the item at `i`, the next item slides into `i`, but the loop has already advanced to `i + 1` and skips it. The one-bracket fix is to snapshot into a real array (`[...list.children]` or `Array.from(...)`); the array doesn't shift when the tree does. Note that `querySelectorAll` already returns a *static* `NodeList`, so it wouldn't drift here — but `children` does.

  - source: 14.2
    question: |
      A teammate wants to re-enable a button and writes `button.setAttribute('disabled', 'false')`. They also gate some logic on `Boolean(button.getAttribute('disabled'))`. What actually happens?
    choices:
      - text: |
          The button stays disabled — for a boolean attribute, *presence* is the value, so the string `'false'` still counts as present. And `Boolean('false')` is `true` because every non-empty string is truthy, so the gate reads "disabled" too. Use the typed property: `button.disabled = false`.
        correct: true
      - text: |
          The button is enabled, because `'false'` is coerced to the boolean `false` when written to a boolean attribute — but the `Boolean(...)` gate is still wrong and reads stale state.
        correct: false
      - text: |
          The `setAttribute` call throws, because `'false'` is invalid markup for a boolean attribute and the DOM rejects it at write time.
        correct: false
    why: |
      Boolean attributes (`disabled`, `checked`, `required`, …) carry meaning by presence alone — the value string is ignored, so `disabled="false"` *disables*. The only way through the attribute is `removeAttribute('disabled')`; the clean way is the typed property, `button.disabled = false`. The second trap compounds it: `getAttribute` returns the string `'false'`, and every non-empty string is truthy, so `Boolean(...)` reports `true`. When you want a boolean, read the property — it already is one.

  - source: 14.3
    question: |
      A delegated `click` listener on a `<ul>` routes actions for all its `<li>` rows. One row also has its own click handler that calls `event.stopPropagation()`. The team notices the delegated handler silently stops running for that row, with no error. What is going on?
    choices:
      - text: |
          Delegation depends on the event *bubbling up* to the ancestor. `stopPropagation()` halts the trip, so the event never reaches the `<ul>` — the delegated handler never fires, and nothing reports the failure. `stopPropagation` is a design smell; the row handler almost certainly wanted `preventDefault` instead.
        correct: true
      - text: |
          `stopPropagation()` also cancels the browser's default action, which suppresses the synthetic click the `<ul>` listens for. Add `preventDefault()` in the delegated handler to restore it.
        correct: false
      - text: |
          The row handler ran first and consumed the event object, so by the time it reaches the `<ul>` the `event.target` is `null`. Clone the event before the row handler runs.
        correct: false
    why: |
      `stopPropagation` and `preventDefault` are independent switches: `stopPropagation` halts the trip through the tree, `preventDefault` cancels the browser's built-in reaction. A delegated handler lives on an ancestor and only works because events bubble up to it — so a child calling `stopPropagation` quietly cuts the event off before it arrives, with no error to point at the cause. This is exactly why a senior almost never reaches for `stopPropagation`; the intent is usually `preventDefault`.

  - source: 14.3
    question: |
      You're attaching a `wheel` listener to a scrollable panel `<div>` (not `window`/`document`) inside a React effect, and you'll tear it down on unmount. Which setup is the 2026 reflex?
    choices:
      - text: |
          ```js
          const controller = new AbortController();
          panel.addEventListener('wheel', () => updateParallax(), {
            passive: true,
            signal: controller.signal,
          });
          // cleanup: controller.abort();
          ```
        correct: true
      - text: |
          ```js
          const onWheel = () => updateParallax();
          panel.addEventListener('wheel', onWheel);
          // cleanup: panel.removeEventListener('wheel', onWheel);
          ```
        correct: false
      - text: |
          ```js
          panel.addEventListener('wheel', () => updateParallax());
          // no cleanup needed — the browser defaults wheel listeners to passive and removes them on unmount
          ```
        correct: false
    why: |
      Two reflexes combine here. `passive: true` promises the handler won't call `preventDefault`, letting the browser scroll without waiting on it — and the browser's automatic passive default only covers `window`/`document`/`document.body` (and not in Safari), so on any other element you pass it explicitly. For cleanup, one `AbortController` whose `signal` is threaded into every listener and a single `abort()` in teardown replaces the `removeEventListener` ceremony — and lets you use inline arrows, which `removeEventListener` can't remove because there's no reference to match.
