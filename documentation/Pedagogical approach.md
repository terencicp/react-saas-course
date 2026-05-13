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

## 3. Lesson architecture

**Grain.** One TOC bullet = one lesson, less than 1h student time.

**Six archetypes** — descriptive shapes, used as a thinking framework, not as blueprint:

- *Mechanics* — specific syntax/API. Code example + inline watch-out + quick exercise. Sandbox often.
- *Decision* — "when does X earn its weight." Threshold up front, alternatives compared. Decision-tree or comparison diagram often essential.
- *Concept* — build a mental model. Diagram/animation almost always. Worked example exercising the model.
- *Setup/wiring* — terminal-style walkthrough + verify step. No exercise default.
- *Pattern* — code block named for what it prevents, failure mode without it, structural enforcement that makes the bug hard to write. "Spot the missing piece" exercises.
- *Reference/survey* — enumerate an API set with "reach for it when…" lines.

**Canonical lesson shape:**

1. **Title** — can rephrase the TOC bullet for the page header.
2. **Introduction** — state the lesson's goal, why it matters, connect it to what learner already know,  preview the practical skill or project built by the end, motivate the topic with a concrete problem. Keep it warm and brief.
3. **Body** — h2/h3 where there are distinct subtopics; teaching prose with code, watch-outs, exercises, inline concept checks, and videos all placed *where they belong*, never at the end.
4. **External exercises** (optional LinkCards) — links to the external practice repo.
5. **Learning resources** (optional LinkCards) — Udemy section link, official docs, supplementary video.

## 4. Content decision rules

**Exercises.** Default to including exercises. Students retain by doing, not by reading, and immediate practice catches misunderstandings before they compound. The question is which form. Live coding exercises with tests or goals are the strongest form they let the student practice the new syntax *and* confirm understanding in one step; use them as often as the material warrants. When live coding doesn't fit we can use other interactive exercises. Both kinds should be short and fun — they keep momentum, not break it. Place exercises where they belong in the flow, never collected at the end.

**Coding sandboxes.** Different from exercises. An optional expandable callout, at most once per lesson, offered when the student is likely to want to play with the new concept freely without a prescribed goal.

**Diagrams.** Add when the model has more than one moving part. Always justified: lifecycles/flows, trees/graphs, anatomy. Form preference:

- **(1) Mermaid** (default, relational/topological — connection > layout). Examples: flowcharts, sequence diagrams, state machines, ER diagrams, gitGraphs.
- **(2) Interactive widget** using DOM elements — when manipulation *is* the lesson and a static picture can't show the cause-and-effect. Examples: calculators/converters, property playgrounds (sliders driving real CSS), quizzes with feedback, toggleable comparison panels, simulators with controls (rate limiter, debounce).
- **(3) Hand-authored SVG** where layout itself carries meaning (cascade, box model, flex/grid axes, component-tree emphasis, anatomy with annotations); or animated when change-over-time is the lesson. Examples: box model, flex/grid axes, anatomy diagrams (URL, HTTP request), component trees, animated processes (event loop, paint/reflow).

**YouTube embeds.** Add only when it conveys something previous elements can't. Contextual videos in body; reinforcement videos in Learning resources. Lesson body must be complete without the video.

**Udemy parallel.** Per-unit or chapter curated mapping.

**External exercises.** Link to external online exercises when directly relevant.

## 5. Quizzes

Most chapters will have a final quizz to let the student self-assess its recall.

## 6. Small focused projects

At the end of *select* units or chapters, a **small focused projects** (1–2 hours, single sitting) let the student apply the unit's concepts in a realistic workflow. Projects are independent. No monolithic capstone.
