# Lesson outline — Chapter 090, Lesson 1

## Lesson title

- Title: The money-path filter
- Sidebar label: The money-path filter

## Lesson framing

This is a **decision lesson**, not a coding lesson. Zero Playwright code is written here (lesson 2 owns config/mechanics, lesson 3 owns the path catalog). The deliverable is a *mental gate* the student runs before writing any E2E test: **does this path move money, break identity, or lose unrecoverable data?** If not, Playwright is the wrong tool.

This lesson is the direct E2E analog of the immediately-preceding sibling lesson, ch089 L1 "When component tests earn their weight" — same "off by default / trigger before tool" shape, one band higher on the honeycomb. ch089 L1 *explicitly forward-references this lesson* ("You'll meet it again with Playwright in the next chapter"). **Match its structure, tone, and pedagogy deliberately** — the student should feel the pattern click as a *third* instance (TanStack Query/Zustand → RTL → Playwright) of one idea they already own. Do not re-derive the "trigger before tool" framing from scratch; name it as the recurring pattern and zoom in on the E2E specifics.

Key brainstorm conclusions that apply lesson-wide:

- **The whole lesson lives inside one honeycomb band.** The student met the honeycomb in ch086 L2 (wide unit base, integration center of gravity, thin component band, *thinnest* E2E band gated by trigger). This lesson is the thinnest band. Open by re-anchoring to that map so the student knows exactly where they are; do not re-teach the honeycomb.
- **Lead with the pain, then invert the reflex.** The "test-pyramid reflex → 80 flaky tests by month six → the bug that shipped wasn't covered" story is the motivating cold-open, mirroring ch089 L1's opening. The fix is the inversion: E2E is *off by default*; it earns weight only against the money-path filter. Playwright is a **money-path tool, not a coverage tool** — this is the lesson's one-sentence thesis, state it early and verbatim-memorable.
- **Cognitive load: build the filter incrementally.** First name the three failure classes (money / identity / unrecoverable data) → then the cost shape that makes E2E expensive → then the flake budget that makes it risky → then fuse both with the filter into a single runnable 4-step gate. Each piece is a denominator or numerator in the same cost-benefit math; assemble it visibly, don't dump the gate first.
- **Real production stakes throughout.** Every example lands on the four canon money paths (auth, Stripe checkout round-trip, invitation acceptance, primary value loop) — the same four lesson 3 walks and ch091 hardens. Concrete failure consequences ("a charge fires twice," "sign-in is broken on prod and nobody can reach the app," "an invite grants the wrong org access") make the filter visceral, not abstract.
- **"Year-one zero is correct, not lazy"** is the honest closer (mirrors ch089 L1's "year one may ship zero" closer). Frame it as permission: a small team with disciplined integration tests (ch088) + production observability (Unit 19, forward) is *correct* to ship year one with zero Playwright tests. The trigger language tells them *when to start*, not that they're already behind.
- **Mental model the student leaves with:** a 4-step ordered gate they run in five seconds before typing a test file — money-path filter → already-covered-by-cheaper-tests check → can-Playwright-drive-the-third-party check → deterministic-without-sleeps check. Cheap disqualifiers first; most candidates stop before the last question.
- **Components:** this is a conceptual lesson, so the heavy lifting is one decision-walker (`StateMachineWalker`, the 4-step gate), one HTML+CSS cost-shape diagram (the load-bearing custom visual), one classification drill (`Buckets`), one `TrueFalse` round, and a `VideoCallout`. Code blocks are minimal — at most one tiny illustrative `playwright.config.ts` `webServer` fragment to make "production build, not dev" concrete (NOT a teaching of config — that's lesson 2). Prefer prose + diagrams + exercises over code.

`course-progress` frontmatter: use `0.00005` to match siblings — both ch088 and ch089 lessons use `0.00005` (verified), so the field is not strictly monotonic per chapter; do not invent a higher value.

Tech currency (verified June 2026): Playwright is on the **1.x line** — latest `@playwright/test` is **1.60.0** (May 18 2026), consistent with the chapter framing's "latest 1.x line, May 2026." Do not write a "2.0" or imply a major-version jump.

---

## Lesson sections

### Introduction (no header — opening prose before first h2)

Cold-open with the failure story, mirroring ch089 L1's structure but for E2E:

- A feature lands. The team's pyramid-era reflex fires — nobody decides it, it's muscle memory — "write an E2E test for the new flow."
- Fast-forward six months: 80 Playwright tests, CI runs 25 minutes, a third flake on Tuesday mornings, the team has learned to retry-until-green. The sting: the bug that actually shipped to production wasn't covered by any of the 80. Worse — retry-until-green has trained the team to stop trusting red.
- Name the inversion: for a Next.js 16 SaaS in 2026, **E2E is off by default.** You don't write an E2E test because a flow exists. You write one when the flow crosses the **money-path filter**, and outside it the experienced move is to *not write* the test (or delete it).
- Connect to what they know: "If that framing feels familiar, it should." Same shape as TanStack Query/Zustand (Unit 15) and RTL (the chapter you just finished). This is "trigger before tool" applied to the top band of the honeycomb. Re-anchor to the honeycomb map from ch086 L2 — this lesson lives entirely in the thinnest, top band.
- State the thesis sentence plainly: **Playwright is a money-path tool, not a coverage tool.**
- Set expectations: no Playwright code here (lesson 2 = config/mechanics, lesson 3 = the four paths). What they leave with: a five-second gate they run *before* typing a test file.

Place a `VideoCallout` here as a warm-up (same slot as ch089 L1). Pick a recent (last ~12 months) video making the "write fewer, well-chosen E2E/Playwright tests" or "don't over-test with E2E" case — resourcer/fact-check stage should verify the videoId resolves and the framing matches; if no good fit, the writer may drop it (it's optional). Keep the blurb one sentence tying it to the gate this lesson builds.

`Term` candidates in the intro: **E2E / end-to-end** (define: a test that drives a real browser through the fully-composed app — routing, server, DB, third parties, rendered HTML, hydration, cookies — asserting on what a user sees), **Playwright** (one-line: Microsoft's browser-automation test runner; the 2026 default for E2E on this stack), **flake / flaky test** (a test that passes and fails on identical code, usually from timing or real-network nondeterminism).

### What the money-path filter is

The core concept. Build the three failure classes one at a time so the filter is memorable as a set of three, not a vague "important paths."

A path earns the runtime cost when failure means one of exactly three things:

1. **Money moves wrong** — a charge fires twice, a plan downgrade silently fails, a refund never reaches the customer, a user pays and doesn't get the plan (or gets it without paying).
2. **Identity breaks** — sign-in is broken on production and paying users can't reach the app at all; a session doesn't survive a redirect.
3. **Unrecoverable data is lost or exposed** — an invitation grants the wrong org access (multi-tenant blast radius), an export silently omits records, a delete the user can't undo fires on the wrong row.

Everything else stays at the **seam** (integration, ch088), the **component** (RTL, ch089), or off the test menu entirely. Reinforce: the filter is *subtractive* — its job is to keep paths *out* of the E2E suite, not to find more to add.

Pedagogical note: phrase each failure class with its concrete consequence inline (as above) — the consequence is what makes the class stick. End the section with the compressed mnemonic: **money, identity, unrecoverable data.**

`Term` candidate: **seam** (re-explain concisely from ch086/088: the boundary where the framework, DB, auth, and third-party APIs meet — where integration tests live and where most SaaS bugs cluster).

### The cost shape that makes E2E expensive

This is the *denominator* in the cost-benefit math — install it before the gate so "off by default" feels earned, not asserted. Mirrors the cost-shape paragraph ch089 L1 placed before its triggers, but extends the ladder one rung to E2E and makes E2E the focus.

Teach the cost ladder with concrete numbers (from ch086 L2 / ch089 L1, kept consistent):

- Unit test (`/lib`): ~5 ms.
- Integration test with rollback (real Postgres): ~20–80 ms.
- Component test in jsdom: ~100–300 ms.
- **Playwright test: 2–10 seconds locally, often more in CI.** Three orders of magnitude over a unit test.

Then the suite-level consequence (the number that governs the discipline): a ~30-test Playwright suite costs roughly 2 minutes in CI when parallelized; a 200-test suite is a 20-minute pole that the team starts skipping. **The discipline is the count** — same as RTL disciplined the component count, one band up.

**Build the load-bearing diagram here.** HTML+CSS horizontal bar/strip showing the four test tiers on a log-ish runtime axis (5 ms → 80 ms → 300 ms → 2–10 s), each bar labeled with tier name + runtime, the Playwright bar visually dominant and accent-colored. Pedagogical goal: make "three orders of magnitude" *visible* in one glance so the cost asymmetry is felt, not just read. Follow `documentation/diagrams/html-css.md` rules carefully:
- Horizontal layout, capped height, `margin: 0` on every inner element (prose-margin gotcha).
- A true log scale is hard to read for beginners — prefer a clearly-labeled "not to scale / orders of magnitude" caption over a literal pixel-proportional log axis, OR use a capped/broken-bar treatment with the seconds bar annotated "≈100× the unit bar". Writer's call; the *felt asymmetry* is the goal, exact proportionality is not.
- Saturated mid-tone fills with white text or `currentColor`, theme-aware (no baked `#000`/`#fff`).
- Wrap in `<Figure>` with a caption naming the takeaway ("E2E is the most expensive test you can write — by orders of magnitude").

### The flake budget is structurally larger

The second reason E2E is off by default — the *risk* axis alongside the *cost* axis. Beginners underestimate this; it's the pain point that most surprises people meeting E2E for the first time.

- Why E2E flakes more than anything below it: a real browser + a real network + a real third-party UI (Stripe Checkout) + real timing all compound into a flake surface integration tests structurally don't have. Each added real dependency multiplies nondeterminism.
- The anti-pattern to name and forbid: adding `retries: 3` to make CI green. It *hides real bugs* — a test that only passes on the third try is telling you something real about a race in your app, and muting it discards the signal. (Don't teach the config knob here — lesson 2 owns `retries`/`trace` — but name the anti-pattern as part of the *discipline*.)
- The 2026 stance, stated as principle (mechanics deferred to lesson 2): flake gets a **structural fix, not a retry bump** — better locators, auto-waiting assertions instead of fixed sleeps, deterministic seed data. Forward-reference lesson 2 for the *how*; here just install the *rule*.

Pedagogical framing: cost (previous section) + flake (this section) together are *why* the bar for an E2E test is so high. The next section gives the *gate* that enforces that bar.

`Term` candidate: **race / race condition** if not already familiar from earlier units — only if it reads as non-obvious here; otherwise skip (be strategic).

### What only E2E can catch — and what it can't

A balanced two-sided section so the student doesn't over-correct into "E2E is useless." This is the *justification* half: the one thing E2E does that nothing cheaper can. Then the trap half: the things people wrongly reach for E2E to do.

**What E2E catches that nothing else does — the composition.** The full stack composed: routing, middleware, server actions, database, third party (Stripe, the email service), the rendered HTML, the JS hydration, the cookie store, cross-page navigation. A bug that lives *in the composition itself* — a redirect that loops, a session that doesn't survive the Stripe round-trip, a webhook arriving before the UI re-fetches — only a browser-driven test sees. **Composition is the only justification for an E2E test.** Make this the crisp positive rule: if the bug isn't a composition bug, a cheaper test owns it.

**What E2E does NOT catch better than cheaper tests** (the trap that creates the slow-flaky-suite anti-pattern):
- Form validation branches → component test (ch089).
- A Server Action's database write → integration test (ch088 L7).
- Webhook signature verification → integration test (ch088 L6).
- The accessible name on a button → component test / RTL query ladder (ch089 L3).

**Use a `TabbedContent` here**, mirroring ch089 L1's "in the component vs at the seam" two-tab device — but here it's **"only E2E sees this" vs "a cheaper test already owns this."** Left tab: composition bugs (the loop, the lost session, the webhook-before-refetch). Right tab: branch/seam/a11y bugs with their cheaper home named. Pedagogical goal: the same crisp non-overlapping-jobs contrast that worked one chapter back, so the boundary is felt as a hard line, not a preference. Captions on each tab restate the rule ("the bug lives in the composition — only the browser sees it" / "the bug lives below the browser — a cheaper test sees it sooner and more reliably").

### The 20–30 money-path shape

Sizes the destination so the student has a number to calibrate against — and so "off by default" doesn't read as "never write any."

- A mid-stage SaaS has **under thirty** money paths total. That's the *upper bound*, not the target.
- The first ~ten are **universal** to every SaaS: sign-in (email+password and any OAuth used), sign-out, the checkout redirect to Stripe, the return from Stripe and the plan flip the user sees, invitation acceptance with seat grant, password reset, the primary "create-the-thing-customers-pay-for" path.
- The next ~ten are **app-specific** (the export the user bought the plan for, the report the auditor needs).
- **Past thirty, the test budget is being misallocated** — you've drifted from money paths into coverage-chasing.

Forward-reference: lesson 3 walks the four canonical paths in *this course's app* (sign-in, Stripe checkout round-trip, invitation acceptance, primary value loop) in detail. Here, just establish the shape and the ceiling. Keep this short — it's calibration, not catalog.

### Year-one zero is the correct default

The honest closer / permission section, mirroring ch089 L1's "Year one may ship zero component tests."

- A small team shipping fast on this stack — disciplined integration tests (ch088) + a Sentry-led production observability surface (Unit 19, forward-reference) — is **correct** to ship year one with **zero Playwright tests.** Not lazy. Correct.
- How the risk is actually covered without E2E: the integration suite catches the seam bugs; production observability catches the unknown-unknowns; manual smoke-testing covers the rest until the team can afford the runtime cost.
- The trigger language tells the team **when to start**, not "we should already have E2E." The day the Stripe checkout path ships, or sign-in becomes the gate to a paid product, a money-path trigger fires and you reach.
- The "year-one zero, year-two five" trajectory (from lesson 3's framing, previewed here): a team starting E2E in year two reaches *first* for sign-in and Stripe checkout; the other paths follow as the team outgrows manually verifying them each release. The four-path catalog is the *destination*, not the day-one count. A senior reviewing a junior's first Playwright PR pushes for **fewer, better-chosen tests, not more.**

Tie back to the sibling lesson explicitly: "This is the same stance the previous chapter took on component tests" — one coherent testing philosophy, applied band by band.

### Why production build, not `next dev`

A focused, concrete sub-point that earns its own section because it's a specific high-stakes mistake and the one place a tiny code fragment helps. (Lesson 2 owns the full config; here teach only the *why*.)

- Dev mode runs **different code paths**: no static optimization, dev-only error overlays, dev-only middleware behavior, unminified hydration.
- The consequence: an E2E test that passes against `next dev` and fails against `next start` (or the reverse) is *the bug that ships* — your test asserted on output users never get.
- Therefore Playwright must drive a **production build** (`next build && next start`) from the very first test, wired via `webServer` in the config.
- **One tiny `Code` block** showing just the `webServer` shape to make it concrete — NOT a config walkthrough (that's lesson 2). Something like:
  ```ts
  // playwright.config.ts — the line that matters
  webServer: {
    command: 'pnpm build && pnpm start', // production build, never `next dev`
    url: 'http://localhost:3000',
  },
  ```
  Keep it to this fragment; annotate via a trailing comment, not `AnnotatedCode` (too heavy for one line). Flag to downstream: this fragment is a *motivating preview*, deliberately incomplete; lesson 2 ships the full config.
- This is one of the lesson's named watch-outs; surface it as the teaching point of the section, not a tip bucket.

### The four-step gate before you write the test

The synthesis — fuse the filter (money/identity/data), the cheaper-test check, the third-party-drivability check, and the determinism check into one *ordered* runnable procedure. Mirrors ch089 L1's "five-second gate" section exactly in spirit.

Teach the order explicitly and *why the order* — cheap disqualifiers first, so most candidates stop before the expensive judgment call:

1. **Is this a money path under the filter?** (money moves wrong / identity breaks / unrecoverable data) — Stop if no.
2. **Is the same composition already covered by an integration test + a component test that together catch the same bug?** — Stop if yes. Composition is the *only* justification; if cheaper tests already compose to catch it, you don't need the browser.
3. **Does the path cross a third party Playwright can actually drive?** (Stripe Checkout test mode; an OAuth provider with a test account) — Stop if no → write the seam test instead.
4. **Will the test be deterministic without sleeps?** — Stop if no → fix the test or the app *before* adding the test.

**Build the `StateMachineWalker`** (`kind="decision"`) here — this is the centerpiece interactive, directly analogous to ch089 L1's gate walker. Four question nodes in the order above, each with Yes/No branches, terminating in Stop leaves (one per disqualifier, each naming the cheaper home or the fix) and one "Write the Playwright test" reach leaf. The reach leaf instructs: name the money path in the PR description; if you can't name it, it doesn't pass the filter.

Pedagogical goal (state it in prose around the walker, as ch089 L1 does): walking it shows how *rarely* you reach the last question — that's the gate working. It's a five-second *mental* gate, not a process document. Do NOT wrap the walker in `<Figure>` (it provides its own card — per component doc).

Leaf content sketch:
- Stop-not-money-path: "Not a money path. The seam (ch088) or component (ch089) owns this, or it's off the menu."
- Stop-already-covered: "Cheaper tests already compose to catch this bug. The browser adds cost and flake, not coverage."
- Stop-undrivable: "Playwright can't drive this third party reliably. Write the seam test and assert the redirect/contract instead."
- Stop-nondeterministic: "A test that needs a sleep to pass is hiding a race. Fix the app or the test first — don't paper over it."
- Reach: "A money path the cheaper layers can't compose to catch, driving a third party Playwright can reach, deterministically. Write it — and name the money path in the PR."

### Sort the paths: which earn a Playwright test?

A `Buckets` classification drill so the student *runs* the filter rather than just reading it — mirrors ch089 L1's Buckets placement after the triggers. Two buckets: **"Write a Playwright test" (money path, composition-only)** vs **"Don't — a cheaper layer owns it."**

Item set (mix clear money paths with tempting-but-wrong picks that have a cheaper home):
- Reach: Sign-in to a paid dashboard (email+password).
- Reach: The Stripe Checkout redirect and the plan flip the user sees on return.
- Reach: Accepting an org invitation and landing in the right org with the right role.
- Reach: The primary value loop (e.g. create invoice → recipient pays → invoice flips to paid in the UI).
- Skip: A Zod form-validation branch (error shows on empty email) → component test (ch089).
- Skip: A Server Action writes the row to Postgres → integration test (ch088).
- Skip: Webhook signature verification rejects an unsigned payload → integration test (ch088).
- Skip: The settings page renders the user's name → no money flow; off the menu (or a manual click).
- Skip: The marketing landing page renders → no money flow; a curl health check at most.
- Skip: A button has the right accessible name → component test / RTL (ch089).

Use `instructions` to frame it ("Each item is a path in a typical 2026 SaaS. Does it cross the money-path filter and need the full composition — or does a cheaper layer already own it?"). Keep `bucket` names exact-matched to items (component-doc gotcha).

### Recap round (TrueFalse)

Close with a `TrueFalse` round (mirrors ch089 L1's closing round) — 5 statements covering the lesson's load-bearing claims, each with a `TfWhy`. Candidate statements:

- (false) For a 2026 Next.js SaaS, E2E tests are on by default and you delete the ones that don't earn their weight. → *Inverted: off by default; you add one only when the money-path filter fires.*
- (true) A small SaaS with disciplined integration tests and production observability can correctly ship year one with zero Playwright tests. → *Year-one zero is the honest default; the trigger language says when to start.*
- (false) Running E2E tests against `next dev` is fine and faster than a production build. → *Dev runs different code paths; a pass against dev can be a fail against prod — the bug ships from the mismatch.*
- (false) When an E2E test flakes intermittently, bumping `retries` to 3 to keep CI green is the right fix. → *Hides a real race; flake gets a structural fix, not a retry bump.*
- (true) The only thing that justifies an E2E test over cheaper tests is a bug that lives in the composition of the full stack. → *If integration + component tests compose to catch it, the browser adds cost and flake, not coverage.*

### External resources

`CardGrid` of `ExternalResource` cards (mirrors ch089 L1's closing card grid). Candidates (fact-check freshness/URLs at step 6):
- Playwright "Best Practices" docs — `https://playwright.dev/docs/best-practices` (verified June 2026; its "Test user-visible behavior" and "Avoid testing third-party dependencies" headings directly back this lesson's claims). The canonical reference the chapter builds on. Caveat for the writer: its "don't test third parties you don't control" line lightly tensions with the chapter's "drive real Stripe Checkout test-mode" stance — that's a deliberate course choice (Stripe *test mode* is a stable contract, not an uncontrolled prod dependency), and lesson 3 owns the nuance; don't let the card's blurb contradict it.
- Playwright homepage or "Why Playwright" — one-line orientation for the tool greenlit by this filter.
- A "write fewer E2E tests / E2E only on critical paths" article from a reputable source dated within ~12 months — sharpening the lesson's central claim. Resourcer's call.

Keep each description to one sentence tying it to a load-bearing claim of *this* lesson.

---

## Scope

**This lesson teaches** the *decision*: when a Playwright/E2E test earns its runtime cost (the money-path filter: money / identity / unrecoverable data), why year-one zero is correct for a small 2026 Next.js SaaS, the cost and flake reasons E2E sits at the top of the honeycomb, the composition-only justification, the 20–30 path ceiling, the "production build not `next dev`" rule (the *why* only), and the four-step gate.

**This lesson does NOT teach (reserve for downstream):**
- Playwright config in depth, `webServer` setup, fixtures, `storageState`, locators, `expect` auto-waiting matchers, the trace viewer — **lesson 2 of this chapter.** (Only a one-fragment `webServer` *preview* appears here, deliberately incomplete.)
- The course's four money paths walked test-by-test (locator shape, data hygiene, Stripe iframe selectors, OAuth trade-off, CI workflow) — **lesson 3 of this chapter.**
- `retries`/`trace`/`screenshot` config knobs — named as *discipline/anti-pattern* only; the config surface is **lesson 2.**
- The E2E test database, seed, `storageState` per role — **lesson 2.**
- The Stripe-checkout project hardening — **chapter 091.**
- Visual regression (Chromatic/Percy), accessibility audits at depth (axe-core), load testing (k6), mobile-app E2E (Detox/Appium), the full Playwright API surface — **out of scope** (the docs own the API).

**Prerequisites to redefine concisely (do not re-teach):**
- The **honeycomb** suite shape (ch086 L2) — one sentence: wide unit base, integration center of gravity at the seams, thin component band, thinnest E2E band gated by trigger. This lesson lives in the top band.
- The **seam** and integration tests (ch088) — one phrase: the boundary where framework/DB/auth/third-parties meet, where most SaaS bugs cluster and integration tests live.
- **Component tests / RTL off by default** (ch089) — reference as the sibling pattern one band down; the student just finished it.
- **"Trigger before tool"** / conditional-power-tool pattern (Unit 15 TanStack Query & Zustand) — name as the recurring course pattern, don't re-derive.
- **Stripe Checkout, webhooks, the plan flip** (Unit 11) — one phrase each; the student built these. Don't re-teach billing.
- **Invitations / multi-tenancy / RBAC** (Unit 9) — one phrase; the student built these.

## Notes for downstream agents

- **Anchor file:** treat `src/content/docs/089 Component tests, off by default/1 When RTL earns its weight.mdx` as the structural template — frontmatter shape, cross-ref slug style (e.g. relative links to sibling chapters/lessons), component import paths, tone, length. This lesson is its E2E twin.
- **Cross-ref slugs:** wire real hrefs to ch086 L2, ch088 (relevant lessons), ch089 L1, and forward to ch090 L2/L3 and ch091. Built chapters (086/088/089) have real slugs; ch090 L2/L3 and ch091 are unbuilt at write time — use prose or in-chapter relative links the Phase B pass can resolve, and grep for dead `](#)` links before finishing.
- **No Playwright code beyond the single `webServer` fragment.** If the writer feels the urge to show a test, stop — that's lesson 3's job.
- **Keep it 30–40 min** (chapter outline estimate). It's a decision lesson; the rest of the chapter sits under the trigger this one installs. Don't pad.
