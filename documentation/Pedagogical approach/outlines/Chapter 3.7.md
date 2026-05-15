## Concept 1 — Secure context as the silent-fail gate

**Why it's hard.** Three of the four APIs in this chapter (`crypto.subtle`, `crypto.randomUUID` for the strict reading, `navigator.clipboard.writeText`) refuse to work outside HTTPS or `localhost`, and the failure mode is silent or buried in a generic `SecurityError`. Students who've only run dev servers on `http://127.0.0.1:5173` or shipped to a `http://` staging box don't know the call rejected them — they think the API "doesn't work."

**Ideal teaching artifact.** A small interactive **gate-check table** as the chapter's recurring framing visual. Rows: `crypto.subtle.sign`, `crypto.randomUUID`, `navigator.clipboard.writeText`, `localStorage.setItem`, `new Blob`. Columns: `https://app.com`, `http://localhost`, `http://127.0.0.1`, `http://staging.app.com`. Each cell is a colored token — green pass, red throw, yellow "host-dependent" — that the student hovers to see the exact error string. The artifact is *Reference* archetype, designed to be re-shown at the head of each subsequent lesson with the relevant row highlighted. Pairs with one paragraph naming `mkcert` (from 3.1.3) as the prerequisite for local dev parity.

**Engagement.** A three-question `TrueFalse` round immediately after the table: "`clipboard.writeText` works on `http://localhost:3000`" (true), "`crypto.subtle.sign` works on `http://staging.example.com`" (false), "`localStorage.setItem` works on `http://`" (true).

**Components.**
- Existing — `Figure` wrapping a hand-coded HTML/SVG table with hover tooltips per cell (no new component needed — table is static-ish, tooltips are CSS); `TrueFalse` for the recall beat.
- Alternative if interactivity is wanted: a `SecureContextMatrix` widget that re-renders for each lesson with `highlightRow` prop. Demoted — re-use across four lessons in this chapter is real but the curriculum doesn't revisit the same matrix shape elsewhere.

---

## Concept 2 — The `crypto` namespace, three doors

**Why it's hard.** `crypto` is one global with three surfaces (`randomUUID`, `getRandomValues`, `subtle`) that solve three different problems at three different ergonomics levels — one-liner, fill-a-buffer, full async algorithm machinery. Students conflate them, reach for `subtle.digest` to mint an ID, or use `Math.random` because `getRandomValues` looks ceremonious.

**Ideal teaching artifact.** A *Decision* archetype **trigger-to-surface map** rendered as a three-column comparison: each column headed by the surface (`randomUUID`, `getRandomValues`, `subtle`), with the trigger that picks it ("need a unique string ID, no shape constraints" / "need bytes of a specific length and encoding" / "need to sign, verify, or hash something"), the call shape in one line, and one canonical SaaS reach (primary keys / share tokens / webhook signatures). The student then drags use-case cards into the correct column.

**Engagement.** A `Buckets` exercise: eight scenario cards ("mint an idempotency key for a POST retry", "generate a 32-byte session-share token", "verify a Stripe webhook header", "log a correlation ID", "hash a file for content-addressing", "fill a Uint8Array(16) for a nonce", "create a primary key for a `users` row", "pick a random color for a visual jitter") sort into four buckets: `randomUUID`, `getRandomValues`, `subtle`, "not crypto" (the visual jitter — `Math.random` is fine).

**Components.**
- Existing — `TabbedContent` or a three-column `Figure` for the map, `Buckets` for the sort.

---

## Concept 3 — HMAC: the import → sign → verify shape

**Why it's hard.** `crypto.subtle` is async, opaque, and ceremonial — three calls (`TextEncoder` → `importKey` → `sign`) for what feels like "hash this with a key." The student needs to internalize the shape end to end and recognize each step's role, because the same shape recurs across every webhook verification and every Better Auth internal that they'll see in later units.

**Ideal teaching artifact.** A stepped walkthrough of the canonical sign-then-verify code block, with each line revealed in turn and an actor-style annotation on the side: "you have a string secret and a string payload" → "the platform speaks bytes, so encode both" → "import the raw bytes as a `CryptoKey` with declared usages" → "sign produces an `ArrayBuffer` of signature bytes" → "hex-encode for transport, or `subtle.verify` to compare." *Mechanics* archetype. A second beat shows the verify side as a mirror — same import, `subtle.verify` instead of `subtle.sign`, returning a boolean.

**Engagement.** A `Sequence` exercise: scrambled lines from the sign flow (`new TextEncoder().encode(secret)`, `crypto.subtle.importKey(...)`, `crypto.subtle.sign(...)`, the hex-encode helper) the student drags into the correct order. Then a single `MultipleChoice`: "What does `importKey` return?" with `Uint8Array` / `ArrayBuffer` / `CryptoKey` / `Promise<CryptoKey>` as choices (correct: `Promise<CryptoKey>` — locks in the await reflex).

