## Concept 1 — The starter is the deliverable, not a tutorial app

**Why it's hard.** Every returning dev's reflex on starting a Next.js project is `pnpm create next-app` and answer the wizard. The course's first commit looks the same as their tutorial sandboxes look — a Next.js folder on disk — and unless the framing lands now, the student treats this codebase the same way they've treated every other "first React project" they've abandoned. The shift is that this scaffold is the production codebase for the rest of the course; the choices in it are choices the student will defend at code review.

**Ideal teaching artifact.** A *trigger-first comparison* (Decision archetype). Before any command runs, two paths are shown side by side: on the left, a stylized `create-next-app` wizard transcript with seven prompts and the drift baked in — "App Router? (default changes)," "Tailwind? (which version)," "Turbopack? (flag still here on older versions)," "import alias?" — each prompt annotated with the version-drift cost the answer carries six months from now. On the right, the course's single `degit` command and the resolved file tree it produces, captioned with "the same scaffold every student gets, every time." The student sees the senior call structurally — pinning a frozen tree beats running a drifting wizard — before they touch a terminal.

**Engagement.** A two-statement `TrueFalse` after the comparison — "the wizard's defaults are the senior call because they reflect the framework team's latest thinking" (false), "pinning a starter via `degit` is the senior call because it freezes the toolchain decisions the project intends to defend" (true) — locks the "starter as deliverable" frame.

**Components.**
- `Figure` wrapping a hand-SVG of the two-path comparison (wizard prompts on the left, the `degit` resolved tree on the right) with the drift-cost annotations as small inline tags. Single composition, no bespoke component.
- `TrueFalse` with the two statements as the recall beat.

---

## Concept 2 — `degit` vs. `git clone`: pulling content, not history

**Why it's hard.** The student's only prior pattern for "get a project from a repo" is `git clone`, which gives them a working tree *and* the upstream's history and remote. For the course's starter that's actively wrong — the student is about to commit this as their own first commit, not fork the course's repo. They need to feel the distinction before every later project chapter (each one re-pulls from a different starter folder) reads as "wait, why not just clone?"

**Ideal teaching artifact.** A Mechanics-archetype side-by-side, three-row table built as an annotated figure: row 1, what's on disk after `git clone` vs. after `degit` (full `.git/` + history vs. plain files, no `.git/`); row 2, what `git log` shows in each (the course's commits vs. nothing — the student's tree is unhistoried); row 3, where `git remote` points (the course's repo vs. nothing — the student hasn't run `git init` yet). The senior reason lands in the gap each row exposes: the student wants the *shape* of the starter, not the course's commit story attached to their codebase. One paragraph names the projects-monorepo layout (`unit-1-starter/`, sibling `unit-1-solution/`, the pattern repeats per project) so the `degit` argument shape is intuitive.

**Engagement.** A short `MultipleChoice` with three scenarios — "you want to base your project on the course's starter and commit it as your own" (degit), "you want to contribute a fix back to the course's project monorepo" (clone + branch + PR), "you want to inspect how a later project's solution differs from the starter without committing anything" (degit a throwaway copy) — confirms the trigger that picks each tool.

**Components.**
- `Figure` wrapping a hand-SVG three-row comparison table — single composition, on-disk artifacts named per row.
- `MultipleChoice` with three trigger scenarios.

---

## Concept 3 — The file tree as the codebase map

**Why it's hard.** The student lands on a folder with `app/`, `lib/`, `db/`, four dotfiles, `env.ts`, `next.config.ts`, `biome.json`, and `AGENTS.md`, and reads it as boilerplate. The chapter's center of gravity is that every entry earns its seat and the student should leave able to defend each in one sentence. Without that, every later chapter reading "open `lib/foo.ts`" or "edit `next.config.ts`" assumes a map the student doesn't have.

