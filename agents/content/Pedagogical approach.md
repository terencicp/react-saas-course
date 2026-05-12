# Pedagogical approach — Web Dev Course (2026)

The *how* of teaching this course. Companion to `Instructions.md` (philosophy) and `Table of contents.md` (curriculum). When this doc and `Instructions.md` disagree, `Instructions.md` wins.

## 1. The student and the goal

Junior-to-mid devs returning to web. 6–10 hours/week for 4–6 months — sized for evenings, not bootcamp. Win condition: the graduate can ship a real production SaaS feature on this stack and the result holds up to a senior code review. **No "how to judge AI" lessons** outside Unit 23; teach senior decision-making with full force, AI-readiness is the byproduct.

## 2. Teaching stance

Six filters; if a draft fails any, rewrite.

- **Decisions before syntax.** Every lesson introduction contains the senior question it answers (not as a section but implicitly).
- **No bootcamp scaffolding.** No "what is a function," no celebratory tone. Adult, terse, assumes competence. Fundamentals get full adult-depth treatment when needed — the cut isn't *which* fundamentals, it's *how* they're framed.
- **Defaults before conditionals; trigger before tool.** Conditional power-tool lessons introduction sections must name the threshold the platform default crosses.
- **Teach the form they will write.** TS+JS as one language, HTML through JSX, CSS through Tailwind, Postgres through Drizzle. Underlying primitive named at the call site, not as preamble.
- **Principles and patterns inline, never bundled.** Introduced at the moment the lesson would teach them anyway. Every example reviewed against relevant principles.
- **Verify 2026 facts before stating them.** Versions, defaults, library status get a fresh web search.

## 3. Lesson architecture

**Grain.** One TOC bullet = one lesson = one URL = less than 1h student time. The bullet's text *is* the lesson's thesis.

**Six archetypes** — descriptive shapes used as a thinking framework not as blueprint:

- *Mechanics* — specific syntax/API. Code example + inline watch-out + quick exercise. Sandbox often.
- *Decision* — "when does X earn its weight." Threshold up front, alternatives compared. Decision-tree or comparison diagram often essential.
- *Concept* — build a mental model. Diagram/animation almost always. Worked example exercising the model.
- *Setup/wiring* — terminal-style walkthrough + verify step. No exercise default.
- *Pattern* — code block named for what it prevents, failure mode without it, structural enforcement that makes the bug hard to write. "Spot the missing piece" exercises.
- *Reference/survey* — enumerate an API set with "reach for it when…" lines. Don't pad.

*Orientation* lessons (Unit 0 only) are the special case: §3.3 shape applies but body is meta-framing; no exercises, no checks, no quiz.

**Canonical lesson shape:**

1. **Title** — can rephrase the TOC bullet for the page header.
2. **Introduction** — senior anchor where it fits; topical opener where forcing one would feel contrived.
3. **Body** — h2/h3 where there are distinct subtopics; teaching prose with code, watch-outs, exercises, inline concept checks, and in-body videos all placed *where they belong in the flow*, never collected at the end.
4. **External exercises** (optional) — links to the external practice repo.
5. **Learning resources** (optional) — Udemy section link, official docs, supplementary video.

A complete lesson can be just Title + Introduction + Body. Don't add external exercises or resources when none fit. The chapter-end quiz is its own page, authored in a separate pass.

## 4. Decision rules

**Exercises (§4.1).** Add when the lesson teaches a move the student will do wrong without practice. Match type to archetype: mechanics → predict-the-output or write-the-typed-version; decision → scenario decision; concept → probe-the-model; pattern → spot-the-missing-piece (highest-payoff in the course); setup → no exercise, verify-step suffices. **One substantial exercise per lesson max** (3–10 min); smaller inline practice can appear more often. Exercises live where they belong in the flow, never collected at the end.

**Inline concept checks (§4.2).** A single click-to-reveal question mid-body after a dense conceptual passage. Catches the "read, nodded, didn't actually get it" failure. **0–2 per lesson max.** Formats: MCQ with discriminating distractors, micro predict-the-output, or "two statements, one wrong.", etc. Skip for short uniform-paced bodies, when the §4.1 exercise catches the same thing, or when the check would just restate the previous paragraph. Reveal includes one-sentence *why*. Concept lessons typically warrant 1, sometimes 2; mechanics/setup usually 0.

**Chapter-end quizzes (§4.3).** Mandatory at the end of every content chapter (Unit 0 carve-out: skip). ~1 question per lesson average; soft cap 10 per chapter. MCQ, two answer options. Quality bar: distractor must be the *plausible first reading*, no keyword-spotting wins, no lesson paraphrases, one-sentence why on the reveal.

**Diagrams (§4.4).** Add when the model has more than one moving part. Always justified: lifecycles/flows, trees/graphs, decision trees, anatomy, before/after diffs.