**Components.**
- Existing — `AnnotatedCode` for the stepped walkthrough, `Sequence` for the recall, `MultipleChoice` for the await-shape check.

---

## Concept 4 — Constant-time compare and the timing leak

**Why it's hard.** This is the chapter's headline bug class. `===` on a hex signature *works* in tests, *works* in dev, *works* in production for months — until an attacker who can issue thousands of probe requests against a webhook endpoint times the responses and recovers the prefix one character at a time. The student needs to viscerally feel that string equality short-circuits, and that the short-circuit *is* the leak.

**Ideal teaching artifact.** A **timing-leak simulator** the student pokes — a wrong-by-default sandbox. The widget shows two hex strings (the "real" signature and an "attacker guess") and a comparison mode toggle: `===` vs. constant-time XOR-accumulator. The attacker guess starts at all-zeros; the student clicks "advance one character" and the widget reveals how many character comparisons each mode actually performed (a tiny bar chart underneath). With `===`, the comparison count climbs one step per matched character — the student watches the leak emerge as the prefix grows. With constant-time, the count is flat at "length of input" regardless of how many characters match. After ten clicks the leak is undeniable. *Concept* archetype, with the artifact carrying the assessment.

**Engagement.** The simulator is the assessment. Follow with a `CodeVariants` wrong-then-right: tab 1 `if (signature === expected)`, tab 2 `if (await crypto.subtle.verify(...))`, each with one paragraph naming what they prevent.

**Components.**
- New — **`TimingLeakSimulator`**: two strings, a mode toggle, a step button, and a comparison-count bar. Single chapter use, but the bug class (constant-time compare) recurs in Unit 9 (Better Auth internals — recognition), Unit 12 (Stripe webhooks at depth), and Unit 17 (security audit pass). Forward-link weight is genuine.
- Alternative (leanest path) — a `Figure` containing a hand-SVG two-row strip showing characters being compared left-to-right under each mode, with a pre-baked annotation of comparison counts. Loses the "I clicked it and watched the count climb" beat that makes the bug click.

---

## Concept 5 — The Clipboard API's two gates and the canonical Copy button

**Why it's hard.** `navigator.clipboard.writeText` looks like a one-liner but is gated by two conditions that interact in ways the student can't predict from the call shape: secure context (covered by Concept 1) *and* transient user activation. The activation gate is the subtle one — the call works inside an `onClick`, fails inside a `setTimeout` started from that same click, fails inside a `useEffect`, fails after an `await fetch()` that took too long. The student needs the boundary, not the API.

**Ideal teaching artifact.** Two beats. First, an **activation-gate test bench** — a small widget with four buttons: "Copy directly", "Copy after 100ms `setTimeout`", "Copy after 3s `setTimeout`", "Copy after `await fetch('/slow')`". The student clicks each, sees which succeeded and which threw `NotAllowedError`, and a one-line readout names the rule the failure broke. *Mechanics* + *Pattern* archetype. Second, a `ReactCoding` live exercise where the student builds the canonical Copy button — `'use client'`, `try/catch`, feedback state, `aria-label` — against three behavioral tests (clicks the button, asserts `navigator.clipboard` was called with the right string, asserts the visible "Copied!" feedback appears and clears).

**Engagement.** The `ReactCoding` exercise is the assessment. Add a one-question `MultipleChoice` after: "Which of these copy calls will succeed in production?" with the four scenarios from the test bench — student picks the two that survive the activation gate.

**Components.**
- New — **`UserActivationLab`**: a fixed widget with four trigger variants and a pass/fail readout per click. Single chapter use; the activation-gate concept also surfaces in Web Audio autoplay (not in scope) and the Permissions API (recognition only later). Forward-link weight is thin.
- Demoted to alternative: the four-button widget is single-use without a strong forward link. Default to a `Figure` containing a hand-SVG timeline with four scenarios drawn as gesture-pulse → microtask → call site, each annotated pass/fail. Less visceral, but the timeline metaphor *is* what the student needs.
- Existing — `ReactCoding` for the Copy button exercise, `CodeVariants` for the `'use client'` placement (right: button is a tiny client island; wrong: whole page is `'use client'`).

---

## Concept 6 — Blob is what you mint, File is what you receive

**Why it's hard.** `Blob` and `File` are nearly identical types with a directional rule that students miss: the browser hands your code `File` objects (from `<input type="file">`, drag-drop), and your code mints `Blob` objects (when building an upload payload, generating a CSV in memory). Students reach for `new File(...)` constructors that exist but are never the senior reach, or treat `File` and `Blob` as interchangeable until the missing `.name` bites.

