# The Clipboard API: the Copy button surface

- Title (h1): `Ship a Copy button that actually copies`
- Sidebar label: `The Clipboard API`

Title reasoning: the chapter-outline title ("The Clipboard API: the Copy button surface") names the topic but not the payoff. The lesson's deliverable is a single, correct, accessible Copy button; the whole API surface here is one async call. A task-framed title ("a Copy button that actually copies") signals both the deliverable and the lesson's spine — the call looks trivial and silently fails for non-obvious reasons. Sidebar stays the literal API name for scannability against the chapter's other three API lessons.

---

## Lesson framing

Conclusions from brainstorming that govern the whole lesson:

**This is a short lesson and the outline must keep it short.** The reach is one async call (`navigator.clipboard.writeText`) inside one client component. The depth is entirely in *the constraints that decide success* and *the failure modes*, not in API surface area. Resist padding. The senior payoff is: "I know exactly why this call fails and what a button that survives production looks like." Lesson 1 was a climb up three surfaces; this one is a single surface examined for its sharp edges.

**The spine is a senior question with a hidden trap, mirroring Lesson 1's structure.** Open with a concrete trigger — a "Copy invoice URL" button on every row of a table, with "Copied!" feedback for ~2 seconds. The call *looks* like a one-liner. The trap: it rejects in real browsers for reasons that never show up on the happy path during local dev (gesture expired, insecure context), so juniors ship the optimistic version and it breaks for users. The question to hold: **what gates this call, and why does the obvious one-liner version degrade badly in production?**

**Two constraints carry the lesson, and they connect to threads the student already owns.** (1) *Secure context* — HTTPS or `localhost`; this is the same gate Lesson 1 established for `randomUUID`/`subtle`, so reference it as a known reflex, do not re-teach TLS. (2) *Transient user activation* — the genuinely new idea this lesson owns. The clipboard write only succeeds inside a recent user gesture (and expires ~1s after it), which is *why* the call must live in the `onClick` handler and not in a `setTimeout`, a `useEffect`, or a then-callback chained off a network response. This is the load-bearing concept and deserves a diagram.

**Accessibility is taught inline, at the moment the button is built, never bundled as a tip.** The icon-only/"Copy"-only button needs an `aria-label`; the "Copied!" feedback needs a live region (`role="status"`) so screen-reader users learn the copy happened. These are part of "what the button looks like when it's correct," per the chapter's accessibility-baseline thread and the course's WCAG-2.2-AA floor. Both are recognition-depth here — Chapter 027 owns live regions properly — but they appear in the canonical shape because a Copy button without them is incomplete.

**The error taxonomy must be corrected against the chapter-outline draft.** The chapter outline lists `SecurityError` for the insecure-context case. Per current MDN (verified June 2026), `writeText()` formally rejects with `NotAllowedError` (no/expired activation), and the insecure-context case in modern browsers manifests as `navigator.clipboard` being **`undefined`** — so the failure there is a `TypeError`/feature-absence at *access* time, not a rejected promise. The lesson teaches: guard for the API's existence (or accept it's absent on `http://`), and `try/catch` the call for the activation-rejection path. Flag this divergence from the chapter outline explicitly for downstream agents.

