# Events, properties, and the identify handshake

- **Title:** Events, properties, and the identify handshake
- **Sidebar label:** Events and identify

## Lesson framing

**Archetype.** Pattern-and-decision. The SDK is already wired and consent-gated (lesson 3); this lesson installs the two contracts that decide whether the analytics is *usable* six months later: a typed event taxonomy and the identity model. No new install, no SDK config — this is about the discipline that surrounds `posthog.capture()`.

**Senior question driving the lesson** (stated implicitly in the intro, not as a heading): *what events does the team fire, what travels on them, when does an anonymous visitor become a known user/org, and how do we avoid the dead-schema state where nobody remembers what `clicked_thing` meant or which property carried the plan?* Frame the whole lesson as the answer to the cost of getting this wrong — a rotted event schema and broken funnels are expensive precisely because they're discovered late, when a PM asks a question the data can't answer.

**The three load-bearing pillars** (everything else is supporting detail; keep the lesson centered here):
1. **The typed `track()` helper backed by an event dictionary** — one file is the source of truth; a typo or a missing required property fails the build, not the funnel.
2. **The identify handshake** (`identify` on sign-in, `reset` on sign-out) — the anonymous→known stitch, why it's once-per-session, and why a missing `reset()` conflates two users.
3. **The property split** — person vs. event vs. super-properties (plus group properties for orgs). The decision rule is the whole point; the API calls are secondary.

**Mental model the student leaves with.** PostHog stores a stream of *events*, each hung off a *distinct ID*. The distinct ID starts anonymous and gets *aliased* to a stable user ID at sign-in, which retroactively stitches the prior anonymous events to the now-known person. Properties answer three different questions and therefore live in three different places: "what was true of this one event" (event property), "what is true of this person right now" (person property), "what is true of every event this session without me re-passing it" (super-property). Orgs are a fourth axis (groups) because B2B metrics roll up to the account, not the seat.

**What the student can do by the end.** Name an event correctly under the Object-Action convention; add a new event to the dictionary and fire it through the typed helper; decide for any given property whether it's an event/person/super/group property; wire the identify and reset calls into the existing sign-in/sign-out flows; and fire a server-side event (Stripe webhook) under the *right* distinct ID so the funnel doesn't fork.

**Cognitive-load sequencing.** Build complexity in this order so each layer rests on the last: (1) naming convention — cheap, concrete, gives a vocabulary; (2) the dictionary + typed helper — the structural guardrail, introduced before any real `capture` call so the student never sees a raw string-named event as "normal"; (3) properties split — now that events exist, decide what rides them; (4) identity — now that events have properties, decide *whose* events they are; (5) groups — the B2B extension of identity; (6) server-side capture — the cross-boundary identity join, last because it depends on every prior piece; (7) autocapture decision; (8) the worked three-event funnel that ties it all together.

