# Chapter 10.1 prerequisites review

## Missing prerequisites

- Lesson 10.1.1 — Better Auth `databaseHooks` lifecycle API. Quote: "The plugin exposes the hook; the student writes a four-line function that runs the lookup inside the `before` phase of session creation." No prior chapter outline introduces the `databaseHooks` config block or its `before`/`after` callback shape. The lesson uses the pattern as if the API surface (key in `betterAuth({ databaseHooks: { session: { create: { before: async (session) => … } } } })`) is already understood. Suggested source: a new bullet in 9.2.1 or 9.2.2 naming `databaseHooks` as the lifecycle-extension point in the `betterAuth()` config, or a standalone note in 9.2.4 where the session-creation side-effects are discussed. Severity: medium.
