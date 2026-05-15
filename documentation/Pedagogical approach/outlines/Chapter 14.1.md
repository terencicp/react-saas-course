## Concept 1 — The dispatcher as the one named seam

**Why it's hard.** By Unit 14 the student has shipped email plumbing, audit logs, invitations, and webhooks. The reflex from each of those chapters is to call the relevant library at the call site that needs it. The misconception this concept fixes: the call site is where the channel decision lives. The senior posture inverts it — the call site fires an event describing *what happened*; a single dispatcher owns every channel decision downstream, so adding a channel later is one edit, not thirty.

**Ideal teaching artifact.** A side-by-side "two codebases" walkthrough. The student is shown a fictional Server Actions folder in two states: a "grown organically" version (eight actions, each importing `sendEmail`, each inserting an inbox row, each checking prefs differently, two skipping the check entirely) and a "dispatcher-shaped" version (the same eight actions, each ending in `await dispatch({ event, recipients, payload })`). A toggle adds a ninth channel — push notifications — to the system. In the grown-organically pane, every file lights up red as a site that needs editing; in the dispatcher pane, only `lib/notifications/dispatch.ts` and the channels folder light up. The student watches the diff blast radius collapse from "the whole feature surface" to "one file." Pattern archetype, named for what the seam prevents.

**Engagement.** A Buckets round sorts ten code fragments into "belongs at the call site" (the event, the recipient list, the subject id, the typed payload, the post-commit timing) versus "belongs in the dispatcher" (the channel pick, the prefs read, the dedup check, the template render, the email send). The sort confirms the student internalized which knowledge each side of the seam owns.

**Components.**
- Primary: `TabbedContent` inside a `Figure` with two panes (grown-organically vs. dispatcher-shaped) and a small radio toggle above for "add a push channel" / "add a SMS channel" that highlights affected files via pre-baked SVG overlays. The toggle is the punch — diff blast radius made visible. Single-use shape but built from existing primitives.
- Alternative: a bespoke `SeamImpactWidget` that drives the file highlights from a declarative model. Promotable later if Units 12 (webhooks) and 13 (background jobs) want the same shape — for now `TabbedContent` plus hand-SVG carries it.
- Closing recall: `Buckets` (call-site vs. dispatcher) with ten fragments.

**Project link.** Chapter 14.2.5 wires `dispatch()` after commit at three call sites (invite, role change, Stripe past-due webhook); this concept establishes the seam they are wiring *into*.

---

## Concept 2 — The `notifiable_events` registry as enumerable source of truth

**Why it's hard.** A typed map of event types looks like a config file the student might dismiss as bookkeeping. The misconception: events get added wherever they fire, with their channel choices and templates colocated with the call site. The senior reframe: the registry is the *enumerable surface* of the notification system — a senior reading the file knows every notification the app can ever send, and that property is what lets prefs, templates, and dedup keys derive from one source instead of drift across five.

**Ideal teaching artifact.** An annotated dissection of a single registry entry. The student sees the literal TypeScript object for `'org.invitation.sent'` with each field highlighted in turn — `channels`, `template`, `preferenceCategory`, `dedup`, `description` — and a side panel shows which downstream consumer reads that field. Click `preferenceCategory`, the panel highlights "settings UI category picker" and "dispatcher's prefs resolver." Click `dedup`, it highlights "dispatcher's dedup check." Click `template`, "email channel render." The student watches the same field flow through three separate consumers, which lands the "one source, many readers" property by demonstration rather than assertion. Concept archetype delivered as a stepped anatomy walkthrough.

**Engagement.** A `Tokens` click on a blank registry entry — the student picks which fields are required and which are optional, then a follow-up multiple choice names what breaks downstream if `preferenceCategory` is misspelled (the dispatcher would default-on for an unknown category — silent regression).

**Components.**
- Primary: `AnnotatedCode` on the registry entry, with each step revealing the field and the consumers it feeds. Existing component carries the anatomy. The "field → consumers" callout is a small `Figure` rendered between steps.
- Closing recall: `Tokens` on a blank registry entry plus a `MultipleChoice` on the misspelling consequence.

**Project link.** Chapter 14.2.3 has the student define three registry entries (invitation sent, role changed, billing past-due). The anatomy walkthrough is the template they fill in.

---

## Concept 3 — The notifiable-vs-audit-log line (audience decides)

