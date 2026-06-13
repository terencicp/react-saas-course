# Lesson outline — Chapter 092, Lesson 1

## Lesson title

- **Title:** Sentry: capture, releases, and breadcrumbs
- **Sidebar label:** Sentry capture

---

## Lesson framing

This is the chapter opener and its largest lesson (~50–60 min). It cashes in a stub the student already wrote.
In Ch080 L2 ("Two audiences, two messages") the `authedAction` catch already contains a literal `Sentry.captureException(error)` line sitting next to `logger.error(...)`, and that lesson explicitly deferred the wiring to "a later chapter on observability." This is that chapter. The outline must open by pointing back at that exact line so the student feels they are finishing a sentence, not starting a new topic.

**The one mental model to land:** Sentry inverts who has to go looking. Without it, a production throw lands in Vercel's function output as a minified stack with no actor, no domain context, no link to the deploy — and a human has to *grep a tab* to reconstruct "this error hit user X at 14:32 on the Pro billing flow." With it, the error arrives **grouped, source-mapped, release-tagged, user/org-tagged, and breadcrumb-trailed** — pushed at the operator instead of waiting to be found. Every section ties back to one of those five enrichments.

**The load-bearing rule of the whole lesson — the two capture paths.** A server-side error reaches Sentry by exactly one of two routes, and the student must be able to say which fires for any given throw:
1. **Uncaught** throws that hit Next.js's framework boundary (Server Components, route handlers, Server Actions that don't catch) → the `onRequestError` hook in `instrumentation.ts`. The wizard wires this; the student must understand it, not treat it as magic.
2. **Caught-and-handled** throws — the `authedAction`/`authedRoute` wrappers swallow the throw to return a user-safe `Result.err`, so the error *never* reaches `onRequestError` → a manual `Sentry.captureException(err, …)` **inside the catch**, before the return.

This is the single most common omission in real wiring (forget either path and a class of errors silently disappears), so it is the lesson's spine, not a watch-out. Frame it as: *the wizard covers the uncaught path; your wrappers from Unit 6 are the only place the caught path gets covered, and they're already where you'd add it.*

**The second framing thread — wizard floor vs. your domain.** The wizard writes a complete, working *baseline* in one command. The senior contribution is the layer the wizard can't know about: which seams need manual capture, what user/org/plan context to attach, what domain breadcrumbs matter, and what to redact. Teach the wizard fast (it is not the lesson), then spend the lesson on the four enrichments only the engineer can add.

**Tone / stance.** Adult, terse, decision-first (per pedagogical guidelines). Lead each section with the senior question it answers. No celebratory "now you have monitoring!" Avoid re-teaching the user/operator split (Ch080 owns it) — *reference* it as the thing that makes "email is operator-safe, not PII" already-decided.

**Cognitive-load sequencing.** Start from the pain (the 3am minified-stack scenario), install the floor (wizard), then build up enrichment in dependency order: capture paths (the engine) → source maps + releases (makes the stack readable and dated) → user/tag context (makes it filterable) → breadcrumbs (makes it narratable) → `beforeSend` redaction (the safety floor) → cost/sampling discipline (keeps it affordable). Each enrichment answers a question the previous one exposed.

**Code-shape note for downstream agents.** Ground every `authedAction` snippet on the canonical shape from Ch080 L2: `authedAction(role, schema, fn)` returns `(formData) => Promise<Result<TOut>>`; the catch does `const error = ensureError(e)` then `logger.error({ action: fn.name, userId, orgId, role, input: redact(input.data), err: error }, 'action failed')` then `Sentry.captureException(error)` then `return mapError(error)`. This lesson's job is to *enrich* that existing `captureException(error)` call with `{ tags, user }`, not to invent a new shape. Do not contradict that file.

---

## Lesson sections

### Introduction (no header)

Open on the concrete incident, in second person. A Server Action throws in production; the user already sees the generic toast (the user/operator split from Ch080 did its job). But the operator side is currently a *promise*, not a wire: that `Sentry.captureException(error)` line the student wrote in Ch080 L2 imports nothing real yet. Without the wire, the throw is a minified frame in Vercel's function log — `Function.t [as h] (chunk-abc123.js:1:42)` — with no actor and no deploy link.
State the goal plainly: by the end, a deliberate throw from both a Server Action and a client component arrives in Sentry, grouped, with a readable stack, the right release tag, and the user/org context. Preview the two-path rule as the thing that makes that true. Keep it to ~3 short paragraphs.

