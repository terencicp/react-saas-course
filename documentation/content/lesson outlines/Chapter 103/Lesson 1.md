# Lesson 1 — Where the eyes go first

- **Title (h1):** Where the eyes go first
- **Sidebar label:** Where the eyes go first

---

## Lesson framing

Decision/Reference hybrid, ~50–60 min, the chapter's load-bearing lesson. Two deliverables:

1. **The decision** — a five-layer review stack the senior runs *top-down on the diff's concerns*, not top-down on the file. The teach is the *order*: where finite attention goes first and why.
2. **The reference** — a principle-and-pattern map (7 architectural principles + 15 SaaS patterns) the reviewer scans against the diff. For each item: the *failure mode* it prevents, the *diff signature* that signals "this didn't use the established surface," and a *one-line comment* pointing back at the owning lesson. This is a scannable reference table, **not** a re-teach — one line per item, never a paragraph.

Pedagogical spine and conclusions that apply lesson-wide:

- **Lead with the senior question, framed as a wrong reflex to dislodge.** The student's instinct (and the junior default) is "read top to bottom, flag anything off." That surfaces formatting noise and runs out of attention before the auth bug on line 200. The whole lesson exists to replace *file order* with *concern order*. Open cold on this; it's the hook.
- **The map is the payoff, but it only lands because the course already paid for it.** Every row points back at the lesson that *owns* the principle/pattern. The reviewer's job is defending invariants the codebase already bought — the student has met all 22 of these across Units 4–20. The lesson's value is the *consolidation into a scan*, plus the framing that review = invariant defense.
- **Minimize cognitive load by sequencing.** Don't dump 22 rows at once. Teach the *stack* first (5 layers, simple, memorable), then expand layers 2 and 3 into the map. The principles (7) are a smaller, tighter set — teach them as a table first to warm up the "diff signature → comment" reading pattern, *then* the patterns (15) reuse the exact same table shape. Same shape twice = lower load the second time.
- **Negative space is as load-bearing as the map.** "What does NOT get a comment" (formatting, bikeshedding, off-topic refactors) is a distinct teach, not a footnote — restraint is the senior move. Give it its own section.
- **Real production stakes throughout.** Frame every layer against what breaks if the review misses it: a dropped tenant filter is a cross-tenant data leak; a missing webhook dedup double-charges a customer; a `NOT NULL` in one PR is an outage. The severity ordering of the stack *is* the production-impact ordering.
- **AI-generated code is the same surface, stated once, not a section about tools.** The course thesis is AI-driven development; the durable point is that the checklist doesn't bifurcate because the principles/patterns are stable. Fold it into the stack framing and a short watch-out — do not turn the lesson into "how to review the robot."
- **Tone: peer-to-peer senior, terse, opinionated.** No bootcamp scaffolding. The student is a competent dev learning a posture.
- **Mental model the student leaves with:** *A diff is not lines to read; it's a set of invariants to verify. I scan the diff once, map each touched concern onto the stack and the map, and the high-severity comments write themselves. Attention is the scarce resource — spend it top-down on the stack, never top-down on the file.*
- **By the end the student can:** open a diff and name where to look first and why; recognize the diff signature of each principle/pattern violation; decide which concerns earn a comment and which don't; call "split this PR" as a structural move; route CI-catchable concerns away from human review.

This lesson teaches *what to look for*. The *how to phrase it* (anatomy, severity labels) is Lesson 2 — keep comment-craft out except the bare minimum needed to make map rows concrete (a one-line comment per row is fine; comment anatomy/severity is not).

---

## Lesson sections

### Introduction (no header — opening prose)

Open cold with the senior question, posed as a scene: a PR diff is open in front of you, 30 changed files. Where do your eyes go first, and what are they looking for? State the wrong-but-common answer plainly (top of file 1, line by line, flag anything that looks off) and name its two failure modes: it surfaces formatting noise the formatter already owns, and it burns attention so the load-bearing bug 200 lines down never gets read. Then state the reframe that the whole lesson delivers: a senior doesn't read the *file* top-down, they read the *diff's concerns* top-down — mapping each change onto the principles and patterns the codebase already paid to establish, and asking per concern: *did this defend the invariant, or punch a hole through it?* Preview the two deliverables (the stack, the map). Connect to Unit 21 so far: Ch101 = the docs that describe the system, Ch102 = the in-source discipline that keeps them honest, this chapter = the checkpoint where a human reads a diff before it becomes production behavior. Keep it warm and to ~3 short paragraphs.