**Why it's hard.** The student finishes Chapter 10.2.5 holding `audit_logs` as the "anything that happened" table and arrives here with a `notifications` table that looks structurally similar. The misconception: any noteworthy event goes in either table interchangeably, and storing both feels redundant. The senior cut: the two tables have different audiences (user vs. operator), different read patterns, different retention rules, and the audience question — *who reads this row?* — is the only test that produces consistent decisions.

**Ideal teaching artifact.** A guided sort with reveal. The student sees fifteen real events drawn from the rest of the course — invitation sent, role changed to admin, role changed from admin to member, failed login attempt, password changed, billing past-due, new device signed in, CSV export ready, member removed by admin, member removed self, comment mention, organization created, plan upgraded, plan downgraded, organization deleted. For each, the student picks one of four buckets: *notification only*, *audit log only*, *both*, *neither*. The reveal for each shows the senior answer plus the one-line audience reasoning ("the demoted member needs to know; the admin needs the compliance trail — both"). The fifteen-event spread is wide enough that the audience-question rule generalizes rather than memorizes. Decision archetype delivered as predict-and-reveal sort.

**Engagement.** The sort *is* the engagement. A short follow-up `TrueFalse` round (three statements: "merging the two tables saves a query and is fine," "every audit-log row should also produce a notification," "an event with no clear audience belongs in audit logs by default") confirms the cut held.

**Components.**
- Primary: `Buckets` with four columns and per-item reveal text on drop. Existing component fits — the reveal-on-drop is a small extension or rendered in a follow-up `Figure` summarizing the senior answers row by row.
- Alternative: a new `PredictReveal` grid that locks the per-item rationale alongside the answer. Worth considering if Unit 17 (security events) and Unit 20 (observability) want the same shape — defer until the second use surfaces.
- Closing recall: `TrueFalse` with three statements.

**Project link.** Chapter 14.2.5's three call sites split cleanly across the buckets — invitation (notification + audit log), role change (notification + audit log), billing past-due (notification + audit log). The student references the sort when deciding whether each call site needs a second write.

---

## Concept 4 — The dispatcher's contract and internal flow order

**Why it's hard.** A function with a typed input, three side effects, and a return shape looks self-evident, but the *order* of the internal steps is where seniors and juniors diverge. The misconception: the dispatcher is a fan-out — it loops over channels and sends. The reality: the dispatcher is a *gate* — it does registry lookup → prefs filter → dedup check → channel fan-out, in that order, because reordering any pair produces a real bug (prefs after dedup writes dedup rows for muted users; dedup after channels defeats the purpose; registry lookup last means typed inputs aren't validated).

**Ideal teaching artifact.** A scrubbable five-step sequence. Step 1 shows the typed input arriving (`{ event, recipientUserIds, subjectId, payload }`). Each subsequent step advances one stage of the dispatcher's flow with a small state strip alongside: the registry entry resolved, the prefs query and the filtered channels per recipient, the dedup-check decisions per recipient, the channel functions firing, the return value tallying `{ sent, deduped, suppressedByPrefs }`. The student scrubs forward and back. A second pane shows what happens if the student reorders any two steps — the same input runs through the wrong order and surfaces the resulting bug as a colored annotation on the affected state cell ("dedup row written for a muted user — count is now meaningless"). The artifact teaches the order by showing every wrong order failing. Concept archetype, delivered as scrollytelling with a misorder mode.

A second beat names the v1 boundary explicitly: the same diagram, with one extra panel after step 5, labeled "when this becomes a queue." It surfaces the upgrade trigger (latency on user-visible actions, retries that must survive a crash, hundreds of events per second) and points at Unit 13.1. Sync-in-v1 is taught as a deliberate scope choice, not a default that the student outgrows accidentally.

**Engagement.** A `Sequence` exercise reorders five cards (registry lookup, prefs read, dedup check, channel fan-out, dedup-row insert) into the only correct order. The student has just seen the wrong orders fail in the artifact; the sort locks the order without re-explaining each pair.

**Components.**
- Primary: `DiagramSequence` with five panels, each a `Figure` containing a small hand-SVG of the dispatcher's internal state strip. The misorder toggle is a separate `TabbedContent` block underneath ("correct order" / "prefs after dedup" / "dedup after channels") so the student can A/B the consequences.
- Alternative: a bespoke `DispatcherFlowSim` driving the state strip from a real model. Compelling, but single-use this chapter and no clean forward-link — the existing `DiagramSequence` plus `TabbedContent` carries the teaching.
- Closing recall: `Sequence` on the five-step order.

