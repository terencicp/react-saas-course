sources:
  17.1: JSX is property syntax for HTML
  17.2: The Next.js root layout owns the document shell
  17.3: Landmarks and the heading outline
  17.4: Actions, navigations, and item sequences
  17.5: Forms as a contract with the server
  17.6: data-*, aria-*, and the table decision

questions:
  - source: 17.1
    question: |
      A teammate keys a list of editable invoice rows by the array index, and it ships:

      ```tsx
      {rows.map((row, index) => (
        <li key={index}>
          <input defaultValue={row.label} />
        </li>
      ))}
      ```

      QA can't reproduce any bug — the list renders fine, edits save fine. When does this actually break in production?
    choices:
      - text: |
          The moment the list is reordered, filtered, or a row is removed anywhere but the end. React matches old to new by key, so after a delete every row shifts up an index, React reuses the same DOM node for "key 0", and a half-typed input value stays pinned to the *position* while the data underneath it moved.
        correct: true
      - text: |
          Immediately on first render — `key={index}` is a parse-time error in JSX because keys must be strings, and the page won't compile until it's `key={String(index)}`.
        correct: false
      - text: |
          Only once the list grows past a few hundred rows, where matching by index gets slow enough to drop frames during re-render.
        correct: false
    why: |
      The index key looks correct precisely because it *behaves* correctly for any list that only ever appends to the end — which is why QA tapping "add a row" never sees it. The bug is latent until the data's identity and its position diverge: a delete, a sort, a filter, an insert anywhere but the tail. React uses the key to decide "is this the same item as before?", so when the row at index 1 becomes index 0, React sees "key 0" again and concludes nothing moved — it keeps the existing DOM node (and its uncontrolled input state) and just feeds it new data. State lands on the wrong row. It isn't a compile error and it isn't a performance issue; it's a correctness bug tied to the key being position, not identity. The fix is `key={row.id}`.

  - source: 17.2
    question: |
      You need a theme provider that uses React state, so you add `'use client'` to the top of `app/layout.tsx` and wrap `{children}` in it. The app works. Why does a senior reviewer reject this on sight?
    choices:
      - text: |
          `'use client'` is contagious downward — it turns the layout *and every page beneath it*, which is the whole app, into a client subgraph, forfeiting the Server Components default (server-only data access, zero-JS rendering) for every route at once. The fix is to put the directive on a small `<Providers>` child; a Server Component can render a Client Component and pass it `children`.
        correct: true
      - text: |
          `'use client'` is illegal in any file that renders `<html>` or `<body>`, so the build will fail in production even though it runs in dev. Move the directive to `app/page.tsx` instead.
        correct: false
      - text: |
          A `'use client'` layout can't accept the `children` prop, so the pages will render blank. The provider has to read the page from a framework hook instead of from `children`.
        correct: false
    why: |
      The directive doesn't just mark the layout — it marks the layout *and everything it imports and renders below it*. Because the root layout wraps every route, one `'use client'` at the top converts the entire application into client JavaScript, losing the Server Components default globally. It's the single most expensive line you can write in a Next.js app, and it's invisible in dev because everything still works — just slower and heavier than it should. The correct shape moves the browser-only concern into `app/_components/providers.tsx`, which carries its own `'use client'`; the layout stays a pure Server Component and simply renders `<Providers>{children}</Providers>`. The boundary lands on the leaf that needs it, not at the top of the tree. It is not a build error, and the layout accepts `children` fine.

  - source: 17.3
    question: |
      Two snippets render identical pixels — same big bold "Billing" text:

      ```tsx
      <div className="text-2xl font-bold">Billing</div>
      <h2 className="text-2xl font-bold">Billing</h2>
      ```

      A screen-reader user pulls up the page's heading list. What's the difference, and what's the rule it teaches?
    choices:
      - text: |
          The `<div>` contributes nothing to the heading outline — to the accessibility tree its role is "nothing", so a user jumping by heading sails right past "Billing". Only the `<h2>` is a navigable outline node. The level is a *structural* claim chosen by outline position, never a font-size choice; the class carries the look, the element carries the structure.
        correct: true
      - text: |
          There's no functional difference — Tailwind's `text-2xl font-bold` gives both an implicit heading role, so a screen reader announces both as level-2 headings.
        correct: false
      - text: |
          The `<div>` is actually the more correct choice: reserving `<h2>` for text that's exactly the second-largest on the page keeps the visual hierarchy and the heading hierarchy in sync.
        correct: false
    why: |
      Identical pixels, completely different accessibility trees. A styled `<div>` is a generic box with no role, so it adds zero to the heading outline a screen-reader user navigates as a table of contents — "Billing" is simply invisible to every heading jump. The `<h2>` is a real outline node. This is the rule the comparison exists to teach: a heading *level* is a structural position in the outline (one `<h1>`, descending without skips), and it is decided by where the content sits in the document's structure — never by how big the text needs to look. If your `<h2>` needs to look small or your `<h3>` needs to look large, that's a separate styling knob. The element carries the outline; the class carries the appearance, and they move independently.

  - source: 17.4
    question: |
      You spot this in a code review:

      ```tsx
      <button onClick={() => router.push('/dashboard')}>Dashboard</button>
      ```

      It works when clicked. What does it cost, and what should it be?
    choices:
      - text: |
          It's a link wearing button clothes — its whole job is to go to a URL. It loses everything a real anchor gives for free: middle-click / `Cmd`-click to open in a new tab, right-click "Copy link", and crawlability. Internal navigation should be a `<Link href="/dashboard">`, which adds soft navigation and still renders as a plain `<a href>`.
        correct: true
      - text: |
          Nothing — a button with a `router.push` is the idiomatic way to navigate in Next.js, and it's preferable to `<Link>` because it gives you a place to run logic before navigating.
        correct: false
      - text: |
          The only problem is the missing `type` — add `type="button"` so it can't accidentally submit a surrounding form, and it's correct.
        correct: false
    why: |
      Behavior picks the element: a control that goes to a URL is a link, no matter how button-like it looks. Faking navigation with `<button onClick={router.push(...)}>` produces something that activates on click but isn't a real anchor, so it silently drops middle-click and `Cmd`-click new-tab opening, "Copy link address", and the crawler's ability to follow it — and it announces as "button", not "link", to a screen reader. The right tool is `<Link href="/dashboard">`: it layers soft client-side navigation on top of a plain `<a href>`, so all of the anchor's free behavior survives. Adding `type="button"` would fix a *different* bug (a stray form submit) but wouldn't make this a real link.

  - source: 17.5
    question: |
      The user submits this form without touching any control. Exactly which entries does the browser pack into `FormData`?

      ```tsx
      <form>
        <input type="checkbox" name="newsletter" value="yes" defaultChecked />
        <input type="checkbox" name="acceptedTerms" value="true" />
        <input type="radio" name="billing" value="monthly" />
        <input type="radio" name="billing" value="yearly" defaultChecked />
      </form>
      ```
    choices:
      - text: |
          `newsletter=yes` and `billing=yearly` — two entries. A checkbox submits its `value` only when checked, so the unchecked `acceptedTerms` contributes *nothing* (the key is simply absent, not `"false"` or empty). The radio group shares one `name` and submits only the checked member's value, once.
        correct: true
      - text: |
          All three names: `newsletter=yes`, `acceptedTerms=false`, and `billing=yearly` — an unchecked checkbox submits its value with `false` so the server can read the boolean directly.
        correct: false
      - text: |
          `newsletter=yes`, `billing=monthly`, and `billing=yearly` — both radios submit their values, and the server takes the last one under the shared name.
        correct: false
    why: |
      A checkbox is checked-or-absent: when checked it contributes its `value` (`newsletter=yes`), and when unchecked it contributes no entry at all — not `"false"`, not an empty value, the key just isn't in the submission. That asymmetry is exactly why a checkbox can't be read as a naive boolean on the server; "missing key" is what your Zod schema has to interpret as "false". A radio group runs on shared `name`: only the one checked member submits, once, so `billing=yearly` and the `monthly` radio contributes nothing. Two entries total.

  - source: 17.6
    question: |
      Which of the following are genuine ARIA bugs — markup that misleads or traps a screen-reader user? Select all that apply.
    choices:
      - text: |
          A button whose visible text reads **Export** carries `aria-label="Download CSV"`.
        correct: true
      - text: |
          An `<a href="/help">` that a keyboard user can still Tab to carries `aria-hidden="true"`.
        correct: true
      - text: |
          An icon-only delete button — no text inside — carries `aria-label="Delete invoice"`.
        correct: false
      - text: |
          A decorative chevron glyph rendered beside the word **Filters** carries `aria-hidden="true"`.
        correct: false
    why: |
      Both bugs make the eye and the screen reader disagree. `aria-label` *overrides* an element's accessible name, so putting it on a button that already reads "Export" means the screen reader announces "Download CSV" while the screen shows "Export" — two sources of truth drifting apart; only label controls that have no visible text. And `aria-hidden="true"` on a still-focusable link is the classic trap: a keyboard user can Tab onto a control the screen reader has been told to ignore, so they land somewhere that announces nothing. The other two are textbook-correct: an icon-only button has nothing to announce until you name it, and a decorative glyph next to a word that already labels it is exactly what `aria-hidden` is for (and the glyph isn't focusable, so hiding it is safe).
