# Comment the why, not the what

- Title: Comment the why, not the what
- Sidebar label: Comment the why

## Lesson framing

Sibling to L1 (TSDoc the public surface). L1 taught the doc that lives *above a declaration* and is read *from the call site* (the contract). This lesson teaches the doc that lives *next to a line* and is read *from inside the file* (the reasoning). Same chapter thread, different surface — say so explicitly in the intro and lean on it for the boundary section.

This is a **Pattern lesson**, 30-40 min, shorter than L1. The cut is the whole teach; examples are short and load-bearing. Do not pad with syntax — `//` and `/* */` are assumed known. The payload is judgment: *when does a line earn an inline comment, and when does it not?*

Core pedagogical decisions:

- **The senior question drives the intro** (per pedagogy §2 "decisions before syntax"): most codebases get comments wrong in *both* directions at once — junior code over-comments (`// increment i`), and a reactionary "self-documenting code" creed strips comments that carried real, irreplaceable context. The lesson's cut sits between those two failures. Frame this as the same shape of problem as L1's "TSDoc everything vs TSDoc nothing" — the student has just internalized that cut, so transfer it.
- **The mental model to install:** code answers *what* and *how*; a comment exists only to answer a *why* the code physically cannot — a constraint, a workaround, a deliberate deviation, an ordering that's part of the contract. The test is a single question the student runs on every comment: *would a competent reader, looking at the code alone, ask "why is it written this way?" — and is the answer invisible in the code?* Yes to both → comment earns its place. Either no → it's noise.
- **The highest-stakes, most senior idea in this lesson is the "never strip in a refactor" rule + the promote-to-enforcement upgrade path.** This is what separates this lesson from a generic style guide and it's where the production stakes are most vivid (a stripped `// audit must commit first` comment → a bug that returns three releases later). Give it the most room. The upgrade-path framing (comment → test/type/transaction) connects directly to what the student already knows from Ch043 (Zod parse on entry, `Result`). This is the durable, AI-era-relevant skill: a comment is the *cheapest, weakest* form of structural enforcement; promote it when the type system can carry the constraint.
- **End state — what the student can do:** look at any line and decide yes/no on a comment; write the four kinds in the right voice; recognize the negative space and delete it on sight; when about to delete a `// why` in a refactor, stop and ask what it was protecting before either carrying it or upgrading it; read comment *density* as a design smell.
- **Real production stakes throughout.** Every load-bearing example is a real 2026-SaaS gotcha the student's stack actually produces: Postgres timestamp precision, Stripe webhook ordering, tenant-scoped query-plan cost, audit-before-side-effect ordering. These double as a quiet review of prior-unit material and make the *why* concretely non-obvious (the whole point — the reader can't infer it because the knowledge lives outside the file).
- **Visualization:** one diagram earns its place — the "two readers, two surfaces, two times" contrast that anchors the `// why` vs TSDoc boundary (reuses the IDE-hover mental model the student built in L1). The refactor-strip failure is best shown as a before/during/after code progression (DiagramSequence or CodeVariants), not a box diagram. Everything else is code + exercises.
- **Do NOT recycle L1's CodeReview plants** (private-helper block, `{string}` in `@param`, schema field-list duplication, bare `@deprecated`) — continuity notes flag this. This lesson's review/exercise plants are inline-comment defects: restated-code, commented-out code, bare TODO, a fossil workaround comment, a stripped load-bearing comment.
- **Exercises:** this lesson leans on classification and judgment, so the exercise spine is (1) a Buckets sort (earns / noise — the inclusion cut), (2) a custom "rewrite the what into a why or delete it" exercise (the writing posture + negative space, the active skill), and (3) a small MultipleChoice or custom decision on the promote-to-enforcement upgrade. Avoid a second CodeReview — L1 already closed on one and L3 is a review-discipline lesson; a Buckets + targeted drill is the better fit for a Pattern lesson and keeps variety across the chapter.

## Lesson sections

### Introduction (no header — frontmatter title + intro prose)

Open with the senior question framed as a concrete scene, mirroring L1's opening device (L1 opened on a caller hovering a signature; open this one *inside* a file). Suggested scene: a developer opens a function they're about to "clean up" and finds `await new Promise((r) => setTimeout(r, 50));` with no comment — they delete it as obvious cruft, and a flaky race returns in production a week later. The line *needed* a why; it didn't have one. Flip side: the same developer, in a different file, finds `// loop over the invoices` above `for (const invoice of invoices)` — pure noise.

