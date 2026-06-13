# Coverage as a diagnostic, not a target

- Title (h1): Coverage as a diagnostic, not a target
- Sidebar label: Coverage as a diagnostic

---

## Lesson framing

This is L3 of a four-lesson decision chapter. L1 wired Vitest 4 (the `vitest.config.ts` already on disk: `globals: false`, `vite-tsconfig-paths`, three projects, `@vitest/coverage-v8` installed but **zero coverage config**). L2 installed the honeycomb and ended on a precise hand-off this lesson must open from: *"we have tests" is not the bar; "do the tests fail on the bugs that ship" is the bar; coverage is the instrument people reach for to check that, and it's the most misread number in testing; next we read it as a diagnostic, not a target.* Open by picking up that exact thread — do not re-motivate testing from scratch.

The lesson is a **judgment lesson, not a tooling lesson**. The config it adds (a `coverage` block on the existing config) is small; the entire payload is *how a senior reads the report*. The single durable mental model the student must leave with: **coverage is a map of what code your tests executed — nothing more.** It does not measure quality, it does not measure whether anything was asserted, and a high number is not a goal. It is a diagnostic instrument for one job: finding load-bearing code paths your tests never exercised. Frame every section against that one idea.

Pedagogical spine (minimize cognitive load by introducing one corrective at a time, each fixing the failure mode the previous one exposed):
1. The naive read (one percentage, one CI gate) and why it fails — the report hides *which* lines.
2. Branch over line — the percentage you read first, because a fully-line-covered function can have half its decisions untested.
3. Why 100% is theatre — the canonical smell; chasing the number produces tests that execute code and assert nothing.
4. The senior read — coverage as a seam-finder; per-directory thresholds as a backstop on load-bearing surfaces only.
5. The blind spot coverage cannot see — a file with zero tests vanishes from the default report; the absence-of-tests audit closes it.

Target student: junior dev, building production SaaS, already past L1/L2 of this chapter. They have met the honeycomb, the seams (`authedAction`, `authedRoute`, `requireOrgUser`, the webhook receiver, `safeLimit`, `error.tsx`), the "shape follows the bug" rule, fail-open/fail-closed branches, and the layer color palette (blue=unit, teal=integration, violet=component, orange=E2E). They have NOT met coverage mechanics, thresholds, or any coverage config — this lesson owns all of it. Where students go wrong in the real world: they wire a single `≥80% lines` gate, watch the team game it with trivial tests, and let the seams rot at 40% while getters sit at 100%. The lesson is built to inoculate against exactly that.

The pain the senior read relieves: the false confidence of a green, high-coverage suite that misses every seam bug — which is precisely the failure L2 closed on. Coverage, read correctly, is how you locate the untested seam *before* it ships as the cross-tenant leak.

**Version-critical (Vitest 4 — verified June 2026, see Fact-check).** Two facts from the chapter brainstorm are based on Vitest 3 and are now WRONG; the lesson must teach the v4 reality:
- `coverage.all` was **removed in Vitest 4**. The default is now "report only files that were loaded during the test run." The absence-of-tests audit is therefore done with **`coverage.include`** (explicit globs); files matched by `include` but never imported show up at 0%. Do not write `coverage.all: true` anywhere — it no longer exists.
- Glob-pattern thresholds **no longer inherit** the top-level `coverage.thresholds.perFile`; `perFile` must be set on each glob that needs it.
- Confirmed defaults to rely on: `coverage.provider` defaults to `'v8'`; `coverage.reporter` defaults to `['text', 'html', 'clover', 'json']`.

Component lean: this is a prose-and-config lesson with **two figures** (a branch-vs-line visual; a coverage-report-reading visual) and **two-to-three checks** (an MCQ on the senior read, a Buckets drill sorting threshold-worthy vs exempt surfaces, optionally a CodeReview on a theatre test). No live-coding component fits — coverage requires a full project + provider run that the in-browser runtimes can't host (ReactCoding is react-only; SQL/Drizzle/Type/Zod runners are off-topic). Keep figures HTML+CSS (devtools-inspectable, AI-authorable), not system graphs.

