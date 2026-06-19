# How to rewrite an AI-generated lesson

Guide for rewriting agents. Each principle gives the rule, why, and a before/after example.

## What a good rewrite is

A clarity-and-concision edit, not a polish pass: make the lesson easier to follow and tighter (typically ~30% shorter). Wording changes; the curriculum and facts do not. Fix any factual error you find.

Edit prose only. Leave every interactive, runnable, or curated asset untouched. The test for each edit: is this draftable prose, or a vetted/functional asset? Clarify, tighten, or cut prose; leave assets alone.

Two failure modes to avoid: changing too little (cosmetic polish that leaves bloat and confusion), and changing too much (rewording working code, links, exercises — risk for no gain).

## Frontmatter

Set the reader's expectation before the body.

- **Title:** plain and descriptive. Draft a few options, pick the most descriptive. No teasers, slogans, metaphors, personification, or hype. (`Bindings, not boxes` → `Values, references, and copies`.)
- **Sidebar label:** match the title, or shorten if the title exceeds ~36 chars.
- **Tagline:** one short line placing the lesson in the course. Cut what's obvious from lesson order.

## Prose principles

**1. Headings and titles name the mechanism, not a metaphor.** They double as the table of contents and search targets, so use plain words. (`Names and values` → `How \`=\` treats primitives and objects`; `Check yourself` → `Check your understanding`.) Same in body prose: don't introduce a metaphor for a concept no harder than the metaphor. Name the concept with the course's term ("reference", "object", not "the arrow", "the box"). Reserve metaphors for genuinely hard ideas, and define them when used.

**2. Open by motivating the lesson, briefly.** The intro is the highest-stakes prose; a weak one loses the student. Short, clear, shows why the topic matters, then stops. Keep the motivation, strip the editorializing. Signal a hypothetical so the reader knows what to do with it ("A teammate opens a pull request..." → "Picture this scenario: a teammate's pull request adds code that...").

**3. Cut scaffolding, meta-narration, hype, and dated framing.** State the idea; don't announce it. Cut:
- Self-reference ("The rest of the lesson is built on one rule...").
- Debate-settling and beginner-irrelevant jargon ("settles the pass-by-value vs pass-by-reference debate").
- Dating and hype ("The 2026 default...", "Node 24 LTS", "what an experienced engineer reaches for").
- Forward-reference name-drops (future units, tools, chapters). Allow at most one short pointer per lesson, only when it motivates the current topic.
- Reassurance/justification that teaches nothing ("guaranteed by the spec across every engine", "they aren't bugs").
- Closing recap paragraphs that restate what was taught.

**4. Be precise and unambiguous, even at the cost of a word.** Where brevity and clarity conflict, clarity wins. Fix loose wording, make the implicit explicit, choose the exact term.
- Fix loose metonymy ("a PR that updates a user record" → "a PR adds code that passes..." — the code acts).
- Make implicit explicit ("an analytics helper" → "an analytics helper function").
- Use the exact word (a language behavior is a "fact," not a "rule").
- Remove false transitions ("independent from that moment on" implies a change that never happens).
- Anchor abstract rules with a tiny example ("store money as integer cents" → "...(399, not 3.99)").
- Define jargon you keep, or cut it (a bare "the spec" means nothing).

**5. Use plain American English; drop idioms and colloquialisms.** ("catches people out" → "is where people get it wrong".) Prefer "web app" to "SaaS" in body prose; reserve "SaaS" for where the business model is the point.

**6. Don't use a term before it's introduced or borrow out-of-scope jargon.** Use vocabulary the lesson has established. ("state shapes", a React term used before the React chapters → "objects".)

**7. Define key terms once, at first use,** via prose or a `<Term>` tooltip, not both. Even generic-looking words ("name", "value") deserve a definition. Remove `<Term>` tooltips if prose already defines the term.

## Structure principles

**8. One idea per section; respect concept order.** Never rely on a concept the student hasn't reached. Put a "when to use this" rule in the section that defines the concept. (When-to-deep-copy guidance moved from the shallow-copy section to the deep-copy section.)

**9. Surface the decision rule, with its rationale.** Teach the decision, not just the capability. Promote an explicit, reasoned rule ("Since `structuredClone` walks the structure, its cost is higher, so use it only when the data is genuinely nested").

**10. Calibrate depth to the audience.** Cut what the intended reader already knows; spend words on what's new.
- For experienced programmers, drop the definition of "primitive"; keep the list.
- Self-flagged material ("out of scope here", "rarely needed") is a cut target — reduce to one sentence or remove.
- Teach one correct way; don't pair a starter approach with the real one (`toFixed(2)` "for now" beside `Intl.NumberFormat`).

**11. Delete sections that are out of scope, legacy, or duplicated** when their value survives elsewhere. (Legacy `JSON.parse(JSON.stringify(x))` cut, topic kept in a retained link; forward-reference and duplicate-exercise sections cut; don't enumerate legacy APIs — cut them.)

## Prose hides in assets — edit it there too

Edit prose everywhere, including:
- **Figure captions** (often in separate diagram components you must open). Drop a caption the prose already covers; if kept, it must describe the whole figure.
- **Explanatory text in code components** (`CodeVariants`, `AnnotatedCode`). Tighten captions, leave the code. Generalize when specifics don't matter ("Inside `rename`, the parameter..." → "Inside the function, the parameter...").

Leave untouched: runnable code and its expected-output comments, curated external links (URLs, titles, descriptions, icons), exercise starter code and tests, code inside diagrams, the import block. Change these only when coherence demands it after a prose rewrite.

**Verify the text you keep.** The draft can be confidently wrong (it claimed cloning a class instance throws `DataCloneError`; it returns a plain object stripped of methods). Fix the fact, then shorten.

## Method

- Two passes: sentence by sentence, then paragraph by paragraph, merging stray sentences for flow.
- Per sentence: remove it? remove part of it? Draft a few alternatives, pick the clearest (not the prettiest).
- Treat ~30% reduction as a diagnostic, not a quota. Much less usually means residual noise — re-audit. Never pad or cut to hit a number; judge by signal-to-noise.
- Keep voice consistent, address the learner directly, gentle register.
- Mechanics: American English; prefer commas or colons to em dashes.

## Checklist

1. Frontmatter: plain title (drafted a few ways), matching/shortened label, concise tagline?
2. Intro motivates briefly, signals hypotheticals, drops editorializing?
3. Titles and headings literal and parallel — no metaphors, slogans, idioms?
4. Removed scaffolding, meta-narration, debate-settling, hype, dated framing, forward-reference name-drops, reassurance, closing recap?
5. Every sentence precise; implicit made explicit; exact words chosen?
6. Plain American English, no idioms?
7. No term used before introduction; no out-of-scope jargon?
8. Key terms defined once at first use, via `<Term>` or prose, not both?
9. One idea per section; concepts introduced before use; decision rules placed where the concept lives?
10. Depth calibrated; self-flagged out-of-scope material cut; one correct way taught?
11. Deleted out-of-scope, legacy, duplicate, or shallow/redundant-exercise sections whose value survives elsewhere?
12. Edited prose everywhere (body, captions, component text); left code, links, tests, diagrams, imports untouched?
13. Verified technical correctness of kept text?
