# How to rewrite an AI-generated lesson

A guide for rewriting agents, derived from a side-by-side analysis of one AI-generated lesson ("Bindings, not boxes") and its human rewrite ("Values, references, and copies").
Each principle states the rule, the reasoning, and a brief before/after.

## The shape of a good rewrite

The rewrite was not a polish pass. It was a clarity-and-concision edit with two aims held at once:
make the lesson easier to follow, and make it tighter (the rewrite ran about 30% shorter).
Neither aim overrides what the lesson teaches, and neither excuses an error: the wording changes, the curriculum and the facts do not.

The editing energy went almost entirely into prose. Every interactive, runnable, or curated asset survived untouched.
The mental test behind nearly every edit: is this draftable prose, or a vetted/functional asset? Prose got clarified, tightened, or cut; assets were left alone.

Two failure modes to steer between: changing too little (cosmetic polish that leaves the bloat and the confusion),
and changing too much (rewording working code, links, and exercises, which adds risk for no gain).

## Frontmatter

Set the reader's expectation before they read a word of body text.

- **Title:** as plain and descriptive of the content as possible.
  Always draft a few options and pick the most descriptive one.
  Avoid teasers, slogans, metaphors, personification, and hype. `Bindings, not boxes` became `Values, references, and copies`.
- **Sidebar label:** match the title, or a shortened version if the title exceeds ~35 characters.
- **Tagline:** one line that places the lesson in the course at a high level, kept short.
  Cut anything the reader already knows: "...where the course's first unit begins" is obvious from lesson order, so it went.

## Principles for clearer prose

### 1. Headings and titles name the mechanism, not a metaphor

Headings and the lesson title double as the table of contents and as search targets, so they should say what the section covers in plain words.
Avoid clever, cringe, or idiomatic labels.

- `Names and values` becomes `How \`=\` treats primitives and objects`.
- `Shallow copy: the daily reach` becomes `Shallow copy: the spread operator`, with `Deep copy: structuredClone` matched to it so the pair reads cleanly.
- `Check yourself` (reads like an ad slogan) becomes `Check your understanding`.

The same applies in body prose: do not introduce a metaphor for a concept that is no harder to grasp than the metaphor itself.
Name the concept directly with the term the course uses, for example "reference" and "object", not "the arrow" and "the box".
Reserve a metaphor for a genuinely hard idea, and when you do use one, define it.

### 2. Open by motivating the lesson, briefly

The introduction is the highest-stakes prose in the lesson: a weak one loses the student.
It should be short, clear, and show why the topic matters, then stop. Strip the editorializing while keeping the motivation.

- Cut: "...a long list of 'why did my state silently change?' stories like it" and "The fix isn't a habit of copying everything defensively..."
- Signal a hypothetical so the reader knows what to do with it: "A teammate opens a pull request..." becomes "Picture this scenario: a teammate's pull request adds code that..."

### 3. Cut scaffolding, meta-narration, hype, and dated framing

Sentences that describe the lesson's own structure, make promises, settle insider debates, or timestamp the content are noise. State the idea; don't announce it.

- Cut self-reference: "The rest of the lesson is built on one rule..."
- Cut debate-settling and jargon a beginner doesn't need: the bolded "JavaScript is always pass-by-value..." and "settles the pass-by-value vs pass-by-reference debate."
- Cut dating and hype: "The 2026 default...", "Node 24 LTS", "what an experienced engineer reaches for."
- Cut forward-reference name-drops: pointers to future units, tools, or chapters
  ("Zod in the Forms unit", "Drizzle in the Postgres unit", "you'll meet this again in the React chapters", "Stripe's API takes...").
  They teach nothing now and date the prose. Allow at most one short pointer per lesson, and only when it genuinely motivates the current topic.
- Cut reassurance and justification commentary that teaches nothing: "guaranteed by the spec across every engine you'll ever target",
  "they aren't bugs and they won't change", "add a comment or the next reader will assume it's a typo".
- Cut the closing recap paragraph that restates what the lesson already taught ("Every equality decision in the rest of the course follows the same rule...").

### 4. Be precise and unambiguous, even at the cost of a word

This is the counterweight to cutting: where brevity and clarity conflict, clarity wins. Fix loose wording, make the implicit explicit, and choose the exact term.

- Fix loose metonymy: "a pull request that updates a user record" becomes "a pull request adds code that passes..." (the code acts, not the PR).
- Make the implicit explicit: "an analytics helper" becomes "an analytics helper function."
- Use the exact word: a language behavior is a "fact," not a "rule."
- Remove false transitions: "the two names are independent from that moment on" loses "from that moment on," which implies a change that never happens.
- Anchor an abstract rule with a tiny concrete example for clarity: "store money as integer cents" becomes "store money as integer cents (399, not 3.99)."
- Define jargon you keep, or cut it: a bare "the spec" means nothing to this reader. Either name what it is or drop it.

### 5. Use plain American English; drop idioms and colloquialisms

Regional or informal phrasing makes a global audience pause. Prefer neutral, direct wording.

- "The right panel is the one that catches people out" becomes "...is where people get it wrong."
- "A shallow copy is almost always what you want" becomes "When you need to copy an object, a shallow copy should be your first choice."
- Prefer "web app" to "SaaS" in body prose. SaaS is the course's subject, so naming it in every lesson reads as filler;
  reserve it for where the business model is actually the point.

### 6. Don't use a term before it's introduced, or borrow out-of-scope jargon

A word the student hasn't been given, or that belongs to a later topic, reads as a gap. Use the vocabulary the lesson has actually established.

- "state shapes" (a React term, before the React chapters) becomes "objects," the word this lesson uses.

