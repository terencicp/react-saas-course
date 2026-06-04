# Lesson title

- Title: Navigation primitives
- Sidebar label: Navigation primitives

# Lesson framing

Fourth lesson of Ch 029. The student can now build the URL surface (folders → segments, `page.tsx`, `layout.tsx`, route groups, `[id]` dynamic segments). This lesson teaches how to **move between** those URLs. Four mechanisms, one decision per mechanism:

- `<Link>` — declarative, user-clicked, soft navigation with prefetching.
- `useRouter().push` — imperative navigation from inside an event handler.
- The **throwing trio** — `redirect()` (307), `permanentRedirect()` (308), `notFound()` (404) — server-side flow control that interrupts render.

The spine of the lesson is a **decision filter**: *who triggers the navigation, and where does the code run?* A user clicking a real destination → `<Link>`. Code in a handler deciding where to go → `useRouter().push`. Server code that must stop and send the request elsewhere (auth gate, missing resource, moved URL) → a throwing function. This filter is the durable senior takeaway; the four APIs hang off it.

Two pedagogical anchors:

1. **`<Link>` is `<a>` plus a contract.** The student already knows `<a>` from earlier HTML/JSX work. Frame `<Link>` as: same rendered element, but the framework intercepts same-origin clicks to swap the page without a full reload and prefetches the destination ahead of the click. Anchor the *why* in the pain of a full-document reload (blank flash, re-download, lost client state) versus a soft swap. The boundary rule is crisp and memorable: **`<Link>` for in-app, `<a>` for external.**

2. **The throwing trio doesn't return — it interrupts.** This is the lesson's highest-value misconception target. Beginners write `const result = redirect('/x')` or wrap `notFound()` in `try/catch` and are baffled when "the redirect gets swallowed" or "code after it still seems reachable in my head." Teach explicitly: these functions **throw a special signal the framework catches**; nothing after them in the same scope runs; never `try/catch` them (a broad `catch` will swallow the signal and break the redirect). TypeScript reinforces this — their return type is `never`.

Cognitive-load staging: start with the everyday case (`<Link>`), add the imperative escape hatch (`useRouter`), then the three server-side throwers as one family with a shared mental model, closing on a single decision diagram that unifies all four. Prefetching is taught as a *default to trust*, not a knob to fiddle — name the rare triggers that justify `prefetch={false}`, but the headline is "the default is already the senior choice."

Production stakes to weave in: the auth gate (`redirect('/sign-in')` from a server component — the Unit 8 pattern previewed), the moved-marketing-URL (`permanentRedirect` for SEO), and the missing-invoice 404 (`notFound()` on a dynamic route — closes the loop opened in L3, where `notFound()` was named but its companion `<Link>`/`redirect` siblings were deferred here).

This lesson is App-Router-bound, so the in-browser React sandbox **cannot run the real router** (same constraint L3 hit — the iframe renders React but not Next routing). Exercises are therefore decision/recognition drills (`StateMachineWalker`, `Dropdowns`, `Buckets`, `MultipleChoice`) plus one annotated code walkthrough, not live navigation. Do not author a `ReactCoding` exercise that pretends to navigate.

# Lesson sections

## Moving between routes without reloading the page

Introduction. Open with the concrete senior question: the student has `/dashboard`, `/dashboard/invoices`, and `/invoices/[id]` from earlier lessons — now a user needs to *get* between them, an unauthenticated visitor must be bounced to `/sign-in`, a deleted invoice must render "not found", and a renamed marketing page must permanently forward. Name the four mechanisms in one breath and preview the decision filter (who triggers it, where does the code run). Keep it to a short paragraph plus a one-line list. Connect to prior knowledge: the student knows `<a href>` causes a full page load — frame the rest of the lesson as "the framework-aware upgrades to that."

No diagram here; the introduction motivates, the body delivers.

## Link: client-side navigation that feels instant

The everyday primitive. Teach `<Link>` from `next/link` (note: `next/link` counts as an external import per the import-group convention; show the import).

