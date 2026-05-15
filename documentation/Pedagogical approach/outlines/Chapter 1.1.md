# Chapter 1.1 — The contract: pedagogical approach

## Concept 1 — The win condition is a senior code review, not "knowing React"

**Why it's hard.** Returning developers anchor on the wrong bar — "finishing the course," "learning the syntax," "shipping something." The course's bar is harsher and more useful: would a senior on the team merge this? If the student doesn't internalize that bar in lesson one, every later cut reads as arbitrary.

**Ideal teaching artifact.** Concept archetype, framed as an interview-style calibration. After one paragraph naming the bar plainly, the student sees three short artifact extracts side-by-side — a working but smelly feature implementation, a senior-graded version of the same, and the reviewer's three-line comment that separates them. The student isn't asked to write code; they're asked to look at what "production code review" actually means as an output. The artifact's job is to make the bar concrete enough that the student feels the gap between "it works" and "it ships."

**Engagement.** After the side-by-side, a three-question `MultipleChoice` round: given a candidate PR description, pick the comment the senior reviewer would leave. Wrong answers reveal which axis (naming, decision rationale, failure-mode coverage) the candidate missed.

**Components.**
- `Figure` wrapping a hand-laid-out three-column comparison (works-but-smelly / senior version / reviewer comment), with the reviewer comment styled as a callout. No bespoke component needed.
- `MultipleChoice` for the calibration round.

---

## Concept 2 — The self-check that recommends where to start

**Why it's hard.** The wrong reader bouncing in chapter 4 is expensive; bouncing here is cheap. But students don't self-diagnose well in plain prose — they over- or under-rate themselves depending on mood. The diagnostic has to be a small interaction whose *output* is a routing recommendation, not a score.

**Ideal teaching artifact.** A short routed self-check — four prompts (deployed something, comfortable in a terminal, can read a `useEffect`, have used Git past `add/commit/push`) that aggregate into one of three concrete recommendations: *start here*, *start at chapter X*, *consider a fundamentals course first*. The recommendation must be a single sentence, no judgment, with a link target. The artifact is the lesson's load-bearing beat — its job is to triage the reader before they invest hours.

**Engagement.** The self-check is the engagement. Confirm recall with one follow-up `TrueFalse` ("the win condition is shipping a feature that holds up to senior review — true/false") immediately after, so the routing decision lands tied to the bar from Concept 1.

**Components.**
- New: `SelfCheckRouter` — props: an array of yes/no or scale prompts each tagged with a weight bucket, plus a `routes` map from cumulative bucket to a `{ headline, body, href }` recommendation. Renders the prompts, computes the route, shows the recommendation card.
- Alternative: a `TrueFalse` round followed by a static `Aside` that lists the three routes and asks the student to self-select. Loses the personalization but ships today.

---

## Concept 3 — Pillar 1: decisions before syntax, as an operational filter

**Why it's hard.** "Senior mindset over syntax" sounds like a slogan. The student has to see it operating as a filter — picking *what to teach*, *what to cut*, *how to introduce* each piece — before they trust the rest of the course's cuts. Until then, every missing topic feels like an oversight.

**Ideal teaching artifact.** Decision-archetype demonstration. Two tabbed mini-cases the student has not yet learned the technical context for — picking `useState` over Zustand by default, and picking Drizzle over Prisma — each rendered as the *senior question* (what threshold flips the choice?) followed by the answer in three lines. The student watches the same filter fire twice on unrelated decisions. The point is the *pattern of the filter*, not the technical answers, which are forward references.

**Engagement.** A `Buckets` sort: given six teaching moves pulled from later lessons ("name the threshold," "show the default first," "list the alternatives' triggers," "compare to a deprecated tool," "explain the syntax," "list every method on the class"), sort each into "pillar 1 fires this in" or "pillar 1 cuts this." The wrong-answer feedback names which filter caught it.

**Components.**
- `TabbedContent` for the two firing demonstrations, each tab containing the prose case.
- `Buckets` for the filter-recognition sort.

---

## Concept 4 — Pillar 2: minimum viable, and the negative space it creates

**Why it's hard.** A "minimum viable stack" list reads like any other tool list unless the student also sees what got cut and why. The misconception is that the course is small because it's introductory; the truth is it's small because every inclusion earned a place against a named threshold.

