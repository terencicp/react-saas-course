# The env schema as single source of truth

- Title: The env schema as single source of truth
- Sidebar label: The env schema

## Lesson framing

This is the seventh teaching lesson of chapter 081's security baseline and the shortest (20–30 min). It is an **audit/revisit lesson, not a build lesson** — `env.ts` was authored once in ch041 L2, and the student has since added a dozen variables across the course (auth, email, Upstash, Stripe, invitations, observability). The job here is to re-examine that file through the baseline lens and answer one senior question: *is the schema still the single source of truth, or has discipline eroded as variables piled up?*

Pedagogical stance and conclusions that apply lesson-wide:

- **Decisions over syntax.** The student already knows `createEnv`, the `server`/`client`/`runtimeEnv` blocks, and `SKIP_ENV_VALIDATION` (ch041 L2). Do not re-teach setup. Lead with the *invariants that keep the boundary load-bearing* and the *failure mode each prevents*. This is a senior-mindset lesson: the value is the four-item invariant checklist and the grep-able audit, not new API surface.
- **This is the capstone of Architectural Principle #3.** ch041 L2 introduced `env.ts` as "the first concrete instance of Principle #3 — pure `/lib`, side effects at named boundaries" and explicitly promised the principle "anchors the security baseline near the end of the course." This lesson *is* that anchor. Open by cashing that promissory note: the env boundary is the canonical named-side-effect seam, and the baseline pass is checking the seam hasn't leaked.
- **Connect to what L6 just established.** L6 (the immediately preceding lesson) ended its leak audit with check #1 — "No `process.env.X` outside `env.ts` … The full invariant is the next lesson's." This lesson opens by picking up exactly that thread. L6 owned *where secrets escape* (4 leak surfaces, the sensitive flag, rotation); L7 owns *the validation discipline* (4 invariants, schema-as-docs). Clean handoff — do not re-teach the leak audit, reference it.
- **The mental model to leave the student with:** `env.ts` is simultaneously (a) the runtime gate (validates at build, fails fast), (b) the type boundary (`env.X` is `string`, never `string | undefined`), (c) the structural secret/client firewall (server block import from a Client Component is a *build error*, not a lint warning), and (d) the canonical documentation of "what this app needs to run." All four collapse into one file. The audit checks all four still hold.
- **Cognitive-load shaping.** The four invariants are the spine; teach them as a numbered set, each with its one-line grep and its failure mode, simplest-first (typed access → server/client split → `.env.example` parity → `SKIP_ENV_VALIDATION` hygiene). Then two short "the schema grew up" extensions (production-only conditional vars, the per-environment URL helper) that only make sense once the invariants are in hand. Close with the one-page audit deliverable that rolls the four invariants into a repeatable pass.
- **Make it concrete with the student's own variables.** The schema-as-documentation read is far more vivid when it groups the *actual* accumulated variables the student has met: `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (ch041), `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (ch052), `RESEND_API_KEY`/`EMAIL_FROM`/`EMAIL_REPLY_TO` (ch048/050), `INVITATION_SIGNING_SECRET` (ch058/059), `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (ch074/075), `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (ch064), `SENTRY_AUTH_TOKEN`, and the `NEXT_PUBLIC_*` set L6 already enumerated (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`). This grounds every abstract point in a file the student can picture.
- **Canonical contract (do not contradict).** Path is `src/env.ts`, imported as `@/env` (NOT `lib/env.ts` — the ch081 L6 continuity note is explicit; the chapter-outline's `lib/env.ts` is stale). Validator is **Zod 4** with top-level format builders (`z.url()`, `z.email()`, not deprecated `.string().url()` chains). The one sanctioned `process.env` read outside `env.ts` is `process.env.NODE_ENV`. `import 'server-only'` is the structural reinforcement for server-only modules.
- **Format.** Light on heavy widgets — this is a read-and-audit lesson. Use `AnnotatedCode` once for the grown-up schema, `CodeVariants` for the two diagnostic before/after pairs, one `Buckets` classification exercise (server vs. client vs. not-in-schema), and the `Checklist` deliverable. No diagrams beyond a small mental-model figure; no live-coding sandbox (env validation isn't reproducible in ReactCoding/Sandpack, and a `TypeCoding` widget would teach the wrong thing here — the lesson is about *discipline*, not type gymnastics).

## Lesson sections

### Introduction (no header)

Per pedagogical guidelines, no "Introduction" header — open directly. Cash the Principle #3 promissory note from ch041 L2 in two sentences: `env.ts` was the first named side-effect boundary; the baseline pass is the moment to confirm it's still the only door config walks through. State the senior question plainly: *one file was the source of truth on day one — a dozen variables later, is it still?* Pick up L6's dangling thread (check #1, "the full invariant is the next lesson's"). Preview the deliverable: a four-invariant audit the student can run against any repo, including their own. Keep it warm and brief (one short paragraph + the question).

### One file, four jobs

**Goal:** install the mental model before the invariants, so each invariant reads as "protecting job N." Re-state, compactly, what `env.ts` *is* now that it has grown — four collapsed responsibilities:

1. **Runtime gate** — `createEnv` runs the schema the moment the module loads; a missing/malformed var fails `next build`, naming the variable (callback to ch041 L2's terminal screenshot — reference, don't reprint at length).
2. **Type boundary** — `env.DATABASE_URL` is typed `string`, not `string | undefined`; no null-checking a value the build already guaranteed.
3. **Secret/client firewall** — the `server` partition is structurally walled off from the browser bundle; the split is the defense, not a convention.
4. **Documentation** — the file is the canonical answer to "what does this app need to run."

Render this as a small **`Figure`** containing a compact HTML/CSS panel: one `env.ts` box in the center with four labeled outputs fanning out (gate / types / firewall / docs). Pedagogical goal: a single glance that says "everything routes through here," priming the invariant section. Keep it under ~400px tall, horizontal fan. (Per diagrams INDEX: a simple annotated illustration is plain HTML+CSS inside `<Figure>`, not a graph engine.)

Then the pivot sentence: each of the four invariants below keeps one of these four jobs honest as the schema grows.

### Invariant 1 — every access goes through the typed `env`

**Concept:** every read of configuration is `import { env } from '@/env'` → `env.X`; raw `process.env.X` anywhere else bypasses both the type boundary and the validation gate. The grep: `process.env` across the repo; every hit outside `env.ts` is a finding. The one sanctioned exception is `process.env.NODE_ENV` (framework-standard, validated by Next.js itself, used for build-time branching) — name it explicitly so the student doesn't flag it as a false positive. Mention rare framework internals (e.g. a `next.config.ts` reading `process.env.ANALYZE`) as the narrow other exception.

**Failure mode to land:** a stray `process.env.STRIPE_SECRET_KEY` deep in a handler types as `string | undefined`, slips past the build because nothing validates it, and 500s at first request when the var is missing in that environment — the exact bug ch041 L2 installed `env.ts` to kill, reappearing through a side door.

**How to convey:** a short `Code` block showing the correct shape (`import { env } from '@/env'; … env.STRIPE_SECRET_KEY`) contrasted with the smell in one `CodeVariants` (label "Bypasses the schema" with `del=` on the bare `process.env` line / label "Goes through the boundary" with `ins=`). Reference that L6's leak audit already greps for this — here we name *why* it's invariant #1, not just a leak vector: it's the precondition for the other three (a var that never enters the schema can't be split, documented, or validated).

Terms for `Term`: none new here (process.env is familiar).

### Invariant 2 — the server/client split is a firewall, not a label

**Concept:** server-only vars live in the `server` block; browser-exposed vars live in `client` and *must* carry the `NEXT_PUBLIC_` prefix. This is the load-bearing security invariant of the lesson. Two distinct failure modes, two distinct greps:

- **Leak (severe):** a `server` var imported into a Client Component — `@t3-oss/env-nextjs` throws at *build time*, so this is structurally prevented rather than caught in review. Reinforce with `import 'server-only'` at the top of any server-only module (DB client, SDK-with-secret, email sender) — a second structural belt that turns a leaked import into a build error even before the env package fires. This is the "no client-bundled secrets, restated and enforced" point from the outline.
- **Waste (mild):** a `client` var read in a server file — harmless for security but signals confusion; the value is already inlined, no reason to route a server read through it. Worth a one-liner, not alarm.

The hard rule, stated once, bold: **a `NEXT_PUBLIC_*` name is a public promise.** Judge a variable by the *authority it grants*, not by which vendor issued it — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SENTRY_DSN` are public by design (they only identify an account/project); `NEXT_PUBLIC_STRIPE_SECRET_KEY` is a self-contradicting name and a breach. This is the same judgment L6 taught for the leak audit (publishable key / DSN terms) — reference, restate in one line, don't re-derive.

**How to convey:** a `Buckets` exercise (`twoCol`) — the strongest fit for "does this go in `server` or `client`?". Three buckets: **`server` block**, **`client` block (`NEXT_PUBLIC_`)**, **never in the schema**. Items drawn from the student's real variables plus traps:
- `server`: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `INVITATION_SIGNING_SECRET`
- `client`: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`
- never in schema: `NODE_ENV` (framework-provided), a hardcoded literal like a feature-flag boolean that belongs in code not env
Instructions prop: "Sort each variable into where it belongs in `env.ts` — and spot the two that don't belong in the schema at all." Grading is automatic (bucket match). Pedagogical goal: forces the public-vs-secret judgment on concrete names, which is exactly where beginners err.

Terms for `Term`: *publishable key* (public-by-design API key, identifies an account, grants no privileged access — reuse L6's definition), *DSN* (Sentry's public ingest URL). Keep both to one line; they're prerequisites being refreshed, not new teaching.

### Invariant 3 — the schema and `.env.example` describe the same world

**Concept:** `env.ts` (the schema) and the committed `.env.example` must list the same variables. The schema is what the app *validates*; `.env.example` is what a new contributor *copies on day one*. When they drift — a var added to the schema but not the example — onboarding fails silently: the newcomer copies `.env.example`, runs `pnpm build`, and hits the validation error for a variable they were never told existed. Restate the file roles compactly (callback to ch041 L2 and L6): `.env.example` committed with a placeholder + `# source:` comment per var; `.env`/`.env.local` git-ignored, holding real values.

**The schema-as-documentation read** lands here — the payoff of invariants 1–3 together. Because every var is in the schema, the schema *is* the inventory of what the app needs. Show the grown-up `env.ts` grouped by service, the single richest artifact of the lesson, via **`AnnotatedCode`** (the right component: one complex block, attention directed to each group in turn). The block groups the student's accumulated real variables with comment headers — database, auth, email, billing, rate-limit, observability, then the `client` block — and `runtimeEnv`. Steps walk each service group, each step naming which feature/chapter the group traces back to (database → ch041, auth → ch052, email → ch048, billing → ch064, rate-limit → ch074, observability → ch080/092). Use Zod 4 top-level builders throughout (`z.url()`, `z.string().min(1)`, `z.email()` where apt) per code conventions — flag deliberately that we keep server entries minimal/realistic, not exhaustive, to stay readable. One step calls out an **orphaned variable** (a var in the schema no code reads) as a finding — dead config is a documentation lie. Pedagogical goal: the student sees their scattered course-long config collected into one legible map and internalizes "this file answers 'what does this app need'."

Keep the `AnnotatedCode` `maxLines` modest; the code scrolls within the frame, steps scroll the active group into view.

### Invariant 4 — `SKIP_ENV_VALIDATION` is an escape hatch, not a setting

**Concept:** the package honors a `SKIP_ENV_VALIDATION` flag that returns the env object without running a single schema. ch041 L2 named one honest use (a CI build with no secrets present); this lesson sharpens it to the precise rule: **exactly two legitimate places** — (1) a Docker/container image build where server secrets genuinely aren't injected at build time, and (2) a type-check/lint CI job that doesn't need real values. Anywhere else it's the bug.

**The failure mode that makes it dangerous (the key teaching beat):** setting `SKIP_ENV_VALIDATION=1` in *production* runtime env vars (to silence a "missing variable" build error) turns the escape hatch permanent — and now a genuinely missing variable surfaces at *first request* (a 3am 500) instead of at *deploy* (a build failure on your terminal). The escape hatch un-does the entire feature the boundary exists for. State the reflex: if the build says a variable is missing, the variable is missing — set it, don't silence it.

**Add the fact-checked gotcha** (verified against t3-env docs/issues): when validation is skipped, Zod **`.default()` values are not applied** either — so a build that "works" under `SKIP_ENV_VALIDATION` can ship with `undefined` where you expected a default, a second reason it's strictly an escape hatch. One sentence, cite as a real footgun.

**How to convey:** a tiny `Code` snippet of the *correct* use (the Dockerfile/CI line `SKIP_ENV_VALIDATION=1 pnpm build` with a comment naming why), then a one-line `Aside` (caution) for the production-runtime anti-use. No exercise needed — the rule is a single sharp decision.

Term for `Term`: *escape hatch* only if it reads as jargon; likely skip — the section defines it inline.

### When the schema grows up: per-environment variables

**Goal:** two short, real complications that only make sense once the four invariants hold. Keep this section tight — it's the "advanced but necessary" tail, not core.

**Production-only variables.** Some vars are required in production but absent in dev — `STRIPE_WEBHOOK_SECRET`, `SENTRY_AUTH_TOKEN`. The pattern (fact-checked as the official t3-env idiom): branch the Zod schema on `process.env.NODE_ENV === 'production'` — `z.string().min(1)` in prod, `.optional()` (or a default) otherwise. Show as a small `Code` block. Failure mode it prevents: a hard-required `SENTRY_AUTH_TOKEN` would make every local `pnpm build` fail for a var no developer needs locally; making it unconditionally optional would let a prod deploy ship with Sentry silently un-authed. The conditional gives each environment exactly the contract it needs. (This is one of the two sanctioned `NODE_ENV` reads — tie back to invariant 1's exception.)

**The per-environment URL helper.** Some vars *differ per environment* rather than being present/absent — the app's own base URL is local on a laptop, a per-branch URL on a Vercel preview, the real domain in production. Teach a small `getAppUrl()` helper in `/lib` that resolves this: production reads `env.NEXT_PUBLIC_APP_URL` (the canonical source already used by ch058/ch064 for invite/checkout links — do not contradict), previews derive from Vercel's injected URL, local falls back to `http://localhost:3000`. **Fact-checked gotcha to include:** Vercel's `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` are provided *without* the `https://` scheme — the helper must prepend it, and forgetting is the classic broken-link bug. Show as a short `Code` block. Pedagogical goal: the student sees that "single source of truth" extends to *derived* config — the helper is the one place the per-environment branching lives, mirroring why `env.ts` is the one place validation lives. Keep `VERCEL_*` reads inside this helper framed as the narrow framework-internal exception to invariant 1 (Vercel injects them; they're not app secrets), so the invariant stays coherent.

### The env audit: one page, four invariants

**Goal:** the deliverable — roll the four invariants into a repeatable pass, mirroring how L1–L6 each ended with a grep-able artifact feeding ch082. Frame as the synthesis: "every check above is now a line you can run against any codebase, including yours today."

Render as a **`Checklist`** (`id="env-audit"`, the same tickable-audit component L6 used for its leak audit) so the student can literally run it. Items, each one observable check tied to its invariant:

1. **Every access through typed `env`.** Grep `process.env` across the repo; every hit outside `env.ts` (except `process.env.NODE_ENV` and `next.config.ts` framework reads) is a finding. (Invariant 1; same grep L6 check #1 forward-referenced — now it's home.)
2. **Server/client split clean.** No `server`-block var imported in a Client Component (build catches it; confirm `import 'server-only'` guards the secret-bearing modules); no `NEXT_PUBLIC_*` name granting real authority. (Invariant 2.)
3. **Schema and `.env.example` in lockstep.** Diff the variable lists; every schema var has a placeholder + `# source:` line in `.env.example`, and vice versa. Flag orphaned schema vars no code reads. (Invariant 3.)
4. **No `SKIP_ENV_VALIDATION` outside the two sanctioned scripts.** Grep for it; it belongs only in the Docker build and the type-check CI job, never in production runtime env vars. (Invariant 4.)
5. **Production-only vars are `NODE_ENV`-conditional, and the build passes *without* `SKIP_ENV_VALIDATION` in the normal path.** (The extensions section.)

Close with one sentence on where this feeds: this audit, alongside L1's header check, L2's rate-limit matrix, L3's audit-event catalog, L4's retention catalog, L5's consent reject-path test, and L6's leak audit, is one of the deliverables ch082 audits a seeded codebase against. Do not over-explain ch082 — one sentence.

### External resources

Two `ExternalResource` cards (the lesson already has a natural close; keep to the two canonical sources):
- t3-env Next.js docs (`https://env.t3.gg/docs/nextjs`) — `createEnv`, the blocks, `SKIP_ENV_VALIDATION`. (Same card ch041 L2 used; appropriate to repeat as the canonical reference.)
- Vercel system environment variables (`https://vercel.com/docs/environment-variables/system-environment-variables`) — for the `getAppUrl()` helper's `VERCEL_*` reads and the no-protocol detail.

Optionally one more: Next.js environment-variables guide for the `NEXT_PUBLIC_` inlining behavior, only if the firewall section needs the external backup. Prefer two cards over three to keep the close tight.

## Scope

**Already taught — reference, do not re-teach:**
- `@t3-oss/env-nextjs` setup, `createEnv`, the `server`/`client`/`runtimeEnv` blocks, the build-time-failure mechanic and its terminal screenshot, `.env` vs `.env.example` basics, the one-honest-use framing of `SKIP_ENV_VALIDATION` — **ch041 L2**. This lesson revisits through the baseline lens; it does not re-derive the file.
- Zod 4 schema authoring at depth — Unit on Zod (ch042); here Zod appears only as the env schema's validator, using top-level builders per code conventions.
- The four secret-leak surfaces, the Vercel "sensitive" flag, rotation order, Husky + Gitleaks pre-commit scanning, `.env.local` git-ignore, publishable-key/DSN judgment — **ch081 L6** (immediately prior). L7 owns *validation invariants*; L6 owned *where secrets escape*. Reference L6's leak audit; do not reproduce it.
- `import 'server-only'` as a directive — introduced earlier (ch030 server/client boundary, ch081 L6); here it's invoked as the structural reinforcement of invariant 2, not taught fresh.
- `env.NEXT_PUBLIC_APP_URL` as the canonical app-URL source — established ch058/ch064 (invite + checkout links). The `getAppUrl()` helper must build on it, not replace it.

**Deferred — do not teach here:**
- CI integration of the env audit / `.env.example` parity check as an automated pipeline step — **ch097** (the CI hardening chapter); name it as "the second belt in CI," one line, no wiring. (Mirrors how L1/L2/L6 forward-referenced ch097.)
- Vercel's env UI, sensitive flag, adding vars per environment in the dashboard — **ch081 L6**; this lesson is the schema side, not the platform side.
- Multi-tenant / per-customer (white-label) env resolution — out of scope for the course's stage; name once if it arises, otherwise omit.
- KMS / Vault / Doppler / Infisical — out of scope through Series A (L6 already drew this boundary); do not reopen.
- The chapter quiz (L9) covers env invariants — do not embed a recall quiz here; the `Buckets` exercise and the audit `Checklist` are the in-lesson checks.

**Prerequisites to refresh in one line each (concise, do not expand):** what `createEnv` does (validates env against a Zod schema at build time, exports a typed object), why `NEXT_PUBLIC_` exists (the only prefix Next.js inlines into the browser bundle), and that `env.ts` lives at `src/env.ts` imported as `@/env`.
