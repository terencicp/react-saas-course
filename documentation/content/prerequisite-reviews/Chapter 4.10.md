# Chapter 4.10 prerequisites review

## Missing prerequisites

- Lesson 4.10.1 — `useSearchParams` used as a named, known API in a hook composition example before it is formally introduced. Quote: "A `usePaginatedData(query)` might call `useSearchParams` and a fetch hook." `useSearchParams` is deferred to Lesson 5.5.5; Chapter 4.8.3 mentions it only in passing and explicitly defers its surface to 5.5. A junior dev has not seen what this hook returns or does. Suggested source: add a one-sentence recognition note in Lesson 4.9.2 (which already mentions `useSearchParams` once in the 2026-narrowing bullet) naming it as a Next.js hook that reads the URL query string, or replace the example in 4.10.1 with a hook the student already knows. Severity: low.
