## Concept 1 — Diataxis as a 2x2, not a folder structure

**Why it's hard.** Students hear "Diataxis" and reach for four folders. The vocabulary's actual job is to separate two *axes* (learning vs. doing, action vs. cognition) that, when collapsed, produce the unreadable mixed-purpose docs they've seen in every job. Without the axes, the four names are just buckets.

**Ideal teaching artifact.** A static 2x2 quadrant figure with the two axes labeled (acquisition–application on one axis, action–cognition on the other), each quadrant named (tutorial, how-to, reference, explanation) and anchored with one concrete artifact a 2026 SaaS repo already ships (README "Getting started," `AGENTS.md` "Common tasks," Drizzle schema file, ADR file). This is a **Concept** artifact — the diagram is the lesson; the student walks each quadrant once and reads the axis-pair that defines it. The first encounter is deliberately abstract because the rest of the chapter pins every concrete artifact back to one of these four quadrants.

**Engagement.** A four-item `Matching` drill after the figure: match each Diataxis type to the SaaS artifact that owns it (tutorial → README "Getting started," how-to → `AGENTS.md` "Common tasks," reference → schema/`env.ts`/TSDoc, explanation → ADR).

**Components.**
- `Figure` wrapping a hand-authored SVG quadrant — two perpendicular axes with labels, four quadrants with type name + one anchor artifact each. Static layout carries the meaning; the axes are the lesson.
- `Matching` for the recall pass.
- Alternative if the quadrant ever feels under-leveraged: a bespoke `DiataxisQuadrant` widget where the student drags artifact cards onto the quadrant they belong in. Demoted because the `Matching` + `Figure` combination teaches the same thing and the quadrant doesn't recur.

---

## Concept 2 — The mixing trap: why most READMEs fail

**Why it's hard.** The student has read hundreds of READMEs that opened with install steps, then how-tos, then env vars, then philosophy. They've absorbed this as *the* shape of a README. Until they see the four types *colored in over a real bloated file*, the abstract critique from Concept 1 doesn't land — they can't see the seam.

**Ideal teaching artifact.** A real-looking 350-line README displayed inline, with each section the student can click to label its Diataxis type. Wrong picks reveal "this paragraph is doing two jobs at once" — for example, an "Architecture" section that opens with explanation and slides into reference. This is a **diagnostic ambush** archetype: the student sees a doc that looks normal, discovers it's four documents wearing one trench coat, and the misconception about "comprehensive READMEs" breaks before the chapter prescribes the fix. The teaching move is to let the student do the labeling themselves rather than narrate the failure.

**Engagement.** The labeling pass *is* the assessment. Follow with a single-line debrief: count how many quadrants appeared in the file (four, always four for a typical "comprehensive" README) — and one `MultipleChoice` confirming the senior reflex ("when a section is doing two jobs, the fix is to split it across two files, not to rewrite it more clearly").

**Components.**
- `Tokens` over a markdown code block — pre-highlight each README section as a clickable target; correct labels are the four Diataxis types, decoys are "this section does two jobs." This is a slight repurposing of `Tokens` (built for code identification) but the underlying interaction — click pre-highlighted spans, get feedback — is exactly the affordance needed, and the markdown is rendered inside a `Code` block.
- `MultipleChoice` for the senior-reflex confirmation.
- Alternative: a bespoke `DocMixingDiagnostic` component showing the README with a sidebar quadrant that lights up as the student labels. Demoted — `Tokens` carries this and the bespoke version would be single-use.

---

## Concept 3 — Docs live next to the truth they describe

**Why it's hard.** This is the chapter's structural thesis and the hardest mental flip in the unit. The student's habit is "write a data-model doc when shipping a data model." The senior reflex is "the schema file IS the data-model doc; write a one-paragraph header per table and link from the README." Until the student sees a paraphrased doc *drift* on a real schema change, the rule reads as stylistic preference instead of as structural enforcement.

