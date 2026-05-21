# Pedagogical approach — Web Dev Course (2026)

## 1. The student

The student has some programming experience but no knowledge of modern web development. It's goal is to be able to build production SaaS apps on its own using AI agents.

## 2. Teaching stance

Two pillars sit upstream of every other decision in this doc.

The first: **systems design and senior mindset over syntax.** Code itself has become commodity in 2026; the senior contribution to a SaaS codebase isn't keystrokes, it's what gets decided before code is written (planning, system design, data modeling, API contract design) and how the code is shaped so it stays changeable (architectural patterns that hold up as the system grows). Every lesson foregrounds decisions and reasoning. When teaching a feature, lead with why this approach, when does it break, what would a senior do differently. Code samples illustrate those decisions.

AI-driven development is the daily reality of 2026 SaaS engineering and part of why this course exists in this shape — but don't name AI in lesson material unless the feature being taught is itself AI-related. Any "how to direct AI" lesson ages out before the course ships. Teach the durable skills properly and AI-readiness happens automatically.

The second: **minimum viable 2026 stack.** Teach the smallest set of technologies and syntax a SaaS startup would actually ship with in 2026.

Six filters operationalize the pillars; if a lesson fails any, rewrite.

- **Decisions before syntax.** Every lesson introduction contains the senior question it answers (not as a section but implicitly).
- **No bootcamp scaffolding.** No "what is a function," no celebratory tone. Adult, terse, assumes competence. Fundamentals get full adult-depth treatment when needed — the cut isn't *which* fundamentals, it's *how* they're framed.
- **Defaults before conditionals; trigger before tool.** Conditional power-tool lessons introduction sections must name the threshold the platform default crosses.
- **Teach the form they will write.** TS+JS as one language, HTML through JSX, CSS through Tailwind, Postgres through Drizzle. Underlying primitive named at the call site, not as preamble.
- **Principles and patterns inline, never bundled.** Introduced at the moment the lesson would teach them.

## 3. Lesson structure

1. **Title** — can rephrase the TOC bullet for the page header.
2. **Introduction** — state the lesson's goal, why it matters, connect it to what learner already know,  preview the practical skill or project built by the end, motivate the topic with a concrete problem. Keep it warm and brief.
3. **Body** — h2/h3 where there are distinct subtopics; teaching prose with code, exercises, and videos all placed where they belong, never at the end.
5. **External resources** (optional LinkCards) — Official docs, tutorials, interactive explainers, supplementary video.

## 4. Internal references

Students can't see chapter and lesson numbers in the sidebar, just in the lesson header. When referring to another chapter or lesson number always mention its title. Prefer using relative terms like "in the next chapter".

## 4. Quizzes

Teaching chapters (except unit 1) end with a final quiz so the student can self-assess recall.

## 5. Projects

At the end of most units, a small focused projects let the student apply the unit's concepts in a realistic workflow.
