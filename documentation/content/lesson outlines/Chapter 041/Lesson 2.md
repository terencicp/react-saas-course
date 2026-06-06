# Chapter 041 — Lesson 2 outline

## Lesson title

Page title: **Type-safe environment variables with @t3-oss/env-nextjs** (chapter-outline title fits; keep it).
Sidebar title: **Type-safe env vars**.

## Lesson type

`Implementation`.

Note for the orchestrator: this is an atypical Implementation lesson. The `env.ts` boundary and all wiring (`db/index.ts` already imports `env`) are provided identically in start and solution — there is **no student-authored code TODO** for L2 (the TODO table starts at L3). The student's "build" is configuration and verification: create `.env`, wire nothing new, and prove the build-time boundary fires by removing a variable. The test-coder still runs; the Lesson 2 spec asserts the build-time behavior, not file contents (the placeholder is `describe.todo('Lesson 2')`). See the Moment of truth section for the test surface.

## Lesson framing

The student installs the project's env discipline: config flows through one typed boundary so a missing secret becomes a build-time error that names the variable, not a 3am production 500 on the first request. The senior payoff is the boundary itself — `env.ts` as the single seam where validation runs and the place application code reads config instead of touching `process.env` — and the verification that closes it: deleting `DATABASE_URL` fails `pnpm build` with a message naming the variable, restoring it makes the build pass.

## Codebase state

**Entry.** Starter from Lesson 1 runs locally: `pnpm install` done, Docker Postgres up on `:5432`, `pnpm dev` renders `/inspector` with empty banners (no tables yet). `src/env.ts` ships fully written — `createEnv` with a `server` block (`DATABASE_URL: z.url()`, `DATABASE_URL_UNPOOLED: z.url()`, `SEED: z.coerce.number().default(1)`), empty `client: {}`, and the `runtimeEnv` map. `src/db/index.ts` already reads `env.DATABASE_URL`. `.env.example` is committed; `.gitignore` excludes `.env*`. No `.env` exists yet unless the student copied it during L1 setup.

**Exit.** `.env` exists locally with the three variables, git-ignored. `pnpm build` succeeds. The student has verified the boundary: removing `DATABASE_URL` from `.env` makes `pnpm build` fail with an error naming the missing variable, restoring it makes it pass. No source files changed — the deliverable is a validated, working env boundary and the muscle memory that all config reads go through `env`, never `process.env`. Lesson 2 tests pass.

## Lesson sections

Implementation contract order: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a missing `DATABASE_URL` fails `pnpm build` before deploy, not the first request after it. Then one paragraph describing the working boundary: the project reads config through a typed `env.ts`, and removing a required variable turns a runtime 500 into a build-time error that names the variable. No screenshot — this is a terminal/build behavior; a short `Code` block showing the failing build output (the `@t3-oss/env-nextjs` "Invalid environment variables" error naming `DATABASE_URL`) carries the result better than a figure.

### Your mission

Prose paragraph, woven (no subsection headers, no implementation hints). Cover, drawing from the chapter outline's Lesson 2 brief:

- **Feature.** Install env discipline from line one in the first project that holds a real secret (the Postgres connection string): config validated at build time through one typed boundary.
- **The failure mode it pre-empts.** Deploy succeeds, app boots, first request crashes because a server-only variable is `undefined` and the downstream call throws inside a handler — a 500 lasting as long as the redeploy. Validating at build time converts that into a build failure.
- **The 2026 default.** `@t3-oss/env-nextjs` — a thin wrapper around a Standard Schema validator (Zod 4) that runs at build, enforces the Next.js naming convention (`NEXT_PUBLIC_` for client-visible, no prefix for server-only), and exports typed values the app imports instead of touching `process.env`.
- **What's provided vs. asked.** The starter ships `env.ts` complete (three server vars, empty client block staged for PostHog etc. in later units, the `runtimeEnv` map). The student wires the project to it (create `.env` from `.env.example`) and proves the boundary fires — they do not re-derive the file.
- **Constraints.** Application code imports from `env`, never `process.env` — that import is the seam where validation runs and what types `env.DATABASE_URL` as `string` rather than `string | undefined`. The package refuses a `NEXT_PUBLIC_*` var in `server` and vice versa, making the leaked-secret bug hard to write.
- **Out of scope.** Authoring Zod schemas in depth (Chapter 042), connecting Drizzle to `DATABASE_URL` (Lesson 3), the Vercel deploy flow and secret rotation (Units 16, 20), and Valibot as an alternative validator (the course commits to Zod).
- **The trap.** `SKIP_ENV_VALIDATION` — legitimate only for a CI build that genuinely runs without secrets, set deliberately in the one script that needs it; never reached for to silence an error.