**`'use client'` is a recognition moment, not a teaching moment.** The button must run in the browser, so its file is a Client Component. Use this to reinforce the smallest-interactive-leaf discipline (the chapter's client-only thread): a tiny `<CopyButton>` island fed the string as a prop from a Server Component parent — *not* a whole page turned client to host one button. Unit 4 / Chapter 033 own the directive at depth; name it, don't lecture it. React hook syntax (`useState`, the `setTimeout`-in-a-ref cleanup) is likewise named, not taught — Chapters 024/025 own it. The code shows the real shape; the prose flags "the hook mechanics land later" so the student isn't expected to fully parse them yet.

**Reading the clipboard and `ClipboardItem` rich content are recognition-only, kept to one short section combined.** The 2026 SaaS reach for *reading* is thin (paste is wired to inputs/`paste` events, not `clipboard.read`), and rich `ClipboardItem` writes are a niche (image/chart copy). One section names both with a one-line example each and a clear "don't reach for this unless the feature genuinely needs it" posture. Don't expand these.

**Mental model the student should leave with:** "A clipboard write is a *gesture-scoped, secure-context-gated, fallible async call*. I put it in the click handler, I `try/catch` it, I give it an accessible label and a live-region confirmation, and I keep it in the smallest client island. When it fails I degrade to a manual-copy affordance instead of pretending it worked."

**Tone and format:** match Lesson 1 — adult, terse, second person, decisions-first, no celebratory scaffolding. Reuse the established import set and the `Term`/`Aside`/`AnnotatedCode`/`CodeVariants`/diagram conventions. Sentence-case headers.

---

## Lesson sections

### Introduction (no header)

Open with the concrete trigger, warmly and briefly (3 short paragraphs, mirroring Lesson 1's opening rhythm):

- The scene: an invoices table, a small "Copy link" button on every row. The user clicks, expects the URL on their clipboard and a "Copied!" tick for a couple of seconds. This is the most ordinary button in a SaaS app.
- The trap: it looks like `onClick={() => navigator.clipboard.writeText(url)}` and you ship it. Then it fails — silently for some users, loudly for others — and the failures never reproduced on your machine. State the spine question explicitly in bold: **what gates this call, and why does the obvious version break in production but not in dev?**
- The promise: by the end you'll have the canonical Copy button — one async call, in the right place, wrapped so it degrades gracefully, labelled so a screen reader announces the result — and you'll know precisely which two gates decide whether the bytes ever reach the clipboard.

No diagram here; get to the API fast.

### `navigator.clipboard.writeText` in one line

Goal: install the call and the one-line mental model, and kill the legacy alternative so the student never reaches for it.

- `navigator.clipboard.writeText(text)` — the async write of a plain-text string to the system clipboard. Returns a Promise that resolves on success and rejects on failure. It *replaces* the whole clipboard contents (no append, no history surface) — state this plainly so the student isn't surprised.
- The 2026 reflex: this is the *only* copy API you write. The pre-2022 `document.execCommand('copy')` dance (create a hidden element, select it, exec) is deprecated and the synchronous selection behavior it leaned on is gone. Name it once, as the thing you'll see in old Stack Overflow answers and must not copy. Do not show `execCommand` code.
- `writeText` coerces a non-string to `String(value)` silently — pass strings, not objects. One sentence.

Code: a single `Code` block, not annotated — the call is one line. Show the bare shape (`await navigator.clipboard.writeText(url)`) so the reader sees what the next section is going to wrap and gate.

`Term` candidates introduced here:
- `transient user activation` — defined here in passing if first mentioned, but the full treatment is the next section; prefer to introduce the term there. (Decide at write time; one definition, not two.)

### The two gates that decide whether the write lands

Goal: this is the heart of the lesson. Teach the two constraints, in order, with the activation one getting a diagram. Frame as "before this call can succeed, two things must be true."

**Gate 1 — secure context.** One paragraph. The clipboard write only works on HTTPS or `localhost`; on a plain `http://` page `navigator.clipboard` is **`undefined`**, so you don't even get a promise to reject — accessing `.writeText` on `undefined` throws. This is the *same* secure-context gate Lesson 1 established for `randomUUID` and `crypto.subtle`; reference it as an already-owned reflex and point at the `mkcert` setup as the local-dev unblock. Do not re-teach TLS or secure contexts from scratch — one or two sentences and a back-reference. Use `<Term>` for `secure context` only if the student would benefit from the reminder inline; given Lesson 1 already defined it, a back-reference in prose may be enough — author's call.

**Gate 2 — transient user activation.** This is the new, load-bearing idea. Teach it carefully, simplified-first:
- Simplified model first: "the browser only lets you write to the clipboard as the *direct result of a user action* — a click, a keypress, a pointer-up. No gesture, no write."
- Then add the complication that bites people: the activation is *transient* — it expires shortly after the gesture (browsers use roughly a 1-second window, and treat it as consumed by certain async gaps). So a write fired from a `setTimeout`, from a `useEffect` on mount, from a `.then()` chained off a `fetch` that resolves after the gesture window — all rejected with `NotAllowedError`, because by the time the call runs, the activation is gone.
- Land the senior pattern as the consequence: **the write goes inside the gesture handler, synchronously reached.** Inside an `async onClick`, `await navigator.clipboard.writeText(value)` as the *first* meaningful line keeps it within the live activation. The danger pattern is doing slow work first (a network round-trip) and *then* writing — by then the activation may be spent.
- Define `<Term definition="...">transient user activation</Term>`: "A short-lived 'the user just interacted' flag the browser sets on a gesture (click, keypress) and clears about a second later. Powerful APIs like clipboard write require it to be live at call time."

Diagram (this is where the lesson earns a visual). Use a **`DiagramSequence`** — call it `ActivationWindow` as a lesson component at `src/components/lessons/016/2/ActivationWindow.astro` taking a `step` prop, mirroring Lesson 1's `ConstantTimeCompare` component pattern (so the build/import convention is identical). Pedagogical goal: make the invisible activation window *visible* on a timeline, and show three call sites landing inside vs. outside it.
- Step 1: a horizontal timeline. A click event fires; a shaded "activation live" band opens at the click and fades out ~1s later. A `writeText` call placed *immediately inside the handler* lands inside the band → resolves (green check).
- Step 2: same timeline, but the handler does `await fetch(...)` first; the call now lands *after* the band has faded → `NotAllowedError` (red). Caption: the network round-trip outlived the activation.
- Step 3: a `setTimeout(..., 2000)` / `useEffect`-on-mount call with no gesture band at all under it → rejected. Caption: no gesture, no activation, ever.
- Captions per step (the component pattern uses `<Fragment slot="caption">` per `DiagramStep`). Cap height per the diagram vertical-space rule.

Reinforce with a quick check after the diagram: a **`MultipleChoice`** (single or multi-select) asking which of several call sites would succeed — e.g. "inside onClick directly", "inside onClick but after `await fetch`", "in a `setTimeout` 500ms after the click", "in a `useEffect` on mount". Correct: the direct one (and arguably the 500ms one is the *interesting* gray-zone — keep options unambiguous: make the timeout clearly past the window, e.g. 2000ms). Write distractors so the student reasons about the activation window, not pattern-matches prose. Include `<McqWhy>` explaining the window, not just marking answers.

### The canonical Copy button

Goal: assemble the full, correct, production shape in one place. This is the deliverable.

The shape, built as a small Client Component `<CopyButton>`:
- `'use client'` at the top of the file (recognition moment — see framing; one sentence on *why* it must be client: it has an interactive handler and local feedback state, so it runs in the browser).
- Props: `value: string` (the text to copy) and an accessible label (e.g. `label: string` used for the `aria-label`), passed down from a Server Component parent. Reinforce smallest-island discipline in prose: the parent stays a Server Component; only this button is client.
- `async` click handler: `try { await navigator.clipboard.writeText(value); setCopied(true); ... } catch { /* degrade */ }`.
- A `useState` boolean (`copied`) drives the "Copied!" label swap; a `setTimeout` clears it after ~2s, with the timeout handle stored in a ref and cleared on unmount (the React-side cleanup discipline — name it, the chapter's cleanup thread and AbortController pattern from Ch 014 L3 are the lineage; do not teach the hook mechanics).
- `aria-label` on the button because the visible content is an icon or the bare word "Copy" without the object it copies — `aria-label="Copy invoice URL"`. The visible text wins when present; the label fills the gap when it's icon-only. (Code conventions: `aria-label` on icon-only buttons.)
- A live region for the confirmation: render the "Copied!" status in an element with `role="status"` so assistive tech announces it. Recognition-depth note: Chapter 027 owns live regions (the pre-mount rule, `role="alert"` vs `status`); here we just plant the correct attribute. One sentence.

Code component choice: **`AnnotatedCode`** — the button is one block but the student's attention needs directing to *multiple* distinct parts (the `'use client'` line, the placement of the `await` inside the handler, the `try/catch`, the `aria-label`, the `role="status"` element, the ref-cleanup). This is exactly AnnotatedCode's job. Keep the block within `maxLines` (≤18); if it's tight, omit imports and the ref-cleanup detail can be a single highlighted step rather than fully fleshed. Steps (each ≤6 lines prose), colored:
- Step: `'use client'` + the component signature taking `value`/`label` props — the client-island boundary.
- Step: the `async` handler with `await writeText(value)` as the first line — tie back to the activation gate ("this is *why* it's here, not in an effect").
- Step: the `try/catch` — the call rejects in real browsers; the catch is not optional. Forward-pointer to the next section for what goes in it.
- Step: the `copied` state + `setTimeout`-in-a-ref clear-on-unmount — feedback, mechanics taught later.
- Step: `aria-label` and the `role="status"` confirmation element — the accessibility baseline, inline.

Note for downstream agent: keep the JSX minimal/Tailwind-light — the lesson is about the clipboard surface, not styling. A plain `<button>` with `cn()`-free classes is fine; don't import shadcn `<Button>` here (it would pull focus and require setup the lesson doesn't own). Flag this as a deliberate simplification per the pedagogy carve-out.

### When the write fails, degrade instead of lying

Goal: own the catch branch. A Copy button that swallows failure and still flashes "Copied!" is worse than one that admits it failed. This section makes the failure path first-class.

- The two failure shapes worth handling, corrected per the fact-check:
  - *Activation expired / denied* → the promise rejects with `NotAllowedError`. User-facing: "Couldn't copy — copy it manually" plus a recovery affordance.
  - *Insecure context* (dev parity issue) → `navigator.clipboard` is **`undefined`**, so this is a feature-absence at access time, not a rejection. The senior handling: this is a development/deployment misconfiguration, not a user error; surface it loudly in dev (a console warning / dev-only banner) and ensure prod is HTTPS so it can't happen. Explicitly correct the "SecurityError" framing here for the reader's benefit only if it aids clarity — otherwise just teach the accurate shape. (Downstream agent: do NOT teach a `catch (e) { if (e.name === 'SecurityError') }` branch as the insecure-context handler — that's the inaccuracy. The insecure-context branch is feature-detection, not a catch.)
- The recovery pattern (the senior degrade): render a small fallback — a read-only `<input>`/`<textarea>` containing the value, pre-selected, in a tiny popover or inline, so the user can `Cmd/Ctrl+C` manually. Describe it in prose; a short code sketch is optional. The principle: **never show success you didn't achieve.**

Code component: **`CodeVariants`** with two tabs — "Lies on failure" (the optimistic version that sets `copied=true` unconditionally / has no catch, marked with `del`/red) vs. "Degrades honestly" (the `try/catch` with a real fallback path, green). This before/after is the section's whole argument and CodeVariants is built for it. Keep prose per tab to one paragraph.

### Reading the clipboard and rich content — recognition only

Goal: name the rest of the Clipboard API surface so the student recognizes it, with an explicit "don't reach for this by default" posture. Keep this short — one section, two short subsections or just two tight paragraphs.

- **Reading** (`readText` / `read`): they exist; they prompt for permission in Chromium and behave differently in Safari, and the SaaS reach is thin because paste is normally handled by wiring a `<textarea>`/input to the `paste` event, not by polling `clipboard.read`. Senior posture: don't read the clipboard from JS unless the feature genuinely needs it (rich paste into a doc editor, a screenshot dropped into a chat input). One-line example of `readText()` at most.
- **Rich content** (`write` + `ClipboardItem`): `navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })])` writes multiple representations at once, so a paste into a rich editor gets HTML and a paste into a terminal gets plain text. The 2026 reach: image/chart/diagram copy buttons. Show a one-line example, not a full component. Recognition note on the Safari nuance, kept light: WebKit is stricter about async data here — the value passed to a `ClipboardItem` may need to be a *Promise* that resolves within the gesture rather than awaited beforehand. Phrase as "if you ever build an image-copy button, expect a Safari-specific wrinkle around async data and the gesture" — do not over-specify; it's recognition only and the exact API ergonomics shift. Use `<Term>` for `ClipboardItem` if it helps, or just inline-code it.

Forward/lineage pointers: keep them to one line — `Blob` and the binary primitives behind a rich `ClipboardItem` are the subject of the *next* lesson (Lesson 3), so a one-line "you'll meet `Blob` properly next" is a clean bridge.

### Where this lands later (optional short close)

Goal: a brief payoff close in the Lesson 1 style, only if it adds value without padding. Likely a single short paragraph or a small `CardGrid` (2-3 cards):
- The Copy button is a reusable island you'll drop next to share links, API keys, invite URLs, generated snippets across the app.
- The activation/secure-context reflexes generalize to every other gesture-gated, secure-context-gated browser capability (the chapter's through-line).
- One-line bridge to Lesson 3 (`Blob`/`File`) since rich clipboard content and downloads share that substrate.

Keep this tight; cut it entirely if the lesson already feels complete — better short than padded.

### External resources

LinkCards (`ExternalResource` in a `CardGrid`), matching Lesson 1's pattern. 2-3 cards:
- MDN — `Clipboard.writeText()` (the method reference, error and secure-context notes).
- MDN — Clipboard API overview (security considerations, the `read`/`write`/`ClipboardItem` surface).
- Optionally a web.dev "Unblocking clipboard access" / async clipboard article for the activation + permissions model, *if* a current (post-2024) version is found — otherwise drop it rather than link something stale.

---

## Exercises summary (placement recap)

- One **`MultipleChoice`** after the activation diagram, testing the gesture-window model (which call sites succeed). Reasoning: the activation window is the single most error-prone idea in the lesson and a quick recall check cements it; distractors force reasoning about *when* the call runs relative to the gesture.
- The before/after **`CodeVariants`** in the degrade section doubles as an implicit "spot the bug" — the student sees the optimistic version is the one they'd have written.
- No live-coding `ReactCoding` exercise proposed. Rationale: a runnable clipboard exercise can't faithfully reproduce the *failure* gates inside the course's same-origin iframe sandbox (activation/secure-context behavior is environment-dependent), so a graded "make it work" exercise would teach the happy path the lesson is explicitly trying to de-emphasize. If the writing agent finds a tight, honest `ReactCoding` framing (e.g. "wire the `aria-label` and `role='status'` correctly" graded on DOM, *not* on the clipboard call succeeding), it may add one — but the conceptual `MultipleChoice` is the priority. Flag as author's discretion.

## Tooltip (`Term`) candidates

Be strategic; only these:
- `transient user activation` — the lesson's central new term; non-obvious and load-bearing. Definite include.
- `secure context` — already defined in Lesson 1; include only as a light inline reminder or rely on a prose back-reference. Author's call, lean toward not re-defining at full length.
- `ClipboardItem` — optional, recognition section only; inline code may suffice.

Do not over-tooltip. `'use client'`, `useState`, `role="status"` are named-and-deferred concepts, handled with one-line prose pointers to their owning chapters, not tooltips.

---

## Scope

What this lesson does **not** cover (prevent re-teaching prerequisites and pre-teaching future material):

- **`'use client'` at depth** — recognition only. Unit 4 / Chapter 033 (server vs client components) own the directive and the boundary. Here: one sentence on why the button is a client island.
- **React `useState` / `useEffect` / refs syntax** — Chapters 024–025 own the hook APIs. The canonical button *shows* them in real shape, but the prose explicitly defers the mechanics; the student is not expected to author hooks yet. The `setTimeout`-in-a-ref cleanup is shown as the right pattern, not taught.
- **Secure context / TLS / `mkcert`** — established in Chapter 010 L4 and reused in Chapter 016 L1. Reference as an owned reflex; do not re-explain HTTPS or certificate setup. One-line back-reference.
- **ARIA live regions at depth** — Chapter 027 L3 owns `role="status"` vs `role="alert"` and the mount-before-fill rule. Here: plant the correct `role="status"` attribute with a one-line forward pointer; do not teach the live-region lifecycle.
- **Accessibility tree / screen-reader internals** — out of scope; the `aria-label` + `role="status"` pair is shown as the baseline, not motivated from AT fundamentals beyond a sentence.
- **`Blob` / `File` / `URL.createObjectURL`** — Lesson 3 (next) owns the binary primitives. The rich-`ClipboardItem` example references a `Blob` by name with a one-line "you'll meet this next" bridge; do not teach `Blob` construction here.
- **`document.execCommand('copy')`** — deprecated; named once as the legacy thing not to copy, no code shown.
- **Drag-and-drop / `DataTransfer`** — separate substrate, out of scope entirely.
- **Custom paste-event handlers and rich-text editors** — out of scope for the 2026 SaaS surface this course teaches; the recognition section explains *why* (paste is wired to inputs, not `clipboard.read`).
- **Permissions API for clipboard read at depth** — recognition only; mention that reads can prompt, do not teach the Permissions API surface.
- **Stripe/webhook/HMAC material** — that's Lesson 1; no crypto here.

Concise prerequisite redefinitions the lesson may restate in one line (not teach): *secure context* = HTTPS-or-`localhost` page; *Client Component* = a file with `'use client'` that runs in the browser because it has interactivity/state; *Server Component parent* = the default, server-rendered component that passes the string prop down.

---

## Code-convention alignment notes (for downstream agents)

- Arrow-function component bound to `const`; named export `CopyButton` from a `copy-button.tsx`-style file (kebab filename matches export). `'use client'` as the literal first line.
- Typed props object (`{ value, label }: CopyButtonProps`), `type` alias not `interface`. Return type inference is fine for a component.
- React 19: no `forwardRef`; a ref for the timeout handle is a plain `useRef`. No `useCallback`/`useMemo` (React Compiler) — do not add memoization.
- `aria-label` on the icon/word-only button; `role="status"` on the feedback node — both required by the §Accessibility conventions.
- The sanctioned simplification (flag it as deliberate so it isn't "corrected" later): **no shadcn `<Button>`, minimal Tailwind, possibly no `cn()`** — the lesson teaches the clipboard surface and over-importing UI primitives would distract. Production code would wrap shadcn `<Button>`; the lesson uses a bare semantic `<button>` on purpose.
- Single quotes, 2-space indent, semicolons (Biome) in all blocks.
- `try/catch` around the `writeText` call is mandatory in every shown production-shaped variant (the §Error handling "gate exceptions = refusal" spirit; here a failed copy degrades, never silently "succeeds").
