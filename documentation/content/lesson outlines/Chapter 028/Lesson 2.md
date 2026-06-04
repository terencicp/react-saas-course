# Chapter 028 — Lesson 2 outline

## Lesson title

- Page title: **pnpm and the lockfile contract** (chapter-outline title fits — keep)
- Sidebar: **pnpm and the lockfile**

## Lesson type

`Walkthrough`

Config-file walkthrough of the provided pnpm toolchain. No student code, no test suite, no exercises. The test-coder does not run for this lesson.

## Lesson framing

The student walks away able to read a 2026 SaaS project's package-manager layer the way a senior does: knowing why pnpm is the default (and the one trigger that would flip it to Bun), why the package-manager and runtime versions are pinned per-repo rather than installed globally, and — the payoff — why `pnpm-lock.yaml` is a committed contract that turns "works on my machine" from a recurring bug class into a structurally-prevented one. The senior decision installed is *reproducible installs by default*: the lockfile, the pinned versions, the `engine-strict` hard error, and the `only-allow pnpm` guard all exist to make a divergent dependency graph hard to produce by accident.

## Codebase state

**Entry.** The provided `start/` scaffold from Lesson 1 is cloned and `pnpm install` has already populated `node_modules`; `pnpm dev` serves the page shell. The toolchain files exist on disk but are unexamined: `.mise.toml` (pins `node = "24"`, `pnpm = "11.3.0"`), `package.json` (`packageManager`, `engines`, scripts, `preinstall`), `.npmrc` (`engine-strict`, `auto-install-peers`), `pnpm-workspace.yaml` (allows the `sharp` build), and the committed `pnpm-lock.yaml`. The student has `mise` installed from chapter 003 lesson 8.

**Exit.** The student understands every decision in the package-manager layer: why pnpm over npm/Bun, why pnpm is pinned through `mise` plus the `packageManager` field rather than a global install, what each line of `package.json`/`.npmrc`/`pnpm-workspace.yaml` buys, the four daily pnpm commands, the lockfile-as-contract rule (committed, never `.gitignore`d, never hand-edited, re-resolved on conflict), and the mixed-package-manager failure mode the `preinstall` guard prevents. No files are edited — this is a read-and-understand lesson. Sets up Lesson 3 (`AGENTS.md`), which references these commands.

## Lesson sections

Walkthrough structure — teaching prose grouped by surface, no exercises, no `<details>`. Sequence the sections so the *decision* leads, the *provided files* follow, and the *lockfile contract* lands as the climax.

### Introduction (no header)

The senior question stated implicitly: when a teammate runs `pnpm install` six months from now, do they get the same dependency graph you shipped against? Frame the lesson as reading the provided toolchain that guarantees yes. One-paragraph warm intro; name that this is the from-scratch project's foundation (chapter 035 onward carries it forward via `degit`), so every decision here is worth understanding once.

### Why pnpm

The decision up front, three sentences. pnpm is the 2026 package-manager default on this stack: strict non-hoisted `node_modules` (phantom-dependency bugs surface at install time, not in production), monorepo-first design, mature ecosystem, full Node compat. Bun gets exactly one line as the trigger-gated alternative — faster cold installs, but ~95% Node-compat means one package in twenty surprises and there is no built-in audit; ready for some teams in 2026, not the course default. Name the trigger that would flip the choice: a greenfield project where install time genuinely dominates CI and the team has bandwidth for compat edges. pnpm is named once; commit and move on.

Components: prose only. The Bun comparison is a sentence, not an `Aside` or a table — keep it inline so it reads as a footnote, not a sidebar.

### Pinning pnpm — mise and the post-Corepack reality

