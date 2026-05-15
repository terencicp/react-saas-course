## Concept 1 — Pinning is the deliverable

**Why it's hard.** Returning devs treat "install Node" as the task and assume the global Node on their laptop is the project's runtime. The mental shift is that the runtime, the package manager, and the lockfile are properties of the repo a teammate clones, not properties of the machine doing the cloning. Until that lands, every later setup step reads as one more tool to install.

**Ideal teaching artifact.** A Concept-archetype opener built around one concrete failure scene: two laptops side-by-side, same `git clone`, same `package.json`, different Node minors. On the left, an `Array.prototype.toSorted` call runs; on the right, it throws because the laptop is on Node 18. Show the same scene replayed underneath with a `.mise.toml` in the repo and both laptops auto-switching to Node 24. The student sees, in one image, what the chapter is actually selling: the contract that the file is the source of truth for the runtime.

**Engagement.** A two-question `TrueFalse` round after the figure — "the runtime version belongs in `.gitignore`," "a teammate's CI box needs to be told the Node version separately from the repo" — both false. Locks the contract framing before the install steps land.

**Components.**
- `Figure` wrapping a hand-authored SVG of the two-laptops scene (top: drift produces a failure; bottom: pinned `.mise.toml` makes both laptops swap to Node 24 on `cd`). Caption names what the diagram shows.
- `TrueFalse` with two statements as the recall beat.
- Alternative: a bespoke `RepoVsMachineSplit` component if the same metaphor recurs in 1.2.3 (lockfile) and 1.4 (tsconfig) — flagged in proposals.

---

## Concept 2 — Picking mise without surveying every Node manager

**Why it's hard.** A returning dev has heard of nvm, possibly Volta, maybe asdf, and the chapter's job is to make mise feel like a decision rather than a brand swap. The trap is treating the four tools as roughly equivalent and letting the student spend an evening comparison-shopping instead of writing the file.

**Ideal teaching artifact.** Decision archetype, three sentences of prose with the trigger framing, then a small comparison Figure that's deliberately one-sided: mise gets the four properties that earn it the default slot (Rust-built, polyglot, `.tool-versions`/`.nvmrc` migration, env-and-tasks for later), nvm and Volta each get one line with the named trigger that would flip the choice ("team already standardized on nvm — migration cost not worth it"). The student leaves with a single-paragraph mental model: mise unless a trigger.

**Engagement.** A short `MultipleChoice` with three scenarios ("greenfield SaaS, no existing Node manager," "joining a team with `.nvmrc` everywhere," "polyglot startup adding Python and Go next quarter") and four choices each — picks the right tool per scenario. Three picks, three confirmations of the trigger frame.

**Components.**
- A prose decision paragraph followed by a small comparison table or `TabbedContent` panel comparing mise / nvm / Volta on one axis (the trigger that earns it).
- `MultipleChoice` for the trigger-recognition recall.

---

## Concept 3 — pnpm's structural correctness: phantom dependencies and the node_modules layout

**Why it's hard.** "pnpm is faster" is the wrong reason and the student will hear it from blog posts. The real senior reason is structural: npm and yarn hoist `node_modules` flat, which means a package can `require` a sibling it never declared and the install will work — until a transitive dep updates and the import disappears. pnpm's strict symlinked layout makes the phantom import fail at install time. The student needs to see the trees, not be told.

**Ideal teaching artifact.** Concept archetype with a two-tree diagram. Left panel: npm's hoisted `node_modules` — `app` depends only on `pkg-a`, but `pkg-b` (a transitive of `pkg-a`) is hoisted to the top level, so `app/index.ts` writes `import 'pkg-b'` and it resolves. Right panel: pnpm's strict layout — `app/node_modules` contains only `pkg-a` as a symlink into `.pnpm/`, and the same import throws `Cannot find module 'pkg-b'`. The diagram's job is to make "phantom dependency" a thing the student can *see* before it's a thing they've been told.

**Engagement.** A `Matching` exercise pairing four scenarios ("CI install on a fresh clone fails after a sibling lib bumps its deps," "the import works locally but blows up in production," "a teammate adds `lodash-es` to one workspace and another workspace imports it without declaring") to the structural reason in pnpm's layout that catches each. The matching is the recall — the diagram is the model.

**Components.**
- `Figure` wrapping a hand-authored SVG of the two `node_modules` trees side-by-side with the phantom import drawn as a red arrow on the left panel and a broken arrow on the right.
- `Matching` for failure-mode-to-mechanism recall.
- Alternative: `DependencyTreeCompare` as a bespoke component if Unit 17 (supply-chain defaults) and Unit 21 (CI install caching) end up needing the same diagram — flagged in proposals.

---

## Concept 4 — The minimum viable package.json, field by field

**Why it's hard.** Every field in a `package.json` looks optional until the student ships without one and meets the bug it would have prevented. `private: true` prevents accidental publish; `type: "module"` prevents the ESM/CJS interop mess; `packageManager` prevents Corepack-or-not-Corepack drift; `engines` paired with `engine-strict` makes the runtime pin a hard error. The trap is reading it as boilerplate.