**Ideal teaching artifact.** A *Concept* archetype **directional diagram**: on the left, the user's OS (a folder icon, files in it); in the middle, the browser as a membrane; on the right, your code. An arrow from OS → browser → your code is labeled "`File` — has `.name`, `.lastModified`, `.size`, `.type`"; an arrow from your code → browser is labeled "`Blob` — has `.size`, `.type`". A small inset shows `File extends Blob` as the type hierarchy. The student sees the asymmetry visually before any code.

**Engagement.** A `Tokens` exercise on a 12-line code block (an upload flow): the student clicks every spot where a `Blob` is being minted (correct: `new Blob([csv], {type})`, `Response.blob()` return, a `blob.slice(...)` call) versus every spot where a `File` is being received (correct: `event.target.files[0]`, `dataTransfer.files`). Decoys: `URL.createObjectURL(file)` (file is a use, not a mint), `await blob.arrayBuffer()` (consuming, not minting).

**Components.**
- Existing — `Figure` with a hand-coded SVG of the OS → browser → code diagram, `Tokens` for the recall.

---

## Concept 7 — `createObjectURL` lifecycle and the revoke reflex

**Why it's hard.** `URL.createObjectURL(blob)` returns a URL that looks like any other URL but is backed by an in-memory map the browser holds. Without `revokeObjectURL`, every re-pick leaks the previous `Blob`; in a gallery component re-rendering on filter changes, the leak compounds until the tab crashes. The bug class is invisible in dev with one file and lethal in production with twenty thumbnails.

**Ideal teaching artifact.** A *Pattern* archetype **leak-meter sandbox**. A `ReactCoding`-style preview shows a file picker, a thumbnail, and a live counter labeled "blob URLs currently held by this document." The student is given a broken component (no `revokeObjectURL`) and asked to pick the same file five times. The counter climbs to 5. A second tab shows the fixed version with `useEffect` cleanup; the counter stays at 1 no matter how many times they pick. The student then writes the cleanup themselves against a test that picks five files and asserts the counter ends at 1.

**Engagement.** The `ReactCoding` exercise is the assessment. Follow with a `MultipleChoice`: "Where does the `revokeObjectURL` belong?" — choices: "right after `createObjectURL`" (wrong — breaks the consumer), "inside the `useEffect` cleanup return" (correct), "in `img.onload`" (sometimes correct — name the trade-off in the explanation), "on document unload" (browser does this for you).

**Components.**
- New — **`BlobUrlLeakMeter`**: a `ReactCoding` runner extension that exposes a counter of live blob URLs from inside the iframe, displayed alongside the preview. Single chapter use; the broader "lifecycle / cleanup reflex" concept recurs in `AbortController` cleanup (3.5.3, already taught), `useEffect` cleanup (Unit 4), event-listener cleanup (Unit 4), `storage` event unsubscription (Concept 9). The *meter widget* itself is single-purpose.
- Demoted to alternative: replace the live counter with a `Figure` containing a hand-SVG strip showing five sequential file-picks under each mode, with little memory-cell icons accumulating under the broken version and recycling under the fixed one. Static, but the visual is strong. Pair with a normal `ReactCoding` exercise for the cleanup write.

---

## Concept 8 — The four-home decision tree for client state

**Why it's hard.** `localStorage` is taught everywhere as "the way to persist state in the browser" — which leads students to use it as a default, push auth tokens into it, ship cart contents to it, treat it as the answer when the real answer is `useState`, the URL, the server, or a cookie. The senior reflex is the opposite: walk a five-home tree top to bottom and only reach for `localStorage` at the leaf.

**Ideal teaching artifact.** A *Decision* archetype **walk-the-tree** flow. A flowchart with five terminal nodes (`useState`, URL state, server state, cookie, `localStorage`) and a sequence of decision questions from the top: "does it need to survive unmount?" → "must it be shareable/bookmarkable?" → "must it be queryable across devices?" → "must it travel on every request, or be `HttpOnly`?" → "is it cheap to lose and not worth a server round-trip?" The student traces a sample state ("dismissed banner bit") down the tree and lands on `localStorage`; then traces "auth session" and lands on cookie; then traces "active filter for a shareable list view" and lands on URL.

**Engagement.** A `Buckets` exercise with eight state shapes and five buckets: "user's preferred theme before hydration" (cookie), "active table filter on a shareable URL" (URL), "draft comment text in a modal" (`useState`), "list of last-viewed invoices" (server — must be cross-device), "dismissed 'try the new dashboard' banner" (`localStorage`), "auth session ID" (cookie HttpOnly), "in-progress wizard step for a multi-step form" (`sessionStorage` — bonus bucket or count toward `localStorage`), "user's name in the navbar" (server).