**Ideal teaching artifact.** A negative-space figure: two columns side-by-side, "in the 2026 SaaS stack" and "deliberately not in this course," each with five or six entries. The cut column carries one-line reasons (jQuery — superseded; ESLint+Prettier — replaced by Biome; raw SQL — Drizzle owns the boundary). The student sees the cut discipline as a *visible* asymmetry. The visual is intentionally lopsided — the cuts column is longer than the keeps column.

**Engagement.** After the figure, a single `TrueFalse` round of four statements ("REST vs. GraphQL holy wars are in the course," "the course teaches every popular CSS-in-JS library," "the course teaches Tailwind v4," "the course teaches jQuery") to confirm the cut-discipline lens has stuck.

**Components.**
- `Figure` wrapping a hand-authored two-column SVG or HTML table comparing kept vs. cut. The cut entries are each `Term`-wrapped with a one-line definition tooltip naming why it was cut.
- `TrueFalse` for confirmation.

---

## Concept 5 — AI is absent from lessons, on purpose

**Why it's hard.** In 2026, the student expects every developer course to either lean heavily on AI or fight it. Silence on either side will read as oversight unless named once, plainly, with the senior reason. The misconception to preempt: "this course is dated because it doesn't mention AI."

**Ideal teaching artifact.** A single paragraph, framed as a `note` aside, stating the position: AI is the daily reality of 2026 SaaS work, and naming AI in lessons ages them out before they ship. The course teaches durable skills properly; AI-readiness is a side product. No exercise — this concept is editorial, not skill-building. The aside's job is to be findable later when the student wonders, twenty units in, "wait, why hasn't AI come up?"

**Engagement.** None. The lesson body is the artifact; the student's question doesn't recur if it was answered well. The recall trigger is the absence itself across the rest of the course.

**Components.**
- `Aside` of type `note`, one paragraph.

---

## Concept 6 — The stack map: shape before depth

**Why it's hard.** The student can't yet learn the stack — they don't have the context for any of it. But they need a visual scaffold so each tool, when it appears in unit N, has a slot waiting for it. Without the map, every new tool feels like another item on an open-ended list; with it, every tool *fills a gap the student already knew was there*.

**Ideal teaching artifact.** Reference/survey archetype with a single hub diagram. A grouped visual map of the entire stack, organized by role (runtime, language, framework, data, UI, infra, payments, observability, AI). Each tile is a tool name and one-line "what it does." On hover or focus, a tooltip surfaces the *senior reason it wins in 2026* (or the trigger that would flip it). The map is the lesson's centerpiece; surrounding prose only models the "default vs. trigger" framing on two or three tiles and trusts the diagram to carry the rest. The map should be the same artifact the student returns to in every later unit as a navigation aid — a clickable index of the course.

**Engagement.** A `Matching` exercise: drag eight tool names to their roles (Drizzle → data layer, Better Auth → auth, Trigger.dev → background work, etc.). Confirms the student has the map in working memory before moving on.

**Components.**
- New: `StackMap` — props: a grouped `roles` array, each role with tiles `{ name, oneLiner, seniorReason, triggerToFlip?, forwardLink }`. Renders as a grid with hover tooltips and an optional "show triggers" toggle that highlights tiles whose `triggerToFlip` is set. Compounds as a navigation aid across every later unit.
- Alternative: `Figure` wrapping a hand-authored SVG of the same grouping with `CodeTooltips`-style hovers — ships immediately, lacks the toggle.
- `Matching` for the recognition exercise.

---

## Concept 7 — The May 2026 pin, and how to spot when the course has aged

**Why it's hard.** The course will go stale in places. The student needs a heuristic for *which* places age fastest so they can recalibrate without losing trust in the rest. Versions and tool names drift; senior reasoning doesn't. The student has to learn to read the difference.

**Ideal teaching artifact.** A small three-panel figure showing the same lesson excerpt at three ages: "facts that don't age" (e.g. "the cascade resolves by specificity"), "facts to verify by date" (e.g. "Node 24 LTS"), "facts likely to be wrong by 2027" (e.g. "Better Auth v1.4 ships with X plugin"). Each panel names the cue — a version string, a `pinned May 2026` badge, a "verify before relying on this" callout — that flags which kind it is. The student leaves with a triage rule, not a list.

**Engagement.** A short `Buckets` sort: five mini-excerpts pulled from later lessons, the student tags each as "evergreen," "verify by date," or "expect drift." The point is the *category*, not the specific excerpt — the cue should be enough.

