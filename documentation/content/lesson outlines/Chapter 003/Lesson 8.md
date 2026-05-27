# Lesson 8 — Run TypeScript locally

## Lesson title

- **Title (h1):** Run TypeScript locally
- **Sidebar label:** Run TypeScript locally

## Lesson framing

Setup/wiring lesson, last content lesson of Chapter 003. Three coupled installs the student has been able to defer until now:

1. **Pinning the runtime** (Node 24 LTS via mise) — makes the runtime a property of the repo, not the machine.
2. **Choosing the execution path for `.ts`** — three paths (native `node`, `tsx`, `tsc --noEmit`), each gated by a named trigger.
3. **A one-file worked example** that walks the student through the partition end-to-end.

**Senior question.** Up to L7 the student lived in the TS Playground and inline exercises. From Chapter 004 onward they touch multi-file modules, async, Temporal — local files, real Node. The lesson question is *how does a `.ts` file actually execute on disk in 2026*, and the answer is "depends on which of three triggers fires." Tools earn their weight; no premature install.

**Where students get stuck.** Three pain points to anticipate:
- **Shell activation gap.** New mise users skip `mise activate zsh` in `~/.zshrc` and get `command not found` half an hour later. Name the step explicitly.
- **"Why does `node hello.ts` fail with my alias?"** The default native path is intentionally tsconfig-blind. Show the failure mode so the student internalizes the trigger.
- **The `tsx` vs `ts-node` confusion.** Older docs/Stack Overflow still recommend `ts-node`. Name it once, mark it legacy.

**Mental model the student ends with.** A small decision tree: "does the file need path aliases, JSX, decorators, enums? → `tsx`. Library publish? → `tsc`. Otherwise → `node` directly." Plus a pinned `.mise.toml` they can commit, and the knowledge that `tsx` is dev-only, never prod runtime.

**Production stakes.** Two failure modes named concretely up front — the contributor whose system Node is two majors behind breaks half the dev scripts; the CI box running a different minor quietly tree-shakes a feature out. Pinning closes both.

**Pedagogical archetype.** Decision archetype with a small worked-example beat. Linear progression — runtime install → runtime pin → three-path partition → worked example → reflex-check exercise. The lesson is *partition*, not breadth.

**Why this placement.** L7 just landed the editor; this lesson lands the runtime under it. Together they form the "local TypeScript surface" so Chapter 004 lands clean. The next lesson (Ch 003 L9) is the chapter quiz, so this lesson closes the chapter's teaching content.

**Estimated student time.** 35-40 minutes (per chapter outline).

---

## Lesson sections

### Cold open (no h2)

