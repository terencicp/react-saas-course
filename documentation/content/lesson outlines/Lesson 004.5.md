# Lesson 004.5 — Type-safe environment variables with @t3-oss/env-nextjs

## Lesson framing

This is the final lesson of Chapter 004 and the chapter's payoff: the scaffold's `env.ts` is the first concrete instance of fail-closed-at-the-boundary discipline in the course. The lesson teaches a **failure mode** (missing env var → 500 on first request in production) and the **structural enforcement** that prevents it (`@t3-oss/env-nextjs` + Zod 4 validating at build time). The senior frame is the whole lesson: validation belongs at the boundary, not scattered as `process.env.X ?? throw` checks across the codebase.

Brainstorm conclusions that apply lesson-wide:

- **Pattern archetype, not reference.** The student is not learning the package's full API — they're learning where it sits in the system, what failure it kills, and what the file looks like at scaffold-depth. The starter wrote the file; the student reads it and proves it works.
- **Lived-experience opening over abstract framing.** The lesson opens with a concrete production crash scenario (a deploy that succeeds, a 500 on the first request, a redeploy that takes 8 minutes while users see errors). The senior question "where should that have been caught?" answers itself: build time, not request time.
- **The build is the demo.** The center of gravity is a `Steps` block where the student runs `pnpm build`, deletes `DATABASE_URL`, runs it again and watches it fail, restores it and watches it succeed. The discipline is mechanical — the student feels the build catch the bug before they ship it. No prose can replace that loop.
- **The server/client split is structural, not just naming.** `NEXT_PUBLIC_*` is the Next.js naming convention that decides what gets inlined into the client bundle; the package's `server` / `client` blocks enforce the split structurally so you cannot accidentally put a `STRIPE_SECRET_KEY` in the client block (it would refuse, since it lacks `NEXT_PUBLIC_`). Teaching the convention and the structural enforcement together is the senior payoff.
- **Cognitive load discipline.** Lead with the simplified mental model (one block, one validator, build-time fire), then add the server/client split, then the `runtimeEnv` map, then the escape hatch. Each layer earns a paragraph; no kitchen-sink dump.
- **Forward links named once.** Architectural Principle #3 (named boundaries) and SaaS pattern #12 (security baseline, Unit 17) get one sentence each. Drizzle wiring (Unit 6) and Vercel deploy (Unit 21) get the same. The student leaves knowing the file's place in the larger story without the larger story being taught here.
- **Senior reflex over rote memorization.** The closing exercise is a `Buckets` sort that asks the student to classify variables by which block they belong in — this is the durable skill (where does a new env variable go?), tested cleanly without any code authoring.
- **Honest naming around current versions.** Zod 4 prefers top-level `z.url()` over the deprecated `z.string().url()`; the lesson uses the modern form. `experimental__runtimeEnv: process.env` is the recommended Next.js 13.4.4+ shape. Latest `@t3-oss/env-nextjs` is 0.13.11 (March 2026) — the lesson does not pin a version in prose, but the code samples reflect the current API.

The student finishes the lesson with: an `env.ts` they understand line by line, a `.env.local` created from `.env.example`, a build they have personally watched fail and then succeed, and a working mental model for where each new variable belongs.

---

## Lesson sections

### Intro (no header) — The deploy that succeeds and the request that doesn't

Opens with the scenario in two short paragraphs.

- Concrete framing: a Vercel deploy goes green, the app boots, a user lands on the home page, the first call to Stripe throws because `process.env.STRIPE_SECRET_KEY` is `undefined`. The user sees a 500; the team sees the alert; the fix is to set the variable and redeploy — and the outage lasts as long as the deploy takes. Most senior devs have lived this once.
- The senior question, stated plainly: where should that have been caught? Not at first-request time, when traffic is already shifting. At **build time**, before the deploy ever finishes. The build either has the env it needs, or the build fails — fail-closed-at-the-boundary, applied to configuration.
- One-line forward link to Architectural Principle #3, named here as "this is the first named boundary you'll see in the course." Then move on.

Pedagogical reasoning: motivating the lesson with a real production failure is more durable than starting from the API surface. The student remembers the 500; they then remember the file that prevents it. No `Aside` needed — prose is enough.

