# Lesson 6 — Document the performance findings

## Lesson title

Chapter-outline title fits. Keep **Document the performance findings**.
Sidebar: **Performance findings**.

## Lesson type

`Implementation`

The test-coder runs for this lesson. The writer renders the Implementation section list (Goal + Finished result / Your mission / Coding time / Moment of truth).

## Lesson framing

The student walks away having produced the performance half of a launch-review audit report and, more durably, the senior verdict that splits the chapter: observability gaps get *wired* before launch because they lose data, performance gaps go to the *backlog with measured impact* because they are slow, not bleeding. They write three findings (RSC waterfall, barrel import, N+1) plus the optional composite-index bonus against the rule-location-consequence-fix template, fix only the barrel import in-place to capture the bundle-analyzer before/after as required evidence, and assemble `SUMMARY.md` as the coverage-and-evidence artifact. The load-bearing discipline installed here is "document, don't patch" — resisting the urge to fix the waterfall, image, and N+1 while in the file, because mixing fixes into a documentation pass bloats the PR and obscures scope.

## Codebase state

### Entry

Findings 1–4 (the observability half) are already wired and their finding files filled: Sentry across client/server/edge (lesson 3), the `redact` seam + correlation IDs (lesson 4), the consent-gated PostHog (lesson 5). Finding 7 (`findings/007-missing-priority.md`) was modeled end-to-end in lesson 2 as the reference shape. The four performance defects are still live and undocumented in the running tree: the RSC waterfall in `src/app/(protected)/dashboard/page.tsx`, the `lucide-react` barrel in `src/app/(protected)/layout.tsx` (`next.config.ts` carries a `TODO(L6)` and no `optimizePackageImports`), the N+1 in `src/db/queries/invoices-with-customer.ts`, and the missing composite index on `invoices`. The empty placeholder files `findings/005-rsc-waterfall.md`, `findings/006-barrel-import.md`, `findings/008-n-plus-1-invoices.md`, `findings/010-composite-index.md`, `findings/SUMMARY.md`, and `findings/out-of-scope.md` ship from the `start/` skeleton; `findings/screenshots/` holds only `.gitkeep`.

### Exit

`findings/005-rsc-waterfall.md`, `findings/006-barrel-import.md`, and `findings/008-n-plus-1-invoices.md` carry all four template sections with operator-visible consequences; the optional `findings/010-composite-index.md` is filled. `next.config.ts` lists `lucide-react` under `experimental.optimizePackageImports` (the `TODO(L6)` resolved) — the one in-place performance fix. `findings/screenshots/before-barrel.png` and `after-barrel.png` exist and are embedded in finding 006. `findings/SUMMARY.md` states coverage (8/8 floor, 9/10 or 10/10 with bonuses) and pastes the final analyzer treemap; `findings/out-of-scope.md` records the deliberate cuts. The app still boots clean — only the barrel import is patched; the waterfall, N+1, and missing index remain in source by design so their fingerprints stay readable.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: produce the performance half of the findings report — three documented findings plus the bonus, the barrel fixed in-place with measured before/after, and `SUMMARY.md` assembled as the coverage scorecard.
Finished-result description: a `findings/` directory whose eight files are now all filled, `findings/006-barrel-import.md` embedding analyzer-treemap before/after screenshots that show the `lucide-react` tile collapsing, and `SUMMARY.md` quantifying coverage.
Single figure: a `Screenshot` (or `TabbedContent` of two `Screenshot`s) of the analyzer treemap before vs. after the barrel fix — the `lucide-react` tile dominating, then shrinking to the dozen used glyphs. This is the lesson's evidence artifact, so show it up front.

### Your mission (header: "Your mission")

Prose paragraph then a single requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints.