Core model, taught in this order:
1. **What it renders.** `<Link href="/dashboard">Dashboard</Link>` renders a real `<a href="/dashboard">`. It is not a div-with-onClick — right-click "open in new tab", middle-click, and keyboard focus all work because it *is* an anchor. (Since Next 13 it no longer needs a child `<a>`; the student will never see the legacy nested-`<a>` form.)
2. **What it intercepts.** On a plain same-origin left-click, the framework prevents the browser's full navigation and instead fetches the destination's RSC payload + data and swaps the page in place. No blank flash, no re-download of the shell, client state in surviving layouts is preserved (callback to L2's layout/page render boundary — the sidebar doesn't remount).
3. **The boundary rule.** `<Link>` for routes inside your app; a bare `<a>` for external URLs (`https://…`, `mailto:`). An external `<Link>` gains nothing and loses prefetching.

Use a **`CodeVariants`** block (soft vs. hard navigation) to make the contrast visceral:
- Variant "`<Link>` — soft": `<Link href="/dashboard/invoices">Invoices</Link>`. First sentence of prose: "Intercepted, swapped in place, shell and sidebar stay mounted."
- Variant "`<a>` — hard": `<a href="/dashboard/invoices">Invoices</a>`. First sentence: "Full document reload — the browser throws away the page and rebuilds everything."
- Variant "`<a>` — correct use": `<a href="https://stripe.com" target="_blank" rel="noreferrer">Stripe</a>`. First sentence: "External link — `<a>` is right here; `<Link>` would only add dead prefetch weight."

Pass `href` to dynamic routes via template literals: show `<Link href={\`/invoices/${invoice.id}\`}>` inside a `.map`, with a `key` on the `<li>` (reinforces the L3 dynamic-segment shape and the lists-need-keys convention). A small **`Code`** block suffices.

Mention `replace` and `scroll` props briefly **in prose where they earn their place**, not as a feature dump:
- `replace` — swaps the current history entry instead of pushing a new one; reach for it when a back-button stop on this URL would be wrong (e.g. a redirect-after-step flow). Default pushes.
- `scroll` — defaults to `true`, meaning Next maintains scroll position when the new page is still in view and otherwise scrolls to the top of the page. `scroll={false}` opts out of that top-scroll. Frame as a rare polish knob, not a default to touch. (Correct the common misconception that the default always jumps to top — it does not.)

`Term` candidates here: **soft navigation** (client-side page swap, no full reload), **RSC payload** (the serialized React Server Component output the client applies — defined in one clause, owned by Ch 030).

## Prefetching: the navigation is already loaded before the click

The performance model behind `<Link>`. This is where "feels instant" comes from, and the senior lesson is *trust the default*.