**Project link.** Chapter 14.2.3 has the student write `dispatch()` with stubbed channels and prove the flow from the inspector. The sequence diagram is the spec.

---

## Concept 5 — Fire after commit

**Why it's hard.** The natural call-site shape is to dispatch in the same code block that performs the mutation — easy to read top-to-bottom — and the student doesn't see why ordering matters until something rolls back. The misconception: dispatching inside the transaction "feels atomic" and therefore safer. The senior cut: a notification fired against a state that rolled back is worse than a missed notification, and the only correct place to call `dispatch()` is *after* the transaction commits.

**Ideal teaching artifact.** A wrong-by-default action handler the student repairs in place. The starting code shows three lines inside a `db.transaction` block: `await tx.insert(invitations)`, `await dispatch(...)`, `await sendEmailNotice()`, followed by a deliberate `throw new Error(...)` simulating a constraint violation. A side panel runs the handler and renders three states: *DB row written?*, *Notification sent?*, *Email delivered?*. With the dispatch inside the transaction, the DB rolls back but the notification has already left — the side panel lights red on "phantom notification." The student drags the dispatch line outside the transaction, re-runs, and watches all three states settle: failed transaction produces no notification, successful transaction produces one. Pattern archetype — the puzzle is the test. The transactional-outbox alternative is named in a one-line aside ("when retries-on-crash matter, write a `pending_notifications` row inside the tx and drain it from a worker — Unit 13.1") without drifting into implementation.

**Engagement.** The drag-and-rerun is itself the engagement. A short follow-up `TrueFalse` round (three statements: "dispatching inside the transaction is fine as long as the dispatcher is fast," "after-commit is enough for v1," "the outbox pattern is the right reach when crash-resilience on notifications matters") confirms the boundary held.

**Components.**
- Primary: `Sequence` with four steps (begin tx → insert row → commit → dispatch) plus a static `Figure` showing the rollback failure mode next to it. The drag locks the order; the figure surfaces the phantom-notification consequence.
- Alternative: a new `TxOrderSim` that simulates the rollback and the per-state outcome alongside the drag. Single-use this chapter, no forward-link — demoted; the `Sequence` plus `Figure` covers the teaching.
- Closing recall: `TrueFalse` with three statements.

**Project link.** Chapter 14.2.5 wires `dispatch()` after the action's database write commits, not from inside the transaction. The verify step (14.2.6) includes a forced rollback that must produce zero notifications.

---

## Concept 6 — Channel independence and the uniform signature

**Why it's hard.** Two channels writing for the same event invite the bug where the student wraps both in one try/catch and a single failure kills the whole dispatch. The misconception: notifications are transactional across channels — either both land or neither. The reality: channels are independent by design, the dispatcher wraps each in its own try/catch, and the rule is "one channel failing doesn't kill the other's work" — eventual consistency across channels, not cross-channel atomicity.

**Ideal teaching artifact.** A controllable two-channel simulator. The student sees a small inline widget: a "fire event" button, a registry entry on the left (both channels enabled), and two channel boxes on the right (email and inbox). Above each channel is a toggle: *success*, *5xx error*, *timeout*. The student picks a combination, fires the event, and watches each channel function run independently — the inbox writes its row even when email 5xx's, the email sends even when the inbox insert hits a database hiccup, and the dispatcher's return value tallies which channels succeeded and which logged. A second toggle changes the dispatcher's implementation between "shared try/catch" (one failure kills the other) and "per-channel try/catch" (the correct shape). The student watches the wrong implementation collapse both channels on any single failure, and the right one isolate them. Concept archetype delivered as a sandbox where the wrong-and-right shapes are A/B'd live.

**Engagement.** A `PredictOutput` round with three scenarios: email succeeds, inbox 5xx's (predict: 1 sent, 1 logged-failed, action does not throw); email timeouts, inbox succeeds (predict: 1 sent, 1 logged-failed, action does not throw); both 5xx (predict: 0 sent, 2 logged-failed, action does not throw). The student commits before the simulator reveals.

**Components.**
- Primary: a new `ChannelIndependenceSim` — inputs are the registry entry, the per-channel failure mode toggles, and an implementation toggle (shared vs. per-channel try/catch); renders the per-channel state and the dispatcher's return tally. Forward-link: Unit 13.1 (Trigger.dev workers) and Unit 20.1 (observability on per-channel failure rates) reuse the same per-channel-state shape.
- Alternative: a static `Figure` with the uniform-signature code on one side and a fixed failure table on the other. Workable, but the toggle is what makes the rule click — without it the student rereads the assertion rather than seeing it.
- Closing recall: `PredictOutput` with three failure-combination scenarios.

