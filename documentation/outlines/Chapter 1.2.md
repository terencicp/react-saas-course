# Chapter 1.2 — Runtime and package manager

## Chapter framing

This chapter is the first lesson where the student touches their machine. The job is to pin the runtime, the package manager, and the way TypeScript actually runs — three decisions that, made well, will not be revisited again for the rest of the course, and made poorly will produce the class of "works on my machine" bugs that eats senior time.

Chapter 1.1 installed the reading rules. This chapter exercises them on the first concrete stack decisions:

- **Pinning is the deliverable, not "installing Node."** The TOC bullet for 1.2.1 is "pinning Node and the broader toolchain with mise so every contributor and CI box runs identical versions." The shape of the lesson follows: mise is taught as a pinning mechanism first, a version manager second. `nvm` and `volta` get a one-line dismissal with the trigger that would flip the choice. No history.
- **Defaults before conditionals.** Node 24 LTS is the default. The native strip-types path (stable since Node 25.2.0 / backported to 22.18 and 24.12) is the default for backend scripts and CLIs. `tsx` is the conditional power tool past a named trigger (path aliases, decorators, JSX outside a framework). `tsc → .js` is reserved for library publishing and CI type-checking. Every lesson names the trigger before the tool.
- **pnpm wins on correctness, not speed.** The 2026 senior reason for pnpm over Bun is the strict, non-hoisted node_modules layout that surfaces phantom dependencies at install time, plus universal Node compatibility and battle-tested monorepo support. Speed differences are real but ride below the build phase in CI. Stated once here; it is not the lesson's center.
- **The lockfile is a contract, not a build artifact.** It belongs in version control and never in `.gitignore`. The chapter teaches what the lockfile is, what it prevents, and the failure shape when a teammate runs `npm install` against a pnpm repo.
- **Corepack is on its way out.** Node 25 dropped Corepack from distributions. pnpm 10 ships `manage-package-manager-versions` enabled by default and reads the `packageManager` (or `devEngines.packageManager`) field directly. The chapter teaches the post-Corepack flow: install pnpm once globally via mise, pin the version in `package.json`, and let pnpm self-manage from there. Corepack is named once as the historical alternative students will see in older READMEs.
- **The student finishes the chapter with a `.mise.toml`, a `package.json` with `packageManager` pinned, a committed `pnpm-lock.yaml`, and the ability to run a `.ts` file with `node hello.ts`.** That is the runnable state Chapter 1.3 (editor) and Chapter 1.4 (the first Next.js scaffold) build on.

Threads that must run through every lesson:

- **The senior question is always "what does this prevent."** Every tool earns its weight against a concrete failure mode a returning dev has seen at least once (the wrong Node on CI, the missing dep that worked because someone else's package hoisted it, the production deploy that failed because `tsx` was a dev-only dependency).
- **Cross-platform from the first command.** macOS and Linux share the same install path; Windows users are pointed at WSL2 once in 1.2.1 and the course assumes WSL2 from there. No PowerShell variants in code blocks.
- **No editor yet.** The student has a terminal and `cat`/their existing editor. VS Code arrives in Chapter 1.3. Snippets are short enough to type or paste blind.
- **Verify steps are runnable, not visual.** Every setup lesson ends with a command that prints a version or runs a file. The student sees output, not a screenshot.

This chapter ships terminal commands and small `.toml` / `.json` / `.ts` snippets. No application code. No frameworks. The Next.js scaffold lands in Chapter 1.4.

---

## Lesson 1.2.1 — Pinning the toolchain with mise

Topics to cover:

- The senior question: what does pinning the runtime prevent. Two failure modes named concretely — the CI box that runs a different Node minor than the developer's laptop and quietly tree-shakes a feature out, and the new contributor whose system Node is two majors behind and breaks half the dev scripts on `pnpm install`. Pinning makes the runtime a property of the repo, not the machine.
- mise as the default in 2026, with the trigger framing. mise is Rust-built, polyglot (Node, Python, Ruby, Go, whatever the project needs later — Trigger.dev's local CLI, for one), reads `.tool-versions` and `.nvmrc` for migration, and ships environment-variable and task-runner features the course will use again. nvm gets one line: shell-script architecture, Node-only, slower; the trigger to flip back is "team already standardized on nvm and migration cost is not worth it." Volta gets a sentence: still maintained, narrower scope, fine if it's already in place.
- Installing mise on macOS and Linux (Homebrew or the install script); the shell activation step (`mise activate zsh` / `bash` in the rc file) named explicitly as the line that often gets skipped and produces "command not found" half an hour later. Windows: install WSL2 first, then follow the Linux path. One line, one link, no PowerShell guide.
- Choosing the Node version. Node 24 is the current LTS in May 2026 with maintenance through late 2027; the course pins Node 24. Why LTS over Current: production SaaS doesn't ride the bleeding edge unless a feature is load-bearing. Native TypeScript stripping (Lesson 1.2.4) is available on Node 24.12 forward, so the LTS isn't the cost it used to be.
- Writing the first `.mise.toml` at the repo root: `[tools] node = "24"`. The `mise use --pin node@24` command as the shortcut that writes the file for you and pins the full version string. The `mise install` step that fetches the pinned version into the user's mise store. `mise current` to verify.
- The directory-scoped behavior: cd into the project, mise swaps the active Node version automatically. cd out, it swaps back. The "trust" prompt mise emits the first time it sees a new `.mise.toml` (and why) — named so the student isn't surprised.
- Forward link: pnpm gets installed in 1.2.2 and pinned through mise the same way, with one more wrinkle the next lesson handles (`packageManager` in `package.json`).

What this lesson does not cover:

- Installing pnpm or any other tool through mise — that arrives in 1.2.2 where it earns its weight.
- mise's task runner, env-var management, or hooks beyond `[tools]` — those land at the call sites later in the course (Trigger.dev local, env validation in 1.4.5).
- nvm's `.nvmrc` workflows, Volta's `volta pin` workflow, asdf migration — the lesson names them as alternatives and moves on.

Pedagogical approach:

Setup/wiring archetype with a Decision opening. The first two paragraphs are the decision — why pin at all, why mise — because the student needs to know they're not being asked to install another tool for the sake of it. Then a `Steps` block walks the install on macOS/Linux (with the WSL2 line for Windows users branched into an Aside), the shell activation, the `mise use --pin node@24` command, and the `node --version` verify. The `.mise.toml` produced is shown as a labeled code block — three lines, no commentary, the smallest possible file. Close with one short Tokens or PredictOutput exercise on a `.mise.toml` snippet ("which line pins which tool") to confirm the format landed. The lesson is short on purpose: pinning is one decision and one file.

Estimated student time: 20 to 25 minutes.

---

## Lesson 1.2.2 — pnpm: install, scripts, and self-managed versions

Topics to cover:

- pnpm as the package manager default in 2026, with the senior reason named before the install command: strict non-hoisted `node_modules` (phantom-dependency bugs surface at install time, not in production), monorepo-first design, mature ecosystem, full Node compat. Bun gets one line as the conditional alternative — faster on cold installs, ~95% Node-compat means one package in twenty surprises, no built-in audit, ready for some teams in 2026 but not the default the course teaches against. The trigger that would flip the choice: a greenfield project where install time genuinely dominates CI and the team has the bandwidth to handle compat edges.
- Installing pnpm through mise (`mise use --pin pnpm@10`) rather than globally via Homebrew or the standalone installer — keeps the package manager version pinned per-repo for free and avoids the global-version drift that bites teams.
- The post-Corepack reality. Corepack is removed from Node 25+ distributions and the ecosystem is moving off it. pnpm 10 ships `manage-package-manager-versions` enabled by default, so once any pnpm is installed, the `packageManager` field in `package.json` is enough to lock the version per-repo — pnpm itself swaps in the right binary. The lesson writes the `packageManager: "pnpm@10.x.y"` field by hand (or by running `pnpm use ...`) and explains the field is read by pnpm on every invocation. Corepack named once as the historical mechanism the student may see in older READMEs; not used here.
- The minimum viable `package.json` — `name`, `private: true` (because this is an app, not a publishable library, and the field prevents an accidental `pnpm publish`), `type: "module"` (ESM-first in 2026), `packageManager`, and an empty `scripts` block. Each field gets one line on what it does.
- The four pnpm commands a SaaS engineer runs daily: `pnpm install` (and what it actually does — resolves the dependency graph, writes the lockfile, populates `node_modules` from the global content-addressed store via symlinks), `pnpm add <pkg>` / `pnpm add -D <pkg>` (with the dev-dependency distinction at production-build time named explicitly), `pnpm remove`, and `pnpm run <script>` (with the `pnpm <script>` shorthand and what `pnpm` does when the script name collides with a built-in).
- npm scripts as the universal task runner. The chapter doesn't introduce its own scripts yet — the Next.js scaffold in 1.4.1 will — but the shape is shown: one tiny `"hello": "node hello.ts"` example tied forward to lesson 1.2.4.
- A note on `.npmrc` at the repo root for two settings the course will rely on: `auto-install-peers=true` (modern default, but explicit avoids the surprise on older pnpm versions) and `engine-strict=true` (the `engines` field in `package.json` becomes a hard error, not a warning — pairs with the runtime pin from 1.2.1). `shamefully-hoist=false` left as the default and named, so the student knows what they're getting.

What this lesson does not cover:

- The lockfile in depth — that's the next lesson.
- Monorepo `workspaces` configuration — not needed until much later; the course doesn't go monorepo by default.
- pnpm catalogs, `dlx`, `exec`, `licenses`, `audit` — surveyed at the call sites where they earn their weight (security baseline in 17.2).
- Bun-specific syntax or installation. The comparison is one line; the lesson commits to pnpm.

Pedagogical approach:

Setup/wiring with one Decision beat up front. Open with the pnpm-vs-Bun decision in three sentences — the failure pnpm prevents (phantom deps), the conditional that flips it (greenfield with CI install time dominating), and the verdict for this course. Then a `Steps` block walks `mise use --pin pnpm@10`, the `pnpm init` (or hand-written `package.json`), the `packageManager` line, and the `.npmrc`. Show the resulting two files as labeled code blocks side by side using `Tabs`. Demonstrate one round of `pnpm add zod` / `pnpm remove zod` purely to show the lockfile updating and the `node_modules` symlinks appearing — students are watching the mechanism, not learning Zod. Close with a Buckets exercise sorting six commands into "install / add / remove / run / not pnpm" to confirm the command surface landed. The Bun line should not become a sidebar; one sentence, then on with the lesson.

Estimated student time: 25 to 30 minutes.

---

## Lesson 1.2.3 — The lockfile as a contract

Topics to cover:

- What `pnpm-lock.yaml` is. The resolved, fully-pinned graph of every transitive dependency at the exact version, integrity hash, and resolution path. Distinct from `package.json`, which only declares the top-level intent and the version ranges; the lockfile records the actual decision.
- The senior question: what does the lockfile prevent. Concrete failure shapes — a teammate running `pnpm install` six months from now and getting a patched-but-broken sub-dependency that the original install didn't see; a CI build that resolves a different graph than the dev machine because the version range allowed it; a supply-chain incident where the integrity hash is the only thing flagging that an upstream artifact was tampered with. The lockfile is the artifact that makes "works on my machine" actionable.
- The commit rule, stated as a hard default with no hedging: `pnpm-lock.yaml` belongs in version control. It is never in `.gitignore`. The course's `.gitignore` will be shown in 1.4.1; the lockfile is not in it. The library-publishing exception (lockfile sometimes excluded from the published tarball but still committed to the repo) named in one line, then dropped — this course ships apps, not libraries.
- What happens on `pnpm install` when the lockfile is present and valid: pnpm uses it as the resolution source of truth and the install is deterministic. When `package.json` and the lockfile disagree (a teammate edited a version range without re-installing), pnpm fails the install in CI with `--frozen-lockfile` — the flag the course's CI will use in Unit 21. Named here so the student recognizes it later.
- Merge conflicts in the lockfile. The senior move: never hand-edit. Resolve the `package.json` conflict, then run `pnpm install`, which re-resolves and rewrites the lockfile. Most teams configure git to mark the file as `merge=ours` or `linguist-generated` so reviewers don't try to read the diff.
- The mixed-package-manager failure mode. A teammate who runs `npm install` against a pnpm repo generates a `package-lock.json`, breaks the workspace symlinks, and produces a second source of truth. The `preinstall` script `npx only-allow pnpm` as the structural enforcement that makes this hard to do accidentally. Shown as a one-line addition to `package.json`.
- The `engines` field pairing with `engine-strict=true` from the previous lesson — pinning Node and pnpm versions inside the same file the lockfile shares a directory with, so all three (runtime, package manager, dependency graph) live in one commit.

What this lesson does not cover:

- The exact YAML schema of `pnpm-lock.yaml` — students don't need to read it by hand and shouldn't.
- npm or Yarn lockfile differences — one line on "all three exist, all three serve the same purpose, the course commits to pnpm's."
- Dependency-update tooling (Renovate, Dependabot) — that's a Unit 21 / 22 concern.

Pedagogical approach:

Pattern archetype. The lesson's center is the failure mode the lockfile prevents, and the structural enforcement (commit it; `only-allow pnpm`; `--frozen-lockfile` in CI) that makes the failure hard to produce. Open with one concrete scenario in prose — two engineers, six months apart, same `package.json`, different `node_modules` — and let the student feel the bug before naming it. Then the commit rule as a single sentence in bold. Show the `package.json` evolved across the chapter so far (Tabs comparing 1.2.2's version with the `engines` field and `preinstall` script added) — students see the file accreting decisions, not being rewritten. One quick Matching exercise pairing four failure modes ("teammate edits version range without installing," "CI uses different package manager," "merge conflict in the lockfile," "supply-chain tampering") with the four mitigations the lesson named. No sandbox here; the lesson is about a rule, not a thing to play with.

Estimated student time: 20 to 25 minutes.

---

## Lesson 1.2.4 — Running TypeScript: native strip-types, tsx, and tsc

Topics to cover:

- The senior question: how does `.ts` source actually execute. Three paths in 2026, each with a trigger that selects it. The lesson's job is to name the default and the two triggers, not survey every flag of every tool.
- The default: native type stripping in Node. Stable since Node 25.2.0, backported to Node 24.12 and Node 22.18, no flag needed — `node hello.ts` Just Works. What it does mechanically: parses the file with OXC, removes type annotations, executes the resulting JavaScript. What it does not do: type-check (still `tsc --noEmit` for that), transpile (no JSX, no decorators, no enum lowering, no downlevel), and crucially, does not read `tsconfig.json` — so path aliases like `@/lib/...` will not resolve. Named in one line: native stripping is for the .ts files that don't need a tsconfig.
- The trigger that flips to `tsx`: any of path aliases from tsconfig, JSX outside a framework, decorators, enums, or downlevel-target needs. `tsx` reads `tsconfig.json`, handles path resolution, and stays a dev-dependency-only tool. Install (`pnpm add -D tsx`), invocation (`pnpm tsx script.ts`), and the watch mode (`pnpm tsx watch script.ts`) for dev scripts. The senior watch-out: `tsx` is a dev tool, not a production runtime — never ship a service that `tsx`s itself in production.
- The trigger that flips to `tsc`: shipping a library to npm, or CI type-checking the codebase. `tsc --noEmit` is the dedicated type-checker the course's CI will run on every PR; the actual `.js` output of `tsc` is what publishable packages ship. The course is an app, not a library — `tsc → .js` is mentioned and parked.
- One worked example end-to-end. Create `hello.ts` with a typed function. Run `node hello.ts` — works, output appears. Add a path alias and an import that uses it — `node` fails with a resolution error. Switch to `pnpm tsx hello.ts` — works. Run `pnpm tsc --noEmit` — works (type check passes). The student watches the three paths cleanly partitioned.
- Forward link: Next.js owns the .ts compilation pipeline for application code (Chapter 1.4 onward). Native strip-types and `tsx` are for the scripts the SaaS engineer writes around the app — seed scripts, migration runners, one-off CLIs, Drizzle Kit invocations. The trigger for each is named at the call site later.
- One sentence on `ts-node`: legacy, deprioritized, replaced by `tsx` for dev and by native Node for the basics. Named so the student recognizes it in older docs and doesn't reach for it.

What this lesson does not cover:

- Authoring `tsconfig.json` — that's Chapter 1.4.3.
- The `--experimental-transform-types` flag (still experimental, lowers TypeScript-only syntax like enums) — one line and a "reach for it when…" forward pointer; not the default.
- Bundlers (esbuild, swc, Turbopack) — Next.js handles application bundling end-to-end starting in 1.4.
- Publishing a library to npm — out of scope for the course.

Pedagogical approach:

Decision archetype with a small worked-example beat. Open with the three-paths framing: native default, `tsx` past a trigger, `tsc` for library publishing or CI type-check. A small `Figure` with a three-branch decision tree (Mermaid flowchart — "does it need path aliases / JSX / decorators? → tsx. Library? → tsc. Otherwise? → node directly") makes the partition visual. Then the worked example as a `Steps` block: write the file, run `node hello.ts`, add the alias, watch it fail, switch to `tsx`, watch it pass, run `tsc --noEmit`. Each step is one command and one labeled output block — students see the cause and effect. Close with a Matching or Dropdowns exercise: given five `.ts` script scenarios ("seed script, no aliases," "library publish," "one-off CLI with `@/lib` import," "CI type-check," "running JSX from a standalone script"), the student picks the right execution path for each. The lesson is the partition, not the syntax.

Estimated student time: 30 to 35 minutes.

---

## Total chapter time

Roughly 100 to 115 minutes across the four lessons. The chapter is sized to a single long evening or two short ones. At the end the student has a `.mise.toml`, a `package.json` with `packageManager` and `engines` pinned, a `.npmrc`, a committed `pnpm-lock.yaml`, an `only-allow pnpm` preinstall guard, and the ability to run `node hello.ts` and `pnpm tsx hello.ts` on demand. Chapter 1.3 (editor) lands on this floor without re-explaining any of it.
