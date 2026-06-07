# Lesson 4 outline — List endpoints: filter, sort, search, paginate

- **Title (h1):** List endpoints: filter, sort, search, paginate
- **Sidebar label:** List endpoints

---

## Lesson framing

**Archetype.** Mechanics, with one pattern thread running through it: the shared `where`-builder pure function in `/lib` consumed by *both* the route handler and (later) the in-app Server Component. Estimated 45–55 min.

**The senior question this lesson answers (state implicitly in the intro, do not label it).** A GET handler serves a list — `/api/invoices?status=sent&sort=-issuedAt&q=acme&cursor=…&limit=20`. The query string is the *entire* input surface, and it arrives as strings only. What does the Zod schema look like, how does the parsed query become a Drizzle query, and what is the response shape that won't break the first client when v2 needs a total count? This is the third "author a contract" lesson in the chapter; L2 gave the query-source-as-Zod posture and the `z.coerce` bridge, L3 gave method+status. This one fills the GET list payload.

**What the student already has walking in (do not re-teach — see Scope).** From L1: the `route.ts` shape, named-method exports, `params` is a `Promise`, dynamic-by-default. From L2: the four input sources parsed cheapest-first with `safeParse`, `searchParams` is strings + bridge with `z.coerce`, response-schema-as-allowlist, `problem()`/`parseOr422()` helpers, the one-schema-one-mutator-two-callers synthesis, the `/lib/schemas` + pure-`/lib` file layout. From L3: 200 for a successful read, 422 on schema fail, 404-not-403 on cross-tenant. From earlier units: Drizzle `where`/`orderBy`/`limit` and the operator helpers (`eq`, `and`, `inArray`, `asc`, `desc`), and **opaque base64 cursor pagination is already taught in Ch 038 L6** — this lesson *consumes* that pattern at the wire boundary, it does not re-derive the keyset SQL.

**The four mental models the student must leave with.**
1. **A list endpoint has exactly four query dimensions** — filter, sort, search, paginate. Every list-API design question reduces to "which of these four, and what's the convention for each." This is the spine of the lesson; introduce the four upfront as the organizing frame and teach one per section.
2. **The query string is an untrusted, string-only surface — the schema is the allowlist and the ceiling.** Every legal parameter is declared; `sort` is an enum of sortable columns, not a free string; `limit` has a hard `.max()`. The failure mode that motivates this: a client sends `?limit=999999` or `?sort=password` and an unguarded handler obeys.
3. **Envelope from day one, never a bare array.** `{ data, pageInfo }` so total counts, applied-filter echo, and rank metadata land later without a breaking change. The naked-array v1 that v2 has to break is the anti-pattern.
4. **The `where`/`orderBy` builder is a pure function in `/lib`, not handler-inline code.** Architectural Principle #3, third appearance in the chapter. The route handler imports it; the in-app Server Component (Ch 060) will import the *same* function. This is the pattern thread — it's *why* this lesson matters beyond "parse a query string."

**Pedagogical spine.** Lead with the worked endpoint (`listInvoices`) and carry it through all four dimensions — one schema growing section by section, one handler body assembling section by section. Continuity demands the invoice domain from L1/L2 (`/lib/schemas/invoice.ts`, `/lib/invoices.ts`, `app/api/invoices/.../route.ts`). Most-important-concept ranking for time budget: (a) the query-schema discipline + the four dimensions, (b) the shared `where`-builder pure function, (c) the `{data,pageInfo}` envelope + cursor-at-the-wire, (d) search operator decoupling. Cut depth on `count`/`include`/multi-sort — name-once each.

**Cognitive-load sequencing.** The naive shape first (filter only, bare array, inline `where`), then add complexity: add sort (introduce the prefix convention), add search (introduce operator decoupling), add pagination (introduce the envelope + cursor), *then* lift the assembled `where`/`orderBy` into the pure function and reveal the second caller. Do **not** open with the full schema — it's ~6 fields and reads as noise before the student knows why each exists.