Keep the established voice: terse, adult, senior-mindset, decisions-before-syntax, second person, one-sentence-per-line diffs not required in prose but keep paragraphs tight. Reuse the L2 color palette where layers are referenced. Cross-references to other chapters use the `[label](#)` placeholder-link convention seen in L1/L2 (the resourcer/linker fills slugs later).

---

## Lesson sections

### Introduction (no heading, before first h2)

Pick up L2's closing thread verbatim in spirit: a green suite that misses the seam bug manufactures confidence you haven't earned, and coverage is the number people reach for to check that the suite is real. State the lesson's goal: read the coverage report the way an experienced engineer does — as a diagnostic that finds untested seams, not a target to optimize toward. Preview the concrete artifact built by the end: a `coverage` block on the existing `vitest.config.ts` with per-directory thresholds on the load-bearing surfaces and an `include` that surfaces untested files — plus, more importantly, the reading discipline that makes that config meaningful.

Plant the senior question implicitly (per pedagogical guidelines, not as a labeled section): the report says **87% lines, 72% branches** — two engineers read it two ways. One sets a CI gate at "≥80% lines" and chases the missing 13%. The other asks *which files, which lines* — because the average hides the failure mode where the webhook receiver sits at 40% and a trivial getter sits at 100%. The lesson is the second read. Keep it to ~2 short paragraphs; warm, brief, then move.

`Term` candidates in/near the intro: **coverage** (define inline once: "the percentage of your code that executed while the tests ran — not a quality score"). Reuse `Term` for **seam** only if the prose introduces it before the reader would have it from L2; otherwise rely on L2's introduction.

---

### What the coverage report actually measures

**Goal:** establish the literal, deflationary definition before any judgment — coverage measures execution, full stop. This is the foundation the entire "diagnostic not target" frame rests on, so it comes first.

Content:
- Coverage = which parts of your source ran while the suite executed, expressed as four numbers: **lines**, **statements**, **functions**, **branches**. Define each in one clause. The crucial framing sentence: coverage records *what executed*, never *what was checked* — a line can run inside a test that asserts nothing and still count as covered. (This sentence is the seed of the whole lesson; plant it here, harvest it in the theatre section.)
- How the number is produced: the `@vitest/coverage-v8` provider (installed in L1) reads Node's **built-in V8 coverage** from the actual test run — no source instrumentation, so it's fast and you already have the dependency. Name `@vitest/coverage-istanbul` once as the alternative provider for the rare case V8's output doesn't fit; do not install or dwell. Note `provider: 'v8'` is the default, so the choice is already made.
- Set expectation for the next section: of the four numbers, one is worth reading first.

Components:
- Plain `Code` block: the minimal `coverage` block to *produce* a report, added to the existing config — `test.coverage` with `provider: 'v8'` and a `reporter` entry. Keep it small; this is the "turn it on" step, not the full config (thresholds + include come later in the lesson and get assembled then). Reference that `pnpm test:coverage` (the script from L1) is what runs it.
- No diagram here — definition is prose-light and the branch figure lands in the next section.

`Term`: **V8** ("the JavaScript engine in Node and Chrome; it can record which code ran for free, which is how coverage is collected without rewriting your source"). **instrumentation** only if used ("rewriting source to insert counters — what the older Istanbul provider does and V8 avoids").

