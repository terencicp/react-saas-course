# Lesson 1 — The "use server" seam

- **Title:** The "use server" seam
- **Sidebar label:** The "use server" seam

---

## Lesson framing

This is the foundational mechanics lesson of Chapter 043 — it installs the *seam* every later lesson refines, so it teaches the round-trip and the boundary discipline, not the action body (parse/Result/transaction come in lessons 2–5).

**The one mental model to leave with:** a Server Action is a *public POST endpoint disguised as a local function call*. Both halves matter and the student must hold them at once — the convenience (`await createInvoice(formData)` reads like calling a local function) is exactly what makes the danger invisible (every such call is an HTTP POST from an untrusted client). Beginners coming from "I imported it, so it runs in my code" trust the input; the senior sees a network boundary the moment they read `'use server'`. The entire lesson is built to fuse those two readings.

**Where students struggle first** (design the lesson to pre-empt each):
- *"It's an import, so it's local."* — The opaque-ID/round-trip model breaks this. A `DiagramSequence` animates the six hops so the HTTP POST becomes concrete, not abstract.
- *"Serializable means anything I can hold in a variable."* — The serializable-args contract is the hardest line. The canonical real-world failure is passing a Drizzle row straight to an action; it has prototype methods and fails serialization. A `Buckets` drill forces the accepted/rejected sort.
- *"I'll pass the user's ID from the client so the action knows who's calling."* — The seam's trust posture: never trust a client-passed identity; re-read it server-side. Named here, fully built in Ch 057. This is the senior-mindset payload of the lesson.