**Ideal teaching artifact.** A *defendable-tree walk* (Reference/survey archetype carrying Concept weight). The full project root rendered as an annotated tree where each entry has a one-line "why this earns a seat" caption inline next to it — `lib/` reads "pure code, no side effects at import"; `db/client.ts` reads "Drizzle client wired to validated `env.DATABASE_URL`, exists so env validation has a real consumer to gate"; `next-env.d.ts` reads "Next.js generates it, commits required, never edit." The student reads the whole tree once with the captions visible, then the captions collapse and the student plays a *map-recall* round on the same tree.

**Engagement.** The `Matching` round the lesson outline already names — six entries paired to senior descriptions ("the route that renders `/`," "the place imports without side effects belong," "the file CI uses to type-check," "the file Biome formats against," "the file pnpm reads to know which package manager runs," "the file the dev server reads to know which Node version to use"). The matching is the recall after the annotated walk.

**Components.**
- `FileTree` rendering the project root for the structural shape.
- `Figure` (or a paired panel) hosting the same tree with inline captions — the *annotated* version where each entry's "why it earns a seat" sits beside it. If captions can't ride directly inside `FileTree`, this is a candidate for a thin `AnnotatedFileTree` (see proposals).
- `Matching` for the six-entry recall (already named in the lesson outline).

---

## Concept 4 — Three Next.js scripts, three different costs

**Why it's hard.** The student's instinct is to think of `dev`, `build`, and `start` as the same program in three modes — start it, look at it, done. Each script has a distinct cost profile, a distinct surface, and a distinct senior trigger. The trap is conflating them and treating `pnpm dev` as the only thing they ever run, then being surprised when CI fails on `pnpm build` for a type error the dev server happily ignored.

**Ideal teaching artifact.** A *three-script anatomy* (Mechanics archetype) — a single Figure with three labeled columns, one per script, each column listing four rows: *what runs* (Turbopack dev / Turbopack build / Node serving the build), *what gets checked* (fast-refresh only / type-check + env validation / nothing, already built), *when a senior reaches for it* (the dev loop / on every PR in CI / pre-deploy smoke test), and *the time cost* (instant / a minute or two / instant against the built output). The student sees, in one composition, why "just run `pnpm dev`" is incomplete and what each script catches that the others don't.

**Engagement.** A three-scenario `Matching` — "you want to confirm the production build actually serves your latest local changes before pushing," "your PR was just opened and CI is running," "you're writing JSX and want fast refresh" — paired to the right script. The matching is the recall; the figure is the model.

**Components.**
- `Figure` wrapping a hand-SVG three-column anatomy with the four rows per column — single composition.
- `Matching` for the three-scenario recall.

---

## Concept 5 — AGENTS.md as operational onboarding, not architectural prose

**Why it's hard.** The student has seen READMEs that ramble and READMEs that are empty. `AGENTS.md` is neither — it's a *durability filter* applied to the things the next contributor (human or agent) needs to be productive in their first session. The misconception trap is treating it as "the new README" and inflating it with aspirational paragraphs and hand-maintained file lists that age out in two PRs.

**Ideal teaching artifact.** A *side-by-side diff with rule callouts* (Pattern archetype). On one tab, the course's actual `AGENTS.md` — short, structural, sections named for the durable facts (thesis, stack pins, repo layout by directory, daily commands, conventions pointers). On the other tab, a deliberately bloated counter-example covering the eight failure modes the lesson names (aspirational mission paragraph, marketing copy, a tutorial paragraph re-explaining Next.js, a duplicated formatting-rules section that contradicts `biome.json` two months later, a hand-maintained file list naming individual files in `app/`, an inline ADR-shaped paragraph, a "see also" linking to a deleted Notion page, a section that paraphrases the README). Each bloat block has a single-line annotation calling out the rule it breaks. The student reads the discipline operationally before it abstracts.

**Engagement.** The eight-item `Buckets` sort the lesson outline already names — eight candidate sections sorted into "earns a place" vs "doesn't" — confirms the durability test transferred.

