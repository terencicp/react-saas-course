# Chapter 101 — Docs that live next to the truth

## Lesson 1 — The four jobs of docs

**Taught.** Full Diataxis vocabulary: four document types by reader intent (tutorial/how-to/reference/explanation), the 2x2 axes (acquisition↔application, action↔cognition), the mixing trap, a high-level repo map assigning each type to its owning artifact, the "could this be a link?" reflex, and per-type quality bars.

**Cut.** Nothing significant cut; the chapter outline's how-to item mentioned `/docs/how-to/` as a possible home alongside `AGENTS.md` — the lesson mentioned both but did not elaborate (owned by lesson 3). The chapter outline's reference to Mermaid for the 2x2 diagram was replaced with HTML+CSS per the diagrams INDEX ruling; the two diagrams remain TODO stubs (custom components not yet built).

**Debts.**
- TSDoc syntax deferred to Chapter 102 (referenced only via a one-line `Term` tooltip).
- ADR template deferred to lesson 4 (referenced only via a one-line `Term` tooltip).
- README structure deferred to lesson 2 ("the next lesson takes this exact reflex and turns it into the README's design").
- `AGENTS.md` sections deferred to lesson 3.

**Terminology.**
- *Diataxis* — framework sorting docs by reader need (Procida, 2017); Greek dia- + taxis.
- *Tutorial* — acquisition + action; stranger to codebase; one hand-held path to working state.
- *How-to* — application + action; competent user; goal-directed, scan-to-answer.
- *Reference* — application + cognition; dry, complete, structurally organized; describes surface as-is.
- *Explanation* — acquisition + cognition; rationale, trade-offs, why behind a decision; read at leisure.
- *Source of truth* — the one canonical place a fact lives; every other mention should link, not copy.
- *Mixing trap* — a doc straddling two quadrants, serving no reader well.
- The 2x2 canonical placement (must not be rotated): Tutorial top-left, How-to top-right, Explanation bottom-left, Reference bottom-right.

**Patterns and best practices.**
- One document, one job; route each type to its correct artifact.
- "Could this be a link?" reflex: link to canonical source rather than paraphrasing it.
- Diataxis is a thinking vocabulary, not a folder mandate; most SaaS repos need only `README.md`, `AGENTS.md`, `/docs/adr/`.
- Repo map established: Tutorial → `README.md` "Getting started"; How-to → `AGENTS.md` / `/docs/how-to/`; Reference → source code (schema, `env.ts`, TSDoc); Explanation → `/docs/adr/` + inline `// why` comments.

**Misc.**
- Both custom diagrams are built components at `src/components/lessons/101/1/DiataxisQuadrantGrid.astro` and `src/components/lessons/101/1/ReadmeMixingTrap.astro`; later lessons referencing these visuals should import them rather than rebuild.
- Exercises: `Matching` (reader intent → type, 4 pairs) and `Buckets` (8 repo artifacts → 4 types) are authored and graded.
- Lesson includes a `VideoCallout` (Scaling DevTools podcast, `videoId="0BqucaRwHhA"`, ~24 min) plus three `ExternalResource` cards (diataxis.fr, Sequin blog before/after, Tom Johnson evaluation) — the outline had said no VideoCallout; the finished lesson added one.

---

## Lesson 4 — ADRs: one decision per file

**Taught.** Full Nygard ADR treatment: the five-section template (Title/Status/Context/Decision/Consequences); one-decision-per-file atomicity; write-while-deciding discipline (Proposed in the same PR, flip to Accepted on merge); the three-test inclusion check (architectural reach + reasonable disagreement + costly to reverse); sequential zero-padded never-reused numbering; supersede-in-place lifecycle (status changes, file never deleted); the `/docs/adr/README.md` hand-maintained index; the six course-stack ADR sketches (Drizzle, Better Auth, Biome, R2, Node runtime, native forms); the git-blame/PR-description rebuttal; and MADR named once.

**Cut.** Chapter outline mentioned "one paragraph per section discipline" as a named beat — the lesson folds it into the template section and recap rather than giving it a separate heading. The outline also mentioned the `adr-tools` CLI and `log4brains` tooling explicitly under watch-outs; the lesson doesn't mention either (all correctly kept out of scope). Nothing later lessons depend on was dropped.

**Debts.**
- Catching a missing ADR during PR review deferred to Chapter 103 (named in one clause in the write-while-deciding section: "Catching a *missing* ADR during the review itself is a reviewer's job").
- Writing an ADR from a seeded diff (hands-on authoring) deferred to Chapter 104 (the project chapter).

