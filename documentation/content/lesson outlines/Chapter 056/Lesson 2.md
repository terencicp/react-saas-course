# tenantDb(orgId): making the missing-where not compile

- **Title:** Making the missing org filter not compile with tenantDb
- **Sidebar label:** The tenantDb helper

## Lesson framing

This is a **pattern lesson**, not a setup lesson. The single durable idea: in a multi-tenant SaaS the worst bug class is a tenant-owned read that forgot its `where eq(organizationId, …)` — one fast PR returns another company's data — and the senior move is to make that omission **fail to compile**, not merely fail review. The student builds `tenantDb(orgId)`, a thin typed wrapper over Drizzle's query API that injects the org predicate on every read and every write.

The **wrong-then-right archetype carries the lesson** (chapter outline names this explicitly). Open on the bug that survives code review precisely because the missing filter looks identical to every legitimate "fetch by id". Then the reframe — defense isn't more diligence, it's a call shape where forgetting doesn't typecheck — then the helper signature, then the helper applied in the canonical three-line action shape.

Target student: junior dev, has Drizzle vocabulary (Unit 5), the five-seam Server Action shape (Unit 6), and from Lesson 1 of this chapter `requireOrgUser()` returning a trusted `{ user, orgId, role }`. The cognitive-load risk here is the **type-level machinery** (a table registry that makes `tenantDb(orgId).query.users` a type error). Stage it: get the runtime behavior working and obviously correct first (the filter is injected, the bug is gone), *then* layer the type-level registry as the thing that turns a runtime backstop into a compile-time guarantee. Do not lead with generics.

Two senior framings run throughout and must not be diluted into a tips section:
1. **The Principle #5 carve-out.** The course's standing rule is "consume libraries directly." `tenantDb` is a sanctioned exception — name it explicitly, the same shape as the `authedAction` carve-out coming in Chapter 057. Direct Drizzle stays correct for cross-org admin scripts and migrations; `tenantDb` is mandatory for any request-handled tenant read. This is *why we are allowed to wrap a library*, taught at the moment we wrap it.
2. **The helper is structural, not a safety net.** The single most important phrasing distinction in the lesson: do **not** say "if you forget the filter, the helper saves you." It doesn't run if you don't call it. It makes the unscoped call shape *unwriteable*. The protection is that `db.select().from(invoices)` (the unwrapped client) is the only way to skip the scope, and that import line is review-loud and lint-flagged.

Mental model to leave with: two clients in the codebase. `db` — raw, omnipotent, used in admin/scripts/migrations, visible by its import. `tenantDb(orgId)` — the only client a request handler reaches for; every call it exposes is org-scoped by construction; `orgId` only ever comes from `requireOrgUser()`.

End state — the student can: explain the missing-`where` bug class and why review can't reliably catch it; write `tenantDb(orgId)` as a small typed factory; explain how the table registry makes a non-tenant table a type error; compose it with `requireOrgUser()` into the canonical action shape; and articulate when to deliberately reach past it to raw `db`.

Code-component strategy: this lesson is mostly TypeScript surfaces, so lean on `CodeVariants` for the wrong/right archetype and the naming alternatives, `AnnotatedCode` for the helper internals (multiple parts of one file need sequential attention), and `CodeTooltips` for surfacing inferred types at the call site. No runnable React sandbox — Drizzle can't load in the ReactCoding iframe (known constraint). Understanding checks are `TypeCoding` (the registry as a real type error the student fixes), `CodeReview` (spot the missing scope in a PR — the canonical exercise for this exact bug), and one `Buckets` (tenant vs global table classification). One type-shape diagram (HTML+CSS) visualizes registry → typed helper → scoped builder.

