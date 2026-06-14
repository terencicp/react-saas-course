# Docs ship in the PR, or they're already wrong

- Title (h1): Docs ship in the PR, or they're already wrong
- Sidebar label: Docs ship in the PR

---

## Lesson framing

This is the chapter's closer and the unit's closer (Ch101 named the four external artifacts; Ch102 L1/L2 taught the two internal ones — TSDoc and `// why` comments). The senior question: every doc artifact this unit named is one merge away from being silently wrong; what keeps them accurate? Answer: the doc ships in the PR that changed the thing it describes, or it's already wrong. The deliverable is a *reflex*, not a tool — at PR-open time, the senior runs one short question against six doc surfaces.

This is a **Pattern lesson** (30–40 min). The payload is small and the examples are short and load-bearing. Conclusions from brainstorming that shape the whole lesson:

- **The discipline IS the lesson.** Resist tool tours. The chapter outline names automation (eslint-plugin-tsdoc, env-parity linters, doc-drift CI like Mintlify/Dosu/BlockWatch) only to draw one boundary — lint catches *mechanical* drift, review catches *semantic* drift — and then stops. No setup walkthroughs. Spending the lesson on tools would teach the opposite of the point: the load-bearing check is a human reading the diff.
- **Make the asymmetry visceral, early.** The "already wrong" framing is the emotional core: a doc that contradicts the code is *worse than no doc* (costs the read + the time to discover it's wrong + lost trust in every nearby doc). State the economics plainly — 15 min in the PR vs. days in production. This is the *why* that makes the reflex stick; lead with it after the hook.
- **Synthesis, not new artifacts.** The student already knows all six surfaces (README, AGENTS.md, ADRs from Ch101; TSDoc, `// why` from L1/L2; `env.ts`/`.env.example` and schema headers from earlier units). This lesson teaches *when each one moves*, not what each one is. Re-glossing must be one-line; the cognitive load is the mapping, not the artifacts. Cross-link every artifact back to where it was taught so the student feels the unit closing.
- **Two roles, one reflex.** The author asks "which docs make a claim about what I just changed?" before requesting review; the reviewer runs a five-check pass on the diff. Teach both — they're the same map read from two seats. The reviewer's checklist is the author's reflex made external.
- **Mental model to leave the student with:** *the PR is the only moment of leverage.* Before it, the change is in flight; after it, the doc is wrong and nobody is looking. Every doc-drift fix is cheap in the PR and expensive everywhere else, so the PR is where the discipline has to live. The student should be able to (a) name which artifact moves with which kind of code change, (b) run the reviewer's five-check pass on a diff, and (c) tell mechanical drift (automatable) from semantic drift (review-only).
- **Where beginners get it wrong in the real world:** the "follow-up doc PR" / "docs day on Friday" / "we'll update the README before release" deferrals — all the same failure, the doc never ships. And checking the PR-template box without doing the work. Frame these as the named anti-patterns, not as a moralizing list.
- **Don't moralize the AI angle.** Per pedagogy, AI isn't named in lesson material unless the feature is AI. But the property is real and load-bearing in 2026: a stale AGENTS.md or wrong TSDoc steers a reviewing/editing agent wrong on the next change. State it once as "the doc is read by whoever (or whatever) edits next," let it land, move on. Do not build a section around it.
- **Tie off the chapter and unit explicitly** in the close — the through-line "docs live next to the truth, link don't duplicate, volume tracks value, the doc ships with the change" is the senior posture the whole unit was building toward.

---

## Lesson sections

### Introduction (no header)

Open with a concrete drift anecdote in the established L1/L2 voice (concrete scene → the cost → the cut). Use the README test command: a PR renames the test script (`pnpm test` → `pnpm test:unit` after splitting unit/e2e), all CI is green, the PR merges. Three weeks later a new contributor clones, follows the README's "run the tests" line, gets `command not found`, pings the team, loses an afternoon, and quietly trusts the README a little less. The code change was correct. The doc it invalidated shipped wrong, in the same repo, because nobody asked "what did this PR claim, and which docs make a claim about that?"

Then state the lesson's shape: this is the chapter's last lesson and the unit's last lesson. Ch101 named four artifacts that live *outside* the code; this chapter taught the two that live *inside* it ([TSDoc](/102%20docs%20that%20live%20in%20the%20code/1%20tsdoc%20the%20public%20surface/) and [`// why` comments](/102%20docs%20that%20live%20in%20the%20code/2%20comment%20the%20why,%20not%20the%20what/)). Every one of them is one merge from being wrong. This lesson is the discipline that keeps all of them accurate.

"Here's the payload" paragraph (match L1/L2 closing-of-intro pattern): one rule (the doc ships in the PR), one map (which artifact moves with which kind of change), one checklist (the reviewer's five checks), and one boundary (lint catches mechanical drift, review catches semantic drift). The deliverable is a reflex you run at PR-open time, automatic after a quarter of practice.

Include `<CourseProgressBar value={frontmatter['course-progress']} />` at the top after imports, matching L1/L2. Frontmatter `course-progress` ≈ 0.00007 (continues L1=0.00005, L2=0.00006; the build/curator pass owns the exact value).

### A wrong doc is worse than no doc

**Why first.** Before the mechanics, make the student *feel* why the PR is the line. This is the lesson's motivational spine and must come before the map — the map is only worth memorizing once the cost of getting it wrong is real.

Teach the three-part cost of a contradicting doc vs. a missing doc:
1. A missing doc costs the reader the time to go read the code instead — bounded, one-time.
2. A *wrong* doc costs them that, PLUS the time to read the doc, PLUS the time to discover it's lying (often via a bug or a failed clone), PLUS the corrosion of trust — now they don't trust the doc next to it either, so the wrong doc poisons the right ones around it.

State the economics as the closing line of the section, plainly: writing the doc update inside the PR is ~15 minutes while the change is fresh in your head; discovering a wrong doc in production is measured in days and lost trust. The asymmetry is so lopsided that "I'll do it later" is never the cheaper option — it only *feels* cheaper because the cost lands on someone else, later.

Present the cost contrast as a small two-column **`TabbedContent`** figure (tab A: "No doc", tab B: "Wrong doc"), each tab a short HTML cost-ledger (the chain of time-costs stacking up), wrapped in `<Figure>`. Pedagogical goal: make the "worse than no doc" claim land as a visual asymmetry, not just an assertion — the Wrong-doc column is visibly taller. Keep it lightweight (this is a Pattern lesson; the figure earns its place only if it makes the asymmetry instant). If the figure feels like overhead at authoring time, a plain prose contrast is an acceptable fallback — note this so the build agent can make the call.

### The rule: the doc ships in the PR that changed the thing

State the discipline as one sentence the student can repeat: **a code change that breaks a doc claim must update that doc claim in the same PR** — not the next PR, not a follow-up ticket, not "before release."

Teach the *structural* reason, which is the whole argument: code review is the only checkpoint where a human (or a reviewing agent) looks at the diff *with attention*. The next checkpoint after review is production. So a doc update that doesn't ride along with its code change has exactly one more chance to be noticed (review of a *separate* PR, if anyone connects them) before it's wrong in production. The PR is the moment of leverage — the only place the change and the docs that describe it are in front of someone at the same time.

Name the drift window explicitly: even a doc update shipped in a *separate, immediately-following* PR opens a window between the two merges where main is self-contradictory. On a team with CI deploying main, that window is a live wrong-doc in production. Same-PR is the only width-zero option.

This section is short — it's the thesis, stated and justified. The next two sections operationalize it (what to update, how to catch it).

### The doc-change map: which artifact moves with which change

The core teaching of the lesson. The senior reflex when opening a PR: for each doc surface, ask *did this diff invalidate a claim that surface makes?* The list is short and the same every PR, which is exactly why it becomes automatic.

Present the seven surfaces as the map. For each: the trigger (what kind of change moves it) and the "usually doesn't move" case, so the student learns the *cut*, not just a checklist — most PRs touch only one or two of these, and knowing which to skip is as much the skill as knowing which to update.

- **README** — moves only when the local-dev sequence changes, a common-task command changes (the opening anecdote), or a major stack swap happens. Most feature PRs don't touch it. (Link: Ch101 [The thin README](/101%20docs%20that%20live%20next%20to%20the%20truth/2%20the%20thin%20readme/).)
- **AGENTS.md** — moves when a convention shifts (a new "don't" rule, a new module added to the repo layout, a build/test command renamed, a tool added to the stack). Feature PRs rarely; refactor and infra PRs often. (Link: Ch101 AGENTS.md lesson.)
- **ADRs** — a *new* ADR is added in the PR that ships an architectural decision (Ch101's three-test inclusion); an existing ADR's status flips to "superseded" in the PR that overturns it. Both happen in the deciding PR, never after. (Link: Ch101 [ADRs — one decision per file](/101%20docs%20that%20live%20next%20to%20the%20truth/4%20adrs%20-%20one%20decision%20per%20file/).)
- **TSDoc** — moves when an exported function's signature, contract, side effects, or failure modes change: adding `@throws`, updating `@param`, marking `@deprecated`, refreshing the summary sentence. All in the PR that changed the code. (Link: L1.)
- **Inline `// why` comments** — move when the *why* changes: the underlying constraint was fixed (the comment is now a fossil — delete it, the handoff L2 left open), the workaround is no longer needed, or the constraint got promoted to enforcement (the comment dies, replaced by the type/test/transaction). The comment travels with the lines it explains or dies with them. (Link: L2.)
- **Schema header comments** — the one-paragraph `pgTable` header updates when the table's *purpose, scope, or invariants* change. A new column usually doesn't trigger it; a new *invariant* does. (Link: Ch101 schema-as-reference / the schema-header pattern.)
- **`.env.example`** — updates whenever `env.ts` adds, removes, or renames a key. The two files are siblings and ship together; an `env.ts` change without a matching `.env.example` change is an incomplete PR. (Link: the env-schema lesson, [Type-safe env vars](/041%20project%20-%20the%20org-scoped%20invoicing%20data%20layer/2%20type-safe%20env%20vars/) or [The env schema](/081%20the%20security%20baseline/7%20the%20env%20schema/) — build agent picks whichever slug is canonical for `@t3-oss/env-nextjs` + Zod `env.ts`.)

**Diagram (primary visual of the lesson):** a **decision-style mapping** rendered as a Mermaid `flowchart LR` (per diagrams INDEX: decision tree / flowchart → Mermaid `flowchart LR`), wrapped in `<Figure>`. Left column: kinds of code change ("renamed a command", "added/renamed an env var", "changed an exported signature", "made an architectural decision", "added a `// why` constraint", "changed a table's invariant", "added a convention/new module"). Right column: the doc artifact(s) each one moves. Edges connect change → artifact. Pedagogical goal: compress the seven-bullet map into one glanceable picture the student can recall at PR-open time — the figure *is* the reflex in visual form. Keep horizontal (vertical-space constraint) and cap height. If the bipartite edge crossings get noisy in Mermaid, fall back to a clean two-column HTML table-figure (change | artifact) — note this so the build agent picks the cleaner render.

**Exercise — `Matching`** at the end of this section. Left column: code-change descriptions; right column: the doc artifact that must move. Pedagogical goal: drill the map as a recall task (the lesson's payload is exactly this association). ~6 pairs drawn from the seven surfaces — e.g. "Renamed `getInvoice` and added a `@throws` case" → TSDoc; "Added `RESEND_API_KEY` to `env.ts`" → `.env.example`; "Decided to move from polling to webhooks" → new ADR; "Deleted a `setTimeout` whose race was fixed upstream" → the `// why` fossil comment; "Renamed the lint command" → AGENTS.md; "Added a `unique` constraint expressing a new tenant invariant" → schema header. Include one deliberately-tempting near-miss (e.g. "Added a nullable column for a feature flag" → *no doc moves* — a plain column add, only a new invariant moves the schema header) to test the *cut*, if the Matching component supports a "no match needed" target; if not, keep all six as true pairs and surface the near-miss as a one-line aside instead.

### The reviewer's doc checklist

Flip the seat. The author's reflex (previous section) becomes the reviewer's pass: five concrete checks to run against any diff. Frame as "the same map, read from the reviewer's chair" — the reviewer is the structural enforcement L1 and L2 kept deferring to this lesson.

The five checks, as a numbered `<Steps>` list (a procedure the reviewer follows in order):
1. Did any exported function's signature, contract, or throw-set change? → did its TSDoc update?
2. Did any env var get added or renamed? → did `env.ts` *and* `.env.example` both update?
3. Did any convention or repo-layout fact change? → did AGENTS.md update?
4. Did this PR make an architectural decision, or overturn one? → is there a new ADR, or a status-flip on the old one?
5. Was a comment stripped in a refactor? → was the constraint it protected either preserved in a moved comment or upgraded to enforcement (the L2 "make the bug hard to write" path)?

Stress that check 5 is the subtle one and the reason "comments are part of the code" (L2) matters at review time: a reviewer scanning a refactor diff has to notice the *absence* of a comment that was there before — the hardest thing to spot in a diff, and the one most likely to reintroduce a bug. Tie back to L2's sleep/race anecdote: this is the checkpoint where that deletion gets caught.

**Capstone exercise — `CodeReview`.** This is the lesson's main interactive payload and the natural assessment for a PR-discipline lesson (the exercise *is* a PR review). Multi-file diff; the student leaves inline comments; the AI grades each against the `kernel`. Plant 3–4 doc-drift defects, each a different surface from the checklist, so the student exercises the whole map:
- A renamed/changed exported function whose **TSDoc summary or `@throws` is now stale** (signature changed, doc didn't).
- An `env.ts` diff that adds a key with **no matching `.env.example` line** (env-parity drift).
- A refactor that **strips a load-bearing `// why` comment** (the L2 carry-the-comment rule; the constraint silently lost).
- Optionally a PR that **makes an architectural decision** (e.g. introduces a new cross-cutting pattern) with **no ADR** added.

**Critical constraint from continuity notes:** L1's CodeReview capstone already plants (private-helper TSDoc block, `{string}` in `@param`, schema field-list duplication, bare `@deprecated`) and L2 used a `finalizeInvoice` density-smell specimen. This lesson's plants MUST be *drift* defects (doc-no-longer-matches-code, doc-missing-for-a-change), NOT *authoring* defects (wrong tag, noisy block). The distinction is the whole point: L1/L2 taught how to write a good doc; L3 teaches catching a doc that *went* wrong. Do not recycle the four L1 plants or the `finalizeInvoice` specimen. `kernel` phrases name the drift, e.g. "TSDoc `@throws` no longer matches the function's error paths", "`env.ts` gained a key but `.env.example` wasn't updated", "refactor dropped a load-bearing ordering comment without preserving the constraint". Keep code windows small (the grader sees only a window around each plant). Add a `<ReviewWhy>` debrief tying the catches back to the five-check pass.

### Where automation stops and review begins

Draw the one boundary the chapter outline insists on, then stop. This section exists to *prevent* the student from believing tooling solves doc drift — a common junior over-correction ("just add a CI check").

Teach the split with concrete examples on each side, no setup instructions:
- **Mechanical drift — automatable.** A `.env.example`-vs-`env.ts` key-parity check (the two files must declare the same keys); `eslint-plugin-tsdoc` flagging a malformed tag or a `@param` naming an argument that no longer exists; tests that import a Server Action and exercise its success/failure paths, failing when the contract changes. These catch *structural* mismatches a machine can compare.
- **Semantic drift — review-only.** Does the TSDoc *summary sentence* still describe what the function does? Does the README's "getting started" prose still match the actual steps? Is the `// why` comment still *true*, or is it a fossil for a bug that's fixed? Did the new behavior warrant an ADR? No linter can read intent against behavior — only a reviewer can.

State the threshold as the section's takeaway: **lint catches the drift a machine can compare; the reviewer catches the drift only a human can read.** Name (one sentence, no tour) that doc-drift CI products exist and that the boundary is the same — they automate the mechanical class and surface candidates, but the semantic check stays human. Do not demo or configure any of them; the chapter outline scopes this out explicitly.

Mention the env-parity check by name as the cleanest concrete example because it's the one drift class that's *purely* mechanical (key sets must be equal) — a good anchor for "this is what automatable means."

### Move the reflex into the workflow

The lightweight scaffolding that makes the discipline survive contact with a busy team. Two mechanisms, both stated briefly (this is a Pattern lesson — the scaffolding supports the reflex, it isn't the teach).

**The PR template.** A short template with two checkboxes the author ticks before requesting review: *I updated the docs affected by this change* and *if I added or renamed a dependency or env var, the README / AGENTS.md / `env.ts` / `.env.example` are updated to match.* Show it as a tiny `Code` block (markdown, a real `.github/pull_request_template.md` snippet). Pedagogical goal: the template forces the author's eyes across the doc surfaces at the exact moment of leverage, and gives the reviewer a thing to verify. Two lines, not an essay — a long template gets ignored.

Name the failure mode honestly (the watch-out, inline where it belongs): checking the box without doing the work. The template is a *prompt*, not enforcement; the reviewer's five-check pass (previous section) is what actually catches a lied-to checkbox. State that the box and the checklist are two halves of one mechanism — author-side prompt, reviewer-side verification.

**The quarterly meta-doc review.** Some docs rot without any single PR touching them — the README's "getting started" sequence and the AGENTS.md conventions list drift slowly as a dozen small changes each leave them *slightly* off. The structural counter is a cadence, not a PR: every quarter (or so), someone follows the README from a clean clone and notes every deviation; same for the AGENTS.md conventions. State the cadence once and the reason (per-PR review can't catch rot that no single PR causes), and name the anti-pattern: the quarterly review becoming "everyone's too busy" — the cadence has to be defended like any other recurring engineering chore, or the meta-docs silently rot.

**`<Term>` / one-line note** the conventional-commits connection if it fits naturally: if the team uses conventional commits, a one-line note in the commit body can flag that the PR touched docs and changelog generation picks it up — useful, not load-bearing, the discipline is the PR review not the commit prefix. State once, move on; do not expand.

### The reflex, and the unit it closes

The close. Two jobs: crystallize the reflex into one repeatable question, and tie off the chapter and the unit.

State the senior reflex as the one-liner to carry out of the lesson: before requesting review, ask *"what did this PR claim, and which docs make a claim about that?"* — the list is the same seven surfaces every time, and after a quarter of practice the question fires automatically. That single question is the lesson's entire payload; everything else (the map, the checklist, the boundary, the template) is scaffolding around it.

Then tie off the unit explicitly — this is the last lesson of the documentation unit. The through-line the whole unit built: docs live *next to* the truth (Ch101), you *link* instead of duplicating so they can't drift (Ch101 + L1), *volume tracks value* so the signal isn't drowned (L1 public-surface cut, L2 why-not-what), and — the lock on all of it — *the doc ships with the change that affects it, or it's already wrong* (this lesson). The first three keep docs worth reading; the last keeps them true. Without this lesson the other three decay; with it they compound.

Land the one durable property without moralizing: in 2026 a repo's docs are read by whoever — or whatever — edits it next; a wrong AGENTS.md or a stale TSDoc steers the next change wrong before a human ever sees it. That raises the stakes on accuracy but doesn't change the discipline — the discipline is the same one a careful team has always run, now just non-optional. One or two sentences; do not build it out.

### External resources (optional)

Optional `ExternalResource` cards if a high-quality, current source exists: GitHub's docs on PR templates (`.github/pull_request_template.md`), the TSDoc site (already linked in L1 — skip if redundant), or the Conventional Commits spec for the changelog note. Keep to 1–2; this is a discipline lesson, not a tool lesson, and the body shouldn't send the student off to configure tools. No YouTube embed planned — there is no syntax or visual mechanic here that video conveys better than the diagram + the CodeReview exercise; a talking-head on "update your docs" would be filler. Note this decision so the resourcer doesn't force one.

---

## Components and figures summary

- **`<Figure>` + `TabbedContent`** — the no-doc-vs-wrong-doc cost-ledger asymmetry (motivational; prose fallback acceptable).
- **`<Figure>` + Mermaid `flowchart LR`** — the doc-change map (change → artifact); primary visual; HTML two-column table fallback if edges get noisy.
- **`<Steps>`** — the reviewer's five-check pass.
- **`Code`** — the two-line PR-template snippet (markdown).
- **`Matching`** — drill the doc-change map (~6 pairs + one near-miss).
- **`CodeReview` + `ReviewFile` + `ReviewIssue` + `ReviewWhy`** — capstone; 3–4 *drift* plants across distinct surfaces (NOT authoring plants; do not recycle L1/L2 plants/specimens).
- **`<Term>`** — see term list below.
- **`ExternalResource`** — 1–2 optional cards.

## Terms for `<Term>` tooltips

Re-gloss prerequisite concepts inline without breaking flow; be strategic, only what supports this lesson:
- **ADR** — "Architecture Decision Record; a short file capturing one architectural decision and its consequences." (re-gloss, as L2 did — it's central to two sections here).
- **drift** — "when a doc and the code it describes fall out of sync; the doc still asserts something that's no longer true." (the lesson's core noun; gloss on first use).
- **fossil comment** — "a `// why` comment explaining a workaround for a bug since fixed; now actively misleading." (carried from L2; gloss on reuse in the doc-change map).
- **`@t3-oss/env-nextjs`** — only if `env.ts` is mentioned without a link nearby; "the library that validates environment variables against a Zod schema at build time in `env.ts`." (skip if the env-schema lesson is linked at that point — the link carries it).
- **conventional commits** — "a commit-message convention (`feat:`, `fix:`…) that tools parse to auto-generate changelogs." (only if the changelog note is included).

Do NOT gloss: PR, README, TSDoc (defined in L1, linked), CI, lint — assume known or carried by links.

---

## Scope

**Prerequisites to redefine in one line only (do not re-teach):**
- The four external artifacts (README, AGENTS.md, ADRs, source-as-reference) — Ch101; link, one-line each in the map.
- TSDoc public-surface cut and the five-tag set — L1; link, don't re-teach. The map only needs "TSDoc moves when the contract changes."
- The why-not-what rule, the four comment kinds, fossil comments, the "comments are part of the code / promote to enforcement" rule — L2; link. The map and check 5 *use* these; they don't re-derive them.
- `env.ts` + `.env.example` as siblings validated by `@t3-oss/env-nextjs` + Zod — earlier units; link, one line.
- The `pgTable` schema-header pattern — Ch101; link, one line.

**Explicitly NOT in this lesson (defer or omit):**
- TSDoc/inline-comment *authoring* judgment — that's L1/L2; this lesson is about keeping already-authored docs *accurate*, a strictly different skill. The CodeReview plants enforce this boundary (drift, not authoring).
- The PR-review *skills* themselves — suggesting vs. blocking, the language of disagreement/blocking, how to phrase a review comment — **Chapter 103**. This lesson teaches *which* doc checks a reviewer runs, not *how* to conduct a review or word a block. When the "incomplete PR gets blocked" idea comes up (the doc-only-PR anti-pattern), name that blocking is the mechanism and point forward to Ch103 for the *how*; do not teach blocking technique here.
- Doc-drift CI tooling tours (Mintlify, Dosu, BlockWatch) and changelog-generation tooling — named once at the boundary, no setup, no demo.
- `eslint-plugin-tsdoc` / env-parity-linter *configuration* — named as examples of the mechanical class only; no setup steps (consistent with L1/L2 cuts).
- New-hire onboarding workflow as a topic — out of scope; the quarterly meta-doc review borrows the same surfaces but is framed as rot-detection, not onboarding.
- Versioned docs for published SDKs / TypeDoc HTML generation — out of scope; the course's surface is closed-source SaaS (threshold already stated in L1).
- Self-documenting-code refactoring patterns at length — touched only via L2's "promote to enforcement"; the depth is Ch103's code-review territory.

**Handoff to Chapter 103:** this lesson hands the reviewer's *doc-specific* checklist and the "incomplete PR" framing to Ch103, which owns general code review (what to look for beyond docs, suggesting vs. blocking, review tone). Phrase forward-references as "the language of blocking is the next chapter's subject" without teaching it.

## Code conventions notes

Aligned with `Code conventions.md` § Comments and inline docs and § Security baseline:
- TODO form in any starter/example code: `TODO(<lesson>) — <thing>`. Bare TODOs are the forbidden form the map/checklist treats as drift-adjacent (L2 owns the rule; don't re-teach).
- `env.ts` is the canonical env source via `@t3-oss/env-nextjs` + Zod; `.env.example` is its sibling. Missing `DATABASE_URL` fails `pnpm build` — useful as the "env is validated, but `.env.example` is just a hint file that drifts silently" contrast (the build catches a *missing* var, nothing catches a *stale example*; that's why it's on the human checklist).
- Webhook replay/idempotency via the `processed_events(provider, event_id)` ledger — if a webhook-handler example is used in a plant, match this shape, don't invent an ad-hoc dedup.
- The conventions doc lists `@see` in the TSDoc tag set; L1 deliberately taught a five-tag working set *without* `@see`. Follow L1 (the narrower set) in any TSDoc shown here — this is a deliberate course-level simplification, not an error.
- PR template lives at `.github/pull_request_template.md` (GitHub's canonical path) — use this exact path in the snippet.

Deliberate pedagogical divergences to flag for downstream agents: code samples in plants/snippets are deliberately *small windows* (not full files) — the CodeReview grader only sees a window, and the lesson's focus is the drift, not the surrounding code. This is intentional, not under-specification.
