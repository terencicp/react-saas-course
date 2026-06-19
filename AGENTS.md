# AGENTS.md

A web development course for junior devs from other fields with some previous exposure to web basics. Ships as an Astro Starlight site with MDX lessons. Content is AI-generated (with human curation).

**Thesis.** Systems design and senior mindset over syntax; the minimum viable 2026 SaaS stack, no historical detours. Every code sample and every paragraph passes through both filters. Teach only what a web developer building a new SaaS project in 2026 would use.

**Stack core, May 2026.** React 19, Next.js 16.

## Prompting style

When writing prompts for agents keep them simple and concise. Avoid duplication, if instructions are in the file you reference do not repeat them in the prompt. Tell agents what to do, not what not to do, unless to correct model errors. Prompts must be written as step by step instructions. Initial steps should have a context limited to the essential the agent needs to carry its task, later steps include more context and prompt the agent to reevaluate its work. Promote the agent's creative thinking when necessary. Break paragraphs into one sentence per line to help read diffs.

## Repo layout

Read project files only if essential to your current task. Read only the relevant sections from each file.

### Components

- `src/components/` — astro pre-built components organized by topic. Lesson-specific components at `src/components/lessons/<lesson id>/<name>.astro`.

The site has a BYOK OpenRouter AI tutor: a lazy React panel in `src/components/ai-chat/` (`mount.tsx`) loaded from the Footer override, with per-lesson context at `/api/ai/lesson/<slug>.json`.

### Lessons

- `src/content/docs/` — lessons MDX

### Scratch space

- `tmp/` — experimental and temporary files. Use this for throwaway scripts, scratch notes, and intermediate artifacts. Its contents are gitignored. You are responsible for deleting your own files here once they are no longer needed.

### Documentation

- `documentation/Table of contents.md` — list of Units, Chapters, Lessons and a brief description of lesson content. Extensive document, read only the relevant sections.
- `documentation/Units.md` — brief high-level overview of the course's units, the topics each covers, and the project chapters.
- `documentation/components/INDEX.md` — API for the pre-built astro components.
- `documentation/diagrams/INDEX.md` — How to pick the best diagram engine for each use case.

### Agents

- `.claude/agents/prose rewriting/` — prose rewriting pipeline. `prose-chapter-rewrite-orchestrator` runs a chapter: it spawns one `prose-lesson-rewriter` per lesson, which triages sections, then spawns one `prose-section-reviewer` per section to propose cuts and rewrites, applies them, and commits.

## Deployment

Deploys as a static Astro build on Cloudflare Pages.