State the cut: comments document the *why* the code can't speak; the *what* is the code's job. Name that this is the **same cut as last chapter, one level down** — link L1 ([TSDoc the public surface](/102%20docs%20that%20live%20in%20the%20code/1%20tsdoc%20the%20public%20surface/)): there the decision was which declarations earn a doc *block*; here it's which lines earn an inline *comment*. Same instinct (volume tracks value), different surface (contract read from the call site vs. reasoning read from inside the file).

Preview the payload in 3 beats: (1) a one-question inclusion test, (2) the four kinds that earn their place and the negative space that doesn't, (3) the senior reflex that makes this matter — comments are part of the code and either travel with it or get promoted to something the type system enforces. Keep warm and brief per pedagogy §3.

Include `<CourseProgressBar value={frontmatter['course-progress']} />` immediately after the intro, matching L1's pattern. Frontmatter must carry `chapter-id: 102`, a `course-progress` value (slightly above L1's 0.00005 — set ~0.00006), `tagline`, and `sidebar.order: 2`, `sidebar.label: "Comment the why"`.

### The why-not-what rule

The load-bearing inclusion test, stated as the one question the student runs forever. Phrase it as the two-part gate:

1. Would a reasonable reader, looking at the code alone, ask *"why is it written this way?"*
2. Is the answer **invisible in the code** — does it require knowledge that lives *outside this file* (a Postgres quirk, a Stripe gotcha, a deliberate ordering, a bug the workaround prevents)?

Both yes → the comment is the *only* place that knowledge can live near the line it constrains, so it earns its place. If the reader can answer the question by reading the line, the comment is noise. Make the "lives outside the file" criterion explicit — it's the sharpest discriminator and the reason the *what* never qualifies (the what is always *in* the file, by definition).

Tie back to the posture from L1 in one sentence: volume is not the goal; signal-per-line is. A `// increment counter` above `counter++` is the inline twin of a TSDoc block on a private helper — anti-value, because noise dilutes the comments that carry real context.

Show the test firing on a single contrasting pair using `CodeVariants` (two tabs, same line of code, with/without the external constraint):
- Tab "Noise" — `<div data-mark-color="red">`. A line whose comment restates it: `// add one to the retry count` above `retries += 1;`. Prose (≤6 lines, first sentence bold): the reader answered the question by reading the line; the comment carries zero information that isn't already there.
- Tab "Earns it" — `<div data-mark-color="green">`. A line that *looks* identical in shape but hides an external constraint: `// Stripe retries the webhook up to 3×; cap our own retry so the two don't compound into 9 attempts` above `retries += 1;`. Prose: the *why* lives in Stripe's behavior, outside this file — the line is unremarkable without it. Same code shape, opposite verdict, because the knowledge source differs.

Pedagogical reason for the near-identical pair: it forces the student to evaluate the *information source*, not the surface pattern — the most common failure is judging comments by length or by whether a line "looks complex" rather than by where the answer lives.

### The four kinds that earn their place

The positive space, made concrete. These four are the chapter outline's taxonomy and they map 1:1 onto the code-conventions "Allowed inline" list (runtime invariants, security/compliance notes, the reason behind a non-obvious choice that survived review) — note this alignment so downstream stays consistent with the canonical conventions doc.

Teach each kind with a one-line real-stack example. Use `AnnotatedCode` (single source block holding all four kinds in one realistic Server Action / lib function, stepping through each) **or** four short separate `Code` blocks — prefer AnnotatedCode if a single coherent ~14-line function can naturally host all four (e.g. an invoice-finalize action: a timestamp constraint, a Stripe ordering workaround, an intentional deviation from a shared helper, and a load-bearing await ordering). The single-function framing is pedagogically stronger because it shows the four kinds *coexisting in real code*, not as isolated specimens, and it sets up the density section (a function with four why-comments is exactly the smell taught later — acknowledge this tension deliberately: this is a teaching specimen, real code rarely needs all four, and density is itself a signal we return to). If one function can't host all four without feeling contrived, fall back to four `Code` blocks.

The four kinds, each named + its one-line shape:

