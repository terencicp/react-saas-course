# Retention and the right to be forgotten

Sidebar label: Retention & erasure

---

## Lesson framing

This is lesson 4 of chapter 081 (the security baseline), an audit-pass chapter. The student already holds every primitive this lesson assembles: soft-delete `deletedAt` + visibility helpers (ch061), `withTenant(orgId, fn)` + `logAudit(tx, event)` (ch057 L5 / ch081 L3), Trigger.dev v4 `schemaTask`/`schedules.task` (ch066), R2 + object lifecycle (ch068), the async export job (ch067/069), `authedAction`/`Result`/fail-closed (ch080), and `Temporal` (conventions). The lesson does **not** teach those primitives again — it composes them into the two GDPR-class obligations a 2026 SaaS cannot ship without: **retention** (data minimization — nothing lives forever) and **erasure** (the right to be forgotten — a deletion request that completes, fully, or refuses).

**The senior framing, not the legal framing.** This is an engineering lesson, not a law lecture. GDPR / CCPA / LGPD are named once as *why the requirement exists* and then dropped; the body is about data-graph modeling, job design, and partial-failure discipline. The durable senior insight: erasure and retention are the same problem viewed twice — "what is the smallest implementation that deletes the right rows, never the wrong ones, survives a half-failure, and keeps working as the schema grows?" The answer both times is **a declarative catalog that drives a job**, never hand-coded table lists scattered across the app.

**Two load-bearing mental models the whole lesson hangs on.**
1. **Catalog drives the job.** Retention policy lives in one file (`lib/retention.ts`) as data — `{ table, cutoffColumn, ttl, shape }` rows. The daily job *walks* the catalog; it never hard-codes a table. A new table with PII = a new catalog row, not a code change in the job. This is the same "one place per rule, grep-able" thread from L1–L3.
2. **Three deletion shapes, declared per table, never improvised.** Hard delete (row gone), soft delete (`deletedAt` set, hidden by ch061 helpers), anonymize (row stays, PII scrubbed). The wrong shape silently violates the right — a soft-deleted row that still holds the user's email satisfies *neither* retention *nor* erasure. The shape is a column in the catalog, decided once.

**The two threads from chapters 080 and the rest of 081 that carry through.** (a) **Fail-closed / async** — deletion touches a dozen tables and three external vendors; a synchronous version blocks the request for minutes and a half-completed one is the worst outcome of all (PII partly gone, partly not, no record of which). So erasure is *always* an enqueued Trigger.dev job, idempotent, that marks the user `deletion_in_progress` so they can't sign in mid-wipe, and either completes or alerts an operator. (b) **Anonymize-don't-delete for the audit log** — L3 already established that erasure nulls `actorUserId` (FK `onDelete: 'set null'`) and scrubs payload PII; the legal/forensic fact survives, the link to the natural person is severed. This lesson *uses* that resolution as one step of the deletion job; it does not re-derive it.