**Terminology.**
- *ADR* — Architectural Decision Record; short markdown file, one decision, `/docs/adr/0001-<slug>.md`.
- *Nygard template* — five sections: Title (numbered noun phrase), Status (Proposed/Accepted/Superseded/Deprecated), Context (forces at decision time), Decision (one declarative sentence), Consequences (honest mix of upsides + costs).
- *Three load-bearing sections* — Context, Decision, Consequences; the irreducible core (also what MADR keeps under its extra structure).
- *Supersede in place* — status field changes to "Superseded by ADR NNNN"; file body stays intact; no deletion.
- *Squash merge* — merging a PR by collapsing all commits into one; discards commit message bodies (introduced via Term tooltip; load-bearing for the git-log argument).
- *DSL* — Domain-Specific Language; used to name Prisma's `.prisma` schema file as a concrete cost in the Drizzle ADR specimen.
- *MADR* — Markdown Any Decision Records; adds Considered Options + Decision Outcome; more structured than Nygard; course uses Nygard.
- *Three-test inclusion check* — architectural reach + reasonable disagreement + costly to reverse; all three must hold.
- *ADR sprawl* — over-documenting (one ADR per feature flag / patch bump); the failure mode opposite to under-documenting.

**Patterns and best practices.**
- ADR filename: `0001-use-drizzle-not-prisma.md` — zero-padded sequence + kebab-case slug that IS the decision; consistent with kebab-case convention.
- Consequences section must include downsides; all-upside Consequences = sales pitch, not a record. This is the central quality bar.
- ADR ships in the same PR as the decision (Proposed → code merges → Accepted); deferred ADRs rot or become wrong.
- Decision line: one declarative sentence, unhedged ("We will use Drizzle…"); no hedges, no "we are considering."
- `/docs/adr/README.md` — hand-maintained index (number, title, status); updated in the same PR as each new ADR.
- If reversible in one PR by one engineer → code-review comment or AGENTS.md, not an ADR.
- "ADR 0001: Coding conventions" is the canonical beginner mistake — conventions are AGENTS.md, ADRs record decisions between alternatives.

**Misc.**
- The six course-stack ADR sketches are canonical: Drizzle (full specimen in AnnotatedCode), Better Auth, Biome, Cloudflare R2, Node runtime default, native React 19 forms. These are presented as `TabbedContent` (syncKey `"six-course-decisions"`) with per-tab `caption` carrying the accepted trade. Chapter 104 project will ask students to write an ADR from a diff; these six are the reference set.
- The Drizzle ADR (`0001-use-drizzle-not-prisma.md`) is the fully-worked canonical specimen, shown in `AnnotatedCode` with `lang="md"` and `maxLines={18}`; five AnnotatedSteps with colors Title=blue, Status=violet, Context=blue, Decision=green, Consequences=orange. Both the AnnotatedCode and TabbedContent are fully authored (no TODO stubs remain). Chapter 104 writers should treat this as the model.
- The inline comment connection is made explicit: `// why` justifies one line; an ADR justifies a decision spanning the codebase. Same reflex, different blast radius. This bridges Code conventions §Comments and the ADR format.
- Lesson closes the chapter arc explicitly: four jobs (lesson 1), README (lesson 2), AGENTS.md (lesson 3), ADRs (lesson 4) — the complete four-document surface. Forward-points to Chapter 102 (TSDoc fills the reference-in-source quadrant).
- Status lifecycle diagram is a fully-authored Mermaid `flowchart LR` wrapped in `<Figure>`; Proposed→Accepted→Superseded, plus Accepted→Deprecated side branch; nodes have custom `classDef` fill colors (yellow/green/blue/gray).
- VideoCallout: Derek Comartin (CodeOpinion), `videoId="6H6zfCNeqek"`, "Architecture Decision Records (ADR) as a LOG that answers WHY", ~10 min. Placed after the Nygard template section.
- Three ExternalResource cards: Nygard's 2011 Cognitect post, adr.github.io, and MADR (adr.github.io/madr/).

---

## Lesson 3 — AGENTS.md, the conventions file

**Taught.** Full AGENTS.md treatment: the two-readers-one-file model (coding agents + humans, same plain prose), the inclusion test ("would a competent newcomer need this in week one?"), the conventional sections (project overview, repo layout, commands, conventions, `## Don't`, PR/commit, pointers), the nearest-file-wins hierarchy rule (not merged), the three artifact boundaries (vs README, vs ADRs, vs source-as-doc), signal-density writing posture, and the one-file-instead-of-five consolidation with the honest Claude Code `CLAUDE.md` bridge caveat.

