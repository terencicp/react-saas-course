# Chapter 4.1 prerequisites review

## Missing prerequisites

- Lesson 4.1.2 — `React.ReactNode` type. Quote: "`{ children }: { children: React.ReactNode }` … `React.ReactNode` is the type for `children`." The type is used both in a code example (the root layout signature) and stated as a watch-out fact, but no prior lesson introduces it. Chapter 4.6.1 is where `ReactNode` is formally defined and its semantics explained (`ReactNode` accepts JSX, strings, numbers, arrays, `null`/`undefined`, etc.). Units 1–3 teach TypeScript types but contain no React-specific types. Suggested source: a one-liner in Lesson 4.1.1 naming `React.ReactNode` as the type for anything React can render, or in Lesson 4.1.2 before the code example. Severity: low.
