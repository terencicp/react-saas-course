# Lesson 2 — Email and inbox, independent channels

**Title (h1):** Email and inbox, independent channels
**Sidebar label:** Email and inbox channels

---

## Lesson framing

Lesson 1 established the dispatcher as the one seam, the `notifiable_events` registry, the dispatcher contract (`NotificationEvent` in, `DispatchResult` out), and the `notifications` table shape (render-at-dispatch). It deferred *how a recipient actually gets the message* to this lesson. This lesson builds the two channel functions that sit one layer below the dispatcher: the **email channel** (which calls into the Unit 7 `sendEmail` wrapper) and the **inbox channel** (which inserts one `notifications` row). The center of gravity is one architectural idea — **channels share a uniform signature so the dispatcher loops without branching, and one channel's failure never kills the other** — plus the layering picture that shows where the channel functions sit between the dispatcher and the Resend wrapper.

Pedagogical conclusions for the lesson as a whole:

- **Lead with the senior decision, not the syntax.** The two functions are small; the value is the decisions baked into them: uniform signature (so adding push later is a new file, not a new branch), thinness (suppression/from/idempotency already live in the email wrapper — the channel does not re-implement them), render-at-dispatch (already locked in L1, here it becomes the inbox formatter), and channel independence (try/catch per channel, log and continue). Each function is the vehicle for one decision.
- **This lesson is a *layering* lesson.** The single most important visual is the call stack: `dispatch` → `channelFns[channel]` → (`sendEmail` wrapper → Resend) / (`db.insert(notifications)`). Students must see that the channel function is a *thin adapter* that translates "registry entry + payload + recipient" into the shape each downstream sink already expects. Most beginner mistakes here are *re-implementing* what a lower layer already owns (re-checking suppression, re-rendering, re-resolving `from`).
- **Anchor everything to code the student already shipped.** The `sendEmail` wrapper (ch050) is known — its signature (`{ to, subject, react, idempotencyKey, replyTo?, bypassSuppression? }` → `Promise<Result<{ id }>>`), its env-only `from`, its internal suppression read. The `notifications` table (ch070 L1) is known. The `Result` type and `db` client are known. The lesson *composes* these; it introduces almost no new primitive.
- **The independence rule is the emotional core.** Frame it in production stakes: a flaky email provider 5xx must not roll back a role change or erase the inbox row. Notifications are *eventually consistent across channels by design*. This is where a senior diverges from a junior who wraps the whole fan-out in one try and loses everything on the first failure.
- **One deliberate divergence to flag for downstream agents:** the registry stores both an email `template` (a React Email component, deferred to ch049) **and** an inbox formatter `(payload) => { title, body }`. Lesson 1's registry sketch only showed `template`. This lesson *extends* the registry entry shape to add the inbox formatter (call it `inboxFormat` or reuse a `templates: { email, inbox }` sub-object — pick the second; it groups both renderers under one key and reads cleanly). Note this extension explicitly so it stays consistent with L3/L4 and ch071.
- **Correctness watch (fact-checked, important):** the chapter-outline topic "every transactional email needs a one-click unsubscribe header" **conflicts** with the canonical ch048 L3 teaching, which says transactional mail carries **no** unsubscribe header (unsubscribe is a marketing-side concern; you can't opt out of a password reset and keep an account). Dispatcher notifications are transactional. **Do not teach an unsubscribe header on the transactional email channel.** Instead, name the nuance correctly: per-category notification *preferences* (the user muting "team email") are the opt-out path for notifications, and they live in the dispatcher (lesson 3) — not as an RFC 8058 `List-Unsubscribe` header on a transactional send. Cut the chapter-outline's unsubscribe-link bullet; replace with a one-line forward reference to lesson 3's preference mute. This avoids contradicting a lesson the student already completed.

- **Length / pacing.** Estimated 40–50 min. Two functions, one rule, one worked example. Keep the prose tight; the diagrams and the worked example carry the weight, not exhaustive prose.

---

## Lesson sections

### Introduction (no header)

Open by collecting the debt L1 left: the dispatcher decided a recipient gets the role-change on *both* email and the inbox — but L1 stopped at "the dispatcher decides, then acts." This lesson is the "then acts" half. Preview the three takeaways: (1) every channel is a function with the *same* signature so the dispatcher loops without `if email … else inbox`; (2) the email channel is a thin call into the `sendEmail` wrapper you already built, the inbox channel is a single `INSERT`; (3) the rule that one channel failing never kills the other. Connect to prior work explicitly — name `sendEmail` from the welcome-email chapter and the `notifications` table from the previous lesson — so the student knows this is composition, not new machinery. Keep it warm and ~2 short paragraphs.

State the mental model up front in one line (the student should be able to recite it): **the dispatcher resolves channels, then calls one uniform function per channel; channels are independent.**

---

### One signature, every channel

**Goal:** establish the uniform channel-function signature and *why* uniformity is the whole point (loop without branching; new channel = new file).

Content:
- Introduce the shared signature. Both channels export a single function with the identical shape: takes the resolved recipient, the registry entry for the event, and the typed payload. Show the type alias and the two function signatures (bodies stubbed):
  - `type ChannelFn = (args: { recipient: …; event: NotifiableEvent; payload: …; rendered: RenderedContent }) => Promise<void>` — note: include a `rendered` field carrying the already-rendered strings, because of the render-once decision below (see "render once" section). Keep `Promise<void>` as the return: channels don't return a `Result`; the dispatcher's try/catch owns failure, consistent with L1's "dispatcher never throws on channel failure."
  - `sendEmailChannel: ChannelFn` and `writeInboxChannel: ChannelFn`.
- Show the dispatcher's loop shape (just the loop, not the whole dispatcher — that's ch071) so the payoff is visible: a `channelFns` lookup object keyed by channel name, iterated over the recipient's resolved channels: `for (const channel of channels) await channelFns[channel](args)`. The senior point: **no branching on channel type** — adding `push` is a new entry in `channelFns` plus a new file with the same signature, zero edits to the loop.
- Name the recipient shape: the dispatcher hands the channel function a *resolved recipient* (at least `{ userId }`, plus whatever each channel needs to resolve further). Email needs an address; the inbox needs only the id. This motivates the next section's resolution helper.