Scope note for writer: do NOT teach the full `vitest.config.ts` from scratch — it exists from L1. Every config block in this lesson is an *addition* to that file; show it as the `coverage` block in isolation (with a `// inside test: { ... }` comment, mirroring L1's projects-array treatment) and assemble the complete block once at the end.

---

### Read branch coverage before line coverage

**Goal:** correct the most common misread — treating line % as the headline number. Branch coverage is the one that tells you whether your tests exercised the *decisions*, which is where seam bugs live (fail-open vs fail-closed is a branch).

Content:
- The distinction, made concrete: **line coverage** rewards executing every line; **branch coverage** rewards taking every path through every decision (each side of an `if`, each `case`, each `&&`/`?:` short-circuit, each `catch`). A function can be 100% lines and 50% branches.
- The canonical example, worked: a guard like `if (role !== 'admin') return forbidden()` followed by the happy path. A single test for the admin case runs every line (100% lines) but never takes the `forbidden()` branch (50% branches). The untested branch is the *authorization denial* — exactly the kind of path whose absence ships as a bug. Tie explicitly to the fail-closed reflex from ch080: the denial branch is the one you most need a test on, and it's the one line coverage is blind to.
- The rule, stated sharply: **read branch coverage first.** Line coverage near 100% with branch coverage well below it is the signature of a suite that calls the code but doesn't test its decisions.

Components:
- **Figure 1 — branch-vs-line visual (HTML+CSS inside `<Figure>`).** Pedagogical goal: make "same lines, different branches" visible at a glance. Layout: a short code snippet (the `role !== 'admin'` guard, ~5 lines) rendered as stacked line-rows. Left gutter: a "lines" column with every row marked executed (all green). Right gutter: a "branches" column showing the decision row split into two outcomes — the taken branch green, the untaken (`forbidden()`) branch red/grey. A compact legend: "line covered" vs "branch covered / branch missed." Caption: "Every line ran; only one side of the decision did. Line coverage says 100%; branch coverage says 50%." Use the project palette (green = covered) consistently; keep under ~400px tall. Devtools-inspectable, no JS. This is the single most important visual in the lesson — it makes the abstract distinction physical.
- Optionally a tiny `Code` block of the guard alone if the figure embeds it as an image rather than live rows; prefer rendering the rows in the figure so the gutters align.

`Term`: **branch** ("a decision point with more than one outcome — each side of an `if`, each `case`, each `&&` short-circuit; branch coverage tracks which outcomes your tests actually triggered").

---

### Why 100% coverage is theatre

**Goal:** dismantle the target mindset directly — this is the chapter's named thread ("100% is the canonical theatre metric the senior reads as a code smell"). The student must leave reading a 100%-coverage badge as a yellow flag, not a gold star.

Content:
- The cost argument: 100% requires a test for every getter, every defaulted parameter, every error class's `name`, every framework-injected branch. High cost, near-zero bug-finding signal.
- The corruption argument (the important one): chasing the number rewards tests that exercise *code paths* rather than *behaviors*. A test that calls a function with a fixture, asserts nothing meaningful, and ticks the line count is positive coverage and zero value. Harvest the seed from the first section: coverage measures what ran, not what was checked — so a 100% number is fully achievable by a suite that asserts almost nothing. Worse, a 100% culture turns test code into a *mirror of the source* instead of a *contract about behavior*, and the team quietly stops trusting it.
- Name the concrete shapes of theatre tests so the student can recognize them (this list is the spine of the optional CodeReview):
  - `it('exports the function', () => expect(typeof fn).toBe('function'))`
  - a snapshot that asserts nothing about behavior
  - a test asserting a function's return *type* matches its declared type (the type system already enforces this — connect back to Unit 1)
  - a test that mocks every dependency and asserts the mocks were called with the values the test itself wired in (it tests the mock wiring, not the function)
- The review reflex, stated as a reusable tool: **"what would have to change for this test to fail meaningfully?"** If the only answer is "delete the test," it's theatre. Give the student this question as a portable heuristic.
- Mutation testing, named once as the *right mental model* and then set down: mutation testing (Stryker) flips operators in your source and checks whether a test notices — it measures what your tests *check*, the inverse of what coverage measures (what *ran*). The framing "coverage = what ran; mutation = what's checked" is the clean way to hold the limitation of coverage in your head. Explicitly say the tool is overkill for most SaaS suites — name the idea, don't install it. Keep to ~2 sentences; this is a mental-model gift, not a tooling detour.

Components:
- **`CodeReview` (optional but recommended) — spotting theatre.** The best assessment fit: the student leaves inline comments on a small test file containing 2–3 theatre tests (the `typeof` export check; a "mock-called-with-what-I-passed" test; optionally a return-type assertion) plus one genuine behavior test as a control. `kernel` phrases name the defect, e.g. `kernel="asserts the function exists, not what it does — pure coverage theatre"` and `kernel="asserts the mock was called with values the test itself wired — tests the wiring, not the behavior"`. `ReviewWhy`: the lesson isn't the fix, it's recognizing the *shape* — a test whose only failure mode is its own deletion. Note for builder: count rendered lines carefully for `line` indices; keep the file short (≤~20 lines). If the build/grader (Ollama) is unavailable it degrades to line-graded, which is fine here. If a CodeReview proves too heavy, fall back to a single-correct `MultipleChoice` asking which of four tests is theatre.
- No diagram.

`Term`: **theatre / metric theatre** ("optimizing a measurement instead of the thing it was meant to proxy — here, chasing the coverage number instead of catching bugs"). **mutation testing** ("a technique that mutates your source — e.g. flips `<` to `>` — and checks whether any test fails; it measures whether your tests *check* behavior, not just whether code *ran*").

---

### Reading the report to find the under-tested seam

**Goal:** flip coverage from target to instrument — show the *positive* use. This is the section that answers "so what is coverage good for?" The answer: locating load-bearing code paths the suite never exercised, concentrated at the seams.

Content:
- Reframe the report as a **map of un-exercised paths**, read by location not by average. The diagnostic move: scan the per-file breakdown for *under-coverage in the seams* — `authedAction`'s catch branch, the webhook receiver's signature-failure path, `safeLimit`'s fail-open carve-out, the cross-tenant 404 branch, the error mapper's fallback case. Those uncovered branches are the lines a missing test ships as a production bug. Reuse the exact seam catalog from ch080/L2 so this lands as continuation, not new vocabulary.
- The contrast that makes the point: a 100%-covered `/lib` mapper sitting next to a 40%-covered Server Action wrapper is *the* signature of a suite that ships bugs — all the effort pooled at the safe base, none at the dangerous seam. This is the coverage-report restatement of L2's pyramid failure ("the effort went where the diagram said the bugs were; the bug went where the diagram wasn't looking"). Call that connection out so L2 and L3 lock together.
- How to actually read it: `pnpm test:coverage` writes an **HTML report** under `coverage/` (the `html` reporter is on by default). Open it, drill into a seam file, read *which lines and branches are red* — never the top-line percentage. Distinguish surfaces: the `text` reporter prints a summary table to the terminal (the at-a-glance CI/PR view); the HTML is the developer's drill-down. Cadence: this is a periodic diagnostic read (e.g. once a sprint, and when touching a seam), not a per-save habit — running `--coverage` on every save is slow and pointless locally.
- Differential read on PRs (brief): the signal a reviewer wants is "this PR added 20 lines and covered 15," not "the overall number moved 0.4%." Mention `coverage.thresholds.autoUpdate` exists to ratchet thresholds automatically but the course **doesn't** use it — the noise outweighs the gain; surface the differential, don't auto-ratchet. One or two sentences; full CI/PR-comment wiring is ch097's job (forward-ref).

Components:
- **Figure 2 — reading the report (HTML+CSS inside `<Figure>`).** Pedagogical goal: teach *where to look*, not how to read a table. Render a stylized per-file coverage table (filename · lines% · branches% · uncovered-lines), 4–5 rows that tell a story: `lib/money.ts` 100/100 (safe, green); `lib/invoice-mapper.ts` 96/92 (fine); `lib/auth/authed-action.ts` 100 lines / **45 branches** (red — line-green but branch-red, the trap); `app/api/webhooks/stripe/route.ts` **40/30** (red — the dangerous seam); the auth/webhook rows visually flagged. Annotation callouts: an arrow to the authed-action row — "100% lines, 45% branches: the denial branches are untested"; an arrow to the webhook row — "the highest-stakes seam, least covered." Caption: "Don't read the average. Read which seams are red." Reuse palette; under ~500px. This figure operationalizes the whole lesson — it shows the senior read in one glance and visually rhymes with Figure 1 (line-green/branch-red).
- A short `Code` block showing the `reporter: ['text', 'html']` choice in the coverage block (and noting the defaults include `clover`/`json` which the course can keep or trim) is optional; fold into the assembled config at the end rather than repeating.

`Term`: reuse **seam** from L2 (no re-`Term` unless the writer judges the reader needs it). **differential coverage** ("how much of the code a single PR added is covered by that PR's tests — the per-change view, as opposed to the whole-codebase average").

---

### Per-directory thresholds as a backstop, not a goal

**Goal:** translate the reading discipline into a CI-enforceable config — but framed correctly, as a *floor that catches regressions on load-bearing surfaces*, never as a target to climb. This is where the lesson's judgment becomes config.

Content:
- The principle first: a threshold is a **backstop**, a speed-bump that catches the case where a previously-tested seam loses coverage (someone adds an `else` without a test). It is the floor, not the destination. The team writes tests for behaviors that exist; the threshold catches the regression. Crucial: thresholds go *only* on surfaces where coverage *means something* — `/lib` purity and the seams — and **nowhere** on framework-mediated surfaces, because chasing coverage there is theatre.
- The course baseline (each threshold ships with a one-line justification — model that habit):
  - `src/lib/**` — 90% lines, 85% branches ("pure logic, the wide base; if it's in `/lib` it's testable").
  - `src/app/api/webhooks/**` — 85% branches ("highest-stakes seam; every uncovered branch is a webhook that mishandles a provider event").
  - `src/lib/auth/**`, the error-mapping module, `src/lib/rate-limit/**` (where `safeLimit` lives) — 85% branches ("load-bearing helpers; an uncovered branch here is an auth bypass, a leaked stack, or a fail-open").
  - everything else — **unthresholded**, deliberately.
- **Vitest 4 specifics the writer MUST get right** (these are the corrections from the fact-check):
  - Per-glob thresholds live as keys inside `coverage.thresholds`, e.g. `'src/lib/**': { lines: 90, branches: 85 }`.
  - In v4, glob thresholds **do not inherit** the top-level `perFile`; if a glob needs per-file checking, set `perFile` on that glob's own object. State this explicitly so the student isn't surprised.
  - Do NOT present a single global `lines: 80` gate as acceptable — the whole section argues against it. If a global threshold appears at all, it's only to be contrasted as the anti-pattern.
- The exclusion list (paired concept — thresholds say where coverage matters; excludes say where it's noise): `coverage.exclude` strips files from the report. Course exclusions, each with a reason: config files (`**/*.config.{ts,js}`), type-only files (`**/*.d.ts`, `**/types.ts`), barrels (`**/index.ts`), framework-orchestrated route files (`app/**/page.tsx`, `app/**/layout.tsx` — tested via integration at the seam, not by re-testing the framework — tie to L2's "no test the framework"), stories (`**/*.stories.tsx`), scripts (`scripts/**`), and mock dirs (`**/__mocks__/**`). The rule: every exclusion has a recorded reason; an unexplained exclude is how the seams quietly disappear from the report.

Components:
- **`AnnotatedCode` — the thresholds + exclude block.** This is the right component: one config object, multiple parts the student's focus must visit in turn. Show the `coverage` block (provider, reporter, thresholds with the per-glob keys, exclude array) as it sits inside the existing config's `test` block (`// inside test: { ... }` comment). Steps (blue default, one color each):
  1. `provider` + `reporter` — "produce the report; `text` for the terminal summary, `html` for the drill-down."
  2. the `'src/lib/**'` threshold key — "a floor on the wide base; pure logic should be near-fully covered."
  3. the `'src/app/api/webhooks/**'` + auth/rate-limit threshold keys — "branch floors on the seams; the denial and fail-closed branches are what these protect."
  4. (if shown) a `perFile` on one glob — "v4: glob thresholds don't inherit the top-level `perFile`; opt in per glob."
  5. the `exclude` array — "strip framework-orchestrated and type-only files; each entry is noise coverage would otherwise count against you."
  Keep under 18 lines (trim the glob list to the representative entries; mention the rest in prose). After it, restate the framing: this config is the *backstop*; the reading discipline from the previous section is the actual work.
- **`Buckets` (two-column) — threshold-worthy vs exempt.** Strong fit for the "where does coverage matter" judgment. Instructions: "Sort each file into whether it earns a coverage threshold or is exempt from the report." Bucket A "Gets a coverage threshold" (load-bearing). Bucket B "Excluded / unthresholded" (framework-mediated or noise). Items (mix of clear and edge): `lib/money.ts`, `lib/auth/authed-action.ts`, `app/api/webhooks/stripe/route.ts`, `lib/rate-limit.ts` → A; `app/dashboard/page.tsx`, `env.config.ts`, `components/ui/card.tsx`, `lib/types.ts`, `app/layout.tsx` → B. This drills the exact discrimination the section teaches and surfaces the "page.tsx is the framework's job" point kinesthetically. ~8 items, balanced.

`Term`: **backstop** is plain enough to leave in prose. `safeLimit` — if first mention here, a one-line `Term` ("the rate-limit wrapper from the security baseline; fail-open on a Redis-auth error, fail-closed on real quota exhaustion") tied back to ch081.

---

### The blind spot: a file with zero tests

**Goal:** close the one gap coverage cannot see by itself — coverage reports on what *ran*, so a file that no test imports is simply absent from the default report. A senior audits for *absence of tests*, not just low coverage. This is the lesson's final, subtle correction and the natural capstone.

Content:
- The trap, stated plainly: a file with a *single trivial test that runs every line* is 100% covered and effectively untested. And worse — a file with **no test at all** doesn't drag the average down; in Vitest 4's default it doesn't appear in the report at all. Coverage tells you what ran; it is silent about what was never written.
- **Vitest 4 mechanism (the corrected fact — critical).** In Vitest 4, the report by default includes *only files that were loaded during the test run* (the old `coverage.all: true`-by-default behavior was **removed**; `coverage.all` no longer exists). To pull untested files into the report at 0%, set **`coverage.include`** to globs covering your load-bearing surface — e.g. `include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts']`. Any file matched by `include` that was never imported now shows up at 0% coverage instead of vanishing. The writer MUST present this as `coverage.include`, NOT `coverage.all` — explicitly note that older guides say `coverage.all: true` and that this was removed in v4, so the student isn't derailed by stale docs.
- The audit as a habit, not just a flag: for every file in `/lib` and `/app/api`, confirm a test file sits next to it and exercises the public surface. `coverage.include` makes the gap *visible* (the 0% rows); the human still has to look. Frame: the config surfaces the absence; the discipline is reading the 0% rows and writing the missing test.
- The honest carve-out (ties to the "shape follows the bug" maturity from L2): a brand-new feature behind a flag, in its first sprint, may legitimately ship under-tested while the surface stabilizes. The professional move is to *time-box the gap honestly* — add the directory to a temporary `exclude`, ship, write tests in the follow-up PR, remove the exclude — rather than hide the absence behind a coverage line that happens to clear the threshold. The discipline is naming the gap, not pretending it isn't there. This reframes "rules" as judgment and is the senior note to end on.

Components:
- A short `Code` block (or fold into the final assembled config): the `coverage.include` line with the two globs, highlighted, with a one-line comment that this is what surfaces untested files at 0%. Keep it tight.
- **Assembled config (final).** End the lesson's config thread by showing the complete `coverage` block once — `provider`, `reporter`, `include`, `thresholds` (per-glob), `exclude` — so the student holds the finished shape (mirrors L1's "here it is once more as a single walkthrough"). Use a plain `Code` block titled `vitest.config.ts` showing the `coverage` block within `test` (can elide the rest of the file with a comment). This is reference, not a new walkthrough — the AnnotatedCode already did the teaching.
- No diagram needed; the 0%-row idea is carried by Figure 2's table (the writer can reference back to it: "the absent file would be a new 0% row").