- **The constraint comment.** External reality the code must bend to. `// Postgres truncates timestamps to microseconds; round client-side first or equality checks miss.` The constraint is outside the code; the line looks arbitrary without it.
- **The workaround comment.** Names the failure mode the workaround prevents. `// Stripe payment_intent.succeeded can fire before invoice.payment_succeeded; dedup on payment_intent_id, not arrival order.` Without it, a future reader "simplifies" the workaround and reintroduces the bug.
- **The intentional-deviation comment.** Names the path *not* taken and why. `// Not using listInvoices() here — its join doubles the query-plan cost on tenant_invoices; the narrow select is deliberate.` Pre-empts the "why didn't they just use the helper?" refactor.
- **The load-bearing-weirdness comment.** Documents an ordering or sequencing that is part of the contract. `// Order matters: the audit row must commit before the email enqueues, or a mid-transaction crash loses the audit but keeps the email.` This one is the bridge into the next two sections — it's the kind most often stripped and most promotable to enforcement, so seed it here.

For each, in one clause, name *what breaks if the comment is missing* — that consequence is what makes it a why and not a what.

### The voice of a good comment

Short subsection (could fold into the section above, but a dedicated h2 helps the student internalize the *writing posture*, which is an active skill). The reader has already read the code; the comment adds only the part the code can't show. Rules:

- Direct, declarative, one line. Names the constraint or the consequence.
- No hedging, no apology, no narration of the code's structure.
- The shape: state the external fact + the action it forces. `Stripe events can arrive out of order; dedup on event_id` — not `We need to handle the case where Stripe events might arrive in an unexpected order` (verbose, and it narrates a *situation* instead of stating the *constraint + response*).

Show the contrast with a tight before/after — `CodeVariants` two tabs (verbose/narrating vs. crisp/load-bearing) on the *same* Stripe-ordering comment. This is the single most reusable micro-skill in the lesson; make the difference visceral.

Mention the small language conventions inline here (don't give them their own section — they're qualifiers on the writing posture): single-line `//` for one-line whys; block `/* */` is reserved for TSDoc only, so multi-line prose comments use stacked `//`; sentence fragments need no terminal punctuation, full sentences get it; lowercase-first fragments are fine; match the file's existing style. Keep this to a 3-4 line list or an `Aside`, not a lecture — these are the "small ones that compound."

### What does not earn a comment