**Code component:** `Code` (simple) for the `ChannelFn` type + the two signatures. A second small `Code` for the loop shape. These are short and the prose directs attention adequately; no need for AnnotatedCode here.

**Reasoning:** uniformity is an abstract idea that only clicks when the student sees the branch-free loop next to the two same-shaped signatures. Showing both side by side in plain blocks is the lightest-weight way.

**Terms (Tooltip):** `fan-out` is already defined in L1 — do **not** re-tooltip it (cross-lesson, same chapter; assume known). No new tooltip terms here.

---

### The layering: dispatcher, channel, sink

**Goal:** the load-bearing diagram of the lesson. Make the call stack spatial so students stop re-implementing lower layers.

Content + diagram:
- A `DiagramSequence` (self-contained card, do **not** wrap in `Figure`) that walks one `dispatch` call down through the layers, highlighting one layer at a time. This is the best vehicle because the pedagogical goal is *sequential descent through a stack* — exactly what DiagramSequence's scrub-through-steps affordance shows.
- Steps (3–4):
  1. **Dispatcher** highlighted. Caption: the dispatcher has resolved channels for this recipient and rendered the content once; it now calls the channel function for each enabled channel. It owns the loop and the try/catch; it knows nothing about Resend or SQL.
  2. **Channel function** highlighted (show both `sendEmailChannel` and `writeInboxChannel` as two boxes at this layer). Caption: each channel function is a *thin adapter* — it translates the registry entry + payload into the exact shape its sink expects. It adds no policy of its own.
  3. **Sink** highlighted — two boxes: `sendEmail` wrapper → Resend (email side), and `db.insert(notifications)` (inbox side). Caption: the email sink is the wrapper you already built (it reads the suppression list, defaults `from`, requires an idempotency key). The inbox sink is one indexed insert. The channel function *uses* these; it does not duplicate what they own.
  4. (Optional consolidation step) the full stack shown unhighlighted with the two parallel paths, captioned with the one-line rule: the channel function is the thin seam between "what happened" and "how this sink wants it."
