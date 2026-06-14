# Chapter 095 — Lesson 3 outline

## Lesson title

Page title: **Wire Sentry** (chapter-outline title fits — short, names the deliverable).
Sidebar: **Wire Sentry**.

## Lesson type

`Implementation` — the student wires Sentry against the lesson-3 test gate, then verifies the deliberate throw lands decoded in the dashboard. The test-coder fills `tests/lessons/Lesson 3.test.ts`.

## Lesson framing

The student installs the canonical Next.js 16 Sentry setup across client/server/edge and walks away knowing the two decisions that decide whether crash reporting is *useful* rather than just present: a release tag computed from the deploy's commit SHA (so a regression maps to the deploy that caused it) and source-map upload gated on `SENTRY_AUTH_TOKEN` (so a 3am stack trace reads as file+line, not `line 1 column 12345`). The senior payoff is reading the Sentry wizard's output and being able to defend every `withSentryConfig` flag — not pasting wizard defaults blind. Closes observability finding 1: the deliberate throw at `/api/test/throw` reaches the dashboard tagged, breadcrumbed, and source-mapped.

## Codebase state

**Entry** — the lesson-1 starter boots: marketing page, authed dashboard, invoice list, seeded as `org_acme` (~30 customers, 240 invoices, ≥3 members), signed in as `alice@example.com`. Lesson 2 has filled `findings/007-missing-priority.md` as the reference shape and toured the eight finding clusters. Sentry is unwired — no `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, or `sentry.edge.config.ts`; `next.config.ts` exports a bare `nextConfig` carrying a `TODO(L3)`; `src/env.ts` lacks all five Sentry keys behind a `TODO(L3)`. `/api/test/throw` exists in both trees and renders the default Next.js error page with no captured event.

**Exit** — the four Sentry files exist, `next.config.ts` is wrapped with `withSentryConfig`, and `src/env.ts` carries the five Sentry keys (DSN on the client partition, the rest server-only, all optional). Hitting `/api/test/throw` produces a Sentry event tagged with the release, with navigation breadcrumbs and a source-mapped stack trace. `findings/001-sentry-not-wired.md` Fix section is filled. The logger redactor and the `requestId` correlation join are NOT done yet — they land in lesson 4 (the server config's `beforeSend` is added there). The app still boots clean.

## Lesson sections

Implementation type — section order from the contract: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: wire Sentry so a deliberately thrown error reaches the dashboard decoded. Then a one-paragraph (or `Screenshot`) description of the finished surface: the Sentry issue for `Sentry smoke test`, release matching the current commit SHA, navigation breadcrumbs, a readable file+line stack trace. No mechanics here — those live in *Your mission* / *Coding time*.

### Your mission

Prose paragraph (no subsection headers, no implementation hints), weaving:

- **Feature.** The audit target ships `@sentry/nextjs` but no wiring — errors either vanish or arrive as minified noise no one can act on at 3am. Install the canonical Next.js 16 Sentry setup and prove it end to end against the provided `GET /api/test/throw`.
- **Constraints (non-functional, shape the solution).** The fast path is the Sentry wizard (`npx @sentry/wizard@latest -i nextjs`); the senior move is to read its output and defend every `withSentryConfig` flag rather than accept it blind. Two traps decide usefulness: source-map upload depends on `SENTRY_AUTH_TOKEN` at build time (without it, stack traces stay minified and the event is unreadable), and the release must be computed from the deploy's commit SHA — a hardcoded `"v1.0.0"` ties a week of errors to one release. The wizard sets `tracesSampleRate: 1.0`; keep 1.0 locally for visibility, but note production drops to 0.1–0.2 (link lesson 1 of chapter 092).
- **Out of scope.** One line: this lesson installs Sentry only — the `redact` seam and the `requestId` correlation join that also live in `beforeSend` are lesson 4's work.

Then **Functional requirements** as a numbered list, each tagged `[tested]`/`[untested]` (phrased as outcomes, never as files/exports). Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip. The lesson-3 test is a source-shape probe (node env, `readFileSync`, no DOM, no live Sentry round-trip) per the test stub — so live-dashboard outcomes are `[untested]`:

1. `[tested]` Client, server, and edge Sentry initializers each exist and call `Sentry.init` with the DSN, a trace sample rate, and a release computed from the commit SHA with a `'dev'` fallback (not hardcoded).
2. `[tested]` The boot instrumentation hook exposes `onRequestError` so uncaught server/route/action throws are captured (without it `/api/test/throw` produces no event).
3. `[tested]` The build config is wrapped with `withSentryConfig` carrying only `silent`, `org`, `project`, `widenClientFileUpload` — so a build with `SENTRY_AUTH_TOKEN` set uploads source maps.
4. `[tested]` The five Sentry env keys are declared (`NEXT_PUBLIC_SENTRY_DSN` client-readable, the rest server-only, all optional; release defaulted to the commit SHA / `'dev'`).
5. `[tested]` `findings/001-sentry-not-wired.md` Fix section is filled, naming the installed seam and the build wiring that now governs every captured error (with all four rule/location/consequence/fix sections present).
6. `[untested]` Hitting `/api/test/throw` lands an event in the Sentry dashboard within ~60 s, tagged with the release matching the current commit, carrying navigation breadcrumbs. (Requires a live free-tier Sentry DSN — covered only by hand.)
7. `[untested]` That event's stack trace is readable (file + line, not a minified column offset), confirming source maps uploaded. (Requires `SENTRY_AUTH_TOKEN` at build time — by hand.)

Note for the writer: the brief contains no hints (no flag names, no file names) in the *prose*; the requirements list phrases outcomes. The flag-level rationale lives in *Coding time*.

### Coding time

One line directing the student to implement against the brief and the lesson tests, then read the reference solution. The writer wraps the whole solution body in `<details>` (collapsed).

Reference implementation, organized as it sits in the repo. All four files are short — use `Code` for each; reach for `AnnotatedCode` only on `next.config.ts` (to direct focus to the four-key `withSentryConfig` call vs. the surrounding pre-existing config) and on `src/env.ts` (DSN on client partition vs. server-only keys vs. the SHA-defaulted release). Files, in repo order:

- `instrumentation.ts` — `register()` lazy-imports the matching config by `NEXT_RUNTIME` (`nodejs` → `./sentry.server.config`, `edge` → `./sentry.edge.config`); exports `onRequestError = Sentry.captureRequestError`. Rationale: `Sentry.init` lives in the `sentry.*.config.ts` files, not inline, so the Node SDK never loads in the edge runtime and vice versa; `onRequestError` is the load-bearing export that captures framework-boundary throws that never reach a try/catch.
- `instrumentation-client.ts` — client `Sentry.init` (DSN, release, `tracesSampleRate: 1.0`) plus the exported `onRouterTransitionStart = Sentry.captureRouterTransitionStart` (required by Next.js 16 to instrument client router navigations). Rationale: one DSN covers client and server — a separate client DSN is the trap (extra config to maintain).
- `sentry.server.config.ts` — for THIS lesson show only the bare `Sentry.init` (DSN, `release`, `tracesSampleRate: 1.0`), and add a one-line callout that the `beforeSend` redact + `requestId` join arrive in lesson 4 (the repo's committed solution already carries that `beforeSend` because it is the lesson-4 end state). The writer must NOT paste the `beforeSend` here — it would import `redact`/`getRequestContext`, which don't exist yet at this lesson's exit.
- `sentry.edge.config.ts` — `Sentry.init` (same DSN/release/sample rate as server) so events from both runtimes group under one deploy.
- `next.config.ts` — `withSentryConfig(nextConfig, { silent: true, org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, widenClientFileUpload: true })`. For this lesson, show ONLY the Sentry wrapper edit (the `experimental.optimizePackageImports` line in the committed solution is lesson 6's barrel fix — exclude or grey it out). Rationale (one or two sentences each): only these four keys — `hideSourceMaps` was removed in `@sentry/nextjs` v9+ (hidden source maps are the default now) and `disableLogger` is deprecated/inert under Turbopack; `widenClientFileUpload` uploads more App Router client chunks so browser stack traces decode too; `org`/`project` slugs read `process.env` directly, outside the env schema.
- `src/env.ts` additions — `NEXT_PUBLIC_SENTRY_DSN` (client partition, optional), `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` (server, optional), `SENTRY_RELEASE` (server, defaulted to `process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'`). Rationale: all optional so dummy local values pass and the SDK no-ops when the DSN is absent; the upload is gated on the token, so an empty token skips upload rather than failing the build. Callout (`Aside`): the Sentry config files read `process.env` directly because they run before the `createEnv` boundary — the env entries document and validate the shape, they are not the read path.

