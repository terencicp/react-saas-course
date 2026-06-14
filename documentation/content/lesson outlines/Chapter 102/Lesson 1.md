# Lesson outline — Chapter 102, Lesson 1

## Lesson title

- Title: `TSDoc the public surface`
- Sidebar label: `TSDoc the public surface`

(Chapter-outline title fits. Keep it.)

---

## Lesson framing

**The senior question that drives the whole lesson:** *Which declarations in this codebase earn a TSDoc block, and which don't?* This is the load-bearing teach. The tag list is small and quick; the *cut* is what takes the time. Frame every section around the cut, not around tag syntax.

**Target student:** junior dev from another field, comfortable reading TS/JSX, has already met Server Actions (Ch043), Zod (Ch043), Drizzle schemas, `env.ts`, and the Diataxis/link-don't-duplicate framing from Ch101 (the immediately preceding chapter). They know *what* a doc comment is from other languages; they do **not** know *when* to write one in a 2026 TS SaaS, and they carry two bad defaults: TSDoc-everything (JSDoc-from-Java muscle memory) or TSDoc-nothing.

**The two failure modes to attack head-on (both wrong):**
- Over-documenting: a block on every private helper, the signal drowns. The file becomes 50% comment.
- Under-documenting: nothing exported is documented, so the next reader (teammate, future-self) opens the implementation to learn the contract.
The senior posture is **signal-per-line**: doc volume tracks doc value.

**The mental model the student should leave with:** *TSDoc is reference documentation in code form — it states the **contract** of a public surface (what a caller needs from the call site), never the implementation behind it.* The IDE hover at a call site is the deliverable and the usability test: a reader hovering should decide in ~5 seconds whether to use the function and how. If the hover dumps internal rationale, the block has drifted into ADR territory (Ch101 L4) or implementation narration (anti-value).

**What the student should be able to DO at the end:**
1. Look at any declaration and decide yes/no on a TSDoc block using a 3-part inclusion test.
2. Write a first-sentence summary in the senior voice (verb-first, declarative, no preamble).
3. Reach for the right tag from the minimal set, and know when *not* to add one.
4. Apply the link-don't-duplicate reflex (point at the Zod schema / `env.ts`, never paraphrase).
5. Not repeat the TypeScript type in `@param` (the JSDoc-vs-TSDoc differentiator).

