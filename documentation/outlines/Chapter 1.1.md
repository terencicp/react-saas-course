# Chapter 1.1 — The contract

## Chapter framing

This chapter is the course's contract with the reader. It does not teach syntax. It locks down who the course is for, what the student walks away able to do, what stack they will use, what gets re-taught at adult depth and what gets assumed, and how to read every later lesson — so when defaults appear without ceremony and conditional power-tools appear with a named trigger, the student already knows why.

The TOC packs all of that into one bullet (1.1.1). One bullet is too much for one lesson at the grain rule (§5: one TOC bullet, less than 1h student time — and the introduction is a place students bounce off if it's a wall of text). Splitting it gives each idea room to land and lets the student stop after any lesson and still know where they are.

Threads that must run through every lesson in this chapter:

- **Adult, terse, opinionated voice.** This is the first contact with the course's voice. If lesson 1.1.1 reads like a bootcamp prologue, the cut is broken before it starts. No celebratory tone. No "we'll go on a journey." Direct.
- **The two pillars are not slogans.** They are operational filters. Every later cut in the course (what gets a full chapter, what gets one line, what gets nothing) traces back to them. The student needs to see the filters working before they can trust the cuts.
- **2026 is a point in time, not a marketing phrase.** Stack choices are dated and justified. The course pins May 2026 explicitly. When a tool wins in 2026, the senior reason is named.
- **Prerequisites are framed as "rusty, returning" — not "new."** No re-teaching the difference between a function and a variable. Closures, the cascade, modules, async, HTTP semantics, the React render model get full adult-depth treatment in later units; this chapter only signals what is and isn't on the table.
- **The student should leave the chapter able to predict the shape of any later lesson.** Defaults named first, conditionals with a trigger, principles introduced at the moment they earn their weight, prose by default, exercises in flow, sandboxes optional. If the pattern is named here, it doesn't have to be re-explained in 2.1.

This chapter ships no code beyond illustrative one-liners. Setup begins in Chapter 1.2.

---

## Lesson 1.1.1 — Who this is for

Sets the reader profile, the production-code-review win condition, the evenings-not-bootcamp time shape, and a private self-check that recommends starting here, elsewhere, or with a fundamentals course first.

Topics to cover:

- The target reader: a junior-to-mid developer who has shipped something on the web before, is returning after time away, and wants to operate at senior depth on a modern SaaS stack. Not a first-week developer.
- The win condition stated plainly: by the end, the student can ship a real production SaaS feature on this stack and the result holds up to a senior code review. Not "you'll know React." The bar is production code review.
- Time and shape: 6 to 10 hours per week across roughly 4 to 6 months, sized for evenings rather than a bootcamp sprint. Each lesson is under an hour. Some chapters end in a 1.5 to 3 hour project that ships a real surface (the projects are introduced in 1.1.5).
- What you will not become: a designer, a DevOps specialist, a database administrator. The course teaches the surface a SaaS engineer owns end-to-end and names the seams where specialists take over.
- A short self-check (interactive — three or four prompts) the student can use to decide whether to start here, drop to a fundamentals course first, or skip to a later unit. Phrased without judgment.

What this lesson does not cover:

- The stack itself (handled in 1.1.3).
- The full prerequisites list (handled in 1.1.4).
- How a lesson is structured (handled in 1.1.5).

Pedagogical approach:

Concept archetype. The job is to set expectations, not teach a mental model with moving parts, so no diagram. Open with one tight paragraph naming the reader and the win condition together — refusing to soften either. Follow with the time shape so the student can decide whether the course fits their life before they invest. Close with the self-check exercise — a short multiple-choice or true-false set ("you have written and deployed at least one web app — true/false") that the student answers privately and gets back a one-line "start here / start at chapter X / consider a fundamentals course first" recommendation. The exercise is the lesson's main interactive beat; it earns its weight because the wrong reader bouncing here is cheaper than bouncing in chapter 4.

Estimated student time: 10 to 15 minutes.

---

## Lesson 1.1.2 — The two pillars

Installs the course's operational filters — senior mindset over syntax, and the minimum viable 2026 stack — and states once why AI is deliberately absent from lesson material.

Topics to cover:

- Pillar one: **systems design and senior mindset over syntax.** Code is commodity in 2026. The senior contribution is what gets decided before code is written (planning, data modeling, API contracts, system design) and how the code is shaped so it stays changeable as the system grows. Every lesson foregrounds the decision, then shows the code.
- Pillar two: **the minimum viable 2026 stack.** The smallest set of technologies a SaaS startup would actually ship with in 2026 — and nothing else. No historical detours, no "here's how it used to work."
- How the pillars operate as filters, not slogans. A concrete illustration: when later units choose between `useState`+URL state and Zustand, the pillar fires the decision (name the trigger, default first). When the course teaches Drizzle and not raw SQL or Prisma, the pillar fires the cut (minimum viable, current default).
- The deliberate silence on AI in lesson material. AI-driven development is the daily reality of 2026 SaaS engineering — but naming AI in lessons ages the material out before it ships. The course teaches the durable skills properly; AI-readiness happens automatically. Stated once here so the student doesn't wonder for 23 units.
- One forward-pointing line: a list of seven Architectural Principles and a list of fifteen SaaS patterns will recur across the course, each introduced inline at the moment it earns its weight. The student doesn't need to memorize the lists here. They are referenced as a navigation aid.

What this lesson does not cover:

- The stack itself (handled in 1.1.3).
- The architectural principles and SaaS patterns themselves — they get full treatment at their introduction points across later units, and a reference index lives separately in the site nav.

Pedagogical approach:

Concept archetype, but the model is editorial rather than mechanical. Two short sections, one pillar each, each opening with the pillar in bold and a single-sentence senior framing. After each pillar, one worked illustration — "here's a decision later in the course; watch the pillar fire" — using a decision the student hasn't reached yet so they see the filter operating without needing the technical context. Close with the AI paragraph (one paragraph, plainly stated, no hedging) and the forward-pointing reference line. No exercise: the lesson's job is to install a lens, and the lens gets tested in every later lesson.

Estimated student time: 15 minutes.

---

## Lesson 1.1.3 — The stack at a glance

Lays out a one-page map of every load-bearing tool grouped by role, with the senior reason each wins (or the trigger that would flip it), pinned to May 2026.

Topics to cover:

- A single map of every load-bearing piece of the stack, grouped so the student can see the whole shape on one page before the course goes deep on any of it. Roughly: runtime (Node, pnpm, mise), language and types (TypeScript, Zod), framework (Next.js 16, React 19, App Router, Server Components, Server Actions), data (Postgres on Neon, Drizzle), UI (Tailwind v4, shadcn, `next-themes`), auth (Better Auth), email (Resend, React Email), background work (Trigger.dev v4), files (Cloudflare R2), cache and rate limiting (Upstash Redis), payments (Stripe), client state when it earns its weight (TanStack Query, Zustand), observability (Sentry, PostHog), hosting (Vercel), testing (Vitest, Playwright, MSW), AI (AI SDK v5).
- For each piece, one line on what it does and one line on the senior reason it wins in 2026 (or the trigger that would flip it). Not exhaustive — the depth comes in the units that own each tool.
- Why the stack is this shape rather than another: every piece either is the platform default (Server Actions, the App Router) or earns past a named trigger (Zustand past `useState`, TanStack Query past Server Components, Redis past Postgres counters). The same threshold-first thinking the course will use everywhere.
- The May 2026 pin. The course's facts are verified as of May 2026; the student should expect names and versions to drift and is given the heuristic for spotting where the course has aged.
- One forward link: Chapter 1.2 starts pinning these tools on the student's machine.

What this lesson does not cover:

- Installation or setup of any tool (Chapter 1.2 onwards).
- The Architectural Principles or SaaS Patterns (introduced inline across the course).
- Hosted-service account creation (Projects.md flags this; Chapter 1.4 surfaces it for the first scaffold).

Pedagogical approach:

Reference / survey archetype with one interactive beat. A grouped visual map of the stack — a hand-authored SVG or a Mermaid diagram laying out the tools by role (runtime, framework, data, UI, infra, etc.) with a one-line "what it does" tooltip per piece — is the lesson's center. Surrounding prose names two or three of the pieces explicitly to model the "default vs. trigger" framing, then trusts the diagram to carry the rest. Close with a short matching exercise (drag the tool to its role) to confirm the student has the map in working memory before moving on. The lesson is a map, not a teaching — the only goal is recognition when each tool resurfaces later.

Estimated student time: 20 to 25 minutes.

---

## Lesson 1.1.4 — Rusty, not new

Frames prerequisites as returning-developer territory, lists what is assumed without ceremony, what is re-taught at adult depth (and where), what is deliberately cut, and a litmus self-assessment.

Topics to cover:

- The framing: prerequisites are **rusty-but-returning, not new.** The course assumes the student has shipped something on the web before. It does not assume they remember closures, the cascade, the event loop, or what `useEffect` actually does.
- What gets assumed without ceremony: basic programming literacy, variables and functions as concepts, the existence of HTML/CSS/JS, having used a terminal, having used Git at least lightly. Stated once.
- What gets re-taught at adult depth and where: closures (Unit 2), the cascade (Unit 4), modules and the module graph (Unit 2), the event loop and async semantics (Unit 2), HTTP method semantics and status codes (Unit 3), the React render model (Unit 4). Named here so the returning student knows the gaps will be closed properly.
- What's deliberately cut: jQuery, "what is a callback," class components, `var`, lifecycle methods, Webpack, Sass, REST-vs-GraphQL holy wars, the history of JavaScript. The course is current-stack-only by design.
- A short interactive self-assessment — a checklist the student rates themselves against ("I can read this snippet and predict what it logs") with the matching course chapter linked beside each item, so anyone with a real gap can patch it before it bites in Unit 4 or 7.

What this lesson does not cover:

- Teaching any of the topics themselves — they get full treatment in their owning chapters.
- Tool-specific prerequisites (Node, pnpm versions) — those are in Chapter 1.2.

Pedagogical approach:

Reference / survey archetype again, but this one is about the *negative space* of the curriculum as much as the positive. Open by naming the rusty-but-returning frame in one paragraph. Then a two-column reference: "assumed without ceremony" on one side, "re-taught properly (and where)" on the other. Each row on the re-taught side links to the owning chapter, so the student can see the schedule. Close with the self-assessment — a code-review or predict-output style exercise on three or four returning-dev litmus snippets (closure capture, equality semantics, a small async ordering question), each linking to the chapter that owns it if the answer surprises them. No code blocks beyond the litmus snippets.

Estimated student time: 15 to 20 minutes.

---

## Lesson 1.1.5 — How to read this course

Names the defaults-vs-triggers reading rule, the canonical lesson anatomy, the inline placement of principles and patterns, the project repo and `degit` flow, and the hosted-service accounts (plus one cheap domain) needed later.

Topics to cover:

- The senior-mindset reading rule: every lesson opens with a decision and ends with the code that follows from it. When prose says "default," it means the choice you make when nothing tells you otherwise. When prose names a trigger, it's gating a conditional power tool — the threshold to cross before reaching for it.
- The "name the trigger before the tool" pattern, with one quick worked example (the student has not learned Zustand yet — the lesson uses the conditional/default frame on a familiar object, not a teaching one).
- Principles introduced inline. The course's seven Architectural Principles and fifteen SaaS Patterns are never bundled into an upfront lecture. Each one is introduced at the moment the lesson would teach the pattern anyway. A separate principles index is available in the site nav for review.
- Lesson anatomy, named once so the student recognizes it everywhere: title, short introduction with the problem the lesson answers, body with prose and code and exercises placed where they belong, optional external practice links, optional learning resources. Exercises are inline, not collected at the end. Sandboxes are optional play.
- The role of code samples. Snippets are the smallest thing that makes the point. The full structure shows only when structure is the lesson. The senior reason and the failure mode live in the prose around the code, not in inline comments.
- Quizzes at the end of most chapters. Self-assessment, not graded.
- Projects at the end of select units. 1.5 to 3 hours each, ship a real surface, depend on prior units' code (the student carries one growing codebase forward across the course rather than rebuilding from scratch each unit). The project repo and the `degit`-fetch pattern are named.
- Accounts and money. A one-paragraph heads-up that later projects require accounts on Resend, Stripe (test mode), Trigger.dev, Cloudflare R2, Upstash, Sentry, PostHog, Vercel, and Neon — all free-tier sized for the course — plus a single cheap domain for the email project (the only line item that costs real money). Stated here so the student can plan the domain purchase early.
- One forward link: Chapter 1.2 pins the runtime.

What this lesson does not cover:

- The architectural principles and SaaS patterns themselves (introduced inline across units).
- Sandbox or component-specific mechanics — the student learns them by using them.

Pedagogical approach:

Concept archetype with a setup/wiring flavor. The lesson is about reading-fluency for the rest of the course. Open with the "decisions before syntax" reading rule, then walk through the "trigger before tool" frame with one tight worked example so the pattern is concrete before it abstracts. Show the canonical lesson anatomy as a small annotated SVG or annotated block — title, intro, body with inline exercise, sandbox callout, end — so the student literally sees the shape they'll see for 22 more units. The accounts paragraph is set apart visually (an aside or callout) because it has a real-world deadline (buying a domain takes a day for DNS). Close with one short matching exercise: given five snippet excerpts from lessons in different units, the student tags each as "default," "conditional with trigger," "principle introduction," "watch-out," or "pattern." That exercise is the lesson's confirmation that the reading rules transferred.

Estimated student time: 20 to 25 minutes.

---

## Total chapter time

Roughly 80 to 100 minutes across the five lessons. The student can read the chapter in a single sitting or split across two evenings.
