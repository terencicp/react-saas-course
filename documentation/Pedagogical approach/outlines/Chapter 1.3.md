# Chapter 1.3 — Pedagogical approach

## Concept 1 — The editor as a repo artifact

**Why it's hard.** Returning devs treat editor configuration as personal preference — themes, keybindings, settings they sync to their cloud profile. The mental shift is that some of that configuration is a *team contract* the repo owns, and the student needs a clean fence between the two before any other lesson lands.

**Ideal teaching artifact.** A *split-screen onboarding* (Concept archetype, paired with a sort): two short panels show the same fresh clone opened by two teammates. On the left, the repo carries `.vscode/extensions.json` and `.vscode/settings.json`; the student sees Bob's editor prompt for missing extensions and format-on-save fire on the first keystroke. On the right, the same clone without `.vscode/` — Alice's editor opens silently, no format on save, no Biome diagnostic on the obviously-broken file. The student reads the two panels side by side and sees the team-vs-machine line drawn structurally, not asserted.

**Engagement.** A six-item sort — `editor.formatOnSave`, theme, font family, `editor.codeActionsOnSave`, line height, default formatter — into "workspace (repo)" vs "user (machine)" buckets, confirming the boundary landed.

**Components.**
- `Figure` wrapping a hand-SVG two-panel composition (Bob's editor with `.vscode/` checked in, Alice's without) — the geography of the contrast is the lesson.
- `Buckets` for the six-item team-vs-personal sort (already implied in the lesson outline).

## Concept 2 — The earn-its-weight extension filter

**Why it's hard.** The VS Code marketplace rewards collecting; the senior posture is the opposite. A returning dev has muscle memory for "install a few productivity bundles and a theme pack" and needs to be shown that the cut isn't aesthetic — every extension named answers a concrete senior question, and the rest are out.

**Ideal teaching artifact.** A *misconception-first reveal* (Decision archetype, ambush-shaped). The lesson opens with a question — "you're staffing a new SaaS repo, pick the six extensions every teammate must have" — and shows a grid of fifteen plausible-sounding marketplace tiles (Biome, Prettier, ESLint, GitLens, Error Lens, Pretty TypeScript Errors, Tailwind CSS IntelliSense, EditorConfig, several "productivity" bundles, a theme pack, an AI assistant, Console Ninja). The student is invited to pick six in their head. Then a single matching exercise reveals the six the course commits to, each paired with the senior reason that earns its weight, and the rejected ones get a single dismissive line.

**Engagement.** `Matching` pairing the six committed extensions to their senior reason (Biome → lint-and-format LSP, GitLens → "who wrote this and why one click away", Error Lens → diagnostics inline on save, etc.).

**Components.**
- `Figure` wrapping a hand-SVG of the fifteen-tile marketplace grid with the six survivors visually emphasized after the reveal — single composition, no bespoke component needed.
- `Matching` for the extension-to-reason pairing.

## Concept 3 — Biome over ESLint+Prettier: default and trigger

**Why it's hard.** Most returning devs last touched this layer when ESLint + Prettier was the boring default and the two tools fought each other through `eslint-config-prettier`. They will reach for that pair on autopilot. The concept fix is naming Biome as the 2026 default *and* naming the one trigger that would flip the choice, so the student carries forward a decision rule, not a fashion.

**Ideal teaching artifact.** A *trigger-gated decision card* (Decision archetype). One short prose passage states the default: single Rust binary, single config, 10–25x faster, domain auto-enable. Then a four-scenario predict-the-call: each scenario describes a fictional project constraint ("a custom in-house ESLint plugin enforces our audit-log conventions," "we need React + Next.js linting on a greenfield," "we want one config file the whole team reads," "we're migrating a Next 15 codebase still wired to `next lint`"), and the student picks Biome or ESLint+Prettier for each. The fourth scenario doubles as the `next lint` ghost beat — the student sees the historical command is gone and the wiring is now the project's job.

**Engagement.** The four-scenario `MultipleChoice` round *is* the assessment; after it, one true/false confirms the student internalized the trigger ("an ESLint plugin the team genuinely needs that Biome doesn't cover is the trigger to keep ESLint" — true).

