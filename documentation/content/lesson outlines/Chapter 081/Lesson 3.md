# What belongs in the audit log

- Title: What belongs in the audit log
- Sidebar label: The audit log policy

## Lesson framing

This is a **judgment / audit-pass lesson, not a build lesson.** The student already shipped the machinery in ch057 L5: the `auditLogs` table (append-only by column shape), the two RLS policies denying UPDATE/DELETE, and `logAudit(tx, event)` whose `Transaction`-typed first param makes off-transaction writes a compile error. They have called `logAudit` from the member-management flows (ch057 L4). What is missing — and what this lesson lands — is the **policy layer**: a senior's catalog of which events earn a row, which are forbidden, what the payload looks like, who reads the table, and how user-deletion interacts. The deliverable is the **canonical event catalog** that ch082 audits a seeded codebase against.

Pedagogical spine. The senior contribution is decisions, so the lesson teaches **four frameworks the student applies, not four snippets they copy**: (1) the audit-worthy inclusion test, (2) the explicit forbidden set with where-each-goes-instead, (3) the payload-shaping rule, (4) the three-audiences read model. Each framework resolves to a one-line heuristic the student can run at a code-review. Code's role is minimal and recognition-only — the student reads `logAudit` call shapes to anchor the policy, never authors the helper (it exists). Lean hard on classification exercises (`Buckets`, `MultipleChoice`, `TrueFalse`): the skill being tested is "is this an audit event?", which is a sorting judgment, not a coding task.

The central correction for downstream agents. The ch081 chapter outline brainstorm says payload PII is "redacted... enforced by `logAudit`." **This contradicts the shipped ch057 L5 contract and the code conventions, and must not be taught that way.** Ground truth (ch057 L5 continuity + conventions §Logging): the audit payload is *shaped for forensics* (changed-fields diff, operation args) — that is **data minimization**, not byte-level scrubbing — and confidentiality comes from **access control** (the org-isolation RLS policy + a closely-held read surface), *not* from redacting bytes. The pino/Sentry **redactor** (ch080 L2) protects a *different* artifact, the operator log stream; it does not wrap `logAudit`. Teach the distinction explicitly; it is one of the lesson's load-bearing senior insights and a common beginner conflation.

Three threads from the chapter framing carry through: **one place per rule** (the catalog is the grep-able single source; adding an event class to the codebase means adding it here), **fail-closed** (the row exists iff the mutation committed — the `tx`-first signature is the enforcement), and the **message-split from ch080** (audit row, operator log, and user-facing string are three distinct artifacts with three audiences — do not collapse them).

Mental model the student should leave with: *the audit log is the legal/forensic record of privileged human action, co-committed with the mutation, kept confidential by access control, and rendered — never read raw — for three audiences.* By the end they can look at any new mutation and answer: does this earn an audit row, what is its `action` name, what goes in the payload, and who will read it.

## Lesson sections

### The three jobs the audit log does

Open with the senior question (implicitly, per the guidelines — not as a labelled section): the table and `logAudit` are already in the codebase, so the question is no longer *how* to write a row but *which* rows deserve to exist. Motivate by naming the three jobs the log serves, because the inclusion rules later in the lesson fall directly out of them:

1. **Forensic** — "who did what, when, from where" during an incident or dispute. The 3am-rule audience.
2. **Compliance** — SOC 2 / GDPR want an immutable identity-and-access record; auditors read date ranges.
3. **Product trust** — a customer-facing "Activity" surface reads the *same table* so the customer can self-serve "who removed Bob?".

Land the framing one-liner: **one source, three audiences.** This is the spine the rest of the lesson hangs on — every later decision (what to include, what shape, who reads) traces back to serving these three without serving them badly.

Keep this section short and prose-only. No diagram yet; the audiences get a diagram later where it pays off (the read-model section).

Connect back to what they know: contrast with ch080's pino logs (operator-only, ephemeral, redacted) — the audit log is *durable*, *customer-readable in part*, and *the legal record*. Conventions §Logging line: "Audit log writes go through `logAudit` — they are not pino logs. Different table, different audience." Quote that distinction; it is the hook.

### The events that earn a row

The inclusion framework. Teach the test first, then the catalog — defaults before the enumeration, per the guidelines.

