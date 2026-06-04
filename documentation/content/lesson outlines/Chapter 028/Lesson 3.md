# Chapter 028 — Lesson 3 outline

## Lesson title

`AGENTS.md as the next contributor's briefing` — keep as is; it names the file and frames it as onboarding, which is the lesson's spine.

Sidebar title: `AGENTS.md`

## Lesson type

`Walkthrough` — the student reads and dissects the *provided* `projects/Chapter 028/start/AGENTS.md`, no code is authored, no test file. Step-by-step structure, no exercises. (No test-coder run for this lesson.)

## Lesson framing

The student installs the senior judgment for what the next person to open a repo — human or AI agent — should read first, and learns the one discipline that keeps that file useful: `AGENTS.md` is operational onboarding (the durable facts needed to be productive in session one), not architectural prose. They walk through the project's tight single-screen `AGENTS.md`, see why each of its five sections earns its place, and absorb a hard list of what to keep out — because the file's only real failure mode is bloat, and a 2026 research finding shows bloated context files actively reduce agent task success. The payoff is a reusable test ("would this section still be the same five lines after five PRs landed?") they apply to every doc they write afterward.

## Codebase state

- **Entry** — the provided `start/` scaffold with the toolchain understood from Lesson 2: `package.json` (`packageManager`, `engines`), `.mise.toml` (Node 24 + pnpm 11.3.0), `.npmrc` (`engine-strict`, `auto-install-peers`), `pnpm-workspace.yaml` (`sharp` allowlist), committed `pnpm-lock.yaml`. `pnpm install` runs clean. The `AGENTS.md` file already exists at the repo root, unread.
- **Exit** — the student understands the provided repo-root `AGENTS.md` section by section: thesis line, stack core (pinned), repo layout (directories, not files), daily commands, conventions pointers. They can name what earns a place, what doesn't, and the test that decides. No file is edited; this is a comprehension walkthrough of provided content.

## Lesson sections

Walkthrough structure: a short framing intro (no header), then one section per concern, ending on the discipline and a naming note. The file under discussion is `projects/Chapter 028/start/AGENTS.md` (30 lines, five sections). Render the whole file once near the top so the student sees how short it is, then dissect section by section.

### Intro (no header)

State the senior question the lesson answers (implicitly, per pedagogy): when a new contributor or coding agent opens this repo cold, what one file should they read first, and what earns a place in it? Name `AGENTS.md` as that file in 2026: adopted by the Linux Foundation as an Agentic AI Foundation founding project in late 2025, read natively by major coding agents (Codex, Cursor, Claude Code, Factory). The course framing, stated up front: `AGENTS.md` is **operational onboarding**, not architectural prose — the durable facts the next contributor needs to be productive in their first session. Note this is the from-scratch project, so the file is written once here and every later project carries the pattern forward.

Do not name AI as the lesson's reason for existing beyond the factual "agents read this file" — the durable skill is briefing the next contributor; the agent is one such contributor. (Pedagogy §2: keep AI framing incidental.)

### The whole file at a glance

Show the complete provided `AGENTS.md` as a single `Code` block (it is one screen). Lead with the observation that earns the lesson: this is the entire onboarding doc for the project, and it fits on one screen. Set the expectation that everything after this section is *why it is this short*, not *what to add*.

Use `Code` (markdown, file title `AGENTS.md`). One block, whole file — the brevity is the teaching point, so do not fragment it here.

### What earns a place

Walk the five sections of the provided file, each with a one-line justification for why it survives the brevity bar. Pull the exact lines from the provided file rather than inventing.

1. **Thesis line** — the opening one-sentence description ("A static, themed marketing surface — the from-scratch toolchain project that every later project carries forward."). Without it, the agent infers the domain from filenames. One sentence is the whole budget.
2. **Stack core (pinned)** — the load-bearing libraries with versions where they matter (Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, next-themes). Why pinned: an agent that doesn't know the major version hallucinates an old API surface (pages-router Next, Tailwind v3 config). For later projects this is where Drizzle's version would live.
3. **Repo layout** — one line per *directory* on what lives there (`src/app/`, `src/components/` + `ui/`, `src/hooks/`, `src/lib/`, `tests/lessons/`, `public/`). Saves the discovery step. The deliberate cut — directories, not individual files — is foreshadowed here and paid off in the next section.
4. **Daily commands** — the exact commands the contributor runs (`pnpm dev`, `pnpm build`, `pnpm check`, `tsc --noEmit`, `pnpm verify`, `pnpm test:lesson <n>`). Why: an agent that doesn't see these defaults to `npm run …` and breaks the pnpm discipline from Lesson 2. Name `pnpm verify` as the gate (Biome CI + typecheck + build) — the one "is it shippable" command.
5. **Conventions (pointers, not prose)** — a single sentence pointing at where conventions live: `biome.json` for code style (Lesson 5), `tsconfig.json` for strictness (Lesson 4), `.editorconfig` for editor settings (carried from Chapter 003). The rules are never restated — the agent is told where to look. This is the bloat-prevention move in miniature.

