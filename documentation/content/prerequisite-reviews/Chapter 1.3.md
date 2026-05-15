# Chapter 1.3 prerequisites review

## Missing prerequisites

- Lesson 1.3.1 — TypeScript as an installed project dev dependency. Quote: "pointing at the workspace TypeScript (the 'Use Workspace Version' choice, surfaced explicitly)". The `typescript.tsdk` setting and the "Use Workspace Version" VS Code prompt assume TypeScript is present in `node_modules`, but no prior chapter explicitly installs it (`pnpm add -D typescript`). Chapter 1.2.4 uses `pnpm tsc --noEmit` without stating that TypeScript must first be added as a dev dependency; the Next.js scaffold that brings TypeScript arrives in Chapter 1.4. Suggested source: add a one-line `pnpm add -D typescript` step to 1.2.4, or add a note in 1.3.1 that the setting takes effect once Next.js (and therefore TypeScript) is installed in 1.4. Severity: low.
