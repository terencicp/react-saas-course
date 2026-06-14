# Chapter 102 — Docs that live in the code

## Lesson 1 — TSDoc the public surface

**Taught:** The three-part inclusion test for which declarations earn a TSDoc block (crosses module boundary / type alone doesn't carry contract / next reader is at call site), the five-tag working set (`@param`, `@returns`, `@throws`, `@example`, `@deprecated`), verb-first first-sentence posture, no-type-in-tags TSDoc-vs-JSDoc rule, and the link-don't-duplicate reflex applied inline.

**Cut:** `eslint-plugin-tsdoc` configuration (out of scope; named in ch-outline as a watch-out, deferred to L3 discipline framing); TypeDoc/API Extractor setup (threshold stated once, no tour); Zod `.meta({ description })` field-level mechanic in depth (one-line reference only; belongs to Ch043).

**Debts:** L3 is promised for "the structural enforcement that keeps TSDoc in sync with signatures" (PR-review discipline); L3 also owns the "drifted doc is worse than no doc" asymmetry (previewed in L1 link section but not taught). Ch043 owns `authedAction` wrapper, `Result` type, and Zod `.meta({ description })`.

**Terminology:**
- *TSDoc* — Microsoft-stewarded `/** */` standard; the IDE hover at the call site is the deliverable for closed-source SaaS.
- *API Extractor / TypeDoc* — generate HTML reference sites; load-bearing only for published libraries, not SaaS.
- *public-surface cut* — the binary: crosses a module boundary → earns a block; private one-file helper → no block.
- *contract vs. implementation* — TSDoc states what a caller needs; the body states how; the two must not swap.
- *link-don't-duplicate reflex* — carried from Ch101; inline form: `@param input` points at `{@link createInvoiceSchema}` rather than listing fields.

**Patterns and best practices:**
- TSDoc on exported Server Actions, `src/lib/<feature>/` exports, `pgTable` identifiers, cross-module Zod schemas, and webhook route handlers; silence on everything else.
- `@param` carries purpose, never the TS type (`@param email - the billing email`, not `@param {string} email`).
- `@returns` only when semantics exceed the type (sentinel `null`, partial result, ordering guarantee).
- `@deprecated` always includes the replacement path and removal timeline; bare `@deprecated` is forbidden.
- `@example` only for non-obvious call shapes; must be runnable as-is (no `// …` inside the example body).
- `@remarks` and `@see` are rare; rationale that would go in `@remarks` belongs in an ADR (Ch101 L4).
- Zod schema field descriptions live in `.meta({ description })` (Zod 4 current form); never `.describe()`.

**Misc:**
- The lesson explicitly teaches that TSDoc blocks on React components are noise (exception: design-system primitives with non-obvious prop semantics); L2 and L3 must not contradict this.
- The CodeReview capstone exercise plants four defects (private-helper block, `{string}` in `@param`, schema field-list duplication, bare `@deprecated`); later lessons referencing code-review exercises should not recycle the same plants.
- Cross-ref slugs used (hyphenated Astro format): `/101-docs-that-live-next-to-the-truth/1-the-four-jobs-of-docs/`, `/043-server-actions/1-the-use-server-seam/`, `/101-docs-that-live-next-to-the-truth/2-the-thin-readme/`, `/101-docs-that-live-next-to-the-truth/4-adrs---one-decision-per-file/` — confirm live before building L2/L3.
- The lesson uses `{@link SymbolName}` (TSDoc inline tag) syntax in all code examples for cross-symbol linking; `@see` is positioned as rarely needed because an inline `{@link}` in the summary usually suffices. L2/L3 should not introduce `@see` as the default link form.
- A `VideoCallout` on VS Code's `{@link}` (videoId `1VNsVhusfnI`) is the only video in this lesson; the link-don't-duplicate section is where it appears.

---

## Lesson 2 — Comment the why, not the what

**Taught:** The two-part inclusion test for inline `//` comments (would a reader ask "why?"; is the answer invisible in the code?); the four kinds that earn a place (constraint, workaround, intentional deviation, load-bearing weirdness); the negative space (restatement, section dividers, author stamps, commented-out code, bare TODOs, fossil comments); the comment-voice posture (external fact + forced action, one line, no hedging); the `// why` vs. TSDoc vs. ADR boundary mapped by audience/location/scope; the "comments are part of the code" rule (carry through refactors or promote to enforcement); three canonical promotions (ordering → transactional function, validate-first → Zod parse, auth-precondition → typed argument / `authedAction`); comment density as a design smell (≥3 why-comments in one function is a split/abstraction signal).

**Cut:** `eslint-plugin-tsdoc` and lint-level enforcement of comment rules (stay in L3); issue-tracker tooling discipline beyond stating "link a ticket or own a deadline"; self-documenting-code refactoring patterns beyond the three canonical promotions; humor/reference "clever" comments watch-out (chapter outline listed it, not delivered).

**Debts:** L3 is promised for "how stale/fossil comments and stripped comments get caught structurally at review time" — lesson closes at "delete it" and explicitly names the next lesson as where that structural enforcement lives.

**Terminology:**
- *why-not-what rule* — the two-part gate: reader would ask "why?" AND answer is invisible in the code.
- *constraint comment* — external reality the code must bend to (Postgres precision, API behavior).
- *workaround comment* — names the failure mode the workaround prevents.
- *intentional-deviation comment* — names the path not taken and why.
- *load-bearing-weirdness comment* — ordering or sequencing that is part of the contract.
- *fossil comment* — comment explaining a workaround for a bug since fixed; actively misleads.
- *promote to enforcement* — moving a comment-documented constraint into the type system or runtime (parse, transaction, typed arg).
- *comment density smell* — ≥3 why-comments in one function signals wrong abstraction or function doing too much.
- *ADR* — re-glossed via `<Term>`: "Architecture Decision Record; a short file capturing one architectural decision and its consequences."

**Patterns and best practices:**
- Course-canonical TODO form: `// TODO(<lesson>) — <thing>` (names lesson as owner + deadline); bare `// TODO: fix this` is forbidden.
- Multi-line prose comments use stacked `//`; `/* ... */` is reserved for TSDoc only.
- Sentence fragments need no terminal punctuation; full sentences get it; lowercase-first on fragments is fine; match file's existing style.
- Promote ordering constraints to a single transactional function (thin-action/`lib` split, Ch043).
- Promote validate-first to Zod `parse` at boundary (Ch043 parse-on-entry).
- Promote auth-precondition to typed argument or `authedAction` wrapper (Ch043).
- External-system whys (Postgres precision, Stripe delivery order) cannot be promoted; they stay well-written comments.

**Misc:**
- The `finalizeInvoice` AnnotatedCode specimen deliberately hosts all four comment kinds in one function and explicitly calls itself out as a density smell — L3 must not use this specimen to teach anything new.
- Cross-refs confirmed live (hyphenated Astro slugs): `/102-docs-that-live-in-the-code/1-tsdoc-the-public-surface/`, `/043-server-actions/4-thin-actions-pure--lib/`, `/043-server-actions/2-parse-on-entry-every-time/`, `/043-server-actions/1-the-use-server-seam/`.
- A `VideoCallout` (CodeAesthetic, videoId `Bf7vDBBOBUA`, "Don't Write Comments") appears in the promote-to-enforcement section — do not duplicate this video in L3.
- L3 is the structural-enforcement lesson (PR-review discipline, reviewer's doc checklist); this lesson seeds it by closing the fossil-comment and stripped-comment points at "delete it / carry it" with an explicit handoff sentence.

---

## Lesson 3 — Docs ship in the PR, or they're already wrong

**Taught:** The doc-ships-in-PR rule (why the PR is the only moment of leverage); the seven-surface doc-change map (README, AGENTS.md, ADRs, TSDoc, `// why` comments, schema header, `.env.example`); the reviewer's five-check pass; the automation/review boundary (mechanical vs. semantic drift); and two workflow anchors (two-checkbox PR template at `.github/pull_request_template.md`, quarterly meta-doc-review cadence).

**Cut:** Configuration/tour of doc-drift CI products (Mintlify, Dosu, BlockWatch) — named once at the boundary, no setup; `eslint-plugin-tsdoc` and env-parity-linter setup — named as mechanical-class examples only; changelog-generation tooling beyond one sentence; new-hire onboarding workflow; versioned docs / TypeDoc HTML for published SDKs; PR-review skills (suggesting vs. blocking, review language) — deferred to Ch103.

**Debts:** Ch103 owns "the language of blocking" — this lesson names blocking as the mechanism for an incomplete PR and points forward explicitly; Ch103 also owns the full craft of PR review beyond the doc-specific checklist.

**Terminology:**
- *drift* — when a doc and the code it describes fall out of sync; the doc still asserts something no longer true. (First glossed here via `<Term>`.)
- *fossil comment* — re-glossed from L2 via `<Term>`.
- *ADR* — re-glossed via `<Term>`: "Architecture Decision Record; a short file capturing one architectural decision and its consequences."
- *conventional commits* — glossed via `<Term>` on the one-sentence changelog note.
- *doc-change map* — mental model: seven PR-time surfaces, each with a trigger and a quiet/skip case.
- *moment of leverage* — the PR is the only point where the change and the docs describing it are in front of a person simultaneously; before it the doc isn't wrong yet, after merge nobody is reviewing it.
- *mechanical drift* — drift a machine can detect by structural comparison (key-set equality, tag-name vs. parameter-name match).
- *semantic drift* — drift requiring intent-against-behavior reading; review-only.

**Patterns and best practices:**
- The doc ships in the same PR as the change that invalidates it — no follow-up doc PRs (they open a live wrong-doc window on `main`).
- PR template at `.github/pull_request_template.md`; two checkboxes maximum — a long template gets ticked without reading.
- `.env.example` and `env.ts` are siblings that must ship changes together; the build enforces `env.ts` but nothing enforces `.env.example` — the human checklist is the only guard.
- A plain new column does NOT move the schema header; only a new invariant (uniqueness rule, tenancy constraint, new lifecycle) does.
- Reviewer's five checks in order: (1) signatures → TSDoc, (2) env vars → `env.ts` + `.env.example`, (3) conventions/layout → AGENTS.md, (4) architectural decisions → ADR new/superseded, (5) stripped comments → preserved or promoted.
- Check 5 is the hardest: the reviewer must notice an *absence* in the diff (a `// why` comment deleted with its constraint unprotected).
- Template + five-check pass are two halves of one mechanism: author-side prompt, reviewer-side verification.
- Quarterly meta-doc review (README from a clean clone, AGENTS.md vs. codebase) catches rot no per-PR check can surface; must be defended on the calendar like dependency upgrades.

**Misc:**
- The CodeReview capstone plants four *drift* defects (doc-no-longer-matches-code / doc-missing-for-a-change), one per check: (A) `src/lib/billing/charge.ts` — `chargeInvoice` TSDoc `@throws` stale, new `ChargeLimitError` throw added but block not updated; (B) `src/env.ts` — `RESEND_API_KEY` added to `env.ts`, `.env.example` absent from diff; (C) `src/lib/invoices/finalize.ts` — ordering `// why` comment stripped in refactor, constraint silently lost; (D) `src/lib/notifications/dispatch.ts` — webhook fan-out cross-cutting pattern introduced, no ADR added. Do not recycle these four plants or file names in Ch103 or later exercises.
- The unit close states four-idea through-line explicitly: docs next to truth → link don't duplicate → volume tracks value → doc ships with the change. Future lessons may reference this as the "documentation unit posture."
- The "whoever — or whatever — edits next" sentence lands the AI-correctness property once without naming AI; Ch103 and later must not re-derive or expand it into a section.
- Ch103 is introduced as "the whole chair" of PR review (doc checks are one seat); Ch103 must not re-teach the five doc checks, only the broader review craft.