**Ideal teaching artifact.** Pattern archetype: the file shown once in full, then each field annotated with the bug it prevents on hover. The student isn't reading boilerplate; they're reading five decisions that have already been made. The annotation surface is what turns a copy-paste file into a teaching artifact — each tooltip is one sentence naming the failure mode.

**Engagement.** A `Tokens` round on the same `package.json` block where the student clicks the field that prevents a stated failure ("which field prevents `pnpm publish` from going through by accident," "which field makes a wrong Node version a hard install error"). Five clicks, five confirmations.

**Components.**
- `CodeTooltips` on the labeled `package.json` block — each field name underlined with a one-sentence "prevents…" tooltip.
- `Tokens` for the click-the-field-that-prevents recall.

---

## Concept 5 — The lockfile as a six-months-later contract

**Why it's hard.** The lockfile reads as a build artifact a returning dev expects to gitignore. The shift is seeing it as the record of *the actual decision* the package manager made, distinct from `package.json` which only records intent. The senior story is temporal — two engineers, six months apart, same intent file, different resolved graphs without the lock — and the student needs to feel that gap before the "commit it, never gitignore it" rule lands.

**Ideal teaching artifact.** Pattern archetype with a scrubbable time-skip diagram. Frame 1: `package.json` with `"zod": "^4.0.0"`, lockfile committed, `pnpm install` resolves the graph at T0. Frame 2: six months later, no lockfile, same `pnpm install` resolves a different graph because `zod@4.3.2` patched a sub-dep. Frame 3: lockfile present, `--frozen-lockfile`, install is byte-identical to T0. The student scrubs forward and watches the resolved tree change or not. The diagram lands before the rule does.

**Engagement.** A `Matching` exercise pairing four failure shapes ("teammate edits a range without re-installing," "CI resolves a different graph than dev laptop," "merge conflict in `pnpm-lock.yaml`," "upstream artifact tampered with") to the four mitigations the lesson names (`--frozen-lockfile`, commit-the-lockfile rule, "don't hand-edit; re-run install," integrity hash). One round, four locks.

**Components.**
- `DiagramSequence` scrubbing through T0 / T+6mo-no-lock / T+6mo-with-lock states, each frame a small resolved-tree SVG inside the sequence.
- `Matching` for the failure-to-mitigation recall.

---

## Concept 6 — Mixed-package-manager guardrails as structural enforcement

**Why it's hard.** The student will assume "the team agreed to use pnpm" is enough. It isn't — one teammate runs `npm install` against the repo, generates `package-lock.json`, and silently produces a second source of truth that breaks workspace symlinks. The pattern the chapter teaches isn't "ask politely"; it's the `preinstall` guard that makes the wrong action fail loudly at the start of install rather than quietly halfway through.

**Ideal teaching artifact.** Pattern archetype, wrong-then-right. Show two terminal sessions side by side: left, the teammate runs `npm install` against an unprotected repo and gets a successful-looking output with a fresh `package-lock.json` next to the existing `pnpm-lock.yaml` — the failure has already happened and isn't visible. Right, the same teammate runs `npm install` against a repo with `"preinstall": "npx only-allow pnpm"` and sees the install bail at line one with a clear message. The structural enforcement is the lesson — the guard rejects the wrong tool before it can write anything.

**Engagement.** A `Sequence` ordering drill — "given the `preinstall` guard, put these four events in the order they happen on a teammate's `npm install`" (npm starts, preinstall hook fires, only-allow checks the user agent, install exits non-zero). The sequence makes the mechanism explicit.

**Components.**
- `CodeVariants` with two tabs ("without guard" and "with guard"), each containing the `package.json` snippet and the terminal output of `npm install` against it.
- `Sequence` for the mechanism-order recall.

---

## Concept 7 — Three paths to run a .ts file, partitioned by trigger

**Why it's hard.** The student has probably reached for `ts-node` once, half-remembers `tsx`, and may not know native Node now strips types. The temptation is to learn all three deeply. The senior move is the opposite — recognize the trigger that selects the path and stop. The partition is the lesson, not the syntax of any one tool.

**Ideal teaching artifact.** Decision archetype with a misconception-first beat. Before the decision tree is shown, give the student five concrete script scenarios ("seed script, no aliases," "one-off CLI with `@/lib` import," "running JSX from a standalone script," "CI type-check on a PR," "library publish to npm") and a `Buckets` sort with three buckets — `node directly`, `tsx`, `tsc`. The student sorts cold, on instinct. Then the Mermaid decision tree is revealed underneath as the answer key: "does it need path aliases / JSX / decorators? → tsx. Publishing or CI type-check? → tsc. Otherwise? → node." The sort-before-the-tree turns the partition from a definition into a calibration round.

