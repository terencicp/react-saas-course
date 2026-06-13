# Diataxis: the four jobs a doc can do

- Title (h1): `Diataxis: the four jobs a doc can do`
- Sidebar label: `The four jobs of docs`

---

## Lesson framing

This is the chapter's vocabulary lesson. Short (25-30 min target), no code to write, no project step. Its single job: install the Diataxis mental model so the four following lessons (README, AGENTS.md, ADRs) can each say "this artifact is the *<type>* doc for this repo" and have that mean something precise. Everything here is a thinking tool, not a folder mandate — hammer that the four types are for deciding *what a doc is for*, not four directories every repo must create.

Pedagogical conclusions that shape the whole lesson:

- **Lead with the pain, not the taxonomy.** The student has read (and written) bad READMEs. Open on the felt problem — "we have docs" but nobody reads them, the README that's a 400-line novel — and frame Diataxis as the diagnosis: one document trying to do four incompatible jobs at once. The taxonomy only lands after the pain is named.
- **Senior-mindset framing throughout (course pillar 1).** This lesson is pure "decisions before syntax" — there is no syntax. The senior contribution is *recognizing which job a doc is doing and refusing to let it do four*. Frame every type by its reader's intent (learning vs. doing, hands-on vs. heads-on), never by its file format.
- **Cognitive-load staging.** Introduce the four types one at a time with a single crisp definition each (axis-free, reader-intent-only) BEFORE revealing the 2x2. The grid is the synthesis, not the entry point — showing the axes first would force the student to hold two abstract dimensions before they have four concrete examples to place on them. Order: pain → four definitions → the 2x2 that explains *why* there are exactly four → the mixing trap → the repo map → the reflex → quality bars.
- **Anchor every abstract type to a concrete repo artifact the student already knows.** This course *is* a tutorial; this very repo has an `AGENTS.md`; the student has met Drizzle schemas (Ch ~014), `env.ts` (Ch 098), Server Actions (Ch 043). Every Diataxis type gets a "you've already seen this one — it's X" anchor so the framework feels like naming something familiar, not learning something new.
- **Mental model the student should leave with:** "Before I write a doc paragraph, I ask: is the reader here to *learn*, to *do a task*, to *look something up*, or to *understand why*? Those are four different readers with four different needs, and one paragraph cannot serve more than one of them well. A doc that mixes them is a doc nobody reads to the end." Plus the structural corollary: paraphrased docs rot, so prefer a *link to the canonical source* over re-stating it.
- **Where beginners go wrong (call these out explicitly):** (1) treating Diataxis as four mandatory folders — overbuild on day one; (2) the "comprehensive docs" instinct — one big document that's all four types, which readers bounce off; (3) "the code is self-documenting" used to justify deleting *all* reference docs, when really only trivial code is self-documenting; (4) writing philosophy/explanation before any reference artifacts exist.
- **Interactivity plan:** one synthesis diagram (the 2x2, built in HTML+CSS so it's theme-aware and crisp), one "annotated bad README" diagram showing the mixing trap as color-coded bands, one repo-map table/figure, and two checking exercises (a `Matching` drill: reader-intent → type; a `Buckets` drill: real repo artifacts → Diataxis type). No live-coding (nothing to run). No YouTube embed — the topic is conceptual and short; an external resource LinkCard to diataxis.fr suffices.
- **Forward-pointing without teaching forward.** Each cell of the repo map names the lesson that owns it ("README → lesson 2," "AGENTS.md → lesson 3," "ADRs → lesson 4") so the chapter's shape is visible from lesson 1, but this lesson does NOT teach README structure, AGENTS.md sections, or the ADR template — it only assigns the job to the artifact.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open on the senior question, framed as lived pain: why do READMEs balloon into novels nobody reads, why does "we have docs" not equal "we have *working* docs"? The answer in one line: the team wrote one document trying to do four different jobs at once, and a reader who came for one job has to wade past the other three. Name the payoff: Diataxis is a four-word vocabulary that names those four jobs, and once you have it, the rest of the chapter is just "which artifact owns which job." Connect to what they know — they've followed this course (a tutorial), they've opened this repo's `AGENTS.md`, they've scrolled a Drizzle schema. Keep it warm, ~3 short paragraphs. State the end state: by the end you can look at any doc and name which of four jobs it's doing, and spot when it's failing because it's doing two.

Tooltip (`Term`) candidate here: **Diataxis** — "A documentation framework (Procida, 2017) that sorts all technical docs into four types by the reader's need. Named from Greek dia- (across) + taxis (arrangement)." Keep it to the `Term` plain-text limit.

### Why one document can't do four jobs

Set up the core thesis before the taxonomy. The reader of a doc always arrives with exactly one of four intents, and those intents are mutually interfering: someone *learning the codebase for the first time* needs a hand-held happy path with no decisions; someone *doing a known task* needs to scan-find one answer and leave; someone *looking up a fact* needs dryness and completeness; someone *understanding a decision* needs prose and rationale. A paragraph optimized for one is actively wrong for the others — the learner doesn't want completeness (it's overwhelming), the looker-upper doesn't want narrative (it's slow). This is *why* good docs split by reader-intent, and it's the spine the four definitions hang on. Keep this tight — it's the bridge from pain to framework, ~2 paragraphs.

