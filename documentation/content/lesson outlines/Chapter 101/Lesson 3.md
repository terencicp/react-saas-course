# AGENTS.md, the conventions file

**Title (h1):** AGENTS.md, the conventions file
**Sidebar label:** AGENTS.md

---

## Lesson framing

This is the third lesson of Chapter 101 ("Docs that live next to the truth") and the chapter's longest. It is the full treatment of `AGENTS.md` — the file *this very course ships with* (`/Users/terenci/react-saas-course/AGENTS.md`), which is a gift: the worked example is the repo the student is reading. The lesson sits in the chapter's repo-map: lesson 1 placed how-to docs and conventions in `AGENTS.md`, lesson 2 made the README thin and pointed it *at* `AGENTS.md` for conventions. This lesson cashes that pointer.

**The senior question (state implicitly in the intro, per pedagogy):** once the README is thin (lesson 2) and source files own their own reference docs (lesson 2), where do conventions, build/test/lint commands, and "how we do things here" notes live? In 2026 the answer is `AGENTS.md` — one plain-markdown file at the repo root, written for two audiences at once: coding agents (the canonical case) and humans skimming for conventions.

**Core mental model the student should leave with:** `AGENTS.md` is the brief you'd give a competent new hire over coffee on day one — direct, no filler, the non-obvious rules and the exact commands — except it's also machine-read. One file, two readers, same plain prose. Its quality metric is *signal per line*, not section-count or completeness. The senior reflex is to delete any section that has nothing load-bearing in it.

**Why this matters / production stakes:** in 2026 the daily reality is coding agents doing real work in the codebase; a high-signal `AGENTS.md` is the difference between an agent (or a new hire) that's productive in week one and one that re-derives the conventions by trial and error, breaks the lint rules, imports server code into client components, and burns review cycles. (Pedagogy guideline: AI is the daily reality but don't *lecture* about "directing AI" — the durable skill is "write the brief a competent newcomer needs," which serves both audiences. Frame the agent audience matter-of-factly, not as the lesson's thesis.)

