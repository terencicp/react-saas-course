# The append-only audit_logs table

Title: The append-only audit log
Sidebar label: The audit log

---

## Lesson framing

Final teaching lesson of Chapter 057. Everything else in the chapter has been building the *who-can-do-what* boundary (roles, `authedAction`, `authedRoute`, the five member flows). This lesson lands the *what-happened* record: the append-only `audit_logs` table that answers "who removed this member, when, from where" three months later, plus the `logAudit(tx, event)` writer the five flows in L4 have been calling as a black box.

This is a **pattern + setup** lesson, not a decision lesson. The big decision — *does `audit_logs` earn RLS* — was already made and the org-isolation policy already wired in Ch056 L4. The student arrives knowing `withTenant(orgId, fn)`, the `pgPolicy` + `.enableRLS()` + hand-added `FORCE` shape, and the `set_config('app.org_id', …, true)` discipline. This lesson does **not** re-teach RLS mechanics; it (a) defines the table columns, (b) adds the *second* policy (deny UPDATE/DELETE — the append-only half, distinct from Ch056 L4's org-isolation half), (c) builds `logAudit(tx, event)` whose signature *forces* a `tx`, (d) names the canonical event catalog and the audit-vs-noise judgment, (e) closes the retention + read-surface loop.

Senior-mindset spine (lead with these, code illustrates):
- **An audit log is a forensic instrument, not a debug log.** The hard part is not the table — it's the *judgment* of what to record (privileged human verbs an auditor would ask about) versus what to drop (every read, every CRUD tick). Over-recording destroys the signal; that's the failure mode juniors hit.
- **"The row exists iff the work landed" is a structural guarantee, not a hope.** It comes from one mechanism: the audit insert rides *inside the same transaction* as the mutation. Anything that defers the write (`after()`, a queue, fire-and-forget) breaks the iff and is the canonical trap.
- **Append-only is enforced in depth, not by convention.** Three independent layers — the column shape (no `updatedAt`/`deletedAt`), the DB policy (deny UPDATE/DELETE), application discipline (no code path issues them). The database refuses; the application never asks.
- **The type signature is the discipline.** `logAudit(tx, event)` takes a transaction handle as its first argument so calling it outside a transaction is a *type error*, not a code-review catch. This is the same "make the wrong thing not compile" reflex as `tenantDb` (Ch056 L2) and `authedAction` (Ch057 L2) — name that lineage explicitly; it's the chapter's through-line.

Mental model the student leaves with: *every privileged mutation = one transaction containing (the work) + (one immutable audit row), scoped through `withTenant`, written via a helper that can't be called any other way.* Plus the maturity to decide what's audit-worthy.

Target student: junior dev, comfortable now with Drizzle schema authoring, transactions, RLS basics, the `authedAction` body shape. Keep it terse and adult. The cognitive-load risk here is **scope creep** — compliance/retention/forensics is a deep field; stay ruthlessly on the year-1 SaaS slice and name everything else as a forward pointer.

Estimated student time: 45–55 min.

---

## Lesson sections

### Introduction (no header)

Open on the senior question as a concrete scene, not abstraction. Three months from now a support ticket says "an admin revoked my access and nobody knows who." Or a SOC 2 auditor asks "show me every role change in this org for the last 90 days." Or a security review demands "who exported the customer list, when, from which IP." None of these is answerable from your app tables — those hold *current* state, not *who changed it*. Name the gap: the system records the present, the audit log records the past *actions*.

Then connect to what they just built: in L4, every member-management action already ended its transaction with `logAudit(tx, { action, … })` — a black box. This lesson opens it. Preview the deliverable: the `audit_logs` table, the second (append-only) policy on top of Ch056 L4's isolation policy, and the `logAudit` writer.

Keep warm and brief (~3 short paragraphs). End by stating the spine in one line: *the audit row lives or dies with the transaction that did the work.*

No diagram here; the scene is the hook.

---

### What an audit log is for (and what it isn't)

The judgment section — placed **first in the body, before any schema**, because the column shape only makes sense once the student knows what the table is *for*. This is the senior-mindset core; do not let the agent rush to the schema.

Teach the distinction with a paired contrast, not a lecture:
- **Audit-worthy** = privileged, human-initiated, state-changing actions an auditor/regulator/incident responder would ask about months later. Examples to name: member added (invite accepted), member removed, role changed, ownership transferred, org deleted, billing plan changed (forward-ref Unit 11), large data export, sensitive-setting change.
- **Not audit-worthy** = reads/page views (in year-1 SaaS; note regulated verticals differ), high-frequency low-stakes writes (a comment, a checkbox toggle), and system writes that already have their own ledger (Stripe webhooks → `processed_events`, forward-ref Ch063 — *audited there, not here, don't double-record*).

Drive home the failure mode juniors hit: **over-recording**. "Audit everything" turns the table into a debug log; the one row that matters drowns in 10,000 that don't, and the audit log fails at its only job. The senior reflex: *audit the verbs, not the rows* — "the invoice was voided" is signal; "the invoice's `updatedAt` changed" is noise. Mirror it: **under-recording** (only failures) misses the point — the *successful* privileged action is exactly what an auditor wants; failures go to Sentry, not here.

Also draw the boundary against two adjacent concepts the student may conflate:
- **Audit log ≠ activity feed.** Activity feed is a user-facing product feature ("Sara commented on your doc"); audit log is a compliance/forensic instrument with different retention, access, and content. Name it, don't build the feed.
- **Audit log ≠ application logs/Sentry.** Logs are ephemeral operational telemetry; the audit log is durable, queryable, tenant-scoped business record.

**Exercise — `Buckets` (twoCol).** Two buckets: "Write an audit row" vs "Don't audit". ~8 chips drawn from real SaaS events: `admin removed a member` (audit), `user opened the dashboard` (don't), `owner changed the billing plan` (audit), `user toggled a task to done` (don't), `ownership transferred` (audit), `Stripe webhook recorded a payment` (don't — has its own ledger), `customer database exported` (audit), `user edited their display name` (don't — low-stakes; *or* make this a deliberate discussion chip). Reasoning chips test the judgment, not recall — this is the lesson's load-bearing check. Use the `description` on each bucket to anchor the rule.

`Term` candidates here: **SOC 2** (compliance attestation, why a buyer asks for an audit trail), **forensic** (after-the-fact reconstruction of what happened).

---

### The table shape — append-only by design

Now the schema, justified column by column against the judgment above. Lead with the design property that makes it special: **there is no `updatedAt`, no `deletedAt`** — the *absence* of those columns is the first layer of the append-only contract. Rows accumulate; they never change.

Columns (the canonical shape — downstream lessons/Ch081 must match):
- `id` — `uuid` pk, `$defaultFn(uuidv7())` per house convention.
- `organizationId` — `uuid`, not null, the RLS-scoped column (already the subject of Ch056 L4's policy). FK to `organization`.
- `actorUserId` — `uuid`, **nullable** (null = system action; teach the why below). FK to `user`, `onDelete: 'set null'` (deleting a user must NOT erase the audit trail — explain this FK choice explicitly, it's a senior tell).
- `actorIp` — `text`. (Fact-checked: Drizzle pg-core has **no** first-class `inet()` column builder — it's not on the column-types list; only `jsonb`/`uuid`/etc. are. Use `text`. Name the Postgres-native `inet` type *in one sentence* as the validates-the-shape option a team could reach for via a Drizzle custom type, but keep the lesson on `text` — pulling in a custom type would be noise in a teaching example. This is a deliberate simplification; note it for downstream.)
- `actorUserAgent` — `text`, truncated to a sane cap at write time.
- `action` — `text`, the verb string (`'member.role-changed'`, `'org.deleted'`, …). Discuss the `entity.verb-pasttense` naming convention as a deliberate choice (greppable, namespaced, stable).
- `subjectType` / `subjectId` — `text` / `text`, the affected entity (`'member'` / the member id). `subjectId` is `text` (not `uuid`) on purpose so it can hold non-uuid identifiers; name this.
- `payload` — `jsonb`, the diff or the operation args (deep-dived in its own subsection).
- `createdAt` — `timestamp` with timezone, `defaultNow()`.

Indexes (read-pattern-driven, per house convention with explicit names):
- `idx_audit_logs_org_created` on `(organizationId, createdAt desc)` — the per-org timeline, the common read.
- `idx_audit_logs_org_actor_created` on `(organizationId, actorUserId, createdAt desc)` — the per-actor filter ("everything this admin did").
Name the reflex: *audit logs are write-heavy, read-rare; every index taxes the insert, so index only the queries you'll actually run.* Don't over-index.

**Component — `AnnotatedCode`** on the `pgTable` definition (single block, stepped). Steps focus attention on: (1) the *missing* `updatedAt`/`deletedAt` (the append-only tell), (2) `actorUserId` nullable + `onDelete: 'set null'`, (3) `inet` for the IP, (4) the `payload` jsonb, (5) the two named composite indexes. `color` blue default; use orange for the "absence" step framing and green for the index step. Keep the schema aligned with house conventions (snake-case via client casing, so TS reads `organizationId`, SQL is `organization_id` — note this once, don't restate per column).

A short `Aside` (note) can carry the FK-`set null` rationale if it would bloat a step: "If a user is deleted, their audit rows survive with a null actor — the *record of what they did* outlives the account."

---

### The append-only policy — the second half of the RLS story

Bridge explicitly from Ch056 L4: *that* lesson enabled RLS on `audit_logs` and wrote the org-isolation policy (`audit_logs_org_isolation`, the `FOR ALL` `USING/WITH CHECK` org pin). RLS being already enabled is the lever this lesson pulls. This section adds the **second policy**: deny UPDATE and DELETE outright, so even a bug (or a malicious app-role query) cannot mutate history.

Teach it as one more `pgPolicy` block in the schema (single source of truth — same discipline as Ch056 L4, never a hand-edited migration for the policy itself):
- A policy `audit_logs_no_update` `for: 'update'`, `to: authenticatedRole`, `using: sql\`false\`` (and/or `withCheck` false).
- A policy `audit_logs_no_delete` `for: 'delete'`, `to: authenticatedRole`, `using: sql\`false\``.
Explain `USING (false)` plainly: the row-visibility predicate for UPDATE/DELETE is always false → no row is ever a candidate → the operation affects zero rows / is refused. INSERT and SELECT remain governed by the org-isolation policy from Ch056 L4.

Then the **three-layer defense** framing — this is the conceptual payoff. Present it as defense-in-depth where each layer is independently sufficient and they fail independently:
1. **Column shape** — no `updatedAt`/`deletedAt`; the schema doesn't even *model* mutation.
2. **DB policy** — Postgres refuses UPDATE/DELETE to the app role regardless of what the query says.
3. **Application discipline** — no `/lib` or `/app` code path issues an UPDATE or DELETE on `audit_logs`; `logAudit` only inserts.
Mantra: **the database refuses; the application never asks.**

Name the one sanctioned escape: the rare "legal order to retract a row" and the retention job both run as the **owner role** (which is not subject to FORCE'd policies / has the grants), explicitly and documented — never the app role. Tie back to Ch056 L4's two-URL / least-privilege shape (`DATABASE_URL_OWNER`, named not built; full role grants are Ch081). Don't build it; name the seam.

**Component — `AnnotatedCode` or `Code`** for the two policy blocks. Keep it short; the mechanics (`pgPolicy`, `authenticatedRole`, `enableRLS`, FORCE-by-hand) were taught in Ch056 L4 — *do not re-teach them*, just show the new `for: 'update'`/`'delete'` + `false` shape and note "same enable+force checklist as last chapter."

**Diagram — the three layers.** A simple HTML+CSS `<Figure>` (custom, `components/lessons/057/5/`) showing a write attempt hitting three stacked gates: an UPDATE/DELETE bounces off all three (column model has no mutable fields → policy says false → no app code path exists); an INSERT passes through into the table. Goal: make "append-only is enforced three independent ways" *visual*, not a bullet list. Keep horizontal/compact (height budget). This is a layered-defense illustration, not a system graph — HTML+CSS per the diagram guide. (If the agent judges a plain stacked-list figure cleaner, that's acceptable — the pedagogical goal is "three independent layers," not a specific picture.)

`Term` candidates: **RLS** (re-gloss in one line — row-level security, per-row policy enforced inside Postgres; student saw it in Ch056 but a hover saves a context switch), **app role** (the non-owner DB role request handlers connect as).

---

### Writing the row — logAudit(tx, event)

The writer the whole chapter has been calling. This is the section that delivers L4's debt. Build it small and explain *why* its shape is the shape.

The signature — and the load-bearing design choice:
- `logAudit(tx: Transaction, event: AuditEvent): Promise<void>` — first argument is a **transaction handle**, not the pooled `db`. Make the point loudly: this is deliberate. Because audit writes must ride inside the mutation's transaction (the iff guarantee) and inside `withTenant`'s `set_config` scope (so the org-isolation policy's `WITH CHECK` passes), the *only correct* way to call it is from inside a transaction. By typing the first param as `Transaction`, **calling it on the bare `db` is a compile error.** The type signature *is* the discipline — same reflex as `tenantDb` and `authedAction`. State this lineage explicitly: it's the chapter's recurring move.
- `Transaction` type is the one Ch056 L4 already exported from `@/db` (reuse, don't redefine).
- `AuditEvent` shape must match the call sites L4 already shipped: `{ action: string; subjectType?: string; subjectId?: string; payload?: Record<string, unknown> }` plus the actor/IP/UA context. **Reconcile the L4 call shape**: L4 calls `logAudit(tx, { action, subjectId?, payload? })`. So `subjectType` and the actor context (`actorUserId`, `actorIp`, `actorUserAgent`) must be supplied another way — decide and state it clearly for downstream coherence:
  - Recommended: the actor context (`actorUserId`, IP, UA) is read inside `logAudit` from a request-scoped source the action already has, OR threaded via a small `actor` object. Given L4's calls pass only `{ action, subjectId?, payload? }`, the cleanest reconciliation is that `logAudit` derives actor from `requireOrgUser()`'s cached result + a request-headers read, and `organizationId` from the same `app.org_id`/`ctx.orgId`. **The agent must pick one mechanism and make the L4 call sites valid under it.** Note this as a deliberate contract decision so it's coherent; flag any divergence from L4 in continuity notes.
- Body: a single `tx.insert(auditLogs).values({ … })`. No external IO (the no-IO-in-transaction rule from Ch056 L4 holds; an audit insert is pure DB work, which is fine).

The composition in context — show the full pattern the student now recognizes: inside an `authedAction` body, `await withTenant(orgId, async (tx) => { /* the mutation */; await logAudit(tx, { action: 'member.removed', subjectId: memberId, payload: { previousRole } }); })`. This is the "one transaction = work + audit row" shape made concrete. Both defense layers (app sets `organizationId`, policy `WITH CHECK` pins it) ride along — callback to Ch056 L4.

**Component — `AnnotatedCode`** on `logAudit` itself (the file at `db/` or `lib/`, decide and state — given it's pure DB work writing a tenant table it belongs under `db/` near `tenant.ts`/`withTenant`; `import 'server-only'`). Steps: (1) the `tx: Transaction` param + why it's not `db` (the compile-error guarantee — orange), (2) deriving actor/org context, (3) the `tx.insert(...).values(...)`, (4) return `void`.

**Component — `CodeVariants`** for the wrong-vs-right call shape: tab "Won't compile / breaks the iff" = `logAudit(db, …)` after the transaction commits (or via `after()`), tab "Correct" = inside `withTenant`'s `tx`. The wrong tab is the canonical trap; show the type error in prose. This wrong-then-right archetype is the lesson's most important teaching beat for the iff guarantee.

---

### The payload — readable forensics, not a column dump

Short, focused subsection on the `jsonb` `payload` because juniors get it wrong in two directions (dump everything / record nothing useful).

Two payload shapes by event kind:
- **State changes** (role change, settings edit) → `{ before, after }` diff. Record *only the fields that changed*, not the whole row. Example: role change → `{ before: 'member', after: 'admin' }`.
- **Action events** (export, deletion) → the operation arguments: `{ exportType: 'customers', rowCount: 1247 }`.

The reflex: payload is **human-readable forensics** — terse enough to scan in an incident, complete enough to reconstruct what happened. Not a database dump. Map back to L4's concrete payloads (`member.role-changed` → `{before, after}`, `member.removed` → `{previousRole}`, `org.ownership-transferred` → `{from, to, demotedTo}`) so the student sees the catalog is already coherent.

**The PII reflex** — a senior counter-intuition worth its own paragraph: payloads *will* contain personal data (emails, names, before/after of a profile field). Do **not** hash/obfuscate it "for safety" — that destroys forensic readability and buys nothing, because the protection is *access control on the table* (the org-isolation policy + the closely-held read surface), not opacity of the rows. Audit logs are *supposed* to be sensitive; protect the table, not the bytes. This is the kind of "what beginners get wrong in the real world" point the course prizes.

Use a small `Code` block or two showing a couple of real payloads side by side (good terse diff vs bad whole-row dump) — could be `CodeVariants` (over-stuffed vs right-sized). Keep it light.

---

### The system actor — when nobody clicked the button

Brief but conceptually important: not every audit-worthy event has a human. A scheduled job promotes a trial to paid; a Stripe webhook creates a subscription. These write `actorUserId: null`, an `action` like `'system.subscription-created'`, and a `payload` carrying provenance (`{ source: 'stripe-webhook', eventId: '…' }`). This is exactly why `actorUserId` is nullable (callback to the schema section).

The reflex: **a null actor is information, not an omission** — "the system did this, here's which subsystem and why." Don't skip the audit row just because there's no user. Forward-ref: the webhook-driven case wires up in Ch063 (where `processed_events` also lives — distinguish: `processed_events` is dedup/idempotency, the audit row is the business record; a webhook may touch both).

No new component — prose + a one-line `Code` example of a system-actor `values({...})`. Could fold into the `logAudit` section if the agent prefers, but a named subsection keeps the "null actor is valid" point from getting lost.

---

### How long the rows live — retention and the read surface

Close the loop with the two operational questions the table raises. Keep both *named-not-built* — they're forward pointers, not implementations.

**Retention.** Audit logs grow unboundedly; you need a deletion horizon. The senior framing: retain for the *longer* of (the regulatory horizon — e.g. HIPAA ~6 years, SOC 2 commonly ~1 year) or (the product's defensible window). Year-1 default with no specific regulatory commitment: ~2 years, implemented as a scheduled deletion job that runs **as the owner role** (the only role that can DELETE past the policy + FORCE). A counter-intuition worth stating: audit logs often have *longer* retention than the data they describe, because they record the *actions taken on* that data (forward-ref GDPR retention, Ch081 L4 — the customer-data side). Name the job's existence and the owner-role requirement; don't build it.

**The read surface.** Admins+ get a read-only "Activity log" in settings — paginated, filterable by actor and action, scoped through `withTenant` (the org-isolation policy applies on read too). Straight Server Component + Drizzle query against the `(organizationId, createdAt desc)` index. The *export-for-legal-response* path is separate, authenticated, and itself triggers an audit event (`'audit.exported'` — auditing the audit read). Name the page; the build is routine and out of scope here.

**The recursive question, answered once:** "who audits the audit log?" In year-1 SaaS, *nothing* — there's no audit-of-the-audit table. The protection is the append-only contract + the no-DELETE policy + the closely-held owner role + the retention job reviewed in code. Resist building "audit log of the audit log"; that's infinite regress. This pre-empts a clever-student question and models the senior judgment of *where to stop*.

Components: prose-led. Optionally a tiny `Screenshot` of an Activity-log table UI to make the read surface concrete, but only if cheap — otherwise skip. No exercise here.

---

### Closing synthesis + understanding check

Pull the chapter's through-line together in a few lines: the audit log is the *record* half of the authorization story whose *enforcement* half was the rest of the chapter. The one mechanism that makes it trustworthy — **the audit row rides in the same transaction as the work, via a helper that won't compile outside one** — is the same "make-the-wrong-thing-impossible" reflex as `tenantDb` (Ch056 L2), `withTenant` (Ch056 L4), and `authedAction` (Ch057 L2). Three structural guarantees, one philosophy.

**Diagram — `DiagramSequence`** (the lesson's closing centerpiece): scrub through one privileged action's full lifecycle, ending in the durable audit row. Steps: (1) `authedAction` body entered, `ctx` ready; (2) `withTenant(orgId, …)` opens a transaction + `set_config('app.org_id', …, true)`; (3) the mutation runs (e.g. delete the member row); (4) `logAudit(tx, {action, subjectId, payload})` inserts the audit row in the *same* tx — note the policy's `WITH CHECK` pins org, append-only policy permits INSERT; (5) **commit** — both rows land together, or neither does (highlight: the iff guarantee is the commit boundary); (6) `revalidatePath` after commit. Pedagogical goal: cement "work + audit = one atomic unit" and locate every concept (RLS scope, append-only, the helper) on a single timeline. Mermaid `sequenceDiagram` is the fallback if `DiagramSequence` is heavier than needed, but the scrub-through-steps interaction suits the "atomic unit" point well.

**Exercise — understanding check.** Two short items:
- `MultipleChoice` (single-correct), the iff trap: "An `authedAction` removes a member, then schedules the audit write in an `after()` callback so the response returns faster. What's the bug?" Distractors: "it's fine, `after()` runs reliably" / "the audit row gets the wrong timestamp" / **correct:** "if the `after()` write fails the member is gone but no audit row exists — the action looks successful but the trail is lost; audit must be in the mutation's transaction" / "`after()` can't access the database." `McqWhy` reinforces the iff.
- Optionally a second `MultipleChoice` on the append-only enforcement ("Which layer stops a buggy `UPDATE audit_logs` query from the app role?" → the DB policy `USING (false)`, *and* recognize the column shape + app discipline as the other two layers).

Avoid a `DrizzleSchemaCoding` exercise for the policy/RLS behavior: per the project's own Ch056 L4 finding (in scope memory), **PGlite does not enforce RLS**, so a sandbox would pass with the policy deleted — the exact false confidence this lesson warns against. A schema-shape-only `DrizzleSchemaCoding` (build the `audit_logs` columns + the two indexes, graded on columns/flags, *no* RLS probe) is *optional and acceptable* if the agent wants a hands-on beat — but it must not claim to verify append-only enforcement, and it must respect the documented PGlite limits (no `uuidv7()` default in probes, drop identity/enum quirks). Default to the MCQs if unsure; the judgment `Buckets` earlier is the lesson's primary active-recall.

---

### External resources

2–4 `ExternalResource` cards: Postgres `CREATE POLICY` docs (for the UPDATE/DELETE-deny pattern), a credible "what to put in an audit log" / SOC 2 audit-trail write-up, the Drizzle `jsonb` column docs. A `VideoCallout` only if a genuinely on-topic, recent (≤ ~18mo) video on application audit logging or append-only/event-sourcing-lite design surfaces — do not force one; the resourcer should fail-open and skip rather than embed a weak fit. (Honor the YouTube MCP quota note.)

---

## Scope

**This lesson covers:** the `audit_logs` column shape; the append-only (deny UPDATE/DELETE) RLS policy as the *second* policy on the table; the three-layer append-only defense framing; `logAudit(tx, event)` and why its signature forces a transaction; the canonical event catalog and the audit-vs-noise judgment; payload shape (diff vs args) and the PII reflex; the null/system actor; retention and read-surface as named forward pointers; the closing "one transaction = work + audit" synthesis.

**Already taught — redefine in one line at most, do not re-teach:**
- RLS concept + the org-isolation policy on `audit_logs` + `pgPolicy`/`.enableRLS()`/hand-added FORCE + `withTenant(orgId, fn)` + `set_config('app.org_id', …, true)` + the `SET` vs `SET LOCAL` pooled-connection footgun — **Ch056 L3 (decision) + L4 (wiring)**. This lesson *uses* `withTenant` and *adds a policy*; it must not re-explain how RLS works or how `withTenant` is built.
- `tenantDb(orgId)`, the raw `db` vs `tenantDb` split, the `Transaction` type exported from `@/db` — **Ch056 L2 / L4**.
- `authedAction(role, schema, fn)`, the `ctx = { user, orgId, role, db }` payload, the body-carries-audit / wrapper-carries-authz division — **Ch057 L2**. Show `logAudit` *inside* an action body but don't re-teach the wrapper.
- The five member-management flows and their concrete audit events/payloads (`member.role-changed`/`removed`/`left`, `org.ownership-transferred`) — **Ch057 L4**. Reuse these as the worked examples; the `logAudit` call shape must be backward-compatible with L4's `logAudit(tx, { action, subjectId?, payload? })`.
- Drizzle schema conventions (snake-case via client casing, UUIDv7 pk, explicit index names), `Result`/`err`/`ok`, `import 'server-only'` — house conventions; apply silently.

**Explicitly out of scope (name as forward pointers, do not build):**
- DB-role split / least-privilege grants / `DATABASE_URL_OWNER` `BYPASSRLS` mechanics — **Ch081** (named once as the owner-role escape for retention/legal-retract).
- The full security baseline audit — **Ch081**.
- GDPR / customer-data retention timers — **Ch081 L4** (audit retention named here, contrasted as often-longer).
- The audit-log export-for-legal-response build — named once (triggers `'audit.exported'`), not built.
- `processed_events` / webhook idempotency ledger — **Ch063** (distinguish from the audit row; the system-actor webhook case is named here, wired there).
- Billing-plan-change audit events — **Unit 11** (named in the catalog only).
- The integration test that proves isolation on real Postgres — **Ch088** (PGlite can't enforce RLS; do not ship a sandbox claiming to).
- Per-row payload encryption — explicitly *not* a year-1 reach (the PII section argues against it).
- Activity feeds (user-facing) — different concept, named and dismissed.
- A total-ordering `seq` column for sub-millisecond tie-breaking — name once as the reach if same-transaction inserts ever need strict ordering; default is `createdAt`. (Minor; include only if it fits.)

---

## Notes for downstream agents

- The single most important coherence task: **make `logAudit`'s signature backward-compatible with the call sites Ch057 L4 already shipped** (`logAudit(tx, { action, subjectId?, payload? })`). Pick one mechanism for supplying `actorUserId`/IP/UA/`organizationId` and ensure L4's calls remain valid under it; record the decision in continuity notes.
- Do **not** re-teach RLS or `withTenant` internals — Ch056 L4 owns them; this lesson is the table + the second policy + the writer. Resisting that re-teach is the main scope discipline.
- The chapter's recurring thesis — *make the wrong call shape not compile* (`tenantDb`, `authedAction`, now `logAudit(tx, …)`) — should be named explicitly as the synthesis; it's the payoff of the whole chapter.
- `actorIp` is `text` (fact-checked: no first-class Drizzle `inet()` builder); mention Postgres `inet` only as a one-line "the validating native type" aside, don't build a custom type.
