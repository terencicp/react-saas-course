## Concept 1 — Errors and logs are two surfaces of one incident

**Why it's hard.** Students treat error monitoring and logging as parallel tools, pick one, and miss the join. The senior model is dual-surface: Sentry tells you *what threw*, the log destination tells you *what happened before the throw*, and the `requestId` is the seam between them. Without that join, the on-call grep tab is the whole workflow.

**Ideal teaching artifact.** A reconstructed incident artifact, shown as a fixed, side-by-side dashboard mock: the left panel is a real-shape Sentry event (stack frame, user, release, breadcrumbs); the right panel is a stream of structured JSON log lines for the same request, scrollable. A pinned `requestId` highlight bridges both panels. The student reads top-down: the stack trace alone is mute (what was the upstream Stripe response? what step succeeded?), the log narrative alone is voluminous (which line is the failure?), only together do they reconstruct the bug. Concept archetype — *Incident reconstruction* (a new shape: a frozen post-mortem the student inspects, not a tool the student configures yet).

**Engagement.** A short multiple-choice round after the artifact: given three questions an on-call would ask ("which deploy introduced this?", "what was the rate-limit headroom at 14:32?", "which org is affected?"), pick which surface answers each — Sentry, log destination, or both joined by `requestId`. Locks the dual-surface model before any setup begins.

**Components.**
- Hand-SVG inside `Figure` — the two-panel dashboard mock with the highlighted `requestId` thread. Static, but visually heavy and load-bearing for the rest of the chapter; this is the spine image students return to.
- `MultipleChoice` for the three-question engagement round.

**Project link.** The 20.4 project's on-call drill against eight seeded issues lives or dies on this dual-surface model — the student must look at both panels to file each finding.

---

## Concept 2 — The two-path Sentry rule (`onRequestError` vs. manual `captureException`)

**Why it's hard.** The wizard wires `onRequestError` and the student assumes Sentry is "on." But the `authedAction` wrapper from Chapter 7 catches every server-action throw to return the user-safe `Result.err` — and a caught error never reaches `onRequestError`. Handled errors silently disappear from Sentry. The failure mode is invisible: it looks like the wiring works, until the operator can't see the bug class that bites most often.

**Ideal teaching artifact.** A control-flow diagram of one server action invocation that branches on whether the throw is caught or not, with two parallel paths to Sentry: the uncaught throw rides Next.js's framework boundary into `onRequestError`; the caught throw inside `authedAction`'s `try/catch` reaches Sentry only if the catch calls `Sentry.captureException(err, { tags, user })` before returning the user-safe result. The diagram shows both paths terminating at the same Sentry event store, with a third "missing path" — the catch *without* `captureException` — drawn as a dead-end, the most common omission. Pattern archetype with a wrong-by-default emphasis.

**Engagement.** A `Buckets` sort: present eight code seams from the codebase (a route handler `try/catch`, a webhook signature failure, an unhandled throw in a server component, a `Result.err` return after a Zod parse failure, etc.). Bucket each as "reaches Sentry via `onRequestError`," "needs manual `captureException`," or "deliberately swallowed, no Sentry." The misclassification rate exposes which seams the student would have left silent.

**Components.**
- `ArrowDiagram` inside `Figure` — the two paths plus the dead-end branch. Box-and-arrow is the right form here; the relations are topological.
- `Buckets` for the seam classification.
- `Code` with `CodeVariants` showing the `authedAction` wrapper in both shapes — without `captureException` (broken) and with (fixed).

**Project link.** 20.4.3 wires Sentry across client/server/edge with the redactor seam; the student who internalized this concept won't leave the wrapper-catch path silent.

---

## Concept 3 — Source maps, releases, and the deploy-to-event link

**Why it's hard.** Production stack traces read `Function.t [as h] (chunk-abc123.js:1:42)` — unreadable. Students who've never seen the post-build artifact don't internalize *why* the build step uploads source maps, or why a release tag matters until the regression hits and they can't pin the bad deploy.