**Project link.** Chapter 14.2.4 replaces stub channels with the real inbox writer and email channel; the verify step includes a forced Resend 5xx to prove the inbox row still lands.

---

## Concept 7 — Render-at-dispatch as a snapshot rule

**Why it's hard.** The inbox UI begs to render live: pull the actor's name from `users` at display time, the org's name from `orgs`, the amount from `invoices`. The misconception: rendering at display is "more correct" because it shows current truth. The senior reframe: the inbox row is a *record of the moment* — when the user's name was Jane and the amount was $42, the row says so even after the user renames to Janet and the invoice changes. Live joins also make the inbox query expensive and brittle to deletions.

**Ideal teaching artifact.** A time-travel comparison. The student sees an inbox row produced at time T (actor: "Jane Smith", amount: "$420.00") and a slider scrubs the world forward — at T+1 day the actor renames to Janet, at T+3 days the invoice amount is adjusted, at T+7 days the user is deleted. Two inbox renders are shown side by side: the *render-at-dispatch* render keeps "Jane Smith — $420.00" stable through every world change; the *render-at-display* render mutates with each scrub and breaks entirely after the user-deletion event (`null.name`). The student watches the snapshot version stay coherent and the live version disintegrate. A second panel surfaces the payload's stable ids — the link target on the row still navigates to the invoice even though the displayed amount is the snapshot, because the row carries `subjectId` for routing. Concept archetype delivered as a scrubbable side-by-side.

**Engagement.** A short `MultipleChoice` round on the three failure modes the live-render approach surfaces (stale UX from constant re-fetches, broken render on deletion, expensive joins on an indexed-for-time-ordering table), followed by a `Buckets` sort: which inbox-row fields are snapshots (`title`, `body`) versus which are stable ids the UI uses to navigate (`subject_id`, `org_id`, fields inside `payload`).

**Components.**
- Primary: a new `SnapshotVsLive` widget — inputs are an event payload and a list of "world events" (rename, amount change, deletion); renders two inbox-row panels reacting to a timeline slider. Forward-link: Chapter 10.2.5 reinforcement (audit-log rows are also snapshots), Unit 20.1 observability (logged events as snapshots versus live joins).
- Alternative: a `DiagramSequence` with three or four fixed time steps showing the same divergence. Loses the smooth scrub, but if the bespoke widget doesn't earn its keep across Unit 10/20 reuse, falls back to a buildable shape.
- Closing recall: `MultipleChoice` on the three failure modes plus `Buckets` on snapshot-vs-stable-id fields.

**Project link.** Chapter 14.2.4 ships the inbox writer that renders title/body at dispatch time from the registry's inbox formatter; 14.2.6's verify step includes a rename-after-dispatch check that confirms the row hasn't mutated.

---

## Concept 8 — Category-grained prefs, default-on, and the critical-channel override

**Why it's hard.** Three sub-rules collapse into one concept because they answer the same question: how does the dispatcher decide whether a channel applies for this recipient? The misconceptions stack: per-event toggles are user-friendly (they aren't — users won't manage twenty switches); missing rows should default-off to "respect the user's silence" (no — silence-by-default produces missed invitations and ticket storms when new event types ship); the user is always right about turning emails off (no — password-reset emails must arrive even when the user toggled email off for "security").

**Ideal teaching artifact.** A controllable preferences resolver. The student sees a small UI mimicking `/settings/notifications` with four category rows (team, billing, security, product) and two toggles per row (email, inbox). Alongside, a "test event" picker — pick `'org.invitation.sent'`, `'billing.past_due'`, `'security.password_reset'`, etc. — and a "channels resolved" readout below shows the final per-channel decision for that event under the current toggles. The student toggles freely and watches the resolver react. Three deliberate scenarios are baked in as preset buttons: *new user, no rows in the table* (resolver returns both channels for every event — the default-on rule in action), *user mutes billing email* (resolver suppresses email for billing past-due but keeps inbox), *user mutes security email* (resolver shows the toggle as visually disabled and still resolves email-on, because the registry marks security with `criticalChannel: 'email'`). The widget surfaces the resolver expression — `channels.filter(c => prefs[category]?.[c] ?? true)` — and ties each toggle interaction to the line of code it exercises. Concept archetype as a controllable simulator with preset misconception scenarios.