**Components.**
- `Figure` with a hand-authored three-column SVG (or HTML) of the three aging classes, each panel carrying the cue badge style the course will actually use.
- `Buckets` for the sort.

---

## Concept 8 — Rusty-not-new: prerequisites as mapped gaps

**Why it's hard.** Returning developers don't know which of their gaps will bite. The misconception cuts both ways: either they assume every gap is fatal and bail, or they assume rust will sand off as they go and crash into closures in unit 2.7. The frame has to be: gaps are real, mapped, and patched at adult depth in named chapters — *not* re-taught in passing.

**Ideal teaching artifact.** Reference archetype with a two-column reference card: "assumed without ceremony" on the left, "re-taught at adult depth (and where)" on the right. Each right-side entry is a `LinkCard` pointing to the chapter that owns it. The reference is the artifact; the lesson body is the scaffolding around it.

**Engagement.** A four-snippet `PredictOutput` round: closure capture (`for...let` vs. `for...var` loop logging), `==` vs `===` on `null` and `undefined`, microtask ordering (`Promise.resolve().then` before `setTimeout(0)`), and one small async-error swallow. Each wrong answer surfaces a one-line "you'll close this gap in [chapter link]." The exercise is the litmus and the routing in one.

**Components.**
- `Figure` wrapping a two-column HTML table; right column entries rendered as inline `LinkCard`s or styled inline links.
- `PredictOutput`, four panels, each with the gap-routing link in the explanation pane.

---

## Concept 9 — The deliberate cut list

**Why it's hard.** Students from prior eras come expecting jQuery, Webpack, REST-vs-GraphQL holy wars, class components. They will look for these and conclude the course is incomplete when they don't find them. Naming the cuts plainly, once, prevents that misreading from accumulating into mistrust.

**Ideal teaching artifact.** A single visual list of cut topics, each with a one-line reason (jQuery — superseded by the platform; class components — function components are the default; Sass — Tailwind owns styling; REST-vs-GraphQL — both work, the course teaches the 2026 default and moves on). Format-wise, this is a styled HTML list inside a `Figure`, with each cut topic clickable to a one-paragraph "if you were going to ask about this" reveal.

**Engagement.** A `Buckets` sort: ten topic names, sorted into "taught in this course," "re-taught at adult depth later," "deliberately cut." This is the same `Buckets` template as Concept 7 (aging heuristic) but on a different axis — the student is now practicing the cut lens in two directions.

**Components.**
- `Figure` wrapping a styled list. Each cut topic uses `Term` with a tooltip carrying the one-line reason.
- `Buckets` for the sort.

---

## Concept 10 — Default first, name the trigger: the reading rule

**Why it's hard.** This is the single load-bearing micro-pattern the entire rest of the course relies on. If the student can't tag a lesson paragraph as *stating a default*, *naming a trigger*, *introducing a principle*, or *calling out a watch-out*, they will read every lesson as an undifferentiated wall and lose the cut. This concept earns more teaching weight than any other in the chapter.

