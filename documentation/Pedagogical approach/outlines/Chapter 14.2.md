## Concept 1 — The dispatcher as the only seam

**Why it's hard.** Without a structural rule, every new feature reaches for `sendEmail()` directly or inserts notification rows from wherever it pleases. Six months later there are seventeen call sites, no consistent prefs, no dedup, and nobody can grep their way to "where do user-facing notifications come from." Students absorb the dispatcher's *shape* in 14.1 but underestimate how aggressively the *seam* has to be enforced.

**Ideal teaching artifact.** Open the lesson with a paired-codebase contrast: two `FileTree` blocks side by side, one captioned "without the seam" (eight files with `sendEmail(` scattered through actions, components, webhooks, cron jobs) and one captioned "with the seam" (the same eight files, all reaching into `lib/notifications/index.ts`, the dispatcher being the only file that imports `sendEmail`). The student sees the structural collapse before any code is written. Pattern archetype. Anchor the lesson's grep test as the enforcement check: `sendEmail(` outside `lib/notifications/` returns zero hits; same for `db.insert(notifications)`. This is the chapter's load-bearing invariant.

**Engagement.** A `Buckets` round mid-14.2.2 — present ten candidate call sites (server action, RSC render, channel function, cron tick, webhook handler, audit-log writer, etc.) and have the student sort into "may import `dispatch`" vs. "may import `sendEmail` directly" vs. "neither." The decoys are the load-bearing ones: the audit-log writer (never imports either), the channel function (the *only* place that imports `sendEmail`), and the unauthenticated-invite path inherited from 10.4 (the documented exception).

**Components.**
- Existing: `FileTree` ×2 inside a `TabbedContent` to flip "without seam / with seam" without breaking page rhythm.
- Existing: `Buckets` for the call-site sort.
- Existing: `Aside` (caution) for the inherited 10.4 invitation-email exception — the one place outside the seam that lives, and why.

**Project link.** The grep check is the structural seal at the end of 14.2.5; the inspector's verification surface in 14.2.6 only matters because the seam holds.

---

## Concept 2 — The registry as source of truth

**Why it's hard.** The registry looks like a config file but earns its keep as a type-and-behavior contract: one entry per event, every dispatcher behavior (category, channels, dedup window, key fields, templates, criticality) reads from it. A junior reads `notifiable_events` and parses it as "a list of strings"; a senior reads it as "the schema the dispatcher executes." The mental flip is from "registry as data" to "registry as the dispatcher's program."

**Ideal teaching artifact.** A single annotated registry entry — `'org.invitation.sent'` in full — walked field by field, where each field annotation answers *which dispatcher behavior this drives*. `category` drives the prefs lookup. `channels` drives the fan-out loop. `dedup.windowSeconds` and `dedup.keyBy` drive `claimDedup`. `template.email` and `template.inbox` drive the channel calls. `criticalChannel` drives the override clause inside `resolveChannels`. Concept archetype, executed via stepped annotation so each field connects to the dispatcher line that consumes it.

**Engagement.** `Tokens` on the annotated entry — the student clicks each field and identifies which dispatcher stage it controls (decoys: "the channel function reads `template`" vs. "the registry passes `template` to the channel function").

**Components.**
- Existing: `AnnotatedCode` on the registry entry, one step per field, each step's prose naming the consuming dispatcher line.
- Existing: `Tokens` for the field-to-stage drill.

**Project link.** 14.2.3 lands the registry; from that moment the rest of the dispatcher reads from it. Adding a fourth event in any forward lesson is a one-line edit students should be able to author unprompted by chapter end.

---

## Concept 3 — Dispatch order: registry → prefs → dedup → channels

**Why it's hard.** The four-stage pipeline has a wrong default the student will reach for instinctively: dedup *before* prefs feels "more efficient" because it short-circuits the prefs read. It is wrong — disabling-by-pref must not consume a dedup slot, otherwise the user toggling email off later in the window mysteriously gets nothing through any channel. Order matters and the dispatcher *names* the order. This is the one decision that, if misordered, produces silent-on-prefs-toggle bugs months later.

