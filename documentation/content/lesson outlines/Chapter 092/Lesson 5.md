# Lesson outline — Chapter 092, Lesson 5

## Lesson title

- **Title:** Server-side debugging with the inspector
- **Sidebar label:** Server-side debugging

---

## Lesson framing

This is the chapter's closer and its payoff. Lessons 1–4 built the *retroactive, remote* observability floor: Sentry says **what threw**, the structured log narrative says **what happened**, the drain destination is where the on-call queries it by `requestId`. This lesson installs the *interactive, local* tool that completes the picture — the Node inspector — and, just as importantly, teaches the **senior judgment of when to reach for it**. The thesis the whole chapter has been building toward lands here in one sentence: *Sentry answers "what threw," logs answer "what happened," the debugger answers "what's in scope right now."* Three surfaces, three questions, one incident.

Conclusions from brainstorming that shape the whole lesson:

- **Lead with the decision, not the tooling.** Per the course's first pillar, the senior contribution is knowing *when* a debugger earns its weight versus when logs/Sentry already cover it, and *never* reaching for it in production. A junior's instinct is to `console.log`-spam or, worse, to want a debugger on the deployed app. The lesson's spine is the diagnostic ladder (Sentry → logs → debugger), and the debugger is explicitly the **last 10%** tool, not the first move. This framing is the reason the lesson belongs in an *observability* chapter at all — it's the boundary case of the same incident workflow.

- **The student already owns the incident.** Do not re-teach Sentry, pino, ALS, or the drain. By this lesson the student has `authedAction`, `lib/logger.ts`, `lib/request-context.ts`, `requestId`-in-Sentry-context, and the Sentry→logs pivot. The debugger plugs into the *exact same* failing-server-action scenario the chapter has used throughout. Reuse a concrete, already-familiar failure shape (a server action returning the generic toast) so cognitive load goes entirely to the new tool, not a new domain.

- **Minimize cognitive load by staging the tool.** Build the mental model simply first: Node has a built-in inspector that speaks one wire protocol (CDP); any client (VS Code, Chrome) attaches to it. Then add the Next.js integration (`next dev --inspect`), then the breakpoint mechanics (plain → conditional → logpoint), then the end-to-end drill that ties it to the chapter. Each layer is independently demonstrable.

