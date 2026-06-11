# Lesson outline — Chapter 070, Lesson 1

## Lesson title

- Title: One seam, many channels
- Sidebar label: One seam, many channels

## Lesson framing

This is the conceptual keystone of Unit 13. It establishes the *dispatcher* as the single named seam every user-facing notification flows through, and the mental model the next three lessons (channels, prefs, dedup) and the whole of Chapter 071 plug into. Nothing here is a finished implementation — the per-channel sends, the prefs read, the dedup mechanic are each named-and-deferred to their own lesson. The deliverable is a mental model plus the API surface: `dispatch(event)`, the `notifiable_events` registry, the dispatcher's contract, and the line between `notifications` and `audit_logs`.

Pedagogical conclusions that govern the whole lesson:

- **Lead with the senior question, not the API.** The student already knows the action boundary (Ch043/057) and the webhook seam (Ch063) as named choke points for cross-cutting concerns. This lesson is the *same architectural move* a third time: name the choke point, and a cross-cutting concern (channel knowledge, preference checks, dedup) becomes a one-place edit instead of a thing scattered across dozens of call sites. Anchor explicitly on that prior-knowledge bridge — it is the fastest way into the pattern and it makes the pattern feel inevitable rather than novel. The motivating pain is concrete and should open the lesson: a SaaS that grows channels (email, inbox, later push/SMS) and grows events (invites, role changes, billing past-due) without a seam ends up calling `sendEmail` and inserting inbox rows at every call site, checking prefs in some and skipping them in others, and adding a channel means touching every file that ever sent a notification.

- **The mental model to leave the student with:** call sites describe *what happened* and *who should know*; the dispatcher decides *how* — which channels, which template, whether prefs allow, whether dedup applies. One sentence the student should be able to recite: "Call sites fire one event; the dispatcher owns every channel decision." Everything in the lesson reinforces that split.

- **Minimize cognitive load by staging the contract.** Do not dump the full registry entry and the full dispatcher signature at once. Build up: (1) the seam idea and the call shape, (2) the registry as the enumerable source of truth, (3) the registry entry's anatomy field-by-field, (4) the dispatcher's input/side-effects/output contract, (5) where it's called from, (6) the notifications-vs-audit line. Each section adds one layer of complexity to a model the previous section established.

- **Keep the code aspirational-but-honest.** This is a systems-design lesson; code samples illustrate decisions, they are not a build. Show the *shapes* (a registry entry, the `dispatch` signature, a thin call site) and mark internals as deferred with a comment pointing at the lesson that builds them. Do not show the dispatcher's full body — that is Ch071's job and would teach the wrong thing here (the lesson is the *contract*, not the implementation). Per code conventions, the registry is an `as const` object validated with `satisfies` against an entry type, the contract types are discriminated unions / typed objects (`type`, never `interface`/`enum`), event types are string-literal members, and the dispatcher lives in `lib/notifications/` with `import 'server-only'`.

- **Two diagrams carry the heavy concepts.** The seam diagram (one event in, fan-out to channels, second arrow to audit logs) makes the architecture spatial and pins the two-tables/two-audiences idea visually. The "which table?" decision filter (StateMachineWalker) makes the notifiable-vs-logged rule a *procedure the student walks*, which is stronger than prose because the lesson lives in the order of the question ("who reads it?") not in any single answer.

- **One classification exercise to check the hardest idea.** The notifiable-vs-logged distinction is where students slip (they reach for "log everything" or "notify everything"). A `Buckets` drill sorting real events into inbox-only / audit-only / both forces the audience question on concrete cases and surfaces the misconception immediately.

- **Defer aggressively and name the deferrals.** Per-channel send mechanics, prefs schema, dedup mechanics each get one forward-pointing sentence, not a teaser paragraph. The synchronous-vs-durable threshold and the transactional-outbox alternative are named as the senior's known upgrades and deferred — this is "defaults before conditionals; name the threshold the default crosses."

## Lesson sections

### Introduction (no header)