The negative space, as vivid as the positive (mirror L1's negative-space treatment — the cut only sticks when the *no* cases are concrete). Give reasons, not just a list. Maps to the code-conventions "Forbidden inline" list plus the chapter outline's broader negative space.

- **Restating the code.** `// loop over invoices` above `for (const invoice of invoices)`. The code already says it.
- **Section dividers.** `// === HELPERS ===`. If a file needs dividers, it's too long — split it. (The fix is structural, not a comment.)
- **Author/date stamps.** `// Created by Maria 2024-03-15`. `git blame` is the author tool. The comment rots; the VCS doesn't.
- **Commented-out code.** Dead code that "might be useful later" — it won't be. Delete it; `git log` is the recovery tool. This is a frequent junior reflex; name it as a definite delete, not a maybe.
- **Bare TODOs.** `// TODO: fix this`. A real TODO carries either a ticket (`// TODO(SAAS-1234): …`) or an owner + deadline. Bare TODOs accumulate forever and become archaeology. Senior pattern: prefer the issue tracker; reserve inline TODOs for in-flight work shipping *this* sprint. Note the course's own starter-stub convention as a controlled exception: `TODO(<lesson>) — <thing>` markers in lesson starter code name the lesson that builds the stub (this is the form the student will see in project chapters, so reconcile it explicitly: it has an "owner" — the lesson — and a "deadline" — when that lesson lands).
- **Fossil comments.** A comment explaining a workaround for a bug fixed three years ago. The workaround should be *removed*, and the comment with it — it now actively misleads. (Seeds the "comments can lie" idea that L3 makes structural.)

Then the active drill — this is the section's exercise. A **custom "fix the comment" exercise** is ideal here, but if no pre-built fits, use the closest pre-built. Recommended: **a `Buckets` sort first** (fast classification to lock the cut), **then** a targeted rewrite drill.

Buckets exercise (the inclusion cut, both directions):
- `twoCol`, instructions: "Sort each comment by whether it earns its place. A comment earns it only when the *why* lives outside the code."
- Two buckets: `earns` (label "Earns its place", desc "Answers a why the code can't") and `noise` (label "Noise — delete it", desc "Restates the code or rots").
- Items (~8-9, mix backticked code): earns → a Postgres-precision constraint, a Stripe-ordering workaround, an intentional-deviation note, an audit-ordering invariant; noise → `// increment i`, `// === HELPERS ===`, `// Created by ... 2024`, a commented-out line, `// TODO: fix later`.
- Pedagogical goal: the student practices the *information-source* judgment at speed, with the four kinds vs. the five noise-types side by side.

Rewrite drill (the writing posture, active production): the best fit is a small custom exercise OR a `Dropdowns` fenced-code exercise. **Proposed custom exercise** if no pre-built suffices — describe for the builder:
- *UI:* 3-4 short code snippets, each with a weak/noise comment. For each, a `<select>` or two-step choice: first "Keep / Rewrite / Delete", then for "Rewrite" pick the best replacement why-comment from 3 options (one crisp+correct, one verbose-narrating, one that states a *what* dressed as a *why*).
- *Mechanics:* grade each snippet's pair of choices; the correct path is e.g. (Delete) for `// increment i`, (Rewrite → crisp option) for a workaround that was narrated verbosely, (Keep) for an already-good constraint comment.
- *Goal/grading:* tests both the verdict (earns/noise) and the voice (crisp vs. verbose vs. fake-why). Pass = all snippets correct.
- *Fallback if custom is too heavy:* use `Dropdowns` with a fenced code block where `___` placeholders are filled by choosing the right comment (or "(no comment)") per line. This is lighter and pre-built — acceptable for a Pattern lesson. Author's call; note the preference order (custom > Dropdowns) so the builder picks the lightest thing that tests both axes.

### Where the why belongs: comment vs. TSDoc vs. ADR

The boundary section — the student now knows all three doc surfaces (TSDoc from L1, ADR from Ch101 L4, inline from this lesson), so place them on one map. This is a synthesis section; its value is preventing the student from putting the right content on the wrong surface.

The cut is **who reads it, from where, and at what scope:**
- **Inline `// why`** — *one line or block*, read by someone *inside the file*, at the *local* scope. "Why is `await sleep(50)` here?" → names the race condition, right next to it.
- **TSDoc** — the *contract of a public surface*, read by a caller *hovering at the call site*. A caller hovering a function must NOT see "we chose this algorithm because…" — that's not the contract. Reasoning behind a line belongs inline, not in the hover. (Explicitly reaffirm L1's rule that implementation rationale doesn't go in TSDoc — continuity notes require L2 not to contradict L1.)
- **ADR** — an *architectural* rationale spanning *multiple files*, read by anyone deciding *whether to revisit the decision*. "Why Drizzle?" is an ADR, never a comment on the schema file. The cut from inline is **scope**: one line vs. the whole codebase.

Visualize with the one diagram that earns its place — the **"three surfaces" contrast**, best as `TabbedContent` (3 tabs) OR a single horizontal HTML/CSS strip (3 columns). Each panel shows: the surface (inline / TSDoc-hover / ADR file), *who* reads it, *from where*, *scope*, and a one-line example of content that belongs there + one that doesn't. Reuse the IDE-hover visual idiom from L1 for the TSDoc panel for continuity. Do not wrap `TabbedContent` in `<Figure>` (it's already a card); a plain HTML strip should go in `<Figure>` with a caption. Pedagogical goal: a single glance the student can recall when they catch themselves writing rationale in the wrong place. Keep under ~360px tall (vertical-space constraint).

`Term` candidate here: **ADR** (re-gloss, since it was last seen a full chapter ago — "Architecture Decision Record; a short file capturing one architectural decision and its consequences"). Keep it to one tooltip; don't re-teach ADRs.

### Comments are part of the code