### The four jobs, one definition each

The heart of the lesson. Teach the four types in sequence, each as a short subsection-or-paragraph with: (a) the one-word reader orientation, (b) a plain definition by reader intent, (c) the "you've already seen this" repo anchor. Do NOT mention the axes yet. Present in canonical order (tutorial, how-to, reference, explanation). Recommend rendering the four as a `CardGrid` of four `Card`s (icon + title + 2-3 sentence body) for scannability, OR as four short `###` subsections — author's call; CardGrid keeps the parallel structure visually obvious and fits the "four siblings" shape better, so lean CardGrid.

Content per type:

- **Tutorial — learning-oriented.** Reader is a stranger to the codebase. The doc takes them by the hand down *one* path to a working end state; no decisions, no alternatives, success guaranteed if they follow along. Anchor: *this course is a tutorial.* In a SaaS repo the only tutorial is the README's "first-time setup" / "Getting started" path, if it exists — and nothing else.
- **How-to guide — task-oriented.** Reader already knows the codebase and wants to accomplish one specific thing: "add a new Server Action," "seed a tenant for local dev," "rotate the Stripe webhook secret." Goal-directed, assumes competence, scan-to-answer. Lives in `AGENTS.md`'s "common tasks" or a `/docs/how-to/` folder for the heavyweight ones.
- **Reference — information-oriented.** Dry, complete, structurally organized; describes the API surface *as it is*, free of interpretation. Anchor: the Drizzle schema file IS reference; `env.ts` IS reference; TSDoc on a public function IS reference. The reader at 2am wants the exact fact and nothing else.
- **Explanation — understanding-oriented.** Background, rationale, the *why* and the trade-offs. Anchor: an ADR is explanation; a note on "why we chose Server Actions over tRPC" is explanation. Read at leisure, away from the keyboard, to understand a decision rather than execute a task.

Tooltip (`Term`) candidates in this section: **TSDoc** — "TypeScript-flavoured JSDoc comment blocks (`/** … */`) above a declaration; editors surface the first sentence as hover text. Syntax covered in Chapter 102." (Define here because it's used as the reference anchor and the student hasn't formally met it — chapter framing flags Ch 102 owns the syntax.) **ADR** — "Architecture Decision Record — one short markdown file capturing one architectural choice and why. Full template in lesson 4." (Forward ref, but used as the explanation anchor; a one-line tooltip prevents the student stalling on an unknown acronym.)

### The 2x2 behind the four

Now reveal *why there are exactly four, not three or five.* Introduce the two axes as the synthesis:

- **Horizontal — acquisition ↔ application:** is the reader *acquiring* skill/knowledge (study mode) or *applying* what they already have (work mode)?
- **Vertical — action ↔ cognition:** is the doc about *practical steps* (doing) or *theoretical knowledge* (knowing)?

The four types are the four quadrants: Tutorial = acquisition + action (learning by doing); How-to = application + action (working by doing); Reference = application + cognition (working by knowing); Explanation = acquisition + cognition (learning by knowing). The senior payoff stated explicitly: a doc that *fights itself* almost always straddles two quadrants — that diagonal tension is the smell.