Prose weaves:
- **Feature.** Write the performance half of a launch-review audit report a senior would attach to a release summary — each finding naming rule, location, consequence, and fix with measured impact.
- **The load-bearing constraint (document, don't patch).** The audit's contract for performance is documentation, not patches. The single exception is the barrel import, fixed in-place because the bundle-analyzer before/after is the required evidence. The trap is "just fixing it while I'm in the file" on the waterfall, image, and N+1 — mixing fixes into a documentation pass bloats the PR and obscures scope.
- **Read the surface first.** Each finding has a diagnostic surface that names the bug before source: the waterfall shows as a staircase of four sequential spans with idle gaps in a DevTools Performance / Sentry trace (read the trace first, then confirm in source — inverting it misses bugs where the dependency only *looks* present); the barrel shows as an oversized `lucide-react` tile in the `pnpm next experimental-analyze` treemap; the N+1 shows as 1 + N spans in a trace, confirmable with `.toSQL()`; the missing index shows as a `Seq Scan` + in-memory `Sort` in `EXPLAIN ANALYZE`.
- **Constraint (config placement).** `optimizePackageImports` is still under `experimental` as of Next.js 16.2 — write it under `experimental`, not as a top-level key.
- **The senior reach.** Bonus finding 10 (missing composite `(org_id, created_at)` index, proven with `EXPLAIN ANALYZE`) past the eight-finding floor; `SUMMARY.md` is the coverage-and-evidence document, not a list of titles; deliberate scope cuts go in `out-of-scope.md`.
- **Out of scope (one line).** This lesson does not ship the waterfall / N+1 / index fixes — they go to the backlog (assembled in lesson 7); only the barrel is patched.

Functional requirements (numbered, each tagged). The tests are `readFileSync` source-shape probes in a node env (no DOM) per the seeded `Lesson 6.test.ts`, so they assert the presence and shape of the finding files and the one in-place fix:

1. `[tested]` `findings/005-rsc-waterfall.md` carries all four sections, names the chapter 094 lesson 6 RSC-waterfall rule, locates the defect in `src/app/(protected)/dashboard/page.tsx`, and names the fix as parallelizing the independent invoices+members pair only.
2. `[tested]` `findings/006-barrel-import.md` carries all four sections, names the chapter 094 lessons 3/4 barrel + analyzer rule, locates it in `src/app/(protected)/layout.tsx` and `next.config.ts`, names the `optimizePackageImports` fix, and embeds both `screenshots/before-barrel.png` and `screenshots/after-barrel.png`.
3. `[tested]` `findings/008-n-plus-1-invoices.md` carries all four sections, names the chapter 094 lesson 7 N+1 rule, locates it in `src/db/queries/invoices-with-customer.ts`, and names the relations-API (`findMany({ with: { customer: true } })`) fix verified with `.toSQL()`.
4. `[tested]` `next.config.ts` lists `lucide-react` under `experimental.optimizePackageImports` (the one in-place performance fix).
5. `[untested]` Each finding's Consequence is operator- or user-visible (a timing, a byte count, a query count, a plan node), never "code smell" or "could potentially" hedging.
6. `[untested]` Each finding carries a Category and a Severity with a two-line justification (per the template).
7. `[untested]` The before/after screenshots are real captures from `pnpm next experimental-analyze` runs (before the config edit, then after), showing the `lucide-react` tile collapse.
8. `[untested]` `findings/SUMMARY.md` states coverage (8/8 floor, plus bonuses), names the audit cadence, and pastes the final analyzer treemap as secondary evidence.
9. `[untested]` `findings/out-of-scope.md` records the deliberate cuts (deferred fixes recorded as backlog, observations outside the eight categories).
10. `[untested]` (Bonus) `findings/010-composite-index.md` names the missing composite index, proven with `EXPLAIN ANALYZE`, with the fix as declare-in-schema **plus** a generated `drizzle-kit` migration — naming the index without generating the migration is half-credit.
11. `[untested]` The target still boots clean with only the barrel import patched (the waterfall, N+1, and missing index stay in source).

Note for the writer: requirements 5–11 are the report-quality and verdict requirements the source-shape tests can't reach — they live in the by-hand checklist of Moment of truth and are covered by the reference solution.

### Coding time (header: "Coding time")

One-line build prompt: implement against the brief and the lesson's tests, then read the reference solution. The writer wraps the solution in `<details>`.

The reference solution shows the filled finding files organized as they sit in `findings/`, the single `next.config.ts` edit, the `SUMMARY.md` shape, and the optional bonus finding. Ground every snippet against the solution tree (do not invent numbers — use the ones in the answer-key files):

- **`findings/005-rsc-waterfall.md`** — present the filled file. Rule: dependency-check before every `await` (chapter 094 lesson 6). Location: `dashboard/page.tsx` lines 16–23, the four-await chain `requireOrgUser() → getOrganization(orgId) → listInvoicesWithCustomer({ orgId }) → listMembers(orgId)`, surfaced by a Performance/Sentry trace staircase then confirmed with `rg -n "await "`. Consequence: page pays the sum of four round-trips where three is reachable (~320ms vs ~240ms achievable at seed scale); slow authenticated landing; compounds with the N+1. Fix (documented, not patched): the `Promise.all` rewrite of the **independent pair only** — show the snippet from the solution file:
  ```tsx
  const { user, orgId } = await requireOrgUser();
  const org = await getOrganization(orgId);
  const [invoices, members] = await Promise.all([
    listInvoicesWithCustomer({ orgId }),
    listMembers(orgId),
  ]);
  ```
  Rationale callout: `user → org` stays sequential because `org` genuinely needs `orgId`; wrapping all four is the "wrap everything" anti-pattern that breaks the dependency. Name React `cache()` (not `unstable_cache`) as the companion for request-scope dedup. Use `Code` for the snippet.
- **`findings/006-barrel-import.md`** — Rule: the barrel-export trap + the Turbopack analyzer (chapter 094 lessons 3/4); `optimizePackageImports` is the team-level seam. Location: `(protected)/layout.tsx` lines 1–13 (the ~dozen icons imported from the `lucide-react` barrel) and the missing `next.config.ts` entry, surfaced by the analyzer treemap (the oversized `lucide-react` tile, ~600 KB) then confirmed with `rg -n "optimizePackageImports"`. Consequence: ~570 KB of icon code on every authenticated page; main-thread parse cost; INP risk on slow mobile (INP ≤ 200ms p75); multiplied across the authenticated surface because the import is in the shared layout. Fix (the one in-place patch): the single config line:
  ```ts
  experimental: { optimizePackageImports: ['lucide-react'] },
  ```
  Rationale callout: `optimizePackageImports` is the senior default over hand-converting each import to `lucide-react/dist/esm/icons/<icon>` (per-icon imports work but are churn re-introduced on the next icon addition) — the single-seam pattern. Name `sideEffects: false` as the complementary lever for internal packages the team owns. Show the two embedded screenshot references (`./screenshots/before-barrel.png`, `./screenshots/after-barrel.png`). Use `Code`.
- **`findings/008-n-plus-1-invoices.md`** — Rule: N+1 at the Drizzle layer (chapter 094 lesson 7); the relations API emits one lateral-join statement. Location: `invoices-with-customer.ts` lines 22–48 (one invoice select then a per-invoice customer select in a loop); note the healthy `src/db/queries/invoices.ts` already uses the relations API and stays healthy — the N+1 lives only in the dedicated helper so the grep stays falsifiable. Surfaced by a trace showing 1 + N spans, confirmed with `.toSQL()` (one `select … from customers where id = $1` per call, 31 statements where 1 is reachable). Consequence: 1 + N queries (31 at seed scale) growing one-for-one with the invoice count; each holds a pooled connection; ~50ms avoidable at seed scale and a connection-pool exhaustion risk under load. Fix (documented, not patched): the relations-API rewrite — show the solution snippet:
  ```ts
  const rows = await db.query.invoices.findMany({
    where: eq(invoices.organizationId, orgId),
    orderBy: desc(invoices.createdAt),
    limit,
    with: { customer: true },
  });
  ```
  Rationale callout: the `invoicesRelations` declaration is already in place, so `with: { customer: true }` expands the customer in one lateral-join statement — verify with `.toSQL()` (one `left join lateral`, not N selects), dropping the count from `1 + N` to `1`. Use `Code`.
- **The single `next.config.ts` edit** — show the diff context: the `TODO(L6)` comment replaced by the `experimental: { optimizePackageImports: ['lucide-react'] }` line. `CodeVariants` (before/after) is a good fit here to make the one-line change crisp, or `Code` if simpler.
- **`findings/010-composite-index.md`** (optional bonus) — Rule: missing composite index, leftmost-prefix served by `EXPLAIN ANALYZE` (chapter 094 lesson 7). Location: `src/db/schema.ts` (the `invoices` table ships only its PK, no third-argument index array) and the read in `invoices-with-customer.ts`. Surfaced by `EXPLAIN ANALYZE` showing a `Seq Scan on invoices` + a `Sort` node with `Sort Method: quicksort`. Fix: declare a `(organization_id, created_at, id)` composite index in the schema **and** generate the migration with `drizzle-kit` (`pnpm db:generate --name index_invoices_org_created` then `pnpm db:migrate`) — the load-bearing second half; declaring without generating is half-credit. Re-run `EXPLAIN ANALYZE`: the Seq Scan + Sort collapses to an `Index Scan using idx_invoices_org_created`. Note this uses Unit-5 migration mechanics, **not** the expand-migrate-contract workflow (chapter 100). Use `Code` for the schema snippet and the SQL plan.
- **`findings/SUMMARY.md`** — show its shape: the coverage line (10/10 = 8/8 floor + both bonuses), the coverage table (one row per finding with category, wired/documented half, severity), the wired-vs-documented split, the clause-by-clause scoring rubric, the per-finding senior-reach detail, the two senior verdicts, the personal diagnostic checklist, and the forward pointers. The final analyzer treemap is pasted here as secondary evidence for the whole bundle-size half. Use `Code` or describe the table shape; do not reproduce the entire file verbatim — show the structure and the coverage table.
- **`findings/out-of-scope.md`** — show its shape: observations outside the eight categories (the denormalized `customerName` data-modeling note; the `/api/test/throw` deliberate diagnostic affordance), recorded but never scored, so the eight-category count stays clean.

Decision rationale to surface (one or two sentences each, per the contract):
- Why only the independent pair is wrapped in `Promise.all` (wrapping the `requireOrgUser → getOrganization` dependency would be wrong).
- Why `optimizePackageImports` is the senior default over per-icon imports.
- Why `.toSQL()` is the verification that the relations API produced one join.
- Why the migration must actually be generated for bonus 10 (naming the fix without generating it is half-credit).
- Why the performance findings are documented, not patched — the verdict split (performance gaps go to the backlog with measured impact).

For the chapter 094 concepts (waterfall, barrel/analyzer, N+1, indexes), link the owning lessons (lesson 6, lessons 3/4, lesson 7 of chapter 094) rather than re-explaining.

External resources: appended by the resourcer after the `<details>`, no header.

### Moment of truth (header: "Moment of truth")

Test command and expected pass output:
```
pnpm test:lesson 6
```
Expected: a clean pass (the seeded `Lesson 6.test.ts` `describe.todo` is filled by the test-coder with `readFileSync` source-shape probes asserting the four sections, the 094 L6/L3/L4/L7 rules, the trace/analyzer/`.toSQL()` surfaces, the fixes, that finding 006 embeds the before/after screenshots, and that `next.config.ts` lists `lucide-react` under `optimizePackageImports`).

Named surfaces: the **Turbopack analyzer treemap** (`pnpm next experimental-analyze`), **DevTools Performance** (or the Sentry trace), and the **slow-query log** / `EXPLAIN ANALYZE`.

By-hand checklist (`Checklist`/`ChecklistItem`, covering requirements the source-shape tests can't reach):
- [ ] `findings/005-rsc-waterfall.md` and `findings/008-n-plus-1-invoices.md` each carry all four sections with operator-visible consequences.
- [ ] The `lucide-react` chunk drops sharply across the two `pnpm next experimental-analyze` runs.
- [ ] `findings/006-barrel-import.md` embeds both before/after screenshots.
- [ ] `findings/SUMMARY.md` states coverage and pastes the analyzer treemap; `out-of-scope.md` records the deliberate cuts.
- [ ] The target still boots clean with only the barrel import patched.

## Scope

- **Wiring Sentry, the logger seam, and the consent gate** — done in lessons 3, 4, 5; this lesson only documents/patches the performance half.
- **The reference finding shape and the audit cadence** — established in lesson 2 (the walkthrough that models finding 7); not re-taught here.
- **Running the full verify recipe, committing, and self-grading against the `solution/` answer key** — lesson 7. This lesson assembles `SUMMARY.md` and `out-of-scope.md` but does not run the end-to-end verification or read the answer key.
- **Actually shipping the waterfall / LCP-image / N+1 fixes, the CI gate, and the composite-index migration as production changes** — backlog items captured in lesson 7; chapter 097 (CI gates), chapter 098 (Vercel Log Drain), chapter 100 (expand-migrate-contract migrations), chapter 104 (PR review) own the follow-ups.
- **Re-explaining the chapter 094 performance concepts** — owned by chapter 094 lessons 2, 3, 4, 6, 7; link, don't re-teach.