**Components.**
- `CodeVariants` with two tabs: the course's `AGENTS.md` and the bloated counter-example, each with side annotations on the bloat blocks.
- `Buckets` for the eight-item earns/doesn't sort (already in the lesson outline).

---

## Concept 6 — Two owners share one file: tsconfig.json

**Why it's hard.** `tsconfig.json` lands on a fresh scaffold with around twenty fields and reads as one undifferentiated wall of strictness flags, paths, and module options. The student either treats every field as equally editable (and breaks the build by toggling `moduleResolution`) or treats every field as untouchable (and never tightens the strictness floor when the bug class warrants it). The mental fix is the *ownership split*: the project owns the strictness floor (the flags that catch bugs the team cares about); Next.js owns the compatibility surface (the flags that make TypeScript, the bundler, and the runtime agree). The two halves coexist physically; the split is mental.

**Ideal teaching artifact.** A *labeled-config map* (Concept archetype). One Figure shows the full `tsconfig.json` rendered with a colored gutter — left-side gutter color for the project-owned flags, right-side gutter color for the framework-owned flags — and a small two-column legend stating the heuristic: "if you're tempted to edit a flag on the left, you're probably right; if you're tempted to edit a flag on the right, you're probably wrong." This visual is the carrier for both 1.4.3 and 1.4.4 — the lesson pair share one map, and the next two concepts walk the two halves of it. The map gets *referenced* on every flag-by-flag beat so the student never loses the geography.

**Engagement.** A short `Buckets` round naming six flags from the file ("`noUncheckedIndexedAccess`," "`moduleResolution`," "`jsx`," "`strict`," "`forceConsistentCasingInFileNames`," "`isolatedModules`") and sorting them into "project owns" vs "Next.js owns" — confirms the heuristic landed before the per-flag walks begin.

**Components.**
- `Figure` wrapping a hand-SVG of the annotated `tsconfig.json` with the two-color gutter and the legend. Single composition that the next two concepts re-reference.
- `Buckets` for the six-flag ownership sort.

---

## Concept 7 — `noUncheckedIndexedAccess` and the bug class it catches

**Why it's hard.** Most of the strictness flags the lesson names are uncontroversial — `strict`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`. The one that has *teeth* is `noUncheckedIndexedAccess`, because it changes the type signature of `array[i]` and `record[key]` from `T` to `T | undefined`, and the student has to handle the `undefined` everywhere they previously didn't. The flag is the one place in the file where the strictness floor visibly costs the student something at the call site, and they need to see why the cost is worth paying before they grumble and disable it on the second migration headache.

**Ideal teaching artifact.** A *before-and-after type inspector* (Mechanics archetype, two-beat). Beat one: a `CodeVariants` block with two tabs — *flag off* and *flag on* — both showing the same three-line snippet (`const usersById: Record<string, User> = ...; const user = usersById[someId]; return user.email;`). The `flag off` tab shows the inferred type of `user` as `User` and the snippet type-checks; the `flag on` tab shows the inferred type as `User | undefined` and the `user.email` access surfaced as an error. The student reads the cause-and-effect inline; the type changes, the bug class becomes visible. Beat two: a worked production scenario in one short paragraph — a 99%-populated lookup that breaks on the 1% case at 3am, exactly the production failure mode the flag prevents.

**Engagement.** The lesson outline's `PredictOutput`-style five-flag exercise — given five snippets each violating one of the flags the lesson named, the student picks which flag catches each. The exercise confirms that `noUncheckedIndexedAccess` lives in the student's reflex set alongside the others.

**Components.**
- `CodeVariants` with the *flag off* / *flag on* tabs, the inferred-type annotation visible per tab. `TypeCoding` is the more ambitious version if Twoslash-style `^?` inline display is wanted — the lesson can land either way.
- `MultipleChoice` (or a flag-keyed `Matching`) for the five-snippet flag-attribution round.

---

## Concept 8 — Path aliases: refactor safety, with a runtime-resolution gotcha