**Engagement.** The `Buckets` sort *is* the engagement — the artifact carries the assessment. Follow-up confirmation: a one-question `MultipleChoice` on a scenario the buckets didn't cover ("a Drizzle Kit migration script that imports from `@/db/schema`") to confirm the trigger landed.

**Components.**
- `Buckets` with five scenarios over three execution-path buckets, run *before* the decision tree.
- `Figure` wrapping a Mermaid flowchart of the three-branch decision tree, revealed after the sort.
- `MultipleChoice` follow-up on a fresh scenario.

---

## Concept 8 — Native strip-types: what it does and, more usefully, what it doesn't

**Why it's hard.** "Node runs `.ts` now" reads as "TypeScript is solved." It isn't — native stripping parses, removes annotations, and runs the resulting JS, full stop. It doesn't type-check, doesn't transpile JSX or decorators, and crucially does not read `tsconfig.json`, so path aliases break. The student needs the mechanism in their head so the failure mode in Concept 7 (the `@/lib/...` import that throws) feels like a consequence, not a surprise.

**Ideal teaching artifact.** Mechanics archetype, two beats. First, a small three-stage anatomy diagram of what `node hello.ts` does internally: parse-with-OXC → strip-type-annotations → execute. Each stage labeled with one capability it does *not* add — no type check at parse, no JSX transform at strip, no module-resolver rewrite at execute. Second, a worked-example `Steps` block: write `hello.ts` with a typed function, run `node hello.ts` (works), add an `import { z } from '@/lib/schema'`, run `node hello.ts` again and watch the resolution error, switch to `pnpm tsx hello.ts` and watch it pass. The diagram explains *why* the alias broke; the steps make the explanation predictive.

**Engagement.** A `PredictOutput` on a third `.ts` file shown without the command — a script with a path alias *and* an enum. The student predicts which of the three paths runs it cleanly. The mechanism diagram is the model; the prediction is the recall.

**Components.**
- `Figure` wrapping a hand-authored SVG (or simple `ArrowDiagram`) of the parse/strip/execute three-stage anatomy with one "does not" label per stage.
- `Steps` for the worked-example run, with terminal output in adjacent labeled blocks.
- `PredictOutput` for the recall beat.

---

## Component proposals

- **`RepoVsMachineSplit`** — Hand-SVG candidate at first; bespoke only if the metaphor recurs.
  - **Sketch.** Two-laptop split-view component. Inputs: left-laptop state (Node version, file outcome), right-laptop state (Node version, file outcome), shared repo content, optional "pin applied" toggle that flips both laptops to the pinned version. Shows the same `git clone` resolving differently across machines.
  - **Uses in this chapter.** Concept 1.
  - **Forward-links.** Plausibly Chapter 1.4.3 (`tsconfig.json` strictness as a repo-owned property), Chapter 21.x (CI parity). Not yet load-bearing in either.
  - **Leanest v1.** Static hand-SVG inside `Figure` with two laptops drawn and a caption telling the story. Build the bespoke version only when a second chapter actually needs it.

- **`DependencyTreeCompare`** — Hand-SVG candidate at first; bespoke only if forward chapters reuse the tree.
  - **Sketch.** Side-by-side `node_modules` tree visualizer. Inputs: declared deps, transitive graph, layout mode (`hoisted` / `strict`). Renders the resulting tree per mode with imports drawn as arrows; phantom imports highlighted in the hoisted mode and broken in strict mode.
  - **Uses in this chapter.** Concept 3.
  - **Forward-links.** Unit 17.x (pnpm 11+ supply-chain defaults) and Unit 21.x (CI install caching) could reuse the strict-tree diagram. Speculative until those chapters are outlined.
  - **Leanest v1.** Static hand-SVG of the two trees inside a single `Figure`, no interactivity. The phantom import is one red arrow on the left and one broken arrow on the right. Build the controllable version only after the forward-link is real.

## Build priority

Both proposals are demoted to hand-SVG-inside-`Figure` for this chapter under the single-use discipline. Neither has a confirmed second-chapter use yet. The chapter as outlined is fully served by the existing toolkit (`CodeTooltips`, `CodeVariants`, `DiagramSequence`, `Buckets`, `Matching`, `MultipleChoice`, `PredictOutput`, `Sequence`, `Tokens`, `TrueFalse`, `AnnotatedCode`, `Figure` + Mermaid / hand-SVG). Revisit `DependencyTreeCompare` when Unit 17's supply-chain chapter is outlined — if the strict-tree diagram earns a second appearance there, the controllable version compounds and is worth building.

## Open pedagogical questions

- Concept 7's `Buckets`-before-the-tree relies on the student sorting cold. Worth checking whether five scenarios is too many for one round without scaffolding — three might be the right cut, with the other two folded into the follow-up `MultipleChoice`.
- Concept 8's `PredictOutput` puts both a path alias *and* an enum on the same script. That nudges the student toward `tsx`, but enums are a Unit 2 topic — verify the student has seen enough TypeScript by Chapter 1.2.4 to recognize the construct, or swap the enum for a JSX line.