The lesson's most senior idea — give it the most weight. The rule: when a function is refactored — extracted, renamed, simplified — the `// why` comments that explained its lines must **move with the lines they explain**, never get deleted as collateral. State the failure mode in full because the stakes are the teach: a senior-written `// don't reorder these two awaits — the audit row must commit first` gets stripped when a junior tidies the function, and the bug returns three releases later, now much harder to diagnose because the warning is gone.

The senior reflex, stated as a procedure (this is the actionable payload): *if a refactor would strip a comment, first understand what the comment was preventing, then either carry the comment with the code or replace it with structural enforcement.* The mental model to install: **a comment is the cheapest and weakest form of structural enforcement** — it's a fallback used when the type system can't express the constraint. It documents that the constraint exists; it does nothing to stop you violating it.

Show the failure as a 3-step progression — `DiagramSequence` (scrub through) or `CodeVariants` (3 tabs). DiagramSequence is the better fit because it's *temporal* (before → refactor strips it → bug returns):
- Step 1 "Before": the function with the load-bearing ordering comment + the two awaits in the correct order.
- Step 2 "The refactor": a tidy-up that reorders/extracts and drops the comment as "obvious." Highlight (red) the removed comment line via `del=`.
- Step 3 "Three releases later": the reordered awaits now in the wrong order, comment gone, the audit-loss bug live. Annotate where it bites.
Pedagogical goal: make "comments are collateral in refactors" a *visceral* failure, not an abstract rule. This is the moment the student feels why the next section (promotion) matters.

### Promote the comment to enforcement when you can

The upgrade path — the natural resolution of the previous section, and the highest-leverage skill. When a comment is doing *real* work (preventing a real bug), the senior asks: *can I move this from prose to something the type system or runtime enforces?* The comment is the bridge between "the constraint exists" and "the constraint is enforced" — don't leave it as prose forever if the constraint is promotable.

Teach the three canonical promotions — and connect each to what the student already built (this is the payoff of the course's earlier units, so name the call-backs):
- **Ordering → a single transactional function.** `// audit must commit before the email enqueue` becomes one function that does both inside a transaction, in the guaranteed order — the ordering is now structural, the comment dissolves. (Connects to Ch043's thin-action / `lib` pattern.)
- **"Remember to validate" → a Zod parse.** `// validate the input first` becomes a `safeParse`/`parse` at the boundary — the validation is now enforced, not remembered. (Connects directly to Ch043 "parse on entry, every time" — the student already knows this; reframe it as a *comment promotion*.)
- **"Must be called after auth" → a typed argument.** `// only call this with an authenticated user` becomes a function that takes an authenticated-session-typed argument (or runs behind the `authedAction` wrapper from Ch043) — the precondition is now a compile error to violate, not a comment to honor.

Show one promotion end-to-end with `CodeVariants` (two tabs: "Comment" → "Enforced"):
- Tab "A comment, honored by hope" — `<div data-mark-color="orange">`. A function relying on `// remember to validate input before calling` at the call site. Prose (≤6 lines, first sentence bold): the constraint lives in prose; nothing stops a caller from skipping it. The comment is a hope, not a guarantee.
- Tab "Enforced by the type system" — `<div data-mark-color="green">`. The same logic where the input is parsed at the boundary (or the function takes a parsed/branded type), so skipping validation is now a type error. Prose: the constraint moved from prose to the compiler; the comment is gone because it's no longer needed. This is the strongest form of "documenting the why" — making the wrong thing impossible to write.

State the rule that closes the section: not every comment is promotable (a Postgres-precision constraint, a Stripe ordering fact — those *stay* comments, because no type can express an external system's behavior). The skill is recognizing the ones that *can* be promoted and doing it. Promotion is the senior move; an un-promotable why stays a well-written comment.

Small exercise here to lock the upgrade instinct — a `MultipleChoice` or short custom decision: "Which of these should be *promoted* out of a comment, and which should *stay* a comment?" with 4-5 items (promotable: validate-first, must-be-after-auth, ordering-dependent; stays: Postgres truncation, Stripe out-of-order arrival). Two correct answers auto-switches MultipleChoice to multi-select — fits well. Goal: the student can sort promotable vs. irreducible whys, which is the actual judgment call.

### Comment density is a smell

Short closing teach. The heuristic: if a function needs *three or more* `// why` comments to be understood, the function is probably doing too much or sitting on the wrong abstraction. Comments are a signal *that* something is non-obvious; their **density** is a signal of *where the design has room to improve*.

The senior reflex: when you reach for the third comment in one function, pause and ask whether to split the function or shift the abstraction *before* adding the comment. Reconcile explicitly with the four-kinds teaching specimen earlier (if that section used one function with all four kinds, call back: "remember the finalize-invoice function with four comments? In real code, that density is itself the smell — it likely wants splitting"). This honesty closes a loop the attentive student will have noticed.

Keep this section tight — it's a heuristic, not a method. One short `Code` snippet or just prose. End the section (and the lesson body) by collapsing the whole lesson into the reusable check, mirroring L1's closing move: *before you write a comment, ask whether the why lives outside the code; after you write it, ask whether it should be code instead.*

### Where to go deeper (External resources)

Optional `CardGrid` of 1-2 `ExternalResource` cards, matching L1's closing pattern. Candidates (the Resourcer will verify/replace): a well-regarded essay on the why-not-what principle (e.g. Jeff Atwood's "Coding Without Comments" / "Code Tells You How, Comments Tell You Why", or the relevant chapter framing from *A Philosophy of Software Design* by John Ousterhout on comments documenting non-obvious intent). Do not over-stuff — one or two strong, durable references. If a short, high-quality conference talk on the topic exists, a single `VideoCallout` could substitute, but prose-first; only add video if it genuinely supports a concept rather than restating it (this lesson's concepts are text-and-code-shaped, so video is low priority — leave to Resourcer's judgment).