**Ideal teaching artifact.** A scrubbable time-travel sequence: at step 1, a schema with `invoices` table and a README paragraph listing its columns (paraphrased). At step 2, a PR adds a `cancelledAt` column to the schema. At step 3, the schema-as-doc is automatically correct (the column is right there in the file) while the README paragraph is now subtly wrong. At step 4, six months later, a new hire reads the README and ships a bug. The student scrubs forward and watches the divergence open. This is a **time-travel-as-proof** archetype — the structural argument made visible by playing the tape forward.

A second beat seals it: a worked example of the senior pattern — a Drizzle schema file with one paragraph of TSDoc per table, shown inline, with the README's "where the docs live" section reduced to a five-link list. The student sees both halves of the rule (the truth-owning file gets the explanatory header; the README links and stops).

**Engagement.** A `Buckets` drill — twelve documentation candidates (column types, env var defaults, Server Action error shapes, webhook contract, deploy command, decision rationale, etc.) sorted into "lives in the schema file," "lives in `env.ts`," "lives in the Server Action's TSDoc," "lives in the README," "lives in `AGENTS.md`," "lives in an ADR." The sort is the test of whether the student internalized the home-for-each-job map.

**Components.**
- `DiagramSequence` for the time-travel sequence — four steps, each step a small `Figure` showing schema, README paragraph, and a status badge ("in sync" / "drifted").
- `Code` block with TSDoc-annotated schema for the worked-example beat.
- `Buckets` (six-column variant if supported, otherwise two passes) for the recall sort.
- Alternative: a bespoke `DriftSimulator` that lets the student edit the schema and watches the README go stale in real time. Demoted — the four-step sequence makes the same point without the build cost, and the simulator would be single-use.

---

## Concept 4 — The thin README and what does not belong

**Why it's hard.** The student's instinct, once told "the README is for first contact," is to keep adding sections "just in case the reader needs them." The five-section template is easy; the *deletion discipline* is hard. They need to see a bloated README cut down in front of them and the cut-out content land in its correct home elsewhere.

**Ideal teaching artifact.** A before/after surgical reduction: the bloated README from Concept 2, shown next to its trimmed five-section successor. Each removed block animates (or annotates) to its new home — the env var list flies to `env.ts`, the architecture rationale flies to `/docs/adr/0001`, the contribution conventions fly to `AGENTS.md`, the schema column list flies to the schema file. This is a **redistribution diagram** — the student sees that nothing was lost, only rehomed. The five-section template is a small `Code` block of the slimmed README inline; the redistribution is the teaching.

**Engagement.** The student is given six candidate paragraphs ("we use Postgres because…," `DATABASE_URL` required, `pnpm test` runs the suite, the user table has these columns, our PR review process, project license) and decides for each: *keep in README* or *send where*. Form: a `Buckets` sort with the README and four destinations.

**Components.**
- `Figure` with a hand-authored before/after SVG showing the README sections and arrows pointing each cut block to its new home. The arrows are the lesson — they make the "no information lost, only relocated" point structurally.
- `Code` for the five-section template.
- `Buckets` for the relocation drill.
- Alternative: an `ArrowDiagram` if the redistribution can be expressed cleanly as boxes-and-arrows. Worth trying first; the hand-SVG fallback is for when the layout needs more compositional control than `ArrowDiagram` gives.

---

## Concept 5 — AGENTS.md: two audiences, one file

**Why it's hard.** Two failure modes pull in opposite directions. One: the student treats `AGENTS.md` as an agent-only file with agent-specific syntax. Two: the student treats it as a CONTRIBUTING.md and pads it with process essays. The 2026 norm — plain markdown briefing both audiences with signal-per-line, *bounded* against the README and ADRs — is a balance the student has to feel by reading a good one.

**Ideal teaching artifact.** The course repo's own `AGENTS.md` (or a stack-realistic sibling) as a real-artifact replica, displayed in full with each canonical section labeled. Then a side-by-side boundary diagram: three columns labeled README / AGENTS.md / ADRs, and a ten-item list of facts each column owns ("how to run dev server," "we use Drizzle for all DB access," "why we chose Drizzle over Prisma," etc.). The student reads the real file *and* the boundary explicitly. This is a **real-artifact-plus-boundary-map** archetype — concrete artifact for the shape, abstract map for the discipline.