Open on the concrete pain, in the second person, brief and warm. A growing SaaS: the app already sends invitation emails (Unit 9), and now product wants an in-app inbox, and next quarter maybe push. The app already has events worth telling users about — a role changed, a payment went past-due, an invite landed. Sketch the naive trajectory in two or three sentences: every Server Action that mutates something grows its own `sendEmail(...)` call plus an `INSERT into notifications`, preferences get checked here and forgotten there, and adding a channel means editing every one of those call sites. Then state the lesson's job: find the seam. Name the three things the student leaves with — the dispatcher and its call shape, the `notifiable_events` registry, and the rule that decides whether an event is a user notification or an operator audit log. Bridge to prior knowledge in one line: this is the same move as the action boundary and the webhook seam — a named choke point that turns a cross-cutting concern into a one-place edit. Preview that Lessons 2-4 fill in the channels, the preferences, and the dedup, and Chapter 071 wires the seam into three real flows. Keep it to ~5 sentences of prose plus the skill preview; no section header (per pedagogical structure, the intro is unheaded).

### The seam: one event in, many channels out

The core pattern, named and made spatial. This is the section that installs the mental model; everything else hangs off it.

- State the principle plainly first: the dispatcher is a single function called from Server Actions and webhook handlers. The call site passes *what happened* + *who should know*; the dispatcher decides *how*. Give the canonical call shape early as a `Code` block (TS): `await dispatch({ type: 'org.member.role_changed', recipientUserIds, subjectId, payload })`. Keep it to the call, not the implementation. One line of comment can flag "resolves channels, renders templates, dedups — none of which the call site sees."

- Name the architectural lineage explicitly: Ch043/057 made the action boundary the canonical write seam; Ch063 made the webhook handler the trust/idempotency seam; this is the *notification* seam. Same shape, same payoff — a cross-cutting concern (here: channel knowledge + prefs + dedup) lives in exactly one place, so adding a channel or changing a preference rule is a one-file edit. This framing is the lesson's spine; state it as a principle the student can carry, not a footnote.

