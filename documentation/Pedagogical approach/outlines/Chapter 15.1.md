## Concept 1 — Default-dynamic and the three route classes

**Why it's hard.** The student arrives with the caching mechanics fresh from Chapter 5.4 and a reflex to apply them. The misconception this fixes: caching is the default; reach for `use cache` whenever a read could be slow. The senior posture is the inverse — under `cacheComponents: true`, authenticated SaaS surfaces stay dynamic; caching earns its weight only on read-heavy shared data, and the team commits to a per-route classification up front rather than discovering it during incidents.

**Ideal teaching artifact.** A walkable classification table of a real SaaS `app/` directory — twelve to fifteen rows of paths the student already recognizes (`/dashboard`, `/invoices`, `/invoices/[id]`, `/settings`, `/admin/members`, `/pricing`, `/docs/[slug]`, `/og/[id]`, etc.). Before each row reveals its answer, the student commits a guess across two cells: route class (dynamic / partial / static) and the read-to-write ratio justifying it. The reveal column shows the senior call plus a one-line rationale ("per-user-per-second-changing, hit rate near zero"). The artifact teaches by forcing the student to defend the cache against the route, not the other way around. Decision archetype delivered as a prediction-and-reveal grid.

**Engagement.** The grid itself is the prediction round. After the table is fully revealed, a Buckets follow-up sorts six additional surfaces (feature flags, real-time inbox, pricing page, plan entitlements, the user's notification feed, the OG image route) into the three classes — confirming the student can run the classifier on routes they haven't seen.

**Components.**
- New `ClassificationTable` (preferred): rows with columns `Route`, `Your guess (class)`, `Your guess (ratio)`, `Reveal`. Inputs: array of `{ path, options, correct, rationale }`. Per-row commit reveals the senior call.
- Alternative: `MultipleChoice` repeated per route plus a final `Buckets`. Workable but loses the columnar comparison that makes the read-to-write ratio salient across rows.
- Closing recall: `Buckets` with two columns (dynamic / cacheable) sorting the six unseen surfaces.

**Project link.** Chapter 15.2 opens with the student writing the classification document for the invoices app; this concept produces the cognitive scaffold they fill in.

---

## Concept 2 — `cacheLife` profiles as a UX question

**Why it's hard.** The three numbers (stale, revalidate, expire) look like a performance knob. The misconception: pick the profile that's "fastest" or "freshest." The senior framing: the profile describes how long the user is willing to see slightly-old data, which makes it a product question about the read's tolerance for staleness, not a perf question about throughput.

**Ideal teaching artifact.** A small controllable timeline. The student picks a profile from a dropdown (`'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`) and a workload from a second dropdown (org membership list, feature flags, plan entitlements, marketing copy, docs page, OG image). A timeline animates a synthetic day of reads and writes; an overlay shows the cached value's three states (fresh / stale-serving / expired). The student watches mismatched pairings (`'seconds'` on plan entitlements, `'max'` on a feature-flag flip) produce either pointless revalidation churn or unacceptable lag, and matched pairings settle into a clean hit-pattern. The point lands by watching the wrong choice fail rather than reading why it fails. Concept archetype.

**Engagement.** After the timeline, a Matching exercise pairs five workloads with their correct profile and a one-line tolerance ("membership rarely changes; hours is acceptable"). The match confirms the student internalized tolerance-as-the-driver rather than memorizing a table.

**Components.**
- New `CacheLifeTimeline`: inputs are `profile` and `workload`; renders a 24-hour strip with read events (vertical ticks) and write events (filled bars), colored by cache state. Forward-link: any future chapter teaching freshness contracts (TanStack Query staleness in Unit 16) can reuse the timeline shape.
- Closing recall: `Matching` (workload ↔ profile + rationale).

**Project link.** The 15.2 cached reads pick `'hours'` for the per-org summary and `'minutes'` for the invoices list; the concept supplies the tolerance reasoning.

---

## Concept 3 — The tag scheme as a named contract

**Why it's hard.** Tags look like strings, and the student's reflex is to inline them at the call site. The two misconceptions this concept fixes: tags are free-form labels (they're a contract between two distant call sites, and a typo silently fails to invalidate); and a cached read's `orgId` can be read from the session (it can't — `use cache` rejects request-scoped reads, so scoping must arrive as an argument). The concept lands the four tag shapes (entity, record, org-scoped, user-scoped), the `tags.ts` helper that makes typos impossible, and the arguments-not-ambient-state rule.

**Ideal teaching artifact.** A two-pane "wrong-by-default" sandbox. Left pane: a cached read (`listInvoices`) with three free-form `cacheTag('invoices')` strings inline. Right pane: a Server Action mutating an invoice with three free-form `updateTag('invoice-list')` strings inline. The student is told the read and write don't invalidate; they have to find why. Diffing the two panes reveals the typo. The student then refactors both panes to import from a shared `tags.ts` (the helper is provided pre-written), and the diff disappears — the tag string only exists in one file. A second beat in the same artifact toggles the cached function between "reads `orgId` from `auth()`" (compiles, leaks cross-org) and "takes `orgId` as an argument" (correct). The student sees the leak surface as two orgs sharing one cached entry. Pattern archetype, named for what it prevents.

**Engagement.** A Tokens click on a fresh cached-read snippet — the student clicks the tag strings that are correctly scoped and the arguments that should drive them, then a Buckets sorts eight tag strings (`invoices`, `invoice:abc`, `org:o1:invoices`, `user:u1:notifications`, `Invoice:abc`, `org-invoices`, etc.) into the four shapes plus a "malformed — reject in review" bucket.

**Components.**
- New `TagSchemeSandbox` (primary): two-pane diff with a toggle for "free-form" vs. "via `tags.ts`" and a separate toggle for "session-scoped" vs. "argument-scoped." Inputs: the read and write source, the helper file, the toggles. Renders both panes side-by-side, highlights the mismatched strings, and shows a third panel that simulates the cache state (org A entry, org B entry) reacting to the toggle. Forward-link: 15.2 builds this exact shape in code, and the artifact carries the misconception that audit chapters (Unit 17) will reference.
- Closing recall: `Tokens` on the correct snippet, then `Buckets` for the four tag shapes.

**Project link.** Chapter 15.2 ships `lib/cache/tags.ts` with three helpers (`orgInvoicesTag`, `invoiceTag`, `orgSummaryTag`) and rejects the session-scoped variant in code review.

---

## Concept 4 — The four-call invalidation surface on two axes

**Why it's hard.** Four calls is one too many to memorize. The student reaches for whichever name they remember last and produces either runtime errors (`updateTag` outside an action) or silent staleness (`router.refresh` on a cached route). The misconception: the four are interchangeable knobs. The senior model: they sit at the four corners of a two-axis table — read-your-writes vs. eventual, and tag vs. path — and the corner is determined, not chosen.

**Ideal teaching artifact.** A 2×2 grid laid out as the chapter's central diagram. Vertical axis: "Triggering user is watching?" (yes / no). Horizontal axis: "Can the change be expressed as a tag?" (yes / no). Each cell names its call (`updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`) and surfaces three pieces of information beneath the name: which call sites can invoke it (action / route handler / background job / client), the call's semantics (immediate vs. SWR), and a one-line "reach for it when" hook. The spatial layout encodes the decision — the student reads the corner first, the call name second. Concept archetype delivered as a structured diagram.

**Engagement.** A `PredictOutput` round ambushes the student with three call sites: a route handler that tries `updateTag` (runtime error), an action that uses `revalidateTag` where the user is watching (one-render delay), and a client `router.refresh` on a cached route (no invalidation, stays stale). The student predicts each outcome before the reveal — forcing them to read off the grid rather than guess.

**Components.**
- Primary: a static `Figure` with hand-SVG of the 2×2 grid, axis labels along the edges, four populated cells. Single-use in this chapter, no forward-link, so a bespoke drag-puzzle component would not earn its weight.
- Alternative: `ArrowDiagram` inside `Figure` to render the grid declaratively.
- Closing recall: `PredictOutput` with three call-site scenarios.

**Project link.** Chapter 15.2 wires four lifecycle actions to `updateTag`, a Trigger.dev task to `revalidateTag`, and a deliberate misuse branch (`revalidateTag` inside an action where `updateTag` is correct) as the failure-mode demo. The grid is the answer key.

---

## Concept 5 — The user-expectation question drives the pick

**Why it's hard.** Once the four calls are mapped, the student still has to pick one for a real mutation. The misconception: pick based on what the developer wants the cache to do. The senior reframe: pick based on whether the triggering user is sitting on the redirect expecting their change to be visible. Same mutation, different call depending on who triggered it — a profile edit by the user is `updateTag`; the same edit propagated from an identity-provider webhook is `revalidateTag`.

**Ideal teaching artifact.** A scrubbable case-study sequence. Each step is one worked SaaS flow (list-edit, post-purchase plan flip, membership demotion, webhook invoice update, nightly summary rebuild) shown as a small actor diagram: who triggered the mutation, where they are after it lands (sitting on a redirect / closed the tab / never knew about it), and what invalidation call is appropriate. The student scrubs through the five cases. At each step the trigger and the expectation are revealed first, the invalidation call after — the student is implicitly asked to predict before scrolling. The fifth step (the membership demotion) reveals the multi-recipient pattern: one action, two `updateTag` calls fanning out to the admin's view and the demoted member's view. Concept archetype delivered as scrollytelling.

**Engagement.** After the sequence, a `Sequence` exercise reorders the steps of a single mutation: transaction commit, `updateTag` fan-out, redirect, render. The student drags four cards into the only correct order. This locks the "invalidate after commit, then redirect" rule that concept 6 will codify.

**Components.**
- `DiagramSequence` (primary): each panel is a `Figure` with the actor diagram, the trigger label, and the call card. Five panels, scrubbable. Existing component fits directly.
- Each panel's actor diagram is a small hand-SVG inside its `Figure`.
- Closing recall: `Sequence` on the four-step mutation order.

**Project link.** Chapter 15.2's four action handlers correspond one-to-one with three of the five cases; the student references the case-study sequence when wiring each.

---

## Concept 6 — Invalidate after commit, then redirect

**Why it's hard.** Action handlers naturally read left-to-right and the student is tempted to redirect first (because the redirect is the visible thing) and trust the redirect to "refresh." Two failure modes hide here: an invalidation inside the transaction that gets rolled back leaves the cache stale-with-the-rolled-back-state; a redirect before the invalidation lands the user on a cached page that still shows the old value. The concept lands the only correct order — commit, invalidate, redirect — as structural discipline.

**Ideal teaching artifact.** A wrong-by-default code snippet the student repairs in place. The starting code has three lines in the wrong order: `redirect(...)`, `await db.transaction(...)`, `await updateTag(...)`. A side panel renders a small state-machine: "DB row," "Cache entry," "User's next view." The student drags the lines into the correct order; the state-machine animates the consequence of each order — wrong order shows the cache holding the old value as the redirect lands, the rollback variant shows the cache invalidated against a transaction that didn't commit. Only the correct sequence settles all three states green. Pattern archetype — the artifact carries the assessment because the puzzle *is* the test.

**Engagement.** The drag-puzzle is the assessment. A brief follow-up `TrueFalse` round (three statements: "the redirect triggers cache invalidation," "`updateTag` inside the transaction is safer," "the action can fire `updateTag` calls in parallel before redirect") confirms the misconceptions are extinguished.

**Components.**
- Reuse `Sequence` (primary): three or four steps reordered to lock the commit-invalidate-redirect order. Existing component is sufficient because the spatial story is linear.
- Alternative: a new `ActionOrderPuzzle` that pairs the drag with an animated state strip showing the DB, cache, and view reacting to each order. Compelling but single-use and no forward-link — demoted; the `Sequence` + a static `Figure` of the state strip covers the teaching.
- Closing recall: `TrueFalse` round with three statements.

**Project link.** Every action handler in Chapter 15.2 follows the commit-invalidate-redirect skeleton; deviations fail the inspector's cache-state probe.

---

## Component proposals

- **`ClassificationTable`** — rows × columns grid for predict-then-reveal across a list of routes; inputs `{ path, options, correct, rationale }[]` and column headers. Renders the senior call after the student commits.
  - **Uses in this chapter:** Concept 1.
  - **Forward-links:** Unit 17 audit pass (security-header classification by route); Unit 20 observability (per-route SLO tier classification). Plausible reuse — proposal stands.
  - **Leanest v1:** static table with per-row reveal button (no commit state, no rationale column). Thin v1 still teaches the framing — but the commit step is what makes this a recall artifact rather than a reference table, so v1 is meaningfully weaker. Build the commit version.

- **`CacheLifeTimeline`** — controllable 24-hour read/write strip, inputs `profile` and `workload`, colored by cache state.
  - **Uses in this chapter:** Concept 2.
  - **Forward-links:** Unit 16 TanStack Query staleness (the same timeline shape teaches `staleTime`/`gcTime`); Unit 13 background-job freshness. Strong reuse.
  - **Leanest v1:** fixed workload, profile-only dropdown, static read pattern. v1 still demonstrates the tolerance-as-driver point; the workload dropdown adds product framing. Build v1, layer workload selector in a later pass.

- **`TagSchemeSandbox`** — two-pane diff with toggles for "via helper" and "argument vs. session scoping," plus a third panel simulating cache entries reacting to the toggle.
  - **Uses in this chapter:** Concept 3.
  - **Forward-links:** Unit 10 (org-scoping discipline can reuse the leak-simulation panel); Unit 17 audit pass (per-tenant data-leak audit).
  - **Leanest v1:** static side-by-side `CodeVariants` with the helper toggle, no live cache simulation. v1 misses the leak demo, which is the load-bearing beat. Full version pulls weight.

## Build priority

Three new components are on the table. Ranked by reuse weight:

1. **`CacheLifeTimeline`** — clearest forward-link (Unit 16 reuses the staleness mental model directly) and the in-chapter teaching is hard to replicate with existing components. Build first.
2. **`TagSchemeSandbox`** — load-bearing for the chapter's hardest misconception (tag-string contract + scoping leak). Forward-links are real but more distant. Build second.
3. **`ClassificationTable`** — high in-chapter value, plausible (not certain) forward reuse. Build third.

Concept 4's 2×2 grid stays as a hand-SVG inside `Figure` — single-use and no forward-link, so a bespoke component would not earn its weight. Concept 6 rides on the existing `Sequence`.

## Open pedagogical questions

- The `CacheLifeTimeline` synthesizes a read/write pattern per workload — is the right authoring posture to ship pre-baked patterns per workload, or to let the author define an arbitrary read/write series? Pre-baked is leaner but limits forward reuse.
- Concept 5's `DiagramSequence` covers five cases; the membership-demotion case introduces fan-out, which the other four don't. Worth splitting fan-out into its own concept, or does the scrubbable sequence carry it?
