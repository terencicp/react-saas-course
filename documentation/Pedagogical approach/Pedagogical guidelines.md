# Pedagogical approach — Web Dev Course (2026)

## 1. The student and the goal

Junior-to-mid devs returning to web. 6–10 hours/week for 4–6 months — sized for evenings, not bootcamp. Win condition: the graduate can ship a real production SaaS feature on this stack and the result holds up to a senior code review.

## 2. Teaching stance

Two pillars sit upstream of every other decision in this doc.

The first: **systems design and senior mindset over syntax.** Code itself has become commodity in 2026; the senior contribution to a SaaS codebase isn't keystrokes, it's *what gets decided before code is written* (planning, system design, data modeling, API contract design) and *how the code is shaped so it stays changeable* (architectural patterns that hold up as the system grows). Every lesson foregrounds decisions and reasoning. When teaching a feature, lead with *why this approach, when does it break, what would a senior do differently.* Code samples illustrate those decisions.

AI-driven development is the daily reality of 2026 SaaS engineering and part of why this course exists in this shape — but **don't name AI in lesson material unless the feature being taught is itself AI-related.** Any "how to direct AI" lesson ages out before the course ships. Teach the durable skills properly and AI-readiness happens automatically.

The second: **minimum viable 2026 stack.** Teach the smallest set of technologies and syntax a SaaS startup would actually ship with in 2026.

Six filters operationalize the pillars; if a draft fails any, rewrite.

- **Decisions before syntax.** Every lesson introduction contains the senior question it answers (not as a section but implicitly).
- **No bootcamp scaffolding.** No "what is a function," no celebratory tone. Adult, terse, assumes competence. Fundamentals get full adult-depth treatment when needed — the cut isn't *which* fundamentals, it's *how* they're framed.
- **Defaults before conditionals; trigger before tool.** Conditional power-tool lessons introduction sections must name the threshold the platform default crosses.
- **Teach the form they will write.** TS+JS as one language, HTML through JSX, CSS through Tailwind, Postgres through Drizzle. Underlying primitive named at the call site, not as preamble.
- **Principles and patterns inline, never bundled.** Introduced at the moment the lesson would teach them.
- **Verify 2026 facts before stating them.** Versions, defaults, library status get a fresh web search.

## 3. Voice and prose style

The prose sounds like a senior engineer explaining something to a peer — direct, opinionated, assumes competence.

**Address.** "You" and imperatives. Use "we" only in shared-reasoning passages. 
**Stance.** When real alternatives exist, state the default first and plainly, then name credible alternatives in a line or two with the condition that would flip the choice.
**Hedging.** Assert defaults. Hedge only where the truth is conditional (*"if the table fits in memory…"*). Cut filler hedges: "might want to," "probably," "I think," "you could potentially."
**Personality.** No humor. The prose is warm by being clear and respectful of the reader's time, not by being witty.
**Headings.** Never use title case, use sentence case.
**Lists vs. prose.** Prose by default. Lists only when items are genuinely parallel and order or scanning matters.
**Pitfalls.** State the failure mode and the consequence. No alarmism, no scare quotes, no *"be careful!"*.
**Cliché blacklist.** Strike on sight: "Let's dive in," "In this lesson we will," "As you can see," "It's important to note,", "Great job!", "Awesome!", and exclamation marks outside code.
**Spelling and punctuation.** American English.

## 4. Code sample conventions

Code samples carry the same posture as the prose: direct, minimal, opinionated. The default is the smallest snippet that makes the point.

**Length and completeness.** Default to the smallest snippet that makes the point. Strip imports, types, and surrounding structure when they aren't load-bearing for the lesson. Show full structure only when structure itself is the lesson (Setup/wiring, Pattern). Use collapsible sections on EC code blocks to hide irrelevant parts of the code that shouldn't be ommited.
**Imports.** Show on first occurrence per lesson. On subsequent snippets in the same lesson, drop silently when context makes it obvious or use collapsible sections.
**File boundaries.** Label multi-file blocks with the filename as a code-block title. Leave single-file blocks unlabeled.
**Variable naming.** Semantic, drawn from whatever domain fits the lesson. Never `foo`/`bar`/`baz`/`myVariable`.
**Example domain.** Pick the entities that best fit each lesson — todos for simple state, invoices for relational data, posts for feeds.
**TypeScript.** Inference-led. Annotate function parameters and return types; let TypeScript infer locals. Annotate explicitly only when inference would be wrong, when the signature is the lesson, or when narrowing is the point. Never `any` — use `unknown` if typing forces it.
**In-code comments.** Rare. Allowed for annotations that would exist in production. No pedagogical narration inside the block — that belongs in surrounding prose. To call attention to a fragment of code, highlight it.
**Error handling.** Default to the happy path so samples stay short. Where a senior would handle failure modes in production, name them in surrounding prose (*"in production you'd also validate X and reject Y"*) rather than padding the snippet. Show full error handling only when errors are the lesson.
**Async style.** `async/await` uniformly. Use `.then` chains only when teaching Promises directly.
**Wrong-then-right.** Show the broken version when the failure mode *is* the lesson — Pattern archetype especially. Mark before/after clearly. Never leave wrong code on the page without the fix immediately following.
**Highlighting changes.** When a block evolves across a lesson, show the full revised block and mark changed lines with a side annotation (`// new`, `// changed`). Don't show diff hunks.
**Runnability.** Every block runs as-is given the lesson's established imports, unless the prose explicitly flags it as pseudo-code or illustrative.
**Output.** Show output in an adjacent labeled block, not as inline, except for single-value output.
**Formatting.** Single quotes. Trailing commas. Semicolons on.
**Function form.** Arrow functions for components, callbacks, and inline use. `function` declarations only when hoisting is required.
**Terminal commands.** Separate code blocks. No `$` prefix.

