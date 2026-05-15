## Concept 1 — The request as four channels

**Why it's hard.** Students arriving from Unit 4 think of a route as "the function that renders the page." They don't have a mental model of where the *inputs* to that function come from. Without that frame, every later API in this chapter (`cookies()`, `headers()`, `params`, `searchParams`) feels like a separate library to memorize instead of one slot in a single, finite vocabulary.

**Ideal teaching artifact.** A Concept-archetype *anatomy diagram* of a single HTTP request landing on a route. The student sees one big incoming arrow split into exactly four labeled tributaries — URL path, search params, headers, cookies — each pointing at the Server Component box, with a fifth dotted arrow ("everything else") going to a red trash can. Each tributary is annotated with the API that reads it (`params`, `searchParams`, `headers()`, `cookies()`) and a one-line "what you'd read here" example (org slug, filter state, locale, session). The point of the artifact is to *close the set* — the student leaves convinced these four are the only channels, which is the spine of the chapter.

**Engagement.** A `Buckets` round: ten realistic "the route needs to know X" items (current user's org, sort order, A/B test bucket, draft scratchpad, current timestamp, IP address, mouse position, current tab, last-clicked button, preferred locale) sorted into the four channels plus a "not from the request — wrong question" bucket. The misclassifications are the lesson.

**Components.**
- A hand-SVG anatomy diagram inside `Figure` — four labeled tributaries feeding the route box, with the trash-can negative space. Single use, but the figure is the chapter's spine and will be referred back to in 5.5.2 (proxy enriches headers) and 5.5.4 (URL state).
- `Buckets` for the sort drill.

**Project link.** Chapter 5.7 (list-plus-detail with parallel routes) reads `searchParams` server-side; the four-channel frame is the model the student has when wiring slot pages.

---

## Concept 2 — Async request APIs and the read-once-at-the-top discipline

**Why it's hard.** Students see `await cookies()` and treat the `await` as ceremony. The misconception is twofold: that the read is free to repeat anywhere, and that the Promise shape is a quirk of `cookies()` rather than the uniform Next.js 16 shape (`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` all return Promises). They scatter reads through the component tree and reach for `useEffect` on the client because they don't see the read-on-server-pass-down pattern.

**Ideal teaching artifact.** A Pattern-archetype *side-by-side comparison* in `CodeVariants`: two implementations of the same `RootLayout`-plus-`Nav`-plus-`UserMenu` tree. The "scattered" tab reads `cookies()` and `headers()` in three different components, has duplicate `await`s, and threads nothing down. The "read-once" tab reads both at the top of the layout, derives `user` and `locale`, and passes them as props; deep components are plain. The student compares the two and sees the asymmetry immediately — fewer awaits, no duplication, the cached-derivation slot (`getCurrentUser` via React `cache()`) appearing exactly once. The `await` is reframed as the *explicit dynamic signal*, not ceremony.

**Engagement.** `Tokens` on the read-once block: click every line that reads a request channel. Correct picks are the two `await`s at the top of the layout; decoys include `props.user` accesses deeper in the tree (which are not request reads, they're prop reads — the distinction is the recall).

**Components.**
- `CodeVariants` for the scattered-vs-read-once comparison.
- `Tokens` for the recall.

---

## Concept 3 — Read-only on the server, writes need an Action context

**Why it's hard.** Cookies are read with `cookies()` and the natural assumption is "so I set them the same way." Calling `cookies().set(...)` from a Server Component throws at runtime, and the error message names the response-already-started reason without explaining the deeper invariant: a Server Component renders into a streaming response, so there is no header phase left to write into. Students don't get this from the message; they patch by guessing.

**Ideal teaching artifact.** A Mechanics beat that opens with a *wrong-by-default snippet* — a Server Component calling `cookies().set('locale', 'es')` to "save a preference." The block runs (conceptually) and shows the thrown error in an adjacent labeled output block. Prose names the invariant: the response body has started; cookies live in headers; headers are already gone. Then a two-column `Figure`: left column "Server Component (render phase) — reads only," right column "Server Action / route handler — reads and writes." Each column lists the legal operations and a one-line rationale. The fix points forward to Chapter 7.2 (Server Actions) for the write path.

**Engagement.** A `MultipleChoice` with four scenarios — "set the locale cookie after the user picks a flag," "read the session cookie to render the user menu," "delete the session cookie on sign-out," "read the A/B-test cookie to choose a variant" — and four destinations (Server Component, Server Action, route handler, Client Component). The student picks the right home for each.

**Components.**
- `CodeVariants` or a plain `Code` block with adjacent output for the wrong-by-default snippet.
- `Figure` wrapping a hand-SVG two-column read/write split.
- `MultipleChoice` for the recall.

---

## Concept 4 — Header trust boundaries

**Why it's hard.** `headers().get('x-forwarded-for')` returns a value. The value looks like an IP. The student writes a rate limiter against it. In production behind a misconfigured proxy — or in any environment where the request bypasses the trusted proxy — the header is attacker-controllable. The teaching challenge is making the student *feel* the trust boundary before they reach for the header in 15.2.

**Ideal teaching artifact.** A short Pattern-archetype *adversarial walkthrough* in `AnnotatedCode`. The block is a rate limiter keyed on `headers().get('x-forwarded-for')`. Step 1 highlights the read and reads naturally. Step 2 highlights the same line and overlays an attacker's `curl` with `-H 'X-Forwarded-For: 1.2.3.4'` in the adjacent prose — the rate limiter is now bypassed by spoofing the header. Step 3 highlights the fix: read the platform-documented header (`x-real-ip` on Vercel, the platform's signed forwarded header otherwise) *and* trust it only because the platform's network topology guarantees nothing upstream can set it. The senior anchor lands: never authenticate or rate-limit from a raw header without naming who sets it.

**Engagement.** A `TrueFalse` round of five statements — "any header in `headers()` is set by the client," "the `Authorization` header is safe to read on a public route," "behind Vercel, `x-forwarded-for` is the user's real IP," "the session cookie should be checked instead of the IP for authorization," "the `User-Agent` is reliable for telemetry." Tight, fast, the wrong picks make the trust boundary visible.

**Components.**
- `AnnotatedCode` for the three-step adversarial walkthrough.
- `TrueFalse` for the recall.

---

## Concept 5 — `proxy.ts` as a network proxy, not application middleware

**Why it's hard.** The rename from `middleware.ts` to `proxy.ts` in Next.js 16 isn't cosmetic. It signals where this code sits in the stack: in front of the route, on Node, as part of the platform's request pipeline. Students with Express background carry the wrong analogy — they treat the file as an in-process middleware chain and load it with business logic. The Node-only runtime in 16 also breaks the "edge function" mental image carried over from old tutorials.

**Ideal teaching artifact.** A Concept-archetype *request-lifecycle diagram* — a horizontal pipeline: CDN -> matcher decision -> `proxy.ts` (Node serverless, near the user) -> route -> response. Each segment is labeled with what runs there, and `proxy.ts` is annotated with the four legitimate jobs (auth gate, redirect/rewrite, request enrichment, A/B routing). A second smaller panel under it shows the rename as a one-line callout: `middleware.ts` -> `proxy.ts`, `export default function middleware` -> `export default function proxy`, Edge -> Node, with a sentence on *why* the rename clarifies intent.

**Engagement.** A `Buckets` round: sort eight tasks into "belongs in `proxy.ts`," "belongs in the route," "belongs in a Server Action," "doesn't belong anywhere on the server" — items include "redirect unauthenticated users to /login," "fetch the user's full profile from the database," "set `x-user-id` on the request from a decoded JWT," "validate that a submitted form's email is unique," "rewrite `acme.app.com` to `/orgs/acme`," "decrypt a payload," "track a button click," "redirect from old billing URL to new one."

**Components.**
- A hand-SVG pipeline figure inside `Figure`. Forward-links to 9.5.5 (proxy cookie gate) and 18.x (i18n routing); the same figure annotation pattern can be reused.
- `Buckets` for the placement drill.

---

## Concept 6 — The matcher as the cost-control surface

**Why it's hard.** "Just match everything" is the default. Students copy a default config and ship a proxy that runs on every static asset, every image, every API request. The cost is invisible in development and shows up as a Vercel bill or a tail-latency regression. The lesson has to make the per-request cost *visible* before the student writes the matcher.

**Ideal teaching artifact.** A *controllable simulation* — the **MatcherCostSimulator**. The student sees a list of typical incoming requests (`/`, `/favicon.ico`, `/_next/static/chunks/...`, `/api/health`, `/dashboard`, `/dashboard/invoices/42`, `/images/hero.png`, fifty more in a scrolling synthetic traffic log). On the left, a `matcher` config the student edits — starting at the default `/(.*)`. On the right, a real-time tally: "proxy invocations per 1000 requests" and a stacked bar showing what fraction of invocations were on routes vs. assets vs. API. The student tightens the matcher (`'/(dashboard|settings|orgs)/:path*'`, then `missing: [{ type: 'cookie', key: 'session' }]`) and watches the invocation count drop. The cost is no longer abstract.

**Engagement.** A `PredictOutput`-style follow-up: shown a target matcher and a target invocation count, the student writes the matcher that achieves it. The simulator is the artifact; the prediction round confirms recall.

**Components.**
- New component proposal: **MatcherCostSimulator**. Inputs: a fixture traffic log (array of request paths), an editable matcher config, a counter and stacked-bar display. Single use in this chapter but forward-links to 5.6.3 (config-time redirects/rewrites, same cost framing) and 9.5.5 (proxy auth gate matcher).
- Alternative if the simulator is out of scope for v1: a `TabbedContent` with three matcher tabs (`default`, `tightened-paths`, `tightened-with-missing`) and a hand-authored bar chart in each tab showing the invocation count for the same fixture traffic. Loses interactivity, keeps the cost frame.

---

## Concept 7 — Cheap proxy gate, authoritative route check (and the header-passing pattern)

**Why it's hard.** Two related misconceptions. First: students who *do* put an auth check in the proxy think the check is enough. They drop the route-level verification. The proxy becomes the only line of defense and a missed matcher rule becomes an authorization bypass. Second: students who understand defense in depth re-decode the session cookie in every route, paying the cost twice. The pattern that resolves both — proxy decodes once, attaches headers, route reads the headers — isn't obvious from the API surface.

**Ideal teaching artifact.** A Pattern-archetype *Lin-Clark-style cartoon* across three panels in `DiagramSequence`. Panel 1: a request labeled "JWT cookie" arrives at the proxy character. The proxy does a fast signature check, decodes the payload, and writes `x-user-id` and `x-org-id` onto the request as little Post-it notes via `NextResponse.next({ request: { headers } })`. Panel 2: the request, now with Post-its attached, arrives at the route. The route reads the Post-its via `headers()` — no second decode. Panel 3: the route *also* runs `requireUser()` (a Server-Component-side validating read) that checks the user record exists and is not banned — the authoritative check. The diagram makes the division explicit: cheap-but-not-trusted gate at the proxy, trusted-and-authoritative check in the route.

**Engagement.** A `Sequence` exercise: the student orders the request lifecycle steps for a `/dashboard` hit (incoming request, matcher decision, proxy signature check, proxy header write, route receives request, route reads `x-user-id`, route `requireUser` DB check, route renders). Out-of-order picks (e.g., `requireUser` before the matcher) make the dependencies visible.

**Components.**
- `DiagramSequence` with three hand-SVG panels for the proxy-to-route cartoon. The Post-it metaphor for headers is reusable in Chapter 9 (full auth wiring) and Chapter 10 (org context propagation).
- `Sequence` for the lifecycle ordering.

**Project link.** Chapter 9.5.5 ("Gate the protected surface") writes exactly this pattern — proxy cookie-presence gate plus layout-level `requireUser`. The concept is the model the student carries into that project.

---

## Concept 8 — Redirect vs. rewrite, with the right status code

**Why it's hard.** Students collapse "redirect" and "rewrite" into "go to a different page." The semantic difference — address bar changes vs. address bar unchanged, browser issues a new request vs. server quietly serves a different route — is invisible until they ship a multi-tenant subdomain rewrite as a 308 redirect and the URL flips to the internal path in production. The status code (307 vs. 308 vs. legacy 301/302) is a second axis they also flatten.

**Ideal teaching artifact.** A *side-by-side time-travel widget* — the **RedirectVsRewriteScrub**. Two browsers side by side, each with an address bar and a viewport. Both start at `/billing/manage`. The student presses Play. The left browser is wired to a redirect — its address bar visibly changes to `/settings/billing`, history grows by one, the network panel below shows two requests (308 + the new GET). The right browser is wired to a rewrite — its address bar stays `/billing/manage`, history grows by zero, the network panel shows one request and notes "server served `/settings/billing` internally." A small status-code toggle (`307`/`308`) on the redirect side updates the network panel; a sub-caption explains the method-preservation difference (307 preserves POST, 302 doesn't).

**Engagement.** A `MultipleChoice` round: four product requirements (legacy email link to deprecated billing URL, multi-tenant subdomain to internal route group, language switcher persisting preference, post-login return to original page). Each correct answer is one of {redirect 308, rewrite, redirect 307, redirect 307 with cookie}.

**Components.**
- New component proposal: **RedirectVsRewriteScrub**. Inputs: a starting URL, a target URL, a mode toggle (`redirect`/`rewrite`), a status code (`307`/`308`). Renders two synthetic browser frames with address bars, viewports, and a network log. Forward-links: this same widget shape underlies 5.6.3 (config-time redirects) and 5.1.4 (the `redirect()` / `permanentRedirect()` / `notFound()` trio could reuse the browser-pair frame).
- Alternative if the widget is too heavy for v1: a hand-SVG `Figure` showing two stacked address bars (before/after) for each mode, with arrows annotating the network round-trips and the history entries. Demote to alternative.
- `MultipleChoice` for the recall.

---

## Concept 9 — The redirect-location decision tree

**Why it's hard.** Next.js 16 offers four places to write a redirect: `proxy.ts`, `next.config.ts` redirects, `redirect()` from `next/navigation` inside a route or Server Action, and `notFound()` / `permanentRedirect()` for resource-shaped cases. Students reach for whichever one they saw last. The decision is driven by *when the rule is known* (build-time static vs. request-conditional vs. post-action) and *what gets paid* (CDN-edge vs. proxy roundtrip vs. action body).

**Ideal teaching artifact.** A Decision-archetype *decision tree* rendered in Mermaid. Root question: "is the rule the same for every request?" -> yes -> "is it static at build time?" -> yes -> `next.config.ts redirects()`. No (it depends on cookies/headers/geo) -> `proxy.ts`. No (it's per-action) -> "is it after a Server Action?" -> yes -> `redirect()` from `next/navigation`. No (it's per-route, the route exists but the resource is gone) -> `notFound()` or `permanentRedirect()`. Each leaf has a one-line cost annotation (CDN edge vs. proxy invocation vs. action-body throw). The tree is the recall artifact; the student references it directly.

**Engagement.** `Matching` between six redirect scenarios and the four tools — scenarios include "marketing /docs URL changed," "logged-in user hits /login," "404 for a deleted invoice," "redirect to dashboard after Server Action sign-in," "subdomain to internal route group," "A/B test bucket redirect."

**Components.**
- A Mermaid flowchart inside `Figure`.
- `Matching` for the recall.

---

## Concept 10 — Two redirect traps: the loop and the open redirect

**Why it's hard.** Both bugs ship to production because they're invisible in a "happy path" test. The redirect loop only fires when the rewrite target itself matches the proxy matcher — easy to miss until the framework's recursion guard fires in production. The open-redirect bug only fires when an attacker sets `?next=https://attacker.com` — the developer testing locally always hits same-origin paths. Both are pattern-shaped: the bug is hard to write if the structure is right.

**Ideal teaching artifact.** Two short *wrong-by-default sandboxes* paired in a single Pattern-archetype beat. First sandbox (`HtmlCssCoding` or `ReactCoding` running a simulated proxy): the student is shown a `proxy.ts` that rewrites `/dashboard` to `/orgs/[subdomain]/dashboard`, and the matcher includes `/dashboard/:path*`. The widget simulates one request and the output is a recursion error. The student edits either the matcher or adds the `x-internal-rewrite` guard header until the simulator shows "passed once." Second sandbox: the student is shown a login redirect that uses `?next=` verbatim. The simulator injects `?next=https://evil.com` and shows the user being redirected off-origin. The student writes a `safeNext(input)` validator until the simulator shows the malicious input being rejected and replaced with `/`.

**Engagement.** The sandbox itself is the engagement (a guided puzzle). A short follow-up `MultipleChoice` confirms recall: "which of these `next` values does `safeNext` accept?" — choices include `/dashboard`, `//evil.com/dashboard` (protocol-relative), `https://app.com/dashboard` (same origin but absolute), `javascript:alert(1)`, with the correct picks being only the relative same-origin path.

**Components.**
- New component proposal: **ProxySimulator** — a `proxy.ts` editor with a fixture-request runner and a network log output. Could reuse the rendering frame from the **RedirectVsRewriteScrub** above; if the two are built as one component family, the cost compounds. Forward-links: 9.5.5 (proxy auth gate), 18.x (i18n routing in proxy).
- Alternative if the simulator is too heavy: a `CodeVariants` pair (broken / fixed) for each trap, with prose walking the attack and the fix. Demote to alternative.
- `MultipleChoice` for the `safeNext` recall.

---

## Concept 11 — URL state vs. component state; `params` vs. `searchParams`

**Why it's hard.** Students who survived Unit 4 reach for `useState` for filters, sorts, tabs, and pagination — it's what they did in plain React. They lose share-ability, refresh persistence, and back-button behavior without noticing. The split between `params` (identity — which org, which invoice) and `searchParams` (view state — which filter, which sort, which page) is the second axis and is also collapsed: students stuff identity into the query string or shove filter state into the path.

**Ideal teaching artifact.** A Decision-archetype *misconception-first ambush*. Open with a screen-recording-style `Figure` (hand-SVG strip): a user types `?status=paid&sort=-date` in the URL, hits enter, gets a filtered list, hits Cmd+L Cmd+C, pastes into Slack, a coworker clicks the link, sees the same list. Same strip for the broken version with `useState`: filter chips set, URL stays `/invoices`, share link gives the coworker an unfiltered list. The contrast is the lesson. Then a small *decision table* (three columns: example state, "URL or component?", reasoning) with eight rows mixing filter status, dropdown open/closed, current page cursor, hovered row, selected tab, current org slug, in-progress draft text, sort key. The "refresh test" is named explicitly: would the user expect this to come back after refresh?

**Engagement.** `Buckets` into three columns — "route param (identity)," "search param (view state)," "component state (transient)." Items: org slug, invoice id, filter status, sort key, pagination cursor, current tab in the route, open/closed dropdown, hover state, in-progress search input pre-commit, focus position. The pre-commit input vs. committed filter distinction (covered in Chapter 11.1.3) is foreshadowed.

**Components.**
- A hand-SVG `Figure` (or two side-by-side figures) for the share-link contrast.
- A small comparison table in prose for the eight rows.
- `Buckets` for the sort.

**Project link.** Chapter 11.1's URL-state list view project is built entirely on this concept; the four-pillar SaaS list pattern (filter, sort, search, paginate) is the same decision instantiated four times.

---

## Concept 12 — Validate `searchParams` at the boundary

**Why it's hard.** `searchParams` look like an object. Students treat them like one and pass values straight to the database — `status: searchParams.status` becomes a SQL parameter or a TS type the rest of the function trusts. But `searchParams` are user-controlled, the value can be anything (`null`, `string`, `string[]`, `undefined`), and the route crashes or, worse, runs an arbitrary query when an attacker probes. The pattern — one `parseSearchParams` helper per route, called once at the top — only takes hold if students see the shape and the failure modes side by side.

**Ideal teaching artifact.** A Mechanics beat in `ZodCoding`. The fixture passes `?status=draft&tag=billing&tag=urgent&sort=-date&page=abc&malicious=<script>` into a `parseSearchParams(input)` function the student fills in. The schema goals: `status` is an enum with three values, `tag` is `string | string[]` normalized to `string[]`, `sort` defaults to `-date`, `page` is rejected when non-numeric, unknown keys are ignored. The grader runs three scenarios — happy path, hostile input, edge case (`tag` as a single string vs. an array) — and shows pass/fail per case. The student sees both the shape and the safety net at the same time.

**Engagement.** The `ZodCoding` exercise carries the assessment; a `Tokens` follow-up on a finished `parseSearchParams` block confirms the student can spot the boundary — click the line where the validation lives (the `.parse` call), not the database call or the default-merge.

**Components.**
- `ZodCoding` for the parse-helper exercise.
- `Tokens` for the boundary recall.

---

## Concept 13 — Read-on-server, write-on-client (and which `router` method)

**Why it's hard.** Two related misconceptions. First: students who hear "Client Components for interaction" assume *all* URL state should be read on the client via `useSearchParams`. They miss the server-side `props.searchParams` channel that's both cheaper and cache-friendlier. Second: of the three writes (`push`, `replace`, `refresh`), students reach for `push` for everything — and a list view with thirty filter clicks pollutes browser history into a back-button maze.

**Ideal teaching artifact.** Two beats. The first is a small Pattern-archetype *roundtrip diagram* in `ArrowDiagram`: a Server Component box reads `props.searchParams` and queries the database, renders the list, ships HTML to the browser. A Client `FilterChips` child receives the current filter as a prop, fires `router.replace('?status=paid')` on click, which loops back to the same Server Component box with new params. The arrow from the chip *replaces* the URL (not push), the server re-renders, the cycle completes. The point is to make the cycle visible: writes go to the URL, the URL drives the server read, props flow back down — no client state involved.

The second beat is a Decision-archetype *push-vs-replace-vs-refresh* triage table (three rows, three columns: "what changes," "history entry yes/no," "when to reach for it"). `push` for navigation between distinct views, `replace` for in-place filter/sort/pagination updates, `refresh` for revalidating the current route's server data without changing the URL.

**Engagement.** A `ReactCoding` exercise — a filter-chip Client Component the student writes. Starting code calls `router.push` and doesn't preserve other query params; tests check (a) history grows by one per click in the wrong version, (b) other params are preserved, (c) the active state derives from the prop, not from `useSearchParams`. The student switches to `replace` and uses `new URLSearchParams(...)` to preserve siblings. Tests pass when the implementation matches.

**Components.**
- `ArrowDiagram` inside `Figure` for the read-server / write-client cycle.
- A small prose table for the push/replace/refresh triage.
- `ReactCoding` for the chip-list exercise.

**Project link.** Chapter 11.1 builds the production version of this chip-list with `nuqs`, throttling, and active-filter chips with "clear all"; this lesson lays the bare-hooks foundation.

---

## Concept 14 — The four `next/navigation` hooks and the `useSearchParams` Suspense trap

**Why it's hard.** The four hooks (`useRouter`, `usePathname`, `useSearchParams`, `useParams`) look uniform and students assume they behave uniformly. They don't: `useSearchParams` requires a `<Suspense>` boundary above it or the build fails with a specific error. The error message is helpful but the *reason* — search params are not resolved until hydration and the boundary handles the rendering gap — only sticks if the student sees the failing build alongside the wrapping fix.

**Ideal teaching artifact.** A Reference-archetype *four-hook card grid* in `CardGrid` — one `Card` per hook with the signature, one-line "reach for it when," and a small example. Right below the grid, a Pattern-archetype *wrong-then-right* pair in `CodeVariants`: tab one is a Client Component that calls `useSearchParams` without a Suspense boundary, with the actual Next.js 16 build error text shown in the adjacent output block. Tab two adds the `<Suspense fallback={...}>` wrapper at the parent layout. The error and the fix sit next to each other so the student associates the message with the cause.

**Engagement.** A `Tokens` round on a component tree snippet: click the line where `<Suspense>` must be added to make the build pass. Decoys include adding it inside the Client Component itself (too low), at the root layout (works but coarser than needed), and as a sibling of the consuming component (wrong tree position).

**Components.**
- `CardGrid` with four `Card`s for the hook reference.
- `CodeVariants` for the missing-Suspense wrong-then-right.
- `Tokens` for the placement recall.

---

## Component proposals

- **MatcherCostSimulator** — editable `proxy.ts` matcher config beside a synthetic traffic log, with a live invocation counter and a stacked bar showing route vs. asset vs. API hits.
  - Uses in this chapter: Concept 6.
  - Forward-links: 5.6.3 (config-time redirects/rewrites — same cost framing), 9.5.5 (proxy auth gate matcher).
  - Leanest v1: a single fixture traffic log baked in (no editor on the log), a matcher textarea with three preset buttons (`default`, `paths-only`, `paths-plus-missing`), one counter, one bar. No traffic editing, no animation. The cost frame still lands.

- **RedirectVsRewriteScrub** — two side-by-side synthetic browser frames (address bar, viewport, network log) wired to a redirect-vs-rewrite toggle and a status-code selector.
  - Uses in this chapter: Concept 8.
  - Forward-links: 5.6.3 (config-time redirects/rewrites), 5.1.4 (the `redirect()`/`permanentRedirect()`/`notFound()` trio could reuse the browser-pair frame).
  - Leanest v1: a single "play" button that runs both modes in sequence (no scrub slider), one fixed start URL and target URL, the status-code toggle reduced to a `307` / `308` pair. Static-ish — the visible address bar flip and the one-vs-two requests in the network log are the whole pedagogical payload.

- **ProxySimulator** — a `proxy.ts` editor plus a fixture-request runner that shows the resulting response (pass-through, redirect, rewrite, error) and the network log.
  - Uses in this chapter: Concept 10 (paired wrong-by-default sandboxes — redirect loop, open redirect).
  - Forward-links: 9.5.5 (proxy auth gate), Chapter 18 i18n routing, Chapter 15.2 rate limiting at the proxy.
  - Leanest v1: a code editor pre-populated with the broken proxy and a single "Run fixture request" button that displays either "looped — framework guard fired" or "redirected off-origin to evil.com" or "passed." No multi-request playback, no editing the fixtures. The student edits the proxy until the output flips to "passed."

## Build priority

The **ProxySimulator** carries the most teaching load — it's the artifact for Concept 10 (two distinct security/operational traps in one component) and forward-links into 9.5.5, 15.2, and 18.x where the proxy keeps reappearing. If only one bespoke component is built for this chapter, build that one.

The **RedirectVsRewriteScrub** is second. Concept 8 is the single hardest semantic distinction in the chapter and the side-by-side browser-pair makes the address-bar invariant visible in a way no static figure does. Forward-links to 5.6.3 and 5.1.4 compound the cost.

The **MatcherCostSimulator** is third — the cost frame matters, but the leanest v1 (three preset matchers, one bar) is close enough to a static `TabbedContent` that the alternative path is acceptable if engineering bandwidth is tight.

## Open pedagogical questions

- Concept 10's paired sandboxes assume a working **ProxySimulator**. If that component slips, the alternative is two `CodeVariants` blocks plus prose — the security pattern still lands but the "I had to fix it" muscle memory doesn't. Worth a decision before lesson drafting starts.
- The Post-it metaphor for proxy-to-route header propagation (Concept 7) reuses well in Chapter 9 and 10 if the visual language is consistent. Decide once whether the cartoon style becomes a recurring chapter motif or stays a one-off.