**Ideal teaching artifact.** Pattern archetype, taught on a familiar object so the abstraction is concrete before it generalizes. Open with one worked example: "by default, you wear shoes outside; you switch to bare feet when the floor is sand or grass." Same shape — default-stated, threshold-named — applied to an everyday choice. Then a `DiagramSequence` walks the student through five real lesson-paragraph excerpts (from chapters they haven't reached: a Zustand intro, a `Promise.all` excerpt, a security header excerpt, an `Aside` watch-out, a Cache Components intro), with each step circling and labeling the rule type firing in that paragraph. The student watches the same five labels (default, trigger, principle, watch-out, pattern) get applied across radically different content.

**Engagement.** A `Buckets` sort with five labels (default, conditional-with-trigger, principle introduction, watch-out, pattern) and seven excerpt cards pulled from across the curriculum. The student must place each. Wrong placements reveal which cue (a word, a structural position, a callout type) they missed. This exercise *is* the lesson's confirmation that the reading rules transferred — without it, the lesson hasn't shipped.

**Components.**
- `DiagramSequence` carrying the five-excerpt walkthrough with the rule-type label flipping per step.
- `Buckets` for the assessment sort (five-label variant).

---

## Concept 11 — Lesson anatomy and the accounts deadline

**Why it's hard.** Two unrelated practical beats that have to land in the same lesson. The anatomy beat is about visual recognition — the student needs to know the shape of every page in the course. The accounts beat is about a real-world deadline — buying a domain takes a day for DNS, and the student must plan that *before* unit 8.

**Ideal teaching artifact.** Two artifacts, kept visually distinct. First, an annotated SVG (inside a `Figure`) of a representative lesson page with callouts pointing at the canonical regions — title, intro, body, inline exercise, optional sandbox callout, optional video, learning resources. The student literally sees the shape they will see for 22 more units. Second, a visually-distinct `Aside` of type `caution` named "Accounts and domain," listing every free-tier hosted service the projects will need and flagging the single cheap domain as the only line item that costs real money and has a DNS lead time.

**Engagement.** A short `Matching` exercise pairing five regions of the anatomy ("the inline exercise," "the watch-out callout," "the optional sandbox," "the learning resources block," "the introduction") to their visual cues. Confirms the anatomy lands in recognition memory.

**Components.**
- `Figure` wrapping a hand-authored annotated SVG of the lesson anatomy.
- `Aside` (`caution` flavor) for the accounts/domain heads-up.
- `Matching` for the anatomy recognition.

---

## Component proposals

**`SelfCheckRouter`**
- **Sketch.** Inputs: an array of prompts (yes/no or scale) each tagged with a bucket weight, plus a `routes` map from cumulative bucket score to a `{ headline, body, href }` recommendation. Output: the prompts, then a recommendation card pointing at the right start lesson.
- **Uses in this chapter.** Concept 2.
- **Forward-links.** Lesson 1.1.4's litmus self-assessment (Concept 8) could route the same way, surfacing the "you'll patch this gap in chapter X" recommendation as a route rather than per-snippet explanations. Could also be reused at the start of any unit with a real prerequisite gate (Unit 5 App Router, Unit 16 TanStack Query).
- **Leanest v1.** A `MultipleChoice`-shaped round that aggregates a numeric score and shows one of three static recommendation blocks. No animation, no progress, no save state.

**`StackMap`**
- **Sketch.** Inputs: a `roles` array (runtime, framework, data, UI, infra, etc.), each role with tiles `{ name, oneLiner, seniorReason, triggerToFlip?, forwardLink }`. Renders a grouped grid with hover tooltips on each tile; a toggle highlights tiles whose `triggerToFlip` is set (conditional-power-tool tiles).
- **Uses in this chapter.** Concept 6.
- **Forward-links.** Every later unit could anchor its opening lesson to its tile on this map, so the student sees where they are in the course shape. Especially load-bearing for Units 7 (forms/actions), 13 (background+R2), 15 (cache+rate), 16 (client state) — units that introduce tools whose place in the stack matters more than their syntax.
- **Leanest v1.** A static hand-SVG grid inside `Figure`, with `Term` for the hover tooltip per tile. No toggle, no clickable forward-links — the toggle and forwarding are what make it compound, so v1 ships the recognition value but loses the navigation value.

---

## Build priority

`StackMap` is the highest-leverage component in this chapter — it's the only artifact in 1.1 that genuinely compounds across all 23 units, and the leanest v1 (hand-SVG in `Figure` with per-tile `Term` tooltips) ships the recognition value cheaply while the navigable interactive version can land later without breaking the lesson.

`SelfCheckRouter` is worth building only if the routing pattern reappears at least once more — the 1.1.4 litmus self-assessment is the natural second use. If 1.1.4 ends up using `PredictOutput` with inline gap-routing instead (as Concept 8 currently proposes), `SelfCheckRouter` shrinks to single-use and should stay demoted to the `MultipleChoice` + `Aside` alternative.

Everything else in the chapter rides on existing components — `Buckets`, `Matching`, `MultipleChoice`, `PredictOutput`, `TrueFalse`, `DiagramSequence`, `Figure`, `Aside`, `TabbedContent`, `Term`, `LinkCard` — which is the right shape for a chapter whose job is editorial, not mechanical.

---

## Open pedagogical questions

- Concept 2's routing recommendation depends on whether the course wants to *gate* readers (recommendation as a soft stop sign) or *track* them (recommendation as a suggested entry point with no friction). The voice rule "no bootcamp scaffolding" leans toward the latter; confirm.
- Concept 10's five-label taxonomy (default, conditional-with-trigger, principle introduction, watch-out, pattern) is the one the student will use to read every later lesson. If the rest of the course's prose doesn't consistently surface these as visually distinguishable cues (callout types, badge styles, structural position), the `Buckets` exercise loses its ground truth. The label set should be ratified before 1.1.5 ships.