Use `AnnotatedCode` over the same file shown in the prior section: one step per section, highlighting that section's lines, each step carrying its one-line justification. This directs focus to one block at a time without re-rendering the file five times. Cross-link the convention files to their owning lessons (Lesson 4 `tsconfig`, Lesson 5 Biome, Chapter 003 `.editorconfig`) rather than re-explaining them.

### What does not earn a place

State as a hard list because the file's failure mode is bloat. Open with the evidence: a 2026 research finding (Gloaguen et al., real-world repos) shows LLM-generated context files reduce agent task success, and even hand-written files only help when minimal and precise. The cuts:

- **Aspirational architecture statements** ("strives to be clean and maintainable") — add nothing, cut.
- **Marketing copy** — that is the README's job, not this file's.
- **Tutorials** — the agent doesn't need to be taught Next.js; it needs to know *which* Next.js this repo runs.
- **Anything duplicating a more authoritative source** — `biome.json` owns formatting rules; `AGENTS.md` references it, never restates it. (This is why the Conventions section is one sentence.)
- **Hand-maintained file trees** — they age out the moment a directory is added; list directories (architectural shape), not files (which drift). This is the exact reason the Repo layout section stops at directories.
- **Decisions that should be ADRs** — Architectural Decision Records get their own treatment in Chapter 101; `AGENTS.md` points at an ADR directory if one exists, never inlines the decision.

Use a `Code` "anti-example" block: a short, plausibly-bad `AGENTS.md` fragment showing two or three of these failures (an aspirational paragraph, a hand-listed file tree, a restated formatting rule), so the student recognizes the smell. Keep it brief — the contrast carries it. Optionally pair with `CodeVariants` (bloated vs. the provided tight version) if the before/after sharpens the point; a plain annotated bad-example block is sufficient if simpler.

### The discipline

One paragraph naming the reusable test, stated plainly: if a section would still be the same five lines six months from now after five PRs landed, it earned its place; if it ages out on the next refactor, it doesn't belong. Tie back to the senior watch-out from the chapter outline: the file should stay under one screen, and if it grows past two screens during authoring, sections are being added that shouldn't be there. Present as prose; an `Aside` (tip) is the right home for the one-line test so the student can find it later.

### A note on naming

One short section. Some teams use `CLAUDE.md`, `.cursorrules`, or other tool-specific files. The 2026 consensus has converged on `AGENTS.md` as the open spec; tool-specific files can sit alongside but should *re-export or reference* `AGENTS.md` rather than duplicate it. The course commits to `AGENTS.md`. Keep to two or three sentences — this is orientation, not a survey. (Note for the writer: this course's own repo uses a `CLAUDE.md` that `@`-imports `AGENTS.md` — a concrete instance of the re-export pattern, mentionable in one line if it lands cleanly, skippable if it distracts.)

Close with the Chapter 101 forward link, named once: documentation that lives next to code — the wider Diataxis/README/ADR doctrine — owns the deeper treatment. This lesson is the operational slice.

No diagram. The content is a short text file dissected section by section; prose plus `Code`/`AnnotatedCode` carries it, and the diagram index offers nothing that beats showing the file itself.

## Scope

- **No author-from-empty.** The file is provided; the student reads and understands it, never writes it from scratch. (The chapter is a from-scratch *toolchain* project, but `AGENTS.md` is curated and shipped in `start/`.)
- **No general documentation doctrine.** Diataxis, README discipline, ADRs, and TSDoc are Chapter 101 (Unit 21). This lesson covers only the operational-onboarding slice.
- **No code authored.** UI work begins in Lesson 6 (site header). This lesson and Lessons 2/4/5 walk the provided toolchain.
- **No CI wiring.** `pnpm verify` is named as the gate; the standalone CI job that runs it lives in Unit 20. Mention, don't build.
