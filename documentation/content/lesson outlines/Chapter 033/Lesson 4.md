# Lesson 4 — URL state with searchParams and route params

- **Title (h1):** URL state with searchParams and route params
- **Sidebar label:** URL state

---

## Lesson framing

This is the **conceptual center of the chapter** and the read-side of the URL channel.
The chapter-wide mental model — *a route's only inputs are the URL, the headers, and the cookies* — was installed in lesson 1, which owned headers + cookies.
This lesson owns the URL: `params` (identity) and `searchParams` (view state).
It is deliberately a **read-on-server** lesson; *writing* the URL from a Client Component is lesson 5. Keep the writing surface (the navigation hooks) out of scope here except as a named forward reference.

The durable takeaway is not syntax — it's a **decision reflex**: *would the user expect this state to come back if they refreshed or shared the link?* If yes, it lives in the URL. That reflex is what a senior brings; the `await props.searchParams` syntax is commodity. Lead with the decision, let the syntax fall out of it.

The pain this relieves, framed against what the student already knows (ch 025 "you probably don't need an effect"): the beginner reflex for a filtered list is `useState` for the filter + `useEffect` to refetch when it changes — a client state machine plus a fetch waterfall, and the result isn't shareable or refresh-stable. The URL-state model deletes all of it: the server reads the URL, queries, renders; the filter *is* the URL. Frame this contrast early — it's the "why this approach" the lesson answers.

Cognitive-load staging: start simple (the decision rule, then the two vehicles), add the async shape, then the one non-negotiable (validate at the boundary), then the two shapes that surprise people (`string | string[]`, opaque cursors), then the systems-level interactions (caching/PPR), and only at the end the production layer (`nuqs`). Each layer is a small addition on a model the student already holds.

Mental model the student should leave with: **the URL is server-readable, shareable, refresh-stable state. The server reads `params` + `searchParams` on every render, validates them at the boundary, queries with the parsed values, and renders — no client state, no `useEffect`, no waterfall.** The URL is the source of truth a Server Component re-reads each render.

Production stakes to keep visible throughout: `searchParams` are **user-controlled input** (anyone types anything in the address bar), so an unvalidated read is a query crash or worse; the URL leaks to logs / referrer headers / history, so it's never a place for secrets; and the URL grows fast, so parameter hygiene matters. These aren't watch-outs bolted on at the end — they're the senior framing for *why validate, why not secrets, why short keys*, taught inline where each concept lands.

This lesson sets the canonical shape the **Chapter 060 URL-state list project** builds on, so the worked example (a tenant-scoped, filtered invoice list) is the production shape, not a toy. Use the org-scoped invoice domain consistent with the rest of Unit 5/6 examples.

Anchor everything in the App Router and Next.js 16: `params`/`searchParams` are **Promises** (the await is the explicit dynamic signal under Cache Components), validated with **Zod 4**, with **`nuqs`** named as the production URL-state layer (matches the code conventions: "URL state lives in the URL via `nuqs`, not `useState`").

`AnnotatedCode` color continuity: lessons 2–3 used **blue** for the canonical worked example. Keep the worked invoice-list page **blue** here so the chapter's worked examples read as one thread.

---

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete, reusing the chapter's running domain: a dashboard invoice list filtered by status, sorted by date, paginated by cursor. The user shares the URL with a coworker — the coworker sees the same view. The user refreshes — the view persists. The user hits back — the previous filter returns. Ask the load-bearing question: *where does that state live, and how do you read it on the server?*

Immediately contrast the beginner reflex (client `useState` + `useEffect` to refetch) against the answer, calling back to ch 025's "you probably don't need an effect." Name the answer in one sentence: this state belongs in the URL, and a Server Component reads it directly. Preview the practical skill: by the end, the student can read and validate `params` and `searchParams` on the server and render a filtered list with no client state. Keep it warm and short. State explicitly that *writing* the URL is the next lesson — this one is the read side.

