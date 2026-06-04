sources:
  31.1: Suspense, the fallback contract
  31.2: Streaming a page in chunks
  31.3: The three segment files
  31.4: Catching the root layout

questions:
  - source: 31.1
    question: |
      A detail view sits behind a `<Suspense>`. The user clicks from `inv_001` to `inv_002`, the component re-renders with the new `invoiceId`, and `inv_001`'s data stays on screen for the whole new load with no skeleton in between. Why does the fallback skip, and what's the one-line fix?
    choices:
      - text: |
          React sees the same component in the same slot and reuses its resolved subtree; add `key={invoiceId}` to the suspending child so a changed key forces a fresh mount that suspends again.
        correct: true
      - text: |
          The boundary lost track of the load; add an `isLoading` flag in a `useEffect` that watches `invoiceId` to re-show the skeleton.
        correct: false
      - text: |
          A boundary can only suspend once; nest a second `<Suspense>` around the same component to restore the fallback on later changes.
        correct: false
    why: |
      Same component, same position — React treats it as one instance and keeps the already-resolved tree, so nothing re-suspends. A `key` tied to `invoiceId` is an identity hint: it remounts the subtree, the remount suspends, and the fallback returns. An `isLoading` flag is exactly the imperative bookkeeping Suspense exists to delete, and a boundary can suspend any number of times — it just never sees a *new* instance to suspend on here.

  - source: 31.2
    question: |
      A dashboard header prints "12 invoices, $48k, last activity 3 minutes ago" — it aggregates three independent reads and can't render until all three are in. The current code awaits them back-to-back in one component and the page is slow. What's the right shape?
    choices:
      - text: |
          One `Promise.all` in one component behind one boundary — the reads run concurrently and the single summary reveals as one unit.
        correct: true
      - text: |
          Three separate `<Suspense>` boundaries, one per read, so each streams in the moment it resolves.
        correct: false
      - text: |
          Keep the serial awaits but wrap the component in `<Suspense>` so the boundary parallelizes them for you.
        correct: false
    why: |
      The fix is decided by how the data is consumed, not by reflex. Back-to-back awaits serialize independent reads into a sum; `Promise.all` starts them at once so you pay `max(...)`. Because the summary aggregates all three into one view, there's a single thing to reveal — one boundary, one fallback. Splitting into three boundaries is the wrong call when the UI can't render half of itself, and a `<Suspense>` boundary never parallelizes the awaits inside a component — it only controls what shows while that component suspends.

  - source: 31.3
    question: |
      An `error.tsx` catches a Server Component data read that failed because the database was briefly unreachable. You wire the "Try again" button to `reset()`, but clicking it just shows the same error again. Why — and which props are wired correctly? Select all that apply.
    choices:
      - text: |
          `reset()` only clears the error state and re-renders with the same data, so a failed Server Component read just reproduces the error — wire the button to `unstable_retry()` instead, which re-fetches and re-renders.
        correct: true
      - text: |
          The file must start with `'use client'` — Error Boundaries are stateful class-component machinery, so `error.tsx` can't be a Server Component.
        correct: true
      - text: |
          Surface `error.digest` in the UI; for a Server Component throw the real message and stack stay on the server, and the digest is what correlates the failure with your logs.
        correct: true
      - text: |
          `error.tsx` also catches a throw in the layout it sits beside, so the same file covers a crash in that segment's layout.
        correct: false
    why: |
      `reset()` re-renders with the same data, so it can't recover a failed read — `unstable_retry()` is the one that re-fetches *and* re-renders, the default for the data errors you'll mostly hit. The `'use client'` directive is mandatory because Error Boundaries are stateful and client-only, and surfacing `error.digest` is correct since the real message stays server-side for security. But `error.tsx` does *not* catch its sibling layout: the boundary lives *inside* that layout's subtree, so a throw in the layout is born outside it — that case needs `global-error.tsx`.

  - source: 31.4
    question: |
      `global-error.tsx` returns `<html lang="en"><body>…</body></html>` — tags no other component you write includes. Why must this one render its own document shell?
    choices:
      - text: |
          It fires *because the root layout crashed*, and the root layout is what normally renders `<html>` and `<body>` — so `global-error.tsx` replaces the layout and must reconstruct the document shell itself, or it ships a blank page.
        correct: true
      - text: |
          Next.js renders every error file as a standalone document, so each `error.tsx` and `not-found.tsx` must also include its own `<html>` and `<body>`.
        correct: false
      - text: |
          The tags are required boilerplate so the file passes the build's directive check; they have no runtime effect.
        correct: false
    why: |
      `global-error.tsx` is the boundary *above* the root layout, and it activates precisely when that layout has crashed — so the `<html>` and `<body>` the layout would have produced are gone. It replaces the layout and renders as the entire document, which is why it must build the shell itself; omit the tags and you ship a blank page in production. Segment-level `error.tsx` and `not-found.tsx` render *inside* the still-living root layout, so they never declare these tags. The requirement is structural, not a build-check formality.