Two-part decision. First: pnpm is pinned *through mise* (`.mise.toml` pins both `node = "24"` and `pnpm = "11.3.0"`), not installed globally via Homebrew or the standalone installer — this keeps the package-manager version pinned per-repo for free and avoids the global-version drift that bites teams. The student already has `mise` from chapter 003 lesson 8. Second: the post-Corepack reality — Corepack is removed from Node 25+ distributions and the ecosystem is moving off it; pnpm 11 ships `manage-package-manager-versions` enabled by default, so once any pnpm is installed, the `packageManager` field in `package.json` is enough to lock the version per-repo (pnpm swaps in the right binary on every invocation). Connect the two: `.mise.toml` and the `packageManager` field are belt-and-suspenders — either alone pins the version; together they cover the case where a contributor has mise and the case where they don't.

Components: `Code` for the three-line `.mise.toml` (`[tools]` / `node = "24"` / `pnpm = "11.3.0"`). Inline-cite `packageManager: "pnpm@11.3.0"` from `package.json` (shown in full in the next section).

### The package.json, line by line

Walk the provided `package.json` as the minimum-viable app manifest. Author one line per field on what it buys:
- `name` — the project identifier (`chapter-028-themed-product-surface`).
- `private: true` — this is an app, not a publishable library; the field prevents an accidental `pnpm publish`.
- `type: "module"` — ESM-first in 2026; every `.js`/`.mjs` is a module unless named `.cjs`.
- `packageManager: "pnpm@11.3.0"` — read by pnpm on every invocation to lock the version (the post-Corepack mechanism above).
- `engines: { node: ">=24" }` — declares the runtime floor; only a hard error when paired with `engine-strict=true` (next section).
- `scripts` — name `dev`/`build`/`start` now; note `format`/`lint`/`check`/`verify` arrive in Lesson 5 and `test:lesson` is the harness, and that `preinstall` is covered at the end of this lesson.

Components: `AnnotatedCode` over the full `package.json` — this is the canonical multi-part file where directing student focus to each field in turn earns the stepped walkthrough. Highlight `private`, `type`, `packageManager`, `engines`, and the `preinstall` line as separate steps; group the routine `dev`/`build`/`start` scripts into one step and forward-reference Lesson 5 for the Biome scripts.

### .npmrc and the workspace allowlist

Two settings the course relies on, plus the build allowlist. `.npmrc` at the repo root:
- `engine-strict=true` — turns the `engines` field from a warning into a hard error; pairs with the runtime pin from chapter 003 lesson 8 so a contributor on the wrong Node version is stopped at install, not at a confusing runtime crash.
- `auto-install-peers=true` — the modern default, made explicit so older pnpm versions don't surprise.

Then `pnpm-workspace.yaml`: pnpm 10+ blocks dependency lifecycle build scripts by default (a supply-chain default — covered in depth in Unit 16); this file is the allowlist. The scaffold lists `sharp` under `onlyBuiltDependencies` (with the paired `allowBuilds: { sharp: true }`) so Next.js's image pipeline can compile its native binary. One paragraph; the point is *why the file exists*, not the full supply-chain story.

Components: `Code` for the two-line `.npmrc` and the `pnpm-workspace.yaml` (show both keys verbatim). A short `Aside` (note) is appropriate to forward-link the pnpm-blocks-build-scripts supply-chain default to Unit 16 without re-explaining it here.

### The four daily commands

The pnpm commands a SaaS engineer runs every day, each with what it actually does:
- `pnpm install` — resolves the dependency graph, writes/verifies the lockfile, and populates `node_modules` from the global content-addressed store via symlinks (the non-hoisted layout from the "Why pnpm" section pays off here).
- `pnpm add <pkg>` / `pnpm add -D <pkg>` — add a runtime vs. dev dependency; name the distinction explicitly (dev deps are excluded from the production build/install).
- `pnpm remove <pkg>` — remove and re-resolve.
- `pnpm run <script>` / `pnpm <script>` shorthand — and what pnpm does when a script name collides with a built-in command (the built-in wins; use `pnpm run` to disambiguate).
Name `--save-exact` here as the watch-out: `pnpm add -D --save-exact <pkg>` pins without a caret, the pattern for the few tools the course pins explicitly (Biome in Lesson 5, where `@biomejs/biome` sits at exactly `2.4.16`). State when to reach for it — version-sensitive tooling where a patch bump can change formatting/lint output — versus normal dependencies where the caret range plus the lockfile is the right default.

