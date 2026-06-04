# Lesson title

- **Title:** Directives and server-only enforcement
- **Sidebar label:** Directives and enforcement

# Lesson framing

This is the chapter's "name the magic" lesson. L1 and L2 used `'use client'` as a black-box boundary marker; the student knows *that* it draws a boundary and *that* the boundary flows downward to transitive imports, but not the exact rules. This lesson makes the two directives legible in full, names the senior preference that justifies them (explicit over magic), then closes the gap the directives alone leave open: convention is not enforcement, so a misplaced import can still leak server code into the browser bundle — and `server-only` / `client-only` are the one-line fix that turns that leak into a build error.

Three distinct topics, taught in dependency order, each building the next:

1. **The two directives in full** (`'use client'`, `'use server'`) — placement rule, silent-typo trap, no-op-when-crossed, and the load-bearing asymmetry that despite parallel names they do *completely different jobs*. This is the lesson's spine and where most confusion lives.
2. **Architectural Principle #6 — explicit over magic** — introduced here as its canonical case, because the directive is the purest example: a literal string in source that the framework could have inferred but deliberately didn't. Named inline at the moment the student has just seen the directive, not bundled.
3. **Structural enforcement** (`server-only` / `client-only`) — the compile-time guarantee that the directive convention can't provide on its own. This is where production stakes land: a leaked DB client or secret-reader silently shipping to the browser vs. a build that fails loudly.

**Central pedagogical risk: directive confusion.** This lesson introduces four boundary-related strings that look alike and are constantly conflated by beginners: `'use client'`, `'use server'`, `import 'server-only'`, `import 'client-only'`. The lesson's job is as much *disambiguation* as instruction. Two confusions must be killed explicitly and repeatedly: (a) `'use server'` ≠ Server Components (it marks Server Actions, an RPC mechanism — Server Components are the directive-less default), and (b) `'use server'` ≠ `server-only` (one *exposes* functions to the client as endpoints, the other *forbids* a module from reaching the client). A disambiguation table/diagram is the durable artifact the student should leave with.

**Stakes framing.** The senior reflex this lesson installs: every server-only helper file opens with `import 'server-only';`. The cost is one line; the payoff is that a refactor three months later that accidentally pulls `lib/auth.ts` into a Client Component fails `next build` instead of silently publishing the session secret in the browser bundle. This connects directly to L1's "secrets-in-props leak fails silently" asymmetry and L2's "the framework guards the loud failures, not the silent ones" — `server-only` is how the senior converts a silent failure class into a loud one.

**Server Actions scope discipline.** `'use server'` is owned in full by Chapter 043 (the five-seam Server Action shape, validation, errors, redirects). Here it is named *only* enough to (a) complete the directive pair, (b) kill the `'use server'`-is-Server-Components confusion, and (c) show its placement rules (file-level vs. inline). No real action body, no form wiring, no validation. Every action example is a stub with a forward-pointer. This is a hard boundary — the lesson must resist teaching Server Actions.

**Through-line and voice.** Continue the invoices domain and the established server=cool/primary, client=warm/muted color language from `ServerBrowserSplit` (L1) and `BoundaryDepth` (L2). Reuse the L1/L2 file names: `lib/auth.ts`, `db/index.ts`, `lib/email.ts`, the `_components/` client leaves, `mark-paid-button.tsx`. Match the terse adult voice — no celebratory tone, lead with the decision/reasoning.

**Iframe constraint persists (chapter-wide).** No live App-Router coding exercise. Checks are recognition/classification (`Buckets`, `Dropdowns`, `MultipleChoice`, `Matching`) — the directive rules are about *placement and intent*, which classification drills test well. The headline check is a `Buckets` that sorts the four strings by job, plus a `Matching` drill pairing each file to its correct opening line.

# Lesson sections

## Introduction (no header)

Open with `<CourseProgressBar value={frontmatter['course-progress']} />`.

