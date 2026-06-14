# Chapter 082 — Lesson 5 outline

## Lesson title

- Full: **Finding 4: the CSP header omission**
- Sidebar: **Finding 4: CSP omission**

The chapter-outline title fits: it names the finding number (consistent with siblings) and the defect. Keep it.

## Lesson type

`Implementation`

(Audit-finding variant: the student writes a documented finding against a brief + a test gate, runs `pnpm test:lesson 5`. The test-coder fills `tests/lessons/Lesson 5.test.ts`.)

## Lesson framing

The student installs the senior reflex that a launch review opens with the response headers, and that a missing Content-Security-Policy means "not launched" — not a posture nit but the absent backstop behind every XSS sink. They walk the cheapest, highest-value pass in the audit (one `curl -I`), recognize a "missing-piece" finding as a real finding rather than "not applicable," and ship `findings/004-csp-header.md` whose fix names the load-bearing parts a beginner skips: a per-request nonce plus `'strict-dynamic'`, not just "add a CSP header." This finding closes the second half of finding 2's threat model — the sink lets the script in, the absent CSP lets it run.

## Codebase state

**Entry.** Findings 1–3 are written (`findings/001`–`003` filled). `findings/004-csp-header.md` holds the 4-section skeleton (`## Rule` / `## Location` / `## Consequence` / `## Fix`, empty) plus the `TODO(L5)` comment. The audit target runs unchanged: `next.config.ts` ships `staticSecurityHeaders` (five headers, no CSP key); `src/proxy.ts` does a cookie-presence redirect and returns `NextResponse.next()` with no nonce and no header mutation. `pnpm verify` is green with the defect live.

**Exit.** `findings/004-csp-header.md` has all four template sections populated: rule named (CSP-with-per-request-nonce-plus-`'strict-dynamic'`, chapter 081 lesson 1, linked by section ID), location named as missing from both `next.config.ts` and `src/proxy.ts` with the `curl -I` evidence recorded, consequence in user-visible terms, fix naming the nonce + `'strict-dynamic'` + `x-nonce` thread + the marketing trade-off, cross-referencing finding 2. The audit target is untouched (`next.config.ts` / `proxy.ts` unchanged, defect still present). `pnpm test:lesson 5` passes.

## Lesson sections