## 5. Lesson architecture

**Grain.** One TOC bullet = one lesson, less than 1h student time.

**Scope**. Cover only what a senior shipping production SaaS on this stack in 2026 reaches for with  regularity, and nothing else. The essentials get full treatment — signature, the decisions around them, the failure modes that bite in production. The long tail gets a one-line mention or gets cut. Length is not the constraint; a lesson that runs long because the topic is load-bearing is correctly scoped, and every paragraph earns its place. The failure mode is the lesson that surveys an API end-to-end: the student loses the signal of what matters and stops trusting the cut. Prerequisites are never re-taught — a one-line frame and a link to the lesson that owns the topic.

**Lesson archetypes** — descriptive shapes, used as a thinking framework, not as blueprint:

- *Mechanics* — specific syntax/API. Code example + inline watch-out + quick exercise. Sandbox often.
- *Decision* — "when does X earn its weight." Threshold up front, alternatives compared. Decision-tree or comparison diagram often essential.
- *Concept* — build a mental model. Diagram/animation almost always. Worked example exercising the model.
- *Setup/wiring* — terminal-style walkthrough + verify step. No exercise default.
- *Pattern* — code block named for what it prevents, failure mode without it, structural enforcement that makes the bug hard to write. "Spot the missing piece" exercises.
- *Reference/survey* — enumerate an API set with "reach for it when…" lines.
- *Project walkthrough* — used by lessons in project chapters only, in three flavors (precondition / slice / verify walkthrough). The code is built during chapter prep; the lesson walks the student over it. See §8 and the project-lesson-designer / project-lesson-writer agents.

**Canonical lesson shape:**

1. **Title** — can rephrase the TOC bullet for the page header.
2. **Introduction** — state the lesson's goal, why it matters, connect it to what learner already know,  preview the practical skill or project built by the end, motivate the topic with a concrete problem. Keep it warm and brief.
3. **Body** — h2/h3 where there are distinct subtopics; teaching prose with code, exercises, and videos all placed *where they belong*, never at the end.
4. **External exercises** (optional LinkCards) — links to the external practice repo.
5. **Learning resources** (optional LinkCards) — Official docs, supplementary video.

## 6. Content decision rules

**Exercises.** Default to including exercises. Students retain by doing, not by reading, and immediate practice catches misunderstandings before they compound. The question is which form. Live coding exercises with tests or goals are the strongest form they let the student practice the new syntax *and* confirm understanding in one step; use them as often as the material warrants. When live coding doesn't fit we can use other interactive exercises. Both kinds should be short and fun — they keep momentum, not break it. Place exercises where they belong in the flow, never collected at the end.

**Coding sandboxes.** Different from exercises. An optional expandable callout, at most once per lesson, offered when the student is likely to want to play with the new concept freely without a prescribed goal.

**Diagrams.** Add when visualization is the best vehicle to teach a concept.

**YouTube embeds.** Add only when it conveys something previous elements can't. Contextual videos in body; reinforcement videos in Learning resources. Lesson body must be complete without the video.

**External exercises.** Link to external online exercises when directly relevant.

## 7. Quizzes

Teaching chapters end with a final quiz so the student can self-assess recall — except unit 1 (chapters 1.1–1.4), which is setup/toolchain and has nothing quiz-worthy. Project chapters do not get a quiz; the project itself is the assessment.

## 8. Small focused projects

At the end of *select* units or chapters, a **small focused projects** (1–2 hours, single sitting) let the student apply the unit's concepts in a realistic workflow. Projects are independent. No monolithic capstone. Starters and solutions ship from a separate `react-saas-course-projects` monorepo.