Reasoning: the lesson's entire pedagogical leverage is dislodging one wrong reflex. Naming it first, concretely, makes everything after it feel like the obvious correction.

### Review defends invariants, it doesn't hunt for mistakes

The conceptual foundation before any mechanics. The point: every architectural principle and SaaS pattern in this course exists to make some failure mode *unrepresentable* or *caught*. A code review is the moment those invariants either get defended or get quietly eroded — usually not by malice, but by a well-meaning diff that re-invents a wrapper, or reaches past the tenant helper, because the author didn't know it existed. Frame the reviewer's job as *invariant defense*, and contrast it sharply with *mistake-hunting* (scanning for typos and style). Mistake-hunting is the linter's job; invariant defense is the human's. State the corollary that recurs all lesson: **the reviewer's attention is finite and expensive, so spend it where a miss costs the most.** This sentence motivates the entire stack.

Reasoning: students arrive thinking "review = find bugs." Re-framing to "review = defend the system's load-bearing decisions" is the senior mindset shift and the thesis of the whole chapter. It must precede the stack or the stack reads as an arbitrary checklist.

No diagram here; it's a framing section. Keep it tight.

### The review stack: five layers, top-down

The first deliverable — the prioritization decision. Present the five layers as an ordered stack, highest-severity at top:

