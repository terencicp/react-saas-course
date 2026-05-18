# AGENTS.md

A web development course for junior devs from other fields with some previous exposure to web basics. Ships as an Astro Starlight site with MDX lessons. Content is AI-generated (with human curation).

**Thesis.** Systems design and senior mindset over syntax; the minimum viable 2026 SaaS stack, no historical detours. Every code sample and every paragraph passes through both filters. Teach only what a web developer building a new SaaS project in 2026 would use.

**Stack core, May 2026.** React 19, Next.js 16.

Read project files only if essential to your current task:

## Repo layout

### Components

- `src/components/` — astro components used in lessons, organized by topic. Lesson-specific components at `src/components/lessons/<lesson id>/<name>.astro`.

### Lessons

- `src/content/docs/` — lessons MDX

### Documentation

- `documentation/content/overview/Table of contents.md` — canonical curriculum, the source of truth for what gets taught and in what order. Extensive document, read only the relevant sections.
- `documentation/content/overview/Units.md` — brief high-level overview of the course's units and the topics each covers.
- `documentation/content/overview/Project dependencies.md` — for each chapter-end project, which earlier project's codebase it continues from.
- `documentation/content/chapter outlines/` — one file per chapter (`Chapter X.Y.md`) breaking down the content and scope of each lesson within the chapter.
- `documentation/pedagogical approach/Pedagogical guidelines.md` — Teaching style for the course's lessons.
- `documentation/code standards/Code conventions.md` — canonical production code conventions for project repos and lesson MDX code blocks. Source of truth for code shape, paired with §4 of Pedagogical guidelines for display rules. The `configs/` subfolder holds canonical config files (`biome.json`, `tsconfig.json`, etc.) copied verbatim into every project starter.
- `documentation/components/INDEX.md` — pre-built Astro components used in lessons, grouped by category. Each entry links to its component doc. The lesson-designer, lesson-formatter, lesson-exerciser, and quiz-maker read this to pick only components that exist.
- `documentation/diagrams/INDEX.md` — How to pick the best diagram engine for each use case (Mermaid, D2, etc.).

### Project chapter prep (transient)

Project chapters build their code inside a per-chapter git worktree of this repo, on a chapter-scoped branch. Multiple chapters can be authored in parallel — each chapter orchestrator runs in its own worktree, created and torn down by Claude Code. Working artifacts under `documentation/lessons plan/work/Chapter <X.Y>/`:

- `project code plan.md` — architect's plan (precondition + slices with full inline content + stub contracts + lesson tagging).
- `project facts.md` — fact-verifier output.
- `code/` — working solution directory; slice commits live on the chapter worktree's branch. Per-slice diffs available on demand via `git log -p`.
- `starter/` — derived starter directory.

When a chapter ships, `code/` and `starter/` get copied to the sibling `react-saas-course-projects` repo at `<project-id>/{solution,starter}/` for student `degit` access.
