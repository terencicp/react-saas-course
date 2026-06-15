# Improving the course prose: diagnosis and recommendations

*Revised June 14, 2026, after reviewing the existing authoring pipeline and the `lesson-prose-polisher` agent. This version corrects the first draft, which diagnosed pre-polish lessons and recommended tooling you had already built.*

## Bottom line

You are further along than the raw lessons suggest. You already have a `lesson-prose-polisher` that encodes a real style guide (no em-dashes, no self-praise, no aphorism pile-ups, split overloaded sentences, with contrastive calibration pairs). On the chapters where it has run, it works: em-dash density drops about 80% and self-praise goes to zero.

So the problem splits into two layers:

1. **Mechanical tics** (em-dashes, self-praise, barked fragments, overloaded sentences). Your polisher already fixes these well. It just hasn't been run past chapter 37, which is why the chapter 48 lessons read badly.
2. **The residue the polisher cannot reach**: teaching stance (performed seniority), explanation structure, and condescension that is not a surface tic. A rephrase-only, paragraph-local pass cannot touch this. This is the real target.

The recommended path: finish the polish pass you already have, build a rewrite brief *from your own hand-edits* rather than from a single ideal sample, then run a deeper multi-agent rewrite pipeline aimed only at layer 2. Treat any linter as a mechanical detector, never a quality judge.

## The correction up front

The lessons you pointed me at (chapters 48-49) have not been through your polisher. Git shows the polish pass has reached chapter 37. Measured side by side:

| | em-dashes / 1k words | self-praise hits / 1k | senior-status tics / 1k |
|---|---|---|---|
| Polished (ch 36-37) | ~3.7 | 0.0 | 0.3-0.8 |
| Unpolished (ch 48-49) | ~17 | ~0.7 | 1.0-1.5 |

I also read a polished lesson (037.1) for tone. It opens on a concrete scenario, stays calm, and the "arrogant narcissist" quality is mostly gone. Your reaction was to raw, pre-polish output. That is good news: most of what you disliked is already solved by a pass you have built but not yet run everywhere.

## What's actually wrong, by layer

### Layer 1: mechanical tics (already handled when the polisher runs)

Em-dash overload, self-praise ("the most important reflex in the lesson"), aphorism pile-ups ("X, not Y" snaps), barked fragments, and three-idea sentences. These are generic AI tells and your polisher targets each one. Nothing new to build here. The fix is operational: run it.

### Layer 2: stance and structure (the open problem)

Even after de-ticking, the lessons carry a teaching *stance* that reads as superior: the constant framing of each point as "the senior reflex," the imagined-wrong-instinct-then-correction move ("The instinct of a careful engineer... Resist that"), and importance announced rather than shown. None of these are surface phrases a rephrase removes. They live in how the lesson is built and whom it positions the reader as. Your students are juniors from other fields; the voice often talks to an imagined senior peer instead.

### Why a single self-polish plateaus

The deep reason your instinct ("a clear sample won't make the model a clear writer") is correct: the judgment you are asking the model to apply, *is this clear and natural?*, is the same judgment that produced the tics. The model rates its own house style as natural, so any single agent grading its own prose converges on its own defaults. This is why the polisher helps but does not fully convince, and why the fix has to come from **outside the model's self-assessment**: from your edits, and from an adversarial critic that is separate from the writer, not the writer grading itself.

## The plan

### 1. Finish the polish pass you already have (do first, cheapest)

It has only reached chapter 37. Running it through chapter 107 removes most of what you reacted to, at low cost, with a tool you already trust. Decide everything else *after* you have seen fully-polished output.

**Decisive experiment:** run the polisher on one chapter-48 lesson now and read it. That separates "un-run polish" from "true residue," and tells you how much of the deeper pipeline you actually need.

### 2. Build the rewrite brief from your own edits (replaces "write one ideal sample")

Your idea here is the right one and is stronger than a static gold sample. Do it in this order:

1. Hand-rewrite a few lessons (3-5), chosen to be diverse: a concept-heavy one, a procedural one, and a project one. Keep each as a before→after diff.
2. Have the model read the diffs and extract explicit rules, each rule paired with a real before→after quote from your edits.
3. Add the rules you noticed yourself while rewriting, which the model will miss.
4. Review the model's output and cut what it over-generalizes. Combine the result into the rewrite guide.

Why this beats an ideal example: it gives the model the *transformation* rather than just the endpoint, it converts tacit taste into *explicit* rules, and it anchors those rules to *your* judgment of clarity, which is the external calibration the model cannot generate on its own. Your polisher already proves the mechanism: its calibration pairs move the numbers more than abstract instruction does. This guide is the single highest-value artifact in the whole effort.

### 3. The deeper rewrite pipeline (for layer 2, mirrors your authoring pipeline)

Your six-stage proposal is a good instinct and maps onto what you already run (writer → reviewer → corrector). Refinements:

- **Replace "concept → implementation plan" with one located diagnosis.** For prose those two stages collapse. What earns its keep is a specific, quoted, per-lesson diagnosis: the exact spans that fail, why, and the effect on the reader. Generic "make it clearer" produces generic edits. Let the diagnosis route the depth: light resurface vs deep restructure, the way your orchestrator routes chapters.
- **Force reviewers to quote evidence and give them reject-criteria.** A reviewer that can only say "looks good" is dead weight. Require span + named fault + suggested fix, judged against the rewrite guide from step 2.
- **Add a technical-fidelity guard the polisher lacks.** A deep rewrite, unlike a rephrase, can silently change a claim, a number, or a code reference. One stage should diff code blocks, terms, and factual claims before/after and *block* on any change.
- **Add an anti-blandness guard.** Aggressive de-ticking sands prose into lifeless oatmeal. One reviewer should check the rewrite still has a point of view and is pleasant to read.
- **Make the critic a separate, differently-primed pass**, never the writer grading itself. Prime it to hunt faults ("this is AI prose; find every tic and every spot a newcomer is talked down to; quote them"), which beats asking it to judge quality.
- **Work per section, not per lesson.** Smaller diffs review better and keep edits focused.

On the reader-simulation agent: you are right to be skeptical, so I am pulling it from the core design. A model reads its own "ideal" prose with full author knowledge and will not feel the load a real novice feels, so its comprehension signal is unreliable. Keep only the textual condescension critic above (detecting stance is pattern-spotting, which models do adequately). The genuine reader-difficulty signal comes from **humans**: spot-check a sample of rewritten lessons with real readers, which matches the "human curation" your AGENTS.md already commits to.

### 4. Sequencing against the old guidelines (isolate, don't delete)

Your point about stale instructions re-anchoring the agents is real, but the bigger anchor is the one you are not counting: the **existing lesson prose itself**. When a rewrite agent reads the current lesson to rewrite it, the strongest voice signal in its context is that tic-laden text on the page. Deleting the pedagogical guidelines will not stop it imitating what it is editing. The lever is to frame the current prose as the negative example in the rewrite prompt ("this voice is being removed; transform toward the guide").

On deletion itself: isolate, don't delete. Your chapter outlines also carry scope, which you will want for maintenance; a rewrite does not need scope because the lesson already exists, so simply don't feed those files to the rewrite agents. Control the agent's context, not the filesystem. Your "new rewrite guide" is really your rewritten brief, which is the right artifact at the right time. Wait for authoring to finish before the full rollout to avoid double work, but pilot the pipeline now on two finished lessons, so you find its failure modes on lesson 2 rather than lesson 300.

### 5. A mechanical detector (optional, lowest priority)

You were right that no linter can tell a good explanation from a badly built one, and I oversold it. The one narrow job left is something you already do: your polisher greps for em-dashes because they are mechanically detectable. A linter is that grep extended to the other mechanical tics (the "X, not Y" string, "most important", senior/reflex, over-length sentences), so the agent receives flagged lines instead of being asked to find its own, closing the self-detection gap exactly where it is reliable. It feeds the agents; it never judges quality. If the wiring is not worth it, skip it.

## What the two layers look like

The same passage from 48.1 at three stages shows what each layer does and where the deeper pipeline earns its place.

**Original** (tics and stance):

> Resend authenticates your sends with an API key, and the way you handle that key is a small but pure test of senior instinct. There are two axes to get right. The first is **shape**... The reflex follows from least privilege: your *running application* gets a sending-only key, because sending is the only thing it needs to do.

**After the polisher** (tics gone, stance survives):

> Resend authenticates your sends with an API key, and handling it well is a small test of senior instinct. Two things matter. First, shape. Resend issues keys at two levels... The reflex follows from least privilege: your running app gets a sending-only key, because sending is all it needs to do.

**After a deep rewrite** (stance gone, consequence shown, reader not cast as the junior):

> Resend authenticates every send with an API key, and you choose how much each key can do. There are two permission levels. A full-access key can do anything your account can: create domains, manage webhooks, read everything. A sending-only key can only call the send endpoint. Give your running app a sending-only key, because sending is all it does. If that key leaks, the damage stops at unwanted email: the attacker still cannot delete your domain or read your data.

The polisher gets you from the first to the second cheaply. Only the human-built brief plus the deeper pipeline gets you to the third.

## Order of work

1. Run the existing polisher on one chapter-48 lesson; read it; decide how much residue remains.
2. Finish the polish pass through chapter 107.
3. Hand-rewrite 3-5 diverse lessons; have the model derive the rewrite guide from your diffs; add your own rules; prune.
4. Pilot the deep rewrite pipeline on two already-polished lessons; tune the diagnosis and reviewer criteria.
5. Roll out after authoring completes; isolate the old voice/scope docs from the rewrite pipeline; frame existing prose as the negative example; spot-check a sample with real readers.
6. (Optional) wire mechanical tic-detectors into the CI gate to prevent regression.

Steps 1 and 2 resolve most of your visible complaint with tools you already have. Steps 3 and 4 are where the genuinely deeper, thoughtful rewrite lives.

## Sources

- [Curse of Knowledge in Technical Writing — Earthly](https://earthly.dev/blog/curse-of-knowledge/) and [Learnnovators: why experts struggle to teach](https://learnnovators.com/blog/the-curse-of-knowledge-why-experts-struggle-to-teach/)
- [Cognitive Load Theory for writing](https://readabilityformulas.com/improve-your-writing-style-with-cognitive-load-theory/) and [plain-language basics](https://www.stylemanual.gov.au/blog/basics-plain-language)
- [Multishot prompting — Anthropic docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting) and [positive framing beats prohibitions](https://www.getsyspro.com/newsroom/how-to-stop-claude-from-using-em-dashes/)
- [Draft → Critique → Rewrite loop](https://appliedaihub.org/blog/recursive-reflection-prompt-trick/)
