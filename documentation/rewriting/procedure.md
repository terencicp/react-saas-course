# Lesson rewriting procedure

The companion to the Lesson rewriting guide. The guide says *what* a good rewrite looks like; this says *in what order* to do it so nothing is missed. Work the phases top to bottom. Do not edit a single sentence of prose before the structure plan (Phase 1) exists, because a sentence you polish in a section you later cut is wasted work.

Throughout, hold one invariant: **the wording changes, the curriculum and the facts do not.** If a step would alter what the lesson teaches or assert something untrue, stop and reconsider.

---

## Phase 0 — Read and inventory (no edits yet)

1. Read the whole lesson end to end, as a student would. Write one sentence stating what it teaches and the order of ideas (its "arc").
2. Note the intended audience and what they already know. This sets the bar for Phase 3's audience calibration.
3. List every section heading in order.
4. Build an **asset inventory**, the things you must not touch: runnable code blocks and their output comments, exercises (starter code and tests), external links, diagrams, and the import block.
5. Open every referenced component (diagram files, code components like `CodeVariants`/`AnnotatedCode`). They often contain prose that lives outside the lesson file. Add that prose to your edit list.

Exit check: you can state the lesson's arc and you have two lists, prose-to-edit and assets-to-preserve.

---

## Phase 1 — Plan the structure (section level, still no prose edits)

For each section, make one decision before touching words. Run this triage:

1. **Out of scope?** (legacy syntax, or a tool the course's framing won't use) → cut.
2. **A forward reference?** (explains or depends on a concept a later lesson owns) → cut.
3. **Duplicate practice?** (a second exercise or recap testing concepts already practiced) → cut; keep the one inline exercise sited where the concept is hardest.
   - Before any cut, confirm the value survives elsewhere (a retained link, a later lesson, a one-line mention). If it is the only place a real point is made, downgrade to a sentence instead of deleting.
4. **Keep?** Then check two structural rules:
   - **One idea per section.** If a section carries a tangent, cut the tangent or move it to its home section.
   - **Concept order.** Nothing may be used or explained before it is introduced. If a "when to use X" rule sits before X is defined, move it into X's section.

Record the resulting section list (kept, cut, merged, reordered). This is your map for Phase 3.

Exit check: every original section is marked keep/cut/merge/move, and the kept sequence introduces each concept before it is used.

---

## Phase 2 — Rewrite the frontmatter

1. **Title:** make it plain and descriptive of the content.
2. **Sidebar label:** match the title, or shorten it if the title exceeds ~35 characters.
3. **Tagline:** one line placing the lesson in the course at a high level; cut anything the reader already knows from context.

---

## Phase 3 — Rewrite each kept section

Process sections in order. The introduction is highest-stakes; give it the most care. For each section:

### 3a. Heading
Rewrite it to name the mechanism, not a metaphor. No clever, cringe, or idiomatic labels. Keep sibling headings parallel in structure.

### 3b. Sentence pass
Walk the section one sentence at a time. For each sentence, run this decision in order:

1. **Remove it entirely?** Cut if it is scaffolding, meta-narration, a promise, a settled-debate aside, hype, or a timestamp. If yes, delete and move on.
2. **Remove part of it?** Strip filler clauses and false transitions (phrases implying a change that never happens).
3. **Is it accurate?** Fix loose metonymy, verify the technical claim, and replace approximate words with exact ones. Correctness outranks brevity.
4. **Is it unambiguous?** Make the implicit explicit. Rewrite any phrasing that could be read two ways.
5. **Is the language plain?** Replace idioms, colloquialisms, and regional expressions with neutral American English.
6. **In-scope vocabulary?** Replace any term not yet introduced, or borrowed from a later topic, with the word this lesson uses.
7. **Then draft two or three alternatives and keep the clearest, even if it is not the prettiest.**

While here, surface decision rules: if the section defines a concept, state its "when to use this, and why" plainly (the rule the draft likely buried).

### 3c. Paragraph pass
Re-read the section as paragraphs. Merge stray one-line sentences into paragraphs where it improves flow, remove repetition across sentences, and confirm the section still reads as a single clear idea.

### 3d. Terms
Add a `<Term>` tooltip the first time a load-bearing term appears, once per term. Define it with a tooltip *or* in prose, never both. Generic-looking words (like "name", "value") still count if they are easy to misread.

---

## Phase 4 — Rewrite the prose hiding in assets

Prose lives inside components too, and that prose is in scope even though the code is not.

1. **Figure captions:** drop the caption if the surrounding prose already covers the figure; if you keep it, make it describe *every* part of the figure, not just one.
2. **Code-component captions** (`CodeVariants`, `AnnotatedCode`): tighten the explanatory text, leave the code. Generalize references to specifics that do not matter (for example, "inside `rename`" to "inside the function").
3. Touch nothing on the asset list: code, output comments, links, exercise starters/tests, diagram code, imports.

---

## Phase 5 — Verify (the gate)

Do not finish until every check passes. Re-open the original to compare.

1. **Curriculum intact?** Everything the original taught is still taught, in a valid order.
2. **Facts correct?** Re-verify every technical claim you reworded; mentally trace any code referenced in prose. The draft can be confidently wrong.
3. **Assets untouched?** Code, output comments, links, exercise tests, diagram code, and imports are byte-for-byte unchanged, except where coherence forced a change.
4. **Concept order holds?** No term or concept is used before it is introduced.
5. **Mechanics:** American English; commas or colons in place of em dashes; consistent, direct voice.
6. **Fresh read:** read the result as a new student. The intro motivates, each section is one clear idea, nothing makes you pause.
7. **Length:** typically about 30% shorter, but only as a byproduct of clarity. If you cut purely to hit a number, restore it.

If any check fails, return to the relevant phase and repeat.

---

## The loop, in brief

Read and inventory → plan the cuts and moves → fix frontmatter → per section: heading, sentence pass, paragraph pass, terms → fix prose inside assets → verify against the original and a fresh read. Wording changes; curriculum and facts do not.
