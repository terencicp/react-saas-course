# Chapter 20.3 prerequisites review

## Missing prerequisites

- <Lesson 20.3.5> — GitHub Actions workflow structure. Quote: "GitHub Actions workflow builds, starts `pnpm start`, runs `lhci autorun`, fails if thresholds aren't met. Run on PRs touching UI/deps, against marketing route plus one authenticated route (test user via headless auth)." The lesson instructs students to wire `@lhci/cli` into a CI pipeline with PR-scoped triggers. GitHub Actions primitives (workflow/job/step model, trigger surface, pnpm-aware caching, `permissions:`, `concurrency:`) are first taught in Lesson 21.2.1, which comes after this chapter. Suggested source: Chapter 21.2 (move `@lhci/cli` CI wiring there, or add a one-screen GHA primer to 20.3.5). Severity: medium.

- <Lesson 20.3.4> — CI workflow artifact upload. Quote: "Produce the analyzer HTML in CI on dep- or route-touching PRs, upload as workflow artifact, reviewer eyeballs the diff against `main`." Writing a PR-triggered GHA workflow that uploads an artifact requires the same GHA knowledge missing above. Suggested source: Chapter 21.2 (same resolution — treat 20.3.4 CI pattern as a named forward reference to 21.2 rather than an instructional step). Severity: low.
