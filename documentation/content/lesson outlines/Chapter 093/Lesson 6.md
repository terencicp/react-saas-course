# Lesson title

- Title: Session replay with masking by default
- Sidebar label: Session replay

# Lesson framing

The chapter's last teaching lesson (then a quiz). Pattern-and-decision shape, ~35–45 min. Installs PostHog's fourth and final primitive: session replay. The three before it (events L4, flags L5) were typed code; replay is mostly a config posture plus an operator workflow — there is very little new code, so the lesson's weight is on two things the chapter outline names as load-bearing: **the masking catalog** (what to hide and how) and **the replay-to-bug-fix workflow** (how an operator actually uses a recording).

Senior framing that must open the lesson and recur: replay is the answer to *the bug that throws no error*. Sentry (ch092) catches exceptions; structured logs show 200s; the user can't repro on a call. The bug is in the interaction — a misaligned modal, a click target hidden behind a tooltip, a stray backdrop click. Replay is the only surface that shows what the user actually did. Frame it against a concrete support ticket ("three users say the dashboard broke, no error anywhere") and resolve that exact ticket with a replay at the end. This is the senior's answer to a known cost; it is not "record everything in case."

The single conceptual hinge the whole lesson hangs on, and the one thing students get wrong: **replay records the DOM, not video.** rrweb-style capture serializes DOM mutations, mouse moves, clicks, scroll, viewport, plus console + network *metadata*, and the player re-renders that DOM deterministically. Teach this *first*, because it is *why masking is structural and trustworthy*: a masked element was never in the recording — there is no pixel to leak, no OCR to run. Students arriving from "screen-recording" mental models assume masking is a blur over a video frame (defeatable); the truth is the masked value never left the browser. Get this mental model landed and mask-vs-block, the catalog, and the privacy review all follow naturally.

Privacy-first posture is the throughline: **default to masked, whitelist what's safe to show** — the inverse of the older "capture text, mask inputs" default. PostHog's 2026 default masks inputs and is configured both in `posthog.init` *and* in project settings; name both surfaces so the student doesn't set one and assume the other. Replay is the easiest PostHog primitive to misconfigure into a GDPR violation, so every section ties back to "what would show in a replay."

Continuity discipline (this lesson extends, never re-teaches): the consent gate (ch081 L5) and the exact `posthog.init` shape + consent-gated `useEffect` (L3) and the distinct-ID / `identify` stitch (L4) are all established. Replay rides all three. The lesson adds two things to the *existing* L3 provider: the `session_recording` masking config inside the existing `posthog.init`, and `disable_session_recording: true` + a consent-gated `posthog.startSessionRecording()`. Show these as additions to the known block (ins-marked), not a fresh file. GDPR deletion is a pointer to ch081 L4, not a re-teach.

Decision content the student must leave with: when to record vs. not (the negative-space catalog — admin tools, export flows, payment iframes), mask vs. block per element, sampling discipline (don't record 100% of anonymous B2C traffic), and the pre-ship privacy review as a named ritual. The mental model to end with: "replay is masked-DOM playback, gated by consent, sampled on purpose, and reviewed before it ships."

Verification of the consent gate on replay is non-negotiable and mirrors L3's ritual: reject → no recording starts; accept → recording starts. Reuse the DevTools check the student already knows.

# Lesson sections

## What session replay sees that errors and logs miss

Opening section. Establish the senior question with a concrete, unresolved support ticket: three users this week said the dashboard "broke" — Sentry is clean, the structured logs show every request returning 200, the user can't reproduce it on a call. State plainly that this is a *UX* bug (the interaction failed, the code didn't throw) and that none of the chapter's prior surfaces can see it. Position replay precisely against the rest of the observability stack the student has built: Sentry = thrown errors (ch092), structured logs = the request record (ch092), product events = what happened in aggregate (L4), **replay = what this one user actually did, frame by frame**. Make explicit that replay *complements* Sentry, it does not replace it — name this because the chapter-2 continuity note flagged the "PostHog replaces Sentry" misconception.

Pedagogical device: a small comparison table (plain markdown, no component needed) — rows for Sentry / structured logs / product analytics / session replay, columns "answers the question" and "granularity (aggregate vs. one user)". Keep it tight; its job is to slot replay into a stack the student already owns, not to re-describe the other tools.

Close by promising the section payoff: by the end of the lesson the student resolves this exact ticket from a recording. This sets up the L "replay-to-bug-fix workflow" section as the callback.

