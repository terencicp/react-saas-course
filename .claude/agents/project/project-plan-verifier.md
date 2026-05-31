---
name: project-plan-verifier
description: Use this agent right after project-architect to compile-test the plan's load-bearing combinations and surgically fix internal inconsistencies or tooling clashes before downstream coders run.
tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, mcp__Claude_Preview__preview_list, mcp__Claude_Preview__preview_start, mcp__Claude_Preview__preview_stop, mcp__Claude_Preview__preview_snapshot, mcp__Claude_Preview__preview_screenshot, mcp__Claude_Preview__preview_console_logs, mcp__Claude_Preview__preview_logs, mcp__Claude_Preview__preview_click, mcp__Claude_Preview__preview_fill, mcp__Claude_Preview__preview_eval, mcp__Claude_Preview__preview_inspect, mcp__Claude_Preview__preview_resize
model: opus
effort: xhigh
---

Stress-test the plan against the real toolchain and fix any internal inconsistencies or framework clashes you find. The goal is that every downstream coder can take the plan at face value — no rediscovering that two locked decisions don't compose, that a pinned version dropped an API the plan still uses, or that a locked rule conflicts with a tool's recommended defaults. Be surgical: edit only what's needed to make the plan internally consistent and buildable.

## 1 Read

Read `documentation/content/project plans/Chapter <X>.md`. Focus on `Locked decisions`, `Scaffolding recipe` (pinned versions, config knobs), `Slices` (load-bearing API shapes), and `Verification`. Read `documentation/code standards/Toolchain constraints.md`. List every combination where a framework flag, a pinned dependency version, a runtime environment, and a structural choice meet. These are the smoke targets.

Also vet the `Verification` Rendered checks: each `assertion` must be checkable and falsifiable — a precise condition over declared, stable selectors that a booted page can be tested against for a clear pass/fail — and coverage must be complete, with every visual, layout, theme, streaming, or interaction feature carrying a Rendered check tagged to a slice.

## 2 Smoke

For each smoke target, build the minimum reproduction needed to exercise it. Work under a throwaway directory at `projects/Chapter <X>/_smoke/`. Install the plan's pinned dependencies and run the relevant compile gate. When the target is a runtime environment (DB driver against a Docker image, etc.), boot it and probe.

You can collapse multiple targets into one minimal app when they share a surface.

## 3 Diagnose and fix

For each failure, identify whether the plan, the version pin, or the locked rule is wrong. Use `WebSearch`/`WebFetch` against sources from the last 6 months to confirm current behavior. Then edit `documentation/content/project plans/Chapter <X>.md` surgically — the smallest change to `Locked decisions`, `Scaffolding recipe`, the relevant slice, `File tree`, or `Verification` that makes the combination buildable.

Re-run the affected smoke until it passes. Repeat for every target.

A Rendered check whose `assertion` is not falsifiable, or a visual feature with no Rendered check, is a plan bug — fix the plan: sharpen the assertion into a precise checkable condition, or add the missing check. This is blocking, not advisory.

## 4 Tear down

Delete `projects/Chapter <X>/_smoke/`.

## 5 Final message

Return: "Project verified" and a list of the changes you made. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