**Why it's hard.** The `@/*` alias is the easy half — every editor and every AI tool recognizes the convention and the refactor-safety win is intuitive (move a file, don't touch a hundred imports). The hard half is that the alias is *checked* by `tsc` and *resolved* by Next.js's bundler at build time, but it is **not** resolved by native Node strip-types execution. Chapter 1.2.4 already named this distinction in passing; here it earns its weight because the student has just seen a `tsconfig.json` with `paths` declared and will assume the alias works everywhere.

**Ideal teaching artifact.** A *resolution-map figure* (Concept archetype) — a small three-column diagram with one column per execution path (`tsc --noEmit`, Next.js / Turbopack build, `node` strip-types) and one row per question: *does it read `tsconfig.paths`?* (yes / yes / no), *does `@/lib/foo` resolve?* (yes / yes / no, error), *does `tsx hello.ts` rescue it?* (n/a / n/a / yes — `tsx` reads `tsconfig.json`). The diagram makes the failure mode predictive — when the student writes a one-off Drizzle Kit script and the alias throws, they reach for `tsx` because they've already seen *why* native Node won't resolve it.

**Engagement.** A two-scenario `MultipleChoice` — "a route handler imports from `@/lib/auth`" (works; Next.js resolves), "a standalone seed script `node seed.ts` imports from `@/db/schema`" (fails; `tsc` validated the path but Node strip-types doesn't read `tsconfig`; switch to `tsx`). Two picks, two confirmations of the runtime-resolution boundary.

**Components.**
- `Figure` wrapping a hand-SVG three-column resolution map with the three rows. Single composition, ties back to Chapter 1.2.4's three-execution-paths frame.
- `MultipleChoice` for the two-scenario recall.

---

## Concept 9 — The transpiler-alignment trio

**Why it's hard.** `verbatimModuleSyntax`, `isolatedModules`, and `esModuleInterop` are the three flags in the framework-owned half that the student will actually *see fail* in their own code later — `verbatimModuleSyntax` in Unit 5 the first time they write a type import that accidentally pulls in a server-only module on the client; `isolatedModules` whenever they reach for a `const enum` or a bare type re-export. The other compatibility flags (`target`, `lib`, `module`, `jsx`, `noEmit`) are read-only knowledge for the student. These three are the load-bearing ones because their *consequences* land in the codebase the student is about to write.

**Ideal teaching artifact.** A *contract diagram* (Concept archetype, two-beat). Beat one: a small Mermaid or arrow diagram with three actors — *TypeScript language*, *bundler (Turbopack)*, *runtime (browser or Node)* — and the three flags drawn as the contracts each one enforces between two actors (`verbatimModuleSyntax` between language and bundler, `isolatedModules` between language and bundler in single-file mode, `esModuleInterop` between language and CJS-runtime). The student reads each flag as the agreement it brokers, not as a setting. Beat two: a `CodeVariants` block specifically for `verbatimModuleSyntax` — one snippet that compiles with the flag off and *smuggles a server-only module's side effects into a client bundle*, paired with the same snippet under the flag on, failing the build at the import site with a clear error. That specific cause-and-effect needs to be in working memory by the time Unit 5 lands.

**Engagement.** The lesson outline's `Matching` round — four flags paired to the agreement each enforces — confirms the contract frame stuck. One follow-up `TrueFalse` ("you should turn off `isolatedModules` if it fails on a `const enum`" — false; you fix the code, not the flag) locks the "framework owns these" rule.

**Components.**
- `Figure` wrapping a Mermaid (or `ArrowDiagram`) three-actor contract diagram. `ArrowDiagram` is a clean fit — three boxes (TS / bundler / runtime), three labeled edges (one per flag).
- `CodeVariants` for the `verbatimModuleSyntax` on-vs-off snippet, the inlined server-side-effect import as the failure case.
- `Matching` for the four-flag-to-agreement pairing (in the lesson outline).
- `TrueFalse` for the framework-ownership confirmation.

---

## Concept 10 — Build time, not first request time

**Why it's hard.** The student has shipped enough to have *heard* of missing environment variables crashing a deploy, but the failure mode is abstract until they've felt it — the production 500, the alert ten minutes later, the redeploy window the outage lives inside. The senior framing for this whole lesson is that env validation is *fail-closed at the build boundary*, and the discipline only sticks if the student watches the build catch the missing variable on their own machine, not just reads about it.

**Ideal teaching artifact.** A *live build-time fire* (Pattern archetype, artifact-carries-teaching). The lesson's center is a three-step `Steps` block the student runs in their terminal: (1) `pnpm build` succeeds with `DATABASE_URL` in `.env.local`; (2) the student removes the line from `.env.local` and runs `pnpm build` again — the build fails with `@t3-oss/env-nextjs`'s clear error naming the missing variable; (3) restore the line, `pnpm build` succeeds. Adjacent labeled output blocks show the exact error message the student should see in step 2. The discipline is mechanical: the build refuses to ship the codebase missing a required secret, and the student sees the refusal land.

**Engagement.** The `Steps` block *is* the assessment — the student either reproduces the build-time failure or doesn't. A short follow-up `MultipleChoice` ("at which stage does a missing required env variable first surface against this configuration?") with four picks — *first user request*, *first dev-server boot*, *`pnpm build`*, *deployment health check* — confirms the boundary frame after the hands-on round.

**Components.**
- `Steps` for the three-command worked example with adjacent labeled output blocks showing terminal output for each step.
- `MultipleChoice` for the boundary-recognition follow-up.

---

## Concept 11 — Server vs. client env: the structural split

**Why it's hard.** The Next.js `NEXT_PUBLIC_*` convention exists because anything that ships in the client bundle is *world-readable*, and `@t3-oss/env-nextjs` makes the structural enforcement of "server-only stays server-only" the cost of using the package. The student needs the convention *and* the enforcement in their head before they ever write a new env variable, because the wrong call ("I'll just add my Stripe secret to the client block, it's easier") is the wrong call only if the structural enforcement is salient when they make it.

**Ideal teaching artifact.** A *server/client boundary figure* (Concept archetype) — a single diagram with two regions, *server* and *client bundle*, the `env.ts` file straddling the boundary with its two blocks (`server`, `client`) anchored to the right side. Variables flow from `process.env` into one block or the other; the client block accepts only `NEXT_PUBLIC_*` (structurally enforced by the package — the validator refuses the non-prefixed name in that block); the server block refuses the `NEXT_PUBLIC_*` name in turn. The diagram makes the "the wrong-place secret is hard to write" claim visible — the package literally won't validate the schema if the name and the block disagree.

**Engagement.** The lesson outline's eight-variable `Buckets` sort — `DATABASE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `NODE_ENV`, `NEXT_PUBLIC_GA_ID`, `SESSION_SECRET` into "server block / client block / framework-owned, don't put in env.ts" — confirms the senior-reflex placement before the student ever adds a real one. `NODE_ENV` in the third bucket is the trap that surfaces the third bucket's existence.

**Components.**
- `Figure` wrapping a hand-SVG of the server/client boundary with `env.ts` straddling and the structural-enforcement arrows.
- `Buckets` for the eight-variable three-bucket sort (already in the lesson outline).

---

## Concept 12 — `.env.example` and `.env.local`: two files, two roles

**Why it's hard.** Both files start with `.env`, both live in the project root, and the student's first instinct is that they're the same file with different names. The discipline is the opposite — one is the *committed contract* (the list of variables the app expects, with dummy values), one is the *uncommitted secret store* (real values, never in git). Getting the roles confused is the bug that ships a secret to GitHub once and then has the team rotating credentials at midnight.

**Ideal teaching artifact.** A *two-file role split* (Pattern archetype) — a small Figure showing both files side by side with three labeled rows: *what's inside* (variable names with placeholder values / variable names with real secrets), *in git?* (yes, committed / no, gitignored — the `.gitignore` line from 1.4.1 referenced), *who reads it* (every contributor on first checkout / only this developer's local machine). The senior workflow is the arrow drawn between them: copy `.env.example` to `.env.local`, fill in real values, the app boots. One paragraph names the Vercel side of the same pattern — production env vars live in the dashboard, the same `env.ts` validates them at build time, the deploy fails before traffic shifts.

