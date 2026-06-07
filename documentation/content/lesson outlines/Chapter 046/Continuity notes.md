# Chapter 046 — Route handlers and API contracts

## Lesson 1 — When to reach past Server Actions

**Taught.** The five triggers that flip a mutation from Server Action to `route.ts` (non-React callers, webhooks, GET endpoints, streaming/large bodies, custom HTTP semantics); the default rule (React-caller-on-this-app → action); the `route.ts` file shape; the dynamic-by-default caching posture.

**Cut.** The chapter-outline "Watch-outs" list is folded into prose, not enumerated; `export const revalidate` legacy segment-config form omitted entirely (Cache Components `'use cache'`/headers only).

**Debts (promised to later lessons).**
- Zod request/response contract, `safeParse` schemas, RFC 9457 Problem Details → L2 (gestured here with `// covered in the next lessons` comment).
- Method-by-intent + status-code table (`201` shown but not justified) → L3.
- List filter/sort/search → L4.
- Webhook signature verification + dedup → Ch 063 (only `await request.text()` shown as *why*).
- Streaming/SSE/AI `streamText` mechanics → Unit 22.
- `authedRoute(role, schema, handler)` wrapper build → Ch 057 L3 (named as the action-wrapper twin).
- Full HTTP caching → Ch 032 / Unit 14.
- Client-Component-must-fetch GET case → Ch 076 (TanStack Query).
- Hono-inside-route-handler / OpenAPI published-API track → named once, out of scope.

**Terminology / mental models established (later lessons must reuse).**
- "The Server Action envelope" — POST-only, React-caller-only, free revalidation, ~1 MB body cap (`serverActions.bodySizeLimit` default `'1mb'`), opaque action ID, returns `Result`, progressive enhancement.
- The decision question: **"is the caller a React component on this same Next.js app?"** Decision tree asks **caller identity first**, then raw-HTTP need.
- "Two seams, one trust posture" — action and handler are both untrusted-input boundaries; **same five seams** `parse → authorize → mutate → revalidate → return`, only last two differ: revalidate → cache headers / `revalidateTag(tag, profile)`; return `Result` → return `Response`.
- `NextRequest` glossed as "thin superset of Web `Request` with `.nextUrl`, `.cookies`, geo helpers"; `NextResponse` as "`Response` superset with `.json()`, cookie, redirect helpers."
- `RouteContext<'/path'>` — globally-available generated helper type (no import) typing `params`.