**Tone.** Adult, terse, decision-first per the guidelines. Every convention choice (prefix-sort, repeated-key multi-value, cursor-default, envelope) is presented as "three forms exist in the wild, here's the one this project picks and why," not as the only option — that's the senior framing the course wants.

---

## Lesson sections

### Introduction (no header)

Open on the concrete URL `/api/invoices?status=sent&sort=-issuedAt&q=acme&cursor=…&limit=20` and name the tension: this is the same `route.ts` GET from L1, but the query string is now doing real work and it's all strings. State the practical end state — by the end the student can author a list endpoint's query schema, translate it to Drizzle, and return a paginated envelope, with the query logic factored so an in-app list view reuses it. Introduce **the four dimensions (filter, sort, search, paginate)** here as the lesson's organizing frame — one sentence each — so the four body sections have an obvious map. Connect back: "L2 taught that `searchParams` is strings and `z.coerce` is the bridge; this lesson is what the query schema on the other side of that bridge actually contains." Keep to ~4 short paragraphs.

**Diagram (small, earns its place):** a compact HTML+CSS labeled strip decomposing the example URL into its four colored segments (filter / sort / search / paginate) above the path+cursor, each segment tinted to match the four body sections. Pedagogical goal: install the four-dimension frame visually and give the reader a color key they'll recognize as each section opens. Wrap in `<Figure>`, caption names the four dimensions. This is a "simple visual aid," exactly the kind the brief says counts as a diagram. Keep height small.

### Filtering: enum allowlists, not free strings

The first and simplest dimension. Teach:
- Filters declared **per filterable column** as `z.enum([...]).optional()` for single-value, `z.array(z.enum([...]))` for multi-value. The enum is the allowlist — a `?status=banana` fails the schema and returns 422 (callback to L2/L3), and crucially a client can only filter on columns you sanctioned.
- **Multi-value convention decision.** Two forms in the wild: repeated key (`?status=sent&status=overdue`) vs CSV (`?status=sent,overdue`). Project picks the **repeated-key form** (the senior reach — composes with `URLSearchParams.getAll`, no in-value delimiter ambiguity). Name CSV as the alternative, one line.
- **The `getAll` gotcha, taught here because filtering is where it first bites.** `Object.fromEntries(searchParams)` keeps only the *last* value of a repeated key — silently dropping `sent` and keeping `overdue`. For any multi-valued key, read with `searchParams.getAll('status')`. Single-valued params can come from `Object.fromEntries`. This is the canonical query-parse bug; give it full weight.
- **Filter normalization in the schema.** Empty-string filter values mean "not specified," not "match empty" — drop them in a `z.preprocess`/`.transform` before the enum check. Dedup repeated values with `.transform(arr => [...new Set(arr)])`. Frame: "the URL is the user's surface; defensive parsing is the handler's job."

**Components.**
- `Code` block: the first slice of `ListInvoicesQuery` — just the filter fields. Keep it small; this schema grows across the next three sections.
- `AnnotatedCode` for the **searchParams→object assembly** step (the `getAll` vs `Object.fromEntries` split), since student attention must land on the specific lines that differ for single- vs multi-valued keys. 3–4 steps, blue default, orange on the `getAll` line. This is the highest-bug-density code in the section, so it earns the stepped treatment over a plain block.