**Ideal teaching artifact.** A scrubbable four-stage pipeline diagram — DispatchEvent enters on the left, exits as DispatchResult on the right, with four stations in order (registry lookup, batched prefs read, per-recipient dedup, per-channel fan-out). Each station shows what enters, what exits, and what gets recorded on `DispatchResult` (registry miss → throw; prefs filter → `suppressedByPrefs++`; dedup hit → `deduped++`; channel success → `sent.<channel>++`). The student scrubs through five seeded scenarios: happy path, registry miss, pref-suppressed, deduped, critical-override-keeps-email. Concept archetype with worked-example reinforcement.

**Engagement.** A `Sequence` drag drill — given the five stages (lookup, prefs read, prefs resolve per recipient, dedup claim, channel fan-out), drop them in order, then a follow-up `MultipleChoice` asking what `DispatchResult` records when prefs suppress all channels (correct: `suppressedByPrefs` increments, `deduped` does *not*).

**Components.**
- Existing: `DiagramSequence` with one step per scenario; each step renders the same four-station diagram with the active station highlighted and the running `DispatchResult` displayed.
- New: `DispatchPipelineDiagram` (sketched below) — the static station-and-counter visual that `DiagramSequence` slots through. Or, single-use floor: hand-SVG inside `Figure`.
- Existing: `Sequence` + `MultipleChoice` for the recall round.

**Project link.** The order is the dispatcher body in 14.2.3. The student writes the body once the order is internalized; the `try/catch` in the channel station and the `?? true` in the prefs station get their own concepts below.

---

## Concept 4 — Default-on for missing prefs rows

**Why it's hard.** The `?? true` is two characters but encodes a product decision: a brand-new user with no row in `user_notification_preferences` receives notifications by default. The competing intuition — "no row means no consent" — is fail-closed and silently breaks every new account. The student must read `?? true` and explain on sight why silence-by-default is worse than friction.

**Ideal teaching artifact.** A misconception-first ambush: open with a one-line snippet `event.channels.filter(c => prefs.get(recipientId)?.channels[c])` and ask the student to predict what happens for a user with no prefs row, before showing the corrected `?? true` version. The point of the ambush is that the failure is *silent* — no error, no log, no bug report, just a new user who never gets onboarding email and churns. Pattern archetype (wrong-then-right) with predict-then-reveal pacing.

**Engagement.** `PredictOutput` over a tiny scripted scenario: three users (no row, row with email=true, row with email=false), call `resolveChannels` with `?? true` removed; the student predicts what each user gets; reveal shows that the no-row user gets nothing. Then show the `?? true` line and rerun mentally.

**Components.**
- Existing: `CodeVariants` (without-fallback / with-fallback) for the wrong-then-right pivot.
- Existing: `PredictOutput` for the three-user scenario.
- Existing: `Aside` (note) calling out the critical-channel override clause, foreshadowing Concept 5.

**Project link.** 14.2.4 — the seeded `alice` (no prefs row) is the deterministic verification target the inspector exercises. The inspector's "Fire invite-sent as alice" button only works as a check because of this rule.

---

## Concept 5 — Critical-channel override

**Why it's hard.** `criticalChannel: 'email'` on `billing.past_due` overrides the user's pref. This *should* feel uncomfortable — overriding a user preference is usually wrong. The student needs to internalize when the override earns its weight (the user materially needs to know; legal/security stake) and when it does not (marketing, social, "would be nice"). The decision lives in the registry, not the dispatcher, so adding override is a registry edit; revoking is a registry edit. The mechanism stays in `resolveChannels`'s single line `|| c === event.criticalChannel`.