Form preference: **(1) Mermaid** (default — text, version-controlled, auto-themed; AI produces it directly for flows, decision trees, state machines, ER diagrams, topology, gitGraph). **(2) Interactive widget.** Using HTML components. **(3) Hand-authored SVG** where layout itself carries meaning (cascade, box model, flex/grid axes, component-tree visual emphasis, anatomy with annotations); or animated when change-over-time is the lesson. **(5) Short video clip.**

**Live coding exercises and sandboxes (§4.5).** Embed when the student would learn slower without one *and* it doesn't need a real DB/Next dev server/external service.

**YouTube embeds (§4.6).** Add only when: (1) the concept is fundamentally a live-debug/motion experience, (2) a definitive durable explainer from a stack-aware author exists (Lee Robinson, Josh Comeau, Vercel/TypeScript/Stripe official), or (3) the watch-out is genuinely visual and diagrams can't carry it. **Discovery via YouTube MCP only — never handcraft URLs from training memory.** Selection: channel reputation, upload date, specific topic match. Contextual videos in body; reinforcement videos in Learning resources. Lesson body must be complete without the video.

**Udemy parallel (§4.7).** Per-unit curated mapping in `Udemy mapping.md`, with chapter-level overrides where a chapter deviates from the unit's center. **Expected no-mapping units** in 2026: 9 (Better Auth), 6.2+ (Drizzle), 13 (Trigger.dev v4), 23 (AI SDK v5), several SaaS-pattern units (10–12, 14–15).

**External coding exercises (§4.8).** Top-level h2 near lesson end, linking into the course's external practice repo (`practice/{unit}/{chapter}/{lesson}/`). Default-include when the lesson teaches a multi-file practice shape, a pattern whose structural enforcement only bites at scale, or anything needing a real-service setup. Skip for purely informational/definitional or in-body-sandbox-covered lessons. Don't gate the lesson on the external exercise.

## 5. Small focused projects

At the end of *select* units, one or two **small focused projects** (1–3 hours, single sitting) let the student apply the unit's concepts to something complete enough to feel real. **No monolithic capstone**; the course produces a portfolio. A handful of units that cover two distinct topics split into two cleaner projects.

**A unit warrants a project when** it teaches a multi-piece pattern that only bites at scale, its concepts integrate cleanly at a project level, or the student benefits from real services. It doesn't when the unit is concept-only (0), setup-only (1), or fully covered by in-body exercises (2, 3).

**Pre-built scaffolding is mandatory.** Committed-stack baseline pre-wired, seeded data/fixtures, README with brief + "what concepts you'll demonstrate" + a "done when" criterion, test fixtures or verify-script. Empty-repo framing breaks evening pacing immediately.

**Three units use audit exercises** instead of build projects: 17 (security baseline), 20 (perf + observability), 22 (code review + ADRs). Student reads code, applies the unit's discipline, writes findings against a rubric (typically in `findings/{name}.md`).

**Projects are independent (§5.5).** Project N never requires project N-1. The unit's lessons are still complete teaching content even if the project is skipped.

## 7. Unit-by-unit guidance draft

Tunings on top of §1–§6. One line per unit naming dominant character, key visualizations, project (if any), and the most common trap.

