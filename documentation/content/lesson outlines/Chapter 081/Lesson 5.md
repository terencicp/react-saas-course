# Nothing fires pre-consent

Title: Nothing fires pre-consent
Sidebar label: Consent gate

## Lesson framing

This is the consent lesson of Unit 16's pre-launch security baseline. The student already has the pieces it builds on — a root `<Providers>` Client Component (ch076), cookies read with `await cookies()` in Next.js 16 (ch037/056), Server Actions with the `Result` shape, the `audit_logs` table + `logAudit(tx, event)` (ch057), Better Auth's `__Host-`-prefixed session cookie (Unit 8). PostHog itself is **not** wired until ch093 — this lesson teaches the *gate* that ch093 will plug into, never PostHog's own API at depth.

The senior frame that runs through the whole lesson: a cookie banner is not a legal checkbox, it is an **engineering gate with one source of truth**. The naive "Accept" banner that flips a boolean *after* the page has already booted the analytics SDK leaks events in the first hundreds of milliseconds — and that single pre-consent event is the violation. So the load-bearing rule is literal: **nothing non-essential fires before the user has chosen.** Two belts enforce it (SDK initialized opted-out *and* the SDK module dynamically imported only on consent), and one source of truth (`useConsent()`) is what every third party reads.

Pedagogical priorities, in order:

1. **The essential / non-essential split is the whole game.** Every downstream decision (which cookies need a banner, what "reject" must actually do) falls out of one legal test: *strictly necessary for the service the user explicitly asked for.* Teach this test first, concretely, with this app's real cookies sorted into the two buckets. Get this wrong and the rest is noise.
2. **Consent is a small state machine, not a boolean.** Four states (`unset`, `analytics`, `marketing`, `all` — modeled as two independent category flags, both default-off). The student should leave able to draw it. This is the perfect fit for `StateMachineWalker` (`kind="machine"`) which the course already demos with a consent example.
3. **The pre-consent boundary is a *timing* problem, not a config problem.** This is where beginners fail in production: they think `opt_out_capturing_by_default: true` is enough, but the SDK has still loaded and opened a connection. The fix is to gate the *module load itself*. Make the two-belt model vivid with a before/after network-tab comparison.
4. **Dark patterns are a compliance bug, not a design preference.** Reject must be exactly as easy as Accept — regulators (CNIL, EDPB) have fined asymmetric banners. Frame this as an engineering invariant the student can verify, not UX taste.
5. **Cookie consent ≠ marketing-email consent.** Two separate, unrelated opt-ins that students conflate. A short dedicated section draws the boundary: the sign-up "send me product updates" checkbox (default-unchecked) governs a `marketingEmailConsent` column; transactional email never needs consent.

The lesson is mostly **judgment + one focused build**: the `useConsent()` provider and the gate shape. Heavy on diagrams (state machine, two-belt timing sequence, banner-anatomy annotation), a classification exercise for the essential/non-essential test, and one MCQ on the pre-consent boundary. Code is read-and-understand, not authored from scratch — the provider and Server Action are shown via `AnnotatedCode`/`CodeVariants`, consistent with how the chapter treats already-shipped infrastructure. Cap PostHog mentions to the two SDK options that demonstrate the *gate's shape* (`opt_out_capturing_by_default`, dynamic import); the SDK API itself is ch093's job.

Keep the body engineering-shaped. GDPR / ePrivacy are named once as the "why," then the lesson is about flags, cookies, timing, and one React Context.

## Lesson sections

### A banner is a gate, not a checkbox

