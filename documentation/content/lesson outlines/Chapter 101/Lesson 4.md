# Lesson outline — Chapter 101, Lesson 4

## Lesson title

- **Title:** ADRs: one decision per file
- **Sidebar label:** ADRs

---

## Lesson framing

This is the chapter's heaviest lesson (50–60 min) and the payoff of the chapter's Diataxis map: the *explanation* quadrant lives in `/docs/adr/`. The previous three lessons established the artifacts that hold *what we run* (README), *what our conventions are* (`AGENTS.md`), and the reference surface that lives in source (schema, `env.ts`, Server Actions). This lesson lands the last artifact — the one that holds *why the architectural decisions behind those conventions were made*.

**The senior question driving the whole lesson** (state implicitly in the intro, per pedagogical filter 1): *six months from now a new senior asks "why Drizzle and not Prisma?" — where does that reasoning live?* Not in `git log`, not in Slack, not in the README, not in `AGENTS.md`. It lives in an ADR. The lesson's emotional hook is the recovered-context pain: every reader who has inherited a codebase has hit a decision they couldn't explain and couldn't safely change. The ADR is the cheap insurance against that.

**Mental model the student should leave with.** An ADR is a *receipt for a decision*: one file, one decision, written at the moment of choosing, recording the context, the choice, and the costs accepted. It is not documentation of how the code works (that's reference); it's the record of *why this fork in the road was taken instead of the other*. The senior reflex this lesson installs: when you make a choice that (a) spans many files, (b) reasonable engineers could decide differently, and (c) costs more than one PR to reverse — you write the receipt before you merge.

**What the student should be able to do by the end:** recognize the Nygard five-section template and write each section correctly (especially an honest Consequences section); apply the three-test inclusion check to decide ADR-vs-not; number and supersede ADRs correctly; and recognize the six course-stack decisions as ADR-worthy, naming the trade each accepts.

**Pedagogical strategy — simplify then layer (filter: minimize cognitive load).**
1. Motivate with the recovered-context pain (why every other home for the reasoning fails).
2. Define the ADR and walk the five-section template on **one** fully-worked real example (Drizzle-over-Prisma) so the student sees the whole shape before any rules pile on.
3. Layer the rules onto that concrete anchor: atomicity, write-while-deciding, the inclusion test, numbering, supersession.
4. Breadth pass: the other five course decisions as compressed sketches — by now the template is internalized, so these reinforce pattern recognition rather than teaching it fresh.
5. Defend the practice against the predictable pushback ("git blame / PR descriptions already do this") and disambiguate from neighbors (`AGENTS.md`, MADR).

**Why the worked-examples approach matters here.** The chapter framing is explicit: the course's own opinionated picks (Drizzle, Better Auth, Biome, R2, Node runtime, native forms) are the worked examples of "what earns an ADR." This is the lesson's biggest asset — the student already *lived* these decisions across the course, so the ADRs aren't toy examples; they're the receipts for choices the student already trusts. Lean on that recognition. Each sketch should trigger "oh, *that's* why we did that."

**Tone/stance.** Adult, terse, senior-mindset. The recurring senior signal to hammer: **an honest Consequences section.** A Consequences list with only upsides is a sales pitch, not an ADR. This is the single most important quality bar in the lesson and the one beginners get most wrong — surface it early and reinforce it in every sketch.

**Continuity hooks.** Open by referencing the chapter's repo map (lesson 1: Explanation → `/docs/adr/`) and the boundary lesson 3 kept hitting ("AGENTS.md states the convention; the ADR holds the why"). The invoice-SaaS running example, `idx_invoices_org_status`, the `pnpm` script names, and the kebab-case filename convention are all established — reuse them, don't reinvent. The `@/` import and `Result<T>` action contract are also in play from lesson 2 if a code reference is needed (it isn't, mostly — this lesson is markdown-artifact-centric).

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open on the recovered-context scenario: you join a team (or return to your own repo after two quarters), you find Drizzle wired through every query, and you ask *why not Prisma?* — and nobody can give you the real answer anymore. The person who decided left; the Slack thread is gone; the commit says "add db layer." Make the pain visceral and short. Then name the fix: the reasoning behind an architectural decision is itself an artifact worth saving, and it has a standard shape — the ADR. Connect to the chapter: this is the *explanation* quadrant from lesson 1, the last of the four doc jobs, and it has its own home (`/docs/adr/`). Preview the deliverable: by the end you can write the receipt for any architectural decision in fifteen minutes, and you'll have seen the receipts for six decisions the course already made.

Keep it warm and brief (filter: no celebratory tone, assume competence).

---

### Where decision rationale tries to hide — and why each home fails

**Goal:** justify the ADR's existence by elimination before defining it. This earns the artifact instead of asserting it (senior-mindset filter).

Walk the candidate homes the reasoning *could* live in and show why each loses the *why*:
- **Commit messages / `git log`** — one line, compressed to "what," lost in thousands of commits, and squash-merges erase the body entirely.
- **PR descriptions** — often a checklist not prose; searchable only through platform-specific tooling; buried once merged.
- **`git blame`** — answers "who wrote this line," never "why is this whole pattern here." Blame points at a line; a decision spans a hundred files.
- **Slack / chat** — ephemeral, unsearchable in practice, gone when the workspace is pruned or the person leaves.
- **The README** — wrong audience (first contact), and explanation dilutes its one job (lesson 2 callback).
- **`AGENTS.md`** — states *what* the convention is, not *why* it was chosen (lesson 3 callback — this is the boundary they kept hitting).

Land the conclusion: none of these is a durable, file-system-grep-able, single-purpose record of *one decision's reasoning*. That gap is exactly the ADR's job.

**Component:** a small **`Buckets`** exercise is tempting here but premature (the ADR isn't defined yet) — instead use a compact comparison. A 2-column **HTML+CSS table-style `Figure`** is overkill for six rows; prefer a plain markdown table inline (each row: candidate home → what it captures → what it loses). Keep it tight. Reserve the interactive sort for later. *Reasoning:* the student can't classify into "ADR vs not" before they know what an ADR is; a read-only comparison here, an interactive check after the template lands.

**Tooltip (`Term`):** *squash merge* — "Merging a PR by collapsing all its commits into one; the individual commit messages (and their bodies) are discarded." Many career-changers won't know this and it's load-bearing for the `git log` argument.

---

### Anatomy of an ADR: the Nygard template

**Goal:** define the ADR and teach the five-section template on **one fully-worked real example** before any rules. This is the lesson's spine — the student must see the whole shape on a concrete, trusted decision before abstractions land.

**Lead-in prose (one short paragraph):** define the ADR — a short markdown document (half a page to two pages) capturing *one* architectural decision: the context that forced it, the decision, and the consequences accepted. Name the lineage in one sentence: Michael Nygard's 2011 post; still the dominant template in 2026; files live in `/docs/adr/` numbered (`0001-use-drizzle-not-prisma.md`). Don't dwell on history (filter: no historical detours) — one sentence of provenance, then move.

**The five sections — teach each with the Drizzle ADR as the running specimen.** (Terminology note for the author: the canonical Nygard template is four named sections — Status, Context, Decision, Consequences — under a numbered Title heading. We teach it as "five sections" by counting the Title; the *three load-bearing* sections referenced later are Context / Decision / Consequences, the irreducible core MADR also keeps. Keep this distinction consistent — five-section template, three load-bearing.)

Use **`AnnotatedCode`** with `lang="md"` to present a complete, real ADR (the Drizzle-over-Prisma one) and step the student through its five sections. This is the ideal component: one artifact, student attention directed to one section at a time, the full file visible as the anchor. `maxLines={18}` (the ceiling) with scroll — the ADR will exceed 18 lines and that's fine (the doc says the code itself has no length limit; it scrolls within the capped frame). Author the ADR tight enough that each section is a few lines.

The full ADR body to render (keep it real and honest — this is also the canonical specimen the student will pattern-match against):

```md
# ADR 0001: Use Drizzle, not Prisma

## Status

Accepted

## Context

We need a typed ORM for all Postgres access. Prisma is the market
default but ships a heavier runtime, models the schema in its own DSL
rather than TypeScript, and its migration engine is hard to drop down
out of when we need raw SQL. We want SQL we can read, a small client,
and migrations we own as plain files.

## Decision

We will use Drizzle as the ORM for all database access.

## Consequences

- Leaner runtime and a raw-SQL escape hatch when we need it.
- Schema is TypeScript — one language, no separate DSL to learn.
- Relations are typed by hand via `relations()`; more boilerplate than
  Prisma's implicit relations.
- Smaller ecosystem: fewer plugins, fewer Stack Overflow answers.
- The team owns migration files directly; no generate-and-pray engine.
```

Steps (each `AnnotatedStep`, one paragraph ≤6 lines, prefer color):
1. **Title** (`color="blue"`, highlight line 1) — numbered, short *noun phrase of the decision itself*: "Use Drizzle, not Prisma." Not a question, not a sentence, not vague ("Database stuff"). The number is a stable identifier.
2. **Status** (`color="violet"`, the Status heading + value) — the lifecycle field: Proposed / Accepted / Superseded / Deprecated. Most live ADRs read "Accepted." Foreshadow supersession in one clause (full treatment later). Note the optional *Date* some templates add — git already tracks the file's birth, so it's not load-bearing.
3. **Context** (`color="blue"`, the Context paragraph) — the forces at play *at the time*: the problem, the constraints, the alternatives on the table, what wasn't known. Written so a reader two years out can model the situation. One paragraph, maybe two — not a company history.
4. **Decision** (`color="green"`, the one Decision line) — one declarative sentence. Crisp, unhedged: "We will use Drizzle." **Not** "we are considering" / "we should probably." The document records what was *decided*, not what was discussed. This crispness is a senior tell.
5. **Consequences** (`color="orange"`, the bullet list) — what changes: the good (constraints released) *and* the costs (constraints imposed). The honest mix is the senior signal — call out explicitly that bullets 3–4 here are *downsides*, deliberately included. **A Consequences section with only upsides is a sales pitch, not an ADR.** Hammer this; it's the lesson's central quality bar.

**Reasoning for this approach:** one real, trusted, fully-worked example beats five toy ones for first contact. The student already uses Drizzle, so the *content* needs no defense — their attention is free to absorb the *form*. Every later sketch and rule references back to this specimen.

**Tooltips (`Term`):**
- *ADR* (first use, in the lead-in) — "Architectural Decision Record: a short markdown file documenting one architectural decision and the reasoning behind it." (acronym, load-bearing, used throughout.)
- *DSL* (in the Context, re Prisma's schema DSL) — "Domain-Specific Language: a small purpose-built syntax, here Prisma's own `.prisma` schema format, separate from TypeScript." (non-obvious acronym for career-changers.)

---

### One decision per file

**Goal:** the atomicity rule, taught immediately after the student has seen one complete file so "one decision per file" has a concrete referent.

Short section. The rule: ADR 0001 is Drizzle, ADR 0002 is Better Auth — never "ADR 0001: our stack choices." Each decision has *its own* context, alternatives, and consequences; bundling them destroys the per-decision history the moment one decision (but not its file-mates) gets revisited. The filename carries the decision: `0001-use-drizzle-not-prisma.md` — the slug *is* the decision in kebab-case (callback to the course's kebab-case filename convention).

Tie atomicity to the supersession payoff coming up: you can only supersede a *single* decision cleanly if it lives alone in its file.

**No exercise here** — it's a one-idea section; fold the check into the inclusion-test exercise that follows.

---

### Write the ADR while you decide, not after

**Goal:** the write-time discipline — the structural enforcement that keeps ADRs honest, mirroring the chapter's recurring "docs live in the same PR as the code" thesis.

The discipline: draft the ADR *as the team is having the conversation*, status **Proposed**, and merge it in the same PR that ships the decision. The PR that introduces Drizzle is the PR that adds `0001-use-drizzle-not-prisma.md`; merging flips status to Accepted.

The *why* — make the decay concrete and a little uncomfortable:
- A week later, the rationale is already compressing.
- A month later, the alternatives get *rationalized* — you remember why you were right, not what you actually weighed.
- Six months later, the ADR is reconstructed from memory and is quietly **wrong** — which is worse than no ADR, because it's a confident wrong record.

Land the senior framing: this is *structural*, not aspirational (chapter thesis). The doc that ships in the decision's PR stays accurate because the reasoning is fresh and the reviewer is right there; the doc deferred to "later" rots or never gets written. Connect to the Code conventions stance the student will meet on the reviewer side (Chapter 103, named in one clause — don't teach it).

**Component:** a small **`Sequence`** exercise fits well here — order the steps of the write-while-deciding flow, reinforcing that the ADR is part of the decision, not an afterthought. Steps (source order = correct):
1. The team debates Drizzle vs Prisma in the design discussion.
2. Draft `0001-use-drizzle-not-prisma.md` with status **Proposed**.
3. Open the PR that adds Drizzle *and* the ADR together.
4. Reviewer reads the Context and Consequences against the diff.
5. Merge; flip the ADR's status to **Accepted**.

*Reasoning:* the ordering *is* the lesson — the ADR threads through the decision rather than trailing it. A `Sequence` makes that temporal claim kinesthetic and is cheap.

---

### What earns an ADR (and what doesn't)

**Goal:** the three-test inclusion check, so the student neither under-documents (no record of real forks) nor over-documents (ADR sprawl).

State the three tests plainly — a decision earns an ADR if **all three** hold:
1. **Architectural reach** — it affects multiple files or future PRs.
2. **Reasonable disagreement** — competent engineers could pick differently.
3. **Costly to reverse** — undoing it costs more than one PR by one person.

Worked contrast: "Use Drizzle" passes all three. "Name this variable `userId` not `uid`" passes none — it's a code-review topic, reversible in one PR by one engineer. Give the crisp heuristic: *if it's reversible in one PR by one engineer, it's not an architectural decision.*

The NOT-an-ADR list (these are `AGENTS.md` or code-review territory, callback to lesson 3): variable naming, function decomposition, file structure within a feature, library version bumps that don't change the API, CSS class names. Name the boundary explicitly: "ADR 0001: Coding conventions" is a classic beginner mistake — conventions are `AGENTS.md` content; an ADR records a *decision between alternatives*, not a style rule.

Flag the dual failure modes as inline watch-outs (not a separate section — per the no-watch-out-sections rule, they qualify this concept): **under-documenting** (the real fork that no one recorded — the pain from the intro) and **ADR sprawl** (one per feature flag, one per dependency bump — the inclusion test exists to stop this).

**Component — primary exercise of the lesson:** a **`Buckets`** drill, two buckets — **"Earns an ADR"** and **"Not an ADR (code review / AGENTS.md)"** — with ~8 disambiguated items the student sorts. This is the right moment: the template is internalized, the three tests are fresh, and classification is exactly what `Buckets` is for. Suggested items (author should tune so the line is instructive, not trivial):
- Earns an ADR: "Use Drizzle instead of Prisma"; "Better Auth instead of a hosted auth provider"; "Server Actions as the API surface instead of REST route handlers"; "Postgres on Node runtime instead of an edge database."
- Not an ADR: "Rename `uid` to `userId`"; "Extract this 40-line function into two helpers"; "Bump `zod` from 4.0.1 to 4.0.2"; "Use `gap-4` instead of `space-y-4` in this layout."

Use `instructions` to frame it ("Sort each decision into whether it deserves its own ADR."). Include one deliberately *borderline* item in the reveal-worthy zone (e.g., the version bump — fine to ADR if it changes the API, not if it doesn't) and let the item wording resolve it, so the student practices the *reasoning*, not memorization.

*Reasoning:* `Buckets` matches the cognitive task (binary classification under a rule), is already a proven format in this chapter (lessons 1–3 each use one), and gives immediate right/wrong feedback on the exact judgment the section teaches.

---

### Numbering and the supersession lifecycle

**Goal:** how ADRs are identified over time and what happens when a decision is later reversed — the mechanism that makes the `/docs/adr/` folder a *history*, not a snapshot.

**Numbering convention:** sequential, zero-padded, **never reused**. `0001-`, `0002-`, … The number is a stable identifier that appears in PRs ("see ADR 0007") and survives file renames. Explicitly: don't number by date (git owns the date) and don't number by category (categories drift; sequence doesn't).

**The supersession lifecycle — the key idea: supersede in place, never delete.** Walk the two-year-later scenario: the team replaces Drizzle. The move is:
- Write a *new* ADR, `0019-replace-drizzle-with-x.md`, status **Accepted**, whose Context references what changed since 0001.
- Update ADR 0001's status to **Superseded by ADR 0019** with a one-line pointer. Its body stays intact.

Why deletion is never the move: the historical record *is* the value. A future maintainer needs to see that Drizzle was chosen deliberately, served for two years, and was replaced under specific new constraints — that chain is the institutional memory. Deleting 0001 erases the lesson and invites re-litigating a settled fork. Tie back to atomicity: this clean supersession only works because 0001 held *one* decision.

**Component — diagram:** a small **status-transition diagram** earns its place here because the lifecycle is a tiny state machine and beginners conflate "superseded" with "deleted." Per the diagrams INDEX, a state machine's top pick is **D2**, fallback Mermaid — but this is a 4-node linear-ish flow, not a dense graph, so **Mermaid `flowchart LR`** (the decision-tree/flowchart pick) is the lighter, AI-reliable choice and reads cleanly left-to-right (vertical-space constraint). Wrap in `<Figure>` with a caption.

Diagram content — the status lifecycle of a single ADR:
`Proposed` → (PR merges) → `Accepted` → (a later ADR replaces it) → `Superseded` ; with a separate side-arrow `Accepted` → `Deprecated` (decision abandoned with no replacement). The pedagogical goal: make "Superseded" visibly a *terminal-but-preserved* state reached by transition, never an erasure. Caption should say the file is never deleted; the status field is what moves.

*Reasoning for diagram over prose:* the misconception (superseded = gone) is spatial — students picture the file disappearing. Showing supersession as an arrow *into a state the box still occupies* corrects the mental model directly. Small, horizontal, one Mermaid block — low authoring risk.

**The `/docs/adr/` index file:** one short paragraph. The folder carries a hand-maintained `README.md` listing each ADR by number, title, and current status — it doubles as a table of contents and is where a reader scans the decision history at a glance. Hand-maintained on purpose (it ships in the same PR as each new ADR — write-while-deciding again).

**Tooltip (`Term`):** *supersede* — "Replace an earlier decision with a newer one while keeping the original record; the old ADR's status becomes 'Superseded by ADR NNNN' and its file stays in the repo." (the precise meaning is the whole point of the section; a tooltip reinforces it at first prose use.)

---

### Six decisions this course already made

**Goal:** breadth pass — the remaining five course-stack decisions (Drizzle was the spine specimen) as compressed ADR sketches, so the student pattern-matches the form onto choices they already trust. By now the template is internalized; these reinforce recognition, they don't teach the template.

**Framing sentence:** every architectural choice in this course had a reasonable alternative, and the next maintainer benefits from seeing the reasoning. Here are the receipts. Make explicit that these are *sketches* (Context-Decision-Consequences compressed to a few lines each), not full files — the full form is the Drizzle specimen above.

**Component:** **`TabbedContent`**, one `TabbedItem` per decision (six tabs), each panel a tight Context / Decision / Consequences sketch. *Reasoning:* six parallel items of the same shape = textbook tabs (the INDEX's "alternatives/variants of the same idea"); it keeps the section vertically compact (six tabs vs six stacked blocks — the vertical-space constraint) and lets the student flip between them to feel the repeated template. Per-tab `caption` can carry the one-line *trade accepted* as the takeaway. Each panel uses small fenced `md` blocks or tight prose — keep each Decision to one declarative sentence and each Consequences to 3–5 honest bullets including downsides.

The six (Drizzle is shown again briefly as tab 1 for completeness, or referenced back to the specimen — author's call; the other five are the new content):

1. **Drizzle over Prisma** — (the specimen; one-line recap + "full ADR above"). Trade: smaller ecosystem and manual relation typing for a leaner runtime and owned migrations.
2. **Better Auth over Clerk / Auth.js** — Context: need email+password, OAuth, sessions, RBAC, org-scoped auth, in *our* Next.js codebase. Decision: Better Auth. Consequences: data sovereignty (the users table is ours, in our Postgres), no per-MAU billing, RBAC + orgs in the plugin surface — *and* we now operate auth ourselves (Chapter 054 callback). Trade: operational responsibility for sovereignty + no per-seat pricing.
3. **Biome over ESLint + Prettier** — Context: want lint+format running in milliseconds in pre-commit and CI; ESLint+Prettier is two tools, two configs, slower. Decision: Biome. Consequences: one config, ~10x faster, *fewer* rules than the ESLint-plugin union (the downside). Trade: a smaller rule set for one fast tool.
4. **Cloudflare R2 over S3** — Context: object storage with predictable cost; the SaaS read/download pattern makes S3 egress fees bite. Decision: R2. Consequences: zero egress, S3-compatible API (same SDK), one more account to manage, slightly newer ecosystem. Trade: a touch less maturity for no egress fees.
5. **Node runtime, not edge, by default** — Context: Edge wins latency but forbids Node APIs and persistent connections; Drizzle + Postgres + Resend + Stripe + Better Auth all want Node. Decision: Node runtime as the default; Edge only where a route genuinely benefits. Consequences: full Node ecosystem and simple module compatibility; slightly higher cold-start than Edge (acceptable for dashboards). Trade: a little cold-start latency for compatibility with the whole stack.
6. **Native React 19 forms before React Hook Form** — Context: React 19 ships `useActionState`, native `<form action>` with progressive enhancement, and direct Server Action integration; RHF adds a dependency and a separate mental model. Decision: native forms by default; RHF only past the complexity threshold (Chapter 045 callback). Consequences: less code, fewer deps, direct action integration; complex client-only validation takes more lifting when it arrives. Trade: more work on heavy client validation for fewer deps and platform-native forms by default.

**Reasoning for including all six:** the chapter framing names these explicitly as the worked examples that make "what earns an ADR" concrete on real choices. Each one passes the three-test inclusion check (reach + reasonable disagreement + costly reversal) — note this once so the section reinforces the prior section. The recognition payoff ("that's why we did that") is the whole point.

**Watch-out (inline, qualifying this section):** an empty or all-upside Consequences section. Every one of these six names real costs — point out that a sketch listing only wins would be the sales-pitch failure mode from the template section. This is the natural reinforcement spot for the lesson's central quality bar.

---

### What git blame and PR descriptions don't replace

**Goal:** answer the predictable senior-skeptic pushback head-on, and disambiguate ADRs from the one alternative template worth naming. Placing the rebuttal *after* the worked examples means the student has the evidence in hand to evaluate it.

**The pushback:** "our PR descriptions and `git blame` already capture this." Rebut precisely (this partly recaps the opening section but now with the full ADR concept to contrast against — frame it as the senior's standard objection, not a repeat):
- PR descriptions are searchable only via platform-specific tooling, and are usually checklists, not reasoning.
- `git blame` answers "who wrote this line," never "why does this whole pattern exist."
- Commit messages compress rationale to one line and don't survive squash merges.

The ADR is the durable, grep-able, single-purpose artifact none of those three is. It's worth the fifteen minutes per *architectural* decision (the inclusion test keeps that bill small).

**MADR — named once.** Mention MADR (Markdown Any Decision Records) as the other widely-used template: it adds *Considered Options* and *Decision Outcome*, more structured. Some teams prefer it. The course uses **Nygard** because the three load-bearing sections (Context / Decision / Consequences) are the smallest shape that does the job, and signal-per-line is the senior posture (chapter thesis, lesson 3 callback). One sentence so the student recognizes MADR in the wild; the course's call is Nygard.

**Tooltip (`Term`):** *MADR* — "Markdown Any Decision Records: a more structured ADR template adding 'Considered Options' and 'Decision Outcome' sections." (acronym the student may meet in real repos.)

**External resource (`ExternalResource` card):** link Nygard's original 2011 post ("Documenting Architecture Decisions") and/or the adr.github.io organization homepage, as an optional deep-dive. One or two cards, not a wall. *Reasoning:* the canonical source for the template the student now uses — the "could this be a link?" reflex applied to the lesson itself.

---

### Recap / closing (short)

Tight wrap. The mental model restated: an ADR is the receipt for an architectural decision — one file, one decision, written while deciding, kept forever even when superseded. The three load-bearing sections; the three-test inclusion check; the one quality bar that matters most — *an honest Consequences section.*

Close the chapter arc: the four jobs (lesson 1), the README (lesson 2), `AGENTS.md` (lesson 3), and now the ADR — the four-document surface a 2026 SaaS codebase actually maintains, each with one audience and one job. Forward-point in one clause to Chapter 102 (TSDoc fills in the reference-in-source quadrant the schema/action examples gestured at) without teaching it.

*No quiz here* — Chapter 101's quiz is lesson 5 (separate).

---

## Scope

**This lesson covers:** the Nygard ADR template (Title, Status, Context, Decision, Consequences); one-decision-per-file atomicity; the write-while-deciding discipline; the three-test inclusion check (architectural reach / reasonable disagreement / costly reversal); sequential never-reused numbering; the supersede-in-place lifecycle and the `/docs/adr/README.md` index; the six course-stack ADR sketches; the git-blame/PR-description rebuttal; and MADR named once.

**Explicitly out of scope (do not teach — redirect or name in one clause):**
- **Diataxis vocabulary and the four-type taxonomy** — taught in lesson 1; reference it (Explanation → `/docs/adr/`), don't re-teach. The student already has tutorial/how-to/reference/explanation.
- **README structure** — lesson 2; only referenced as the wrong home for explanation.
- **`AGENTS.md` sections, the inclusion test for conventions, the two-audiences model** — lesson 3; referenced only as the convention-vs-why boundary. Do not re-explain `AGENTS.md`'s structure.
- **TSDoc syntax and where to put it** — Chapter 102. The source-as-doc reference examples (schema, `env.ts`, Server Action) belong to lesson 2 and Chapter 102; this lesson does not show TSDoc. If a `Result<T>` or schema reference is needed it's a one-line callback, not a code teaching beat.
- **The PR-review side of catching a missing ADR** — Chapter 103 (reviewer). Name in one clause when discussing write-while-deciding; don't teach review mechanics.
- **The project-chapter exercise of writing an ADR from a seeded diff** — Chapter 104. This lesson teaches the template and judgment; the hands-on authoring-from-a-diff is the project's job. (So: no full ADR-authoring sandbox here — classification and ordering exercises only.)
- **ADR process tooling** (`adr-tools` CLI, `log4brains`, Backstage TechDocs) — out of scope; plain markdown files in `/docs/adr/` are the entire deliverable. Do not introduce tooling.
- **ADRs for non-code decisions** (team process, hiring, vendor contracts) — out of scope; architectural/technical decisions only.
- **Deep history of the ADR movement** — one sentence of Nygard provenance maximum (no historical detours filter).

**Prerequisites to redefine concisely (one clause each, the student has these):** the chapter's repo map (Explanation lives in `/docs/adr/`); the kebab-case filename convention; the invoice-SaaS running example and its stack (Drizzle, Better Auth, Biome, R2, Node runtime, native forms — these *are* the worked examples, so the student's prior exposure to each decision is the asset); the "docs ship in the same PR as the code" thesis from lessons 2–3.

---

## Component & convention notes for downstream agents

- **Filename/slug convention:** ADR example filenames use kebab-case with zero-padded numeric prefix (`0001-use-drizzle-not-prisma.md`) — consistent with Code conventions §Naming (kebab-case files). The slug encodes the decision.
- **Code-convention alignment:** the lesson's central claim — *the reason behind a non-obvious choice belongs in a durable record* — is the macro form of Code conventions §Comments ("the reason behind a non-obvious choice that survived a code review" is the one allowed inline comment). Worth one explicit bridge: an inline `// why` comment justifies a *line*; an ADR justifies a *decision spanning the codebase*. Same instinct, different scale. This is a deliberate, lesson-supporting connection — flag it so it isn't read as drift.
- **`AnnotatedCode` specimen** (`assembled-adr-0001`): the Drizzle ADR, `lang="md"`, exceeds 18 lines and scrolls within the `maxLines={18}` frame (per the component doc — code has no length cap). Five steps, colors: Title blue, Status violet, Context blue, Decision green, Consequences orange. This is the canonical specimen; later sections reference it.
- **`Sequence`** (write-while-deciding): 5 steps, source order = correct order. No code block needed (it's a process, not a code ordering).
- **`Buckets`** (inclusion test): 2 buckets ("Earns an ADR" / "Not an ADR"), ~8 disambiguated items, one deliberately borderline (version bump) resolved by item wording. `instructions` prop frames the task. Consistent with the `Buckets` format used across lessons 1–3 of this chapter.
- **Mermaid `flowchart LR`** (ADR status lifecycle): Proposed → Accepted → Superseded, plus Accepted → Deprecated. Wrapped in `<Figure>` with a caption stating the file is never deleted. Small, horizontal (vertical-space constraint). This is a TODO diagram stub for the diagram-building pass.
- **`TabbedContent`** (six decisions): six `TabbedItem`s, each a compact Context/Decision/Consequences sketch, per-tab `caption` carrying the trade accepted. Not wrapped in `<Figure>` (it provides its own card — per the component doc).
- **`ExternalResource`** cards: Nygard's 2011 post and/or adr.github.io. Optional, 1–2 max.
- **`Term` tooltips:** *ADR*, *DSL*, *squash merge*, *supersede*, *MADR*. Strategic set — three acronyms the career-changer may not know, plus the two terms whose precise meaning is load-bearing for their sections.
- **No `CodeReview` exercise** in this lesson — lesson 3 already used `CodeReview` (bad `AGENTS.md`), and the ADR-from-diff review is reserved for Chapter 104. Keep this lesson's exercises to classification (`Buckets`) and ordering (`Sequence`) plus the `AnnotatedCode` walkthrough, to avoid over-loading and to respect the project-chapter's territory.
