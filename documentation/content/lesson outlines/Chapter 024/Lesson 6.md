# Lesson outline — Chapter 024, Lesson 6

## Lesson title

- **Title:** `useId for stable IDs across the server boundary`
- **Sidebar label:** `useId`

Reasoning: the chapter-outline title "useId for ARIA wiring across SSR" bundles two ideas (ARIA wiring + SSR) and uses two acronyms in a five-word title.
The lesson's actual spine is *one* property — IDs that are identical on server and client — and ARIA wiring is its dominant *use*.
The retitle leads with the durable property; the ARIA payoff lands in the body. "Server boundary" is gentler than "SSR" for a title and matches how the chapter already phrases server/client.

---

## Lesson framing

**Where this sits.** Closing teaching lesson of Chapter 024 ("Hooks for holding state"). The chapter walked five "where does this value live" hooks — `useState`, derived-in-render, the four homes, `useReducer`, `useRef`. `useId` is the odd one out and the lesson must *say so*: it is not a place for state, it holds no value the developer chooses, and it does not answer "where does this live." It is a tiny utility hook that solves exactly one cross-cutting problem. Framing it as "another state hook" would mislead; framing it as "the accessibility-and-SSR plumbing hook" is correct and keeps it small.

**The senior throughline.** This is a short lesson and should *feel* short — the API is one call with no arguments and no options. Per the pedagogical stance (decisions before syntax, trigger before tool), the weight is not the call, it is the *three things you must already understand to know why the call exists*: (1) labels and inputs in HTML are wired by matching `id`/`htmlFor`, so a component that renders a field needs a unique id it didn't author; (2) any "just generate one" reflex (`Math.random`, a module counter, `crypto.randomUUID`) breaks under server rendering because the server and the client generate *different* values and React's hydration check rejects the mismatch; (3) `useId` sidesteps both by deriving the id from the component's *position in the React tree*, which is the one thing guaranteed identical on both sides. Land those three and the hook is obvious.

**Mental model to leave the student with.** "`useId` gives me a string that is unique on the page and the same on server and client. I use it to wire two DOM nodes together — almost always a label and its input, plus error/description text. I never use it for list keys, and I never use it for anything that needs to be secret or human-readable." If the student can recite the *trigger* ("I need to link two nodes with an attribute, under SSR, without a natural id") and the *two anti-uses* (list keys, security tokens), the lesson succeeded.

**What this relieves (pain framed in production stakes).** The bug this prevents is real and common: a hand-rolled form field that works in dev, then throws a hydration-mismatch warning in production (or worse, silently mis-wires a label) the moment two instances share a page or a random id diverges across the boundary. Accessibility is the stake on the other side — a label not associated with its input means a screen-reader user hears "edit text, blank" instead of "Email, edit text." Both stakes should be named concretely; this is where the senior framing lives, not in the API.

**Link to prior knowledge.** Three threads are already in the student's hands and should be *cashed in*, not re-taught:
- Reconciliation identity and `key` (Ch 023 L2) — the contrast that defeats the universal `useId`-for-keys misconception. Keys come from *data*; `useId` comes from the *tree*. They are opposites in origin and timing.
- The render-as-snapshot / hooks-called-in-order model (Ch 023, Ch 024 L1, foreshadowed rules-of-hooks) — explains *why* tree position is stable and why conditional `useId` calls are dangerous.
- The server/client split exists in the student's vocabulary as recognition only at this point in the course (App Router SSR is Unit deeper). Keep SSR at the "the page is rendered twice — once on the server to HTML, once in the browser to attach behavior — and the two must match" level. Do **not** teach hydration mechanics; name the symptom (a mismatch warning) and move on.

**Cognitive-load shape.** Build in three escalating beats, simplest model first:
1. The problem, shown by watching the naive fixes fail (concrete, no API yet).
2. The hook and its one property (the fix), with the tree-position intuition.
3. The real-world wiring pattern (label + input + error), then the guardrails (not-for-keys, not-for-secrets, call-order discipline).
Each beat is small. Resist adding `useState`/`useRef` callbacks except the one sharp `key` contrast, which is load-bearing.

