sources:
  103.1: Where the eyes go first
  103.2: The comment that lands

questions:
  - source: 103.1
    question: |
      A 30-file PR is open. A teammate reviews it top-to-bottom, file by file, flagging anything that looks off as they go. Why is that the wrong default — even though it feels thorough?
    choices:
      - text: |
          File order sorts the diff by position, not by risk — attention drains on cheap stuff near the top, so the dropped tenant filter on line 200 gets a tired skim.
        correct: true
      - text: |
          Reading in file order is fine; the real mistake is not leaving a comment on every file so the author knows it was read.
        correct: false
      - text: |
          A diff that large should never be read at all — the only correct move is to reject it unread.
        correct: false
    why: |
      Attention is finite and drains as you read, so the order you spend it in is the whole game.
      File order has nothing to do with severity, so the most expensive bug gets the least attention just because it lived near the bottom. The fix isn't more comments or auto-rejection — it's running the *stack* top-down (correctness and security first, polish last) instead of the *file* top-down.

  - source: 103.1
    question: |
      While scanning a diff you spot `db.select().from(invoices)` with no org filter. The pattern map files this under pattern #1 ("use `tenantDb`"), a layer-3 concern. How should you actually treat it?
    choices:
      - text: |
          As a layer-1 security finding that holds the merge — the consequence is one tenant reading another's rows, and the higher layer's severity wins.
        correct: true
      - text: |
          As a layer-3 style nudge — it's on the pattern map, so it's a convention reminder, not a blocker.
        correct: false
      - text: |
          As a layer-5 polish note — it's a one-line fix, so its severity is low.
        correct: false
    why: |
      The same defect can sit on two layers, and when it does the higher layer wins.
      A missing tenant filter isn't just a skipped convention — it's a cross-tenant data leak, which is a layer-1 correctness/security finding that blocks the merge. Where a defect lands is decided by what a miss *costs*, never by which checklist or how small the fix.

  - source: 103.1
    question: |
      Which of these belong on the human reviewer's beat — the things worth a comment? Select all that apply.
    choices:
      - text: |
          A new helper file dropped in `/utils/` instead of its feature module.
        correct: true
      - text: |
          A test that asserts a mock was called rather than the behavior a user would notice.
        correct: true
      - text: |
          Inconsistent indentation and quote style the formatter would rewrite.
        correct: false
      - text: |
          "I'd have used a ternary here instead of an if/else."
        correct: false
    why: |
      The review defends the principles and patterns; it does not enforce taste or do the toolchain's job.
      The misplaced file breaks co-location (#1) and the tautological test fails layer 4 — both are invariant defense only a human does. Formatting belongs to Biome, and a ternary preference is you projecting your hands onto someone else's working code; neither is on the map, so neither is your beat.

  - source: 103.2
    question: |
      A reviewer is certain a path must go through `authedAction`, but to seem collaborative they write: "Can we maybe use `authedAction` here?" Why is that the wrong shape?
    choices:
      - text: |
          It dresses a position as a question to dodge committing to it — the author answers "yeah, we can" instead of acting, softening a real requirement into an idle musing.
        correct: true
      - text: |
          Questions are never allowed in review comments; every comment must assert a position.
        correct: false
      - text: |
          The phrasing is fine — softening a demand into a question is what keeps reviews collaborative.
        correct: false
    why: |
      Questions are for when you're genuinely uncertain; positions are for when you're sure. Using a question to soften a certainty is epistemic cowardice — and it's a credibility issue, not a manners one.
      It adds a round-trip, hides the merge-hold signal, and over time trains the team to distrust both your questions and your assertions. Say what you mean and label it for what it is.

  - source: 103.2
    question: |
      A working function does its job correctly, but the reviewer is convinced — strongly — it would read better split in two. What severity label fits?
    choices:
      - text: |
          `suggestion:` — the code works, so a cleaner factoring is a preference, not a decision the codebase already made.
        correct: true
      - text: |
          `blocking:` — the reviewer holds the view strongly, and strong conviction is what makes a comment blocking.
        correct: false
      - text: |
          `question:` — phrase it as a question so the author doesn't feel pressured.
        correct: false
    why: |
      The cut is objective failure versus subjective preference: can you finish "this is wrong because the codebase already decided ___"? Here the honest ending is "...because I'd have done it differently," so it's a suggestion.
      Strength of feeling isn't an objective failure, so `blocking:` is the over-blocking trap. And `question:` would dodge a position the reviewer actually holds — state it as the suggestion it is.

  - source: 103.2
    question: |
      You're the author. A reviewer left a `blocking:` comment, but after a careful re-read you're confident the code is correct and the blocker is mistaken. What's the right move?
    choices:
      - text: |
          Reply in the thread with the evidence, argue the label down to a non-blocker in the open, and merge only once that's resolved.
        correct: true
      - text: |
          Apply the change anyway — conceding is faster, and the reviewer's call carries more weight on their own comment.
        correct: false
      - text: |
          Resolve the thread yourself and merge, since you've already satisfied yourself the code is correct.
        correct: false
    why: |
      A `blocking:` label is structural — it says the merge waits — so the honest path is to settle it where the label lives: in the thread, with evidence.
      Applying a change you believe is wrong ships bad code as surely as ignoring a right comment; you own correctness as much as the reviewer does. Resolving-and-merging routes around the blocker, pretending the label wasn't there.
