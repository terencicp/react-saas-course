# Chapter 082 — Lesson 3 outline

## Lesson title

- Full: **Finding 2: the XSS HTML sink**
- Sidebar: **Finding 2: the XSS sink**

The chapter-outline title fits. Keep it; it parallels the other finding-lesson titles ("Finding N: …") and names the defect class directly.

## Lesson type

**Implementation**

Finding-writing lesson on an audit project: the "feature" the student ships is the Markdown finding file `findings/002-xss-html-sink.md`, written against the brief and the lesson test. The test-coder runs (fills `tests/lessons/Lesson 3.test.ts`). The audit target is read-only — the student documents the seeded defect, never patches it.

## Lesson framing

The student walks away having caught a stored-XSS sink on the first read of the rendered DOM and written it up to the report's contract: the `dangerouslySetInnerHTML` on user-submitted invoice notes, named against the operator-trustworthiness rule, with the senior fix that sanitizes at write *and* read (not write-only) and is explicit that a strict CSP is the backstop, never the substitute. The senior payoff is the reflex that a single grep plus a glance at the live page surfaces the most dangerous class of bug a SaaS ships, and that the fix is a two-layer threat model (sanitize the sink + CSP backstop) split into two scored findings, not one.

## Codebase state

### Entry

- The audit target runs locally (Lesson 1 setup complete): dev server on `:3000`, signed in as `alice@example.com`, Postgres seeded.
- `findings/` holds `template.md`, eight skeleton placeholders, `out-of-scope.md`, `SUMMARY.md`. `findings/001-fail-closed.md` is filled (Lesson 2's worked example). `findings/002-xss-html-sink.md` is still a 4-section skeleton with its `TODO(L3)` comment.
- The seeded defect is live: `src/app/(protected)/invoices/[id]/notes.tsx` renders `note.body` through `dangerouslySetInnerHTML` with a `biome-ignore` directive on the sink line; the seed plants a note whose body is `Customer asked us to mark this <b>bold</b> — follow up next week.` at invoice id `00000000-0000-7000-8000-ace000000001`.
- The audit method (open running app + source side-by-side, grep-driven, write-the-finding-before-moving-on) was established in Lesson 2 and is reused here, not re-taught.

### Exit

- `findings/002-xss-html-sink.md` has all four template sections (Rule / Location / Consequence / Fix) populated plus a justified severity; the seeded defect is unchanged.
- `pnpm test:lesson 3` passes (finding-shape assertions + source-shape probe that the sink is still present).
- The audit target still runs unchanged. No source file edited; only `findings/002-xss-html-sink.md` written.

## Lesson sections

Render the Implementation section list from the contract.

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: catch the unsanitized-user-content sink on the invoice-notes surface and document it as `findings/002-xss-html-sink.md`. Then a one-paragraph description (or a small `Screenshot`) of the fingerprint working: opening `/invoices/<seeded-id>` paints the planted note's word **bold** as a live `<b>` element instead of the escaped text `&lt;b&gt;bold&lt;/b&gt;` — the visible tell. Keep it to a couple of sentences; the finished "result" is the written finding, not a UI feature.

### Your mission (header: "Your mission")

Coherent prose, no subsection headers, no implementation hints in the brief.

**Feature (one or two sentences, user terms):** Surface and document the XSS HTML sink — the user-submitted invoice-note body that renders as raw HTML — as a complete finding in the report.

Weave into the opening paragraph:
- The audit step: a single grep, `rg -n "dangerouslySetInnerHTML" src`, then examine every hit (exactly one here). The `biome-ignore` directive sitting on the sink line is a *tell, not a clearance* — the lint rule already flagged it; the ignore only silences the gate so the seeded target ships green.
- The running-app confirmation: the seeded note (`pnpm db:seed` prints the path; invoice id `00000000-0000-7000-8000-ace000000001`) renders `<b>bold</b>` as live markup. `<b>` is the tame proof; the same path renders `<img src=x onerror=…>` or `<script>` with identical trust.
- The rule (named, not hinted as fix): rendered content is operator-trustworthy or it is not — user-submitted content is never operator-trustworthy without sanitization (chapter 080 lesson 2 + chapter 081 lesson 1).
- **Constraints** (non-functional, shape the solution): the finding must obey the report template (the contract); the consequence must read in user-visible terms with no "could potentially" hedging; the audit is read-only (fix is a paragraph, not a diff).
- **The two traps to pre-empt** (these are the senior decisions the brief surfaces): (1) "I'll just sanitize at write" misses the historical-data vector — rows written before the sanitizer shipped still carry the payload, so the fix sanitizes at write *and* read and stores the sanitized output; (2) treating this and the missing CSP (finding 4) as one issue — they are two findings against one threat model (the sink vs. the missing defense-in-depth layer), and a strict CSP with a nonce does not save an `<img onerror>` payload.
- **Out of scope:** the adjacent sink shapes the same eye should recognize (`eval`, `new Function`, string-bodied `setTimeout`/`setInterval`, direct `el.innerHTML =`) — none seeded here, recognition-only, documenting them is out of scope unless a hit appears. Also out of scope: patching the target.

Then the requirements checklist — the only list in the section, rendered with `Checklist`/`ChecklistItem`, each item tagged `[tested]` or `[untested]`. Phrase each as a verifiable outcome, never as a file/export. The Lesson 3 test asserts (1) the finding file carries the four populated sections, (2) the named XSS rule appears, (3) the location names a command/file, (4) the fix names the senior reach, and (5) a source-shape probe that the seeded sink is still present. Map the requirements:

1. `[tested]` The finding file's four template sections (Rule, Location, Consequence, Fix) are all populated.
2. `[tested]` The finding names the XSS / operator-trustworthiness rule, linked to its source lesson (chapter 080 lesson 2, chapter 081 lesson 1).
3. `[tested]` The Location section names the grep command (`dangerouslySetInnerHTML` across `src`) and the file + line range it surfaced.
4. `[tested]` The Fix section names the senior reach — sanitize at write and read, store the sanitized output.
5. `[tested]` The seeded sink is still present in `src/app/(protected)/invoices/[id]/notes.tsx` (read-only audit confirmed).
6. `[untested]` The finding is confirmed against the running app: the seeded note's markup renders as raw HTML rather than escaped text.
7. `[untested]` The Fix explicitly addresses the historical-data vector a write-only sanitizer misses.
8. `[untested]` The finding records that a strict CSP (finding 4) is the complementary defense-in-depth layer, not a substitute for sanitizing the sink.
9. `[untested]` A severity is assigned and justified in two lines.
10. `[untested]` The Location records the `biome-ignore` directive as a tell that does not retire the finding.

### Coding time (header: "Coding time"; writer wraps the solution in `<details>`)

One line directing the student to write `findings/002-xss-html-sink.md` against the template and the brief, then read the worked solution.

The hidden solution reproduces the completed `findings/002-xss-html-sink.md` as it lands in the repo (source of truth: `projects/Chapter 082/solution/findings/002-xss-html-sink.md`). Organize it as the four template sections and walk:
- **Location evidence** — the single grep returning one hit (`notes.tsx:37`), the `biome-ignore` directive on line 36 as a tell, and the running-app fingerprint (the planted note body, the live `<b>` vs. escaped text). Show the seeded sink as a `Code` block lifted from `notes.tsx` (the `dangerouslySetInnerHTML={{ __html: note.body }}` line in context) so the student sees exactly what the grep hit.
- **Rule** — one sentence naming the operator-trustworthiness rule; link chapter 080 lesson 2 and chapter 081 lesson 1 by section, do not re-explain.
- **Consequence** — stored XSS reachable in any org's invoice notes; an attacker plants a note that runs in a later reader's authenticated session (reads session, fires mutations, phishes). Framed in user-visible terms, no hedging.
- **Fix** — the write-and-read sanitization choice with `DOMPurify` named, the sanitized output stored, the historical-data vector and one-time backfill called out, and the honest minimum (escape to plain text; widen to an inline allow-list only if the product needs rich notes). Use a short `Code` snippet for the structural fix (sanitize-on-write in the Server Action + sanitize-on-read at the sink) — illustrative, no full diff. Explain (one or two sentences each) why write-only is rejected and why the fix is two-layer.
- **Finding 2 ↔ finding 4 framing** — name them as one threat model split into the sink (here) and its missing backstop (finding 4); each scored on its own.

**Coverage of untested requirements:** the walkthrough must show the historical-data sentence (req 7), the CSP cross-reference (req 8), the severity justification (req 9), and the `biome-ignore`-as-tell note (req 10) since the test cannot judge them.

**Links, don't re-explain:** `dangerouslySetInnerHTML` React fundamentals (chapter 026); CSP-as-defense-in-depth (chapter 081 lesson 1); the report template / audit method (Lesson 2 of this chapter). Use the components doc's `Code` for the lifted source and fix snippets; no `AnnotatedCode` needed (the sink is a single line, prose carries it).

No diagram — the threat model is two named layers, prose-carryable; a diagram would be ornamental.

### Moment of truth (header: "Moment of truth")

- The test command `pnpm test:lesson 3` and the expected pass output (the Lesson 3 `describe` block green, finding-shape + source-probe assertions passing). Use `Code` for the command and the expected output.
- A by-hand `Checklist` for the `[untested]` items the test cannot judge: running-app fingerprint reproduced (markup renders raw); the fix names sanitize-at-write-and-read and addresses historical data; the finding cross-references finding 4 as the second defense layer; severity justified; the `biome-ignore` recorded as a tell.

## Scope

- **Patching the sink** — out of scope; the audit is read-only, the fix is documented as a paragraph. (Fixing findings is the next sprint's work, named in Lesson 10.)
- **The missing CSP itself** — owned by Lesson 5 (Finding 4); this lesson only cross-references it as the defense-in-depth backstop.
- **Teaching `dangerouslySetInnerHTML` / React escaping fundamentals** — owned by chapter 026; linked, not re-taught.
- **Teaching CSP with nonce + `'strict-dynamic'`** — owned by chapter 081 lesson 1; linked, not re-taught.
- **The audit method (grep-driven, app+source side-by-side, write-before-moving-on)** — established in Lesson 2; reused, not re-introduced.
- **Other findings (fail-closed, audit-log, secrets, rate-limit, dep-hygiene, GDPR, bonus)** — owned by Lessons 2 and 4–10.