### Why `@t3-oss/env-nextjs` is the default

One paragraph, no subsections.

- What the package is: a thin wrapper that runs a Standard Schema-compliant validator (Zod 4 in this course) at build time, enforces the Next.js `NEXT_PUBLIC_*` convention structurally, and produces typed exports.
- The two alternatives, named in one sentence each. (a) Hand-written `process.env.X ?? throw` checks scattered across the code — no central enforcement, easy to forget one. (b) No validation at all — the failure mode from the intro.
- The trigger that would flip the choice: a non-Next.js runtime where the package's framework integration doesn't fit. The principle (validate at the boundary) stays; the package changes. Named in half a sentence so the student knows the principle is portable.

Use a short paragraph; no code yet. The shape of the file comes in the next section.

### What the starter's `env.ts` looks like

The center-of-gravity reading. The starter shipped a complete `env.ts`; the student reads it once end to end.

Component: `AnnotatedCode`. Single MDX block showing the full `env.ts` from the starter, with stepped highlights walking through:

1. The imports — `createEnv` from `@t3-oss/env-nextjs` and `* as z from "zod"`. One step.
2. The `server` block — schemas for server-only variables: `DATABASE_URL: z.url()` (real, present in scaffold), `RESEND_API_KEY: z.string().min(1).optional()` (optional in early units, becomes required when the email project lands in Unit 8 — named in the prose so the optional marker isn't mystery). One step.
3. The `client` block — empty object in the first scaffold, but present and named so the student sees the shape they'll fill later (PostHog in Unit 20). One step. Use a comment in the code (`// populated in later units`) so the empty block reads as deliberate.
4. The `experimental__runtimeEnv: process.env` line — the explicit map that threads `process.env` into the validator. One step. The prose names why the map exists: Next.js inlines `NEXT_PUBLIC_*` at build time but leaves server vars dynamic, and the map is how the package knows which is which. The student does not need the deep mechanics; they need to know the line is load-bearing and not boilerplate.
5. The `skipValidation` line — `skipValidation: !!process.env.SKIP_ENV_VALIDATION`. One step. Prose covers when to set it (CI step that builds without secrets present) and the trap (it disables the safety it's supposed to guard, so set it deliberately in the script that needs it, never as a default).
6. The `export const env = createEnv({...})` shape — one step naming the import side: application code imports `env` from this file; `env.DATABASE_URL` is `string`, not `string | undefined`.

Pedagogical reasoning: `AnnotatedCode` is the right component because the file is one artifact and the focus has to move through it sequentially. `CodeVariants` would imply alternatives, which there aren't here; a plain `Code` block would lose the per-section attention the file deserves.

After the `AnnotatedCode`, one short paragraph names the **import-side rule**: application code imports from `~/env`, never touches `process.env`. Two reasons: typed exports (no `string | undefined` on every read) and the seam where validation actually fires (importing from `~/env` runs the validator; bypassing it doesn't). A future hardening — a Biome rule that lints `process.env` references — is named in one line and not built.

### The server / client split

A short section explaining the structural enforcement, because the split is the package's main value-add beyond Zod.

- The Next.js naming convention restated: `NEXT_PUBLIC_*` is shipped to the client bundle; everything without that prefix stays on the server. One sentence.
- The structural enforcement: the package refuses to accept a `NEXT_PUBLIC_*` variable in the `server` block, and refuses to accept a non-prefixed variable in the `client` block. The student cannot accidentally leak a `STRIPE_SECRET_KEY` to the client bundle by misplacing it — the build fails. One short paragraph naming this.
- An `Aside` (`type="tip"` or `type="caution"`) with the senior framing: *"If you accidentally add `NEXT_PUBLIC_` to a secret name, that secret will appear in your client bundle in plain text. The package enforces the naming-to-block correspondence so the bug is hard to write."*

Visual: a small `Figure` containing an `ArrowDiagram` or a hand-coded HTML+CSS diagram showing the two-block split — `server` block (lock icon, "server-only, validated at build") and `client` block (`NEXT_PUBLIC_*` only, "shipped to browser bundle") — both arrows pointing into a single `env` export. The pedagogical goal: a one-glance picture of the structural split so the student doesn't have to reconstruct it from prose. Horizontal layout (per diagram guidelines on vertical-space constraint). Keep it small — this is a clarifying visual, not the lesson's centerpiece.

### Watching the build fail

The hands-on payoff. The student runs the build, breaks it, fixes it.

Component: `Steps` block.

1. **Confirm the baseline.** The student copies `.env.example` to `.env.local` (`cp .env.example .env.local`), opens it, fills in `DATABASE_URL` (a placeholder local Postgres URL is fine — `postgres://localhost:5432/app` — the URL doesn't need to resolve for the validator to pass; Drizzle isn't actually connecting in this chapter). The `.env.example` file ships with the starter, named once and not edited. Pair this step with a side note: `.env.local` is gitignored (from 004.1); `.env.example` is committed.
2. **Run `pnpm build`.** Expected output: the build succeeds. Show the truncated output in a labeled code block. Prose: "the validator ran during the build and saw `DATABASE_URL` defined."
3. **Break the env.** The student opens `.env.local` and comments out (or deletes) the `DATABASE_URL` line.
4. **Run `pnpm build` again.** Expected output: the build **fails**, with `@t3-oss/env-nextjs`'s error message naming `DATABASE_URL` as the missing variable. Show the actual error output verbatim in a labeled code block so the student recognizes it when they hit it in their own code six months from now. Prose: "the build refused to produce an output. That refusal is the discipline — the unship-able state is the unshipped state."
5. **Restore the env.** Add `DATABASE_URL` back. Run `pnpm build` again — succeeds. Three commands, two states (broken / working), the student feels the loop.

After the `Steps`, one short paragraph naming the deploy connection: Vercel sets production env vars in its dashboard, the build still runs `env.ts` validation in CI, and a missing variable fails the deploy before traffic shifts. Unit 21 owns the deploy lesson; this lesson states the connection so the student knows what they're protecting against.

Pedagogical reasoning: `Steps` is the right component because the action is sequential and the student is following along on their own machine. No sandbox — the lesson's deliverable is a build that the student watched fail on their own terminal. That's higher signal than any embedded environment.

### The `.env.example` ↔ `.env.local` pattern

A short standalone section because the file pair is its own micro-pattern and the student will hit it again.

- `.env.example` — committed, in the repo root, names every variable the app expects with a dummy value or empty string. Purpose: the next contributor (or the student themselves on a new machine) clones, copies, fills in real values, and the app boots without a Slack thread to find out which vars are needed.
- `.env.local` — never committed, holds real secrets, on each developer's machine. The `.gitignore` from 004.1 excludes `.env*.local`.
- One sentence naming the senior-reflex update rule: every PR that adds a new env variable updates `.env.example` in the same commit. The discipline is the same as schema migrations — the public surface stays current with the requirements.

No diagram or code component here; one short prose section. The pattern is verbal, not visual.

### The `SKIP_ENV_VALIDATION` escape hatch

A short section, because the flag exists in the file and the student will see it.

- What it does: setting `SKIP_ENV_VALIDATION=true` in the environment bypasses validation for the specific case of a build step that runs without the secrets present (e.g., a Docker image build where env vars are injected at container start, or a CI step that builds before secrets are mounted).
- The senior watch-out, stated plainly: the flag is for the build that doesn't need to type-check the env shape, not for "make the error go away." Set it deliberately in the script that needs it (e.g., a specific CI build command), never as a default in `.env.local`. An `Aside` (`type="caution"`) makes the watch-out unmissable.
- One known wrinkle named in half a sentence (per current package docs): when `SKIP_ENV_VALIDATION` is set, Zod-schema default values are not applied — the variables come through as `undefined`. The student should not lean on schema defaults if the build path may skip validation.

### Where each new variable goes — a closing reflex check

Confirmation exercise, no new content.

Component: `Buckets` exercise. Two- or three-column layout. Pre-populated with the eight variable names below; the student sorts them into:

- **`server` block** — `DATABASE_URL`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `SESSION_SECRET`
- **`client` block** — `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`
- **Don't add to `env.ts`** — `NODE_ENV` (Next.js-owned, set by the framework based on the command; validating it shadows the framework's contract)

Grading: each variable has exactly one correct bucket. The exercise is a senior-reflex check — the student should leave knowing where each new env variable belongs before they ever add one.

Pedagogical reasoning: `Buckets` is the cleanest fit because the question is categorization, not recall or output prediction. A `MultipleChoice` would test one variable at a time; `Buckets` tests the full mental model in one screen. The decoy (`NODE_ENV`) is the load-bearing item — students new to Next.js often try to validate it, and the senior reflex is "framework owns that, hands off."

### External resources

A small `CardGrid` of `ExternalResource` cards at the very end (optional but useful):

- The `@t3-oss/env-nextjs` Next.js docs page — `https://env.t3.gg/docs/nextjs`. Title: "T3 Env — Next.js setup". Short description: "The package's official setup page, including the customization options the lesson didn't cover."
- The Zod 4 docs — `https://zod.dev/` (or the v4 landing). Title: "Zod 4 documentation". Short description: "The full schema API; the lesson uses a tiny subset."
- (Optional) The Next.js env vars docs — `https://nextjs.org/docs/app/building-your-application/configuring/environment-variables`. Title: "Next.js — Environment variables". Short description: "What `NEXT_PUBLIC_*` does and where Next.js looks for env files."

---

## Scope

**Previously taught (do not re-explain):**

- The starter scaffold layout, the `db/client.ts` Drizzle wiring sitting next to `env.ts`, the `.gitignore` excluding `.env*.local` — **Lesson 004.1**. Refer to the file tree the student already knows; don't re-walk it.
- The `tsconfig.json` flags (`strict`, `noUncheckedIndexedAccess`, etc.) — **Lessons 004.3 and 004.4**. The lesson can refer to the typed-export rule of `env.DATABASE_URL` returning `string` (not `string | undefined`) without restating why narrowed types matter.
- `pnpm dlx` and the `pnpm` script runner — **Chapter 002**.
- `tsx` as the standalone script runner — **Lesson 002.4**. Not relevant here; do not introduce.
- VS Code's "Use Workspace Version" — **Chapter 003**. Not re-explained.

**Reserved for later (do not pre-teach):**

- Authoring Zod schemas in depth (refinements, transforms, branded types, composition) — **Chapter 046**. The lesson uses `z.url()` and `z.string().min(1).optional()` and that's it; do not editorialize on the Zod API surface.
- Connecting Drizzle to `DATABASE_URL` (the actual database client, query examples) — **Unit 6**. Mention that `db/client.ts` reads from `env.DATABASE_URL` and stop there.
- The Vercel deploy flow for env vars (dashboard UI, project settings, encryption-at-rest) — **Unit 21**. One sentence stating the connection, not a tutorial.
- Secret rotation, env-per-environment separation, staging-vs-production hygiene — **Unit 17 (security baseline) and Unit 21 (deploy)**. Out of scope.
- The Server Component vs. Client Component distinction — **Unit 5**. The `NEXT_PUBLIC_*` framing here is about bundle inclusion, not the RSC model.
- Authoring or modifying `next.config.ts` beyond the empty starter shape — **Unit 17 and Unit 20** add headers and analyzers; this lesson doesn't touch it.
- Valibot as an alternative validator — named in half a sentence at most; the course commits to Zod.
- The `~/env` path alias resolution mechanics — **already covered in 004.3** at the `@/*` flag; this lesson uses the alias and moves on.
- A Biome / ESLint rule to ban raw `process.env` references — named once as a "future hardening"; not built here.

**Hard cuts (do not include):**

- Any discussion of `dotenv`, `dotenv-flow`, `next.config.js` `env` field, or other historical patterns. Next.js loads `.env.local` natively; the course never names the alternatives.
- A version pin in prose for `@t3-oss/env-nextjs` or `zod`. The starter's `package.json` is the source of truth; the lesson reflects the current API without anchoring to a version number that ages.
- Tests for `env.ts`. The file is its own assertion (the build either passes or fails); writing tests for the validator is not a 2026 senior pattern.