- **The seam diagram** — the centerpiece visual, placed in this section. Use `<ArrowDiagram>` inside `<Figure>` (the nodes benefit from being real labeled HTML boxes with short sub-text, and the topology is a fan-out plus one side-arrow — a layout engine isn't needed and the box content wants styling). Topology: a single source box "Call site (Server Action / webhook)" on the left. One arrow labeled `dispatch(event)` into a central "Dispatcher" box. From the dispatcher, a short internal strip showing the ordered stages as small chips — *registry lookup -> preference read -> dedup check -> fan-out* (kept compact, this previews the pipeline the later lessons build; do not over-detail). Two arrows fan out from the dispatcher to channel boxes: "Email (Resend)" and "In-app inbox (`notifications` table)". A *separate* arrow leaves the same call-site box and goes directly to an "`audit_logs`" box, labeled "operator-facing" — deliberately NOT routed through the dispatcher, to teach that audit logging is the caller's concern and a different audience. Caption: the dispatcher is the only place that knows about channels; the call site fires one event and never imports Resend or touches the notifications table; operator-facing audit logs are a separate write. Pedagogical goal: make the seam spatial, pin the two tables + two audiences, and foreshadow the internal pipeline without explaining it yet. Cap height per the vertical constraint; prefer the horizontal left-to-right flow. Watch the brace rules if any box contains code-like text — prefer plain labels here to avoid MDX brace pitfalls.

- Close the section by stating the call-site discipline as a rule: a call site that imports `sendEmail` or writes to `notifications` directly has leaked channel knowledge and broken the seam. Frame it as the one regression the rest of the chapter exists to prevent (grep/lint for direct sends outside `lib/notifications/`). This is a watch-out, but it belongs here because it qualifies the seam concept itself, not a later mechanic.

### The notifiable_events registry: one file, every notification

The registry as the single enumerable source of truth. Teach it as "the senior can read one file and know every notification the app can send."

- Motivate before showing: if every event type were defined inline at its call site, no one could answer "what notifications does this app send?" without grepping the whole codebase. The registry makes the system *enumerable* — a typed map keyed by event type, where each entry declares everything the dispatcher, the prefs UI, and the templates need.

- Show the registry shape with `Code` (TS), small — two or three entries, not the full set. Per conventions: `export const notifiableEvents = { ... } as const satisfies Record<string, NotifiableEvent>`. Keep entries to ~3-5 events total across the lesson (e.g. `org.invitation.sent`, `org.member.role_changed`, `billing.past_due`) and say explicitly "keep it small in v1, let it grow." Event-type keys are dotted string literals (`'org.member.role_changed'`) — note the `domain.entity.action` naming convention as a deliberate, scannable scheme.

- **Anatomy of a registry entry** — use `<AnnotatedCode>` here, this is exactly its use case: one entry shown once, stepped highlights walking each field so the student's attention lands on one field at a time. Steps, one field per step, each ~1 short paragraph:
  - `channels` — the default set, e.g. `['email', 'inbox']`. "Default" because prefs can subtract from it (Lesson 3 forward-pointer, one clause).
  - `template` — a reference to the email template (a React Email component) and/or the inbox formatter. The registry *references* templates; it doesn't inline them. One clause: built in Lesson 2.
  - `preferenceCategory` — the category the user toggles in settings (`'team'`, `'billing'`, `'security'`). Multiple events share a category. One clause: Lesson 3 owns the schema.
  - `dedup` — window + key shape, e.g. `{ windowSeconds: 60, keyBy: ['subjectId'] }`. One clause: Lesson 4 owns the mechanic.
  - `description` — the human label for the prefs UI, and the place a new event type justifies its own existence.
  - Color the steps (blue default; maybe orange for the deferred-to-later fields) so the eye tracks. Keep the block under ~18 lines so it fits `AnnotatedCode`'s frame.

- State the registry-as-source rule as the takeaway: new event types are added in this one file; the dispatcher reads from it; the prefs UI reads from it; templates are referenced by it. This single-source-of-truth framing echoes the schema-as-source-of-truth principle the student met in Drizzle (Unit 5) — call that echo out in one sentence to anchor it.

- `Term` candidate: "registry" if not obvious in context (a typed lookup table that is the authoritative list) — only if the surrounding prose doesn't already make it plain; be sparing.

### The dispatcher's contract: input, side effects, output

The function's contract as a contract — what goes in, what it changes in the world, what it returns. This is the API the student is meant to internalize.

- Present the three faces of the contract in order, each as a short prose beat backed by a type shape (`Code`, TS):
  - **Input** — a typed event: `type` (a key of the registry), `recipientUserIds` (always a list, even for one recipient — say why: a uniform shape means the dispatcher never branches on cardinality), `subjectId` (the entity the event is about — invitation id, invoice id, member id), and a typed `payload` for template rendering. Show this as a discriminated/typed object. Emphasize `recipientUserIds` is a *resolved* list — see the recipients section below.
  - **Side effects** — writes inbox rows for recipients whose prefs allow inbox, enqueues email sends for recipients whose prefs allow email, records the dispatch for dedup. Stress these are the *effects*, and that each is gated by a decision the dispatcher owns. Keep it conceptual — the *how* of each is a later lesson; here it's "what the dispatcher does to the world."
  - **Output** — a typed result the caller can log: counts of `sent`, `deduped`, `suppressedByPrefs`. Show the return type. The point: the dispatcher returns observability, it doesn't make the caller guess what happened.

- **The no-throw-on-channel-failure rule** — teach it here as part of the contract, not as a watch-out tacked on elsewhere. The dispatcher never throws because one channel failed; it logs and continues. An inbox write failing must not kill the email send, and vice versa. Channels are independent by design. One sentence forward-pointer: Lesson 2 builds the try/catch-per-channel that enforces this. This is load-bearing for the mental model — "fire one event, get best-effort fan-out with a report" — so it earns inline placement.

- The recipients shape — explain the dispatcher takes `recipientUserIds` as an already-resolved list, NOT "the org's owners" or "anyone with the billing role." Resolution is the *caller's* job, because the caller knows the business rule; helpers like `getOrgMembersByRole(orgId, 'owner')` (Unit 9 knowledge) live at the call site. Why: keeping the dispatcher audience-neutral stops it from accreting org-shaped knowledge it doesn't need — it stays a pure fan-out engine. This is a small but real senior call; give it its own short beat.

### Where the dispatcher is called: after the write is durable

The call-site placement rule. Short, sharp, one hard rule plus its rationale and the named upgrade.

- The canonical placement: inside the `authedAction` (Ch057 L2) that performs the mutation, *after* the database write has committed, call `await dispatch({ ... })`. Webhook handlers (Ch063) call the same dispatcher after their idempotent state transition; background jobs (Ch066) can call it too. The dispatcher is caller-neutral; the rule is "fire after the state change is durable."

- **The "fire after commit" rule** — the heart of the section. A notification for an action that rolled back is worse than a missed notification. Tie this directly to the convention the student already follows: external calls live *outside* `db.transaction` (Ch043 L5 / Ch057), and `dispatch` is exactly such an external call. Show the shape with `Code` (TS): the action body — `safeParse` -> authorize -> `db.transaction(...)` (mutation) -> `revalidate` -> `await dispatch(...)` -> `return ok(...)`. Mark the dispatch line so the eye lands on its position *after* the transaction block. The student has seen this five-seam shape (Ch043); here the dispatch slots into the post-write position, which makes the placement feel like a rule they already know rather than a new one.

- Name the transactional-outbox alternative in one or two sentences and defer it: write a `pending_notifications` row *inside* the transaction, drain it from a worker, so a committed action and its notification are atomic. This is the senior's known upgrade when even a post-commit gap is unacceptable; v1's after-commit call is enough. Do not implement or diagram it — name, justify, defer.

- **Synchronous in v1, durable later — the threshold.** This is the "name the threshold the default crosses" beat. The dispatcher in this chapter runs in-line with the request. State the three signals that flip it to a durable queue: send volume grows, email latency starts showing up in user-visible action timing, or sends need retries that survive a process crash. At that threshold the channel sends move behind a Trigger.dev queue (Ch066) — the dispatcher then writes only the event row and enqueues per-channel jobs. v1 ships in-line because it's enough for tens of events/minute and it's one place to upgrade later. Keep this to a tight paragraph; the student met Trigger.dev in Unit 12, so this is a pointer, not a teach. No diagram — a `Code` snippet is not needed either; prose with the named trigger is right.

### Notifications or audit logs: who reads it?

The line that decides which table. This is the second pillar of the lesson and the place students most need a crisp rule. Give it room.

- Frame the two tables by *audience*, not by schema: `notifications` (the in-app inbox) is **user-facing** — the user opens it, reads it, marks it read, expects relevance. `audit_logs` (Ch057 L5, which the student built) is **operator-facing** — the org admin reviews it for compliance, security, incident response; the user never sees it. State the senior rule as a single question the student can always ask: **"Who reads it?"** That question is the whole section's payload.

- Make clear the two are *different tables for different audiences* and that some events write **both**: a role change writes a notification to the demoted member *and* an audit row on the org. Some write **only one**: a failed-login attempt writes only an audit log (the user must never get an inbox ping for every typo of their own password); a "welcome aboard" writes only a notification (no compliance value). Reinforce why keeping them separate matters: merging them "to save a query" couples two audiences and forces every inbox query to filter out operator rows — a regression. (Watch-out placed inline because it qualifies the table-separation concept directly.)

- **The "which table?" decision filter** — `StateMachineWalker` with `kind="decision"` (do NOT wrap in `<Figure>`; it provides its own card). This is the ideal component: the lesson lives in the *order* of the senior's questions, and the walker forces the student down one path at a time. Design:
  - Root question: "Does the end user need to see this event?" Branches: "Yes — it's relevant to them" / "No — it's internal or operator-only."
  - From "Yes": "Does it also need an immutable operator record (compliance / security / incident)?" Branches: "Yes" -> Leaf **Both tables** / "No" -> Leaf **`notifications` only**.
  - From "No": "Does an operator need an immutable record of it?" Branches: "Yes" -> Leaf **`audit_logs` only** / "No" -> Leaf **Neither — not a notifiable event** (this leaf does double duty: it teaches the "what's not a notifiable event" cut).
  - Leaf bodies (rich MDX): each names a concrete example and the rationale. `notifications only`: "welcome aboard, a comment mention." `audit_logs only`: "failed-login attempt, an admin ran a destructive query." `Both`: "role changed, billing past-due — the affected user is told, the org keeps the record." `Neither`: "cache invalidation, a background cleanup finished, a per-keystroke draft save — the user never needs to know; the default is no notification unless 'who reads it?' answers yes."
  - Pedagogical goal: convert the audience rule from a fact into a *procedure the student can run on any new event*, and fold the "what's not notifiable" cut into the same walk so it's not a separate listy section.

- **Worked examples of the distinction** — immediately after the walker, a compact mapping the student can scan, as prose or a tight `Code`/table-style block (a small two-column list is fine; if a structured visual helps, a plain HTML list inside the prose suffices — no heavy component needed). Cases, each one line: invitation sent -> notification to invitee + audit on org; role changed -> notification to member + audit on org; billing past-due -> notification to owners + audit on org; login failed -> audit only; password changed -> notification to user (security signal) + audit on account. The payload: "the rule maps cleanly once you ask who reads it." This concretizes the walker's abstract branches.

- **Classification exercise** — `Buckets`, three buckets: "Inbox only", "Audit log only", "Both". ~7-8 chips of concrete events drawn from the worked examples plus a couple of "neither"-adjacent distractors reframed as belonging clearly to one bucket (keep all chips genuinely classifiable into the three buckets to avoid ambiguity — do not include a "neither" chip since there's no bucket for it; the walker already covered "neither"). Suggested chips: "Invitation sent (to the invitee)", "Failed login attempt", "Role changed to admin", "Welcome aboard email", "Payment past-due (to owners)", "Password changed", "Admin removed a member". `instructions`: sort each event by who reads it. Placed here because the student has just been handed the rule and the examples; the drill checks the rule landed before the lesson moves on. Grading is the component's built-in correct/incorrect on drop.

### The notifications table: a row is a snapshot

The inbox row's shape and the render-at-dispatch principle. This sets up Lesson 2's writer and locks one non-obvious senior call.

- Show the `notifications` table shape — `Code`, a Drizzle table sketch (TS) following conventions: plural `camelCase` table name (`notifications`), columns `id` (UUIDv7), `userId` (recipient), `orgId` (nullable — personal events have no org), `eventType` (matches the registry), `subjectId`, `title` and `body` (rendered at dispatch), `readAt` (nullable timestamp; null = unread), `createdAt`, and a `payload` JSONB for structured data the UI needs (link target, actor name). Keep it a sketch — note that the composite index `(userId, createdAt desc)` for the inbox feed and the full DDL are Lesson 2's concern (one clause forward-pointer). Use `timestamptz` framing consistent with the course's Temporal/codec convention; don't belabor it.

- **Render-at-dispatch, not render-at-display** — the load-bearing idea of the section, teach it as a senior call with its failure mode. `title` and `body` are computed *when the event fires* and stored on the row, so the inbox UI is a *pure render of the row* — no joins to live data. Contrast the alternative: render-at-display joins live data (actor name, org name, amount), which goes wrong when the actor is later deleted or renamed or the amount changes, and makes the inbox query expensive. State the consequence the student might misread as a bug: a notification whose title says "Jane changed your role" stays correct even after Jane renames herself — the row *records the moment*; that's the feature, not a bug. The senior reach: snapshot the display strings, but store stable ids in `payload` so the UI can still navigate to the live entity. This deserves a clear inline treatment because it's the single most counterintuitive decision in the data model and it recurs in Lesson 2.

- `readAt` / unread in one clause: null means unread; the unread badge is a single count query and mark-as-read is a single update. Name it and defer the queries + the inbox UI to Lesson 2 / the Ch071 starter. Do not build the UI here.

### What this lesson set up (closing, no header or a short "Where this goes" header)

A tight recap that re-states the mental model and routes forward. Either headerless closing prose or a short `Where this goes next` header — keep it ~4-5 sentences. Restate the one-sentence model: call sites fire one event; the dispatcher owns every channel decision; audit logs are a separate, operator-facing write. Then route: Lesson 2 builds the two channel functions (email via the Unit 7 wrapper, the inbox row writer) and the independence rule; Lesson 3 adds category-grained preferences read once inside the dispatcher; Lesson 4 adds the 60-second dedup window; Chapter 071 wires the seam into three real flows. Optionally an `ExternalResource`/`LinkCard` or two only if a genuinely on-point reference exists (e.g. a well-regarded write-up on the notification/outbox pattern) — do not pad with marginal links; skip if nothing clears the bar.

### Tooltip (`Term`) candidates

Be strategic — only terms that support the lesson's goals and that the target student (junior, some web exposure, has done Units 1-12) might not hold precisely:

- **dispatcher** — at first use, a one-line gloss: "the single function every notification flows through." (Optional — the section defines it; use only if a crisp inline definition helps the very first mention.)
- **fan-out** — "sending one event to multiple independent destinations." Likely unfamiliar phrasing to the target student; worth a tooltip at first use in the seam section.
- **transactional outbox** — "write the notification intent inside the same DB transaction as the state change, deliver it later from a worker." Named-and-deferred; a tooltip lets the lesson name it without a detour.
- **audit log** — only if a quick re-gloss helps flow ("operator-facing, append-only record for compliance and incident response"); the student built it in Ch057, so this is a light refresher, not a teach. Use sparingly.

Do NOT tooltip terms the student owns solidly by Unit 13 (Server Action, webhook, Drizzle table, transaction, Resend) — re-defining them interrupts flow for no gain.

## Scope

Prerequisites to redefine *concisely* (one clause each, not a re-teach), because the lesson builds on them:

- The Server Action boundary and the five-seam shape (`parse -> authorize -> mutate -> revalidate -> return`) and the `authedAction` wrapper — Ch043 / Ch057. Assume fluent; reference, don't re-teach.
- The "external calls outside `db.transaction`" rule and "fire after commit" — Ch043 L5. Restate in one clause at the placement section since it's the rule the dispatch call obeys.
- `audit_logs` as the append-only operator-facing table and `logAudit(tx, event)` — Ch057 L5. The student built it; this lesson only *contrasts* it with notifications. Do not re-teach its schema or enforcement.
- The webhook seam and idempotent state transitions — Ch063. Named as a second caller of `dispatch`; not re-taught.
- Trigger.dev as the durable-queue tool — Unit 12 / Ch066. Named as the deferred upgrade; not re-taught.
- `getOrgMembersByRole`-style audience resolution and roles — Unit 9. Referenced at the recipients beat; not re-taught.

This lesson does **not** cover (route each to its owner so the writer doesn't bleed into it):

- The per-channel send mechanics — the Resend call via `lib/email.ts`, the inbox-row writer, the uniform channel-function signature, channel independence in code. **Lesson 2 of this chapter.** Here: name the channels and the no-throw rule conceptually only.
- The `user_notification_preferences` schema, the default-on rule, the category granularity, the critical-channel override, the in-dispatcher resolution code. **Lesson 3.** Here: `preferenceCategory` is one registry field and "prefs can subtract channels" is one clause; do not teach the schema or the resolution logic.
- The dedup window mechanics — the `notification_dedup` table, the key shape, dedup-vs-coalesce, the check's placement in the flow, the cleanup job. **Lesson 4.** Here: `dedup` is one registry field and "dedup check" is one chip in the seam diagram; do not teach the mechanic.
- The inbox UI — rendering the feed, mark-as-read interaction, the unread badge component, cursor pagination, the composite index DDL. **Out of scope for the teaching chapter; the Chapter 071 starter's inspector provides it.** Here: only the table *shape* and that the row is a pure-render snapshot; the queries are named and deferred.
- The full email-channel layering (template lookup, subject interpolation, suppression read, unsubscribe header) — **Lesson 2 / Unit 7 (Ch048-050).**
- The prefs settings page, unsubscribe-token signing (HMAC), quiet hours / digest — **Lesson 3 / later units.** Not even named in depth here.
- Push, SMS, Slack as channels — named once as future additions to show the seam is channel-extensible; not implemented or designed.
- The dispatcher's full implementation body — **Chapter 071.** This lesson teaches the *contract and the shapes*, never the complete function.

Keep every cross-reference as a single forward-pointing clause ("Lesson 2 builds this"); do not write teaser paragraphs that pre-explain a later lesson's content.

## Code-convention notes for downstream agents

- Registry: `export const notifiableEvents = { ... } as const satisfies Record<EventType, NotifiableEvent>` — `as const` for literal narrowing, `satisfies` to validate shape without widening. Never `enum`. The entry type is a `type` alias (not `interface`).
- Event-type keys: dotted string literals, `domain.entity.action` (`'org.member.role_changed'`). The union `EventType = keyof typeof notifiableEvents`.
- Contract types: discriminated/typed objects via `type`. Input event, the per-channel result, and the dispatcher's return (`{ sent; deduped; suppressedByPrefs }`) are all `type`. Prefer the `Result`-style discipline already in the course where a fail/throw distinction is shown, but the dispatcher's *return* is a count report, not a `Result<T>` — note this deliberately so the writer doesn't force a `Result` where a plain typed summary is correct.
- `dispatch` lives in `lib/notifications/` (e.g. `lib/notifications/dispatch.ts`) and the module starts with `import 'server-only';`. Exported function gets an explicit return type annotation (convention: annotate exported-function returns). Two-positional-params rule -> `dispatch` takes a single options object.
- The `notifications` Drizzle table: plural `camelCase` name, snake-case SQL via the client-level `casing: 'snake_case'` (don't restate per-column unless escaping). `id` UUIDv7 (`$defaultFn(() => uuidv7())`). Timestamps as `timestamptz`; `readAt` nullable. This is a *sketch* in this lesson — full DDL + index is Lesson 2.
- Deliberate divergence to flag for the writer: code samples are intentionally *partial* (call shapes, type shapes, table sketch) — they illustrate the contract, not a runnable build. Mark deferred internals with a `// built in Lesson N` comment rather than stubbing them out silently, so the staging is explicit.