**The inclusion test (the heuristic).** An event earns an audit row when it is **(a) user-attributable AND (b) security- or trust-relevant AND (c) a state change, not a read.** State it as the one-liner the student runs at review: *"Privileged human verbs, not reads, not CRUD ticks."* (This is the ch057 L5 judgment, restated as the lesson's first framework.)

**The canonical event set — six categories.** Present as a reference catalog. Use `Card`/`CardGrid` (one card per category) so it reads as a scannable catalog, not a wall of bullets — this *is* the deliverable artifact, so it should look like one. Each card: the category name + 3-6 concrete event names in the canonical naming convention.

1. **Identity** — `auth.signed-in`, `auth.signed-out`, `auth.signed-up`, `password.changed`, `password.reset`, `mfa.enrolled`, `mfa.removed`, `session.revoked`.
2. **Membership / RBAC** — `member.invited`, `member.joined`, `member.removed`, `member.role-changed`, `org.ownership-transferred`, `invitation.revoked`.
3. **Billing** — `subscription.created`, `subscription.canceled`, `plan.changed`, `payment-method.added`, `payment-method.removed`, `refund.issued`.
4. **Privileged data access** — `export.started`, `export.completed`, `admin.tenant-data-viewed` (impersonation), `records.bulk-deleted`, `account.deletion-requested`, `account.deletion-completed`.
5. **Configuration** — `api-key.created`, `api-key.revoked`, `webhook-endpoint.added`, `sso.settings-changed`, `security-setting.changed`.
6. **Tenant lifecycle** — `org.created`, `org.deleted`, `org.transferred`.

**Naming convention — align with ch057, NOT the chapter outline.** The chapter outline brainstorm wrote dot-style names like `member.role.changed`. The *shipped* ch057 L5 contract is **`entity.verb-pasttense`** (single dot, hyphenated past-tense verb): `member.role-changed`, `member.removed`, `org.ownership-transferred`. All event names in this lesson MUST follow the ch057 form. Flag this for downstream agents: the catalog above already uses the corrected form; do not regress to triple-segment dotted names. Note the events that appear verbatim in ch057 L4 call sites (`member.role-changed` payload `{ before, after }`, `member.removed` payload `{ previousRole }`, `org.ownership-transferred` payload `{ from, to, demotedTo }`) so the lesson's examples reuse code the student has already seen compile.

**The closure rule.** Land the one-place-per-rule thread: *adding a new privileged action class to the codebase requires adding it to this catalog.* The catalog is the grep-able single source. A new verb that does not fit a category is a deliberate decision, never a quiet drift (mirrors ch080 L3's "six seams is a closed set" framing).

Exercise (active recall on the inclusion test): a `Buckets` drill, two buckets — **Audit it** vs **Don't audit it**. Items mix clear-yes (changed a member's role, issued a refund, created an API key), clear-no (viewed the customer list, opened the dashboard, a 404 on a typo'd URL), and the instructive edge cases the next section forbids (failed sign-in, a background retention sweep, a successful row read). This single drill seeds the next section's forbidden set, so the wrong answers here become teaching moments.

### What never goes in the log

The forbidden set is its own framework because beginners *over-log* — the instinct is "audit everything," which buries the signal and bloats a legal record. Teach the three forbidden classes, each with **where it goes instead** (the "instead" is the load-bearing part — forbidding without redirecting just creates a gap):

- **Reads of resources the user may access** — every list/detail page view. Too noisy; drowns the forensic signal. → Goes to pino / Sentry structured logs (operator-only), not the audit table. (Exception inside the catalog: *privileged* reads — impersonation, exports — *are* audited, because the access itself is the security event. Draw the line carefully: routine read = no; privileged/cross-tenant read = yes.)
- **Failed authorization / failed auth** — a rejected sign-in, a cross-tenant attempt, a role-too-low refusal. → These are **Sentry events** with a code (`cross_tenant_attempt`, `unauthorized`), per ch080 L2/L3. *Audit successes, not failures.* (ch057 L5 rule, restated.) Give the reasoning: a failed attempt is a security *signal* for the operator, not a customer-trust *record*; and logging every failed login lets an attacker flood the customer's Activity page.
- **Internal background jobs the user did not trigger** — a nightly retention sweep, a queue retry. → That is *job history* (a different table / observability), not a user-attributable record. (Note the seam to ch063's system-actor and ch081 L4's retention job: a job acting on a user's *behalf* — e.g. the deletion job — *does* write audit rows with `actorUserId: null` and `action: 'system.<verb>'`; an internal sweep that is not on anyone's behalf does not. The distinction is *attributability*, not *who holds the keyboard*.)

Land the boundary one-liner: **user-attributable and security-relevant, or it does not belong.**

Use an `Aside` (caution) for the sharpest watch-out: *logging reads fills the table with noise and turns a legal record into a firehose — the most common audit-log mistake in the wild.*

Reinforce with a short `TrueFalse` round (3-4 statements) targeting the exact confusions: "A failed login should be written to the audit log" (false → Sentry), "Viewing an invoice should be audited" (false → it's a read), "An admin impersonating a tenant should be audited" (true → privileged access), "The nightly retention job's deletions should write audit rows attributed to the user whose data was deleted" (false → that's a sweep / job history; but the *on-request* deletion job does write `system.*` rows — surface this nuance in the per-card explanation).

### The shape of an entry

Now the field-level contract. The student saw the table in ch057 L5; here it is revisited *through the policy lens* — what each field is *for* from an audit-policy standpoint, not how it was declared. Do not re-teach the Drizzle column builders or the RLS policy (that is ch057 L5 / ch056 L4 — name as prerequisite, move on).

**The per-entry fields.** Present the row shape as a compact reference using a `Code` block of the `AuditEvent` type plus a short table of the persisted columns. Persisted columns (canonical from ch057 L5 — must match exactly): `id`, `organizationId`, `actorUserId` (nullable — null = system actor; FK `onDelete: 'set null'`), `actorIp` (text), `actorUserAgent` (text, truncated 512), `action` (the canonical name), `subjectType`, `subjectId` (text, not uuid), `payload` (jsonb), `createdAt` (server `now()`). The caller passes only the `AuditEvent`: `{ action, subjectType?, subjectId?, payload? }` — `logAudit` derives actor/org/ip/ua/time itself. Emphasize *the caller cannot supply the actor or timestamp* — that is the integrity property (next paragraph).

**Server time is the only time.** Call out `createdAt` defaults to server `now()` and is never client-supplied. Reasoning: a client-clock timestamp is a skew/forgery vector — an attacker could backdate or future-date their own actions in the legal record. This is a small but genuinely senior point; give it a sentence of "why," not just the rule.

**Actor type — derive, don't trust.** The `actorUserId` being nullable encodes the user/system split. Name the four conceptual actor kinds the chapter outline lists (user, system, api_key, webhook) but reconcile honestly with the shipped schema: ch057 L5 ships **`actorUserId` nullable** (null ⇒ system), *not* a separate `actorType` enum column. Frame the four kinds as the *conceptual* taxonomy the `action` prefix and the null/non-null actor together express (`system.*` actions carry `actorUserId: null` + provenance in payload, per ch057 L5's system-actor convention), and note that promoting `actorType` to a real column is a deliberate future extension, not the year-1 shape. Flag for downstream agents: do **not** invent an `actorType` column in code samples — it is not in the schema; use the nullable-actor + `action`-prefix convention.

Use `AnnotatedCode` here on a single realistic `logAudit` call (reuse ch057 L4's `member.role-changed` flow verbatim — it is known-compiling): step through (1) the `tx` first arg = the transaction enforcement, (2) the `action` name = catalog membership, (3) `subjectId` = the row acted on, (4) `payload: { before, after }` = the forensic diff. Keep to 4 steps, blue tint default. This is the one place a code walkthrough earns its weight, because it ties the abstract policy to a concrete row the student has already written.

### Payload is forensics, not a data dump

This is the lesson's most important *and* most error-prone section — it carries the central correction. Give it its own h3 and teach it as a framework with a sharp before/after.

**The rule.** The payload answers *"what changed / what were the operation's arguments"* in human-readable terms — nothing more. State changes → `{ before, after }` of **only the changed fields**. Action events → the operation's arguments (e.g. `member.invited` → `{ email, role }`). Events where the *fact* is the whole record carry an **empty payload** (`password.changed` → `{}`; the event's existence is the record). One-liner: **the payload is a forensic diff, not a request log.**

**The correction — confidentiality is access control, not byte scrubbing.** Address the conflation head-on with a `CodeVariants` before/after (two tabs, "Wrong" / "Right"):
- *Wrong tab*: dumping the raw Server Action input / full row / response into `payload` (`payload: rawFormData`), then trying to "redact" it. Explain why this is wrong on two counts: (1) it couples the log to incidental request shape and (2) it imports PII and secrets you then have to chase.
- *Right tab*: a hand-shaped `{ before: { role: 'member' }, after: { role: 'admin' } }`. Minimal, stable, exactly the forensic facts.

Then state the load-bearing distinction explicitly (this is the part that overrides the chapter outline brainstorm): **the audit payload is not byte-redacted.** The protection model is:
- **Data minimization at write time** — you put in only the forensic facts, so PII that is *not* part of the event never enters the payload in the first place. (`data.deletion-requested` → the *datasets/tables* being deleted, never the data itself; `member.invited` → the invitee email *is* legitimately the event, so it belongs.)
- **Confidentiality by access control at read time** — the org-isolation RLS policy + a closely-held read surface keep the row from the wrong eyes. *Not* a redactor on the bytes.
- **The pino/Sentry redactor is a different artifact.** Tie back to ch080 L2: that redactor strips `password`/`token`/`secret`/PII keys from the *operator log stream*. It does **not** wrap `logAudit`, and the audit payload is not run through it. Two artifacts, two mechanisms.

Make the senior insight quotable: **redact the operator log; minimize the audit payload; protect the table with RLS.** Three artifacts, three different protections.

`Aside` (caution): the inverse failure — dumping raw input "and we'll redact later" is how secrets and PII end up in the permanent legal record; minimization at write time is the only reliable defense, because the audit row is append-only and you cannot scrub it afterward.

Exercise: `MultipleChoice` (single-answer) — given an event (`member.role-changed`), pick the best payload from four options (raw FormData dump; full member row; `{ before, after }` changed-fields; empty). Distractors map to the exact mistakes the section warns about, so the wrong picks are diagnostic.

### The append-only guarantee, revisited

Short revisit, not a re-teach — frame it as "you built this in ch057; here is why it is the second pillar of the audit policy." The student already has the three-layer defense; this section's job is to re-anchor it in the *baseline-audit* mindset (what you grep for) and connect it to deletion (next section).

**The three layers (recap, one line each):** (1) column shape — no `updatedAt`/`deletedAt` to mutate; (2) DB policy — two RLS policies with `USING (false)` deny UPDATE/DELETE to the app role; (3) application discipline — only `logAudit` inserts; nothing issues UPDATE/DELETE on `auditLogs`. The mantra (ch057 L5): **the database refuses; the application never asks.**

**The baseline-audit move.** The grep: `auditLogs` referenced anywhere outside `logAudit`, the migrations, and read paths is a finding. This is the lesson's contribution to the chapter-wide "audit pass" deliverable — name it as a check the student runs, consistent with ch080 L3's grep-driven seam audit.

**The one sanctioned write path (forward-pointer to L4).** There *is* exactly one legitimate UPDATE/DELETE path: the privileged owner-role connection (`DATABASE_URL_OWNER`) used by legal-retraction and the retention job — *not* the app role. Name it here as the bridge to L4 (retention) and to the next section (deletion anonymization); do not build it. This honestly reconciles "append-only" with "audit rows get anonymized on deletion": the anonymization runs as the owner role, outside the app's `USING (false)` policy, never from a Server Action.

Visual: a small **defense-in-depth diagram** — three nested layers (column shape → RLS policy → app discipline) wrapping the `auditLogs` table, with the single owner-role arrow piercing all three from the side, labelled "retention / legal only (L4)." Plain **HTML + CSS** inside a `<Figure>` (concentric/nested boxes are exactly the html-css.md use case; cheap, devtools-inspectable, no engine needed). Pedagogical goal: make "three independent layers + one deliberate exception" a single glanceable picture, so the student internalizes that the exception is *architected*, not a hole.

### Who reads it, and reading is audited too

The read-model framework — the third audience-facing pillar. The same table serves three readers with three different queries and three different renderings; teach the model, not the implementation (the Activity-page Server Component is named-not-built in ch057 L5 and stays out of scope here — this is a policy lesson).

**The three audiences (concrete):**
1. **Customer admin** — reads their *own org's* Activity page. A tenant-scoped read (org-isolation policy already enforces the boundary). Sees a *rendered* feed, never raw rows.
2. **Platform operator** — reads *cross-tenant* during an incident. Gated by the `superadmin` role. **The catch:** this read is *itself* audited — it writes `admin.audit-log-queried`. Reading the most sensitive table is a privileged action, so it earns its own row. This is the section's surprise-and-delight senior point; give it emphasis.
3. **Compliance officer** — exports a date range for SOC 2 (writes its own `audit.exported` event, per ch057 L5). Named, not built.

**Render, never read raw — `formatAuditEvent`.** The customer-facing feed goes through a `formatAuditEvent(event)` helper that turns the structured row into a localized human string ("Alice promoted Bob from member to admin" from `{ before, after }`). The rule: **the UI renders from a formatter, never from raw `payload`.** Reasoning (the senior "why"): rendering raw `payload` couples the UI to the schema, so a payload-shape change silently breaks the customer's Activity page; the formatter is the stable seam (one source, many renderings). Note i18n lands in ch084 — here just establish that the rendered string is authored for a human and goes through one helper. Name `formatAuditEvent` as the seam; do not implement it (out of scope — policy lesson).

Diagram: a **one-source / three-reads fan-out** — single `auditLogs` table on the left, three arrows to the three readers on the right, each arrow labelled with its query scope (org-scoped / cross-tenant+superadmin / date-range export) and its rendering (rendered feed / raw incident view / CSV export), with a small loop-back arrow from the operator read showing it writes `admin.audit-log-queried` back to the table. Engine: **D2** (system-architecture/fan-out shape with traffic labels — d2.md's sweet spot; horizontal layout fits the vertical-space constraint), wrapped in `<Figure>`. Pedagogical goal: cement "one table, three audiences, and reading-it-is-itself-an-event" — the self-referential audit loop is the hard-to-grasp idea and a picture nails it.

`Aside` (danger): a cross-tenant read without the `superadmin` gate is a tenant data leak — the operator door must be as guarded as any other privileged action, *and* logged.

### When a user is forgotten

The deletion interaction — the bridge to L4 and the GDPR posture. This section is *policy only*: it establishes the rule and the *why*; the deletion-job mechanics, the three deletion shapes (hard/soft/anonymize), and the retention timer are all **ch081 L4** (the very next lesson) — explicitly forward-reference, do not build.

**The tension.** GDPR's right to erasure says "delete the user's data." Append-only says "audit rows are immutable." These collide. The senior resolution: **audit entries are *anonymized*, not deleted.** The legal/forensic record of *what happened* must survive (you cannot prove compliance with a record you destroyed, and the action is the org's record, not solely the individual's); the *link to the natural person* is severed.

**How anonymization works here (reconciled with the shipped schema):**
- `actorUserId` is already `onDelete: 'set null'` (ch057 L5) — so deleting the `user` row **automatically nulls the actor** via the FK. This is the cleanest layer and the student already shipped it; call it out as "the schema already does half the job."
- `payload` is scrubbed of any PII it legitimately held (e.g. an invitee email in a `member.invited` event) by the **owner-role** retention/deletion path (the one sanctioned write from the append-only section) — *not* by the app. Because payloads were *minimized* at write time, there is little to scrub: minimization at write makes anonymization at deletion cheap. Tie the two sections together explicitly — this is the payoff of the payload-shaping rule.

**The result.** The row persists ("a role was changed from member to admin at 14:03"), the actor is `null` or a stable hash, PII is gone. The forensic fact survives; the person does not. One-liner: **anonymize, don't delete — keep the record, sever the identity.**

Forward-reference L4 cleanly: "the *job* that performs this — and the retention timers, deletion shapes, and third-party deletion calls — is the next lesson." Keep this section tight; its job is the *rule and the why*, handing the *how* to L4.

`Term` the GDPR right by name (right to erasure / right to be forgotten) on first use.

### The deliverable — the event catalog

Close by collecting the lesson into its artifact, consistent with every other ch081 lesson ending in a grep-able deliverable. The **audit-log event catalog**: per event class, the columns `category | action name | subjectType | payload shape | retention class`. This is the thing ch082 audits the seeded codebase against ("every privileged action class in the code maps to a catalog row, and vice versa").

Present the catalog as a filled-in reference table (a `Code`/markdown table) seeded with the canonical events from the six-category card grid, with payload shapes from the lesson (`{ before, after }`, `{ previousRole }`, `{}`, etc.) and retention classes deferred to L4 (identity 2y / billing 7y / privileged-access 7y — name them, note "L4 owns the timer"). The retention column is a forward-pointer, included so the catalog is complete for ch082 but flagged as L4-owned.

End with the closing rule that mirrors the chapter's thesis: **the catalog is the contract — a privileged action with no catalog row is a missing audit; a catalog row with no code is dead policy.** Both are findings.

### Terms for Tooltip

Use the `Term` component for (be strategic — only these):
- **SOC 2** — non-obvious acronym; the compliance audience driving immutability/retention.
- **GDPR** + **right to erasure / right to be forgotten** — defines the deletion-anonymization tension.
- **PII** — used throughout the payload-shaping section; define once.
- **RLS (Row-Level Security)** — prerequisite from ch056; re-explain in one line without breaking flow (the policy enforcing org-isolation and append-only).
- **`superadmin`** — the platform-operator role gating cross-tenant reads; may be unfamiliar as a distinct role from the org-level `owner`.
- **Forensic** — used in the "payload is forensics" framing; a one-line gloss (the after-the-fact reconstruction audience) sharpens the section.

Do **not** `Term` the everyday words (audit log, payload, actor) — they are defined by the lesson itself.

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- The `auditLogs` table schema, the two append-only RLS policies, and the `logAudit(tx, event)` helper itself — **ch057 L5**. Restate the *shape* (fields, signature, append-only) as a one-paragraph recap; the lesson reasons *about* these, it does not rebuild them.
- `withTenant(orgId, fn)` and `SET LOCAL app.org_id` (why the audit INSERT needs it) — **ch056 L4**. Name it as the transaction the `logAudit` call rides inside; do not re-derive the RLS-variable mechanism.
- The pino/Sentry **redactor** and the user/operator **message-split** — **ch080 L2**. Referenced to *contrast* with the audit payload (different artifact); do not re-teach the redactor's config.
- `tenantDb(orgId)` application-layer scoping — **ch056 L2**. Named as the read-path scoping for the customer Activity query.

**Deferred — name, forward-reference, do not build:**
- The **retention timers**, the daily Trigger.dev retention job, the **deletion-on-request job**, the three deletion shapes (hard/soft/anonymize), third-party deletion calls, and the no-real-PII-in-non-prod rule — **ch081 L4** (the immediately following lesson). This lesson establishes the *anonymize-don't-delete rule and why*; L4 owns the *how*. The retention column in the deliverable catalog is a forward-pointer to L4.
- The customer-facing **Activity page** Server Component, the `formatAuditEvent` implementation, the cross-tenant `superadmin` read view, and the compliance CSV export — named as the read surfaces (ch057 L5 already flags them "not built"); this lesson teaches the *read model and policy*, not the components. i18n of rendered strings is **ch084**.
- The **webhook/system-actor** write case and the `processed_events` idempotency ledger — **ch063**. Referenced only to distinguish "job on a user's behalf writes `system.*` rows" from "internal sweep is not audited."
- Sentry capture of failed-auth / cross-tenant events — **ch080 L2/L3 + ch092**. Named as the destination for the *forbidden* set, not wired.

**Out of scope entirely (name once at most, or omit):**
- SIEM integration, log shipping to an external store, cryptographically chained / tamper-evident logs (hash-chaining each row) — out of scope for the year-1 baseline; one sentence at most if it sharpens the append-only framing, otherwise omit.
- A dedicated `actorType` enum column, a total-ordering `seq` tie-breaker column — explicitly *not* in the shipped schema (ch057 L5 dropped `seq`; `actorType` is conceptual only). Downstream agents must not introduce either in code samples.

## Notes for downstream agents (corrections to the chapter outline brainstorm)

These are deliberate divergences from the ch081 chapter outline, grounded in the shipped ch057 L5 contract and the code conventions. Honor them:

1. **No payload "redaction enforced by `logAudit`."** The brainstorm's framing is wrong against the shipped contract. Payloads are *minimized at write time*; confidentiality is *RLS + closely-held reads*; the *redactor* is a separate ch080 artifact for the operator log stream. This is taught as an explicit correction (§"Payload is forensics, not a data dump").
2. **Event naming is `entity.verb-pasttense` (ch057 form)**, e.g. `member.role-changed` — *not* the brainstorm's `member.role.changed`. All samples use the single-dot hyphenated form.
3. **No `actorType` column.** The schema ships `actorUserId` nullable (null ⇒ system). The four actor kinds are a *conceptual* taxonomy expressed via the nullable actor + `action` prefix, not a real enum column.
4. **`logAudit` call shape is `logAudit(tx, { action, subjectType?, subjectId?, payload? })`** (ch057 L5 `AuditEvent`), and rides inside `withTenant(orgId, …)` (ch056 L4) — never `ctx.db.transaction`, never `logAudit(db, …)`.
5. This is a **policy/judgment lesson**: code is recognition-only (one `AnnotatedCode` walkthrough + one before/after `CodeVariants`), and the assessment is classification exercises (`Buckets`, `MultipleChoice`, `TrueFalse`), not authoring.
