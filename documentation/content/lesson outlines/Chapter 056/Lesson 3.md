# Lesson 3 outline — The threshold where RLS earns its cost

- **Title (h1):** The threshold where RLS earns its cost
- **Sidebar label:** When RLS earns its cost

## Lesson framing

A **decision lesson**, not a wiring lesson. The deliverable is a mental model and a repeatable decision procedure, not code. Lesson 4 owns every line of syntax (`pgPolicy` / `crudPolicy`, `ENABLE`/`FORCE`, `SET LOCAL`, `current_setting`, the `withTenant` helper, the policy test). This lesson decides *whether* and *where* before that lesson decides *how*. Do not author policy SQL or Drizzle policy code here — show at most one read-only illustrative `USING (...)` line so the student can picture what a policy is, and immediately point to Lesson 4 for the real thing.

This is the chapter's "trigger before tool" lesson (pedagogical filter: conditional power-tool lessons must name the threshold the platform default crosses). The platform default is already in the student's hands: `tenantDb(orgId)` from Lesson 2, the application-layer scope that makes the missing org filter not compile. RLS is the conditional database-layer backstop. The whole lesson is structured threshold-up-front: name what RLS buys, name what it costs, name the three triggers that flip the decision, then land the per-table call (RLS on `audit_logs`, application scope everywhere else for this course's year-1 stack).

The single mental model the student must leave with: **two independent defense layers that fail independently.** Application scope (`tenantDb`) is unconditional and catches the 99% case in the normal request path; RLS is defense-in-depth, added per-table only when a trigger fires, and catches the case the helper structurally can't reach (hand-written SQL in a script, an external writer with DB credentials). RLS is *a* security layer, never *the* security layer. Every misconception this lesson must puncture flows from collapsing those two layers into one.

Where juniors go wrong with this in the field, and what the lesson must pre-empt:
- **"RLS everywhere" cargo-culting** — blanket RLS as a policy. The helper discipline atrophies ("the database catches it"), every dev hits the missing-session-variable trap weekly, and the bug ships anyway the day a pool is misconfigured.
- **Treating RLS as a replacement for `tenantDb`** rather than a backstop layered on top of it. On RLS tables the app *still* uses the helper.
- **The pooled-connection footgun** — the scariest failure mode and the reason RLS has real operational cost. Must be made concrete here (the threat) even though the `SET LOCAL`-in-a-transaction fix is Lesson 4 (the wiring).
- **Conflating RLS with SQL-injection defense** — orthogonal; parameterization defends injection.
- **Project-level vs table-level thinking** — the same correctly-designed project has RLS on `audit_logs` and not on `invoices`. The decision is per-table, run at table-design time.
- **Thinking RLS defends against a compromised app server** — it defends against application *bugs*, not application *compromise* (the app can `SET` any tenant id). Compromise is a least-privilege/role problem, named once, deferred to Chapter 081.

Target length 35–45 min, the chapter's shortest. Judgment-dense, low on code. Two static visuals (the layered-defense figure and the comparison table) plus one interactive centerpiece (the per-table decision tree as a `StateMachineWalker`). One `TrueFalse` round as the understanding check, sized precisely to the misconceptions above. No live coding (nothing runnable; no syntax taught here).

## Lesson sections

### Introduction (no h2 — lesson lead-in)

Open on the senior question, stated implicitly (pedagogical guideline: the intro carries the senior question, not a labelled section). The setup: Lesson 2 shipped `tenantDb` — the missing org filter no longer compiles in the normal request path. So a reasonable junior asks "are we done? do we even need Postgres Row-Level Security?" — and finds a long, contradictory Stack Overflow / Reddit thread where half the answers say "RLS on every table, always" and half say "never bother, scope in the app." This lesson is the senior read that thread is missing.

Frame the verdict up front (threshold-up-front, defaults-before-conditionals): application-layer scope is the year-1 default; RLS is a conditional power tool; by the end the student runs a per-table decision and lands RLS on exactly one table for this course's stack. Preview the practical skill: not "write a policy" (that's next lesson) but "decide whether a table needs one, and defend the decision." Warm and brief.

