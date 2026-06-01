# Lesson 3 — Blob, File, and URL.createObjectURL: the upload primitives

- **Title (h1):** Blob, File, and object URLs: the upload primitives
- **Sidebar label:** Blob, File, object URLs

---

## Lesson framing

Conclusions from brainstorming that govern the whole lesson:

**The senior question (implicit, in the intro narrative).** Same recurring concrete trigger as the rest of the chapter: the SaaS UI. Here it's a profile-photo field — `<input type="file" accept="image/*">`, on pick show a preview thumbnail + filename, on save the bytes go straight to R2. The student writes the obvious `<img src={file}>` and it renders nothing (a `File` is not a URL); reaches for `FileReader` (the 2015 answer) and writes 15 lines of event handlers; or wires `createObjectURL` correctly but never revokes and the tab leaks a megabyte per re-pick. The lesson installs three types and lands one reflex: **every `createObjectURL` has a matching `revokeObjectURL`.**

**The mental model the student should end with.** Three nouns in a chain: `Blob` = an immutable bag of bytes with a claimed MIME type; `File` = a `Blob` the OS handed you, with a `name` and `lastModified` bolted on; `URL.createObjectURL(blobOrFile)` = a short string handle (`blob:…/uuid`) the browser maps to those bytes in memory so a DOM element can render them. The handle is cheap but the bytes behind it stay pinned until you revoke the handle or the page unloads. Direction matters and is the load-bearing framing: **bytes from the user arrive as `File`; bytes your code mints are `Blob`; both become renderable through the same `createObjectURL`.**

**What the student can do at the end.** Read a picked `File` off a change event, build a leak-free pick-to-preview flow (and articulate *where* the revoke belongs and *why not earlier*), recognize the symmetric generate-a-CSV-and-download case, and name the boundary where the client's `File` hands off to the server (presigned PUT, Ch 068/069) without trying to learn that flow here.

**Where beginners go wrong (each gets airtime at its concept).** (1) Treating a `File` as a string — `src={file}` renders broken. (2) Reaching for `FileReader.readAsDataURL` — works, but it's the legacy event API and a base64 data URL inlines the whole file as a string (bigger, slower) where an object URL is a constant-size handle. (3) Never revoking → the memory-leak class, which compounds in a gallery/list. (4) Revoking too early — before the `<img>` has loaded — which breaks the preview (confirmed nuance from MDN + 2026 React-preview guidance). (5) Trusting `accept` as validation. (6) Iterating `FileList` as if it were an array.

**Distinct-from-the-rest-of-chapter constraint (correct a chapter-outline overreach).** The chapter framing groups all four APIs under "secure context" and "client-only." For *this* lesson the truth is split and must be stated precisely: `Blob`/`File`/`createObjectURL` are **NOT secure-context gated** — they work on plain `http://` (verified against MDN; unlike `crypto.subtle`/`randomUUID` and `clipboard`). They **are** client-only / browser-only (they break a Server Component — no `window`/`URL.createObjectURL`/DOM on the server), so the `'use client'` boundary thread does carry forward. Do not repeat the secure-context reflex here; explicitly note the contrast in one line so the student doesn't over-generalize from lessons 1–2.

**Cognitive-load shape.** Strict build order: one noun at a time (`Blob` → `File` → `createObjectURL` → `revokeObjectURL`), each in "one line" framing matching the chapter's established `... in one line` section style, then assemble the canonical flow once the pieces exist, then the lifecycle reflex as the climax, then two short "you'll also meet this" recognitions (download-a-generated-file, the R2 handoff), then a leak-spotting exercise. The lifecycle is the hard idea, so it gets the chapter's signature `DiagramSequence` + a lesson-specific `.astro` component (mirroring L1 `ConstantTimeCompare` / L2 `ActivationWindow`).

**Voice and house style (match L1/L2 exactly).** Warm, concrete, second-person intro that poses the bolded question; adult/terse body; no celebratory tone. Bare-semantic JSX with the "sanctioned simplification" note (no design-system component, minimal/no Tailwind, hook mechanics named-and-deferred to Unit 3). `Term` tooltips with multi-line definitions. Close with a "Where this lands later" `CardGrid` + an External resources `CardGrid` of `ExternalResource` cards. Use the same component import style and relative paths as L2.