**Diagram (primary visual of the lesson).** A 2x2 grid built in **HTML + CSS** inside a `<Figure>` (per diagrams INDEX: this is a "layout concept rendered with real CSS," not a system graph — HTML+CSS is the right engine, theme-aware, devtools-inspectable, no build step). Pedagogical goal: make the "exactly four, no more" claim *visual* and give the student a spatial memory hook. Spec:
  - 2x2 CSS grid, ~`width: 100%`, capped well under 800px tall.
  - Top edge labels the horizontal axis: left cell-column = "Acquisition (study)", right = "Application (work)". Left edge labels the vertical axis: top row = "Action (doing)", bottom row = "Cognition (knowing)". (Use small rotated or stacked axis labels; keep readable per the html-css.md text-overlap guidance.)
  - Four quadrant cells, each with the type name (bold), its quadrant formula (e.g. "acquisition + action"), and a one-line reader-intent gloss ("take me by the hand"). Standard Diataxis placement: top-left Tutorial, top-right How-to, bottom-left Explanation, bottom-right Reference.
  - Use saturated mid-tone fills with white text OR Starlight gray chrome (per html-css.md theme guidance) so it survives light/dark. Apply the `margin: 0` reset to every descendant (the prose-margin gotcha).
  - Caption ties it back: "Four readers, four quadrants. A doc that lands on the diagonal between two cells is the doc nobody finishes."

Author note: keep the axis terminology exactly as Diataxis defines it (acquisition/application, action/cognition) — verified against diataxis.fr. The grid orientation above (Tutorial top-left, Reference bottom-right) matches the canonical Diataxis map; don't rotate it.

### The mixing trap that wrecks most READMEs

Apply the framework to the artifact the student knows worst. Walk a *typical* bad README top-to-bottom: it opens with a tutorial ("install this, run that"), slides into a how-to ("to add a feature, do X"), then reference ("env vars are…"), then explanation ("we chose Postgres because…"). Each section pulls a different direction; whichever reader showed up has to scan past three jobs that aren't theirs. Name the senior call: don't write one doc that does four jobs — *route each job to its right home.* Keep the README a tutorial-and-pointer doc; send reference to the schema and TSDoc; send explanation to ADRs; send how-to to `AGENTS.md` or `/docs/how-to/`.

**Diagram (the mixing trap, secondary visual).** HTML+CSS inside `<Figure>`: a single tall "README" rectangle sliced into four stacked color-coded bands, each labeled with its smuggled-in Diataxis type and a sample line ("`pnpm install`" = tutorial band, "env vars: …" = reference band, etc.), colors matched to the 2x2's quadrant colors for continuity. Beside or below it, the *fixed* version: a thin README band (tutorial + pointers only) with arrows/labels showing the other three bands relocated to schema / ADRs / `/docs/how-to`. Pedagogical goal: make "mixing" concrete and visual, and preview the redistribution the rest of the chapter performs. Reuse the quadrant palette from the previous figure so the colors *mean* the same thing across both diagrams. Apply the `margin: 0` reset and prefer `flex-wrap` over horizontal scroll for the before/after pair.

Optional consolidation: if the two README states (mixed vs. split) read better as switchable panels than side-by-side, use `TabbedContent` with two `TabbedItem`s ("The novel" / "The split"). Author's call based on width; side-by-side is fine if it fits.

### Where each type lives in a 2026 SaaS repo

The actionable map — the table that the next three lessons each expand one row of. Present as prose + a compact mapping, and crucially name the owning lesson per row so the chapter shape is visible:

- **Tutorial → `README.md` "Getting started" section only.** (Lesson 2.)
- **How-to → `AGENTS.md` "Common tasks" + `/docs/how-to/` for heavyweight ones.** (Lesson 3 covers AGENTS.md.)
- **Reference → the code itself:** Drizzle schema, Zod schemas, TSDoc on public functions, `env.ts`. (Lessons 2 and Ch 102.)
- **Explanation → `/docs/adr/` for architectural decisions; inline `// why` comments for narrow rationale.** (Lesson 4.)

