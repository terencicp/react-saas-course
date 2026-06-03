# Project Lesson Contract

Defines the structure and conventions for project lessons. Lessons can be of three types: Project overview, walkthrough lessons, implementation lessons.

## General

### Tests
There is an automated test suite the student can run for each lesson.
- Assertions target observable behavior, not file paths, function names, or imports.
- Failure messages point at the likely cause.
- Scope: happy path, the meaningful edge case, and the constraint the lesson exists to teach.
- Pass/fail surface only.
- The lesson body marks which requirements the tests cover and which are shown only in the solution.
- Each test file is self-contained: depends only on the shared runner/config and the student's code, inlining any helpers it needs.

### Setup commands
Wherever the student runs commands or configures their environment, list exact commands in order. If environment variables are necessary: name, purpose, and how to obtain the value. Include a sentence on the expected outcome on success.

---

## Project overview

The first project lesson, always titled "Project Overview". No feature is built. The student leaves with a running starter app.

### Sections, in order
1. **What we're building.** Introduction. One paragraph plus a single figure of the finished app screenshots. No header.
2. **Skills.** What will be practiced in terms of the skills the student is developing. Name "What we'll practice".
3. **Architecture.** Diagram or labeled list. Shape only.
4. **Starting file tree.** Annotated top-level layout — comment one line each only on files changed from the previous project or that lessons will touch, leaving the rest uncommented; mark the files containing TODOs as the highlighted focus.
5. **Roadmap.** One Card in CardGrid for each lesson with lesson number and title and one sentence naming what it adds.
6. **Setup.** Command sequence (Steps component), env var list (omit if irrelevant), dev server command, expected result. Reference the definitive repo path: `https://github.com/terencicp/react-saas-course-projects/Chapter <XXX>/start/`.

The lesson ends when the starter runs locally. Technology rationale belongs in regular lessons, not here.

---

## Walkthrough lessons

Only for step-by-step scaffolding. Similar structure to regular lessons but with a more step by step tutorial approach, without exercises. They may carry supporting videos in the body and a closing external-resources section.

---

## Implementation lessons

Each adds one capability to the project — a user-facing feature, a data-layer change, an audit finding, a test, or a deployment step, depending on what the project builds. They may carry supporting videos in the body and external resources placed at the end of the "Coding time" section (no header, after the solution `<details>`), not in a closing section.

### Sections, in order
1. **Goal + Finished result.** Introduction without header. One sentence goal in user terms. + Screenshot or one-paragraph description of the feature working.
2. **Design brief.** Header name: "Your mission".
3. **Build prompt + Reference solution and walkthrough.** One line directing the student to implement against the brief and the tests. + Solution hidden in <details>. Header name: "Coding time".
4. **Verification.** How to run the lesson's test suite — the command and the expected pass output — plus a checklist for confirming by hand each requirement the tests don't cover, which the student ticks off as they go. Header name "Moment of truth".

### Your mission
An opening prose paragraph introduces the capability in the project's terms and weaves in whatever applies: the constraints that shape the solution (performance, persistence, resilience, code organization, tools — one or two new ones per lesson, reusing prior ones where they fit), what is out of scope, and the best practices that keep the student clear of the traps inexperienced devs fall into.

Then a requirements checklist — the only list in the section — where each item is one verifiable outcome the student confirms and ticks off as they build. What counts as a verifiable outcome depends on the project: a user-facing behavior for a UI feature, a query or migration result for a data layer, a documented finding for an audit, a test that catches a regression for a testing project, a deployment invariant for an ops project. Phrase each item as the outcome itself, never as a file, export, or import.

No subsection headers; no implementation hints.

### Coding time
Build prompt and hidden exandable solution walkthrough framed as material to read after the student attempts the work.
- Full reference implementation, organized as it appears in the repo.
- Decision rationale for non-obvious choices, one or two sentences each.
- Coverage of the untested requirements — code organization, naming, error-handling placement.
- Callouts on anything that looks unusual at a glance.
- For topics covered by a regular lesson, link rather than re-explain.
- External resources, if any, are appended here after the solution `<details>` with no header (added later by the resourcer), not in a closing section.