**Engagement.** A `TrueFalse` round of eight statements probing the three-way boundary ("the env var list belongs in AGENTS.md" — false; "the conventional commits prefixes belong in AGENTS.md" — true if used; "the rationale for choosing Drizzle belongs in AGENTS.md" — false, it goes in the ADR). Each card debriefs with the boundary rule it tests.

**Components.**
- `Code` block (with `CodeTooltips` on section headers) showing the real AGENTS.md — tooltips explain what each section's "inclusion test" was.
- `Figure` with a three-column hand-SVG boundary map (README / AGENTS.md / ADR) with example facts in each column.
- `TrueFalse` for the recall round.
- Alternative: a bespoke `DocBoundaryDecider` interactive where the student types a fact and the widget routes it to the right file. Demoted — `TrueFalse` plus the boundary `Figure` carries the same teaching without the build cost.

---

## Concept 6 — The Nygard ADR template, anatomically

**Why it's hard.** The student will read the five section names (Title, Status, Context, Decision, Consequences) and skim them. What they need to internalize is the *posture* of each section: Title is a noun phrase not a question, Status is a single word with a defined lifecycle, Context names the alternatives that existed, Decision is one declarative sentence, Consequences enumerates costs *and* upsides. Each section has a failure mode (hedged Decision, empty Consequences, "Coding conventions" as Title) that the anatomy walk has to surface.

**Ideal teaching artifact.** A worked ADR — `0001-use-drizzle-not-prisma.md` in full — shown as a stepped walkthrough where each section highlights in turn, and the accompanying prose names what makes that section good *and* the most common way it goes wrong. This is a textbook **AnnotatedCode** use: one artifact, five focused stops, the failure mode named at each stop. The student leaves having read a real ADR and knowing where the section-specific traps lie.

**Engagement.** A `CodeReview`-style exercise on a deliberately-broken ADR: hedged Decision ("we are considering Drizzle"), empty Consequences ("we don't see any downsides"), Title as a question ("Should we use Drizzle?"). The student leaves three inline comments naming the section and the failure mode. The AI rubric matches each comment against a one-phrase kernel ("hedged Decision," "empty Consequences," "Title is a question").

**Components.**
- `AnnotatedCode` over the worked `0001-use-drizzle-not-prisma.md` — five steps, one per Nygard section, with prose calling out the posture and failure mode at each.
- `CodeReview` for the broken-ADR diagnostic.
- Project link below covers the forward reuse.

**Project link.** Chapter 22.4 has the student write `0007-cache-entitlement-reads-with-cacheTag.md` from scratch in the seeded PR project. The anatomy walk and the broken-ADR review here are the rehearsal — when 22.4 says "write a crisp Decision line, an honest Consequences list," the student has already practiced spotting both failure modes.

---

## Concept 7 — The three-test inclusion check

**Why it's hard.** Without a test, the student either ADRs nothing (because they're not sure what qualifies) or ADRs everything (because they remember the chapter said decisions matter). The three-test cut — affects multiple files/PRs, reasonable engineers could pick differently, reversing costs more than one PR — is the gate that produces a maintainable `/docs/adr/` folder instead of a sprawl.

**Ideal teaching artifact.** A guided puzzle: ten candidate decisions presented one at a time ("use Drizzle," "rename `uid` to `userId`," "bump Tailwind from v4.0 to v4.1," "switch from Server Actions to tRPC," "use single quotes in JS files," "adopt Better Auth," "use Cloudflare R2 for uploads," "extract a `formatCurrency` helper," "move the user table's `email` to citext," "adopt Conventional Commits"). For each, the student predicts ADR-yes/no, then sees the three-test verdict applied. This is a **prediction-then-rule** archetype — the prediction commits the student before the rule arrives, which is when the rule sticks. Forward in the chapter and into Chapter 22.4 the same three-test check fires on the seeded PR's candidate decisions, so the student has done it ten times before doing it for real.

