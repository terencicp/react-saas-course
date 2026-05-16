# Code standards

Canonical conventions for code that ships in the course — both production code in project repos and code shown in lesson MDX.

## What lives here

- `Code conventions.md` — the rules. Read by every agent that writes code (project coders, lesson drafters, lesson reviewers, lesson improvers, lesson exercisers).
- `configs/` — canonical config files (`biome.json`, `tsconfig.json`, etc.) when they stabilize. Empty at v1; grows as the stack settles. The precondition coder copies these verbatim into every project starter.

## Source-of-truth rule

`Code conventions.md` governs *production code shape* — what code in a project repo looks like.

§4 of `documentation/pedagogical approach/Pedagogical guidelines.md` governs *display in lesson MDX* — when to strip imports, how to mark `// new` / `// changed`, when to label file boundaries.

Displayed code obeys `Code conventions.md` plus §4's stripping rules. No conflict by design — the two docs cover different surfaces.
