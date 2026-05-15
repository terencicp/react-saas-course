# Chapter 19.3 prerequisites review

## Missing prerequisites

- <Lesson 19.3.3> — `vi.mocked().mockResolvedValue()` and `mockReset()` / `vi.resetAllMocks()` used as known. Quote: "The fixture sets per-test implementation via `vi.mocked(auth).mockResolvedValue(...)`" and "afterEach(() => vi.mocked(auth).mockReset()) or vi.resetAllMocks()." Chapter 19.2.3 introduces `vi.mocked(newId).mockImplementation(...)` for synchronous mocks only; the async variant `mockResolvedValue` and the reset methods `mockReset` / `resetAllMocks` are not covered anywhere prior. Suggested source: extend Lesson 19.2.3 with a bullet on `mockResolvedValue` (async shorthand) and `mockReset` / `vi.resetAllMocks()` as the afterEach cleanup contract. Severity: low.