`Term`: **`coverage.include`** is shown in code, not prose-`Term`'d. No new terms.

---

### Closing / hand-off to L4

Two-to-three sentences. Land the lesson's thesis one final time: coverage is a flashlight for finding untested seams, not a score to maximize; the number that matters is *did the test assert the right thing*, which no coverage tool can see. Then hand off to L4 (the AAA, one-behavior-per-test, behavior-over-implementation lesson): we've said the value of a test is in *what it asserts, not what it executes* — the next lesson is about writing that assertion well, so a test fails on the bug and survives the refactor. This sets up L4's behavior-over-implementation thread directly.

Optional **External resources** (`ExternalResource` cards in a `CardGrid`, mirroring L1):
- Vitest — Coverage config (https://vitest.dev/config/coverage), description: "Every coverage option, including the threshold and reporter shapes this lesson set."
- Optionally the Vitest v4 migration guide coverage section if a stable anchor exists, framed as "what changed from v3 (`coverage.all` removal, glob threshold `perFile`)." Resourcer verifies the anchor before including.
- No YouTube video unless the resourcer finds a current (≤1yr), high-quality "reading coverage / coverage is not a target" talk; coverage philosophy is better served by prose than a screencast, so this is low-priority and droppable.

---

## Scope

**This lesson owns** (nothing earlier touched these): all coverage concepts and config — what coverage measures (lines/statements/functions/branches), the v8 provider's role, branch-over-line, the 100%-is-theatre argument, coverage as a seam-finding diagnostic, per-directory thresholds, `coverage.exclude`, the absence-of-tests audit via `coverage.include`, and the mutation-testing mental model (named, not installed). L1 installed `@vitest/coverage-v8` and the `test:coverage` script and *explicitly deferred all coverage config to this lesson* — so this lesson is the first and only place coverage is configured in the chapter.

**Assumed already known (prerequisites — redefine in ≤1 line only if reused, do not re-teach):**
- Vitest is the runner; the existing `vitest.config.ts` shape (`globals: false`, `vite-tsconfig-paths`, three projects, `setupFiles`); `vitest` vs `vitest run`; the `test`/`test:run`/`test:coverage` scripts — all from L1. Every config block here is an *addition* to that file.
- The honeycomb shape, the four layers and their palette, "shape follows the bug," and the **seam catalog** (`authedAction`, `authedRoute`, `requireOrgUser`, webhook receiver, `safeLimit`, `error.tsx`) — from L2. Reuse the catalog as the coverage-read target; don't re-derive it.
- Fail-open / fail-closed and "every doubt is a deny" — from ch080. Reuse as the example of the branch coverage is blind to; don't re-teach the discipline.
- `safeLimit` and its fail-open-on-Redis-auth behavior — from ch081/ch074. One-line reminder max.
- The type system enforces type-correctness (Unit 1) — used only to justify why a return-type-assertion test is theatre.

**Explicitly NOT in this lesson (defer, do not teach):**
- The AAA single-test shape, descriptive test names, behavior-over-implementation, one-behavior-per-test — **L4 of this chapter.** This lesson may *reference* "a test that asserts nothing" as theatre but must not teach how to write a good assertion — that's L4's payload. Hand off, don't pre-empt.
- The `/lib` unit-test surface, factories, determinism seams (clock/ids/random) — **ch087.** Don't show how to write the `/lib` tests whose coverage you're reading.
- Integration fixtures, MSW, the test-DB lifecycle, `withRollback`, one-DB-per-worker — **ch088.** When the section says a Drizzle helper's real test is the integration test, that's a forward-ref, not a how-to.
- Component-test trigger, React Testing Library, jsdom — **ch089.**
- E2E / Playwright — **ch090.**
- Type-level coverage / `vitest --typecheck` / `*.test-d.ts` — **ch087/L4.** Not "coverage" in this lesson's sense; don't conflate.
- CI wiring — the JUnit reporter, the PR coverage comment, the merge gate, `autoUpdate` ratcheting in anger — **ch097.** This lesson defines the thresholds and names the differential read but does not wire CI. `autoUpdate` is mentioned only to be declined.
- Mutation testing setup / Stryker installation — **out of course scope.** Named as a mental model only.
- `@vitest/coverage-istanbul` deep config — out of scope; named once as the V8 alternative.

---

## Code conventions notes

Skimmed the Testing section of `Code conventions.md` (lines 473–489). Relevant alignments baked into the outline:
- `globals: false` + `vite-tsconfig-paths`; three projects (`unit`/`integration`/`component`) — already established in L1; this lesson only adds the `coverage` block, consistent with that file.
- "Mock the wire, not the SDK; mocking Drizzle/Stripe/Resend is forbidden" — supports the theatre-test example (a test that mocks every collaborator and asserts the mock wiring is exactly the anti-pattern the conventions forbid). The CodeReview/MCQ leans on this.
- "Component tests only when (a) shared library, (b) complex state, (c) critical UX" and "E2E reserved for money paths" — referenced via L2's trigger framing when justifying why those surfaces aren't thresholded here.
- The conventions don't yet specify coverage thresholds or `coverage.include`/`exclude` values — this lesson establishes the course baseline (per-dir thresholds on `/lib`, webhooks, auth, rate-limit; the exclude list; `include` for the absence audit). No conflict; this lesson is the canonical source for those numbers. Flag for curator: if desired, the coverage baseline established here could later be folded back into the Testing section of `Code conventions.md`.

Deliberate divergences (noted for downstream agents): config blocks are shown *in isolation* (the `coverage` block with a `// inside test: { ... }` comment) rather than as the full file on each appearance — pedagogically cleaner and matches L1's staged-config treatment; the complete block is assembled once at the end.

---

## Fact-check log (verified June 2026)

Sources consulted (Vitest official docs + v4 migration guide, current):
- **`coverage.all` removed in Vitest 4** — confirmed via the official migration guide: "In Vitest v4 we have removed `coverage.all` completely and defaulted to include only covered files in the report." The absence-of-tests audit must therefore use `coverage.include`, not `coverage.all`. The chapter brainstorm's "turn on `coverage.all: true`" is **Vitest-3-era and wrong**; the outline corrects it throughout. (https://main.vitest.dev/guide/migration)
- **Glob thresholds no longer inherit `perFile`** in v4 — confirmed: "Glob patterns now control their own per-file checking and no longer inherit the top-level `perFile` — set `perFile` on each glob that needs it." Baked into the thresholds section. (migration guide + https://vitest.dev/config/coverage)
- **`coverage.provider` default `'v8'`** and **`coverage.reporter` default `['text', 'html', 'clover', 'json']`** — confirmed on the official coverage config page. Outline relies on `text` + `html` and notes the other defaults. (https://vitest.dev/config/coverage)
- **`coverage.include` required to surface untested files** — confirmed: by default only files loaded during the run are reported; set `include` globs to capture untested files (they appear at 0%). (https://vitest.dev/config/coverage)
- **Per-glob threshold shape** `'src/utils/**.ts': { lines?, branches?, functions?, statements? }` — confirmed on the config page. (https://vitest.dev/config/coverage)

No severe discrepancies remain after correction; the only changes from the brainstorm were the three Vitest-4 deltas above (all `coverage.all` references replaced with `coverage.include`, plus the `perFile` non-inheritance note), which are now reflected in the outline body.