### What Sentry gives you that a log line can't

The decision section — *why this tool, why now*. Don't sell features; contrast surfaces.
- A `logger.error` line (next lesson) is a flat record you query *if you know what to filter for*. A Sentry event is the same failure **grouped by fingerprint** (47 instances of the same bug collapse into one issue), **source-mapped**, **release-tagged**, **breadcrumb-trailed**, and **assigned to the deploy and author that introduced it**. Errors and logs are two surfaces of one incident (chapter thesis — plant it here, lesson 4 pays it off via the shared `requestId`).
- Name the five enrichments as a roadmap bullet list — they become the section spine.
- **Why Sentry over alternatives** (defaults-before-conditionals): Sentry is the default. Name Bugsnag, Rollbar, Highlight, Honeybadger in *one* sentence with the trigger to flip — *none for the course's target SaaS*. The reason it wins: first-party-quality Next.js SDK that folds release tracking and source-map upload into one wizard and hooks the App Router's `instrumentation.ts`. One line: its session replay exists but Ch093 picks PostHog for replay — don't run both.

Component: plain prose + one `Card`/`CardGrid` or a simple two-column `Figure` (HTML/CSS) contrasting "Vercel function log" vs "Sentry issue" as columns of attributes (grouped / source-mapped / tagged / breadcrumbed / linked-to-deploy). Pedagogical goal: make the *delta* visible, not the tool. Keep it under ~800px tall.

### Running the wizard, and what it writes

Teach the floor fast. The wizard is not the lesson — but the student must not treat its output as magic, so walk every file it touches and label load-bearing vs optional.
- Command: `npx @sentry/wizard@latest -i nextjs`. State what it does: creates the config files, wraps `next.config.ts`, writes the auth-token env, adds the source-map upload to the build.
- **Correction to the chapter outline — verify and teach the *current* file set.** The wizard creates **separate** init files, not a single `instrumentation.ts` that holds `Sentry.init`:
  - `instrumentation-client.ts` — client SDK `Sentry.init` (browser).
  - `sentry.server.config.ts` — server (Node) `Sentry.init`.
  - `sentry.edge.config.ts` — edge runtime `Sentry.init`.
  - `instrumentation.ts` — the Next.js instrumentation file: an async `register()` that imports the server or edge config by `NEXT_RUNTIME`, **and** `export const onRequestError = Sentry.captureRequestError`.
  - `app/global-error.tsx` — error boundary that calls `Sentry.captureException`.
  - `next.config.ts` — wrapped in `withSentryConfig(nextConfig, { org, project, … })`.
  - the auth-token env file (e.g. `.env.sentry-build-plugin`) — git-ignored.
  Downstream agents: do **not** repeat the chapter outline's claim that `Sentry.init` server-side lives in `instrumentation.ts`. It lives in `sentry.server.config.ts`, which `instrumentation.ts` imports. (Confirmed against current Sentry Next.js docs, June 2026.)
- **Load-bearing vs optional.** Load-bearing: the `onRequestError` export, the three `Sentry.init` configs, the `withSentryConfig` wrap, the build upload step. **Keep the tunnel route** (`tunnelRoute` in `withSentryConfig`) — ad-blockers eat the default ingest endpoint, so without it client events silently vanish; this is a default to leave *on*, name it explicitly. **Delete the example page** the wizard adds (it ships a deliberate-error route — fine for the first smoke test, a liability in production).
- **One DSN, both sides.** The client and server SDKs share one DSN. Naming a separate "client DSN" is extra config to maintain for no benefit — name this as the trap (the outline calls it out).

Components:
- `FileTree` (Starlight) showing the project after the wizard, annotated with which files are new. Pedagogical goal: a single glance at the blast radius.
- `Code` for the command.
- A short `AnnotatedCode` on the generated `instrumentation.ts` (`register()` + the `onRequestError` export) — color the `onRequestError` export line to flag it as the one the next section dissects. Keep to ~4 steps.
- `Aside` (tip) for "keep the tunnel route on."

Tooltip terms: `DSN` (the project's ingest key/URL — where events are sent), `tunnel route` (a same-origin proxy route so ad-blockers don't drop the request).

### onRequestError: the uncaught path

