# The four-path catalog

- **Title:** The four-path catalog
- **Sidebar label:** The four-path catalog

---

## Lesson framing

This is the **pattern/catalog lesson** that closes the chapter's teaching arc. Lesson 1 installed the *trigger* (the money-path filter); Lesson 2 installed the *surface* (config, `storageState`, locators, auto-waiting `expect`, fixtures, the `saas_e2e` DB, the trace viewer). This lesson spends both: it walks the **four canonical money paths in the course's invoice SaaS** as concrete Playwright specs, so the student leaves with a reusable template, not a config tour. The senior question driving the lesson: *Which paths in this app actually pass the filter, and what does the test for each look like?*

Key brainstorm conclusions that shape the whole lesson:

- **Do not re-teach the surface.** The student already owns `playwright.config.ts`, `auth.setup.ts`/`storageState`, the locator ladder, auto-waiting matchers, fixtures, the `saas_e2e` DB + `pnpm db:e2e:reset`, and the trace viewer. This lesson *uses* them silently and only flags the one new wrinkle each path introduces (cross-browser on auth, iframe `frameLocator` on checkout, no-`storageState` fresh-user on invitation, unique-id data hygiene on the value loop). When a spec relies on a Lesson-2 mechanism, name it in one clause and move on.
- **The catalog is the canon, not a coverage target.** The recurring senior note — *fewer, better-chosen tests* — frames everything. The four paths are the **destination** a year-two team converges on, not a day-one checklist. Reinforce the "year-one zero → year-two four" trajectory: a team reaches first for sign-in and checkout, adds invitation and the value loop only when manual verification stops scaling.
- **Each path teaches by a real spec the student could paste.** The dominant vehicle is annotated spec code in the course's exact idiom (imports from `./fixtures`, role-first locators, `await expect(...)`, `storageState` via project config). Lead each path with *what failure costs* (the money-path filter applied), then the *behaviors to assert*, then the *spec*, then the *one new wrinkle*.
- **The composition is the justification, every time.** For each path, explicitly draw the line between what the cheaper test already covers (the webhook in isolation = integration test, Ch088 L6; form validation = component test, Ch089 L4) and what *only* the browser-driven composition catches (session survives the Stripe round-trip; the UI re-fetches after the webhook lands). This is the through-line that keeps the catalog honest and prevents duplicate coverage at E2E cost.
- **Stripe Checkout is the centerpiece.** It's the canonical money path and the only one that drives a real third party (test mode + `4242` card) and an iframe. It earns the most space: a sequence diagram of the composition, an AnnotatedCode spec, and the `frameLocator` mechanic. It is also the path Chapter 091 hardens, so frame it as the worked example the project chapter builds on.
- **Visual aids carry the composition story.** Two diagrams pull weight: (1) a sequence diagram of the Stripe round-trip showing the cross-process/redirect hops that make it an E2E-only bug surface; (2) a DiagramSequence of the four invitation arrival shapes collapsing onto one accept route. A comparison surface (Buckets or a table) makes the "in the catalog vs cheaper home" decision tactile.
- **Cognitive-load order:** paths are ordered by universality (sign-in → checkout → invitation → value loop), the same order a real team adopts them. Each path is self-contained so the student can stop and resume.
- **Mental model the student leaves with:** "An E2E test is a *composition* test for a money path. I name the path, I drive it role-first through a production build with `storageState`, I let third parties be real (Stripe test mode), and I assert on the user-visible outcome — the DOM, the URL — never internal state. The catalog has ~4 entries because the filter is strict, and a good Playwright PR removes tests as often as it adds them."

---

## Lesson sections

### Introduction (no header)

Warm, brief, ~2 short paragraphs. Connect back: "Lesson 1 gave you the filter, Lesson 2 gave you the kit. Now we point the kit at the four paths in our invoice app that actually clear the filter." State the deliverable: by the end, four spec templates the student can adapt, and a sharp sense of which paths belong here versus which have a cheaper home. Name the four paths up front as a one-line list (sign-in, Stripe Checkout round-trip, invitation acceptance, the invoice value loop) and note the ordering rationale (universality = adoption order). Set the senior framing: the catalog is the canon a team *extends without re-litigating the trigger* — and a destination, not a day-one count.

Reasoning: the chapter framing says this is a pattern lesson; the intro must immediately orient the student to "these specific four, in this order, why."

### Money path 1 — sign-in to the paid surface