- Render each step's body as simple labeled HTML boxes/columns (plain HTML + CSS per the diagrams guide — a vertical stack of three layers, two parallel columns at the channel/sink layers). Keep it compact, cap height.

**Pedagogical goal stated for the agent:** the diagram exists to prevent the #1 mistake (re-checking suppression / re-rendering / re-resolving `from` inside the channel function). Seeing the wrapper sit *below* the channel function makes "the wrapper already does that" obvious.

**Reasoning for DiagramSequence over a static ArrowDiagram:** the relationship is a *descent* (caller → adapter → sink), and the "what each layer owns vs. doesn't" contrast lands better one layer at a time than all at once.

---

### The email channel: a thin call into the send wrapper

**Goal:** build `sendEmailChannel`; show it is *thin*; surface the registry-driven subject and the `from`-name policy.

Content:
- Walk the function with `AnnotatedCode` (single block, `maxLines` ≤ 16, the block fits). The function:
  1. Resolve the recipient's email address from their user id (call the helper `getUserEmail(userId)` — introduce it as a one-liner that reads Better Auth's `user` table; note the dispatcher passes *user ids*, channel functions resolve to channel-specific identifiers).
  2. Pull the email template (a React Email component) and the subject from the registry entry. Subject lives in the registry per event type (with payload interpolation for actor/org name) — note in prose that keeping subjects in the registry means a rephrase or translation is a one-file edit.
  3. Render the template with the payload (or, per the render-once decision, receive the already-rendered React node / subject string from the dispatcher — keep this consistent; see "render once" section. For the email *body* a React Email component is rendered by `sendEmail` itself via its `react` prop, so the channel passes the *component element* + props, not an HTML string).
  4. Call `sendEmail({ to, subject, react, idempotencyKey })`. The idempotency key derives from the event identity — suggest `` `${event.type}:${subjectId}:${recipientUserId}` `` so a retried dispatch collapses at Resend too (ties to the wrapper's required key). `from`/`replyTo` are **not** passed — they're env-only in the wrapper by design; passing them would be the regression ch050 warned against.
  5. The channel returns `Promise<void>`; it does *not* unwrap the wrapper's `Result` into a throw on an expected failure. Decision to state: the channel may inspect `result.ok` to log a structured failure line, but it lets the dispatcher's try/catch boundary handle exceptions; an expected `forbidden`/`internal` from the wrapper is logged and swallowed (the inbox row still stands). Keep this crisp — it foreshadows the independence section.
- AnnotatedCode steps, one decision per step, colored:
  - blue: address resolution via `getUserEmail`.
  - blue: subject + template pulled from the registry entry (registry as source of truth, restated).
  - green: the `sendEmail` call — highlight that `from`/suppression/idempotency are the wrapper's job (point at the *absence* of a `from` arg as the senior tell).
  - orange: the `Result` handling — log on `!result.ok`, don't throw; defer retries to the durable-queue upgrade.
- **Subject + from policy** (short prose, not a new h3): subjects are registry-driven; the `from` follows the transactional/marketing split — notifications are *transactional*, so they go out on the transactional sender that the wrapper already defaults from env. **Explicitly state notifications are transactional and therefore carry no `List-Unsubscribe` header** — the opt-out for notifications is the per-category preference (lesson 3), not an email header. This is the corrected nuance (see framing note). One or two sentences; do not belabor.

**Code component:** `AnnotatedCode` (one focus per decision is exactly the use case). Keep the body realistic but short; helper internals (`getUserEmail`) stay unexplained beyond the one-liner.

**Terms (Tooltip):** none strictly required; `transactional` was defined in ch048 — optionally a one-line `Term` re-explaining "transactional email" inline since it's load-bearing here for the no-unsubscribe point. Include it (re-explaining a prerequisite without breaking flow is a sanctioned Term use).

---

### The inbox channel: one row, rendered at dispatch

**Goal:** build `writeInboxChannel`; reconnect to L1's render-at-dispatch decision via the inbox formatter; surface the composite index and the read queries.

Content:
- The function writes exactly one row to `notifications` (`userId`, `orgId`, `eventType`, `subjectId`, `title`, `body`, `payload`, `createdAt`). `title`/`body` come from the registry's **inbox formatter** — a small `(payload) => { title, body }` per event type. This is where the L1 "render-at-dispatch" decision becomes concrete: the formatter runs *now*, the row is a snapshot, the inbox UI is a pure render.
- Show the function with `Code` (it's one `db.insert(...).values({...})` — simple enough that AnnotatedCode would be overkill). Annotate in prose: `title`/`body` are the formatter output (rendered strings), `payload` keeps stable ids for UI navigation (re-state the snapshot rule from L1 in one sentence; do not re-teach it at length — it's L1's job).
- **The composite index.** The inbox feed query is `where userId = ? order by createdAt desc`. Ship the index *with* the table: `index('idx_notifications_user_created').on(t.userId, t.createdAt.desc())` (follow the index-naming + composite conventions). State the senior reflex: an inbox query without this index falls back to a sort over a growing table. Show the index line as a small `Code` addition to the L1 table sketch (a 1-line `ins=` style snippet is enough).
- **The read queries** (sketch only — UI is the project chapter's). Two one-liners:
  - Unread badge: `select count(*) … where userId = ? and readAt is null`.
  - Mark-as-read: `update … set readAt = now() where id = ?`.
  - Inbox feed: `select … where userId = ? order by createdAt desc limit 50`, cursor-paginated for older entries (name cursor pagination as known from the pagination chapter; don't re-teach).
  - Render these as a single `Code` block of 3–4 commented SQL-ish/Drizzle lines, or prose with inline code. Keep it a *sketch* — explicitly say the UI (rendering, the unread pill, the mark-read interaction) lives in the ch071 starter's inspector.

**Code component:** `Code` for the insert and for the index line and for the query sketches. No heavy component — these are short and individually simple; the teaching is in *which* columns/queries, not in tracing complex control flow.

**Reasoning:** the inbox side is mechanically trivial; the only real decisions (snapshot via formatter, ship the index) are quick callbacks plus one new convention application. Over-componentizing would inflate a simple section.

---

### Render once, pass the result

**Goal:** the watch-out that the same message must not be rendered twice (once per channel). Resolve where rendering happens and how channels receive it.

Content:
- The trap: a naive implementation renders the actor/org/amount strings inside *each* channel function — duplicating the message logic, risking the email and the inbox drifting apart, and doubling the work. The fix: the **dispatcher renders the payload's display content once**, then passes the rendered pieces to each channel.
- Be precise about *what* gets rendered once vs. per-sink, because email and inbox render differently:
  - The **shared, plain-text-ish display fields** (e.g. a resolved `actorName`, `orgName`, a formatted amount) are computed once in the dispatcher and handed to both channels via the `rendered` arg from the signature section.
  - The **email body** is a React Email component handed to `sendEmail`'s `react` prop — React Email escapes by default. The **inbox body** is the formatter's `body` string. These are different artifacts, but both consume the *same already-resolved values*; neither re-derives `actorName` from a fresh DB read.
- The senior framing: render-once is the same discipline as render-at-dispatch (L1) pointed at the *channel* axis instead of the *time* axis — compute the truth once, fan it out.
- **Security watch-out** (brief, belongs here because it's about how rendered content reaches a sink): passing raw payload into a template is fine for React Email's escaped output, but any custom raw-HTML prop (`dangerouslySetInnerHTML` in a template) is an injection vector — the convention (security baseline) is to refuse raw HTML and let React Email escape. One sentence; reference the default-escape behavior.

**Code component:** a `CodeVariants` before/after (two tabs: "Rendered per channel" with `del`/red marks showing duplicated resolution inside both channels, vs. "Rendered once" with `ins`/green marks showing the dispatcher computing `rendered` and passing it down). This is the canonical before/after use case for CodeVariants. Keep each pane ≤ ~12 lines.

**Reasoning:** before/after is the clearest way to show a duplication smell and its fix; CodeVariants is purpose-built for it.

---

### Independent channels: one failure doesn't sink the other

**Goal:** the emotional/architectural core — channel independence — and the "fire after commit" restatement.

Content:
- The rule, stated sharply: **the dispatcher calls each channel function inside its own try/catch, logs failures, and continues.** An email `sendEmail` that hits a Resend 5xx leaves the inbox row intact; an inbox `INSERT` that hits a DB hiccup leaves the email sent. Notifications are *eventually consistent across channels by design*. A single channel's failure must never fail the user action that triggered the notification.
- Show the per-channel try/catch wrapper (the small loop from the signature section, now with try/catch around each `await channelFns[channel](args)`, logging a structured failure and incrementing nothing fatal). `Code` with the failing path highlighted. Tie back to L1's `DispatchResult` counts: a failed channel doesn't crash the dispatch; the return still reports what went out.
- **Retries belong to the durable-queue upgrade, not v1.** Restate L1's threshold in one line: in v1 a failed channel is logged and dropped; when retries that survive a crash are needed, the channel sends move behind Trigger.dev (named, deferred). Do not implement retries here.
- **"Fire after commit," restated.** A notification for an action that rolled back is worse than a missed one — so `dispatch` runs *after* the action's `db.transaction` commits, never inside it (the no-external-calls-in-transaction rule the student already follows). One short paragraph; this was established in L1, so restate, don't re-derive. Name the transactional-outbox alternative in a half-sentence as the deferred upgrade (already a known term from L1).
- **Ordering nuance (watch-out):** when feasible, insert the inbox row *before* sending the email, so a user who reads the email and clicks through doesn't briefly find an empty inbox. State it as a soft preference ("order the inbox insert first when feasible"), not an absolute — both are independent and best-effort.

**Code component:** `Code` for the try/catch-per-channel loop (highlight the catch + log line). The concept is the teaching; a single annotated block plus prose suffices.

**Exercise — `Sequence` (ordering drill):** put the dispatcher's per-recipient channel-send pipeline in order, to cement both the ordering nuance and the "after commit" rule. Steps to order (correct order): action mutates inside transaction → transaction commits → dispatcher renders content once → (per channel) insert inbox row → send email via wrapper → log + return `DispatchResult`. Include 1–2 plausible distractor orderings of the channel steps. Optional fixed code block above showing the action→dispatch skeleton. Grading: exact order. Rationale for the agent: this drill checks the two sequencing rules (commit-before-dispatch, inbox-before-email) without new syntax, which is exactly what a Sequence exercise is for.

**Reasoning:** independence and ordering are *sequence* facts; an ordering exercise tests them more honestly than an MCQ. A live-coding exercise is overkill here (no third-party npm in ReactCoding anyway, and the logic is server-side) — a Sequence drill is the right weight.

---

### Worked example: a role change fires both channels

**Goal:** thread the registry entry, both channel functions, and the dispatcher's fan-out into one concrete trace the student can hold.

Content:
- Use `'org.member.role_changed'` (the same event L1 used at the action call site — continuity). Show the registry entry with `channels: ['email', 'inbox']`, the email `template` (a `RoleChangedEmail` component reference), and the inbox formatter producing `title: 'Your role changed to admin'` + a one-line body. Reuse the L1 registry shape; extend it with the inbox formatter (the `templates: { email, inbox }` grouping — keep consistent with the signature section).
- Trace the fan-out for one recipient: dispatcher renders `{ newRole, changedBy }` once → `writeInboxChannel` inserts the snapshot row → `sendEmailChannel` calls `sendEmail` with the `RoleChangedEmail` element and the registry subject. End state: one inbox row, one email queued.
- Keep it a *trace*, not new mechanics — everything was built in prior sections; this assembles it.

**Code component:** `CodeVariants` grouping the **related files** (tab 1: the registry entry for this event; tab 2: `sendEmailChannel`; tab 3: `writeInboxChannel`) — CodeVariants is the right pick for "multiple related files" per the components guide. Alternatively a `TabbedContent` if mixing a non-code panel; but all three are code, so CodeVariants. Keep panes short; prose under each names the one thing that file contributes.

**Reasoning:** a single concrete event tying the abstract pieces together is the payoff of the lesson; grouping the three files in tabs lets the student see how thin each piece is.

---

### Where this goes next (closing)

Restate the one-line model: **the dispatcher resolves channels, renders once, then calls one uniform thin function per channel; channels are independent and best-effort.** Bridge forward: lesson 3 adds the *preferences* that decide which channels a recipient actually gets (and is where notification opt-out lives — the corrected unsubscribe story), read once inside the dispatcher; lesson 4 adds the 60-second dedup so rapid duplicates collapse; ch071 wires the full dispatcher body into three real flows. Two or three sentences.

**External resources (optional `ExternalResource` cards):** the Resend Send Email API reference and React Email "Send with Resend" (both already cited in ch050 — reuse for the `react` prop + idempotency key). Optionally a Postgres composite-index doc. Keep to 1–2; don't pad.

---

## Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- The dispatcher seam, `notifiable_events` registry, `NotificationEvent` input, `DispatchResult` output — built in ch070 L1.
- The `notifications` table columns + render-at-dispatch snapshot model — built in ch070 L1.
- `sendEmail` wrapper signature and that it owns suppression/`from`/idempotency — built in ch050; this lesson only *calls* it.
- `Result`, `db` client, `db.transaction`, composite-index + index-naming conventions, cursor pagination — all prior, assume known.
- Transactional vs marketing email split — ch048; restate only the one fact that notifications are transactional (and thus no unsubscribe header).

**This lesson does NOT cover (defer, with the owning lesson):**
- The `sendEmail` wrapper's internals (suppression read, env-defaulted `from`, the `Result` shape) — ch050 L3; only the call surface appears here.
- React Email component composition (how `RoleChangedEmail` is built) — ch049 / Unit 7; templates are *referenced*, never authored here.
- Suppression-list mechanics and deliverability (SPF/DKIM/DMARC, the suppression table) — ch048; mentioned only as "the wrapper handles it."
- The full dispatcher body (the loop assembled, prefs + dedup wired in) — ch071; this lesson shows only the loop *shape* and the per-channel try/catch in isolation.
- User notification **preferences** — which channels a recipient gets, the default-on rule, per-category mute (the notification opt-out path) — ch070 L3. This lesson references it only as the forward owner of channel suppression.
- **Dedup** — the 60-second window, `notification_dedup` — ch070 L4.
- The inbox **UI** — feed rendering, unread badge component, mark-as-read interaction — ch071 starter's inspector. This lesson sketches the *queries* only.
- **Durable retries** on channel failure (Trigger.dev workers) — ch066; named as the upgrade, not implemented.
- **Push / SMS / Slack** channels — named as future additions that drop in via the same signature; not implemented.
- A `List-Unsubscribe` / RFC 8058 header on the email channel — **intentionally out of scope and intentionally not added** (notifications are transactional; opt-out is the per-category preference in L3). Flag this so a downstream agent does not "helpfully" add it back and contradict ch048.

---

## Code conventions applied (notes for downstream agents)

- Arrow functions bound to `const`; `type` over `interface`; named exports; two-positional-params-max → all channel/helper functions take a single options object.
- `import 'server-only';` at the top of every channel module and `getUserEmail` (they touch the DB / secret-bearing wrapper); `lib/notifications/` is the canonical home (per L1 terminology).
- Drizzle: snake_case is set on the client, so the `notifications` columns and the new index carry **no** explicit snake_case name args; the index gets an explicit `name` (`idx_notifications_user_created`) per the index-naming convention; composite index leads with the access column (`userId`, then `createdAt.desc()`).
- The idempotency key passed to `sendEmail` is **required** (the wrapper enforces it) — derive it deterministically from event identity so retries collapse.
- **Deliberate divergences (flag in MDX prose or a comment so they read as intentional, not sloppy):**
  - Channel functions return `Promise<void>`, **not** `Result<T>` — failure is the dispatcher's try/catch boundary's concern, consistent with L1's "dispatcher never throws on channel failure." This mirrors L1's deliberate choice to use plain counts over `Result` for the dispatcher surface.
  - The registry entry gains an inbox formatter alongside the email template (`templates: { email, inbox }`), extending the L1 sketch. Author this consistently; ch071 and L3/L4 depend on it.
- No raw HTML into email templates; rely on React Email's default escaping (security baseline: refuse `dangerouslySetInnerHTML`).