Components: `Code` for the command list (a single annotated block, or a short fenced list per command). No interactive component — these are reference commands the student will run in later lessons, not an exercise.

### The lockfile as a contract

The climax. Lead with the distinction: `package.json` declares top-level *intent* (the version ranges); `pnpm-lock.yaml` records the actual *decision* — the resolved, fully-pinned graph of every transitive dependency at an exact version, integrity hash, and resolution path.

The senior question: what does the lockfile prevent? Give concrete failure shapes —
- a teammate running `pnpm install` six months out and getting a patched-but-broken sub-dependency the original install never saw (the version range allowed it);
- a CI build resolving a different graph than the dev machine because the range left room;
- a supply-chain incident where the integrity hash is the only signal that an upstream artifact was tampered with.

Then the hard rules, stated without hedging:
- **The commit rule.** `pnpm-lock.yaml` belongs in version control. It is never in `.gitignore`. (Point at the provided `.gitignore` — the lockfile is conspicuously absent from it; this is intentional, not an omission.) Skipping this produces the exact "works on my machine" bugs the chapter's discipline exists to prevent — not a taste call.
- **`--frozen-lockfile` in CI** — the structural enforcement: CI installs fail if the lockfile and `package.json` disagree, so a forgotten lockfile update is caught before merge. Named here, used in Unit 20.
- **Merge conflicts.** Never hand-edit the lockfile. Resolve the `package.json` conflict, then run `pnpm install` — pnpm re-resolves and rewrites the lockfile. Most teams mark the file `merge=ours` or `linguist-generated` in `.gitattributes` so reviewers don't try to read the diff.

Components: this is the section that earns a focus-directing component. Use `CodeVariants` (or a paired before/after `Code`) to contrast a `package.json` dependency range (`"next": "16.2.7"`, `"clsx": "^2.1.1"`) against the corresponding resolved lockfile entry (exact version + integrity hash + resolution) so the *intent vs. decision* split is visible, not just asserted. Do not paste the whole lockfile — show one representative entry. An `Aside` (caution) carries the "never hand-edit, never gitignore" rules as a hard default the student can scan back to.

### The mixed-package-manager guard

Close on the failure mode the `preinstall` script prevents. A teammate who runs `npm install` against a pnpm repo generates a `package-lock.json`, breaks the workspace symlinks, and creates a second, conflicting source of truth. The `preinstall` script `npx only-allow pnpm` (already shown in the `package.json` walkthrough) is the structural guard — any non-pnpm install aborts before it can do damage. Frame it as the same family of move as `engine-strict` and `--frozen-lockfile`: make the wrong thing hard to do by accident rather than relying on everyone remembering.

Components: `Code` showing the `preinstall` line in context and (optionally) the error message `only-allow` emits when `npm install` is attempted, so the student recognizes it in the wild.

## Scope

- **Does not cover** the rest of the toolchain: `AGENTS.md` (Lesson 3), `tsconfig.json` (Lesson 4), `biome.json` and the `format`/`lint`/`check`/`verify` scripts (Lesson 5) — this lesson stops at the package-manager and lockfile layer.
- **Does not cover** the `mise` install itself or Node 24 setup — done in chapter 003 lesson 8; reference, don't re-teach.
- **Does not cover** pnpm's full supply-chain hardening (build-script blocking, `pnpm audit`, minimum-release-age) beyond the one-line `sharp` allowlist — Unit 16 owns the supply-chain defaults.
- **Does not cover** the CI wiring (`--frozen-lockfile`, `biome ci`, the GitHub Actions job) beyond naming it — Unit 20 owns CI.
- **Does not cover** monorepo workspaces in practice — named as a pnpm design strength, but this project is a single package; workspaces are not exercised.