Connect to lesson 1's anchor in one line: lesson 1 owned headers + cookies; this lesson owns the third and last input channel, the URL.

### What belongs in the URL

Teach the decision rule first — it's the most important thing in the lesson and everything else serves it.

The rule: **state that should survive a refresh, be shareable, or appear in browser history belongs in the URL; transient state (open/closed dropdowns, hover, focus, in-progress input before submit) belongs in component state.** Give the one-question heuristic the student will actually carry: *would the user expect this state to come back if they refreshed?* Yes → URL. No → `useState`.

Connect to prior knowledge: ch 024 taught `useState` for local UI state; the code convention is explicit ("URL state lives in the URL via `nuqs`, not `useState`"). This is the boundary between those two homes. Name the canonical URL-state quartet for any SaaS view: **filter, sort, pagination, tab/active-view**.

**Exercise — `Buckets`** (classification): "Sort each piece of state into where it belongs." Two buckets: *URL state* / *Component state*. Items (mix obvious + edge): the active status filter, the current sort column, the page cursor, the selected tab, whether a row's actions dropdown is open, the unsubmitted text in a search box, hover state on a chip, the dialog-open flag for a confirm modal, the search *query that has been submitted*. The edge cases (submitted vs unsubmitted search text; tab vs dropdown) are where the rule earns its keep — call them out in the instructions. This is the canonical fit and there's component precedent for exactly this drill.

Keep this section short — no code yet, just the rule and the drill. Code starts once the student knows *what* goes in the URL.

### Two vehicles: params for identity, searchParams for view state

Pin the split. Route **`params`** carry *identity* — which org, which invoice, the nouns in the path. **`searchParams`** carry *view state* — filter, sort, page, the adjectives on the query. A single URL has both.

**Diagram — URL anatomy** (HTML + CSS annotated illustration, wrapped in `<Figure>`). Dissect a real URL on one line:
`/orgs/acme/invoices?status=paid&sort=-date&cursor=eyJpZCI6NDJ9`
Color-code and label the two zones: the **path** segments map to `params` (`{ org: 'acme' }`), the **query string** maps to `searchParams` (`{ status: 'paid', sort: '-date', cursor: '…' }`). Callouts: `[org]` is a dynamic segment (back-ref ch 029.3) → `params.org`; the `?` begins the query; `&` separates pairs. Pedagogical goal: make the params/searchParams split *visual and memorable* before any syntax — the student should be able to glance at any URL and sort its pieces. HTML+CSS is the right engine per the diagrams index (annotated illustration of a geometric artifact, the URL line, with callouts). Caption restates: path = who, query = how you're viewing them.

Show the page-component signature that receives both as a plain `Code` block (App Router convention, back-ref ch 029): a `page.tsx` for `app/orgs/[org]/invoices/page.tsx` whose props are `{ params, searchParams }`. Note the file-system source of the `[org]` param. Keep this a recognition-depth block — the deep dive is the next section.

`Term` candidates here: **dynamic segment** (back-ref, brief).

### Reading them on the server: both are Promises

Teach the async shape, the heart of the read-on-server pattern.

In Next.js 16, a page/layout receives `params` and `searchParams` as **Promises** — you `await` them. Code convention is explicit: `await params`, `await searchParams`. The await is not ceremony — under Cache Components it's the **explicit dynamic signal** (forward to the caching section; just name it here). Show the Server Component shape:
```
const { org } = await params;
const { status, sort } = await searchParams;
```
Briefly redefine, do not re-teach, the async-request-API model from ch 032.7: these APIs are Promises because the route is dynamic by default and resolving them is the request-time work. One sentence, with a back-ref.

Name — do not teach — the client counterpart: a Client Component that receives a `searchParams` Promise unwraps it with `React.use()` (back-ref ch 030.4 / ch 032.7). Flag that reading on the client is rare and is lesson 5's subject; the senior default is to read on the server and pass resolved values down — the *exact same reflex* lesson 1 installed for cookies/headers ("read high, pass resolved values down"). This callback is important continuity glue.