**Cut.** Chapter outline mentioned `pnpm test:watch`, `pnpm lint`, and `pnpm typecheck` as commands to list — the assembled AGENTS.md example omits `test:watch`, `lint`, and `typecheck` (and also `db:generate`) relative to the outline's suggestion; only `db:generate` was in the outline's commands list but omitted in the worked file. No ADR-template detail (correctly deferred to lesson 4). Nothing cut that a later lesson structurally depends on.

**Debts.**
- ADR template, Nygard sections, inclusion test, and six worked ADR sketches deferred to lesson 4 (boundary named here: "AGENTS.md states convention, ADR holds the why").
- "AGENTS.md change ships in the same PR as the convention change" discipline named in one sentence; full doc-ships-in-PR enforcement deferred to Chapter 102 lesson 3 and Chapter 103.
- Chapter 103 reviewer job: checking that AGENTS.md updates ship with the convention change.

**Terminology.**
- *AGENTS.md* — uppercase, plain-markdown file at repo root; no required schema; quality metric is signal per line.
- *Coding agent* — an AI tool that reads and edits a codebase directly (Codex, Claude Code, Cursor, Copilot agent mode, etc.).
- *Inclusion test* — "Would a competent developer (or agent) joining next Monday need this to be productive in week one?"
- *Signal per line* — the quality metric for AGENTS.md; a short high-signal file beats a thorough low-signal one.
- *Nearest file wins* — the AGENTS.md closest in the directory tree to the file being edited governs; files are not merged.
- *`CLAUDE.md`* — Claude Code's own instructions filename; bridges to AGENTS.md via an `@AGENTS.md` import line or symlink.
- *Bridge (one-line pointer)* — the senior move for tools that don't read AGENTS.md natively: one-line pointer file, not a second full instruction source.

**Patterns and best practices.**
- AGENTS.md sections: project overview (one paragraph), repo layout (FileTree or directory list), commands (exact, no narration), conventions (one line each), `## Don't` (rules only, link why to ADRs), PR/commit conventions (one short block), pointers (links to schema, env, ADR folder).
- Repo layout used in examples: `src/app` (Next.js routes), `src/components` (shared React), `src/db` (Drizzle schema + client), `src/server` (Server Actions), `src/lib` (pure helpers + adapters), `tests` (integration tests). Consistent with lesson 2.
- Commands in worked AGENTS.md: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm db:push`, `pnpm db:seed`, `pnpm db:migrate`, `pnpm db:reset` — identical set to lesson 2's README; canonical source is `package.json`.
- Conventions listed: Server Components by default / Client Components only at leaves; Server Actions for mutations / route handlers only for webhooks; Zod schemas next to the action; never `any`, use `unknown`; `@/` imports no deep relative paths.
- `## Don't` rules: no server modules in Client Components; no raw SQL outside Drizzle; no `useEffect` for server data; no `console.log` (noConsole lint rule fails CI).
- AGENTS.md change ships in the same PR as the convention change (stated as a one-sentence rule; enforcement is Chapter 102/103 territory).
- Maintain one AGENTS.md; bridge tool-specific filenames (e.g., CLAUDE.md) with a one-line import — never a second full file.
- Steward: Agentic AI Foundation under the Linux Foundation; `agents.md` homepage.
- Tools reading AGENTS.md natively (June 2026): Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed, Cline. Claude Code reads `CLAUDE.md` and needs the bridge.

