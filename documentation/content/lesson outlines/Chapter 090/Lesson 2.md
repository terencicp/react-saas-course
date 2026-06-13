# Config, storageState, and the trace viewer

- Title (h1): Config, storageState, and the trace viewer
- Sidebar label: Config and storageState

## Lesson framing

This is the **setup-and-wiring** lesson of the chapter. Lesson 1 installed the *trigger* (the money-path filter) and the discipline (production build not `next dev`; flake gets structural fixes not retry bumps; year-one zero; `retries: 1` not `3`). This lesson installs the *surface* that runs those money paths. It does **not** re-argue any of that discipline — it wires the config that encodes it. Lesson 3 then walks the four actual money-path tests using everything assembled here.

Pedagogical conclusions that apply lesson-wide:

- **Spine = build the config file once, line by line, each line traced back to a Lesson-1 principle.** The student already accepted *why* production-build / `retries:1` / structural-flake-fixes; the payoff here is seeing each appear as a concrete config key. This is the lesson's strongest through-line: the abstract rules from L1 become literal `playwright.config.ts` lines. Lead the config section with that framing explicitly.
- **Lean hard on transfer from chapters 088–089.** The student already knows: the role-first locator ladder (RTL, ch089 L3: `getByRole`→`getByLabel`→`getByText`→`getByTestId`), per-test isolation as a discipline (Vitest, ch088 L2), a single shared test/expect import (fixtures), the "separate real Postgres for tests" idea (ch088 L1–2), and MSW as the integration-layer wire mock (ch088 L4–5). Each Playwright concept should be introduced as "the same idea you know, new surface" — minimize new mental load. The two genuinely *new* mechanisms are (1) `storageState` as auth-without-UI-login and (2) the trace viewer as the debugger; spend the depth budget there.
- **Cognitive-load order: config → auth → test DB → locators/expect → fixtures → trace → tooling.** Each section produces an artifact the next consumes. Config defines the `setup` project dependency; `auth.setup.ts` fills the dependency; the test DB feeds the seed users `auth.setup.ts` signs in; locators+expect are what tests are made of; fixtures package the shared imports; the trace is what you open when a test built from all the above fails. Do not reorder — later sections reference earlier artifacts by name.
- **The mental model to leave the student with:** "Playwright drives a real browser against a real production build of my app, signs each role in exactly once and reuses that session, asserts only what a user can observe (with auto-waiting so I never sleep), and hands me a time-travel trace when something breaks." Every section reinforces one clause of that sentence.
- **Two big anti-pattern magnets to neutralize inline (not in a tips section):** `page.waitForTimeout(...)` (kill in the locator/expect section — auto-waiting makes it obsolete) and UI-login-per-test (kill in the storageState section — it's the whole reason storageState exists). These are the two mistakes a junior fresh off other test frameworks makes first. Frame each as "the instinct you'll have, and why the tool already solved it."
- **Code is the medium here.** This is a config/wiring lesson; almost every concept is a file. Use `AnnotatedCode` for the two files that carry the lesson (`playwright.config.ts`, `auth.setup.ts`) so attention is directed key-by-key. Use plain `Code` for short fragments. Use `CodeVariants` only for the two before/after anti-pattern beats (sleep vs auto-wait; UI-login vs storageState). Keep one live exercise (locator-ladder pick) and one ordering exercise (the setup→storageState→test dependency chain). One embedded real trace via `PlaywrightEmbed` is the centerpiece of the trace section — the student scrubs an actual failed run.
- **Versions/pins (verified June 2026):** Playwright `1.60` line, `@playwright/test` with TS. `page.clock` is **stable** (since 1.45) — present it plainly, no "experimental" hedge. Scaffold default is `retries: 2` on CI; the course overrides to `1` (Lesson-1 discipline) — flag this as a *deliberate* divergence from the generated default so a downstream agent doesn't "correct" it back.
- Keep total length aligned with the 50–60 min estimate: this is the longest lesson in the chapter. Prefer one excellent diagram/exercise per concept over many.

## Lesson sections

### Introduction (no header)

Open on the senior question, stated as continuation: Lesson 1 greenlit Playwright for four money paths and set the rules; *now* — what is the **smallest** config that runs them against a production build, signs the test users in once, runs in CI without flake, and produces a trace on failure? Name the deliverable: by lesson's end the student has a complete `playwright.config.ts`, an `auth.setup.ts` writing `storageState`, the locator+assertion vocabulary, a fixtures file, and knows how to open a trace. Explicitly say this lesson assembles the kit; Lesson 3 uses it on the real paths. Keep it to ~5 sentences, warm, no recap of *why* E2E — that was Lesson 1.

Reasoning: pedagogical guidelines want the senior question implicit in the intro and a preview of the concrete artifact built. Framing as "the surface for the trigger you already bought" is the cleanest hook and respects the continuity note's instruction not to re-teach the discipline.

### Installing and the file layout it generates

Content: `pnpm create playwright` on first run (mention `pnpm dlx playwright install` for browser binaries). What it scaffolds and what each path is for:

- `playwright.config.ts` — the surface this lesson builds.
- `tests/e2e/` — the course's home for specs (note: distinct from `tests/integration/` from ch088 — different runner, different process).
- `playwright-report/` and `test-results/` — both **gitignored** (HTML report + per-test artifacts incl. traces).
- browser binaries land in pnpm's store, not the repo.

Use a Starlight `<FileTree>` (diagrams INDEX: file trees → `<FileTree>`) to show the generated layout at a glance, with the gitignored entries marked. Keep prose terse — this is orientation, not the meat.

State the pin once: current 1.x line (`1.60`, May 2026), `@playwright/test`, TypeScript out of the box.

`Tooltip`/`Term` candidates here: none needed beyond what the intro covers.

Reasoning: students new to Playwright need the "where do files go" map before the config makes sense; a FileTree is the lowest-effort high-clarity vehicle. Calling out the gitignored dirs early seeds the later "never commit `.auth/`" beat.

### Reading playwright.config.ts line by line

The spine section. Present the **whole** `playwright.config.ts` once via `AnnotatedCode` (`lang="ts"`, cap `maxLines` at 18 and let it scroll), stepping through groups of keys. Each step's prose ties the key to a Lesson-1 principle or a discipline the student already holds. Suggested step grouping (color-code: blue default, green for the discipline-encoding lines, orange for the CI-conditional lines):

1. `testDir: 'tests/e2e'`, `fullyParallel: true` — where specs live; parallel by default (transfer: same parallelism instinct as Vitest workers, ch088).
2. `forbidOnly: !!process.env.CI` — a stray `test.only` fails CI instead of silently skipping the suite.
3. `retries: process.env.CI ? 1 : 0`, `workers: process.env.CI ? 2 : undefined` — **the Lesson-1 discipline as config.** Call out explicitly: the generated scaffold ships `retries: 2`; the course sets `1` on purpose — one retry differentiates flake from real failure without masking it (forward-ref L1's "`retries:3` is the anti-pattern"). This is the deliberate-divergence beat.
4. `reporter: process.env.CI ? [['github'], ['html']] : 'list'` — GitHub annotations + HTML report in CI; plain list locally.
5. `use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' }` — `baseURL` lets specs use `page.goto('/billing')`; the three artifact knobs all say "spend the bytes only when something failed." Flag `trace: 'on-first-retry'` as the line the trace-viewer section depends on.

Then a **separate** short `Code` block (or a second `AnnotatedStep` group) for `webServer` and `projects`, because they're conceptually their own beats — see next two subsections. Decide: keep `webServer` and `projects` as their own h3s below rather than cramming all into one AnnotatedCode, so each gets room. The top-level keys above are the one AnnotatedCode.

Add a one-line `Aside` (note) only if needed: every key shown here maps to a rule the student already accepted — nothing new is being argued, only wired.

Reasoning: AnnotatedCode is purpose-built for "one complex file, direct attention part by part" (component INDEX). The config is exactly that. Grouping keys by *which principle they encode* (not by source order alone) is what makes this a senior-mindset lesson rather than a config dump. The `retries` divergence must be explicit or a fact-checking/polish agent will "fix" it to the scaffold default.

#### Pointing webServer at a production build

Content: the `webServer` block —
```
webServer: {
  command: 'pnpm build && pnpm start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```
Teach each field: `command` is **production build only** (the Lesson-1 rule made literal — `next dev` is a different code path; assert on the output users get). `url` is the readiness probe Playwright polls before starting tests. `reuseExistingServer: !process.env.CI` — local iteration reuses an already-running server (fast inner loop); CI always builds fresh. `timeout: 120_000` — a real `next build` takes time; don't let the probe give up early.

Plain `Code` block is enough (short, focused). One sentence connecting back: this single block is the entire enforcement of "production build, not `next dev`" — there's no separate ceremony.

Mention in one line (verified June 2026): newer Playwright also supports a `wait`-for-log-match field on `webServer`, but the `url` probe is the course's reach; name it exists, don't teach it.

Reasoning: this is the most important single config block in the chapter (it's the L1 thesis made executable), so it earns its own subsection even though it's short. Keeping it plain `Code` avoids over-annotating four self-evident fields.

#### Browser projects and the setup dependency

Content: the `projects` array and *how storageState arrives via a project dependency*. Show:
```
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: '.auth/owner.json' },
    dependencies: ['setup'],
  },
]
```
Teach: the `setup` project runs files matching `*.setup.ts` first; `chromium` declares `dependencies: ['setup']` so the setup runs and writes the state file *before* any chromium test, and `use.storageState` then loads it. This `dependencies` wiring is **the mechanism** that connects the next section's `auth.setup.ts` to every test — name it now, deliver it next.

Cross-browser policy (transfer the Lesson-1 / chapter-framing rule): Chromium is the CI default; WebKit and Firefox are **opt-in projects** gated behind an env flag (`PLAYWRIGHT_PROJECTS=all`) and run only for the auth and checkout money paths — cross-browser coverage on money paths, single-browser everywhere else. Show this as two more project entries guarded by the flag, or describe it in prose with a short fragment; don't bloat the array.

Consider a small **`ArrowDiagram`** (inside `<Figure>`, `expandable={false}` per the figure doc's LeaderLine caveat) showing the dependency: `setup project` → writes → `.auth/owner.json` → loaded by → `chromium project` → every spec. Pedagogical goal: make the otherwise-invisible "how does my test get logged in" data flow concrete *before* the storageState section explains the write side. This diagram is the visual anchor for the lesson's single most novel mechanism.

Reasoning: the project-dependency → storageState link is the part students find most magical/confusing ("where did my login come from?"). A diagram of the artifact flow plus naming the `dependencies` key as the connector pre-loads the next section. Cross-browser stays a policy mention, not a deep dive, per scope.

### Signing in once with auth.setup.ts and storageState

The first of two deep-dive sections (this concept is genuinely new). Lead with the anti-pattern it kills, framed as the student's instinct:

- **The instinct:** "log in at the top of every test." **Why it's wrong:** every money-path test would replay the full email→password→redirect UI flow, multiplying runtime 5–10× and re-testing login in tests that aren't about login.
- **The fix:** sign each role in **once**, serialize the resulting session (cookies + storage) to a JSON file, and have every other test start already authenticated by loading that file. That JSON is `storageState`.

Present `auth.setup.ts` via `AnnotatedCode` (`lang="ts"`). Steps:
1. It's a test in the `setup` project (imports the shared `test`/`expect` from the fixtures file — forward-ref the fixtures section).
2. `await page.goto('/sign-in')`, fill email + password with the seeded test user's credentials (role-first locators — transfer ch089 ladder).
3. `await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()` — **wait for the post-login state before saving**, or you serialize a half-finished session (common bug). Connect forward to the auto-waiting `expect` section.
4. `await page.context().storageState({ path: '.auth/owner.json' })` — the write.
5. One setup file (or one setup test) **per role** the suite needs: owner, member, admin — because Lesson 3's paths assert role-specific UI.

Then the security beat, inline (not a separate tips block): the `.auth/` directory is **gitignored** — these files contain real session cookies; committing them leaks live sessions into git. Tie back to the gitignored dirs from the install section. (Course-memory corroborates: never commit `.auth/*.json`.)

Use a `CodeVariants` for the before/after: tab "UI login every test" (`del`-marked, slow) vs tab "storageState once" (`ins`-marked, the reach). First sentence of each variant carries the verdict ("multiplies runtime" / "log in once, reuse everywhere") per the CodeVariants doc.

`Term`/Tooltip candidates: **storageState** (one-line: serialized cookies + localStorage + sessionStorage for a browser context, replayed to restore auth without UI login).

Reasoning: storageState is the auth model of the whole chapter and Lesson 3 leans on it entirely; it deserves AnnotatedCode + a before/after. Leading with the instinct-it-kills is the pedagogy that makes the mechanism *land* rather than feel like ceremony. Step 3 plants the auto-waiting idea so the next-but-one section feels inevitable.

### The Playwright-owned test database and its seed

Content: Playwright drives a *real* server, which needs a *real* database — and it must be a **separate Postgres** (`saas_e2e`), not the dev DB, not the ch088 per-worker integration DB. Explain *why the per-worker scheme from ch088 can't be reused*: that scheme keyed a DB per Vitest worker *in the same process as the test*; Playwright's server is a **separate process** the test only talks to over HTTP, so the test can't open/close the server's DB transaction per test. Different isolation model: a deterministic full reset between *runs*, not a rollback per *test*.

The reach: a `pnpm db:e2e:reset` script runs migrations + a deterministic seed that creates the role users (`owner@e2e.test`, `member@e2e.test`), their orgs, and a baseline of records. CI resets once before the suite; local reuses unless the schema changed. Tests assume the seed and write incrementally; the reset is the isolation seam between full runs.

Connect: these seeded users are exactly the credentials `auth.setup.ts` signs in — close the loop with the previous section.

Mention the rate-limit caveat only as a one-liner forward-ref to Lesson 3 (the seed also clears Upstash counters for `*@e2e.test` so the sign-in path's rate-limit test is reproducible) — name it, don't teach it here.

A small **TabbedContent** *or* a two-row HTML table contrasting the three test DBs the course now has could pay off:
| Layer | DB | Isolation seam |
| integration (ch088) | per-worker, keyed by `VITEST_POOL_ID` | `withRollback(tx)` per test |
| E2E (this) | one `saas_e2e` | `db:e2e:reset` per full run |
Pedagogical goal: prevent the very common conflation of the two test databases (course-memory flags "running the integration DB and the e2e DB on the same database → write conflicts"). A side-by-side makes the distinction stick. Keep it a simple table/figure, not a heavy diagram.

`Term` candidate: **deterministic seed** if not obvious from context (skip if the table carries it).

Reasoning: the separate-process → can't-share-rollback reasoning is the senior insight here and the #1 confusion (students assume one test DB). Explaining the *why* (process boundary) rather than just stating the rule is the lesson's job. The comparison table is cheap and directly attacks a known failure mode.

### Locators and assertions that wait for you

The vocabulary tests are made of, and the home of the `waitForTimeout` kill. Two tightly-coupled ideas:

**Locators, role-first (transfer, then the new part).** The priority ladder is *the same one the student learned for RTL* (ch089 L3): `page.getByRole('button', { name: /sign in/i })` → `page.getByLabel(/email/i)` → `page.getByText(...)` → `page.getByTestId(...)` last resort. Say explicitly "same ladder, `page.` instead of `screen.`" — pure transfer, no new ranking to learn. The **new** part: Playwright locators are **auto-waiting** — `await locator.click()` waits until the element is attached, visible, stable, and enabled before acting. No `waitForSelector`. Also kill CSS locators inline: `page.locator('.btn-primary')` breaks on the next refactor; role+name survives it.

**`expect` with auto-waiting matchers.** `await expect(locator).toBeVisible()` **polls** until it holds or the default ~5s times out — it is not a one-shot assertion. Common reach: `toBeVisible`, `toHaveURL`, `toHaveText`, `toBeEnabled`, `toBeChecked`. The escape hatch for non-DOM waits: `expect.poll(fn)` (poll a DB row, a webhook landing). Both **replace every "sleep then assert."**

The `waitForTimeout` kill, as a `CodeVariants` before/after: tab "sleep then assert" (`page.waitForTimeout(2000)` then a bare check — flaky, slow) vs tab "auto-waiting matcher" (`await expect(locator).toBeVisible()` — deterministic). First sentence carries the verdict. This is the second anti-pattern magnet; neutralize it here, where the replacement is in hand.

The **silent-pass trap**, inline: `expect(locator).toBeVisible()` *without* `await` resolves to a floating promise and **passes silently**. Show the one-character fix (`await`). This is a subtle high-cost bug worth a callout where the matchers are taught.

Exercise — **live locator pick.** Use `ReactCoding` in **target-match or exploration mode is wrong here** (it's a pick-the-locator drill, not "build a component"). Reconsider: the cleanest fit is a `Tokens` exercise (click the right locator) or a `MultipleChoice`/`Dropdowns` drill: given a small rendered form's markup, pick the most-robust locator for a target element from a set (role+name = correct; CSS class and nth-child = decoys). Decision: use **`MultipleChoice`** (or `Dropdowns` for 2–3 targets in one screen) — "Which locator should target the *Pay* button?" with `getByRole('button',{name:/pay/i})` correct, `locator('.btn-pay')` and `locator('button >> nth=2')` as decoys, and a rationale in the explanation. This checks the role-first instinct cheaply without needing a runtime. (Note: `ReactCoding` can't load Playwright, and Playwright locators aren't React — a coding sandbox is the wrong tool; an MCQ is the right grain.)

`Term`/Tooltip candidates: **auto-waiting** (Playwright retries locator actions/assertions until the element/condition is ready or a timeout fires — no manual sleeps), **flaky test** only if not already a Term from L1 (it is — skip).

Reasoning: framing locators as "the RTL ladder you already know, new prefix" collapses what could feel like new material into transfer. The two auto-waiting facts (locators act-when-ready, `expect` polls) are *the* reason sleeps are obsolete, so the `waitForTimeout` kill belongs exactly here and nowhere else (per the instruction: watch-outs live with the concept they qualify). MCQ over a sandbox because Playwright can't run in the in-browser React runtime (course-memory: ReactCoding is react-only) and the skill is a *judgment* (which locator is robust), perfectly suited to MCQ.

### Packaging shared setup with fixtures

Content: `test.extend<...>({ ... })` builds typed, per-test fixtures — the same per-test-isolation discipline as Vitest (ch088 L2), new surface. The concrete reach: a small `tests/e2e/fixtures.ts` that re-exports `test` and `expect` so **every spec imports from there, not from `@playwright/test` directly** — the single-import pattern the student already saw for the RTL `render` helper (ch089 L2) and the `signedInAs` fixture (ch088 L3). Show two example fixtures: a `signedInPage` (a page with `storageState` already applied for a given role) and a data fixture like `seedInvoices` (inserts rows, `yield`s them, cleans up). Keep the fixture code short via plain `Code` (or a compact `AnnotatedCode` if the `test.extend` generic + `use(...)` callback needs attention — likely yes, one tight AnnotatedCode of ~12 lines stepping the fixture shape: name → setup → `await use(value)` → teardown).

Tie back: fixtures compose and are per-test by default — same isolation guarantee as the integration layer, just for browser tests.

Reasoning: fixtures are "new surface, known idea" (DI for tests). The high-value teach is the *shape* of `test.extend` (`await use(...)` is the unfamiliar bit for someone coming from `beforeEach`), so one small AnnotatedCode stepping that shape earns its place; the rest is transfer. Naming the single-import convention reinforces a pattern repeated across the testing unit.

### The trace viewer is the debugger

The second genuinely-new section and the section students will *remember*. The thesis: with `trace: 'on-first-retry'`, a failed-then-retried test writes a `trace.zip`; `pnpm exec playwright show-trace <path>` opens a GUI that is **time-travel debugging** — DOM snapshot at every action, network log, console log, screenshot, and source-mapped stack — so **no `console.log` debugging**. In CI, the trace uploads as a GitHub Actions artifact; the PR reviewer downloads and inspects.

**Centerpiece: an embedded real trace.** Use `PlaywrightEmbed` inline (default, non-expandable) with the official public TodoMVC sample trace (`https://demo.playwright.dev/reports/todomvc/data/e6099cadf79aa753d5500aa9508f9d1dbd87b5ee.zip`, per the component doc) so the student *scrubs an actual failed run inside the lesson*. Anchor prose to it: "click an action in the timeline, watch the DOM snapshot on the left; open the Network tab; read the call log." Pedagogical goal: turn "the trace viewer" from a name into a tool the student has actually operated, before they ever have a failing test of their own. This embed is the highest-leverage single element in the lesson — prioritize it.

Mention (one line each, don't deep-dive — scope says the docs own the viewer internals): the trace contains the source frames only if captured at record time (so fixtures/helpers must run through Playwright); the CORS constraint is the embed author's problem, not the student's.

Optional: a short `Sequence` exercise "order the steps to debug a CI failure" — (1) CI test fails on first run, (2) `retries:1` triggers a retry, (3) retry records `trace.zip`, (4) trace uploads as an artifact, (5) reviewer downloads and opens `show-trace`, (6) reviewer reads the DOM snapshot at the failing action. Reinforces *when* a trace exists (only on retry) — a point students miss ("why is there no trace?" = the test didn't retry). Include this; it cheaply fixes a real confusion.

`Term`/Tooltip candidates: **trace viewer** (Playwright's post-mortem GUI: per-action DOM snapshots + network + console + stack, opened from a `trace.zip`).

Reasoning: this is the payoff of `trace: 'on-first-retry'` set three sections earlier, and the 2026 Playwright debugging workflow the chapter promised. An embedded *real* trace (the component exists precisely for this) converts passive reading into hands-on — by far the strongest pedagogy available for this concept. The Sequence drill targets the specific, predictable misconception that a trace exists for every run.

### First-draft with codegen, run from the editor

Lighter tooling section, kept brief. `pnpm exec playwright codegen http://localhost:3000` opens a browser that records clicks/types into Playwright code with locators pre-generated — useful for a **first draft** of a new spec. The senior move: codegen sometimes emits CSS selectors over role-based ones, so rewrite the locators for stability in review (callback to the role-first section). Name the VS Code extension once: Run/Debug per test, live trace, locator picker.

Plain prose + maybe one short `Code` line for the codegen command. No exercise — this is reference-grade.

Reasoning: codegen + the extension are real parts of the 2026 workflow worth naming, but they're tools-you-run, not concepts-to-master; a brief mention with the one senior caveat (fix codegen's locators) is the right weight. Placing it after locators means the "rewrite the locators" advice has a referent.

### What stays out of this surface (brief)

A tight closing beat naming the deliberate cuts so the student knows the boundaries (and Lesson 3 / future tools aren't expected here):

- **Reading trace internals in depth** — named where to find traces and what they show; the docs own the panel-by-panel tour.
- **Custom reporters** — pinned to GitHub + HTML.
- **Sharding** — only when the suite crosses ~10–15 min; the chapter-end suite is too small to need it. One sentence (GitHub Actions matrix `--shard=1/4` …), named as a seam, not taught.
- **Component testing in Playwright** (`@playwright/experimental-ct-react`) — RTL owns the component layer (ch089); the course does not dual-pin.
- **Mobile emulation, visual regression** — out of scope for this SaaS-focused chapter.
- **`page.clock`** — name it exists (stable, controls `Date.now()` in the browser; same intent as Vitest's `vi.setSystemTime` from ch087) for time-based UI like trial-end dates, but defer real use to where a money path needs it. One line.

Keep this as terse bullets/prose, not a heavy section — its job is boundary-setting.

Reasoning: the chapter outline's explicit "does NOT cover" list maps here; surfacing the cuts prevents a writer from over-teaching and tells the student where the edges are. `page.clock` and sharding are "named once" per the outline — this is the once.

### External resources (optional)

`ExternalResource` cards: Playwright official "Setting up CI" / "Trace viewer" docs and the "Best practices" page. **Watch-out for the polisher/resourcer (per continuity note):** the Playwright "Best Practices" page says "don't test third parties you don't control," which *tensions* with the course's stance of driving real Stripe Checkout test mode — **that nuance is Lesson 3's, not this lesson's.** If linking Best Practices here, do **not** address the Stripe tension in this lesson. Optional `VideoCallout` if the resourcer finds a current (2026) Playwright config/trace walkthrough; drop it if no good fit (continuity note marks it optional).

## Scope

**Prerequisites to redefine in one line each (do not re-teach):**
- The money-path filter and "production build not `next dev`," `retries:1`-not-`3`, flake-gets-structural-fixes — all from **Lesson 1**; reference, never re-argue (continuity note is explicit: wire the config, don't re-teach the discipline).
- The role-first locator ladder (`getByRole`→`getByLabel`→`getByText`→`getByTestId`) — from **ch089 L3**; here it's pure transfer with `page.` swapped for `screen.`.
- "Separate real Postgres for tests" and per-test isolation — from **ch088 L1–2**; here the *isolation seam differs* (full reset vs per-test rollback) and that difference is the teach.
- The single shared test/expect import and DI-style fixtures — from **ch088 L3 / ch089 L2**; transfer the pattern, show the Playwright `test.extend` shape.
- MSW as the integration wire-mock — from **ch088 L4–5**; mention only to say it does **not** run in E2E (separate process); do not re-teach MSW.

**This lesson does NOT cover (owned elsewhere):**
- The four money-path tests walked test-by-test (sign-in, Stripe checkout round-trip, invitation acceptance, primary value loop), Stripe iframe selectors, `page.route` for in-browser mocking, OAuth round-trip vs redirect-URL trade-off, per-test data hygiene patterns, the CI `playwright.yml` workflow, the reviewer checklist — **Lesson 3**.
- The Stripe "don't test third parties you don't control" nuance and driving real Checkout test mode — **Lesson 3**.
- Stripe Test Clocks for full billing-cycle simulation — integration territory (**ch088**), named once at most.
- The Stripe-checkout project hardening — **Chapter 091**.
- Visual regression (Chromatic/Percy), accessibility audits at depth (axe-core), load testing (k6), mobile-app E2E (Detox/Appium), component testing in Playwright — **out of scope** for the course.
- Panel-by-panel trace viewer internals, custom reporters, sharding mechanics — **named, not taught** (docs own them).

## Code conventions notes

- `documentation/code standards/Code conventions.md` Testing section already encodes this chapter's stance: "E2E (Playwright) reserved for money paths … Zero or four E2Es by year one" and "Flake has a structural cause. `--retry` is forbidden." Align config copy accordingly — the `retries: process.env.CI ? 1 : 0` line is the *CI-differentiator* retry (one re-run to distinguish flake from real failure), **not** the forbidden `--retry`-to-mask-flake; make that distinction in prose so it doesn't read as contradicting the convention.
- Conventions specify `tests/integration/` for cross-module integration tests; mirror that with `tests/e2e/` for specs and call out the parallel so the repo layout stays coherent.
- Package manager is **pnpm** throughout (matches conventions and the chapter outline) — use `pnpm` in every command (`pnpm create playwright`, `pnpm exec playwright show-trace`, `pnpm db:e2e:reset`).
- **Deliberate divergence to flag for downstream agents:** the generated scaffold ships `retries: 2` (CI) and a 3-format reporter; the course uses `retries: 1` and `[['github'],['html']]`. This is intentional (Lesson-1 discipline + course pins) — do not "correct" to the scaffold default.