`Term` candidates here: none new — Sentry, structured logs, distinct ID are all prior. (Distinct ID was fully defined in L4; if referenced, link, don't gloss.)

## Replay records the DOM, not a video

The conceptual hinge. This is the most important section in the lesson; everything downstream depends on the student internalizing it. Teach the simplified model first, then add precision.

Step 1 — the claim, stated bluntly: PostHog does not record your screen. It serializes the DOM and a stream of changes to it (rrweb-style capture), then replays that DOM in a deterministic player. There is no video file.

Step 2 — what is actually captured: an initial DOM snapshot, then incremental mutations, plus mouse moves, clicks, scroll position, viewport size, and `console` lines + network request *metadata* (URL, method, status, duration). Explicitly: **not** request/response bodies by default.

Step 3 — the payoff, drawn as the consequence: because the player re-renders recorded DOM, masking is *structural*. A masked field's value was replaced with `***` (or the element omitted entirely) *at capture time, in the user's browser* — it was never transmitted. This is categorically different from blurring a video frame: there is no underlying pixel data to recover. State the misconception explicitly and kill it ("if you picture a blurred screenshot, you'll under-trust masking and over-block").

Pedagogical device — diagram: a `DiagramSequence` (4 steps) walking the capture-to-replay pipeline. Goal: make "DOM, not video" visceral and show *where* masking happens.
- Step 1: User's browser — the live DOM, with a password input holding a real value. Label the input.
- Step 2: Capture in the browser — the same DOM serialized to a payload; the password input's value is now `***` and a `.sensitive` div reads `***`. Caption: masking happens *here*, before anything leaves the device.
- Step 3: Transit / PostHog Cloud EU — the masked payload travels and is stored (Frankfurt). Caption: the real values were never in the payload, so they were never stored.
- Step 4: Operator's replay player — the deterministic re-render; masked fields show `***`. Caption: the operator sees structure and interaction, never the secret.
This is HTML/CSS-in-`DiagramStep` content (simple labeled boxes + an arrow between stages), not a graph engine. Cap height per the diagram guideline.

Reasoning: a step-scrubbed sequence is the right vehicle because the pedagogical point is *the order of operations* (mask → transmit → store → replay) and *where in that order the secret disappears*. A static box diagram wouldn't land the "before it leaves the browser" beat as hard.

Optional reinforcement: a one-line `Term` on **rrweb** ("the open-source DOM-recording engine PostHog's replay is built on") at first mention — non-obvious, supports the "DOM not video" claim, but keep it to a gloss, not a tangent.

## Masking by default: the SDK config and project-settings surfaces

Turn the posture into config. Lead with the default and the direction of the default, because the title leans on it: PostHog's 2026 default **masks inputs** out of the box, and the broader masking level is set in the **project's replay settings**, not only in code. Name both surfaces explicitly and warn against the split-brain failure (set masking in `posthog.init`, forget the dashboard, or vice versa) — they compose, and the dashboard can tighten what code requests.

Then the code. Show the `session_recording` block as an **addition to the existing L3 `posthog.init`** — not a new file. Use `CodeVariants` with two tabs, before/after, to make "this is the same init you already wrote, plus three keys" unmistakable:
- Tab "L3 init (recap)": the exact L3 config (`api_host: '/ingest'`, `ui_host`, `defaults: '2026-01-30'`, `capture_pageview: false`, `opt_out_capturing_by_default: true`).
- Tab "+ replay masking": same block with `disable_session_recording: true` and a `session_recording: { maskAllInputs: true, maskTextSelector: '.sensitive, [data-sensitive]', blockSelector: '.never-record, [data-no-replay]' }` added (`ins`-marked). Prose: `maskAllInputs` is the safety floor (every `<input>`/`<textarea>`/`<select>` value masked); `maskTextSelector` adds class/attr-targeted text masking on top; `blockSelector` removes elements entirely. `disable_session_recording: true` keeps recording off until consent flips it on (next section explains why this key, not auto-record).

Reasoning for `CodeVariants` before/after: the entire teaching point is *delta on a known block*. A bare `Code` block would re-present the whole init and bury the three new keys; the tabbed diff foregrounds exactly what's new and ties back to the file the student already has.

Note the deliberate divergence for downstream agents: the canonical L3 init had no `session_recording`; this lesson adds it. The masking selectors (`.sensitive`, `.never-record`) are course conventions introduced here — name them as such so the catalog section can rely on them.

Code-convention note: object keys like `maskAllInputs` are PostHog's SDK surface (camelCase) — keep them verbatim; this is third-party API, not course-named identifiers, so the snake_case event convention from L4 does not apply.

`Term` candidate: none beyond rrweb (already glossed).

## Mask versus block: two levers, two intents

The core taxonomy of the lesson. Students conflate these; the distinction is the difference between "show that they interacted with a field" and "pretend the field isn't there." Teach as a contrast, then give the decision rule.

- **Mask**: the element *is* recorded — structure, position, dimensions, the fact of interaction — but its text/value is replaced with `***`. The replay shows the user *typing into* the password field, just not what. Reach for mask when the interaction matters for debugging (did they fill it? did focus land? did validation fire?).
- **Block**: the element is *not* recorded at all; the player shows an empty placeholder of the same footprint. Reach for block when the element's *content shouldn't exist in the recording at all* — a third-party iframe carrying PII, a customer's rendered billing details, anything where even structure is too much.

Pedagogical device: a `TabbedContent` with two tabs ("Masked" / "Blocked"), each showing a tiny mock of what the *replay player* renders for the same form — masked tab shows a field outline with `***` inside and a cursor; blocked tab shows a grey placeholder box of equal size. Goal: make the visual difference concrete (the operator's-eye view), since the distinction is fundamentally about *what the operator can see*. Simple HTML/CSS mock inside each `TabbedItem`, captions stating the intent. Could also be a single `Buckets`/decision aid, but the side-by-side rendered-result view teaches faster than classification here.

Decision rule to state explicitly: default to **mask**; escalate to **block** only when structure itself is sensitive or the element is third-party. Over-blocking destroys the debugging value (an all-grey replay tells you nothing); under-masking leaks. The senior posture is "mask aggressively, block surgically."

The element-level levers, named at the call site (not as a config dump):
- `ph-no-capture` **CSS class** → masks the element (recorded, content hidden). The per-element version of `maskTextSelector`.
- `data-ph-no-capture` **attribute** → element not recorded at all. The per-element version of `blockSelector`.
- `data-ph-capture-attribute-unmask="true"` → selectively *unmask* specific text even under a masking regime (the rare whitelist case — e.g. an order number support needs to read).
Small `Code` block (jsx) showing all three on real elements in a form, with a one-line comment on each. Keep it short; it's a reference the catalog section points back to.

`Term` candidates: `ph-no-capture` does not need a Term (it's defined inline at its call site); no new tooltip terms here.

## A masking catalog for a SaaS app

Make the abstract posture operational. This is one of the two load-bearing sections. The student should leave with a concrete, reusable list of *what to mask/block in a real SaaS*, mapped to the lever. Frame it as "the targets that recur in every SaaS, decided once."

Present as a `Buckets` exercise (two columns: **Mask** and **Block & don't record**) — the student drags realistic targets into the right column. This is the ideal spot for a classification drill because the lesson's skill is exactly *triage by intent*, and the student just learned the rule. Targets to include:
- Mask: customer name/address/phone on profile pages; free-text fields where users paste anything (notes, descriptions); the username/email field on auth forms (show that they typed, not what); any element classed `.sensitive`.
- Block: third-party PII iframes; rendered billing/payment details; the audit-log preview surface (operator PII, ch081); a Stripe Elements wrapper (belt-and-suspenders — see below).
After the drill, a short prose "the catalog" recap mapping each to its lever (class `.sensitive` for mask, class `.never-record` / `data-ph-no-capture` for block), so the student has the canonical list in prose form too.

The Stripe Elements nuance (teach it precisely, it's a common confusion): Stripe Elements renders in a *third-party iframe* that is already isolated from the parent DOM — rrweb cannot read across that origin boundary, so card data is *not* captured even with no config. But class the wrapper `.never-record` anyway as belt-and-suspenders and to keep the iframe placeholder out of the replay noise. State both halves: "it's already safe; we block it anyway for defense-in-depth and signal-to-noise." This corrects the chapter-outline watch-out about replay "capturing a Stripe iframe by accident."

The drift watch-out, stated as a forward-looking discipline (not a separate tips section — it belongs here because it's about the catalog): masking config rots. A feature shipped next quarter adds a `<textarea>` collecting customer addresses; if no one classes it, it's captured in the clear. The catalog is not write-once. This motivates the privacy-review ritual two sections down.

Custom-widget gotcha to fold in: default input-masking covers `<input>`/`<textarea>`/`<select>`, but **not** a `<div contenteditable>` rich-text editor — the default doesn't see it as an input, so it must be masked by class explicitly. Name it as the canonical "the default didn't catch it" case.

`Term` candidates: `contenteditable` could take a one-line Term if the student is unlikely to know it ("a `div` made editable like a text field"), but only if it doesn't already appear earlier in the course — keep optional, prefer an inline gloss.

## Recording only on consent

The consent gate's reach on replay. This is a *short* extension section, not a re-teach — the gate, the four-state model, and the verification ritual are all from L3/ch081 L5. The point: replay is personal data, so it obeys the same gate as events; nothing records before accept.

Connect to the `disable_session_recording: true` introduced in the config section: that key is *why* replay doesn't auto-start. Show the addition to the **existing L3 consent-gated effect** — after `posthog.opt_in_capturing()` on the accepted path, add `posthog.startSessionRecording()`; the SDK won't record until this call (and even then obeys sampling — forward-reference the next section). Use a small `Code` block showing the consented branch of the L3 effect with the one new line `ins`-marked, plus the cleanup-branch note (`posthog.stopSessionRecording()` is implied by `opt_out_capturing()` / `reset()` already in the effect — state that withdrawal stops recording too).

Reasoning: the student already saw the full effect in L3; reproducing it whole would bury the single new line and waste tokens. Show the delta only, reference L3 for the surrounding structure.

Verification, mirroring L3's ritual exactly (reuse, don't reinvent): reject in the consent banner → open the PostHog replay list → no session appears for that visit; accept → a session appears. State this as the gate-trust check; replay is the highest-stakes primitive to get the gate wrong on.

`Term` candidates: none new (four-state machine, consent gate are prior; reference).

## Sampling so the inbox stays useful

Quota and signal discipline. Two failure modes motivate it: cost (recording every session at B2C scale burns the quota in days — callback to the chapter-2 quota-bust warning) and *signal* (a thousand recordings of nothing is a haystack; the operator can't find the one that matters). Frame sampling as both a cost lever and a findability lever.

Teach the two mechanisms:
- **Sample rate** — `session_recording: { sampleRate: '0.1' }` records a fraction of sessions. Course default posture: high sampling (near-100%) of *identified* users on a B2B SaaS (low-volume, high-signal — these are your customers), low sampling (~10%) of anonymous traffic. State the reasoning (you want the paying customer's bug, not a random bounce).
- **Trigger-based recording (trigger groups)** — the more surgical option: only record sessions matching a URL, an event, or a feature flag, configured as *trigger groups* in PostHog's project settings (each group combining URL/event/flag triggers + its own sample rate + minimum duration). The high-value pattern: record only sessions where `paywall_viewed` or `support_chat_opened` fired (events from L4) — you capture exactly the funnels you're debugging. Note this lives in the dashboard, not `posthog.init`, so it's tunable without a deploy.

Correction for downstream: the chapter outline named a `record_user_on_event` config knob — that's outdated; the current surface is **trigger groups in project settings** plus the `sampleRate` config key. Author against trigger groups, not `record_user_on_event`.

Pedagogical device: keep this prose + one small `Code` block for `sampleRate`; the trigger-groups part is a dashboard feature, so describe it (optionally a one-line mention that a `Screenshot` of the trigger-group UI could illustrate it — leave as optional, prose is sufficient).

`Term` candidate: `sampleRate` value is a string fraction in PostHog's API — note inline (a common foot-gun: `'0.1'` not `0.1`), not a Term.

## Reading a replay: from ticket to one-line fix

The second load-bearing section — the operator workflow that justifies the whole primitive. This is the callback that resolves the opening ticket. Model it end-to-end as a concrete, scrubbable sequence so the student can picture *using* a recording, not just configuring it.

The worked case (the chapter outline's scenario, fully staged): a user reports "the upgrade button does nothing." The on-call walk:
1. Look up the user's PostHog distinct ID (stored on the user row — L4's distinct-ID join — or found by email in PostHog person search).
2. Filter the replay list by that distinct ID; open the session.
3. Scrub to the click on the upgrade button.
4. The DOM timeline shows the modal opens, then *immediately closes* — a stray `click` fires on the backdrop. Console panel: clean. Network panel: clean (this is why Sentry/logs missed it).
5. Diagnosis: a missing `e.stopPropagation()` on the modal content — the click bubbles to the backdrop's close handler.
6. Fix: one line. The replay made an un-reproducible bug reproducible without ever getting the user on a call.

Pedagogical device: a `DiagramSequence` (5–6 steps) mirroring the scrub. Each step is a stylized frame of the replay player (HTML/CSS mock): the modal open → backdrop-click highlighted on the event timeline → modal closed, with the console/network panels shown clean alongside. Goal: teach *how to read the player's panels together* (DOM + timeline + console + network) — the actual operator skill. Captions narrate the on-call's reasoning at each frame. This is the right component because the skill is literally temporal scrubbing; the sequence reproduces the experience.

Call out the cross-tool pivot explicitly, since it ties the chapter together: when the network panel *does* show a 500 at the moment of the bail, the operator copies the request URL and pivots to Sentry / structured logs (ch092) by that URL. Replay finds *where*; the error stack tells *why*. This is the observability stack working as one.

Optional: a `VideoCallout` embedding a short official PostHog "how to use session replay" walkthrough could reinforce the player UI for visual learners — mention as optional, only if a current (<6mo) high-quality clip exists; do not block the lesson on it.

`Term` candidates: `stopPropagation` / event bubbling — if the student's React event knowledge is assumed (it is, by this point in the course), an inline gloss suffices; a `Term` only if bubbling wasn't covered earlier. Prefer inline.

## When not to record at all

The negative-space decision, stated as its own catalog because "where replay is wrong" is a senior judgment the student must make deliberately. The default is *record with masking*; this section is the carve-outs.

- **Internal admin tools** → a *separate PostHog project* with replay off entirely. Operators are looking at customer data on these screens; recording the operator's session re-captures customer PII at one remove. Name this as the cleanest rule.
- **Customer-data export / download flows** → block the whole flow (`data-ph-no-capture` on the container).
- **Payment forms** → Stripe iframe already isolated (callback to the catalog); class the wrapper, move on.
- **Auth forms** → default masking covers the password; the username/email *can* stay captured (masked text) for support pivots — a deliberate "mask, don't block" call so the operator can still confirm *which* account.

Frame as a quick `StateMachineWalker` (`kind="decision"`) OR a tight prose list — lean prose here to avoid component fatigue (the lesson already has two DiagramSequences, a TabbedContent, a Buckets). Decision: **prose list with a one-line rule each**, since these are flat rules, not a branching tree. State the meta-rule: "record-with-masking is the default; everything here is a named exception with a reason."

`Term` candidates: none new.

## The pre-ship privacy review

Close the lesson on the discipline that keeps replay shippable, because replay is the easiest primitive to misconfigure into a leak and the catalog rots over time. Frame as a concrete, repeatable ritual, not a vague "be careful."

The ritual: before shipping replay to production (and quarterly after), open a real recorded session and *scrub through it looking for PII*. Anything unmasked that shouldn't be → add the class, re-verify. Frame the cadence: a 30-minute one-off before launch, then a recurring quarterly pass (pairs with the stale-flag audit cadence from L5 — name the parallel so the student sees a pattern of recurring hygiene passes).

Two more disciplines to fold in here (they belong with "the review" because they're about residual leak surfaces the review must catch):
- **Network body capture stays off.** Bodies carry PII; URL + status + duration are enough to debug and to pivot to Sentry. Only enable body capture for a *specific, time-boxed* debugging cycle, then turn it off. State the default explicitly (off) and the failure mode (enable-and-forget leaks bodies indefinitely).
- **Replay is operator-side access.** Even perfectly masked, a replay shown in a screen-share with a customer, or viewed by an operator, is access to that user's session — treat it with the same care as any PII surface (callback to ch080's operator-PII framing). Masking protects the *stored data*; it doesn't make a replay public.

GDPR deletion — pointer, not re-teach: when a user requests deletion (ch081 L4's path), their replays must go too. Deleting a *person* in PostHog removes all their associated data — events *and* recordings — in one action. The correct surface is **server-side** (the Persons / Data-Deletion API via `posthog-node`, the same `lib/posthog.ts` adapter from L3/L4) or the **"Delete person" action in the PostHog app UI** — *not* a browser-SDK call. Do NOT write `posthog.deletePerson(...)` on the client: that method does not exist on `posthog-js`; the chapter outline's API name was wrong and is corrected here. State that the ch081 L4 deletion flow must trigger this PostHog person-deletion (server-side) as one more downstream delete; do not re-teach the GDPR mechanics — link to ch081 L4.

Pedagogical device: a `Checklist` for the pre-ship privacy review (tickable items: every input masked? `.sensitive` applied to PII fields? export flows blocked? admin tools on a separate project? network bodies off? GDPR-deletion call wired?). The Checklist component is purpose-built for a "work through this before you ship" list and gives the student a reusable artifact — the ideal close for a discipline-shaped section.

`Term` candidates: none new.

## External resources

`ExternalResource` cards (1–3, not a dump):
- PostHog Session Replay privacy controls docs (`posthog.com/docs/session-replay/privacy`) — the canonical masking reference.
- PostHog "how to control which sessions you record" docs — sampling + trigger groups.
- PostHog "Controlling data storage / data deletion" docs (`posthog.com/docs/privacy/data-deletion`) — the correct person-deletion surface for the GDPR pointer.
- Optional: rrweb project page, only if the "DOM not video" point warrants a curious-reader link.

# Scope

Prerequisites to redefine *concisely* (one line each, link out — do not re-teach):
- Consent gate + four-state model + `useConsent()` → ch081 L5. Replay obeys it; reference only.
- The `posthog.init` block, the consent-gated `useEffect`/`PostHogProvider`, belt-one/belt-two, the `/ingest` proxy → ch093 L3. This lesson *adds* `session_recording` + `disable_session_recording` + `startSessionRecording()` to that existing block; show deltas only.
- Distinct ID, `identify`/`reset` stitch, the distinct-ID-on-user-row join, events like `paywall_viewed` → ch093 L4. Used in the workflow and trigger groups; reference, don't redefine.
- Feature flags (used as a replay trigger condition) → ch093 L5. Reference only.
- Sentry, structured logs → ch092. Used in the cross-tool pivot; reference only.
- PostHog Cloud EU / Frankfurt residency → ch093 L2. Mention for replay storage; one line.

Out of scope (do NOT cover):
- **Sentry's own session replay** — the course picked PostHog for replay; Sentry replay was named once in ch092 L1. Do not re-open the comparison; one sentence max if at all.
- **The consent gate's internals / the four-state machine implementation** — ch081 L5 owns it.
- **GDPR deletion mechanics** — ch081 L4 owns it; this lesson only points at adding the PostHog deletion call to that flow.
- **Core Web Vitals / Speed Insights real-user performance** — ch093 L1 and ch094. Replay is behavior, not performance metrics.
- **Self-hosted PostHog replay storage / ClickHouse scale** — out of scope; course uses PostHog Cloud.
- **Event taxonomy, the typed `track()` helper, the identify handshake at depth** — ch093 L4; only referenced.
- **Flags/experiments at depth** — ch093 L5.
- **rrweb internals / writing a custom recorder** — out of scope; rrweb named only as the engine.
- **Mobile/native replay (iOS/Android masking)** — out of scope; the course is web.
- No new `posthog.init` *architecture* (provider, proxy, env vars) — all established in L3; this lesson is config + posture + workflow on top.

# Notes for downstream agents

- Very little new code by design. The lesson's value is the masking catalog (Buckets) and the bug-fix workflow (DiagramSequence). Do not pad with invented code; the only real code is the `session_recording` config delta, the element-level masking attributes, the `startSessionRecording()` line, and the `sampleRate` key.
- All `posthog.init` code must match L3's canonical shape exactly (`api_host: '/ingest'`, `ui_host: 'https://eu.posthog.com'`, `defaults: '2026-01-30'`, `capture_pageview: false`, `opt_out_capturing_by_default: true`) — show additions as `ins`-marked deltas, never a divergent rewrite.
- PostHog SDK option keys are camelCase third-party API (`maskAllInputs`, `maskTextSelector`, `blockSelector`, `sampleRate`, `disable_session_recording`) — reproduce verbatim; the L4 snake_case *event-name* convention does not apply to SDK config keys.
- `sampleRate` is a **string** fraction (`'0.1'`), not a number — get this right.
- Component budget: two `DiagramSequence` (pipeline + workflow), one `TabbedContent` (mask vs block), one `Buckets` (catalog), one `Checklist` (privacy review). Resist adding more; the lesson is short and component fatigue is a real risk. Where a plain markdown table or prose list teaches as well (the stack-comparison table, the when-not-to-record list), use that.
- Keep the senior framing (the support ticket) as a spine: open with it, resolve it in the workflow section.
