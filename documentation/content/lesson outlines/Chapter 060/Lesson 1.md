# The list-view anatomy

- Title (h1): `The list-view anatomy`
- Sidebar label: `List-view anatomy`

---

## Lesson framing

This is the chapter's keystone lesson. Its job is to land **one mental model** — the four-pillar SaaS list view (filter / sort / search / paginate) as a single coherent piece of URL state, read on the server and written on the client — and to stamp the **canonical `nuqs` architecture** (one shared parser module, `searchParamsCache` on the server, setters on the client) that lessons 2–4 reuse without re-deriving. Every later lesson drills one pillar; this lesson is the overview and the scaffold.

Pedagogical conclusions that apply lesson-wide:

- **This is a synthesis lesson, not a mechanics lesson.** The student already owns the primitives from Unit 4: the `params` vs. `searchParams` split, the async-`searchParams` server read, the `useRouter`/`useSearchParams` hooks, `push` vs. `replace`, and even a first conceptual look at `nuqs` and opaque base64 cursors (ch 033 L4–L5). Do **not** re-teach those. Open by *reactivating* them ("you can read one param and write one param — now build the screen that needs five") and spend the lesson on composition, the production layer, and the senior contract. This is the "decisions before syntax" filter in action.
- **Lead with the senior question, framed in production stakes.** The motivating problem: a real SaaS list screen (invoices, users, tickets) is filterable, sortable, searchable, paginated, AND a coworker expects to paste its URL into Slack and see the same view. Where does each piece of state live, what crosses the server/client boundary, and what does the URL contract guarantee? Frame it as the screen every internal tool eventually becomes.
- **Minimize cognitive load by building the model in two passes.** Pass 1 (conceptual): the four pillars, the URL-vs-state decision rule, and the share-and-refresh contract — no code, decision-driven, diagram-supported. Pass 2 (architectural): the page-shape anatomy and the `nuqs` setup that implements it. Only after the model is firm does code appear. A complex worked example up front would spike load before the student has the frame to hang it on.
- **`nuqs` must be earned, not assumed.** The student saw `nuqs` named once in ch 033. Here it gets its full justification: show the hand-rolled `URLSearchParams.set` + Zod + `router.replace` shape working for one param and visibly degrading at four, then introduce `nuqs` as the threshold-crossing tool. Name the threshold explicitly (filter + sort + search + pagination = past three params = cross it). This satisfies "trigger before tool."
- **The end-state mental model the student should hold:** *The URL is the source of truth for any view state that should survive a refresh, a share, or a back button. The Server Component reads and validates it at the page boundary; Client Components write it via setters that use `replace`. There is no client-side fetch and no `useEffect` syncing state to the URL. One parser module defines the shape for both sides.*
- **What the student should be able to do by the end:** look at a list-screen spec, decide which state goes in the URL vs. component state, sketch the server-reads/client-writes page shape, set up `NuqsAdapter` + a shared `searchParams.ts` + `searchParamsCache`, and articulate the share-and-refresh contract as the acceptance test.
- **Tone/scope discipline:** keep the worked example a *skeleton* — the page, the parser module, one representative client control (`<StatusFilter />`), the query call. Resist building out all four pillars; each gets a dedicated lesson. End with an explicit "here's the scaffold, here's what each later lesson fills in" handoff.
- Estimated student time 40–50 min; this is the chapter's center of gravity.

---

## Lesson sections

### Introduction (no header)

Warm, brief, 2–3 short paragraphs. Open on the concrete screen: an invoices list a user filters to "overdue", sorts by amount, searches a customer name, pages through — then copies the URL to a teammate who sees the exact same view. Name that as the target. Reactivate prior knowledge in one sentence (you can already read and write a single URL param from Unit 4). State the lesson goal: assemble those primitives into the full list-view pattern and stamp the production setup the rest of the chapter builds on. Preview the deliverable: by the end you'll have the page shape and the `nuqs` scaffold for a filtered, sorted, searchable, paginated list. No code yet.

### The four pillars of a list view

Name the four pillars and frame them as **one coherent shape**, not four independent features: filter (which subset), sort (what order), search (free-text within the subset), paginate (which slice of the result). The senior framing: these are not four separate state decisions — they are one URL contract that together describes "what the user is looking at."

