# Client-side navigation hooks

- Title: Client-side navigation hooks
- Sidebar label: Navigation hooks

## Lesson framing

This lesson closes the client/server pair on URL state that lesson 4 opened. Lesson 4 installed the chapter anchor "the server is a pure function of the URL" — same URL in, same page out. This lesson teaches the other half: **the client's only job is to change the URL.** Once the URL changes, the server re-renders the page through the exact pipeline lesson 4 built (read → validate → query → render). The four `next/navigation` hooks are the client's entire vocabulary for that job: read what's in the URL, navigate to a new URL, refresh the current one.

The senior thesis that must dominate the lesson, not the API surface: **read on the server, write on the client.** A Client Component reaches for these hooks *only when interaction is the lesson* — clicking a chip, typing in a search box, toggling a sort. Beginners coming from a SPA/`useEffect`-fetch background reflexively pull everything to the client: they read `searchParams` on the client, derive filtered data in `useEffect`, and rebuild the waterfall lesson 4 just deleted. The lesson must actively counter that reflex. The single most important pedagogical move is the **chip-list insight**: the chip's active state is derived from a *prop the server already passed down*, not from `useSearchParams`. Most beginners reach for `useSearchParams` to read state they already hold as a prop — naming this explicitly and showing the simpler equivalent is where the lesson earns its weight.

The four hooks are a small, recognizable surface, so the lesson is **not** an API tour. It is organized around decisions: which hook for which job, `push` vs `replace` vs `refresh`, when the *client* read (`useSearchParams`) beats the *server* prop read, and the one hard build-error gotcha (the Suspense requirement). Each hook is introduced at the moment a concrete interaction needs it, never as a preamble list.

Cognitive-load staging: start from the one interaction the whole chapter has been promising ("user clicks a filter chip, URL updates, server re-renders, back button works"), name the four hooks as the toolbox, then teach each through the job it does. Build to the worked chip-list that ties writing + active-state-from-prop together, then layer the three sharper edges (`replace` over `push`, the Suspense rule, `useSearchParams` vs the prop). Close by naming `nuqs` as the production layer the bare hooks sit underneath, paying the forward reference to ch 060 without teaching it.

Tone: terse, senior, assumes the student is comfortable with `'use client'`, `useState`, Suspense boundaries, and the async server `searchParams`/`params` shape from lesson 4. No SPA-router nostalgia, no React Router comparison — these are *the* navigation primitives for a 2026 Next.js app.

## Lesson sections

### Introduction (no header)

Open on the concrete interaction the chapter has been deferring since lesson 4: a Client Component renders a filter chip; the user clicks it; the URL goes from `?status=draft` to `?status=paid` *without a full page reload*; the server re-renders the invoice list with the new filter; the back button returns to the previous filter. Lesson 4 built the server side of this (read + validate + query + render). The missing piece is **how the client changes the URL** — and that is the entire job of the four `next/navigation` hooks.

State the division of labor up front as the lesson's spine: **read on the server, write on the client.** Name the four hooks as the toolbox — `useRouter`, `usePathname`, `useSearchParams`, `useParams` — and preview that by the end the student writes the chip-list handler that completes lesson 4's invoice page. Keep it to a short paragraph; the senior question is implicit in the scenario, not a labelled section.

Reuse the chapter anchor explicitly: lesson 4 said "the server is a pure function of the URL"; this lesson's one-liner is "the client's only job is to change the URL." Pair them — that symmetry is the mental model the student should leave with.

### The four hooks at a glance

Purpose: give the student a recognition-level map of the toolbox before drilling into any one hook, so each later section slots into a known frame. This is the *only* place all four appear together; keep it a glance, not a tutorial.

Use a small **Code** block listing the four imports from `next/navigation` and one-line return-shape comments, or a four-row table — whichever is tighter. Per hook, one sentence on what it returns:

- `useRouter()` → the router object: `push`, `replace`, `back`, `forward`, `refresh`, `prefetch`. The *write/navigate* hook.
- `usePathname()` → current path as a `string` (no query, no hash). Read-only.
- `useSearchParams()` → a `ReadonlyURLSearchParams` for the current query. Read-only.
- `useParams()` → the route's dynamic segments as an object. Read-only.

State the one rule that applies to all four and must land before anything else: **all four are Client Component hooks.** Calling any from a Server Component is a build error — they need `'use client'`. Tie this back to the module-boundary rule the student already knows (`'use client'` at the smallest interactive leaf). Add a `Term` on `ReadonlyURLSearchParams` (a read-only subclass of the web `URLSearchParams` the student met in earlier chapters — same `get`/`getAll`/`has`, but no `set`/`delete`).

Note for downstream: do not exhaustively document every router method here. `back`/`forward`/`prefetch` get one line each in the `useRouter` section; the lesson's depth goes to `push`/`replace`/`refresh` because those carry the real decisions.

### Read on the server, navigate on the client

Purpose: install the senior division of labor as an explicit, defensible rule before teaching mechanics, so every later hook is framed as "reach for this only when…". This is the pedagogical heart — it's where the lesson counters the SPA reflex.

Teach the reflex question: *does this component need to write to the URL, or react to URL changes for rendering?* If no, it doesn't need these hooks — it reads `params`/`searchParams` from props on the server (lesson 4) and stays a Server Component. The hooks are for the *interactive leaf* that initiates a navigation, not for reading state.