**Continuity constraints (lessons 1–3, hard — do not contradict).**
- The client SDK is reached **through the `PostHogProvider` context** from lesson 3, not a bare `posthog-js` global import in feature code. The typed `track()` helper and the identify/reset calls must use a client obtained from that provider (a `usePostHog()`-style hook the provider exposes, or the provider's exposed instance). Do **not** re-introduce `import posthog from 'posthog-js'` scattered in components — that is exactly the anti-pattern the dictionary discipline forbids, and it would also bypass the consent gate.
- The server adapter lives at `lib/posthog.ts`, starts with `import 'server-only'`, is constructed once at module scope with `flushAt: 1, flushInterval: 0`, and is flushed with `after(() => posthog.shutdown())`; serverless capture uses **`captureImmediate()`**, not `capture()`. All server-side event examples in this lesson must use that adapter and that method name.
- Consent is the gate: `identify()` and any `capture()` are personal-data writes and only fire on `analytics === true`. Because feature code goes through the provider/helper (which only exist in the consented branch) and through `captureImmediate` on the server (moral gate), the lesson should state this once and not re-teach the gate mechanics (lesson 3 owns them).
- `@posthog/next` is **not** the default in this chapter — the manual `posthog-js` + `posthog-node` wire is. Don't reach for `@posthog/next` helpers (e.g. an `identify` wrapper) as if they're installed.
- `distinctId` was deliberately glossed in lesson 3 ("PostHog's per-user identifier, a parameter the call needs"). **This lesson owns its full treatment** — pay off that debt explicitly.

**Tone.** Adult, terse, decision-first. No "what is an event." The student has shipped the SDK; treat them as the engineer now deciding the schema.

---

## Lesson sections

### Introduction (no heading)

Open on the senior question. The SDK fires events now, but an SDK that *can* fire events is not analytics — analytics is a schema someone can still read in six months. Sketch the failure concretely: a PM asks "did the new pricing page lift trial-to-paid?" and the answer is buried under three differently-named signup events, a `plan` property that's sometimes `"pro"` and sometimes `"Pro"`, and a funnel that counts the same user twice because sign-out never reset the identity. Name the two contracts that prevent this — the event taxonomy and the identity model — and preview the worked trial-to-paid funnel the lesson ends on. Keep it to ~2 short paragraphs.

### Naming events: Object-Action, snake_case, past tense

The vocabulary layer. Teach the convention as a single rule with a reason attached to each part:
- **Object-Action** (`invoice_created`, not `created_invoice`) — objects group in the event browser, so all `invoice_*` events sort together. This is the dominant ordering decision.
- **snake_case** — low-friction across SQL/HogQL queries and dashboard filters; no quoting, no case mismatches.
- **Past tense** — events record what *happened*; an event is a fact about the past, never a command.
- **lower-case** throughout.

Present the canonical good set: `invoice_created`, `plan_upgraded`, `checkout_completed`, `paywall_viewed`, `user_signed_up`. Then the reject patterns and *why each rots*: `clickedButton` (title/camel + ambiguous — which button? rots into a single useless bucket), `invoice` (noun alone — no verb, can't tell create from delete from view), `Invoice Created` (spaces + title case — fragile in queries), `plan` (no action at all).

**Tense — flag the PostHog-docs split honestly.** Verified June 2026: PostHog's own naming docs recommend *present-tense* verbs (`create`, `submit`) and a `category:object_action` form (`signup_flow:pricing_page_view`). The course deliberately teaches **past tense Object-Action** (`plan_upgraded`, `checkout_completed`) — it's the broader industry convention (Segment's spec and most product teams use past tense, since an event is a record of something that *already happened*), and it reads consistently with the immutable-historical-fact framing the property section leans on. State this divergence in one or two sentences so the student isn't blindsided when they open PostHog's docs and see present tense — present the choice as a defensible team convention (the key discipline is *consistency*, not which tense), not as PostHog being wrong. Do **not** silently contradict the platform; name it. Skip the optional `category:` prefix — it adds a third segment most small-SaaS taxonomies don't need; two segments (object_action) is the course default.

**Component:** a `Buckets` exercise is the natural fit here — classify a pool of candidate event names into **Follows the convention** vs. **Breaks it**. Drag chips like `plan_upgraded`, `Button Clicked`, `checkout_completed`, `deleteUser`, `paywall_viewed`, `invoice`. Cheap, kinesthetic, locks in the pattern before the student writes one. Pedagogical goal: make "is this name well-formed?" an instant reflex. Use `instructions` to frame it ("Sort each candidate event name…").

Note: PostHog's own autocaptured/system events use a `$`-prefix (`$pageview`, `$identify`, `$feature_flag_called`) — name this in one line so the student doesn't think `$pageview` (seen in lesson 3) violates the convention; the `$` namespace is PostHog's, custom events are the team's, and they never collide.

### The event dictionary as the source of truth

The structural guardrail — introduce this *before* the typed helper so the helper has a contract to stand on.

Teach: one file, `lib/analytics/events.ts`, exports the catalog of every event name the app fires and the property shape each one carries. It's reviewed in PR like any contract; renames, removals, and additions show up in `git log`, so the six-months-later "what does this event mean?" has a documented answer in the codebase, not just in someone's memory. Pair it (one line) with PostHog's **Data management / event definitions** surface, which is the *runtime* view of which events have actually been seen and lets a team add descriptions — but the repo file is the source of truth for what code is *allowed* to fire.

Show the dictionary shape. The cleanest 2026 TS form is an `as const` object mapping each event name to its properties type (or a per-event `type`), plus a derived `EventName` union and a property-lookup type. This must align with code conventions: `type` over `interface`, `as const` for the literal map, no `enum`. Sketch:

```ts
// lib/analytics/events.ts — the catalog (shape, not final code)
export type AnalyticsEvents = {
  user_signed_up: { method: 'password' | 'google'; org_id: string };
  paywall_viewed: { feature: string; plan_required: 'pro' | 'team' };
  plan_upgraded: { from_plan: string; to_plan: string; amount_cents: number };
  invoice_created: { invoice_id: string; amount_cents: number };
};
export type EventName = keyof AnalyticsEvents;
```

**Component:** `AnnotatedCode` for this block — walk it in 3–4 steps (the per-event property map / the `keyof` derivation of the union / why `amount_cents` is `number` not a formatted string / why no PII keys appear). Direct attention part-by-part; this is the one block where the *type machinery* is the lesson. Use `color="blue"` as the default tint.

Decision note to surface: keep it **one file** deliberately — a barrel-y split across many files hides the diff and defeats the "git log is the changelog" benefit. (Consistent with the no-barrel rule in code conventions.)

### A typed `track()` helper, no raw `capture` in feature code

The payoff of the dictionary. Teach the rule first, then the shape:

**Rule:** feature code never calls `posthog.capture('some_string', {...})` directly. It calls `track(name, properties)` where `name` is constrained to `EventName` and `properties` is statically the shape the dictionary declares for that name. A typo (`'paywall_view'`) or a missing required property (`paywall_viewed` with no `feature`) is a **build error**, not a silent bad row in production.

Show the helper signature and how it threads the generic so the second arg narrows to the first:

```ts
// shape, not final code
export const track = <K extends EventName>(
  event: K,
  properties: AnalyticsEvents[K],
) => { /* obtain consented client from PostHogProvider context, then capture */ };
```

Critical continuity point — **where the client comes from.** The helper (or its call sites) must get the PostHog instance from the lesson-3 `PostHogProvider` context, not a module-level `posthog-js` import. Two viable shapes; pick one and state the trade-off in one line:
- A `useTrack()` hook that reads the provider's client and returns a typed `track` bound to it (clean for components/handlers, hook-rules apply).
- The provider exposing its client via a `usePostHog()` accessor and a thin typed wrapper at the call site.
The lesson should commit to the hook shape (`useTrack()`) as the default for client feature code, because it keeps the consent-gated client as the only source and reads naturally in event handlers. Note explicitly: this is a deliberate divergence from "a plain exported `track` function" for the sake of the single-client-source guarantee — flag it so downstream agents don't "simplify" it into a global import.

**The enforcement teeth.** A lint rule (Biome/ESLint `noRestrictedImports`-style, or a `no-restricted-syntax` on `posthog.capture`) forbids importing `posthog-js` outside the provider/helper files, so the typed surface can't be bypassed. Mention it as the structural backstop — the type only helps if the raw door is locked. One sentence; don't write the full lint config (out of scope).

**Component:** `TypeCoding` exercise — the highest-value interactive moment in the lesson. Give the student the `AnalyticsEvents` map + the generic `track` signature as `starter`, and a few call sites: one correct, one with a typo'd event name, one missing a required property. Use the `// @ts-expect-error` idiom (per the TypeCoding doc) on the should-fail lines so the goal stays "make all errors go away" with normal polarity. Pedagogical goal: the student *feels* the build catching the mistake, which is the entire argument for the typed helper. Keep runtime out of it (TypeCoding never executes) — this is purely "does the type system reject the bad call."

**Watch-out (inline, in this section):** firing `track()` inside a render body re-fires on every re-render and multiplies events. Every call goes in an event handler or an effect, never the component body. State this where the helper is taught, not in a trailing watch-out dump.

### Where a property lives: event, person, super, group

The decision section — arguably the densest, treat it carefully and lead with the *decision rule* before the API.

Frame the four homes by the question each answers:
- **Event property** — "what was true of *this one event*." `amount_cents`, `invoice_id`, `from_plan`. Immutable historical fact; updating it later is meaningless because the event already happened.
- **Person property** — "what is true of *this person right now*." `plan`, `role`, `created_at`. Set via `setPersonProperties` (with `$set`) or `$set_once` for first-seen/monotonic values. Queryable across *all* the person's events; updating it does **not** rewrite past events.
- **Super-property** — "what should ride *every event this session* without me re-passing it." Registered once via `posthog.register({...})`; PostHog auto-attaches it to subsequent events. Use for ambient context (`plan`, `app_version`) you'd otherwise copy onto every `track` call. Note `register_once` for values that shouldn't be overwritten.
- **Group property** — "what is true of the *org/account*, not the individual." Deferred to the next section but named here so the four-way split is complete.

**The decision rule, stated crisply:** does the value describe the event, the person, or the account? Event → event property. Person-as-of-now → person property (and if you're tired of passing it, *also* a super-property). Account → group. This rule is the load-bearing takeaway; the `register` / `setPersonProperties` syntax is secondary.

**Component:** `Buckets` (two-column) — sort a pool of properties into **Event property** / **Person property** / **Super-property** / (optionally) **Group property**. Chips: `amount_cents`, `plan`, `from_plan`, `org_seats`, `role`, `invoice_id`, `app_version`, `feature` (on `paywall_viewed`). Some are genuinely judgment calls (`plan` could be person *and* super) — pick the canonical home and explain the tie-break in the surrounding prose. Pedagogical goal: turn the decision rule into a reflex on realistic data.

**PII boundary (inline, load-bearing).** Sensitive identifiers never travel as *event* properties — no email, no IP on events. Email belongs on the **person** (via `setPersonProperties`), where it's the operator-side identifier, consistent with the operator-side PII framing from ch080 lesson 2. State the rule and the reason: event properties are high-volume and end up in dashboards/exports; the person record is the controlled surface for identifiers. Also warn against high-cardinality free-text as event properties (a `note` body, a search string) — it bloats the schema and is unqueryable; capture a bounded fact instead (`note_length`, `query_had_results: boolean`).

### The identify handshake: anonymous to known

The identity core. Build it as a short narrative + a scrubbable diagram, because the *stitch* is the concept students most often get wrong.

Teach the lifecycle:
1. Before sign-in, PostHog generates an **anonymous distinct ID** and persists it (localStorage/cookie). Every event fires under it.
2. On successful sign-in, the app calls `posthog.identify(userId, { email, ... })` with the app's stable user ID.
3. PostHog **links** (its word — verified June 2026) the anonymous distinct ID to that user ID and retroactively associates the prior anonymous events with the now-known person. The pre-signup pageviews and the `paywall_viewed` the visitor fired *before* creating an account now belong to the identified user — which is exactly what makes the trial-to-paid funnel span the anonymous→known boundary. ("stitch" is fine as an intuitive metaphor, but introduce PostHog's "link"/"merge" wording once.)
4. The handshake is **once per session**: calling `identify` with a *different* ID later (without a reset) is the error case — PostHog explicitly **rejects** it ("we do not allow identifying a user that has already been identified with a different distinct ID"); the operation simply fails. The correct way to switch identity is `reset()` first. (Verified against PostHog docs, June 2026.)

What `userId` to pass: the app's stable user ID (the DB primary key / Better Auth user id), **not** the email — emails change, the ID shouldn't. Email goes in the properties bag (which routes to person properties), not as the distinct ID.

**Component:** `DiagramSequence` — the best vehicle for the stitch. Steps:
1. Anonymous visitor: one box "distinct id: anon_8f3…", three event chips below (pageview, pageview, paywall_viewed) all tagged anon.
2. Sign-in fires `identify('user_123', {...})`.
3. Alias drawn: anon_8f3… → user_123; the three prior event chips re-tag to user_123 (highlight the re-tag — *this* is the stitch).
4. New events now fire directly under user_123.
5. The failure variant: a *second* `identify('user_456')` with no reset — show it **rejected** (PostHog refuses to re-identify an already-identified user), to make the once-per-session rule visceral; the fix arrow points to `reset()` first.
Pedagogical goal: make "anonymous events are not lost, they're linked" concrete, and make the once-per-session constraint memorable via the rejected step. (DiagramSequence is self-carded — do not wrap in `<Figure>`.) Author the boxes/chips as plain HTML/CSS inside each `DiagramStep`.

**Where the call goes (continuity):** the `identify` call lands in the existing post-sign-in client flow, using the consented client from `PostHogProvider`. One line tying it to the auth flow the student already has; don't re-teach auth.

### Resetting identity on sign-out

Short, sharp, and it pairs with the previous section.

Teach: `posthog.reset()` on sign-out clears the distinct ID, drops the super-properties, and severs the identity link, so the next session begins as a fresh anonymous user. Without it, the **next** person to use that browser (shared laptop, logout→login as a teammate) inherits the previous user's distinct ID and their events pollute each other's funnels and person records. The pattern: the sign-out flow calls `reset()` **after** the server-side session is destroyed (so a failed server logout doesn't leave a reset-but-still-logged-in skew).

**Component:** a tiny `Code` block of the sign-out handler with the `reset()` call placed after the session-destroy await, or fold it into the DiagramSequence as a closing "sign-out → reset → fresh anon" step. Keep this section to a few sentences — its weight comes from being the mandatory other half of identify, and from the concrete shared-browser failure.

### Orgs as first-class: group analytics

The B2B extension — flag it as load-bearing for this course specifically, since the app is a B2B SaaS where metrics roll up to the org.

Teach: events belong to a *user*, but the questions that matter are account-level — MRR by org, feature adoption per org, seats per plan. PostHog **groups** model this: `posthog.group('organization', orgId, { name, plan, seats })` ties the current user's subsequent events to that org, and funnels/cohorts can pivot on the group instead of the individual. The reach: call `group(...)` on sign-in (and again on org-switch, for multi-org users) right alongside `identify`. Group properties (`plan`, `seats`, `name`) live on the org the same way person properties live on the person.

Connect to the property-split section: this is the fourth home named earlier, now with its API. Decision rule reminder: "is this true of the account?" → group property.

**Watch-out (inline):** forgetting groups is the quiet B2B failure — the analytics works at the user level but can never answer "which *orgs* adopted the feature," which is the question that actually drives B2B roadmap. Also: on org-switch you must re-`group` to the new org or events mis-attribute to the prior account.

Keep code to a single `Code` block (the `identify` + `group` pair on sign-in). No need for an exercise here — the Buckets in the property section can already include a group chip.

### Firing events from the server: the distinct-ID join

The cross-boundary section — depends on identity *and* the lesson-3 server adapter; place it late.

The senior question: some events have no browser — the Stripe webhook that completes a checkout, the Trigger.dev job that finishes an export. They must still fire, and they must attach to the **right person**, or the server event creates a *fresh anonymous* PostHog person and the funnel forks (the `plan_upgraded` lands on a ghost user, disconnected from the `paywall_viewed` the real user fired client-side).

Teach the join: the server needs the user's PostHog distinct ID. Two ways to obtain it, name both, recommend the first for webhooks:
- **Store the distinct ID on the user row** at sign-in (read it from the client SDK and persist it), so any server-side context — webhook, cron, job — can look it up by user. This is the durable join for sessionless server events.
- **Read it from the request cookie** when a request context exists (the SDK persists the distinct ID in a cookie). Fine for request-scoped server code; useless for a webhook (no user cookie on Stripe's request).

Then the capture call, using the lesson-3 adapter exactly:

```ts
// inside a Stripe webhook handler — uses lib/posthog.ts adapter
posthog.captureImmediate({
  distinctId, // looked up from the user row, NOT a fresh id
  event: 'plan_upgraded',
  properties: { from_plan, to_plan, amount_cents },
});
after(() => posthog.shutdown());
```

**Component:** `AnnotatedCode` walking this block — steps on (1) the `distinctId` source comment, (2) `captureImmediate` vs `capture` (continuity: serverless flush behavior), (3) `after(() => shutdown())` to flush without blocking the response. Reinforces the lesson-3 adapter contract while teaching the identity join.

**Watch-outs (inline):** a missing `distinctId` (or a wrong one) forks the funnel — the single most damaging server-side mistake; not awaiting/`after`-ing `shutdown()` drops the event on Vercel function termination (restate from lesson 3, briefly); the moral consent gate (only fire behavioral events for users who accepted) is a discipline, not enforced — name it in one line and point back to lesson 3.

### Autocapture: convenience versus event-count cost

A focused decision, not a deep dive.

Teach: `posthog-js` autocapture records clicks, form submits, and input interactions by DOM selector without any named-event code. The trade-off:
- **On** is great for **marketing surfaces** where the team didn't pre-plan events — you get retroactive click data for free.
- **Off** (`autocapture: false`) is right for the **authenticated app**, where the team writes named events through the dictionary — leaving autocapture on there doubles up (a named `plan_upgraded` *and* an autocaptured click on the same button) and inflates the event count toward the free-tier ceiling for no analytic gain.

The chapter default: autocapture on for marketing, off for the app. Mention `data-ph-no-capture` / the no-capture class for one-off elements that should never be autocaptured even where autocapture is on (e.g. a button whose label contains PII).

Note this is a config knob in `posthog.init` (lesson 3's provider) — so the decision is "what value did you pass," not new wiring. Keep to a short paragraph + one `Code` line. No exercise.

### Worked example: the trial-to-paid funnel in three events

The synthesis section — pull every pillar into one concrete, end-to-end story. This is where the lesson "lands."

Walk the three events that compose the trial-to-paid funnel, each demonstrating a different combination of the lesson's concepts:
1. **`user_signed_up`** — fired *client-side* right after successful registration through `track()`. Immediately followed by `identify(userId, {...})` (the handshake), `setPersonProperties({ plan, created_at })`, and `group('organization', orgId, { name, plan, seats })`. Shows: typed helper + identify + person props + group, all at the one moment the anonymous visitor becomes a known user in a known org.
2. **`paywall_viewed`** — fired *client-side* when the paywall modal opens, `{ feature, plan_required }`. Shows: an event with pure event-properties, fired in a handler (modal-open), not a render. This is the event that was likely fired *while still anonymous* and got stitched by step 1's identify — call that back explicitly to close the loop on the handshake.
3. **`plan_upgraded`** — fired *server-side* from the Stripe webhook via `captureImmediate({ distinctId, ... })` with the distinct ID read from the user row. Shows: the server-side distinct-ID join, the bounded event properties (`from_plan`, `to_plan`, `amount_cents`).

Tie it together: these three, under one stitched identity, let PostHog answer "did the new pricing page lift trial-to-paid?" — `paywall_viewed` → `plan_upgraded`, broken down by the `org` group and the `plan` person property. *This* is the payoff of every contract in the lesson.

**Component:** `CodeVariants` with three tabs (one per event) is the cleanest way to show three related-but-different call sites side by side, each tab's prose naming which pillars it exercises (client vs server, which property homes, identify/group). Each tab one fence + ≤6 lines of prose. Alternatively a `DiagramSequence` showing the funnel filling as each event fires under the stitched identity — but prefer `CodeVariants` here since the *code shape* per event is the teaching target; reserve sequence diagrams for the identity stitch earlier.

Optional close: a `MultipleChoice` or two-statement `TrueFalse` checking the synthesis — e.g. "the `plan_upgraded` webhook event must pass the user's stored distinct ID, otherwise ___" / "`paywall_viewed` fired before sign-up is lost." Single question max; the lesson's real assessment is the chapter quiz (lesson 7).

### External resources (optional, end)

One or two `ExternalResource` cards: PostHog's "identifying users" doc and the event/property best-practices (naming) doc. Only if they're current; keep to canonical PostHog docs.

---

## Tooltips (`Term`)

Be strategic — only terms that aren't defined inline and that the student may not hold precisely:
- **distinct ID** — PostHog's per-user/per-browser identifier every event hangs off. (Glossed in lesson 2/3; this lesson defines it fully in the identify section, so a tooltip on *first* mention before that section helps.)
- **merge / link** — PostHog's actual terms (verified June 2026: the docs say `identify` *links* the anonymous ID to the distinct ID and *merges* persons). The lesson may use "stitch" as an intuitive metaphor for the retroactive re-association, but introduce PostHog's own word ("link"/"merge") at least once so the student maps the concept onto the docs. Avoid presenting "alias" as the primary term — PostHog has a distinct lower-level `alias` call; for the sign-in handshake the operative verb is `identify` (which links/merges), so don't conflate the two.
- **super-property** — a property auto-attached to every subsequent event after `register`.
- **autocapture** — automatic event capture by DOM selector without named-event code.
- **HogQL** — PostHog's SQL dialect (only if referenced when motivating snake_case for queries; otherwise skip).
- **cardinality** — number of distinct values a property takes (for the high-cardinality watch-out), if the term is used.
Do **not** tooltip terms already defined in-section (event/person/group property, identify, reset) — they're taught in prose.

---

## Scope

**Prerequisites to restate concisely (one line each, do not re-teach):**
- The consent gate (`useConsent()`, four-state, `opt_out_capturing_by_default`) — owned by ch081 lesson 5; this lesson only states "events/identify are consent-gated personal-data writes" and moves on.
- The lesson-3 wiring — `PostHogProvider` context as the client source, `lib/posthog.ts` server adapter with `captureImmediate` + `after(shutdown)`, the `/ingest` proxy, pageview handling. Reference, never re-wire.
- The typed `env` (ch081 lesson 7 / ch037) — already holds the PostHog keys; not revisited.
- Operator-side PII identifier framing (ch080 lesson 2) — referenced for "email lives on the person, not events."

**Explicitly out of scope (defer, do not teach here):**
- **Feature flags, `useFeatureFlagValue`, `bootstrapFlags`, experiments, the `$feature/*` super-property** — ch093 lesson 5. (Note: lesson 5 *uses* the super-property mechanism this lesson introduces, so define super-properties cleanly here, but do not discuss flag-derived ones.)
- **Session replay and masking** — ch093 lesson 6.
- **GDPR deletion of a person's events/replays (`deletePerson`)** — ch081 lesson 4 owns the deletion path; mention at most one line if PII naturally comes up, otherwise omit.
- **The audit log** (`logAudit`) — different table, different audience (ch081 lesson 3); explicitly *not* product analytics. If a student might conflate them, one clarifying sentence max.
- **Marketing attribution / UTM parsing** — PostHog's defaults cover it; out of scope per the chapter outline.
- **PostHog dashboards/insight-building UI, funnel/cohort construction in-app** — this lesson produces the *data*; reading it in PostHog's UI is not taught (the funnel question is framed conceptually, not as a UI walkthrough).
- **The full lint-rule config** forbidding raw `posthog.capture` — named as the enforcement backstop, not authored.
- **`@posthog/next` identify/group helpers** — not the chapter's wire; do not use.

---

## Code-conventions alignment notes (for downstream agents)

- `type` (not `interface`) for `AnalyticsEvents` and derived types; `as const` for any literal map; **no `enum`**; string-literal unions for closed sets (`plan_required: 'pro' | 'team'`).
- Event *names* are snake_case past tense by the analytics convention; this is the **data contract**, independent of TS identifier casing. The TS keys in `AnalyticsEvents` are those same snake_case strings (object keys, fine). Surrounding TS identifiers (`track`, `EventName`, `useTrack`) stay camelCase/PascalCase per code conventions.
- `track` / `useTrack` are generic (`<K extends EventName>`) so the property arg narrows to the chosen event — matches the "generic constraints over loose generics" rule.
- Two positional params max: `track(event, properties)` is exactly two — fine. If a third datum is ever needed, move to an options object.
- Server adapter file (`lib/posthog.ts`) begins `import 'server-only'`; no React imports in `lib/`. The analytics dictionary (`lib/analytics/events.ts`) is pure types/constants — also no React, importable from both client and server.
- Deliberate divergences to flag in-lesson so they aren't "corrected": (a) `track` is reached via a `useTrack()` hook bound to the provider's consented client rather than a free function importing `posthog-js` — this is the single-client-source guarantee; (b) the dictionary is intentionally one file (not split) to keep the git-log-as-changelog property.
- Property *keys* in events are snake_case (`amount_cents`, `from_plan`, `org_id`) to match the event-name convention and how they surface in PostHog/queries — note this is the on-the-wire shape; if a TS object literal uses them they're string-ish keys, consistent.