**Patterns / best practices (project codebase must follow).**
- Method handlers are **named exports** (`GET`, `POST`, …), one function per method; no fat handler with `if (method === ...)` switch.
- API routes live under `app/api/<...>/route.ts`; a segment is **either** `page.tsx` or `route.ts`, never both.
- `params` is a `Promise` in Next.js 16 — `await` before use (flagged as #1 migration gotcha).
- `revalidateTag` is always two-arg `revalidateTag(tag, profile)`, `'max'` default.
- Route handlers **dynamic by default**; cache only public/shareable data via explicit `Cache-Control` (e.g. `public, s-maxage=60, stale-while-revalidate=300`) or `'use cache'`. Never `Cache-Control: public` on per-user data.
- `'use cache'` **cannot** sit directly in a route-handler body — extract to a helper and mark that.
- Let the framework auto-return `OPTIONS` (CORS preflight) and `405` (with `Allow` header); hand-write `OPTIONS` only when headers must diverge.
- No parallel router (Principle #5) — `route.ts` files are the API surface; no Hono/tRPC/Express-on-the-side.

**Misc.** Trigger-list reconciliation: lesson uses the chapter-outline's clean five, not `Code conventions.md`'s framework-named-files variant; later lessons should reference these five names. Components used: `Card` (envelope), `StateMachineWalker` (decision tree, kind="decision"), `Buckets` (8-item sort drill), `FileTree`, `AnnotatedCode` (skeleton GET+POST handler), `CodeVariants` (dynamic vs cached), `Figure`+`SeamMapping` (seam-mapping table, lesson-local component at `lessons/046/1/`), `VideoCallout` (Tobi Mey, videoId `NWx8oVLEdwE`), `Term` (BFF, HMAC glosses).

## Lesson 2 — Wire contracts as Zod schemas

**Taught.** The route-handler contract as Zod-in-both-directions: four input sources each with its own schema + `safeParse` (path params, headers, query, body), parsed cheapest-first with short-circuit; typed response schemas validated on the way out with `parse`; RFC 9457 Problem Details (`application/problem+json`) error body via a `problem()` helper and a `parseOr422()` helper; the one-schema-one-mutator-two-callers synthesis (shared `/lib` schema + pure mutator, action and handler as thin wire-format seams).

**Cut.** Of the chapter-outline L2 topics, these were named-once-only (not built): OpenAPI-from-Zod generator (`next-openapi-gen`/`@hono/zod-openapi`), contract-changelog/versioning discipline, content negotiation beyond a one-line `Accept` mention; the chapter-outline "Watch-outs" list folded into prose, not enumerated.

**Debts (promised to later lessons / referenced earlier).**
- Full HTTP status-code table + 400-vs-422 line (only 422-for-schema-fail taught), method-by-intent, idempotency operationalization → L3 (MCQ explanation explicitly points there).
- `Idempotency-Key` header *named* as a data-carrying header a `HeadersSchema` might parse; dedup mechanics → L3.
- Filter/sort/search/paginate query authoring → L4 (only "`searchParams` is strings, bridge with `z.coerce`/`z.preprocess`" established).
- Webhook signature over `request.text()` raw bytes → Ch 063 (accessor shown, HMAC not).
- `request.body` as `ReadableStream` streaming → Unit 22 (named as 4th body accessor).
- OpenAPI generator → named once, gated on "is this API published externally," not built.
- Refers back to: Ch 042–043 Zod/`safeParse`-vs-`parse`/`Result` shape; Ch 011 RFC 9457 from consumer side; Ch 045 L3 `applyServerErrors` / `/lib/schemas/invoice.ts`.

**Terminology / mental models established (later lessons must reuse).**
- Anchor sentence: **"the body is `unknown` until you parse it — the type TypeScript infers at the wire boundary is a lie the schema makes true."**
- The four input sources and their accessors: path params via 2nd arg `{ params }` (a `Promise`, `await` then parse), headers via `request.headers.get(...)`, query via `request.nextUrl.searchParams`, body via `request.json()`/`text()`/`formData()`/`request.body`.
- Parse order = **path params → headers → query → body**, cheapest disqualifier first, short-circuit on first failure; "a handler's first few lines are nothing but `safeParse` calls and short-circuits."
- **`safeParse` inbound, `parse` outbound** — direction-dependent split; outbound `parse` throw is intentional (response mismatch = programmer error → 500), reviewers must not "fix" it to `safeParse`.
- "The response schema is the allowlist" — a field the schema doesn't declare doesn't ship (leak-prevention).
- Problem Details five fields `{ type, title, status, detail, instance }` + `errors` extension member; `type` URI **is** the machine-readable error code, one URI per error class, per-instance message in `detail`.
- The **flat `fieldErrors` bridge**: `z.flattenError(result.error).fieldErrors` → `Record<string, string[]>`, byte-identical shape across handler `errors` extension, action `Result.error.fieldErrors`, and RHF `applyServerErrors` — one renderer serves both seams.
- One-line rule: **"stay HTTP-native at the handler boundary, stay JS-native at the action boundary, share the field vocabulary in the middle."**
- Synthesis anchor: **"any time a handler and an action would duplicate business logic, the shared mutator is the seam — the wire format is the variable, the logic is the constant."**

**Patterns / best practices (project codebase must follow).**
- One Zod schema per input source; `BodySchema` uses `z.strictObject` (unexpected key = client bug → 422), other sources `z.object` default.
- Top-level format builders (`z.uuid()`, etc.); `z.flattenError` (flat shape) everywhere field errors interoperate — never `z.treeifyError` for the `Result`/Problem path.
- Helpers live in `/lib/api` (`problem(status, code, options?)`, `parseOr422(schema, input)`); shared input schema in `/lib/schemas/invoice.ts`; pure mutator (`createInvoice(input)`, no `Request`/`Response`/`FormData`) in `/lib/invoices.ts`; action seam in `app/invoices/actions.ts`; handler seam in `app/api/invoices/.../route.ts`.
- Every error response goes through `problem()` (zero drift); content type `application/problem+json` is mandatory and the easy-to-forget bit.
- Schema-failed body → **422** (the one status taught here); response success may carry e.g. 201.
- Validate response on the way out (`schema.parse(data)`) for **public** APIs; type-only return (`satisfies`/explicit return type, no runtime parse) for **internal** handlers.
- `parseOr422` modeled as **throwing a `Response` the handler boundary returns** — flagged as a deliberate teaching simplification of error plumbing (real code might return a discriminated result), keep one-line call site `const body = parseOr422(schema, await request.json())`.

**Misc.** Worked invoice schema/mutator names: `createInvoiceSchema` (input, `/lib/schemas/invoice.ts`), `createInvoice(input)` (mutator, `/lib/invoices.ts`), `invoiceResponseSchema` + `type InvoiceResponse = z.infer<...>` (response). `titleFor(code)` is an in-module lookup record mapping error code → human title, not an import. Components used: `DiagramSequence` (parse gauntlet, own card, not in `Figure`), `AnnotatedCode` (inbound skeleton; `problem()` helper), `CodeVariants` (response-shape 3-way; two-seams 2-tab with byte-identical `createInvoice(input)` highlight), `ZodCoding` (response allowlist, schema-only — runs real Zod via esm.sh, no Next.js), `Figure` (action-vs-handler table; file-layout `FileTree`), `MultipleChoice` (422 + content-type), `Sequence` (handler-skeleton order drill), `VideoCallout` (Jan Marshal "Master Zod in Just 30 Minutes", videoId `f-4-k1CP6wA`), `ParseGauntlet` (lesson-local component at `lessons/046/2/`, drives the parse-gauntlet DiagramSequence via `active`/`failedAt` props).

## Lesson 3 — Methods, status codes, and idempotency

**Taught.** Method-by-intent (GET/POST/PUT/PATCH/DELETE, each as *what the request line declares*); the senior status-code subset by class (2xx/3xx-brief/4xx-deep/5xx) with the reviewer's decision-tree question order; the four hard `4xx` lines (400-vs-422, 401-vs-403-vs-404, 409, 429); the `Idempotency-Key` claim contract (header → hash-with-route+tenant → `INSERT ... ON CONFLICT DO NOTHING` claim → cached-response-on-replay), at recognition level only.

**Cut.** Conditional-request surface (`If-Match`/`If-None-Match`/`ETag`/412) demoted from a chapter-outline bullet to one-line mention only; the "cache headers operational reach" bullet dropped (overlaps L1/Ch 032, lesson already runs long); `Location`-and-create-redirect and `Allow`-on-405 folded into prose, not their own beats.

**Debts (promised to later / referenced earlier).**
- `authedRoute(role, schema, handler)` wrapper that returns the 401/403 → Ch 057 L3 (named as the carrier; this lesson shows 401/403 returns inline to make codes visible).
- `tenantDb` helper enforcing 404-by-scope structurally → Ch 059 (named; lesson teaches *which code* the scope leak gets).
- Version-column optimistic-concurrency behind the 409 → Ch 061 L3 (named, not built).
- Full transactional idempotency dedup (`processed_requests`/`processed_events` claim + mutation in one transaction, lost-claim handling, 24h-row sweep) → Ch 063 L2 (charge sketch here is **deliberately non-production**, comment points forward); sweep job → Ch 066.
- 202 background-job body shape (poll URL / job id) → Ch 066; rate-limit wiring (`Retry-After` shape set here, limiter not) → Ch 081; 500 stack-trace-to-observability + `correlationId` body → Unit 14.
- Refers back to: Ch 011 (methods/status/idempotency from consumer side — the "read as client, now author" pivot); Ch 046 L1 (`route.ts` one-export-per-method, no method switch; 413/streaming trigger); Ch 046 L2 (`problem()`/`parseOr422()` reused in every snippet, 422-for-schema-fail, "header that carries data" parsed by `HeadersSchema`, HTTP-native-at-handler/JS-native-at-action); Ch 043 L5 / `useOptimistic` UUID (the Server-Action idempotency twin — hidden form UUID field).

**Terminology / mental models established (later lessons must reuse).**
- Lesson through-line: **"the method and the status code are the contract; the body is only the explanation."**
- **"The method is documentation"** — first signal of intent on the way *in*, read by reviewer/cache/retry-policy/monitor before URL or body.
- **Two senior anti-reflexes:** (1) POST-for-everything throws away free intent ("a `PATCH` wearing a `POST` costume" = `POST .../status` carrying `{status}`); (2) never `200`-with-`{error}` (lies to every generic HTTP tool — status class is what pages on-call, `4xx`=caller's fault/no page, `5xx`=your fault/pages).
- Method discriminator: **state-diff** ("make these fields have these values" → PATCH/PUT) vs **non-idempotent action** ("do this thing with consequences" → POST). `POST /invoices/[id]/cancel` is a genuine action (correct); `POST .../status` is a state-diff in disguise (wrong).
- DELETE second-call response (`404` vs `204`) is a per-project contract choice — pick one, document it.
- **404-not-403 on cross-tenant resources** — refuse access by denying existence; `403` confirms the row exists (an existence leak, a real security finding). The single most important security-shaped status call in the lesson.
- **400-vs-422 line:** `400` = bytes malformed / `request.json()` threw / wrong content type (couldn't read it); `422` = parsed cleanly but failed the schema. The parse step splits them. (Some teams collapse both into `400` — a once-and-everywhere convention, not a per-handler flip.)
- The reviewer's **decision-tree question order** (= the handler's early-return ladder = L2's parse-then-authorize order): parse? → identify caller? → allowed? → exists in tenant? → conflicts with state? → schema valid? → work succeeded?, first "no" picks the code.
- `Idempotency-Key` = client-generated UUID naming the *logical operation* (stable across original + every retry), not the HTTP request. Hash with route+tenant (never bare key) to scope dedup. Header at the handler boundary, hidden form UUID field at the action boundary — "same idea, different envelope."

**Patterns / best practices (project codebase must follow).**
- Method by intent, never POST-for-everything; `POST` reserved for server-named creates and genuine non-idempotent actions.
- Status code states the outcome; error bodies never contradict the status (no `200`-with-`{error}`).
- `201` pairs with a `Location` header at the new resource URL; mutations the client cares about return `200`-with-the-updated-row, not `204` (avoid the client's second `GET`).
- `Retry-After` carries **seconds** (`Retry-After: 30`), never an HTTP date.
- `500` body must **not** leak the stack trace — trace to observability sink, body carries only a `correlationId`; `502/503/504` name *which* upstream failed.
- Let the framework auto-return `405` for unexported methods (never hand-write).
- Every error response still routed through L2's `problem()` (zero drift across handlers).
- Public side-effecting POSTs (charge/email/webhook-fire/create) require `Idempotency-Key`; claim via `INSERT ... ON CONFLICT DO NOTHING` on a `processed_requests`/`processed_events` ledger; production wraps claim+mutation in one transaction (Ch 063).

**Misc.** Lesson-local shorthand types/helpers referenced in snippets (must stay consistent with L1/L2): `RouteContext<'/path'>` = the generated `{ params: Promise<...> }` context type (no import); `getSession(request)` returning `{ roles: string[], orgId }` (auth shown **inline**, not via `authedRoute` — the wrapper is named as the Ch 057 carrier but the snippet inlines `getSession`/`401`/`403` so the codes are visible); `hashKey(key, route, orgId)`, `readCachedResponse(fingerprint)`, `processedRequests` table with a `fingerprint` column, `getInvoiceBySlug(orgId, slug)`, `createInvoice(orgId, input)`, `chargeInvoice(orgId, key)`. The member role is glossed as "any higher role on the org carries it too." Error codes coined: `no-session` (401), `insufficient-role` (403), `invoice-slug-conflict` (409), `idempotency-key-required` (400). Idempotency dedup window default = **24h** (Stripe convention). Lesson is **fully built**. No live-coding sandbox (route handlers can't run in react-only `ReactCoding`); assessment weight sits on `Matching` (method→intent), `Buckets` (8-item status sort, `twoCol`), two `MultipleChoice` (400-vs-422, 403-vs-404), `TrueFalse` (when `Idempotency-Key` is required). Components used: `AnnotatedCode`/`AnnotatedStep` (early-return ladder; idempotency claim sketch — both with `maxLines={18}`), `CodeVariants`/`CodeVariant` (wrong-POST-vs-right-PATCH 2-tab, with `data-mark-color` red/green divs), `Figure` wrapping `StatusDecisionTree` (lesson-local at `lessons/046/3/`, the reviewer's question-order tree — built as a custom astro component, *not* a Mermaid `flowchart LR` as the outline suggested), `IdempotencyReplay` (lesson-local at `lessons/046/3/`, the two-pass replay diagram, rendered on its own outside `Figure`), `Term` (safe, idempotent, optimistic concurrency, `Idempotency-Key`/client-generated UUID), two `VideoCallout` (ByteByteGo "HTTP Status Codes Explained In 5 Minutes" `qmpUfWN7hh4`; Alex Hyett "Idempotency - What it is and How to Implement it" `XAccGbtl3Z8`). External resources (`ExternalResource` CardGrid): MDN HTTP methods, MDN HTTP status codes, RFC 9457, Stripe idempotent-requests.

## Lesson 4 — List endpoints: filter, sort, search, paginate

**Taught.** The four list-query dimensions (filter / sort / search / paginate) as one growing `z.object` query schema parsed `safeParse`; filter as enum allowlist (incl. multi-value via repeated-key + `searchParams.getAll`, empty-string/dedup/empty-array normalization in the schema); prefix-form sort (`-issuedAt`) parsed via `.transform` into `{field, direction}` against a `field→column` lookup record (allowlist enforced structurally by the enum); bounded free-text search (`q`, `min(1).max(100)`) with operator choice (ILIKE/FTS/external) decoupled into the data layer; the `{ data, pageInfo: { nextCursor, hasMore } }` envelope (never bare array), opaque base64url cursor decode+`safeParse` at the wire edge, the `limit+1` has-more trick, `limit` ceiling (`.max(100).default(20)`); the shared pure `buildInvoiceListQuery(parsed, orgId)` builder consumed by both the route handler and (preview) the in-app Server Component.

**Cut.** `?include=`/`?fields=` field selection, the `count`/`?withCount=1` decision, and comma-separated multi-sort all demoted to name-once mentions (default off); chapter-outline "Watch-outs" folded into prose, not enumerated.

**Debts (promised to later / referenced earlier).**
- Keyset-pagination SQL (`(sortKey,id)` predicate, tiebreaker, offset-vs-cursor mechanics) → already taught **Ch 038 L6** (lesson cites it as "the chapter on querying and mutating"); `cursorPredicate` helper named as owning that SQL, not re-derived.
- Search-operator SQL — `pg_trgm`/GIN trigram index → **Ch 039 L1**; ILIKE/`tsvector`/`plainto_tsquery` → Ch 038 (recognition-level only; schema sees `q` as a string).
- Composite-index reflex (`(orgId, sortColumn, id)`) for every allowlisted sort/filter column → "database chapters" (Ch 039); durable rule stated: **"the allowlist and the index set are the same set."**
- In-app URL-state list view (`nuqs`, Server-Component-reads-`searchParams`) → **Ch 060** (boundary made explicit, none built); the shared builder is the seam.
- Client-Component fetcher of this handler (TanStack Query, `useInfiniteQuery`) → Ch 076/077.
- `tenantDb(orgId)` factory enforcing scope structurally → Ch 059 (`eq(invoices.orgId, orgId)` threaded inline; helper named, not built).
- Refers back to: Ch 046 L2 (`searchParams` is strings + `z.coerce` bridge, `safeParse`-inbound, response-as-allowlist, one-schema-two-callers synthesis, `/lib/schemas` + pure-`/lib` layout); Ch 046 L3 (422-on-schema-fail, 404-not-403, 200-not-404 status discipline).

**Terminology / mental models established (later lessons must reuse).**
- **The four query dimensions** — filter / sort / search / paginate; "every list-API design decision reduces to which of these four and what's the convention for each." Color key installed in the intro URL-strip figure: filter=blue, sort=violet, search=orange, paginate=green.
- **"The schema is the allowlist *and* the ceiling"** — declared params only; `sort`/filter fields are enums (an unlisted column can't be asked for), `limit` has a hard `.max()`.
- **Envelope from day one** — `{ data, pageInfo }`, never a bare array; the naked-array v1 that v2 must break is the anti-pattern; `pageInfo` is where `total`/filter-echo/rank land later without a breaking change.
- **Opaque cursor** — base64url-wrapped `{ sortKey, id }` JSON; the wrapper *signals* opacity so clients never hand-build cursors; client treats it as a meaningless string it hands back verbatim.
- **`limit + 1` / fetch-n+1** — read one extra row to source both `hasMore` and `nextCursor` (built from the last *returned* row, not the dropped probe row).
- **"The wire format is the variable; the query/business logic is the constant"** — the synthesis anchor, third appearance of Architectural Principle #3 in the chapter (after L2's shared `createInvoice` mutator); the byte-identical `buildInvoiceListQuery(parsed.data, orgId)` call line in both the route handler and the Server Component is the payoff visual.
- **Cursor by default, offset on purpose** — cursor is the wire default (stable under concurrent writes); offset is opt-in for "page 3 of 7" admin affordances.

**Patterns / best practices (project codebase must follow).**
- Query-source schema uses plain `z.object` (unknown query params *ignored* — `?utm_source` is not a client bug), explicitly contrasted with L2's `z.strictObject` body rule — reviewers must not "correct" it.
- Multi-value params use the **repeated-key form** (`?status=sent&status=overdue`), read with `searchParams.getAll(key)` and overwriting the `Object.fromEntries` single-valued version; CSV form named as the alternative. The `Object.fromEntries`-drops-repeated-keys bug is the canonical query-parse gotcha.
- Sort field is an enum allowlist mapped through a `const SORTABLE_COLUMNS` record; `orderBy = direction === 'desc' ? desc(column) : asc(column)`. Never splice a client string into `ORDER BY`/`sql.raw`.
- Cursor's inner JSON gets `safeParse` (untrusted wire input) → fall back to first page on garbage, never throw 500.
- Empty result → `200` with `{ data: [], pageInfo: { nextCursor: null, hasMore: false } }`, never `404`.
- The `where`/`orderBy`/`limit` assembly lives in a **pure** `buildInvoiceListQuery` (no Request/Response/DB call), imported by both seams.

**Misc.** Resolved two outline-flagged discrepancies: (1) field name is **`hasMore`** (not `hasNext`) — must reconcile when Ch 060 L4 is built; (2) file split — the **read builder** lives in `db/queries/invoices.ts` (`buildInvoiceListQuery`, `listInvoices`) while L2's **mutator** stays in `lib/invoices.ts`; the **schemas** (`listInvoicesQuerySchema`, `cursorSchema`) live in `lib/schemas/invoice.ts`. Standalone composable schema `invoiceSortSchema` is pulled out as its own export (full query schema and Ch 060 both compose it). Snippets deliberately show the handler executing the built query inline (`db.query.invoices.findMany({ where, orderBy, limit })`) as a simplification of the real `tenantDb`-closure shape. Lesson is **fully built**. Worked-snippet helper names later lessons must stay consistent with: `parseListQuery(searchParams)` (returns the `safeParse` result), `toEnvelope(rows, limit)` (builds the `{ data, pageInfo }` envelope), `cursorPredicate(cursor, sort)` (the keyset decode+WHERE helper, Ch 038), `requireOrgUser()` returning `{ orgId }` (auth shown via this call inline, not `authedRoute`); the in-app Server Component preview calls `notFound()` on a `searchParams` parse failure (vs the handler's `422`). Empty-string/dedup/empty-array filter normalization is done with **`z.preprocess`** (strips empties *before* the enum runs — the ordering is taught explicitly). Sort enum lists **both** the bare and `-`-prefixed forms (`['issuedAt','-issuedAt','total','-total','status','-status']`) with `.default('-issuedAt')`, then `.transform` splits the prefix. `cursorSchema` shape is `{ sortKey: z.union([z.string(), z.number()]), id: z.uuid() }`. No live route-handler sandbox possible; assessment sits on a **`ZodCoding`** filter-schema exercise (`schemaName="listInvoicesQuerySchema"`, runs real Zod via esm.sh) + a multi-select **`MultipleChoice`** pagination-judgment check. Components used: `Figure`-wrapped **`UrlDimensionStrip`** (lesson-local at `lessons/046/4/`, the HTML/CSS four-dimension URL strip), `AnnotatedCode`/`AnnotatedStep` (searchParams `getAll` assembly, `maxLines={10}`), `CodeVariants`/`CodeVariant` (free-vs-enum sort with red/green `data-mark-color` divs; two-callers synthesis 2-tab with byte-identical `buildInvoiceListQuery` highlight), `CodeTooltips` (sort schema + `SORTABLE_COLUMNS` lookup), `TabbedContent`/`TabbedItem` (3 search-operator tiers), **`CursorRoundtrip`** (lesson-local at `lessons/046/4/`, the scrubbable cursor round-trip — rendered on its own outside `Figure`), `Figure`+`FileTree` (where pieces live), `MultipleChoice`/`McqChoice`/`McqWhy`, `VideoCallout` (PlanetScale "Pagination in MySQL — offset vs. cursor", videoId `zwDIN04lIpc`), `CourseProgressBar`. `<Term>` glosses: BFF, keyset pagination, trigram index, FTS. (Build deviations from the spec: the outline's `DiagramSequence` cursor loop shipped as the bespoke `CursorRoundtrip` component; the specced "opaque token" `<Term>` was folded into prose.) External resources (`ExternalResource` CardGrid): MDN `URLSearchParams.getAll`, Stripe API pagination, Use-The-Index-Luke No-Offset, PostgreSQL `pg_trgm`.
