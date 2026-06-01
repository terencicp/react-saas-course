# Web Crypto: random IDs and HMAC signatures

- **Title (h1):** Web Crypto: random IDs and HMAC signatures
- **Sidebar label:** Web Crypto

---

## Lesson framing

First teaching lesson of Ch 016 (Browser capability APIs), and the first of four "trigger before tool" capability lessons.
This one installs the `crypto` global: `randomUUID`, `getRandomValues`, and the async `subtle` surface, taught at three depths — UUID one-liner, byte-token shape, and HMAC sign/verify at signature depth.

**The senior question (state it implicitly in the intro, not as a header).**
A webhook hits a Route Handler carrying an `x-signature` header; before the handler trusts a cent of the body, it must confirm the payload was signed with the shared secret.
That single scenario carries the whole lesson: it motivates `subtle`, names HMAC as the symmetric signature primitive, and lands constant-time comparison as the non-negotiable reflex.
The random-ID surfaces (`randomUUID`, `getRandomValues`) ride in front of it as the cheaper, more frequent reaches the same global gives you — taught first because they are easy wins and warm the student up to "the platform already has this, stop reaching for libraries."

**Mental model the student should leave with.**
One `crypto` object, identical in every runtime the course touches (browser, Node 24+, Edge, Server Components).
Two synchronous conveniences (`randomUUID`, `getRandomValues`) plus one asynchronous algorithm surface (`subtle`) whose every method returns a Promise.
Crypto bytes flow as `Uint8Array`; `TextEncoder`/`TextDecoder` is the only string↔bytes bridge; signatures render to hex or base64url for transport.
And the load-bearing security fact: **a signature is never compared with `===`** — `subtle.verify` is the constant-time default, a byte-wise XOR-accumulator is the DIY fallback.

**Why this order (random → hash → HMAC).**
Cognitive load is managed by climbing one rung at a time on the *same* global.
`randomUUID` is zero-argument and synchronous — pure win, introduces the secure-context gate gently.
`getRandomValues` adds the `Uint8Array` + base64url rendering pipeline the student will reuse for the rest of the lesson, still synchronous.
`subtle.digest` introduces the async/`await` + bytes-to-hex pipeline at one-shot-hash depth (one input, one output, no key).
HMAC then reuses *all* of that and adds only the key (`importKey`) and the verify decision.
By the time HMAC lands, the only genuinely new idea is the key and the timing-attack — everything else is muscle memory from two sections back.

**Senior cuts to hold (per chapter scope).**
`subtle` is presented as a recognition map of five method families, but only `digest` (SHA-256) and `sign`/`verify` (HMAC) are taught at depth.
Encryption (AES-GCM), asymmetric crypto, and key derivation are named for recognition only and explicitly handed to server-side / library owners — no SaaS UI ships AES or RSA from the client in 2026.
Password hashing is named once and refused (argon2id, server-side, out of scope).

**Code-display conventions (inherit the Ch 015 house style exactly).**
Strip imports; show single focused functions (the `crypto` global is ambient — no import needed, state that once).
Single quotes, 2-space indent, trailing commas, semicolons, 80-col, `type` over `interface`, numeric separators where they read.
`async`/`await` uniformly — never `.then`; a forgotten `await` is one of the lesson's headline watch-outs, so the code must model the correct form spotlessly.
The sanctioned security comment `// constant-time compare to prevent timing attack` (Code conventions §Comments) appears verbatim on the compare.
Algorithm strings are written exactly `'SHA-256'` / `'HMAC'` (case-sensitive — a named watch-out).

