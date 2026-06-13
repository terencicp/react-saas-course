# Chapter 089 — Component tests, off by default

## Lesson 1 — When component tests earn their weight

**Taught:** Component tests are off by default for a Next.js 16 SaaS; they earn their weight only against three named triggers (shared component library, complex stateful interactive component, critical UX path) plus an implicit fourth (accessibility regression on a high-traffic surface), and the experienced move outside those triggers is to delete the test.

**Terminology:**
- RTL = React Testing Library; defined via `<Term>` on first use.
- jsdom = in-memory DOM implementation; defined via `<Term>` on first use.
- "off by default" / "trigger before tool" — the canonical framing for this chapter; every downstream lesson presupposes it.
- "coverage theatre" — a test with no `expect` that only asserts the component didn't throw; named with code example `it('renders', () => { render(<Card />); })`.
- "mocking too deep" — a component test that asserts on a Server Action's database effect, reaching past its own layer.
- "the five-second gate" — the ordered five-question disqualifier checklist (Server Component? → seam covered? → one-off presentational? → E2E money path? → trigger met?).
- "honeycomb" — referenced by name from ch086; not re-taught.

**Debts:**
- Lesson 2 owns: jsdom + RTL setup, the third Vitest `component` project, `render` helper, `userEvent.setup()` configuration, the `@testing-library/*` pin set.
- Lesson 3 owns: the query priority ladder (`getByRole`/`getByLabelText`/…/`getByTestId`), `getBy`/`queryBy`/`findBy` split, jest-dom matchers, what "behavior" means at the DOM layer.
- Lesson 4 owns: the concrete component catalog (cookie consent, subscribe form, date-range picker, data table, checkout summary) with assertions and the Server Action mock-import pattern.
- Ch090 owns: E2E money-path tests (Playwright); referenced as the parallel "off by default" band.

**Patterns and best practices:**
- Server Components are never an RTL surface; their coverage lives at the seam (ch088) and on money paths in E2E (ch090).
- The component-vs-seam boundary: component tests own observable client state (render branches, focus, accessible names, `useActionState` error messages, optimistic reconciliation); integration tests own Server Action effects (row written, tenant filter, audit log, rate limiter).
- Component test asserting on a Server Action's DB effect = mocking too deep; the two layers compose, not overlap.
- Anti-triggers for deletion: purely presentational (no state, no branching), Server Component, covered by seam test, on E2E money path, framework-owned surface (`<Link>`, `<Image>`), library internals.
- Year-one zero RTL tests is a defensible senior stance, not a debt.

**Misc:**
- `useActionState` used (not `useFormState`); chapter outline had the old name — this is an intentional correction for React 19. Downstream lessons must use `useActionState`.
- The `component` Vitest project is referenced by name as "the slice lesson 2 wires" but not configured here.
- Cost shape planted for reference: unit ~5 ms, integration 20–80 ms, component (jsdom) 100–300 ms, E2E seconds; the count governed by the trigger.
- The chapter outline's "watch-outs" for snapshot tests, visual regression, and Storybook play functions were not taught here; they belong in later lessons per scope. Visual regression is out of scope for the chapter entirely.

---

## Lesson 3 — The query ladder is the accessibility audit

**Taught:** The Testing Library query priority ladder (role → labelText → text → placeholderText → displayValue → altText → title → testId), the `getBy`/`queryBy`/`findBy` trichotomy (here-now / absent / async), and the principle that behavior is what a user observes — specializing ch086 L4's "test behavior not implementation" to the DOM layer.

**Cut:** `screen.debug()`, `screen.logTestingPlaygroundURL()`, and `logRoles(container)` as debug aids (chapter outline listed them; lesson omits them — mention as "remove from committed code" elsewhere if surfaced). Counter-example test smells named in the outline (`toMatchSnapshot()` on full tree, Enzyme-era prop peeks, render-prop implementation peeks) were not built out as a dedicated block; the brittle/durable CodeVariants covers the essence. Chapter outline listed per-component file layout and a reviewer checklist for component test PRs — those belong to L4. Chapter outline listed `*AllBy` variants with length assertions as a full bullet; lesson covers them briefly inside the `within` section.

**Debts:**
- Lesson 4 owns: concrete component catalog (cookie consent, subscribe form, date-range picker, data table, checkout summary) and the Server Action mock-import pattern (`vi.mock('@/server/actions/...')`).
- When showing a form test, asserting `expect(mockOnSubmit).toHaveBeenCalledWith(...)` is named a smell; L4 must demonstrate the correct alternative (assert on what the UI renders after the action resolves, not on mock call args).

