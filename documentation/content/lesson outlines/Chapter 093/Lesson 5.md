# Lesson 5 outline — Flags, rollouts, and experiments on one primitive

## Lesson title

- Title: `Flags, rollouts, and experiments on one primitive`
- Sidebar label: `Flags & experiments`

## Lesson framing

This is the chapter's largest lesson (50–60 min). It teaches PostHog **feature flags** as the substrate for three operational patterns — kill switches, percentage rollouts, and A/B experiments — and the server-side **bootstrap** that makes them shippable in the App Router without a flash-of-default-variant.

Conclusions from brainstorming that govern the whole lesson:

- **One primitive, three jobs is the spine.** The pedagogical win is not "how to call a flag hook" (that's two lines); it's that a senior reaches for *the same boolean/multivariate flag* whether they're shipping safely (kill switch), releasing gradually (rollout), or measuring (experiment). Teach the primitive once, then show the three framings as configuration + discipline differences, not three separate tools. The student should leave able to pick the right framing from the situation, not memorize three APIs.
- **Decouple deploy from release is the load-bearing mental model.** The deploy ships dead-but-flagged code; the *release* is a toggle in a dashboard, not a `git revert` + redeploy. This is the senior reframe that motivates the entire lesson — it's why flags exist. State it early and return to it for each pattern. Rollback becomes one click; this is the production stake.
- **The flash-of-default-variant is the one hard technical concept; everything else is discipline.** Client-only flag evaluation paints the default, fetches over the network, then re-renders to the assigned variant — a ~visible flicker that is a UX bug for rollouts and *poisons the data* for experiments (the user saw control, then variant; the first event fires under the wrong variant). This is where beginners ship a broken experiment without realizing it. The fix — server-side bootstrap so the client's first render already has the real value — gets the deepest treatment: a DiagramSequence contrasting the two timelines, then the wiring. Build the simplified picture first (client fetch, see the flicker), *then* add the bootstrap layer.
- **Identity continuity across the SSR boundary is the subtle correctness trap.** Server-side evaluation and client evaluation must agree on the `distinctId`, or the variant flips between SSR and hydration (a second flash, and a split-brain bucket). This pays off the `distinctId` work from lessons 3–4: the same cookie seeds both sides. Frame it as "one identity, evaluated twice, same answer."
- **Experiment discipline is where juniors lose money, not where they write bad code.** PostHog computes the statistics; the lesson does not teach the math (out of scope, per chapter outline). It teaches the *discipline that makes the math trustworthy*: pre-declare the primary metric and the hypothesis before launch, don't stop on the first green day (peeking inflates false positives). This reads as a senior habit, framed against the concrete cost: "ship the losing variant to 100% because you stopped early on noise."
- **Stale flags are tech debt with a deletion ritual.** Every flag is a fork in the code (`if (flag) {} else {}`); a flag that has reached 100% is dead `else`-branch code no one tests. The lesson closes the loop: flags have a lifespan, and deletion is the last step of the rollout, not an afterthought. The deploy-while-a-flag-is-still-read ordering trap gets named (remove the read, deploy, then delete the flag — never the reverse).
- **Connect to what the student already has.** They wired `posthog-js` + `posthog-node` (L3), the `distinctId` and `identify`/`group` handshake (L4), the typed `track()` helper and the `$feature/<flag>` super-property mechanism (L4, mechanism defined, flag-derived usage owed to *this* lesson). This lesson is the payoff: flags ride on that identity, and every event auto-tags the variant the user was on, which is exactly what makes the experiment join work. Lean on this; do not re-teach it.
- **Mental model the student should end with.** A flag is a server-evaluated decision, keyed on a stable identity, that the client receives pre-resolved; the *value* lives in PostHog (toggle without deploy), the *read* lives in code (one hook / one server call), and the *variant travels on every event for free*. Kill switch / rollout / experiment are three release strategies layered on that one decision.

Code-component strategy: the lesson is wiring-heavy but the pieces are small. Use plain `Code` for single-concept snippets (a flag hook call, the bootstrap option). Use `CodeVariants` for the two before/after contrasts that carry the lesson (client-only-flash vs bootstrapped; server-component fork vs middleware redirect). Use `AnnotatedCode` only for the one assembled bootstrap flow where attention must move across several lines (server evaluate → pass as `bootstrap` → client `init`). Use a `DiagramSequence` for the flash-of-default timeline and a `StateMachineWalker` (decision kind) for the kill-switch/rollout/experiment pick. One `ReactCoding` exercise on flag-driven conditional render (react-only, no PostHog import — model the hook), plus a `Buckets` classification on the three patterns and a `MultipleChoice` on the flash/identity trap. Keep the `@posthog/next` framing from L3 intact: it's a future convenience layer, not the current default — wire `posthog-node` manually.

## Lesson sections

### Introduction (no heading — lesson intro prose)

Open on the senior question from the chapter outline, concretely: a new onboarding flow is ready; the team wants it live for 10% of new orgs, then 50%, then 100%, with one-click rollback if conversion drops — and then to *prove* the new flow beat the old one. Name the reframe up front: **the deploy is not the release.** Shipping code and turning it on become two separate acts. Preview the three patterns (kill switch, rollout, experiment) as one primitive wearing three hats, and the one hard part (no flash of the wrong variant). Tie back to what they built: flags hang off the same `distinctId` from L4, and every event already carries the variant. Keep it to a few sentences, warm and terse. No "what is a feature flag" bootcamp framing — assume the concept, lead with the senior decision.

### A flag is a decision you can change without a deploy

The conceptual core. Define a feature flag as a named decision, evaluated per user against targeting rules that live in PostHog, returning a value to the code. The leverage: the value changes from a dashboard, the code path is already deployed. Reinforce decouple-deploy-from-release here with the rollback contrast — `git revert` + redeploy + wait for CI vs. one toggle that propagates in seconds.

Cover the three flag *value shapes* (chapter outline: boolean / multivariate / JSON payload):

- **Boolean** — on/off per user. The default; kill switches and rollouts.
- **Multivariate** — named string variants (`control`, `variant_a`, `variant_b`). The substrate for A/B tests.
- **JSON payload** — the flag returns a structured config object (`{ price_cents: 2900, currency: 'EUR' }`) shipped per cohort; reach for it when the flag governs config, not just a branch.

Teach reach order: booleans first, multivariate when there's an experiment, payload when config varies by cohort. Use a small `Code` block per shape showing the *read* (the hook call returning each type — `useFeatureFlagEnabled` → boolean, `useFeatureFlagVariantKey` → variant string, `useFeatureFlagPayload` → object; full hook treatment and import source come in the read-surface section), not the targeting. Keep targeting for the next section so value-vs-rule stays separate.

Reasoning: the student must internalize that the code only ever *reads a value* — it never encodes the targeting rule. This is the boundary that makes flags safe to change. Establishing the three shapes now lets every later pattern reference them without re-teaching.

Tooltip candidates: **feature flag** (named, remotely-controlled decision), **multivariate** (more than two named variants), **cohort** (PostHog set of users matching a property predicate — defined fully in the next section).

### Targeting: who sees what, decided in PostHog not in code

Cover release conditions (chapter outline): per-user, per-property (`plan = 'pro'`), per-group (`organization.seats > 10`, using the group analytics from L4), per-percentage (deterministic 10% rollout), per-cohort. Combine with AND/OR. Emphasize the deterministic-hash property of percentage rollouts: the same user lands in the same bucket every visit because PostHog hashes the `distinctId` — *do not roll your own percentage logic* (a `Math.random()` gate re-buckets the user on every visit, ruining both rollouts and experiments). This is a named watch-out from the chapter outline placed in the section that teaches the concept it qualifies.

Use a `Screenshot` of the PostHog flag targeting UI (release conditions panel) wrapped in `<Figure>` so the student sees the rule lives in the dashboard, then a one-line `Code` showing the code-side read is identical regardless of targeting. The contrast image-vs-code is the teaching point: rules move, the read doesn't.

Watch-out placed here: target on bounded properties (`plan`, `seats`, `created_at`), never on PII like `email` matching — keep targeting predicates on low-cardinality, non-sensitive facts.

Reasoning: this section cements the value/rule split introduced above and is where the deterministic-bucketing correctness point belongs, because that's the property of percentage targeting.

### The flash of the default variant

The one hard technical concept; give it the most space and the strongest visual. Build the simplified model first, then reveal the bug.

Walk the naive client-only path: page paints with the SDK not yet loaded → flag read returns the default (or `undefined`) → SDK initializes and fires a network request to PostHog → response arrives → component re-renders to the assigned variant. The user sees the default for ~one paint, then a flicker to the real variant.

Then split the consequence by pattern:
- For a **rollout**, the flash is a visible UX bug (content jumps).
- For an **experiment**, it's worse: it *poisons the data*. The user was exposed to control, then variant; the first events can fire under the wrong bucket. The experiment's day-one data is unreliable. This is the failure juniors ship without noticing.

Visualize with a **`DiagramSequence`** (the centerpiece diagram). Two parallel timelines, scrubbed step by step:
1. Client-only — initial paint (default variant shown, marked wrong/red).
2. Client-only — SDK loads, network request in flight (still default).
3. Client-only — response arrives, re-render to assigned variant (flicker marked).
4. Bootstrapped — initial paint already shows the assigned variant (marked correct/green), no network request on the critical path.

Pedagogical goal: make the flicker *temporal and visible* — a static diagram can't show "default then variant"; the scrub makes the wrong-then-right sequence land. End the sequence on the fixed timeline so the student sees the bootstrap collapses steps 1–3 into one correct paint.

Reasoning: cognitive load is minimized by teaching the broken simple version first (one network round trip, easy to picture), then naming the fix as "move the evaluation before the first paint." The fix gets its own section.

Tooltip candidate: **hydration** (re-explain briefly — React attaching to server-rendered HTML on the client; the moment the variant could flip if SSR and client disagree).

### Server-side bootstrap kills the flash

The fix, in depth. The reach: evaluate flags on the server with `posthog-node`, pass the evaluated values to the client as `bootstrap` data on `posthog.init`, so the client SDK's *first* render already has the real values and `useFeatureFlagVariantKey('new_onboarding')` returns the assigned value with no network round-trip and no flicker.

Sub-points to teach:

- **Where evaluation happens.** In the App Router root layout (or a `Providers`/server boundary), call `posthog-node`'s `evaluateFlags(distinctId)` once for the request to get a flags snapshot, then thread the resolved `{ key: value }` map into the client provider so `posthog.init({ bootstrap: { distinctID, isIdentifiedID, featureFlags } })` receives it. **Exact `bootstrap` shape (fact-checked):** keys are `distinctID` (capital ID), `isIdentifiedID` (boolean — true once the user is identified), `sessionID`, and `featureFlags` (the `{ 'flag-key': true | 'variant' }` map). There is **no** `featureFlagPayloads` key in `bootstrap` — payloads are not bootstrapped this way. Show the assembled flow with **`AnnotatedCode`** (steps: get `distinctId` server-side → `evaluateFlags()` with `posthog-node` → pass the flag map as props to the `'use client'` PostHog provider → `init` with `bootstrap`). This is the one place attention must move across several lines, justifying the stepped component.

- **`bootstrapFlags` opts the route into dynamic rendering (fact-checked watch-out).** Server-evaluating flags per request means the route can't be statically generated / ISR'd — it goes dynamic. This is the correct tradeoff for authenticated, per-user UI (already dynamic), but name it so the student doesn't bootstrap flags on a static marketing page and silently lose static optimization. Place this as an `Aside` (caution) in this section.

- **`@posthog/next` framing.** Per L3 continuity, `@posthog/next`'s `bootstrapFlags` is the convenience layer that will fold this in once stable; the lesson wires it manually with `posthog-node` (the current default) and names the wrapper as the future shortcut. Do not present the wrapper as shipped. (See Scope.)

- **Identity continuity across SSR.** The server evaluation and the client SDK must use the *same* `distinctId`, or the variant flips between SSR and hydration (a second flash + split bucket). The shared `distinctId` cookie seeded at the request boundary (the cookie from L3/L4) is read by both the server evaluation and the client SDK. For authenticated routes, the known user id supersedes the anonymous cookie id after `identify()`, with prior anonymous events stitched (L4). Frame it as "one identity, evaluated twice, identical answer." A small **`ArrowDiagram`** inside `<Figure>` showing the one `distinctId` cookie feeding both the server-side `posthog-node` evaluation and the client `posthog-js` SDK — the pedagogical goal is to show a single source of identity fanning out to two evaluators that must agree.

- **Why server evaluation doesn't tank latency: local evaluation.** `posthog-node` can fetch the full flag config once (the targeting rules) and evaluate locally, refreshing rules on an interval — so a flag read on the server is an in-memory computation, not a per-request network call to PostHog. Name this so the student doesn't fear "evaluate on every render = a network hop per page." **Fact-checked specifics:** local evaluation needs a key passed as `personalApiKey` at client init — PostHog now recommends a *feature-flags secure API key* for this (the `POSTHOG_PERSONAL_API_KEY` from L3 still works); the refresh cadence is `featureFlagsPollingInterval`, default `30000` (30s). One `Code` snippet showing the `posthog-node` client configured with `personalApiKey` + the polling interval, tying back to the L3 server env. Note for downstream agents: if the project later swaps to a dedicated feature-flags secure key, the env name changes but the wiring shape doesn't.

Watch-outs placed here: forgetting bootstrap and shipping the flash for an experiment (poisoned day-one data); bootstrap `distinctId` not matching the client's (variant flips on hydration); reading a flag in a server component without local evaluation (a network call per render).

Reasoning: this is the section that converts the named bug into a working pattern. Build order — value first (the `bootstrap` option), then identity (the shared cookie), then performance (local evaluation) — adds one layer of complexity at a time.

### Reading flags: hooks on the client, one call on the server

The read surface, now that bootstrap guarantees correct values. **Fact-checked package note:** the React hooks now live in the dedicated **`@posthog/react`** package (no longer imported from `posthog-js/react`). This is a wrinkle vs L3/L4, which wired raw `posthog-js` from the provider — flag *reads* use `@posthog/react` hooks while the provider/identify/track plumbing stays as L3/L4 built it. The writer should add `@posthog/react` to the install and reconcile in one sentence ("the hooks ship in a small companion package; the client instance is still the one the provider holds"). Two reaches:

- **Client** — `useFeatureFlagEnabled('new_onboarding')` for booleans; `useFeatureFlagVariantKey('paywall_copy_test')` for multivariate (returns the variant string); `useFeatureFlagPayload(key)` for JSON-payload flags. With bootstrap, these return the real value on first render — never `undefined` mid-flicker. The hooks re-render when PostHog updates the flag remotely, so a rollout percentage bump propagates to live clients without a redeploy.
- **The `useFeatureFlagPayload` exposure-event footgun (fact-checked, important).** `useFeatureFlagPayload` does **not** fire the `$feature_flag_called` exposure event on its own — and that exposure event is what experiments count to know a user saw the flag. Reading *only* the payload means the experiment can't attribute the user. Rule: always pair `useFeatureFlagPayload` with `useFeatureFlagEnabled` or `useFeatureFlagVariantKey` so the exposure fires. Teach this explicitly (an `Aside` caution) — it's a silent experiment-breaker, and it connects directly to the experiment-discipline section.
- **Server** — `posthog-node`'s `evaluateFlags(distinctId)` returns a snapshot; read individual flags off it (`.getFlag('new_onboarding')` / `.isEnabled('new_onboarding')`). Use in a server component for a UI fork rendered server-side, or in `proxy.ts` when the flag controls a redirect or layout swap (read the flag, set a response signal, the layout reads it). The older one-shot `getFeatureFlag(key, distinctId)` / `isFeatureEnabled(key, distinctId)` calls still exist but the snapshot-from-`evaluateFlags` shape is the current recommended surface — use it, and confirm against current `posthog-node` docs at write time.

Use **`CodeVariants`** for the two read sites (client hook vs server `evaluateFlags` snapshot) so the student sees they return the same decision at different boundaries. Note the React Compiler is on — no manual memoization in the component reading the hook (code-conventions §Hooks).

**`$feature/<flag>` auto-tagging** (paying off the L4 debt): once a flag is evaluated, PostHog auto-attaches `$feature/new_onboarding: 'variant_a'` to every subsequent event the user fires. This is the mechanism that makes experiments and funnels work — the event store records which variant the user was on. Don't fight it; rely on it for cohorting. One short `Code`/prose showing an event captured after evaluation carrying the `$feature/...` property. This is the explicit bridge from L4's super-property mechanism to flag-derived usage.

**Exercise — `ReactCoding` (target-match or tests mode).** The student writes a component that reads a flag value (a mocked `useFlag()` hook provided in the harness — *not* a real PostHog import, since ReactCoding can't load third-party npm) and forks the render: `control` shows the old onboarding card, `variant_a` shows the new one. Goal: practice the value-driven conditional render and the multivariate switch. Grading: correct branch rendered for each variant value; default/loading branch handled. Keep it react-only per the ReactCoding constraint.

Reasoning: separating the read surface from bootstrap keeps each idea single-purpose. The exercise reinforces that flags are just values driving normal React conditionals — demystifying the "flag" mystique.

### Three jobs, one flag: kill switch, rollout, experiment

The synthesis section — the lesson's spine made explicit. Present the three patterns as configurations + lifespans on the same primitive (chapter outline's decision frame):

- **Kill switch** — boolean, default off; gate every newly shipped non-trivial feature behind it for the first week; flip off instantly if something breaks (no deploy, no rollback). Lifespan: weeks; delete after the feature stabilizes. The structural reach for incident response on a feature release.
- **Rollout** — boolean, percentage ramp (10% → 50% → 100%) on deterministic `distinctId` hash. Lifespan: weeks; delete at 100%.
- **Experiment** — multivariate, 50/50 split, *with a metric attached*. Lifespan: 2–4 weeks; convert the winner to a rollout (or delete the losing branch) after significance.

Use a **`StateMachineWalker`** (`kind="decision"`) so the student walks the *pick* in the order a senior asks: "Are you measuring a metric?" → experiment; else "Releasing to everyone at once or ramping?" → kill switch vs rollout; each leaf names the flag type, targeting, lifespan, and exit (delete / convert). Pedagogical goal: the decision lives in the order of questions, not in any one leaf — this is the senior-mindset framing the component is built for.

**Exercise — `Buckets`.** Sort scenario cards ("ship risky payments rewrite behind an instant off-switch", "test two paywall headlines for conversion", "release new dashboard to 20% of orgs first", "ship a config that differs by plan tier") into the three patterns. Reinforces pattern selection from a real situation. Two-column or three-bucket layout.

Reasoning: this is where "one primitive, three jobs" stops being an assertion and becomes a tool the student can apply. Placing it after the read surface means they already know how to *do* a flag; now they decide *which framing*.

### Experiments: declare the metric before you peek

Depth on the experiment pattern — the discipline, not the math (PostHog computes; out of scope per chapter outline). An experiment is a multivariate flag with a metric attached: a **primary metric** (e.g. `plan_upgraded` fires within 14 days of `paywall_viewed` — using the L4 events), optional **secondary metrics**, and a statistical readout in the PostHog UI. The *code* is identical to any multivariate flag read (`useFeatureFlagVariantKey('paywall_copy_test')`); the experiment scaffolding lives in the dashboard.

The discipline that makes the readout trustworthy:
- **Pre-declare the primary metric, the hypothesis, and the sample-size/significance target *before* launch.** Document the hypothesis in the experiment description. A metric chosen after seeing the data is unfalsifiable.
- **Don't stop on the first green day.** Peeking at the readout and stopping the moment it flickers significant inflates the false-positive rate — the classic noise-as-signal failure. Wait for the pre-declared sample size / duration.
- **The primary metric must be a PostHog event** (one of the L4 dictionary events). An external metric breaks the join — PostHog can't attribute it to the `$feature/<flag>` variant.

Frame against the concrete cost: stopping early on noise ships the losing variant to 100% and you "prove" a change that did nothing — worse than no experiment. Use an `Aside` (caution) for the peeking trap, or fold it into prose; the metric-before-launch rule is prose in the section, not a tip dump.

**Exercise — `MultipleChoice`** (multi-select): "Why did this experiment's result not replicate / fail to attribute users?" with options surfacing the failure modes (stopped early on first green day; primary metric declared after seeing data; flash-of-default poisoned day-one buckets; external non-PostHog metric; **read only `useFeatureFlagPayload` so no `$feature_flag_called` exposure fired**). Checks the student can diagnose a broken experiment, and reinforces the payload-exposure footgun from the read-surface section.

Watch-outs here: experiment without a pre-declared primary metric (unfalsifiable); stopping early (false positives); non-PostHog event as the metric (join breaks); flash-of-default poisoning the first day (links back to the bootstrap section); payload-only read with no exposure event (links back to the read-surface section).

Reasoning: experiments are where the money is lost through bad *process*, not bad code. This section is pure senior-discipline content; the chapter outline is explicit that the math is out of scope and the discipline is the payload.

### Flags have a lifespan: the stale-flag deletion ritual

Close the loop on tech debt. Every flag is a fork (`if (flag) {} else {}`); a flag at 100% leaves the `else` branch as dead, untested code that rots. Flags are not permanent — deletion is the last step of a rollout, not optional housekeeping.

The deletion ritual (chapter outline):
- PostHog surfaces stale flags via "last evaluated" / feature-flag activity — find flags whose branches have collapsed (everyone on one variant).
- Grep the flag name across the codebase, remove the `if (flag)` fork (keep the winning branch), open the PR.
- **Ordering trap (named watch-out):** never delete the flag in PostHog while a deploy still reads it. Remove the *read* from code → deploy → *then* delete the flag. Reverse order means the live code reads a flag that no longer exists.
- A quarterly stale-flag audit pass keeps both the code and the analytics clean.

Use `Steps` for the deletion sequence (remove read → deploy → delete flag → confirm no references), since it's an ordered procedure where the order is load-bearing.

Reasoning: juniors treat flags as write-once and accumulate dead forks. Naming the lifespan + the safe deletion order turns "add a flag" into a complete loop with an exit. The ordering trap is a real production footgun and belongs exactly here.

### External resources (optional)

One or two `ExternalResource` cards: PostHog feature flags docs and PostHog experiments docs (current URLs). Optionally a `VideoCallout` only if a current, high-quality PostHog flags/experiments walkthrough is found during fact-check — do not invent one.

## Scope

Already taught — redefine in one line at most, do not re-teach:
- `posthog-js` + `posthog-node` wiring, the `PostHogProvider` consent-gated dynamic import, `/ingest` proxy, `opt_out_capturing_by_default`, the three-package install, env vars (`NEXT_PUBLIC_POSTHOG_KEY/HOST`, `POSTHOG_PERSONAL_API_KEY`) — **L3**. This lesson uses the provider and the personal key; do not re-wire them.
- The consent gate (`useConsent()`, four-state machine, the dynamic-import belt) — **ch081 L5 / L3**. Flags ride inside the already-consented PostHog client; do not re-explain the gate. One sentence: flag reads only return real values once the consented client is live; pre-consent, the code uses the default branch.
- `distinctId` (anonymous→known), `posthog.identify()` / `reset()`, `posthog.group()` for org analytics — **L4**. This lesson *uses* the `distinctId` for evaluation and references identify-stitching for the SSR-supersedes-anonymous case; do not re-teach the handshake.
- The typed `track()` helper, event dictionary, Object-Action snake_case naming, the four property homes, the super-property mechanism via `posthog.register` — **L4**. This lesson pays off only the `$feature/<flag>` auto-tag usage (mechanism was defined in L4) and uses L4 events as experiment metrics.

Out of scope — defer, do not cover:
- **Session replay**, masking catalog, `disable_session_recording` — **L6**.
- **Statistical experiment math at depth** (p-values, Bayesian vs frequentist, power calculations) — out of scope; PostHog computes it. Teach only the discipline (pre-declared metric, no early peeking).
- **`@posthog/next` `bootstrapFlags` as the shipped default** — still beta per L2/L3 continuity. Name it as the future convenience layer; wire `posthog-node` manually. Do not present the wrapper as the current path.
- **LaunchDarkly migration** — out of scope.
- **Backend-only flag systems (Unleash, OpenFeature)** — name once at most, out of scope.
- **Vercel Web Analytics / Speed Insights / Core Web Vitals** — **L1 / ch094**.
- **The audit log** (distinct from product analytics) — ch081 L3.
- Storing the PostHog `distinctId` as a DB column / migration — named in L4 as recommended for the webhook join but not authored; this lesson may *assume* a stored/cookie `distinctId` is available for server evaluation, but should not author the migration (project chapter territory).

## Code conventions notes

- React Compiler is on: no `useMemo`/`useCallback`/`React.memo` in the flag-reading components (§Hooks and the React Compiler). The flag hooks are read at component top level, hooks-rules apply.
- `useEffect` is for external-system sync only — flag reads via hooks are not effects; do not wrap a hook read in an effect.
- `posthog-node` server adapter lives at `lib/posthog.ts`, `import 'server-only'`, constructed once at module scope (per L3 continuity) — reference that adapter for server-side flag evaluation, don't construct a second client.
- Server-side flag reads in a server component / `proxy.ts` follow the route-handler/server boundary conventions; `proxy.ts` is the renamed `middleware.ts` (§File and folder layout).
- Flag keys are snake_case strings matching PostHog (consistent with the L4 event-name convention); surrounding TS identifiers (`useFeatureFlagVariantKey`, the component names) stay camelCase/PascalCase.
- Money in any JSON-payload example is `amount_cents`/`price_cents: number`, integer cents, never formatted strings (§ L4 course convention).
- Default exports only where the framework dictates (`layout.tsx`, `proxy.ts`); the provider and helper components are named exports.
- Deliberate divergence to note for downstream agents: keep PostHog's past-tense Object-Action event names (`plan_upgraded`) when referencing L4 events as experiment metrics — the course intentionally diverges from PostHog's present-tense docs (L4 continuity); do not "correct" toward PostHog's convention.

## Fact-check results (verified June 2026 — already folded into the sections above)

Confirmed and corrected against current PostHog docs:

- **Hooks ship in `@posthog/react`** (a dedicated package), not `posthog-js/react`. Four hooks: `useFeatureFlagEnabled`, `useFeatureFlagVariantKey`, `useFeatureFlagPayload`, `useActiveFeatureFlags`. Writer must add `@posthog/react` to the install and reconcile with L3/L4's raw-`posthog-js` provider (folded into the read-surface section).
- **`useFeatureFlagPayload` does NOT fire `$feature_flag_called`** — must be paired with `useFeatureFlagEnabled`/`useFeatureFlagVariantKey` for experiment exposure. This is now a load-bearing watch-out in the read-surface and experiment sections.
- **`bootstrap` shape:** `{ distinctID, isIdentifiedID, sessionID, featureFlags }` — `distinctID` has a capital ID; `featureFlags` is `{ 'key': true | 'variant' }`. There is **no** `featureFlagPayloads` key in `bootstrap` (corrected from the initial draft). Folded into the bootstrap section.
- **`posthog-node` server flags:** current surface is `evaluateFlags(distinctId)` → snapshot, then `.getFlag()` / `.isEnabled()`. Legacy `getFeatureFlag` / `isFeatureEnabled` still exist; the snapshot shape is the recommended path. Folded into the read-surface section.
- **Local evaluation:** `personalApiKey` init option (PostHog now recommends a *feature-flags secure API key*; personal key still works), `featureFlagsPollingInterval` default `30000` ms. Folded into the bootstrap section.
- **`@posthog/next` is still pre-release** as of mid-2026 — confirms L2/L3 framing; keep it as the future convenience layer, wire `posthog-node` manually. Also confirmed: enabling `bootstrapFlags` **opts the route into dynamic rendering** (incompatible with static/ISR) — added as a watch-out.
- **Experiments** UI supports primary + secondary metrics with a statistical readout; the pre-declared-metric / run-to-duration discipline matches current guidance. The `$feature/<flag>` event property is unchanged. Deterministic percentage bucketing via `distinctId` hash is unchanged.

Writer should still re-confirm exact method names against `posthog-node` and `@posthog/react` docs at write time, since the flag API was actively moving through 2026.
