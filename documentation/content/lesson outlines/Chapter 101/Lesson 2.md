# The thin README and source-as-doc

- **Title (h1):** The thin README and source-as-doc
- **Sidebar label:** The thin README

---

## Lesson framing

This is the chapter's grounding lesson on *where docs live*. Lesson 1 gave the student Diataxis (the four jobs) and one reflex — "could this be a link?". This lesson cashes that reflex into two concrete, lasting senior habits:

1. **A thin README that stays accurate because it's short.** The README owns exactly one job — *first contact* — and a five-section template that fits on one screen.
2. **Source-as-doc:** the Drizzle schema file, the `env.ts` file, and the Server Action signature ARE the documentation for the things they describe. The README links to them; it never paraphrases them.

The single load-bearing idea, repeated until it's a reflex: **paraphrased docs drift because nothing forces them to update when the code changes; the source-file-as-doc updates because the developer is editing that file anyway.** Every "what NOT to put in the README" ruling and every worked example traces back to this one mechanical fact. Keep returning to it.

Pedagogical decisions that apply lesson-wide:

- **Lead with the failure, then the fix.** The student has seen (and written) the 400-line README. Open on *why* it rots — not effort, but structure — exactly as lesson 1 opened on the mixed README. Continuity: lesson 1's final `readme-mixing-trap` diagram already showed the README split into homes (`AGENTS.md` / `/docs/how-to/`, `src/db/schema.ts` · `env.ts`, `/docs/adr/`). This lesson builds the README half of that split; reference it explicitly so the two lessons interlock ("lesson 1 showed the split; here's the README side built out").
- **Decisions before syntax (course pillar).** README structure is genuinely about decisions — *what earns a line and what gets demoted* — not Markdown syntax. Frame every section as an inclusion call, never a formatting tutorial. Never explain Markdown headers/links; the student knows Markdown.
- **The worked examples are the heart, not decoration.** The schema-as-doc, env-as-doc, and action-as-doc trio is where the abstract rule becomes a thing the student can *see*. Spend the lesson's weight here. Use real shapes from the course's own stack (multi-tenant invoice SaaS, the running example across the course) so the code is recognizable, not toy.
- **Defaults before conditionals (course pillar).** Two conditional artifacts appear — badges and `CONTRIBUTING.md`. State the default (zero/two badges; no `CONTRIBUTING.md` for closed-source SaaS) first, name the threshold that flips it, move on. Do not let either balloon into a section of its own; fold them into the section where the question naturally arises.
- **Mental model the student should end with:** *The README is a front door, not a filing cabinet. Everything a reader needs after the first hour lives in the file that owns that truth, and the README points at it. Before I write any paragraph that states a fact (a column, an env var, an action's inputs), I ask: does this fact already live somewhere canonical? If yes, I link.*
- **What the student can DO by the end:** write/audit a README against the five-section template; correctly route any candidate line to its real home (README vs schema vs env vs action vs ADR vs AGENTS.md vs issue tracker); write a per-table header comment that turns reference into reference-plus-explanation in place; write a `.env.example` that doubles as the env contract.
- **Cognitive-load staging:** README first (familiar, concrete, low abstraction) → then the source-as-doc rule (the abstraction) → then three worked examples that instantiate it (concrete again) → then `.env.example` as the one new artifact to author → recap. The README section warms the student up before the conceptually heavier source-as-doc turn.
- **Tone:** adult, terse, senior-to-junior. Match lesson 1's voice — direct second person, the occasional dry line ("four documents wearing one trenchcoat" energy), no bootcamp cheer.

One factual alignment the writer must respect: **`env.ts` uses `@t3-oss/env-nextjs` + Zod** (per Code conventions §Security baseline / §file-layout, `env.ts` at the `src/` root), *not* hand-rolled Zod. The chapter outline's parenthetical "validated with Zod, Chapter 098" is loose; the canonical shape is the t3-env wrapper. Show that shape. Env validation fails the **build** (`pnpm build`), framed as "fails loudly" — t3-env validates at build time, which is even stronger than a runtime startup check.

---

## Lesson sections

### Introduction (no header)

Open warm and brief, in lesson-1 voice. Motivate with the concrete failure: the README nobody reads past line 50, and the silent rot below it. Connect back to lesson 1 explicitly — "you learned to name the four jobs and to ask *could this be a link?*; this lesson turns that reflex into the first artifact on the map." State the lesson's goal in one breath: make the README do one job and let the source files be the docs for everything else. Preview the payoff: by the end you'll audit any README in a minute and know where every line that doesn't belong actually goes. Keep it to ~2 short paragraphs.

### The README's one job: first contact

**Goal:** establish that the README has exactly two audiences and one job, which is what makes the template fall out.

- Name the two — and only two — readers: (1) a new contributor in their first hour, (2) a recruiter/reviewer skimming the repo on GitHub. Both want the same handful of things and *nothing else*.
- The senior question that drives the whole lesson, stated implicitly (per pedagogy — not as a header): *what goes in the README, what doesn't, and where does everything that doesn't go?*
- State the job: **first contact.** Anything a reader needs *after* the first hour is, by definition, not the README's job — it belongs in the file that owns that truth.
- This is the "trigger before tool" framing: the README's *thinness* is the feature. The reader trusts a short README; a long one is presumed stale (and usually is). Tie to lesson 1's quality bar: a tutorial passes if a new hire reaches a green checkmark in under 30 minutes without asking anyone — the README's Getting started IS that tutorial.

**Components:** prose only. No diagram needed here — the audience framing is a setup for the template that follows.

### The five-section template

**Goal:** give the student the exact skeleton, with the reasoning behind each section's inclusion.

Present the five sections as a structure the student can copy. Use a single annotated **`Code`** block of a complete, realistic README skeleton for the course's invoice-SaaS example (Markdown fenced as ```md), then walk the five parts in prose beneath — OR use **`AnnotatedCode`** (lang `md`) stepping through the five sections, one `AnnotatedStep` per section, highlighting each section's lines with prose explaining the inclusion call. **Recommend `AnnotatedCode`**: the README is one artifact whose parts each need a focused explanation, which is exactly its use case (continuity-notes diagram palette is unrelated here). Cap at 5 steps. Sections, in order:

1. **Title + one-paragraph description.** One sentence on *what*, one on *stack*. Model line: "A multi-tenant invoice management SaaS built on Next.js 16, Postgres, and Stripe billing." That's the whole section.
2. **Getting started.** The minimum copy-paste path to a running dev server, each command on its own line, *no narration between commands* — narration is what the reader distrusts. Use the canonical command set: `git clone …`, `pnpm install`, `cp .env.example .env.local`, `pnpm db:push`, `pnpm db:seed`, `pnpm dev`. Note `cp .env.example .env.local` here — it's the hook into the `.env.example` section later. Call out: this section IS the only tutorial in the repo (lesson 1 callback).
3. **Common tasks.** The four-or-five weekly tasks with their commands as a bulleted list — *not* an exhaustive command catalog. Examples: run tests (`pnpm test`), run one test file (`pnpm test path/to/file`), generate+run a migration (`pnpm db:generate && pnpm db:migrate`), seed (`pnpm db:seed`), reset the DB (`pnpm db:reset`). The senior call is *which* tasks: the ones that come up most, nothing aspirational. (Note for the writer: this is how-to per Diataxis; lesson 3 will move heavier how-to into `AGENTS.md`. Keep the README's list to the handful a daily contributor reaches for; don't pre-teach the README-vs-AGENTS boundary — that's lesson 3.)
4. **Where the docs live.** Links, not duplication — this section is the literal embodiment of lesson 1's reflex. Five links and that's it: conventions → `AGENTS.md`; architectural decisions → `/docs/adr/`; data model → `src/db/schema.ts`; environment variables → `env.ts`. Make the point loud: *this section exists so the rest of the README doesn't have to.*
5. **License.** One line.

After the walkthrough, drive home the meta-point: every section is a *pointer or a path to running*, never a body of reference. The README is a map, not the territory.

**Components:** `AnnotatedCode` (primary). The skeleton must use real `pnpm` scripts consistent with the course's stack (`db:push`, `db:seed`, `db:generate`, `db:migrate`, `db:reset`, `test`, `dev`).

### What does not belong in the README

**Goal:** make the demotion calls explicit and memorable, and to give each exile a destination (never just "don't").

Per the pedagogical rule, this is NOT a watch-outs dump — it's the active teaching of the routing decision. Frame as: every line below dilutes the README's one job, and *each one has a real home*. Present as a routed list (item → where it actually goes), so the student leaves with destinations, not prohibitions:

- Full API reference → the source (TSDoc on the function; covered next section + Chapter 102).
- Full env-var list with descriptions → `env.ts` + `.env.example` (this lesson, later section).
- Contribution guidelines → `AGENTS.md` (lesson 3) or `CONTRIBUTING.md` (conditional — see below).
- Philosophy / "Architecture" section → `/docs/adr/` (lesson 4). Flag this one hard: an "Architecture" heading in a README is *explanation* leaking into first-contact (lesson 1's mixing trap, named).
- Changelog → `CHANGELOG.md` or platform release notes.
- Team conventions → `AGENTS.md`.
- Deployment notes → `/docs/how-to/deploy.md` or a runbook.
- TODOs / roadmap / meeting notes → the issue tracker. (Wrong audience entirely — these never face the recruiter or the new hire.)
- Screenshots beyond one or two for context → cut; they go stale and nobody updates them.

**Exercise (recommended here):** a **`Buckets`** drill is the natural fit and mirrors lesson 1's `Buckets` (consistency). Two-column (`twoCol`). Buckets: "README", "Source file (schema / env / action)", "AGENTS.md", "/docs/adr/", "Issue tracker" — *but* five buckets may crowd; **prefer four buckets** to keep it clean: "Stays in the README", "A source file (schema / env.ts / action)", "AGENTS.md or /docs/adr/", "Issue tracker / changelog". Items (8–10): one-paragraph project description; the local-setup commands; "how to rotate the Stripe webhook secret"; the `invoices` table column list; `DATABASE_URL` and its description; "why we chose Drizzle over Prisma"; the test command; a list of next-quarter features; a screenshot of the dashboard; the license line. This checks the core skill — routing a line to its owning artifact — without re-running lesson 1's *type*-classification (different axis: artifact, not Diataxis type). Note for builder: grade by owning artifact; the description + setup + test command + license land in README, the rest demote.

**Badges — fold in here (conditional, kept short).** One CI-status badge and one license badge earn their place for the recruiter's at-a-glance read; everything else (coverage %, dependency versions, last-commit) is noise. Senior call: **zero or two, never more.** One paragraph, inside this section (it's a "what belongs at the top of the README" judgment) — do not give it its own h2.

**Components:** prose + `Buckets`.

### Docs live next to the truth

**Goal:** the conceptual pivot of the lesson — state the rule and, crucially, the *mechanical reason* it works.

This is the heart. State the rule plainly first, then the mechanism (the simplified-then-deepened approach):

- **The rule:** the file that owns a truth IS the documentation for that truth. The schema file is the data-model doc. `env.ts` is the env-var doc. The Server Action (with its Zod input schema and TSDoc) is the API doc for that action. The README *links* to these; it never copies them.
- **The mechanism (say it out loud, it's the whole lesson):** a paraphrase has nothing keeping it in sync with what it paraphrases. The instant the code changes, the paraphrase is silently wrong — no test fails, no build breaks, the doc just starts lying. The source-as-doc can't drift like that, because updating it *is* the act of changing the code. The developer touches the file anyway; the doc rides along for free. (This is the same "silently wrong" argument lesson 1 used for links — name the continuity, then deepen it: lesson 1 argued it for *links between* docs; here it's *the doc and the code being the same bytes*.)
- Contrast the alternative world briefly to motivate the choice (per pedagogy — "should alternatives be mentioned"): a REST or tRPC project generates a separate API-reference document that can fall out of sync with the handlers. The Server Action project *doesn't need one* because the function signature is the contract. This is a genuine architectural advantage of the course's stack (Server Actions as the API surface, Chapter 043) — name it as such, not as an accident.

Keep this section tight and abstract; the three worked examples next make it concrete. A small visual aid earns its place here — see below.

**Diagram (recommended, small):** a two-state "paraphrase vs link" illustration in **HTML + CSS** wrapped in `<Figure>` (per diagrams INDEX: an annotated illustration / color-coded segments → HTML+CSS is the top pick; this is not a system graph). Pedagogical goal: make "the paraphrase drifts, the link doesn't" *spatial* in one glance.
- **Left (the drift):** a README paragraph box reading "the `invoices` table has columns id, org_id, amount, status…" with a dashed, severed connector to a `schema.ts` box; show the schema box gaining a new `currency` column (highlighted) while the README box stays unchanged and is marked stale (red). Caption the gap: "nothing kept these in sync."
- **Right (the link):** a README box reading "Data model → `src/db/schema.ts`" with a solid live connector to the same `schema.ts` box; the schema gains `currency`, and because the README only points, it's still correct (green).
- Keep under ~400px tall, horizontal/side-by-side, `box-sizing: border-box`, `margin: 0` on descendants (Starlight prose reset), `flex-wrap: wrap` for narrow widths. This is a *simple* visual aid — a diagram in the lesson-1 sense (any visual that enriches), not a complex graph. The writer may instead reuse a muted two-color scheme; it need NOT reuse lesson 1's four-type quadrant palette (different concept — drift vs link, not Diataxis types). If the writer prefers, a `CodeVariants` before/after (Paraphrased vs Linked) can carry the same point in code form; the diagram is the stronger choice for the *drift over time* dimension, so lead with the diagram.

**Components:** prose + `Figure` (HTML+CSS). Optionally `Term` for "source of truth" — but it was already defined via `Term` in lesson 1; re-`Term` only if the writer judges the gap warrants it (prefer a one-line restatement in prose over a duplicate tooltip).

### The schema file is the data-model doc

**Goal:** first worked example — show reference-in-code, and the one senior addition (per-table header comment) that adds explanation in place.

- Show a real Drizzle table for the running example (`invoices`), using the course's canonical conventions: `pgTable`, snake-case casing set on the client (so TS reads `createdAt`, SQL is `created_at` — name this once, don't re-teach Drizzle), UUIDv7 PK, an `organization_id` FK with explicit `onDelete`, a `status` column, a named composite index leading with the tenant column (`idx_invoices_org_status`). The point: a reader scrolling this file already sees every table, column, constraint, and foreign key — that *is* reference documentation, in code form, that cannot go stale because it's executable.
- The senior addition: a **one-paragraph header comment above the table** that explains the table's *purpose* and the non-obvious invariants — turning reference into reference-plus-explanation in the one place it can't drift. Model comment (use verbatim shape): `// The invoices table — one row per issued invoice; tenant-scoped on organization_id; status transitions are append-only via invoice_events.`
- State the discipline crisply: **one header comment per table; no per-column comments** unless a column's purpose isn't obvious from its name and type. (Aligns with Code conventions §Comments: "Rare. Code names itself." — per-column narration is the forbidden "restating type signatures / narrating the next line".) This is a watch-out taught inline, in the section that owns it.

**Components:** `AnnotatedCode` (lang `ts`) is ideal — step 1 highlights the table body and says "this is reference, and it's executable, so it can't lie"; step 2 highlights the header comment and says "this one paragraph adds the *why* without adding a thing that can drift"; step 3 (optional) highlights a column whose name is self-explanatory to make the no-per-column-comments point. Cap 3 steps, `maxLines` default. Keep the table realistic but trimmed (5–7 columns) so it fits.

**Tooltip candidate:** `Term` on **"tenant-scoped"** / multi-tenant if not already familiar from earlier units — the course is multi-tenant from Unit 10, so the student has met it; a one-line `Term` is a low-cost safety net. Writer's call.

### env.ts is the env-var doc

**Goal:** second worked example — the typed env module as reference-plus-explanation, and `.env.example` as its companion contract.

- Show the canonical `env.ts` shape: **`@t3-oss/env-nextjs` + Zod**, with a `server` / `client` split, each variable Zod-typed (`z.url()` for `DATABASE_URL`, `z.string().min(1)` for secrets, etc., using Zod 4 top-level builders per conventions). Make the dual role explicit: the schema is *reference* (what's the type, is it optional, what's the default) and the per-variable shape + a short comment carries *explanation* (why this var exists, what breaks without it).
- The mechanical payoff, stated strongly: this validation runs at **build time** — a missing `DATABASE_URL` fails `pnpm build`. That's *stronger* than a doc: the contract is enforced by the toolchain, not by a paragraph someone has to remember to update. Frame as "the env doc that can't be ignored because the build won't proceed without it."
- The README's entire env surface is then *one link to `env.ts` plus the `.env.example` file*. **No separate `ENVIRONMENT.md`.** Name the anti-pattern of documenting env vars in three places (README table, `ENVIRONMENT.md`, `env.ts`) → three sources of truth, two will drift. (Watch-out taught inline.)

**`.env.example` discipline (its own short beat inside this section, not a separate h2):**
- A committed `.env.example` with every required variable, fake/placeholder values, and a one-line comment only on non-obvious entries. *This file is the contract.* If a dev's `.env.local` is missing a key present in `.env.example`, the t3-env build-time parse fails loudly — which is exactly why the Getting started step `cp .env.example .env.local` works as the on-ramp.
- Tie the loop closed: Getting started (section 2) assumes `.env.example`; `env.ts` enforces it; the README links to `env.ts`. Three artifacts, one contract, zero duplication.
- Watch-out inline: never commit real secrets to `.env.example` — placeholders only. (The course's repo runs gitleaks; mention the discipline, not the tool, unless the writer wants a one-liner.)

**Components:** `CodeVariants` is a strong fit here to show the *two files side by side* as one contract — tab 1 `env.ts` (the validator), tab 2 `.env.example` (the placeholder contract) — each tab's prose stating its half of the job. This uses CodeVariants for its "group related files" purpose (per components INDEX). Alternatively `AnnotatedCode` on `env.ts` alone; **prefer `CodeVariants`** because the pairing *is* the lesson (validator + example are two halves of one doc surface). Keep each block short (≤18 lines; CodeVariants caps at 18).

### The Server Action is the API doc

**Goal:** third worked example — the function signature as the API contract, no separate API reference needed.

- Recall (one line, don't re-teach) that Server Actions are the course's API surface (Chapter 043). Show a realistic action signature for the running example — `createInvoice` — with: a Zod input schema next to it, a precise return type (the course's `Result<T>` discriminated-union contract), and **TSDoc on the function** whose first sentence is the IDE hover. The TSDoc documents what the *types don't already say*: the non-obvious failure modes. Model the TSDoc shape from Code conventions (first sentence = hover; `@param`, `@returns`, `@throws` only).
- The senior reflex, stated: keep the action small, type it precisely, and comment only the non-obvious failure modes inline. That combination *is* the API doc — input shape (the Zod schema), success/error shape (the `Result` type), and the surprises (the TSDoc). A reader (or an AI agent, though don't foreground AI per pedagogy) gets the full contract from the function itself.
- Contrast (briefly, motivates the stack choice): a REST/tRPC codebase ships a generated API reference document that can drift from the handlers; the Server Action codebase doesn't generate one because the function is the doc. Reinforces the §"docs live next to the truth" thesis on the API axis.
- Boundary note for the writer: do NOT teach TSDoc *syntax* here — that's Chapter 102. Show it in use, name it via the `Term` lesson 1 already established, and move on. The lesson teaches *that the action is the doc*, not *how to write a TSDoc block*.

**Components:** `AnnotatedCode` (lang `ts`) walking the action: step 1 → the Zod input schema ("the input contract"); step 2 → the return type ("the success/error contract"); step 3 → the TSDoc first sentence + a `@throws` ("the only thing the types can't say"). Cap 3 steps. The action body itself can be elided/`// …` — the *signature and contract* are the lesson, not the mutation logic (note this elision is deliberate so downstream agents don't fill in a full five-seam action body and bury the point).

**Tooltip candidate:** `Term` on **`Result<T>`** if the writer judges the discriminated-union return contract needs a one-liner (it's a course-wide convention; a reminder tooltip is cheap and on-topic).

### CONTRIBUTING.md: when a separate file earns its place

**Goal:** resolve the one remaining conditional artifact cleanly, default-first, and short.

- Default (closed-source SaaS, the course's assumption): **no `CONTRIBUTING.md`.** Contribution conventions live in `AGENTS.md` (lesson 3). State this as the default.
- The threshold that flips it: an open-source library or open-by-policy repo where *external* contributors exist. Then yes — `CONTRIBUTING.md` covers the PR process, code-of-conduct pointer, and how to claim an issue. State the conditional once and stop.
- Keep this to ~1 short paragraph. It's a conditional, not a topic; do not expand it. (Placed late because it's the smallest decision and follows naturally from "contribution guidelines don't belong in the README" from the §"what does not belong" section.)

**Components:** prose only.

### Recap

**Goal:** compress the lesson to its two reflexes and hand off to lesson 3.

- The README has one job (first contact) and five sections (title+description, getting started, common tasks, where the docs live, license); everything else routes to the file that owns it.
- Docs live next to the truth: the schema is the data-model doc, `env.ts` + `.env.example` is the env doc, the Server Action signature is the API doc. The README links; it never paraphrases — because the paraphrase drifts silently and the source-as-doc can't.
- The reflex to carry: *before writing any paragraph that states a fact, ask whether that fact already lives somewhere canonical, and if so, link.*
- Hand off: the README pointed at `AGENTS.md` for "how we work here" — the next lesson builds that file, the home for conventions and the heavier how-to that the thin README deliberately doesn't carry.

**External resources (optional `ExternalResource` cards):**
- GitHub's "About READMEs" docs (the recruiter-audience, rendering-on-GitHub angle) — optional.
- The `@t3-oss/env-nextjs` docs (the env-as-doc tool) — optional, only if it doesn't duplicate a Chapter 098 resource.
Keep to at most one or two; don't pad.

---

## Scope

**Prerequisites to restate concisely (1 line each, do NOT re-teach):**
- Diataxis four types + the "could this be a link?" reflex + the repo map (lesson 1, this chapter) — assume fully known; reference, don't re-derive.
- Multi-tenant SaaS / `organization_id` tenant scoping (Unit 10) — assume known; a one-line `Term` is the max.
- Drizzle schema basics, `pgTable`, snake-case casing, UUIDv7 PK (Units 6/9) — assume known; show the shape, don't explain the ORM.
- Server Actions as the API surface, the `Result<T>` contract, Zod input schemas (Chapters 043–045) — assume known; show the signature, don't re-teach actions.
- `env.ts` exists and validates env (Chapter 098) — assume known; this lesson reframes it *as documentation*, it does not teach env validation from scratch.

**This lesson does NOT cover (route elsewhere):**
- `AGENTS.md` contents, sections, two-audience framing → **lesson 3, this chapter.** Do not pre-teach the README-vs-AGENTS boundary beyond "heavier how-to and conventions go to AGENTS.md."
- ADR template, Nygard sections, the course's opinionated picks → **lesson 4, this chapter.** The README only *links* to `/docs/adr/`.
- **TSDoc syntax** (tags, block structure, the IDE-hover mechanics) → **Chapter 102.** Show TSDoc in use as the action/schema doc; never teach how to write the block.
- Inline comment conventions in depth, the doc-discipline-in-PRs / reviewer-catches-drift angle → Chapter 102 / 103. Mention "the doc ships in the same PR as the code" at most in passing if it arises; don't build it out.
- Auto-generated docs (TypeDoc, Drizzle Studio, drizzle-kit introspect) → out of scope; the course's thesis is the *typed source is the doc*. State that stance if it comes up; don't demo generators.
- Multi-package / monorepo READMEs and per-package nested files → out of scope; the course is single-app. (Nested-file hierarchy for `AGENTS.md` is lesson 3's concern, not here.)
- Wiki / Notion / Confluence → out of scope (chapter-wide stance: durable docs live in the repo).

---

## Code-convention notes for downstream agents

- **`env.ts` = `@t3-oss/env-nextjs` + Zod**, `server`/`client` split, validates at **build time** (`pnpm build` fails on a missing required var). Use Zod 4 top-level builders (`z.url()`, etc.). This corrects the chapter outline's looser "validated with Zod" wording — deliberate alignment to Code conventions §Security baseline.
- **Drizzle table shape:** `pgTable`, casing set on the client (`drizzle({ client, casing: 'snake_case', schema })`) so TS is `createdAt` / SQL is `created_at`; UUIDv7 PK (`uuid('id').primaryKey().$defaultFn(() => uuidv7())`); explicit `onDelete` on FKs; named composite index leading with `orgId` (`idx_invoices_org_status`). Trim to 5–7 columns for fit.
- **Server Action:** show signature + Zod input schema + `Result<T>` return + TSDoc (first sentence = hover; `@param`/`@returns`/`@throws` only). Action body deliberately elided (`// …`) — the contract is the lesson, not the five-seam mutation flow.
- **Comments:** one header comment per table; no per-column comments unless non-obvious (Code conventions §Comments: "Rare. Code names itself."). TSDoc on exported public surface only.
- **`.env.example`:** placeholder values only, never real secrets (repo runs gitleaks). One-line comment only on non-obvious entries.
- **pnpm scripts in the README skeleton** must be internally consistent: `db:push`, `db:seed`, `db:generate`, `db:migrate`, `db:reset`, `test`, `dev`.
- **Deliberate pedagogical divergences (so downstream agents don't "fix" them):** elided action body; trimmed schema; README skeleton is illustrative (real projects' command sets vary) — all intentional for focus.