**Components.**
- Existing — `Figure` with hand-SVG of the decision tree, `Buckets` for the sort. Resist proposing a "DecisionTree" bespoke component; the tree is static and prose can walk it.

---

## Concept 9 — `localStorage` under SSR: the hydration trap

**Why it's hard.** `localStorage` doesn't exist on the server. Reading it at the top of a module crashes the build. Reading it inside JSX renders different HTML on server vs. client and produces a hydration mismatch — the kind that goes loud in dev with a red console error and silently corrupts re-renders in production. The student needs three patterns ranked by reach: `typeof window` guard, `useEffect` deferred read, `useSyncExternalStore` with `getServerSnapshot`.

**Ideal teaching artifact.** Two beats. First, a **server vs. client render comparison**: a side-by-side panel showing the same component once rendered on the server (where `localStorage` reads return `undefined`) and once on the client (where it returns `'dark'`), with the resulting HTML diff highlighted between them — this *is* a hydration mismatch, visually. *Concept* archetype. Second, three `CodeVariants` tabs for the three fix patterns, each with one paragraph naming the trigger that picks it: inline read with `typeof window` guard (one-shot, no reactivity), `useEffect` deferred read (reactive within the tab), `useSyncExternalStore` (reactive *and* cross-tab via the `storage` event).

**Engagement.** A `PredictOutput` exercise on a small Next.js component that reads `localStorage.getItem('theme')` directly inside JSX: "what does the server log? what does the client render? what does the DevTools console say?" The expected answer names the mismatch and the React warning. Follow with a `MultipleChoice` on which fix pattern matches a given trigger ("the value must update when another tab logs out").

**Components.**
- Existing — `TabbedContent` for the server/client render comparison (two panels side by side, captioned with the HTML each side produced), `CodeVariants` for the three fix patterns, `PredictOutput` for the mismatch recall.

---

## Component proposals

- **`TimingLeakSimulator`**
  - Sketch: two hex strings (`real`, `guess`), a comparison-mode toggle (`===` vs constant-time XOR), a "step one character" button, and a bar showing comparisons performed per click. Reveals the short-circuit visually.
  - Uses in this chapter: Concept 4.
  - Forward-links: Unit 9 (Better Auth signature internals — recognition), Unit 12 (Stripe webhook signing at depth), Unit 17 (security audit pass — constant-time as a class).
  - Leanest v1: hardcoded pair of strings, two pre-baked traces (one per mode) the student steps through with prev/next chevrons — no live computation, no input field. Still teaches the leak; rebuild as live only if the chapter pulls.

- **`BlobUrlLeakMeter`** (demoted in concept 7 — listed for completeness)
  - Sketch: a `ReactCoding` extension that surfaces the iframe's live count of unrevoked blob URLs alongside the preview.
  - Uses in this chapter: Concept 7.
  - Forward-links: None — single-use. The lifecycle concept recurs broadly, but the meter widget is specific to blob URLs.
  - Leanest v1: a static `Figure` strip (see Concept 7 alternative) plus a regular `ReactCoding` exercise — no widget extension needed. Recommended.

- **`UserActivationLab`** (demoted in concept 5 — listed for completeness)
  - Sketch: four trigger buttons in a fixed widget, each calling `clipboard.writeText` through a different timing path; readout shows pass/fail per click with the rule name.
  - Uses in this chapter: Concept 5.
  - Forward-links: None — single-use in this curriculum. The activation gate doesn't recur with weight.
  - Leanest v1: a hand-SVG timeline `Figure` showing the four scenarios annotated pass/fail. Recommended.

## Build priority

`TimingLeakSimulator` is the only proposal worth building. The timing-leak concept is load-bearing — it's the chapter's headline bug class, it's the only place in the chapter where a static figure genuinely under-teaches, and the forward-links into Unit 12 and Unit 17 are real. Build it at v1 scope (pre-baked traces, prev/next stepping) and upgrade only if Unit 12 needs the live-input variant.

The other two proposals (`BlobUrlLeakMeter`, `UserActivationLab`) are correctly demoted to `Figure`-wrapped static alternatives — they're single-use and the static versions teach the concept once the surrounding prose and live coding exercise carry their weight.

## Open pedagogical questions

- Concept 1's gate-check matrix is designed to recur at the head of each lesson. Confirm whether re-showing the same `Figure` four times (with a different row highlighted) reads as repetitive or as a useful spaced-recall beat — if the latter, the chapter MDX shells should call it out as a deliberate pattern.
- Concept 9 leans on `useSyncExternalStore` at *recognition* depth — the hook itself is taught later in Unit 4 or Unit 16. Confirm the recognition-only treatment here is enough, or whether the chapter should defer the third pattern entirely and teach only the `typeof window` guard plus `useEffect` deferred read.