**Pain the tech relieves:** before Server Actions the 2026-naive reflex is to hand-write an `app/api/.../route.ts`, a `fetch` call, request/response plumbing, and a client-side serializer for one form submit. The action collapses that to one annotated function. Frame the lesson against that boilerplate so the student feels what the seam buys — then immediately reframe: the convenience hides a real POST, so the discipline that a route handler made obvious (it's a public endpoint) still applies.

**What the student can do by the end:** write a file-level `'use server'` module, recognize when (rarely) an inline action is warranted, identify which arguments legally cross the wire, name the three call sites without yet wiring them, and read `'use server'` as a network boundary that demands input distrust. They leave holding the empty five-seam skeleton the rest of the chapter fills in.

**Tone/level:** adult, terse, decisions-first (per pedagogical guidelines). Lead the intro with the senior question, not a definition. Architectural Principle #6 (prefer explicit over magic) is named *at the directive* — `'use server'` is the seam made visible, the platform's deliberate refusal to hide the boundary. Keep code small and illustrative; this lesson is about the model and the contract, with one running example (`createInvoice`) carried throughout so the chapter has a spine.

**Estimated time:** 35–45 min.

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the concrete senior question, lifted from the chapter framing: a `<form>` inside a Client Component must create a database row on submit. State the 2026-naive reflex (hand-roll a route handler + `fetch` + serialize), then the platform default (a Server Action — a function the client imports and calls as if local, the framework rewriting the call into an HTTP POST). Pose the three questions the lesson answers: what's the syntax, what crosses the wire, what boundary discipline the senior writes from the first action. Connect to prior knowledge: Ch 030.3 already taught `'use client'`/`'use server'` directive *semantics* and Ch 030.4 taught the RSC wire — this lesson cashes those in on the mutation side. Preview the running example `createInvoice` and the empty five-seam skeleton they'll end on. Warm, brief, no celebration.

Reasoning: the guidelines require the senior question implicit in the intro and a concrete problem to motivate. The route-handler-boilerplate contrast is the "trigger before tool" framing — name the threshold the default crosses.

### What actually happens when you call a Server Action

The mental model, taught as a round-trip. Core claims, in order:
- An `async` function marked `'use server'` becomes a server-only endpoint whose *function reference doubles as the client's call site*.
- The compiler replaces the imported reference with a **stable opaque ID** (a hashed string, not the source).
- On invocation the client serializes the arguments, POSTs them with the action ID, the server resolves the ID back to the function and runs it, and the return value serializes back.
- So `await createInvoice(formData)` in a Client Component *looks* synchronous-local but is an HTTP round-trip the runtime performs transparently.

Name Architectural Principle #6 (prefer explicit over magic) right here: `'use server'` is not decoration, it is the seam — the platform makes the boundary a visible token instead of hiding it behind a generated client. This is the lesson's thesis sentence.

**Diagram — `DiagramSequence` (the round-trip).** This is the lesson's anchor visual; pedagogical goal: convert the abstract "it's really a POST" into a concrete, scrubable sequence so the import-is-local misconception cannot survive. ~6 steps, each a simple HTML two-column (client lane | server lane) strip with the active hop highlighted (reuse the lane/strip pattern from the diagram docs' examples; horizontal, capped height):
1. Client Component holds `createInvoice` — but the binding is an **opaque action ID**, not the function body (the body never shipped).
2. User submits / handler fires → client **serializes the arguments** (the `FormData`).
3. **HTTP POST** crosses the network carrying `{ actionId, serializedArgs }`. Caption flags: this is a public request — same trust boundary as any endpoint.
4. Server **resolves the ID** back to the real function and runs it (this is where parse/authorize/db will live — foreshadow the five seams).
5. The return value **serializes back** across the wire.
6. Client receives the deserialized result. Caption: the `await` resolved; from the component's view it looked local the whole time — that illusion is the thing to stay suspicious of.

Reasoning for `DiagramSequence` over `RequestTrace`: `RequestTrace` models the server→client *render* pipeline (six fixed render phases), not a client→server→client action POST, so its phase engine doesn't fit; the round-trip is a free-form temporal sequence, which is exactly `DiagramSequence`'s job. Keep each step's body tiny so the tallest sets a short height.

`Term` candidates in this section: **RSC payload** (the serialization format args travel in — re-explain without derailing), **opaque ID** (define inline: a stable hashed handle the compiler emits in place of the function).

### Two ways to declare one: file-level and inline

The two declaration sites, with the 2026 reflex stated up front: **file-level by default.**

- **File-level:** a module whose first line is `'use server'` turns *every exported `async` function* into a Server Action. Course default — actions live in `app/<route>/actions.ts` (or a feature file), file-level directive at the very top, co-located with the feature and grep-able. Tie to the file-layout convention.
- **Inline:** an `async` function declared *inside a Server Component* with `'use server'` as the first statement of its body. The single legitimate trigger: the action must close over server-side values the Client Component must never see (a request-scoped ID, derived auth state). Rare in 2026 SaaS code — name it once, show it once, move on.

**Component — `CodeVariants`** (two tabs, "File-level (default)" / "Inline (rare)"). Each tab: one small fenced block + one-paragraph framing. File-level tab shows the `actions.ts` top-of-file directive + an exported `createInvoice` stub. Inline tab shows a Server Component with a nested action closing over a server value. First sentence of each prose carries the framing ("the default", "the carve-out"). Reasoning: this is a genuine A/B of the *same* concept in two shapes — exactly what `CodeVariants` is for, and it keeps the comparison compact.

Watch-out to fold into the inline-tab prose (not a separate section): declaring an inline action *inside a Client Component* is a build error — inline actions only live in Server Components. State it where the concept is taught.

### Calling it: the three call sites

The invocation surface. These are all **forward references** — the student will *wire* them in Ch 044; here they only learn the action is called like a function and the framework does the POST in all three. Keep this a fast survey, not a tutorial. Frame: "all three call the same function; the difference is who owns pending state and how the call is triggered."

Three shapes, one or two lines each:
1. **`<form action={createInvoice}>`** — the form pattern; posts the `FormData` directly. (Full: Ch 044.2.)
2. **`useActionState((prev, formData) => createInvoice(formData), initial)`** — the React 19 hook that owns pending state and the latest result. (Full: Ch 044.3.)
3. **Imperative, inside an event handler:** `await createInvoice(id)` — used when the action runs outside a form submit (a delete button, a toggle).

Name **once** the `useActionState` signature gotcha so the student doesn't write the wrong shape later: when an action is passed to `useActionState`, *that action's own* first parameter becomes the previous state and the second is the form data — `async function action(prevState, formData)`. (Distinct from the *hook* call `useActionState(action, initial)`, whose first argument is the action itself — keep the two "first arguments" clearly separate.) One sentence in-prose, link forward to Ch 044.3. Do not teach the hook.

**Component — `Code`** (a single small fenced block listing the three call shapes side by side as comments/lines) is enough; this is a preview, not a deep dive. Avoid an exercise here — testing forward-referenced material would be unfair this early.

Reasoning: the chapter framing explicitly wants the three sites *named and the wiring deferred*; over-teaching here would collide with Ch 044 and inflate the lesson past its 35–45 min budget.

### What is allowed to cross the wire

The serializable-args contract — the hardest and most consequential line in the lesson. Frame with the senior reach first, then the rule, then the trap.

- **The rule:** arguments to a Server Action travel as the RSC payload and must serialize through the structured-clone-plus-React-extensions superset (the same wire taught in Ch 030.4 — name it, don't re-derive). 
- **Accepted as arguments:** primitives (incl. `BigInt`, `undefined`, `null`), plain objects, arrays, `Map`, `Set`, `Date`, typed arrays / `ArrayBuffer`, `FormData`, `File`, `Promise`, and other Server Functions. (Source-checked against the React `'use server'` reference.)
- **Rejected:** functions/closures, class instances, anything with a custom prototype, `WeakMap`/`WeakSet`, DOM nodes, **events from event handlers**, and — note for the writer — **JSX/React elements are *not* valid as server-function arguments** (JSX only crosses the *render* wire server→client, not into an action's parameters; don't imply otherwise). Per the code convention: `Temporal.*` is in the rejected bucket — encode as ISO strings at the boundary.
- **The senior reach:** for forms, take `FormData` as the *only* argument and parse on entry (foreshadow Ch 043.2). For imperative calls, take a plain object or a primitive ID — never a class instance, never a Drizzle row.

**The production trap (give it room):** passing a Drizzle row straight to a Server Action fails serialization because the row carries prototype methods / a custom prototype — it is *not* a plain object even though it looks like one in the debugger. The fix is to pass the plain ID and let the action re-read (or, for the rare full-row case, `JSON.parse(JSON.stringify(row))` to strip the prototype — mention as the escape hatch, not the default). This is the single most common real-world serialization bug at this seam; it earns explicit treatment.

**Exercise — `Buckets`** (two buckets: "Crosses the wire" / "Rejected — won't serialize"). Pedagogical goal: force the student to *commit* to the accepted/rejected split rather than nod along, since the line is non-obvious. Suggested chips (8–10, mix obvious and tricky): `FormData`, a primitive `string` id, a plain `{ id, total }` object, `new Date()`, a `Map`, a `File` — vs. `() => archive(id)` (a function), a Drizzle row (prototype methods), `new InvoiceModel()` (class instance), a `Temporal.PlainDate`. The tricky decoys (Drizzle row, `Temporal`) are the teaching moment. Place it immediately after the rule so the student applies it while fresh.

Reasoning: classification drill is the right exercise type for a "which side of the line" concept; `Buckets` is purpose-built for it and the demo doc shows the exact two-bucket value-classification pattern.

`Term` candidates: **structured clone** (the browser algorithm the wire builds on — one-line definition), **RSC payload** (if not already glossed above, define here).

### The action never ships to the browser

What gets stripped from the client bundle, and why it matters.

- The action's source code does **not** ship to the client — the import becomes a reference to the opaque ID, so an action defined in a feature file does **not** bloat the Client Component that imports it.
- Unused action exports are dead-code-eliminated at build.
- Name **once** (no depth): Next.js rotates the action IDs (a periodic key rotation) and the security model — encryption of closed-over values, CSRF protection — is real but deferred to the security baseline in Ch 081. One sentence, one forward link. Do not teach the security model here.

**The trust posture (this is the senior payload).** Two linked points:
- A file-level action can `import` modules and `await` server-only resources freely; an inline action additionally *captures* values from its enclosing Server Component scope. Next.js **encrypts** those captured values in the payload so they don't leak to the client.
- But the senior does **not** depend on that encryption for correctness: re-read auth from the session *inside the action body*; never trust a `userId` the client passed as an argument. The encryption guards against *accidental* leaks; the action body guards against *intentional* ones (a crafted POST). Frame as the boundary's golden rule: the args are attacker-controlled — treat every one as untrusted. Full auth wrapper lands in Ch 057; the *posture* is set here.

**Component — `Aside` (caution)** for the "never trust a client-passed identity" rule, so it stands out as the load-bearing security stance without becoming its own section. Keep the surrounding prose as the teaching; the aside is the emphasis.

Reasoning: the chapter framing makes this trust posture a thread that "must run through every lesson"; introducing it here at the seam (rather than waiting for Ch 057) is what makes the rest of the chapter a refinement rather than a surprise.

### The skeleton every action in this chapter fills

Close the lesson by assembling the running example into the empty **five-seam skeleton** — the spine the rest of Chapter 043 fills in. This is the payoff that makes the lesson feel like a foundation.

Show `createInvoice` as a file-level action whose body is five named, commented steps in order: **parse → authorize → mutate → revalidate → return Result**. Each seam is a one-line comment pointing to the lesson that fills it (parse → 043.2, Result → 043.3, thin body / pure `/lib` → 043.4, revalidate + transaction → 043.5, authorize → Ch 057). The body is intentionally a skeleton, not working code — say so explicitly so the agent doesn't "complete" it and so the student knows the next four lessons are the completion.

**Component — `AnnotatedCode`** over the skeleton. Pedagogical goal: walk the five seams one highlight at a time so the student leaves with the *shape* memorized and a map of the chapter. Steps:
1. `{1}` the `'use server'` directive — the seam token (callback to the mental-model section), `color="violet"`.
2. `"createInvoice" "formData: FormData"` the signature — `FormData` as the only arg, the serializable-args reflex (callback to the contract), `color="blue"`.
3. the `// 1 parse` line — first, because every later seam needs typed input (→ 043.2), `color="green"`.
4. the `// 2 authorize` line — re-read identity here, never trust the client (callback to the trust posture; → Ch 057), `color="orange"`.
5. the `// 3 mutate // 4 revalidate // 5 return` lines — the rest of the body, each pointing to its lesson, `color="blue"`.

Note for the writer: align the skeleton with the code conventions — file-level `'use server'` at the very top, `createInvoice` naming (verb+noun, no `Action` suffix), `FormData` single argument, returns `Result<T>` (import from `@/lib/result`; the *type* is owned by 043.3, so here it appears only as the declared return type, not defined). This is a deliberate staged shape: it is non-working on purpose.

### Recap / where this goes next (short closing prose)

Two or three sentences: restate the mental model (public POST disguised as a local call), the contract (only serializable args cross; never a Drizzle row, never a trusted-from-client identity), and that the five-seam skeleton is the chapter's roadmap — 043.2 fills `parse`, 043.3 the `Result`, and so on. No new concepts.

**Optional `ExternalResource`** card(s): the Next.js "Server Functions / Server Actions" guide and the React `'use server'` reference. Only if they're current (verify in fact-check step). One or two cards max, per guidelines.

---

## Scope

**Prerequisites to redefine *briefly* (one line each, do not re-teach):**
- `'use client'` / `'use server'` directive semantics and `server-only` (Ch 030.3) — assume known; this lesson uses `'use server'` on the mutation side.
- The RSC wire / structured-clone-plus-React-extensions serialization set (Ch 030.4) — name it as the wire the args travel on; do not re-derive the full catalog.
- `FormData` and `Object.fromEntries` (Ch 042.6) — `FormData` appears as the action argument; the *parsing* of it is Ch 043.2, not here.
- Zod schemas / `safeParse` (Ch 042) — referenced only as "parse on entry, coming next."

**Explicitly out of scope (defer, name with a forward pointer at most):**
- Parsing the input / `safeParse` / the five-seam *body* mechanics — **Ch 043.2**. This lesson installs the *empty* skeleton only.
- The `Result<T>` type definition, `ok`/`err` helpers, error codes, throw-vs-Result decision — **Ch 043.3**. `Result` appears here only as the skeleton's declared return type.
- Pure `/lib` extraction, Principle #3/#5, the no-wrapper rule — **Ch 043.4**.
- `revalidatePath`, transactions, `redirect()` after mutation, idempotency — **Ch 043.5**.
- The form side: `<form action>` lifecycle, `useActionState`, `useFormStatus`, `useOptimistic`, constraint validation, progressive enhancement — **Ch 044** (call sites *named* here, *wired* there).
- Authentication/authorization wrapping the action, the `authedAction` wrapper, re-reading the session — **Ch 057** (the *posture* "don't trust client identity" is set here; the *mechanism* is there).
- The Server Action security model in depth — closure encryption, action-ID rotation internals, CSRF — **Ch 081** (named once here, one sentence).
- Route handlers as the alternative side-effect boundary — **Ch 046** (only contrast in the intro as the boilerplate the action replaces).

---

## Notes for downstream agents

- One running example only: `createInvoice(formData)`. Reuse it in every figure and code block so the chapter has a single spine.
- The five-seam skeleton is **deliberately non-working** (commented seams). Do not complete it — completion is the rest of the chapter.
- `Result` is referenced, never defined here. Import it as a type from `@/lib/result`; its shape is Ch 043.3's job. If you find yourself defining the codes, you've crossed into the next lesson.
- Keep the three call-site shapes a *survey*; do not add a form/hook tutorial — that's Ch 044 and would blow the time budget.
- Prefer `DiagramSequence` for the round-trip (not `RequestTrace`, which models the render pipeline, not an action POST).