Use a small `Code` block, not AnnotatedCode — the shape is two lines and the lesson hasn't earned a complex block yet.

`Term` candidate: none new; reuse the dynamic-by-default phrasing from ch 032.

### Validate at the boundary with Zod

The one non-negotiable. Frame it as a security/robustness decision, not a tip.

`searchParams` are **user-controlled input** — anyone can type `?status=lol` or `?sort=💀` or omit everything. A raw read passed into a database query is at best a crash, at worst a query-shape bug. The senior rule: **parse every `searchParams` read with a Zod schema at the top of the page, once.** Invalid or missing values fall back to sensible defaults; the schema *is* the documented contract for what the URL accepts.

Show the canonical `parseSearchParams` helper (one per route, called once). Use `Code` or `CodeTooltips`:
- `status: z.enum(['draft', 'paid', 'overdue']).optional()`
- `sort: z.enum(['-date', 'date', '-total', 'total']).default('-date')`
- `cursor: z.string().optional()`
Then `schema.safeParse(raw)` and, on failure, fall to defaults (don't crash the page on a malformed URL — a bad link should render the default view, not a 500). Briefly redefine `safeParse` (returns `{ success, data } | { success, error }`; doesn't throw) with a one-line back-ref to ch 042 for Zod depth — do not re-teach Zod. Code convention alignment: `safeParse` everywhere user input arrives; top-level format/enum builders; one schema per intent.

Note the deliberate divergence for downstream agents: the project shape uses a richer schema and `createSelectSchema`-derived enums (ch 042); the teaching schema here is a hand-written `z.enum` for clarity. Flag this so a later agent doesn't "correct" it into drizzle-zod.

**Exercise — `ZodCoding`** (the live-coding centerpiece). The student writes the `searchParams` schema; fixtures are raw searchParams-shaped objects with `expect: pass | fail`. This is the perfect graded surface for "validate at the boundary" — runtime contract and inferred type from one declaration, which is exactly `ZodCoding`'s pitch.
- `schemaName`: `InvoiceQuerySchema`.
- Starter: an object schema with `status` as a bare `z.string()` (too loose) and a missing `sort` default; a `^?` query on `z.infer` so the student watches the type tighten.
- Task: constrain `status` to the enum + optional, give `sort` an enum + `.default('-date')`.
- Fixtures: `{ status: 'paid' }` → pass; `{}` → pass (defaults fill `sort`); `{ status: 'lol' }` → fail (`errorContains: 'Invalid'`); `{ sort: '-date', status: 'draft' }` → pass; `{ sort: 'sideways' }` → fail. The empty-object-passes fixture is the one that teaches *defaults make the URL omittable* — call it out in instructions.
Goal/grading: fixtures flip green as the schema tightens; the inferred-type `^?` shows `status?: 'draft' | 'paid' | 'overdue'` appear. Keep it ~6 fixtures max.

(Optional, lower priority) a `ZodPlaygroundCallout` with the same schema prefilled for free exploration — only if the section needs a non-graded play surface in addition to the exercise. Likely redundant with `ZodCoding`; leave to the writer's judgment.

`Term` candidate: **safeParse** is better redefined inline in prose than as a tooltip; skip.

### The Server Component pattern: read, validate, query, render

This is the payoff section — the shape that replaces the client state machine. Make the contrast explicit and visible.

