sources:
  30.1: Server Components as the default
  30.2: Client Components and pushing the boundary down
  30.3: Directives and server-only enforcement
  30.4: What crosses the RSC wire
  30.5: Hydration and its mismatch failure modes

questions:
  - source: 30.1
    question: |
      A teammate opens `app/dashboard/page.tsx`, sees a plain component with no directive at the top, and asks "so where does this run?" In an App Router project, what's the correct read — and what does that let this file do?
    choices:
      - text: |
          It's a Server Component (the default with no directive), so it can be `async`, `await db.query(...)` directly in its body, and read `process.env` secrets — none of which reach the browser.
        correct: true
      - text: |
          It runs in both places by default; the directive only matters for performance tuning, so it could use `useState` *and* query the database in the same file.
        correct: false
      - text: |
          It's a Client Component until you add `"use server"` to opt it into server rendering.
        correct: false
    why: |
      Every component under `app/` is a Server Component unless a `"use client"` boundary above it flips it — the absence of a directive *is* the opt-in to server-only execution. That's what unlocks an `async` body with direct DB access and `process.env` reads that never ship to the client. The flip side is the cost: no `useState`, no event handlers, no `window`. There is no `"use server"` directive for "make this a Server Component" — Server is already the default, and `"use server"` means something entirely different (Server Actions).

  - source: 30.2
    question: |
      A product page renders a grid of cards, each with an interactive `<AddToCart />` button. A teammate adds `"use client"` to the top of `page.tsx` "so the buttons work." Why does a senior push back, and what's the fix?
    choices:
      - text: |
          That directive drags the page, the grid, and every card into the client bundle. Move `"use client"` down to `AddToCart` alone — only the smallest interactive leaf and its dependencies should ship as JavaScript.
        correct: true
      - text: |
          It's fine — `"use client"` on the page only affects the page component itself, so the cards stay Server Components automatically.
        correct: false
      - text: |
          The real fix is to keep `"use client"` on the page but wrap each card in `<Suspense>` so the JavaScript loads lazily.
        correct: false
    why: |
      `"use client"` marks an *entry point*: the file and everything it imports transitively becomes part of the client graph, so a directive at the page top pulls the whole subtree into the bundle. The senior reflex is to push the boundary down to the smallest leaf that actually needs interactivity — here, `AddToCart` — leaving the page, grid, and cards as zero-JS Server Components. Suspense is about streaming async UI, not about trimming what ships to the client.

  - source: 30.2
    question: |
      You want a Client Component `<Tabs>` (it animates, holds active-tab state) to display server-rendered article content inside each tab. Which arrangement actually works?
    choices:
      - text: |
          Render `<Tabs>` from a Server Component and pass the server-rendered article as `children` (or another prop slot) — a Client Component can *receive* server content it doesn't import.
        correct: true
      - text: |
          Inside `Tabs.tsx`, `import` the `<Article>` Server Component and render it directly — Client Components can import Server Components as long as they don't pass them props.
        correct: false
    why: |
      A Client Component cannot `import` a Server Component — that would force the server module into the client bundle, which the framework forbids. The supported pattern is composition through `children`: a Server Component owns the import and hands the already-rendered tree to the client shell as a prop, which renders it opaquely. "Interactive shell wrapping server-rendered content" is exactly this slot pattern.

  - source: 30.3
    question: |
      Your `lib/db/index.ts` reads `process.env.DATABASE_URL` and opens a connection. Someone could one day import it from a `"use client"` file and silently ship the connection string to the browser. The directive convention alone won't catch it. What's the senior guardrail?
    choices:
      - text: |
          Add `import 'server-only';` at the top of the file — if it ever reaches the client bundle, `next build` fails with an error pointing at the offending import chain.
        correct: true
      - text: |
          Add `'use server';` at the top of the file so every export becomes server-bound and can't be imported by a client file.
        correct: false
      - text: |
          Add `'use client';` to the database file so the bundler knows to keep it out of server code.
        correct: false
    why: |
      `server-only` is a marker package rigged to throw if it lands in the client bundle, turning a leaked import into a build error instead of a production secret leak — exactly the structural enforcement the directive convention can't provide. `'use server'` is a different tool entirely: it marks exports as *Server Actions* (RPC endpoints callable from the client), which would make the leak worse, not better. `'use client'` would force the DB code into the browser — the opposite of the goal.

  - source: 30.3
    question: |
      A junior types `"use clinet"` at the top of a new interactive component. The build succeeds, the page loads, but `useState` throws at runtime in production. What happened, and what's the habit that prevents it?
    choices:
      - text: |
          A typo'd directive is silently ignored — the file stayed a Server Component, so the hooks crash at runtime. Copy the directive from a known-good file instead of typing it by hand.
        correct: true
      - text: |
          The directive must be all-lowercase with single quotes; double quotes like `"use client"` are what actually broke it.
        correct: false
      - text: |
          `"use clinet"` was treated as a custom directive name; you fix it by registering it in `next.config.js`.
        correct: false
    why: |
      Directives are matched as literal strings, so `"use clinet"` is just an ignored string at the top of the file — no error, the file silently stays a Server Component, and the hooks blow up only when that path runs. Either quote style is valid (`'use client'` or `"use client"`), so quoting isn't the issue, and there's no config-based directive registration. The senior habit is to copy-paste the directive from a working file rather than retype it, since the failure mode is silent.

  - source: 30.4
    question: |
      A Server Component renders a Client `<Row>` and tries to pass `onDelete={() => deleteUser(user.id)}`. The build errors with "Functions cannot be passed directly to Client Components." Separately, the same page passes a `user` prop that's an instance of a `User` class with methods. Which statements are correct? Select all that apply.
    choices:
      - text: |
          The callback fails because functions don't cross the RSC wire; the fix is to define a `"use server"` Server Action and pass its reference instead.
        correct: true
      - text: |
          The `User` class instance won't cross either — flatten it to a plain object (`{ id, name, email }`) at the boundary; methods and the constructor don't survive serialization.
        correct: true
      - text: |
          Wrapping the callback in `JSON.stringify()` before passing it makes it serializable and crossable.
        correct: false
      - text: |
          A `Date` field on `user` would fail the same way the class instance does, so dates must be passed as ISO strings.
        correct: false
    why: |
      The RSC wire carries structured-clone-compatible values plus React extensions — plain objects, arrays, `Map`, `Set`, `Date`, Promises, JSX — but not functions or class instances. A closure can't run in the browser, so pass a Server Action *reference* (the one function-like value the wire carries) instead. A class instance loses its methods and constructor, so flatten to a plain object at the boundary. `JSON.stringify` on a function yields `undefined`, not a callable. And `Date` is explicitly supported by structured clone, so there's no need to stringify it.

  - source: 30.5
    question: |
      A Client Component renders `<span>{new Date().toLocaleString()}</span>` to show the current time. It looks fine on first paint, then React throws "Hydration failed because the server-rendered HTML didn't match the client." What's the root cause, and the default fix?
    choices:
      - text: |
          The timestamp differs between the server render and the browser render, breaking the strict-equality handshake. Render a stable placeholder on the server and set the real time in a `useEffect` after mount.
        correct: true
      - text: |
          The component is missing a `key` prop, so React can't match the server and client nodes; add a stable `key`.
        correct: false
      - text: |
          Server Components don't hydrate, so the fix is to remove `"use client"` and let it render on the server only.
        correct: false
    why: |
      Hydration requires the client's first render to match the server HTML exactly, and a time-dependent value (`Date.now()`, `toLocaleString()`, `Math.random()`) differs between the two renders — the canonical mismatch cause. The default fix is to render a server-safe placeholder, then swap in the client value inside `useEffect`, which runs only after hydration. `key` is about list reconciliation, not the server/client handshake. And removing `"use client"` would strip the interactivity entirely; "current time" is intentionally a client concern.