**React-hook discipline (named, not taught — consistent with L2).** The pick-to-preview shape needs `useState` + `useEffect` cleanup. Treat exactly as L2 treated the Copy button: show the shape in `AnnotatedCode`, name the hooks, point forward (Unit 3 / Ch 024–025 own the mechanics; `useEffect` cleanup specifically for the revoke). Do not teach `useState`/`useEffect` here.

---

## Lesson sections

### Intro (no header)

Narrative, ~2 short paragraphs, mirroring L2's opening rhythm.

- Para 1: the profile-photo field on a settings page. User picks a photo, expects an instant preview thumbnail and the filename next to it; on save the bytes upload. Ordinary SaaS surface — avatar pickers, attachment previews, logo uploads, CSV imports — you build a version of it constantly.
- Para 2: the obvious move fails in three different ways. `<img src={pickedFile}>` shows a broken-image icon (a file object isn't a URL). The Stack-Overflow-top-answer move, `FileReader`, works but is a pile of event-handler boilerplate from another era. And the version that *does* render — `createObjectURL` — quietly leaks memory on every re-pick unless you do one more thing. End on the bolded question: **What are the platform primitives that turn picked bytes into a preview, and what is the one cleanup step that keeps the obvious version from leaking?** State the payoff: by the end, a leak-free pick-to-preview island and a clear model of where the bytes go next.

Reasoning: the chapter's pedagogy is "trigger before tool" — open with the threshold (need to render user-picked bytes) and the failure of the naive reach, then install the tool.

### `Blob` — an immutable bag of bytes

Teach `Blob` first; it's the base type `File` extends, so the dependency order is bottom-up.

Content:
- One-line definition: an immutable, fixed sequence of bytes with two properties the consumer reads — `size` (byte length, a number) and `type` (the MIME string the *producer claimed*, e.g. `'image/png'`; emphasize *claimed*, not verified — seeds the validation point later).
- Construction: `new Blob(parts, { type })` where `parts` is an array of strings, `ArrayBuffer`s, typed arrays (`Uint8Array` — callback to Ch 015 L2 / Ch 016 L1), or other `Blob`s. Show one tiny construct: `new Blob(['id,name\n1,Ada\n'], { type: 'text/csv' })`.
- When *you* mint a Blob: building an upload/download payload in memory, slicing a larger file, assembling generated content. Tie back to the chapter: rich `ClipboardItem` content (L2) was `Blob`s; `Response.blob()` (Ch 015 L1) returns one; `fetch` upload bodies accept one. The senior framing: **`Blob` is the universal in-memory binary container** the platform hands around.
- One watch-out, inline at the concept: `new Blob(['hello'])` with no `type` gives `type === ''`, which most consumers treat as `application/octet-stream` — pass an explicit `type` when a consumer will branch on it.

Components:
- Simple `Code` block for the construct example (short, single focus — no `AnnotatedCode` needed yet).
- `Term` on `MIME type` (multi-line: "A short string like `image/png` or `text/csv` that labels the kind of bytes. The Blob carries whatever the producer claims — it is not verified against the actual content.").

Reasoning: `Blob` is the least-familiar of the three to a junior from another field, so it earns a clean standalone beat before `File` complicates it.

### `File` — a Blob the OS handed you

Content:
- One-line definition: `File` is a subclass of `Blob` (so it *has* `size`, `type`, `slice`, `arrayBuffer`, …) plus two extra read-only properties — `name` (the filename as the OS reports it) and `lastModified` (a millisecond epoch number).
- Key fact: **your code never constructs a `File`; the browser does.** You receive `File` objects from exactly two places: the `<input type="file">` `change` event populates `event.target.files` (a `FileList`), and drag-drop populates `event.dataTransfer.files` (drag-drop named once, out of scope — file input covers the SaaS reach).
- Reading the picked file off the event: `const file = event.target.files?.[0]` for single-pick; with `multiple`, iterate. Land the watch-out *here*: `FileList` is array-like but **not an array** — no `.map`/`.filter`; spread (`[...files]`) or `Array.from(files)` before iterating. (Conventions §: prefer the spread.)
- `accept` attribute: `<input type="file" accept="image/png,image/jpeg,image/webp">` filters what the OS picker offers, **but does not validate** — a determined user drops anything past it. The senior reflex, stated crisply and forward-referenced: **`accept` is UX; content-type + magic-byte validation is security, and it lives on the server** (Ch 068/069 — the HEAD-verify-the-real-content-type step).
- Land the direction rule explicitly as the section's takeaway: **bytes from the user → `File`; bytes you mint → `Blob`.** This is the single sentence that organizes the whole lesson.

Components:
- `AnnotatedCode` (tsx) on a minimal `<input>` + `onChange` snippet — 3–4 steps directing focus to: the `accept` attribute (UX-not-validation), `event.target.files?.[0]` (the optional-chain because no selection → `null`), the `[...files]` spread for the multiple case, and stashing the `File` in state. This is the first block worth multi-part attention, so `AnnotatedCode` over plain `Code`. Keep ≤18 lines.
- `Term` on `FileList` (multi-line: "An array-like list of `File` objects the browser fills from a file input or drop. Has `length` and index access but no array methods — spread it (`[...files]`) before mapping.").
- Optional `Term` on `epoch` / millisecond timestamp if `lastModified` confuses — only if it reads as jargon; likely skip to stay strategic.

Reasoning: `File` is where the student's actual code starts (the change event), so the practical reading pattern + the `accept`-is-not-validation reflex both belong here, at the call site.

### `URL.createObjectURL` — a renderable handle for bytes

Content:
- One-line definition: `URL.createObjectURL(blobOrFile)` returns a **string** of the form `blob:https://app.example.com/<uuid>` that any DOM element can consume as a URL — `<img src>`, `<video src>`, `<a href download>`, `<iframe src>`. Accepts a `Blob`, a `File`, or a `MediaSource` (the last named once; not a SaaS reach).
- The mechanism, stated plainly (this is the conceptual crux): the browser keeps an **in-memory map** from that URL string to the underlying bytes. The URL is cheap to create and read, but **the bytes stay alive in memory as long as the mapping exists** — until you revoke it or the document unloads. Foreshadow the leak.
- The contrast that earns the choice over `FileReader`/data URLs: a data URL (`data:image/png;base64,…`) *inlines the entire file as a base64 string* — ~33% larger, allocated as a string, regenerated on every read. An object URL is a constant-size handle no matter how big the file. The 2026 default for previews is `createObjectURL`; `FileReader` is the event-based legacy path and only earns its weight when you specifically need its progress events (recognition only — name it, don't teach it).
- The not-secure-context note (the deliberate contrast with L1/L2): unlike `crypto.subtle`/`randomUUID` and the clipboard write, **these primitives are not gated by a secure context** — they work on plain `http://`. What *does* constrain them: they're **browser-only**, so they can't run in a Server Component (`URL.createObjectURL` and the DOM elements that consume the URL don't exist on the server). That's why the preview lives in a `'use client'` island — same boundary discipline as the Copy button, different reason. One or two sentences; don't belabor.

Components:
- Simple `Code` block: `const previewUrl = URL.createObjectURL(file);` then `<img src={previewUrl} alt="" />`.
- `Term` on `object URL` (multi-line: "A temporary string handle of the form `blob:<origin>/<uuid>` that maps to bytes held in browser memory. Any element that takes a URL can read it; the bytes stay pinned until the URL is revoked.").
- `Term` on `data URL` (multi-line, used in the contrast: "A `data:<type>;base64,…` string that embeds the file's bytes inline. Self-contained but ~33% larger than the raw bytes and re-encoded on every use — an object URL is a constant-size handle instead.").

Reasoning: the student needs the in-memory-map mental model *before* the lifecycle section can land, because the leak is a direct consequence of that map. The data-URL contrast is the "why this and not the thing you'd google" beat the course's pedagogy demands.

### `revokeObjectURL` and the lifecycle: where the cleanup belongs

The climax. The chapter's signature visual + the canonical assembled shape live here.

Content:
- `URL.revokeObjectURL(url)`: the mirror call. It removes the map entry, which lets the bytes be garbage-collected. State the reflex as the chapter's cleanup through-line (lineage: Ch 014 L3 AbortController, L2's `setTimeout`-handle-in-a-ref): **every `createObjectURL` has a matching `revokeObjectURL`.**
- The leak class, made concrete: without the revoke, every re-pick mints a fresh URL and the *previous* bytes stay pinned forever. In a one-off avatar picker that's one stale blob; in a gallery/multi-file list it scales linearly with re-picks and re-renders until the tab's memory balloons. This is the bug the lesson exists to prevent.
- **Where the revoke belongs — and the timing footgun.** Two correct homes, picked by context: (a) in a `useEffect` cleanup return keyed to the file/URL, so swapping the picked file or unmounting revokes the old URL; (b) for a one-shot generated download, right after the consumer is done with it (e.g. in the link's click handler, or on `img.onload`). The footgun, stated as its own beat (verified nuance): **do not revoke too early.** Revoke synchronously right after setting `<img src>` and the browser may not have read the bytes yet → broken image. The revoke runs on *unmount* or *when the URL changes*, not immediately after the element mounts. This is the single most common way the "I added cleanup and now my preview is blank" bug happens.
- Lifecycle facts worth stating once (watch-outs, inline): `blob:` URLs are **origin-scoped** — can't be shared across tabs, don't survive a page reload. The browser revokes *all* of a page's object URLs on unload, so manual revoke is about *tab lifetime*, not OS cleanup. Setting `<img src>` to an already-revoked URL renders the broken-image icon.

Diagram — lesson-specific component `ObjectUrlLifecycle.astro` at `src/components/lessons/016/3/`, driven by `DiagramSequence` (mirror the L1/L2 build convention: a `.astro` component taking a `step` prop, rendered once per `DiagramStep` with a caption). Pedagogical goal: make the invisible in-memory mapping and the leak visible. Proposed 4–5 steps (HTML+CSS visual — a small "memory" box on one side holding pinned byte-blocks, a `<img>`/URL handle on the other, an arrow = the live mapping):

1. **Pick #1.** `createObjectURL(fileA)` → one byte-block in memory, one live arrow to the `<img>`. Caption: the map entry pins the bytes; the preview renders.
2. **Re-pick (the leak), no revoke.** `createObjectURL(fileB)` → `<img>` now points at block B, but block A is still pinned with a dangling arrow (no element references it, yet memory holds it). Caption: this is the leak — the old bytes have no consumer but are never released.
3. **Re-pick done right.** Cleanup revokes URL A *before/as* B is created → block A drops out of memory, only B remains. Caption: the matching `revokeObjectURL` lets A be collected.
4. **Revoke too early (the footgun).** URL created, `<img src>` set, then revoked synchronously before load → broken image, empty preview. Caption: revoke after the consumer is done, on unmount or URL change — not the instant the element mounts.
5. (optional) **Unmount.** Component leaves, cleanup revokes the last URL → memory empty. Caption: cleanup covers the swap *and* the unmount.

Wrap each step's body in the `.astro` component; per-step `caption` slots (rich, with inline code) as in L2. Build as HTML+CSS per the diagrams guide (heed the Starlight prose-margin gotcha: `margin: 0` on every inner element; saturated mid-tone fills with white text for theme safety; keep height well under 800px). This is a "simple visual aid that enriches the lesson," exactly the kind the diagram guide endorses — not a system graph.

The canonical pick-to-preview shape — `AnnotatedCode` (tsx), the lesson's centerpiece code block. The whole leak-free client island, written once, stepped through. Shape (keep ≤18 visible lines; hook mechanics named-and-deferred):

```
'use client';

type AvatarPickerProps = { ... };  // or no props — picks locally

export const AvatarPicker = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);   // cleanup: runs on file change + unmount
  }, [file]);

  return (
    <div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl && <img src={previewUrl} alt="" />}
      {file && <p>{file.name}</p>}
    </div>
  );
};
```

`AnnotatedStep`s (color per L2 convention — violet for boundary, green for the create, orange for the cleanup/footgun, blue for state/render):
1. (violet) `'use client'` — browser-only island; the `<input>`, `createObjectURL`, and `<img>` all need the DOM, so this can't be a Server Component. Same boundary as the Copy button, different reason (no secure-context gate here).
2. (blue) the two state slots — the picked `File`, the derived preview URL string.
3. (green) inside the effect: `createObjectURL(file)` mints the handle when a file is present.
4. (orange) **the cleanup return is the whole lesson in one line** — `revokeObjectURL` fires when `file` changes (old URL released before the new one renders) or on unmount. Note explicitly: it does *not* fire synchronously after `<img>` mounts, which is exactly why the preview survives.
5. (blue) `accept` is UX-only; `e.target.files?.[0] ?? null` handles the no-selection case; `<img>` renders only once a URL exists.

Sanctioned-simplification note after the block (verbatim spirit of L2): bare semantic markup, no design-system input, no styling — deliberate, so focus stays on the byte primitives, not the chrome. Production wires this to the design system and (next chapters) to an upload action. The hook mechanics (`useState`, `useEffect`, the cleanup-return contract) land in Unit 3 — here, see the shape.

`:::caution` aside reinforcing the timing footgun: the revoke lives in the cleanup *return*, not beside the `createObjectURL` call. Putting `revokeObjectURL(url)` on the next line after creating it blanks the preview — the `<img>` hasn't read the bytes yet.

Reasoning: this is the section that justifies the lesson. The diagram externalizes the invisible memory map (the thing students can't see and therefore don't reason about), and the annotated component is the concrete artifact they'll reproduce. The footgun gets equal billing to the leak because "I added cleanup and broke my preview" is as common as the leak itself.

### Two more shapes you'll meet: download a generated file, and the upload handoff

Two short recognition beats — neither taught at depth — so the student recognizes the symmetric and the forward cases. Keep tight.

**Downloading a generated file (the symmetric case — `Blob` direction).** When the app *mints* bytes in the browser (a CSV export, a generated PDF/JSON), the reflex is the mirror of preview: `new Blob([csvString], { type: 'text/csv' })` → `createObjectURL` → an `<a href={url} download="report.csv">` the user clicks (or trigger the click programmatically) → revoke after the click fires. This closes the loop on the `Blob`-vs-`File` direction: same `createObjectURL`, bytes you minted instead of bytes the user picked.
- Component: a short `Code` block (the four-line handler), not annotated — it's a recognition echo of the pattern just taught.

**The upload handoff (forward reference, named once).** Where the picked `File` actually goes in production: the client posts the file's `name` + `type` + `size` to a Server Action; the action returns a presigned PUT URL; the client `fetch`/`XMLHttpRequest`-PUTs the **`File` itself** straight to R2 (the function never sees the bytes); then notifies the server to write the metadata row. The `File` object from this lesson is the body that PUT accepts — that's the seam this lesson builds toward. Owned by **Chapter 068** (presigned PUT/GET mechanics, content-type + size validation) and **Chapter 069** (the project: `XMLHttpRequest` upload with progress, `file_metadata`, HEAD-verify). One short paragraph; do not teach the flow. (Correct the chapter-outline's vague "Unit chapter 069"/"Chapter 072" — the real targets are Ch 068 + Ch 069.)
- Optional tiny `ArrowDiagram` inside a `Figure`: three boxes — `Client: File` → `Server Action: sign` → `R2: PUT` — with the return arrow `presigned URL` and a note "bytes skip the server." Only if it reads cleanly at small size; otherwise prose + the CardGrid forward-ref tile covers it. Lean toward prose to keep the lesson tight; the lifecycle diagram is the one that earns its weight.

Reasoning: the symmetric download case cements the `Blob`/`File` direction model with near-zero new load. The R2 handoff is the chapter framing's promised foreshadow and gives the lesson its "why this matters" payoff, but it's explicitly someone else's lesson — name and move on.

### Spot the leak (exercise)

Place the check-understanding exercise at the end of the lifecycle material's arc (after the "two more shapes" section, as the consolidation beat). Two candidates considered:

- **Primary — `ReactCoding` (tests mode), "fix the leaking preview."** Starter: a pick-to-preview `App` that creates an object URL on change but never revokes (the canonical bug). Task: make it leak-free. This is the best fit because the lesson's whole skill is *writing* the cleanup correctly, and `ReactCoding` runs real React 19 + the actual DOM. Grading approach for the agent: tests assert (a) an `<img>` renders with a `blob:` `src` after a simulated file pick, and (b) the revoke is wired — assert via spying on `URL.revokeObjectURL` (override it in the test harness to record calls) that re-picking or unmounting triggers a revoke of the prior URL. If reliably simulating a file-input `change` + `URL.revokeObjectURL` spy inside the `ReactCoding` iframe proves too fiddly, fall back to the secondary exercise rather than ship a flaky test.
  - If `ReactCoding` is used, set `instructions` to frame the bug ("This preview leaks a Blob on every re-pick — wire the cleanup so it doesn't"), provide the buggy `useState`/`useEffect` starter, keep it ≤ ~25 lines.

- **Secondary / fallback — `MultipleChoice` (select-all), "which of these leak / break?"** Mirrors L2's MCQ exactly in spirit. Present 4–5 small snippets and ask which leak, which break the preview, which are correct: (1) `createObjectURL` with revoke in `useEffect` cleanup return → correct; (2) `createObjectURL` then `revokeObjectURL` on the very next line → breaks preview (too early); (3) `createObjectURL` with no revoke → leaks; (4) revoke in cleanup keyed `[file]` → correct; (5) `<img src={file}>` (no `createObjectURL`) → renders nothing. Rich `McqWhy` explaining the leak/timing/type-mismatch trio. This guarantees coverage of *all three* failure modes (leak, too-early, type) even if the coding harness is dropped.

Recommend the agent attempt `ReactCoding` first (active recall of the actual skill) and keep the `MultipleChoice` as the guaranteed-shippable fallback; one of the two must ship.

Reasoning: the lesson's single durable skill is wiring the revoke correctly *with the right timing*, so an exercise that exercises exactly that (write it, or discriminate correct-vs-leak-vs-too-early) is worth more than a recall quiz on definitions.

### Where this lands later (closing)

Closing `CardGrid` of 3 `Card`s, matching L2's "Where this lands later" pattern (warm, forward-looking, names the payoff):
1. **One picker, everywhere** — the pick-to-preview island is the same shape behind avatars, attachment thumbnails, logo uploads, CSV import previews; it carries the revoke reflex with it.
2. **The cleanup reflex is the chapter's through-line** — `revokeObjectURL` joins `abort` (Ch 014) and the cleared `setTimeout` (L2): every resource you open in the browser, you close. Name it once, reuse forever.
3. **Next: the bytes leave the browser** — the `File` you previewed is the body a presigned PUT uploads straight to R2 (Ch 068/069). This lesson built the client half of the upload seam.

### External resources

`CardGrid` of `ExternalResource` cards (match L2's selection — MDN canon + one deeper explainer). Candidates:
- MDN — `Blob` (the type, `size`/`type`, the consumer methods).
- MDN — `File` (the subclass, `name`/`lastModified`, where it comes from).
- MDN — `URL.createObjectURL()` (return shape, accepted types, the memory-management note).
- MDN — `URL.revokeObjectURL()` (the cleanup half).
- Optionally a single web.dev / "file upload preview in React" explainer for the lifecycle-in-React framing — only if it adds beyond MDN; keep the set tight (4 cards is enough).

Optional `VideoCallout` (only if a genuinely on-topic, recent short video is found by the resourcer — L2 included one): a focused "file preview / object URL in React" walkthrough. Not required; the lifecycle diagram + annotated component already carry the visual load. Leave a clear note that it's optional and must be vetted, not assumed.

---

## Scope

**Prerequisites to redefine concisely (assume taught, one-line refresh max, do not re-teach):**
- `Uint8Array`, `ArrayBuffer`, `TextEncoder` (Ch 015 L2 / Ch 016 L1) — referenced as valid `Blob` constructor parts; one-line callback, no re-teach.
- `'use client'` / Client Component boundary (named in L2, owned by Unit 4 / Ch 033) — name it as the marker that ships a file to the browser; do not teach the directive.
- `useState` / `useEffect` and the cleanup-return contract (Unit 3 / Ch 024–025) — show the shape, name the hooks, defer mechanics. Same treatment as L2.
- Secure context / `mkcert` (Ch 016 L1, Ch 010 L4) — referenced *only* to draw the contrast (these primitives are NOT gated by it); do not re-teach the concept.
- `Response.blob()` / `fetch` bodies (Ch 015 L1) — one-line callbacks as places `Blob` already appears.
- `ClipboardItem` Blobs (Ch 016 L2) — one-line bridge from the previous lesson.

**Explicitly out of scope (do not teach; defer or cut):**
- The R2 presigned PUT/GET flow at depth, content-type/magic-byte validation, the `file_metadata` row, HEAD verification, upload progress — **Chapter 068 (mechanics) and Chapter 069 (project)**. Named once as the forward reference only.
- Drag-and-drop and `DataTransfer` / `dataTransfer.items` — named once (drop also yields `File`s), not taught; the file input covers the SaaS reach.
- `FileReader` and its event/progress API at depth — recognition only; named as the legacy path `createObjectURL` replaces, plus its one remaining niche (progress events). No `FileReader` code shown.
- Client-side image processing — resize, EXIF strip, canvas re-encode — out of scope; the senior reach is a server-side image pipeline (Unit 12). Name in one line if it comes up, otherwise cut.
- Streaming uploads with `ReadableStream` bodies, `blob.stream()` at depth — Ch 015 owns streams; the upload case is Ch 068/069. `blob.slice`/`arrayBuffer`/`text`/`stream` named for recognition only (the body-consumer family symmetric to `Response`), not exercised.
- IndexedDB for offline/blob storage — niche, out of scope (Web Storage decision tree is L4, not here).
- OPFS, `showOpenFilePicker`, the File System Access API — Chromium-only, overkill for SaaS upload; cut entirely (not even recognition).
- `WebTransport` / `WebRTC` peer-to-peer transfer — out of scope.
- `MediaSource` / MSE — named once as a `createObjectURL` arg type; not taught.
- Web Storage (`localStorage`/`sessionStorage`) and the four-home decision tree — **Lesson 4 of this chapter**; do not touch.

**Boundary with sibling lessons:** L1 owns `crypto`/HMAC, L2 owns the clipboard, L4 owns Web Storage. This lesson owns only the binary primitives and the object-URL lifecycle. The shared chapter threads it carries: the cleanup reflex (extend it), the `'use client'` island discipline (reuse it). The thread it must *not* blindly carry: secure context — correct the over-generalization explicitly.

---

## Code conventions notes (deltas the writer must honor)

Relevant slices of `Code conventions.md`, with deliberate divergences flagged for downstream agents:

- **Function form / components.** Arrow component on `const`, named export, typed props via a `type` alias, props default-destructured at the parameter site. Matches L2's `CopyButton`.
- **`'use client'`** as the literal first line of the island file; keep the boundary at the smallest interactive leaf (the picker), not the page.
- **Naming.** `camelCase` vars (`previewUrl`, `file`), `PascalCase` component (`AvatarPicker`), boolean-free here; no `data`/`temp`/`foo`. Filenames `kebab-case` (`avatar-picker.tsx`) if a filename is shown.
- **Hooks / React Compiler.** No `useMemo`/`useCallback` — Compiler handles memoization; don't add manual memo. `useEffect` is used here for its legitimate purpose (synchronizing with an external system — the object-URL map — and cleaning it up), which is exactly the sanctioned use; the revoke-in-cleanup is textbook. No `'use no memo'`.
- **Async/cleanup.** The revoke-in-cleanup is the chapter's cleanup discipline applied; lineage to AbortController (Ch 014 L3) and L2's ref'd `setTimeout`. Call it out as the same reflex.
- **Sanctioned simplifications (deliberate — note so no one "fixes" them later):** (1) bare semantic `<input>`/`<img>`/`<button>` with minimal-to-no Tailwind, no shadcn primitive — same deliberate stripping L2 used, to keep focus on the byte APIs. (2) Hooks shown as shape with mechanics deferred to Unit 3 — not the production teaching of `useState`/`useEffect`, by design. (3) No Server Action / upload wiring — the action seam is Ch 068/069; the island is intentionally local-only. (4) `alt=""` on the preview `<img>` is correct (decorative preview of a file the user just picked); if a more descriptive alt is wanted, `alt={file.name}` is the upgrade — note either is defensible, empty alt is fine for a self-evident preview.
- **MIME / format.** Use real MIME strings (`image/png`, `text/csv`); `accept` lists explicit types, not just `image/*`, in the canonical block (explicit reads as more production-honest and sets up the validation point) — though `image/*` is fine in the intro narrative.
- **Imports.** If imports are shown, follow the three-group order; but per pedagogical-display norms (L2 omits framework hook imports in `AnnotatedCode` blocks to save lines), the hook imports may be stripped in the annotated block — flag as a deliberate display strip, consistent with L2.