**Engagement.** The ten-round prediction sequence *is* the assessment. Follow with a single `MultipleChoice` asking "which of these test results is the most common reason a candidate fails the inclusion check" (answer: "reversible in one PR by one engineer") to lock the dominant failure mode.

**Components.**
- A sequence of ten `PredictOutput`-style cards repurposed for binary prediction ("ADR-worthy? yes/no"), each followed by the three-test reveal. A cleaner alternative is `TrueFalse` framed as "ADR-worthy: yes / no" with the reveal-card showing the three-test verdict — `TrueFalse` already supports per-card debrief, so this fits without modification.
- `MultipleChoice` for the failure-mode lock.
- Alternative: a bespoke `ADRInclusionRunner` showing the three checkboxes filling in for each candidate. Demoted — `TrueFalse`'s per-card debrief carries the reveal and the bespoke version would be single-use.

**Project link.** Chapter 22.4.4 runs the three-test inclusion check across the seeded PR's candidate decisions before writing ADR 0007. The student has rehearsed the test ten times here, so the project's "run the check" step is recall, not first contact.

---

## Concept 8 — Write the ADR while deciding (and supersede in place)

**Why it's hard.** The student will hear "write the ADR while deciding" and nod, then six months later try to reconstruct one from memory and produce a sanitized fiction. The structural argument — compression starts within a week, alternatives get rationalized within a month, the document drifts from reality if it isn't written *in the PR that ships the decision* — has to be made visible. Likewise, supersession-in-place (the older ADR's status updates to "superseded by ADR 0019"; the file is never deleted) is counterintuitive to anyone trained to delete stale things.

**Ideal teaching artifact.** A scrubbable timeline of the `/docs/adr/` folder over eighteen months. T0: empty. T1: PR #42 adds Drizzle to the codebase and `0001-use-drizzle-not-prisma.md` in the same commit, status "accepted." T6 months: more ADRs accumulate. T12 months: a "let's switch to Prisma" discussion in Slack — but no ADR is written, and the conversation evaporates. T18 months: a new senior arrives and finds the codebase, walks the ADR folder, has full context. Then a contrast track: same codebase, but the team writes the ADR three months after the decision. Side-by-side, the second track's ADR has hedged language, missing alternatives, vague Consequences. The **time-travel-as-proof** archetype again, but here the proof is about *timing*, not drift.

A second beat for supersession: the student sees ADR 0001 (Drizzle) at T18 months, and a new ADR 0019 (replace Drizzle with X) shipping. The student watches 0001's Status field flip from "accepted" to "superseded by ADR 0019" — and 0001's body stays intact. The "never delete, supersede" rule has to be seen on a file to land.

**Engagement.** A `Sequence` ordering drill — the student orders eight events for a hypothetical "adopt Cloudflare R2" decision: the Slack discussion, the spike PR, the ADR draft (status "proposed"), the team review, the ADR merge (status "accepted") *with* the production PR, the deployment, the six-months-later check-in, a hypothetical future supersession. The correct order is the one where the ADR ships in the same PR as the decision, not before or after.

**Components.**
- `DiagramSequence` for the eighteen-month timeline with the two tracks (write-while-deciding vs. reconstruct-later).
- `Figure` with a small two-state SVG showing ADR 0001's Status field before/after supersession.
- `Sequence` for the ordering drill.
- Alternative: a bespoke `ADRLifecycleScrubber` with branching tracks. Demoted — `DiagramSequence` with two side-by-side scrubbable panels (one per track) is enough, and the bespoke version would be single-use.

**Project link.** Chapter 22.4.4 has the student write ADR 0007 *as part of the same review pass* as the PR comments, modeling the write-while-deciding discipline on a real (seeded) PR. The contrast track in the timeline here makes that discipline non-optional by the time the project lands.

---

## Concept 9 — The six course-stack ADRs as worked examples

**Why it's hard.** The Nygard form is empty calories without seeing it applied to decisions the student already knows have stakes. The six course picks — Drizzle, Better Auth, Biome, R2, Node runtime, native forms — are exactly the decisions the student has been living with for twenty units; seeing each one written up as an ADR retroactively grounds the form on choices whose trade-offs they already feel.

**Ideal teaching artifact.** A tabbed worked-examples gallery, one tab per decision. Each tab shows a one-paragraph ADR sketch — Context (the constraints that forced the choice), Decision (one declarative sentence), Consequences (three to five bullet trade-offs, honest about costs). The tabs themselves are the chapter's payoff: the student clicks Drizzle, reads the sketch, sees the alternative named (Prisma), sees the costs accepted (manual relation typing, smaller ecosystem). They click R2, see "zero egress" as the win and "newer ecosystem than S3" as the cost. This is a **reference-as-payoff** archetype — the gallery is light to consume but each tab is dense with senior reasoning. The structural choice is to keep each ADR sketched not full so the student sees the *minimum viable* ADR length and doesn't internalize ADRs as long documents.

**Engagement.** A `Matching` drill — six decisions paired with their named alternative ("Drizzle ↔ Prisma," "Better Auth ↔ Clerk," "Biome ↔ ESLint+Prettier," "R2 ↔ S3," "Node runtime ↔ Edge runtime," "native forms ↔ React Hook Form"). The drill confirms the student remembers that *every* ADR has a credible alternative that lost on a stated trade.

**Components.**
- `TabbedContent` with six tabs, one per ADR sketch. Each tab is short prose plus a `Code` block (or `Aside`) labeling Context / Decision / Consequences.
- `Matching` for the alternative-pairing recall.

**Project link.** Chapter 22.4.4's ADR 0007 (cache-entitlement-reads) follows exactly the shape of these six sketches — one paragraph Context, one declarative Decision, three-to-five Consequences. The student writes their first ADR in the shape they've just read six times.

---

## Component proposals

None. The chapter's teaching load is carried by existing components — `Figure` with hand-authored SVGs for the Diataxis quadrant, the README redistribution map, the AGENTS.md/README/ADR boundary, and the supersession state change; `DiagramSequence` for both time-travel sequences (drift in Concept 3, write-timing in Concept 8); `Tokens` repurposed over a markdown block for the mixing-trap diagnostic; `AnnotatedCode` for the Nygard anatomy walk; `CodeReview` for the broken-ADR exercise; `TabbedContent` for the six course-stack ADR sketches; and the standard exercise palette (`Matching`, `Buckets`, `TrueFalse`, `Sequence`, `MultipleChoice`) for recall. Every bespoke component considered during the brainstorm was single-use without a forward-link, so each was demoted to a `Figure`/`DiagramSequence`/existing-exercise alternative.

## Build priority

No new components proposed; no build priority to set. The implementation cost for this chapter is concentrated in two places worth flagging for content effort: (a) the hand-authored SVGs inside `Figure` for the Diataxis quadrant, the README redistribution map, and the three-way boundary map — these are static but compositional and want a content-aware hand; (b) the `DiagramSequence` payloads for the two time-travel sequences in Concepts 3 and 8, which need the side-by-side or two-track layout authored carefully so the divergence between tracks reads at a glance.

## Open pedagogical questions

- Concept 2's diagnostic uses `Tokens` over a markdown block to label sections by Diataxis type. `Tokens` was built for code-token identification — confirm that pre-highlighting full paragraphs of markdown reads cleanly and that the "decoy = section does two jobs" affordance can be expressed inside the existing `Tokens` API, or that the affordance survives a small extension.
- Concept 7's prediction round leans on `TrueFalse` framed as "ADR-worthy: yes/no" with a substantial per-card debrief reveal. Confirm `TrueFalse`'s per-card review surface is long enough for the three-test verdict, or whether the cards need to be `PredictOutput`-style cards repurposed for binary prediction with a larger reveal panel.
- Concept 9's `TabbedContent` carries six tabs of dense prose. Six is at the upper end of comfortable tab counts; if the gallery feels heavy when laid out, splitting into two `TabbedContent` blocks (storage/auth/lint vs. runtime/forms) is the fallback.