**Engagement.** A `PredictOutput` round with four scenarios: new user fires invitation (predict: both channels); user mutes team email, fires invitation (predict: inbox only); user mutes security email, fires password reset (predict: email + inbox, override applied); user mutes everything in billing, fires past-due (predict: inbox only — billing isn't critical). The student commits before the simulator reveals.

**Components.**
- Primary: a new `PrefsResolverSandbox` — inputs are the registry entries, the prefs table state, and a test-event picker; renders the toggle UI, the resolved channels readout, and the resolver expression with the active fragment highlighted per interaction. Forward-link: Unit 17.2 (security override patterns), Unit 8 suppression interaction (the unsubscribe-link path also feeds this resolver in spirit), and any future granularity decision in the course.
- Alternative: three side-by-side `Figure`s walking through each preset scenario as static screenshots plus annotated prose. Loses the live toggle, but viable as a v1 fallback.
- Closing recall: `PredictOutput` with four scenarios.

**Project link.** Chapter 14.2.4 wires the batched prefs read and the critical-channel override; 14.2.6's verify step toggles each category and confirms the resolver in the inspector.

---

## Concept 9 — Dedup as a 60-second window with per-event keys

**Why it's hard.** The student arrives with a vague sense that "deduplication should happen somewhere" and a strong instinct to debounce at the call site. The misconceptions: the dedup key is `event_type` (too broad — collapses unrelated subjects); the dedup key includes a timestamp (too narrow — every event is unique, nothing dedupes); dedup and coalesce are the same shape (they aren't — dedup drops, coalesce summarizes); the check-and-insert race must be closed with a unique constraint (acceptable to leave open in v1 — one extra notification on a rare concurrent burst is much less bad than insert failures the dispatcher would have to handle).

**Ideal teaching artifact.** A rapid-fire simulator with key-shape controls. The student sees a small UI: a "click to fire" button labeled *Resend invitation* and a *Burst (5x)* button. Alongside, the registry entry's `dedup.keyBy` is editable via a small picker — `['event_type']` (too broad), `['event_type', 'subject_id']` (correct), `['event_type', 'subject_id', 'timestamp']` (too narrow). The student picks a key shape and bursts the button. A timeline below shows the five fires; the inbox panel shows the rows that survived. Wrong-broad shape collapses unrelated invitations into one (the simulator includes two seeded invitations the student also fires — they collide); correct shape produces one row per invitation per burst; wrong-narrow shape lets all five through. A second toggle changes the window between *10 seconds*, *60 seconds*, and *5 minutes* — the student fires three bursts spaced 30 seconds apart and watches the right window catch double-clicks while letting deliberate re-sends through. A third toggle, *coalesce instead of dedup*, switches the same event type to summary mode and shows the alternative shape ("3 invitations sent in the last minute") for contrast. Concept archetype delivered as a wrong-by-default sandbox the student must tune correctly.

**Engagement.** The simulator carries most of the assessment by forcing the student to pick the correct key shape and window. A short follow-up `Buckets` sort confirms recall: place four event types (resend invitation, role changed, comment posted, login failed) into three buckets — *dedup with 60s + subject_id*, *dedup with longer window + subject_id*, *coalesce candidate*. The sort surfaces the rule that high-frequency events (comments) want coalesce, not tighter dedup.

**Components.**
- Primary: a new `DedupSim` — inputs are the registry entry (with the editable dedup config), the seeded "world state" (other invitations, other recipients), and the user's click stream; renders the timeline, the surviving inbox rows, and the dispatcher's return tally per burst. Forward-link: Unit 13.1 (Trigger.dev retries) and Unit 15.3 (Upstash-backed dedup as the upgrade) reuse the same simulator shape — at minimum the timeline-and-tally readout.
- Alternative: a static `Figure` with three side-by-side tables (the three key shapes, the resulting inbox rows after the same five-click burst). Workable as v1 fallback if the bespoke component doesn't make the build queue.
- Closing recall: `Buckets` sort on four event types into dedup-strategy buckets.

**Project link.** Chapter 14.2.3 has the student prove the 60-second window from the inspector by firing the same event five times and confirming `{ sent: 1, deduped: 4 }`. The simulator is the rehearsal of that exact loop.

---

## Component proposals