**Terminology:**
- `accessibility tree` — semantic tree assistive tech navigates (roles, names, states), derived from but distinct from the DOM; defined via `<Term>`.
- `accessible name` — computed label a screen reader announces (from text content, `aria-label`, `aria-labelledby`, or associated `<label>`); defined via `<Term>`.
- `role` — semantic category of an element in the accessibility tree (`button`, `link`, `textbox`, `dialog`, `alert`, `status`, `heading`, `combobox`, `checkbox`, `radio`, `region`, `listitem`, `row`, `grid`); defined via `<Term>`.
- `live region` — element (`role="status"` or `role="alert"`) whose content changes are announced to a screen reader automatically; defined via `<Term>`.
- `portal` — React rendering a subtree into a different DOM node (e.g. toast root at `document.body`); defined via `<Term>` in the testId carve-out section.
- `getByRole(role, { name })` — top ladder rung; `name` accepts exact string, regex (default), or predicate.
- `getByLabelText` — top rung for labelled form inputs; failure = screen-reader user can't identify the field.
- `getBy*` / `queryBy*` / `findBy*` — three orthogonal intentions; `queryBy` is the only correct query for negative assertions; `findBy` returns a promise and retries ~1000 ms.
- `waitFor` — non-DOM async escape hatch; `findBy` preferred for DOM.
- `within(element).getByRole(...)` — scopes the full ladder to a subtree; the clean answer to "the delete button in this row."
- Regex-by-default for `name` option / exact string for load-bearing copy — senior-judgment rule for name matching.
- "The failing query is a bug report on your component" — the lesson's primary mental model; re-use in L4 without re-deriving.
- "The query is the audit" — one-line thesis; a role-first test simultaneously proves keyboard reachability and correct announcement.
- "User sees" reflex — phrase every assertion as a sentence about the user before writing the query; the query falls out of that sentence.

**Patterns and best practices:**
- Prefer the highest ladder rung the element supports; dropping a rung requires a justification you can say out loud.
- `getByTestId` legitimate in three cases only: element with no semantic role (portal mount node, layout wrapper), third-party widget the team doesn't own, two semantically-identical regions during a transition where `within` can't disambiguate.
- `queryBy` for negative assertions; `getBy` for negative assertions throws before the assertion runs, giving a misleading failure.
- Matchers that read as user observations (prefer): `toBeVisible`, `toHaveAccessibleName`, `toHaveAccessibleDescription`, `toBeDisabled`/`toBeEnabled`, `toBeChecked`, `toHaveValue`, `toHaveFocus`, `toHaveTextContent`. Matchers that read as DOM detail (avoid): `toHaveClass`, `toHaveAttribute`.
- When a role query can't be made to pass, fix the component to expose semantic structure (add `role`, accessible name, `<label>`) — don't drop down to testId.
- `<a>` without `href` has no role; `<div role="button">` needs `tabIndex={0}` + key handler to be truly reachable — RTL finds it but AT won't operate it without tabindex/handler.
- `<button>` → implicit `button`; `<input type="checkbox">` → `checkbox`; `<a href>` → `link` — implicit roles; don't write `role=` on real semantic elements.
- Address a specific item by its content (`getByRole('button', { name: /delete invoice INV-001/i })`) rather than indexing into `getAllBy*` arrays — durable, reads like intent.

**Misc:**
- The `status` and `alert` live-region roles are asserted in examples; L4 components that show toasts or banners should use `role="status"` / `role="alert"` so assertions can use the top rung.
- Live-region accessible-name rule taught: `status`, `alert`, `region`, and `dialog` receive their accessible name *only* from an explicit `aria-label` or `aria-labelledby` — never from their text content; `button`, `link`, and `heading` take their name from content. When `findByRole('status', { name: ... })` can't match, the fix is adding a label to the live region element, not relying on visible text.
- The lesson uses a generic login form and a Confirm button as examples; L4 must not be written as if the lesson's examples are real app components.
- Testing Playground (`screen.logTestingPlaygroundURL()` / embeds of testing-playground.com) is introduced via two `ReactTestingCallout` instances; L4 can reference "the playground" without re-introducing the tool.
- `toBeInTheDocument` from jest-dom is used throughout; it was registered in L2's setup file — downstream lessons do not need to re-import it.
- The boundary "the action's body is the seam test's job" (ch088 L7) is named but not re-taught; L4 must reinforce it when showing Server Action mocks.

---

## Lesson 4 — The catalog: five components that earn the test

**Taught:** Applied the trigger + ladder + rig to five named app components (cookie consent gate, multi-step subscribe form, date-range picker, data table with selection, checkout summary line), demonstrating for each: which trigger is met, which behaviors to assert, and what to leave to the seam (ch088 L7) or E2E (ch090); also taught the Server Action mock-import pattern and the compose-not-overlap boundary discipline; paid L3's `toHaveBeenCalledWith` smell debt.