**Engagement.** A four-statement `TrueFalse` round — "`.env.local` belongs in git so a teammate can clone the repo and have a working app" (false), "`.env.example` should list every variable the app expects, with placeholder values" (true), "a missing variable in `.env.local` should be a runtime crash on the first request" (false — build-time), "Vercel's production env vars bypass `env.ts`'s validation" (false — same validator, same build-time fire). Four statements, four locks on the role split and its Vercel extension.

**Components.**
- `Figure` wrapping a hand-SVG two-file table with the three-row role split and the copy-arrow between them. Single composition.
- `TrueFalse` for the four-statement role-and-extension recall.

---

## Component proposals

- **`AnnotatedFileTree`** — Existing `FileTree` extended with per-entry caption slots; bespoke only if captions can't ride directly inside the existing component.
  - **Sketch.** Same shape as `FileTree`, every entry accepts an inline caption rendered to the right (or beneath, on narrow viewports) — one short sentence per file or directory. Optional "collapse captions" toggle so the same tree can render twice in a lesson, once annotated and once bare for the recall pass.
  - **Uses in this chapter.** Concept 3.
  - **Forward-links.** Every project chapter that ships a starter (Unit 5's App Router scaffold, Unit 6's Drizzle layout, Unit 9's Better Auth wiring, Unit 11's URL-state layout, etc.) will want to walk the new files the project adds with one-line "why this earns a seat" captions. The same pattern recurs roughly fifteen times across the course as outlined.
  - **Leanest v1.** Wrap the existing `FileTree` in a sibling `<dl>` that renders captions keyed by path, no in-tree visual. If that reads cleanly, the bespoke component is just CSS sugar over the v1; if not, the bespoke surface earns its weight.