Opening / introduction (no header beyond the page title leading in, or a short lead-in under the H1 before the first H2 — writer's call; keep it warm and brief per the guidelines). State the goal and the senior question concretely: ch093 will run PostHog (events + session replay); GDPR/ePrivacy require explicit, *prior* consent before any non-essential cookie or tracking script. The naive banner flips a flag, but the SDK already fired on first load — that one event is the breach. Preview what the student builds: one `useConsent()` source of truth, a three-button banner, and a gate where *nothing fires pre-consent*. Connect to prior knowledge: they already have a root `<Providers>` Client Component and cookie-reading Server Actions; this is one more provider with a strict timing rule.

Reasoning: per the pedagogical guidelines the intro motivates with a concrete problem (the leaked first-load event) and names the senior question implicitly rather than as a labeled section.

`Term` candidates in this section: *ePrivacy Directive* (the EU "cookie law," distinct from GDPR — it governs storage/access on the device), *prior consent* (consent must precede the processing, not follow it).

### Essential or not: the one test that decides everything

Teach the single legal test — **strictly necessary for the service the user explicitly asked for** — and apply it to this app's real cookies. This is the foundational concept; everything else derives from it.

- **Essential (no consent needed):** the Better Auth session cookie (`__Host-`-prefixed, `HttpOnly; Secure; SameSite=Lax`), the CSRF token, the active-org cookie (ch056 L1), and — the one students miss — the *consent-choice cookie itself* (you can't ask consent to store the record of consent). 
- **Non-essential (consent required):** analytics (PostHog), session replay, marketing pixels, support-chat widgets, anything that profiles the user across sessions or sites.
- **The tie-breaker rule:** *if in doubt, non-essential.* The burden of proof is on treating something as essential.

Make the point that "essential" is about the *user's* requested service, not the *business's* needs — analytics helps the business, so it is never essential, however useful.

This gate ships exactly two non-essential categories: `analytics` and `marketing`, both default-off.

Component: a **`Buckets` exercise** — give the student ~8 cookies/trackers (session cookie, CSRF token, consent cookie, active-org cookie, PostHog analytics, session replay, marketing pixel, support-chat widget) to drag into Essential vs. Consent-required. This is the highest-value interaction in the lesson because the whole lesson rests on the student internalizing this test. Grading: each item in the correct bucket; the consent-cookie-is-essential and analytics-is-non-essential items are the discriminating cases.

Reasoning: a classification drag-and-drop is exactly the right tool for a binary judgment test the student must apply repeatedly. `Buckets` over `MultipleChoice` because there are many items and the *sorting* is the skill.

`Term` candidates: *strictly necessary* (the ePrivacy phrase that is the legal test), *PII* (re-define briefly — personally identifiable information, already seen in L3/L4 but worth a one-line hover for flow).

### Consent is a state machine, not a boolean

Reframe consent from a single "accepted" boolean to a small state machine, because the boolean model is what produces the broken banner. Model it as **two independent category flags** (`analytics`, `marketing`), each default-off, yielding four meaningful states:

- `unset` — no decision recorded; both categories off; banner showing.
- `analytics` — analytics on, marketing off (the common "Accept all" minus marketing, or a granular choice).
- `marketing` — marketing on, analytics off (rare but representable).
- `all` — both on.

The decision is stored in a cookie (`consent_choice`), **not** localStorage — explain why: the banner is server-rendered, so the server must be able to read the choice (`await cookies()`) to decide whether to show the banner without a flash; localStorage is client-only and would flash the banner on every SSR load. Cookie lifetime is capped at **13 months** per ePrivacy guidance (re-ask after that). Writing the choice is a Server Action.

Component: **`StateMachineWalker`** with `kind="machine"` and a Mermaid `stateDiagram-v2` in the `diagram` slot. The course already ships a consent-flow demo for this exact component — model the states above plus transitions: `unset → prompted (banner shown) → {granted-all | analytics-only | denied}`, and a `withdrawn → unset` revocation edge that re-shows the banner. Each `Question` node names what `useConsent()` returns in that state and which SDKs are loaded; the synced topology diagram shows where the state sits. Pedagogical goal: make the student *walk* the flow one state at a time so the revocation cycle and the default-off start state become concrete.

`Term` candidate: *granular consent* (per-category choice, vs. all-or-nothing — regulators require the option to accept some and refuse others).

### One hook every tracker reads: useConsent()

Teach the single-source-of-truth principle made concrete as one React Context. This is the architectural spine of the lesson and connects directly to the conventions' "the `useConsent()` provider is the single source" rule.

- `ConsentProvider` mounts inside the existing root `<Providers>` Client Component (ch076) — reinforce "one provider per app," do not introduce a competing root.
- The provider reads the initial choice from the `consent_choice` cookie (passed down from a Server Component that read it via `await cookies()`, so there is no flash) and exposes `useConsent()` returning `{ analytics, marketing, open(), accept(level), reject() }`.
- **The rule:** every third party imports `useConsent()` and short-circuits when its category flag is false. There is no second place a tracker may check. Grep target: any analytics/marketing init that does *not* sit behind `useConsent()` is a finding.
- Writes go through a Server Action that sets the cookie (so server reads stay authoritative) and writes the audit record (next section).

Component: **`AnnotatedCode`** on a compact `ConsentProvider` + `useConsent()` sketch (~14–18 lines). Steps: (1) `'use client'` + the Context creation; (2) initial state hydrated from the server-read cookie prop (color the prop to show the no-flash handoff); (3) the returned API surface; (4) `accept`/`reject` calling the Server Action. Keep it read-to-understand — the student recognizes the shape, ch082's starter ships it complete (consistent with how L1 treats `proxy.ts`).

Use **`CodeTooltips`** sparingly on the snippet to surface the inferred type of `useConsent()`'s return so the student sees the `{ analytics: boolean; marketing: boolean; ... }` contract without a separate type block.

Reasoning: `AnnotatedCode` because one moderately complex block needs the student's attention directed to specific parts (the no-flash cookie handoff is the non-obvious bit). Not authored from scratch — this is a baseline-audit chapter, not a build chapter.

`Term` candidate: *React Context* (re-define in one line — app-wide value without prop-drilling, already seen earlier in the course).

### Nothing fires before the click: the two-belt rule

The load-bearing section. Teach that the pre-consent boundary is a **timing** problem and a single belt is not enough. Use PostHog *only* to demonstrate the gate's shape (explicitly note PostHog wiring is ch093's; these two SDK options appear here to show the rule, not to teach PostHog).

The two belts, both required:

1. **Belt one — the SDK is told to do nothing until consent.** Initialize with `opt_out_capturing_by_default: true`, `disable_session_recording: true`, and (current 2026 PostHog surface) `cookieless_mode: 'on_reject'`, which keeps PostHog from writing any cookie or local/session storage until consent is granted. Call `posthog.opt_in_capturing()` / enable recording only when the flag flips. This stops *capture and storage* — but the SDK module has still loaded and may have opened a connection.
2. **Belt two — gate the module load itself.** The consent provider **dynamically imports** the analytics module only after `analytics` flips on. Before consent, the SDK code never reaches the browser. This is the belt beginners skip — and it is why belt one alone is not enough: belt one configures behavior *of a module that is already loaded*.

Make vivid *why one belt is insufficient*: with only belt one, the network tab on first load already shows the SDK bundle and possibly an init request — pre-consent. Only gating the import keeps the network tab clean. (Mention `defaults: '<date>'` — PostHog's config-snapshot pin — in one line as a current best practice that locks SDK defaults to a known version; do not dwell on it.)

Component: **`DiagramSequence`** — the pre-consent timeline, scrubbed step by step. Steps: (1) page loads, `useConsent()` = `unset`, network tab clean (no analytics bundle); (2) banner shown; (3) user clicks "Accept all"; (4) Server Action writes cookie + audit row; (5) provider dynamically imports the analytics module and calls `opt_in_capturing()`; (6) first event fires — *now*, after the click. Pedagogical goal: collapse the abstract "timing" rule into a concrete six-frame story the student can replay, with the network state called out at each frame. This is the strongest possible vehicle for "nothing fires pre-consent" because the *order* is the entire lesson.

Component: **`MultipleChoice`** — a single sharp question testing the boundary, e.g. "A banner sets `opt_out_capturing_by_default: true` but loads the PostHog script in the root layout `<head>`. Is the app compliant before the user clicks?" Correct answer: no — the script loaded pre-consent; even opted-out, the module load itself is the violation; the fix is to gate the import. Distractors capture the common misconceptions (the opt-out flag is sufficient; only firing an event matters). Reasoning: this is the single most-tested, most-failed concept in the lesson; an MCQ at the exact point of teaching checks it immediately.

`Term` candidates: *dynamic import* (`import()` that code-splits a module so it only loads when called — one-line hover), *opt-out by default* (the SDK ships disabled and must be explicitly enabled).

### Reject must mean reject

Teach that "reject" is a functional requirement, not a cosmetic button, and that asymmetric banners are a compliance bug. Two threads:

- **The banner anatomy — three buttons, equal weight.** "Accept all," "Reject all," "Manage preferences." Reject must be as visible and as one-click as Accept (same prominence, size, color emphasis). "Manage preferences" opens a modal with the two category toggles (`analytics`, `marketing`), both default-off. A small non-modal sticky footer, never a full-page interstitial wall.
- **Reject must be functional.** After "Reject all": no PostHog request, no marketing pixel, no replay socket. The verification ritual: open incognito, click Reject, watch the network tab stay clean. This is the same two-belt model from the previous section viewed from the reject side.
- **The "reconsider" path.** A persistent footer / settings link reopens the preferences modal. Revocation flips the flag *and* must call `posthog.opt_out_capturing()` plus `posthog.reset()` to discard queued events — without `reset()`, buffered events keep flowing for ~30 seconds. Note this is the only place PostHog's revocation calls appear; ch093 owns the rest.

Component: an **annotated banner mock** — `Figure` wrapping a small hand-built HTML/CSS mock of the three-button banner, with callouts (either `ArrowDiagram` lines or color-matched highlights per the diagram index's "color match beats arrows" guidance for tight UI mocks). Callouts: equal-weight Accept/Reject (the compliance-critical one), "Manage preferences" opens the toggle modal, the sticky-footer placement. Pedagogical goal: make the dark-pattern rule *visible* — the student sees that a bigger/brighter Accept is the exact thing regulators fine. An HTML/CSS mock (not a screenshot) because it is a simple constructed UI and stays theme-aware.

Optionally show the asymmetric (bad) vs. symmetric (good) banner as a **`TabbedContent`** two-panel before/after if the writer wants the contrast explicit — the bad tab labeled as the dark pattern.

`Term` candidates: *dark pattern* (UI deliberately steering the user toward the choice the business prefers — here, nudging Accept), *CNIL / EDPB* (the French DPA and the European Data Protection Board — the regulators that have fined asymmetric Accept/Reject designs; one combined hover).

### The consent record: auditable evidence

Connect consent to the audit log the student already has (ch057 L5, ch081 L3). Under GDPR the controller must be able to *demonstrate* consent — so the choice is logged.

- Every consent decision writes an audit entry via `logAudit(tx, event)` with action `consent.recorded` (follow the `entity.verb-pasttense` naming convention established in L3 — single dot, hyphenated past-tense; **not** `consent.updated`). Payload carries the choice (`{ analytics, marketing }`), the policy version, and — derived by `logAudit` itself, not the caller — actor/session id, IP, UA, server timestamp.
- This satisfies L3's inclusion test: it is a user-attributable, trust-relevant state change, so it earns a row. Reinforce that the caller passes only `{ action, payload }`; `logAudit` derives actor/time/ip (the L3 contract — caller can't forge actor or timestamp).
- **Policy versioning.** The consent record stores the privacy-policy version in force. Bumping the version invalidates prior consent and re-shows the banner — name this as the mechanism, briefly.

Component: a short **`Code`** block of the `logAudit(tx, { action: 'consent.recorded', payload: {...} })` call inside the Server Action, reinforcing the transaction-scoped signature without re-teaching L3.

Scope guard: do **not** re-teach the audit table shape, RLS, or the redaction policy — those are L3. One sentence: the consent record holds the user's own choice, so there is no third-party PII to redact here.

`Term` candidate: *data controller* (the entity that decides why/how personal data is processed and carries the demonstrate-consent burden — one-line hover; named once).

### Cookie consent is not email consent

A short, dedicated section drawing a boundary students reliably conflate. Cookie/tracker consent (everything above) is a *separate* opt-in from marketing-email consent.

- The sign-up form's "send me product updates" checkbox is the marketing-email boundary. It is **default-unchecked** — a pre-checked box fails GDPR (consent must be an affirmative act). It flips a `marketingEmailConsent` column on `users` (default `false`), set only by that checkbox (or a later settings toggle).
- **Transactional email needs no consent:** password reset, invoice receipt, security alerts, invitation emails — these are the service the user asked for. Only *marketing* blasts gate on the flag.
- Make the parallel explicit: same principle as cookies (affirmative opt-in, default-off, the service-vs-marketing line), different mechanism (a DB column, not a cookie/SDK gate).

Component: **`TrueFalse`** round — 3–4 statements separating the two consents and the transactional carve-out, e.g. "A password-reset email requires marketing consent" (false), "The product-updates checkbox may be pre-checked if there's an unsubscribe link" (false), "An invoice receipt is transactional and needs no consent" (true). Reasoning: a quick true/false round is ideal for cementing a set of boundary rules with common misconceptions baked into the false items.

`Term` candidate: *transactional email* (email triggered by and necessary to a user action — receipts, resets — vs. marketing broadcasts).

### External resources

Optional `ExternalResource` cards: the EDPB guidelines on consent (the asymmetric-banner ruling), the ePrivacy Directive cookie-consent summary, and the PostHog opt-out / consent docs (so the curious student can see belt one in the SDK ahead of ch093). Keep to 2–3; these are supplementary, not required reading.

A short `VideoCallout` is *optional* and low priority — only if the resourcer finds a current (2025–2026), focused explainer on GDPR cookie consent for engineers. Do not force one; the diagrams carry the load.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- The root `<Providers>` Client Component and "one provider per app" (ch076) — the consent provider mounts inside it.
- Reading cookies with `await cookies()` in a Server Component and `React.use()` in a Client Component (ch037/056) — the no-flash handoff relies on it.
- The Server Action `Result` shape and `'use server'` boundary (ch057 L2) — the consent write is one.
- `logAudit(tx, event)`, the `entity.verb-pasttense` naming, and the inclusion test (ch057 L5, ch081 L3) — referenced, not re-derived.
- Better Auth's `__Host-` session cookie defaults (`HttpOnly; Secure; SameSite=Lax`) (Unit 8) — named as the canonical essential cookie; the audit only *verifies* these defaults, it does not configure Better Auth here.

**Out of scope — defer or name only:**
- **PostHog SDK at depth** — ch093 owns it. Use only `opt_out_capturing_by_default`, `cookieless_mode: 'on_reject'`, `disable_session_recording`, `defaults: '<date>'` (one-line mention), `opt_in_capturing()`, `opt_out_capturing()`, `reset()` to demonstrate the gate's *shape*. Do not teach `/ingest` proxy, `identify`, events, flags, or replay config — all ch093.
- **Retention and the right to be forgotten** — ch081 L4. Do not introduce deletion shapes, the retention catalog, or erasure here; the continuity notes explicitly require L4 and L5 stay cleanly separated. Consent revocation is *not* data deletion — if the distinction comes up, one sentence: revoking consent stops future processing; erasing data is L4's job.
- **Audit table schema, RLS, payload redaction** — ch081 L3 / ch057 L5. This lesson only *writes* one new event (`consent.recorded`) and verifies essential-cookie flags; it does not touch the table's enforcement model.
- **Security headers / CSP** — ch081 L1. The CSP `connect-src` already lists PostHog's origin (from L1); do not re-open the CSP here.
- **`@t3-oss/env-nextjs` and secrets** — ch081 L6/L7. PostHog's key is `NEXT_PUBLIC_*` (publishable, client-safe); name that it goes through the env schema like everything else, but env discipline is L6/L7.
- **Marketing-site analytics** (Plausible cookieless / GA4 Consent Mode v2) — name only as the exception: `example.com` (marketing) is separate from `app.example.com` (the app), and the *app-side* gate is the load-bearing one this lesson teaches. One paragraph maximum.
- **CCPA "Do Not Sell / Share"** — name only as a separate US-California footer link, distinct from the EU consent gate. One sentence.
- **CMP industry tools** (OneTrust, Cookiebot, Osano) — name as the build-vs-buy alternative for teams that outgrow the hand-rolled gate; do not teach. One sentence.
- **Privacy Policy / DPA legal copy** — not engineering scope; named once as "the legal text the consent gate enforces," no more.
- **`formatAuditEvent` / Activity-page rendering** of the consent event — ch084 (named as a debt in L3/L4 continuity notes); not built here.

## Notes for downstream agents

- **Deliberate simplification:** the `ConsentProvider`/`useConsent()` code is shown read-to-understand, not authored stepwise, matching how this audit-pass chapter treats already-shipped infrastructure (L1 does the same with `proxy.ts`). The complete implementation ships in ch082's starter.
- **Naming correction vs. chapter outline:** the chapter outline writes the audit event as `consent.updated`; emit `consent.recorded` to honor the `entity.verb-pasttense` convention L3 locked in. Flag this so it doesn't silently drift back.
- **Two-flag model vs. "four-state machine":** model consent as two independent boolean category flags (`analytics`, `marketing`); the "four states" are the meaningful combinations, presented through the `StateMachineWalker`. Do not introduce a single four-valued enum — it doesn't compose with granular per-category toggles.
- **PostHog mentions are capped** to the SDK options/calls listed in Scope (`opt_out_capturing_by_default`, `cookieless_mode: 'on_reject'`, `disable_session_recording`, `defaults`, `opt_in_capturing()`, `opt_out_capturing()`, `reset()`). Any deeper PostHog content belongs in ch093 and must be cut.
- **`ReactCoding` cannot load PostHog** (react-family npm only, per project memory) — do not propose a live-coding exercise that imports PostHog or any third-party tracker. The chosen interactions (`Buckets`, `StateMachineWalker`, `DiagramSequence`, `MultipleChoice`, `TrueFalse`) are all dependency-free and correct for this lesson.
