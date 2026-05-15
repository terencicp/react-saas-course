# Chapter 22.3 prerequisites review

## Missing prerequisites

- Lesson 22.3.1 — "the type-coverage check," "the migration linter," and "the env-parity linter" as named, established CI tools. Quote: "what `tsc`, `biome`, the test suite, the type-coverage check, the migration linter, and the env-parity linter would catch." The definite article on each name implies they are course-established CI jobs, but no prior chapter outline introduces a type-coverage CI check, a migration-safety linter, or an env-parity linter as named, configured tools. `tsc`, `biome`, and the test suite are established (Units 1, 19, 21.2); these three are not. Suggested source: Chapter 21.2 (add as supplementary signal checks alongside `pnpm audit` and `actionlint`) or new brief callouts in the chapters that own the underlying concept (type coverage in Chapter 19.2, migration linting in Chapter 21.4, env-parity linting in Chapter 17.2). Severity: medium.