Cover the `[untested]` requirement coverage explicitly: how `findings/001-sentry-not-wired.md` Fix section is written (the rule is lesson 1 of chapter 092: Sentry across client/server/edge with source maps + release tags + breadcrumbs; the Fix names the seam — the four config files + the `withSentryConfig` wrapper + the SHA-derived release — not a diff, per chapter 082's template).

Callout on the wizard: the student should be able to defend the wizard's output, not accept it blindly — name `hideSourceMaps`/`disableLogger` as the two flags a wizard or stale tutorial might still emit that should be dropped. The Vercel Log Drain note (lesson 4 of chapter 092) is surfaced here as a deploy-time follow-up, not exercised locally.

For Sentry concepts (init shape, breadcrumbs, source-map decode, release strategy), link lesson 1 of chapter 092 rather than re-explaining. External resources (if any) appended after the `<details>`, no header, added later by the resourcer.

### Moment of truth

Test command and expected pass. The `Code` block shows:

```
pnpm test:lesson 3
```

Expected output: a clean pass (the lesson-3 `describe` for finding 001 green; Vitest summary `Test Files 1 passed`, all assertions passing). Named surface: the **Sentry dashboard**.

By-hand checklist (`Checklist`/`ChecklistItem`) for what the source-shape tests cannot reach — the `[untested]` requirements:

- [ ] Hitting `/api/test/throw` lands an event in Sentry within ~60 s.
- [ ] The event is tagged with the release matching the current commit SHA.
- [ ] The event carries navigation breadcrumbs.
- [ ] The stack trace is readable (file + line) — a `line 1 column 12345` stack means `SENTRY_AUTH_TOKEN` was missing at build time.
- [ ] `findings/001-sentry-not-wired.md` Fix section names the installed seam.

No diagram needed — the flow (throw → `onRequestError` → Sentry) is carried by prose plus the finished-surface screenshot.

## Scope

- The `redact` logger seam and the `requestId` correlation join (the `beforeSend` body and `src/lib/request-context.ts`) are **not** wired here — lesson 4 (The production logger seam) owns them.
- The barrel-import fix (`experimental.optimizePackageImports` in `next.config.ts`) is **not** added here despite living in the same file — lesson 6 (Document the performance findings) owns it.
- PostHog consent gating — lesson 5.
- CI source-map-upload verification and bundle-size gates — chapter 097 (forward reference only).
- Production trace sampling tuning (0.1–0.2) — named as a note, owned by lesson 1 of chapter 092; not exercised locally.