**Ideal teaching artifact.** A before/after pair, shown as two stacked stack traces of the same throw: minified ("what's `t [as h]`?") vs. source-mapped ("oh, `processInvoiceWebhook` line 47"). Below them, a release-to-event timeline showing three deploys (commits a1b, c2d, e3f), each tagged on the Sentry events that fired in its window. A regression spike appears in deploy c2d's window, with the author name annotated — the diagnostic anchor lands by sight. Concept archetype reinforced with a concrete artifact.

**Engagement.** A short `PredictOutput`-style round: given a minified frame and the source map binding, predict the original file:line. One easy, one with inlined function, one across a transpiled async boundary. Confirms the student knows what the upload step pays for.

**Components.**
- Hand-SVG inside `Figure` — the stacked traces plus the release timeline. Single-use; not worth a bespoke component when the layout itself carries the meaning.
- `PredictOutput` for the source-map-binding round.

**Project link.** 20.4.3 explicitly ships source maps and release tags; the student treats this as a verification checklist, not a hope.

---

## Concept 4 — Breadcrumbs vs. logs vs. audit log

**Why it's hard.** Three persistent surfaces look alike from the call site: `Sentry.addBreadcrumb`, `log.info`, and the `auditLog.append` from Chapter 17.2.3. Students conflate them and either log everything as breadcrumbs (lost on success), audit-log everything (legal storage of debugging chatter), or breadcrumb-only the things that should be queryable. Each surface has a distinct retention, scope, and audience.

**Ideal teaching artifact.** A three-column comparison table, but built as a `TabbedContent` panel where each tab opens one surface and shows: scope (per-event / per-request / per-domain-event), retention (until event fires / 30 days / years per legal basis), audience (operator at incident triage / operator on dashboards / regulator / support), query shape (Sentry event UI / log destination query / audit log query), and three example call sites that belong on this surface and not the others. The student sees the same fictional sign-in flow rendered as breadcrumbs, then as log lines, then as audit events — same flow, three shapes, three reasons. Decision archetype.

**Engagement.** A `Buckets` sort of twelve example events (`webhook signature verified`, `user signed in`, `cache miss for org_123`, `plan upgraded from free to pro`, `Stripe API returned 502`, `password changed`, etc.) into the three surfaces. The high-friction items (`password changed` → audit log, not log; `cache miss` → log, not breadcrumb-only) calibrate the rule.

**Components.**
- `TabbedContent` for the three-surface comparison.
- `Buckets` for the twelve-event sort.

**Project link.** 20.4's findings template asks the student to name *which* surface each finding's evidence comes from; the model installed here makes that field unambiguous.

---

## Concept 5 — Why structured (JSON), not strings, with a fixed key set

**Why it's hard.** Junior habit is `console.log('user ' + userId + ' did X at ' + Date.now())`. The string is grep-only — joins, filters, dashboards, and TTLs all collapse to substring search. The fixed-key-set discipline is what turns logs from a forensic last resort into a queryable surface, but the cost feels arbitrary until the student tries to query the destination.

**Ideal teaching artifact.** A side-by-side query panel: the same fictional question — "how many errors did org_123 have in the last hour, grouped by action name" — answered against a string-log shape (impossible, the destination can only `contains "org_123"` and the action name is buried mid-message) and against a JSON-log shape with the fixed key set (one query, `level:error AND orgId:"org_123" AND _time > now-1h | stats count by actionName`). The query syntax doesn't need to be precise — what lands is the cost asymmetry. Concept archetype.

**Engagement.** `Dropdowns` over a sample log line where the student fills the fixed key set's blanks for a webhook-handler scenario — given the situation, what's `level`, `msg`, `requestId`, `userId?`, `orgId?`, what goes in domain-specific keys. Confirms the student can author the shape, not just recognize it.

**Components.**
- `TabbedContent` with two tabs (string vs. JSON) for the query comparison; hand-SVG of the destination query result inside each tab.
- `Dropdowns` for the key-set fill-in.

---

## Concept 6 — The `requestId` correlation thread via AsyncLocalStorage

**Why it's hard.** The mechanics — generate at entry, attach to ALS, child-logger reads from store — read as plumbing. Students miss the load-bearing claim: *every log line emitted anywhere in the call stack carries the request keys without per-call-site discipline*. They also miss why ALS specifically (and not request-passing or globals): React Server Components, deep helper calls in `/lib`, and webhook handlers all run inside the same async context and the propagation has to survive every `await`.

