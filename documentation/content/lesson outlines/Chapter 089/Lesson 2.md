# The jsdom project and the render helper

- **Title (h1):** The jsdom project and the render helper
- **Sidebar label:** jsdom project and render helper

---

## Lesson framing

This is a **setup-and-wiring lesson** (45-55 min). Lesson 1 of this chapter installed the decision ("component tests are off by default; reach only on a named trigger"). This lesson answers the next senior question: a trigger fired — what does it cost to get the *first* component test running, and what is the smallest, durable surface that holds up for the rest of the chapter? The student writes no real component test here (that is lessons 3-4); they build the **rig** every later test rides on: a third Vitest project against jsdom, the pinned `@testing-library/*` set, one setup file, and a thin `render` helper.

Pedagogical conclusions for the lesson as a whole:

- **This is an extension lesson, not a greenfield one.** The student already has a two-project Vitest config (chapter 086: `unit` + `integration`, plus a commented-out `component` stub), a real-Postgres integration harness (chapter 088), MSW at `src/test/msw/server.ts` (chapter 088 L5), the `next/headers`/`next/navigation`/`next/cache` mock pattern in `setupFiles` (chapter 088 L3/L7), and the clock seam `src/test/clock.ts` (chapter 087 L3). The whole lesson is framed as *activating the third lane* and *reusing what's already wired* — almost nothing here is brand new infrastructure. Lead every subsection with "you already have X; here's the delta." This minimizes cognitive load and reinforces that the test tree is one coherent system, not three.
- **The reflexes are the payload, not the API.** The durable takeaways are four muscle-memory habits: (1) the `.dom.test.tsx` suffix routes a test to the jsdom lane; (2) tests call the project's `render`, never RTL's `render`; (3) `userEvent.setup()` once, `await` every interaction; (4) `findBy*`/`waitFor` for anything observable *after* an interaction. Everything else is plumbing. Foreground these four.
- **Two correctness traps carry real teaching weight and must not be glossed.** First: with the course's `globals: false`, RTL does **not** auto-clean up between tests — `afterEach(cleanup)` must be registered by hand, or rendered trees leak and queries return stale elements. This is *confirmed current* and is the single most common silent-failure in this setup. Second: `userEvent` v14 events are **async**; a forgotten `await` is the same silent-pass bug class the student met in chapter 087 L5, and Vitest 4 hardens it. Both deserve a dedicated beat with a "what goes wrong if you skip this" demonstration, not a watch-out footnote.
- **Connect the async-interaction trap to prior knowledge explicitly.** The student already internalized "never assert on a non-awaited promise" (chapter 087 L5). `await user.click(...)` is the *same rule* surfacing in a new place. Name the link; do not re-teach the event loop.
- **Decisions before syntax.** Three small decisions earn a sentence of "why" each: jsdom over happy-dom (Testing Library compatibility — fewer surprises on focus, `checkVisibility`, `ResizeObserver`); `userEvent` over `fireEvent` (a real interaction dispatches the full event sequence and flushes React, catching the `focus`-listener bug a single synthetic `click` misses); `screen` over destructured queries (reflects the live document, no refactor drift). Each is a "default before conditional" call with the conditional named once. Do not belabor; the student is here to wire, not deliberate.
- **The `render` helper is the seam, and that framing is the lesson's spine.** It exists so a provider added to `app/layout.tsx` in production updates in *one* place and every test inherits it. Teach it as "the test-side mirror of your root layout." This is the systems-design lens the course foregrounds: the helper is an architectural boundary, not a convenience function.
- **Show config in stages, matching the chapter 086 house style.** The continuity notes record that chapter 086 built `vitest.config.ts` in staged slices with `// inside test: { ... }` comments and assembled the full block once at the end. Mirror that exactly: show the `component` project entry in isolation, show the setup file built job-by-job, then one assembled view. Consistency across the testing unit matters.
- **Scope discipline is critical.** The moment the lesson reaches for a `getByRole` *priority* argument or explains *which* query to prefer, it has crossed into lesson 3. This lesson may *use* `screen.findByRole(...)` in a wiring example (to show `render` returns a working `user` and async queries resolve), but must not teach the ladder. Same for the catalog: name the components as future appliers, show no real assertions.