**Content.** The first money path of every SaaS. Apply the filter out loud: failure here = **identity breaks**, users can't reach the product they pay for. This is the path the whole `storageState` machinery exists to *enable* elsewhere — but this test is the exception that does **not** use `storageState`, because the thing under test *is* the login itself; it drives fresh browser contexts.

Behaviors to assert (the canonical four, mapped to the app's Better Auth sign-in from Unit 8 with its `Result` discriminant):
1. `/sign-in` renders with email + password fields (role/label locators).
2. Valid credentials → redirect to `/dashboard`, the signed-in user's name visible.
3. Invalid credentials → an error alert with the right accessible name, still on `/sign-in` (maps to the `'invalid-credentials'` discriminant).
4. The dual-key rate limiter (Unit 14) blocks the sixth attempt and surfaces the lockout copy (maps to `'too-many-attempts'`).

Two wrinkles to name (both are *this path's* additions, not re-teaches):
- **Cross-browser.** Sign-in is one of the two paths (with checkout) that also runs in WebKit and Firefox via the opt-in `PLAYWRIGHT_PROJECTS=all` projects from Lesson 2 — auth breakage is browser-specific often enough to pay for it here.
- **Rate-limit state reset.** The lockout assertion only works from a known counter. The seed's `db:e2e:reset` clears the Upstash counters for `*@e2e.test` emails (the forward-ref Lesson 2 made) — so this test starts from attempt zero. One sentence; the seed owns it.

**Components.**
- One **`AnnotatedCode`** (`lang="ts"`, `maxLines` ≤ 18) walking a compact sign-in spec covering the happy redirect + the invalid-credentials alert in one file. Steps: (1) `test` from `./fixtures`, fresh context, no `storageState`; (2) drive the login UI with role-first locators; (3) `await expect(page).toHaveURL(/dashboard/)` + name visible; (4) the negative branch — bad password, assert the alert + still on `/sign-in`. Use `color` on each step (blue default, orange on the assertion step, green on the negative-branch assertion). Keep the seeded credentials (`owner@e2e.test`) consistent with Lesson 2.
- A short prose callout (Aside `note`) on the rate-limit reset dependency, OR fold it into the spec as a final commented step — author's call; prefer the Aside to keep the spec clean.

Reasoning: sign-in is the most universal path and the clearest application of the filter; leading with it also lets us immediately demonstrate the "this path is the *exception* to `storageState`" nuance, which prevents a common confusion.

### Money path 2 — the Stripe Checkout round-trip

**Content.** The canonical money path and the chapter's centerpiece. Filter applied: failure = **money moves wrong** (user pays and doesn't get the plan, or gets the plan without paying). This is the path that justifies the whole E2E layer, because the bug lives in the *composition* — the session surviving a redirect to a third-party origin and back, and the UI reflecting an entitlement that a webhook (a different process, arriving on its own schedule) wrote.

Open with the **composition argument**, made visual. The student already saw (Ch064 L2, Ch088 L6) that the webhook is verified and tested *in isolation* at the integration layer. Draw the line explicitly: the integration test proves "given this event, Postgres flips the plan"; this E2E proves "given a real user clicking Pay, the round-trip completes and *the user sees Pro*." Different bug class, different test.

Behaviors to assert (maps to Ch064 L2 hosted Checkout + the success-page poll/`router.refresh()` race-closer from Ch063 L3):
1. Signed-in owner (`storageState`) on `/billing` clicks "Upgrade to Pro".
2. Lands on `checkout.stripe.com` — assert the URL.
3. Fills the test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP — **inside Stripe's iframes**.
4. Submits; returns to `/billing/success` — assert the URL.
5. The UI reflects the plan as "Pro" — read from the DOM (the user's view of truth), which is what the success page's poll-until-webhook-lands produces.

The **new mechanic: iframe `frameLocator`.** Stripe's hosted page nests card entry in iframes; reach them with `page.frameLocator('iframe[name="..."]').getByLabel(/card number/i).fill('4242...')`. Pin to **role+name *within* the frame**, not CSS within the frame. (Confirmed current in Playwright 1.60, May 2026; the newer `locator.contentFrame()` is an equivalent idiom — mention it in one clause as the alternative, but keep `page.frameLocator(...)` as the primary shape since it's the most direct for a hosted page.) Note the stance tension explicitly (this is the nuance Lesson 2 deferred to here): the Playwright "Best Practices" page warns against testing third parties you don't control, but driving Stripe **test mode** is the deliberate course exception — in a money path, Stripe *is* part of the system under test, and test mode + the `4242` card is a stable contract, not a flaky live dependency. One tight paragraph; resolve the tension, don't belabor it.

Two scope guards to name once each:
- **Single-browser is acceptable here for cost** (despite checkout being a cross-browser path for sign-in's sake) — the project chapter (Ch091) revisits depth.
- **Stripe Test Clocks** (fast-forwarding a billing *cycle*) are **integration territory** (Ch088), not E2E — driving a full billing cycle in one browser test blows the runtime budget. Named once, not taught.

**Components.**
- A **Mermaid `sequenceDiagram`** wrapped in `<Figure>`, the composition picture. Actors/participants: Browser (User), Next app (`/billing`, `/billing/success`), `checkout.stripe.com`, Stripe (webhook sender), Postgres. Messages: click Upgrade → server action creates session → 303 to Stripe → user pays in iframe → Stripe redirects to `/billing/success` **and** (async, separate arrow) Stripe POSTs webhook → app verifies + writes `plan_entitlements` → success page polls/`router.refresh()` → UI shows Pro. Use a `note` to mark the two arrows that *only the browser test spans* (the redirect round-trip and the poll-after-webhook). Pedagogical goal: make visible *why* this is E2E-only — two processes and a third-party origin in one user-perceived flow. Keep it horizontal/compact; apply `themeCSS` font bump if text shrinks (per mermaid.md). Caption names the composition as the justification.
- One **`AnnotatedCode`** (`lang="ts"`, `maxLines` ≤ 18) of the checkout spec. Steps: (1) `test` from `./fixtures`, owner via `storageState` (one clause); (2) `/billing` → click Upgrade, `await expect(page).toHaveURL(/checkout\.stripe\.com/)`; (3) the `frameLocator` card fill — the new mechanic, color orange; (4) submit → `await expect(page).toHaveURL(/billing\/success/)`; (5) assert the plan badge reads "Pro" from the DOM, color green. The spec is the template Ch091 extends — say so in the trailing prose.
- Optional **`PlaywrightEmbed`** (`expandable={true}`) pointing at the public TodoMVC sample trace as an *optional* "this is what a checkout-flow trace looks like" reference — **only if** it adds value without implying it's a real Stripe trace; otherwise omit (Lesson 2 already gave the student a live trace to operate). Lean toward omitting to avoid redundancy; note this is the writer's call.

Reasoning: this path is where the chapter's whole thesis ("E2E catches composition bugs nothing else does") becomes concrete and visible; it deserves the diagram + spec + the one genuinely new API (`frameLocator`). It's also the Ch091 seam, so it must leave a reusable template.

### Money path 3 — invitation acceptance with seat grant

**Content.** Filter applied: failure = **unrecoverable data boundary breach** with multi-tenant blast radius — a member granted access to the wrong org, or denied the right one. This is the path with the highest *correctness* stakes even though it moves no money directly.

The complication that makes it interesting: the invitee is a **new user every run**, so this test (like sign-in) runs **without `storageState`** — it creates and tears down a fresh user per test. Briefly recall (one clause) the app's invitation model from Unit 9 (Ch058/059): a signed token on the accept URL, four arrival shapes funneled through one accept route, auto-`emailVerified` for invite-sourced signups, an active-org switch on accept.

Behaviors to assert (the seat-grant happy path + the boundary guard):
1. A fresh user gets an invitation — the token arrives via a **seed-inserted token** (or the Resend test webhook); the *email send itself* is the seam-test's job (Ch058 L2), not this test's. Name the boundary.
2. User opens the accept URL with the signed token → lands on a sign-up form pre-filled with the invited email.
3. Submits credentials → lands on the org's dashboard with the assigned role visible in the UI.
4. **The boundary assertion:** the new member tries to reach another org's resource and gets a 404 (the multi-tenant guard from Unit 9). This is the assertion that justifies the test — the seat grant *and* its scoping in one flow.

A smaller sibling test to mention (one sentence, not a full spec): the **expired-token** case asserts the rejection alert renders — the seven-day expiry as a security primitive (Ch058 L1) surfaced to the user.

**Components.**
- A **`DiagramSequence`** (NOT wrapped in `<Figure>` — it's its own card) showing the **four arrival shapes collapsing onto one accept route**, then narrowing to the one shape this E2E drives. Steps: (1) the four shapes side by side (signed-in same-email / signed-in different-email / signed-out with account / signed-out without account) all pointing at one accept URL; (2)–(5) progressively dim three and highlight "signed-out without account" — the shape the spec exercises — ending on "seat granted + scoped to org". Per-step captions. Pedagogical goal: situate the *one* path the spec tests within the four the app supports, so the student understands the spec is a representative slice, not the whole feature. Keep boxes as simple labeled HTML divs with an `is-on`/dimmed class pattern (as in the DiagramSequence example).
- One **`AnnotatedCode`** (`lang="ts"`, `maxLines` ≤ 18) of the invitation spec. Steps: (1) fresh user, no `storageState`, seed-insert the token in a fixture (reference the Lesson-2 fixtures pattern in one clause); (2) goto the signed accept URL, assert the email is pre-filled; (3) submit sign-up, assert dashboard + role visible; (4) the cross-org 404 assertion, color green/orange to mark it as the load-bearing check. Trailing prose: the expired-token sibling test in one sentence.

Reasoning: this path's teaching value is the *no-`storageState` fresh-user* shape plus the *boundary assertion as the justification*. The DiagramSequence prevents the student from thinking one spec covers the whole four-shape feature, which is a real misconception risk given Ch058's complexity.

### Money path 4 — the invoice value loop

**Content.** The app-specific path: the one end-to-end loop where every layer must align for the customer to get the value they pay for. For the course's invoice SaaS that's **create an invoice → send it → the recipient pays via Stripe → the invoice flips to paid in the UI** (grounds in the invoice CRUD from Unit 7 and the Stripe payment from Unit 11). Lead with the *generalizable* lesson over the specifics: **identify the one or two loops where the product's core promise is delivered**; in a different codebase this slot holds a different path. Make explicit that paths 1–3 are universal but path 4 is where the team's judgment about *their* product enters.

The pattern that generalizes (state it as the reusable recipe): sign in as the right role (`storageState`) → exercise the create surface → walk the third-party round-trip if any → return → assert the user-visible outcome. This is the same skeleton as path 2, applied to the app's own object.

The **new wrinkle: per-test data hygiene.** Because the value-loop tests write to the *shared* seeded org (parallel workers, one `saas_e2e`), each test creates its records with a **unique identifier** — `` `invoice-${test.info().title}-${Date.now()}` `` — so parallel runs don't collide on the seed. The owner's org is shared; the records inside are addressed by name. Cleanup is **deferred** — the next `pnpm db:e2e:reset` is the canonical clean, not an `afterEach` per test (recall the run-level isolation seam from Lesson 2 — one clause).

**Components.**
- One **`Code`** block (or a compact `AnnotatedCode` if two beats are worth highlighting) showing the unique-identifier creation line in context, so the data-hygiene pattern is concrete. If `AnnotatedCode`: step 1 the create with the unique id (color orange — the new bit), step 2 the assert-on-own-data line. Keep it short; this path reuses path 2's skeleton, so the spec doesn't need a full re-walk — focus the code on the *one new thing* (unique-id hygiene).
- A one-line prose generalization box (Aside `tip`) restating "find your product's value loop; it's the only app-specific entry in the catalog."

Reasoning: path 4 is deliberately the lightest because it reuses path 2's structure; its distinct teaching payload is (a) "this slot is *your* product's call" and (b) per-test data hygiene on a shared DB. Don't pad it with a redundant full spec.

### What belongs in the catalog — and what has a cheaper home

**Content.** The disciplinary heart of the lesson, made interactive. Restate the rule: every candidate that *isn't* a money-path composition has a cheaper, more reliable home. Enumerate the common false candidates and route each:
- Form validation branches → **component test** (Ch089).
- Search results, filter combinations, pagination → **URL-state integration tests** (Ch088).
- Settings page, docs page, marketing landing → **no money flow, off the menu**.
- Server-Action behavior in isolation → **integration test** (Ch088 L7).
- A component rendering correctly in a specific locale → **component test** (Ch089 L4).
- "Smoke" tests that only check a page renders → a **curl-based health check**, not Playwright.
- Visual snapshots → a **separate tool** (Chromatic) if affordable, else off the menu.

**Components.**
- A **`Buckets`** exercise (`twoCol`) — the assessment for this section. Two buckets: **"E2E money path"** vs **"Cheaper home (integration / component / health-check)"**. Items (chips): "Sign-in redirect to dashboard" (E2E), "Stripe Checkout returns and UI shows Pro" (E2E), "Invitation grants the right org and 404s others" (E2E), "Invoice form rejects a blank amount" (cheaper), "Invoice list pagination cursor" (cheaper), "Webhook signature rejection" (cheaper), "Marketing landing renders" (cheaper / off-menu), "Locale string on the dashboard" (cheaper). Instructions name the task. This drills the *filter* one last time on concrete cases — the single most important transferable skill of the chapter.

Reasoning: the chapter framing makes "what does NOT make the catalog" a first-class topic. A Buckets drill is the ideal vehicle — classification is exactly the cognitive task the filter demands, and it gives the student active practice rather than a passive list.

### OAuth sign-in — the conditional reach

**Content.** A focused subsection (short) because many real apps' primary sign-in is "Sign in with Google" (Unit 8, Ch062). The honest trade-off: an OAuth E2E either (a) drives a real Google test account — slow, brittle, and against many providers' automation ToS — or (b) **stops at the OAuth redirect URL and asserts the redirect parameters are correct** — faster, lower-fidelity, and the typical choice. **Recommend option (b) for the per-PR suite**; reserve the full round-trip for a quarterly manual-QA pass. Frame this as the senior call: don't let a third party you can't reliably drive turn a money path into a flaky test — assert the seam you *do* control (the redirect URL you construct).

**Components.** Prose only, plus a tiny `Code` snippet of the redirect-URL assertion shape (`await expect(page).toHaveURL(/accounts\.google\.com.*client_id=/)` style). One `Term` candidate (OAuth) if not already defined earlier.

Reasoning: the chapter framing calls this out explicitly as a conditional reach; it's a real decision students hit, and it reinforces the "drive what you control, stop at the seam otherwise" principle from the gate in Lesson 1.

### Wiring the catalog into CI

**Content.** Brief, concrete. The four-path suite runs in CI after the build job, depends on the DB being reset, and uploads the HTML report + trace artifacts on failure (recall Lesson 2: the trace travels with the failure as a GitHub Actions artifact). Numbers: ~3–6 min on Chromium-only; +WebKit/Firefox for sign-in and checkout brings it to ~8–10 min; past ~15 min, shard (the seam Lesson 2 named, not set up here). Keep this tight — Lesson 2 owns the config; this section just states the *workflow shape and the runtime budget* for the catalog specifically.

**Components.** A short `Code` block sketching the `playwright.yml` job shape (depends-on build, `db:e2e:reset` step, run, `upload-artifact` on failure) — illustrative, not exhaustive. Keep ≤ ~15 lines.

Reasoning: the chapter framing lists CI integration as a per-path concern; consolidating it into one short section (rather than repeating per path) respects token economy and gives the student the end-to-end runtime picture.

### The reviewer's checklist for a new Playwright PR

**Content.** The lesson's capstone — a senior's review gate for any new Playwright test, distilled to six fast checks:
1. **Which money path does this cover?** Name it in the PR description; if you can't, it doesn't pass the filter.
2. **Role-first locators throughout?** Any `data-testid`/CSS needs justification.
3. **`storageState`, not UI login** (except the sign-in path itself)?
4. **Passes with `--retries=0` ten times locally?** (flake is structural)
5. **Touches a third party — if Stripe, test-mode key in use; if not, why is this E2E and not a seam test?**
6. **Has a `trace.zip` been generated and reviewed against the assertions?**

Close on the trajectory: **"year-one zero, year-two four."** A team starting in year two reaches first for sign-in and checkout; invitation and the value loop follow when one engineer can no longer manually verify every release. The four-path catalog is the destination, and *a senior reviewing a junior's first Playwright PR pushes for fewer, better-chosen tests, not more.* This is the sentence the whole chapter has been building toward — end on it.

**Components.**
- A **`CodeReview`** exercise — the capstone assessment. Present a small, plausible new Playwright spec PR (single file, or two files) seeded with 2–3 defects the checklist would catch, e.g.: a `page.waitForTimeout(3000)` before an assertion (defect: sleep instead of auto-waiting matcher); a CSS-class locator `page.locator('.upgrade-btn')` (defect: brittle, role-first is the rule); a full UI login preamble inside a non-sign-in test (defect: should use `storageState`). Each `<ReviewIssue>` gets a tight `kernel` naming the single defect (e.g. "`waitForTimeout` is a sleep — replace with an auto-waiting `expect`"; "CSS-class locator breaks on rename — use role+name"; "logs in via UI instead of `storageState`"). A `<ReviewWhy>` ties them to the checklist. Count rendered lines carefully for `line` props. This makes the student *apply* the reviewer checklist, which is the chapter's terminal skill.
- The trajectory close as prose (no component).

Reasoning: the chapter framing names the reviewer checklist explicitly as a topic; a `CodeReview` exercise is the purpose-built vehicle and turns the checklist from a list into a practiced gate. Ending on the trajectory + "fewer, better-chosen" lands the senior-mindset thesis.

### External resources (optional)

A small `CardGrid` of `ExternalResource` cards if they add value beyond Lesson 2's (which already linked CI, trace viewer, best-practices). Candidates: Playwright **frame locators** doc (directly supports the checkout `frameLocator` mechanic), and Stripe **testing / test cards** doc (supports the `4242` card stance). Keep to ≤ 2 cards to avoid overlap with Lesson 2. Author's call to include; prefer the two named since they map to *this* lesson's new mechanics.

---

### Tooltip (`Term`) candidates

Be strategic — most core terms (`storageState`, `auto-waiting`, `trace viewer`, `flaky test`, `seam`, `composition bug`, `money-path filter`) were defined in Lessons 1–2 and should **not** be redefined. New or worth a light gloss in *this* lesson:
- **`frameLocator`** — Playwright's handle for locating elements inside an `<iframe>` (e.g. Stripe's hosted card fields).
- **multi-tenant guard** — the per-org scoping that returns 404 when a user reaches another org's resource (one-line gloss; ties to the invitation boundary assertion).
- **Stripe test mode** — Stripe's parallel sandbox with test API keys and test cards (`4242…`); no real money moves.
- **OAuth** — only if a redefine helps at the OAuth subsection; likely already known from Unit 8 — include only if natural.

---

## Scope

**Prerequisites to redefine concisely (one clause each, do not re-teach):**
- The money-path filter and "E2E off by default / year-one zero" (Lesson 1).
- `playwright.config.ts`, `webServer` against a production build, `auth.setup.ts` + `storageState`, the role-first locator ladder, auto-waiting `expect`, `test.extend` fixtures + the local `./fixtures` re-export, the `saas_e2e` DB + `pnpm db:e2e:reset`, the trace viewer (Lesson 2).
- The app's domain models, recalled in one clause where used: Better Auth sign-in `Result` discriminant + dual-key rate limit (Unit 8/14); Stripe hosted Checkout + success-page poll/`router.refresh()` race-closer + webhook-writes-entitlement (Unit 11, Ch063/064); invitation signed-token + four arrival shapes + seat grant + multi-tenant 404 guard (Unit 9, Ch058/059); invoice CRUD value loop (Unit 7).

**This lesson does NOT cover (route elsewhere):**
- Playwright configuration, fixtures, `storageState`, locators, the trace viewer mechanics — **Lesson 2** (use, don't teach).
- The money-path filter's derivation, cost-shape numbers, the four-step gate — **Lesson 1**.
- Webhook signature verification / replay / idempotency *in isolation* — **integration tests, Ch088 L6** (named as the cheaper home, not taught).
- Component-level interactive testing, form-validation branches, locale rendering — **Ch089** (named as cheaper homes).
- **Stripe Test Clocks** for full billing-cycle simulation — integration territory (Ch088); named once, not taught.
- Visual regression (Chromatic/Percy), accessibility audits at depth (axe-core), load testing (k6), mobile/native E2E, Page Object Model frameworks, sharding setup — out of scope (POM and sharding named as "premature until 30+ tests / 15 min" only).
- The Stripe-checkout project hardening (real harness, the four webhook tests, driving Checkout end to end as a graded build) — **Chapter 091**; this lesson leaves the checkout spec as the template Ch091 extends.

---

## Code conventions notes

- All spec code follows the course TS conventions (single quotes, 2-space indent, arrow-fn `const`, `import type` where type-only, named exports). Specs import `test`/`expect` from the local `./fixtures`, never `@playwright/test` directly — the Lesson-2 convention; keep it consistent.
- Per the Testing section of Code conventions: E2E is reserved for money paths (sign-in, Checkout, invitation accept, primary value loop) — this lesson *is* that list, so it aligns by construction. Flake gets a structural fix; `--retry` is forbidden as a fix (reinforce in the reviewer checklist).
- **Deliberate pedagogical divergences to flag for downstream agents:** specs are shown as focused excerpts (imports sometimes elided, one or two behaviors per `AnnotatedCode` rather than a full multi-assertion file) to keep each within `maxLines` ≤ 18 and the student's focus on the one new mechanic per path. This is intentional staging, not the production shape — note it so the writer doesn't pad specs to "complete" files. Real specs in Ch091 will be fuller.
- `4242 4242 4242 4242` is Stripe's documented universal test card — keep exactly; it's a load-bearing literal, not a placeholder.