**Ideal teaching artifact.** A scrubbable sequence of one request's life through the server. Frame 1 — request hits `proxy.ts`, `requestId` generated, ALS `run` wraps the handler. Frame 2 — handler calls a server component which calls a `/lib` helper which calls Drizzle; the ALS context is highlighted as a persistent envelope around every frame. Frame 3 — the helper logs; `logger.child(als.getStore())` produces a child logger and the emitted JSON line shows `requestId`, `userId`, `orgId` all populated without the helper having known about them. Frame 4 — the handler returns; the ALS envelope dissolves with the request. The student scrubs forward and back, seeing how the same envelope wraps every nested call. Mechanics archetype rendered as scrollable mechanism.

**Engagement.** A short `Tokens` exercise on a real `proxy.ts` snippet — click the line that establishes the ALS context, the line that reads it, and the line that would silently break propagation if removed. Locks the entry-seam awareness.

**Components.**
- `DiagramSequence` with four hand-SVG frames for the request's life through the server. The existing component is the right fit — temporal scrub is the lesson.
- `Tokens` on the `proxy.ts` snippet.

**Project link.** 20.4.3 has the student build the `proxy.ts` correlation-ID middleware end-to-end; this concept is the why before that wire.

---

## Concept 7 — The Vercel + `pino` worker-thread footgun

**Why it's hard.** Every `pino` blog post in 2026 still recommends a transport (`pino-pretty`, `pino-loki`, `pino-axiom`) because that's how `pino` is designed for long-lived Node servers. Vercel's function model terminates the worker between cold paths; transports break on production. The student who pastes the blog snippet ships a logger that drops lines silently, and the failure isn't loud — it's missing dashboard data three days later. Pure trap.

**Ideal teaching artifact.** A wrong-by-default code snippet: a `lib/logger.ts` file with `pino({ transport: { target: 'pino-axiom', options: {...} } })` — the kind of config the student would lift from a tutorial. Below it, the deployment shape: Vercel function cold-start → worker thread spawned for transport → worker not flushed before function suspend → lines lost. Then the fix — strip the transport, write to stdout synchronously, let Vercel capture, let the drain ship it. Mark the wrong version with a one-line consequence: *"three days into production, the dashboard's empty, no error fired."* Pattern archetype, wrong-then-right.

**Engagement.** A `TrueFalse` round of five statements about the trap: "`pino-pretty` is safe in production on Vercel" (false), "writing to stdout requires no transport config" (true), "the drain ships from the function's stdout, not from a `pino` transport" (true), "missing log lines on Vercel always produce a runtime error" (false), "`pino-pretty` is fine in `next dev`" (true). The asymmetry of the trap — silent failure — is the calibration.

**Components.**
- `CodeVariants` with the broken (transport) and fixed (stdout) `logger.ts`.
- `TrueFalse` for the calibration round.

---

## Concept 8 — The 3am rule: log what reconstructs, not what reassures

**Why it's hard.** The default reach is either too little (log nothing, hope Sentry's enough) or too much (`log.info('entering handler')` and `log.info('leaving handler')` on every function). Both are wrong for different reasons: the first leaves the operator without the per-step narrative, the second buries the signal under entry/exit pairs the `requestId` already correlates. The 3am-operator framing is what calibrates the cut.

**Ideal teaching artifact.** A wrong-by-default sandbox: the student is given a webhook-handler `.ts` file pre-instrumented with `log.info` calls — some load-bearing, some entry/exit noise, some PII-leaking, some missing where they should be. The student's job is to keep the lines that an operator at 3am would need, remove the ones they wouldn't, and add the ones missing. A reference answer key reveals the senior cut with one-line reasons per decision. Pattern archetype as a guided puzzle — the artifact carries the assessment.

**Engagement.** The puzzle is itself the assessment. Follow-up `MultipleChoice` confirms recall: "which of these is the load-bearing log line for diagnosing a webhook retry storm?" — the right answer keys the rule for transfer.

