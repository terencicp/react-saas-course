# Chapter 4.2 prerequisites review

## Missing prerequisites

- Lesson 4.2.3 — `useEffect` used as a known concept. Quote: "don't `cn()` in `useEffect` or non-render paths". `useEffect` is not introduced before Chapter 4.2; it is first taught in Chapter 4.9.2. Suggested source: brief forward-reference note in Chapter 4.1, or defer the watch-out to after Chapter 4.9.2. Severity: low.

- Lesson 4.2.6 — `useState` used as a known implementation primitive. Quote: "mount-gate with a same-size placeholder (a `useState`-tracked `mounted` flag flipped in `useEffect`)". `useState` is not introduced before Chapter 4.2; it is first taught in Chapter 4.8.1. The lesson presents this as one of two concrete implementation options for the `<ThemeToggle>`, so the student is expected to be able to read and reason about the pattern. Suggested source: briefly introduce `useState` as "a React hook that returns a value and a setter, causing a re-render when called" in Chapter 4.1.1 or add a note scoping this option to a forward reference. Severity: medium.

- Lesson 4.2.6 — `useEffect` used as a known implementation primitive alongside `useState`. Quote: "a `useState`-tracked `mounted` flag flipped in `useEffect`". `useEffect` is not introduced before Chapter 4.2; it is first taught in Chapter 4.9.2. Same context as above — the student is expected to follow the mount-gate pattern. Suggested source: same as above; scope both hooks as forward references or provide minimal orienting sentences. Severity: medium.