**Misc.**
- Diagram built at `src/components/lessons/101/3/AudiencesAndBoundaries.astro` (HTML+CSS, two stacked bands — top: two-readers-one-file; bottom: three-card ownership split README/AGENTS.md/ADRs).
- Two exercises authored and graded: `Buckets` (4 buckets: README, AGENTS.md, source file, /docs/adr/) with 8 disambiguated items; `CodeReview` on a bad AGENTS.md with 5 planted defects + `<ReviewWhy>`.
- AnnotatedCode assembled file is complete (lang md, maxLines 18, full invoice-SaaS AGENTS.md, 6 AnnotatedSteps, blue for structural sections / green for the conventions + Don't sections).
- VideoCallout added: Prompt Engineering "Finally! A Standard for AI Coding Agents", `videoId="XDP94mYMCzA"`, ~12 min.
- Lesson closes explicitly handing off to lesson 4: "the boundary you kept hitting — 'the why lives in an ADR' — is the next lesson."

---

## Lesson 2 — The thin README and source-as-doc

**Taught.** README's one job (first contact, two audiences: new contributor + recruiter), the five-section template (title/description, getting started, common tasks, where-docs-live, license), the source-as-doc rule and its mechanical basis (paraphrase drifts silently; source-as-doc updates because the developer edits the file anyway), and three worked examples: schema-as-data-model-doc, env.ts-as-env-doc, Server-Action-as-API-doc.

**Cut.** Chapter outline mentioned "link, don't duplicate enforcement" as a named standalone beat — the lesson folds this into the Docs-live-next-to-the-truth section and the recap rather than giving it its own heading. Chapter outline mentioned `.env.example` discipline and CONTRIBUTING.md as separate bullets; both are present but embedded inside larger sections rather than as standalone h2s. Nothing later lessons depend on was dropped.

**Debts.**
- TSDoc syntax deferred to Chapter 102 (shown in use on the `createInvoice` action; explicitly flagged "syntax in the next chapter").
- `AGENTS.md` file contents/structure deferred to lesson 3 (README "Where the docs live" links to it; described only as "conventions file the next lesson builds").
- ADR template deferred to lesson 4 (README "Where the docs live" links to `/docs/adr/`; no template detail).

**Terminology.**
- *First contact* — the README's single job; anything needed after the first hour is not the README's problem.
- *Source-as-doc* — the canonical file that owns a truth IS the documentation for that truth; the README links, never paraphrases.
- *Paraphrase drift* — the failure mode where a description of a fact silently falls behind the fact when code changes (no test fails, no build breaks).
- *Five-section template* — title+description, getting started, common tasks, where-docs-live, license; every section is either a path-to-running or a pointer.
- *`.env.example`* — committed file with placeholder values for every required env var; contract that pairs with `env.ts`; copied by new contributors via `cp .env.example .env.local`.
- *`env.ts`* — `@t3-oss/env-nextjs` + Zod 4, `server`/`client` split, validates at build time (`pnpm build` fails on missing required var). Canonical env-var doc; no `ENVIRONMENT.md`.
- *Per-table header comment* — one paragraph above a Drizzle table explaining purpose and non-obvious invariants; no per-column comments unless the column's purpose isn't obvious from name+type.

**Patterns and best practices.**
- README stays ≤5 sections, each fitting one screen; thinness is the quality signal.
- Zero or two badges (CI status + license); never a badge wall.
- `pnpm` scripts used in the README skeleton: `db:push`, `db:seed`, `db:generate`, `db:migrate`, `db:reset`, `test`, `dev` — these must stay consistent across later lessons and the project.
- One header comment per Drizzle table; no per-column comments unless non-obvious (mirrors Code conventions §Comments: "Rare. Code names itself.").
- `env.ts` `@t3-oss/env-nextjs` shape: `server`/`client` split, Zod 4 top-level builders (`z.url()`, `z.string().min(1()`). Validated at build time. One inline comment only on non-obvious entries.
- `.env.example` placeholder values only (never real secrets; repo runs gitleaks); one-line comment only for non-obvious entries.
- Server Action contract = Zod input schema + `Result<T>` return type + TSDoc carrying what the types can't say; action body can be elided for documentation-lesson purposes.
- For closed-source SaaS: no `CONTRIBUTING.md`; conventions live in `AGENTS.md`.
- Routing map reinforced: full API reference → source; env vars → `env.ts` + `.env.example`; contribution guidelines → `AGENTS.md`; philosophy/architecture → `/docs/adr/`; changelog → `CHANGELOG.md`; deployment notes → `/docs/how-to/deploy.md`; TODOs/roadmap → issue tracker.

**Misc.**
- Lesson 2's `paraphrase-vs-link` diagram is a built component at `src/components/lessons/101/2/ParaphraseVsLink.astro`, HTML+CSS inside `<Figure>`, two-panel horizontal, muted two-color scheme (red/danger tint for drift side, green/success tint for link side) — distinct from lesson 1's four-color Diataxis palette.
- The `Buckets` exercise uses four buckets: "Stays in the README", "A source file", "AGENTS.md or /docs/adr/", "Issue tracker / changelog" — consistent with lesson 1's bucket format but testing artifact routing (not Diataxis type classification).
- Lesson explicitly notes Server Actions codebase needs no separate API-reference document (contrast: REST/tRPC generate one); this is a deliberate architectural-advantage framing of the course stack (Chapter 043 callback).
- The `invoices` Drizzle table shown uses `amountCents` (integer), `status` (text, default `'draft'`), `organizationId` FK with `onDelete: 'cascade'`, named index `idx_invoices_org_status`. Lesson 3+ should stay consistent with this shape when referencing the invoices table.
- `VideoCallout` in the env.ts section: Web Dev Cody, `videoId="DCZzFGX_050"`, "@t3-oss/env-nextjs + Zod setup" (~4 min).
- Three `ExternalResource` cards: GitHub "About READMEs", makeareadme.com (live preview editor), and env.t3.gg/docs/nextjs (t3-oss/env-nextjs reference).
- Lesson closes handing off explicitly to lesson 3: "the README pointed at `AGENTS.md`… that file is next."