**Continuity (this is the chapter's first lesson — seed it).**
This lesson is the home for **base64url**, deliberately punted here from Ch 015 L2 (flagged in that outline). `Uint8Array`, `TextEncoder`, `TextDecoder` were introduced in Ch 015 L2 — reference, don't re-teach; a one-line reminder at the call site suffices.
The secure-context constraint was installed in Ch 010 L4 (`mkcert`) — call it the prerequisite, don't re-explain TLS.
The `AbortController`/`AbortSignal` and `Result` threads are not needed here; don't drag them in.

---

## Lesson sections

### Introduction (no header)

Open on the webhook scenario in concrete terms: a `POST` arrives at `/api/webhooks/stripe`, the body claims a customer just paid \$49, and an `x-signature` header is the only proof it really came from Stripe and wasn't forged by anyone who guessed the URL.
State the senior question implicitly: **before you write a cent of that to the database, how does the platform let you prove the signature, and why is the comparison itself the part juniors get fatally wrong?**
Then widen: that proof is built on the `crypto` global, and the same global hands you two cheaper everyday wins first — a unique ID with no server round-trip, and a random token of any shape you need.
Preview the practical payoff: by the end the student mints a UUID, fills a byte token and renders it base64url, hashes a payload to hex, and signs *and verifies* a webhook payload the way the production code in later units will.
Name the through-line: one global, three surfaces, climbing from one-liner to signature.
Keep it warm and brief (per pedagogical guidelines); end by pointing at the first, easiest reach.

Reasoning: the intro must carry the senior question implicitly and frame crypto in production stakes (money, forgery) rather than as an API tour. Leading with the webhook but *teaching* the easy surfaces first is the cognitive-load move — the student gets two quick wins before the one hard idea.

---

### One `crypto` object, three surfaces

**Goal:** install the map so every later section has a home, and kill the two anti-patterns up front.

Content:
- `crypto` is a global, ambient in every runtime this course touches — browser, Node 24+, Edge runtime, the body of a Server Component or Route Handler. No import. (State the "no import, it's a global" fact once here; it governs every code block in the lesson.)
- The three surfaces, one line each: `crypto.randomUUID()` (a v4 UUID string), `crypto.getRandomValues(typedArray)` (fill a typed array with CSPRNG bytes), `crypto.subtle` (the asynchronous algorithm surface — sign, verify, digest, encrypt, derive, import/export).
- The two senior cuts, stated as reflexes: ignore the legacy synchronous `crypto` methods entirely; never reach for `Math.random()` for anything that isn't visual jitter (animation, a non-security shuffle). `Math.random()` is not a CSPRNG — predictable output is a token-forgery bug. Frame this as the one-sentence rule, not a tangent.
- Define <Term>CSPRNG</Term> inline (cryptographically secure pseudo-random number generator — unpredictable even to an attacker who has seen prior output).

Visual — a small **`Figure`** wrapping plain HTML+CSS: one `crypto` box on the left, three labeled branches to the right (`randomUUID` → "ID", `getRandomValues` → "bytes", `subtle` → "algorithms (async)"), with the `subtle` branch tinted to mark it as the only async one and the only one taught at depth.
Pedagogical goal: a one-glance mental index of the whole lesson; the student returns to it as each surface is taught.
Per diagram guidelines this is a simple horizontal annotated illustration (HTML+CSS, height-capped), not a system graph — exactly the kind of light enrichment that earns its place. Author the boxes as children; no `ArrowDiagram` needed (keep it flat HTML so it survives the `Figure` expand).

Reasoning: a recognition map first means the student is never lost about *where they are*. Naming the `Math.random` cut here (not later) is the "trigger before tool" posture — the platform default for randomness is `crypto`, full stop.

---

### `randomUUID`: the default ID reach

**Goal:** the student reaches for `crypto.randomUUID()` reflexively for any unique string ID, and knows the one gate that makes it fail.

Content:
- `crypto.randomUUID()` returns a v4 UUID string (e.g. `'1f0b…'`), 122 bits of entropy — collision-resistant enough that you never coordinate with a server to guarantee uniqueness.
- The reach, named concretely: primary keys, idempotency keys (forward ref Ch 011 L1), request/correlation IDs threaded across logs (forward ref to observability, Unit 20), a React list key for a client-minted optimistic row, a file object key. The anchor: **any time you need a unique string and don't want a round-trip.**
- The gate — the chapter-wide secure-context thread, first appearance: in the **browser**, `crypto.randomUUID` (like the rest of Web Crypto, with the single exception of `getRandomValues` covered next) only exists in a <Term>secure context</Term> — HTTPS or `localhost`. On a plain `http://` page (a LAN IP, a non-localhost dev host) it is `undefined` and the call throws. This is exactly what the Ch 010 L4 `mkcert` setup unblocks; name it as the prerequisite, don't re-teach TLS. In **Node / server runtimes** there is no secure-context restriction — it always works server-side. Make the browser-vs-server split explicit because it decides where the failure can bite.
- Forward ref, one clause: Drizzle UUID primary keys and Better Auth session IDs both consume v4 UUIDs downstream — recognition only.
- The v7 footnote (recognition only, do not teach): `randomUUID` is v4 — random, **not** time-sortable. When database index locality on time-ordered inserts matters, the senior reach is UUID **v7** (sortable by creation time), available from the `uuid` npm package; the course's project code standard actually picks v7 for user-facing primary keys (Code conventions §Data layer). Name the distinction so the student isn't surprised later; the *platform* one-liner is v4, and that's what this lesson writes. Keep this to two sentences in an `Aside` (type `note`) so it doesn't derail the easy win.

Code: a single `Code` block — one line, `const id = crypto.randomUUID();` with a comment showing the shape of the output. No annotation needed; it's one idea.

Reasoning: this is the easiest, highest-frequency reach — lead with the win to build momentum. The secure-context gate is introduced *here*, gently, on the simplest API, so when it recurs on `subtle` it's already familiar (lower cognitive load than meeting it first on the hard surface). The v7 note prevents a future "but the course uses v7?" confusion without breaking the v4-is-the-platform-default line.

---

### `getRandomValues`: when you need bytes, not a UUID

**Goal:** the student can mint a random token of a chosen length and render it as a URL-safe string — the base64url pipeline the rest of the lesson reuses.

Content:
- `crypto.getRandomValues(typedArray)` fills the typed array **in place** with CSPRNG bytes and returns the same array. Allocate `new Uint8Array(32)` for a 256-bit token; the function writes into it.
- The reach: when a UUID's fixed shape doesn't fit — URL-safe share tokens, opaque slugs, nonces, a one-time invite code. The trigger past `randomUUID`: **you control the length/alphabet of the output.**
- The secure-context exception, named once: `getRandomValues` is the **one** Web Crypto member that *also* works in an insecure (`http://`) context — unlike `randomUUID` and `subtle`. Don't lean on this (the senior reflex is still HTTPS/`localhost` everywhere via `mkcert`), but state it so the chapter's secure-context thread is accurate rather than a blanket claim. One clause.
- The rendering step — this is where **base64url lands** (its home, punted from Ch 015 L2). Raw bytes aren't a string you can put in a URL; you encode them. Teach the conversion as a named, reusable pipeline:
  - `Uint8Array` → base64 via `btoa(String.fromCharCode(...bytes))` (the platform path), **then** make it URL-safe: `+`→`-`, `/`→`_`, strip `=` padding. That last swap is what "url" in base64url means.
  - Note the 2026 ergonomic upgrade as recognition + a one-line `Aside`: `Uint8Array.prototype.toBase64({ alphabet: 'base64url' })` and `Uint8Array.fromBase64(...)` are the newer typed-array methods that do this in one call. **Baseline since Sept 2025 in browsers, but on the server they landed in Node 25 (V8 14.1) — *not* the course's pinned Node 24 LTS.** So teach the portable `btoa`+replace path as the default (works on Node 24 and every browser the student can read anywhere), and name `toBase64({ alphabet: 'base64url' })` as the cleaner reach the codebase can adopt once it moves to Node 25+. Frame the manual path as the thing to write today, the method as the thing coming.
  - Define <Term>base64url</Term> inline: base64 with a URL- and filename-safe alphabet (`-`/`_` instead of `+`/`/`) and no `=` padding, so it drops straight into a URL path, query string, or JWT segment without escaping.
- The hard limit, named not drilled: `getRandomValues` throws `QuotaExceededError` when the array's byte length exceeds **65,536**. Short tokens only; for bulk randomness reach a server-side helper. One sentence.
- The reflex callback: `Uint8Array` and the encoder pair are the same byte primitives from Ch 015 L2 — one-line reminder (`Uint8Array` = fixed-length byte array), no re-teach.

Visual — none needed; the pipeline is short and linear. Keep the section tight so the base64url concept gets clean air.

Code — **`AnnotatedCode`** stepping the token helper (this is the first multi-part block; directing attention pays off):
`code` = a ~6-line `generateToken()`:
```
const generateToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
```
Steps:
1. `{2}` blue — allocate the 32-byte buffer; length is yours to choose.
2. `{3}` green — `getRandomValues` fills it in place with CSPRNG bytes.
3. `{4-5}` violet — bytes → base64 (`btoa`), then the three replaces that make it URL-safe; call out each replace maps one base64 char to its url-safe twin and strips padding.
Keep `maxLines` ≤ 8.

Reasoning: this section's real payload is base64url, and the byte-rendering pipeline is reused verbatim for the digest and signature output two sections on — so teaching it cleanly here amortizes across the lesson. `AnnotatedCode` is right because the three-replace line is exactly the kind of dense one-liner students gloss over.

---

### The `subtle` surface: a recognition map

**Goal:** orient the student in `crypto.subtle` so the two methods taught at depth (`digest`, `sign`/`verify`) sit in a frame, and the out-of-scope families are explicitly parked.

Content:
- `crypto.subtle` is the **asynchronous** algorithm surface — every method returns a Promise. (Seed the headline watch-out here: async means `await`; forget it and you hand the next line a `Promise<ArrayBuffer>`.)
- The five method families, one line each, each tagged with the course's depth for it:
  - `digest` — one-shot hash (SHA-256 over a buffer). **Taught at depth** (next section); reused in Unit 12.
  - `sign` / `verify` — HMAC and asymmetric signatures. **HMAC taught at depth** (the rest of the lesson).
  - `encrypt` / `decrypt` — AES-GCM is the default. **Recognition only**; key handling is server-side, no SaaS UI ships client-side AES in 2026.
  - `importKey` / `exportKey` — move key material in and out of the platform's opaque `CryptoKey` type. **Used** for HMAC (you import the secret); export named for recognition.
  - `deriveKey` / `deriveBits` — HKDF, PBKDF2. **Recognition only**; password hashing belongs server-side with argon2id.
- The opaque-key idea, introduced once: `subtle` never works on raw secret bytes directly — you hand it bytes once via `importKey` and get back a `CryptoKey`, an opaque handle the algorithm methods consume. Define <Term>CryptoKey</Term> inline (a non-string handle to key material the platform holds; you pass it to `sign`/`verify`, you don't read its bytes back unless it was marked extractable).

Visual — **`Buckets`** exercise doubling as the recognition map (sort method names into "Taught here" vs "Recognition only / server-side").
Items: `digest`, `sign`, `verify`, `importKey` → "Taught here"; `encrypt`, `decrypt`, `deriveKey`, `exportKey` → "Recognition / server-side".
`instructions`: "Sort each `crypto.subtle` method by how far this lesson takes it."
Pedagogical goal: make the scope boundary an active sort the student commits to, not a passive table — far stickier, and it front-loads the "what's out of scope" cut the chapter wants explicit.

Reasoning: a flat list of an API surface is forgettable; framing it as a depth map (and grading the sort) tells the student exactly what to invest attention in next. Putting the recognition cuts *here* — before the deep teaching — means the deep sections stay focused and uninterrupted by "and you could also…" asides.

---

### `digest`: hashing a payload to a fixed string

**Goal:** the student can hash any input to a stable 64-char hex string with the async + bytes-to-hex pipeline — the warm-up that makes HMAC a small delta.

Content:
- `crypto.subtle.digest(algorithm, buffer)` — pass an algorithm string (`'SHA-256'`, the 2026 default) and a `BufferSource` (typically a `Uint8Array` from `TextEncoder().encode(input)`), get back a Promise resolving to an **`ArrayBuffer`** of the raw digest bytes (32 bytes for SHA-256).
- The reach: content-addressable keys, request-body fingerprints, a stable identifier for a payload computed without a server round-trip, deduplication. Anchor: **same input → same digest, every time, anywhere.**
- The bytes-to-hex render, taught as a named pipeline (it recurs for signatures):
  - `digest` returns an `ArrayBuffer`; wrap it in `new Uint8Array(buf)` to iterate bytes.
  - `[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')` → 64-char lowercase hex.
  - `padStart(2, '0')` is **non-negotiable**: a byte like `0x0a` is `'a'` from `toString(16)` — one character — and without the pad it silently shortens and corrupts the string. Frame this as the exact bug, in real stakes (a fingerprint that's wrong only for inputs containing a low byte ships green and fails in production). This is the digest section's headline watch-out.
- Reflexes: `'SHA-256'` is case-sensitive (`'sha-256'` throws — name it, it recurs); `ArrayBuffer` is the raw byte container, `Uint8Array` is the view you iterate (one-line reminder, the Ch 015 L2 distinction).
- Forward ref: this exact `encode → digest → hex` pipeline is reused in Unit 12 (object storage, content addressing) — recognition only.

Visual — none; the pipeline is linear and the code carries it. (Reserve the diagram budget for the HMAC sign/verify sequence, which genuinely needs it.)

Code — **`AnnotatedCode`** stepping `sha256Hex()`:
```
const sha256Hex = async (input: string) => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
```
Steps:
1. `{2} "TextEncoder"` blue — string → UTF-8 bytes; the only string↔bytes bridge the course uses.
2. `{3} "await" "digest"` green — the async one-shot hash; `await` is mandatory (callback to the watch-out), returns an `ArrayBuffer`.
3. `{4-6} "padStart"` violet — `ArrayBuffer` → byte view → hex, with `padStart` called out as the corruption guard.
`maxLines` ≤ 9.

Exercise — **`PredictOutput`** on the `padStart` bug (the chapter's signature misconception-kill format, used by Ch 015 L1 and L2).
Show a buggy `bytesToHex` that omits `padStart`, run it over a tiny byte array containing a low byte (e.g. `[10, 255, 0]`), and ask for the printed hex.
`expected` shows the corrupted short string (`'aff0'` — `10`→`'a'`, `255`→`'ff'`, `0`→`'0'`, missing the leading zeros → ambiguous/short) vs what the correct `'0aff00'` should be.
`<PredictWhy>`: `toString(16)` drops the leading zero on any byte below `0x10`; without `padStart(2, '0')` each such byte renders as one char instead of two, so the string is shorter than `2 × byteLength` and no longer round-trips. Frame: the bug is invisible on test data where every byte happens to be ≥ 16.
Reasoning: the leading-zero bug is the single most common hand-rolled-hex mistake; a predict-output drill on the exact corrupted output makes it stick far better than prose, and matches the chapter's established pattern.

Reasoning for the section: `digest` is the perfect HMAC warm-up — it exercises async/`await`, the encoder, and the bytes-to-hex render with **no key and no verify decision**. Teaching it first means HMAC adds exactly one new concept (the key) and one new decision (constant-time verify), keeping each step's cognitive load minimal.

---

### HMAC: signing a payload with a shared secret

**Goal:** the student understands HMAC as a keyed hash with the symmetric property, and can write the import → sign → render flow.

Content:
- HMAC in one line: a **keyed** hash — feed it the payload bytes *and* a secret key, get a signature that only a holder of the same secret could have produced.
- The symmetric property, stated as the load-bearing decision: the **same** secret both signs and verifies. That's why HMAC is the right primitive for webhooks (Stripe, GitHub, Resend) where the two ends share a secret out of band — and the **wrong** primitive when signer and verifier must be different actors (that's asymmetric crypto, public/private keys, out of scope here and owned by Better Auth for JWTs). Make this the explicit "when does it fit / when does it break" beat the pedagogy wants.
- SHA-256 is the 2026 default hash inside HMAC.
- The three-step flow, named once then written:
  1. **Bytes:** `TextEncoder().encode(...)` turns the secret and the payload into `Uint8Array` (callback — same encoder as digest).
  2. **Import the key:** `crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])` → a `CryptoKey`. Unpack each argument: `'raw'` (the secret is raw bytes), the algorithm object, `false` (not extractable — you never need the bytes back out), and the **usages array**.
  3. **Sign:** `crypto.subtle.sign('HMAC', key, payloadBytes)` → a Promise of an `ArrayBuffer` signature; render it to hex (or base64url) with the pipeline from the digest section to put it in a header.
- The `usages` watch-out, named at the call site because it's the single most common HMAC trip: `importKey` takes a usages array, and a key imported with `['sign']` **throws `InvalidAccessError`** if you later call `verify` with it. Since you almost always need both ends, pass `['sign', 'verify']`. This is a headline watch-out — give it a sentence and model the correct array in every code block.
- Smaller reflexes, one clause each: HMAC keys may be any length (a key shorter than the 32-byte hash output is just internally hashed first — fine, slightly wasteful); `'HMAC'` and `'SHA-256'` are case-sensitive.

Code — **`AnnotatedCode`** stepping `signPayload()` (the densest block so far — attention control matters):
```
const signPayload = async (secret: string, payload: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
```
Steps:
1. `{2}` blue — one encoder, reused for both secret and payload.
2. range `{3-9}` green, with `"'raw'"` `"false"` `"['sign', 'verify']"` marked — `importKey`: raw secret bytes in, `CryptoKey` out; `false` = not extractable; the usages array must include both (callback to the watch-out).
3. `{10} "sign"` violet — produce the signature `ArrayBuffer` over the payload bytes; `await` mandatory.
4. `{11-13}` orange — render to hex with the now-familiar pipeline (note: reused from `digest`, so it gets a light touch).
`maxLines` ≤ 16.

Reasoning: HMAC is the lesson's spine, and `importKey` is where the new surface concentrates — so it gets the heaviest annotation. Because the encode and the hex-render are callbacks to earlier sections, the steps can spend their words on the genuinely new parts (`importKey`'s arguments, the usages array) rather than re-explaining bytes-to-hex.

---

### Verifying a signature without leaking it

**Goal:** the lesson's most important takeaway — the student verifies a webhook signature in constant time, knows *why* `===` is a security bug, and reaches for `subtle.verify` by default.

Content (the climax; structure it as wrong → why → right):
- The setup: the handler has the incoming `x-signature` header and the raw body, plus the shared secret. It must answer one boolean: was this body signed with this secret? Two ways.
- **The platform path (default): `crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)`** — returns a Promise of a boolean, and (the load-bearing property, fact-checked against MDN) runs in **time independent of where the inputs diverge**. This is the reflex. The signature bytes come from decoding the incoming header (hex/base64url back to a `Uint8Array`); the payload bytes are the raw body.
- **The DIY path and the footgun:** if you instead re-sign the payload yourself and compare the two hex strings, **`a === b` is a timing-attack bug.** A string `===` short-circuits at the first differing character — so a forged signature that matches the first *k* characters takes measurably longer to reject than one that fails at character 1. Over enough timed requests an attacker reads the correct signature one character at a time. Explain the leak mechanism concretely (the diagram below makes it visual) — this is *the* concept students meet for the first time and underestimate; frame it in real stakes (this is how real signature bypasses happen).
- **The constant-time fix:** when you genuinely must compare buffers yourself (mixed providers, a legacy hex format, a library that hands you a digest not a `CryptoKey`), compare **every byte regardless of mismatches** with an XOR accumulator: equal length check, then `for` over the bytes `acc |= a[i] ^ b[i]`, return `acc === 0`. It always touches all bytes, so the time reveals nothing about *where* they differ. Carry the sanctioned comment verbatim: `// constant-time compare to prevent timing attack`.
- The runtime note, one clause: Node exposes `crypto.timingSafeEqual(a, b)` on the `node:crypto` namespace for this; the Web-Crypto-portable answer is `subtle.verify` (preferred) or the hand-written XOR compare. Don't drill `timingSafeEqual`; name it so the student recognizes it in server code.
- Restate the rule as the takeaway: **prefer `subtle.verify`; never `===` a signature; hand-rolled compares are constant-time, no exceptions.**

Visual — **`DiagramSequence`** (custom HTML+CSS lesson component, matching the chapter's `FetchResolutionModel` house style — `not-content` wrapper, theme-gray chrome, one saturated accent per active step, height-capped per diagram guidelines).
Pedagogical goal: make the timing *leak* visible — the one idea prose struggles to land.
Two side-by-side rows per step: top = naive `===` (short-circuit), bottom = constant-time (full scan). Walk a forged signature whose prefix progressively matches:
- Step 1: attacker guess differs at char 1 → `===` stops at position 1 (1 comparison, fast); constant-time scans all N. Caption: the naive compare returns *fast* on a bad first char.
- Step 2: attacker has learned char 1, guess now differs at char 5 → `===` stops at position 5 (slower); constant-time still scans all N (same time). Caption: the naive timing *crept up* — that delta is the leak; the attacker just confirmed char 1.
- Step 3: prefix matches further → `===` stops later still (slower again); constant-time unchanged. Caption: each correct character costs measurably more time; repeat and the attacker reconstructs the whole signature. The bottom row's flat timing is why you compare every byte.
Build this as `src/components/lessons/016/1/<Name>.astro` taking a `step` prop, mirroring the Ch 015 lesson-component pattern.

Code — **`CodeVariants`** (the wrong/right pair the chapter uses for footguns; per-pane `data-mark-color` red/green):
- Variant **"Timing-attack bug"** (`data-mark-color="red"`, `del`-style framing): re-sign then `return signatureA === signatureB;`. First sentence: this leaks the signature one character at a time — `===` returns sooner the earlier the mismatch.
- Variant **"Constant-time (`subtle.verify`)"** (`data-mark-color="green"`): `return crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes);`. First sentence: the platform's verify is constant-time and one call — the default.
- Optionally a third variant **"Constant-time (manual XOR)"**: the byte-wise accumulator with the sanctioned comment, for when you can't use `subtle.verify`. First sentence names the trigger (you hold two buffers, not a `CryptoKey`).
`maxLines` ≤ 14.

Exercise — **`MultipleChoice`** (multi-select) checking the *reasoning*, not the syntax: "Why is `incomingSig === expectedSig` unsafe for verifying a webhook signature?"
Correct: "`===` stops at the first differing character, so rejection time leaks how many leading characters matched" + "An attacker can recover the signature one character at a time over many timed requests."
Decoys: "`===` can't compare strings of different lengths" (false — it can, returns false), "Hex strings can't be compared with `===`" (false), "`===` is slower than `subtle.verify`" (false / irrelevant — the point is timing *uniformity*, not speed).
Reasoning: the timing attack is conceptual, not syntactic — a multi-select on *why* it leaks verifies the mental model the lesson is built to install, and the decoys target the exact half-understandings students form ("it's a speed thing", "it's a length thing").

Reasoning for the section: this is the payload the whole lesson climbs toward, so it gets the richest scaffolding (a custom timing-leak `DiagramSequence` + wrong/right `CodeVariants` + a reasoning `MultipleChoice`). The wrong→why→right ordering is the pedagogy's "show the simplified/wrong model, then add the fix" beat applied to a security footgun. Placing `subtle.verify` as the default *and* teaching the manual compare honors "trigger before tool": the platform default first, the DIY path gated behind a named trigger.

---

### Where this lands later

**Goal:** convert the lesson into recognition leverage — when a future lesson hands the student a `verifySignature` helper, they know exactly what's inside it.

Content (keep tight — a short prose paragraph or a small `CardGrid`, each item one line):
- **Stripe / Resend webhook signatures** (Unit 11 / Unit 7) — the exact HMAC-verify-the-raw-body pattern from this section; the project standard verifies on the **raw** body *before* parsing and dedupes replays via a `processed_events` ledger (Code conventions §Security baseline, §Route handlers). Name the raw-body-before-parse rule as the one production detail to carry forward.
- **Idempotency keys on POST retries** (Ch 011 L1, Unit 11) — `randomUUID` minted client-side, sent as `Idempotency-Key`.
- **Session-cookie integrity** (Unit 9, Better Auth) — HMAC under the hood, handled *for* the student; recognition only, so they trust the seam rather than reimplement it.
- Content-addressable keys / fingerprints (Unit 12) — the `digest`→hex pipeline.

Reasoning: the chapter's "recognition payoff" thesis — the student won't write most of these by hand, but having built the primitive once, they read the later helpers with comprehension instead of faith. The raw-body-before-parse rule is the single most important production carry-forward and deserves its explicit naming here.

---

### External resources (optional, `ExternalResource` in a `CardGrid`)

Mirror the Ch 015 closing pattern. Candidates (writer picks 3–4, platform-authoritative or recent):
- MDN — Web Crypto API overview (`crypto`, `getRandomValues`, `randomUUID`, `subtle`).
- MDN — `SubtleCrypto.sign()` / `verify()` (the HMAC examples; the timing-attack note lives here).
- MDN — `SubtleCrypto.digest()` (the SHA-256 one-shot + the canonical hex render).
- A recent (last-6-months) write-up on verifying a webhook signature with Web Crypto in a Next.js Route Handler, if a credible one is found at authoring time (the Stripe/Slack-signature genre).

Optional **`VideoCallout`** if a short, current (≤ ~10 min) explainer on HMAC or the timing-attack-on-string-compare is found during the resourcer pass — the chapter embeds video where it supports a single concept (Ch 015 L1 did). Good fit: a visual explainer of *why* `===` leaks timing. Author's call; not required.

---

## Terms (for `Term` tooltips — strategic, supporting the lesson's goals)

- **CSPRNG** — "Cryptographically secure pseudo-random number generator. Output is unpredictable even to an attacker who has seen earlier values — unlike `Math.random()`."
- **secure context** — "A page served over HTTPS or from `localhost`. The browser gates Web Crypto, clipboard, and other powerful APIs to secure contexts; plain `http://` can't use them."
- **base64url** — "Base64 with a URL- and filename-safe alphabet (`-` and `_` instead of `+` and `/`) and no `=` padding, so it drops straight into a URL or a JWT segment."
- **CryptoKey** — "An opaque handle to key material the platform holds. You pass it to `sign`/`verify`; you can't read its raw bytes back unless it was imported as extractable."
- **HMAC** — "Hash-based Message Authentication Code. A keyed hash: the same secret signs and verifies, proving a payload came from someone holding the secret."

Do **not** `Term`-define already-established items: `Uint8Array`, `TextEncoder`, `TextDecoder` (Ch 015 L2 — reference, don't re-tooltip). Acronyms (HMAC, CSPRNG) expand on first use in prose *and* get a `Term`.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- `Uint8Array`, `TextEncoder`, `TextDecoder` (Ch 015 L2) — the byte primitives; one-line reminder at the call site, no re-teach.
- Secure context = HTTPS or `localhost` (Ch 010 L4 `mkcert`) — named as the prerequisite that unblocks Web Crypto in the browser; do not re-teach TLS.
- `async`/`await`, Promises (Ch 007) — assumed; the subject is the crypto call, not the async model. The forgotten-`await` watch-out references it, doesn't teach it.
- `ArrayBuffer` vs `Uint8Array` view (Ch 015 L2) — one-line reminder where `digest`/`sign` return an `ArrayBuffer`.

**Explicitly out of scope (do not teach; some named as recognition / forward refs only):**
- **Password hashing** — argon2id, server-side, the only correct answer. Named once and refused; never shown.
- **AES-GCM / symmetric encryption** — recognition only at the `subtle` map. No client-side AES in 2026; key handling is server-side. Teach no `encrypt`/`decrypt` call.
- **Asymmetric crypto** (RSA, ECDSA, Ed25519) — recognition only; named as the "different signer/verifier" contrast to HMAC. JWT public-key verification is owned by Better Auth (Unit 9). Teach no asymmetric `importKey`/`sign`.
- **Key derivation** (HKDF, PBKDF2), key wrapping, the `JsonWebKey` format — recognition only at the `subtle` map.
- **`CryptoKey` extractable flags, structured-clone of keys, IndexedDB-stored keys** — niche; mention `false` (not extractable) at the `importKey` call site only, don't drill the extractable model.
- **The full `Algorithm` parameter dictionary** — recognition only; the course writes the `'SHA-256'` + `'HMAC'` pair, nothing else.
- **UUID v7 at depth** — recognition only (one `Aside`). The platform one-liner is v4; the project's v7-for-primary-keys standard is named, not taught here (Code conventions / Unit 5 own it).
- **Route Handler file shape** — params/body Zod schemas, `authedRoute`, the Problem-Details table, the `processed_events` replay ledger. Owned by **Ch 046** / §Security baseline. The webhook scenario is the *motivation*; show only the bare verify logic, not a full handler. Flag this divergence to downstream agents.
- **Stripe/Resend SDK signature helpers** — Unit 7 / Unit 11. Named as where the pattern lands; not imported or taught.
- **`node:crypto` namespace at depth** (`createHmac`, `timingSafeEqual`, `randomBytes`) — name `timingSafeEqual` once as the Node equivalent; teach the Web Crypto (`subtle`) surface, which is the cross-runtime portable one this course standardizes on.
- **Clipboard, `Blob`/`File`, Web Storage** — the other three Ch 016 capability APIs; L2–L4 own them. Don't preview their APIs.

---

## Notes for downstream agents

- **Deliberate staging, not oversight:** the webhook is the *motivation* only — show the bare `signPayload` / `verifySignature` logic, never a full Route Handler (Ch 046 owns params/body schemas, `authedRoute`, Problem Details, the replay ledger). Keep the focus on the `crypto` call.
- **base64url lands here on purpose** — it was explicitly punted from Ch 015 L2 to this lesson. Teach it in the `getRandomValues` section.
- **`crypto` is a global** — every code block omits an import for it by design; state that once in the "three surfaces" section so stripped blocks don't read as incomplete. `Result`/`ok`/`err` are *not* used in this lesson (no need for the Ch 015 unimported-`Result` note).
- **One new lesson component** is needed: the constant-time timing-leak `DiagramSequence` (`src/components/lessons/016/1/<Name>.astro`, `step` prop), authored in the chapter's existing HTML-CSS house style (see `src/components/lessons/015/1/FetchResolutionModel.astro`). The "three surfaces" map can be inline HTML in a `<Figure>` — no component needed.
- **Fact-checked (June 2026), corrections already applied:**
  - `Uint8Array.prototype.toBase64`/`fromBase64`: Baseline since Sept 2025 in browsers, but server-side they landed in **Node 25 (V8 14.1), not the course's pinned Node 24 LTS** — so the portable `btoa`+replace path is the default to teach; the typed-array methods are the "coming once on Node 25+" reach. Do not present `toBase64` as runnable on the course's current runtime.
  - `getRandomValues` is the **one** Web Crypto member usable from an insecure context, and throws `QuotaExceededError` above 65,536 bytes — both verified on MDN.
  - `subtle.verify` is documented (MDN) to guard against timing attacks; HMAC is symmetric (same key signs and verifies, suited when signer == verifier) — both verified.
