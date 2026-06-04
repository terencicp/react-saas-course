sources:
  29.1: The file system is the route table
  29.2: Layouts and route groups
  29.3: Dynamic and catch-all segments
  29.4: Navigation primitives
  29.5: Parallel routes and slots
  29.6: Intercepting routes and URL-backed modals

questions:
  - source: 29.1
    question: |
      A bare `revenue-chart.tsx` next to your `page.tsx` is already non-routable — Next.js never turns a stray component file into a URL. So why does the course still insist you tuck co-located code under a `_components/` or `_lib/` folder?
    choices:
      - text: |
          Because Next.js keeps reserving new filenames, and a file you named `default.tsx` or `template.tsx` would silently become a framework convention — a `_`-prefixed folder is off the router's radar entirely, so it can never collide.
        correct: true
      - text: |
          Because a bare component file *is* routable and would leak as a broken page at `/dashboard/revenue-chart` until you prefix it.
        correct: false
      - text: |
          Because the `@/` import alias only resolves files that live inside an underscore-prefixed folder.
        correct: false
    why: |
      The strongest reason is future-proofing: bare files are safe *today*, but the framework keeps adding reserved names, and a `default.tsx` or `template.tsx` you wrote as a plain component would quietly turn into a parallel-route fallback or a remounting template. A whole `_`-prefixed folder is invisible to the router, so nothing inside it can ever collide with a framework name. A stray file does not become a route (only `page.tsx`/`route.ts` do), and the `@/` alias has nothing to do with private folders.

  - source: 29.2
    question: |
      A dashboard's sidebar — including its collapsed/expanded toggle and scroll position — lives in a Client Component inside `app/(app)/layout.tsx`. The page itself holds a half-typed form. The user navigates from `/dashboard` to `/dashboard/settings`. What survives the navigation? Select all that apply.
    choices:
      - text: |
          The sidebar's collapsed/expanded state — the layout stays mounted across navigations within its subtree.
        correct: true
      - text: |
          The sidebar's scroll position — same reason; the layout never unmounted.
        correct: true
      - text: |
          The half-typed form text — pages re-render but never fully unmount on navigation.
        correct: false
      - text: |
          Nothing — every soft navigation rebuilds the whole tree from the root down.
        correct: false
    why: |
      Layouts stay mounted across navigations inside their subtree; only the page swaps. So Client-Component state held *in the layout* — the sidebar toggle, its scroll — persists, which is exactly why persistent UI belongs in the layout. The page, by contrast, unmounts and a fresh one mounts, so its local state (the half-typed form) resets. Navigation does not rebuild from the root.

  - source: 29.3
    question: |
      An invoice detail page sits at `app/invoices/[id]/page.tsx`, and ids are UUIDs. A senior reviewer rejects a version that does `const invoice = await getInvoice((await params).id)` directly. What's the load-bearing fix?
    choices:
      - text: |
          Validate first: `safeParse` the awaited `params` against `z.object({ id: z.uuid() })`, call `notFound()` on failure, and only pass `parsed.data.id` to the query — the URL is untrusted input.
        correct: true
      - text: |
          Wrap the query in `try/catch` so a malformed id is caught and rendered as an error page instead of crashing.
        correct: false
      - text: |
          Coerce the id with `Number(params.id)` before querying so a non-UUID string can't reach the database.
        correct: false
    why: |
      `params.id` is whatever the user typed in the address bar — untrusted input — so the reflex is capture → validate → query: parse it against a schema (`z.uuid()` for the course's UUIDs) and `notFound()` on a miss, so a garbage or hostile id never touches the query. A `try/catch` around the query validates *after* the bad value already hit the database, defeating the point — and it would also swallow the `notFound()` signal. `Number()` on a non-numeric string yields `NaN` silently rather than rejecting.

  - source: 29.4
    question: |
      A Server Component runs `if (!session) redirect('/sign-in')`, then `return <Dashboard userId={session.userId} />`. A teammate wraps the whole thing in a `try/catch` "to be safe." What goes wrong?
    choices:
      - text: |
          The `catch` swallows the redirect signal — `redirect()` works by *throwing*, so a broad catch eats it and the protected page renders for a signed-out user instead of bouncing them.
        correct: true
      - text: |
          Nothing goes wrong; wrapping `redirect()` in `try/catch` is the recommended way to handle the no-session branch cleanly.
        correct: false
      - text: |
          The `return` line throws because `session` is `null`, so you must assign `const result = redirect(...)` and return that instead.
        correct: false
    why: |
      `redirect()` (like `notFound()` and `permanentRedirect()`) is typed `never`: it throws a signal the framework is waiting to catch, and a broad `try/catch` catches that signal like any other throw, so the reroute silently dies. The rule is absolute — never wrap the throwing trio in `try/catch`. And because the throw exits the function, the `return` is unreachable on the no-session path and TypeScript narrows `session` to non-null below the `if`; there is no value to assign.

  - source: 29.5
    question: |
      You build a list-plus-detail invoices screen with a `@detail` slot and ship it. Clicking around in dev works flawlessly, but a user who opens a shared `/invoices/42` link in a fresh tab gets a full-page 404. What did you forget, and why did dev never catch it?
    choices:
      - text: |
          A `default.tsx` in the `@detail` slot. Soft navigation carries the previous slot match forward, but a hard load resolves every slot from the URL — an unmatched slot with no fallback 404s the *whole* route, and dev only ever soft-navigates.
        correct: true
      - text: |
          A `loading.tsx` in the `@detail` slot — without it the slot can't stream on a fresh load and the route times out into a 404.
        correct: false
      - text: |
          The `@detail` folder should have been named `(detail)` — the `@` prefix isn't a valid route group, so it 404s on direct visits.
        correct: false
    why: |
      On a hard navigation there is no previous match to carry forward, so the router resolves every slot from the URL alone; if a slot has no matching route and no `default.tsx`, the framework 404s the entire route rather than render half a screen. Clicking around in dev is all soft navigation, which keeps the unchanged slot's match — so the bug hides until a real user hard-loads a link. `loading.tsx` is about streaming, not the unmatched case, and `@detail` is correctly a slot (a named prop), not a route group.

  - source: 29.6
    question: |
      A dashboard nests everything under a `(dashboard)` route group. Settings lives at `app/(dashboard)/settings/page.tsx` (URL `/settings`) and members at `app/(dashboard)/members/page.tsx` (URL `/members`). You add an intercepter at `app/(dashboard)/settings/@panel/‹prefix›members/[id]/page.tsx` so clicking a row in settings opens the member view as a panel over it. Which prefix is correct?
    choices:
      - text: |
          `(..)` — the count is URL-segment-relative, and both `@panel` (a slot) and `(dashboard)` (a route group) contribute no URL segment, so `/settings` and `/members` are just one segment apart.
        correct: true
      - text: |
          `(..)(..)` — walk two folders up the disk tree, past `@panel` and `settings`, to reach the members route.
        correct: false
      - text: |
          `(...)` — root the count at the `(dashboard)` group, since everything lives under it.
        correct: false
    why: |
      The interception prefix counts *URL segments*, not folders. Walking up from the intercepter you cross `@panel` (a slot) and `(dashboard)` (a route group), and neither adds a URL segment — strip them away and `/settings` and `/members` are siblings, one segment apart, so `(..)` is right. `(..)(..)` and `(...)` count disk folders, which is exactly the trap; counting folders makes the intercepter silently never fire.