- **`ChannelIndependenceSim`** — inputs: a registry entry, per-channel failure-mode toggles (success / 5xx / timeout), and an implementation toggle (shared vs. per-channel try/catch); renders per-channel state and the dispatcher's return tally.
  - **Uses in this chapter:** Concept 6.
  - **Forward-links:** Unit 13.1 (Trigger.dev workers and retry behavior), Unit 20.1 (per-channel failure-rate observability). Both reuse the per-channel state shape.
  - **Leanest v1:** fixed registry entry, three failure-mode toggles per channel, no implementation A/B (the wrong shape stays a static `Figure` alongside). v1 loses the wrong-and-right A/B, which is half the teaching. Build the implementation toggle if budget permits; otherwise v1 plus a side `Figure` covers it.

- **`SnapshotVsLive`** — inputs: an event payload and a list of "world events" (rename, amount change, deletion); renders two inbox-row panels reacting to a timeline slider, one snapshot-rendered and one live-rendered.
  - **Uses in this chapter:** Concept 7.
  - **Forward-links:** Chapter 10.2.5 (audit logs as snapshots), Unit 20.1 (logged events as snapshots), any future immutability-vs-live-state teaching.
  - **Leanest v1:** three fixed time steps via `DiagramSequence` rather than a smooth slider, two inbox renders side by side, one preset world-event sequence. v1 holds the teaching; the smooth scrub adds polish, not pedagogical weight.

- **`PrefsResolverSandbox`** — inputs: registry entries, an editable prefs table, and a test-event picker; renders a toggle UI, the resolved channels readout, the resolver expression with active fragment highlighted, and preset misconception-scenario buttons.
  - **Uses in this chapter:** Concept 8.
  - **Forward-links:** Unit 17.2 (security override patterns reuse the criticalChannel shape), Unit 8 (suppression-vs-prefs convergence). Real but distant.
  - **Leanest v1:** fixed registry, three toggles in a fixed UI, no expression highlighting (the resolver expression sits next to it as a static snippet). v1 is meaningfully thinner but still teaches the default-on + override rules. Build v1 first; layer expression highlighting later.

- **`DedupSim`** — inputs: a registry entry with editable `dedup.keyBy` and window, a seeded world state of other events, and a click stream; renders a timeline, surviving inbox rows, and the per-burst tally.
  - **Uses in this chapter:** Concept 9.
  - **Forward-links:** Unit 13.1 (retry-driven duplicate suppression at the worker layer), Unit 15.3 (Upstash-backed dedup as the upgrade trigger). Strong shape reuse on the timeline-and-tally readout.
  - **Leanest v1:** fixed seeded state, three preset key shapes (no editable picker), two preset windows, no coalesce mode. v1 still surfaces the key-shape failure modes, which is the core teaching. Build coalesce as a second pass when comments/mentions ship.

## Build priority

Four new components are on the table. Ranked by reuse weight across the chapter and the curriculum:

1. **`PrefsResolverSandbox`** — Concept 8 is the chapter's center of gravity (the outline names prefs as "where the dispatcher pattern earns most of its weight"), and the resolver-with-overrides shape forward-links cleanly into security patterns. Build first.
2. **`DedupSim`** — the misconceptions cluster around key shape and window choice in a way static prose can't unlock, and the simulator carries the in-chapter assessment for Concept 9. Strong forward-link to Unit 15.3. Build second.
3. **`ChannelIndependenceSim`** — load-bearing for the chapter's failure-mode rule and reuses forward to Unit 13/20 observability shapes. Build third.

`SnapshotVsLive` ranks fourth — the teaching can fall back to a `DiagramSequence` if the build queue tightens. Concepts 1, 2, 3, 4, and 5 ride on existing components (`TabbedContent`, `AnnotatedCode`, `Buckets`, `DiagramSequence`, `Sequence`) plus hand-SVG inside `Figure`.

## Open pedagogical questions

- Concept 4 folds the v1-vs-durable threshold into the flow-order artifact as a sixth panel. If the threshold lands cleanly there, it stays folded; if playtest shows students miss the upgrade signal because it's tucked at the end of another concept, it becomes a standalone Concept 4.5.
- `PrefsResolverSandbox` and `DedupSim` each ship preset scenario buttons that drive the simulator into the canonical misconception states. Is the authoring posture to ship pre-baked presets (lean, less reusable) or to let lesson authors define arbitrary scenarios per page (heavier, more reusable across the course)? The answer affects all four proposed components.
- Concept 3's per-item reveal on `Buckets` may need a small extension to the existing component (the reveal text on drop). Worth a small enhancement to `Buckets` rather than a bespoke `PredictReveal`, but the call depends on whether other Decision-archetype lessons want the same shape.
