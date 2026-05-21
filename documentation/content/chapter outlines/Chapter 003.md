# Chapter 003 — The feedback loop

## Chapter framing

Chapter 002 pinned the runtime, the package manager, and the way TypeScript runs. The student can already execute `.ts` files. This chapter pins the next layer — the editor the code is written in, the tool that keeps it consistent, and the panel that proves it works in the browser — so the feedback loop closes inside the IDE and the browser before the first framework lesson lands in Chapter 004.

The senior framing for the whole chapter: a SaaS engineer's productivity is the speed of their feedback loop. Every tool taught here exists to shorten the loop between writing code, knowing it is well-formed, and seeing how it behaves in the browser. Nothing else gets a seat.

Threads that must run through every lesson in this chapter:

- **Minimum stack thinking applies to the editor too.** Same filter as lesson 2 of chapter 001: the smallest set of extensions, settings, and panels that earns its weight. Marketplace tours are out. Every extension, setting, or DevTools panel named answers a concrete senior question.
- **Editor configuration is part of the repo, not the machine.** `.editorconfig`, `.vscode/settings.json`, `.vscode/extensions.json`, and `biome.json` live in version control next to the lockfile from lesson 3 of chapter 002. The student leaves the chapter understanding the editor as a teammate-shared surface, not a personal preference.
- **One tool, one config.** Biome replaces the ESLint + Prettier pair as the 2026 default — single binary, single config file, 10–25x faster, ships with a Next.js domain. ESLint named once with the trigger that would flip the choice (a plugin Biome doesn't cover that the project genuinely needs), then dropped. This is the same "default first, conditional with trigger" pattern the chapter is teaching the student to read.
- **`next lint` is gone in Next.js 16.** The student needs to know the historical command is removed and the platform expects them to wire linting themselves — directly via Biome or ESLint. The course wires Biome.
- **DevTools is a feedback-loop tool, not a debugging-only tool.** The pitch is build *and* debug. Elements for cause-and-effect on styles, Network for the request-response surface every later unit will reach for, Console as a REPL into the running app, Application for the storage and identity surfaces auth and cache lean on.
- **No application code yet.** The chapter ships editor configuration, a Biome config, and a tour of DevTools panels against any existing tab the student has open. The Next.js scaffold lands in Chapter 004.

The student finishes the chapter with VS Code installed, a small workspace-checked-in settings file and extensions recommendations file, an `.editorconfig` at the repo root, a `biome.json` with `useEditorconfig: true` and the recommended rule set, format-on-save wired through the Biome extension, and the muscle memory to open the four DevTools panels and read what each is for. Chapter 004 lands on that floor and scaffolds Next.js into it.

---

## Lesson 1 — VS Code as a team artifact

Teaches the editor commitment, the minimum-viable extension set with one senior reason each, and the repo-owned configuration files (`.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json`) that make editor setup a teammate-shared surface rather than a personal preference.

Topics to cover:

- The editor decision in one paragraph. VS Code is the 2026 default for SaaS work — broadest extension ecosystem, the language servers the course's stack ships its own integrations against, free, cross-platform, the editor every junior teammate will already have or will install in five minutes. Cursor, Zed, and Neovim get one line each with the trigger that would flip the choice — Cursor for AI-first workflows the course deliberately doesn't teach against, Zed for editing speed past the point a senior would notice, Neovim for keyboard fluency a returning dev usually doesn't have time to invest in. The course commits to VS Code. Installation is one line and a link; no walkthrough.
- The minimum-viable extension set, with one senior reason each.
  - Biome — the lint-and-format LSP that lesson 2 of chapter 003 will configure. Installed here, configured there.
  - Tailwind CSS IntelliSense — autocomplete, hover-previewed generated CSS, class-name linting. Earns its weight from Chapter 023 onward; installed here so it never has to be revisited.
  - EditorConfig — reads `.editorconfig` so non-VS Code editors on the team behave the same. One file, one extension, no per-editor config.
  - GitLens — inline blame on the line under the cursor, file history, side-by-side compare. The senior reason: code review starts with "who wrote this and why," and GitLens puts that question one click away.
  - Error Lens — pulls TypeScript / Biome diagnostics inline next to the offending line instead of hovering. Tightens the feedback loop on every save.
  - Pretty TypeScript Errors — flattens long structural type errors into something a human reads in one pass. Earns its weight the first time a Drizzle or Zod inferred type explodes into a wall of text.
  - The "Console Ninja"-style runtime-value inline overlay extensions get one dismissive line — paid, narrow benefit, the course doesn't lean on them.
- The "everything else is opinion" rule. Themes, icon packs, vim modes, productivity bundles — out of scope, the student picks their own and the course doesn't care.
- The repo-owned configuration: the `.vscode/` directory and what belongs in it.
  - `.vscode/extensions.json` with a `recommendations` array — when a teammate clones the repo, VS Code prompts them to install the missing extensions. Structural enforcement that makes "I forgot to install Biome" hard to leave un-fixed.
  - `.vscode/settings.json` — workspace-level overrides for `editor.formatOnSave`, `editor.defaultFormatter` per language (Biome for JS/TS/JSON, the Tailwind extension for CSS Intellisense), `editor.codeActionsOnSave` with Biome's `quickfix.biome` and `source.organizeImports.biome`, `typescript.tsdk` pointing at the workspace TypeScript (the "Use Workspace Version" choice, surfaced explicitly — TypeScript lands in `node_modules` when Next.js is installed in Chapter 004, so the setting takes effect from chapter 004 onward).
  - The boundary: settings the student wants for *themselves* (theme, font) belong in User settings, not the workspace file. The lesson is explicit that the workspace file is a team artifact, not a place to push personal preference.
- `.editorconfig` at the repo root. Two-space indentation, LF line endings, UTF-8, final newline, trim trailing whitespace. Four lines, two editors honor it (VS Code via the extension, IntelliJ family natively), Biome reads it directly in the next lesson. Stated as a single file, not a configuration surface.
- The "Use Workspace Version" of TypeScript prompt. Every fresh open of a TS project surfaces it; the student needs to pick the workspace version once so the editor uses the same `tsc` the build does. Named so they don't ignore it.

What this lesson does not cover:

- The Biome configuration itself — that's lesson 2 of chapter 003.
- The full `tsconfig.json` — that's lesson 3 of chapter 004 and lesson 4 of chapter 004.
- Keyboard shortcuts, the command palette beyond "Ctrl/Cmd-Shift-P exists" — not a productivity tutorial.
- Settings Sync — the chapter takes the position that workspace settings belong in the repo, not in a personal cloud profile.
- Theme, font, icon-pack choices — the course doesn't care.

Pedagogical approach:

Setup/wiring archetype with a one-paragraph Decision opening. Open with the VS Code commitment in two sentences and dismiss the alternatives in one line each so the lesson doesn't sit on the editor-choice question. Then a `Steps` block walks the install, the extension installs (one command via the CLI or a single Marketplace link per extension), and writing the four files the chapter cares about: `.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json` (with the Biome formatter wired but the rules to be added in lesson 2 of chapter 003 — the file is staged here, populated more in the next lesson), and a placeholder mention that `biome.json` arrives next. Show each file as a small labeled code block — never more than a dozen lines, no commentary inside the blocks. Use `Tabs` to display the three files side by side at the end so the student sees the `.vscode/` shape at a glance. Close with one short `Buckets` exercise sorting six settings into "workspace (repo)" vs "user (machine)" — `editor.formatOnSave`, theme, font family, `editor.codeActionsOnSave`, line height, default formatter — to confirm the team-vs-personal distinction landed. No sandbox: there's nothing to play with.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2 — Biome, the single-binary linter and formatter

Teaches Biome as the 2026 default over ESLint+Prettier (single Rust binary, dependency-aware domains), the `next lint` removal in Next.js 16, the minimum-viable `biome.json` wired to `.editorconfig`, the four daily scripts, and the safe-versus-unsafe fix distinction.

Topics to cover:

- The decision up front, in three sentences. Biome replaces ESLint + Prettier as the 2026 default for new SaaS projects on this stack — single Rust binary, single `biome.json`, 10–25x faster on lint and format, ships with rule domains that auto-enable based on installed dependencies (Next.js, React, the test runner). The trigger that would flip the choice: an ESLint plugin the team genuinely needs that Biome doesn't cover or have a domain for (the long tail — accessibility-heavy custom rules, in-house plugins, a security scanner with no Biome equivalent). For the course's stack, no such plugin is load-bearing; Biome wins.
- The `next lint` ghost. Next.js 16 removed `next lint` and the `eslint` option from `next.config`. The platform now expects the project to wire linting itself. The course wires Biome directly through `pnpm` scripts; the migration codemod (`@next/codemod` `next-lint-to-eslint-cli`) is named in one line for students who later inherit a Next 15 codebase, then dropped.
- Installing Biome as a workspace dependency. `pnpm add -D --save-exact @biomejs/biome` — `--save-exact` so the version is pinned the same way the runtime and package manager are pinned, no caret range. Initialize with `pnpm biome init` to generate a starter `biome.json`.
- The minimum-viable `biome.json` for the course. Walk through the fields the student actually touches:
  - `"$schema"` — JSON schema URL so the editor autocompletes the config itself.
  - `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }` — Biome respects `.gitignore` so it never lints `node_modules` or `.next`.
  - `"files": { "ignoreUnknown": true }` and any explicit `includes` if the layout calls for it.
  - `"formatter": { "enabled": true, "indentStyle": "tab" | "space", "indentWidth": 2, "lineWidth": 100 }` — name the senior debate (tab vs. space) and pick one (the course uses spaces, two wide, matching the `.editorconfig` from lesson 1 of chapter 003) so the file stays consistent with itself.
  - `"javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always", "arrowParentheses": "always" } }` — matches the Pedagogical Approach's code conventions exactly. Stated once, the student sees the link between the rule and the prose convention.
  - `"linter": { "enabled": true, "rules": { "recommended": true } }` — the recommended preset is the floor.
  - `"useEditorconfig": true` — Biome reads the `.editorconfig` from lesson 1 of chapter 003 for indentation, line endings, and final-newline so the two files agree by construction instead of by hand.
  - `"assist": { "actions": { "source": { "organizeImports": "on" } } }` — sorted imports as a save-time fix, with no separate import-sort plugin.
- The domain system, the v2 thing worth naming. Biome 2 introduced domains — grouped rule sets for `next`, `react`, `test`, etc. — that auto-enable when the matching dependency is in `package.json`. The student should know the concept exists so they don't go looking for a "Next.js plugin." Show `"linter": { "domains": { "next": "recommended" } }` if explicit enabling is wanted, then point at the auto-enable default. Two sentences total.
- The four daily Biome commands as `pnpm` scripts in `package.json`:
  - `"format": "biome format --write ."`
  - `"lint": "biome lint ."`
  - `"check": "biome check --write ."` — runs format + lint + import-sort + safe quick-fixes in one pass. The script the student runs locally before committing.
  - `"check:ci": "biome ci ."` — CI mode, no writes, fails on any diagnostic. Named here, used in Unit 21.
- The editor integration. Format-on-save and `source.organizeImports.biome` were wired in lesson 1 of chapter 003; this lesson is the moment that wiring actually fires because the config now exists. Demonstrate one round: open a file, save it ugly, watch Biome format on save and surface a lint warning inline (the Error Lens extension from lesson 1 of chapter 003 puts it on the same line).
- One worked example. The student writes a tiny `hello.ts` with intentionally inconsistent quotes, an unused import, and an obviously wrong rule violation (e.g. `==` instead of `===`). Save it — Biome formats, fixes safely, and shows the unsafe diagnostic inline. Run `pnpm check` — fixes the unsafe one too. The student sees the loop.
- Two senior watch-outs.
  - The "safe vs. unsafe" fix distinction. Biome's default `--write` applies only safe fixes; `--unsafe` is opt-in and changes program behavior. Named once with the example: removing an unused import is safe, rewriting `==` to `===` can change behavior if the operands differ in type.
  - The CI rule. Biome runs in CI on every PR. The `--frozen-lockfile`/`only-allow pnpm` discipline from lesson 3 of chapter 002 has a Biome cousin — the `biome ci` script is what closes the loop. Foreshadowed only; the actual CI job lives in Unit 21.

What this lesson does not cover:

- Authoring custom Biome rules with GritQL plugins — niche, deferred to a "reach for it when…" mention.
- Ignoring specific rules per-file with comments — surfaced only when the student hits a case that earns it; not taught here in the abstract.
- ESLint configuration, flat config, plugins. ESLint is named once as the trigger-gated alternative and the lesson moves on.
- Husky / lint-staged / pre-commit hooks — out of scope for the first chapter on tooling. The course's CI gate is the structural enforcement; pre-commit hooks are an optional taste-level addition revisited in Unit 21.
- Prettier-specific differences from Biome's formatter (the ~3% incompatibility). Not load-bearing for a greenfield project; named in one line and dropped.

Pedagogical approach:

Setup/wiring archetype with a Decision opening and a small Pattern beat. Open with the Biome-vs-ESLint+Prettier decision in three sentences (failure prevented: two tools with two configs drifting against each other and a 45-second CI lint step; trigger to flip: an ESLint plugin the team needs that Biome doesn't cover). Name the `next lint` removal in one paragraph so the student doesn't go looking for the old command. Then a `Steps` block walks the install, `biome init`, the edits to the generated config (use `CodeVariants` or an annotated block to show the starter config next to the course's tailored config — the student sees what changed and why), and the four `package.json` scripts. Show the resulting `biome.json` as one labeled block at the end of the configuration section — the file the student now has. The worked example is a small `ScriptCoding` exercise: pre-seeded `hello.ts` with three deliberate issues, the student runs (or imagines running) `pnpm check`, and the exercise grades on whether the corrected output matches expectations — or, simpler, a `PredictOutput`-style exercise showing the file before-and-after `pnpm check` and asking which fixes are "safe" vs "unsafe." Close with one short `Matching` exercise pairing four scenarios ("teammate's editor reformats every line on save," "CI fails on a fresh PR with `biome ci` errors but the local build passes," "imports stop being sorted after a refactor," "Tailwind class autocomplete works but Biome doesn't recognize CSS-in-JS") with the four configuration changes that fix each — so the student leaves with the configuration-as-policy frame, not just a recipe.

Estimated student time: 35 to 40 minutes.

---

## Lesson 3 — DevTools: the four panels that earn their keep

Teaches the senior workflows in Elements (live DOM and cascade), Network (open before the action, throttle, copy-as-fetch), Console (REPL, `$0`, `console.table`), and Application (cookies, storage, service workers), with React DevTools installed here for its first call in Unit 4.

Topics to cover:

- The framing. DevTools is the second half of the feedback loop the chapter is wiring. The editor tells the student the code is well-formed; DevTools tells them it does what they think it does in the browser. Four panels carry the weight in SaaS work — Elements, Network, Console, Application — and a fifth (Performance / Lighthouse) gets a deferred mention because it doesn't earn its keep until Unit 18 and 19. Sources, Memory, Recorder, Security: one line each, "reach for it when," not taught.
- The browser commitment. Chrome (or any Chromium — Edge, Arc, Brave) DevTools as the primary surface because Chromium ships the deepest DevTools and the React DevTools extension lands there cleanly. Firefox DevTools named once as the cross-browser sanity check, Safari DevTools in one line for the iOS-specific work in Unit 21. The course teaches against Chromium DevTools by default.
- React DevTools as the one extension worth installing alongside. Components panel for inspecting the React tree (named here, used the moment the course writes its first component in Unit 4), Profiler tab for render measurement (used in Unit chapter 027 and revisited in Unit 19). Installed here so it never has to be again.
- **Elements panel.** What it is — the live DOM, not the source HTML, with the styles cascade visible per-element. The senior workflow:
  - Inspect to find the element under the cursor.
  - Read the rules in the right pane in cascade order, with overridden rules struck through. This is *how* the cascade visualizes — the topic itself is taught in Unit chapter 024, but the panel is the place a senior reads the cascade in practice.
  - Edit styles live (no reload) to test a fix before writing it in the source. The "if it works in DevTools, it'll work in the code" rule.
  - Toggle pseudo-states (`:hover`, `:focus-visible`, `:active`) explicitly because hovering removes the cursor and the state with it.
  - Computed tab for the resolved final value when the cascade is the question.
- **Network panel.** What it is — every request the page makes, with timing, headers, payload, and response. The senior workflow:
  - Open the panel *before* the action that triggers the request, then trigger the action. "Open after" misses the request entirely.
  - Preserve log on navigation so a redirect doesn't drop the request that caused it.
  - Disable cache while DevTools is open (a checkbox) so the request the user is actually testing fires.
  - Filter by request type (Fetch/XHR, Doc, JS, CSS, Img) when the noise drowns the signal.
  - Read the right pane in this order: Headers (auth and content type), Payload (what the client sent), Response (what the server sent back), Timing (where the latency went).
  - Throttle network speed to "Fast 3G" or "Slow 3G" when testing loading states — the senior catch for "this looks fine on localhost."
  - Right-click → Copy as fetch / cURL — the move that turns a captured request into a debuggable reproduction.
- **Console panel.** What it is — a REPL inside the running page, with read access to anything in the global scope. The senior workflow:
  - The four log levels (`log`, `info`, `warn`, `error`) and filtering by level.
  - `console.table()` for arrays of objects, `console.dir()` for the full property tree of a DOM node, `console.trace()` for the stack at the call site — three commands a senior uses regularly that a junior often hasn't seen.
  - `$0`, `$1`, … as references to recently-inspected elements.
  - `copy(value)` to put any value on the clipboard.
  - Live-evaluation as you type — useful for testing a query selector against the live DOM before pasting it into code.
- **Application panel.** What it is — every storage and identity surface the page touches. The senior workflow for SaaS work:
  - Cookies — the auth surface. The student will read session cookies here when the auth chapter (Unit 9) lands. Edit and clear right from the panel.
  - Local Storage and Session Storage — for client-state-tooling in Unit 16 and the URL-state list project in Unit 11. Same edit-and-clear surface.
  - IndexedDB — when offline state earns its weight, mentioned in one line, not the default.
  - Service Workers and Cache Storage — surfaced for Unit 15 (cache and rate limiting); not the default, named so the panel is mapped.
  - "Clear site data" — the senior nuke when "it works in incognito but not here" surfaces. Named explicitly.
- The deferred panel: Performance / Lighthouse. One sentence — it exists, it's where Core Web Vitals live, the course returns to it in Unit 18 (perf) and 19 (Sentry/PostHog tie-ins). Not taught here because measuring performance on an empty page is theatre.
- The Device Mode toolbar — viewport simulation for responsive testing. Named once because the Tailwind chapter (chapter 026) will lean on it; the workflow itself is taught there.

What this lesson does not cover:

- The Sources panel and debugger / breakpoint workflow — the course's day-to-day on this stack is heavy on Server Components and Server Actions, where the debugger lives in the Node process, not the browser. Surfaced one line.
- DevTools' AI-powered insights and the Console Insights panel — named in one dismissive line. The two pillars (no AI naming unless the feature is AI) and the cliff-edge of "AI features in DevTools ship and break on Chrome stable channels" make it the wrong thing to teach as a default.
- React DevTools mechanics in depth — installed here, taught at the call site in chapter 027.
- The cascade itself, the box model, the React render model — the workflows that *use* these in DevTools are taught at the panel; the model is taught in its owning chapter.

Pedagogical approach:

Reference / survey archetype with a strong "reach for it when" backbone. The lesson has four sub-sections, one per panel, and each follows the same shape: one paragraph framing the panel as the answer to a concrete senior question ("what's actually rendered? what did the server send back? what does the page think it knows? what's in storage right now?"), a short ordered list of the moves a senior makes in that panel, and one small worked beat the student can replicate against any page they have open (the course's own Starlight site is a fine target). The lesson should not feel like a manual — the goal is map, not mastery. A `Figure` with a screenshot or annotated SVG of the DevTools layout per panel earns its weight because the geography of the panel is half the lesson. Close with a `Matching` exercise pairing eight production-like scenarios ("the API call returns 401 but the page renders fine," "a class is in the DOM but the style doesn't apply," "a session cookie is set but the next request doesn't send it," "an animation runs on hover but I can't see why," "we ship a fetch but the user sees a stale response," "the React tree shows the component but the prop is undefined," "a redirect happens before I can read the response," "the user reports `localStorage` data they shouldn't have") to the panel the student would open first — this is the one beat that turns the survey into recall. No live coding exercises; the lesson is browser-shaped, not editor-shaped. Offer one `SandboxCallout` at the end with a tiny prebuilt HTML page deliberately broken in four ways (a 404 hidden in Network, a struck-through CSS rule in Elements, a console error nobody reads, a stale cookie) and invite the student to find the four bugs using only DevTools. That sandbox is the lesson's optional confirmation that the geography landed.

Estimated student time: 35 to 40 minutes.

---

## Total chapter time

Roughly 95 to 110 minutes across the three lessons. The chapter fits a single evening for a focused reader or splits naturally across two — lesson 1 of chapter 003 + lesson 2 of chapter 003 as the editor evening, lesson 3 of chapter 003 as the DevTools evening. At the end the student has VS Code installed with the minimum-viable extension set, a `.vscode/extensions.json`, a `.vscode/settings.json`, an `.editorconfig`, a `biome.json`, four Biome scripts in `package.json`, React DevTools installed in their browser, and the muscle memory to open the four DevTools panels and read what each is for. Chapter 004 scaffolds Next.js into that floor without re-explaining any of it.