**Components.**
- New component proposal: `LogTriage` — given a pre-populated file of `log.*` calls with metadata (keep / remove / add-here annotations in the answer key), the student toggles each line's verdict and adds new lines from a palette. Grader compares to the answer key with one-line reasons surfaced on submit.
- Alternative (leaner): a `Buckets` sort over the file's lines into "keep / remove / would-add-here" columns, paired with a static `Code` block showing the answer key after submission. Loses the file-shape feel but ships without a new component.
- `MultipleChoice` for the follow-up recall.

**Project link.** 20.4's eight seeded findings include one or two log-noise / log-gap issues; the rule installed here is what the student's findings document cites.

---

## Concept 9 — Structural redaction over per-call-site discipline

**Why it's hard.** Students default to per-call-site care: "I'll just remember not to log `user.password`." That discipline survives until the next contributor, the next field added to `users`, the next library that auto-logs request bodies. Structural redaction — a single `redact` paths file at the logger seam — moves the rule from human memory to PR-reviewable config, and pairs naturally with `Sentry.beforeSend` for the same posture on errors. The senior point isn't the syntax, it's the move from *vigilance* to *structure*.

**Ideal teaching artifact.** A two-part artifact. First, a `redact` paths config rendered as an annotated `Code` block — every path glob (`*.password`, `req.headers.authorization`, `*.creditCard`) tagged with what it catches and which incident class it prevents. Second, a structural-vs-vigilance comparison: a fictional PR adds a new `socialSecurityNumber` field to a logged user object. Path A — per-call-site — the developer remembers to omit it in this PR, forgets in three months. Path B — structural — the reviewer adds `*.socialSecurityNumber` to the `redact` paths file in the same PR, the rule travels. Decision archetype emphasizing the structural move.

**Engagement.** A `CodeReview` exercise on a small diff that adds a new logged field with PII risk; the student leaves an inline review comment naming the `redact` paths file as the right fix. The AI rubric checks the comment names the structural seam, not a per-call-site tweak.

**Components.**
- `Code` with `CodeTooltips` for the annotated `redact` config.
- `TabbedContent` for the vigilance-vs-structural comparison.
- `CodeReview` for the inline-comment engagement.

**Project link.** 20.4.3 builds the single `redact` seam reused by `pino` and `Sentry.beforeSend`; this concept is the principle, that lesson is the wire.

---

## Concept 10 — The Sentry-to-logs pivot, walked

**Why it's hard.** All the wiring from prior concepts pays off only if the student can execute the on-call workflow under pressure: from a paged Sentry alert to the per-request narrative in the log destination, in three deliberate clicks. Students who haven't walked it don't internalize *why* the `requestId` lives on both surfaces — it reads as redundancy, not as the workflow's pivot.

**Ideal teaching artifact.** A scrubbable, three-step walkthrough of a real-shape incident. Step 1 — Sentry event UI: 47 grouped events for one org over 3 hours, stack trace, breadcrumbs, the `requestId` tag highlighted. Step 2 — copy the `requestId`, switch to the log destination (Axiom-shape UI), filter by `requestId` — the per-request narrative loads, eight `info` lines then one `error`. Step 3 — widen the filter to `orgId` over the time window — confirms the scope is one org, not all, and reveals the upstream Stripe webhook secret rotation as the root cause. Each step shows the cursor position, the query, and the diagnostic insight gained. Concept archetype rendered as scrollytelling.

**Engagement.** A `Sequence` exercise: shuffle the three pivot steps plus three plausible-but-wrong moves ("grep the Vercel function logs UI for the error string," "open the audit log filtered by user," "redeploy and watch"), order them as the on-call would. Locks the workflow before the project drill.

**Components.**
- `DiagramSequence` with three hand-SVG frames for the pivot walkthrough. Reuses the same component pattern as Concept 6.
- `Sequence` for the workflow-ordering engagement.

**Project link.** 20.4.6 has the student verify on each surface (Sentry dashboard, console logs, PostHog, `findings/`) — this concept's drill is the dress rehearsal.

---

## Concept 11 — When the debugger earns its weight, walked end-to-end

**Why it's hard.** Two failure modes coexist. Some students never reach for the debugger — they `console.log`-and-redeploy until the bug yields, weeks lost. Others reach for it too soon — attach the inspector for every bug, miss that logs and Sentry would have answered in 30 seconds. The decision rule is: logs and Sentry are retroactive and static; the debugger is interactive — read every local, every closure, mutate state, resume. Reach for the debugger when the state isn't on the wire.