**Three boundaries are the spine of the lesson** (this is what keeps the chapter's four artifacts from sprawling, per the chapter framing):
- `AGENTS.md` vs **README** — README is first-contact (recruiter + first *hour*); `AGENTS.md` is the first-*week* contributor/agent doing real work. They deliberately share two things (the one-paragraph project overview, the local-setup commands) and then diverge: README links out, `AGENTS.md` goes into convention depth.
- `AGENTS.md` vs **ADRs** — `AGENTS.md` states *what the convention is* ("Drizzle for all DB access"); the ADR records *why that decision was made* ("Drizzle over Prisma because…"). `AGENTS.md` links to the ADR to close the loop. ADR template itself is lesson 4 — do not teach it here.
- `AGENTS.md` vs **source-as-doc** (lesson 2) — the full env-var list lives in `env.ts`, not duplicated into `AGENTS.md`; `AGENTS.md` *points* at it. The "could this be a link?" reflex (lesson 1) applies inside `AGENTS.md` itself.

**Pedagogical approach decisions:**
- The lesson is *about a document*, so its highest-value asset is a **worked, real `AGENTS.md`** the student can read top to bottom. Build it incrementally section by section (reduces cognitive load: one section at a time, each motivated by the inclusion test before its content is shown), then show the assembled file once with `AnnotatedCode` so the student sees the whole shape. The chapter outline's "sketch the shape, don't write a full file (too long)" worry is solved by `AnnotatedCode`'s `maxLines` scroll cap — a complete file can be shown without dominating the page.
- Lead every section with the **inclusion test** ("would a competent dev joining next Monday need this to be productive in week one?") so the student learns the *filter*, not a section checklist to copy. This is the senior-mindset framing the course wants.
- The "what NOT to do" inversion — the negative-space section — is itself a teaching beat about why naming traps saves the reader cycles. Mirror it: the lesson teaches a `## Don't` section *and* teaches the file's own anti-patterns (empty sections, dumping ground, duplicated env list). Keep watch-outs *inside* the section they qualify (per the outliner rules), not bundled at the end.
- One **diagram**: the two-audiences-one-file split and the three boundaries (README / `AGENTS.md` / ADR ownership) — a simple HTML+CSS visual, not a complex graph. Pedagogically it's the load-bearing mental model; worth a figure.
- **Exercises:** a `Buckets` drill on the four-artifact routing (does this fact belong in README / AGENTS.md / a source file / an ADR), and a `CodeReview` exercise on a *bad* `AGENTS.md` so the student practices the senior reflex of spotting low-signal/duplicated/misplaced content. Both check the lesson's actual skill (judgment about what goes where), which is stronger than recall.
- **Fact-checked (June 2026):** steward is the **Agentic AI Foundation under the Linux Foundation**; 60,000+ repos, 20+ tools; homepage `agents.md`; format is plain markdown with **no required schema** (popular sections are conventional, not mandated); monorepo rule is **nearest file wins, not merged**; legacy `.cursorrules`/`.clinerules`/`copilot-instructions.md` consolidation is real but adoption is **not uniform** — Codex/Cursor/Copilot/Gemini CLI/Aider/Windsurf/Zed/Cline read `AGENTS.md` natively, while **Claude Code reads `CLAUDE.md` and needs an `@AGENTS.md` import or symlink bridge** (do NOT claim universal native support — teach the bridge honestly).

---

## Lesson sections

### Introduction (no heading — lesson intro prose)

Open by cashing lesson 2's pointer: "The thin README ended with a line — *conventions for working in this codebase: `AGENTS.md`*. This is that file." State the senior question implicitly (where do conventions/commands/"how we work" live now that the README is thin and source files own reference). Name the punchline: in 2026 that's `AGENTS.md`, one root-level markdown file read by both coding agents and humans. Preview the practical outcome: by the end the student can write a high-signal `AGENTS.md` for a SaaS repo and knows exactly which facts belong here vs in the README, a source file, or an ADR. Keep it warm and brief (pedagogy §3). Note in passing that the course's own repo ships one — they can open `AGENTS.md` at the root and read along.

Connect to prior knowledge: the "could this be a link?" reflex (lesson 1) and source-as-doc (lesson 2) both reappear *inside* this file.

### What AGENTS.md is

Define it concretely and ground it in the 2026 reality. Content:
- A plain-markdown file named exactly `AGENTS.md` (uppercase) at the repo root. **No required schema** — agents parse whatever prose you write; the conventional sections below are convention, not spec.
- Read by coding agents to bootstrap context on a codebase before they act. Name the steward once — **Agentic AI Foundation, under the Linux Foundation** — and the scale (60,000+ repos, 20+ tools) so the student knows it's a real consolidated standard, not one vendor's gimmick. Link the homepage `agents.md` via `ExternalResource` at the section or lesson end; don't go deeper than one sentence on governance.
- The key property to internalize: because there's no schema, the file's value is **signal per line**, set by the author's judgment — which is exactly why this lesson teaches a *filter*, not a template to fill.

**Term tooltips here:** `AGENTS.md` is the subject so not a Term; but consider a `Term` on "coding agent" (brief: "an AI tool that reads and edits a codebase directly — Codex, Claude Code, Cursor, Copilot agent mode, etc.") on first use, since the student may be hazy on the exact referent. Keep it one line.

Do NOT include a meta "what is this file" section *in the worked AGENTS.md* later — flag now that the file itself never explains what AGENTS.md is (both readers already know); this section teaches the student, the file doesn't teach its readers.

### Two readers, one file

The conceptual core. Content:
- A coding agent needs: the build/test/lint commands, the entry points and layout, the style conventions, and the watch-outs that aren't visible from reading the code. A human contributor skimming "how do we work here" needs the *same* information.
- The 2026 norm: write **one** file for both, in plain English, with **no agent-specific syntax** — no "when you are an agent, do X." Agents parse the same prose a human reads. (This is also a watch-out, kept in-section: agent-only instructions that don't make sense to a human are a smell.)
- The senior framing: write it the way you'd brief a new hire over coffee — that voice serves both readers.

**Diagram (HTML+CSS inside `<Figure>`):** `agents-md-audiences-and-boundaries`. A compact horizontal visual with two stacked ideas:
1. **Top band — two readers, one file:** a center box labeled `AGENTS.md`, with two arrows in from a "coding agent" glyph and a "new-hire human" glyph, both labeled "same plain markdown." Pedagogical goal: cement that the dual audience does *not* mean two files or two dialects.
2. **Bottom band — the ownership split:** three side-by-side cards — `README.md` → "first contact (recruiter, first hour)"; `AGENTS.md` → "conventions + commands (agent, first week)"; `/docs/adr/` → "why the decisions were made". A thin "shared: overview + setup commands" connector bridging README and AGENTS.md; a thin "links for the why" arrow from AGENTS.md to ADR. Pedagogical goal: the three boundaries as one picture, so the later boundary sections have a visual anchor.

Authoring notes for the diagram agent: follow `documentation/diagrams/html-css.md` — inline styles only, `margin: 0` on every nested element (Starlight prose-margin gotcha), `box-sizing: border-box`, `flex-wrap: wrap` with split `column-gap`/`row-gap` so it survives narrow viewports, escape any literal `<`/`/docs/...` braces per the MDX gotchas. Use the saturated-mid-tone-with-white-text palette for the three role cards so colors survive dark mode; keep total height well under 800px (it's wide and short). `expandable` can stay default (no LeaderLine). This is *not* an `ArrowDiagram` requirement — simple CSS arrows/borders suffice; only reach for `ArrowDiagram` if box-to-box leader lines genuinely read better, in which case set `expandable={false}`.

### What earns a place: the inclusion test

The filter that powers the rest of the lesson. Content:
- The test, stated plainly: **"Would a competent developer (or agent) joining next Monday need this to be productive in week one?"** Yes → it goes in. No → it's noise that pads the file and *dilutes* the high-signal parts.
- Concrete yes/no pairs to make it bite: build/test/lint commands **yes**; the team's Slack channel **no**. "We use Drizzle for all DB access" **yes**; the history of why we used Prisma before **no** (that's an ADR). The full env-var list **no** (that's `env.ts`, link to it).
- This is where the chapter's "signal density over format compliance" posture lands: the failure mode is the file expanded "for completeness" until every section is full and none is high-signal. The reflex: delete sections with nothing load-bearing.

No code here; this is the lens. Every following content section opens by applying it.

### The sections most SaaS AGENTS.md files have

The heart of the lesson. Teach the conventional sections, each motivated by the inclusion test, then assemble. Structure this as one h2 with the section walk-through, building the file incrementally. Use **per-section small `Code` blocks** (markdown fenced as ```md) as each section is introduced — one short snippet per section, so the student sees the shape of *that* section before the next. Then close with the **assembled file in `AnnotatedCode`** (see "Worked AGENTS.md" subsection below).

Cover these sections (each: what it's for, the one-line inclusion rationale, a 1–4 line example for this course's invoice-SaaS stack). Keep them terse — model the signal-density posture in the lesson's own examples:

- **Project overview** — one paragraph: what the product does, who the user is, the stack core. Same content as the README's opening, terser. (Boundary callback: this is one of the two deliberately-shared pieces with the README.)
- **Repo layout** — top-level folders and what lives in each. Use the course stack: `src/app` (Next.js routes), `src/components` (Client Components), `src/db` (Drizzle schema + queries), `src/lib/<feature>` (feature modules), `src/server` (Server Actions), `tests` (integration tests). **Render this one as a `<FileTree>`** with dimmed inline comments — it's a directory listing, which is exactly what `FileTree` is for, and it reads better than a code fence. (Cross-check the folder shape against the course's real conventions; align with what lesson 2's continuity notes used — `src/db/schema.ts`, the `invoices` table — so the chapter stays internally consistent.)
- **Build, test, lint commands** — the exact commands, listed plainly, no narration: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm test:watch`, `pnpm lint`, `pnpm typecheck`. **Reuse the exact `pnpm` script names lesson 2 committed to** (`db:push`, `db:seed`, `db:generate`, `db:migrate`, `db:reset`, `test`, `dev`) so the README and `AGENTS.md` don't contradict each other — call this out as a worked instance of "two docs, one source of truth" (the scripts in `package.json` are the truth; both files reflect them). This consistency is load-bearing for the chapter; the writer must not invent new script names.
- **Conventions** — the non-obvious rules, each one line. Draw from the course's actual standards (align with `documentation/code standards/Code conventions.md`): Server Components by default, Client Components only at the leaves; Server Actions for mutations, route handlers only for third-party callbacks (webhooks); Zod schemas live next to the action that uses them; never `any`, use `unknown`; `@/` imports, no deep relative paths; file/test-file location conventions. One line each — the density *is* the lesson.
- **What NOT to do (`## Don't`)** — the traps the codebase has structural rules against, named so the agent/human doesn't burn cycles rediscovering them: don't import server modules into Client Components (Next.js catches it, but naming it saves a failed run); don't hand-write SQL outside Drizzle; don't reach for `useEffect` to fetch server data (Chapter 025 callback); don't ship `console.log` (name the lint rule that catches it). Teach *why* negative space earns its place: a competent newcomer's failure modes are predictable; pre-empting them is pure signal. (Watch-out, in-section: don't turn this into an ADR — state the rule, link the *why* to the ADR.)
- **PR and commit conventions** — one short paragraph: if the team uses conventional commits, name the prefixes; if PRs need green CI before merge, say so. Not a process essay. (Chapter 103 owns review depth — keep this to a pointer-level mention.)
- **Pointers** — links, not duplication: ADR folder `/docs/adr/`, schema `src/db/schema.ts`, env `src/env.ts`, the heavyweight how-tos. This is the "could this be a link?" reflex (lesson 1) applied inside the file. (Boundary callback: this section is *how* `AGENTS.md` defers env to source-as-doc and "why" to ADRs.)

Throughout, keep watch-outs attached to their section, e.g.:
- under Pointers / overview: don't paste the full env-var list (duplication → drift); point at `env.ts`.
- under the section walk-through generally: sections present only because "the spec recommends them" but carrying nothing load-bearing should be deleted — there is no required schema, so an empty section is pure dilution.

#### A worked AGENTS.md for this stack

After the section-by-section build, show the **assembled file once** so the student sees the whole shape and how the sections add up to a coffee-brief. Use `AnnotatedCode` (lang `md`, `maxLines` near the 18 cap so a complete file scrolls within a fixed frame instead of dominating the page). Steps walk the reader through: overview, layout, commands, conventions, the `## Don't` block, pointers — one `AnnotatedStep` per section, prose ≤6 lines each, `color="blue"` default (use `green` for the "this is the high-signal core" steps if a contrast helps). The file content must be a real, coherent invoice-SaaS `AGENTS.md` consistent with the script names, folder layout, and conventions established above — not lorem. Keep the *whole file* tight (this is the lesson modeling signal density); if it would exceed the scroll frame comfortably, trim sections to their highest-signal line rather than padding.

Authoring note: the student can compare this to the course's own root `AGENTS.md` (link via `ExternalResource` or just mention it) — a second real example reinforces that there's no single template, only the filter.

### Nested AGENTS.md: the nearest file wins

Teach the hierarchy rule precisely (fact-checked). Content:
- Agents read the **nearest** `AGENTS.md` walking *up* the directory tree from the file they're editing. The closest file **wins — files are not merged**. (This is a common misconception; state the "not merged" explicitly.)
- So a monorepo or an idiosyncratic subfolder can ship its own override: root sets sensible defaults, `packages/email-templates/AGENTS.md` adds email-specific guidance for work in that folder.
- The course's stack is single-app, so the root file is the only one — name the rule once for the case the student will eventually hit (e.g. a future `packages/` split), don't over-engineer. (Real-world anchor, optional one-liner: large repos like OpenAI's run dozens of `AGENTS.md` files.)

Small `<FileTree>` to show the shape: a root `AGENTS.md` plus one nested `packages/<x>/AGENTS.md`, with a dimmed comment on each ("repo-wide defaults" / "overrides for this package"). Pedagogical goal: make "nearest wins" spatial.

### Where AGENTS.md ends and the other docs begin

The boundary section — the chapter's anti-sprawl payload. The diagram in "Two readers, one file" already previewed this; here, state each boundary crisply in prose and make it actionable. Content:

- **vs README** (lesson 2): README = first contact (recruiter, first hour); `AGENTS.md` = first-week contributor/agent doing real work. They *intentionally* share the project-overview paragraph and the local-setup commands (both are first-hour *and* first-week needs); after that they diverge — README links out, `AGENTS.md` goes deep on conventions. The duplication of those two pieces is acceptable because both reflect the same source (package.json scripts; the one-line product description) and a reader of either shouldn't have to jump files for day-one basics.
- **vs ADRs** (lesson 4): `AGENTS.md` states the convention ("Drizzle for all DB access"); the ADR records the decision and its trade-offs ("Drizzle over Prisma because…"). `AGENTS.md` links to the ADR for the curious. Do **not** put ADR-worthy rationale ("we chose Drizzle because of these eight trade-offs") in `AGENTS.md` — that bloats it and duplicates the ADR. Keep the ADR *template* out of this lesson entirely (lesson 4 owns it); only the boundary is taught here.
- **vs source-as-doc** (lesson 2): the env-var list belongs in `env.ts`; the schema in `schema.ts`; the Server Action contract in the action file's TSDoc. `AGENTS.md` points at all of them. The "could this be a link?" reflex governs the file.

Make this the home of the boundary watch-outs: `AGENTS.md` as a dumping ground for "everything that doesn't fit elsewhere" → file balloons, signal drops; env list duplicated here → drift.

**Exercise — `Buckets` (4 buckets):** "Where does each fact live?" Buckets: `README`, `AGENTS.md`, `A source file (schema.ts / env.ts / the action)`, `/docs/adr/`. ~8 items mixing the obvious and the boundary-testing: e.g. "the exact `pnpm test` command" (AGENTS.md), "the one-paragraph product pitch for a recruiter" (README — boundary with AGENTS.md, accept either *conceptually* but grade to README as the canonical owner; phrase the item to disambiguate, e.g. "the GitHub landing description a recruiter reads first"), "the full list of required environment variables with types" (source file — `env.ts`), "the reasoning behind choosing Better Auth over Clerk" (ADR), "Server Actions handle mutations, route handlers only for webhooks" (AGENTS.md convention), "the `invoices` table's columns and constraints" (source file — `schema.ts`), "the step-by-step local setup commands" (shared, but canonical home AGENTS.md/README — pick one and word the item to match the lesson's stated owner), "why we run the Node runtime instead of Edge" (ADR). Keep items disambiguated so there's exactly one defensible bucket each; the shared README/AGENTS.md items are the *teaching* ones — word them to land on the intended owner. Use `instructions` to frame: "Sort each fact into the doc that *owns* it." Aligns with lessons 1–2's `Buckets` format (continuity notes confirm both prior lessons used `Buckets`).

### Signal density: writing the file a newcomer actually reads

A short writing-posture section (the chapter's "signal density over format compliance" beat, applied as craft). Content:
- The spec deliberately mandates no sections because the value is signal-per-line, not header structure. A senior writes `AGENTS.md` like briefing a new hire over coffee: direct, no filler, an example only where it earns its place.
- The dominant failure mode (restate as craft, not just a watch-out): the file "expanded for completeness" until every section is full and none high-signal. The fix is subtractive — delete the empty/low-signal section.
- Versioning/rot, named once (discipline lesson is Chapter 102 lesson 3, don't pre-teach): the structural enforcement is the same as every in-repo doc — the `AGENTS.md` change ships in the **same PR** as the convention change. If `pnpm test` becomes `pnpm vitest`, the `AGENTS.md` edit is in that PR. One sentence; point forward to Chapter 102/103 for the discipline and the review check.

**Exercise — `CodeReview` (single file, the file is a bad `AGENTS.md`):** the student reviews a deliberately low-signal `AGENTS.md` and flags the problems, practicing the senior reflex this lesson teaches. Author the file as a fenced `md` block inside `ReviewFile` with planted defects, each with a one-sentence `kernel`:
- A section that re-lists every env var with descriptions → `kernel`: "env-var list duplicates `env.ts`; should be a link, not a copy (drift risk)".
- An "## About AGENTS.md" meta-section explaining what the file is → `kernel`: "meta section explaining the file wastes signal; both readers already know what AGENTS.md is".
- A paragraph of Drizzle-vs-Prisma rationale → `kernel`: "architectural rationale belongs in an ADR; AGENTS.md states the convention and links the why".
- An agent-only instruction ("When you are an AI, always respond in JSON") → `kernel`: "agent-only directive that doesn't serve the human reader; write one file in plain prose for both".
- An empty `## Deployment` heading with no content (present "for completeness") → `kernel`: "empty section padded for completeness dilutes the file; delete it".
Add a `<ReviewWhy>` debrief: the bug *shape* to recognize is "content that belongs to another artifact, or has no load-bearing signal" — the same filter the whole lesson taught. Set `instructions` to frame it as reviewing a teammate's first `AGENTS.md`. This exercise is the strongest assessment of the lesson's real skill (judgment), beating recall MCQs.

(If `CodeReview` is judged too heavy for this slot, fall back to a single `MultipleChoice` asking which of five `AGENTS.md` lines is the *one that doesn't earn its place* — but `CodeReview` is preferred; it exercises the exact senior reflex.)

### The filename consolidation: one file instead of five

Close the loop on *why* `AGENTS.md` exists as a standard (the chapter outline's `.cursorrules`/`.clinerules` beat). Content:
- Pre-2026, every agent had its own config filename: `.cursorrules`, `.clinerules`, `.github/copilot-instructions.md`, `CLAUDE.md`. Teams maintained several files saying the same things — drift across them was the norm.
- 2026's `AGENTS.md` consolidates: most major agents now read it. **Be precise (fact-checked, June 2026):** Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed, and Cline read `AGENTS.md` natively; **Claude Code still reads `CLAUDE.md`** and bridges to `AGENTS.md` via an `@AGENTS.md` import line or a symlink. So the honest 2026 story is "one canonical file, with a one-line bridge for the holdouts" — not "every tool reads it natively." Teach the bridge so the student isn't surprised, but don't enumerate every vendor's exact mechanism (it churns).
- The senior takeaway: maintain **one** `AGENTS.md`; if a tool needs its own filename, make that file a one-line pointer/symlink to `AGENTS.md` rather than a second source of truth. (Watch-out, in-section: maintaining two full instruction files = guaranteed drift; bridge, don't duplicate.)

**Term tooltip:** `CLAUDE.md` (brief: "Claude Code's own instructions filename; bridges to AGENTS.md via an import line or symlink"), and optionally `.cursorrules` (brief: "Cursor's legacy per-tool rules file, pre-AGENTS.md").

### External resources (optional, end of lesson)

`ExternalResource` cards: the `agents.md` homepage (the format guide), and optionally the course's own root `AGENTS.md` as a live worked example. Keep to one or two — high signal, matching the lesson's own posture.

---

## Scope

**This lesson covers:** what `AGENTS.md` is and who stewards it; the two-readers-one-file model; the inclusion test; the conventional sections (overview, repo layout, commands, conventions, `## Don't`, PR/commit, pointers) with a worked invoice-SaaS file; the nearest-file-wins hierarchy rule; the README/ADR/source-as-doc boundaries; the signal-density writing posture; and the one-file-instead-of-five consolidation (with the honest native-vs-bridge nuance).

**Out of scope — do not teach (reserved or already taught):**
- **Diataxis vocabulary and the 2x2** — taught in lesson 1; reference it only in passing (the "could this be a link?" reflex is the relevant callback). Do not re-derive the four doc types.
- **README structure / the five-section template / source-as-doc worked examples** — taught in lesson 2. Re-state only as concise prerequisites: README = first-contact + five sections; source files own their reference docs; the README links to `AGENTS.md`. One sentence each, no re-teaching.
- **The ADR template (Title/Status/Context/Decision/Consequences), the three-test inclusion check for ADRs, supersession, and the six opinionated-pick ADR sketches** — all lesson 4. This lesson only draws the *boundary* (`AGENTS.md` states the convention, the ADR holds the why) and may *name* a decision (e.g. "Drizzle over Prisma") as the kind of thing that links out — but must not justify it or show ADR structure.
- **TSDoc syntax, the tag set, and the why-not-what inline-comment rule** — Chapter 102. Mention TSDoc only as the thing the Server Action file carries (source-as-doc, lesson 2 callback); no syntax.
- **The docs-ship-in-the-PR discipline and the reviewer's doc checklist** — Chapter 102 lesson 3 and Chapter 103. Name the "same PR" rule for `AGENTS.md` in one sentence; do not teach the review/PR-template machinery.
- **Specific agent-product configuration** (settings *inside* Codex/Cursor/Claude Code apps, rules-file precedence UIs, MCP config) — out of scope; `AGENTS.md` is the in-repo surface only.
- **Auto-generated `AGENTS.md`** — out of scope; this is a hand-maintained, signal-curated file.
- **`CONTRIBUTING.md`** — settled in lesson 2 (closed-source SaaS: conventions live in `AGENTS.md`, no separate file). Don't reopen.

**Prerequisite concepts to redefine concisely (one line, don't expand):** README = first-contact doc that links out (lesson 2); source-as-doc = the canonical file owns its reference doc, others link (lesson 2); "could this be a link?" reflex (lesson 1); ADR = one-decision-per-file record of *why* (lesson 4, name-only); the course stack pieces named in examples (Drizzle, Better Auth, Server Actions, Zod, Biome) are already known from their own chapters — use them, don't explain them.

---

## Notes for downstream agents

- **Code-convention alignment:** the `AGENTS.md` content in examples should reflect `documentation/code standards/Code conventions.md` (Server Components default, Server Actions for mutations, `@/` imports, no `any`/use `unknown`, no `console.log`, Zod next to actions). The *file being authored is a conventions document*, so it legitimately restates conventions in one-liners — that's its job, not a violation of "comments are rare." Note this is deliberate so a reviewer doesn't flag the convention list as over-commenting.
- **Cross-lesson consistency (load-bearing):** reuse lesson 2's committed `pnpm` script names (`db:push`, `db:seed`, `db:generate`, `db:migrate`, `db:reset`, `test`, `dev`) and the `invoices`-table / `src/db/schema.ts` shape (continuity notes, lesson 2). The README (lesson 2) already pointed at `AGENTS.md`; this file must read as the same project. Do not invent contradicting script names or folder layouts.
- **Diagram engine:** HTML+CSS per `documentation/diagrams/html-css.md` (one diagram, `agents-md-audiences-and-boundaries`); `<FileTree>` for the two directory listings (repo layout, nested-files). No D2/Mermaid needed — nothing here is a system graph, state machine, or sequence.
- **Code components:** small `Code` (md fences) per section during the build-up; one `AnnotatedCode` (lang `md`, `maxLines` ≤18) for the assembled file. `CodeVariants` is *not* needed (no before/after of the same code, no multi-file comparison) — don't force it. `CodeReview` for the bad-file exercise.
- **Exercises:** `Buckets` (routing, 4 buckets, ~8 disambiguated items) + `CodeReview` (bad `AGENTS.md`, ~5 planted defects with one-sentence kernels, plus `<ReviewWhy>`). Skip an MCQ unless space demands the lighter fallback.
- **No video** is required; the topic is document-craft, better served by the worked file + exercises than a talking-head. Only add a `VideoCallout` if a genuinely on-point, recent (<6mo) clip on AGENTS.md surfaces during authoring — do not pad.
- **MDX hazards in examples:** `AGENTS.md` content contains `/docs/adr/`, `<feature>`, `.github/...`, `@AGENTS.md`, and `## Don't` (apostrophe) — inside HTML+CSS diagrams escape `<` as `&lt;` and wrap risky literals in expressions (per html-css.md MDX gotchas); inside fenced code blocks these are safe as-is.
