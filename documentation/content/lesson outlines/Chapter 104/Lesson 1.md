# Lesson 1 — Project overview

## Lesson title

Chapter-outline title "Project Overview" is the contract-mandated title for the first project lesson — keep it.
- Page title: `Project overview` (sentence case)
- Sidebar: `Overview`

## Lesson type

`Project overview`

(First lesson of a project chapter. No feature built; no test file; student leaves with a running audit target and the review scaffold's `Started at:` line filled.)

## Lesson framing

The student walks away with a running audit target and the senior reflex that a review is a *staged pass*, not a top-to-bottom file read: they boot the `/plan` surface, calibrate their eye against the app's established conventions (`authedAction`, `tenantDb`, `logAudit`, the Temporal seam, the existing `'use cache'` reads), and commit in writing to the five-layer stack order before reading a single defect. The payoff installed here is restraint and ordering — the discipline that keeps the rest of the chapter's review from drifting into style commentary.

## Codebase state

First lesson — no Entry/Exit detail required by the contract. For orientation:
- **At entry:** student has not yet obtained the starter.
- **At exit:** `start/` tree cloned and running on `:3000`; `/plan` visible in the browser; `reviews/chapter 104.md` carries its `Started at:` note under the shipped pass-order header. No comments written, no ADR drafted, no audited source changed.

## Lesson sections

Follow the Project-overview section list exactly: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.

### What we're building (intro, no header)

One paragraph: a read-only review pass on the `/plan` surface of a running invoices app, plus the one ADR the surface's design decision earns. State the deliverable plainly — two scaffolds filled *in place*: `reviews/chapter 104.md` (ships with the pass-order header + a `<!-- TODO(L2) -->` marker) completed with five file-and-line-anchored comments, a severity summary, and a verdict; and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (ships with four empty Nygard sections) filled. Emphasize the read-only nature: no audited source changes — the proposed fix lives in each comment body.

Figure (single, per contract): a `Screenshot` of the `/plan` surface running in the browser shown alongside one filled four-part comment block, so the student sees both the surface and the deliverable shape before reading source. Wrap in `Figure` with a caption. This is the only figure in the lesson.

### What we'll practice

Bulleted list (the skills, framed as senior reflexes the student is developing), drawn from the chapter outline:
- Running a surface through the five-layer review stack *in stack order* (correctness/security → principles → patterns → tests/contracts → style), not top-down on the file list.
- Writing comments in the four-part anatomy — severity, observation, principle/pattern with lesson ID, action.
- Drawing the blocking-vs-suggesting cut, and reading every security-relevant mutation against the canonical audit-log catalog.
- Running the three-test inclusion check to decide what earns an ADR, and writing a crisp, honest ADR in the Nygard shape.
- Self-grading a review against the reference and turning the misses into a sharper personal checklist.

### Architecture

Per contract: "diagram or labeled list — shape only." A labeled list is sufficient here; the relationship is conceptual (four disciplines applied to one unchanging surface), not a request flow or state machine, so no diagram is warranted. Use a `CardGrid`/`Card` set or a plain labeled list naming the four disciplines:
- **The review stack** — orders the pass; the student commits to the order in writing before reading source.
- **The principle-and-pattern map** — the one-page cheatsheet condensed from chapter 103 lesson 1; every comment cites it by ID; keep it open in a second tab.
- **The four-part comment template** — carried from chapter 103 lesson 2; the shape every finding takes.
- **The Nygard ADR scaffold** — the shape the one recorded decision takes.

Close with the load-bearing sentence: the audit target (`/plan`) never changes; the two deliverable scaffolds and the `docs/adr/README.md` index are the only things that grow.

### Starting file tree

Use `FileTree`. Annotate only the files changed from the prior project (the `/plan` surface + its `src/lib/plan/` modules) or that the lessons touch; leave the carried-over invoices/inspector subtrees uncommented. Mark the two **focus files** the student fills — `reviews/chapter 104.md` and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` — as highlighted (these are the project's "TODO" equivalents; note there are no in-source TODO comments, the scaffolds carry `<!-- TODO(Lx) -->` markers instead).

Source the tree from the chapter outline's "Starter file tree" block. Keep it to the top-level layout plus the `/plan` and `src/lib/plan/` leaves and the deliverable files; collapse the rest. Comment lines to include verbatim-in-spirit:
- `reviews/chapter 104.md` — SCAFFOLD: pass-order header + `Started at:` + `<!-- TODO(L2) -->` (student fills)
- `reviews/template.md` — four-part comment scaffold, read once
- `docs/adr/README.md` — ADR index intro + rows 0001-0006 + `<!-- TODO(L4) -->`
- `docs/adr/0007-...md` — SCAFFOLD: Nygard title + 4 empty `##` sections (student fills)
- `src/app/(app)/plan/{page,seat-usage,actions}.tsx|ts` — the audit target
- `src/lib/plan/{get-plan-entitlement,renewal-countdown,schemas}.ts` — the audit target's modules
- `src/lib/analytics/page-view-tracker.ts` — the side-effect module
- `lesson-verification/` — ships empty (`.gitkeep`); no automated checker this chapter

After the tree, a short paragraph: the canonical helpers (`src/lib/authed-action.ts`, `src/lib/audit-log.ts`, `src/lib/tenant-db.ts`, `src/lib/temporal.ts`, the existing `'use cache'` reads in `src/lib/invoices/queries.ts`) are read once here to calibrate the eye for where `/plan` bypasses them — they are the established surface every finding is measured against. Link each helper to its origin lesson rather than re-explaining (chapter 057 l2/l5, chapter 083, Unit 14).

### Roadmap

`CardGrid` with one `Card` per remaining lesson (number + title + one sentence on what it adds), per contract:
- **Lesson 2 — The auth bypass.** Walks finding 1 (the missing `authedAction` wrapper) end-to-end as the review's modeled comment.
- **Lesson 3 — Four more blocking findings.** Surfaces the side-effect import, the `Date` arithmetic, the derived-state effect, and the missing audit-log write, then closes the review with summary and verdict.
- **Lesson 4 — ADR 0007.** Runs the three-test inclusion check and writes the cache-decision ADR with a crisp Decision line and an honest Consequences list, then self-grades both artifacts.

### Setup

`Steps` component. Exact commands in order; first step is the contract-mandated repo line. No env vars (state this — the app runs against an in-memory store seeded at boot, `src/server/store.ts`).

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 104/start/`.
2. `pnpm install` — installs cleanly.
3. `pnpm dev` — app runs on `:3000`; open `/plan` (use the inspector's identity switcher to view a second org if desired).
4. Read the `/plan` surface in the browser and its source (`src/app/(app)/plan/*`, `src/lib/plan/*`) against the established conventions — there is no PR diff; the surface itself is the unit under review.
5. Open `reviews/chapter 104.md` — it ships with the `Pass order: correctness/security → principles → patterns → tests/contracts → style` header, a blank `Started at:` line, and a `<!-- TODO(L2) -->` marker. Fill `Started at:` with a one-line note on where the pass begins. Read `reviews/template.md` once for the four-part comment shape; keep the principle-and-pattern cheatsheet open in a second tab.

Expected result (one sentence): the app runs locally, `/plan` is visible, and the review scaffold carries its `Started at:` note under the shipped pass-order header — no comments, no ADR yet.

Close the section with two short framing paragraphs (these carry the lesson's senior payoff, keep them — they are not setup mechanics):
- The pass-order header is not decoration: the starter ships it so the senior reflex is on the page before the student touches source, and filling `Started at:` is the act of committing in writing to where the pass begins. The review reads top-down on the *stack*, not on the file list — starting at line 1 of the first file is the failure mode chapter 103 lesson 1 warned against, and ignoring the shipped order is the first signal a review drifts into style commentary.
- The reference deliverables live under `solution/`, but the student is on the honor system not to open them until the review and ADR are written in lesson 4 — a real review has no answer key, and running the pass under "no peeking" is what trains the reflex. Use an `Aside` (caution or note) for the honor-system rule so it stands out.

Code/component handling for this lesson:
- `Code` for the setup command sequence shell snippets (inside `Steps`).
- `FileTree` for the starting tree.
- `Screenshot` inside `Figure` for the single What-we're-building figure.
- `CardGrid`/`Card` for Roadmap (and optionally Architecture).
- `Aside` for the honor-system "no peeking" rule.
- No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` needed — no source is taught or modified here; the source files are *read in the browser/editor*, not reproduced in the lesson. If a one-line illustration of the bare side-effect import or the hand-rolled session check helps preview "what a defect looks like," keep it to a single `Code` block and defer the real audit to lessons 2-3.

## Scope

This lesson does **not**:
- Write any review comment — that begins in lesson 2 (the modeled auth-bypass finding).
- Surface or explain the defects — lessons 2 and 3 audit them; the overview only calibrates the eye against the canonical helpers.
- Write or fill the ADR — lesson 4 owns ADR 0007 and the three-test inclusion check.
- Teach the technology behind the stack (caching, Temporal, `authedAction`) — those are owned by their origin teaching chapters (Unit 14, chapter 083, chapter 057); link, don't re-explain (Project-overview contract: technology rationale belongs in regular lessons).
- Provide an automated checker — `lesson-verification/` ships empty for the whole chapter; all verification is by hand. This is not a security audit (chapter 082 owned that) nor a full architectural rethink (the `/plan` surface is small, well under the 400-LOC threshold).