**Tone / format conventions to match (from L1/L5 of this chapter).**
- Open with a concrete scenario in prose (a custom `TextField`), warm and brief, no "in this lesson" preamble.
- Inline term definitions use the chapter's `((double-paren))` convention for quick glosses; reserve the `<Term>` component for terms wanting a focusable tooltip in dense prose. Both are acceptable; pick one per term and stay consistent.
- Mark-color convention (established chapter-wide): red = breaks/error (hydration mismatch, collision), orange = smell/works-but-wrong (hardcoded id, random id), green = correct (`useId`). Apply in `AnnotatedStep color=` and `<div data-mark-color>` wrappers.
- Small disposable snippets (`TextField`, a checkbox row, a dialog), no continuous-example character — matches L1/L5.
- React 19 + Next 16 framing; `useId` works in both Server and Client Components.

---

## Lesson sections

### Intro (no header)

Open on the senior question, concretely. A custom `<TextField label="Email" />` that renders its own `<label>` and `<input>`. For a screen reader to announce the field, the label must be *associated* with the input — in HTML that means `<label htmlFor={id}>` pointing at `<input id={id}>` with a matching string. The component author doesn't know what that id should be: hardcode `"email"` and a second `<TextField>` on the page collides; two ids the same is invalid HTML and the label now points at the wrong input.

State the shape of the lesson in one or two sentences: the API is a single argument-less call, so the lesson is really about *why it exists* and *the two things people wrongly use it for*. Name the end state: by the end the student wires a label, an input, and an error message together correctly, under server rendering, and can say in one breath when **not** to reach for `useId`.

Keep it to ~3 short paragraphs. Connect to prior knowledge lightly: "you've spent this chapter deciding where values live; this last hook isn't about holding a value at all."

### Why you can't just make up an id

**Goal:** make the problem *felt* before the fix, by walking the obvious solutions and watching each fail. This is the decisions-before-syntax beat and the highest-value section.

Content:
- Establish the requirement crisply: the id only has to be **unique on the page** and **stable enough to wire two nodes** — it carries no meaning, it's plumbing.
- Walk three naive fixes, each with its failure mode:
  1. **Hardcoded literal** (`id="email"`) — works for one instance, *collides* the moment the component is reused. Orange (works-but-wrong), tipping to red on collision.
  2. **Module counter / `Math.random()` at render** — unique, but produces a *different value on the server than in the browser*. Here introduce, at recognition depth only, the server/client double-render: the server renders the component to HTML (id = one value), the browser re-renders to attach behavior (id = another value), the two strings don't match, and React emits a hydration-mismatch warning. Orange→red.
  3. **`crypto.randomUUID()`** — same SSR failure as random, plus it's overkill. Names the instinct a senior dev specifically has and kills it.
- Land the underlying insight that sets up the fix: *the only thing guaranteed to be identical on server and client is the shape of the React tree itself.* A value derived from "where am I in the tree" is automatically stable across the boundary. That sentence is the bridge to the next section.

**Pedagogy:** this is the "watch the tools you have fail" pattern L5 used for `useRef` — reuse it. Cognitive load stays low because no new API appears yet; the student is just reasoning about a problem.

**Component — `CodeVariants`** (three tabs: `Hardcoded` / `Math.random()` / `useId`, with the third deliberately previewed as the resolution).
- Author the first two panes as anti-patterns (orange via `<div data-mark-color="orange">`), the `useId` pane green. First-sentence framing per the component's convention ("collides on reuse", "mismatches across SSR", "stable on both sides").
- Reuse `syncKey` is not needed (single block). `maxLines` default fine; snippets are ~6 lines.
- Note for the writer: the `useId` pane here is a *teaser* — the full treatment is the next section, so keep its prose to one line ("the hook that fixes both — next").

