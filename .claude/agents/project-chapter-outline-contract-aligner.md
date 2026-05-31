---
name: project-chapter-outline-contract-aligner
description: Use this agent once per project chapter, before the build pipeline, to rewrite the chapter outline so its lessons conform to the Project Lesson Contract.
tools: Read, Write, Edit, Glob, Grep
model: opus
effort: max
---

Rewrite the project chapter outline so its lessons match the Project Lesson Contract. The outlines predate the contract and share an older template — a "Verify recipe mapped to Done when" table plus per-lesson Goals / Senior calls / Codebase state / Estimated time — and a lesson shape (clone-the-starter, starter-walkthrough, build-many-features, verify-only) the contract does not define. Downstream lesson agents read both the contract and this outline, so an outline that fights the contract drags the whole build off course. This is a pure outline-to-outline transform: it runs before any code exists, so read no code. Keep edits faithful to the outline's pedagogical intent. Follow the steps in order.

## 1 Read

Read `AGENTS.md` and `documentation/content/overview/Units.md` for course context. Read `documentation/pedagogical approach/Project lessons.md` — the contract is your target spec; treat its per-type section lists as authoritative. Read the chapter outline to rewrite at `documentation/content/chapter outlines/Chapter <X>.md` in full — this is the document you edit.

## 2 Identify the project's archetype

Name what the project builds so every requirement can be stated in the project's own terms — a user-facing behavior for a UI feature, a query or migration result for a data layer, a documented finding for an audit, a test that catches a regression for a testing project, a deployment invariant for an ops project. The contract calls these "verifiable outcomes"; you pick the kind that fits this project. Carry this lens through the rest of the steps.

## 3 Classify each lesson

Assign every lesson exactly one contract type: Project overview, Walkthrough, or Implementation. The first lesson is always the Project overview, titled "Project Overview".

## 4 Route every piece of the old outline to the section that owns it

Each contract type has a fixed section list. Place the outline's existing material into the section that owns it:

- Starter setup steps — clone or degit, install, run the dev server — belong in the Project overview's Setup section.
- A starter file tour belongs in the Project overview's Starting file tree section; push deep per-file explanation into the Implementation lesson that first touches that file.
- A lesson's verification belongs in that lesson's own Moment of truth.

When this routing empties a lesson (a clone-only, tour-only, or verify-only lesson), its content has found a home elsewhere and the standalone lesson dissolves.

## 5 Give each Implementation lesson one verifiable capability

Split a lesson that delivers several independent capabilities into one lesson per capability. Keep together code paths that only reach a verifiable state as a unit — a migration plus the action that exercises it, a parent task plus the child it cannot run without. The test is whether each resulting lesson reaches a state the student can confirm. Renumber the lessons and fix every cross-reference afterward.

## 6 Write each Implementation brief in the contract's "Your mission" shape

Under the headerless intro, state the goal in one sentence and describe the finished result. Then, under the "Your mission" header, open with a prose paragraph that introduces the capability in the project's terms and weaves in whatever applies: the constraints that shape the solution, what is out of scope, and the best practices that steer the student clear of common traps. Follow that paragraph with a requirements checklist — the only list under the header — where each item is one verifiable outcome the student can confirm. Where the old outline stated a requirement as a file, export, or import, restate it as the outcome that file produces.

## 7 Rewrite the Chapter framing

Fold the outcomes from the "Verify recipe mapped to Done when" table into the project's stated goals, then drop the table. Keep the planning material the architect still needs: the dependency carry-in, the starter file tree, the reference-solution signatures, and the concept→owning-lesson map.

## 8 Final pass

Re-read the rewritten outline for coherent lesson numbering, cross-references, and dependency carry-in.

## 9 Final message

Respond with "Outline aligned" and a brief hihg-level summary of the changes. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
