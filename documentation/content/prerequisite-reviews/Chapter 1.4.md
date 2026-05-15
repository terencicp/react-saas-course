# Chapter 1.4 prerequisites review

## Missing prerequisites

- Lesson 1.4.1 — `pnpm dlx` is used without prior explanation. Quote: "The command pattern from 1.1.5 is invoked here for the first time: `pnpm dlx degit react-saas-course-projects/unit-1-starter project-name`." Lesson 1.1.5 introduces the `degit`-fetch pattern in general terms ("the project repo and the `degit`-fetch pattern are named") but never mentions `pnpm dlx`. Lesson 1.2.2 explicitly parks `dlx` to call sites ("pnpm catalogs, `dlx`, `exec` … surveyed at the call sites where they earn their weight") but 1.4.1's outline does not include an explanation of what `pnpm dlx` does at this call site. Suggested source: add a one-line explanation of `pnpm dlx` (run a package without installing it, the pnpm equivalent of `npx`) inside lesson 1.4.1's `degit` bullet, or add it to 1.2.2 as a fifth daily command. Severity: low.