**`CodeVariants`** — before/after on the two mental models (use `del`/`ins` framing, per-pane mark color):
- **Variant "Client state machine" (the anti-pattern):** a `'use client'` list with `useState` for the filter and a `useEffect` that refetches on change. First sentence names the cost: *not shareable, not refresh-stable, a fetch waterfall, and a `useEffect` doing data-fetching (ch 025 said don't).* Keep it short — it's the foil.
- **Variant "URL state on the server" (the senior shape):** the page reads + validates `searchParams`, calls the query with parsed filters, renders the table. No client state, no effect, no waterfall. First sentence: *the URL is the state; the server re-renders on every URL change.*

Then the **worked example** as `AnnotatedCode` (color **blue**, continuity with lessons 2–3). The full `app/orgs/[org]/invoices/page.tsx`:
1. async page signature, `params`/`searchParams` as Promises — highlight the signature.
2. `await params` → `org`; the identity read.
3. `await searchParams` → raw query; `parseSearchParams(raw)` → typed `{ status, sort, cursor }`. Highlight the validate-at-the-boundary line.
4. the data read: `db.invoices.findForOrg(orgId, { status, sort, cursor })` (a named black-box query — do not teach the Drizzle internals; that's ch 038). Highlight the parsed values flowing in as arguments.
5. render the table from the result. Highlight that there is no client state anywhere.
Keep each step ≤6 lines of prose (component constraint). The narrative across steps: *URL in → typed filters → query → table out, all on the server, every render.*

Close the section with the loop that makes it feel alive, but defer the *mechanism*:

**Diagram — the server re-render loop** (Mermaid `sequenceDiagram`, in `<Figure>`). Actors: User, URL/Browser, Server (page.tsx), DB. Steps: user clicks a filter chip → URL updates to `?status=paid` → server re-reads & validates `searchParams` → queries DB with parsed filter → renders new table → browser shows it; back button → previous URL → same loop. **Explicitly mark the "URL updates" step as "Client Component — lesson 5"** so the boundary is honest. Pedagogical goal: show that the *only* state is the URL and the server is a pure function of it; the client's sole job is to change the URL. Mermaid sequence is the right engine per the diagrams index (actors over time). Caption: the server is a pure function of the URL; the client just changes the URL (next lesson).

### Two shapes that surprise you: repeated keys and opaque cursors

Two URL realities that break naive code. Teach both briefly — they're "know it exists" depth, not deep dives.

**Repeated keys → arrays.** `?tag=billing&tag=urgent` produces `searchParams.tag === ['billing', 'urgent']`. The shape of any `searchParams` value is **`string | string[] | undefined`** — code that assumes `string` breaks the moment a key repeats. Pin it at the parser: `z.union([z.string(), z.array(z.string())])` normalized to an array once, in the helper, so the rest of the page sees one shape. Use `CodeTooltips` on the `string | string[] | undefined` type so the student sees the union inline. This is a common real-world surprise — frame it as "the bug you'll hit when you add a multi-select filter."

**Opaque base64 cursors.** Name the shape only; depth is ch 038.6. A pagination cursor encodes the last row's sort key + tiebreaker as **opaque** base64 JSON: the URL shows `cursor=eyJpZCI6NDJ9` — meaningless to the user, deterministic for the server. Decoding lives in the route's parse helper; the query consumes the decoded shape. Two senior reasons it's opaque, stated briefly: it's not user-editable state (so don't invite users to fiddle), and it lets the encoded shape evolve. Forward-ref ch 038.6 for the cursor model and ch 060.4 for cursor-in-URL list pagination. Do **not** teach the n+1-row hasNext trick or the tiebreaker mechanics here.

`Term` candidates: **opaque** (data the user isn't meant to read or edit, only round-trip), **tiebreaker** (the second sort key that makes ordering deterministic when the primary key ties) — both brief, both support the cursor framing without a detour.

### Does reading searchParams change caching?

Connect to the ch 032 Cache Components model — a systems-level interaction the student must understand to avoid a build error.

The short answer, stated first to lower load: under Cache Components every route is **dynamic by default**, and reading `searchParams` is one of the explicit **dynamic signals** — but the route was dynamic anyway, so the read costs nothing relative to "no read." Briefly restate the dynamic-by-default model (one sentence, back-ref ch 032.1) — don't re-teach it.

The interaction that bites: **awaiting `searchParams` inside a `use cache` function is a build error.** A cached function must not depend on request-specific input. The senior reach — and the reason PPR exists — is to **keep cached chrome outside the dynamic part of the tree**: the sidebar, header, and org nav stream from the static cache; the table that reads `searchParams` runs at request time. Back-ref the ch 032 fix pattern (lesson 1 continuity: "lift cached chrome out of the dynamic subtree; pass request values as arguments").

**Diagram — the static-chrome / dynamic-table split** (HTML + CSS nested-box illustration in `<Figure>`). A page frame: a static outer shell (sidebar + header, tinted "cached / streams instantly") wrapping a dynamic inner panel (the invoice table, tinted "dynamic / reads searchParams / request-time"). One arrow or label: `searchParams` flows only into the inner panel. Pedagogical goal: make "lift cached chrome outside the dynamic read" a *spatial* intuition the student can see, reinforcing PPR from ch 032 without re-teaching it. HTML+CSS per diagrams index (layout concept with color-coded segments). Caption: cache the shell, read the URL only where the data is dynamic.

`Term` candidate: **PPR** / **Partial Prerendering** (the static shell + dynamic holes model from ch 032) — brief tooltip, since the acronym recurs.

(Optional micro-check) a small `MultipleChoice`: "Where does the `await searchParams` read belong?" with the cached-chrome-vs-dynamic-table answer. Only if the section feels like it needs a comprehension gate; the diagram may carry it. Writer's call.

### What the URL is not

Short, sharp boundaries — the "what would a senior never put here" filter. Frame as decisions, not a warnings list.

- **Not a place for secrets.** Anything in the URL leaks to server logs, the `Referer` header on outbound links, browser history, and analytics. Tokens, internal IDs you don't want enumerated, anything sensitive — never. Back-ref ch 013 (cookies/trust) and lesson 1's "headers/URL are telemetry, the session is identity."
- **Not a place for large blobs.** Keep total URL state well under ~1 KB (note browsers and CDNs cap URL length). JSON-stringifying a fat object into a param is brittle and bloats every request and log line — use flat params or invest in `nuqs`.
- **Not a place for transient UI state** the user would never want bookmarked — call back to the decision rule from the first section to close the loop.

Keep it tight; this is the senior judgment layer, not new mechanics.

### nuqs: the type-safe URL-state layer

The production layer — taught as a *trigger before tool* decision (per pedagogical guidelines), named here, used in depth in ch 060.

Name the threshold first: when a project has **more than two or three URL-state surfaces** and the hand-written parse/serialize code becomes a tax, **`nuqs`** pays for itself. For a single filter or one-off page, plain `searchParams` + Zod (everything taught above) is the right amount of tool — don't reach for the library prematurely. This honors the "defaults before conditionals, name the threshold the default crosses" filter.

What `nuqs` gives you: typed parsers, default values, and (client side) a `useQueryState` hook that reads *and* writes the URL — but the writing half is lesson 5 / ch 060, so keep the focus on the server read here.

Show the **server pattern** with `CodeVariants` (before/after on the parse tax):
- **Variant "Hand-rolled":** the `parseSearchParams` Zod helper from earlier. First sentence: *fine for one surface; every new param adds parse + serialize + default code.*
- **Variant "nuqs `createSearchParamsCache`":** `createSearchParamsCache({ status: parseAsStringEnum([...]), sort: parseAsStringEnum([...]).withDefault('-date') })`, then in the Server Component `const { status, sort } = await searchParamsCache.parse(props.searchParams)`. First sentence: *one declaration is the parser, the default, and the type — and the same cache reads anywhere in the render via `searchParamsCache.get('status')`.*

Name the API surface at recognition depth (`createSearchParamsCache`, `parseAsStringEnum`, `.withDefault`, `.parse`, `.get`) — the student recognizes, doesn't memorize. Forward-ref ch 060.1 (the `searchParamsCache` setup becomes that chapter's reference shape) and lesson 5 for the client `useQueryState` write side.

Two API facts confirmed at write time (June 2026) — keep them right: (1) server-side parsers and the cache import from **`nuqs/server`**, not `nuqs` — the bare `nuqs` entry carries `'use client'` and pulls client deps into a Server Component. (2) nuqs frames `createSearchParamsCache` primarily as the way to read parsed searchParams in a **deeply nested** Server Component (the Page itself can already read its `searchParams` prop directly). So the honest framing of the before/after isn't "page can't do this" — it's *"the cache is one typed declaration shared across the whole render tree, vs re-parsing the prop in every component that needs it."* Make the variant prose reflect that, not a false "you must use nuqs to read it" claim.

`Term` candidate: none new.

### External resources (optional)

`ExternalResource` cards: Next.js docs on `searchParams`/`params` (the async/Promise page), Zod docs (`safeParse`/`enum`), and the `nuqs` docs (server-side `createSearchParamsCache`). Keep to 2–3, official sources.

---

## Scope

**This lesson teaches:** the URL-vs-component-state decision rule; the `params`-for-identity / `searchParams`-for-view-state split; reading both as Promises on the server (`await`); validating `searchParams` at the boundary with a Zod schema and falling back to defaults; the `string | string[] | undefined` repeated-key shape; opaque base64 cursors *as a URL shape only*; the Server-Component read-validate-query-render pattern that replaces the client state machine; the Cache Components interaction (dynamic signal, the `use cache` build error, lift-chrome-outside); what must not go in the URL (secrets, blobs, transient state); and `nuqs` as the named production layer with the `createSearchParamsCache` server pattern.

**Explicitly out of scope (redefine briefly if needed, do not teach):**

- **Writing the URL from the client** — `useRouter().push`/`replace`, `useSearchParams`, the chip-list write handler, the Suspense requirement, `push` vs `replace`. This is **lesson 5 of this chapter**. Name it as the forward reference at every point the lesson touches "the user changes the filter"; never show a client write handler.
- **Cursor pagination at the database layer** — the cursor model, mandatory tiebreaker mechanics, the fetch-n+1 hasNext trick, the composite index, cursor versioning. **Ch 038.6** (and ch 060.4 for cursor-in-URL list pagination). Teach only the opaque-base64 *URL shape*.
- **The full URL-state list view** — the four-pillar filter/sort/search/paginate pattern, filter chips with clear-all, typed-vs-committed search input, `useDeferredValue`/`throttleMs` rhythm, the cursor-reset-on-filter-change invariant. **Ch 060** project. This lesson sets the foundation; do not build the whole view.
- **Zod in depth** — builders, refinements, transforms, `treeifyError`, `drizzle-zod` derivation, the FormData coercion boundary. **Ch 042.** Use a hand-written `z.enum` schema and `safeParse`; redefine `safeParse` in one line only.
- **The async-request-API syntax basics** — *why* `params`/`searchParams`/`cookies()`/`headers()` are Promises, `await` vs `React.use()` mechanics. **Ch 032.7** (and ch 030.4 for `use()`). Redefine in one sentence with a back-ref; this lesson is the *usage pattern*, not the syntax intro.
- **Drizzle query internals** — the `db.invoices.findForOrg(...)` call is a named black box. **Ch 038** owns querying. Do not teach `where`/`orderBy`/operator helpers.
- **`key`-based remount on param change** — if the writer wants to mention that derived component state must reset via `key` when `searchParams` change without a remount, keep it to a one-line back-ref to ch 023.5; it is not a teaching point here.
- **Cookies/headers reads** — owned by lesson 1; reference the "read high, pass resolved values down" reflex as continuity, don't re-teach.

**Prerequisites the student already has (assume, don't re-teach):** App Router file-system routing and dynamic segments `[id]` (ch 029.1, 029.3); the dynamic-by-default Cache Components model and `use cache` (ch 032); `useState` for transient UI state (ch 024); "you probably don't need an effect" for data fetching (ch 025); the server/client boundary and `use()` (ch 030); lesson 1's headers/cookies read pattern and the chapter's three-input mental model.