**Ideal teaching artifact.** A short decision matrix: a `TabbedContent` of three rows — `team.member_changed`, `billing.past_due`, `marketing.weekly_digest` — each row showing the registry entry and a one-sentence answer to "does this earn `criticalChannel`?" with the reasoning ("losing access vs. annoying the user" framing). Decision archetype. Then the line in `resolveChannels` that implements it, with the override clause highlighted.

**Engagement.** `MultipleChoice` (multi-correct) — given seven candidate event types (password reset confirmation, weekly summary, billing past due, mention in a comment, security alert, role demoted, free-trial-ending), select those that justify a critical override. Multi-correct mode keeps it from being a guess.

**Components.**
- Existing: `TabbedContent` for the three-event matrix.
- Existing: `CodeTooltips` on the `resolveChannels` line — hover `|| c === event.criticalChannel` for the override clause's intent.
- Existing: `MultipleChoice` (multi-select) for the recall.

**Project link.** 14.2.4's verification — toggle `billing` → `email` off as alice, fire `billing.past_due`, watch the email counter still increment. The override is the chapter's one place where the user's stated pref does not win.

---

## Concept 6 — Dedup mechanics and the recipient-keyed window

**Why it's hard.** Dedup has three load-bearing parts that don't reduce to "the same event twice." The composite key is `(event_type, dedup_key, recipient_user_id)` — *not* `(event_type, dedup_key)` — because two recipients getting the same event is not a duplicate. The window is 60 seconds *per event* per the registry. And the check-then-insert is structurally racy (rare concurrent burst → one duplicate); the senior call is to accept the race in v1 and name the unique-constraint upgrade.

**Ideal teaching artifact.** A controllable timeline simulator. The student fires events from a control row (button per recipient × event type), and a horizontal time axis renders each dispatch as a tick with its dedup outcome: claimed (green, inserts a row) or deduped (gray, no row). The 60-second window after each claim shades the axis. Sliders adjust window seconds and recipient count. The student watches that firing the same event for a second recipient still claims, and that the window slides per recipient. Misconception-target: "dedup is global" — the simulator falsifies it on the first fire-to-second-recipient click. Concept archetype with a small playable model.

The handoff to code: after the simulator, the `claimDedup` SQL (SELECT-within-window then INSERT) maps station-for-station to the simulator's mechanics — same composite key, same window comparison, same insert. Naming the check-then-insert race is a single `Aside` after the code, not a digression in the simulator.

**Engagement.** The simulator carries the assessment via the predict-the-outcome loop (each click is a tiny prediction). Follow with one `TrueFalse` round on six statements ("firing the same event for two recipients always dedups one"; "the 60s window restarts on every dispatch attempt, not just claims"; "the dedup row inserts on hit"; etc.) to confirm recall after the artifact.

**Components.**
- New: `DedupTimelineSimulator` (sketched below). High forward-link weight — this is the dispatcher's hardest moving part and the same visualization re-uses for Upstash-backed dedup in 15.4 and the durable-queue dedup story in 13.1.
- Existing: `Code` block of the `claimDedup` SQL adjacent to the simulator, fields named one-to-one with the simulator's controls.
- Existing: `TrueFalse` for the post-artifact recall round.
- Existing: `Aside` (caution) for the accepted check-then-insert race and the named upgrade path.

**Project link.** 14.2.3's runnable demo — "Rapid-fire 5x in 2s" → `deduped: 4`. The 61-second-wait verification in 14.2.6 (window expires, fresh dispatch) only lands because the student has built the mental model of the sliding window.

---

## Concept 7 — Channel independence under per-channel `try/catch`

**Why it's hard.** The temptation is one `try` wrapping the full fan-out, because that's how most code reads. That makes channels *coupled*: if email throws, inbox never writes; if inbox throws, email never sends. The fix is structural — `try/catch` *inside* the loop, one per channel call, swallowing and logging per channel. The dispatcher itself never throws on channel failure. The student must absorb the structural form, not the policy ("be careful"), because the form is what makes the bug hard to write.