Use a small **annotated illustration diagram** (HTML+CSS inside `<Figure>`) of a list-view UI mockup: a toolbar with a status dropdown, a sort control, a search box, a table, and a pagination row — each control labeled with the pillar it represents and the URL fragment it owns (`?status=…`, `?sort=…`, `?q=…`, `?cursor=…`). Pedagogical goal: give the student a visual anchor that maps UI affordance → URL parameter before any code. Caption ties all four fragments into one example URL so the "one shape" idea is concrete. Keep it compact (short viewport rule).

End the section by naming the throughline: all four default to URL state, and the next section gives the rule for deciding what is and isn't URL state.

### What belongs in the URL, and what doesn't

Teach the decision rule as the lesson's reflex tool. The rule: **state that should survive a refresh, be shareable, or appear in browser history goes in the URL; transient interaction state stays in component state.** The one-question heuristic to repeat: *"Would the user expect this back if they refreshed?"*

Concrete sorting of examples:
- URL: active filters, current sort, the committed search term, the current page/cursor.
- Component state: whether a filter dropdown is open, hover/focus, the in-progress text the user is typing but hasn't committed yet (flag this as the typed-vs-committed split that lesson 3 owns — name it, don't teach it), the row currently being edited (that's form state).

Add the senior negative-space points briefly, inline (these are watch-outs that belong to *this* concept, per the no-watch-out-dumping rule): the URL is not for secrets, large blobs, or anything the user can't reasonably understand from reading it — an opaque blob other than a cursor is a smell.

**Component — `StateMachineWalker` (`kind="decision"`).** Build a short decision walk: "I have a piece of list-view state — where does it live?" Root question branches on the heuristics (Should it survive a refresh? Should a shared link reproduce it? Is it mid-interaction / uncommitted?) leading to two leaves: **URL state** and **Component state**, each with a one-line justification and a couple of canonical examples. Pedagogical goal: make the student *practice applying* the rule rather than just read it, which is exactly where beginners go wrong (they reflexively reach for `useState` for everything, or over-stuff the URL). This is the highest-value interactive moment in the lesson.

### The share-and-refresh contract

Name this as **the acceptance test** for any URL-state list implementation. State the contract as four guarantees:
1. Open the URL in a new tab → same filtered/sorted/paginated view.
2. Refresh → same view.
3. Paste into Slack → coworker sees the same view (subject to auth).
4. Back button → returns to the previous filter/sort/page combination.

The senior litmus test, stated plainly: **if a click changes the result but not the URL, the contract is broken.** This single sentence is the most portable takeaway in the lesson — make it quotable.

Briefly surface the one honest caveat (inline, as it qualifies this contract): the URL guarantees the *view parameters*, not a frozen snapshot of the rows — if data changed between loads, the shared link reflects the current data under the same filters. Cursor pagination's "position not snapshot" nuance is lesson 4's; just plant the seed here. Also note the auth boundary: a shared URL to a restricted resource is gated at the route, not the URL — defer the depth to Units 8–9 (which the student has just finished) in one sentence.

No diagram needed here; the contract is verbal and belongs in the student's head as a checklist. Optionally a small `Aside` (tip) restating the four guarantees as a verification checklist.

### Read on the server, write on the client

The architectural division — the heart of the lesson. Teach it as a clean split with no middle layer:
- **Server (the page, a Server Component):** reads `searchParams`, validates/parses it, queries the database, renders the table with real data.
- **Client (the controls):** the filter dropdown, sort header, search input, pagination buttons. Each receives the current parsed value as a prop (server-derived) and, on change, **writes the URL** via a setter. The server re-renders with the new params; the fresh table streams back.

Hammer the two senior negatives that define this pattern (inline watch-outs for this concept): **no `useEffect` to sync state to the URL**, and **no client-side data fetch** — therefore no request waterfall. The data round-trips through the URL and the server, not through client fetching. This is where students coming from SPA/`useEffect`-fetch habits go wrong; call it out directly.

**Component — `RequestTrace`** (it provides its own card; do NOT wrap in `<Figure>`). This is the lesson's signature diagram. Configure `phases="request,server-render,wire,hydrate"`, `url="/invoices?status=overdue"`. Tree:
- `InvoicesPage` (`kind="server"`)
  - `InvoiceList` (`kind="server"`, `await="db: invoices"`) — wrap in a `kind="suspense"` node (`fallback="Table skeleton"`) per the component's must-wrap-awaiting-nodes rule.
  - `StatusFilter` (`kind="client"`) — add a `<WireProp name="value" value="'overdue'" status="ok" />` to show the server-derived current value crossing cleanly.

Add `<Phase id="server-render">` caption: every node runs on the server first, including the client controls — `"use client"` marks where hydration attaches, not "skip the server"; the table data is read here from the validated `searchParams`. Add `<Phase id="hydrate">` caption: only now does `StatusFilter` become interactive and able to write the URL; `InvoiceList` shipped zero client JS. Pedagogical goal: kill the two misconceptions (client components skip the server; data is fetched on the client) by letting the student scrub the actual order of events. This reuses a component the student met in Unit 4, so it's familiar machinery carrying new content.

Then introduce the write half explicitly: in-page state changes use **`router.replace` (or a `nuqs` setter, which uses `replace` by default), with `{ scroll: false }`** — restated from ch 033 as the *default for list state*, with the one-line reason: `replace` keeps the back button useful (it leaves the page) instead of stacking one history entry per chip. `push` is reserved for genuine navigation (clicking a row → detail page). Keep this tight — the student saw `push`/`replace` in ch 033; the new content is the *policy* (replace is the default for list controls) and the `{ scroll: false }` reflex for long lists. A one-line `Code` snippet contrasting the two is enough; no need for a full component yet.

### When hand-rolling stops scaling

The "trigger before tool" beat that earns `nuqs`. Show the hand-rolled approach the student already knows, working and then degrading:

**Component — `CodeVariants`** with two tabs:
- Tab "One parameter": a `<StatusFilter />` change handler that builds a `URLSearchParams` from `useSearchParams()`, sets `status`, and calls `router.replace`. Plus the server side reading `searchParams.status` through a small Zod parse. Prose: at one parameter this is fine, and you can already write it.
- Tab "Four parameters": the same shape but now juggling `status`, `sort`, `q`, `cursor` — repeated read-current/clone/set/serialize boilerplate, a Zod object parse on the server, the manual "set this one without trampling the others" dance, and the manual default-stripping to keep URLs short. Prose: every parameter multiplies the boilerplate and each is a place to forget validation or trample a sibling.

Land the threshold as a named rule: **any list view with filter + sort + search + pagination crosses past three parameters — reach for `nuqs`.** Don't introduce `nuqs` syntax yet; this section's job is to make the student *want* it. Keep both tabs readable (`maxLines`), strip imports per MDX display rules.

`Term` candidates in this section: **`URLSearchParams`** (re-explain briefly as the web-platform key/value URL API the student met in Unit 2 — non-interrupting refresher).

### nuqs: one parser module, both sides of the boundary

Introduce `nuqs` as the canonical production layer and the chapter's tool from here on. Frame what it buys, mapped directly to the pain points from the previous section:
- **Typed parsers**: `parseAsString`, `parseAsInteger`, `parseAsStringEnum`, `parseAsArrayOf`, `parseAsBoolean`, `parseAsIsoDate` — each validates-or-defaults by design (Zod-shaped behavior at the boundary), so garbage in the URL falls back instead of flowing into the query.
- **Defaults** via `.withDefault(...)` — and the win: `nuqs` strips a parameter from the URL when it equals its default, so URLs stay short and the empty URL is the home view. Senior reflex: pick defaults that match the most common view.
- **One shared definition**: the same parser object feeds `createSearchParamsCache` on the server and `useQueryState`/`useQueryStates` on the client — the schema is defined once, both sides agree by construction.

**The setup, taught as three concrete moves.** Use `AnnotatedCode` blocks (one code block, stepped focus) for each of the two key files so the student's attention is directed part-by-part:

1. **`NuqsAdapter` once at the root.** Show wrapping the root layout's children in `<NuqsAdapter>`. One short `Code` block; one sentence — it's plumbing, do it once. (Note: import path is `nuqs/adapters/next/app` for the App Router — verify in fact-check step.)

2. **The shared parser module — `app/invoices/searchParams.ts`.** `AnnotatedCode`, stepping through: the `status` enum parser (`parseAsStringEnum([...]).withDefault(null)`), the `sort` enum parser with `.withDefault('-createdAt')`, the `q` string parser `.withDefault('')`, the `cursor` plain string parser. Then `createSearchParamsCache({ ... })` built from those same parsers, exported. Emphasize in a step: this object is the single source of truth — the client imports the same parsers. This is the **reference shape** for the chapter; say so explicitly. Use `CodeTooltips` or an `AnnotatedCode` step to surface the *inferred* parsed type (e.g. `status: 'draft' | 'paid' | 'overdue' | null`) so the student sees the type safety the parser yields — this is the payoff vs. the hand-rolled `string | string[] | undefined`.

3. **Reading it on the server.** Show the page calling `const { status, sort, q, cursor } = await searchParamsCache.parse(props.searchParams)` once at the top, then passing slices to the query function and the current values to the client controls as props. One `Code` block; tie back to the async-`searchParams` await the student knows from ch 033.

Inline watch-out belonging here: validation is still defense at the boundary even with `nuqs` — `searchParams` is user-controlled; a hand-typed `?status=DROP%20TABLE` is rejected by `parseAsStringEnum` and falls back to the default. Reach for plain Zod only when a parameter is structured beyond what the built-in parsers cover. State plainly that `nuqs` parsers are the validation layer for the common cases, not a reason to skip validation.

`Term` candidates: **enum parser** is not needed; but **opaque cursor** (one-line: an encoded blob the server decodes back into a position; lesson 4 owns it) if `cursor` raises questions.

### The page-shape anatomy, end to end

The synthesis — the worked skeleton that is the chapter's reference architecture. Compose the pieces into one page and one representative client control. Keep it a **skeleton**, not a full build (the four pillars are later lessons).

**Component — `CodeVariants`** (grouping related files) OR a `FileTree` + sequence of `Code`/`AnnotatedCode` blocks. Prefer `CodeVariants` with tabs as related files:
- Tab `searchParams.ts` — (can reference the one built above; show the final form).
- Tab `page.tsx` — the Server Component: `await searchParamsCache.parse(...)`, call the query function with the parsed slices, render `<Filters current={status} />`, `<SortControl current={sort} />`, `<SearchInput initial={q} />`, `<InvoiceTable rows={rows} />`, `<Pagination cursor={cursor} hasNext={...} />`. The first controls are client components taking the server-derived current value as a prop; the table is server-rendered with data. Use stub/placeholder bodies for the controls not yet built — comment them as "// filled in: Lesson 2/3/4" so the handoff is explicit.
- Tab `status-filter.tsx` — ONE fully-built client control as the concrete example: `'use client'`, `useQueryState('status', parseAsStringEnum([...]).withDefault(null))` (importing the parser from the shared module), a controlled `<select>` whose `onChange` calls the setter. Show that the setter writes the URL and triggers the server re-render — no fetch, no effect. This is the single client control taught in full; the rest are stubs.

Optionally precede with a tiny `FileTree` showing where these three files sit relative to the route, since "parsers in a module next to the page" is a structural convention worth making spatial.

Reinforce the canonical shape in prose after the code: page reads + validates + queries + renders; client controls take current value as prop + write via setter; one parser module shared. Name this as the architecture lessons 2–4 extend.

**Exercise — `MultipleChoice` (or two).** Place a short check here, not at the lesson end (per "exercises where they belong"). Candidate items: (a) "A user toggles a filter dropdown *open* but picks nothing — where does the open/closed state live?" (component state); (b) "Where is the validation that a `?sort=` value is one of the allowed columns?" (the `parseAsStringEnum` parser / the shared module). Goal: verify the two load-bearing decisions (URL-vs-state, validation-at-the-parser) stuck. Keep it to 1–2 questions; this is a self-check, not a gauntlet.

> Note (deliberate divergence from Code conventions for pedagogy): the `page.tsx` tab uses stubbed control components with `// filled in: Lesson N` comments rather than complete implementations. This is intentional staging so the lesson stays a skeleton and hands off cleanly to later lessons. Downstream agents should not "complete" these stubs.

### What this lesson set up, and what comes next

Short closing section (not a generic summary — a handoff). Restate the mental model in 2–3 sentences (URL is source of truth for survivable view state; server reads/validates, client writes via setters; one shared parser module; share-and-refresh is the acceptance test). Then map the scaffold to the chapter:
- Lesson 2 fills in the filter shapes and sort encoding (the `<Filters />` and `<SortControl />` stubs), plus the cursor-reset-on-change invariant.
- Lesson 3 fills in `<SearchInput />` with the typed-vs-committed split and React 19 input rhythm.
- Lesson 4 fills in `<Pagination />` with the cursor-by-default decision.

Optional `ExternalResource` LinkCards: the official `nuqs` docs (nuqs.dev), and the Next.js `searchParams` page reference. Keep to 1–2, clearly marked optional.

---

## Scope

**Prerequisites to redefine concisely (one line each, do NOT re-teach):**
- `params` (route identity) vs. `searchParams` (view state), and that `searchParams` arrives as a Promise awaited in the Server Component — ch 033 L4.
- The `useRouter`/`useSearchParams` hooks and `push` vs. `replace` — ch 033 L5. (New here: the *policy* that list controls default to `replace` + `{ scroll: false }`, and the full `nuqs` setup.)
- `searchParams` raw shape is `string | string[] | undefined` and is user-controlled, hence needs validation — reactivate, don't re-derive.
- Cursor pagination exists and cursors are opaque base64 — ch 038 L6 / ch 033 L4. One-line reminder only; lesson 4 owns the encoding.

**Explicitly out of scope (defer, name the owner):**
- The four filter shapes, multi-select encoding, range params, the `-key` sort string, active-filter chips, the cursor-reset invariant — **Lesson 2** of this chapter.
- The typed-vs-committed search split, `useDeferredValue`/`useTransition`, `nuqs` `throttleMs`, debounce, `isPending` affordance — **Lesson 3**.
- Cursor-vs-offset decision, cursor encoding internals, `hasNext` n+1 trick, cursor versioning, page-size selection — **Lesson 4**.
- The `useRouter`/`useSearchParams` *hook mechanics* and the Suspense requirement on `useSearchParams` — ch 033 L5 (already taught).
- The `searchParams` *server read mechanics* — ch 033 L4 (already taught).
- Cursor pagination *at the database/query layer* (Drizzle `where`/`orderBy`, the composite index) — ch 038 L6, ch 039 L1.
- Postgres full-text search for the `q` query — ch 038 L8.
- The soft-delete `showArchived` visibility toggle wired into the base query — Chapter 061.
- The Server Action that mutates and revalidates the list — Chapter 043 (Unit 6, already taught) for the action shape; the list-revalidation wiring is the project's job (Chapter 062).
- Auth and tenancy scoping on the list query (`organizationId` always applied) — Units 8–9 (already taught); mention only as "the query is tenant-scoped" without re-teaching.
- Saved views / named filter presets — out of scope for the whole chapter.
- Infinite scroll, real-time list updates — out of scope.

The lesson teaches the **architecture and the `nuqs` scaffold**; it does not build out any single pillar's UI beyond one representative client control.

---

## Code conventions notes

- `nuqs` is the canonical URL-state tool (Code conventions §Hooks: "URL state lives in the URL via `nuqs`, not `useState`"). Align all examples to it.
- `searchParams` is awaited (`await searchParamsCache.parse(props.searchParams)`) per the async-request-APIs rule.
- `type` not `interface`; arrow-function components bound to `const`; named exports except the framework-mandated default export on `page.tsx`/`layout.tsx`.
- Never `enum` — sort/status options are string-literal unions expressed via `parseAsStringEnum([...] )` with `as const`-style literal arrays.
- Single quotes, 2-space indent, trailing commas — Biome.
- Strip imports in MDX display where they're not the lesson; mark `// new` / `// changed` per Pedagogical guidelines §4 when showing an evolving file.
- Deliberate divergence (noted above): stubbed control components in the page skeleton.