- **0 Introduction.** Tone-setter, one bullet. No exercises/checks/sandboxes/quiz. One stack-shape diagram. Optional course-tour video. **Trap:** turning this into a manifesto.
- **1 Setup.** Setup throughout + one decision lesson (1.1.4 runtimes). Verify-checks in body, no standalone exercises. Layered-toolchain diagram once. No sandbox. No project — the scaffold itself is the practice. **Trap:** celebratory tone on `pnpm install`.
- **2 JS/TS as one language.** Mechanics + critical decisions (2.4–2.5). **Sandpack-heavy unit.** Predict-the-output (2.7 async traps) and write-the-typed-version dominate. Event-loop and module-graph diagrams essential. No project — Sandpack covers it. **Trap:** drift toward a generic JS course.
- **3 HTTP / browser platform.** Concept-heavy. **Most diagram-dense unit** (request lifecycle, CORS, DOM, event capture/bubble, fetch streaming, Web Crypto). Limited sandbox. MCQ for status semantics, reorder for lifecycle. No project. **Trap:** drowning in HTTP history.
- **4 React + JSX + Tailwind.** Largest unit, **highest sandbox payoff.** All five archetypes; weighted concept (4.7 render) + pattern (4.6, 4.10, 4.11). Diagrams essential everywhere (cascade, box, flex/grid, render model, reconciliation). Spot-the-bug dominates quizzes. **Project: UI component library demo** (~3h, no DB/auth). **Trap:** framework comparison drift; over-explaining `useEffect`.
- **5 Next.js / App Router.** Decision-heavy. Visualizations everywhere (route trees, parallel/intercepting routes, server/client wire, cache-decision tree, `proxy.ts` flow). Sandbox via external repos. Scenario-decision exercises dominate. **Project: small marketing/portfolio site** (~3h). **Trap:** under-explaining caching; Pages Router drift.
- **6 Postgres through Drizzle.** Concept + mechanics + decisions. ER diagrams, N+1 visual, EXPLAIN walkthrough. Schema sandboxes; queries via external repo. **Project: small relational schema + ~10 queries** on a non-SaaS domain like a book library (~3h). **Trap:** SQL-theory class.
- **7 Forms + Server Actions.** Pattern-heavy. Validation-boundaries diagram, Server Action wire, Result anatomy. Spot-the-missing-piece dominates. **Project: contact-form + submissions admin** (~3h). **Trap:** jumping to RHF before the native pattern lands.
- **8 Email (Resend + React Email).** Setup + mechanics. SPF/DKIM/DMARC diagram essential. React Email's local preview as sandbox. Fact-shaped quizzes, low count. **Project: transactional-email playground** with real domain + DNS (~2h). **Trap:** going deeper than ship-without-spam.
- **9 Auth (Better Auth).** Concept + setup + mechanics. **OAuth+PKCE diagram unforgivable to skip.** Session lifecycle, auth-gate flow. External repo for sandbox. Reorder quizzes. **Project: single-user auth playground** (~4h). **Trap:** explaining all 17 auth strategies.
- **10 Multi-tenancy + RBAC.** Pattern-heavy + RLS threshold decision. Tenancy-boundary diagram, `authedAction` anatomy, audit-log shape. Spot-the-missing-piece signature. **Project: small multi-tenant notes app** (~4h). **Trap:** treating RLS as default.
- **11 SaaS blocks I — lists, URL state, soft delete.** Pattern + mechanics. URL-state-to-component-tree, missing-`deletedAt` before/after, concurrency conflict timeline. **Project: task list with URL-state filters** (~3h). **Trap:** building a generic DataTable.
- **12 Webhooks + Stripe billing.** Pattern + decision. Idempotency flow, redirect-vs-webhook race, entitlement derivation. Spot-the-race signature exercise. **Project: idempotent webhook + Stripe gate** (~4h).
- **13 Conditional infra — background work + object storage.** Two projects, one per chapter. **13.1: durable Trigger.dev task** (~2h). **13.2: R2 presigned upload** (~2h). **Trap:** introducing Trigger.dev too eagerly.
- **14 Notifications.** Pattern. Dispatcher-anatomy diagram is signature. Spot-the-bug + write-the-dispatcher exercises. **Project: notification dispatcher** (~2.5h). **Trap:** dispatcher bloat.
- **15 Cache + rate limiting.** Two projects, one per chapter. **15.1: cache-tag refactor** (~1.5h). **15.2: rate-limited public API** (~1.5h). **Trap:** general cache theory.
- **16 Conditional client-state.** Two projects, one per chapter. **16.1: TanStack Query inbox** (~1.5h). **16.2: Zustand onboarding wizard** (~1h). Each README requires the student to justify why this surface earns the conditional tool. **Trap:** defaulting to the conditional.
- **17 Errors + security baseline.** Audit/consolidation. Error-flow diagram, security-headers checklist. **Audit exercise: security audit on pre-built sample app** with seeded issues (~1.5h). **Trap:** checklist-dump voice.
- **18 Time + i18n.** Mechanics + setup + DST concept. Temporal sandboxes very well. Predict-the-output for DST-naive code. **Project: timezone-aware scheduler with i18n** (~3h). **Trap:** skipping Temporal because Node 24 LTS is still common.
- **19 Testing.** Pattern + decision + mechanics. Honeycomb diagram, seam-vs-implementation, MSW boundary. Vitest in Sandpack. **Project: test a utility lib + one server action** with behavior-coverage grading (~3h). **Trap:** "write tests for everything" drift.
- **20 Observability + perf.** Pattern + mechanics. Web Vitals anatomy, RSC waterfall before/after, Sentry capture flow. **Audit exercise: perf audit + observability wiring** on pre-built app (~2h). Debugger-attached server-action video earns its keep. **Trap:** vanity-metric chasing.
- **21 Git + CI + deployment + migrations.** Expand-migrate-contract is unit-defining. No sandbox; real-tool work. **Project: deploy one of the earlier projects** with full CI/Neon branching/launch checklist (~3h + deploy wait). **Trap:** assuming Git fluency.
- **22 Docs + code review.** Pattern + soft skill. ADR template, Diataxis quadrant. Mock-PR-review exercises. **Audit exercise: review three PRs + write three ADRs** against the opinionated-picks list (~2h). **Trap:** template dump.
- **23 AI integration (Vercel AI SDK).** Conditional, decision + mechanics. **The one unit where naming AI in lesson copy is correct.** Tool-calling loop, generative-UI flow, message-state under v5. AI SDK sandboxes very well. **Project: AI assistant with tool calling + structured output** (~4h, most ambitious). **Trap:** API-surface dating — fresh search on every claim.