**Exercise (this section, the syntax-practice slot):** a `ZodCoding` widget. Why `ZodCoding` and not `ReactCoding`/sandbox: the route handler can't run in the react-only iframe (memory note: `ReactCoding` is react-only; library sandboxes need Sandpack/Zod), but the *query schema is pure Zod* and `ZodCoding` runs real Zod via esm.sh — a perfect fit, and it doubles as the "one declaration = type + runtime contract" payoff. Task: complete a `ListInvoicesQuery` so the fixtures pass. Fixtures pin: valid single `status` (pass), valid repeated-key multi `status` already pre-parsed to an array (pass), `?status=banana` i.e. an out-of-enum value (fail, `errorContains` the enum), empty-string status normalized away (pass). `schemaName: 'ListInvoicesQuery'`. Include a `^?` so the student watches the inferred `status?: ('draft'|'sent'|…)[]` type appear. Note for builder: fixtures take already-shaped objects (the widget calls `safeParse(input)` directly), so the multi-value fixture is `{ status: ['sent','overdue'] }`, not a raw query string — the `getAll` step is taught in the `AnnotatedCode` above, the schema exercise tests the enum/array/normalize shape.

### Sorting: the prefix convention and the column allowlist

Teach:
- **The prefix-form convention.** `?sort=-issuedAt` → `{ field: 'issuedAt', direction: 'desc' }`, `?sort=issuedAt` → `asc`. Parse the single string into the `{field,direction}` shape inside the schema with a `.transform` (or a small refinement + transform). The leading `-` is the descending marker.
- **Three forms in the wild, pick one.** Prefix form (this project's pick — shortest, URL-bar-readable, the Ch 060 project uses it too). Field+order pair (`?sortBy=issuedAt&sortOrder=desc`) — verbose, the reach when each dimension needs its own typed enum. Comma-separated multi-sort (`?sort=-issuedAt,total`) — rare in lists, common in reports; name once. Present as a quick decision, not three full implementations.
- **The sort field is an enum allowlist, never a free string.** This is the security-shaped beat of the section: `?sort=arbitraryColumn` against a free-string parser lets a client `ORDER BY` any column (info leak via timing/ordering, and a guaranteed seq-scan on an unindexed column). The schema's `field` is `z.enum(['issuedAt','total','status'])` — the allowlist of *indexed, sortable* columns. Tie to the index reflex (named, owned by Ch 039): "every column you let the client sort by gets a composite index leading with the tenant column" — state it as the rule, point forward for the how.
- **Translate to Drizzle:** `parsed.sort.direction === 'desc' ? desc(column) : asc(column)`, where `column` is looked up from a small `field → Drizzle column` record keyed by the enum (the allowlist enforced *structurally* — an out-of-enum field can't index the record). Show this as the `orderBy` line; it'll move into the pure function later.

**Components.**
- `CodeVariants` (2 tabs) contrasting **free-string sort (wrong)** vs **enum-allowlist sort (right)**, using `del`/`ins` framing. First sentence of each pane carries the verdict ("accepts any column — info leak + seq scan" / "only sanctioned indexed columns"). This A/B is the cleanest way to land the allowlist lesson; it's a correctness/security contrast, exactly CodeVariants' wheelhouse.
- `Code` block: the `sort` field added to the growing `ListInvoicesQuery`, plus the `field→column` lookup record. `CodeTooltips` on the parsed `sort` token to show the inferred `{ field: 'issuedAt'|'total'|'status', direction: 'asc'|'desc' }` type (meta-information the student should see without leaving the block).

### Searching: one string in, the SQL layer picks the operator

Teach the **decoupling principle** as the headline: the query schema sees `q` as nothing more than `z.string().min(1).max(100).optional()` — a bounded free-text string. *How* that string becomes SQL is a separate, swappable decision the data layer owns. This separation is the senior point; the handler doesn't care which search engine sits underneath.
- The `max(100)` ceiling and `min(1)` (so an empty `?q=` normalizes to "no search," consistent with the filter-normalization rule) — bound untrusted free text.
- **The three operator tiers, at recognition level only** (the SQL is Ch 038/039 territory — do not teach the DDL here):
  - *ILIKE + trigram index* — `WHERE name ILIKE '%' || $q || '%'`, the default for "search by name" on a small table. Requires a `pg_trgm` GIN index (named, owned by Ch 039 L1). (Verified current 2026: GIN + `gin_trgm_ops` is the recommended index for leading-wildcard `ILIKE`; trigram indexes need ≥3 chars in the term to engage — don't claim it at recognition level, but the builder should not show a `min(1)` example implying single-char trigram search.)
  - *Postgres FTS* — `to_tsvector(...) @@ plainto_tsquery(...)` over a stored generated column; the reach when search spans columns or the table is large.
  - *External search* (Algolia/Typesense/Meilisearch) — the trigger past Postgres FTS; out of scope, named once.
- Reinforce: the route handler's schema is identical across all three; only the `/lib` query function changes. That's the payoff of decoupling and it foreshadows the pure-function section.

**Components.**
- `Code` block: `q` added to the schema (one line), plus a sketch of the ILIKE branch in the query helper marked clearly as "the SQL layer's choice, not the handler's" (a comment pointing to Ch 038/039). Keep the SQL minimal and recognition-level.
- `TabbedContent` (3 tabs: ILIKE / FTS / External) — each tab a short prose card + a one-line SQL/identifier sketch showing the *same* `q` feeding three different operators. Pedagogical goal: make "schema fixed, operator swappable" visual. This is conceptual comparison of non-code-primary panels, so `TabbedContent`, not `CodeVariants`. Keep each panel tiny.

No exercise here — the section is a recognition-level decision, and the operator SQL belongs to other chapters; an exercise would either re-teach SQL (out of scope) or test trivia. Keep it tight.

### Paginating: the envelope and the opaque cursor

The richest section. Two beats: the **response envelope** and the **cursor at the wire**.

**The envelope.**
- `{ data: Invoice[], pageInfo: { nextCursor: string | null, hasMore: boolean } }`. Teach **why a top-level object, never a bare array**: future fields (total count, applied-filter echo, search rank) land in the envelope without breaking the contract; a `[]`-returning v1 forces a breaking v2. This is mental-model #3 — give it a clear "here's the bug you're preventing" framing.
- **Empty result is `200` with `{ data: [], pageInfo: { nextCursor: null, hasMore: false } }`, never `404`.** The resource is the *list* (which exists and is empty), not the items. One crisp paragraph; callback to L3's status discipline.

**The cursor at the wire.**
- `cursor` is an **opaque base64url token** the client treats as a string and the server decodes. The wire-level contract: never expose the inner JSON; the base64 wrapper *signals* opacity and stops clients hand-constructing cursors (which would calcify the contract). This is the wire-boundary discipline — **the keyset SQL itself (the `{sortKey,id}` shape, the tiebreaker, the WHERE predicate) is already taught in Ch 038 L6**; this lesson's job is the *encoding/validation at the API edge*: decode base64 → `safeParse` the inner JSON with a `CursorSchema` → hand the validated `{sortKey,id}` to the query helper. Show the decode+parse, point to Ch 038 for the predicate.
- **The fetch-n+1 has-more trick at the wire:** request `limit + 1` rows, if you get `limit + 1` back there's a next page — slice to `limit`, set `hasMore: true`, and encode `nextCursor` from the last *returned* row. (Ch 038 L6 taught this for the SQL; here it's where `hasMore`/`nextCursor` in the envelope come from.) One tight worked passage.
- **`limit` is `z.coerce.number().int().positive().max(100).default(20)`** — restate the ceiling as mental-model #2 in action. The hard `.max(100)` is *part of the contract*; without it the first careless `?limit=999999` brings the DB down. Default 20, ceiling 100, both documented.
- **Cursor vs offset, the API default.** Cursor is the default (stable across concurrent writes — rows don't double-count or vanish across pages). Offset is opt-in for "page 3 of 7" affordances on small admin tables. Name the in-app reflex is Ch 060's; this sets it for the wire. Do not re-teach the offset-vs-cursor *mechanics* (Ch 038 L6) — state the decision, point back.

**Components.**
- `DiagramSequence` (its own card — do **not** wrap in `<Figure>`): the **request→response→next-request cursor loop**, 4–5 steps. Step 1: client GETs page 1 (no cursor). Step 2: handler reads `limit+1`, gets 21 rows. Step 3: slice to 20, encode `nextCursor` from row 20, return envelope with `hasMore:true`. Step 4: client sends `?cursor=…` for page 2. Step 5: last page returns `<limit` rows → `nextCursor:null, hasMore:false`. Pedagogical goal: make the opaque-cursor round-trip and the n+1 trick concrete and temporal — this is the concept students most misvisualize, and the scrubbable sequence is the right vehicle. Each step caption is one line. Keep panels compact (boxes + the evolving envelope JSON).
- `Code` block: the final `ListInvoicesQuery` schema (now complete — filter+sort+search+paginate) and the `CursorSchema`. This is the first time the full schema appears, by design (sequencing).

**Exercise (this section):** a `MultipleChoice` (multi-select aware) checking the envelope/cursor judgment that can't be tested in a Zod runtime — e.g. "Which are true of this list endpoint?" with correct picks {empty result → 200 not 404; cursor is opaque/base64 so clients don't build it; `limit` needs a hard ceiling} and distractors {bare array is fine if documented; 404 on no matches; offset is the safe default under concurrent writes}. Rationale: the pagination *decisions* are judgment, not syntax; MCQ is the right check and avoids a sandbox the runtime can't support.

### One query, two callers: the shared `where`-builder

The pattern-thread payoff and the conceptual climax of the lesson — place it after all four dimensions so the assembled `where`/`orderBy`/`limit`/cursor logic exists to be lifted.
- **Lift the assembly into a pure function** `buildInvoiceListQuery(parsed)` in `/lib/invoices/list-query.ts` (sits beside the `createInvoice` mutator from L2 — same `/lib` discipline) that takes the parsed query and returns the Drizzle condition pieces (`where`, `orderBy`, `limit`, cursor predicate). It is a pure function: no `Request`, no `Response`, no DB execution — just the query *description*. Tenant scoping (`and(eq(invoices.orgId, ctx.orgId), …)`) is threaded in; name `tenantDb` as the structural enforcement owned by Ch 059, don't build it.
- **Reveal the second caller.** The route handler imports `buildInvoiceListQuery`; the **in-app Server Component list view (Ch 060) imports the same function** and reads the same `searchParams`. One source of truth for list query logic across the wire boundary and the in-app boundary. This is Architectural Principle #3's third appearance in the chapter (after L2's shared mutator) — call that lineage out explicitly so the student sees the recurring move: *the wire format is the variable, the query/business logic is the constant.*
- **Where the line sits between this lesson and Ch 060.** The route handler is for **external callers** (mobile, partners, BFF) or the rare in-app endpoint a Client Component must `fetch` because it can't be a Server Component (the TanStack Query trigger, Ch 076/077). The **in-app** list — where the user's URL bar *is* the state and a Server Component reads it — is Ch 060's `nuqs` pattern. The shared builder is the seam that keeps both honest. Make this boundary explicit so the student doesn't expect this lesson to build the `nuqs` UI.

**Components.**
- `CodeVariants` (2 tabs, the synthesis visual): **Tab "Route handler"** (parses `searchParams`, calls `buildInvoiceListQuery`, executes, returns the envelope) vs **Tab "Server Component (Ch 060, preview)"** (awaits `searchParams`, calls the *same* `buildInvoiceListQuery`, renders rows). Highlight the **byte-identical `buildInvoiceListQuery(parsed)` call** in both tabs (quoted-token highlight) — that's the whole point, mirroring L2's two-seams `createInvoice(input)` treatment so the student recognizes the recurring pattern. The Server Component tab is explicitly labeled a forward-preview, not built here.
- `Figure` with a small `FileTree`: where the pieces live — `db/queries/invoices.ts` or `lib/invoices/list-query.ts` (the builder), `app/api/invoices/route.ts` (handler), and a greyed `app/invoices/page.tsx` (Ch 060's future caller). Grounds the `/lib` discipline visually and reinforces "no business logic in the handler."

### Name-once knobs and the ceilings that protect the database

A short closing section folding the remaining brief bullets that don't merit their own beat — but framed around the unifying idea "**a list endpoint is a contract with the database's safety as a clause**," not as a tips dump (per the brief, watch-outs live with their concept; these are genuinely small *decisions*).
- **`?include=…` / `?fields=…` field selection — name once, default off.** Internal handlers serve the canonical response shape; the typed client takes what it needs. Reach for projection/expansion *only* for an externally published API that pays the contract complexity off. Default: fixed shape per endpoint.
- **The `count` decision — name once.** A `total` for "showing 1–20 of 1,247" triggers a second `SELECT COUNT(*)` that scans the table — expensive at scale. Default: omit `total`; opt in via `?withCount=1` for admin lists, or approximate via `pg_class.reltuples` on very large tables. The envelope already has room for it (callback to mental-model #3).
- **The index reflex restated as the closing senior anchor.** Every sortable/filterable column the schema's allowlist sanctions must be covered by a composite index leading with the tenant column (`(orgId, sortColumn, id)`). A sortable column without an index makes every list page scan the table and slow linearly. The how is Ch 039; the *reflex* — "the allowlist and the index set are the same set" — is the durable takeaway. End the lesson on this: the query schema and the index strategy are two views of one decision.

### External resources (optional, LinkCards)

`ExternalResource` cards: MDN `URLSearchParams` (the `getAll` vs single-value behavior the section leans on), and the JSON:API or a well-known public API's pagination docs (Stripe's list/`has_more`/cursor convention) as a real-world envelope reference. Keep to 2 cards max; only if they add beyond the prose.

---

## Terms for `<Term>` tooltips

Be strategic — only terms that support the lesson's goals and aren't already defined in-flow:
- **BFF** (Backend-for-Frontend) — appears when naming the route handler's external callers; non-obvious acronym.
- **Keyset pagination** — the technique name behind cursors; defined fully in Ch 038, re-gloss in one line here so the wire-boundary discussion doesn't force a back-click.
- **Trigram index** — appears in the search-operator tier; one-line gloss (n-gram index enabling fast `ILIKE`), full treatment Ch 039.
- **FTS** (Full-Text Search) — acronym, glossed where the `tsvector` tier is named.
- **Opaque token** — the property that makes a cursor "opaque"; one-line so the "don't hand-build cursors" point lands.

Do **not** Term-define: `safeParse`, `z.coerce`, `ILIKE`, `where`/`orderBy` — all established in prior lessons/units; defining them again is noise.

---

## Scope

**This lesson covers:** the list-endpoint query schema (the four dimensions: filter as enum allowlist incl. multi-value, prefix-form sort with column allowlist, bounded free-text search, cursor+limit pagination); the `searchParams`→object parse incl. the `getAll` multi-value gotcha; filter normalization; the `{data, pageInfo}` response envelope; the opaque base64 cursor *at the wire boundary* (decode + `safeParse` + the n+1 has-more trick + `nextCursor` encoding); the `limit` ceiling; cursor-vs-offset as the API default decision; the shared `where`/`orderBy` builder pure function in `/lib` consumed by the handler and (preview) the in-app Server Component; name-once treatment of `include`/`fields`, `count`, and the index reflex.

**Explicitly NOT in this lesson (prerequisites — restate in one line only, do not re-teach):**
- **The keyset-pagination SQL** — the `(sortKey, id)` predicate, the mandatory tiebreaker, the composite index cursors depend on, offset-vs-cursor mechanics: **already taught in Ch 038 L6**. This lesson consumes it at the wire; restate the predicate's existence in one line and point back.
- **`route.ts` shape, named-method exports, `params` Promise, dynamic-by-default** — Ch 046 L1.
- **The four-input-sources parse posture, `safeParse` vs `parse`, `searchParams` is strings + `z.coerce` bridge, response-schema-as-allowlist, `problem()`/`parseOr422()`, the one-schema-two-callers synthesis** — Ch 046 L2. Reuse these helpers in snippets without re-deriving.
- **Status codes (200/404/422) and the 404-not-403 tenant rule** — Ch 046 L3. Reference, don't re-table.

**Explicitly NOT in this lesson (deferred — name once where relevant, point forward):**
- **The search-operator SQL** — `pg_trgm`/GIN trigram index declaration (Ch 039 L1), ILIKE/`tsvector`/`plainto_tsquery` operators (Ch 038). Recognition-level only here; the schema sees `q` as a string.
- **The in-app URL-state list view** — `nuqs`, `searchParamsCache`, the Server-Component-reads-and-writes pattern, active-filter chips, typed-vs-committed search input: **Ch 060** (the complementary boundary — make the boundary explicit, build none of it).
- **The Client-Component fetcher** that calls this handler — TanStack Query, `useInfiniteQuery`, the dual fetcher split: **Ch 076/077**.
- **Tenant scoping mechanics** — the `tenantDb(orgId)` factory enforcing scope structurally: **Ch 059**. Thread `orgId` into the `where` in snippets; name the helper, don't build it.
- **The optimistic-concurrency surface for updates** (version column, 409): Ch 061 L3 — out of scope, not a list concern.
- **OpenAPI generation** of the query schema: named once in Ch 046 L2, not built.
- **Rate-limiting** the list endpoint (429/`Retry-After`): Ch 081 — out of scope.

---

## Notes for downstream agents / deviations from conventions

- **Schema shape per Code conventions §Schemas-with-Zod-4:** query-source schemas use plain `z.object` (not `z.strictObject` — unknown query params should be *ignored*, not rejected; strictObject is L2's rule for *body* schemas only — state this distinction so a reviewer doesn't "correct" it). Top-level format builders (`z.uuid()` etc.). The cursor's inner JSON is parsed with `safeParse` (untrusted wire input) — never `parse`.
- **Drizzle per §Data-layer:** operator helpers `eq`/`and`/`inArray`/`asc`/`desc`; tenant filter in the `where` via `tenantDb(orgId)` (named, Ch 059); the builder lives in `db/queries/invoices.ts` *or* `lib/invoices/list-query.ts` — pick `db/queries/invoices.ts` to match the convention's "tenant-scoped read helpers, verb-led, one file per entity" (`listInvoices`); reconcile the L2 outline's `/lib/invoices.ts` mutator location by noting the *mutator* stays in `lib/invoices.ts`, the *read builder* belongs in `db/queries/invoices.ts`. Flag this split for coherence.
- **Deliberate simplification:** snippets show the handler executing the built query inline for readability; the convention's full `tenantDb`-closure + `db.query.invoices.findMany` shape is named, not always spelled out. Note this so it's not read as sloppy.
- **`limit + 1` n+1 trick** and **opaque base64 cursor** must stay terminologically consistent with Ch 038 L6's treatment (same names: tiebreaker, `hasMore`/`hasNext` — check Ch 038 L6's exact field name and match it; the chapter outline uses `hasMore`, Ch 060 L4 TOC uses `hasNext` — **resolve to one and flag the discrepancy to the orchestrator**).
- **No live route-handler sandbox** is possible (`ReactCoding` is react-only; route handlers + Drizzle can't boot in-iframe). Assessment weight therefore sits on the **`ZodCoding`** schema exercise (filtering section) + the **`MultipleChoice`** judgment check (pagination section); both are runtime-appropriate. Do not attempt a Sandpack route-handler sandbox.