Open cold with the senior question — two short prose paragraphs, no intro h2 heading (consistent with the chapter's house style, see L4, L5, L6 continuity notes).

Paragraph 1: name the two production failure modes concretely.
- The contributor on system Node 22 hitting a Node 24-only API (`Object.groupBy`, `Set.intersection`, native `.ts` execution) — Half the scripts break, half work.
- The CI box one minor behind staging — A feature lands locally, passes CI, ships to prod where the runtime is different *again*.

Paragraph 2: name the second senior question — three ways exist to execute a `.ts` file in 2026 and the *trigger before tool* rule applies. Bridge to the lesson body.

No code in the cold open. The reader should reach `## Pin the runtime with mise` knowing *why* both things matter.

### Pin the runtime with mise

Goal: the student writes `.mise.toml` at the repo root, runs `mise install`, verifies with `mise current`.

**Subsection structure:** prose-only walk into `<Steps>` block.

**Prose covers (3-4 short paragraphs):**
- The pinning principle: runtime is a property of the repo. One sentence forward-link to L7's "team artifact" framing — this is the same idea applied to the runtime instead of the editor.
- mise as the 2026 default. Three trigger lines: Rust-built, polyglot (Node/Python/Ruby/Go — Trigger.dev later in course), reads `.tool-versions` and `.nvmrc` for migration. One sentence dismissing alternatives: nvm (shell-script, Node-only, slower; trigger to keep it: team is already on nvm), Volta (still maintained, narrower; trigger to keep it: already installed).
- Node 24 LTS as the pinned version. Frame it correctly per current Node release schedule: Node 24 entered Active LTS in October 2025, transitions to Maintenance October 2026, EOL April 2028. "Active LTS in May 2026, supported deep into 2027 in maintenance" is the accurate framing — *not* the chapter-outline phrasing "maintenance through late 2027" (which would imply Active through then). Why LTS over Current: production SaaS doesn't ride bleeding edge unless a feature is load-bearing. Native TS stripping (next section) is universally available in Node 24, so LTS isn't the cost it used to be.

**`<Steps>` block (the install procedure):**
1. **Install mise.** macOS: `brew install mise`. Linux: `curl https://mise.run | sh`. Windows: install WSL2 first, then Linux path (one line, one link, no PowerShell guide).
2. **Activate mise in the shell.** Add `eval "$(mise activate zsh)"` to `~/.zshrc` (or `bash` analogue). **Explicitly flag** that this is the step contributors skip and produces `command not found` half an hour later. Reload shell or run `exec zsh`.
3. **Pin Node 24 at the repo root.** `mise use --pin node@24` writes `.mise.toml` with the pinned full version string. Show the resulting file as a labeled `<Code>` block — three lines, `[tools]` header plus `node = "24.x.x"`.
4. **Install the pinned version.** `mise install` fetches it into mise's store. `mise current` verifies (shows the active version per directory).

**Code blocks:** small labeled `<Code>` blocks for each command + output. No `AnnotatedCode` — these are one-line commands, no parts to highlight. The `.mise.toml` file gets its own labeled block with `title=".mise.toml"`.

**`<Term>` introduction:** `LTS` defined inline via `<Term definition="Long-Term Support. Even-numbered Node majors get ~30 months of bug fixes and security patches after entering LTS in October of their release year.">LTS</Term>`. Reused without re-definition from L7 if introduced there; otherwise introduced here.

### The three paths to execute a .ts file

Goal: install the partition — native `node` (default), `tsx` (past a named trigger), `tsc --noEmit` (library publish or type-check).

**Open with a `<Figure>` containing a Mermaid `flowchart LR` decision tree:**

```
Start ("Want to run a .ts file?")
  → "Needs path aliases, JSX, decorators, enums, or downlevel?" 
    → Yes → "tsx (dev only)"
    → No → "Is this a library publish?"
      → Yes → "tsc → .js (or tsc --noEmit for type-check)"
      → No → "node file.ts (native strip-types)"
```

The `<Figure>` uses Mermaid as the engine per diagrams INDEX (decision tree → Mermaid `flowchart LR`). Caption: "Three paths, one trigger per branch." Horizontal layout fits laptop viewports.

**Pedagogical purpose of the diagram:** the partition is the *whole lesson*. The student should be able to recall the three branches by visualizing this tree. Mermaid is wrapped in `<Figure>` per the diagrams INDEX rules.

**Then three short h3 subsections, one per path:**

#### Native node: the default

- **What it is:** Node 24 strips type annotations on `.ts` files at parse time and executes the resulting JS. Stable in Node 24 LTS — **no flag needed**. (Don't pin sub-version numbers like "Node 25.2.0 / 24.12 / 22.18" — fact-check showed the original chapter outline framing was over-specific; the safer claim is "stable in Node 24 LTS, no flag.")
- **What it does mechanically:** parses with internal type-stripper, blanks out type-only syntax, executes JS. No type-checking, no transpilation.
- **What it does NOT do (the watch-outs that gate the trigger to `tsx`):**
  - Does **not** read `tsconfig.json` — path aliases like `@/lib/...` will *not* resolve.
  - Does **not** support code-generation TS features — no JSX, no decorators, no enums, no namespaces.
  - Does **not** type-check — that's `tsc --noEmit`'s job.
- **The reach:** plain `.ts` scripts with relative imports and no JSX. Seed scripts, one-off CLIs, anything throwaway.

**Single labeled `<Code>` block** showing `node hello.ts` invocation + output. One line. Plus a one-line note: `--no-strip-types` exists if you ever need to disable the behavior; the course never does.

#### tsx: when a trigger fires

- **The trigger:** any of path aliases from `tsconfig.json`, JSX outside a framework, decorators, enums, namespaces, or downlevel-target needs. Five concrete flips. Frame as "trigger before tool" (callback to chapter's recurring framing).
- **What `tsx` does that `node` doesn't:** reads `tsconfig.json` (so `@/...` resolves), uses esbuild under the hood to transform JSX and other code-gen TS features, ships a watch mode (`tsx watch script.ts`) for dev script reload.
- **Install:** `pnpm add -D tsx` — but parenthetical "we don't have a `package.json` yet; Chapter 028 L2 introduces pnpm, after that scripts like `pnpm tsx ...` live in the project." For this lesson the student can `pnpm dlx tsx file.ts` or postpone install — note this clearly so they don't dead-end. Alternative: `npx tsx file.ts` works but the course commits to pnpm.
- **The senior watch-out:** `tsx` is a **dev tool, not a production runtime**. Never ship a service that `tsx`s itself in production. One sentence, bold-italic emphasis.
- **One-line note on `ts-node`:** legacy, deprioritized, replaced by `tsx` for dev and by native Node for the basics. Named so the student recognizes it in older docs.

**Single labeled `<Code>` block** showing `pnpm tsx hello.ts` invocation.

#### tsc: for type-checking and library publish

- **The trigger #1:** type-checking the codebase (CI gate, pre-commit, editor-on-save is its own thing). `tsc --noEmit` runs the full type-checker without emitting `.js`. The dedicated type-checker the course's CI will run on every PR from Chapter 028 forward.
- **The trigger #2:** shipping a library to npm. The `.js` (and `.d.ts`) output of `tsc` is what publishable packages distribute. One line, parked — the course is an app, not a library.
- **Why neither path replaces the other two:** `tsc` doesn't *run* your code by default — `tsc --noEmit` checks; `tsc` (without `--noEmit`) emits `.js` you'd then run with `node`. For *running* a `.ts` file locally, `tsc` is the wrong tool; for *type-checking* one, `node` and `tsx` are the wrong tools.

**Single labeled `<Code>` block** showing `pnpm tsc --noEmit` invocation. Note: requires a `tsconfig.json` — students won't have one until Ch 028 L4. Frame the command at the conceptual level, with a forward-link.

**Footer for this section:** small `<Aside type="note">` summarizing the partition in one sentence: "Native `node` for plain scripts, `tsx` past the five triggers, `tsc --noEmit` to type-check."

### A worked example: write one .ts file, run it three ways

Goal: the student walks the partition end-to-end on their own machine. Causes the diagram from the previous section to "click" by being lived.

**`<Steps>` block:**

1. **Create `hello.ts`.** Small typed function `greet(name: string): string` plus `console.log(greet('world'))`. Labeled `<Code>` block.
2. **Run with native node.** `node hello.ts` — works, prints `Hello, world`. Show output in a separate labeled `<Code>` block (or a second tab via `<CodeVariants>` if the lesson author prefers tabbed before/after).
3. **Add a path alias.** Have the student create a tiny `src/lib/greet.ts` and an import `import { greet } from '@/lib/greet'` in `hello.ts`. Show the file shape as a small `<FileTree>` (per diagrams INDEX, file-tree visuals are owned by `<FileTree>`). No `tsconfig.json` written yet — the demo doesn't need a working alias, only the failure.
4. **Re-run with native node — watch it fail.** `node hello.ts` — module resolution error: `Cannot find module '@/lib/greet'`. Print the actual error so the student recognizes it.
5. **Switch to tsx — watch it pass.** `pnpm dlx tsx hello.ts` — works (with a minimal `tsconfig.json` containing the `paths` mapping; show it as a labeled `<Code>` block, ~6 lines, with a one-line note that Ch 028 L4 owns the full file). Output prints `Hello, world` again.
6. **Run tsc --noEmit — watch the type-check pass.** `pnpm dlx typescript --noEmit` (or `pnpm dlx tsc --noEmit`). No output = success. One sentence: "Silent success is the convention; no output, type-check passed."

**Code component choice:**
- `<Code>` blocks per command + output (simple one-liners).
- `<FileTree>` (Starlight component) for the post-step-3 file layout.
- A single small `<CodeVariants>` block could group the three invocations (`node hello.ts`, `pnpm dlx tsx hello.ts`, `pnpm dlx tsc --noEmit`) as tabbed alternatives at the *end* of the section, summarizing the three paths against the same file. This is the "callback summary" that solidifies the partition in code form.

**Pedagogical purpose:** the student sees cause and effect three times against the *same file*. The diagram from the previous section is now a felt thing. This is the lesson's confirmation beat.

### Reflex-check exercise (closing)

Goal: confirm the student can pick the right execution path by trigger, not by syntax familiarity. Mirrors L4's closing `<Buckets>` and L7's bucket-style close.

**Component: `<Matching>`** (per chapter outline pedagogical approach — "Matching or Dropdowns"). Match each scenario (left) to its execution path (right).

**Pairs (five, the cap the chapter outline names):**

| Scenario (left) | Path (right) |
| --- | --- |
| "A one-off seed script with plain relative imports and no JSX" | `node script.ts` |
| "A standalone CLI tool that imports utilities via `@/lib/...`" | `pnpm tsx script.ts` |
| "CI step that gates every PR on the type-checker passing" | `pnpm tsc --noEmit` |
| "A throwaway React component example outside a Next.js project" | `pnpm tsx script.ts` |
| "A library you're publishing to npm" | `pnpm tsc` (emits `.js`) |

**Why `<Matching>` over `<Dropdowns>` or `<Buckets>`:**
- `<Buckets>` is great when there are 3+ items per category; here two scenarios share `tsx` so the buckets work too, but `<Matching>` is tighter at 5 pairs.
- `<Dropdowns>` would require an "inline prose" frame for the scenarios; matching reads cleaner as a recall drill.
- `<Matching>` allows the student to see the answer key (the right column) up front and apply triggers — which is the senior reflex the lesson installs.

Note: per the Matching docs, pairs shuffle independently on render, so duplicate right-side values (`pnpm tsx script.ts` twice) are fine but may be visually confusing. Acceptable trade-off because the deliberate duplication reinforces "multiple triggers route to the same tool." If this proves a UX problem in implementation, fall back to `<Dropdowns>` (inline prose per scenario, options identical across all five).

### External resources

Standard `## External resources` h2 (matches L1-L7 house style per continuity notes) with `<CardGrid>` of 3-4 `<ExternalResource>` cards:

1. **Node.js — Modules: TypeScript** (`nodejs.org/api/typescript.html`) — the canonical reference for native type-stripping behavior and limitations.
2. **mise — Getting started** (`mise.jdx.dev/getting-started.html`) — install + activate + `mise use` reference.
3. **tsx — README on GitHub** (`github.com/privatenumber/tsx`) — the watch mode, esm/cjs interop, and tsconfig integration notes.
4. **Node.js release schedule** (`github.com/nodejs/Release`) — for students who want to verify LTS dates themselves.

Icons: `simple-icons:nodedotjs` (Node), `lucide:terminal` or similar for mise (no `simple-icons:mise` available), `simple-icons:tsnode` is wrong — use `lucide:zap` for tsx, `simple-icons:nodedotjs` again for the release schedule. The lesson author should pick reasonable icons; not load-bearing.

---

## Components used (summary for downstream agents)

- **`Steps`** (Starlight) — for the mise install procedure and the worked example.
- **`Code`** (Starlight Expressive Code default) — for one-line commands and outputs.
- **`Figure`** + Mermaid (`flowchart LR`) — for the three-path decision tree. Single diagram in the lesson.
- **`FileTree`** (Starlight) — for the small file layout in the worked example.
- **`CodeVariants`** + `CodeVariant` — optional tabbed summary of the three invocations against the same `hello.ts`. Use only if it adds clarity; the linear `<Steps>` walk is the primary form.
- **`Aside`** (`type="note"`) — the partition-summary one-liner at the end of "The three paths".
- **`Matching`** + `Pair` — closing reflex-check exercise.
- **`Term`** — `LTS` definition (and optionally `tsx`, `tsc` if author judges they warrant probing).
- **`CardGrid`** + `ExternalResource` — closing External resources section.

**Not used:** no `AnnotatedCode` (no complex multi-part code blocks here — every snippet is one or two lines), no `CodeTooltips` (no tokens to probe inside a block), no `VideoCallout` (setup/wiring lesson, no good video earns its weight here), no live coding component (this lesson runs on the student's local machine, not in a sandbox).

---

## Diagrams

**One diagram only:**

- **Three-path decision tree.** Mermaid `flowchart LR`, wrapped in `<Figure>` with caption. Branches:
  - "Needs path aliases / JSX / decorators / enums / downlevel?" → `tsx`
  - "Library publish?" → `tsc` (emit `.js`) or `tsc --noEmit` for type-check
  - Otherwise → `node file.ts`

  Pedagogical goal: install the partition visually before the prose drills it into each path. Horizontal layout per the diagrams-INDEX vertical-space constraint.

No sequence diagrams, no state machines, no architecture diagrams. The lesson's only conceptual model that benefits from a picture is the partition.

---

## Tooltip terms

- **`LTS`** — `Long-Term Support. Even-numbered Node majors enter LTS in October of their release year and get ~30 months of bug fixes and security patches.`
- *(Optional, author's call)* **`tsx`** — `Dev-only TypeScript runner. Reads tsconfig, transforms JSX/decorators/enums, has a watch mode. Never use in production.`
- *(Optional, author's call)* **`tsc`** — `The TypeScript compiler. Default mode emits .js; --noEmit only type-checks.`

Be sparing. `LTS` is the only one that's clearly non-obvious for the target student.

---

## Scope

### In scope

- mise install + shell activation + `.mise.toml` pin at repo root + `mise install` + `mise current` verification.
- Node 24 LTS as the pinned version with correct framing of its LTS lifecycle (Active LTS through October 2026, Maintenance through April 2028).
- The three-path partition: native `node`, `tsx`, `tsc --noEmit` / `tsc`.
- The triggers that flip from native `node` to `tsx` (path aliases, JSX, decorators, enums, downlevel).
- `tsx` as a dev-only tool, never in production.
- The worked example end-to-end on the student's local machine.
- `ts-node` named once as legacy so the student recognizes it in old docs.

### Out of scope (explicit cuts to prevent re-teaching or premature teaching)

- **Installing pnpm** — Chapter 028 L2 owns it. Lesson works around it via `pnpm dlx` / `npx` or postpones the install entirely. Forward-ref it in one line.
- **Authoring full `tsconfig.json`** — Chapter 028 L4 owns it. The worked example uses a minimal 6-line `tsconfig.json` for the path-alias demo with a one-line forward-ref note. Do not teach `compilerOptions` here.
- **The `--experimental-transform-types` flag** — one line and a forward pointer. Not the default in 2026; the course writes plain JS-compatible TS that strips fine.
- **Bundlers (esbuild, swc, Turbopack)** — Next.js owns bundling from Chapter 028 onward.
- **Library-publish workflow** — `tsc` emit is named, the publish workflow itself is not in this course (the course builds an app, not a library).
- **VS Code-specific TypeScript settings** — owned by L7 (the prior lesson) via `typescript.tsdk`.
- **Biome / ESLint configuration** — owned by Chapter 028 L5.
- **Node 22 → 24 migration concerns** — not a course goal; we pin 24 from day one.
- **PowerShell / Windows-native paths** — one line saying "Install WSL2 first, then follow the Linux path." No native Windows walkthrough.
- **`.nvmrc` / `.tool-versions` migration paths** — named in one sentence as "mise reads both" so a returning dev knows it works; no migration walkthrough.

### Concepts re-defined briefly (prerequisites that don't need re-teaching)

- **Path aliases.** One sentence: "the `@/lib/...` shorthand that maps to a directory in the repo via `tsconfig.json`." Full treatment owned by Ch 028 L4.
- **JSX / decorators / enums.** Named only — the student doesn't need to understand them to know they trigger `tsx`. The lesson doesn't define them.
- **CI.** Continuous Integration. One sentence in passing; full treatment owned later in the course.

---

## Code conventions alignment

- **Package manager.** Per Code conventions §Supply chain: pnpm 11+ via mise is the course default. Use `pnpm` prefixes (`pnpm tsx`, `pnpm tsc`) where a package.json exists; use `pnpm dlx` / `npx` for one-shot invocations when no package.json yet (this lesson's worked example).
- **Runtime.** Per Code conventions §Supply chain: "Node 24 LTS, pinned in `.mise.toml`. Three execution paths for `.ts` files — native (no flag), `tsx` past the triggers, `tsc` only for library publishing or `--noEmit` type-check." This lesson literally teaches that paragraph; align faithfully.
- **`.ts` extensions.** All snippets use `.ts` (no `.js`) consistent with the chapter's TypeScript-flavored, inference-led thread.
- **Comments.** Rare. The `hello.ts` example does not narrate itself.
- **Filenames.** kebab-case. `hello.ts`, `greet.ts`.

**Deliberate divergences:** none for this lesson. The lesson *is* the convention's setup.

---

## Fact-checks performed and notes

Online verification (May 2026):

- **Node 24 LTS status**: Confirmed Active LTS through October 2026, Maintenance through April 2028. Chapter outline phrasing "maintenance through late 2027" is loose — corrected in this outline to "Active LTS through October 2026, then Maintenance through April 2028, supported deep into 2027 in maintenance." The downstream agent should use the corrected framing.
- **Native type stripping**: Confirmed stable and on-by-default in Node 23.6.0+ (per `--experimental-strip-types` becoming default). In Node 24 LTS (May 2026), no flag needed. Chapter outline's sub-version specificity ("Node 25.2.0 / 24.12 / 22.18") could not be confirmed at the level claimed — outline relaxes to "stable in Node 24 LTS, no flag" which is unambiguously correct.
- **mise shell activation**: Confirmed `eval "$(mise activate zsh)"` in `~/.zshrc` is the canonical activation form (mise.jdx.dev/getting-started). Other shells follow the analogous pattern.
- **`mise use --pin`**: Confirmed writes `.mise.toml` with the pinned full version string.
- **`tsx` tsconfig handling**: Confirmed `tsx` reads `tsconfig.json` and resolves `paths` automatically — the partitioning trigger this lesson teaches is current.
- **`ts-node` status**: Confirmed deprioritized in 2026; `tsx` is the daily reach.