**Ideal teaching artifact.** A modeled four-surface incident drill, walked end-to-end. The setup — a server action returns the generic toast for one specific input. The student watches the senior workflow in four scrubbable beats: (1) open Sentry, read the stack trace, identify the failing action and line; (2) open the log destination, filter by `requestId`, read the per-request narrative — the failure is in a validation predicate that *should* pass for this input; (3) the failure isn't reproducible from the log fields alone — start `next dev --inspect`, attach VS Code, set a breakpoint on the predicate's `return false` line, replay the input; (4) the breakpoint hits, the Variables panel reveals the closure captured the wrong tenant scope. Each beat shows the surface the senior reads and the question it answers — Sentry: *what threw*; logs: *what happened*; debugger: *what's in scope right now*. The final reveal makes the chapter's payoff concrete: the four surfaces together resolve a bug none alone could. Pattern archetype as a chapter-capping drill.

**Engagement.** A `Buckets` sort over six bug shapes ("validation predicate returns false for valid input," "Stripe API returns 502 intermittently," "p99 latency spike on one endpoint," "user reports the wrong invoice loaded," "memory leak in a worker," "production crash with minified stack") into "Sentry alone," "logs + Sentry," "needs the debugger," "out of scope (perf, profiling)." Forces the decision rule into the student's head before the project.

**Components.**
- `DiagramSequence` with four frames for the four-surface drill. Each frame combines a hand-SVG of the IDE/UI surface and a small annotated `Code` block.
- `Buckets` for the bug-shape sort.

**Project link.** 20.4's findings exercise leans on this decision — most findings are Sentry/logs work, one or two reward debugger-level inspection, none should be solved by redeploy-and-pray.

---

## Component proposals

- **`LogTriage` — a wrong-by-default log-line puzzle.**
  - **Sketch.** Inputs: a file of pre-populated `log.*` calls with per-line metadata (keep / remove / replace-with / add-here annotations) and a palette of candidate new lines. Student toggles each line's verdict and inserts from the palette; grader compares to the answer key and surfaces one-line reasons.
  - **Uses in this chapter.** Concept 8.
  - **Forward-links.** Plausible reuse in Chapter 20.2.4 (event-taxonomy triage — what to track vs. what to skip) and Chapter 22 (code-review-style discipline drills). Worth flagging for the maintainer to confirm before building.
  - **Leanest v1.** A `Buckets` sort over the file's lines into three columns (keep / remove / would-add) plus a static `Code` answer key on submit. Loses the in-file editing feel but ships in a tenth of the time and still teaches the cut. Build v1 first; promote to bespoke only if Chapter 20.2.4 actually wants the same primitive.

## Build priority

Only one new component is proposed and its primary recommendation is already the leanest v1 (a `Buckets`-plus-answer-key composition with existing components). No bespoke build is on the critical path for this chapter. If Chapter 20.2's pedagogy outline (when authored) confirms a second use for `LogTriage`, promote it then; otherwise the v1 is the right scope.

The chapter's heaviest lift is the recurring `DiagramSequence` pattern — used in Concepts 6, 10, and 11 — each backed by hand-SVG frames. That's not a new component; it is a meaningful authoring commitment, and the three sequences should share visual language (same IDE/UI chrome, same `requestId` highlight color, same panel proportions) so the chapter reads as one continuous incident-walking style.

## Open pedagogical questions

- Concept 1's dual-surface artifact ideally shows a real-shape Sentry event UI side-by-side with a real-shape Axiom query result. Should the SVG mocks lean toward generic abstraction (resilient to vendor UI churn) or vendor-accurate detail (clicks better for the target student but ages on each redesign)? Recommend abstraction with one inset annotation per vendor for the first ship.
- Concept 11's four-surface drill spans Sentry, the log destination, VS Code, and the running app. Four hand-SVG frames at the chapter's quality bar is real work; worth confirming whether a single shared visual template (a four-panel split with one panel "active" per frame) reduces the authoring cost without losing the surface-switching feel.