**Pedagogical shape.** Teach the simpler obligation first (retention: a scheduled sweep over a catalog) to establish the catalog-drives-job model on easy ground, *then* erasure (the harder, multi-step, partial-failure-prone obligation) reusing the same catalog mental model plus the three shapes. Lead each major section with its senior question. This is mostly a **design + judgment** lesson, like L2 and L3 — code samples are recognition-grade (the student reads the catalog shape, the job skeleton, the deletion-graph walk; they don't author a production deletion job inline). The two interactive checks should test *judgment* (which shape for which table; ordering the deletion steps) not syntax. One diagram carries the deletion-job sequence; one carries the three-shapes decision. Keep external-vendor and legal-carve-out material tight — name, don't belabor.

**What the student can do at the end.** Given a schema, classify every table into a deletion shape and a retention class; explain why erasure must be async and idempotent and what `deletion_in_progress` protects; describe the deletion-job step graph including the three external vendors and the audit-log anonymization; state the no-real-PII-in-non-prod rule and why a dev seed with real emails turns localhost into a breach; recognize the four canonical failure modes (soft-delete-without-scrub, sync deletion, un-scoped retention sweep, skipped vendor call).

---

## Lesson sections

### Two rights, one shape

**Goal:** frame both obligations and plant the unifying mental model before any mechanism.

Open with the senior question (implicit, per pedagogy): a user emails "delete my account and everything you have on me." A regulator asks "how long do you keep inactive accounts?" Both are legally enforceable; both are, underneath, the same engineering question. Name the two rights briefly and concretely, *not* as legal exposition:
- **Erasure** (right to be forgotten) — on request, the user's personal data is *gone*: not flagged, gone (with named exceptions: legal-retention categories anonymized, audit log anonymized). Legal clock: respond "without undue delay, within one month" (GDPR Art. 12(3)/17); a healthy system completes in hours. State the deadline as one month, not "30 days" — the latter is industry shorthand and slightly imprecise; downstream agents should use the one-month / without-undue-delay framing.
- **Retention** (data minimization) — every class of data has a maximum lifetime; an automated process deletes past the cutoff. Inactive accounts, expired sessions, old email logs, stale export artifacts.

State the unifying insight explicitly as the lesson's spine: both are solved by **a declarative catalog that drives a job, never scattered hand-coded deletes**, and both must pick one of **three deletion shapes** per table. Preview that we teach retention first (simpler — one scheduled sweep) then erasure (harder — multi-step, externally-fanned-out, partial-failure-prone), reusing the same two models.

Small framing aside (`Aside` note): the legal text (Privacy Policy, DPA, SCCs) is the legal team's; the *engineering* deliverable is the catalog and the jobs — and the subprocessor list the legal team copies from. That boundary is named here and revisited in the carve-out section. Keep it to two sentences.

Tooltip terms to introduce here (via `Term`): *GDPR* (EU data-protection regulation; the 2026 baseline most regimes converged toward), *right to be forgotten / erasure* (GDPR Art. 17), *data minimization* (the principle behind retention — don't keep data longer than its purpose needs), *PII* (personally identifiable information; the data class both rights govern). Define each in one clause so the legal vocabulary never interrupts the engineering flow.

### The retention catalog and the daily sweep

**Goal:** establish the catalog-drives-job model on the simpler obligation, and the per-tenant + idempotent discipline of the sweep.

Senior question: data accumulates forever by default — every session, every email log row, every export artifact sits in Postgres and R2 until something removes it. What's the smallest implementation that expires each class on its own schedule and keeps working when a new table appears?

**The catalog as data.** Introduce `lib/retention.ts` as a module-scope array of typed entries — the single source of truth, the same "one place, grep-able" property as `lib/rate-limit.ts` (L2) and the audit catalog (L3). Each entry: `table`, `cutoffColumn` (the timestamp the TTL measures from — `lastActivityAt`, `createdAt`, `expiresAt`), `ttl` (a `Temporal.Duration` per conventions, never raw ms), and `shape` (forward-reference to the next section; for retention sweeps it's almost always hard-delete, but declared explicitly). Use **`AnnotatedCode`** on a trimmed catalog (4–6 representative rows) so attention lands on each field's role one at a time — this is the load-bearing artifact of the section. Representative rows to show: `session` (90d after `lastActivityAt`), `email_log` (30d after `createdAt`), `export_artifact` (7d — flagged as R2-delegated, see next sub-point), `notification` inbox rows (90d), `audit_log:identity` (2y) / `audit_log:billing` (7y) as catalog rows whose TTLs were *forward-referenced from L3's Retention column* — close that loop explicitly so the student sees L3's catalog column was a promissory note this lesson redeems.

**The sweep job — Trigger.dev `schedules.task`, daily.** Show a recognition-grade skeleton (simple **`Code`** block, not AnnotatedCode — the shape is short): a `schedules.task` with a cron `cron` field (UTC — the conventions/ch066 rule, internal cadence uses UTC not a named zone) that iterates the catalog, and for each entry deletes rows where `cutoffColumn < now - ttl`, logging a per-class count. Hammer four properties in prose around the skeleton, each tied to a primitive the student already owns:
- **Catalog-driven, not table-hardcoded** — the job body is a loop over `RETENTION_POLICIES`; adding a table never edits the job. (Restate the spine.)
- **Idempotent** — running twice deletes nothing extra (a row already past cutoff is already gone). This is why a missed run self-heals on the next day; ties to ch066 idempotency.
- **Per-tenant safety** — the delete predicate is time-based and table-wide *by design* for global classes (sessions, email logs), but any tenant-scoped class must filter, and the watch-out is explicit: a retention sweep that forgets tenant scoping on a shared table is a cross-tenant data-loss bug, not just a leak. This is the inverse of the tenancy discipline the student knows from ch060–061.
- **System actor, not audited as a user action** — per L3's `system.*` rule: the sweep is an untriggered background job, so it is *not* audited at all (L3: "untriggered sweeps are not audited"). State this to prevent the student writing a `logAudit` call inside the sweep — it's a deliberate non-action that surprises beginners.

**Delegate to the storage layer when you can — R2 lifecycle.** The `export_artifact` row in the catalog is special: the *bytes* live in R2, and R2 has native object-lifecycle rules (expire objects N days after creation) configured once on the bucket. So the retention job only deletes the Postgres `file_metadata` row; the blob expiry is delegated to R2. State the principle as durable senior judgment: *when retention can be pushed down to the storage layer, push it down* — don't build a job to do what the platform does declaratively. Tie back to ch068 (R2 setup) and ch061's "cooled-off object cleanup." One `Aside` tip is enough; no diagram needed.

Brief mention (one sentence, not a sub-section): the inactive-account class (`3y after lastSignInAt`) carries a 60-day warning email before deletion — name it as the one retention class that touches the user, defer the dispatcher mechanics to ch070 which the student has seen.

No exercise here — the judgment payload is the catalog *contents*, which the next section's exercise (deletion shapes) covers more sharply. Keep this section tight; its job is to install the catalog-drives-job model cheaply.

### Three deletion shapes

**Goal:** the per-table decision that governs *both* rights; the most reusable judgment in the lesson.

Senior question: "delete this user's data" does not mean `DELETE FROM` everywhere. A shared invoice has legal value; an audit row is the security record; a comment on a shared document is partly someone else's context. Deleting the row outright is sometimes wrong, sometimes the only correct answer. Which?

Introduce the three shapes crisply, each with its *when* and a concrete table:
- **Hard delete** — row removed. For PII the user owns *alone* and that has no legal/shared value: their profile row, their sessions, their personal API keys, their notification-preferences. The default for self-owned PII.
- **Soft delete** — `deletedAt` set, hidden everywhere by the ch061 visibility helper (`active()`), row physically present. For rows with **shared or legal value that must stay queryable in context** but disappear from the user's view. Explicitly call out the trap: *soft delete alone does not satisfy erasure* — the PII is still in the row. Soft delete is a visibility tool, not an erasure tool; it pairs with anonymize when the row holds PII.
- **Anonymize** — row stays, PII columns scrubbed (set to null or a stable hash), non-PII forensic/relational data preserved. For the **audit log** (L3's resolution — `actorUserId` via FK `onDelete: 'set null'`, payload PII scrubbed) and for shared artifacts where the *fact* matters but the *person* must be severed (e.g., "a former member created this record").

Make the relationship between soft-delete and anonymize sharp, because it's the #1 thing beginners get wrong: soft-delete answers "should this still be *visible*?"; anonymize answers "must the PII be *removed*?". A shared row a user requested erasure of often needs **both** — soft-deleted from active views *and* anonymized so the retained row holds no PII. Visualize this as a small **decision diagram** (Mermaid `flowchart LR`, wrapped in `Figure`): start "row holds this user's PII" → "owned by this user alone?" → yes → "has legal/shared value?" → no → **Hard delete**; the legal/shared branches route to **Anonymize** (and **+ soft-delete** when it should also vanish from views). Keep it ≤6 nodes, horizontal, short labels (per diagram height constraint). Pedagogical goal: give the student a runnable mental flowchart they can apply to any table, not memorize a table list.

Tie the shape back to the catalog: the deletion-shape decision is recorded per table in the **same catalog mental model** — the deletion job reads a per-table shape map exactly as the retention sweep reads TTLs. One source of truth for "what happens to this table's rows," consumed by two jobs.

**Exercise — `Buckets` (classification).** Sort ~8–10 concrete tables/row-types into the three shapes: e.g. user profile → hard; session → hard; personal API key → hard; **invoice (shared/legal)** → soft+anonymize; **audit_log row** → anonymize; **comment on shared doc** → anonymize (often + soft); notification preferences → hard; **org membership of a departing user** → anonymize/soft (the *fact* a person was a member is shared history). Two-column or three-column layout per the component. This drills the single most transferable judgment in the lesson; grading is the shape assignment. Add one or two deliberately tricky items (the invoice, the audit row) since those are exactly where the soft-vs-anonymize confusion lives. Provide concise per-item rationale in the answer state.

### The deletion-on-request job

**Goal:** the erasure flow end to end — async, idempotent, fail-closed, complete — reusing the retention catalog model and the three shapes.

Senior question: the user clicks "Delete my account." This single click must cascade through a dozen Postgres tables, three external vendors, and R2, and either finish completely or leave a clean, recoverable state — never a half-deletion. How is that shaped?

**The request side — thin, synchronous, auditable.** Walk the `authedAction` (the student's canonical wrapper from ch080) that handles the click, as a short ordered list (use `Steps`):
1. **Re-authenticate / authorize.** Self-deletion requires a fresh session — tie to the `freshAge` elevation rule from conventions (Better Auth `freshAge` 10 min; high-stakes mutations re-prompt). Admin-initiated deletion requires the RBAC role check (ch060). A doubt here is a deny (fail-closed, ch080).
2. **Write the audit entry** `account.deletion-requested` via `logAudit(tx, event)` — the request itself is a privileged, user-attributable action (L3 inclusion test), so it earns a row, and it commits inside the same transaction as the next step.
3. **Mark the user `deletion_in_progress` and enqueue the job** in the *same* transaction (`withTenant` wrapper): set a status flag and `tasks.trigger('delete-user', { userId, orgId }, { idempotencyKey })`. The flag is what blocks sign-in mid-deletion (the auth ladder checks it). The stable `idempotencyKey` (ch066) makes a double-click harmless.
4. **Return a confirmation** `Result.ok` — the UI shows "deletion in progress, you'll get an email when it's done." The work is async; the action returns in milliseconds.

Emphasize the *enqueue-or-nothing* invariant: the flag-set and the enqueue share a transaction, so you can never end up flagged-but-not-enqueued (the canonical "it never actually happens" bug — a deletion-request flag with no job behind it). This is the same co-commit discipline as `logAudit(tx, …)`.

**The job side — the data-graph walk.** This is the section's centerpiece. The `delete-user` task (Trigger.dev `schemaTask` with a Zod payload, per ch066/conventions) walks the user's data graph applying the per-table shape from the catalog. Present the full sequence as a **`DiagramSequence`** (the scrubbable step component) so the student steps through the ordered graph walk one stage at a time — this is the best vehicle because the *order* and the *completeness* are the lesson, and a static list buries that. Stages to depict:
1. **Internal hard-deletes** — sessions, personal API keys, notification preferences, profile-owned rows (FK `onDelete: 'cascade'` does much of this from the user row; show that cascades are part of the graph, ch061/conventions).
2. **Soft-delete + anonymize the shared rows** — memberships, invoices' PII fields, comments: shape per catalog.
3. **Anonymize the audit log** — `actorUserId` → null via the FK `onDelete: 'set null'` (L3's resolution; reuse, don't re-derive), payload PII scrubbed by the owner-role path. The forensic record survives.
4. **R2 blobs** — delete the user's export artifacts / uploads (ch068/069); or rely on lifecycle where applicable.
5. **External vendors** — `stripe.customers.del`, Resend audience-contact delete, PostHog person delete. Each is a discrete, retried step.
6. **Finalize** — flip the user row to deleted (hard or tombstoned), write `account.deletion-completed` audit entry with a summary payload `{ tablesPurged, externalsPurged, durationMs }`, send the confirmation email.

Around the diagram, hammer the three job-design properties (each a primitive the student owns):
- **Idempotent and checkpointed** — every step is safe to re-run; the job retries per-step on failure (ch066 `schemaTask` retries, step boundaries). A vendor call failing mid-graph resumes, never restarts from scratch and never double-deletes.
- **Fail-closed on the user, not on the data** — `deletion_in_progress` keeps the user locked out for the whole run; partial completion never leaves a usable half-deleted account. Tie to ch080's "every doubt is a deny."
- **Complete or alert** — an irrecoverable failure (e.g., Stripe down past retries) does *not* silently mark complete; it alerts an operator and the user sees an honest status. The worst outcome is a job that reports success with PII still at a vendor.

**External-vendor calls — a tight sub-point, not a tour.** State the rule: erasure isn't done until the PII is gone from every *processor*, not just your DB. Name the three calls (Stripe, Resend, PostHog) as discrete retried steps and move on — the SDK specifics are out of scope. One `Aside` caution: skipping a vendor call is the silent-leak failure mode (your DB is clean, the user's data still sits at Stripe). Connect to the subprocessor-list deliverable named in section 1.

**Exercise — `Sequence` (ordering).** Give the student the deletion-job steps shuffled and have them order them, with the load-bearing constraints baked into the grading: re-auth/authorize *first*; audit-write + flag + enqueue share the request transaction (request side) before any data touches (job side); finalize/complete-audit/email *last*; vendor calls and anonymization before the final tombstone. This drills the ordering and completeness that the diagram taught. `Sequence` (drag-to-order) is the right fit because order *is* the assessed concept.

### Don't satisfy half a right

**Goal:** consolidate the canonical failure modes as a single recognizable set, plus the non-prod PII rule that most teams get wrong.

This section gathers the watch-outs that belong to the *whole* obligation rather than one mechanism (per the guidelines, mechanism-specific watch-outs already live in their sections above). Frame as "here is how teams ship something that looks compliant and isn't."

**The four canonical half-measures** (brief, each one sentence + why it fails):
- **Soft-delete without scrubbing** — looks deleted, PII still in the row; satisfies neither right. (Callback to the three-shapes section.)
- **Synchronous deletion** — blocks the request for minutes and leaves a half-wipe on timeout; always async. (Callback to the job section.)
- **Un-scoped retention sweep** — a missing tenant filter deletes another tenant's data; cross-tenant *data loss*, the inverse of a leak.
- **Skipped vendor call** — DB clean, PII still at Stripe/Resend/PostHog; erasure is incomplete the moment one processor is missed.

**The no-real-PII-in-non-prod rule.** Distinct, important, and frequently violated: dev and staging must *never* hold real PII. A production DB dump copied to staging turns staging into an uncontrolled PII store outside your retention and erasure machinery — a deletion request against prod doesn't reach the staging copy. The rule: seed synthetic data only, emails under a reserved domain (`@example.test` / RFC 2606 `example.com`), and a CI check that **fails the build** if any seed email isn't synthetic. Frame as senior judgment: the cheapest GDPR control is never creating the liability. One short `Code` snippet of the CI guard's essence (a check over seed emails) is enough — recognition-grade.

**The legal-retention carve-out, closed honestly.** Restate the one genuine exception to "erasure means gone": financial/tax records (≈7y), regulated communications — these are *anonymized and retained* for the legal window, not deleted, and the completion email is honest about which categories were retained. This reconciles the apparent contradiction with the audit-log 7y class from L3 — same principle, applied to invoices. One paragraph; the mechanism (anonymize) is already taught.

**Close the loop to the chapter's deliverable.** One closing line: this lesson's output is the **retention catalog + deletion-shape map**, the artifact ch082 audits a seeded codebase against (alongside L1–L3's deliverables). Name it; the student met this "audit deliverable" framing in L1–L3.

Optional `ExternalResource` LinkCards at the end (not inline): the official GDPR Art. 17 text, and Trigger.dev `schedules` docs — both as "go deeper," since the lesson deliberately stays engineering-shaped over legal.

---

## Scope

**Prerequisites — redefine in one clause each, do not re-teach:**
- Soft delete / `deletedAt` / visibility helpers (`active()`, `includingDeleted()`) — ch061; this lesson *uses* them as the "soft delete" shape.
- `withTenant(orgId, fn)` + `logAudit(tx, event)`, `entity.verb-pasttense` naming, the `system.*` prefix, anonymize-via-`onDelete:'set null'` — ch057 L5 / ch081 L3; reused, the audit-log anonymization is **owned by L3**, this lesson only invokes it as a deletion step.
- Trigger.dev v4 `schemaTask` / `schedules.task` / `tasks.trigger` / `idempotencyKey` / per-step retries — ch066; reused, not re-taught.
- R2 + object lifecycle + `file_metadata` row — ch068/069; reused for blob deletion and the delegate-to-storage point.
- `authedAction` / `Result` / `err` / fail-closed / `freshAge` elevation — ch080 + conventions; the request-side action is built on these.
- `Temporal.Duration` for TTLs — conventions.

**Explicitly out of scope (defer or name-only):**
- **Audit-log schema, RLS, and the derivation of anonymize-don't-delete** — owned by ch057 L5 / ch081 L3. This lesson invokes the resolution, never re-derives the table or its append-only enforcement.
- **The export/portability job mechanics** (GDPR Art. 20 right to data portability) — owned by ch067/069. Name once that the same export pattern serves the portability right; do not rebuild it.
- **Notification-dispatcher mechanics** for the warning/confirmation emails — ch070; name the emails, defer the how.
- **External-vendor SDK specifics** (Stripe/Resend/PostHog deletion API surfaces) — name the three calls as steps; SDK depth out of scope.
- **Trigger.dev API depth, queues, waitpoints, DST scheduling** — ch066 and ch072 L4; this lesson uses the minimal `schemaTask`/`schedules.task` surface only.
- **Legal artifacts** — Privacy Policy, DPA, SCCs, TIAs, the CCPA "Do Not Sell" link — named as the legal team's domain (engineering owns the subprocessor list); no legal copy authored.
- **Right to rectification** beyond trivial self-edit — out of scope entirely.
- **Cookie/marketing consent** — that's L5 (`useConsent`, marketing-email opt-in); do not touch consent here, even though both are GDPR — keep the boundary clean.
- **Backup-purge and replica-catch-up mechanics** — name once (erasure eventually reaches backups) as a reality; the implementation (backup rotation windows) is infra, out of scope.
