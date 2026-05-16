# AGENTS.md

A web development course for junior-to-mid devs with some web experience. Ships as an Astro Starlight site with MDX lessons. Content is AI-generated (with human curation).

**Thesis.** Systems design and senior mindset over syntax; the minimum viable 2026 SaaS stack, no historical detours. Every code sample and every paragraph passes through both filters. Teach only what a web developer building a new SaaS project in 2026 would use.

**Stack core, May 2026.** React 19, Next.js 16.

Read project files only if required by your current task:

## Repo layout

### Components

- `src/components/` — astro components used in lessons. Pre-built primitives live in topical subfolders (`figures/`, `code/`, `exercises/`, `live-coding/`, `quiz/`, `starlight/`, `ui/`) and are documented in `documentation/components/`. Lesson-specific diagram components live under `src/components/lessons/<chapter>/<lesson-slug>/<n>.astro` and are written by `lesson-diagramer` — those are not pre-built primitives.

### Lessons

- `src/content/docs/` — lessons MDX
- `src/content/docs/0 Demos` — astro components showcase

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

Project chapters build their code on a per-chapter prep branch (`chapter-<X.Y>-prep`) in this repo. Working artifacts under `documentation/lessons plan/work/Chapter <X.Y>/`:

- `project code plan.md` — architect's plan (precondition + slices with full inline content + stub contracts + lesson tagging).
- `project facts.md` — fact-verifier output.
- `code/` — working solution directory; slice commits live on the prep branch. Per-slice diffs available on demand via `git log -p`.
- `starter/` — derived starter directory.

When a chapter ships, `code/` and `starter/` get copied to the sibling `react-saas-course-projects` repo at `<project-id>/{solution,starter}/` for student `degit` access.