`Term` candidates in the intro: <Term> on **RLS** (expand the acronym — Row-Level Security — first use; Postgres feature where a table refuses rows that don't match a per-row policy condition). Keep it to this one here.

### What Row-Level Security actually buys you

Teach the mechanism precisely enough that the rest of the lesson has something concrete to weigh. A policy attached to a table evaluates a boolean condition per row, for *every* query, *every* connection, *every* code path — the database itself refuses to return rows that don't match. Illustrate with ONE read-only line so the student can picture it, framed explicitly as "you'll write the real one next lesson, don't copy this":

```sql
-- illustrative only — the real policy is authored in Drizzle next lesson
USING (organization_id = current_setting('app.org_id')::uuid)
```

The load-bearing point: the defense is **total within the database boundary and does not depend on application discipline.** Even if the application omitted the org filter entirely — forgot the `where`, bypassed `tenantDb`, ran raw SQL — the database still would not hand back another org's rows. Contrast directly with `tenantDb`: the helper makes the filter the only call shape that *compiles*, but it lives in the application; reach for the unwrapped `db` client and the helper is out of the picture. RLS lives one layer down, where that escape hatch doesn't exist.

Use `Code` for the single illustrative line (not `AnnotatedCode` — one line, framed as a teaser, no walkthrough warranted). Keep `current_setting`, `USING`, the `::uuid` cast unexplained here beyond a one-clause gloss — those are Lesson 4's to teach; over-explaining syntax in a decision lesson is the wrong focus. A `Term` on **policy** (a per-row boolean rule Postgres evaluates to decide which rows a query may see or write) is worth it on first use.

### What Row-Level Security costs you

The counterweight, and the reason the lesson exists — RLS is not free, and naming the cost honestly is the senior move that the "RLS everywhere" crowd skips. Three cost centers, taught as concrete recurring pain, not abstract "overhead":

1. **Every connection needs a session variable set before its first query.** `SET app.org_id = '...'` has to run on the connection, and the connection pool has to support and correctly reset session-level state. This is the seam where the next cost (the footgun) lives.
2. **Local debugging gets harder.** A dev opens `psql`, runs `SELECT * FROM audit_logs`, gets zero rows, and burns twenty minutes thinking the data is gone — the session variable simply isn't set. This "why are there no rows" loop is a recurring junior trap; name it now so the student recognises it.
3. **Policy authoring is its own discipline, and wrong policies fail silently.** A policy that excludes legitimate rows shows empty lists with no error; nobody notices for a week. A silent-empty failure is worse than a loud crash because it looks like "no data" rather than "broken."

Land the senior reflex explicitly: "we already have application scoping via `tenantDb`, plus a code-review reflex that checks the client import and the `orgId` provenance" is *most of the protection at a fraction of the cost.* RLS has to clear that bar — add enough defense over the helper-plus-review baseline to justify these three costs — before it earns a place on a table.

Prose-led section. No diagram needed yet; the comparison table two sections down consolidates cost vs benefit visually. A `Term` on **session variable** (a connection-scoped key/value Postgres holds for the life of a session, read back via `current_setting`; the tenant id is stashed here so the policy can compare against it) supports the reader without a syntax detour.

### The pooled-connection footgun

Promote this to its own section — it is the single most important "watch out" in the lesson and the concrete face of cost center #1, so it must not be buried in a watch-out list. This is the failure mode that makes RLS genuinely dangerous when done casually, and the reason Lesson 4's `SET LOCAL`-in-a-transaction discipline is non-negotiable.

Build it step by step to keep cognitive load low (simplified model first, then the failure):
1. Establish the premise the student may not hold: in 2026 the app does **not** open one connection per request. Drizzle's default Postgres adapter pools connections; Neon's serverless driver pools; PgBouncer in transaction mode pools. Connections are *reused* across requests. (This connects to pooling the student has met in the data layer.)
2. RLS policies read `current_setting('app.org_id')`, which is set *per connection*. Session variables persist across reuses of the same connection.
3. The two failure modes, stated plainly because both are cross-tenant leaks:
   - (a) Request B reuses a connection without setting the variable and inherits request A's value — reads A's org's rows.
   - (b) Request A sets the variable and never resets it; later request B on the same connection reads A's rows.

Name the mitigation by name only, and explicitly defer the wiring: the fix is `SET LOCAL` inside an explicit transaction — `SET LOCAL` binds the variable to the transaction and Postgres clears it automatically on commit or rollback, so it can't leak to the connection's next checkout. Full wiring (the `withTenant(orgId, fn)` helper, the transaction shape) is Lesson 4. The point *here* is that this footgun is a real recurring operational cost, and "turn RLS on" without this discipline is worse than no RLS — it *looks* secure while leaking.

Diagram: a small **before/after sequence** is the right vehicle to make the leak legible. Use a `TabbedContent` with two tabs, each a Mermaid `sequenceDiagram` (sequence diagram → Mermaid per diagram guidelines), wrapped per the component's own card (no nested `<Figure>`):
- Tab "The leak" — actors: Request A, Pool/Connection, Request B. A checks out conn, `SET app.org_id = A`, query (sees A — correct), returns conn *without reset*; B checks out the *same* conn, query with *no* `SET` → reads A's rows. Annotate the fatal step.
- Tab "The fix" — same actors, but A's work is wrapped `BEGIN … SET LOCAL app.org_id = A … query … COMMIT (variable cleared)`; B checks out the conn, `BEGIN … SET LOCAL app.org_id = B …` → reads only B's rows.
Pedagogical goal: the student sees that the variable's *lifetime* is the whole bug, and that transaction-scoping is what bounds it. Keep both diagrams short (3 actors, ~5 messages) so text stays readable after Starlight's scale-down; bump `messageText` font via `themeCSS` if it renders small. Caption each tab to name the lesson where the fix is built.

### The three triggers that flip the decision

The heart of the lesson — the threshold, stated as three triggers where *any one* is sufficient. This is the "name the trigger that crosses the default" beat. Teach each trigger as a recognisable real situation, not a definition:

1. **Highest-stakes data.** One missed scope produces a regulatory or trust incident, not just a bug: HIPAA-covered PHI, financial PII, audit logs legal will subpoena, security-sensitive credentials. The cost of a single leak is unrecoverable, so a second independent layer is worth its operational price.
2. **Many writer/reader paths the helper can't span.** Admin tools, batch jobs, BI dashboards, support consoles, exports — entry points that don't all flow through the request-path `tenantDb`. When the application-layer helper structurally can't cover every door, the database-layer policy covers the doors the helper misses.
3. **You are not the only writer.** A partner integration, an external job runner, a third-party reporting tool that holds DB credentials and runs SQL your team never reviews. The helper protects code you write; RLS protects against code you don't.

State the rule crisply: any one trigger is enough; below all three, application-layer scope via `tenantDb` plus the code-review reflex is sufficient — adding RLS there buys little and costs the three cost centers.

Present the three triggers with a `Card`/`CardGrid` (three tiles, lucide icons — e.g. `shield-alert`, `git-fork`, `users` — title = trigger, body = the recognisable situation + the one-line "why this clears the bar"). `CardGrid` is the right call: three parallel sibling criteria the student should be able to recall as a set, and the grid reads as a checklist. A `Term` on **PHI** (Protected Health Information — health data regulated under HIPAA; a canonical example of data whose leak is a legal incident, not just a bug) earns its place; PII is common enough to leave bare.

### Application-layer scope versus RLS, side by side

Consolidate the buys/costs into the comparison table the chapter framing calls for — this is the artifact the student screenshots and reuses on the job. A Markdown table (Expressive Code / native MD table; no special component needed) with rows that make the trade-off operational:

| | Application scope (`tenantDb`) | Row-Level Security |
| --- | --- | --- |
| **Layer** | Application (TypeScript) | Database (Postgres) |
| **Bug class caught** | Missing `where` in the normal request path — made not-compile | Cross-org read on *any* path, incl. raw SQL & external writers |
| **Where it fails** | Unwrapped `db` client used deliberately (review-visible: different import) | App server compromised and free to `SET` any org id |
| **Operational cost** | ~Free — one helper, one review reflex | Session variable per request, pool discipline, harder local debugging, silent-fail policies |
| **Debugging story** | Normal Drizzle; rows visible in `psql` | "Why are there no rows?" until the variable is set |
| **When to reach** | Always — the unconditional default | Per-table, when a trigger fires |

Frame the table's punchline below it: the two columns are not either/or. The bottom row is the whole lesson — `tenantDb` is *always*, RLS is *sometimes and on top*. Pre-empt the misread that the table is a "pick one" menu.

### Two layers, not one: RLS as defense in depth

The mental-model anchor. State the senior framing flat out: even on an RLS-protected table, the application *still* uses `tenantDb`. Two layers that fail independently — the application-layer helper catches the 99% case in the request path, the database policy catches the case the helper structurally can't reach (a one-off script with hand-written SQL that forgot the filter; an external integration with credentials). Neither makes the other redundant; the value is that one bug has to slip past *both* to leak.

Make the symmetry concrete: a bug in the application (forgot to scope) is caught by the policy; a bug in the policy (typo, forgot to enable it) is caught by the helper. Defense in depth means a single mistake in either layer is survivable. This directly kills the "RLS replaces `tenantDb`" misconception and sets up the next section's "RLS everywhere" anti-pattern.

Diagram: a **layered-defense figure** — the model the whole lesson hangs on, so it earns a custom visual. Plain HTML + CSS inside a `<Figure>` (per diagram guidelines: layout concepts / color-coded segments with callouts are HTML+CSS territory; this is a conceptual stack, not a graph). Show a request arriving and passing through two concentric/stacked gates before reaching rows:
- Gate 1 "Application scope — `tenantDb(orgId)`": label "always on", sublabel "missing filter doesn't compile".
- Gate 2 "Database policy — RLS": label "per-table, when a trigger fires", sublabel "refuses cross-org rows on every path".
- A side caption: a request must clear *both* gates to read a row; remove either and the other still holds the line.
Keep it horizontal and short (well under the 800px height cap). Pedagogical goal: cement "two independent layers" as a spatial picture, so "RLS instead of the helper" reads as obviously wrong (it would mean deleting a gate).

### The "RLS everywhere" anti-pattern

A focused section because this is the most common real-world mistake and the direct foil to the senior call. Some shops adopt blanket "RLS on every table." Walk the failure cascade so the student feels why it backfires:
- Every developer hits the missing-session-variable trap weekly; local debugging becomes a stop-and-restart loop.
- Policy authoring drifts as the schema evolves; silent-empty policies accumulate.
- Admin scripts grow special-case "set the variable from the script" boilerplate everywhere.
- The helper discipline *atrophies* — "the database catches it" — until a misconfigured pool doesn't, and the bug ships anyway, now with the team's guard down.

Land the senior reflex: RLS is conditional; the unconditional layer is the helper. Blanket RLS inverts that — it makes the conditional layer mandatory and lets the mandatory layer rot. The fix is not "more RLS," it's "RLS where a trigger fires, helper everywhere, review always."

Prose-led. This pairs naturally before the decision tree — the student has now seen both the over-reach (RLS everywhere) and the baseline (helper everywhere), and is ready to run the per-table call.

### The per-table decision the senior runs at table-design time

The synthesis and centerpiece — the repeatable procedure, run *per table* at design time (hammer home: not a project-level switch; the same project correctly has RLS on `audit_logs` and not on `invoices`). The procedure in prose first, then interactive:
- Step 1 — Is this table's cross-tenant leak unrecoverable (legal, regulatory, audit, security)? Yes → RLS.
- Step 2 — Is it written/read by paths outside the request handler (jobs, scripts, external integrations)? Yes → RLS (or extremely careful, named review).
- Step 3 — Otherwise → application scope via `tenantDb`, code review for helper discipline, ship.

Make it interactive with a `StateMachineWalker` (`kind="decision"`, the default) — the ideal component here because it forces the student through the senior's question *order* and commits one branch at a time, which is exactly the discipline being taught (the lesson lives in the order, not in any single leaf). This is a non-coding understanding check that doubles as the section's teaching artifact. Author it as the decision tree:
- `Question` "leak-stakes": "If one row of this table leaked to the wrong org, is it an unrecoverable legal / regulatory / trust incident?" → Branch "Yes, unrecoverable" → `Leaf` verdict **RLS + `tenantDb`** ("highest-stakes trigger; two independent layers, build the policy next lesson"). → Branch "No, a normal bug" → next `Question`.
- `Question` "writer-paths": "Is it written or read by paths outside the request handler — jobs, scripts, external integrations with DB credentials?" → Branch "Yes, paths the helper can't span" → same/related `Leaf` **RLS + `tenantDb`** (or a sibling leaf "RLS, or a named, audited review exception" to honour the chapter outline's nuance). → Branch "No, request-path only" → next `Question`.
- `Question` "default": confirm → `Leaf` verdict **Application scope via `tenantDb`** ("the year-1 default; helper makes the filter the only compiling shape, review checks the client import; ship").
Every leaf body restates *why* and points the RLS verdicts at Lesson 4 for the wiring. Pedagogical goal: the student internalises the question order (stakes → paths → default) and can re-run it on any future table. Do not wrap in `<Figure>` (the walker is its own card).

After the walker, apply the procedure once to *this course's* stack to make it land, not stay abstract: run the three SaaS tables the student already knows. `invoices`, `customers`, `documents` → request-path, normal-bug stakes → application scope. `audit_logs` → unrecoverable (legal subpoena / forensic value) **and** many writer paths → **RLS**. State the chapter's verdict: **RLS on `audit_logs`, application scope everywhere else.** Be careful with the forward references (see Scope): the `audit_logs` *table* (columns, events, `logAudit`) is built in Chapter 057; the RLS *policy primitives and wiring* are Lesson 4 of this chapter. Phrase as "the table arrives in the next chapter; we wire its policy next lesson" without overclaiming which file lands where.

### Checking the decision

The understanding check, placed at the end of the body (exercises belong where they reinforce, and this one reinforces the whole lesson's judgment). A `TrueFalse` round is the right instrument — the lesson's payload is a set of true/false judgments and misconception-busters, which is exactly what this drill format tests, and each `<TfWhy>` lets the correction land in the end-of-round review. Author ~6 statements, each targeting one misconception the framing flagged:
- "RLS replaces `tenantDb` — once a table has a policy you can drop the application-layer filter." → **false** (`TfWhy`: two independent layers; the app still uses `tenantDb` on RLS tables).
- "RLS protects against SQL injection." → **false** (orthogonal; parameterization defends injection).
- "Whether to use RLS is a project-wide decision." → **false** (per-table; same project can have RLS on `audit_logs` and not on `invoices`).
- "With a connection pool, `SET app.org_id` without `LOCAL` can leak one request's tenant to the next." → **true** (the footgun).
- "RLS protects your data even if the application server is compromised and can set any org id." → **false** (defends against bugs, not compromise; that's a least-privilege/role problem — Chapter 081).
- "For this course's stack, the senior call is RLS on `audit_logs` and application scope everywhere else." → **true**.

Optionally precede it with a quick `Buckets` (two buckets — "RLS + `tenantDb`" vs "`tenantDb` only") sorting a handful of tables (`audit_logs`, `invoices`, `customers`, `documents`, plus maybe `payment_methods`/`customer_documents` as later-PII examples) if a second, lighter check helps; keep the `TrueFalse` as the primary. Do not over-stack exercises — one strong round is better than three weak ones for a short lesson.

### External resources (optional)

One or two `ExternalResource` cards if a current, authoritative source supports the decision framing: the Postgres docs page on Row Security Policies (the canonical mechanism reference), and/or the Drizzle RLS docs (so the student who wants to read ahead to next lesson's authoring surface has the door). Keep to genuinely load-bearing links; this is a judgment lesson, not a link farm.

## Scope

**This lesson teaches the decision, not the implementation.** Explicitly out of scope, owned elsewhere:

- **All RLS syntax and wiring** — `CREATE POLICY`, `pgPolicy`/`crudPolicy` at the call site, `ENABLE`/`FORCE ROW LEVEL SECURITY`, the `SET LOCAL`-in-a-transaction discipline, the `withTenant(orgId, fn)` helper, the integration test that proves isolation. **Lesson 4 of this chapter.** Name them, point forward, write none of them (one read-only illustrative `USING (...)` line is the only SQL shown, framed as a teaser).
- **The `audit_logs` table itself** — its column shape, the events that trigger writes, the `logAudit(tx, event)` helper, the three-layer append-only enforcement. **Chapter 057 Lesson 5.** This lesson only *names `audit_logs` as the table that meets the threshold*; it does not design it. (Cross-ref tension to handle carefully: chapter framing prose says "Chapter 056 L4 wires the policy" while the audit table lands in Chapter 057 — phrase forward references as "the table arrives next chapter; its RLS policy is wired next lesson," do not assert a specific file/migration lands in this chapter for a table that doesn't exist yet.)
- **DB role separation / least-privilege grants** (different roles for migrations vs request handlers, no `BYPASSRLS` on the app role) — named once as the answer to "what about a compromised app server," full coverage **Chapter 081**.
- **RLS performance impact at high row counts** — named at most in passing; production tuning is **Chapter 094**.
- **RLS against multi-region replicas** — out of scope entirely.
- **Integration-testing RLS** — the proof-of-isolation test belongs to Lesson 4 (and the integration-test machinery to Chapter 088); do not teach test setup here.

**Prerequisites to assume (redefine in one clause max, do not re-teach):**

- `tenantDb(orgId)` (Lesson 2) — the typed factory that injects `and(eq(table.organizationId, orgId), …)` on every read/write so the missing filter doesn't compile; the year-1 application-layer default. The student has this; lean on it as the baseline RLS is weighed against.
- `requireOrgUser()` → `{ user, orgId, role }` (Lesson 1) — the trusted source of `orgId`. Mention only if a code shape needs it; this lesson is mostly code-free.
- Connection pooling — assume the student knows the app reuses DB connections (met in the data-layer unit); the footgun section restates the one fact it needs (variables persist across reuses) without a pooling primer.
- Postgres / Drizzle basics, Server Actions — assumed from Units 5–6; no recap.

## Notes for downstream agents

- **Deliberate divergences from the chapter outline:** (1) The select-builder wrap and nested-`with` child-scoping were already cut in Lesson 2 (per continuity notes) — do not reference them. (2) The chapter outline mentions `crudPolicy` and the Neon-vs-vanilla split as part of *this* lesson's bullets; treat that as Lesson 4's territory (it owns the authoring surface) — here, mention Neon's `crudPolicy` at most as a one-line "next lesson uses the typed authoring surface; on Neon that's `crudPolicy`," not as taught syntax. Keep this lesson decision-only.
- **Naming alignment with conventions:** the two clients are `db` (pooled, default) and `dbUnpooled` (migrations / long-running tx) per Code conventions — if a cross-org/admin "different client" is mentioned, it reaches for the unwrapped `db`/`dbUnpooled`, not an invented name. RLS is reserved for `audit_logs` and append-only/quarantined tiers per conventions — this lesson is the *why* behind that convention line.
- **Verify before shipping (fact-check targets):** Postgres `FORCE ROW LEVEL SECURITY` + owner-bypass default behaviour; that Drizzle's default Postgres pool and Neon's serverless driver both pool/reuse connections in 2026; `SET LOCAL` transaction-scoping semantics. These are stated as threats/costs here, not wired, so claims must be directionally correct even though syntax is Lesson 4's.