Then the requirements checklist (the only list in the section) — use `Checklist`/`ChecklistItem` with `tested`/`untested` chips. Phrase each as a verifiable outcome, no file/import/export language:

1. `[tested]` Removing `DATABASE_URL` from `.env` makes `pnpm build` fail with an error that names the missing variable; restoring it makes the build pass again.
2. `[untested]` The app boots and reads `DATABASE_URL` through the typed `env` export, with no remaining `process.env.DATABASE_URL` access in application code.
3. `[untested]` `.env` holds the real secret and is git-ignored; `.env.example` is committed and names every variable the app expects.

Tagging rationale for the test-coder: only requirement 1 is mechanically assertable from a test runner (it can shell out to `pnpm build` with a variable unset and assert a non-zero exit plus the variable name in stderr). Requirements 2 and 3 are conventions verified by hand / covered in the solution prose — do not assert against them.

### Coding time

One line directing the student to create `.env` from `.env.example`, run `pnpm build`, then attempt the build-failure verification (delete `DATABASE_URL`, rebuild, read the error, restore) before reading on.

Hidden `<details>` solution walkthrough (writer wraps in `<details>`, collapsed). Because there is no student-authored code, the "solution" is the provided boundary explained plus the verification reasoning:

- **`src/env.ts` as it sits in the repo** — show with `AnnotatedCode` so focus lands on three parts in turn: (a) the `server` block (three vars, the empty `client` block and why it's empty now — populated when PostHog and other client vars land in later units), (b) the `runtimeEnv` map and *why it exists* (Next.js inlines `NEXT_PUBLIC_*` at build but keeps server vars dynamic; the map tells the validator which `process.env.X` backs each schema entry so it can read them correctly under both regimes), (c) the `createEnv` call as the seam — one or two sentences on why imports go through `env` rather than `process.env` (validation runs here; the export is typed `string`, not `string | undefined`).
- **The `.env.example` → `.env` split** — `CodeVariants` or two `Code` blocks: `.env.example` is committed and documents every variable; `.env` holds the real values and is git-ignored (`.gitignore` excludes `.env*`). One line on the Vercel connection: production vars set in the dashboard still validate at build, so a missing one fails the deploy before traffic shifts — Unit 20 owns the deploy chapter; link, don't expand.
- **`SKIP_ENV_VALIDATION`** — the escape hatch and the one-line rule for when it's legitimate (a CI build with no secrets present, set in that script only).
- **Callout** (`Aside`) linking Architectural Principle #3 (pure `/lib`, side effects at named boundaries): `env.ts` is the project's first concrete named boundary, revisited in Unit 6 and under the Unit 16 security baseline. Reference the principle by its canonical name; do not re-teach it.

Code-sample handling summary: `AnnotatedCode` for `env.ts` (multiple parts need focus); `Code` for the `.env`/`.env.example` blocks and the failing-build terminal output; `Aside` for the principle callout. No diagram — the validate-at-build flow is a single linear sentence prose carries fine.

### Moment of truth

- **Test command:** `pnpm test:lesson 2`. Expected: the Lesson 2 spec passes (the suite shells out to a build with `DATABASE_URL` unset and asserts the build fails naming the variable). Show the expected green pass output.
- **By-hand checklist** (`Checklist`, ticked as the student goes), covering the untested requirements:
  - `pnpm build` succeeds with `.env` in place.
  - Remove `DATABASE_URL` from `.env`, run `pnpm build`, read the error naming the missing variable, then restore it and confirm the build passes again. (This mirrors the tested requirement so the student sees by hand what the test asserts.)
  - Confirm application code reads `env.DATABASE_URL`, not `process.env` (point at `db/index.ts` as the example already doing this).
  - Confirm `.env` is git-ignored and `.env.example` is committed.

## Scope

This lesson installs and verifies the env boundary only. It does **not** teach: authoring Zod validators (Chapter 042); wiring Drizzle's client to `DATABASE_URL` or anything about the connection (Lesson 3 of this chapter — already done in provided `db/index.ts`, mentioned only as the example of reading through `env`); the Vercel deploy and secret management flow (Units 16 and 20); client-side env vars and `NEXT_PUBLIC_*` usage in practice (named as a rule here, exercised when PostHog/analytics land in later units). The pooled/unpooled URL split rationale belongs to Lesson 3 — name `DATABASE_URL` only.