**Ideal teaching artifact.** A `CodeVariants` side-by-side of two dispatcher loop bodies — the coupling-by-default version (one outer `try/catch`) and the independent version (per-channel `try/catch`). Both versions run through the same simulated scenario: "inbox INSERT throws." The student sees the consequence visually: in the coupled version, email never sends; in the independent version, email increments while the inbox error logs and is swallowed. Pattern archetype (wrong-then-right with structural enforcement as the fix).

**Engagement.** `Dropdowns` over the independent version with three blanks (the `try` placement, the `catch` body, what gets returned from the per-channel call) — forcing the student to author the structural form themselves.

**Components.**
- Existing: `CodeVariants` for the coupled vs. independent diff.
- Existing: `Dropdowns` to assemble the independent version.
- Existing: `Aside` distinguishing channel failure (per-channel swallow) from `REGISTRY_MISS` (programmer error, bubbles).

**Project link.** 14.2.6's "Make email fail" debug tool — exercises the structural property at the inspector level. The student watches the inbox row still write while email throws, with no special-case code in the dispatcher.

---

## Concept 8 — Render-at-dispatch for inbox rows

**Why it's hard.** The default instinct for an inbox feed is "store a payload, render at display." That works exactly until the actor's name changes, the org renames, or the entitlement plan name shifts — and now history mutates retroactively. The fix is to render at dispatch: `event.template.inbox(payload)` produces `{ title, body }` strings stored on the row. The inbox UI becomes a pure read with no joins. The student must internalize that the inbox row is a *snapshot*, not a live join.

**Ideal teaching artifact.** A two-panel time-travel comparison. Panel A: a notifications table with `payload jsonb` only, rendered through a join with `users` and `organizations`. Panel B: the same table with `title text` and `body text` rendered at dispatch. Then a control: "the inviter renames themselves from `alice` to `Alice Z.`" and "the org renames." The student toggles the rename and watches Panel A's history mutate retroactively while Panel B stays stable. Concept archetype, executed as a small toggle-driven comparison so the cause-and-effect is visible.

**Engagement.** `MultipleChoice` (single-correct) — given four candidate inbox feed implementations, pick the one with no joins and pre-rendered text. Decoys include "join at read time but cache the result" (still mutates on rename) and "store payload, render once in middleware" (still does the join).

**Components.**
- New: `RenameDriftToggle` — small two-panel widget showing one notifications row, with a "rename actor" toggle that mutates Panel A's rendered output (live join) but not Panel B's (snapshot). Single-use in this chapter; demote to alternative.
- Existing (primary): a `Figure`-wrapped hand-SVG composition of the two panels with a small caption-level callout for the rename scenario. Lower fidelity than the toggle, sufficient because the lesson is one decision, not a system to play with.
- Existing: `MultipleChoice` for the recall.

**Project link.** 14.2.4's `writeInboxRow` — one render, one INSERT, no joins. The 14.2.6 inbox-feed-query-plan check ("no `Seq Scan`, picks the composite index") only matters because the read path stays simple.

---

## Concept 9 — Fire after commit, never inside