### 7. Define key terms once, at first use

Define a load-bearing term the moment it first carries weight, using prose or a `<Term>` tooltip (if the term is secondary), but not both.
Generic-looking words still deserve a definition: even for programmers, "name" and "value" are easy to misread, so they got tooltips at first use.
Remove `<Term>` tooltips if prose already defines the term.

## Principles for structure

### 8. One idea per section; respect concept order

Keep each section to its own idea, and never explain or rely on a concept the student hasn't reached yet.
If a "when to use this" rule belongs to a concept, put it in the section that defines that concept.

- The `const`-binding aside (its own future lesson) was cut from the values section.
- Guidance on *when* to deep-copy was moved out of the shallow-copy section and into the deep-copy section, where the concept actually lives.

### 9. Surface the decision rule, with its rationale

Teach the decision, not just the capability. The rewrite promoted an explicit, reasoned rule to the top of the deep-copy section: "Since `structuredClone` has to walk the structure, its cost is higher, so use it only when the data is genuinely nested." The original left cost as an aside in the previous section.

### 10. Calibrate depth to the audience

Cut explanations of things the intended reader already knows; spend the words on what's actually new.

- For an audience with programming experience, the prose defining what a primitive *is* was dropped, keeping only the list: "Primitives: `string`, `number`, `boolean`, ..."
- When the prose itself marks something as out of scope, rare, advanced, or optional ("out of scope here", "rarely needed", "for the rare case where..."),
  that is a self-labeled cut target. Reduce it to a single sentence or remove it. Banker's rounding, deep `BigInt` detail, and `NFKC`/`NFKD` compatibility forms are examples.
- Teach one correct way; do not present a temporary or starter approach beside the real one.
  `toFixed(2)` "for now" alongside `Intl.NumberFormat` "the correct way" confuses the reader. Pick the right tool and teach only that.

### 11. Delete sections that are out of scope, legacy, or duplicated

Remove a whole section when it teaches a path the student shouldn't take, previews a future lesson, or repeats practice already given, and its value survives elsewhere.

- `JSON.parse(JSON.stringify(x))` (legacy) cut; the topic remains in a retained external link.
- "The React-shaped reflex" (forward reference to a later chapter) cut.
- "Check yourself" capstone cut: the concepts are already practiced by the kept inline exercise. One exercise per concept is enough.
- A "what to recognize" catalog of legacy APIs is itself legacy detail. Do not enumerate the old methods cut them entirely.

## Edit prose only, but everywhere it lives

Edit prose only; do not touch code or external resources, changing them solely when coherence demands it after a prose rewrite. The catch is that prose hides inside assets, and that prose is fair game:

- **Figure captions.** Diagrams are often separate components you must open to find their text. Drop a caption if the prose already covers the figure; if you keep one, it must describe every part of the figure. One caption explained only the right half of a two-part diagram, so it gained a line for the left half.
- **Explanatory text in code components** (`CodeVariants`, `AnnotatedCode`). Tighten the captions, leave the code. "Inside `rename`, the parameter..." was both tightened and generalized to "Inside the function, the parameter..." since the function name doesn't matter here.

Leave untouched: runnable code and its expected-output comments, curated external links (URLs, titles, descriptions, icons), exercise starter code and tests, the code inside diagrams, and the import block.

**Verify correctness of the text you keep.** The draft can be confidently wrong. The original caution claimed cloning a class instance throws `DataCloneError`; it doesn't, it returns a plain object stripped of methods. Fix the fact, then shorten.

## Method

- Work in two passes: sentence by sentence, then paragraph by paragraph, merging stray sentences into paragraphs where it improves flow.
- For each sentence ask: remove it? remove part of it? Then draft a few alternatives and pick the clearest, even when it isn't the prettiest.
- Treat the ~30% length reduction as a diagnostic signal, not a quota.
  Clarity-driven cutting on these drafts typically lands around 30% shorter, so a rewrite that comes in much under that is a signal of residual noise (uncut commentary, forward references, over-explanation), not proof of restraint.
  Re-audit such a rewrite for what you left in. Never pad or cut purely to hit a number; judge each section by its signal-to-noise ratio, not its length.
- Keep the voice consistent and address the learner directly; a gentle register reads as guiding rather than lecturing.
- Mechanics: American English; prefer commas or colons to em dashes.

## Quick checklist

1. Frontmatter set: plain title, matching/shortened sidebar label, concise tagline?
2. Intro motivates briefly, signals hypotheticals, and drops editorializing?
3. Title and headings literal and parallel, no metaphors, slogans, or idioms? Title drafted a few ways and the most descriptive picked?
4. Removed scaffolding, meta-narration, debate-settling, hype, dated framing, forward-reference name-drops, reassurance commentary, and the closing recap?
5. Every sentence precise and unambiguous; implicit made explicit; exact words chosen?
6. Plain American English, no idioms or colloquialisms?
7. No term used before it's introduced; no out-of-scope jargon?
8. Key terms defined once, at first use, via `<Term>` or prose, not both?
9. One idea per section; concepts introduced before they're used; decision rules placed where the concept lives?
10. Explanation depth calibrated to the audience; self-flagged out-of-scope material cut; one correct way taught, not a starter-plus-real pair?
11. Deleted out-of-scope, legacy, duplicate, or legacy-catalog sections whose value survives elsewhere?
12. Cut sections that only contain shallow, redundant or repetitive exercises, not load-bering to the lesson
13. Edited prose everywhere (body, captions, component text); left code, links, tests, diagrams, and imports untouched?
14. Verified the technical correctness of the text you kept?
