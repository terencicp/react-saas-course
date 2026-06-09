sources:
  60.1: The list-view anatomy
  60.2: Filter shapes and sort encoding
  60.3: Typed input, committed URL
  60.4: Cursor by default, offset when small

questions:
  - source: 60.1
    question: |
      You're reviewing a teammate's invoices list. They demo it: clicking a status filter visibly narrows the table, sorting flips the order, paging swaps the rows — every interaction works. But you notice the address bar never changes. What's the verdict?
    choices:
      - text: |
          Ship it — the controls all produce the correct result, which is what the user cares about.
        correct: false
      - text: |
          Reject it — if a click changes the result but not the URL, the share-and-refresh contract is broken: a refresh or shared link won't reproduce the view.
        correct: true
      - text: |
          Ship it, but add a `useEffect` that writes the current filter/sort/page into the URL after each render so links still work.
        correct: false
    why: |
      The litmus test for a URL-state list view is "if a click changes the result but not the URL, the contract is broken" — the view must survive a refresh, a new tab, and a shared link, and none of those hold if the state lives only in component state. The fix isn't a `useEffect` syncing state into the URL (the URL *is* the state — there's no second copy to sync); the controls should write the URL directly via the setter.

  - source: 60.1
    question: |
      In the list view, a user changes a filter chip. Which navigation call belongs in the control, and why?
    choices:
      - text: |
          `router.push('?status=overdue', { scroll: false })` — every state change is a distinct view the user should be able to step back to.
        correct: false
      - text: |
          `router.replace('?status=overdue', { scroll: false })` — reconfiguring the current view should swap the history entry in place, so the back button leaves the list instead of rewinding chips one at a time.
        correct: true
      - text: |
          `router.push('/invoices/overdue')` — filter changes are genuine navigation to a new page.
        correct: false
    why: |
      Reconfiguring the current view uses `replace` (with `{ scroll: false }` so a long list doesn't jump to the top); `push` is reserved for genuine navigation like clicking a row to open its detail page. If every chip pushed a history entry, a user who set five filters would hit back five times just to leave the screen.

  - source: 60.2
    question: |
      The sort parameter could be typed as `parseAsString` (accept any column name) or `parseAsStringEnum([...])` (a closed list of columns). The course insists on the enum. Which problems does the enum prevent that a free string would allow? (Select all that apply.)
    choices:
      - text: |
          A hand-typed `?sort=passwordHash` reaching the query and ordering rows by a column that should never be exposed — the sort value *is* the column, which the driver can't parameterize away.
        correct: true
      - text: |
          A sort on an unindexed column forcing the database to load and sort the whole result set in memory — fine on 100 rows, a timeout on 50,000.
        correct: true
      - text: |
          The URL growing too long because free-string sort values aren't stripped when they equal the default.
        correct: false
    why: |
      A free sort string is both a shape-injection surface (the value becomes the *column being ordered on* — structural, not a parameterizable value) and a performance cliff (unindexed sorts can't use an index scan and collapse at scale). The enum closes both: it's gated by the composite indexes that actually exist, so every allowed sort rides an index. Default-stripping is unrelated — it applies to any parser with a `.withDefault(...)`, enum or not.

  - source: 60.3
    question: |
      In the search box, you use *both* React's `useDeferredValue` and nuqs's `limitUrlUpdates: debounce(300)`. A reviewer says one is redundant — pick one. Are they right?
    choices:
      - text: |
          Yes — both delay the search, so `useDeferredValue` alone (or the debounce alone) covers it; keeping both is belt-and-suspenders.
        correct: false
      - text: |
          No — they bound different things: `useDeferredValue` is render priority on *this device* (adaptive, coalesces keystrokes), while `debounce` keeps partial input from writing the URL and hitting the *server* — a threshold meaningful outside the browser.
        correct: true
      - text: |
          No — `useDeferredValue` controls the URL write and `debounce` controls the input's repaint, so removing either breaks a different half of the box.
        correct: false
    why: |
      They're complementary. `useDeferredValue` is a priority marker that adapts to the device's render budget and coalesces keystrokes for rendering; the debounce puts a hard floor on how often the URL is written and — because the write is `shallow: false` — how often the database is queried. One protects the render loop, the other protects the history stack and the server. (The third option inverts their jobs: the deferred value drives the URL write, the typed value drives the instant input repaint.)

  - source: 60.3
    question: |
      A search write needs `shallow: false`. What does dropping that option do?
    choices:
      - text: |
          The URL still updates on the client, but the write never notifies the server, so the Server Component never re-renders and the list never re-queries.
        correct: true
      - text: |
          Every keystroke pushes a new browser-history entry, so the back button rewinds the search one letter at a time.
        correct: false
      - text: |
          The input's `value` desyncs from the URL, so the box stops reflecting what the user typed.
        correct: false
    why: |
      A nuqs write defaults to `shallow: true` — it updates the URL on the client only, which is right for client-read state but wrong for a server-rendered list. `shallow: false` is the load-bearing option that makes the committed write reach the server and re-run the query. (History spam is governed by the `history` option, which already defaults to `'replace'`; the input/URL split is handled by typed-vs-committed state, not `shallow`.)

  - source: 60.4
    question: |
      Cursor pagination is the chapter's default. When is reaching for offset (`?page=N`) instead the right call?
    choices:
      - text: |
          Whenever the product wants a numbered "page 3 of 7" pager, since cursors can't show a total.
        correct: false
      - text: |
          Only when all three hold at once: the set is small and known-bounded, the offset stays shallow, and the product genuinely needs jump-to-page-N random access.
        correct: true
      - text: |
          For any list under heavy write traffic, since offset re-counts rows on every request and stays current.
        correct: false
    why: |
      Offset's three gating conditions are conjunctive — a small bounded set, shallow depth, and a real need for random page access. The invoices-scale list fails them and stays on cursor. Offset is also *worse* under write traffic, not better: an insert above the current page shifts every row's position, so the user sees a duplicate and a skipped row — the exact failure that makes cursor the default.

  - source: 60.4
    question: |
      A coworker pastes you a cursor-paginated link. By the time you open it, two new invoices have been created above the encoded position. You see rows your coworker never saw, and they file "the pagination link is broken." What's the correct response?
    choices:
      - text: |
          It's a bug — a shared URL must reproduce the exact rows the sender was looking at, so the cursor should encode a frozen snapshot.
        correct: false
      - text: |
          It's correct behavior — a cursor URL guarantees the *position* ("the rows after this point in the current data"), not a *snapshot* of the exact rows the sender saw.
        correct: true
      - text: |
          It's a bug caused by skipping the cursor reset — clearing the cursor on share would have shown the same rows.
        correct: false
    why: |
      A cursor encodes a position, not a snapshot: it means "the rows after this sort key, in the current data," so live inserts and deletes legitimately change what a shared link shows. That's the cursor contract working. (A genuinely frozen view is a different feature — a stored snapshot or export, not a URL parameter. The reset invariant is about clearing the cursor on filter/sort/search changes, unrelated to sharing.)