## Scope

**This lesson covers:** the why-not-what inclusion test for inline `//` comments; the four kinds that earn a place (constraint, workaround, intentional deviation, load-bearing weirdness); the negative space (restated code, section dividers, author/date stamps, commented-out code, bare TODOs, fossil comments); the voice/writing posture and the small language conventions; the comment-vs-TSDoc-vs-ADR boundary; the "comments are part of the code, never stripped in a refactor" rule; the promote-to-enforcement upgrade path; comment density as a design smell.

**Out of scope — do not teach (owned elsewhere):**
- **TSDoc syntax, tags, and the public-surface cut** — L1 of this chapter ([TSDoc the public surface](/102%20docs%20that%20live%20in%20the%20code/1%20tsdoc%20the%20public%20surface/)). This lesson *references* TSDoc only to draw the boundary (contract-at-call-site vs. reasoning-inside-file) and must not re-teach the tag set or restate the public-surface inclusion test. Reaffirm — never contradict — L1's rule that implementation rationale stays out of TSDoc.
- **How comments get caught (or missed) in PR review; the reviewer's doc checklist; the "drifted/stale doc is worse than no doc" asymmetry made structural; the PR-template scaffolding** — all L3 ([Docs ship in the PR](/102%20docs%20that%20live%20in%20the%20code/3%20docs%20ship%20in%20the%20pr%2C%20or%20they%27re%20already%20wrong/) — verify slug live before relying on it; if unbuilt, use prose forward-reference, not a dead link). This lesson may *gesture once* that a stale comment that lies is caught at review time (seeding L3) but must not teach the review mechanics. The "fossil comment" and "comments can lie" points stop at "delete it" — the *enforcement* of catching them is L3.
- **The general PR-review skill set** — severity labels, blocking vs. suggesting, the language of disagreement — Chapter 103.
- **Issue-tracker / ticketing discipline** — out of scope. State the TODO rule (link a ticket or own a deadline) and stop; don't teach issue trackers.
- **ADR template/lifecycle** — Ch101 L4. Reference ADRs only as the *architectural-scope* end of the boundary map; re-gloss the acronym with a `Term`, don't re-teach.
- **Self-documenting-code refactoring patterns at length** — the promote-to-enforcement section teaches the *comment→enforcement* move specifically; broader refactoring-for-clarity is touched by Ch103's review framing, not here. Keep the promotion examples tight (the three canonical ones), don't expand into a refactoring catalogue.

**Prerequisites to assume (redefine only in one clause if at all):** the student knows TS+JS as one language, Zod `safeParse`/`parse` at boundaries and the "parse on entry" discipline (Ch043), the Server Action / thin-action-`lib` split and the `authedAction` wrapper (Ch043), `Result`-or-throw error handling (Ch043), Drizzle schema basics, the L1 IDE-hover mental model, and ADRs (Ch101 L4). The promote-to-enforcement examples *depend* on the Ch043 knowledge — lean on it as already-known, don't re-teach it.

## Notes for downstream agents

- **Code-conventions alignment:** the four "earns" kinds map to the canonical "Allowed inline" list (runtime invariants, security/compliance notes, reason-behind-a-non-obvious-choice-that-survived-review) and the negative space maps to "Forbidden inline" (narrating the next line, restating signatures, explaining simple code) in `Code conventions.md §Comments and inline docs`. Keep example comments consistent with that section. The course's `TODO(<lesson>) — <thing>` starter-stub form is the canonical in-repo TODO and must be reconciled (not contradicted) when teaching the "no bare TODO" rule.
- **Zod v4 form** if any schema appears: top-level builders (`z.uuid()`, `z.int()`, `z.iso.date()`), `.meta({ description })` not `.describe()` — per L1 continuity notes and conventions §Validation.
- **Stack currency:** examples should read as React 19 / Next.js 16 era; Stripe/Postgres/Drizzle gotchas used as the "external why" material are stable and safe.
- All example comments must themselves obey the lesson's own rule (no narration, crisp voice) — the lesson is judged partly by whether its own comments model the teach.
