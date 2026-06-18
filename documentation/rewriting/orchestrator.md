# Lesson rewriting orchestrator

How to run a high-quality rewrite as a multi-agent pipeline. The Lesson rewriting guide says *what* good looks like and owns every editorial rule; this document says *who runs, in what order, with what inputs and outputs.* Agents are told to apply the guide, they do not re-derive its rules.

Why split the work across three roles instead of one pass: a reviewer that only critiques finds more than an agent editing on the fly, which tends to make hasty changes and then grade its own work; a rewriter that only applies changes can weigh the proposals and choose deliberately; and a verifier that only checks enforces the rules the other two might bend. Find, fix, and check stay separate.

The rule every agent inherits: **trim what the draft overdid, keep what the lesson is meant to teach, and break no fact.** The original agent usually overshoots, so cutting out-of-scope, redundant, or over-explained material is part of the job, not a violation. What stays fixed is the lesson's intended learning objectives and the correctness of whatever remains. What is free to change is the wording and the excess.

---

## Sectioning rule

A *section* is one H2 block. The frontmatter plus everything before the first H2 (the opening/intro) is treated as a single section, "Section 0". The pipeline processes sections in document order so that context accumulates correctly (see the running glossary).

---

## Roles

- **Orchestrator** (this controller): ingests the lesson, builds shared context, runs the structure plan, drives the per-section loop, and verifies the result. It makes no prose edits of its own. It applies the structural moves from Phase B (cuts, merges, reorders) as block operations on the document, defines each section's boundaries, sequences the rewriters, and reverts a section if its check fails. The prose edits themselves are made by the rewriters, in place.
- **Reviewer** (read-only): inspects the section against the whole guide and returns a list of proposed changes. It only proposes, it never edits. Run it more than once for higher recall if you like (see below).
- **Rewriter** (one per section): receives its section plus all reviewer proposals, chooses and merges the best ones, and edits that section **in place** in the document. It touches only its own section, never another section and never a protected asset within its own.
- **Verifier** (gate): checks a rewrite against the rule above and either passes it or returns it with specific failures.

---

## Shared context (built once, passed to every agent)

The reviewer cannot judge scope, concept order, or audience fit from a section in isolation, so the orchestrator builds a brief in Phase A and passes the relevant slice to each agent:

- **Arc:** one-line statement of what the lesson teaches and the order of ideas.
- **Audience:** who the reader is and what they already know (sets the bar for "don't over-explain").
- **Learning objectives:** the concepts the lesson is *meant* to teach. The orchestrator drafts them while building the brief (Phase A) and finalizes them in the structure plan (Phase B); ideally they come from the course outline, and the orchestrator infers them from the lesson only when none are given. This list may be narrower than the draft, because the original agent often overshoots. It is the bar for both what to keep and what counts as overshoot to cut.
- **Scope boundaries:** what is out of scope (legacy syntax, later-lesson topics) so the reviewer can flag forward references and dead-end tangents. Material outside the objectives is a candidate for cutting, not a thing to protect.
- **Running glossary:** terms and concepts already introduced *by the end of the previous section*. Updated after each section so the next section's reviewer can flag any term used before it is introduced.
- **Asset inventory:** the code blocks, output comments, exercises (starters/tests), links, diagrams, and imports that must stay byte-for-byte identical, plus pointers to component files that hold editable prose (captions, `CodeVariants` text).

---

## The pipeline

### Phase A — Ingest and brief (global)
Read the whole lesson and every referenced component. Produce the shared context above and the ordered section list. No edits.

### Phase B — Structure plan (global, because cuts and moves cross sections)
Run a **structure reviewer** over the whole lesson. It proposes, per section: keep / cut / merge / reorder, citing the guide's structural rules (out of scope, forward reference, duplicate practice, one-idea-per-section, concept order). For every proposed cut it must name where the value survives (a retained link, a later lesson, a one-line mention); if nowhere, it proposes a downgrade to a sentence instead of deletion.

The orchestrator resolves this into a final section map. Only surviving sections enter the loop. Reordered concepts update the planned glossary order.

### Phase C — Per-section loop (the core)
For each surviving section, in document order:

1. **Package.** Assemble: the section text (including its component prose), the shared-context slice (arc, audience, the glossary *as of this point*, scope boundaries, and this section's asset inventory).
2. **Review.** Run the reviewer over the section against the whole guide; it returns a proposal list in the contract format. (Optionally run it 2-3 times independently and take the union, when recall matters more than cost.)
3. **Hand off.** The orchestrator passes the proposals to the rewriter as-is. It does not filter or resolve conflicts; the rewriter handles overlaps and disagreements.
4. **Rewrite.** The rewriter edits its section in place per the selection rules, preserving assets, and reports a decision log (each proposal: accepted / rejected / merged, with a one-line reason).
5. **Verify** (section gate). The verifier checks the edited section against the rule above: objectives kept, no fact broken, assets untouched, and cuts limited to genuine overshoot. On failure the orchestrator reverts the section to its pre-edit state, returns the specific defects, and the rewriter retries (budget: 2). Persistent failure escalates to the orchestrator.
6. **Update context.** Add this section's now-defined terms and introduced concepts to the running glossary before moving on.

### Phase D — Whole-lesson verification
By now the document is already rewritten in place, section by section, with the Phase B reorders applied. Run a final verifier over the whole lesson: cross-section flow and transitions, a term not defined twice in different sections, concept order across the whole arc, total length as a byproduct (~30% shorter is typical), and a fresh-read pass as a new student. Output a diff against the original for human review.

---

## What the reviewer checks

One reviewer runs the whole guide over the section in a single pass. The old "angles" are just the checklist it works through, not separate agents:

- **Clarity & precision:** ambiguity, loose metonymy, implicit made explicit, exact word choice, false transitions.
- **Plain language:** idioms, colloquialisms, regional or informal phrasing, non-American spelling.
- **Concision & noise:** scaffolding, meta-narration, promises, settled-debate asides, hype, dated framing, filler, repetition, stray sentences to merge.
- **Pedagogy:** audience calibration, term definitions and `<Term>` tooltips at first use, concept order within the section, decision-rule placement, exercise siting.
- **Correctness:** the occasional factual slip or stale code reference. Errors are rare in prose like this, so it is a catch-as-you-go check, not a separate audit.
- **Frontmatter** (Section 0 only): title plainness, sidebar-label match/length, tagline concision and scope.

The reviewer carries the asset inventory and may propose edits only to prose, including captions and component text, never to protected assets.

When you want more thorough review, run the reviewer a few times independently and take the union of the genuine catches. Recall through repetition beats splitting the work by angle.

---

## Data contracts

Reviewer proposal (one per issue):

```
{
  id,                 // unique within the section
  span,               // quoted original text or a precise location
  issue,              // what's wrong, in one line
  principle,          // the guide rule it maps to
  suggestion,         // proposed rewrite, or "delete"
  severity,           // blocker | high | medium | low
  type                // clarity | concision | structure | style | correctness
}
```

Rewriter report (returned after editing the section in place):

```
{
  section_id,         // which section was edited
  decisions: [ { proposal_id, outcome: accepted|rejected|merged, reason } ],
  glossary_delta,     // terms/concepts this section now introduces
  open_questions      // anything the rewriter could not resolve safely
}
```

Verifier output:

```
{ pass: bool, defects: [ { check, detail, span } ] }
```

---

## Selection and conflict rules (for the rewriter)

1. **Correctness is mandatory.** Any `type: correctness` proposal that is valid must be applied; it is never traded away for brevity or style.
2. **Clarity outranks concision.** When a concision proposal and a clarity/precision proposal touch the same span, keep the clearer, unambiguous version even if it is longer.
3. **Prefer the proposal that best serves the student**, not the most elegant prose. When two proposals rewrite the same span differently (for example, from separate review passes), the rewriter may synthesize a new option that takes the best of each.
4. **Respect the structure map.** Do not reintroduce content Phase B cut; do not add forward references or out-of-scope terms.
5. **Reject and record.** Every rejected proposal gets a one-line reason in the decision log, so the verifier and a human can audit the call.

---

## Guardrails (what makes it survive contact with real lessons)

- **Asset protection is checked, not trusted.** The verifier diffs every protected asset against the original; any change outside an explicitly justified coherence fix is a blocker.
- **Keep the running glossary current.** A reviewer can only catch a term used before it has been introduced if it knows which terms the earlier sections already introduced. So the orchestrator keeps a running list of terms-introduced-so-far, and after each section is rewritten it adds that section's new terms to the list before starting the next one. Process sections in order, and never review a section against a stale list.
- **Retry budget.** A section gets 2 rewrite attempts against verifier feedback before escalating; this prevents infinite polish loops.
- **Improve, don't churn.** Assume every section needs work: these drafts are rarely tight, so the default is to improve, not to leave alone. The bar is on each edit, not on whether to edit. Keep a change only when it makes the prose clearer, more correct, or shorter without losing meaning; discard any rewrite that just swaps words around without improving the section.
- **Idempotence target.** Re-running the pipeline on its own output should produce few or no new proposals; a flood of new edits on a second pass signals an unstable rule, not progress.
- **Human-in-the-loop exit.** The final output is a diff plus the per-section decision logs, reviewed by a person before publish.

---

## The loop, in brief

Ingest and brief → plan structure (cut, merge, reorder) → for each surviving section: package, review against the guide, hand the proposals to the rewriter, rewrite in place by the selection rules, verify, update the glossary → verify the whole lesson, hand a diff to a human. The reviewer proposes, the rewriter integrates, the verifier gates, and through all of it the overshoot gets trimmed while the lesson's objectives and the truth of what remains stay fixed.