**Cut:** Catalog component 6 (command palette / combobox) from the chapter outline — conditional on whether the course app ships one; omitted as the app does not. Per-component file layout (`src/components/.../<Name>.dom.test.tsx` placement) named in the outline but not explicitly taught here; quiz owns it.

**Debts:**
- Ch090 owns: E2E coverage of Stripe Checkout redirect (named as the right-side boundary for subscribe form and checkout summary) and PostHog gate firing after consent (named as the right-side boundary for cookie consent gate).
- Ch087 L owns: tax computation as a pure unit test (named as the lower boundary for checkout summary).

**Terminology:**
- `vi.mock('@/server/actions/...')` at file top + `vi.mocked(...).mockResolvedValue(Result.ok/err)` per test — the canonical Server Action mock-import pattern; every form-touching component test uses this exact shape.
- `Result.ok(data)` / `Result.err({ code })` — the action contract the component form tests are written against; mocked return determines which branch the form renders.
- "compose, not overlap" — the component test owns the form's reaction to the action's `Result` contract; the seam test owns the action's body; neither re-tests the other.
- "drive a branch" — a mocked action's sole job in a component test; assert the branch's visible result, not that the mock was called.
- "The failing query is a bug report on your component" — carried from L3, applied throughout the catalog (e.g. `role="dialog"` on the consent banner, accessible name on the submit button).
- `within(row).getByRole(...)` — per-row scoping used in data table tests; from L3, applied concretely here.
- `vi.setSystemTime(new Date('2026-05-14'))` — clock seam for deterministic date-picker tests; "the clock seam" terminology from ch087.
- `toHaveFocus()` — used for keyboard navigation and focus-return-after-close on the date picker; from L3's matcher list, applied here.
- Anti-snapshot stance: `toMatchSnapshot()` on presentational components = churn without signal; write explicit assertions on labels and amounts instead.
- Reviewer checklist (five one-second reflexes): trigger named in PR → role-first queries → user-observable assertions → action mocked at import with real seam test existing → passes `vitest --project component --shuffle`.

**Patterns and best practices:**
- Assert `setConsent` was called (consent gate) because calling it *is* the component's job and there is no rendered proof — the narrow exception to "assert the user-visible result, not the mock call."
- Reset consent state (`document.cookie` or mocked store) in `afterEach` — state leaks across tests in the same file cause flaky banners.
- Assert the user-observable consequence of action resolution (`findByRole('status', { name: /subscription active/i })` or `findByRole('alert', { name: /card was declined/i })`), never `toHaveBeenCalledWith` on the action mock.
- For absence assertions use `queryByRole`; `getByRole` for absence throws before the assertion runs.
- `within(row).getByRole('checkbox')` for per-row targeting in a data table; do not index into `getAllBy*` arrays by position.
- Dynamic accessible names (e.g. "Delete 2 invoices" computed from selection count) should be asserted via `getByRole('dialog', { name: /delete 2 invoices/i })` — proves the name is wired to live state.
- Prop-variant matrix for pure presentational components: one `describe`, one `it` per content variant; no interactions, no mocks.
- Tax math lives in `/lib` unit tests (ch087); summary component test asserts only that the right value *renders*, not how it was computed.

**Misc:**
- "Year-one zero" re-stated: the catalog is the shape of the reasoning, not a quota; a real first-year codebase may have one or two tests, or none.
- Server Components (page-level), Server Actions themselves, `<Card>`/`<Section>`/`<PageHeader>` presentational primitives, and the Stripe-redirect button are all listed as explicit non-entries in the catalog.
- The `useActionState` (React 19) correction is applied throughout: form tests assert on pending/error state rendered by `useActionState` + `useFormStatus`, never on the hooks directly.

---

## Lesson 2 — The jsdom project and the render helper

**Taught:** Stood up the third Vitest project (`name: 'component'`, `environment: 'jsdom'`, glob `src/**/*.dom.test.tsx`, setup `vitest.setup.dom.ts`); installed the `@testing-library/react` v16 / `user-event` v14 / `jest-dom` v6 / `jsdom` pin set; built `vitest.setup.dom.ts` with the jest-dom matcher import, manual `afterEach(cleanup)`, and `ResizeObserverStub`; reused the MSW server and `next/navigation`/`next/cache` mocks from ch088; built `src/test/render.tsx` wrapping RTL's `render` with providers (`NextIntlClientProvider`) and returning `{ ...rtlReturn, user: userEvent.setup() }`; taught the four interaction reflexes (`await user.click`, `findBy` for async, `screen` over destructured queries, `userEvent` over `fireEvent`).