1. **Correctness and security** — does the code do what the PR claims? Does it leak secrets, drop an auth check, expose the tenant boundary, log PII, or trust client input the server must validate?
2. **Architectural principles (#1–#7)** — does the diff respect the seven structural rules the codebase is built on?
3. **SaaS patterns (#1–#15)** — does it use the established surface (tenant helper, authed wrapper, billing carve-out, webhook idempotency, Result shape, URL state, cache decisions, soft delete, notification layer, expand-migrate-contract, security baseline, time/i18n primitives, performance vigilance) wherever it touches one?
4. **Tests and contract integrity** — are new paths covered, do tests assert behavior the user cares about, does the TSDoc still match the signature, did `.env.example` move with `env.ts`?
5. **Style and naming polish** — the linter caught formatting; the human reads names against intent and flags the genuinely confusing one. **Last** layer. If the review only reached here, the review missed.

Teach the *why of the order*: the layers are sorted by what a miss costs in production. A leaked tenant boundary (layer 1) is a breach; a confusing variable name (layer 5) is a five-minute fix later. Attention drains as you read, so spend it from the top. State the load-bearing reframe explicitly: **top-down on the stack, not top-down on the file.** A reviewer who starts at file-line-1 is sorting by *file position*; a senior sorts by *severity*. Layers 2 and 3 are the bulk of the work and get expanded into the map in the next sections — flag that forward so the student knows the map is the stack's middle, zoomed in.

**Diagram — the five-layer stack (HTML + CSS, vertical, in `<Figure>`).** A vertical stack of five labeled bands, top = layer 1, with a left-side gradient/arrow conveying "severity high → low" and "attention spent first → last." Each band: layer number + name + a one-phrase "what a miss costs" (e.g. layer 1 → "cross-tenant leak, double-charge, breach"; layer 5 → "a confusing name, fixed later"). Pedagogical goal: make the *order* and its *rationale* visible and memorable in one glance — this is the artifact the student should carry out of the lesson. Use saturated mid-tone fills graded from a hot color at the top to a cool/muted one at the bottom so the severity ramp reads pre-attentively. Follow `html-css.md`: `margin: 0` on every inner element, `box-sizing: border-box`, cap height well under 800px, test wrap at narrow widths (this is a vertical stack so wrap isn't a risk, but keep bands from overflowing). Escape any `<` in cost labels. Do **not** make this a `DiagramSequence` — the student needs all five visible at once to internalize the order.

Reasoning: the stack is the lesson's decision deliverable and the most reusable takeaway. A single static figure showing severity-ordered bands is the right vehicle — it's a simple visual aid, exactly the kind the guidelines bless, and it anchors the "not top-down on the file" reframe physically.

### The principle map: what each principle catches at review time

First half of the reference deliverable. Open with one sentence: these are the seven structural rules the codebase is built on; you've met each in the lesson that owns it — here's how each shows up *at the review surface*. Then a **reference table**, one row per principle, three columns: **Principle** | **Diff signature (what tips you off)** | **The comment**. Keep each cell to one line. Append an inline link to the owning lesson per row (in the Principle cell or as a trailing "see …").

Rows (content from the chapter outline; the writer keeps the comment column to one terse line):

- **#1 Co-locate by feature, not layer** — sig: a new file landing in `/utils/`, `/services/`, `/types/` instead of its feature module. comment: "belongs in `/lib/<feature>/`." (owns: Ch029 L1)
- **#2 The schema is the source of truth** — sig: a hand-written type duplicating a Drizzle/Zod shape; a hardcoded option list the schema already enumerates. comment: "derive from the schema." (owns: Unit 5/6)
- **#3 Pure functions in `/lib`, side effects at named boundaries** — sig: a `db.insert`/`fetch` inside a `/lib/<feature>/` helper; business logic in a route handler; an action that doesn't own its effect. comment: "move the effect to the action seam." (owns: Unit 4/6)
- **#4 Name for intent, not implementation** — sig: `handleClick`, `processData`, `helper`, `utils`, `manager`. comment: "name what it *means*, not what it *does*."
- **#5 Use framework conventions; don't invent** — sig: a custom router, a hand-rolled action-call wrapper, a homemade form lib where native forms + Server Actions cover it. comment: "the framework already has this." (note: `authedAction`/`authedRoute` are the sanctioned carve-outs)
- **#6 Prefer explicit over magic** — sig: a global side-effect import mutating module state; a magic string driving control flow; a missing `'use client'`/`'use server'` directive. comment: "name the boundary."
- **#7 Make impossible states unrepresentable** — sig: a boolean pair that admits a contradiction (`isLoading: true` alongside `data`); a should-be-required-together optional pair; a `string` that wants to be a discriminated union. comment: "tighten the type." (owns: Unit 1)

Format note for downstream agents: a Markdown table inside Starlight is fine and the right tool here — it's scannable, which is the whole point. **Do not** use `AnnotatedCode` or `CodeReview` for the map itself; those are for code, the map is reference prose. If a row's diff signature is too abstract in words, the writer may add ONE tiny illustrative `Code` snippet for the single most non-obvious principle (#7 is the best candidate — show the contradictory boolean pair vs. the discriminated union), but resist illustrating every row; the table is the deliverable, not a code tour.

**Tooltip terms in this section:** `Drizzle` (the Postgres ORM, schema-as-source-of-truth, Unit 5), `Server Action` (the `'use server'` mutation seam, Unit 6) — brief one-liners so the map reads without the student re-opening earlier units. Use `<Term>`.

Reasoning: the principles are the smaller, tighter set, so they teach the table-reading pattern (signature → comment) with low load. Establishing the three-column shape here means the 15-pattern table that follows is "more of the same," not new cognitive work.

### The pattern map: what each pattern catches at review time

Second half of the reference deliverable, **same three-column table shape** (Pattern | Diff signature | The comment), one line per row, link to the owning lesson. Lead with one sentence: where the principles are structural, the patterns each pin a specific SaaS concern; same scan, same reading.

Rows (every item gets exactly one line — full list, terse):

- **#1 Tenant-aware query** — sig: `db.select().from(table)` without the org filter. comment: "use `tenantDb(orgId)` in the `where` clause." (Unit 9/10)
- **#2 Authed action wrapper** — sig: a Server Action opening with manual `auth()` + `if (!user) throw`. comment: "wrap in `authedAction(role, schema, fn)`." (Unit 6/10)
- **#3 Seat management** — sig: bypassing the seat/role primitives when adding/removing members. comment: "go through the seat primitive." (Unit 9)
- **#4 Billing carve-out** — sig: `import Stripe` outside `/lib/billing/`. comment: "go through the billing interface." (Unit 11)
- **#5 Webhook idempotency** — sig: a webhook handler that doesn't dedup on the provider's event id. comment: "add the `processed_events` dedup key." (Unit 11)
- **#6 Result return shape** — sig: a Server Action that `throw`s on a validation failure. comment: "return `{ ok: false, error }`; throw only at the framework edge." (Unit 6)
- **#7 URL-state list view** — sig: filter/sort/page state in `useState` instead of `searchParams`. comment: "lift state to the URL (nuqs)." (Unit 10)
- **#8 Cache decisions** — sig: a fetch with no explicit cache directive on mutable data; a missing `revalidateTag`/`revalidatePath` after a mutation. comment: "name the cache decision." (Unit 4/14)
- **#9 Soft delete / archive** — sig: a `DELETE FROM` that should be a `deletedAt` update; a unique constraint blind to soft-deleted rows. comment: "soft-delete, or partial-unique." (Unit 10)
- **#10 Notification layer** — sig: a direct Resend/Twilio call inside a feature module. comment: "route through the notification dispatcher." (Unit 7/13)
- **#11 Expand-migrate-contract** — sig: a `NOT NULL` on an existing column, a rename, or a drop landing in one PR. comment: "split into the three-step cadence." (Unit 20)
- **#12 Security baseline** — sig: untyped `JSON.parse` of a request body; a secret in a client component; a missing mutating-route guard. comment: "name the baseline being violated." (Unit 16)
- **#13/#14 Time and i18n** — sig: `new Date()` for user-visible formatting in a server component; a hardcoded English string in a translatable surface. comment: "use the Temporal/`Intl`/next-intl primitives." (Unit 17)
- **#15 Performance vigilance** — sig: a list query without pagination; an N+1 on a relation that has a join helper. comment: "paginate, or use the join." (Unit 19)

Note for the writer: 15 rows is a long table — that's acceptable and intended; it's a reference the student scans and returns to, not a wall of prose. Keep cells single-line so the table stays scannable. Do not expand any row into a paragraph — the owning lesson holds the depth, the link carries the student there.

**Exercise — Buckets: sort diff signatures onto the layer they belong to.** After both maps, a `Buckets` drill consolidates the *stack ordering*, not the individual rows. Buckets = the five layers (or a useful subset: "Correctness/Security," "Principle/Pattern violation," "Tests/Contract," "Style polish — last"). Items = ~8 terse diff signatures the student classifies, e.g. "secret read in a `'use client'` file" → Correctness/Security; "`db.select().from(invoices)` with no org filter" → could be Pattern (#1) but the *consequence* is a tenant leak, so it earns Correctness/Security priority — use this as a deliberately instructive item and explain it in the `ReviewWhy`-style reveal text; "a `boolean` pair that admits a contradictory state" → Principle (#7); "`processData` as a function name" → Style/naming; "a 600-line diff with a one-line description" → (see PR-size section, may belong in a later exercise). Goal: the student internalizes *severity ordering*, which is the lesson's decision skill. Grading: correct bucket per item. Reasoning: a classification drag is the right exercise for an "order/priority" skill — it tests the decision (which layer) rather than recall of a single row.

Reasoning: re-using the identical table shape halves the load of the 15-item set. The Buckets exercise checks the *transferable* skill (severity triage) rather than rote map memorization, which is what the student actually needs at a real diff.

### What does not get a comment

The negative-space teach — its own section because restraint is a senior move, not a footnote. Enumerate what the reviewer deliberately stays silent on:

- **Formatting** — the formatter (Biome) owns it; a comment about it is wasted attention on both sides.
- **Naming/casing the linter already accepts** — bikeshedding `camelCase` vs. whatever, when the rule passed.
- **Personal style preferences** — "I'd have used a ternary," "I prefer early return." Not a defect; not a comment.
- **Off-topic / architectural rewrites not load-bearing for this PR** — "you could've used the visitor pattern here," "while you're in here, refactor X." Novel-architecture proposals belong in a design doc or ADR thread (forward-ref Ch104's ADR), not a line comment on someone else's PR.

State the principle plainly: **the review's job is to defend the established principles and patterns, not to redesign or to impose taste.** The senior practices restraint on the diff in front of them. Tie back: every one of these is *below* layer 5 or *outside* the stack entirely — they're not on the map, so they're not the human reviewer's beat.

Reasoning: junior reviewers over-comment; the failure mode is signal-drowning and gatekeeping vibes. Teaching what to *not* say is as load-bearing as the map and prevents the "review as power play" anti-pattern.

### When CI already caught it, you don't

The structural-enforcement frame. The first reviewer is `tsc`, Biome, and the test suite — anything they catch is *not* the human's beat, because human attention is too expensive for what a machine catches deterministically. Beyond the defaults, name additional CI signals as possible *promotions*: a type-coverage check (Ch087), a migration linter (Ch099), an env-parity linter (Ch081). State the corollary that closes the loop with the whole lesson: **when a class of comment recurs across PRs — the same forgotten wrapper, the same missing check — the senior promotes it to a lint rule or a CI gate.** Reviews encode patterns; patterns become structural enforcement; the human reviewer's beat *narrows* as the structural net widens. This is the senior's long game: stop saying the same thing by hand, make the machine say it.

Reasoning: this reframes review as a feedback loop into the toolchain, not a static gate — a genuinely senior idea, and it explains *why* the map shrinks over time, which is reassuring (the student isn't memorizing a permanent 22-item burden; the net catches more each quarter).

### Right-sizing the review: PR size, the description, and tempo

Three structural disciplines that gate whether the review can even happen, grouped because they're all about the *conditions* for a good review rather than the diff's content.

- **PR size and the "split this" comment.** Reviewer accuracy collapses past a threshold; public data and team practice both peg it around **400 lines of meaningful change**. Past that the reviewer rubber-stamps or misses load-bearing issues. State the threshold once. The senior reflex: if the PR is too big, the right comment is **"split this — the review can't catch what it can't read,"** and that's a *structural* comment (blocking the merge on reviewability), not a soft suggestion. (Severity vocabulary is Lesson 2; here just establish that "split this" is non-negotiable, not a nit.)
- **The PR description as the review's contract.** Before reading the diff, the reviewer reads the description and asks: *do I understand what this claims to do, and do I have the context to verify the claim?* A one-line description on a 600-line diff is a contract gap; the first comment is "what does this change and why," not a line comment on line 47. Connect to Ch102 (in-source discipline): the description is documentation that scopes the review.
- **Review tempo — the asymmetry.** A review that lands a week late is a review that didn't happen: the author moved on, context evaporated, the merge happens under pressure with no review input. The senior reflex: **first response within a business day, ideally hours; small PRs turn around same-day.** State the asymmetry crisply: *a slow review costs more than a fast imperfect one, because the realistic alternative to a slow review is no review.*

Reasoning: these three are preconditions — no amount of map mastery helps if the diff is unreadable, undescribed, or reviewed too late. Grouping them keeps the lesson's spine (the stack + map) clean while still covering the chapter outline's structural points. Each is stated once with its threshold; none needs a diagram.

### Reading tests with the same eyes as code

Layer 4 of the stack, expanded — its own section because the failure mode is specific and common. The reviewer reads tests with the *same* posture as production code: do the assertions check behavior the *user* cares about, or do they only verify the implementation the test was written alongside? State the cut: **tests defend the contract, not the implementation.** A test that asserts the mock was called or the spy fired is not a test — it's a snapshot of the current code that will pass no matter how the behavior breaks. Surface the watch-out concretely: a test that *mocks the very thing under test* proves nothing. Give one tiny before/after to make it real.

**Code component:** one `CodeVariants` (or a `<Tabs>` of two `Code` blocks) — tab "Tautological" shows a test asserting `expect(repo.save).toHaveBeenCalled()` with the real save mocked; tab "Defends behavior" shows the same test asserting the *observable outcome* (the row exists / the Result is `{ ok: true }`). Keep both blocks short. Reasoning: a before/after comparison is exactly `CodeVariants`' job, and the contrast is the entire teach — far clearer than prose.

Reasoning: "tests as part of the diff" is in the chapter outline and is a real junior blind spot (they treat the test file as the author's business). A single sharp contrast carries it; it doesn't need more.

### The always-look-for security scan

Layer 1 of the stack, expanded into a concrete five-item scan — its own section because correctness/security is the top of the stack and deserves a memorable, runnable checklist (not a re-teach; the depth lives in Unit 16). The five items the senior runs *every* review:

1. **Secrets on client-bundle paths** — anything imported from a `'use client'` file that reads a server secret (`process.env.STRIPE_SECRET_KEY` and friends). Ships the secret to the browser.
2. **Missing tenant filters** — a query without the org scope (ties to pattern #1; here it's a *security* concern, not just a pattern one — the consequence is a cross-tenant read).
3. **Unvalidated user input crossing a boundary** — into SQL or HTML without a parse/escape step.
4. **Auth checks living in components instead of the action seam** — a guard in JSX is bypassable; the check belongs at `authedAction`/`requireOrgUser`.
5. **PII in logs** — emails, tokens, payloads logged where they shouldn't be.

Frame it as a five-second pass, not a security audit. Cross-reference Unit 16 for depth. Note the deliberate overlap with the pattern map (tenant filter, security baseline) and explain *why*: the same defect can sit in two layers; when it does, the *higher* layer's severity wins (a tenant-filter miss is reviewed as a security issue, not a style one). This reinforces the stack's severity ordering.

**Diagram option (optional, writer's call):** a compact HTML/CSS "scan card" — five checkboxes/rows the eye runs down — wrapped in `<Figure>`. Only build it if it reads as a useful memory aid and not redundant with the prose list; the list may suffice. If built, follow `html-css.md` margin/escaping rules.

Reasoning: a fixed short list is the most actionable form for "the things you always check," and it's the highest-stakes layer, so it earns concrete enumeration. Pinning it to Unit 16 keeps it a scan, not a re-teach.

### Same bar for every author, including the agent

The AI-code teach, stated once and folded in near the end — deliberately *not* a tools tour. When a coding agent opens a PR, the diff lands in the same queue and gets the same review. Agent failure modes have a characteristic shape: re-inventing a wrapper the codebase already has (principle #5 / pattern map), adding plausible-looking tests that don't exercise the contract (layer 4), drifting from the conventions in `AGENTS.md` (Ch102). The reviewer doesn't soften the bar and doesn't *over*-tighten it because "the AI should've gotten it right" — **same bar in both directions.** State the durable property once: the checklist works on agent code *because the principles and patterns are stable*; the discipline doesn't bifurcate by author. Symmetric watch-out: same for the trusted senior teammate's PR — "they know what they're doing" is not a review.

Reasoning: the course thesis is AI-driven development, so this must appear, but the guidelines warn that "how to direct AI" lessons age out — so the teach is the *invariance* of the bar, not anything tool-specific. One paragraph, no `VideoCallout`, no tool names beyond `AGENTS.md`.

### Consolidation exercise

A final check that the student can *run the stack on a real diff*, integrating the whole lesson. **`StateMachineWalker` (kind="decision"), titled "Where do the eyes go first?"** — a short committed walk that forces the *order* the senior asks questions in. Root question: "Open the diff — what's the first thing you verify?" Branches walk severity-first: does it do what the description claims / leak a secret / drop the tenant boundary? → if a layer-1 concern is present, the leaf is "Stop here — correctness/security is the top of the stack; this is `blocking` before anything else." If clean, advance: "does it respect the principles?" → "does it use the established pattern surface?" → "are the tests defending contract?" → "now, and only now, names and polish." Each leaf names the layer and the reflex. Include one branch that catches the wrong reflex ("the variable name on line 3 looks off" early → leaf: "that's layer 5 — you skipped four layers; reset and start at correctness"). 

Goal: the walker's whole value is the *order*, which is precisely this lesson's decision skill — the component doc explicitly calls this its best use ("the lesson lives in the order, not in any single leaf"). Keep it to ~5–6 nodes so it's a reinforcement, not a slog. No `diagram` slot needed (it's a decision tree, not a cyclic machine).

Reasoning: a committed walk is the ideal exercise for an ordered-decision skill — it literally won't let the student jump to line 3. It also closes the lesson by re-running the opening reframe ("not top-down on the file") as something the student now performs rather than reads.

### External resources (optional)

One or two `ExternalResource` cards if a current, high-quality reference exists: Conventional Comments is owned by Lesson 2 (don't preempt). A good fit here would be a well-regarded essay on code-review priorities / "what to look for in a code review" (e.g. Google's eng-practices code-review guide), and/or data on PR size vs. review effectiveness to back the ~400-line threshold. Verify currency before including (see fact-check). Keep to genuinely senior-grade sources; skip if nothing clears the bar.

---

## Scope

**Prerequisites to redefine only in one line each (do not re-teach):** the 7 architectural principles and 15 SaaS patterns — each is named with its diff signature and a link to the owning lesson; the lesson *consolidates and applies*, it does not re-explain. `tenantDb(orgId)`, `authedAction(role, schema, fn)`, `requireOrgUser()`, the `{ ok: true; data } | { ok: false; error }` Result shape, `processed_events` idempotency, `searchParams`/nuqs URL state, expand-migrate-contract — all assumed known; mentioned only as the "established surface" a diff should use.

**This lesson does NOT cover:**

- **How to phrase a comment once you've decided to leave one** — anatomy, the five severity labels (`blocking:`/`suggestion:`/`question:`/`nit:`/`praise:`), Conventional Comments, the language of disagreement, blocking-vs-suggesting, "approve vs request changes." All of that is **Lesson 2**. This lesson may use the bare word "blocking" to convey that "split this PR" and layer-1 findings hold the merge, but it does **not** teach the severity vocabulary or comment shape. Keep map-row comments as plain one-liners, not labeled severities.
- **The hands-on PR-review project** (a real seeded PR + the accompanying ADR) — **Chapter 104**. Do not build a full multi-file `CodeReview` exercise here; the consolidation exercises are lightweight (Buckets, StateMachineWalker). (A single tiny illustrative snippet for principle #7 or the tautological-test contrast is fine; a full graded PR is not.)
- **Re-teaching any principle or pattern** — they live in their owning lessons (Units 4–20); this references, never duplicates. No deep dive into RBAC, Stripe, caching, migrations, i18n, etc.
- **PR-review tooling/platform tours** — Graphite, GitHub Copilot review, CodeRabbit, Qodo, the GitHub PR UI. Out of scope; teach the posture, not the platform. AI-generated *code* review appears (same-bar framing); AI-generated *review comments* (calibrating tool noise) is a Lesson 2 topic.
- **Branching strategy, merge-queue mechanics, CODEOWNERS / review routing** — out of scope (Unit 20 owns Git mechanics; routing is team-process meta).
- **Security depth** — the five-item scan is a *scan*; the deep treatment is Unit 16. Don't expand it into a security lesson.

---

## Notes for downstream agents

- **Code conventions alignment:** all diff snippets and the tautological-test contrast must use the canonical API shapes verified against `Code conventions.md` — `tenantDb(orgId)` in the `where` clause, `authedAction(role, schema, fn)`, `requireOrgUser()` returning `{ user, orgId, role }`, the `{ ok: true; data } | { ok: false; error }` Result discriminated union, `processed_events` for webhook dedup. The "bad" side of any before/after is *deliberately* wrong (that's the point of the diff signature) — label it clearly as the violation so no one mistakes it for endorsed code.
- **Map links:** wire each map row's "owns: …" to the real lesson slug if those chapters are built; if a target chapter isn't authored yet, use prose ("see the co-location lesson in Unit 4") rather than a dead `[text](#)` link. Grep for `](#)` before shipping.
- **Component recap:** stack diagram = HTML/CSS in `<Figure>`; principle map + pattern map = Markdown tables (scannable reference, not code components); tautological-test contrast = `CodeVariants`; consolidation = `Buckets` (severity triage) + `StateMachineWalker` decision tree (the order). `<Term>` for `Drizzle`, `Server Action`. No `VideoCallout` (no topic here benefits from one — this is posture/judgment, not a demonstrable mechanic).
- **Do not** turn any section into a tools discussion or a re-teach of an owned pattern. The lesson's value is consolidation + prioritization, and it must stay terse.