**Components.**
- `MultipleChoice` (one card per scenario, four cards) for the trigger puzzle.
- `TrueFalse` for the single-statement trigger confirmation.

## Concept 4 — `biome.json` as policy, not config

**Why it's hard.** A junior reads `biome.json` as a settings file — knobs to twiddle. A senior reads it as a written policy: each field encodes a project decision (what indentation the team agreed on, that Biome respects `.gitignore`, that imports auto-sort on save, that unsafe fixes don't run silently). The student needs the *shape* of the file to be legible as decisions before they touch a single field.

**Ideal teaching artifact.** An *annotated config walkthrough* (Pattern archetype) using the starter-vs-course diff. The `pnpm biome init` output sits on one tab; the course's tailored config sits on the other. The student steps through each field that changed — `useEditorconfig: true` paired with the `.editorconfig` from the previous lesson, `vcs.useIgnoreFile`, the formatter block matching the prose conventions exactly, `organizeImports` as a save-time fix, `linter.rules.recommended` as the floor. Each step names the senior decision the field encodes.

The safe-vs-unsafe fix distinction lands as a second beat: a tiny worked file with three issues (an unused import, inconsistent quotes, `==` instead of `===`) before and after `pnpm check`. The student predicts which fix runs on save and which doesn't, then sees Biome's behavior confirm the distinction.

**Engagement.** A four-scenario `Matching` exercise pairing failure modes ("teammate's editor reformats every line on save," "CI fails on a fresh PR with `biome ci` errors but the local build passes," "imports stop being sorted after a refactor," "Tailwind class autocomplete works but Biome doesn't recognize CSS-in-JS") to the configuration change that fixes each — the "configuration as policy" frame stated as a recall test, not a recipe.

**Components.**
- `CodeVariants` for the starter `biome.json` vs the course-tailored `biome.json` (the diff carries the teaching).
- `AnnotatedCode` walking the course config field by field with the senior decision on each.
- `PredictOutput` for the `hello.ts` before-and-after `pnpm check` safe-vs-unsafe beat.
- `Matching` for the four-scenario failure-mode pairing (already named in the lesson outline).

## Concept 5 — The save-time feedback loop closing

**Why it's hard.** This is the chapter's payoff moment and it happens in under a second. The student types ugly code, hits save, and four tools fire in concert — formatter rewrites whitespace, organize-imports reorders lines, Biome surfaces a diagnostic inline, Error Lens pins it to the offending line. If the lesson shows that as a screenshot it reads as magic; if it shows it as prose it reads as a checklist. The student needs to *see the moment expand* — each tool doing its job, in order, on the same keystroke.

**Ideal teaching artifact.** A *scrubbable keystroke timeline* (Concept archetype, time-shaped). A scrubber walks through six frames: (1) ugly source on screen, cursor blinking; (2) Cmd-S pressed; (3) formatter pass — indentation snaps, quotes normalize; (4) organize-imports pass — import lines reorder; (5) Biome linter pass — the `==` line picks up a wavy underline; (6) Error Lens overlays the diagnostic text at end-of-line. Each frame is annotated with which tool just fired and why. The student scrubs back and forth until the order is muscle memory.

**Engagement.** A four-step `Sequence` drag-order exercise — given the four save-time passes out of order, the student drops them into the order Biome runs them, confirming the timeline read.

**Components.**
- `DiagramSequence` carrying the six-frame scrubbable timeline (one frame per pass) with annotated callouts — the existing component is exactly the right shape.
- `Sequence` for the post-timeline order drill.

## Concept 6 — DevTools as four-question map

**Why it's hard.** A returning dev opens DevTools and sees an overwhelming surface — six tabs, fly-out drawers, settings nested two levels deep. Without a map, they default to whichever panel they last used, usually Console for a `console.log`. The concept fix is mapping the panels to *four concrete senior questions* — "what's actually rendered?" (Elements), "what did the server send back?" (Network), "what does the page think it knows?" (Console), "what's in storage right now?" (Application) — so the student picks the panel by the question, not by habit.