**Cut:** The chapter outline listed `userEvent.setup({ delay: null })` as the render-helper option — the lesson explicitly rejects this, using bare `userEvent.setup()` instead (the docs warn `delay: null` causes unexpected behavior with fake timers). The outline also suggested `{ locale, messages }` i18n options in the helper and `Toaster` portal as provider — the lesson includes `NextIntlClientProvider` + i18n options but notes the Toaster and theme provider "slot into the same wrapper" without building them explicitly.

**Debts:**
- Lesson 3 owns: the query priority ladder (`getByRole`/`getByLabelText`/…/`getByTestId`), `getBy` vs `queryBy` vs `findBy` selection rationale, full jest-dom matcher catalog, what "behavior" means at the DOM layer — only `findByRole` is used here as a wiring example, not taught as priority choice.
- Lesson 4 owns: concrete component catalog (cookie consent, subscribe form, date-range picker, data table, checkout summary) and the Server Action mock-import pattern (`vi.mock('@/server/actions/...')`).

**Terminology:**
- `jsdom` — in-memory DOM implementation Node uses so component code can render without a real browser; defined via `<Term>` in intro.
- `RTL` — React Testing Library; re-defined concisely in intro (lessons are independently entered).
- `MSW` — Mock Service Worker; re-defined concisely in the reuse section.
- `peer dependency` — a package version a dependency declares it needs alongside it; introduced when explaining the v15/React 19 mismatch.
- `.dom.test.tsx` suffix — the file discriminator that routes a file to the `component` jsdom lane; `.test.ts` = unit, `.int.test.ts` = integration, `.dom.test.tsx` = component.
- `vitest --project component` — per-slice watch command; bare `vitest` runs all three.
- `render` helper at `src/test/render.tsx` — "the test-side mirror of your root layout"; tests call this, never RTL's `render` directly.
- `afterEach(cleanup)` — must be registered by hand under `globals: false`; RTL's auto-cleanup does not fire without a global `afterEach`.
- `userEvent.setup()` — called once per test (returned from `render` as `user`); every interaction `await`ed; `delay: null` explicitly discouraged.
- `findBy*` — async query that retries up to ~1000 ms; default reach after any interaction that triggers async work.
- `waitFor` — non-DOM async escape hatch (e.g., asserting a mock was called); `findBy` preferred for DOM.
- `screen` over destructured queries — `screen` reflects live global document; no refactor drift.
- `userEvent` over `fireEvent` — `userEvent` dispatches full real event sequence (`pointerdown` → `mousedown` → `focus` → `pointerup` → `mouseup` → `click`) and waits for React to flush; `fireEvent` is the carve-out for isolating a single synthetic event with no `userEvent` equivalent.
- `onUnhandledRequest: 'error'` — MSW rule carried from ch088; unhandled requests are test failures in the jsdom lane too.
- Band colors from ch086: unit = blue, integration = teal, component = violet — reused in the three-lanes diagram.

**Patterns and best practices:**
- Tests call `src/test/render.tsx`, never `@testing-library/react`'s `render` directly; add a provider once in the helper and every test inherits it.
- `afterEach(cleanup)` must be hand-registered in `vitest.setup.dom.ts` when running `globals: false`; omitting it leaks rendered trees across tests.
- Polyfill jsdom gaps only when a component actually needs it — smallest stub that satisfies the contract; do not pre-stub the world.
- The render helper owns exactly two things: providers and `user`; test data belongs to factories, auth state comes in as props, network belongs to MSW — a growing options list is the god-object smell.
- `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` is the documented escape hatch for timer-driven component tests; bare `userEvent.setup()` is the default.
- Component tests never hit the real DB; test data lives in props and MSW.
- `afterEach(() => vi.resetAllMocks())` (from ch088 L8) applies to the jsdom lane too; setup-file mocks are not auto-reset by Vitest.
- Default MSW rule `onUnhandledRequest: 'error'` does not relax in the jsdom lane.

**Misc:**
- The `component` project glob is `src/**/*.dom.test.tsx` — the `.dom.` infix is intentional (cleaner than bare `.test.tsx` which reads ambiguously next to `.test.ts`); downstream agents must not "fix" this back to `.test.tsx`.
- The chapter outline's `component` stub from ch086 used `.test.tsx`; this lesson deliberately refines it to `.dom.test.tsx` — not a contradiction to revert.
- The `render` helper shown uses only `NextIntlClientProvider`; the lesson notes theme provider and `Toaster` "slot into the same wrapper" — lesson 4 may need to add them when testing components that require those providers.
- The unawaited-`userEvent` silent-pass trap is explicitly linked to "never assert on a non-awaited promise" from ch087 L5 — downstream lessons should reinforce the same connection, not re-explain the event loop.
- Storybook `play` functions named once for awareness, not pinned; the course writes against Vitest.
