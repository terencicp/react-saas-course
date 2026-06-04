# Dynamic and catch-all segments

- **Title (h1):** Dynamic and catch-all segments
- **Sidebar label:** Dynamic segments

---

## Lesson framing

**Senior question driving the lesson.** "How do I ship a detail page per invoice without hand-writing a `page.tsx` per id?" The file system has been a static route table for two lessons; this lesson makes one folder stand in for unbounded URLs. The student already knows folder = segment, `page.tsx` = leaf (L1) and that layouts compose down the tree (L2). Dynamic segments are the next brackets in the same alphabet of conventions.

**Three concepts, one spine.** (1) `[param]` captures a URL part the page reads from `params`; (2) in Next.js 16 `params` is a **Promise** the Server Component `await`s — and the modern way to type it is the global `PageProps<'/route'>` helper, not a hand-written annotation; (3) the captured value is an **untrusted string**, so it gets validated (Zod) before it touches a query, with `notFound()` as the miss path. Catch-all (`[...slug]`) and optional catch-all (`[[...slug]]`) are the variable-depth variant of (1), chosen by a small decision tree. Everything else (navigation to these routes, `not-found.tsx`, the rendering model, `generateStaticParams` at depth) is named in context and owned elsewhere.

**Mental model the student should leave with.** A bracketed folder is a *typed hole* in the URL. The framework fills `params` for you (like it fills `children`), but unlike `children` the contents are attacker-controllable text. The senior reflex is therefore three beats: **capture → validate → query**, with the shape of the brackets chosen by how many segments are unknown.

**Where beginners trip (design the lesson against these).**
- Forgetting `await` — reading `params.id` directly. In NJS16 `params` is a Promise, so `params.id` is `undefined` and TS now flags it. This is the single most common first-contact bug; the lesson must make the Promise visceral, not a footnote.
- Treating the captured string as trusted — passing `params.id` straight into a `db` lookup, `Number(params.id)` without checking `NaN`, assuming a UUID is a UUID. The URL bar is an input field.
- Expecting `[...slug]` to match the parent (`/docs`) — it does not. Reaching for catch-all when a single `[id]` was the right call (over-engineering depth).
- Hand-writing `{ params: Promise<{ id: string }> }` everywhere when the project's `PageProps<'/route'>` helper derives it from the route literal with autocomplete.

