# The comment that lands

Title: The comment that lands
Sidebar label: The comment that lands

---

## Lesson framing

Lesson 1 answered *what* to flag (the five-layer stack, the principle/pattern map). This lesson answers *what to write once you've decided to flag it* — the comment craft. It is a **Pattern lesson**: the two deliverables are the four-part comment anatomy and the five severity labels. Everything else (the blocking-vs-suggesting cut, the disagreement language, receiving review, the review-action calculus) hangs off those two.

Brainstorm conclusions that shape the whole lesson:

- **The pain this relieves is concrete and universal.** Every student has received a review comment that was technically right but useless — vague, wrong-severity, buried under three paragraphs, or written as a passive-aggressive question. Open on that felt pain. The senior skill isn't *being right*; Lesson 1 covered being right. It's making the right observation *cheap for the author to act on*. Frame the whole lesson as latency reduction: a well-shaped comment is acted on in five seconds; a badly-shaped one burns thirty minutes of thread.
- **The load-bearing mental model: a comment is a typed message with a severity header.** The author should be able to triage a comment — does this hold the merge or not? — *before reading the body*, the way you triage a log line by its level. The severity label is that header. This is the single idea the whole lesson orbits; state it early and return to it.
- **Show, don't lecture.** This is a lesson about writing, so the dominant teaching device is the **before/after comment pair** rendered as prose, not code. The student learns the shape by seeing a bad comment and its rewrite side by side, repeatedly. Use `CodeVariants` for these pairs (the comment text lives in a fenced block so the diff/highlight tooling and the tabbed A/B framing carry the contrast). Keep code samples minimal — the *code under review* is incidental; reuse the canonical symbols from Lesson 1 (`tenantDb`, `authedAction`, the `Result` shape) so the student isn't relearning a fake codebase.
- **The single biggest beginner failure is severity-mixing**, in two directions: marking everything `blocking:` (the author over-corrects, resents the review) and marking nothing (the author can't find the real failures in the noise). The blocking-vs-suggesting cut is the disciplinary heart; give it its own section and an exercise.
- **Second-biggest failure: epistemic cowardice** — using `question:` to soften a position the reviewer is actually certain about ("can we use `authedAction` here?" meaning "this must"). Name it bluntly; it's a senior-credibility issue, not a politeness issue.
- **Tone ages.** A snarky comment is fine in the moment and radioactive when someone reads the PR archive in eighteen months. The "address the code, not the author" heuristic and the no-snark rule are both archive-durability arguments, not HR niceness — frame them that way for this audience.
- **The lesson is two-sided.** Most of it is the reviewer writing; one section flips to the author *receiving*. Don't skip it — the student will spend more career-hours on the receiving end, and the receiving posture (respond to everything, push back with evidence, resolve honestly) is where the "blocking label is structural" idea pays off.
- **AI is in the loop two ways** and the course's standing rule applies: don't make the lesson *about* AI. (1) Agents now leave review comments (Copilot, CodeRabbit, Qodo) — calibrate, don't outsource judgment. (2) Agents author PRs that land in the same queue — same bar. Both get one tight paragraph each in the section where they're relevant, not a marquee.
- **Mentorship is the quiet payoff.** Link the lesson/convention doc when explaining a violation; the junior learns from feedback on their own code faster than from any doc they'd read cold. State it as a property of the channel, don't moralize.
- **Cognitive-load staging:** anatomy first (the container), then labels (what fills the severity slot), then the one cut that matters most (blocking vs suggesting), then the prose-level craft (disagreement language, you/we/code, question-vs-position, suggestion blocks, one-concern), then flip to receiving, then the platform-action mapping, then the meta-habits (the mirror, escalation, AI calibration). Each section adds one layer to a comment the student can already picture.

Terminology to carry forward consistently (Chapter 104 reuses it): the five labels exactly as `blocking:`, `suggestion:`, `question:`, `nit:`, `praise:` (with the trailing colon, lowercase). "Conventional Comments" as the named external standard the subset derives from. "The comment anatomy" / "the four parts." "The blocking-vs-suggesting cut."

---

## Lesson sections

### Introduction (no header)

Open on the felt pain, per framing. Concrete micro-scene: you left a comment that was *correct* — the query really does skip `tenantDb` — and three days later the thread has six replies, the author is defensive, and the fix still isn't in. The bug wasn't your judgment; Lesson 1 made your judgment good. The bug was the comment's *shape*. State the lesson's goal in one line: a small, repeatable comment shape that the author parses without translation and acts on in seconds. Bridge from Lesson 1 explicitly ("Last lesson: where the eyes go and what holds the merge. This lesson: what you write once you've decided to leave the comment.") Preview the two deliverables (anatomy, labels) and the receiving-side flip. Keep it to ~5 sentences, warm and terse.

### A comment is a message with a severity header

Establish the core mental model before any mechanics. A reviewer drops N comments on a PR; the author's first job is *triage* — which of these hold the merge, which are polish, which need an answer. The author should be able to triage each comment from its first token, before reading the body, the way you read a log line's level (`ERROR` vs `DEBUG`) before its message. That first token is the severity label. This reframes every later section: the anatomy exists to make triage cheap, the labels are the triage vocabulary, the blocking/suggesting cut is the triage decision the *reviewer* makes so the author doesn't have to guess.

Small visual aid here earns its weight: a **`Figure` wrapping a hand-built HTML/CSS "inbox" mock** — three or four stacked comment rows, each with its severity label rendered as a colored pill on the left (red `blocking:`, blue `suggestion:`, etc.) and the comment body greyed/truncated. Caption: "The author triages on the pill, before reading the body." Pedagogical goal: make the "header you read first" idea literal and visual in one glance. Keep it short (well under the height cap); this is a simple illustrative scaffold, not a system diagram. HTML+CSS per the diagram guide (color-coded segments, devtools-inspectable).

Term candidate: none new yet; this section defines the frame in prose.

### The four parts of a comment

Deliverable #1. Teach the anatomy as a fixed slot structure, in order:

1. **Severity label** — does this block the merge? (forward-reference: full label set in the next section)
2. **The observation** — the line or behavior, named concretely. Not "this is wrong" but "this query goes straight to `db.select()`."
3. **The reason** — the principle, pattern, or failure mode it trips, with a link to the lesson that owns it when relevant. This is where Lesson 1's map pays off: the reason is usually one map-row away.
4. **The action or question** — propose the fix, or ask the question the author answers. Then *stop*.

Emphasize: four parts, but usually one or two sentences total — the parts compress, they aren't four sentences. The discipline is that each part is *present*, not that it's verbose.

Teach it with `AnnotatedCode` on a single well-formed comment rendered in a fenced block: step 1 highlights the `blocking:` token (label), step 2 the clause naming the line (observation), step 3 the clause naming the pattern + link (reason), step 4 the closing fix clause (action). Pedagogical goal: make the four parts visible *inside one real comment* so the student sees how they compress into a sentence or two rather than imagining four bullet points. Use a comment that reviews one of the canonical Lesson-1 symbols (e.g. a missing `tenantDb` scope) so the code context is already familiar.

Then a tight follow: two or three more sample comments in the shape, varied severity, rendered as plain fenced blocks (not annotated — the student now reads the parts unaided). One blocking, one suggestion, one question, to preview the labels naturally.

### The five severity labels

Deliverable #2. Present the course's label set as a small, stable vocabulary. Best vehicle is a **compact reference table** (markdown table — label | when to use | does it block?), then a sentence of nuance per label below where the table is too terse:

- `blocking:` — must change before merge. Correctness, security, principle/pattern violations the codebase paid to establish. **Blocks.**
- `suggestion:` — strong recommendation; the alternative is genuinely better but the current code isn't broken. **Doesn't block** (unless the author agrees in discussion).
- `question:` — the reviewer doesn't know if it's right and wants the author to explain. Resolves into nothing (explanation fine) or upgrades to blocking/suggestion after the answer. **Doesn't block on its own.**
- `nit:` — non-blocking polish; the author may ignore. **Used sparingly** — one or two a PR, not twelve; nits drown signal. **Doesn't block.**
- `praise:` — genuine, specific praise for a non-trivial good call. **Doesn't block** (obviously). Real praise is a free morale win; rote praise is condescending.

After the table, the **`praise:` cut** gets its own short paragraph because it's the most-misused: name the specific good call ("good call keeping `authedAction` even on the internal-only path — keeps the pattern uniform"), never reflexive ("nice work!"). Three remembered praise comments a quarter, not thirty rote ones.

**Then the honest provenance note** (own subsection-worth of prose, not a separate h3): the course's five labels are a pragmatic subset of **Conventional Comments** (the public spec at conventionalcomments.org). Be precise about the relationship — and this is a place where my draft needed correcting against the spec: in the real Conventional Comments standard, the labels are `praise / nitpick / suggestion / issue / todo / question / thought / chore / note`, and **`blocking` / `non-blocking` are *decorations*** appended in parentheses (`suggestion (blocking):`), not top-level labels. The course deliberately flattens this: it promotes `blocking` to a first-class label because the single most important thing the author needs is the merge-hold signal, and a beginner reads a label faster than a parenthetical decoration. State this tradeoff plainly so the student isn't surprised when they join a team using the full spec — then they'll write `issue (blocking):` where the course writes `blocking:`. The property the standard buys, course-subset or full: **severity is parseable without reading the body.** Link the spec via `ExternalResource`.

Mark this divergence for downstream agents: the flattening of `blocking` from decoration to label is a *deliberate pedagogical simplification*, not an error — do not "correct" it back to the spec.

Exercise here — **`Buckets`**, two columns. Buckets: the five labels. Items: ~8–10 short review situations the student classifies ("the query skips `tenantDb`" → blocking; "this could be a `.map` instead of a loop" → nit or suggestion; "I don't understand why this needs a manual auth check" → question; "clean use of the Result shape on the error path" → praise; "this `as User` skips runtime validation" → blocking; etc.). Goal: drill the label→situation mapping before the harder blocking-vs-suggesting cut. Keep item phrasings *not* verbatim from the table so it's classification, not pattern-matching.

### Blocking or suggesting: decide before you type

The load-bearing section — give it room. The single most useful review discipline: the reviewer knows *before writing the comment* whether the line must change. Frame the cut sharply:

- **Blocking = objective failure.** The principle violation, the security gap, the contract drift, the test that doesn't test. There's a fact of the matter; the code is wrong against an established decision.
- **Suggesting = subjective preference.** The cleaner factoring, the alternative pattern, the nicer name. The code works; you'd have done it differently.

Then the failure mode this prevents, stated as the cost of mixing: when the reviewer doesn't make the cut, the author either treats *everything* as blocking (over-corrects, churns, resents) or treats *everything* as optional (merges past the real failures). Either way the review's signal is lost. The senior reflex: **label every comment with the severity it deserves, especially the ones that aren't blocking** — the suggestions and nits are where the discipline is visible, because labeling those honestly is what lets the author trust the `blocking:` label when it appears.

Connect back to Lesson 1's stack: layer-1 (correctness/security) and clear principle/pattern violations are almost always `blocking:`; style/polish (layer 5) is `nit:` or `suggestion:` at most. The stack layer *suggests* the severity. (Don't make it mechanical — a layer-2 principle violation that's genuinely ambiguous can be a `question:` first.)

Exercise — **`MultipleChoice`**, two or three single-answer cards, each presenting a short comment scenario and asking which severity is correct *and why*, with distractors that are plausible (the over-blocking trap, the under-labeling trap). Or one **`TrueFalse`** round of statements like "A comment proposing a cleaner factoring of working code should be `blocking:` if the reviewer feels strongly" (false) / "Labeling nits honestly is what makes the `blocking:` label trustworthy" (true). Pick MultipleChoice if the scenarios need code context; TrueFalse if the principles stand alone. Goal: force the objective-vs-subjective judgment, not recall.

### The language of disagreement

Now the prose-level craft, below the label. Teach by contrast — this is the section that most rewards before/after pairs. The good shape: **opinionated, evidence-led, short** — position + reason + ask, one to three sentences. Name the bad shapes explicitly and show each being rewritten:

Use a `CodeVariants` block (or two) with the comment text in fenced blocks, tabs labeled by the *failure*:

- **"Hedged into uselessness"** — `maybe we could perhaps consider possibly...` → the author can't tell if there's a real concern. Rewrite: state the position.
- **"Blame-laden"** — `this is wrong, did you even read the docs` → ages badly, puts the author on defense. Rewrite: neutral, code-focused.
- **"Essay-length"** — three paragraphs of context burying a one-line ask. Rewrite: the one-liner + a link for the context.

Each tab: the bad comment in the fence, one sentence naming why it fails. Then the rewritten good comment as a clean fenced block after the `CodeVariants`. Pedagogical goal: the student calibrates their own voice against three named anti-patterns they'll recognize in their own drafts.

The voice to name once: **a peer talking to a peer who shares the codebase's conventions.** Not a gatekeeper, not a supplicant.

#### Talk about the code, not the author

Subsection (h3). The second-person reflex: the comment is about the *code*, not the *person*. "This bypasses `tenantDb` — let's route it through the helper" beats "You bypassed `tenantDb`." The argument for this audience is **archive durability**, not politeness: PR threads are read months later, often by people who weren't there; "you" comments age into accusations, "the code" comments stay neutral. The heuristic: address the code by default; reserve "you" for **praise** ("nice call you made here") and **direct questions** ("can you explain why this needs the manual check?"). A tiny before/after pair (two fenced lines) carries it; no need for a full component.

#### Ask when you're unsure, assert when you're sure

Subsection (h3). The honest-question rule. `question:` is the right shape *when the reviewer genuinely doesn't know* — "is there a reason this doesn't go through `authedAction`?" signals the author may hold context the reviewer lacks, and resolves fast. But using the question shape to *soften a position you're certain about* ("can we use `authedAction` here?" when you mean "this must") is **epistemic cowardice** — name the term. It adds a round-trip (the author answers the literal question instead of acting), softens the signal, and erodes the reviewer's credibility over time. The cut: **questions when uncertain, positions when certain, never questions to dodge a position.** This pairs tightly with the blocking-vs-suggesting cut — a `question:` that's really a `blocking:` in disguise is the same disease as an unlabeled blocker.

### One comment, one concern

Short, sharp section. A comment that bundles three observations forces the author to accept or reject them as a unit — the thread can't converge. Split them: one concern per comment, each ack-able / fixable / push-back-able on its own. The corollary is a nice senior move: **if three concerns genuinely cluster on one line, the line is doing too much** — and the real comment is "this function needs to split before any of these can be addressed cleanly" (which is itself one concern). Illustrate with a single before/after: a bundled three-in-one comment → three separate one-liners. Fenced blocks, no heavy component.

### The suggestion block: when the fix is one click away

Platform mechanic worth one focused section because it's a real latency win and beginners under-use it. Most platforms (GitHub, GitLab, Graphite) support a ```` ```suggestion ```` markdown block in a review comment that renders as a proposed diff the author applies with one click (and can batch into a single commit). The threshold to teach: **under ~five lines and one obviously-correct edit** — a renamed identifier, a missing `await`, a one-line wrapper swap — use the suggestion block; it removes a manual step for the author. **Above that, or when the fix isn't mechanical, write prose** — a 40-line rewrite doesn't belong in a suggestion block, the comment is the wrong surface for a redesign.

Show the literal GitHub syntax in a fenced block (the ```` ```suggestion ```` fence inside a comment) reviewing a small canonical fix — e.g. swapping `db.select()...` for the `tenantDb(orgId)` call, or adding a missing `await`. Note the multi-line variant exists and applies as one commit. Keep it platform-light: the syntax is GitHub's but the *posture* (mechanical fix → suggestion, design change → prose) is platform-agnostic; say so. (Chapter outline says platform UI tours are out of scope — honor that: show the one piece of markdown syntax that's load-bearing, skip the screenshots.)

### Receiving the review

Flip the chair. The student spends more hours as author than reviewer; the receiving posture is where the labels prove they're structural, not decorative. Teach three reflexes:

- **Respond to every comment** — even a 👍 or "done in `<commit>`". Silence leaves the reviewer guessing whether it was seen. (This is the symmetric payoff of "one comment, one concern": each gets a cheap individual ack.)
- **Push back with evidence, don't defer.** A reviewer can have a bad day; an incorrect comment shouldn't merge into the codebase just because it's a reviewer's. Where the author has evidence, they defend the design — neutrally, with the same code-not-person discipline. The asymmetry to state: the author owns the code's correctness as much as the reviewer does; deferring to a wrong comment is as bad as ignoring a right one.
- **Resolve threads honestly.** Resolving "I'll do it next PR" is a lie the archive remembers; resolving "fixed in `<commit>`" is correct. Resolving-as-ignored (closing the thread without addressing the comment) is the author-side version of the drive-by approval.

The one non-negotiable, tied back to the core model: **a `blocking:` comment is structural** — you don't 👍 it and merge anyway. The label means the merge waits. If you disagree with a blocker, you argue it down to a non-blocker *in the thread*; you don't route around it.

Exercise candidate (optional, if the lesson needs another beat here): a small **`MultipleChoice`** — "The author disagrees with a `blocking:` comment they believe is wrong. The right move is…" with the honest answer (push back with evidence in the thread; don't resolve-and-merge) against tempting distractors (just merge, just comply, DM the reviewer to avoid the record). Goal: cement that the blocking label is structural from the receiving side.

### Match the review action to the comments

The `approve` / `comment` / `request changes` calculus, kept tight. The senior cut: the review *action* should mirror the *severities*, not the reviewer's mood.

- **`request changes`** ⇄ at least one `blocking:` comment exists. The state reflects that the merge waits.
- **`approve` (with comments)** ⇄ only `suggestion:` / `nit:` / resolved `question:` remain — the author is trusted to address or not, and can merge.
- **`comment` only** — the default during back-and-forth, before a final state is warranted.

State the property once: review *state* tracks comment *severities*. The drive-by failures map cleanly here — drive-by `approve` (clicking approve without reading, especially on a trusted teammate's PR) and drive-by `request changes` (blocking on style) are both the *action* decoupling from the *content*. Same bar for everyone, both directions — don't soften for the senior teammate, don't over-block the junior.

A compact reference table works well (action | when | what must be true of the comments). No exercise needed; this is reference the student maps mechanically.

### Habits that keep reviews honest

Gather the meta-disciplines that don't each need a section but matter. Three short beats:

- **The "what would I want to see" mirror.** Before submitting, re-read the comments as the author: severities right? asks actionable? reasons named and linked? Sixty seconds, every review. Catches the comment that landed as "I don't like this" instead of "this conflicts with pattern #N." This is the single habit that operationalizes the whole lesson — call it that.
- **Escalate at three round-trips.** When a thread crosses ~three exchanges without converging, the disagreement is structural and the async surface is wrong — pull it into a 15-minute call, decide, and **capture the decision back in the PR** (or as an ADR if it's architectural — forward-link Chapter 104, which writes one). The PR comment thread is not the place to litigate a big design move.
- **Mentorship is a side effect of linking.** When a comment explains a principle/pattern violation, link the lesson or convention doc that owns it ("see Chapter 056 on `tenantDb`"). Costs the reviewer a minute, saves the author an hour of context-hunting, and compounds the team's competence over months. State it as a property of the review channel — feedback on your own code teaches faster than any doc read cold — and move on; don't moralize.

### Reviewing in a queue full of agents

The AI calibration, contained to one section per the standing rule (don't make the lesson about AI). Two short paragraphs:

- **Agent-authored PRs get the same bar.** When a coding agent opens a PR, the diff lands in the same queue and gets the same checklist — the bar doesn't soften because "the AI should get it right," and it doesn't tighten into disproportionate nitpicking because "it's just a bot." Same comment shape, same severities. The checklist works on agent code for the same reason it works on human code: the principles and patterns are stable. (One sentence on the characteristic agent failure shape, already named in Lesson 1: re-inventing an existing wrapper, plausible-but-tautological tests, drifting from `AGENTS.md`.)
- **Agent-authored *comments* get calibrated, not obeyed.** Tools like Copilot review, CodeRabbit, and Qodo now leave their own comments on PRs. Read them like a junior reviewer's comments — sometimes load-bearing, often noise. The human dismisses the noise, ack's the right ones, and **doesn't outsource the judgment.** The label discipline applies to the agent's comments too: a bot's `blocking:` is a claim to verify, not a gate to obey.

Term: none required; keep it prose.

### Capstone exercise — `CodeReview`

The lesson's synthesis, placed last so it exercises *everything*. Use the **`CodeReview`** component — it's purpose-built for exactly this (student clicks diff lines, leaves inline comments, AI grades each against a `kernel`). This is the dress rehearsal for the Chapter 104 project.

Construction notes for the build agent:

- **Diff:** a small multi-file PR (two files) reusing Lesson-1 canon so the *finding* is familiar and the lesson is purely about the *comment*. Suggested plants (3–4, mapped to severities so the student practices labeling, not just spotting):
  - A query that skips `tenantDb(orgId)` → a `blocking:` finding (layer-1 security + pattern #1). `kernel`: "query bypasses the tenant-scope helper `tenantDb`; this leaks across orgs".
  - A Server Action that `throw`s on a validation failure instead of returning the `Result` shape → `blocking:` or `suggestion:` depending on framing; set the kernel to the contract drift. `kernel`: "validation failure should return `{ ok: false, error }`, not throw".
  - A genuinely clean choice on another line (e.g. correct `authedAction` use on an internal path) → a `praise:` opportunity. `kernel`: "internal path still uses `authedAction`, keeping the pattern uniform — worth a praise note". (Tests the student's instinct to praise specifically, and that praise is a real review move.)
  - Optionally a pure style nit the formatter would catch → the *correct* action is **not** to comment (or to mark `nit:` at most); seed it to test the "what doesn't get a comment" restraint from Lesson 1. If the component can't grade an *absent* comment, fold this into the `ReviewWhy` debrief instead of a plant.
- **`instructions`:** prime the student to **label every comment with one of the five severities and keep each to the four-part shape** — this is what makes the exercise test *this* lesson rather than just Lesson 1's spotting.
- **`ReviewIssue` reveal text:** model the ideal comment in the four-part shape for each plant, so the post-submit reveal *is* a worked example of the lesson's deliverable.
- **`ReviewWhy`:** debrief on the meta-skill — the student who labeled severities correctly and wrote actionable asks did the lesson's job; spotting the bug was Lesson 1.

Pedagogical goal: the student produces real review comments under grading, closing the loop from "recognize a good comment" (earlier exercises) to "write one." Note the component grades comment *substance* against the kernel via BYOK OpenRouter and degrades to line-grading without a key — fine either way for a capstone.

### External resources

`ExternalResource` cards (one or two, not a wall):

- **Conventional Comments** (conventionalcomments.org) — the full standard the course's labels subset.
- Optionally one strong essay on code-review tone/practice if a durable, vendor-neutral one is picked (avoid platform-marketing posts). Reviewer/build agent's discretion — skip rather than link something that ages.

Video: optional, not required. If the resourcer finds a short, durable talk on review *communication* (not a platform demo), a `VideoCallout` could sit near the disagreement-language section. Low priority; the lesson is writing-craft and reads better than it watches. Don't force one.

---

## Terms for `Term` tooltips

Be strategic; only terms that support the goals and might trip this audience:

- **Conventional Comments** — name + one-line definition at first mention (the inline `ExternalResource` may suffice; a `Term` is fine if it appears in prose before the resource card).
- **Epistemic cowardice** — coined-feeling term used deliberately in the question-vs-position section; a one-line `Term` gloss ("dressing a certain position as an open question to avoid committing to it") lands it without a digression.
- **`tenantDb` / `authedAction` / the `Result` shape** — these are Lesson-1 canon and assumed known; do **not** re-teach. If a quick reassurance is wanted at first reuse, a one-line `Term` ("the tenant-scoped query helper from Chapter 0XX") is acceptable, but prefer trusting the prerequisite. (See Scope.)

---

## Scope

**This lesson covers:** the four-part comment anatomy; the five severity labels (`blocking:`, `suggestion:`, `question:`, `nit:`, `praise:`) and their Conventional Comments provenance; the blocking-vs-suggesting cut; the disagreement language (opinionated/evidence-led/short, code-not-author, question-vs-position, one-concern); the suggestion-block mechanic; receiving review; the review-action calculus; the meta-habits (mirror, escalation, mentorship-via-linking); and AI calibration on both authored PRs and authored comments. Capstone `CodeReview` exercise.

**Explicitly out of scope — do not teach:**

- **What to look for in the first place** — the five-layer review stack and the principle/pattern map are **Lesson 1** of this chapter. This lesson assumes the student has *already decided* a comment is warranted; it starts at "what do I write." Reference Lesson 1's stack and map (the severity often follows the stack layer) but do not re-derive them. Reuse Lesson 1's canonical symbols (`tenantDb`, `authedAction`, `Result` shape, `processed_events`) and the principle/pattern numbering exactly.
- **The seven principles / fifteen patterns themselves** — they live in the lessons that established them (and were tabulated in Lesson 1). Reference and link; never re-teach. When a comment's "reason" names a principle, point to its owning lesson, don't explain it.
- **The hands-on end-to-end PR-review project** (a real seeded PR reviewed start to finish, plus an ADR) — **Chapter 104**. The capstone `CodeReview` here is a single focused rehearsal, not the project; keep it scoped to comment-craft, don't let it grow into the project.
- **Platform UI tours** — GitHub/GitLab/Graphite review interfaces, button-by-button. Out of scope. The one exception is the load-bearing ```` ```suggestion ```` markdown syntax, shown once because the syntax itself is the teachable thing; everything else is posture, stated as platform-agnostic.
- **Team-process meta** — review-load rotation, CODEOWNERS, ownership/routing files. Out of scope; the lesson is about the comment, not who gets assigned it.
- **Synchronous review / pair-programming protocols** — out of scope. The lesson is async-review-default; the only sync touch is the "escalate to a 15-min call at three round-trips" reflex, which is about *exiting* async, not a sync protocol.
- **Re-teaching ADRs** — the escalation reflex forward-links Chapter 104's ADR; ADR mechanics were taught in Chapter 101 and aren't re-explained here.

**Prerequisites to assume (redefine in one line at most if reused):** Lesson 1's review stack and principle/pattern map; the canonical symbols above; that the student knows what a PR diff and inline comment are (taught earlier in the Git/collaboration units — no re-teach).
