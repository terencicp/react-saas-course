sources:
  33.1: Reading the request with cookies() and headers()
  33.2: proxy.ts and the matcher
  33.3: Rewrites and redirects in proxy.ts
  33.4: URL state with searchParams and route params
  33.5: Client-side navigation hooks

questions:
  - source: 33.2
    question: |
      A teammate ships an auth gate in `proxy.ts`. It reads the session cookie, verifies it against the database, and bounces signed-out users — and they've decided that since the proxy now does the real check, the routes themselves no longer need one. What's wrong with this plan? Select all that apply.
    choices:
      - text: |
          A database read in the proxy runs on every matched request, multiplying a cost you'd otherwise pay once in the route — the classic "why did every page get slow" regression.
        correct: true
      - text: |
          Excluding a path from the matcher (or a refactor that does so) silently drops proxy coverage on Server Action POSTs to that path, so a proxy-only gate can leave a hole nothing flags.
        correct: true
      - text: |
          It's the right call: centralizing the authoritative check in one file is exactly what `proxy.ts` is for, and duplicating it in every route is wasteful.
        correct: false
    why: |
      The proxy is a fast, non-authoritative gate, not a second application layer. A per-request DB read there is paid across the whole app, and matcher coverage is fragile — a Server Action posting to an excluded path never sees the proxy, so a proxy-only gate can open silently. The reflex is defense in depth: cheap cookie-presence check in the proxy, authoritative validation in the route's `requireUser()`, fresh every time.

  - source: 33.1
    question: |
      A Server Component reads `(await headers()).get('x-forwarded-for')` to get the client IP, and another component reads a custom `x-user-role` header to decide whether to show an admin panel. Which read is the dangerous one, and why?
    choices:
      - text: |
          The `x-user-role` read — it makes an authorization decision from a header, which any client can forge. Identity and permission come from the verified session, never a raw header.
        correct: true
      - text: |
          The `x-forwarded-for` read — IP addresses are personal data, so reading one without consent is the real risk; the role header is fine because the app set it.
        correct: false
      - text: |
          Neither is dangerous — headers arriving at a Server Component have already passed through the platform, so they can be trusted for any decision.
        correct: false
    why: |
      Headers are attacker-controlled strings by default — anyone can send `x-user-role: admin`. Authorizing off one is a textbook privilege-escalation bug. `x-forwarded-for` is only trustworthy because a known proxy (Vercel) overwrites it, and even then it's for telemetry, not identity. The anchor: headers are for telemetry and platform signals; the session decides who someone is and what they may do.

  - source: 33.3
    question: |
      Your SaaS permanently moves `/account` to `/settings`, and separately bounces already-logged-in users away from `/login`. A reviewer says "just use `NextResponse.redirect(url)` for both and you're done." What does that miss?
    choices:
      - text: |
          The `/account` move should be a 308 (permanent) but `redirect()` defaults to 307; and the `/login` bounce should stay 307 because it depends on the user's session — a 308 there gets cached as "never visit /login," wrong once they log out.
        correct: true
      - text: |
          Both belong in `next.config.ts` instead, because any redirect is cheaper at the CDN edge regardless of whether it reads the request.
        correct: false
      - text: |
          Nothing — `NextResponse.redirect(url)` already sends a permanent redirect by default, which is correct for both cases.
        correct: false
    why: |
      The status code is the permanence signal, and `redirect()` defaults to 307 (temporary). The `/account` rename is a genuine permanent move, so it earns an explicit 308 that lets search engines reindex. The `/login` bounce is a fact about *this user right now*, not the URL, so it stays 307 — a wrong 308 gets cached and indexed and is painful to undo. Under-commit to 307 unless a move is truly forever.

  - source: 33.4
    question: |
      Building an invoice list, you wire the status filter into `useState`, refetch in a `useEffect`, and render. It works on your screen. Why does a senior reach for URL state instead?
    choices:
      - text: |
          The filter is state a user expects to survive a refresh and travel in a shared link — that belongs in the URL, where a Server Component reads it directly with no client state, no effect, and no fetch waterfall.
        correct: true
      - text: |
          `useState` can't hold a filter value reliably across re-renders, so the URL is the only place the value stays stable.
        correct: false
      - text: |
          URL state is faster only because the browser caches query strings; functionally the two approaches are equivalent.
        correct: false
    why: |
      The decision rule is one question: would the user expect this state back on refresh or in a shared link? Filter, sort, pagination, and active tab all answer yes, so they live in the URL — the server is then a pure function of the URL, reading and rendering with no second source of truth. The `useState`+`useEffect` version rebuilds the exact fetch-in-an-effect waterfall the effects chapter warned against, and it dies on refresh and can't be shared.

  - source: 33.5
    question: |
      A `'use client'` filter chip needs to show whether it's the active filter and, on click, change the URL to its status while keeping the existing `?sort` and `?cursor` params. Which approach is right?
    choices:
      - text: |
          Take the active status as a prop the server already resolved (no hook to read it), and on click seed a `new URLSearchParams` from the current query, `set` the one key, and `router.replace(..., { scroll: false })`.
        correct: true
      - text: |
          Read the active status with `useSearchParams` for live accuracy, and on click `router.push('?status=paid')` so the back button can step through each filter.
        correct: false
      - text: |
          Read the active status with `useSearchParams`, and on click `router.replace('?status=paid')` — the shortest correct write.
        correct: false
    why: |
      The active state is something the server already read and passed down, so a plain prop comparison beats reaching for `useSearchParams` (which would also drag in a Suspense boundary). For the write, `router.replace('?status=paid')` overwrites the *entire* query and silently drops `sort` and `cursor`; you merge by seeding `URLSearchParams` from the current query and setting one key. `replace` (not `push`) keeps filter churn out of history, and `scroll: false` stops the viewport from jumping.