**Pedagogical spine.** Lead every concept with the decision, then the syntax (course filter #1). Stage complexity: single segment first (the 90% case), then *why* it's a Promise, then multi-segment scoping, then variable depth, then the safety layer. Use one through-line domain — **invoices in a multi-tenant SaaS** — so the catch-all/optional-catch-all examples (a docs site) read as a deliberate change of domain, signposted. Heavy use of `AnnotatedCode` for the canonical page (one file, attention moved across `await`/typing/validation), a `RequestTrace`-free approach (this lesson is about *matching and capture*, not the render pipeline — that's Ch 032), a `StateMachineWalker` for the bracket-shape decision tree, and a `Dropdowns` route→params table drill. No live `ReactCoding` exercise for the page itself — the in-browser iframe renders React but **not** the App Router, so it cannot resolve `params`; a route-matching drill (`Dropdowns`/`Matching`) tests the real skill instead.

**Version pin.** Next.js 16 (16.2+, Turbopack default). `params`/`searchParams`/`cookies()`/`headers()`/`draftMode()` are Promises. `PageProps<'/route'>` / `LayoutProps` / `RouteContext` are globally-available generated helpers (no import) and are the course's default way to type route props.

---

## Lesson sections

### Introduction (no header)

Open on the senior question (invoice detail page per id, without a file per id). One sentence connecting back: folders have been static segments for two lessons; now one folder serves unbounded URLs. Preview the practical payoff: by the end the student can build `/invoices/[id]`, scope it under a tenant (`/orgs/[orgSlug]/invoices/[id]`), handle a docs-style variable-depth URL, and knows the capture→validate→query reflex that keeps an untrusted URL out of a raw query. Keep it to ~4 sentences, warm and terse. Name that catch-all is a narrower tool they'll reach for rarely, so they don't over-rotate on it.

### A folder in brackets is a parameter

Teach `[param]` as the core convention. Folder `app/invoices/[id]/page.tsx` produces `/invoices/:id`; the **folder name inside the brackets becomes the property name** on `params` (`[id]` → `params.id`, `[invoiceId]` → `params.invoiceId`). The captured value is **always a string**. The component reads it from the `params` prop.

Pedagogy: pair a tiny `FileTree` (just `app/invoices/[id]/page.tsx`) with a route→`params` table so the mapping is visual before any code. Table rows: `/invoices/inv_42` → `{ id: 'inv_42' }`, `/invoices/abc` → `{ id: 'abc' }` — drive home "any string the user types lands here."

Then the canonical page, but **deferred**: show it minimal here (just capturing and rendering the id), and let the next two sections add the Promise mechanics and validation. This is staged-complexity on purpose — note for the writer: do not show `await`/Zod yet, only the capture.

Code: a `Code` block (simple, single focus) of the minimal page. Keep it a Server Component, default export (framework convention — callback to L1's "default exports only for framework files"). Component name is arbitrary (`InvoicePage`), name doesn't affect routing — state this explicitly, it's a common confusion carried from "filename matters."

`Term` candidates: "dynamic segment" (the bracketed folder), "route parameter".

Watch-out woven into prose (not a trailing tips block): **duplicate segment names crash the build** — two `[id]` folders on one path, or a `[id]` and `[...id]` sibling at the same level, is a compile error. Mention once here, expand the catch-all conflict in the catch-all section.

### Why `params` is a Promise, and how to type it

This is the lesson's conceptual pivot and the #1 bug surface — give it full weight.

**The change.** In Next.js 16, `params` (and `searchParams`, `cookies()`, `headers()`, `draftMode()`) is a **Promise**. The page is `async` and `await`s it. State the *why* in one durable sentence: these are request-time values, and making them Promises lets Next.js render the static parts of a page before the request-specific data resolves (the Cache Components / PPR model — name it, point forward to Ch 032, do not teach it here). The student does not need PPR to use the rule; the rule is "await it."

**How to type it — lead with the helper.** Next.js generates global helper types `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>` (no import; produced by `next dev`/`next build`/`next typegen`). `PageProps<'/invoices/[id]'>` gives a correctly-typed `params` *derived from the route literal* with autocomplete on the param names. This is the course default — it's less to write, can't drift from the folder name, and updates when you rename the segment. Show the hand-written `{ params: Promise<{ id: string }> }` form **once** as "what the helper expands to" so the Promise shape is legible, then use `PageProps` everywhere after.

Use `CodeVariants` for the typing comparison — two tabs:
- **`PageProps<'/route'>` helper** (the senior default): `export default async function InvoicePage({ params }: PageProps<'/invoices/[id]'>) { const { id } = await params; … }`. First sentence of prose: "Derived from the route, autocompletes the param names, can't drift." Note no import needed.
- **Manual annotation** (the underlying shape): `{ params: Promise<{ id: string }> }`. Prose: "What the helper expands to — fine, but you restate the shape by hand and it silently rots when you rename the folder."

Then an `AnnotatedCode` walkthrough of the now-complete-but-still-unvalidated page (one file, steps move focus): step 1 the `async` keyword + `PageProps` type; step 2 `const { id } = await params` with `color="orange"` on `await` — explicitly call out that **dropping `await` leaves `id` as a Promise** (and TS errors on `params.id`); step 3 the id used in the render. Keep each step ≤6 lines of prose.

**Client Components.** One short paragraph + a small `Code` block: a Client Component can't be `async`, so it reads the same Promise with `React.use(params)` (or the `useParams()` hook, named once). Callback to the L2/Code-conventions rule "Client Components take Promises as props and read them with `use()`." Keep this minimal — the server path is the lesson's spine; this is the escape hatch.

`CodeTooltips` on the comparison block or `use()` block for: `PageProps` ("Next-generated global type. Maps a route literal to its props. No import."), `use` ("React 19. Unwraps a Promise (or context) inside a Client Component's render.").

Exercise — `PredictOutput` or a small `MultipleChoice`: show a page that does `const id = params.id` (no await) and ask what `id` holds at runtime / why TS complains. Goal: cement that `params` is a Promise. Place it right after the AnnotatedCode, before moving on.

### Scoping a route with multiple dynamic segments

Teach nested brackets for multi-axis identity. `app/orgs/[orgSlug]/invoices/[id]/page.tsx` → `/orgs/:orgSlug/invoices/:id`; `params` resolves to `{ orgSlug: string; id: string }`. **Each segment name must be unique within the route** (you can't have two `[id]`). Frame the *why*: this is the SaaS tenant-scoping shape — the org in the path, the resource within it — and it's the through-line for Units 8+. Keep it concrete: one `await` still unwraps the whole object.

Pedagogy: `FileTree` showing the nested bracketed folders, then a `Code` block of the page destructuring both (`const { orgSlug, id } = await params`) typed with `PageProps<'/orgs/[orgSlug]/invoices/[id]'>`. Reinforce that the helper now autocompletes *both* names — concrete payoff of the helper over hand-typing.

Note for writer: keep this section tight; it's a compositional extension of the prior section, not a new mechanism. Do not re-explain the Promise.

### Variable-depth URLs: catch-all and optional catch-all

Signpost the domain change up front: "Detail pages have known depth. Some URLs don't — a docs site, a CMS path, an editorial slug — so the examples below switch from invoices to docs."

**`[...slug]` — catch-all.** Folder `app/docs/[...slug]/page.tsx` matches `/docs/a`, `/docs/a/b`, `/docs/a/b/c` — **any number of segments** — and `params.slug` is a **`string[]`**. Critically: it does **not** match the parent `/docs` alone. Use a route→params table (the canonical Next.js table is the clearest possible teaching aid): `/docs/a` → `{ slug: ['a'] }`, `/docs/a/b` → `{ slug: ['a','b'] }`, `/docs` → **no match (404)**.

**`[[...slug]]` — optional catch-all.** Double brackets: same as catch-all **plus** it matches the parent. `params.slug` is **`string[] | undefined`** (typed `{ slug?: string[] }`) — `undefined` at `/docs`. Table row: `/docs` → `{ slug: undefined }`, `/docs/a` → `{ slug: ['a'] }`. Use when **one page serves both the index and depth-N children**.

Pedagogy: a `TabbedContent` figure with two tabs (Catch-all / Optional catch-all), each tab holding the route→params table for that variant, so the student A/Bs the one row that differs (`/docs` → 404 vs `undefined`). This is the crux distinction and deserves a side-by-side. The code itself is nearly identical across variants — show one `Code` block per variant inline (catch-all: iterate `slug` as an array; optional catch-all: branch on `slug === undefined ? <Index/> : <Page slug={slug}/>`), with `del`/`ins` or just highlights on the differing line.

Watch-outs in prose: the value is **always an array** for catch-all (even a single segment is `['a']`, not `'a'`) — beginners index `slug[0]` expecting a string and forget the array shape; a catch-all and a dynamic `[id]` sibling at the same level conflict at build time.

`Term` candidates: "catch-all segment", "optional catch-all segment".

### Picking the right bracket shape

A decision tree, because the whole skill is choosing the shape, not memorizing four syntaxes. This is where the lesson's "decisions before syntax" pillar lands hardest.

Build it as a `StateMachineWalker` (`kind="decision"`). The senior asks the questions in this order:
- **Q1: Is the depth known and fixed?** → Yes: Q2. No (variable): Q3.
- **Q2: One unknown segment or several nested?** → One → **Leaf: `[id]`** (canonical: detail pages). Several → **Leaf: nested `[a]/[b]`** (tenant-scoped resources). Add a branch for "the values are a small known set" → **Leaf: literal folders** (enumerate them; no dynamic segment needed — e.g. `/settings/billing`, `/settings/team`).
- **Q3: Should the parent URL also render this page?** → No → **Leaf: `[...slug]`** (separate parent route). Yes → **Leaf: `[[...slug]]`** (one page serves all).

Each `Leaf` `verdict` names the shape; the body gives the one-line "reach for this when" and the canonical example. Rationale to writer: the walker forces the student through the *order* a senior reasons in (known-depth before variable, parent-included before not), which is the transferable skill; any single leaf is trivial.

Follow the walker with a one-line summary sentence the student can memorize: *known single → `[id]`; known multi-axis → nested; variable, no parent → `[...slug]`; variable, with parent → `[[...slug]]`; enumerable → literal folders.*

### The URL is untrusted input: validate before you query

The senior payload of the lesson. Frame the stakes in production terms: `params.id` is **whatever the user typed in the address bar**. Passing it raw into a query is the same class of mistake as trusting a form field — wrong-shaped ids, injection-shaped strings, `Number(params.id)` silently yielding `NaN`, a non-existent record. The reflex is **capture → validate → query**.

Teach the course shape (callback: Zod is owned by Ch 042 — keep it to the entry-point pattern, concise, don't teach Zod's API surface):
- Define a small schema for the param shape. Use **Zod 4 top-level builders** per conventions: `z.uuid()` / `z.coerce.number().int().positive()` depending on the id's real type — pick `z.coerce.number()` for a numeric id so the FormData/URL-string→number coercion is the teaching point, or `z.uuid()` if the project uses UUIDs (note: course standardizes on UUIDv7 for entities, so `z.uuid()` is the realistic reach — use that as primary, mention coercion as the variant).
- `safeParse` the captured value at the top of the page (untrusted input → `safeParse`, per conventions).
- On failure, call **`notFound()`** — name it here (imported from `next/navigation`), explain it *throws* a signal the framework catches to render the closest `not-found.tsx`; **full treatment is L4 / Ch 031**, this lesson only wires the call. Do not `try/catch` it.
- On success, the narrowed value goes to the query.

`AnnotatedCode` is the right vehicle — one page file, attention walked across the three beats:
- Step 1 (`color="blue"`): the `PageProps` signature + `await params` (recap, brief).
- Step 2 (`color="orange"`): `const parsed = paramsSchema.safeParse(...)` — the validation gate. Prose: untrusted string enters here.
- Step 3 (`color="red"`): `if (!parsed.success) notFound();` — the miss path; throws, nothing after runs.
- Step 4 (`color="green"`): the narrowed id used in the (sketched) `getInvoice(parsed.data.id)` call.

Keep the query itself a one-liner stub (`getInvoice(...)` — full data layer is Unit 5); the lesson's point is the boundary, not the SQL.

Mention the official-docs alternative pattern in one sentence for the enumerable case — a type-guard that `notFound()`s (`assertValidLocale`) — as the lighter form when the param is a small fixed set, so the student recognizes it; Zod is the default for shaped/parsed values.

Watch-outs in prose: validate **before** the query, never after; coerce explicitly (`Number(x)` on a non-numeric string is `NaN`, not an error); a parse failure should resolve to `notFound()` (404) for a missing/garbage resource id, not a thrown 500.

`Term` candidates: `notFound()` ("throws a signal; Next renders the nearest `not-found.tsx`. HTTP 404."), `safeParse` ("Zod. Returns `{ success, data } | { success, error }` instead of throwing.").

Exercise — `Dropdowns` (fenced-code mode) on a validation snippet: blanks for `safeParse` vs `parse`, `notFound` vs `redirect`, and `parsed.data` access. Goal: cement the boundary shape. Place at section end.

### `generateStaticParams`, in one breath

A pure forward-reference, kept to a short paragraph (no header-worthy depth). State the one idea: a dynamic route can be **pre-rendered at build time** by exporting `generateStaticParams()` returning an array of `params` objects (`[{ id: '1' }, { id: '2' }]`); the framework generates static HTML per entry, and unlisted ids render on demand. Name the canonical use (content catalogs, docs) and hand it off: **Ch 034 L8 owns it in full**; the rendering/caching implications are Ch 032. Rationale: the student will see this export in real `[slug]` pages immediately, so recognition now prevents confusion later — but teaching it here would drag in the whole rendering model, out of scope.

### Putting it together (recap)

A compact consolidation, not new material. A `Matching` exercise as the capstone check: left column = route folders (`[id]`, `[orgSlug]/[id]`, `[...slug]`, `[[...slug]]`), right column = the resolved `params` shape (`{ id: string }`, `{ orgSlug: string; id: string }`, `{ slug: string[] }`, `{ slug?: string[] }`). Goal: verify the student can read brackets → params type on sight, the load-bearing skill for every later route. Close with the one-line decision summary repeated and a pointer to L4 (navigating *to* these routes) as the next step.

### External resources (optional)

One or two `ExternalResource` cards: the Next.js "Dynamic Route Segments" file-convention doc (the route→params tables are canonical), and optionally the `PageProps` / typed-routes upgrade note. No YouTube video — the concept is short, table-driven, and better served by the route→params tables than by a talking-head walkthrough; a video would add minutes without adding clarity.

---

## Scope

**This lesson teaches:** `[param]` single dynamic segments; the property-name-from-folder-name rule; `params` as a Promise in NJS16 and `await`/`React.use()` to read it; typing route props with the global `PageProps<'/route'>` helper (primary) vs hand-written `Promise<{…}>` (shown once); multiple nested dynamic segments for tenant scoping; `[...slug]` catch-all (`string[]`, no parent match) and `[[...slug]]` optional catch-all (`string[] | undefined`, matches parent); the bracket-shape decision tree; validating captured params with Zod `safeParse` at the page boundary and `notFound()` on miss; `generateStaticParams` named as a forward-reference only.

**Prerequisites to restate concisely (do not re-teach):**
- Folder = route segment, `page.tsx` = routable leaf, default export only for framework files, private `_folder`s (L1) — one-line recall.
- Layouts compose down the tree; the framework injects props you receive, not pass (L2) — one line, reused to frame "the framework fills `params`."
- Server Components are the async default; Client Components can't be `async` and read Promises with `use()` (L2 / Ch 030) — one line at the Client-Component escape hatch.
- Zod exists for validation (introduced earlier in the course) — assume `z` is known; do not teach Zod's API.

**Explicitly out of scope (named in context, owned elsewhere — do not teach):**
- Navigating *to* dynamic routes with `<Link>` / `useRouter` — **L4**.
- `redirect()`, `permanentRedirect()`, and the full `notFound()` + `not-found.tsx` story / error boundaries — **L4 and Ch 031**. Here `notFound()` is only *called*.
- `searchParams` and URL view-state (the `params`-for-identity / `searchParams`-for-view split) — **Ch 033 L4**. This lesson is `params` only; mention the split exists in one clause at most.
- The Cache Components rendering model, PPR, why-Promise-enables-static-shell at depth, Suspense-wrapping of param access without `generateStaticParams` — **Ch 032**. Named as the *reason* params is a Promise, not taught.
- `generateStaticParams` at depth, `dynamicParams`, pairing with `use cache`/`cacheTag` — **Ch 034 L8**.
- The full async-request-API surface (`cookies()`, `headers()`, `draftMode()`, `connection()`) — **Ch 032 L7**. Listed once alongside `params` as "also Promises," not demonstrated.
- Zod 4 in depth (`treeifyError`, `discriminatedUnion`, drizzle-zod derivation) — **Ch 042**. Only `safeParse` + one top-level builder shown.
- The data layer / `getInvoice` implementation, `tenantDb` — **Unit 5 / Unit 10**. Queries are one-line stubs.
- Parallel routes `@slot`, intercepting routes — **L5, L6**.
- Pages Router dynamic routes / `getStaticPaths` — not taught (Pages Router is recognition-only, L1).

---

## Code conventions applied (and deliberate divergences)

- **Default exports** only on `page.tsx` (framework convention); component name arbitrary, stated explicitly.
- **Function form:** `export default async function InvoicePage(...)` — App Router page is one of the sanctioned default-export framework files; arrow-const elsewhere if any helper is shown.
- **TypeScript:** annotate the page's `params` via `PageProps<'/route'>` (the signature *is* the lesson, so explicit typing is warranted); destructure after `await`. `import type` for any type-only imports.
- **Zod 4:** top-level builders (`z.uuid()`, `z.coerce.number()`), never deprecated `.string().email()`-style chains; `safeParse` for the untrusted URL value.
- **Naming:** `params` schema named `<entity>ParamsSchema` or inline; query helpers verb-led (`getInvoice`) per the data-layer naming intent table.
- **Imports:** `notFound` from `next/navigation` (external group); `z` from `zod`.
- **Paths:** use `src/app/...` (course starter uses `src/` + Biome), not bare `app/`, in all `FileTree`s and filename labels.
- **Deliberate staging divergence (flag for writers):** the canonical page is built in *three passes* across three sections (capture-only → +await/typing → +validation). Each intermediate snippet is intentionally incomplete; do not present the early ones as production-final. The validation section's version is the shippable shape.
- **Deliberate simplification:** `getInvoice(...)`/data access is a one-line stub; tenant scoping shown structurally (`[orgSlug]`) without the `tenantDb` machinery (Unit 10). Note this so the writer doesn't import real DB code.
