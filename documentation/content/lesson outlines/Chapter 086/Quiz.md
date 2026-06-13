sources:
  86.1: Picking Vitest and wiring the runner
  86.2: The honeycomb shape for a Next.js SaaS
  86.3: Coverage as a diagnostic, not a target
  86.4: Arrange, act, assert one behavior

questions:
  - source: 86.1
    question: |
      Your project is ESM and TypeScript top to bottom. What is the load-bearing reason the course picks Vitest over Jest for it?
    choices:
      - text: |
          Vitest runs `.ts` and `.tsx` through the Vite + TypeScript pipeline the project already has, so there's no second `ts-jest`/Babel transform to configure and keep in sync.
        correct: true
      - text: |
          Vitest's `describe` / `it` / `expect` API is more powerful than Jest's, so tests can assert things Jest can't.
        correct: false
      - text: |
          Vitest runs every test file in parallel while Jest runs them one at a time, so the suite is always faster.
        correct: false
    why: |
      The decision rests on toolchain, not API or raw speed. The API is deliberately Jest-compatible (that's a migration perk, not the reason), and the real win is that Vitest reuses the ESM + TypeScript pipeline on disk instead of bolting on a `ts-jest`/Babel transform you own and that drifts out of sync with your build.

  - source: 86.2
    question: |
      A teammate argues your suite "isn't a real honeycomb" because it has 200 unit tests and only 80 integration tests — integration should be the largest band. How should you respond?
    choices:
      - text: |
          The honeycomb names where each test lives, not how many of each — band weights follow the codebase, so 200 unit / 80 integration can be a perfectly healthy honeycomb.
        correct: true
      - text: |
          They're right — to be a honeycomb the integration count must exceed the unit count, so you should add integration tests until it does.
        correct: false
      - text: |
          They're right that the counts are wrong, but the fix is deleting unit tests until integration is the majority, not adding more tests.
        correct: false
    why: |
      The honeycomb is a location heuristic, not a quota. It tells you which layer earns a given test; the number each band ends up with follows the codebase. Chasing a count — by padding integration or deleting unit tests — substitutes a target for the "shape follows the bug" rule.

  - source: 86.3
    question: |
      You want coverage to flag files in `/lib` that have *no test at all* — right now they vanish from the report instead of showing up as a problem. On the project's Vitest 4 setup, what surfaces them?
    choices:
      - text: |
          Set `coverage.include` to globs over your load-bearing surface (e.g. `src/lib/**/*.ts`); files matched but never imported then appear at 0% instead of disappearing.
        correct: true
      - text: |
          Set `coverage.all: true` so every source file is pulled into the report at 0% coverage.
        correct: false
      - text: |
          Raise the `/lib` threshold to 100% so the missing files fail the build.
        correct: false
    why: |
      Coverage reports only what *ran*, so an unimported file is silently absent. `coverage.include` drags the load-bearing surface into the report so untested files show as 0% rows. `coverage.all: true` was the Vitest 3 spelling and was removed in Vitest 4 — pasting it now is a config error. A threshold can't help with files that never appear in the report.

  - source: 86.4
    question: |
      To test that `safeLimit` fails open when Redis is unreachable, a developer writes `vi.spyOn` on the limiter to reject, calls `safeLimit`, then asserts `expect(spy).toHaveBeenCalledWith('ip:1.2.3.4')`. Why is this the wrong assertion?
    choices:
      - text: |
          It asserts the mock was called with the key the test itself wired in — verifying the function's internal plumbing, not the fail-open decision the caller acts on; assert the returned result (`{ success: true }`) instead.
        correct: true
      - text: |
          Using `vi.spyOn` at all is the mistake — you should never mock a dependency, even to arrange a failure you can't trigger for real.
        correct: false
      - text: |
          `toHaveBeenCalledWith` is too strict a matcher; switching to `toHaveBeenCalled` would make the test correct.
        correct: false
    why: |
      The spy smell isn't mocking — arranging the failure with a spy is legitimate. The smell is *asserting your mock was called with values you fed it*, which checks the wiring and couples to implementation: route the call through a cache and it breaks though nothing observable changed. Assert the observable contract — the request came back allowed.
