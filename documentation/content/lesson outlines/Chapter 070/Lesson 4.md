# Lesson 4 — Dedup the rapid duplicates

**Title (h1):** Dedup the rapid duplicates
**Sidebar label:** Dedup rapid duplicates

---

## Lesson framing

The smallest of the four teaching lessons: one mechanic (a 60-second dedup window) with one clear failure mode. This lesson closes the dispatcher arc by filling the last unfilled counter — `DispatchResult.deduped`, declared in L1, untouched by L2 and L3. That continuity payoff is the spine: L1 declared the contract, L2 built the fan-out, L3 made `suppressedByPrefs` real, and this lesson makes `deduped` real. Open on that gap explicitly.

Pedagogical conclusions that apply lesson-wide:

- **Lead with the failure, not the table.** The senior question is concrete and visceral: a user mashes "Resend invitation" five times, a Stripe webhook retries three times, two admins demote the same member at once. Without protection that's five emails and five inbox rows. Every student has rage-clicked a slow button — anchor there before any schema appears. The pain the mechanic relieves (annoyed users, real deliverability damage) is the motivation.
- **Two conceptual cuts carry the whole lesson.** (1) Dedup (drop the duplicate) vs. coalesce (collapse a burst into one summary row). (2) Idempotency layered: webhook idempotency stops the *state* churn at the handler boundary (Ch063), dispatcher dedup stops the *notification* churn — they compose, neither replaces the other. Get these two distinctions landed and the mechanic itself is small.
- **The mental model to leave the student with:** "Before I fan out to channels for a recipient, I ask: did I already send this exact thing to this exact person in the last minute? If yes, skip and count it. If no, send and record that I did." Three moving parts — the *window* (how long), the *key* (what counts as 'the same thing'), the *place* (a dedicated table, checked inside the dispatcher's per-recipient loop, between prefs and fan-out).
- **Minimize cognitive load by reusing, not re-teaching.** The dispatcher loop, the registry, `DispatchResult`, the snake-case Drizzle client, UUIDv7, explicit index naming, the after-commit rule — all established in L1–L3 and in Units 9–10. Lean on them; this lesson adds exactly one table, one check, one insert, and the slot they occupy in the existing loop.
- **Where beginners get this wrong (the load-bearing watch-outs, taught inline):** a dedup key that's too narrow (includes a timestamp) makes every event unique so nothing ever dedupes; a key too broad (only `eventType`) collapses unrelated events for different subjects; checking dedup *before* prefs writes dedup rows for recipients who never received anything (poisoning the count and the window); a window sized at the cron retry cadence (60s window, 60s retries) puts retries right at the edge. These are the real-world traps — frame each as a senior reflex, not a footnote.
- **Honest about the race.** The check-and-insert is not atomic: two concurrent dispatches both check, both miss, both send. Name it, quantify the cost (one extra notification per rare concurrent burst), and justify why v1 accepts it (a duplicate is far less bad than a unique-constraint insert-failure path the dispatcher would have to handle, and far less bad than a *missed* notification under contention). Name the lock-it-down upgrade; don't build it. This honesty is the senior-mindset content — the mechanic is trivial, the judgment around it is the lesson.
- **Triggers before tools, deferred upgrades named:** coalesce (when comments/mentions ship), Redis-backed dedup (Ch074 / Upstash, when a DB write per dispatch becomes the bottleneck), the nightly cleanup job (Ch066, Trigger.dev). Each gets one or two sentences naming the threshold that crosses into it — no implementations.
- **Visuals over prose for the two hard ideas.** A `DiagramSequence` walks a five-click burst through the dispatcher (first wins, next four deduped) — the temporal nature of a burst is exactly what a scrubbable sequence shows well. A small flowchart pins where the check sits in the loop. A `StateMachineWalker` (decision mode) drills the dedup-vs-coalesce choice.
- **Exercises target the two failure-prone skills:** designing the dedup key (an MCQ on key breadth), and proving the window works (a `DrizzleCoding` exercise that runs the dedup check query against a seeded `notification_dedup` table). Keep them tight; this is a short lesson.
- **No YouTube video.** The concept is specific to this app's dispatcher and small; a generic "idempotency" video would dilute, not support. Skip it.

Estimated student time: 35–45 minutes.

---

## Lesson sections

### Introduction (no header)

Open on the burst. Concrete scene, 3–4 sentences: the user clicks "Resend invitation" five times in two seconds because the button felt unresponsive; a payment webhook retries three times after a worker timeout; two admins demote the same member in the same breath. State the cost in one line — five emails, five inbox rows, an annoyed user, and a real ding to sender reputation. Then name the gap: `dispatch()` already resolves channels and respects preferences, but it still fires once per call. The `DispatchResult.deduped` counter L1 declared has been sitting at zero through two lessons. This lesson makes it real. Preview the three moving parts (window, key, place) in one sentence. Keep it warm and tight — this is a short lesson and the intro should feel like the last brick, not a new wall.

Reference the prior lessons' lineage briefly (the loop from L3, the registry from L1) so the student knows this slots into a machine they've already built.

---

### A 60-second window catches the burst

**Goal:** establish the core mechanic — the window — and why 60 seconds is the default.

Content:
- The shape in one breath: a dedicated `notification_dedup` table records every (event, key, recipient) the dispatcher fires, with a `firedAt` timestamp. Before firing for a recipient, the dispatcher checks for a matching row inside the last 60 seconds; if one exists, it skips and counts a dedup; otherwise it fires and inserts a row.
- Why 60 seconds is the default, framed as a threshold (defaults-before-conditionals): 60s comfortably covers the *tight* bursts — rage-clicks (sub-second), a form re-submit, near-simultaneous admin actions, and fast in-process retries. Longer windows start dropping *legitimate* repeats (a user genuinely re-inviting someone ten minutes later should get a fresh notification); shorter windows let bursts leak through. 60 handles ~95% of cases.
- **Important correction for the build agent (fact-checked):** do NOT justify the 60s window by provider webhook retries. Real provider retries are spaced *much wider* than a minute — Stripe's first retry is at ~5 minutes, then 30 min, 2 h, escalating over 3 days (verified June 2026). A 60s window will never span those. That is by design: widely-spaced provider retries are caught at the **webhook-handler idempotency layer** (`processed_events` ledger, Ch063), not by the dispatcher's dedup window — which is exactly the layering the "different layers" section makes. So frame the window's job as *tight bursts and concurrent firings*, and let the handler ledger own *re-deliveries minutes apart*. Stating it this way turns a potential contradiction into a reinforcement of the two-layers point.
- Name the conditional: high-frequency event types (comments, mentions, if/when they ship) want a longer window, configured **per event type in the registry** (`dedup.windowSeconds`), not a global constant. The registry already owns per-event config (L1) — this is one more field on the entry. Show the registry entry's `dedup` shape here: `{ windowSeconds: 60, keyBy: [...] }`.

Code: a small `Code` block (`ts`) showing the `dedup` field on one registry entry (e.g. `'org.invitation.sent'`), consistent with L1's registry shape (`as const satisfies Record<string, NotifiableEvent>`). Highlight the `dedup` line. Keep it minimal — the registry is familiar; only the `dedup` field is new. Do NOT re-show the whole registry.

`Term` candidates in this section: **dedup** (deduplication — drop a repeat so the same thing isn't delivered twice).

Watch-out, taught inline (not bundled): a window sized to match the cron/webhook retry cadence (60s window against 60s retries) puts a retry right at the boundary where it might or might not be caught. Senior reflex: pick a window comfortably larger than the longest retry interval it must absorb. One sentence, in place.

---

### The key decides what counts as the same thing

**Goal:** the single most failure-prone decision in the lesson — what makes two firings "duplicates." This is where beginners break dedup.

Content:
- The composite key is `(eventType, dedupKey, recipientUserId)`. Walk each component and *why it's there*:
  - `eventType` — obviously, a role-change and an invitation aren't duplicates.
  - `dedupKey` — the per-event-type discriminator, defined in the registry as `dedup.keyBy`, an array of payload/subject field names the dispatcher reads to build the key. For `'org.invitation.sent'`, `keyBy: ['subjectId']` (the invitation id) — re-sending the same invitation dedupes. For `'org.member.role_changed'`, `keyBy: ['subjectId', 'newRole']` — demote→promote→demote within a minute yields one notification *per distinct transition*, not one total. The business meaning of "duplicate" varies per event, so the key is registry-defined, not hardcoded.
  - `recipientUserId` — dedup is **per recipient**. The same event reaching two different people is not a duplicate; each person's dedup window is independent. A role change notifies the affected member and (separately) audit-logs to the admin — those don't collide because the recipient is part of the key.
- The two failure modes, taught as the heart of the section (these are *the* watch-outs and they belong here, in the section teaching the key):
  - **Too narrow** — a key that folds in a timestamp or a request id makes every firing unique, so nothing ever matches and dedup silently does nothing. The diagnostic: dedup rate is flat zero when you expect bursts.
  - **Too broad** — a key of only `eventType` collapses unrelated events for different subjects (two different invitations to two different people dedupe into one). The diagnostic: legitimate distinct notifications go missing. Include the subject in the key.
- "First one wins" semantics: on a five-click burst, the first firing writes the inbox row and sends the email; the next four match the row and are dropped. The first event's payload is the one the user sees. If the bursting events differ in payload (rare), and the *wrong* one wins, that's the signal the dedup key is too broad — it should have distinguished them. Name this as the diagnostic, not a bug to panic over.

Component: use **`AnnotatedCode`** for a single `ts` block showing two registry `dedup` entries side-by-side in the same snippet — the invitation entry (`keyBy: ['subjectId']`) and the role-change entry (`keyBy: ['subjectId', 'newRole']`) — stepping through (1) the invitation key and why one field suffices, (2) the role-change key and why two fields, (3) the per-recipient dimension. One code block, attention directed to each `keyBy` in turn — this is exactly `AnnotatedCode`'s job. Color: blue default; consider green on the correct keys.

Exercise — **`MultipleChoice`** (single card, this is the key skill to check): "An app fires `'comment.created'` and wants to dedup rapid duplicate notifications when the same comment is delivered twice, but still notify on genuinely new comments. Which `keyBy` is correct?" Choices: `['createdAt']` (too narrow — every firing unique), `['eventType']` (too broad — collapses all comments), `['subjectId']` (correct — the comment id), `['subjectId', 'createdAt']` (too narrow again — timestamp defeats it). One correct. Rationale lines on each teach the breadth lesson. Place it right after the two-failure-modes prose.

`Term` candidates: **composite key** (a database key spanning multiple columns; a row is unique on the combination).

---

### Where the check sits in the dispatcher

**Goal:** pin the dedup check's exact place in the per-recipient loop the student already built, and justify the ordering. This is the continuity-payoff section — `deduped` gets filled here.

Content:
- The order inside the dispatcher, stated as a short pipeline: registry lookup → prefs read (batched, L3) → **per recipient: resolveChannels → dedup check → channel fan-out → dedup row insert**. Two ordering decisions, each justified:
  - **Prefs before dedup.** A recipient muted for this category gets no channels, so there's nothing to dedup and no reason to write a dedup row for them. Writing dedup rows for recipients who never received anything poisons both the count (meaningless `deduped` tallies) and the window (a later, wanted notification could match a phantom row). Resolve channels first; if the resolved list is empty, skip the recipient entirely before touching the dedup table. (Taught as a watch-out, inline.)
  - **Dedup before fan-out.** The entire point is to *not* send. Check, and on a hit, skip the inner channel loop and increment `result.deduped`. The dedup row insert goes *after* a successful fan-out, recording that this (event, key, recipient) was delivered.
- The continuity moment, made explicit: this is the third and final counter. L1 declared `DispatchResult { sent, deduped, suppressedByPrefs }`; L2 filled `sent`; L3 filled `suppressedByPrefs`; this `result.deduped++` fills the last one. Call it out — the contract is now whole.

Component A — **`DiagramSequence`** (the marquee visual). Walk the five-click burst through the dispatcher, one click per step, ~5 steps:
1. Click 1 arrives → dedup check: no matching row → fan-out runs (email + inbox lit) → dedup row inserted (`firedAt = T0`). Caption: first one wins.
2. Click 2 (T0 + 0.3s) → dedup check: row found within 60s → fan-out skipped, `deduped++`. Caption: dropped.
3. Clicks 3–4 → same, `deduped` climbs to 3. Caption: the burst is absorbed.
4. Click 5 → same, `deduped = 4`. Caption: one delivery, four dedups.
5. Result panel: `{ sent: 1, deduped: 4, suppressedByPrefs: 0 }` — the inbox shows one row, one email queued. Caption: this is the counter L1 declared, now real.
Author the panels as simple HTML/CSS (a row of channel "chips" lit/dim, a small dedup-table strip gaining one row, a result tally) — the temporal burst is precisely what a scrubbable sequence conveys that prose can't. Pedagogical goal: make "first wins, rest deduped, counter increments" viscerally legible.

Component B — a small **Mermaid `flowchart LR`** inside `<Figure>` pinning the per-recipient order: `resolveChannels → channels empty? --yes--> skip | --no--> dedup check → duplicate? --yes--> deduped++ | --no--> fan-out → insert dedup row`. Goal: the *placement* in the loop, as a static reference to complement the temporal sequence. Keep it horizontal and compact (vertical-space constraint).

Code — **`AnnotatedCode`** on a `ts` block that extends L3's exact per-recipient loop (reuse the `for (const userId of recipientUserIds)` shape verbatim, then insert the dedup check). Steps: (1) the familiar `resolveChannels` + empty-skip guard, (2) the new `await isDuplicate(...)` check and the `result.deduped++` / `continue` on hit, (3) the inner fan-out (unchanged, summarized), (4) the `await recordDedup(...)` insert after the loop. The point is to show dedup is a *two-line insertion* into a loop the student already owns. Highlight the new lines (green `ins`-style emphasis); grey the familiar surroundings. Keep ≤14 lines. `isDuplicate` and `recordDedup` are thin helpers in `lib/notifications/` — sketch their bodies in a separate small `Code` block or describe in prose, don't over-annotate.

Exercise — **`Sequence`** ordering drill: give the dispatcher's per-recipient steps shuffled — `resolveChannels`, `skip if no channels`, `dedup check`, `fan out to channels`, `insert dedup row` — and have the student order them. The fixed code context can be the loop skeleton. This drills the ordering rationale (prefs→dedup→fan-out→insert) that the section just taught. Place after Component B.

`Term` candidates: none new here (loop, fan-out, `DispatchResult` all prior).

---

### The notification_dedup table

**Goal:** the schema, the index that makes the check one fast read, and the cleanup that keeps the table small.

Content:
- The Drizzle table, following all course conventions (UUIDv7 pk, snake-case-on-client, explicit `onDelete`, explicit index name). Columns: `id` (UUIDv7), `eventType` (text), `dedupKey` (text), `recipientUserId` (text, FK → `user.id`, `onDelete: 'cascade'` — match L3's `text` FK to Better Auth's `user.id`, NOT `uuid()`), `firedAt` (timestamptz, default now). Note in prose: no `orgId` column — dedup is keyed on recipient + event identity, the same user-scoped reasoning L3 used for preferences; the tenant-leading-column rule (Ch039) does not apply to this internal bookkeeping tier.
- The covering index is what makes the dedup check a single indexed read rather than a scan of a growing table. `index('idx_notification_dedup_lookup').on(t.eventType, t.dedupKey, t.recipientUserId, t.firedAt.desc())` — columns ordered to match the check's `where` (equality on the three key columns, range on `firedAt`). Explicit name per convention; ship the index *with* the table (the same discipline L2 applied to the inbox index). Frame: an unindexed dedup check turns every dispatch into a linear scan — the index is not optional.
- The check query shape: `where eventType = ? and dedupKey = ? and recipientUserId = ? and firedAt > now() - 60s limit 1`. One indexed read; existence is all that matters.
- The cleanup job (trigger-before-tool, named and deferred): the table grows one row per delivered notification forever unless pruned. A nightly **Trigger.dev** job (Ch066) runs a single indexed `delete where firedAt < now() - (longest window + buffer)`. Without it the table grows unbounded; with it, it stays small. Keep cleanup **out of the request path** — never prune inline (adds latency to a user action). One paragraph, no implementation; the project chapter's verify step doesn't exercise it.

Component — **`CodeVariants`** is NOT needed; use **`AnnotatedCode`** on the `pgTable` definition stepping through (1) the key columns and the `text` recipient FK with cascade, (2) the `firedAt` timestamptz, (3) the composite index and its column order matching the check. One block, attention to the schema decisions. This is the only place full DDL for `notification_dedup` appears in the chapter — get it canonical.

Exercise — **`DrizzleCoding`** (the proof-the-window-works exercise). Provide the `notification_dedup` schema and seed it with one row for `('org.invitation.sent', 'inv_123', 'user_a')` fired ~5 seconds ago and one fired ~10 minutes ago for a different key. Starter: the student finishes the dedup check query — return whether a matching row exists for `('org.invitation.sent', 'inv_123', 'user_a')` within the last 60 seconds. `expectedRows`: the one recent row (the 10-min-old one must be excluded by the window). This makes the window *tangible* — the student sees the time predicate do its job. Keep the schema panel visible so they read the index. Note for the build agent: PGlite/`now()` arithmetic — seed `firedAt` with explicit timestamps relative to a fixed "now," or use interval literals the student can compute against `now()`; verify the time math runs in PGlite (per project memory on PGlite exercise limits — avoid `uuidv7()` in seed DDL, use plain literals for ids).

`Term` candidates: **covering index** (an index whose columns satisfy the query's filter so the lookup never touches the heap — optional, only if not defined earlier in the course; check before adding).

---

### Dedup is not coalesce

**Goal:** the conceptual line that prevents the student from over-reaching — when to drop vs. when to summarize. Short, decision-focused.

Content:
- Dedup *drops* the duplicate outright (everything above). Coalesce *collapses* a burst into a single summary notification: "Jane commented 5 times on Invoice #42." Different shape, different data model (collect events into a pending bucket, flush on a timer or count threshold), different UX.
- The decision rule: dedup when the repeats are *the same event* the user should see once (resend invitation, retried webhook). Coalesce when the repeats are *distinct but noisy* events the user would rather see summarized (a flurry of comments, a burst of mentions). Dedup says "you already know this"; coalesce says "here's the gist of a lot of small things."
- Defer coalesce explicitly: v1 ships dedup only. Coalesce earns its weight when noisy event types (comments, mentions) ship and the inbox starts to spam — not before. Name it as the canonical next step, sketch the mechanism in one sentence, don't build it.

Component — **`StateMachineWalker`** (`kind="decision"`), a 2–3 question drill that walks the senior's reasoning: "Are the repeats the same logical event or distinct events?" → same → "Drop them (dedup)"; distinct → "Are they individually worth a notification, or noise in aggregate?" → individually → "Send each (no dedup)"; noise → "Summarize them (coalesce — deferred)". Leaves name the verdict and one-line reason. Goal: the lesson lives in the *order of the questions*, exactly the walker's strength — sameness before individual-worth. Keeps the dedup-vs-coalesce line from being a flat definition.

`Term` candidates: **coalesce** (collapse multiple events into one summarized notification).

---

### Webhook idempotency and dispatcher dedup are different layers

**Goal:** prevent the common confusion that webhook idempotency (Ch063) already handles this. Land the layering. Short.

Content:
- Ch063 lands idempotency at the *handler boundary*: a duplicate webhook delivery (same `event.id`, replayed) produces the same state via the `processed_events` ledger — no second state transition, so no second event fires *from the database*. That's **state** idempotency.
- But the ledger only stops *re-deliveries of the same event id*. If a webhook handler *does* call `dispatch()`, and the provider delivers the *same logical event under two different event ids* (or the same user-action arrives via both a webhook and a direct action), the dispatcher's dedup catches the **notification** churn the ledger can't see. That's a different layer.
- The composition, stated plainly: webhook idempotency prevents redundant state writes; dispatcher dedup prevents redundant notifications. They stack — neither makes the other unnecessary. A senior reaches for both: the ledger at the edge, the dedup window at the dispatcher.

Component: a tiny `Aside` (note) or a two-row HTML strip inside `<Figure>` contrasting the two layers (boundary / what it dedupes / keyed on) — `webhook handler | state churn | processed_events(provider, event_id)` vs. `dispatcher | notification churn | (eventType, dedupKey, recipientUserId)`. Optional; keep it light. Prose alone is acceptable if the section stays tight.

`Term` candidates: **idempotency** (an operation that, repeated, has the same effect as running it once — re-explain concisely since it's load-bearing here and was last seen in Ch063).

---

### Watching the dedup rate

**Goal:** the observability reflex — close the lesson on what a senior *monitors*, tying back to `DispatchResult`. Brief.

Content:
- `DispatchResult` already reports `{ sent, deduped, suppressedByPrefs }`. Structured logs (pino, Ch092/Unit 19) capture these counts per dispatch.
- The signal: a *steady low* dedup rate means the system is working as designed (the occasional double-click absorbed). A *sudden spike* means a call site is firing duplicates that shouldn't exist — a bug upstream (a re-render firing the action twice, a loop calling `dispatch` per row instead of once). The senior alerts on the *delta*, not the floor — treating "dedup is happening" as inherently fine misses the bug signal.
- Defer the dashboard to Unit 19; the point here is that the counter the lesson just filled is also a health metric.

No new component — prose closes it. Optionally a one-line `Code` showing the logged shape `logger.info({ seam: 'notifications.dispatch', ...result })`.

End with a forward glance: the dispatcher is now complete — seam (L1), channels (L2), preferences (L3), dedup (L4). Ch071 wires this finished `dispatch()` into three real call sites. One or two sentences; this is the last teaching lesson before the quiz.

Optional **External resources** (LinkCards / `ExternalResource`): one link to a canonical "idempotency keys" or "exactly-once delivery is a myth, aim for effectively-once" write-up if a durable, vendor-neutral source exists. Only if it adds genuine depth — skip rather than pad.

---

## Scope

**Prerequisites — assume known, redefine in one line at most if touched:**
- The dispatcher seam and `dispatch({ type, recipientUserIds, subjectId, payload })` (L1) — do not re-teach.
- The `notifiable_events` registry, `as const satisfies Record<string, NotifiableEvent>`, per-event config fields (L1) — the `dedup` field is the only addition.
- `DispatchResult { sent, deduped, suppressedByPrefs }` as a plain count object, deliberately NOT `Result<T>` (L1) — maintain this divergence; `deduped` is the one this lesson fills.
- The per-recipient dispatcher loop and `resolveChannels` (L3), the branchless channel fan-out (L2) — reuse verbatim, do not rebuild.
- After-commit firing rule (L1), `notifications` table (L1/L2), `user_notification_preferences` (L3), `text` FKs to Better Auth `user.id` (L3) — assume known.
- Drizzle conventions: UUIDv7 pk, snake-case-on-client, explicit index naming, composite-index column order (Units 9–10) — apply, don't explain.

**This lesson does NOT cover (defer, name where noted):**
- Coalesce / digest implementation — named and deferred (when comments/mentions ship).
- Redis-backed dedup — named, deferred to Ch074 (Upstash) as the throughput-upgrade trigger.
- The nightly cleanup Trigger.dev job's implementation — named, deferred to Ch066; only its existence and "out of the request path" rule stated here.
- Webhook idempotency *primitives* (the `processed_events` ledger, HMAC verify, constant-time compare) — owned by Ch063; this lesson only contrasts layers, does not re-teach.
- Per-channel rate limits (Resend throttling, etc.) — owned by the channel wrapper, out of scope.
- The transactional-outbox alternative — named in L1/L2; not revisited here.
- Observability dashboards / alerting implementation on dedup metrics — Unit 19; this lesson states the signal, not the dashboard.
- The inbox UI, the prefs settings UI, and the dispatcher's full assembled body — Ch071 starter / inspector.
- The atomic unique-constraint variant that closes the check-and-insert race — named as the deferred lock-it-down upgrade, not built.

---

## Code-convention notes for downstream agents

- `notification_dedup` Drizzle table: `pgTable('notification_dedup', ...)`, UUIDv7 `id` via `$defaultFn(() => uuidv7())`, snake-case mapping from the client (don't restate per column), `recipientUserId: text(...).references(() => user.id, { onDelete: 'cascade' })` (text, not uuid — matches Better Auth `user.id` and L3), `firedAt` as `timestamp('fired_at', { withTimezone: true }).notNull().defaultNow()` (timestamptz — verified current Drizzle shape, June 2026). The table's second-arg callback **returns an array** of indexes, not an object: `(t) => [ index('idx_notification_dedup_lookup').on(t.eventType, t.dedupKey, t.recipientUserId, t.firedAt.desc()) ]` (the object-returning callback form is deprecated).
- No `orgId` on this table — deliberate, per the user-scoped reasoning (mirror L3's preference-table note). The tenant-leading-column composite-index rule does not apply to this internal tier.
- `isDuplicate` / `recordDedup` helpers live in `lib/notifications/`, start with `import 'server-only'`, take the registry entry + key parts. `isDuplicate` returns `boolean` (existence), not a `Result<T>` — this is internal bookkeeping, consistent with the dispatcher's plain-result divergence. Annotate exported return types.
- Time: registry `dedup.windowSeconds` is a number for the schema/wire boundary; if any domain-level duration appears, prefer `Temporal.Duration` per conventions, but the SQL predicate uses `now() - interval` / a `timestamptz` comparison — note that `Date`/raw-seconds at the SQL seam is the accepted boundary form, not a violation.
- The dedup-check SQL fragment uses Drizzle's `sql\`\`` tagged template for the `firedAt > now() - interval '60 seconds'` range with the window value parameterized — flag this as the one raw-ish fragment and keep it parameterized.
- Logging the result: `logger.info({ seam: 'notifications.dispatch', ... })` per the one-child-logger-per-seam and fixed-JSON-key conventions.
- MDX display: mark the new dedup lines inserted into L3's loop with `// new` / `ins=`; strip imports already shown in prior lessons. Reuse L3's loop shape exactly so the diff reads as a two-line insertion.

---

## Notes / deliberate divergences

- `DispatchResult` stays a plain `{ sent, deduped, suppressedByPrefs }` count object, not `Result<T>` — this is the course's documented intentional divergence (L1), maintained here.
- `isDuplicate` returns a bare `boolean`, not `Result<T>` — internal predicate, consistent with the above; downstream agents should not "upgrade" it to a discriminated union.
- The check-and-insert race is left open in v1 by design — flagged as deliberate so the reviewer doesn't read it as a bug.