Naming/coherence note: Lesson 1 shipped the **plugin-owned singular** table names `organization` / `member` (NOT the `organizations` / `org_members` the chapter-framing prose used — the continuity notes flag this contradiction and Lesson 1 won). This lesson must use `organization` / `member` and the plural-camelCase app tables `invoices` / `customers` for the tenant-data tier examples. `requireOrgUser()` and `db` both live in files Lesson 1 / conventions established (`@/lib/auth.ts`, `@/db`). The helper lands at `@/db/tenant.ts` (conventions put the data layer under `db/`, not `lib/db/`; chapter outline's `src/lib/db/tenant.ts` is overridden by the conventions' `db/` layout — note this deliberate divergence for downstream agents).

---

## Lesson sections

### One missing where and a customer sees another company's invoice

Introduction + threat. Open with the concrete production scene (chapter outline's framing): a reviewer approves `db.select().from(invoices).where(eq(invoices.id, id))` in a fast PR. It looks like every other fetch-by-id. It returns the row whether or not it belongs to the requester's org; the route renders it; a customer's dashboard now shows a different company's invoice. State the stakes plainly — this is the highest-severity bug class in multi-tenant SaaS, and it is *invisible in review* because the absence of a filter looks like the absence of nothing.

Connect to what they know: in Lesson 1 they built `requireOrgUser()` which hands back a trusted `orgId`. They have everything needed to scope — the bug is purely that scoping is *optional and easy to skip*. Preview the lesson goal in one line: by the end, the unscoped read won't compile.

Use a `CodeVariants` with two tabs to make the bug visceral:
- **"Looks fine in review"** — the unscoped query, with prose noting nothing on this line signals a defect.
- **"What it actually returns"** — same query annotated (comment or adjacent note) showing it can return any org's row; frame that the manual fix `and(eq(invoices.organizationId, orgId), eq(invoices.id, id))` is correct but *the next developer will forget it*.

Keep the "manual filter" tab honest: it works. The lesson's claim is not that manual scoping is wrong, it's that **optional correctness is the bug**. This sets up the reframe cleanly.

`Term` candidates here: **multi-tenant** (one app instance serving many isolated customer orgs), **tenant-owned table** (a table whose rows each belong to exactly one org via `organizationId`).

### Defense is a call shape, not more diligence

The reframe — the pivot of the lesson. Short, high-signal section. State the senior principle directly: you cannot review your way out of a bug whose signature is *the absence of a line*. Reviewers habituate; the missing filter passes on the tenth PR even if it's caught on the first. The structural defense is to change the *shape of the call* so that the scoped query is the only one that can be written, and the unscoped one requires reaching for a visibly different tool.

Introduce the two-clients mental model here as the spine for the rest of the lesson (raw `db` vs `tenantDb(orgId)`). Name what each is for in one sentence each. This is also where the **Principle #5 carve-out** gets named: the course says consume libraries directly; here is a sanctioned wrapper, and the rule for the wrapper is "wrap the read path, leave an escape hatch for the legitimate cross-org reach." Foreshadow that `authedAction` (Chapter 057) is the same carve-out at the action boundary — the data layer and the action boundary are two arms of one discipline.

No code in this section beyond maybe a one-line before/after teaser (`db.query.invoices.findMany(...)` → `tenantDb(orgId).query.invoices.findMany(...)`); its job is conceptual. A small inline `Aside` (note) can hold the "two carve-outs, two layers" forward-reference so it doesn't clutter prose.

### The helper: wrap the query API, inject the predicate

The first build. Goal: a working `tenantDb(orgId)` whose relational reads compose the caller's `where` with the org predicate. **Stage for low cognitive load** — this section delivers the runtime behavior and the call site; the *type-level* registry is deferred to the next section. Say so explicitly to the student ("first we make it correct at runtime; next we make the type system enforce it").

Lead with the **call site**, then the implementation — the student should see what they're aiming for before the internals. Canonical call:

```
const db = tenantDb(orgId);
const rows = await db.query.invoices.findMany({ where: eq(invoices.status, 'open') });
```

Then the implementation via `AnnotatedCode` (one file, several parts each needing focused attention — exactly its use case). Steps to highlight, in order:
1. The factory signature `tenantDb(orgId: string)` and that it returns an object exposing a `query` surface (frame: we expose the subset the app uses, not a full re-implementation of Drizzle).
2. The relational read wrapper: for a tenant table, intercept `findMany` / `findFirst` and compose `where` as `and(eq(table.organizationId, orgId), callerWhere)`.
3. The `and()` composition detail (this is its own short concern): when the caller's `where` is `undefined`, supply just the org predicate; when present, `and` them. Note `and(undefined, x)` is safe in Drizzle but we make intent explicit.
4. A pointer that writes (`insert`/`update`/`delete`) are wrapped too — covered in the next section so the read story stays clean.

Conventions to honor in the sample: arrow-function factory bound to `const`, named export, explicit return type on the exported function (it's an exported function *and* the signature is the lesson — both triggers from the TS conventions fire), `import 'server-only'` at the top (it touches the DB client), 2-space indent, single quotes.

Then a focused note on **the `or()` robustness proof** (chapter outline calls this out and it's a satisfying "why this is airtight" beat): a caller who writes `or(eq(organizationId, otherOrgId), eq(status,'open'))` to escape scope still gets `and(eq(organizationId, orgId), or(...))` — the outer `and` pins the org, so the other-org branch becomes a logical contradiction and the effective scope holds. Present as the reassurance that the helper is robust against both accidental omission and a curious developer. Keep it tight — a 3-line code snippet plus two sentences; do not over-rotate into SQL logic.

`CodeTooltips` opportunity on the call-site block: hover the returned `db` to show its narrowed type (only the scoped surface), reinforcing "this isn't the raw client."

### Writes: inject on insert, predicate on update and delete

Second build, completing the read story. Three write shapes, each one short:
- **`insert`** — inject `organizationId: orgId` into every row's values. If the caller already passed an `organizationId`, **throw** — a mismatch is a programmer bug, and per the error-handling convention we throw on impossible situations, not return a `Result`. Frame: the insert can't silently write to the wrong org because the helper owns that column.
- **`update`** / **`delete`** — always `and`-in the org predicate so a write aimed at another org's row affects **zero rows**, never the wrong row. Contrast with the unscoped `update(invoices).set(...).where(eq(invoices.id, id))` which would happily mutate any org's row matching the id.

Make the senior point about **defense in depth at the DB level** without teaching RLS (that's Lessons 3–4): the helper enforces zero cross-org writes at the app layer; FK constraints (e.g. `invoices.customerId → customers.id`) and, for the one table that earns it, RLS are the database backstop. One sentence of foreshadowing, no implementation — link forward to Lesson 3.

Use `CodeVariants` (before/after with `del`/`ins` markers) for the insert case: unwrapped insert that requires the caller to remember the column vs `tenantDb` insert that injects it. The before/after is the clearest way to show the column-ownership shift.

Watch-out to fold in here (not a separate section): returning the raw Drizzle client from inside `tenantDb` "for convenience" defeats the entire wrapper — the only escape is the separately-imported `db`.

### Some tables have no org: the table registry

The type-level guarantee — the section that turns the runtime wrapper into a compile-time one. This is the hardest concept; **introduce the simplified model first**. Frame the problem concretely: `user` and `verification` (the Better Auth global tables) have **no** `organizationId` column. Calling `tenantDb(orgId).query.users.findMany(...)` is nonsense — there's nothing to scope by. We want that call to be a **type error**, not a runtime surprise.

Two-step build:
1. **The runtime backstop first (simple):** a `TENANT_TABLES` set listing the org-owned table names; if a call reaches a table not in the set through this helper, throw. State this is the floor — loud at runtime.
2. **The type-level guarantee (the real win):** key the helper's `query` surface off the registry so only tenant tables are even *accessible*. The student doesn't need to author advanced conditional types from scratch — show the shape (a mapped type over the tenant-table keys, or a union of allowed table names constraining the surface) and explain how it produces the error. The goal is comprehension of *why it's a compile error*, not mastery of type gymnastics.

Visual — **type-shape diagram** (HTML+CSS, in a `<Figure>`): three labeled boxes left-to-right — `TENANT_TABLES registry` (lists `invoices, customers, member, …`) → `tenantDb<…> typed factory` → `scoped query surface` (shows `invoices ✓`, `customers ✓`, `user ✗ not in registry`). Pedagogical goal: make the data-flow from "the set of org-owned tables" to "what the helper will let you call" visible in one glance, so the type machinery feels like plumbing rather than magic. Horizontal layout, cap height, follow the prose-margin reset gotcha. Keep it a flow-of-information picture, not a class diagram.

Exercise — **`TypeCoding`** (perfect fit: the lesson is about a *type*, and the widget never runs code). Give the student a `tenantDb` typed against a small registry and a call to a non-tenant table marked with `// @ts-expect-error`; their task is to add the missing table to the registry (or fix the call) so the directive resolves. Use the `@ts-expect-error` polarity trick from the TypeCoding doc so the student's job stays "make errors go away," and optionally a `^?` query pinning the scoped surface type. This makes "the missing scope is a compile error" something they *feel*, not just read.

`Term` candidate: **registry** here means a single source-of-truth set the type system reads, not a runtime container — worth a one-line tooltip since the word is overloaded.

### The canonical action: requireOrgUser, then tenantDb

Composition — where the pattern becomes a habit. Show the three-line opener that should head every tenant-scoped Server Action:

```
const { user, orgId } = await requireOrgUser();
const db = tenantDb(orgId);
const rows = await db.query.invoices.findMany({ where: ... });
```

Drive home the **`orgId` provenance rule** as the load-bearing security invariant: `orgId` comes *only* from `requireOrgUser()` — never a route param, never a form field, never a client header. The helper trusts its caller; its correctness is conditional on the caller having validated the session. This is the data-layer twin of the rule `authedAction` (Chapter 057) will enforce end-to-end at the action boundary. If a tenant read goes through bare `db.` in a handler, review catches it not by checking every `where` but because the *call shape is wrong* — that's the whole payoff, restated at the point of use.

Map this onto the five-seam shape the student already knows (parse → authorize → mutate → revalidate → return): `requireOrgUser()` is authorize, `tenantDb(orgId)` is how mutate/read stay scoped. Reuse their existing mental model rather than introducing a new one.

Exercise — **`CodeReview`** (the canonical exercise for this bug class; chapter outline implies the wrong-then-right is the spine). A short PR diff with two-three plants: (a) a tenant read through bare `db.` instead of `tenantDb` — `kernel`: "tenant read bypasses tenantDb / no org scope"; (b) `orgId` taken from a `searchParams`/route param instead of `requireOrgUser` — `kernel`: "orgId from request input bypasses the session check"; optionally (c) a mixed handler doing one `tenantDb` read and one raw `db` read — `kernel`: "mixes scoped and unscoped reads in one handler." The student leaves inline comments; the reveal teaches the senior framing for each. This rehearses the real-world skill: recognizing the *shape* of the bug in a diff.

### When you really do need to read across orgs

The escape hatch — deliberately last, after the discipline is internalized, so it reads as "the sanctioned exception" not "the easy way out." Legitimate cross-org reads exist: admin dashboards, system jobs, batch/BI queries. The senior call (chapter outline): those reach for the **unwrapped `db`**, and the file lives somewhere visible — `@/db/queries/` is tenant-scoped, so cross-org code goes in a dedicated `src/lib/admin/` or `scripts/` location where the raw-`db` import is an obvious signal.

State the anti-pattern crisply: **do not add a `tenantDb({ allOrgs: true })` mode.** An escape valve inside the helper normalizes the bypass and erodes the guarantee; "different client, different file" keeps every cross-org read a *deliberate, visible decision*. This is the senior reasoning about API design — the absence of a convenient bypass is itself the feature.

Brief contrast with the alternatives the ecosystem reaches for (chapter outline's "what this is not"): ORM forks, runtime proxies, AST rewriters that auto-inject filters via reflection (Prisma extensions, Drizzle proxy magic). The 2026 senior call in this stack is the **explicit wrapper**: ~40 lines, the type signature *is* the documentation, the failure mode is loud (a misshape throws or won't compile), and the raw client stays available for the legitimate reach. Reach for heavier machinery only past a table count this wrapper can't track — rarely met in year-1 SaaS. Keep this comparative, one tight paragraph; this is a "why we chose this" beat, not a survey.

Optional naming aside (fold in, don't headline): the pattern appears in the field as `forTenant`, `dbFor`, `orgDb`, `tenantScoped`. Pick one, grep for it; a second name means the team is drifting. The course uses `tenantDb`.

### Quick recall

Optional short closing understanding-check, only if it doesn't bloat the lesson. A `Buckets` (two columns: "via tenantDb" vs "raw db, different file") sorting concrete scenarios — *render an invoice for the current user* / *list this org's customers* / *the nightly all-orgs revenue rollup* / *a migration backfill* / *the admin support console reading any org*. Reinforces the two-clients decision as a reflex. If included, place it here as the capstone of the composition + escape-hatch sections; if the lesson already runs long after the `CodeReview` and `TypeCoding` exercises, drop it — those two are the load-bearing checks.

External resources (`ExternalResource` cards, optional): Drizzle relational-queries docs (the `query.<table>.findMany` API the helper wraps); Drizzle `and()`/operators reference. Keep to one or two; this is a pattern lesson, not an API tour.

---

## Scope

**Prerequisites to redefine concisely, not re-teach:**
- `requireOrgUser()` returns a trusted `{ user, orgId, role }` and redirects on no session / no active org (built Lesson 1). One sentence; the student just used it.
- Drizzle's relational query API `db.query.<table>.findMany({ where, with })` and operators `and`/`eq`/`or` (Unit 5). Assume fluency; show, don't explain.
- The five-seam Server Action shape parse → authorize → mutate → revalidate → return (Unit 6). Reference by name only.

**Explicitly out of scope (belongs to other lessons — do not teach):**
- **The `authedAction(role, schema, fn)` wrapper** — the action-boundary arm of the carve-out. *Named and foreshadowed only*; built in Chapter 057 Lesson 2.
- **Role checks / RBAC** — `role` is in `requireOrgUser`'s return but gating is Chapter 057 Lesson 1. The helper scopes *data*; it does not check *permission*. State this boundary once so the student doesn't expect `tenantDb` to do authz.
- **RLS / `pgPolicy` / `SET LOCAL` / the `withTenant` helper** — the database backstop. Foreshadow in the writes section as "defense in depth, covered next"; Lessons 3 and 4 own it. Do not show any policy SQL.
- **Cross-org admin read *implementation*** — named as "different client, different file"; the actual admin surface is Unit 21 territory. Don't build it.
- **Audit-log writes on mutations** — Chapter 057 Lesson 5. Not mentioned beyond not-here.
- **`db/queries/` read-helper organization in depth** — the conventions put tenant-scoped reads there; this lesson can reference it as the home for helpers that close over `tenantDb`, but the lesson's deliverable is the *factory*, not a full query-helper module.
- **Drizzle 1.0 `defineRelations` / removed runtime `casing`** — the project is on Relations v1 (`db.query.<table>`); author against current shape, ignore the forward-looking 1.0 form.
- **Drizzle's newer Relational Queries v2 (`rqb-v2`) syntax** — Drizzle now docs a v2 query builder and labels v1 "[OLD]", but the course's conventions and Lesson 1 are pinned to the v1 `db.query.<table>.findMany({ where, with })` surface. Author the helper against v1; do not mix v2 call shapes. (Flag for downstream agents: the helper wraps v1; a future course-wide migration to rqb-v2 would re-shape it.)
