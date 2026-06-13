sources:
  101.1: 'Diataxis: the four jobs a doc can do'
  101.2: The thin README and source-as-doc
  101.3: AGENTS.md, the conventions file
  101.4: 'ADRs: one decision per file'
questions:
  - source: 101.1
    question: |
      A teammate proposes scaffolding `/tutorials`, `/how-to`, `/reference`, and `/explanation` folders on day one "so the repo is Diataxis-compliant." What's the senior objection?
    choices:
      - text: |
          Diataxis is a vocabulary for deciding what a doc is *for*, not a folder mandate — most SaaS repos need only a README, an AGENTS.md, and `/docs/adr/`; the four types live across those files and the source code.
        correct: true
      - text: |
          The folders are right, but they should be created lazily — add each one the first time a doc of that type is written.
        correct: false
      - text: |
          Reference shouldn't get its own folder because it belongs in the README; the other three folders are correct.
        correct: false
    why: |
      Diataxis sorts docs by the reader's job; it does not require four directories. A repo that scaffolds empty type-folders has cargo-culted the framework. The four types are carried by a handful of files plus the source itself — the schema, env.ts, and TSDoc are all reference, with no `/reference` folder in sight.
  - source: 101.1
    question: |
      A README feels bloated and unfocused and you can't say why. According to the lesson's 2x2, what's the usual underlying cause?
    choices:
      - text: |
          The document straddles two quadrants — it's trying to serve two different readers (e.g. teach a newcomer and answer a fact-lookup) in the same breath.
        correct: true
      - text: |
          It's simply too long; cutting it below 50 lines fixes the focus problem on its own.
        correct: false
      - text: |
          It's missing the explanation quadrant, so readers sense an incomplete picture.
        correct: false
    why: |
      The 2x2 (acquisition vs. application, action vs. cognition) explains the "fighting itself" smell: a doc that lands on the diagonal between two cells is serving two readers whose needs pull in opposite directions. Length isn't the disease — mixing is. And "add the missing quadrant" is the opposite of the fix.
  - source: 101.2
    question: |
      You're writing the README and want a "Data model" section listing the `invoices` table's columns. What's the source-as-doc call?
    choices:
      - text: |
          Don't write it — link to `src/db/schema.ts`. A paraphrased column list has nothing keeping it in sync, so it goes silently wrong the moment a column changes; the schema file *is* the data-model doc.
        correct: true
      - text: |
          Write it, but add a comment reminding contributors to update it whenever the schema changes.
        correct: false
      - text: |
          Write a short version with just the key columns, since a recruiter skimming the README benefits from seeing the data shape.
        correct: false
    why: |
      The rule is "docs live next to the truth." The schema file already documents every column, constraint, and foreign key, and it can't drift because editing it *is* changing the data model. A paraphrase — even a partial one, even one with a "please update me" note — is a second source of truth that will lie silently. The README links; it never copies.
  - source: 101.2
    question: |
      Which belong in the thin README's five-section template? (Select all that apply.)
    choices:
      - text: |
          The copy-paste commands to get a dev server running locally
        correct: true
      - text: |
          A "Where the docs live" section of links to AGENTS.md, `/docs/adr/`, the schema, and env.ts
        correct: true
      - text: |
          An "Architecture" section explaining why Postgres was chosen
        correct: false
      - text: |
          The full environment-variable list with a description of each one
        correct: false
    why: |
      The README's one job is first contact: title/description, getting started, common tasks, where the docs live, and license. The "Architecture" section is explanation that belongs in an ADR — it's the mixing trap wearing a respectable heading. The full env-var list belongs in env.ts plus `.env.example`; the README just links to it.
  - source: 101.3
    question: |
      In 2026, does every major coding tool read `AGENTS.md` natively?
    choices:
      - text: |
          No — most do (Codex, Cursor, Copilot, Aider, and others), but Claude Code reads `CLAUDE.md`; the senior move is one canonical `AGENTS.md` with a one-line bridge or symlink for the holdouts.
        correct: true
      - text: |
          Yes — `AGENTS.md` is now a universal standard every agent reads directly, which is the whole reason it replaced `.cursorrules` and the others.
        correct: false
      - text: |
          No — you still maintain a separate full instruction file per tool, because no single format has won yet.
        correct: false
    why: |
      The honest 2026 story is "one canonical file, with a one-line bridge for the tools that haven't caught up." Claude Code is the notable holdout (it reads `CLAUDE.md`), and you bridge it with a single `@AGENTS.md` import or a symlink rather than maintaining a second full file — two full files would drift, a bridge can't.
  - source: 101.3
    question: |
      Your AGENTS.md says "Drizzle for all database access," and you're tempted to add the paragraph explaining why you picked Drizzle over Prisma. Where does that reasoning belong?
    choices:
      - text: |
          In an ADR under `/docs/adr/` — AGENTS.md states *what* the convention is and links the *why*; folding the rationale in bloats the conventions file with content that has a proper home.
        correct: true
      - text: |
          In AGENTS.md right there — keeping the convention and its justification together is what makes the file useful to an agent.
        correct: false
      - text: |
          In the README's "Where the docs live" section, so first-contact readers see the reasoning immediately.
        correct: false
    why: |
      This is the boundary people blur most. AGENTS.md carries the rule ("Drizzle for all DB access") for the agent or teammate who needs to follow it; the trade-offs behind the choice are explanation, which lives in an ADR. State the convention, link the why. Putting rationale in AGENTS.md is the exact failure mode the lesson's bad-file review flags.
  - source: 101.4
    question: |
      Drag-sort aside — which one of these decisions earns its own ADR?
    choices:
      - text: |
          Choosing Server Actions as the API surface instead of REST route handlers
        correct: true
      - text: |
          Renaming a variable from `uid` to `userId`
        correct: false
      - text: |
          Bumping `zod` from `4.0.1` to `4.0.2`
        correct: false
    why: |
      An ADR is earned only when all three tests hold: architectural reach, reasonable disagreement, and costly to reverse. The API-surface choice touches the whole app, a competent engineer could defensibly pick REST, and reversing it is far more than one PR. The rename and the patch bump fail every test — they're reversible in one PR by one engineer, so they're code-review or AGENTS.md territory, not architectural decisions.
  - source: 101.4
    question: |
      Two years on, the team replaces Drizzle. What happens to the original `0001-use-drizzle-not-prisma.md`?
    choices:
      - text: |
          It stays in the repo, body untouched; its Status flips to "Superseded by ADR NNNN," and a new ADR records the replacement. The historical chain *is* the value.
        correct: true
      - text: |
          It's deleted, since it no longer describes the current architecture and would mislead a new maintainer.
        correct: false
      - text: |
          Its Decision and Consequences are rewritten in place to describe the new ORM, keeping the stable `0001` number.
        correct: false
    why: |
      You supersede in place, never delete and never rewrite. Deleting erases the institutional memory that Drizzle was chosen deliberately and replaced under specific new pressures — and invites the next person to re-litigate a settled fork. Rewriting the body destroys the original reasoning. Only the Status field changes; a new numbered ADR carries the new decision.
  - source: 101.4
    question: |
      What's the single most important quality bar for an ADR's Consequences section?
    choices:
      - text: |
          It names the real costs, not just the upsides — a Consequences list that's all wins is a sales pitch, not a record.
        correct: true
      - text: |
          It's exhaustive — every downstream effect across the codebase is enumerated so nothing surprises a future reader.
        correct: false
      - text: |
          It quantifies each consequence with a metric so the trade-off can be re-measured later.
        correct: false
    why: |
      The honest mix of good and bad is the whole signal: a future maintainer can only judge whether a decision still holds if its costs were named (hand-typed relations, operating auth yourself, a slower cold start). Exhaustiveness and metrics aren't the bar — honesty is. An all-upside Consequences section is the sales-pitch failure mode.