Render the Implementation contract section list. Sections in order:

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: document the missing CSP as `findings/004-csp-header.md`, the defense-in-depth header a launch review demands. Then a one-paragraph description (or a `Code` block of the completed finding's `## Location` section showing the `curl -I` line and the absent-CSP result) as the "finished result" — frame the deliverable, not a UI screenshot. No live UI fingerprint here (the defect is invisible in the browser; it surfaces only in response headers). Set the pairing with finding 2 up front: this is the backstop behind the sink the student already documented in lesson 3.

### Your mission (header: "Your mission")

Weave as coherent prose, no subsection headers, no implementation hints. Cover:

- **Feature (user terms).** Document the Content-Security-Policy omission: `next.config.ts` ships five static headers but no CSP, and `src/proxy.ts` mints no per-request nonce. Name this as the audit's cheapest, highest-value pass — headers are where a launch review starts.
- **Audit method (reused rhythm).** Read off the running app first: `curl -I http://localhost:3000/` (or `securityheaders.com`) shows the five headers the target *does* ship (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) and no `Content-Security-Policy` / `frame-ancestors`. Then grep both files where the policy could live to confirm absence. Frame this as a *missing-piece* finding — valid as a finding, located as "missing from `next.config.ts`" and "should be generated in `src/proxy.ts`."
- **Constraint / trap.** The trap is stopping at "add a CSP header." The nonce and `'strict-dynamic'` are the load-bearing parts; an allow-list of hosts without a nonce is the anti-pattern. The marketing-site third-party-script trade-off must be acknowledged, not ignored — the strict policy is for the authenticated app surface.
- **Pairing.** Read this finding as the second half of finding 2's threat model: the CSP backstops the XSS sink and any future sink; it is the complement, not the substitute.
- **Out of scope.** Patching the target — the fix is a paragraph, not a diff.

Then the **Functional requirements** as a numbered list, each tagged `[tested]` or `[untested]`. (The test asserts only the observable file shape — four sections populated, named rule present, location names a command/file, fix names the senior reach — plus a source-shape probe that the seeded defect is still present. Everything graded by hand is `[untested]`.)

1. `[tested]` `findings/004-csp-header.md` has all four template sections (`Rule`, `Location`, `Consequence`, `Fix`) populated.
2. `[tested]` The finding names the CSP / security-headers rule (chapter 081 lesson 1), recognizable in the Rule section.
3. `[tested]` The Location section records the `curl -I` evidence and names a file where the CSP should live.
4. `[tested]` The Fix section names the per-request nonce and `'strict-dynamic'` (the senior reach), not just "add a CSP."
5. `[tested]` The seeded defect is still present — `next.config.ts` ships no CSP key and `src/proxy.ts` mints no nonce (the target was documented, not patched).
6. `[untested]` The rule is linked by section ID, named as the CSP-with-per-request-nonce-plus-`'strict-dynamic'` rule.
7. `[untested]` The Location records the five static headers the target does ship and the CSP / `frame-ancestors` it lacks, and names both `next.config.ts` and `src/proxy.ts`.
8. `[untested]` The Consequence reads as the absence of defense-in-depth against the finding-2 XSS sink and any future sink, in user-visible terms, no "could potentially" hedging.
9. `[untested]` The Fix names the static CSP base in `next.config.ts`, the per-request nonce in `src/proxy.ts`, the `x-nonce` thread to Server Components, and `'strict-dynamic'`, with the marketing-site third-party-script trade-off acknowledged.
10. `[untested]` The finding cross-references finding 2 as the sink this header backstops.
11. `[untested]` A severity is assigned and justified in two lines.

Render the list with `Checklist` / `ChecklistItem` carrying the `tested` / `untested` chips (matches the project-brief convention).

### Coding time (header: "Coding time")

One line directing the student to write `findings/004-csp-header.md` against the template and the brief before reading the worked solution. Then the hidden reference, wrapped in `<details>` (collapsed by default).

The reference reproduces `solution/findings/004-csp-header.md` as it lands in the repo. Organize the walkthrough by template section:

- **Rule** — the header baseline ships a CSP, and the only CSP that holds is a per-request nonce plus `'strict-dynamic'`; an allow-list of hosts without a nonce is the named anti-pattern. Link chapter 081 lesson 1 rather than re-explaining the six headers.
- **Location** — the missing-piece reasoning: CSP belongs in `next.config.ts` (`staticSecurityHeaders` + `headers()`) and `src/proxy.ts` (the nonce half), and is in neither. Show the two-command evidence (the `curl -I` running-app read, then the `rg` source confirmation) and note that the five present headers are what make this "CSP absent," not "no headers."
- **Consequence** — no second line of defense against script injection; with finding 2's stored note live in the database, a payload executes with the user's full session authority. Frame the two findings as compounding.
- **Fix** — the two-halves structure (static base in `next.config.ts`, per-request nonce in `proxy.ts`), the `x-nonce` thread to Server Components, why `'strict-dynamic'` survives Next.js's chunk graph, and the marketing-site per-surface trade-off. Cross-reference finding 2 as complement-not-substitute.

Code-sample handling:
- The `curl -I` + `rg` evidence block: `Code` (two-command shell block).
- The `proxy.ts` fix snippet (nonce mint → CSP string → `x-nonce` request header → `NextResponse.next` → `Content-Security-Policy` response header): use `AnnotatedCode` — the snippet has four distinct load-bearing parts (the nonce generation, the `'strict-dynamic'` line, the `x-nonce` thread, the response-header set) that each warrant a focused note. This is the only structural snippet in the finding; the brief allows an illustrative snippet for a structural fix, no full diff.

Cover the `[untested]` requirements here: the section-ID link form (req 6), the five-headers-recorded + both-files-named location detail (req 7), the user-visible consequence framing (req 8), the full fix anatomy and trade-off (req 9), the finding-2 cross-reference (req 10), and the two-line severity justification (req 11, severity `high` — missing defense-in-depth behind a live sink, not the sink itself).

For topics owned by a regular lesson, link rather than re-explain: the security-headers rule and the `next.config.ts` / `src/proxy.ts` split (chapter 081 lesson 1), and the XSS sink it backstops (lesson 3 of this chapter, finding 2).

No diagram. The flow is a header read and a two-file location call — prose plus the annotated snippet carries it; a box-and-arrow diagram would add nothing.

### Moment of truth (header: "Moment of truth")

The test command and expected pass output:

- Command: `pnpm test:lesson 5`.
- Expected: the gate passes — the `describe.todo` placeholder is replaced by real assertions on the file shape (four sections, named rule, location-with-command, fix-names-nonce) plus the source-shape probe that the seeded defect is still present. Show the green pass output. A passing gate proves the student *documented* the defect rather than patching it (target is read-only).

Then a by-hand checklist (`Checklist` / `ChecklistItem`) for the `[untested]` items the test cannot judge: the location records the `curl -I` response and names both files; the fix names the per-request nonce and `'strict-dynamic'`, not just "add a CSP"; the finding cross-references finding 2; the severity justification holds when read aloud.

## Scope

- Does not patch the target — no CSP is added to `next.config.ts` or `src/proxy.ts`; the deliverable is the documented finding (fixing is the next sprint's work, out of scope for the whole audit; restated in lesson 10).
- Does not re-teach the six security headers or the `next.config.ts` / `proxy.ts` split — that is chapter 081 lesson 1; link it.
- Does not re-document the XSS sink itself — that is lesson 3 (finding 2); this lesson only cross-references it as the backstopped sink.
- Does not cover the consent-gate or `safeLimit`-bypass bonus findings — those are scored in lesson 10.
- Self-grading against `solution/findings/004-csp-header.md` happens in lesson 10, not here (honor system: answer key not consulted until findings are committed).