Teach the default first, then the prop. The default (`prefetch` unset, equivalent to `"auto"`/`null`):
- Prefetch fires when the `<Link>` **enters the viewport** (on mount or via scroll), not on hover. In production only (dev never prefetches — set this expectation so the student isn't confused locally).
- For a **static** destination, the full route + data is prefetched. For a **dynamic** destination, only the partial route down to the nearest `loading.tsx` boundary is prefetched (forward-reference `loading.tsx` to Ch 031, one clause). On hover, if the prefetched data has gone stale, Next re-fetches.
- Under Cache Components (Ch 032, named only), prefetches dedupe shared layouts and fetch only uncached segments — the student may see *more* prefetch requests but smaller total transfer. Mention in one sentence so a curious devtools-watcher isn't alarmed; do not teach the caching model here.

The prop has exactly three values — teach them as a table or tight list, not prose:
- `"auto"` / `null` (default) — the behavior above. **The senior reach.**
- `true` — always prefetch the full route, static or dynamic. Justified only for a small set of high-intent links where the destination is known-expensive-to-render and you want it fully warm.
- `false` — never prefetch (viewport or hover). Justified when the destination is costly to prefetch at scale (many links to rate-limited or heavy endpoints) or genuinely unlikely to be clicked.

Headline the watch-out: **don't reach for `prefetch={true}` reflexively** — it multiplies prefetch traffic for marginal gain and can hammer a backend when many such links are on screen. The default already prefetches the right amount.

Diagram — **`DiagramSequence`** (3 steps) titled "What the default prefetch does", pedagogical goal: make the invisible timeline visible so the student trusts it.
- Step 1 "Link enters viewport": a list of `<Link>` rows; the one scrolled into view lights up, caption "Framework starts fetching its route + data in the background."
- Step 2 "User hovers / pauses": same row, caption "Already warm. If the prefetch went stale, it refreshes now."
- Step 3 "User clicks": caption "Swap is instant — the bundle and data are already here. No spinner."
Keep it horizontal and short. (Alternative considered: `RequestTrace` — rejected, it models the render pipeline not the prefetch-then-click timeline, which is what the misconception lives in.)

## Navigating from code with useRouter

The imperative escape hatch. The trigger-before-tool framing: reach for this **only when the navigation is decided inside an event handler**, not from a clicked link — e.g. after a form submit, after a confirmation, on a conditional branch a `<Link>` can't express.

Teach:
- Import `useRouter` from **`next/navigation`** — and headline the single most common import bug: it is *not* `next/router` (that is the Pages Router hook the course never uses). One line, but make it loud; this trips people coming from old tutorials.
- `useRouter` is a hook → its component must be a **Client Component** (`'use client'`). Callback to the module-boundary rule. Server Components have no `useRouter`; they reach for `redirect()` instead (forward-pointer to the next section, and the cleanest way to motivate why the trio exists).
- The methods, named tightly: `push(href)` (navigate + history entry), `replace(href)` (navigate, replace entry), `back()` / `forward()` (history), `refresh()` (re-fetch the current route's server data without losing client state — name it, defer the post-mutation use to Ch 032). Headline `push` and `replace`; the rest are one-liners.
- **The handler-vs-render line** (verified, worth stating crisply): `useRouter().push` is the tool for navigating **from an event handler**. The throwing trio (next section) works in render — Server Components *and* Client Components during render — but **not** from inside an event handler. So: "navigate on click/submit handler" → `useRouter`; "stop and reroute while rendering" → the trio. Keep this to two sentences; the decision walker formalizes it.

Use an **`AnnotatedCode`** walkthrough of a small Client Component (a "create invoice" button stub that, on a successful action, calls `router.push(\`/invoices/${newId}\`)`). Steps:
1. `'use client'` + the `useRouter` import from `next/navigation` (highlight the import path, `color="orange"`, with the "not next/router" note).
2. `const router = useRouter()` at the top level.
3. The handler calling `router.push(...)` after the work resolves.
Keep the action itself a stubbed `await createInvoice()` — Server Actions are Ch 043; signal that with a `// Ch 043` comment so the student knows this is a placeholder, not the lesson. Note in the outline: this is a deliberate staged simplification (no real action wiring) so downstream agents don't "complete" it.

Boundary note in prose: `useRouter().push` and `<Link>` do the *same* soft navigation — the difference is the **trigger** (code vs. click), not the result. Prefer `<Link>` whenever the navigation maps to a thing the user clicks, because it ships an accessible anchor for free; reach for `push` only when there's no anchor to click.

`Term` candidate: **imperative** (you call it; vs. declarative `<Link>` you place).

## The throwing trio: redirect, permanentRedirect, and notFound

The lesson's conceptual core and its sharpest misconception. These three live in **`next/navigation`** and work **during render** — Server Components, Client Components (on render, not in event handlers), Route Handlers, and Server Actions. They share one behavior: **they throw a signal the framework catches, so no code after them runs.** Frame them as "the render-time reroute," paired against `useRouter` (the handler-time navigate) from the previous section — that pairing is the boundary the student must hold.

Open with the shared mental model *before* the three individual APIs, to cut cognitive load:
- They do not return a value you handle. Their TypeScript return type is `never`.
- Calling one **interrupts** the current render/handler the way `throw` does — control leaves immediately.
- **Never wrap them in `try/catch`.** A broad `catch` swallows the framework's signal and the redirect/404 silently breaks. This is the #1 bug. If you must do cleanup, do it before the call.

Then each, briefly:

- **`redirect(path)` — temporary (307).** The everyday redirect. Senior reaches: the **auth gate** (a server component or layout calls `redirect('/sign-in')` when there's no session — the Unit 8 pattern, previewed) and **post-action redirects** (after a Server Action mutates, send the user to the new resource — Ch 043). 307 preserves the HTTP method. Carve-out the student must know: **inside a Server Action, `redirect()` issues 303** (See Other), because the action arrives via POST and the browser must follow with GET. Name it; the why is one clause.
- **`permanentRedirect(path)` — permanent (308).** Same throwing behavior, but tells search engines and browser caches "this URL moved for good." Reach for it **only** for real URL migrations / brand renames where you want the index updated. (Also issues 303 inside a Server Action, same reason.) The senior default between the two is overwhelmingly `redirect()`; `permanentRedirect` is the rare, deliberate choice.
- **`notFound()` — the missing-resource signal (404).** Throws; the framework renders the closest `not-found.tsx` (Ch 031 owns that file) and serves a 404. Every dynamic route is a candidate: after validating `params` and querying, if the row is `null`, call `notFound()`. This **closes the L3 loop** — L3 validated `params` with Zod and named `notFound()` as the on-miss bail; here the student sees it as one of the trio and understands *why* it doesn't need a `return`.

Code — a **`CodeVariants`** before/after pair drives the misconception home:
- Variant "Broken — wrapped in try/catch": a dynamic page that does `try { const invoice = await getInvoice(id); if (!invoice) notFound(); } catch (e) { … }`, with `del`/highlight on the `try/catch`. First sentence: "The `catch` swallows `notFound()`'s signal — the 404 never fires."
- Variant "Correct — let it throw": the same page with no `try/catch`; `if (!invoice) notFound();` then use `invoice` below. First sentence: "`notFound()` throws past your code; the framework catches it. Nothing after it runs."
Reinforce with a one-line `Code` showing the auth-gate shape: `const session = await getSession(); if (!session) redirect('/sign-in');` (stub `getSession`, comment `// Unit 8`).

Optionally surface the `never` return type with **`CodeTooltips`** on `redirect` / `notFound` in a tiny snippet so the student sees the type system agreeing that "nothing comes back."

`Term` candidates: **307 / 308 / 303 / 404** (HTTP status codes — short gloss each; non-obvious that 307≠302 and why), **`never` (type)** (a function typed `never` cannot return normally).

Watch-outs consolidated into this section's prose (not a trailing list): the trio is server flow-control, not a function-result; no `try/catch`; `redirect` is 307 except 303 in a Server Action; `permanentRedirect` is the rare permanent case; `notFound` pairs with `not-found.tsx`.

## Choosing the right primitive

Synthesis. One decision artifact unifies the lesson and is the durable takeaway the student leaves with.

**`StateMachineWalker`** (`kind="decision"`), pedagogical goal: drill the senior question order — *trigger first, then execution context* — so the student internalizes the filter rather than memorizing four APIs. Walk:
- Root question: "Who triggers the navigation?"
  - "A user clicking a destination" → "Is the destination in your app?"
    - "Yes, in-app" → Leaf **`<Link href>`** (soft nav + free prefetch + accessible anchor).
    - "No, external" → Leaf **plain `<a href>`** (no `<Link>` for off-site).
  - "My code, inside an event handler" → Leaf **`useRouter().push` / `.replace`** (Client Component only; same soft nav, code-triggered).
  - "My code, during render, and it must stop and reroute" → "What's the situation?"
    - "No session / wrong auth — bounce them" → Leaf **`redirect('/sign-in')` (307)**.
    - "The resource doesn't exist" → Leaf **`notFound()` (404 → `not-found.tsx`)**.
    - "This URL permanently moved" → Leaf **`permanentRedirect()` (308)**.
Each leaf body: one line on the mechanism + its one-line "earns its weight" trigger.

Follow with a short **exercise** to check the filter sticks — **`Dropdowns`** over 4–6 inline scenarios, each a sentence with a `<select>` for the right primitive. Scenarios: "User clicks a row to open `/invoices/42`" → `<Link>`; "After `createInvoice` resolves, go to the new invoice from the click handler" → `useRouter().push`; "A signed-out user hits `/dashboard`" → `redirect()`; "`/invoices/99` where 99 was deleted" → `notFound()`; "Old `/pricing-2024` should forward to `/pricing` for Google" → `permanentRedirect()`; "Link to the Stripe docs" → `<a>`. Grading: exact-match per blank; the distractor set includes the *other* navigation primitive so the choice is meaningful.

Optionally a single **`MultipleChoice`** on the highest-value misconception ("What happens to code after `redirect()` in a Server Component?" — correct: it never runs; distractors: it runs after the redirect resolves / you must `return redirect(...)` / it runs only if redirect fails) to nail the throwing-not-returning model one more time.

## External resources

`ExternalResource` cards (1–2, optional): the Next.js `<Link>` API reference and the Next.js "Linking and Navigating" guide. Skip a video unless the resourcer finds a tight Next.js 16 navigation explainer — the concepts are short and code-centric, prose + the decision walker carry them better than a talking-head.

# Scope

**Prerequisites to restate in one line each (do not re-teach):** folders→segments / `page.tsx` / `layout.tsx` (L1–L2); the layout/page render boundary that makes soft-nav preserve layout state (L2); `[id]` dynamic segments, `params` as a Promise, validate-then-query with Zod, `notFound()` named as the on-miss bail (L3); `'use client'` and that Client Components can't be `async` (Ch 030 owns depth; reference only); `<a href>` and lists-need-keys from earlier HTML/JSX units.

**This lesson owns:** `<Link>` (rendering, soft-nav interception, in-app-vs-external rule, `href` to dynamic routes, `replace`/`scroll` in passing); the prefetch model and the three `prefetch` values; `useRouter` from `next/navigation` with `push`/`replace`/`back`/`forward`/`refresh` (named, with `push`/`replace` taught); the throwing trio `redirect` (307/303), `permanentRedirect` (308/303), `notFound` (404); the unifying decision filter.

**Explicitly out of scope (name and defer, do not teach):**
- The full `next/navigation` **hooks** surface — `usePathname`, `useSearchParams`, `useParams` — Ch 033.5. `useRouter` here is the navigation half only; reading the URL is Ch 033.
- `searchParams` and URL-as-state — Ch 033.4; the active-link `usePathname` pattern lives there too.
- **Server Actions** and the post-action `redirect()` wiring — Ch 043. The action in examples is a stub.
- `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx` (the files the trio and prefetch reference) — Ch 031.
- The **rendering / caching** model behind prefetch (Cache Components, PPR, static vs. dynamic) — Ch 032; mention by name only.
- `router.refresh()` as the **post-mutation revalidation** tool and the full invalidation tree (`revalidatePath`/`revalidateTag`/`updateTag`) — Ch 032.6.
- Redirects in **`proxy.ts`** and `next.config.ts` redirect maps, and the redirect-vs-rewrite split — Ch 033.2–3 / Ch 034.
- View Transitions / `transitionTypes` and `onNavigate` navigation-blocking — newer `<Link>` props, deferred (animations are Ch 021.5); do not teach.
- The **Pages Router** `next/router` — named once only as the wrong import for `useRouter`.

# Notes for downstream agents

- The App Router does not run in the in-browser React iframe (same limit as L3). Do **not** author a `ReactCoding`/live-navigation exercise. Use decision/recognition drills only.
- The Server Action in the `useRouter` and auth-gate examples is intentionally a stub (`// Ch 043`, `// Unit 8`). This is a deliberate staged simplification — do not flesh it out.
- The `prefetch` "static on viewport / dynamic on hover" phrasing in the chapter outline is dated; the verified Next.js 16.2 model is *viewport-triggered, partial-to-nearest-`loading`-boundary for dynamic routes, hover only re-fetches stale data*. Use the verified model.
- The `scroll` default does **not** always jump to top — correct that common misconception when describing the prop.