- **Ground every claim in current tooling (Feb 2026).** This topic is highly version-sensitive and the chapter outline is slightly stale. Corrections verified against the official Next.js debugging guide (v16.2, updated 2026-02-11) and the 16.1 release notes — they MUST be honored (see Scope + fact-check notes): the integrated `next dev --inspect` flag shipped in **Next.js 16.1** (Dec 2025), not "15+"; the **official** server-side VS Code config is `type: "node-terminal"` + `request: "launch"` + `command: "npm run dev -- --inspect"` (NOT an `attach`-to-9229 config — that's a fallback, not the recommended default); `--inspect-brk`/`--inspect-wait` are not exposed by the flag and require `NODE_OPTIONS`, and `--inspect-brk` crashes Turbopack; DevTools file paths read `webpack://_N_E/./` even under Turbopack; the error overlay carries a Node.js icon that copies the inspector DevTools URL.

- **This is a "follow along on your own machine" lesson.** The payoff is muscle memory: open the inspector, drop a breakpoint, read a variable. We cannot run a real Node inspector inside the lesson sandbox, so the interactivity is carried by (a) annotated screenshots of the VS Code debug UI, (b) a scrubbable `DiagramSequence` modeling the breakpoint-hit / variable-reveal moment, (c) a `StateMachineWalker` for the "which tool do I reach for?" decision, and (d) MCQ/ordering checks. No live-coding component fits (the runtimes can't host a Node inspector session); say so deliberately and use the visual + decision components instead.

- **Mental model the student should leave with.** "The inspector is a dev-only window into live server state. I reach for it only after Sentry + logs have narrowed *where* but not *why*. I attach VS Code (or Chrome) to a `next dev --inspect` process, set a breakpoint on the suspicious line, replay the exact failing input locally, and read the locals/closure/call stack the log line couldn't carry. I never point it at production."

Estimated student time: 40–50 min. The modeled server-action-failed drill is the load-bearing artifact.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open on the concrete failure the chapter keeps returning to, now at its hardest variant: a server action returns the generic operator/user-split toast. The student opens Sentry — the stack trace points at a validation predicate. They open the drain, filter by `requestId` — the narrative shows the input *looked valid* and the predicate *still* returned `false`. Both retroactive surfaces agree on **where**; neither can say **why** an input that looks correct fails the check. State the move: attach a debugger to the local server, pause on that line, replay the same input, and read the variables live. State the thesis one-liner (Sentry/logs/debugger = what threw / what happened / what's in scope). Preview the deliverable: a `.vscode/launch.json`, the breakpoint/conditional/logpoint toolkit, and the end-to-end drill. Keep it to ~2 short paragraphs; the student already has the chapter's context.

Reasoning: satisfies the "senior question implicitly in the intro" filter and immediately reuses known machinery so the new concept is the only unknown.

---

### When the debugger earns its weight

**Goal:** install the decision *before* the mechanics. This is the most senior-mindset part of the lesson and must come first.

Content:
- Frame the diagnostic ladder explicitly: logs and Sentry breadcrumbs are **retroactive and static** (you see only what was captured); the debugger is **interactive** (read every local, closure, and object property; mutate and resume). Sentry + logs resolve ~90% of incidents; the debugger is for the rest.
- Three "reach for it" signals: (1) the bug doesn't reproduce in the logs — the deciding state was on the wire, not in any logged variable; (2) the call stack reads "something inside a library does something we don't expect"; (3) a heisenbug that vanishes the moment you add a log line.
- Three "don't reach for it" cases, each with the *correct* alternative: (1) a known bug with a clean repro → write the failing test/assertion instead; (2) anything in **production** → the logs + Sentry workflow from lessons 1–4, never a live inspector; (3) performance work (CPU/memory/async waterfalls) → profiling tools, forward-pointer to Chapter 094.

**Component — `StateMachineWalker` (`kind="decision"`):** "Which surface answers this question?" The walk forces the senior *order*: start at "Is this production?" (yes → leaf: logs + Sentry, never the inspector), then "Do logs/Sentry already show why?" (yes → leaf: you're done, write a regression test), then "Is it a performance problem?" (yes → leaf: profiler, Ch094), else "Is the failing state visible in any logged value?" (no → leaf: attach the inspector). Each leaf names the tool *and* the signal that selects it. Pedagogical goal: the lesson lives in the order of questions, not in any single leaf — exactly the walker's sweet spot per its doc.

Reasoning: leads with judgment (pillar 1, "decisions before syntax"), and pre-empts the two most common junior errors (debugger-as-first-move; wanting a prod debugger) before any tooling is shown.

Tooltip terms (`Term`): **heisenbug** (a bug that changes or disappears when you observe it).

---

### How the Node inspector works

**Goal:** the simplest correct mental model of the underlying primitive, named at the call site rather than as preamble.

Content (kept deliberately short — one tight model, then move on):
- Node ships a built-in **V8 inspector**. Start a process with `--inspect` and it listens on a WebSocket (default `127.0.0.1:9229`) speaking the **Chrome DevTools Protocol (CDP)**. Any CDP client — VS Code, Chrome DevTools, WebStorm, Firefox — attaches over that socket. One protocol, many clients; that's the whole idea.
- `--inspect` = run normally but *attachable*. `--inspect-brk` = pause on the very first line and wait for a client (useful for debugging startup, but see the Turbopack caveat below — and it needs `NODE_OPTIONS`, not the Next flag). `--inspect=<port>` overrides the port when 9229 is taken.
- The protocol is the same one Sentry/the bundler use source maps for — the debugger reads the **same dev source maps** so a breakpoint on your `.ts` line maps to the running transpiled code. (Bridges to the next section and to the source-map machinery the student met in lesson 1.)
- One-line security frame planted here, paid off later: production Node never runs with `--inspect` — an open inspector port is a remote-code-execution surface.

**Component:** a small `Figure` with a plain HTML+CSS / `ArrowDiagram` "one server, many clients" sketch — a `node --inspect` process box on the left exposing a `:9229 (CDP over WebSocket)` port, with VS Code / Chrome DevTools / WebStorm client boxes attaching to it. Pedagogical goal: kill the misconception that the debugger is a feature *of the editor*; it's a feature of the *runtime* that editors merely attach to. Keep it horizontal and short per the vertical-space constraint.

Reasoning: a one-screen primitive model prevents the "VS Code magic" misconception and explains why Chrome DevTools is a drop-in alternative later, with near-zero extra cost.

Tooltip terms (`Term`): **CDP / Chrome DevTools Protocol** (the wire protocol Node's inspector speaks; lets any compatible client attach); **V8** (the JS engine inside Node, source of the inspector).

---

### Starting Next.js with the inspector

**Goal:** the student gets a Next dev server listening for a debugger, the modern way.

Content:
- The integrated flag (Next.js **16.1+**): `next dev --inspect` (`pnpm dev --inspect` / `npm run dev -- --inspect`). The flag passes `--inspect` through to *only* the Node process running your code — the reason it replaced the old `NODE_OPTIONS=--inspect next dev`, which attached the inspector to every spawned process. State the version explicitly; this is recent.
- Show the confirmation line the student must see: `Debugger listening on ws://127.0.0.1:9229/<uuid>` followed by the usual `ready` line. If they don't see it, the flag didn't take.
- Name the `--inspect-brk` caveat precisely: it isn't exposed by the Next flag (use `NODE_OPTIONS=--inspect-brk next dev`) **and** it currently crashes Turbopack (the default bundler in 16). For app-code debugging you almost never need brk anyway — attach-then-trigger is the normal flow.
- Port collision: `9229` already in use → `next dev --inspect=9230` (a separate `--inspect=0.0.0.0` note for Docker can be a one-liner aside; the course defaults to local).

**Component — `Code` (bash), shown as a small `Tabs`/`CodeVariants` over package managers** (pnpm default, npm `-- --inspect` form). The npm double-dash is a real footgun worth a single highlighted variant. Keep prose ≤6 lines per variant.

`Aside` (caution): the Turbopack `--inspect-brk` crash, with the "you rarely need brk" reassurance so it doesn't read as scary.

Reasoning: corrects the chapter outline's "15+" claim and the `NODE_OPTIONS` framing; the package-manager variant pre-empts the most common "why didn't the flag work" support question (npm needs `--`).

Tooltip terms (`Term`): **Turbopack** (Next.js's default dev/build bundler in v16) — only if not already introduced earlier in the unit; keep it terse.

---

### The VS Code launch config

**Goal:** ship the canonical `.vscode/launch.json` and explain what each field does, using the *current official* shape.

Content — the official Next.js config (verified Feb 2026), authored with `AnnotatedCode` so attention moves field-by-field:
- The **server-side** config is the load-bearing one: `{ "name": "Next.js: debug server-side", "type": "node-terminal", "request": "launch", "command": "npm run dev -- --inspect" }`. Explain *why* `node-terminal` is the modern default: it launches the dev command in an integrated terminal and auto-attaches the debugger to the spawned Node process — no manual port wrangling, no separate "start server then attach" dance. This is the single most important correction versus older blog posts (and versus the chapter outline's attach-to-9229 default).
- Mention the **client-side** config (`type: "chrome"`, `request: "launch"`, `url: http://localhost:3000`) and the **full-stack** config (`type: "node"` launching `next` with `runtimeArgs: ["--inspect"]` and a `serverReadyAction`) as the other two official entries — but keep this lesson's spotlight on server-side. One sentence each; the student can copy the full block.
- `skipFiles: ["<node_internals>/**"]` (and optionally `**/node_modules/**`) — keeps *step-into* shallow so the student doesn't fall into framework/runtime code. Explain the payoff concretely (without it, "step into" dives into Node internals).
- The fallback, named once and *clearly labeled as a fallback*: an `attach` config (`"request": "attach", "port": 9229`) for when you'd rather start `pnpm dev --inspect` in your own terminal first and attach to it. This is exactly the older "default" — reframe it as the manual alternative, not the recommended path.

**Component — `AnnotatedCode`** (`lang="json"`) over the full `launch.json`, stepping: (1) the server-side block as a whole, (2) `type: node-terminal` + why it auto-attaches, (3) `command` with the `-- --inspect` pass-through, (4) `skipFiles`, (5) a final step pointing at the client/full-stack siblings. Color the server-side block blue (default), `skipFiles` green. Keep each step ≤6 lines.

`Steps` (Starlight): the run procedure — open Debug panel (`⇧⌘D`), pick "Next.js: debug server-side", press `F5`, confirm the `Debugger listening` line in the integrated terminal.

Reasoning: `AnnotatedCode` is the right tool — one config file, several load-bearing fields needing focused attention (component-doc guidance). The `node-terminal`-over-`attach` correction is the lesson's biggest accuracy delta and deserves explicit "this changed" framing.

---

### Breakpoints, conditional breakpoints, and logpoints

**Goal:** the three core breakpoint moves and when each fits, plus what the paused UI gives you.

Content, taught as a progression (simple → conditional → non-pausing):
- **Plain breakpoint.** Click the gutter on a line inside a server action or a `lib/` helper. Red dot = **bound**; hollow grey = **unbound** (source-map resolution failed — see the caveat below). Run the request that hits the line; execution pauses and VS Code fills four panels: **Variables** (locals + closure + `this`), **Watch** (pinned expressions), **Call Stack** (how we got here — with `node_modules` collapsed thanks to `skipFiles`), and the **Debug Console**.
- **The Debug Console is the superpower.** It's a REPL bound to the *paused frame's scope*. Evaluate `user.role`, walk an object, even run an `await`ed query against the live connection (`await db.query.invoices.findFirst({ where: eq(invoices.id, 'inv_123') })`). Faster than adding a log line and restarting. This is the concrete answer to "what's in scope right now."
- **Conditional breakpoint.** Right-click the gutter → Edit Breakpoint → condition (`user.id === 'usr_problem'`, `attempt > 3`). Fires only when the predicate is true — the fix for per-user/intermittent bugs and for breakpoints inside loops (a plain breakpoint in a hot loop pauses thousands of times; a condition pauses once).
- **Logpoint.** A breakpoint that *prints and keeps running* instead of pausing: message `input was {input}, user is {user.id}`. It's "add a log line without editing the file or restarting the server" — ideal on hot paths where pausing breaks timing. Contrast with a real `logger` line (logpoints are ephemeral, dev-only, never committed).
- **The `debugger;` statement.** A line of `debugger;` pauses when a debugger is attached. Reach for it when a gutter breakpoint won't bind (Turbopack source-map miss) or the location is dynamically generated. Treat as temporary — CI greps for it; remove before commit. (Connects to the chapter's "CI greps for X" motif: `console.log`, `debugger;`.)

**Component — `DiagramSequence`** modeling a breakpoint hit on the validation predicate from the running scenario. Steps: (1) breakpoint set on the `return false` line (gutter dot); (2) request fires, execution **paused** banner, line highlighted; (3) **Variables** panel revealed — show a small mocked panel where the closure-captured `orgId` is visibly the *wrong* tenant; (4) **Debug Console** evaluating `orgId` and the input side by side, exposing the mismatch; (5) resume. Pedagogical goal: make the abstract "read live state" concrete by showing the exact panel and the exact wrong value — the moment a debugger pays off. Author panels as plain HTML mimicking VS Code chrome (no real screenshot needed for the synthetic state; pair with one real screenshot below for authenticity).

**Component — `Screenshot`** (desktop, in a `Figure`): one real VS Code capture of a paused session — gutter breakpoint, highlighted line, Variables/Call Stack/Debug Console visible. Store under `public/screenshots/092/`. Goal: anchor the synthetic diagram to the real UI the student will see. (Flag to the resourcer: capture needed; descriptive `alt` required.)

**Exercise — `MultipleChoice` (multi-select allowed):** "Which breakpoint type fits each situation?" Scenarios: intermittent per-user failure (→ conditional), hot-path quick value peek without pausing (→ logpoint), need to inspect closures at a single suspicious line (→ plain), gutter dot won't bind under Turbopack (→ `debugger;`). Goal: cement tool-to-situation mapping. Grading: each scenario one correct choice; explanations on reveal.

Reasoning: a single progression covers all three breakpoint kinds with one running example, keeping cognitive load low; the `DiagramSequence` is the closest we can get to live interactivity in-page, and the MCQ checks the *decision* (which kind) rather than rote recall.

Tooltip terms (`Term`): **bound / unbound breakpoint** (whether the editor resolved the source line to running code); **REPL** (read-eval-print loop) — only if not already a known term by this unit.

---

### The server-action-failed drill, end to end

**Goal:** the chapter's payoff — wire all five lessons into one incident resolution. This is the section the rest of the lesson serves.

Content — model the full workflow as a numbered walk, reusing the exact failing scenario from the intro:
1. **Sentry** — open the event, read the stack trace, identify the failing server action and the precise line (a validation predicate). *What threw.*
2. **Logs** — copy the `requestId` from the Sentry event's request **context** (not a tag — the continuity-correct phrasing), open the drain destination, filter by it, read the per-request narrative: the input *looked valid*, yet the predicate returned `false`. *What happened.* The two retroactive surfaces agree on *where* and disagree with intuition on *why*.
3. **Reproduce locally** — start `pnpm dev --inspect`, launch the "Next.js: debug server-side" config, set a breakpoint on the predicate's `return false`, and replay the **same input** (the log line gave you the exact shape).
4. **Read live state** — the breakpoint hits; the Variables panel shows the predicate is comparing against a **closure-captured tenant scope** that's the wrong `orgId` — a value no log line carried because nobody thought to log it. *What's in scope right now.*
5. **Fix and close the loop** — one line in `lib/`; add a regression test so this becomes a "known bug with a clean repro" (callback to the decision section — once you can reproduce it, the test, not the debugger, is the durable artifact).

Reinforce the interleave explicitly: breadcrumbs that fired pre-breakpoint live in the Sentry UI; the request's log lines live in the drain; the debugger sees what neither captured. Senior order is fixed: **Sentry's stack → log narrative → attach the debugger** — each answers a different question, and you only descend the ladder when the rung above runs out.

**Component:** present steps 1–2 as compact prose with inline references (no new screenshots — the student saw these surfaces in lessons 1 & 4; optionally a tiny `Figure` recap strip). Present steps 3–5 leaning on the `DiagramSequence` already built above (reference it) plus the real screenshot. Consider a short three-box `ArrowDiagram` / `Figure` "what each surface answers" recap: Sentry = *what threw* → Logs = *what happened* → Debugger = *what's in scope* — the chapter's thesis as a one-glance figure. Pedagogical goal: leave the student with the durable mental model as a picture.

**Exercise — `Sequence` (ordering drill):** scramble the on-call steps (read live variable; copy requestId from Sentry; set breakpoint and replay input; read Sentry stack trace; filter drain by requestId; write a regression test). Student orders them. Goal: cement the *order* of the diagnostic ladder, which is the senior skill the section teaches. Optional fixed code block above showing the failing predicate for context.

Reasoning: this is the synthesis section; an ordering exercise tests the workflow's *sequence* (the actual learning objective) better than recall, and reusing the prior diagram avoids redundant assets while reinforcing it.

---

### Chrome DevTools as the alternative client

**Goal:** show the editor-agnostic path cheaply, reinforcing the "one protocol, many clients" model and serving students who debug without an editor open.

Content (short — the heavy lifting was done in "How the Node inspector works"):
- With `next dev --inspect` running, open `chrome://inspect` → the Node target appears under **Remote Target** → click **inspect** → a dedicated DevTools window opens → **Sources** tab → set breakpoints exactly as in VS Code. Same protocol, same source maps, same caveats.
- A genuinely modern, course-worthy detail (verified Feb 2026): when a server error hits, Next.js shows a **Node.js icon** on the error overlay; clicking it copies the inspector's DevTools URL to the clipboard — open it in a tab to jump straight into the server process. This is the fastest path from a thrown error to a live inspector.
- File-search gotcha: in DevTools, server source paths appear under `webpack://_N_E/./…` (true even under Turbopack) — tell the student so they can find their file with `⌘P`.

**Component — `Code` (bash) / short `Steps`** for the `chrome://inspect` flow. Optionally one `Screenshot` of the `chrome://inspect` Remote Target row (low priority; the VS Code screenshot is the must-have).

`ExternalResource` (in the External resources block, not here) to the official Next.js debugging guide.

Reasoning: cheap to teach once the protocol model exists; the error-overlay Node icon is a current, high-value detail that distinguishes this from stale tutorials and reinforces the "the inspector is a runtime feature" model.

---

### Why you never attach the inspector to production

**Goal:** make the production prohibition a *reasoned security boundary*, not a rule to memorize — and close the loop back to the lessons-1–4 workflow.

Content:
- The inspector port speaks CDP, which can **evaluate arbitrary code** in the running process (the same `await db.query(...)` power that's a superpower locally is **remote code execution** against your live database remotely). An exposed `9229` is a critical vulnerability. So: `--inspect` is dev-only, full stop.
- This matches the platform: Vercel doesn't expose the inspector port; serverless functions are short-lived and not attachable anyway. The platform's shape and the security rule agree.
- Therefore production debugging *is* the lessons-1–4 workflow — Sentry for the throw, the drain for the narrative. The debugger is the local complement, never the remote tool. Restate the ladder one final time so the chapter closes on its thesis.

**Component:** an `Aside` (danger) for the one-line prohibition, with the *reason* (RCE surface) in the surrounding prose so it's understood, not just stated. Optionally fold the "what each surface answers" recap figure here if not placed in the drill section.

Reasoning: the chapter outline lists production-debugging as the single most important watch-out; framing it as a security consequence (not a decree) fits pillar 1 and ties the lesson back into the chapter's remote-observability spine.

---

### Watch-outs and footguns (fold into relevant sections, NOT a trailing bucket)

Per the no-trailing-tips rule, distribute these into the sections above where the concept lives. Listed here only so the writer places each:

- Unbound breakpoint under Turbopack → "Breakpoints" section: workaround is the `debugger;` statement or a dev-server restart so source maps regenerate; mention `next dev --webpack` only as a *last-resort* escape hatch and do **not** present it as smoothly supported (Turbopack is the default; webpack is increasingly deprecated for dev — verify before over-promising).
- `--inspect` in production → its own section above.
- `debugger;` left in committed code (CI grep fails) → "Breakpoints" section.
- Breakpoint in a tight loop pauses thousands of times → "Conditional breakpoints" (the fix is the condition).
- Stepping into `node_modules` wastes time → "launch config" (`skipFiles`).
- Port 9229 collision → "Starting Next.js with the inspector" (`--inspect=9230`).
- HMR/Fast Refresh staling the file the breakpoint references → "Breakpoints": restart the dev server when a breakpoint looks misaligned.
- npm needs `-- --inspect` (the double dash) → "Starting Next.js" package-manager variant.
- Debug Console `await` returns a Promise unless the REPL supports top-level await (VS Code's does) → "Breakpoints" Debug Console subsection.
- Expecting to step *inside* a Drizzle query at the SQL level → "Breakpoints": the debugger sees the JS; SQL is generated lazily — set the breakpoint around the call, not "inside" the query.

---

## External resources (LinkCards / `ExternalResource`)

- Official Next.js debugging guide (`https://nextjs.org/docs/app/guides/debugging`) — the canonical `launch.json` and the Chrome/Firefox flows.
- Next.js 16.1 release notes (`https://nextjs.org/blog/next-16-1`) — the `next dev --inspect` announcement (for the "this is recent" framing).
- Node.js debugging getting-started guide — the `--inspect` / CDP primitive.
- VS Code Node.js debugging docs (breakpoints) — conditional breakpoints and logpoints in depth.

Group in a `CardGrid` with brand icons (`simple-icons:nextdotjs`, `simple-icons:nodedotjs`, `simple-icons:visualstudiocode`).

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- The failing-server-action scenario and the operator/user message split (generic toast to the user, full detail to the operator) — from Ch080 lesson 2 and reused all chapter.
- `authedAction`, `lib/logger.ts`, `lib/request-context.ts`, and that `requestId` lives in Sentry **context** (not a tag) — from lessons 1–2. Reference, never re-explain.
- The Sentry→logs pivot (Sentry event → copy `requestId` → filter the drain) — from lesson 4. Reuse as drill steps 1–2.
- Source maps rebind minified/transpiled code to original source — introduced in lesson 1; here only the *dev* source maps the debugger reads.

**This lesson does NOT cover (explicit cuts, with the owner):**
- Sentry setup/capture, structured logging, the 3am/PII rule, and drain shipping — lessons 1–4 of this chapter; this lesson only *consumes* them.
- Performance profiling (CPU/heap/async waterfalls, the DevTools Profiler tab, bundle analysis) — Chapter 094. Name once with a forward pointer; do not demonstrate the Profiler.
- React DevTools (component tree, hooks, client profiler) — introduced earlier in the React unit (Unit 3, "DevTools"); mention only as the client-side counterpart in one line, do not teach.
- Debugging Vitest tests with the same inspector protocol — Unit 18 references the protocol; out of scope here beyond a one-line "same protocol applies to your test runner."
- Edge-runtime and worker-thread debugging — out of scope (the course defaults to the Node runtime); name once as "different launch config, not covered."
- Heap snapshots / memory-leak diagnosis — out of scope.
- Production / remote debugging — out of scope **by design**; the lesson's job is to explain *why not* and redirect to the lessons-1–4 workflow.
- `--inspect-brk` startup debugging beyond the one-paragraph caveat (it crashes Turbopack; rarely needed for app code) — not demonstrated.

---

## Code-convention notes (alignment + deliberate divergences)

- **Logging:** the lesson explicitly contrasts logpoints/`debugger;` (ephemeral dev tools) with the project `logger` (pino, `lib/logger.ts`). Reinforce that real diagnostics go through the logger, not `console.log` (the `no-console` server-glob rule from lesson 2) — the debugger toolkit is *additive*, not a replacement for structured logs.
- **Error handling:** the running scenario uses the `Result`/operator-user-split shape from `lib/result.ts` and the chapter's `authedAction` catch — keep the toast generic, the operator detail in Sentry/logs. Do not introduce a new error shape.
- **`debugger;` and CI:** consistent with the chapter's "CI greps for X" motif (the lesson should note `debugger;` is grep-failed at commit, same as stray `console.log`).
- **Deliberate divergence:** `launch.json` and the Debug Console `await db.query(...)` examples are *debugging artifacts*, not project code — they intentionally sit outside the usual module-boundary/`Result` conventions. Note this so downstream agents don't "fix" a Debug Console snippet to return a `Result`.
- **Package-manager:** course default is pnpm; show `pnpm dev --inspect` as primary, the npm `-- --inspect` form as the footgun variant.