Motivate from the gap L2 left open, made concrete. The student has been typing `'use client'` since L2 on faith. Pose the senior question implicitly via a scenario: a teammate adds a one-line import of a logging helper to a Client Component; that helper happens to import the database client; the build still succeeds; the database URL and connection logic are now in the public JavaScript bundle, readable in DevTools. Nobody typed anything obviously wrong. The directive did its job (drew the boundary) and the leak happened anyway — because the directive is a boundary *marker*, not a boundary *guard*.

State the lesson's three deliverables explicitly so the student has a map: by the end they will (1) read and place both directives with their exact rules and traps, (2) name why the framework makes you write a literal string instead of inferring the boundary, (3) make a misplaced server import fail at `next build` instead of shipping to production.

Brief callback to L2's recap promise ("the next lesson is that directive in full") to confirm the handoff is being honored.

Reasoning: the cold-open leak scenario sets the stakes for the whole lesson (especially the enforcement payoff in the third topic) and frames the directive-vs-enforcement distinction that is the lesson's structural backbone. Lead with the problem, per pedagogical guideline §3.

## `'use client'` in full

Promote the L2 black-box to a fully specified mechanism. The student already owns the headline fact ("marks the boundary, propagates to transitive imports" — L2's `BoundaryDepth`); do **not** re-teach that. Teach only the rules L2 explicitly deferred.

Concepts:

- **It is a literal string at the head of the file, above all imports and code.** A bare `'use client';` (single or double quotes — but **not backticks**, that's a tagged-template, not a directive) before any `import`, before any statement. The one allowance to state explicitly so the writer doesn't over-claim: **comments may precede it** (a license header, a `// @ts-nocheck`); the rule is "before any import or executable code," not "literally line 1." The reason: the bundler reads it as a module-level pragma before it processes the module's body, so it must be unambiguously at the head. (Verified against React's `use client` reference: "must be at the very beginning of a file, above any imports or other code — comments are OK… single or double quotes, but not backticks.")
- **The silent-typo trap — the highest-value fact in the section.** A directive is *just a string*. There is no symbol, no import, no type-check on it. `'use cleint'`, `'use-client'`, ``` `use client` ``` (backticks — a tagged template literal, not a directive), or an import accidentally placed above it all leave the file silently treated as a Server Component — no error. The first `useState` or `onClick` it contains then crashes at runtime, possibly only in the code path that renders it. Frame the senior habit: never hand-type the directive; copy-paste from a known-good file, or let the editor/snippet insert it.
- **Repeating it deeper in the tree is a no-op.** Once a `'use client'` file has crossed into the client subgraph, every module it imports is already client; a second `'use client'` lower down does nothing (it is not *wrong*, just redundant). The boundary is a one-way door — you cross it once, at the top of the entry file. This reinforces L2's transitive-propagation model from the directive's side.

Code handling: use **`CodeVariants`** for the placement rule — a "Correct" tab (`'use client'` on line 1, then a blank line, then imports) vs. a "Wrong — silent failure" tab (an `import` or `'use strict'` above the directive, marked with `del=`). The Wrong tab's prose names that this fails *silently* — no build error, just a Server Component that breaks the moment it hits a hook. Use `'use client'` files matching L2's leaf convention (`app/invoices/_components/mark-paid-button.tsx`).

For the silent-typo trap specifically, a small **`Code`** block showing three typo'd variants side by side as comments (`// 'use cleint' — ignored`, `// 'use client ' trailing space — ignored`, etc.) drives home that none of them error. Consider a one-line `Aside` (caution) reinforcing "a typo'd directive is the worst kind of bug: invisible until the wrong render path runs."

Reasoning: the typo trap is the single most actionable production-safety fact about `'use client'` and is exactly what the chapter outline flags ("typos in directives fail silently"). It earns prominent, standalone treatment rather than a watch-out footnote.

## `'use server'` and the asymmetry with `'use client'`

Introduce the sibling directive — but the section's *real* job is the asymmetry, so lead the framing with it. The parallel naming (`use X`) sets a trap: the student's pattern-matcher expects `'use server'` to be the mirror of `'use client'` ("marks Server Components the way `'use client'` marks Client Components"). It is not. Kill that immediately and unambiguously.

Concepts:

- **The asymmetry, stated first.** `'use client'` marks *components* that ship to the browser and run there. `'use server'` marks *functions* that stay on the server and run there when called from the browser. One is about *where a component runs*; the other is about *exposing a server function as a callable endpoint*. They are not symmetric despite the names. Critically: **Server Components need no directive at all** — they are the default (L1). So `'use server'` has *nothing* to do with making something a Server Component; a file with `'use server'` at the top is not "more of a Server Component," it is a file of Server Actions.
- **What `'use server'` actually marks: a Server Action.** Name it as an RPC mechanism — a function callable from a Client Component but executed on the server. The client gets an opaque reference; calling it triggers a network request under the hood; the function body runs server-side. This is the *only* function-like value that can cross the boundary (forward-point: L4 owns "what crosses the wire," Ch 043 owns Server Actions in full).
- **Two placements.** File-level `'use server';` at the top → every export in the file is a Server Action (convention: an `actions.ts` file). Inline `'use server';` as the first line of an `async` function body → that single function is a Server Action, scoped to where it's defined. Show both shapes; bodies are stubs.
- **Explicit Chapter 043 boundary.** State in prose that the full Server Action surface — validation, error handling, return shapes, form wiring — is a later chapter. Here it is named only to complete the directive pair and to set up the disambiguation. Keep every action body a one-line stub (`// mutation logic: Chapter 043`).

Code handling: **`CodeVariants`** with two tabs — "File-level (`actions.ts`)" and "Inline (one-off action)" — each a minimal stub showing only the directive placement. Use `app/invoices/_actions.ts` (file-level) and an inline action inside a Server Component (inline). Do not show the call site or the consuming Client Component — that risks teaching Server Actions.

The disambiguation payoff — a **`Buckets`** drill. This is the section's check and one of the lesson's headline exercises. Sort short cards into two buckets: "Ships to the browser / runs there" (`'use client'`) vs. "Stays on the server / runs there when called" (`'use server'`). Items phrased as behaviors and use-cases, not the literal directive strings (e.g. "A button with an `onClick`", "A function that writes to the database when a form submits", "A date picker holding open/closed state", "An export the client calls to archive an invoice"). Grader: each item maps to the directive whose job it describes. Goal: verify the student internalized *job*, not *string*.

Reasoning: leading with the asymmetry (rather than appending it) is deliberate — the misconception forms the instant the student sees the parallel name, so the correction must precede, not follow, the detail. The chapter outline names this asymmetry as load-bearing ("name the asymmetry").

## Why a literal string and not framework magic

Introduce **Architectural Principle #6 — prefer explicit over magic** at exactly this moment: the student has just seen two directives that are *literal strings the author types into source*. This is the principle's canonical case, so name it where it's most vivid.

Concepts:

- **The counterfactual makes the point.** The framework *could* have inferred the boundary — scanned each file for `useState`/`onClick` and auto-classified it as client; the directive *could* have been a build-tool config or a filename convention (`*.client.tsx`). It deliberately wasn't. Instead the boundary is a literal string at the top of the file. Ask the student to feel the difference: with inference, "is this Server or Client?" requires running the bundler's analysis in your head; with the directive, it's the first line you read.
- **What "explicit" buys.** The boundary is visible in three places that matter: the **source** (first line, every read), **code review** (a reviewer sees `'use client'` added to a diff and knows a leaf just crossed into the bundle), and **git history** (the moment a file became client is a one-line commit, blameable). Magic is invisible in all three. The senior preference across the stack: choose mechanisms whose behavior is legible *at the call site*, not hidden in a tool's inference.
- **The principle generalizes — name siblings in passing.** This is not a one-off; it's a recurring stance the student will meet again: explicit dependency arrays in hooks (you state what an effect depends on; the framework doesn't guess), explicit Zod schemas at IO boundaries (you declare the shape; you don't trust inference at the edge), explicit error/return types on Server Actions. Name these as forward-pointers, one sentence, so the principle reads as a through-line not a local rule.

Visual: a small **`TabbedContent`** or simple two-panel **`Figure`** (HTML+CSS) contrasting "Magic (inferred boundary)" vs. "Explicit (directive)" — left panel a file whose client-ness is hidden inside a gear/inference icon you can't see by reading; right panel the same file with `'use client'` as a glowing first line. Pedagogical goal: make "legible at a glance" literally visual. Keep it compact (vertical constraint). Optional — if it doesn't earn its weight, a tight prose contrast suffices; do not force a diagram.

No exercise here — the principle is reinforced by the enforcement section that follows (which is the principle *made executable*). A check would interrupt the build toward the enforcement payoff.

Reasoning: Principle #6 must land *inline* at its canonical moment per pedagogical guideline §2 ("principles and patterns inline, never bundled"). Placing it between the directives and the enforcement packages is structurally ideal: the directive is the principle's *statement*, `server-only` is the principle's *enforcement* — the section bridges them.

## When convention isn't enough: the leak the directive can't stop

The pivot section. The directives are necessary but not sufficient — this is the gap that motivates `server-only`. Return to the cold-open leak and explain *why the directive didn't catch it*.

Concepts:

- **The directive marks a boundary; it does not guard the contents.** `'use client'` says "this file and its imports are client." It does *not* check whether any of those imports *should* be on the client. A server-only module (DB client, secret-reading helper, Node `fs` user) imported — directly or three hops down a transitive chain — into a client file is dragged across the boundary by the very propagation rule L2 taught. The directive worked exactly as designed; the import was the mistake, and nothing flagged it.
- **Two failure modes, both bad.** Best case: the module uses a Node-only API (`fs`, `net`) and the build *might* crash with a cryptic bundler error far from the real cause. Worst case: it's pure JS that bundles fine — and now the secret-reading code, including the literal secret if it's inlined, ships in the public bundle. The build is green. The leak is silent. This is the L1/L2 "silent failure" class again, now with a name and a cause.
- **Connect to the established asymmetry.** L1: the illegal Client-imports-Server move fails *loudly* at build time; the secrets-in-props leak fails *silently*. L2: the framework guards the loud failures, not the silent ones. This leak is the same shape — and the next section is the tool that converts it from silent to loud.

Code handling: a short **`AnnotatedCode`** walking the leak chain across a realistic import path: `mark-paid-button.tsx` (`'use client'`) → imports `./format-invoice` (no directive, looks innocent) → which imports `@/lib/pricing` → which imports `@/db` (the database client). Steps highlight each hop and the final step lands on "the DB client is now in the browser bundle, and `next build` said nothing." Pedagogical goal: make "transitive" concrete and frightening — the leak is three innocent-looking imports deep, which is exactly why a human reviewer misses it and why you want a machine to catch it.

Reasoning: this section is the hinge of the lesson — it earns `server-only` by demonstrating the precise gap it fills. Without it, `server-only` reads as ceremony; with it, the student *wants* the tool. This is "trigger before tool" (pedagogical §2).

## `server-only` and `client-only`: turning a leak into a build error

Deliver the fix the previous section motivated.

Concepts:

- **`server-only` — the one-line guard.** `import 'server-only';` as the first line (a side-effecting import, before all other imports per code conventions) of any module that must never reach the browser. The mechanism: it's a trivially small npm package whose import is rigged to throw if it ends up in the client bundle. If a Client Component imports the file — directly or transitively — `next build` fails with a clear error naming the offending import chain. The silent leak from the last section becomes a loud, pre-deploy build failure pointing at the exact path.
- **`client-only` — the mirror.** `import 'client-only';` for modules that must never run on the *server* — browser-API-bound helpers, third-party libs that read `window` at import time. Same mechanism, opposite direction. Rarer in practice (most code is safe-on-server by default) but earns its weight when wrapping a browser-only library so a Server Component importing it fails fast instead of crashing at render with "window is not defined."
- **How Next.js handles them — state precisely, this is a recently-shifted detail.** Next.js recognizes both packages *internally* and uses them to produce the clear build-time error; **the npm package contents are not actually used by Next.js**, and Next.js ships its own TypeScript declarations for both. As of current Next.js (16.2), **installing the packages is optional** — the `import 'server-only';` line works either way. The honest framing for the student: the *import line* is the contract; you may still `npm install server-only client-only` (commonly as devDependencies) so your linter doesn't flag an extraneous/unresolved import, but don't teach the install as load-bearing — the protection comes from Next.js, not the package. (This corrects the older "you must install both" framing; verified against the Next.js Server-and-Client-Components docs, May 2026.)
- **The senior pattern — every server-only helper has the line.** State it as a durable rule the student adopts now and reuses for the rest of the course: `db/index.ts`, `lib/auth.ts`, `lib/email.ts`, `lib/billing/*`, every `_actions.ts` — all open with `import 'server-only';`. (Cross-reference the code convention: `lib/` SDK adapters begin with this line.) The cost is one line per file; the payoff is the bundle *can't* silently ship server code — a future careless import becomes a build error, not an incident.
- **Resolve the second confusion: `server-only` ≠ `'use server'`.** This is the lesson's second must-kill conflation. `import 'server-only'` says "this file *errors* if it reaches the client bundle" — a guard, a prohibition. `'use server'` says "every export here is a Server Action the client *can call*" — an exposure, an endpoint. They are opposites in intent: one slams a door, the other opens a window. Worked contrast: `lib/auth.ts` uses `server-only` (the session logic must never leave the server); `app/invoices/_actions.ts` uses `'use server'` (the client must be able to invoke `archiveInvoice`). A file would essentially never want both.

Code handling: **`CodeVariants`** or stacked **`Code`** blocks showing the line at the head of two real files — `db/index.ts` with `import 'server-only';` and a browser-helper with `import 'client-only';`. Then a **`CodeVariants`** for the `server-only` vs `'use server'` contrast: tab "Guard (`server-only`)" showing `lib/auth.ts` and tab "Endpoint (`'use server'`)" showing `_actions.ts`, prose naming the opposite intents. This is the disambiguation made executable.

**Headline disambiguation artifact — the four-strings reference.** Build a compact reference the student leaves with, as a **`Figure`** (HTML+CSS table-card) or **`TabbedContent`**. Four rows, one per string: `'use client'`, `'use server'`, `import 'server-only'`, `import 'client-only'`. Columns: *What it marks* / *Direction* / *Failure if misused* / *Canonical file*. This is the single artifact that disambiguates everything the lesson introduced. Pedagogical goal: collapse four confusable strings into one scannable contrast the student can recall on sight. Place it here (after all four are taught) as the consolidation point.

Exercise — **`Matching`** drill, the section's check. Left column: files (`db/index.ts`, `app/invoices/_actions.ts`, `app/invoices/_components/mark-paid-button.tsx`, a `window`-reading browser helper, a plain Server Component page). Right column: the correct opening line (`import 'server-only';`, `'use server';`, `'use client';`, `import 'client-only';`, *no directive*). Goal: force the student to *place* the right marker per file — the exact decision they'll make in real code — rather than recognize a definition. The "no directive" option is deliberately included to verify the student remembers Server Components are the default (defends against over-marking).

Reasoning: this is the lesson's payoff section, so it carries the heaviest consolidation (the four-string reference) and the most decision-shaped check (`Matching`). The two confusions are both resolved here because all four strings are now on the table.

## Recap and what's next

Three carry-forward ideas, terse:

- **The directives are literal strings with strict placement.** `'use client'` (first non-comment line, propagates downward, typo'd silently) marks client components; `'use server'` marks Server Actions (RPC, not Server Components). Different jobs, parallel names — don't conflate them.
- **Explicit over magic (Principle #6).** The boundary is a string you can read, review, and blame — not inference you have to simulate. The senior stance across the stack.
- **`server-only` / `client-only` are the enforcement.** One side-effecting import turns a silent server-code leak into a loud build error. Every server-only helper opens with `import 'server-only';`.

Forward-point honestly to the two still-open chapter threads (matching L1/L2's recap style): L4 — *exactly what is allowed to cross the wire* when you pass props (the serialization rules, the secrets-in-props leak shown in full); L5 — *what happens when the two renders disagree* (hydration's failure modes). Name Ch 043 once as the home of the full Server Action surface.

`ExternalResource` cards (reference, not a reading list): React docs `'use client'` and `'use server'` directive references; Next.js "Server and Client Components" (the `server-only`/`client-only` section). Resourcer-gated optional `VideoCallout` — leave a TODO, do not invent an id; the lesson must stand without it.

## Tooltip terms (`<Term>`)

Strategic, only what supports the lesson and isn't already a live `<Term>` from L1/L2 (Server Component, Client Component, hydration, bundle are already defined upstream — re-tooltip only if the term hasn't appeared as a `Term` in this lesson's reading path):

- **Directive** — a literal string at a module or function head that the bundler/runtime reads as an instruction (not executable code in the usual sense).
- **Server Action** — a server-side function exposed as a callable endpoint to Client Components via `'use server'`; named here, taught in Ch 043.
- **RPC** (remote procedure call) — calling a function that runs on another machine as if it were local; the model behind Server Actions. Non-obvious acronym worth a one-line gloss.
- **side-effecting import** — `import 'x';` with no binding, imported for what it does at module load, not for a value (covers both `server-only` and `import './globals.css'`).
- **transitive import** — a module you don't import directly but pull in through a chain of imports; the reason a leak hides three hops deep. (Reinforces L2's propagation; re-gloss only if not already a `Term`.)

# Scope

**Prerequisites — redefine concisely, do not re-teach:**
- Server Components are the directive-less default; run once on the server, ship zero JS (L1). One sentence.
- Client Components, `'use client'` as a boundary marker, the two-render model, transitive propagation into the client subgraph (L2). The student owns these — *build on them*, don't restate the mechanics.
- The server=cool / client=warm color language and the invoices domain (L1/L2). Reuse, don't re-establish.

**Owned by this lesson (the delta):** exact placement rule of both directives; the silent-typo trap; no-op-when-crossed; the `'use client'`/`'use server'` job asymmetry; `'use server'` as Server-Action marker (placement only); Architectural Principle #6 at its canonical site; the convention-isn't-enforcement gap; `server-only` / `client-only` mechanism, usage, and the senior every-helper-has-the-line pattern; the two must-kill confusions (`'use server'`≠Server Components, `server-only`≠`'use server'`).

**Explicitly out of scope — do not teach:**
- The full Server Action surface: validation, error/`Result` shapes, redirects, `useActionState`, form wiring, the five-seam pattern → **Chapter 043**. `'use server'` examples are stubs only.
- The serialization rules / what crosses the RSC wire / Server Action references as the only function-like value that crosses / secrets-in-props shown in full → **L4** (named as forward-pointer only).
- Hydration mechanics and mismatch failure modes → **L5**.
- Route handlers (`app/api/.../route.ts`) as the alternative to Server Actions → **Chapter 046** (do not introduce, not even as contrast).
- `'use cache'` / `cacheLife` / `cacheTag` — these are also directives but belong to **Chapter 032**; do not group them in with `'use client'`/`'use server'`.
- Async Request APIs (`cookies()`, `headers()`) at depth → Ch 032/033.
- `next build` output reading / bundle analyzer treemap → **Ch 094** (L2 already deferred this; name the build *error* from `server-only`, not bundle-size measurement).
- Re-teaching the transitive-propagation mechanic from scratch — L2 owns the derivation; this lesson uses it.

# Notes for downstream agents

- **Do not invent a custom diagram component** unless the four-string reference genuinely needs it — prefer a `Figure`-wrapped HTML+CSS table-card or `TabbedContent`. The lesson's load is conceptual disambiguation, well served by a clean comparison table; a heavy custom Astro component is likely overkill here. If a leak-chain visual beyond the `AnnotatedCode` is wanted, an `ArrowDiagram` mapping the import hops could work, but the `AnnotatedCode` walkthrough is the lighter first choice.
- **Resist Server Action creep.** Every reviewer pass should check that no `'use server'` example grew a real body, a call site, or validation. If it reads like Ch 043, cut it back to a stub.
- The two `Buckets`/`Matching` exercises are the spine of assessment; keep their items phrased as *behaviors/files*, never as the literal directive strings, so the student reasons rather than pattern-matches (per `multiple-choice.md` and `buckets.md` guidance).