## Build priority

`AnnotatedFileTree` is the one new component this chapter motivates and the only one with a credible high-reuse forward link — every starter walk in every project chapter is the same shape. Build the leanest-v1 sibling-`<dl>` pairing first for Chapter 1.4.1, then promote to a single component the first time a second chapter (likely Unit 5's App Router scaffold lesson) repeats the pattern.

Every other artifact in the chapter fits the existing toolkit. The four hand-SVG compositions worth investing the most authoring care in are the wizard-vs-`degit` comparison (Concept 1, sets the chapter's frame), the two-owner `tsconfig.json` map (Concept 6, carries two lessons), the three-actor transpiler-alignment contract (Concept 9, forward-loads Unit 5's server/client work), and the server/client env boundary (Concept 11, forward-loads SaaS pattern #12 in Unit 17). Those four visuals carry the chapter's load-bearing frames.

## Open pedagogical questions

- Concept 7's *flag off* / *flag on* `CodeVariants` needs the inferred type of a local visible inline per tab. Confirm whether the existing `CodeVariants` can surface the inferred type as a side annotation, or whether `TypeCoding` with Twoslash `^?` is the cleaner carrier even though the lesson isn't an exercise.
- Concept 10's build-time-fire `Steps` block depends on the student actually editing `.env.local` and re-running `pnpm build` on their machine — there's no in-page sandbox that reproduces the environment. Worth confirming that the lesson's adjacent-output blocks show the exact error message verbatim so a student who runs into a different error knows they've diverged.
- Concept 12's Vercel-side parenthetical risks pulling Unit 21's deploy story forward. The intent is one paragraph naming the connection so the student knows the same validator gates the deploy; confirm that framing holds without sliding into deploy mechanics this chapter doesn't own.