The first of the two capture paths, taught explicitly so the wizard's wiring stops being magic.
- What it is: the Next.js 16 framework hook (`onRequestError`, requires `@sentry/nextjs` ≥ 8.28 and Next 15+) that fires for errors Next.js catches at *its* boundary — uncaught throws in Server Components, route handlers, and Server Actions. The wizard binds it to `Sentry.captureRequestError`.
- The key insight, stated as a rule: **without this export, server-side throws that bubble to the framework boundary never reach Sentry.** It is the entire uncaught path.
- Make the boundary concrete: contrast a `page.tsx` Server Component that throws (caught by `error.tsx`, *and* reported via `onRequestError`) vs. an `authedAction` that catches its own throw (never reaches `onRequestError` — hence the next section).

Component: a `DiagramSequence` (or a single `Figure` with an HTML/CSS two-lane diagram) showing one throw taking the uncaught lane to `onRequestError` → Sentry, foreshadowing the second lane greyed out. Pedagogical goal: spatially separate the two paths *before* naming the second, so the "two paths" rule has a picture to attach to. This sets up the next section's payoff.

Tooltip term: `onRequestError` is better explained inline than as a tooltip (it's the section topic) — skip.

### captureException inside your wrappers: the caught path

The lesson's spine. This is where the Ch080 stub becomes real.
- The problem restated: `authedAction`/`authedRoute` exist *to catch* the throw and return `Result.err`. That catch is doing its job — and in doing it, the error never bubbles to `onRequestError`. So the wrapper is the **only** place the caught path can be covered.
- Show the canonical Ch080 catch with the `Sentry.captureException(error)` line, then **enrich it** to the lesson's target shape:
  ```ts
  Sentry.captureException(error, {
    tags: { seam: 'authedAction', action: fn.name },
    user: { id: ctx.user.id, email: ctx.user.email },
  });
  // plus org/role context via tags or scope — see context section
  ```
- The rule to land verbatim: **every catch-and-handle seam calls `captureException`; every uncaught throw rides `onRequestError`.** Because the split lives in the *wrapper* (Ch080's payoff), the student wires this in one place and every action inherits it — reinforce: an action that bypasses `authedAction` skips not just fail-closed and the message split but Sentry capture too.
- Name `withServerActionInstrumentation` in one sentence: Sentry's wrapper that adds a performance *span* around an action and groups by action name; reach for it when an action needs a trace, but basic error capture works without it. Not wired here.
- Tie the import back: the `Sentry` import the student stubbed in Ch080 now resolves to `@sentry/nextjs`.

Components:
- `CodeVariants` with two tabs: **"Before (the Ch080 stub)"** = the bare `Sentry.captureException(error)` line in context, and **"After (enriched)"** = the same catch with `tags` + `user`. Pedagogical goal: the diff *is* the lesson; the student sees exactly what they add.
- Reuse/extend the two-lane diagram from the prior section, now lighting up the *caught* lane → `captureException` → Sentry, so both lanes converge on the same Sentry issue. This is the visual payoff of the two-path rule.

Exercise: a `MultipleChoice` (or a tight `Buckets` with two buckets "→ onRequestError" / "→ manual captureException") sorting ~5 realistic throw sites: (a) an uncaught throw in a Server Component, (b) a `Result.err` returned from `authedAction` after a caught DB error, (c) a route handler that rethrows, (d) a webhook handler that catches a signature mismatch and returns 400, (e) an unhandled rejection in a client component. Goal: the student can route any throw to its path. Grading: each item maps to exactly one path (the webhook/`authedAction` ones are the caught path because they swallow; the client one is neither server path — flag it as the client SDK's job, foreshadowing the client/server section).

### Source maps and releases: a readable, dated stack

Two enrichments that travel together; both wired by the wizard but each needs the student to verify one thing.
- **Source maps.** Production JS is minified — the raw frame is `chunk-abc123.js:1:42`. The wizard's build step uploads source maps so Sentry rebinds the trace to original `.ts` source. Verify: the `authToken`, and the `org`/`project` slugs in `withSentryConfig`. **CI uploads source maps; local dev does not** (no value, slows the build) — name this so the student doesn't expect symbolicated local traces.
- **Releases.** A "release" tags every event with the deploy it shipped in. The current Sentry guidance (verify): the release name is best derived from the commit SHA via the `SENTRY_RELEASE` env (so it attaches to source maps too); on Vercel the SHA is available as `VERCEL_GIT_COMMIT_SHA`. The payoff: **"first seen in release X by author Y"** turns a regression into a one-line bisect — the deploy that introduced it is named for you.
- **The Sentry–Vercel integration** (wired once): connecting the projects auto-injects `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN` into Vercel and notifies Sentry on every deploy — so the student can skip the manual CLI token step. Mention as the recommended path; the manual env path is the fallback.

Component: a small before/after `Figure` (HTML/CSS or two stacked `Code` blocks via `Tabs`/`CodeVariants`) — **minified frame** vs **symbolicated frame with file/line and the release pill**. Pedagogical goal: make "what source maps + releases buy you" a single visual, not an abstraction. Keep prose tight; this is verification, not theory.

Tooltip terms: `source map` (the file mapping minified output back to original source lines), `release` (a Sentry label binding events to a specific deploy/commit).

### User, org, and tags: making errors filterable

The enrichment that turns a pile of events into a queryable surface — and the one place the lesson touches PII, lightly, by *reference* to Ch080.
- `Sentry.setUser({ id, email, orgId })` after auth (or via scope inside the action). Sentry then groups errors per user and lets the operator filter "all errors for user X this week" — the input to BUG-SLA dashboards.
- **Email is operator-safe context here, not PII to redact** — state this as *already decided* by Ch080 L2's user/operator split (internal IDs + emails live on the operator side). One sentence, with a back-reference; do not re-argue it.
- Custom tags earn filtering weight: `plan: 'pro'`, `feature: 'invoicing'`, `seam: 'authedAction'`. The discipline: **tags are low-cardinality filter dimensions.** Don't put secrets in tags; don't put high-cardinality one-offs (a `requestId`, a full URL) in tags — those go in `extra`/`context`. Plant the `requestId`-as-context idea lightly (lesson 4 makes it the Sentry↔logs join key; here just say it rides as context/tag and is the future pivot anchor).
- Where context is set: prefer `Sentry.setUser`/scope at the request entry (or inside the wrapper alongside `captureException`) so every event in the request inherits it.

Components:
- `Code` for the `setUser` + tags calls.
- Optional `Screenshot` of a Sentry issue list filtered by a tag (only if a clean capture is available — otherwise skip; do not fabricate UI). If used, wrap in `Figure`.

Exercise: a small `Buckets` — "tag (low-cardinality filter)" vs "context/extra (high-cardinality one-off)" vs "never log (secret)" — sorting ~6 fields: `plan`, `orgId`, `requestId`, `Stripe API key`, `feature name`, `full request URL`. Goal: the cardinality/secret instinct. Grading: secrets→never; ids/plan/feature→tag; requestId/URL→context.

Tooltip term: `cardinality` (the count of distinct values a field can take; high-cardinality fields blow out grouping/quota).

### Breadcrumbs: the trail that led to the throw

The enrichment that makes an event *narratable* — and the section most prone to a beginner mistake (confusing breadcrumbs with logs).
- What they are: a capped, ordered trail of recent events attached to *this* error and dropped after it fires. Sentry auto-captures some (navigation, fetch, console). They answer "what happened just before."
- **The crisp distinction to land:** breadcrumbs are *per-event, ephemeral context that ships with the error*; logs (next lesson) are *persistent, queryable lines that exist whether or not anything throws*; the audit log (Ch081) is *durable domain events for compliance*. Three different stores, three different lifetimes. State this explicitly — it's the section's whole point and a classic confusion.
- Custom breadcrumbs add domain context where the stack alone won't explain the failure: `Sentry.addBreadcrumb({ category: 'invoice', message: 'Loaded invoice for billing', data: { invoiceId } })`. Reach for them in: webhook handlers (event id + type), background jobs (job id + input shape), multi-step actions (which step ran). The decision rule: *add a breadcrumb where the failure context isn't recoverable from the stack.*

Components:
- `Code` for an `addBreadcrumb` call.
- A `DiagramSequence` OR a single `Figure` (HTML/CSS timeline) showing a Sentry event panel: breadcrumb trail (navigate → loaded invoice → clicked pay) terminating in the exception. Pedagogical goal: make "trail leading to the throw" literal, and visually contrast the *bounded* trail against the open-ended log stream shown conceptually beside it. This is the best vehicle for the breadcrumb-vs-log distinction.

Exercise: a `TrueFalse` round (4–5 statements) hammering the breadcrumb/log/audit-log distinction (e.g. "Breadcrumbs are queryable across all events" → false; "A breadcrumb is dropped after its event fires" → true; "Use a breadcrumb to record a successful payment for compliance" → false, that's the audit log). Goal: cement the three-store mental model.

### Sentry on the client, and from your error boundaries

Consolidate the client side and the `error.tsx`/`global-error.tsx` reach — both are "the other surfaces a throw can come from."
- **Client vs server SDK.** `instrumentation-client.ts` = client SDK; `sentry.server.config.ts`/`.edge` = server/edge, registered by `instrumentation.ts`. Both share **one DSN** and the **same release tag**, so a client error and a server error on the same deploy group under one release. The client SDK auto-captures unhandled rejections and console errors (`captureConsoleIntegration`); the server SDK captures via `onRequestError` + manual `captureException`. This closes the loop on the exercise item (e) from the caught-path section: the client unhandled rejection is the client SDK's job, neither server path.
- **The error boundaries from Ch031.** `error.tsx` and `global-error.tsx` receive the `error` prop. The wizard wires `Sentry.captureException(error)` in `global-error.tsx`'s `useEffect` — **but not in segment `error.tsx` files; the student adds those.** Name the omission explicitly (the outline flags it as a common miss).
- **`digest` is the correlation anchor.** Next.js passes a `digest` to the boundary for server-side errors; it's how the client boundary's report and the server-side event group. Thread `digest` through when capturing from `error.tsx` so server-side grouping isn't lost.

Components:
- `CodeVariants` — two tabs: `global-error.tsx` (wizard-provided, the `useEffect` capture) and a segment `error.tsx` (what *you* add, including `digest` in the capture). Pedagogical goal: separate "given" from "your job."
- `Aside` (caution) for the segment-`error.tsx` omission.

Tooltip term: `digest` (the opaque hash Next.js attaches to a server error so client and server can correlate it).

### beforeSend: the redaction floor and keeping the quota sane

Fold the two "safety/economics" concerns into one closing operational section — they share the "don't let Sentry hurt you" frame.
- **`beforeSend` redaction.** A last-line hook on every event before send. Reach for it to strip what the integration might capture incidentally: request bodies on transactions, query strings with tokens. The course's reach: strip `password`, `token`, `apiKey`, `Authorization` from event request data; **let user emails and IDs through** (operator side). State this is the *same redaction posture as the logger* (lesson 3 owns the full rule) — one denylist concept, two enforcement points (Sentry `beforeSend` + pino `redact`). Reference, don't re-teach.
- **Sampling.** `tracesSampleRate` and `replaysSessionSampleRate` cost more than error events. The chapter's wiring: **100% errors, 0% traces, 0% replays.** Reach for trace sampling when performance traces earn weight (Ch094); replay is owned by Ch093/PostHog — **don't ship Sentry Replay alongside PostHog Replay.** State the defaults as defaults, with the trigger to raise them.
  - **Flag the divergence from the wizard/docs default.** Current Sentry docs seed `tracesSampleRate: 0.1` in production; this chapter deliberately sets it to `0` because traces are owned by Ch094 and the chapter's floor is errors-only. The writer must state this is an intentional course choice (turn the wizard's `0.1` down to `0` for now), not silently contradict the value the student sees in Sentry's own docs. (Verified June 2026, `@sentry/nextjs` 10.x.)
- **Cost & quota discipline.** Free tier ≈ 5k errors/month; the team plan starts where it earns. The quota-bust shapes worth naming: a tight loop calling `captureException`, a webhook signature mismatch firing on every retry, a missing-tag high-cardinality group. The reaches (named, not drilled): `level: 'warning'` for trackable-but-non-actionable events; fingerprinting via `Sentry.withScope(scope => scope.setFingerprint([...]))` on known-noisy errors (one mention — deep fingerprinting is out of scope).

Components:
- `Code` for a minimal `beforeSend` and the `Sentry.init` sample-rate options (show `tracesSampleRate: 0`, `replaysSessionSampleRate: 0` with a comment on when to raise).
- `Aside` (caution) on the quota-bust shapes.

### Verifying the wire end to end

Close on the verification the introduction promised — the student must not rely on "the wizard said it worked." This is the lesson's concrete payoff and sets the shape the Ch095 project will automate.
- The drill: throw a deliberate error from (1) a Server Action and (2) a client component; confirm both events arrive **grouped**, with **readable (source-mapped) stacks**, the **correct release tag**, and the **user/org context**. Map each check back to the section that wired it (capture path → source maps → release → context) so verification doubles as recap.
- Note the deliberate error should be removed after (or use the wizard's example route once, then delete it).

Components:
- `Steps` (Starlight) for the verification procedure.
- Exercise — a `Sequence` ordering drill: the on-call reconstruction order once an event exists — *open the grouped issue → read the symbolicated stack → check the release/author → read the breadcrumb trail → filter by the user/org tag*. Source order is correct order. Goal: rehearse the workflow the enrichments exist to enable, and preview lesson 4's Sentry→logs pivot (the final step becomes "copy the requestId → jump to the log drain"). Pedagogical goal: the lesson ends on the *use* of what was wired, not the wiring.

### External resources (optional, end of lesson)

One or two `ExternalResource` cards: the Sentry Next.js SDK manual-setup docs (canonical, for the file details that age) and the Sentry–Vercel integration doc. Keep to the two most durable references.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- The user/operator message split and the `authedAction`/`authedRoute` catch shape — Ch080. This lesson *enriches* the existing `Sentry.captureException(error)` stub; reference it, don't rebuild it.
- `error.tsx` / `global-error.tsx` and the `digest` prop — Ch031. Reference the boundary contract; don't re-explain Error Boundaries.
- `Result<T>` / `ensureError` / `mapError` — Unit 6 / Ch080. Use them as given.

**This lesson does NOT cover (defer, with owner):**
- The structured-log discipline, the fixed JSON key set, `pino` setup, AsyncLocalStorage, and the `requestId` *generation/threading* — lesson 2. Here the `requestId` is mentioned only as a future Sentry-context/join anchor; do not set up the logger or ALS.
- The full PII/secret exclusion rule and the structural `redact` config — lesson 3. This lesson shows `beforeSend` as Sentry's enforcement point and names the *same posture*, but the canonical denylist and the 3am rule live in lesson 3.
- Log destinations, Vercel Drains, Axiom, and the actual Sentry→logs pivot UI — lesson 4. Here the pivot is *foreshadowed* (shared `requestId`) only.
- The VS Code inspector / `node --inspect` debugging workflow — lesson 5.
- PostHog and session replay (and why not to double up on replay) — Ch093. Named once as the reason Sentry Replay stays off.
- Performance traces at depth, `tracesSampleRate` tuning, RSC waterfalls in traces — Ch094. Here trace sampling is `0` with a forward pointer only.
- Error fingerprinting / deduplication beyond the single one-line mention — out of scope.
- The audit log (durable compliance events) — Ch081; named only to contrast with breadcrumbs/logs.
- The end-to-end "wire it in the real app" build — Ch095 project; this lesson asserts the verification *shape*, the project executes it.

---

## Code conventions to honor (downstream agents)

- `type` not `interface`; arrow-functions-as-`const` except framework-named default exports (`instrumentation.ts`'s `register`/`onRequestError` exports follow the framework convention).
- Single quotes, 2-space indent, trailing commas, semicolons, 80-col (Biome).
- Two positional params max → options object (the `captureException(err, options)` shape already complies).
- `import type` for type-only imports; `@/*` path alias for app imports.
- `ensureError(e)` to normalize `catch (e)` — never `catch (e: any)`. Reuse, don't redefine.
- Env access via the typed `env` object (`@t3-oss/env-nextjs`) where the lesson shows `SENTRY_*` / `NEXT_PUBLIC_SENTRY_DSN` reads — but the wizard/Vercel-integration writes raw envs, so it's acceptable to show `process.env.VERCEL_GIT_COMMIT_SHA` at the Sentry-config seam (config files sit outside the app's env schema; note this as deliberate so it doesn't read as a violation).
- **Deliberate pedagogical divergence to flag in-line:** the `authedAction` snippets are *paraphrased/trimmed* to the shape that matters (matching Ch080's own note), not literal source. Mark new/changed lines with `// new` / `// changed` per pedagogical §4 when showing the enrichment diff.