**Term glosses (inline `(())` or `<Term>`):**
- ((hydration)) — recognition gloss only: "the browser re-running your components over the server's HTML to attach event handlers and state; if the HTML the browser would produce doesn't match what the server sent, React warns." Forward-ref Unit on App Router for depth.
- ((SSR / server rendering)) — "the page is rendered to HTML on the server first, then again in the browser." Keep it this thin.

**Scope guard for the writer:** do NOT teach how hydration works, the reconciliation of mismatches, or `suppressHydrationWarning`. Name the warning as the symptom and move on (owned by a later App Router lesson — see Scope).

### useId: one string, identical on both sides

**Goal:** install the API and its single defining property, with the tree-position intuition.

Content:
- The signature: `const id = useId();` — *no arguments*. Returns an opaque string. Show it literally and name the three guarantees plainly (mirror L5's "three facts" structure):
  1. **Unique** per component instance on the page.
  2. **Stable** across re-renders of that instance (same string every render).
  3. **Identical on server and client** — the property that fixes the SSR problem.
- The format is opaque and contains colons (e.g. `«r1»`-style / `:r1:`-style — verify exact React 19 format in fact-check; do not over-specify). Rule: **never parse it, never pattern-match it, never select on it from CSS.** It's a token to hand to `id`/`htmlFor`/`aria-*`, nothing more.
- The *why a hook* answer: a plain function couldn't know its position in the tree; React tracks call order/position (the same machinery that makes hooks work), so the id is derived from where the component sits in the render tree — deterministic, and re-derived to the same value on the server and the client because the tree is the same shape both times.
- Universality note: `useId` works under **server rendering** — the id is generated during the server render, serialized into the HTML, and matched on hydration — and in **Client Components**. The senior takeaway: don't special-case server-rendered vs client for id generation. **Precision the writer must keep (verified against React docs):** `useId` cannot be called inside an *async* Server Component. In practice a field component that calls `useId` is a Client Component (it renders interactive inputs) or a synchronous server-rendered component, so this rarely bites — but do **not** write the blanket sentence "useId works in any Server Component." Phrase it as "works under server rendering and in Client Components," and if async Server Components have been introduced by this point, add the one-line exception; otherwise omit it to avoid teaching an un-taught concept.

**Component — `CodeTooltips`** on a ~3-line block (`const id = useId();` plus a usage line). Gloss inline:
- `useId` → "Returns a unique, stable string id, identical on server and client. Takes no arguments."
- the returned `id` value → "Opaque — colons and all. Hand it to id / htmlFor / aria-*; never parse it or select on it in CSS."

**Optional diagram — tree-position intuition.** A small **HTML+CSS `<Figure>`** (per html-css.md, horizontal, capped height): two side-by-side mini React trees labeled "Server render" and "Browser render", same shape, with one `TextField` node highlighted in each and the *same* id string (`:r3:`) printed under both — versus a greyed-out "`Math.random()`" caption showing two *different* numbers. Pedagogical goal: make "same tree position ⇒ same id ⇒ no mismatch" visual in one glance. Keep it simple (this is the "any visual aid counts" case, not a system graph). Mark the matching ids green, the diverging randoms orange. Apply the prose-margin `margin: 0` reset per html-css.md. If the writer judges it adds height-cost without clarity, a single inline before/after code comparison is an acceptable substitute — the diagram is a *nice-to-have*, the property statement is mandatory.

**Watch-out folded into this section's prose (not its own section):** the id changes if the component unmounts and remounts (e.g. a `key` reset from Ch 023 L5) — fine for ARIA, surprising only if you stored the id somewhere expecting permanence. One sentence.

### Wiring a field: label, input, and error message

**Goal:** the canonical real-world use, end to end. This is the payoff section and the one the student will copy into real code.

Content:
- The core pattern: one `useId()` call, the base id on the input, `htmlFor` on the label matching it. Show the screen-reader stake concretely: with the association, the field announces "Email, edit text"; without it, "edit text, blank."
- **Composing multiple ids from one call.** A real field needs more than one id — the input, plus an error message wired via `aria-describedby`, plus optionally a hint/description. The convention: call `useId()` **once** and *derive* suffixed ids from the base:
  ```
  const id = useId();
  const inputId = id;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  ```
  Wire `aria-describedby={errorId}` (or a space-joined list of hint+error) on the input and `id={errorId}` on the error node. Explain *why derive rather than call `useId()` three times*: both work, but one call + suffixes keeps the relationship visible and reads as "these belong to the same field." (Calling it multiple times is explicitly fine — say so in one line so the student isn't confused if they see it in library code.)
- Tie to the conditional-error case: the error node only renders when there's an error, so guard with `error != null && <p id={errorId}>…</p>` (carry the proper-boolean conditional-render rule from chapter convention / code standards). `aria-describedby` pointing at an absent node is harmless, but the cleaner senior move is to only set `aria-describedby` when the error is present, or accept the dangling ref (note both; this is a real judgment call).
- Connect to the code standard explicitly (this is a *direct* convention hit): "`aria-describedby` and `aria-invalid` wired on every form field that has a possible error; `useId()` for the stable cross-SSR IDs" — and add `aria-invalid={error != null}` to the example so the snippet matches the house standard.

**Component — `AnnotatedCode`** stepping through the full `TextField` component (~12–15 lines, `maxLines` ≤ 18). This is the right tool because one block needs the student's attention directed to several wired points in sequence. Steps (each ≤6 lines prose, colored):
1. `{...}` the `useId()` call + derived ids — blue. "One call, three ids by suffix."
2. The `<label htmlFor={inputId}>` ↔ `<input id={inputId}>` pairing — green. The core association; this is what the screen reader follows.
3. `aria-describedby={errorId}` + `aria-invalid` on the input — green. Announces the error text and the invalid state.
4. The conditional `error != null && <p id={errorId}>` node — green, with a one-line note on the dangling-ref judgment.
Optionally a 5th step contrasting a hardcoded id in orange to reinforce *why* the `useId` version is correct, but only if it doesn't blow the line cap.

**Exercise — `ReactCoding` (tests mode, `hidePreview`).** Highest-value check for this lesson and well-supported by the harness (the component doc's own example is literally label/input association). The student is given a `TextField` with a `<label>`, `<input>`, and an error `<p>` that are *not* wired, and must:
- call `useId()` and derive an `errorId`,
- set `htmlFor`/`id` so the label associates with the input,
- wire `aria-describedby` to the error and `aria-invalid`.
Tests (DOM assertions, per the doc's surface): `label.getAttribute('for')` equals `input.id` and both are non-empty; `input.getAttribute('aria-describedby')` equals the error `<p>`'s `id`; `input.getAttribute('aria-invalid')` is `"true"` when an error prop is set. Grading note for the builder: assert the *association* (for === id), never a literal id string, since `useId` output is opaque and non-deterministic across environments. This makes "wire by reference, not by hardcoded value" the graded lesson — exactly the senior reflex.
- `instructions`: one paragraph naming the three wirings.
- Starter exports `App` rendering one (or two, to make collision-avoidance meaningful) `TextField`.

### Two things useId is not for

**Goal:** kill the two universal misconceptions in one section. This is a *content* section (it teaches the boundaries of the tool), not a tips dump — both sub-points are conceptual corrections that change behavior.

Content split into two clearly-labeled beats (h3 optional; prose with bold leads is fine for a short lesson):

**Not for list keys** — the universal one, land it hard.
- Restate the `key` contract from Ch 023 L2 in one sentence: a list key is *reconciliation identity*, so React can match an item across renders; it must come from the **data** (`item.id`, `slug`, or an id assigned to the row when it was created), and must be stable for the life of that datum.
- The chicken-and-egg argument: `useId` produces an id *for a component instance that already exists* — but a key has to identify the item *before* React decides which instance to create or reuse. You cannot key a list by the very ids React would assign after keying. So `useId` is not just discouraged for keys, it's *structurally* unable to do the job.
- The correct sources for keys, briefly: stable field on the data; or, for client-created items with no natural id, mint a `crypto.randomUUID()` **at creation time and store it on the item**, not at render. (This contrasts cleanly with the SSR section: random is wrong *at render*, fine *once, stored on data*.)

**Not for secrets or human-readable anchors.**
- `useId` ids are *not random, not unguessable, not unique across pages/sessions* — they're stable per tree position per render. So they are wrong for anything needing cryptographic uniqueness: CSRF tokens, session ids, idempotency keys → `crypto.randomUUID()` server-side (recognition; owned by server units).
- They're also wrong for URL fragments users link to (`#pricing`) — those must be stable, human-readable, hand-authored, not opaque tree-derived strings.

**Exercise — `Buckets`** (`twoCol`), the classification check that matches this chapter's "sort the chips" idiom (L1, L5 both used it). Three buckets: **`useId`**, **`crypto.randomUUID` (stored on data)**, **hardcoded / human-authored**. ~7–8 chips: "label↔input association" (useId), "`aria-describedby` for an error" (useId), "key for a list of fetched rows" (data id → not useId; phrase the chip as the *id source*), "id for a client-added todo with no server id" (randomUUID), "CSRF token" (randomUUID server-side), "a `#pricing` anchor users bookmark" (hardcoded), "two `<TextField>`s on one page" (useId), "session id" (randomUUID). High signal: it forces the student to discriminate the three id-strategies the lesson drew lines between. `instructions`: "Sort each id into the tool that should produce it."

**Watch-outs folded into this section (not separated):**
- Keep `useId` calls **out of conditionals/loops** — same rule as every hook (foreshadow rules-of-hooks). A `useId` whose call order shifts between server and client can shift the id and reintroduce a mismatch. One sentence, tied to the call-order intuition from section 3.
- CSS-selector caveat: the senior move is to **not** style by these ids at all — they're for wiring (id / htmlFor / aria-*), not for CSS selection. One sentence, can be an `Aside` caution. **Do not anchor this on "colons must be escaped"** — that was true of the old `:r1:` format, but React 19.1 changed the format precisely so the ids are valid CSS selectors without escaping (see fact-check). The durable point is "these ids are opaque wiring tokens, don't select on them"; phrase it format-agnostically and don't print an escaped-selector example.

### How libraries use this (recognition)

**Goal:** one short paragraph situating `useId` in the real ecosystem so the student recognizes it later, then exit. Not a full section if it bloats — can be folded into the close.

Content:
- shadcn/ui and Radix primitives use `useId` internally to wire ARIA on every input/label/dialog — when the student later uses `<Label>` + `<Input>` from shadcn (recognition, owned by the shadcn lesson), this is the machinery underneath. The course's own form components (Unit on forms) reach for `useId` at every label-input pairing.
- The practical upshot: when you *wrap* a third-party input in your own component, your wrapper generates the id and passes it down as a prop. Recognition only — one or two sentences.

**Optional close / `ExternalResource` cards** (match L1/L5 ending):
- React docs: `useId` reference.
- React docs: "Should I use useId for keys / generating keys" caveat (or the relevant section of the `useId` page).
Keep to ≤2 cards.

---

## Scope

**This lesson teaches:** the `useId` signature and its three guarantees (unique / stable / identical across server-client); *why* a hook is needed rather than a random generator (tree-position derivation, SSR mismatch avoidance, recognition-level only); the canonical label↔input↔error ARIA wiring pattern and composing multiple ids from one call by suffixing; the two anti-uses (list keys — structurally impossible; secrets/anchors — wrong tool); call-order discipline for `useId`; recognition that shadcn/Radix and the course's form components use it internally.

**This lesson does NOT teach (and must not drift into):**
- **Hydration mechanics, the reconciliation of mismatches, `suppressHydrationWarning`, or moving reads into effects.** Name the mismatch *warning* as the symptom only. Owned by the App Router SSR/hydration lessons (Ch 030-area, later unit) — forward-ref, do not preempt.
- **Reconciliation and list `key` at depth.** Cited as known (Ch 023 L2). Restate the one-sentence contract only as the contrast that defeats the keys misconception; do not re-teach reconciliation.
- **ARIA roles, live regions, `role="alert"`/`role="status"`, the first rule of ARIA, focus management, keyboard nav.** Owned by the Accessibility chapter (Ch 027-area). This lesson uses `htmlFor`/`aria-describedby`/`aria-invalid` as the *concrete wiring `useId` enables*, not as an accessibility curriculum. Use them correctly per the code standard; do not expand into ARIA theory.
- **Form field components, validation, submission, Server Actions, `useActionState`.** Owned by the Forms unit (Unit 6). The `TextField` here is a teaching prop to show the wiring, not a real form-field design lesson; the error is a plain prop, no validation library.
- **shadcn/ui's `<Label>`/`<Input>` API and Radix internals.** Recognition only (owned by the shadcn lesson). One paragraph max.
- **`crypto.randomUUID`, CSRF/idempotency/session tokens at depth.** Named as the *correct alternative* for the not-for-secrets boundary; the server-token machinery is owned by the server/security units. Recognition only.
- **The `identifierPrefix` / multi-root rendering option.** The chapter outline lists it; **cut** — it's a legacy-migration / multi-root-on-one-page niche that a 2026 single-root Next.js app never touches. Mentioning it costs cognitive load for zero practical payoff. (If the writer wants a single recognition sentence in a `<details>` deep-dive, acceptable, but default is to omit.)
- **`useState`/`useRef`/`useReducer` callbacks** beyond the single load-bearing `key`-contract contrast. The chapter already taught these; don't re-litigate "where does state live" here — `useId` isn't a state hook.

**Prerequisites to redefine in one line each (concise, do not expand):**
- *Label/input association* — a `<label htmlFor="x">` is announced as the name of the `<input id="x">` it points at; matching strings is what links them.
- *SSR / hydration* — page rendered to HTML on the server, then re-rendered in the browser to attach behavior; the two renders must agree.
- *List `key`* — the data-derived identity React uses to match list items across renders (Ch 023 L2).
- *Reconciliation purity / hooks-in-order* — cited from Ch 023 / Ch 024 L1 as the reason tree position is deterministic; not re-taught.

---

## Notes for downstream agents

- **Deliberate divergences from code standards (flag, don't "fix"):** the anti-pattern snippets (`Math.random()` id, hardcoded id) in the "Why you can't just make up an id" section and any orange-marked step are shipped *to be rejected* — do not correct them inline. The final/green snippets and the exercise solution must be standard-clean: typed props, `useId()` for ids, `aria-invalid={error != null}`, `error != null && <Node/>` for the conditional error node (proper-boolean rule), arrow-function components bound to `const`, named export of the component (the `ReactCoding` harness requires an `App` export — that's a harness constraint, not a standards violation).
- **`useId` format (verified, June 2026):** React **19.1** changed the generated format from the old colon-wrapped `:r1:` to Unicode-guillemet `«r1»` *specifically so the ids are valid CSS selectors without escaping*. Keep all prose **format-agnostic** — describe it as "an opaque, unique string," never "an id with colons," so the lesson doesn't date. If the optional tree-position figure prints a sample id, use the current `«r1»`-style and label it clearly as illustrative, not contractual. Do not teach selector-escaping (it's the old format's problem).
- **Async Server Components (verified, React docs):** `useId` cannot be used in an *async* Server Component. The lesson must not claim "useId works in any Server Component." See the corrected universality note in section 3.
- There is a known Next.js 16 / React 19.1 footgun where `useId` can produce a server/client format mismatch in certain Server-vs-Client-Component setups — out of scope to teach here, but a reason to keep examples in Client Components and keep the hydration discussion at recognition depth.
- **Keep it short.** This is the chapter's lightest teaching lesson by design. One diagram (optional), one `AnnotatedCode`, two exercises (`ReactCoding` + `Buckets`), a `CodeVariants` and a `CodeTooltips`. Resist scope creep into ARIA or hydration — both have their own chapters.