State the crucial caveat *here, prominently* (this is the lesson's most important watch-out): Diataxis is a thinking vocabulary, NOT a folder mandate. Most SaaS repos need a `README.md`, an `AGENTS.md`, and `/docs/adr/` — and nothing else. The four types map onto those few files (and onto the source code); they do not require four directories. A team that creates empty `/tutorials`, `/how-to`, `/reference`, `/explanation` folders on day one has cargo-culted the framework.

Recommend a `Matching` exercise immediately after the map (see Exercises below) so the student actively binds intent→type before moving on.

### The "could this be a link?" reflex

The structural punchline that connects this lesson to the chapter's throughline ("docs live next to the truth"). The reflex: whenever you're about to *paraphrase* canonical truth in a doc — a function signature, a schema's column list, a config value — stop and link to the source instead. Why it's structural, not stylistic: a paraphrase has no force keeping it in sync; the moment the code changes, the paraphrase is silently wrong. A link can't go stale because it resolves to the source of truth itself. This is the reflex that makes the rest of the chapter's rules (thin README, source-as-doc) *mechanical* rather than aspirational. Keep this short and quotable — it's a one-idea section. Tie forward: lesson 2 turns this reflex into the README's design.

Tooltip (`Term`) candidate: **source of truth** — "The one canonical place a fact lives. Every other mention should point at it, not copy it, so the fact can't drift out of sync." (Only if the phrase isn't already established earlier in the course; if it's well-worn by Ch 101, skip to avoid clutter.)

### What "good" looks like for each type

Close the teaching with the quality bar per quadrant — different docs pass different tests, and stating each one makes the framework operational rather than theoretical. Render as four crisp criteria, ideally a short list or a `CardGrid` mirroring the four-definitions section (parallel structure aids recall):

- **Tutorial passes if** a new hire follows it to a green checkmark in under ~30 minutes without asking anyone.
- **How-to passes if** the reader doing the task scan-finds the answer in under a minute.
- **Reference passes if** a senior debugging at 2am finds the exact fact without reading anything they don't need.
- **Explanation passes if** a future maintainer grasps the *trade-off* well enough to decide whether the decision still holds under new constraints.

This section also absorbs the remaining watch-outs in context (don't bundle a "watch-outs" section — per instructions, qualifiers live with the concept they qualify): the "comprehensive docs" anti-pattern attaches to the tutorial/how-to bars (a doc trying to pass all four bars passes none); "the code is self-documenting" attaches to the reference bar (the *schema* is self-documenting, a gnarly Server Action's TSDoc is not optional); "philosophy before artifacts" attaches to the explanation bar (an explanation doc with no reference docs underneath it is decoration). Weave each as a one-sentence caution at its matching bar.

### Recap / one-line takeaway (short closing)

Restate the leave-with mental model in 2-3 sentences: four readers, four jobs, one job per doc; and when in doubt, link to the source instead of paraphrasing it. Point explicitly to the next lesson: "Lesson 2 takes the first artifact on the map — the README — and builds it as a deliberately thin tutorial-and-pointer doc." Add one `ExternalResource` / LinkCard to **diataxis.fr** ("Diátaxis — the canonical framework site, ~5-minute read") as the optional external resource per the lesson-structure guideline.

---

## Exercises

Two lightweight checking exercises, each placed at the section it reinforces (not at the end). Both are non-coding (nothing runs in this lesson) and self-grading.

1. **`Matching` — reader intent → Diataxis type.** Place right after "Where each type lives" (or after "The four jobs"). Left column = reader intents in natural language; right column = the four type names. Suggested pairs (4-5, within the 8-pair comfort limit):
   - "I've never seen this codebase — get me to a running dev server." → Tutorial
   - "I know the repo; how do I rotate the Stripe webhook secret?" → How-to
   - "What columns does the `invoices` table have?" → Reference
   - "Why did we pick Drizzle instead of Prisma?" → Explanation
   - (optional 5th) "I'm new — walk me through my first feature end to end." → Tutorial (shows two intents can share a type).
   Goal: bind the abstract types to concrete reader sentences. Grading: built-in correct/incorrect per pair.

2. **`Buckets` — real repo artifacts → Diataxis type.** Place after "Where each type lives in a 2026 SaaS repo." Four buckets (Tutorial / How-to / Reference / Explanation), chips are concrete artifacts from a real SaaS repo:
   - Tutorial: `README.md` "Getting started" steps.
   - How-to: an `AGENTS.md` "Common tasks" entry; a `/docs/how-to/deploy.md`.
   - Reference: `src/db/schema.ts`; `env.ts`; TSDoc on a Server Action.
   - Explanation: `/docs/adr/0001-use-drizzle.md`; a `// why we avoid useEffect here` comment.
   Use `instructions` to set the task ("Sort each real repo artifact into the documentation job it does"). Goal: rehearse the repo-map this lesson's whole second half builds toward — this is the highest-value drill because it's exactly the senior skill (look at an artifact, name its job). Grading: built-in green/red per chip with the `✕` colorblind badge.

(No `MultipleChoice`/`TrueFalse` needed — the two drills above cover both the intent→type and artifact→type directions, which are the two recall paths the quiz lesson will test. Adding more would pad a deliberately short lesson.)

---

## Components summary (for downstream authors)

- `Term` — for `Diataxis`, `TSDoc`, `ADR`, optionally `source of truth`. Plain-text definitions only.
- `Figure` + HTML/CSS — the 2x2 quadrant grid and the mixing-trap before/after. Reuse one shared quadrant palette across both. Apply `margin: 0` to every descendant; prefer `flex-wrap` to scroll.
- `CardGrid`/`Card` — optional, for the four-definitions section and/or the four quality-bars section (parallel four-sibling shapes).
- `TabbedContent`/`TabbedItem` — optional, only if the mixing-trap before/after reads better tabbed than side-by-side.
- `Matching` + `Pair` — intent→type drill.
- `Buckets` + `Bucket` + `Item` — artifact→type drill.
- `ExternalResource` (or Starlight LinkCard) — diataxis.fr.
- No live-coding, no `VideoCallout`, no diagram-engine (Mermaid/D2) work — the only visuals are CSS layout concepts, which the diagrams INDEX routes to HTML+CSS.

---

## Scope

**This lesson teaches:** the Diataxis vocabulary (four types by reader intent), the 2x2 axes that explain why there are exactly four, the mixing trap, the high-level repo map (which artifact owns which job, with each cell naming its owning lesson), the "could this be a link?" reflex, and the per-type quality bars. It is the chapter's framing/vocabulary lesson — conceptual, no code to write, no project step.

**Out of scope — do NOT teach here (owned by later lessons / chapters):**
- README structure, its five-section template, badges, `.env.example` discipline — **lesson 2** (this lesson only assigns the README the "tutorial + pointers" job and names lesson 2 as its owner).
- `AGENTS.md` sections, two-audience treatment, hierarchical lookup, vendor-config consolidation — **lesson 3** (this lesson only names AGENTS.md as the home for how-to/conventions).
- The Nygard ADR template (Title/Status/Context/Decision/Consequences), the inclusion test, supersession, the six worked picks — **lesson 4** (this lesson only names ADRs as the explanation home and gives a one-line `Term` so the acronym doesn't stall the reader).
- TSDoc syntax, tag set, where to place comments — **Chapter 102** (this lesson uses TSDoc only as the "reference lives in code" anchor, defined via a one-line `Term`).
- Out-of-repo docs (Notion/Confluence/wiki) — out of scope for the whole chapter; the course's stance is durable docs live in the repo. If a student wonders, a single sentence may note the chapter's repo-only stance, but do not argue it here.
- Auto-generated docs (TypeDoc, Drizzle Studio) — out of scope; the typed source is the doc.

**Prerequisites to redefine briefly (student has met these; keep definitions to one clause, do not re-teach):** Drizzle schema file (the data-model file, met ~Ch 014), `env.ts` (Zod-validated env, Ch 098), Server Actions (the course's API surface, Ch 043). These appear only as *anchors* for the reference/how-to types — name them, link the concept, move on.

---

## Notes for downstream agents

- Tone: adult, terse, senior-to-senior (course pillar — no bootcamp scaffolding, no celebration). This is a *vocabulary* lesson, so the writing must feel like a senior handing the student a sharp tool, not a textbook chapter on documentation theory.
- Keep it short. Estimated 25-30 min student time. Resist the urge to expand each type into a full treatment — depth lives in lessons 2-4. If a paragraph is teaching README/AGENTS/ADR *mechanics*, it's out of scope; cut it to a pointer.
- The two diagrams should share one quadrant color palette so the colors carry meaning from the 2x2 into the mixing-trap figure.
- Verified facts (fact-checked June 2026): Diataxis axes are *acquisition↔application* (horizontal) and *action↔cognition* (vertical); canonical map places Tutorial top-left, How-to top-right, Explanation bottom-left, Reference bottom-right (diataxis.fr). AGENTS.md is stewarded by the Agentic AI Foundation under the Linux Foundation — but AGENTS.md governance detail belongs to lesson 3, not here; only the filename appears in this lesson's repo map.
