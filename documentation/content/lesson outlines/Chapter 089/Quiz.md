sources:
  89.1: When RTL earns its weight
  89.2: The jsdom project and the render helper
  89.3: The query ladder is the accessibility audit
  89.4: The catalog — five components that earn the test

questions:
  - source: 89.1
    question: |
      A teammate's PR adds a component test for an async Server Component that fetches and renders this org's invoices. They argue it's worth testing because the list is a high-traffic surface. What's the senior response?
    choices:
      - text: |
          Wrong surface — Server Components aren't an RTL target in 2026; the list's bugs live at the seam (the query, the auth check, the formatter), covered by an integration test, and on a money path, end to end.
        correct: true
      - text: |
          Keep it, but only assert the row count — re-testing that the framework renders an array is the one safe thing to check on a Server Component.
        correct: false
      - text: |
          Keep it — high-traffic surfaces meet the implicit accessibility trigger, so any component on one earns a component test.
        correct: false
    why: |
      Server Components are off the RTL surface entirely. Their bugs are in the data layer (caught at the seam) and, where they sit on a money path, in E2E. Asserting the row count just re-tests that Next.js can render an array. The accessibility trigger is about role-first queries on interactive client surfaces, not "any component on a busy page."

  - source: 89.1
    question: |
      Which of these components meet a trigger to reach for RTL? (Select all that apply.)
    choices:
      - text: |
          A `<DateRangePicker>` shared across Reports, Invoices, and Filters.
        correct: true
      - text: |
          A multi-step subscribe form that reveals a seat-count field only on the Pro plan.
        correct: true
      - text: |
          A `<Section>` wrapper whose only job is to add vertical spacing.
        correct: false
      - text: |
          A button whose sole job is to call a Server Action that already has its own seam test.
        correct: false
    why: |
      The shared picker (one bug, many regressions) and the conditional multi-step form (state transitions the seam test never sees) each hit a named trigger. The spacing wrapper has no state or branching content, and the lone action-button is already covered at the seam — both are deletions, not tests.

  - source: 89.2
    question: |
      Under `globals: false`, you write your first `*.dom.test.tsx` files and they pass individually but start failing in a full run with "found multiple elements." What's missing from the jsdom setup file?
    choices:
      - text: |
          `afterEach(cleanup)` — without a global `afterEach` for RTL to auto-hook, each rendered tree stays mounted into the next test, so queries match elements from a previous render.
        correct: true
      - text: |
          A `ResizeObserver` polyfill — the missing browser API leaves stale nodes mounted across tests.
        correct: false
      - text: |
          `vi.resetAllMocks()` in `afterEach` — without it the navigation mock returns the previous test's elements.
        correct: false
    why: |
      RTL only auto-cleans when the runner exposes a global `afterEach`; with `globals: false` it doesn't, so you register `afterEach(cleanup)` by hand. Skip it and trees leak across tests, and a query that should match one element finds two. Polyfills and mock-resets fix different problems, not stale DOM.

  - source: 89.2
    question: |
      Your `render` helper calls `userEvent.setup()` with no options. A teammate suggests copying `userEvent.setup({ delay: null })` from an older tutorial to speed tests up. Is that the right default?
    choices:
      - text: |
          No — bare `userEvent.setup()` is the correct default; the docs discourage `{ delay: null }` and warn it causes unexpected behavior, especially with fake timers.
        correct: true
      - text: |
          Yes — `{ delay: null }` removes inter-keystroke delays and is the recommended default for any test suite.
        correct: false
      - text: |
          Yes, but only in the `render` helper, never inside an individual `it` block.
        correct: false
    why: |
      Bare `userEvent.setup()` is the default this suite uses. `{ delay: null }` is discouraged and interacts badly with fake timers; the one documented escape hatch for a timer-driven test is `{ advanceTimers: vi.advanceTimersByTime }`, reached for only when a timer actually forces it.

  - source: 89.3
    question: |
      A Confirm button carries class `btn-primary`, id `submit`, text `Confirm`, `aria-label="Confirm purchase"`, role `button`, and `data-testid="submit-btn"`. You're proving a user can click it. Which query belongs at the top of the ladder?
    choices:
      - text: |
          `screen.getByRole('button', { name: /confirm purchase/i })`
        correct: true
      - text: |
          `screen.getByTestId('submit-btn')`
        correct: false
      - text: |
          `screen.getByText('Confirm')`
        correct: false
    why: |
      Role plus accessible name is exactly what assistive tech sees, so a green test proves the button is reachable and announced as "Confirm purchase" — a free accessibility assertion. The test id is invisible to users and would stay green even on an unreachable `<div>`; `getByText('Confirm')` ignores the role and could also match a tooltip, throwing on the ambiguity.

  - source: 89.3
    question: |
      You want to assert that no validation error is shown before the user submits. Which query family is correct, and why?
    choices:
      - text: |
          `queryBy*` — it returns `null` when nothing matches, which is the only family that lets a "not present" assertion run.
        correct: true
      - text: |
          `getBy*` — it's the default for any presence check, and `.not.toBeInTheDocument()` flips it to a negative.
        correct: false
      - text: |
          `findBy*` — absence is an async condition, so you must wait to confirm nothing appeared.
        correct: false
    why: |
      `getBy*` throws the instant it finds no match — before your `expect` ever runs — so the test fails with "could not find an element" instead of cleanly asserting absence. `queryBy*` returns `null` for the negative case. `findBy*` is for elements that appear after async work, not for proving something never showed up.

  - source: 89.4
    question: |
      A subscribe-form component test mocks `createSubscription`, clicks Subscribe, and its only assertion is `expect(createSubscription).toHaveBeenCalledWith({ plan: 'pro', seats: 5 })`. It passes. What's wrong with it?
    choices:
      - text: |
          It checks the mock was called but never what the form did with the result — it stays green even if the form then renders a blank screen and the user gets no feedback.
        correct: true
      - text: |
          Calling a real Server Action from jsdom hits the database, so this assertion can't honestly pass in a component test.
        correct: false
      - text: |
          It stops too early — it should read back the subscription row to confirm the write actually landed.
        correct: false
    why: |
      The mocked action's only job is to drive a branch; the form's job is to turn that branch into something the user sees. Assert the visible consequence (a success `status` region, or a declined-card `alert`), which survives a field rename and fails for the right reason. Reading back the row would be mocking too deep — that effect belongs to the seam test.

  - source: 89.4
    question: |
      For the date-range picker test, why pin time with `vi.setSystemTime(new Date('2026-05-14'))` before asserting that pressing `{ArrowRight}` moves focus to "15 May"?
    choices:
      - text: |
          The grid is rendered relative to "today" — without a fixed clock, which day "15 May" sits next to changes with the CI run date, making the focus target flaky by construction.
        correct: true
      - text: |
          `userEvent.keyboard` needs fake timers installed, and `setSystemTime` is what installs them.
        correct: false
      - text: |
          It prevents the real network clock from drifting the MSW handler timestamps out of range.
        correct: false
    why: |
      A picker that reads the real clock is flaky by construction: "this month" differs depending on when the suite runs. Pinning the clock seam makes "today" deterministic so a specific day is a stable focus target. It has nothing to do with installing timers for keyboard events or with MSW timestamps.