Target student: junior dev, can read TSX, has followed the testing unit this far (so they know Vitest projects, `vi.mock`, the MSW singleton, the clock seam, `Result`). They have likely never wired RTL against Vitest with `globals: false`, and they do not yet have the "render helper as a seam" instinct. Those two are what this lesson installs.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open on the concrete moment: a trigger from lesson 1 just fired (say, the `<SubscribeForm>`'s conditional seat-count branch — a complex-state component), and the student is about to write their first component test. Before any assertion, there is a rig to stand up. State the goal plainly: by the end the student has a working `component` Vitest project, the pinned Testing Library set installed, one setup file, and a `render` helper that pre-wires the app's providers and hands back a ready `userEvent` instance — everything the next two lessons assert *into*. Frame it as low-drama: most of the pieces (MSW, the Next mocks, the clock) already exist from chapters 087-088; this lesson is mostly *connecting* them to a new jsdom lane and adding the two RTL-specific pieces (the project + the helper). Warm, terse, no celebration.

`Term` candidates: **jsdom** (in-browser-less, in-memory DOM implementation Node uses so component code can render and be queried without a real browser); **RTL** (React Testing Library — the render-and-query library, define on first prose use even though lesson 1 introduced it, since lessons are independently entered).

### The third Vitest project

Start from what exists. The student has `unit` (node, `src/**/*.test.ts`) and `integration` (node, real DB, `src/**/*.int.test.ts`) projects, plus a commented-out `component` stub left in chapter 086. Activate the third lane.

Teach the project entry and the *why* of each field:
- `name: 'component'` — names the slice; `vitest --project component` runs only it.
- `environment: 'jsdom'` — this lane gets a DOM; the other two stay node-fast. This is the entire reason the project is separate: jsdom boot is the cost (~100-300ms/test, the figure planted in chapter 086) you keep out of the unit/integration lanes.
- `include: ['src/**/*.dom.test.tsx']` — the `.dom.test.tsx` suffix is the discriminator. The student now knows the full family: `*.test.ts` → unit, `*.int.test.ts` → integration, `*.dom.test.tsx` → component. The suffix is how a file picks its lane and its environment.
- `setupFiles: ['./vitest.setup.dom.ts']` — this lane's own setup, built in the next section.

**Component note:** show the project entry with `Code` (a single fenced `ts` block), in isolation, with a `// inside test.projects: [ ... ]` comment — matching the chapter-086 staged-config house style. Do *not* dump the whole `vitest.config.ts`; the student has it, this is a delta. Highlight the `'jsdom'` and `'src/**/*.dom.test.tsx'` strings (Expressive Code `"..."` marks).

State the inner-loop command here as the reflex: `vitest --project component` in watch mode runs just this slice on save; bare `vitest` runs all three. Mirrors the per-project watch commands the student already uses (`--project unit`, `--project integration`).

**Downstream-agent note (canonical alignment):** chapter 086 committed the stubbed `component` project with an `.test.tsx` glob; this chapter pins **`.dom.test.tsx`** (the chapter 089 outline's discriminator). Use `.dom.test.tsx` everywhere and write one sentence acknowledging the suffix is the explicit jsdom-lane marker (cleaner than a bare `.test.tsx`, which reads ambiguously next to `.test.ts`). This is a deliberate refinement of the 086 stub, not a contradiction to "fix" back.

**Diagram — the three lanes (HTML + CSS, in a `<Figure>`).** A compact horizontal three-column strip, one column per Vitest project, each showing: project name, environment badge (`node` / `node + Postgres` / `jsdom`), file-suffix glob, and the per-test cost figure from chapter 086 (unit ~5ms, integration 20-80ms, component 100-300ms). Reuse the chapter-086 band colors (unit = blue, integration = teal, component = violet) for cross-unit consistency — the continuity notes mandate these stay consistent. Pedagogical goal: make visceral that the `component` lane is the third, slowest, deliberately-isolated slice, and that the suffix is what routes a file into it. Horizontal, capped height; a simple orientation aid, not a system graph.

### The pinned Testing Library set

The install line and *why each package is on it*. The student installs four dev-deps:

`pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`

Walk the set (each one sentence — this is a pin list, not a deep dive):
- **`@testing-library/react` v16+** — the render-and-query library. v16 is the React 19-aware line (it dropped the legacy React 18 codepath); pairing v15 with React 19 is a known peer-dependency mismatch — jump to v16+.
- **`@testing-library/user-event` v14** — simulates *real* user interactions (a click is `pointerdown` → `mousedown` → `focus` → `pointerup` → `mouseup` → `click`, then waits for React to flush), not single synthetic events.
- **`@testing-library/jest-dom` v6** — DOM-aware `expect` matchers (`toBeInTheDocument`, `toHaveAccessibleName`, `toBeDisabled`, …). The `/vitest` entrypoint registers them against Vitest's `expect`.
- **`jsdom`** — the DOM environment the `component` project's `environment: 'jsdom'` selects.

**The one decision to justify: jsdom over happy-dom.** One short paragraph. happy-dom is the faster alternative and is named once. The course pins jsdom for **Testing Library compatibility** — fewer surprises on focus semantics, `Element.checkVisibility`, `ResizeObserver`, and the accessibility-tree details the query ladder (lesson 3) depends on. Speed is not the bottleneck at this test count; correctness of the DOM the queries read is. Default-before-conditional, conditional named once.

**Component:** `Code` for the install line. The four-package walk reads cleanest as a short prose list (or a `CardGrid` of four tiny cards if a visual grouping helps — author's call; prose list is fine and lower-ceremony). No code beyond the install line — these are package descriptions, not API.

`Term` candidate: **peer dependency** (a package version your dependency declares it needs alongside it; a mismatch is the v15-with-React-19 trap) — only if not already a familiar term to this student; use judgement.

### The one setup file for the jsdom lane

`vitest.setup.dom.ts` — three or four small jobs, each with a reason. This is the lesson's first correctness-critical beat. Build it job-by-job (staged, like the project entry), then show the assembled file once.

The jobs, in order:

1. **Register the matchers.** `import '@testing-library/jest-dom/vitest'` — side-effect import that wires `toBeInTheDocument` and friends into `expect`. The `/vitest` entrypoint (not the bare `@testing-library/jest-dom`) is the Vitest-specific one.
2. **Clean up after every test — by hand.** `import { afterEach } from 'vitest'; import { cleanup } from '@testing-library/react'; afterEach(cleanup);`. **This is the trap that earns a full beat.** RTL auto-cleans up only when the runner exposes a global `afterEach` — and the course runs `globals: false` (chapter 086, confirmed), so the global isn't there and **auto-cleanup does not fire**. Skip this line and every rendered tree stays mounted across tests; queries then match elements from a previous test's render and you get baffling "found multiple elements" or stale-state failures. Demonstrate the failure mode, not just the rule (see component note).
3. **Polyfill the jsdom gaps the codebase actually touches.** jsdom omits a few browser APIs that real components reach for — most commonly `matchMedia`, `ResizeObserver`, and `IntersectionObserver`. A component importing one of these throws on first render in jsdom. The fix is the **smallest stub that satisfies the contract**, not a real implementation (e.g. `ResizeObserver` as a class with no-op `observe`/`unobserve`/`disconnect`; `matchMedia` returning an object with `matches: false` and no-op listeners). Add a stub only when a component needs it — do not pre-stub the world.
4. **(Reuse, not new) wire the shared lifecycle this lane needs.** Point out — without rebuilding — that the MSW server and the Next mocks the integration lane already uses are reused here (covered in the next section). Keep this as a one-line forward pointer so section ordering reads cleanly.

**Component — `AnnotatedCode` for the assembled setup file.** Write `vitest.setup.dom.ts` once as the `code` prop; step through it: step 1 (matchers import, color blue), step 2 (`afterEach(cleanup)`, color **orange** to flag it as the load-bearing trap), step 3 (the polyfills, color blue). Keep each step's prose to the "what + why it breaks without it" — especially step 2. `AnnotatedCode` is the right component because the file is short but each line does a distinct job the student must understand individually.

**Exercise — `Sequence` (ordering drill).** Give the student a scrambled set of setup-file/lifecycle responsibilities and have them order what runs when, to cement the cleanup-per-test mental model. Steps to order (shuffled): "test file matched by `*.dom.test.tsx`" → "jsdom environment provided for the file" → "setup file runs (matchers registered, polyfills installed)" → "a test renders a component" → "`afterEach(cleanup)` unmounts it" → "next test starts against a clean DOM". Goal: the student sees cleanup as the boundary between tests and internalizes why its absence leaks. Low-cost, high-signal, fits a setup lesson better than a coding sandbox (RTL can't run in the in-page React sandbox — see scope note).

### Reusing the MSW server and the Next mocks

The "you already have this" section. The student built the MSW singleton (`src/test/msw/server.ts`) and the `next/headers`/`next/navigation`/`next/cache` mocks in chapters 087-088. The jsdom lane reuses both — no new boilerplate.

- **MSW.** The same `server` is imported into `vitest.setup.dom.ts` and given the same three-hook lifecycle the integration setup uses: `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`. Why a *client* component would hit the wire at all in this stack is rare but real: a `useSWR`-style fetch in an effect, or a client component firing its own `fetch`. When it does, the same boundary mocks answer it. `onUnhandledRequest: 'error'` carries over as non-negotiable (chapter 088 L5 rule).
- **`next/navigation`.** A client component reading `useRouter`, `usePathname`, or `useSearchParams` crashes in jsdom — there's no Next router. Register the mock in the setup file: `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/invoices', useSearchParams: () => new URLSearchParams() }))`. Per-test overrides via `vi.mocked(useRouter).mockReturnValue(...)`. This is the *same shape* as the `auth.api.getSession` mock the student wired in chapter 088 L3 — named once in `setupFiles`, overridden per-test. Call that parallel out explicitly.
- **`next/cache`.** The `revalidatePath`/`revalidateTag`/`updateTag` `vi.fn()` mocks (chapter 088 L7) are already a `setupFiles` concern; a client component invoking a Server Action that calls them inherits the mock. One sentence; no rebuild.
- **Reset discipline carries over.** `afterEach(() => vi.resetAllMocks())` (the chapter 088 L8 structural-flake fix) applies to this lane's mocks too — setup-file mocks are not auto-reset by Vitest. One line, link to the flake lesson.

**Component — `CodeVariants` for the `next/navigation` mock-and-override pair.** Two tabs: "Default mock (in setup file)" showing the `vi.mock('next/navigation', …)` registration, and "Per-test override" showing `vi.mocked(useRouter).mockReturnValue({ push, refresh })` inside an `it`. Prose on each tab ties it to the chapter 088 auth-mock shape. `CodeVariants` is right here because it's the same module shown in its two roles (file-level default vs per-test exception) — the A/B framing is the teaching point.

`Term` candidate: **MSW** (Mock Service Worker — intercepts outgoing HTTP at the network boundary so tests hit your real client code but a stubbed server) — re-define concisely since the student met it in chapter 088 but lessons are independently entered.

### The render helper: a test-side mirror of your root layout

The centerpiece. `src/test/render.tsx` exports a `render(ui, options?)` that wraps RTL's `render`, pre-applies the providers `app/layout.tsx` wraps the app in, and returns `{ ...rtlReturn, user }`. **Tests call this wrapper, never RTL's `render` directly.**

Teach it as a seam (the lesson's spine):
- **Why it exists.** Production wraps the tree in providers — theme, the `next-intl` locale provider (Unit 17), the `Toaster` portal target (Unit 13). A component under test needs those same providers or it throws (no locale context) or renders wrong (no theme). Without a helper, every test re-types the provider stack; when a provider is added in production, every test file has to change. The helper centralizes it: **add a provider once, every test inherits it.** This is the test-side mirror of the root layout — same framing the student should carry.
- **The `user` convenience.** The helper calls `userEvent.setup()` once (no options — the default is correct for this suite) and returns the instance as `user` on its return object, so a test does `const { user } = render(<X />)` and immediately `await user.click(...)` — no per-test `setup()` boilerplate, and the per-test seam stays visible (one `user` per render call). **Do not pass `delay: null`** — the user-event docs (current as of 2026) discourage it and warn it causes unexpected behaviour, especially with fake timers; the documented fake-timer escape hatch is `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, named once only for the rare component test that drives a timer (most don't). Default to bare `userEvent.setup()`.
- **The i18n thread.** The helper accepts `{ locale = 'en-US', messages = enMessages }` and wires `<NextIntlClientProvider locale={locale} messages={messages}>` so localized-text queries work without each test recreating provider boilerplate. Switching locale for one test is a single option flip — `render(<X />, { locale: 'es-ES', messages: esMessages })`. This is what makes lesson 4's locale-aware checkout-summary tests cheap.

**Component — `AnnotatedCode` for `render.tsx`.** Write the helper once (≤18 lines: imports, an `AllProviders` wrapper component taking `{ locale, messages, children }`, the exported `render` calling `rtlRender(ui, { wrapper })` and returning `{ ...result, user: userEvent.setup() }`). Step through: the providers wrapper (blue), the `userEvent.setup()` + return-shape merge (green — this is the "ready user" payload), the `{ locale, messages }` options threading the provider (blue). `AnnotatedCode` is right because this one file is the lesson's most important artifact and each part (wrapper, user, options) is a distinct idea the student must hold separately.

**What the helper does NOT own — state this explicitly as a bounded contract.** A short list, because the most common beginner mistake is overloading this helper:
- **Test data** → factories (`src/test/factories/`, chapter 087 L2); the helper never builds rows.
- **Auth state** → components reading `auth()` are usually Server Components (not an RTL surface, lesson 1); client components receive auth as a *prop*, and the test passes the prop. The helper does not stub a session.
- **Network** → MSW (the previous section); the helper does not mock `fetch`.
- The helper is **exactly providers + `user`**. A growing options list is the god-object smell (same instinct as the `signedInAs` "exports exactly two things" rule from chapter 088 L3 — call the parallel).

### Driving the component: userEvent and async queries

The interaction reflexes. This section is *just enough* to make the rig usable in a wiring example; it does not teach the query ladder (lesson 3).

**`userEvent.setup()` discipline and the await trap.** The student gets `user` from `render`. The rule: `await` every interaction — `await user.click(button)`, `await user.type(input, 'text')`, `await user.keyboard('{Enter}')`. **This is the second correctness beat.** v14 events are *async*: they resolve only after their downstream effects (state updates, microtasks, React transitions) settle. A forgotten `await` returns a dangling promise — the assertion runs before the UI updates, and the test passes against a stale DOM. This is *the same silent-pass bug class* the student met in chapter 087 L5 ("never assert on a non-awaited promise"); name the link explicitly. Vitest 4 hardens unawaited-assertion handling — call it the safety net, not the fix; the fix is the habit.

**`userEvent` over `fireEvent` — one decision, named once.** `fireEvent.click(button)` dispatches a *single* synthetic event; `user.click(button)` dispatches the full real sequence (`pointerdown`, `mousedown`, `focus`, `pointerup`, `mouseup`, `click`) and waits for React to flush. The difference catches the real bug where a component fires validation on `focus` (not `click`) — `fireEvent.click` would never trip it. Default to `userEvent`; `fireEvent` is the carve-out for isolating one specific synthetic event with no `userEvent` equivalent (e.g. a `scroll` listener under test) — name it, don't habit it.

**Async queries — `findBy` and `waitFor`.** When an interaction triggers async work (an effect-driven fetch an MSW handler resolves, a transition), the result isn't in the DOM on the next synchronous line. `findBy*` returns a promise that retries until the element appears or the default ~1000ms timeout elapses: `await screen.findByRole('alert')`. It's the default reach for anything observable *after* an interaction. `waitFor` is the lower-level escape hatch for *non-DOM* observations (a mock got called: `await waitFor(() => expect(mock).toHaveBeenCalled())`) — name it, prefer `findBy` for DOM. (Do **not** enumerate the query ladder or argue role-vs-text here — that's lesson 3. Use `findByRole` in the example because it's the wiring shape, not because the lesson is teaching query priority.)

**`screen` over destructured queries — one decision.** Prefer `screen.getByRole(...)` over destructuring `getByRole` from `render`'s return: `screen` reflects the live global document, so the test survives a refactor that changes what `render` returns, and there's no destructuring drift. Destructured/scoped queries earn their place only when a test mounts two separate trees — rare. Default to `screen`.

**Component — a single small `Code` (tsx) wiring example, ~8 lines, clearly labeled "the rig, end to end (not a real test yet)."** Show: `const { user } = render(<SomeClientComponent />)`, `await user.click(screen.getByRole('button', { name: /submit/i }))`, `expect(await screen.findByRole('status')).toBeInTheDocument()`. The point is to prove the rig works — `render` gives a `user`, `await user.click` drives it, `findBy` waits, a `jest-dom` matcher asserts. Add a one-line caption: the *real* assertions and the query-ladder reasoning are lesson 3; this is plumbing verification. Keep it tiny so imports aren't the focus.

**Exercise — `Dropdowns` (fenced code with `___` blanks).** A short `vitest.setup.dom.ts` + a tiny test snippet with blanks the student fills from a `<select>`: the environment value (`'jsdom'`), the cleanup hook (`afterEach` / `cleanup`), the await keyword before `user.click`, and the async query (`findByRole` vs `getByRole`) after the interaction. Goal: drill the four reflexes (suffix→lane is covered by the Sequence drill; this one drills env, cleanup, await, findBy) in the exact spots they're written. `Dropdowns` over a coding sandbox because RTL cannot execute in the in-page React sandbox (scope note), and fill-in-the-blank tests the precise decision points without needing a runtime.

### When the suite grows: the watch loop and the trigger

Short closer that ties the rig back to lesson 1's discipline. `vitest --project component` in watch mode re-runs on save; a healthy end-of-chapter DOM suite is ~15-30 tests and runs in 3-5 seconds. If the slice grows past ~100 tests, that's not a tooling problem — it's a signal the team over-reached past the trigger (lesson 1). The rig makes writing a component test *cheap*; the trigger is what keeps the *count* honest. One paragraph; reinforces that setup ease is not a license to write tests off-trigger.

**Why not Storybook + play — named once, set down.** Storybook's `play` function with `@storybook/test` is a parallel interactive-component test surface. The course doesn't pin it for two reasons: (1) Storybook carries its own config tax and a separate runner story; (2) the same RTL queries and `user-event` calls already run inside Vitest with zero new runtime. One or two sentences for awareness; the course writes against Vitest. Do not teach Storybook.

Optional **External resources** tail (`ExternalResource`, at most two cards): the Testing Library "Setup" / React Testing Library docs page, and the `@testing-library/user-event` v14 intro. Only if they add value beyond the lesson; keep the tail minimal.

---

## Scope

**This lesson covers:** activating the third (`component`, jsdom) Vitest project and the `.dom.test.tsx` suffix; the pinned `@testing-library/*` + `jsdom` install set and the jsdom-over-happy-dom call; the `vitest.setup.dom.ts` setup file (jest-dom matchers via `/vitest`, the hand-registered `afterEach(cleanup)`, the minimal jsdom polyfills); reuse of the existing MSW server and `next/navigation`/`next/headers`/`next/cache` mocks in this lane; the `src/test/render.tsx` helper (providers + returned `user`, the i18n option, what it deliberately does not own); and the interaction reflexes needed to make the rig usable — `userEvent.setup()` + `await`, `userEvent` over `fireEvent`, `findBy`/`waitFor` for post-interaction observables, `screen` over destructured queries.

**This lesson does NOT cover (reserve for the named lesson):**

- **The query priority ladder** (`getByRole` with name → label → placeholder → text → … → `getByTestId`), the `getBy`/`queryBy`/`findBy` *selection* rationale, the full `jest-dom` matcher catalog, and what "behavior" means at the DOM layer → **lesson 3 of chapter 089.** This lesson *uses* `screen.findByRole(...)`/`getByRole(...)` in wiring examples but must not teach *which* query to prefer or why role-first — only "async work → `findBy`."
- **The concrete component catalog** (cookie consent, subscribe form, date-range picker, data table, checkout summary) walked test-by-test with assertions, and the **Server Action mock-import pattern** (`vi.mock('@/server/actions/...')`) → **lesson 4 of chapter 089.** Name `<SubscribeForm>` etc. only as the future appliers of this rig; show no real assertions and no action mocking.
- **The decision of *whether* to write a component test** — triggers, anti-triggers, the five-second gate, year-one-zero → **lesson 1 of chapter 089** (already taught; reference as "a trigger fired," do not re-teach).
- **The end-of-chapter quiz** → lesson 5 of chapter 089.
- **React Server Component testing** → out of scope entirely (covered at the seam in chapter 088, on money paths in E2E chapter 090). The unit under test is always a client or pure presentational component (chapter-wide thread from lesson 1).
- **E2E / Playwright** → chapter 090.
- **Visual-regression tooling** (Chromatic, Percy) → out of scope; name once at most.
- **Storybook play functions** → named once for awareness, not pinned, not taught.

**Prerequisites to redefine concisely (assume taught, one line/clause each):** the two existing Vitest projects and `globals: false` (chapter 086); the `.int.test.ts` suffix and per-project `--project` watch commands (chapter 086/088); the MSW singleton `src/test/msw/server.ts` and its `listen`/`resetHandlers`/`close` lifecycle (chapter 088 L5); the `vi.mock(..., () => ({...}))`-in-`setupFiles` + per-test `vi.mocked(...).mockReturnValue(...)` pattern, modeled on the `auth.api.getSession` mock (chapter 088 L3); `next/cache` spies and `afterEach(() => vi.resetAllMocks())` (chapter 088 L7/L8); the clock seam `src/test/clock.ts` / `FROZEN` (chapter 087 L3, available to date-dependent components in lesson 4); factories at `src/test/factories/` (chapter 087 L2); the "never assert on a non-awaited promise" rule (chapter 087 L5); `useActionState` (React 19, not `useFormState`); the honeycomb + "trigger before tool" framing (chapter 086 / lesson 1). Redefine in a clause, not a paragraph.

---

## Code conventions alignment

- `documentation/code standards/Code conventions.md` Testing section (line 477) names three Vitest projects `unit`/`integration`/`component` (jsdom) — this lesson is the one that *activates* the `component` project. Honor the three-project model.
- **Deliberate divergence from Code conventions on file location:** Code conventions (line 478) says "Integration tests live in `tests/integration/`." The testing unit overrode this (chapter 088 continuity): integration tests **colocate** under `src/**/*.int.test.ts`, governed by the chapter-086 glob. Component tests follow the same colocation rule — `src/components/checkout/SubscribeForm.dom.test.tsx` next to the component — **not** a separate `tests/` tree. Use colocation; this supersedes the stale Code conventions note (a curator decision already recorded upstream).
- **Deliberate divergence from the chapter outline / 086 stub on the glob:** the `component` project glob is **`src/**/*.dom.test.tsx`** (chapter 089 outline), not the `.test.tsx` the 086 stub committed. The `.dom.` infix is the explicit jsdom-lane marker. Flag this once so downstream agents don't "fix" it back to `.test.tsx`.
- **Config house style:** show the `component` project entry and the setup file in **staged isolation** with `// inside ...` comments, then one assembled view — matching chapter 086 L1/L3's staged-config treatment. Do not reprint the full `vitest.config.ts`.
- **`globals: false` is load-bearing here:** because the course pins `globals: false` (chapter 086, Code conventions line 477), RTL's auto-cleanup does **not** fire and `afterEach(cleanup)` must be hand-registered. Do not show a `globals: true` shortcut; it would contradict the established config and hide the very trap the lesson teaches.
- **`useActionState`, not `useFormState`** in any prose mention (React 19, the pinned version; chapter 089 L1 already corrected this) — only relevant if a client-component example references the hook; keep consistent.
- Any TSX shown is React 19 + the course's conventions; keep wiring snippets tiny so imports aren't the focus (the rig, not a runnable lesson file).

---

## Notes for downstream agents

- This is a 45-55 minute setup-and-wiring lesson. The payload is four reflexes (suffix→lane, call the project `render`, `setup()`-once-and-`await`, `findBy` after interaction) and two correctness traps (`afterEach(cleanup)` under `globals: false`; the unawaited-`userEvent` silent pass). Keep those foregrounded; everything else is plumbing.
- **Do not drift into lesson 3.** Using `screen.findByRole(...)` to show the rig works is fine; teaching *which* query to prefer or why role-first is lesson 3. If a section starts ranking queries, cut it.
- **Lean on "you already have this."** MSW, the Next mocks, the clock seam, factories, the staged-config style — all exist from chapters 086-088. Frame the lesson as connecting them to a new lane plus two new pieces (the project, the helper). This is the cognitive-load win.
- **Exercise budget (calibrated to a setup lesson):** one `Sequence` (lifecycle ordering, after the setup-file section) and one `Dropdowns` (fill the four reflexes, after the interaction section). Both are runtime-free on purpose — **RTL cannot execute in the in-page React sandbox** (the `ReactCoding` iframe loads only the React family, no third-party npm), so there is no live RTL coding exercise in this lesson; the Testing Playground (`ReactTestingCallout`) is a lesson-3 tool for the query ladder, not needed here. Do not add a coding sandbox that can't run.
- **Diagrams:** one orientation strip (the three Vitest lanes, reusing chapter-086 band colors). No DiagramSequence needed — the `Sequence` exercise carries the lifecycle-ordering job interactively.
- **Components:** `AnnotatedCode` for the two artifacts that deserve line-by-line attention (the setup file, the `render` helper); `CodeVariants` for the `next/navigation` default-vs-override pair; `Code` for the install line, the project entry, and the tiny end-to-end wiring snippet. Color `afterEach(cleanup)` orange in its `AnnotatedCode` step to flag it as the trap.
- The `render`-helper-as-seam framing is the systems-design spine — keep it explicit. The "what the helper does NOT own" bounded-contract list is the highest-value guardrail in the lesson; don't cut it.