**Pedagogical spine — keep cognitive load low:**
- Lead with the *decision* (the cut), then the *small* tag set, then the *writing posture*, then the *reflexes* (link-don't-duplicate, deprecation path), then *consolidate* with the IDE-hover usability test. This is concrete-problem → rule → practice ordering.
- This is the chapter's longest lesson (35–45 min) but the volume is in worked examples and exercises, not prose. Every rule gets one short, load-bearing SaaS example (Server Action, `/lib` function, schema table). Do **not** do a tag-by-tag syntax tour — name the standard once, spend the budget on *when/what*.
- Heavy use of **AnnotatedCode** (walk one realistic Server Action's TSDoc block part-by-part) and **CodeVariants** (noise vs. signal; JSDoc-style vs. TSDoc-style `@param`; before/after a deprecation). The IDE hover is best shown as a **hand-coded HTML/CSS figure** (a fake editor hover card) since we can't screenshot a live IDE reliably and the hover *is* the deliverable.
- Two interactive checks: a **Buckets** drill on the public-surface cut (earns / doesn't earn), and a **CodeReview** exercise where the student flags TSDoc defects on a diff (the AI-graded review surface previews Ch103 and tests the cut + reflexes in one shot).

**Reconciliations the writer must respect (deliberate divergences flagged for downstream agents):**
- **Tag set:** the chapter outline lists `@param @returns @example @throws @deprecated @remarks @see`. The code-conventions doc (§ Comments and inline docs) lists `@param @returns @throws @deprecated @see @example` (no `@remarks`). Teach the **union as "the standard set," and present the course's working subset as: `@param`, `@returns`, `@throws`, `@deprecated`, `@example`** — the five that earn their weight in closed-source SaaS. Mention `@remarks` and `@see` as "exist, rarely needed": `@remarks` only when the summary is genuinely two-section; `@see` only when a single inline link won't do. This matches both docs without contradicting either.
- **Zod description mechanic (FACT-CHECKED, IMPORTANT):** the chapter outline says "Zod's built-in `description`." In Zod 4 (the course's version) the field-level description is attached with **`.meta({ description: '…' })`**; `.describe('…')` still works but is **legacy/compat shorthand**. When this lesson references the Zod-schema-is-the-field-doc point, write **`.meta({ description })`**, not `.describe()`. Do not teach the deprecated form. This is a one-line reference only — the mechanic itself is Ch043 territory.

---

## Lesson sections

### Introduction (no header — lesson intro per pedagogy §3)

- Open on the concrete pain: it's two months later, you (or a teammate, or future-you) hover `createInvoiceDraft(...)` at a call site and the tooltip says nothing. To learn whether it throws, what the second arg does, or whether it writes to the DB, you have to open the file and read the body. That's the tax an undocumented public surface charges every caller, forever.
- Name the senior question explicitly-but-implicitly (per pedagogy: state the question the lesson answers): *which declarations earn a block, and which are noise?*
- Connect to Ch101: same chapter-long thread — *link, don't duplicate*; docs live next to the truth. Last chapter named the four repo-level artifacts; this lesson zooms into the doc that lives **inside** the source file, on the function/type/schema itself.
- Preview the payload: a 3-part inclusion test, a five-tag working set, the first-sentence-is-the-hover posture, the link reflex. Promise the deliverable is *a good IDE hover*, not a generated docs site.
- Keep it to ~4 short paragraphs. Warm, terse, no celebration.

---

### What TSDoc is, in one pass

**Goal:** name the standard once and get out. This is NOT a syntax tour — it exists so the rest of the lesson can say "TSDoc block" without ambiguity.

Content:
- TSDoc = the Microsoft-stewarded standard for doc comments in TypeScript: a `/** … */` block immediately above a declaration, with a small set of `@`-prefixed block tags. One sentence.
- Who consumes it: every IDE (VS Code, WebStorm, Cursor) renders it on **hover at the call site** — that's the surface that matters for closed-source SaaS. Tools like TypeDoc / API Extractor generate HTML reference *sites* from the same syntax — that matters for *published libraries*, not for a closed SaaS app. (Defer the full TypeDoc threshold to its own short section near the end.)
- The single most important contrast to plant now (it recurs all lesson): **TSDoc documents the contract, the body documents the implementation.** A doc comment is reference docs (Diataxis, Ch101) in code form.

Components:
- One small `Code` block: a minimal `/** Creates an invoice draft and returns its id. */` above an `export function` signature. That's the whole "here's the shape" — no tags yet. Keep it to ~3 lines.
- `Term` on **TSDoc** (one-line: "Microsoft's doc-comment standard for TypeScript; `/** … */` blocks the IDE renders on hover"). `Term` on **API Extractor** if named (Microsoft tool that builds a reference site + API report from TSDoc).

Reasoning: students need the vocabulary anchored before the cut. Doing it fast here prevents the cut sections from stalling on "wait, what's a tag."

---

### The public-surface cut: which declarations earn a block

**Goal:** the load-bearing teach. Give a crisp, reusable inclusion test, then make it concrete with the SaaS surface map and the negative space.

#### The inclusion test

- State the 3-part test plainly. A declaration earns a TSDoc block if **any** of:
  1. **It crosses a module boundary** — exported from `src/lib/<feature>/` into `src/app/`, a Server Action consumed by a component, a util imported elsewhere. (One caller-away from where it's defined.)
  2. **The type alone doesn't carry the contract** — there are preconditions, side effects, ordering requirements, or error semantics the signature can't express.
  3. **The next reader is at the call site, not in the file** — a teammate or future-you who will hover, not open the body.
- The inverse (the default no): a private helper in the same file, a one-liner whose body is shorter than the doc would be, a component whose props type already tells the story. These do **not** earn a block.
- Plant the senior reflex: *the cut is the public surface.* Volume that doesn't track value is anti-value.

Components:
- Present the test as a short ordered list in prose (not a diagram — it's a checklist, three bullets). Reinforce visually only if budget allows; the Buckets drill below does the real reinforcement.

#### The SaaS surfaces that always earn a block

**Goal:** make the cut concrete on the exact surfaces this course has already built, so the rule sticks to things the student recognizes.

Walk these five, each with a one-line "why it earns it" and (for the first two) a short code sample:

- **Server Actions** (the course's API contract, Ch043). Earns: a one-paragraph summary, the auth/tenant precondition (`assumes an authenticated org context`), the side effects (DB writes, emails, audit-log rows), and the caller-relevant failure modes via `@throws`. The Zod input schema lives next to the action and **is** its own field-level reference — link to it, don't restate it.
- **Exported functions in `src/lib/<feature>/`.** Consumed across the app; the contract belongs where the reader hovers. Internal helpers in the same module do not.
- **Drizzle schema tables.** A TSDoc block on the exported `pgTable` identifier so hovering the table name at a query site surfaces its purpose. (Pairs with Ch101 L2's one-paragraph schema header.)
- **Zod schemas exposed across modules.** A TSDoc summary on the exported schema for what the *shape* represents (`UserProfileInput — the shape the profile-update action accepts`). Field-level intent lives in the schema's own `.meta({ description })` (Ch043). [USE `.meta`, NOT `.describe` — see framing.]
- **Webhook handlers.** TSDoc on the route handler describing the contract: which event types it accepts, the idempotency key, the side effects, the expected response. The handler **is** the webhook contract doc (Ch101 L2).

Components:
- **AnnotatedCode** is the centerpiece here. Author **one realistic Server Action** with a complete-but-minimal TSDoc block and walk it step-by-step:
  - Step 1 (blue): the first-sentence summary line — verb-first.
  - Step 2 (orange): the precondition sentence in the body (`assumes an authenticated org context`).
  - Step 3 (violet): the `@param` that earns its place (a non-obvious one) — and note the one that's omitted because its name+type say it all.
  - Step 4 (green): `@throws ValidationError` — the failure mode the caller must handle.
  - Step 5 (blue): the inline link to the Zod schema instead of a field list.
  - Keep `maxLines` ≤ 18; each step prose ≤ 6 lines. The action body can be elided to `// …` so the focus stays on the doc block.
- The remaining three surfaces (lib function, schema table, webhook) get short standalone `Code` blocks (3–6 lines each) — just the declaration + its block, no walkthrough needed once the pattern is shown once.

Reasoning: one deep AnnotatedCode walkthrough teaches the *anatomy*; the others are quick pattern-recognition repetitions. This keeps cognitive load gradual (one complex example, then echoes).

#### The negative space: what does NOT earn a block

**Goal:** the cut is only learned when the *no* cases are as vivid as the *yes* cases. This is where over-documenters get corrected.

List with a one-line reason each:
- **Internal helpers** — one file, one caller; the name + type are the contract.
- **React components** — the props type + component name document them. A block on every component is noise. *Exception:* a shared design-system primitive with non-obvious prop semantics.
- **Trivial passthroughs / getters** — `const isAdmin = (u) => u.role === 'admin'`; the body *is* the doc.
- **Test helpers** — read by the test author and the test's reviewer; clear names suffice.
- **Type aliases that mirror a Zod schema** — `type UserInput = z.infer<typeof userInputSchema>`; the schema is the doc, the type is the derived view.

Components:
- **CodeVariants** with two tabs — "Noise" vs. "Signal":
  - Tab "Over-documented" (red marks): a 4-line file where a private helper and a trivial passthrough each carry a full TSDoc block; prose: *the public-surface signal is buried.*
  - Tab "Right-sized" (green marks): same file, blocks stripped from the privates, kept only on the one exported surface; prose: *one block, where a caller hovers.*
- Then the **Buckets** exercise (the section's interactive check):
  - `instructions`: "Sort each declaration into whether it earns a TSDoc block."
  - Buckets: `Earns a block` / `No block`.
  - Items (chips, inline code): an exported Server Action; a private helper used once in the same file; an exported `pgTable`; `const isAdmin = (u) => u.role === 'admin'`; an exported `/lib` function consumed by a component; a React component whose props interface is self-describing; `type UserInput = z.infer<typeof schema>`; a webhook route handler; a test helper. (~9 items, `twoCol`.)
  - Grading: each chip's `bucket` is its correct side; the reveal teaches the boundary cases (component exception, type-mirrors-schema).

Reasoning: classification is exactly the skill being taught (a binary cut), so a classification drill is the highest-fit exercise. It directly checks the deliverable.

---

### The first sentence is the whole doc

**Goal:** teach the writing posture. The IDE hover shows the first sentence first; the rest is below the fold.

Content:
- The reflex: write the first sentence so a reader can decide *in two seconds* whether they're at the right function. Verb-first, declarative, no preamble.
- Contrast pairs (these are the teach):
  - Good: `Creates an invoice draft and returns its id.`
  - Bad: `This function is used to create an invoice draft.` (preamble, no extra information, slower to scan)
- The rest of the block adds only what the call site *can't see*: preconditions, side effects, throws, the one example. Everything the signature already says, the block omits.

Components:
- **The IDE-hover figure (hand-coded HTML/CSS, wrapped in `<Figure>`).** This is the pedagogical centerpiece of the section and the lesson's "usability test made visible." Render a small fake editor card: a line of call-site code (`createInvoiceDraft(orgId, input)`) with a tooltip popover beneath it showing exactly what the IDE renders — the bold signature line, then the first sentence prominently, then the tags below a faint divider. Goal: make "the first sentence is what the reader sees first" *literally visible*, since we can't screenshot a real IDE reliably (and screenshots rot). Keep it under ~800px tall, horizontal-friendly.
  - Optionally use **TabbedContent** inside the figure: tab A "Good summary" (scannable hover), tab B "Preamble summary" (the reader still doesn't know what it does). Same hover chrome, different first sentence — drives the contrast home visually.
- A small `Code` before/after pair can sit alongside if the figure already carries the visual; prefer not to duplicate.

Reasoning: this concept is inherently *visual* (it's about what renders where in a tooltip). A diagram-style figure beats prose. Avoid a real screenshot (tool artifact + rot risk).

---

### TSDoc states the contract, not the type

**Goal:** the JSDoc-vs-TSDoc differentiator — the single most common concrete mistake. This is where Java/JS-doc muscle memory gets corrected.

Content:
- The course's TS style is inference-led: parameter and return types are annotated in the signature; the TSDoc must **not** repeat them.
- The rule with examples:
  - Right: `@param email - the user's email` (no type — the signature already carries `email: string`).
  - Wrong: `@param {string} email - …` (JSDoc style; the `{string}` is redundant and TSDoc doesn't use it).
- Why this is the differentiator: TSDoc deliberately omits types from tags *because the TypeScript signature is the type source of truth*. JSDoc needed types because plain JS had none.
- Extend the same logic to `@returns`: only document the return when the **semantics** exceed the type — a sentinel `null`, a partial result, an ordering guarantee. `@returns the user object` when the signature already returns `User` is pure noise; omit it.

Components:
- **CodeVariants**, two tabs, before/after:
  - Tab "JSDoc habit" (red): block with `@param {string} email` and `@returns the user object`.
  - Tab "TSDoc" (green): same function, `@param email - the address we send the receipt to` (adds *purpose*, not type), `@returns` dropped entirely because the type says it all.
  - Prose under each names the rule in one line.
- **CodeTooltips** opportunity: on the "TSDoc" block, a hover tooltip on `@param` ("TSDoc omits the type — the TS signature carries it") and on the dropped-`@returns` region. Light touch; only if it doesn't fight the CodeVariants layout (CodeTooltips wants one fence — apply it to a separate small standalone block instead if needed).

Reasoning: this is a *correction* of a known model error (per pedagogy, name what beginners get wrong). Before/after CodeVariants is the cleanest way to show "stop doing X, do Y."

---

### Link, don't duplicate — the reflex applied inline

**Goal:** carry the chapter-long Ch101 reflex into TSDoc. A doc that paraphrases another source of truth drifts; a doc that points at it can't.

Content:
- The rule: when a function's contract is *already stated somewhere structural*, the TSDoc **links** to it instead of restating it.
  - Zod-validated input → summary says "validates input against [`userInputSchema`](…)"; the schema (with its `.meta({ description })` fields) is the field-by-field doc. Do not enumerate fields in the block.
  - Config value → "reads `STRIPE_WEBHOOK_SECRET` from `env.ts`"; `env.ts` is the env doc.
- The why, stated as economics: a duplicated field list is *guaranteed* to drift the next time the schema changes, and a drifted doc is worse than no doc (preview the Ch102 L3 framing without stealing it). The link is the only form that stays correct for free.
- Tie back to the inclusion test: this is why a `type X = z.infer<typeof schema>` alias earns no block — it would only restate the schema.

Components:
- **CodeVariants**, two tabs:
  - Tab "Duplicates the schema" (red): a TSDoc block that lists every field of the input with descriptions; prose: *drifts the day someone adds a field.*
  - Tab "Links to the schema" (green): a one-line summary + `@see` / inline markdown link to `userInputSchema`; prose: *one source of truth, can't drift.*
- Cross-reference the Ch101 link-don't-duplicate lesson by slug (writer wires the real slug; do not leave `](#)`).

Reasoning: this is a transfer of an already-learned reflex to a new surface — the strongest kind of learning (link new to known, per pedagogy). The red/green contrast makes the drift risk legible.

---

### `@example`, `@deprecated`, and the tags that rarely earn their weight

**Goal:** finish the tag set with the two remaining tags that *do* pull weight, and explicitly down-rank the ones that mostly don't, so the student leaves with a small, confident toolkit.

#### `@example` — when one call shape earns its weight

- Only for a non-obvious call shape: a Server Action with several optional params, an unusual usage. Trivial functions don't get one.
- The example must be **runnable as-is** (pedagogy code-sample rule applies to TSDoc snippets too — no `// ...` hand-waving inside the example).
- Short `Code` block: a function whose third optional param makes the call non-obvious, with a single `@example` showing the typical call.

#### `@deprecated` — never deprecate without a path

- The senior reflex: a deprecated declaration **keeps its summary** and adds `@deprecated use createInvoiceV2 instead — removed in the next major.`
- The payoff: IDEs render deprecated identifiers with a strikethrough at the call site, so the caller sees the replacement *without opening the file*.
- Components: **CodeVariants** or a paired figure showing (a) the `@deprecated` block and (b) the call site with the identifier struck through (extend the IDE-hover figure style — a struck-through token). The visual sells *why* the path matters: the caller is told where to go, in place.

#### The rarely-needed tags: `@remarks`, `@see`

- `@remarks`: only when the summary genuinely needs a second section beyond the one-paragraph summary. Most blocks don't. If you reach for it to brain-dump architectural rationale — stop, that's an ADR (Ch101 L4).
- `@see`: only when a single inline markdown link won't do. Often the inline link in the summary is enough.
- One-sentence "these exist; you'll rarely type them." Don't over-explain.

Components:
- A compact **reference table** (plain markdown table) consolidating the working set: tag · when it earns its place · when to skip. Columns short. This is the one place a table beats prose because it's a lookup the student will return to. Rows: `@param`, `@returns`, `@throws`, `@example`, `@deprecated`, (then a faint divider) `@remarks`, `@see` as "rare."

Reasoning: grouping the "earns weight" tags with the "rarely needed" ones in one section gives the student the *complete* small toolkit and the judgment to keep it small — directly serving the signal-per-line posture.

---

### The hover is the usability test (and the audit trail)

**Goal:** consolidate everything into one reusable senior check, and name the modern reason the discipline matters more in 2026 — without naming AI as a how-to.

Content:
- The usability test, stated as the lesson's closing reflex: *re-read your own hover. Can a caller decide in five seconds whether to use this and how?* If the hover dumps three paragraphs of internal rationale → it migrated into explanation (ADR) or implementation narration (anti-value). Cut what the caller doesn't need.
- The 2026 property (per pedagogy: name it, don't moralize, don't make it a how-to-direct-AI lesson): the same TSDoc block is the **brief** that any *non-author* editing the function reads to learn the contract before touching the body — a human reviewer two months later, or an automated agent editing the code. If the contract isn't stated, the editor reads the body and infers, often wrongly. The hover is the contract the next editor is handed. This is *why* the public-surface cut earns its keep beyond personal convenience: it's the codebase's machine- and human-readable contract layer.
- TypeDoc threshold, stated once and dropped: TypeDoc / API Extractor generate HTML reference sites from these same comments — load-bearing for a *published* SDK or component library, where the docs are the product surface. For a closed-source SaaS the **IDE hover is the reference surface**; the course doesn't reach for TypeDoc by default. For an OSS library author the calculation flips. (No setup, no tour — this is a threshold statement, per the chapter outline.)

Components:
- **CodeReview** exercise — the section's interactive check and the lesson's capstone. The student reviews a small diff that adds/changes TSDoc and flags the defects (AI-graded against `kernel` phrases). This previews the Ch103 review surface and tests the whole lesson at once. Plant ~3 defects across one or two files:
  - A TSDoc block on a **private helper** that earns none (kernel: "private one-file helper doesn't earn a TSDoc block — noise that buries the public-surface signal").
  - A `@param {string} email` JSDoc-style type in the tag (kernel: "TSDoc omits the type — the TS signature already carries it; drop `{string}`").
  - A block that **enumerates every Zod field** instead of linking (kernel: "duplicates the schema field list — will drift; link to `userInputSchema` instead").
  - (Optional 4th) a `@deprecated` with no replacement path (kernel: "deprecation without a supersession path — name the replacement").
  - Provide `ReviewIssue` reveals teaching each, and a `ReviewWhy` tying them to the public-surface cut + link reflex.
- Note for the writer: count rendered lines carefully for `line=` (every `ins`/`del`/context line counts). Keep each file short.

Reasoning: ending on a review exercise (a) consolidates the cut + posture + reflexes in an applied task, (b) is the highest-fidelity check of "can they actually spot good vs. bad TSDoc," and (c) bridges naturally into the next two lessons (comments, then the PR review discipline). The AI-graded review is the right tool because the skill is *judgment*, not a single correct keystroke.

---

### External resources (optional, end of lesson)

- `ExternalResource` cards: tsdoc.org ("What is TSDoc?" + the tag reference), the TSDoc Playground if linkable, and the VS Code JSDoc/TSDoc hover docs. 2–3 cards max. Optional — only the official TSDoc site is high-value.
- A short YouTube `VideoCallout` is **not** essential here; the topic is judgment-led and the in-page figures + exercises cover it. Skip unless the resourcer finds a tight, recent (<12 mo) clip specifically on "what to document vs. what not to." Do not pad.

---

## Scope

**This lesson covers:** the TSDoc public-surface cut (inclusion test + the SaaS surface map + the negative space), the course's working tag subset (`@param`, `@returns`, `@throws`, `@example`, `@deprecated`; `@remarks`/`@see` as rare), the first-sentence-is-the-hover writing posture, the no-type-in-tags TSDoc-vs-JSDoc rule, the link-don't-duplicate reflex applied inline, the deprecation-with-a-path reflex, and the IDE-hover usability test (incl. the 2026 "TSDoc is the contract brief for the next editor" property and the TypeDoc threshold stated once).

**Out of scope — do NOT teach (reserved or already taught):**
- **Inline `//` comments and the why-not-what rule** → Ch102 **L2**. This lesson is *only* about `/** */` TSDoc on the public surface. Do not drift into commenting individual lines.
- **The PR-review discipline that keeps TSDoc in sync with signatures** → Ch102 **L3**. May *preview* "a drifted doc is worse than no doc" in one sentence (link section) but do not teach the five-artifact reflex or the reviewer checklist here.
- **The full PR-review skill set (blocking vs. suggesting, comment anatomy)** → Ch103. The CodeReview exercise here is used as a *check on TSDoc judgment*, not to teach reviewing.
- **Zod's field-description mechanic in depth** → already taught Ch043. This lesson references it in **one line only** and must write the current form `.meta({ description })` (not the legacy `.describe()`).
- **Server Action / Result / `@throws` semantics in depth** → Ch043. Assume known; reuse the shape, don't re-teach it. (Brief one-line refresher max: "Server Actions are the course's API contract from Ch043.")
- **Drizzle `pgTable` and the one-paragraph schema header** → Ch101 L2 + data-layer chapters. Reference; don't re-teach schema authoring.
- **TypeDoc / API Extractor HTML site setup** → out of scope entirely. State the threshold once; no config, no tour.
- **`eslint-plugin-tsdoc` configuration** → out of scope. (May be named in passing as "lint can catch mechanical tag drift" but the discipline is review, taught in L3. No setup.)
- **ADRs and architectural rationale** → Ch101 L4. Used here only as the boundary ("rationale belongs in an ADR, not a hover").

**Prerequisites to redefine concisely (one line each, no re-teach):** Server Action = the course's typed API entry point (Ch043); Zod schema = the runtime-validated input shape (Ch043); `env.ts` = the typed env source of truth; `pgTable` = a Drizzle table declaration; "link, don't duplicate" = the Ch101 reflex that a doc points at the source of truth instead of copying it.

---

## Code-convention alignment notes (for downstream agents)

- Follow `documentation/code standards/Code conventions.md` § "Comments and inline docs": TSDoc on the **exported public surface only**; first sentence is the IDE hover and must be accurate. The canonical example there (`requireUser`) is a good model for voice and shape.
- **Working tag subset to teach:** `@param`, `@returns`, `@throws`, `@deprecated`, `@example`; treat `@remarks` and `@see` as "exist, rarely needed." (Conventions list `@see`; chapter outline lists `@remarks`. Presenting both as rare reconciles the two — deliberate.)
- **No types in TSDoc tags** (no `@param {string}`), inference-led signatures — matches the conventions' TS style. This is taught as an explicit rule, not just modeled.
- **Zod field doc = `.meta({ description })`** (Zod 4 current), NOT `.describe()` — deliberate divergence from the chapter outline's "built-in `description`" wording, made to avoid teaching a legacy API.
- All code samples must be runnable-as-written where shown as examples (no placeholder bodies inside an `@example`); action *bodies* outside the doc block may be elided with `// …` when the focus is the doc.
- Use `eq(...)`-style Drizzle predicates and the established Server Action shape from Ch043 so samples are consistent with prior chapters.