**Why it's hard.** Two failure modes a junior will hit: dispatching inside the transaction (rolled-back state still notifies; user gets an email for a role change that didn't happen) and dispatching with stale reads (webhook handler needs to know the org's owners *as of the commit*, but the closure capture has to happen inside the transaction to be consistent). The chapter has three call sites; two are easy (`await tx`-action; `await dispatch(...)`), one is the awkward webhook case (read-inside-capture-then-dispatch). The student must hold both shapes and pick the right one per call site.

**Ideal teaching artifact.** A timeline diagram with a vertical "commit boundary" drawn through the middle. To the left of the boundary: the action's transaction (with the read-list line for the webhook case highlighted as the one read that happens inside). To the right: `await dispatch(...)`. A separate scenario panel shows the rolled-back case — the transaction aborts, the dispatch line is never reached, no rows anywhere. Concept archetype with a worked example for each of the three call sites stacked vertically.

**Engagement.** `Sequence` drag drill over the webhook handler's six lines (verify webhook signature, claim `processed_events`, UPDATE `plan_entitlements`, write audit row, capture owner ids, COMMIT, `await dispatch(...)`) — student orders them and the grader verifies the dispatch line lands strictly after COMMIT and the owner-id read lands strictly before. Follow with `MultipleChoice` on what happens when "Wrap invite in rollback" is enabled (correct: no rows anywhere, no email, no dedup; not "dispatch fires but rolls back").

**Components.**
- New: `CommitBoundaryDiagram` (sketched below) — vertical commit-line diagram with before-and-after lanes, one variant per call site. Forward-links to webhook chapters and the transactional-outbox lesson when that gets built.
- Existing fallback: a `Figure`-wrapped hand-SVG of the three timelines stacked. Use this as the leanest v1 since the diagram is mostly static — the bespoke component earns its place only if the three call-site variants drift in shape across forward chapters.
- Existing: `Sequence` for the ordering drill; `MultipleChoice` for the rollback recall.
- Existing: `Aside` (note) naming the transactional-outbox upgrade as the next reach.

**Project link.** 14.2.5's three call-site edits are this concept in code form; 14.2.6's "Wrap invite in rollback" debug tool is the verification. The composition of two dedup layers (`processed_events` at the handler + `notification_dedup` in the dispatcher) gets one paragraph at the end of this concept's lesson and is exercised in 14.2.6's replay test.

---

## Concept 10 — The inspector as the verification surface

**Why it's hard.** Project chapters fail when the student finishes the build but can't articulate *which clause they verified, how, and against which seeded state*. The inspector is engineered to make every "Done when" clause a button-click; the chapter teaches verification *as* the deliverable, not as a check at the end. The student must internalize the loop: seeded state → fire button → observe inspector counters → match against the verify-recipe row. The inspector is not a debugging convenience; it's the artifact that proves the dispatcher meets the spec.

**Ideal teaching artifact.** A clause-by-clause mapping table — left column the "Done when" clause, middle column the inspector action, right column the observable signal (`MOCK_EMAIL_SENT_COUNT`, `deduped` badge, new inbox row, `suppressedByPrefs`). The framing's verify recipe is already this table; the lesson lifts it directly and walks through each row with a one-paragraph senior commentary on what the row is actually proving. Pattern archetype delivered as a guided puzzle: the lesson is the walkthrough, the student executes each row in the inspector as they read.

**Engagement.** The lesson *is* the engagement — student performs each verification clause in order in their own inspector, ticks them off, and articulates which build lesson owned each clause. Add one closing `Matching` round pairing the eleven "Done when" clauses to their owning build lessons (14.2.3, 14.2.4, 14.2.5) so the student can locate where to go when a verification fails in a future repo.

**Components.**
- Existing: a markdown table for the clause-to-action-to-signal mapping (the framing already authors it).
- Existing: `Steps` for the in-order execution rhythm.
- Existing: `Matching` for the closing clause-to-lesson recall.
- Existing: `Aside` (tip) on why rapid-fire-via-button beats five manual clicks (session/recipient drift across clicks).

**Project link.** This concept *is* 14.2.6 in pedagogical form. Every clause feeds back to a concept above; failure modes route the student back to the owning build lesson rather than into a debugging spiral.

---

## Component proposals

- **`DispatchPipelineDiagram`** — A four-station horizontal pipeline with running counter chips for `sent`/`deduped`/`suppressedByPrefs`. Props: active-station index, scenario name, optional per-station annotation. Renders the same four stations each call; the active one is highlighted and the counter chips update.
  - Uses in this chapter: Concept 3.
  - Forward-links: 15.4 (Upstash-backed dedup), 13.1 (durable-queue dispatcher), 17.2 (audit-log line discipline) — the four-station shape persists across each.
  - Leanest v1: hand-SVG four-box composition inside `Figure`, no animation, scenarios driven by a parent `DiagramSequence`. Promote to a real component once two forward chapters reuse it.

- **`DedupTimelineSimulator`** — A horizontal time axis with fire-event buttons per `(recipient, event_type)` pair, configurable window-seconds slider, and per-fire outcome rendering (claimed tick / deduped tick / shaded window-bar). Inputs: registry-style event list, recipient list, default window seconds. Output: a play-through the student can replay deterministically.
  - Uses in this chapter: Concept 6.
  - Forward-links: 15.4 (Upstash-backed dedup — same model, different store); 13.1 (durable-queue idempotency-key dedup); 12.x (revisit `processed_events`-style dedup with the same UI).
  - Leanest v1: just the timeline + one recipient + one event + window slider, no multi-recipient lane. The recipient-keyed property gets a side-by-side static `Figure` proving "two recipients ≠ duplicate." Promote to multi-lane when 15.4 needs it.

- **`RenameDriftToggle`** — Two-panel notifications row, one rendered through a live join, one with pre-rendered `title`/`body`. A single toggle renames the actor and shows Panel A mutating while Panel B stays.
  - Uses in this chapter: Concept 8.
  - Forward-links: None — single-use.
  - Leanest v1: skip the component entirely. Use a `Figure`-wrapped two-panel hand-SVG with the rename scenario shown as a caption-level before/after. The interactivity does not earn the bespoke build at single-use.

- **`CommitBoundaryDiagram`** — Vertical timeline with a labeled commit boundary, before-lane (transaction body) and after-lane (dispatch), variants per call site (simple action / webhook with read-then-dispatch / rolled-back case showing the dispatch line unreached).
  - Uses in this chapter: Concept 9.
  - Forward-links: 12.3 (Stripe webhook handler), 13.1 (durable-task dispatch boundary), 17.2 (audit-log placement). The commit-boundary visual recurs whenever an action-and-side-effect pair gets taught.
  - Leanest v1: hand-SVG stack of three timelines inside `Figure`, no toggle. The three variants are different enough in shape that a static rendering teaches as well as an interactive one. Promote only if forward chapters need to flip variants live.

## Build priority

Two proposals carry the most teaching load across the curriculum: `DedupTimelineSimulator` and `DispatchPipelineDiagram`. Both recur in 13.1 (durable queues), 15.4 (Upstash dedup), and 17.2 (audit-log placement / channel-failure discipline) — they earn their build cost across at least three forward chapters each.

Build order:

1. **`DedupTimelineSimulator` (v1: single-lane).** The chapter's hardest moving part is dedup, and no static diagram falsifies the "dedup is global" misconception cleanly. The single-recipient v1 ships the core insight; the multi-recipient lane gets added when 15.4 needs it.
2. **`DispatchPipelineDiagram`.** High reuse, low build cost — it is fundamentally a four-box SVG with three counter chips. Worth building straight rather than as a one-off hand-SVG because every forward chapter that revisits the dispatcher will want to highlight a different station.
3. **`CommitBoundaryDiagram`** and **`RenameDriftToggle`** stay as `Figure`-wrapped hand-SVG compositions in v1. Neither passes the reuse bar to justify a bespoke component yet; revisit `CommitBoundaryDiagram` when 13.1 lands.

## Open pedagogical questions

- The 10.4 invite-already-a-user duplication (two emails fire — the unauthenticated invite path *and* the dispatcher's `org.invitation.sent`) is accepted in v1 and named explicitly in 14.2.6. Does the lesson present this as a deliberate scope cut with an `Aside` (current proposal), or as a `Matching` exercise where the student locates the second send? The first reads cleaner; the second forces the student to spot the duplication themselves. Default to the first unless reviewer prefers the harder form.
- Concept 10's "the lesson is the engagement" framing relies on the student actually doing each clause in their inspector. If completion-tracking is not enforceable, the closing `Matching` round becomes the only recall hook. Whether that's sufficient depends on how this course treats "verify" lessons across other projects — worth a cross-cutting decision rather than a one-chapter one.