**Ideal teaching artifact.** A *quadrant map* (Concept archetype, geography-shaped) — a single `Figure` with the four panels drawn as a 2x2 grid, each quadrant labeled with the senior question it answers and one supporting senior workflow ("open before the action," "$0 in Console," "edit live in Elements," "clear site data in Application"). The student sees the whole map on one page, before any panel walkthrough, so each subsequent walkthrough hangs off a quadrant they already recognize.

**Engagement.** The eight-scenario `Matching` exercise from the lesson outline — pair production-like bug symptoms ("API returns 401 but the page renders fine," "a class is in the DOM but the style doesn't apply," "a session cookie is set but the next request doesn't send it," etc.) to the panel a senior would open first.

**Components.**
- `Figure` wrapping a hand-SVG 2x2 quadrant map with annotations — single composition, single use.
- `Matching` for the eight-scenario panel-picker (already in the lesson outline).

## Concept 7 — The senior workflow per panel

**Why it's hard.** Each panel has a small set of moves a senior makes by reflex that a junior usually doesn't know exist — "open Network *before* the action, not after," "right-click → Copy as fetch," "`$0` references the last inspected element," "Toggle pseudo-states explicitly because hover moves the cursor," "Clear site data when incognito works and your tab doesn't." Listing them as prose reads as trivia. The student needs to *do them*, in context, against a page that's actually broken.

**Ideal teaching artifact.** A *wrong-by-default sandbox* (Pattern archetype, artifact-carries-teaching) — a tiny prebuilt static page deliberately broken in four ways, one symptom per panel: a stale cookie that makes the page show wrong content (Application), a 404 in Network that the UI silently swallows (Network), a CSS rule struck through by a more specific selector (Elements), a console error nobody read (Console). The student opens DevTools against the live page and has to find all four bugs using only the panel each lives in. The artifact carries the teaching; the lesson is the hunt.

The four panels also need short *annotated screenshots* in the body — one per panel — naming the moves a senior makes there. The screenshots are the geography; the sandbox is the recall.

**Engagement.** The sandbox itself is the assessment — the student either finds the four bugs or doesn't. A short follow-up `MultipleChoice` round of three "which panel would you open first" scenarios confirms the senior workflow stuck after the hunt.

**Components.**
- `Figure` wrapping annotated screenshots (one per panel) with the senior moves numbered — the per-panel geography.
- `SandboxCallout` embedding the four-bugs static page as the recall artifact.
- `MultipleChoice` for the three-scenario follow-up confirming workflow recall.

## Component proposals

None.

Every artifact in this chapter fits an existing component cleanly, mostly because the chapter is shape-light — it teaches configuration files, dismissals, and the geography of a panel surface. The two artifacts that *could* have justified bespoke components — the marketplace-ambush grid in Concept 2 and the four-bugs DevTools sandbox in Concept 7 — are both single-use to this chapter with no credible forward-link. The marketplace grid lands cleanly as a hand-SVG inside `Figure`; the broken page lands as a static asset hosted alongside the lesson and surfaced through `SandboxCallout`. Both demoted under the single-use discipline.

## Build priority

No new components. The hand-SVG for the workspace-vs-machine split (Concept 1) and the 2x2 DevTools quadrant map (Concept 6) are the two visuals worth investing the most authoring care in — both carry the central frame of their respective lessons and the rest of the chapter hangs off them.

## Open pedagogical questions

- The Concept 5 save-time timeline assumes `DiagramSequence` can carry annotated callouts that swap per frame. If the existing component only swaps the visual and not annotation text, the timeline either lives in six paired panels inside a `TabbedContent` or earns a tiny extension to `DiagramSequence`'s slot model — worth confirming before authoring.
- The Concept 7 four-bugs sandbox needs a hosted static page reachable from the lesson. Decision required on where that asset lives (alongside MDX, in `src/content/docs/0 Demos`, or a separate `public/` path) and whether the page is iframed inside the `SandboxCallout` or opened in a new tab so the student has real DevTools access against it.
