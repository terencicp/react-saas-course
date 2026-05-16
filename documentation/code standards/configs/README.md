# Canonical configs

Drop config files here once they stabilize. The precondition coder copies the contents of this folder verbatim into every project starter (via `cp`, bytes must match).

Candidates to add as units land:

- `biome.json` — formatter + linter config (Unit 1).
- `tsconfig.json` — TypeScript config (Unit 1).
- `.editorconfig` — cross-editor whitespace rules (Unit 1).
- `package.json scripts.md` — canonical `pnpm` script names (`dev`, `build`, `lint`, `db:migrate`, `db:seed`, `db:studio`).

Keep this folder empty until you're ready to commit to a config — it's better to leave the precondition coder to copy nothing than to ship a config the next chapter will need to fork.