Contrast the two shapes side by side — this is the highest-value visual in the lesson. Use **CodeVariants** (before/after framing, the doc's named use case):

- Variant "Client waterfall (avoid)": a `'use client'` component that calls `useSearchParams`, fetches in `useEffect`, holds results in `useState`. First sentence names the cost: "Rebuilds the request waterfall lesson 4 deleted — client fetch, loading flicker, no server caching."
- Variant "Server reads, client writes": the Server Component page reads `searchParams` from props and renders the list (compressed, references lesson 4's shape); a small `'use client'` chip component receives the current filter as a prop and only *writes* on click. First sentence: "The server owns the read; the client owns the write. One round-trip, server-cached, no flicker."

Use per-pane mark colors (red-tinted marks on the avoid pane, green on the good pane) per the CodeVariants colored-marks hook. Keep each pane's prose to one paragraph.

Land the senior anchor: the client surface should be the *smallest leaf that initiates the navigation*. Everything else is server. Reuse lesson 1's reflex by name — "read high, pass resolved values down" — and extend it: the values you pass down include the current filter, so the interactive child reads its active state from a prop, not from a hook. This sentence sets up the chip-list payoff later; plant it here.

### useRouter — navigating from the client

Purpose: teach the write hook and the three navigation methods that carry decisions (`push`, `replace`, `refresh`), plus a one-line mention of the rest. This is the largest section; consider the `push`/`replace` split and `refresh` as two sub-concepts under it.

Lead with `useRouter().push` as soft client navigation. Use a small **Code** block: `const router = useRouter(); router.push('/dashboard?status=paid')`. Teach what `push` does, in plain steps: updates the URL, pushes a history entry, fetches and renders the *new route's Server Components* (no full document reload), scrolls to top by default. Frame it as "the programmatic equivalent of clicking a `<Link>`" — back-reference ch 029's `<Link>` surface, which the student already has. Name the `{ scroll: false }` option immediately and tie it to the chip use case: an in-page filter change should not jump the viewport to the top, so filter/sort handlers pass `scroll: false`.

#### push vs replace — what the back button should do

Purpose: this is a genuine senior decision with a clear rule, and beginners get it wrong by defaulting to `push` everywhere. Give it its own h3.

Teach the difference mechanically: `push` adds a history entry; `replace` swaps the current one. Then teach the *decision rule* through the user's expectation of the back button — frame it the way lesson 4 framed URL-vs-state (a user-expectation question):

- `replace` for filter / sort / pagination changes — so "back" leaves the page, not undoes the last chip click. A list where the user toggles five filters should not require five back-presses to escape.
- `push` for genuine navigation between distinct views (opening a record, moving to a different page).

Use **CodeVariants** or a tight two-row table contrasting the two with the same target URL and the resulting history behavior. Keep it small — the decision is the content, not the syntax. Land the one-liner: "If the user wouldn't think of it as 'a place I navigated to,' use `replace`."

#### router.refresh — re-rendering without changing the URL

Purpose: `refresh` is a distinct tool with a sharp, commonly-misunderstood boundary (it is not a cache bust). Give it its own h3 so the boundary lands cleanly.

Teach: `router.refresh()` tells the router to re-fetch and re-render the *current* route's Server Components without changing the URL. The reach: after a client-side event that should re-pull server data (a manual "refresh" button). Then the critical caveat that prevents a real production bug: **`refresh` does not invalidate the cache.** Under Cache Components, a `use cache` value stays cached across a refresh. Pair `refresh` with `revalidateTag(tag, 'max')` in a Server Action when the cached data must change — back-reference ch 032 lesson 6 (cache invalidation) and use the required two-argument form per the chapter note. State the corollary: `router.refresh()` on a fully static route is effectively a no-op for the cached parts; it re-runs only the dynamic work. Use an `Aside` (caution) for the "refresh ≠ revalidate" trap — this is the single most common misconception about this method and earns the visual setoff.

Close the section with one line on the remainder of the router surface: `back()`, `forward()` (history navigation, self-explanatory), and `prefetch()` (manual prefetch — rare, because `<Link>` auto-prefetches on viewport/hover from ch 029; reach for it only for a non-link "next item" or a known-next wizard step). Do not belabor these.

### useSearchParams — reading the query on the client, and the Suspense rule

Purpose: teach the client-side query read, and immediately the one hard build-error gotcha that ships with it. These belong together — the gotcha is inseparable from the API.

First, *when* the client read is the right reach — and this is subtle, so be precise. The server-side `searchParams` prop (lesson 4) is the default and is cheaper. `useSearchParams` earns its place only when a *Client Component* needs to **react** to URL changes for its own rendering — e.g., animating a chip into its active state on the client, or syncing a local input to the URL. For a value the component already receives as a prop, do *not* reach for the hook. Plant the forward pointer to the chip-list section where this becomes concrete.

Show the read surface with a small **Code** block: `const searchParams = useSearchParams(); searchParams.get('status'); searchParams.getAll('tag'); searchParams.has('cursor')`. Note the type is `ReadonlyURLSearchParams` — you cannot `set`/`delete` on it (build-time `Readonly`). Tie back to lesson 4's `string | string[]` repeated-key shape: `getAll` is how you read the array form on the client.

#### The Suspense boundary requirement

Purpose: this is the one gotcha in the lesson that will *break a student's build* with a specific error message; it must be unmissable and explained, not just stated. Give it its own h3.

Teach: a Client Component that calls `useSearchParams` must sit inside a `<Suspense>` boundary at a parent. Without it, the build fails (name the symptom: the page is forced into client-side rendering / a missing-suspense error at build). Explain the *why* so it's memorable rather than a rule to cargo-cult: search params are not known during the static prerender, so the component that reads them must be a Suspense boundary's child — the boundary renders a fallback for the prerendered HTML and the real value resolves on the client. Connect to the student's existing Suspense model from ch 031/032 (Suspense as the boundary around something not yet available). 

Use **AnnotatedCode** (blue, the chapter's worked-example color) on a minimal page: a parent that wraps `<Filters />` in `<Suspense fallback={…}>`, and the `'use client'` `Filters` component calling `useSearchParams`. Steps: (1) the parent boundary, (2) the fallback, (3) the client child reading `useSearchParams`. One step explicitly says "remove the boundary and the build fails with X" so the cause→effect is pinned. Keep ≤3 steps, one paragraph each.

Add the senior reframe that resolves the tension: the cleanest fix is often *not to read on the client at all* — pass the value as a prop from the server and skip the hook (and the boundary) entirely. This is the bridge into the chip-list section. State it as the punchline: "The boundary is the cost of reading the URL on the client. Often the right move is to not pay it — read on the server, pass the prop down."

Accuracy note for the author (verified against Next.js 16 docs): the official error page lists three resolutions — wrap in `<Suspense>`, force dynamic rendering with `connection()` (a ch 032 concept, named not taught), or pass `searchParams` from the Server Component as a prop / unwrap with `use()`. Teach the **server-prop** path as the senior default and `<Suspense>` as the when-you-genuinely-need-the-client-read fallback; mention `connection()` only as "there's a force-dynamic escape hatch you met in ch 032." Do not introduce `transitionTypes` (a niche View Transitions option on `push`/`replace`) — out of scope.

### usePathname — highlighting the active nav item

Purpose: `usePathname` has one dominant, universal use (active-link styling) that every SaaS sidebar needs; teach it through that job. Short section.

Teach: `usePathname()` returns the current path as a string, no query, no hash. The canonical reach: a navigation component that highlights the active item. Show a tight **Code** block of a `NavItem` deriving its active state: `const pathname = usePathname(); const isActive = pathname.startsWith('/invoices')`. Note `startsWith` vs `===` — section roots (`/invoices`) want a prefix match so child routes (`/invoices/42`) stay highlighted; exact pages want `===`. This is fast, side-effect-free, and does not need a Suspense boundary (unlike `useSearchParams`) — note that contrast in one line, it reinforces why the Suspense rule is specific to `useSearchParams`.

Optional small exercise here — see Exercises subsection below; a `ReactCoding` active-nav drill fits naturally but may be better placed as the single hands-on at the chip-list. Decide downstream; do not double up.

### useParams — dynamic segments on the client

Purpose: round out the toolbox and, more importantly, teach the senior judgment call (prop vs hook) since `useParams` is the hook most often reached for prematurely. Short section.

Teach: `useParams()` returns the route's dynamic segments as an object (same shape as the server `params`), resolved *synchronously* — the route has already matched on the client, so unlike the async server `params` (a Promise in Next 16, lesson 4) there is no `await` here. Name that contrast explicitly: server `params` is a Promise you `await`; client `useParams()` is synchronous. The reach: a Client Component deep in the tree that needs the org slug without threading it through many props.

Land the senior anchor as the real content of this section: **prefer threading the value as a prop when the tree is shallow; reach for `useParams` only when prop-drilling depth makes it painful.** Reuse lesson 1's "read high, pass down" reflex one more time. This mirrors the `useSearchParams`-vs-prop judgment — same principle, second instance — so the student generalizes it: hooks are for when the prop path is genuinely costly, not the default.

### Putting it together — the filter-chip list

Purpose: the synthesis section. Everything converges here: writing the URL with `replace` + `scroll: false`, building a query string that preserves other params, and the headline insight that the chip's active state comes from a *prop*, not `useSearchParams`. This completes lesson 4's invoice page, so the codebase continuity is explicit.

Walk the pattern as the worked example with **AnnotatedCode** (blue, matching lessons 2–4 worked-example color). The component: a `'use client'` `StatusFilter` that (a) receives the *current* status as a prop (passed from the Server Component page, which read it from `searchParams`), (b) renders a chip per status, (c) on click calls `router.replace` with the new query string and `{ scroll: false }`. Annotate steps in this order:

1. `'use client'` + props: `{ current }: { current: string }` — the active value arrives as a prop, not a hook. (This is the headline; color or call it out.)
2. `const router = useRouter()` — the one hook this component needs.
3. The click handler building the new URL and calling `router.replace(href, { scroll: false })`.
4. The active-state derivation: `aria-pressed={status === current}` / active className — *derived from the prop*. Explicitly contrast: "no `useSearchParams` here — the server already told us the active filter."

Keep each step one paragraph, ≤6 lines (AnnotatedCode constraint). Then, in prose under the block, restate the senior takeaway: the active state is server-derived, the only client responsibility is the write, the page re-renders on the server with the new param. This *is* the chapter's "server is a pure function of the URL" anchor made concrete on both sides.

#### Building the query string without losing other params

Purpose: a real correctness trap — setting one param by hand-writing `?status=paid` silently drops `sort`, `cursor`, etc. Teach the safe construction. Sub-concept of the chip list.

Teach the pattern with a small **Code** block: construct a fresh `URLSearchParams` from the current ones, `set` the one key, serialize:
```
const params = new URLSearchParams(searchParams.toString());
params.set('status', value);
router.replace(`?${params.toString()}`, { scroll: false });
```
Here `useSearchParams` *does* earn its place — the handler needs to read the existing query to preserve it (this is the "react to URL changes" case from earlier, now concrete). Name the production helper shape lesson 4 hinted at: a `withParam(searchParams, key, value)` returning the new query string, kept in `_lib/`. Note the watch-out: writing `?status=paid` directly wipes other state — always merge. One `Aside` (tip) or inline is enough; do not over-decorate.

Reconcile the apparent tension for the student so they don't feel whiplash: the chip component reads its *active state* from a prop (no hook needed), but the *handler* uses `useSearchParams` to merge the existing query when writing. Different jobs, different tools — state this in one sentence so the two earlier rules cohere.

This is the natural home for the lesson's single hands-on exercise. See Exercises.

### Where these hooks stop, and where nuqs begins

Purpose: bound the toolbox (counter the "hooks do everything" expectation) and pay the `nuqs` forward reference cleanly, framing it as the layer the bare hooks sit underneath. Closing section.

First, the boundary — what these hooks do *not* do, as a short list framed by the chapter's "four channels" model: they don't read cookies or headers (server-only, lesson 1), they don't call Server Actions (those are called directly — forward ref ch 043), they don't fetch arbitrary URLs (`fetch` is that tool). They are scoped to the router's job: read what's in the URL, navigate to a new URL, refresh the current one. This reinforces the chapter's mental model that the route's inputs are URL + headers + cookies and nothing else.

Then `nuqs` as the production layer, framed honestly as "when it earns its weight" (the trigger-before-tool filter): `nuqs`'s `useQueryState('status', parseAsStringEnum(...))` returns `[value, setValue]` where `setValue` writes the URL (wrapping `useSearchParams` + `router.replace`) and triggers re-render — a typed, single-hook version of everything this lesson built by hand. The threshold (reuse lesson 4's): past two or three URL-state surfaces, the bare-hook parse/serialize/merge code becomes a tax and `nuqs` pays for itself; for one filter, the bare hooks are fine. Name it as the canonical production pick and point to ch 060 for depth — do not teach the API. Keep the framing consistent with lesson 4's `nuqs/server` `createSearchParamsCache` (server read) so the student sees the two halves: `nuqs` reads on the server *and* writes on the client, the same division this whole lesson taught.

Close the lesson on the symmetry that frames the whole chapter pair: server reads the URL and renders; client changes the URL. The four hooks are the client's half. One or two sentences, then optional `ExternalResource` cards (see Scope/resources note).

### Exercises

Place **one** primary hands-on, in the chip-list section (or its query-string sub-section). Use **ReactCoding** in tests mode — it runs React 19 + Tailwind in-iframe, which fits a self-contained client component (no Next router needed if the exercise abstracts the navigation as a passed-in callback, see below).

Constraint to flag for the exercise author: `ReactCoding` has **no Next.js router** — `useRouter`/`usePathname` are not available in the iframe. Two viable framings:
- **Preferred (custom-stub):** give the student a stubbed `router` (or an `onNavigate(url)` callback) as a prop/module value that records calls; the student wires the chip's `onClick` to call it with the correct merged query string and `{ scroll: false }`, and derives `aria-pressed` from the `current` prop. Tests assert: clicking the "Paid" chip calls the stub with a query string containing `status=paid` *and* preserving a pre-existing `sort` param; the chip whose value equals `current` has `aria-pressed="true"`. This grades the two load-bearing ideas (merge-don't-clobber, active-from-prop) without needing the real router. Describe this stub explicitly so the author builds it.
- Active-nav drill (`usePathname` analog): student writes `isActive` using a passed-in `pathname` string and `startsWith`, styles the active item. Lighter; use only if the chip exercise is too heavy for one block.

If a quick comprehension check is wanted earlier, a **MultipleChoice** or **Buckets** on "which hook for this job" (read query / navigate / active link / dynamic segment) or "`push` or `replace`?" fits after the `useRouter` section — optional, keep at most one. Do not stack exercises; the lesson's value is the chip-list synthesis.

Author's call downstream: if the stubbed-router `ReactCoding` proves awkward, fall back to a `Dropdowns` fill-in-the-blank over the chip-list code (blanks: `replace` vs `push`, `scroll: false`, `params.set` vs direct string) — guided, no runtime needed, still drills the decisions.

### Tooltip terms (`Term`)

Strategic, lesson-supporting only:
- `ReadonlyURLSearchParams` — read-only subclass of the web `URLSearchParams`; same `get`/`getAll`/`has`, no `set`/`delete`.
- `soft navigation` — Next.js client-side route change that swaps Server Component output without a full document reload (contrast hard navigation / full reload).
- `history entry` — a stack frame the back/forward buttons walk; `push` adds one, `replace` overwrites the top.

Do not tooltip `useRouter`, `Suspense`, `'use client'`, `searchParams` — those are taught inline or are prerequisites.

## Scope

**Prerequisites (assume, redefine in one line at most):**
- `'use client'` and the smallest-interactive-leaf rule (module boundaries, prior chapters) — the lesson uses it, doesn't re-teach it.
- Suspense as a boundary around not-yet-available content (ch 031/032) — reused to explain the `useSearchParams` rule, not re-taught.
- Async server `searchParams`/`params` (Promises, `await`, validation, the read→validate→query→render page shape) — **lesson 4**, the immediate predecessor; reference its invoice page, don't rebuild it.
- `<Link>` and its automatic prefetch (ch 029) — referenced for the `push`/`prefetch` comparison.
- `URLSearchParams` web API (`get`/`set`/`toString`) — from earlier web-platform chapters; `ReadonlyURLSearchParams` is the new wrinkle.

**Explicitly out of scope (do not teach):**
- Server reads of `searchParams`/`params` — **lesson 4** owns these; this lesson only writes/reacts on the client.
- `cookies()`/`headers()` and any server-only request read — **lesson 1**; named only in the "what these hooks don't do" boundary list.
- The full Server Action wiring and calling actions from the client — **ch 043**; named once as "called directly, not via these hooks."
- Cache invalidation internals (`revalidateTag`, `revalidatePath`) — **ch 032 lesson 6**; `router.refresh` references the *interaction* (refresh ≠ revalidate, pair with `revalidateTag(tag, 'max')`) without teaching the invalidation surface.
- `<Link>` prefetching internals — **ch 029** covered the surface; only the `prefetch()` contrast is named.
- `nuqs` in depth (`useQueryState`, parsers, `createSearchParamsCache`) — **ch 060 project**; named as the production layer, API not taught. Keep framing consistent with lesson 4's `nuqs/server` mention.
- `redirect()`/`notFound()` from `next/navigation` (server-side navigation) — **ch 029**; these are not client hooks. Do not conflate with `useRouter`.
- Cursor pagination mechanics — **ch 038**; the chip list uses `status`/`sort`, cursor is at most a preserved param in the query-string merge example.
- Route-change focus management (move focus to new page's `<h1>`) — accessibility convention noted in code standards but belongs to a dedicated a11y lesson; out of scope here, do not expand.
