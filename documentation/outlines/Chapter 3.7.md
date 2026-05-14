# Chapter 3.7 — Browser capability APIs the SaaS UI reaches for

## Chapter framing

Chapters 3.1 through 3.6 installed the request lifecycle, HTTP semantics, the URL and origin model, cookies and the trust frame, the DOM and event substrate, and `fetch` plus streaming. The bytes arrive, the browser renders them, the page is interactive — and a small set of *additional* browser platform APIs are what the 2026 SaaS UI reaches for past that point. They are the surfaces a senior writes from inside a Client Component (or a `useEffect`-wrapped integration) to do things React and the framework don't do: generate a cryptographically-random ID, sign or verify a webhook payload, write text to the OS clipboard so the user can paste an invite link, hand a chosen file to a presigned upload, persist a theme preference past a hard refresh. None of these are large APIs and none of them earn a chapter on their own; together they are the bridge from "Unit 3 named the platform" to "Unit 4 lands on JSX" and they all carry threads the later units cash in.

The senior framing: **the browser platform exposes a small set of capability APIs the SaaS UI reaches for at specific call sites, every one of them gated by a senior trigger and constrained by the secure-context rule.** The student leaves with five surfaces installed at recognition depth — Web Crypto random primitives, Web Crypto HMAC, the Clipboard API, the `Blob`/`File`/`URL.createObjectURL` triplet, and `localStorage`/`sessionStorage` — knows which earn their weight in which lessons and projects, and recognizes the platform-level constraints (secure context, transient user activation, SSR safety) that bite when the API is reached for without the trigger. The chapter is short by design because the wiring lessons that consume these surfaces are where they earn their weight: Web Crypto HMAC at invitation tokens and webhook ingestion (Chapter 10.3, Chapter 12.1), the Clipboard at copy-invite-link / copy-API-key / copy-webhook-secret (Chapter 10.3, Chapter 12.1, Chapter 12.2), `Blob`/`File` at the R2 presigned-PUT upload (Chapter 13.3, Chapter 13.4), `localStorage` at the `next-themes` integration (Chapter 4.2.6) and the cookie-consent gate (Chapter 17.2.5).

The chapter ships four teaching lessons plus the quiz. The TOC's five-bullet slicing condenses cleanly into four teaching lessons: Web Crypto random primitives and HMAC pair into one lesson because they share the `crypto` global, the secure-context constraint, and the senior framing of "platform primitives that replace the crypto library reach"; the Clipboard, file primitives, and storage primitives each earn their own short lesson because they install distinct mental models and distinct senior triggers. Lesson 3.7.1 installs the Web Crypto surface — `randomUUID`, `getRandomValues`, and the `subtle` HMAC sign / verify pattern with constant-time comparison — at the depth that lets later chapters reach for it by reflex. Lesson 3.7.2 installs the Clipboard API — the `writeText` / `readText` pair, the secure-context-plus-user-activation constraint, the "Copy" button as the canonical UI shape. Lesson 3.7.3 installs `Blob`, `File`, and `URL.createObjectURL` as the three primitives every file-upload UI builds on, foreshadowing the R2 presigned-PUT in Chapter 13.3. Lesson 3.7.4 installs `localStorage` and `sessionStorage` at recognition depth — the cookie/storage decision, the SSR safety dance under Next.js 16, what these primitives are *not* for. The quiz closes the chapter and Unit 3.

Threads that must run through every lesson:

- **Each API is a capability, not a default.** The chapter is a survey of conditional surfaces. Every lesson opens with the senior trigger that earns the API its weight in the SaaS — invitation token generation, copy-to-clipboard button, file upload, theme preference — and names what the application would otherwise reach for. The student leaves recognizing the trigger, not just the API.
- **Secure context is the load-bearing precondition.** Every API in this chapter (with the narrow exception of `getRandomValues` and `localStorage`) is gated by the secure-context rule — the page must be served over HTTPS (or `localhost` in dev). Chapter 3.1.3 introduced `mkcert` specifically so the dev loop can exercise these APIs. The lesson reflexively names "secure context required" at the call site and points back to `mkcert` as the dev-time enabler.
- **The platform replaces the library reach.** The 2026 senior writes against `crypto.randomUUID()` and `crypto.subtle` instead of the `uuid` or `crypto-js` packages, against `navigator.clipboard.writeText` instead of `clipboard.js`, against `URL.createObjectURL` instead of FileReader, against `localStorage` instead of `js-cookie` for client-only state. Each lesson names the legacy library reach in one line and dismisses it with the trigger that would flip the choice — there is no trigger for the legacy reaches in the course's stack.
- **`crypto` is one global with two surfaces.** `crypto.randomUUID()` and `crypto.getRandomValues()` are synchronous, no-await random primitives. `crypto.subtle` is the asynchronous, Promise-returning surface for cryptographic operations (HMAC, encryption, hashing, digital signatures). The lesson names the split explicitly because students conflate them.
- **Constant-time comparison is non-negotiable for any signature check.** The load-bearing security point of the HMAC lesson. The naive `expected === computed` string equality short-circuits on the first mismatch and leaks bytes to a timing attacker. The senior reach is `crypto.subtle.verify(...)` (which guards against timing attacks structurally) or, when the implementation is HMAC-then-string-compare-the-digest, a constant-time comparison routine (the byte-wise XOR-accumulate loop). Chapter 12.1.1 cashes this in at webhook ingestion; this chapter installs the discipline.
- **Most of these APIs are Client-Component or `useEffect` reaches.** Web Crypto on the server side (Server Action, Route Handler) uses the same `crypto` global since Node 20+; the API surface is isomorphic. The Clipboard, file primitives, and storage primitives are browser-only — calling them in a Server Component throws because `navigator` / `window` / `document` don't exist on the server. Each lesson names the call-site constraint and points to the framework pattern that handles it (`'use client'`, `useEffect` guard, `typeof window !== 'undefined'`).
- **Senior anchors for later units are seeded here.** `crypto.randomUUID()` lands again at invitation tokens (Chapter 10.3.1), CSRF/state values in OAuth flows (Chapter 9.3.8), idempotency keys (Chapter 7.2.10, Chapter 12.1.5), and any client-side stable-ID need. `crypto.subtle.verify` lands at Stripe webhook signature verification (Chapter 12.1.1) and at the OAuth state HMAC pattern that Better Auth wraps (Chapter 9.3.8 by reference). The Clipboard pattern lands at every "Copy" affordance — copy-invite-link in Chapter 10.3, copy-API-key in Chapter 12.2 surfaces, copy-webhook-secret in Chapter 12.1 admin views. `Blob` / `File` / `URL.createObjectURL` land at the R2 presigned-PUT upload in Chapter 13.3 and Chapter 13.4. `localStorage` lands at the `next-themes` integration in Chapter 4.2.6, the cookie-consent gate in Chapter 17.2.5, and the PostHog consent-gated wiring in Chapter 20.2.4. Each forward reference is planted at the call site.

This chapter ships short code snippets — a `crypto.randomUUID()` line, a small HMAC sign / verify pair, a copy-to-clipboard handler, a file picker producing a `Blob` URL, a `localStorage` round-trip — plus a handful of exercises (`Buckets` for the secure-context split, `Matching` for storage choices, `CodeReview` for the canonical failure modes, `PredictOutput` for SSR-execution pitfalls). Two figures carry weight: a `TabbedContent` block organizing the `crypto` global's three surfaces (`randomUUID`, `getRandomValues`, `subtle`), and a small Mermaid sequence for the presigned-upload flow that the file-primitives lesson foreshadows. The chapter is recognition-and-vocabulary work; the wiring lessons in later units (auth, billing, uploads, themes) cash in.

The chapter ordering follows the dependency. Web Crypto comes first because it's the surface most likely to surprise a returning developer (the `subtle` async model, the `BufferSource` types) and because the later integrations (invitations, webhooks) lean on it. The Clipboard comes second because it shares the secure-context constraint with Web Crypto and demonstrates the user-activation rule that's specific to browser-only capability APIs. File primitives come third because they're a distinct mental model (binary data, blob URLs, the lifetime discipline) and they foreshadow the next chapter's upload work. Storage primitives close because they're the loosest constraint (no secure context, no user activation) and the most important "don't reach for this" lesson — the chapter ends on the boundary that points the student toward cookies, server state, and URL state as the senior defaults.

---

## Lesson 3.7.1 — Web Crypto: random IDs and HMAC signatures

Installs the `crypto` global's three surfaces — `randomUUID`, `getRandomValues`, and the asynchronous `subtle` HMAC sign / verify pair — with constant-time comparison as the timing-attack mitigation for any signature check.

Topics to cover:

- The chapter-opening senior question: the application needs to generate an invitation token that a user will click on from an email; the API needs to verify a webhook signature from Stripe; a Client Component needs a stable ID to wire a `<label htmlFor>` to an `<input id>` before hydration. Three different jobs, one platform global — `crypto` — that owns all three. What's the senior surface, what's the asynchronous-vs-synchronous split, and what's the trigger that earns each function its weight over the legacy library reach (`uuid`, `nanoid`, `crypto-js`)? The lesson installs the model.
- **The `crypto` global in one paragraph.** Modern JavaScript exposes a single global `crypto` object on both `window` (in the browser) and `globalThis` (in Node.js 20+ and every modern runtime). It has two distinct surfaces:
  - **Synchronous random primitives** — `crypto.randomUUID()` returns a v4 UUID string; `crypto.getRandomValues(typedArray)` fills a typed array with cryptographically-strong random bytes. No `await`, no Promise.
  - **The asynchronous `subtle` surface** — `crypto.subtle` exposes the `SubtleCrypto` interface with Promise-returning methods for HMAC, hashing, encryption, decryption, signing, verification, and key derivation. Every call is `await`ed.
  - The senior reach in 2026: `crypto.randomUUID()` and `crypto.subtle` cover every random-and-cryptographic need the SaaS encounters. The library reach (`uuid` for UUIDs, `crypto-js` for HMAC, `bcryptjs` for password hashing — though password hashing belongs server-side and goes through Better Auth) is gone. The exception is password hashing (argon2id, bcrypt, scrypt) where `crypto.subtle` doesn't cover the algorithm — Better Auth (Chapter 9.2) owns that and the student doesn't write it themselves.
- **`crypto.randomUUID()`** — the senior default for any client- or server-generated identifier:
  - **The signature.** No arguments. Returns a string of the form `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (RFC 4122 v4 UUID). The `4` and `y` (one of `8`/`9`/`a`/`b`) are version and variant markers; the rest is 122 bits of cryptographic randomness. Collision probability is mathematically negligible — a billion UUIDs has a roughly 1-in-10¹⁸ chance of a collision, which is below the noise floor of cosmic-ray bit flips.
  - **The canonical call sites.** Invitation tokens (Chapter 10.3.1), OAuth state values (Chapter 9.3.8, named once), idempotency keys (Chapter 7.2.10, Chapter 12.1.5), client-side stable IDs (a list-item key when no natural ID exists), correlation IDs for structured logs (Chapter 20.1.2). The 2026 senior writes `crypto.randomUUID()` and moves on; the `uuid` package gets a one-line dismissal.
  - **Secure context.** Required in the browser. Available everywhere on `localhost` (the browser grants the localhost exception). Always available in Node.js server-side. The dev-time bite: a Client Component calling `crypto.randomUUID()` on an HTTP origin (not localhost) throws — `mkcert` is the fix from Chapter 3.1.3.
  - **UUID v7, named for recognition.** The 2024 RFC 9562 added v7 UUIDs — time-ordered, sortable, monotonic. `crypto.randomUUID()` is still v4 in 2026 (the spec hasn't been updated to v7 yet); v7 is the senior reach for database primary keys where insertion order matters (Chapter 6.2.5 owns the bigserial-vs-UUID call). Named once for the boundary; the surface available right now is v4.
  - **The watch-out.** UUIDs are 36 characters and not particularly compact. When a shorter ID is needed for a URL slug or a user-facing code (an invitation code the user types, a public order number), `crypto.randomUUID()` is the wrong shape — reach for `getRandomValues` plus a base32 or base58 encoder, or pre-pin to `nanoid` if the API is too verbose. Most SaaS code doesn't hit this; the canonical reach is the UUID.
- **`crypto.getRandomValues(typedArray)`** — the lower-level random byte primitive:
  - **The signature.** Takes a `TypedArray` (`Uint8Array`, `Uint16Array`, `Int32Array`, etc.), fills it with cryptographically-strong random bytes in place, returns the same array.
  - **The canonical call sites.** Generating a session token, an API key, a webhook secret, a magic-link token, anywhere that needs N bytes of random data the application then encodes as base64 / hex / base32. The shape: `const bytes = crypto.getRandomValues(new Uint8Array(32)); const token = btoa(String.fromCharCode(...bytes))` — though the 2026 senior reach for byte-to-string is `Buffer.from(bytes).toString('base64url')` on the server side or a dedicated encoder helper.
  - **The size limit.** A single call can fill at most 65,536 bytes (the per-call cap the spec imposes). Larger buffers need multiple calls. The lesson names the limit once for completeness.
  - **The senior watch-out.** Don't roll your own UUID with `getRandomValues` — `randomUUID()` is the senior reach for UUIDs. Use `getRandomValues` for arbitrary-length random byte strings (tokens) where the encoded form matters.
  - **Available in insecure contexts.** Unlike `randomUUID` and `subtle`, `getRandomValues` is available even on HTTP origins — it's the only Web Crypto method that doesn't require a secure context. Rarely matters in 2026 because the senior runs everything over HTTPS, but named for completeness.
- **`Math.random()` is not cryptographic.** The single most-important boundary in the lesson. `Math.random()` is a fast pseudorandom generator suitable for UI jitter, animation seeds, and shuffle helpers. It is **not** suitable for any value an attacker could exploit by predicting — session tokens, invitation codes, magic links, password reset tokens, idempotency keys. The senior reflex: any value that has security implications goes through `crypto.randomUUID()` or `crypto.getRandomValues()`; `Math.random()` is for visuals.
- **`crypto.subtle` in one paragraph.** The asynchronous cryptographic primitives surface. Every method returns a Promise. The methods take and return `BufferSource` types (`ArrayBuffer` or `TypedArray`), not strings — the application converts between strings and bytes via `TextEncoder` (string → `Uint8Array`) and `TextDecoder` (`Uint8Array` → string). The surface covers HMAC sign / verify, symmetric encryption (AES-GCM), asymmetric encryption (RSA-OAEP), digital signatures (RSA-PSS, ECDSA), hashing (SHA-256, SHA-384, SHA-512), and key derivation (PBKDF2, HKDF). For the course's 2026 SaaS stack, **the HMAC sign / verify pair is the surface the student writes against**; the other primitives are recognition-only.
- **HMAC sign and verify — the lesson's primary payoff:**
  - **The model.** HMAC (Hash-based Message Authentication Code) takes a shared secret and a message; it produces a fixed-size digest. The verifier computes the same digest from the same message and secret, and the digests match if and only if the message and secret are unchanged. The shared secret is what makes HMAC different from a plain hash — an attacker who doesn't know the secret can't produce a matching digest, even if they can see other (message, digest) pairs.
  - **The canonical SaaS sites.** Webhook signature verification (Stripe's `Stripe-Signature` header, Resend's signature header, Trigger.dev's signature, GitHub's `X-Hub-Signature-256`); invitation-link signing where the token includes the invitation ID and the server verifies the signature before resolving the invitation (Chapter 10.3); magic-link tokens where the token is `{userId, expiresAt}` HMAC'd with the auth secret (Better Auth handles this internally); CSRF state values on OAuth flows where the state needs to be unforgeable.
  - **The full sign-and-verify shape**, named in two short snippets:
    ```ts
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    // signature is an ArrayBuffer — convert to hex or base64 for the wire
    ```
    The annotations: `importKey` turns the raw secret bytes into a `CryptoKey` object the `sign` and `verify` methods can use; the algorithm `{ name: 'HMAC', hash: 'SHA-256' }` is the senior default in 2026 (SHA-1 is broken, SHA-256 is the standard); the key's `extractable` flag is `false` (the key never leaves the crypto layer in serialized form); the usages `['sign', 'verify']` are the operations the key is permitted to perform.
  - **Verify, the senior-shape version**:
    ```ts
    const expectedSignature = hexToBytes(signatureHeader);
    const valid = await crypto.subtle.verify('HMAC', key, expectedSignature, encoder.encode(rawBody));
    if (!valid) throw new InvalidSignatureError();
    ```
    The load-bearing point: `crypto.subtle.verify` does the comparison in constant time internally. The application does *not* hex-decode the expected signature and compare with `===` — that's the timing-attack-vulnerable shape. `subtle.verify` is the senior reach.
  - **The "if you must compare digest strings yourself" pattern** — sometimes the verification routine produces a digest as a hex or base64 string (from `subtle.sign`) and needs to compare it to a header value. The senior reach is a constant-time string comparison helper:
    ```ts
    function timingSafeEqual(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }
    ```
    The XOR-accumulate loop runs in O(length) time regardless of where the mismatch is, denying the attacker the timing channel. On Node.js the senior reach is `crypto.timingSafeEqual(bufA, bufB)` (the built-in helper); in pure-Web-Crypto code the loop above is the portable shape. Chapter 12.1.1 owns the depth at webhook ingestion; this lesson installs the discipline.
- **Hashing with `crypto.subtle.digest`**, named in one paragraph for the boundary:
  - **The shape.** `await crypto.subtle.digest('SHA-256', encoder.encode(data))` returns an `ArrayBuffer` with the hash. SHA-256 is the senior default; SHA-1 is broken and named only as the legacy.
  - **The senior watch-out.** A hash is not a signature — anyone can compute the hash of any message. Use hashes for content addressing (file deduplication, ETag generation, integrity checks against a known good hash), not for authentication. Authentication requires HMAC (shared secret) or a digital signature (asymmetric key).
- **`SubtleCrypto.generateKey` and `SubtleCrypto.exportKey`** — named for recognition:
  - **The shape.** `subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify'])` generates a fresh HMAC key; `subtle.exportKey('raw', key)` serializes the key bytes for storage. The senior reach when the application generates its own signing keys (rare — the course's SaaS uses environment-variable-stored secrets for HMAC).
  - **The 2026 reach in this course.** The auth secret, the Stripe webhook secret, the Resend webhook secret are all environment variables (`@t3-oss/env-nextjs`-validated since Chapter 1.4.5). The application imports the secret string into a `CryptoKey` at startup and reuses the key for every sign / verify. `generateKey` is named for recognition; the course doesn't write it.
- **The asymmetric-signature surface (RSA-PSS, ECDSA)**, named once for the boundary. The senior trigger to reach for asymmetric signatures over HMAC is when verification needs to happen by a party who shouldn't know the signing key — JWT verification by a third-party service that has the public key but not the private, OAuth ID token verification (the IdP signs with RSA, the application verifies with the IdP's public key — Better Auth handles this internally). For first-party signatures (the application signs and verifies), HMAC is simpler and faster. Named for recognition; the wiring is out of scope.
- **Encoding bytes for the wire**, named at the depth that lands here:
  - **`TextEncoder` and `TextDecoder`.** The two classes for string-to-bytes and bytes-to-string conversion. `new TextEncoder().encode(str)` returns a `Uint8Array` of UTF-8 bytes; `new TextDecoder().decode(bytes)` returns the original string. The 2026 senior reach for any string crossing the Web Crypto boundary.
  - **Hex encoding.** `Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')` is the manual reach; a small helper or `Buffer.from(bytes).toString('hex')` on the server. Named once; the senior writes a `hexToBytes` / `bytesToHex` helper pair in the project's `lib/` once and reuses.
  - **Base64 and base64url.** `btoa(String.fromCharCode(...bytes))` is the browser's reach for base64 (not URL-safe); `Buffer.from(bytes).toString('base64url')` on the server is the senior shape for URL-safe base64 (replaces `+`/`/` with `-`/`_` and strips padding). The `Uint8Array.prototype.toBase64()` and `Uint8Array.fromBase64()` methods are landed in 2026 in modern browsers and Node 26 — named for the future; not yet the default the course writes against.
- **Web Crypto in Server Components, Server Actions, Route Handlers, and the Edge:**
  - **Server side.** `crypto.randomUUID()`, `crypto.getRandomValues()`, `crypto.subtle` are all available on the `crypto` global in Node.js 20+ (the course's stack runs Node 24 LTS). The API surface is identical to the browser. The student writes the same code on both sides.
  - **Edge Runtime.** Cloudflare Workers, Vercel Edge Functions all expose the same Web Crypto surface. The course's Next.js stack defaults to the Node runtime (Chapter 21.3.3), but Web Crypto code runs on either.
  - **The senior reach.** Webhook signature verification runs in a Route Handler (Chapter 12.1) — server-side Web Crypto. Invitation token generation runs in a Server Action (Chapter 10.3.6) — server-side Web Crypto. Client-side Web Crypto is rare in 2026 SaaS code; the canonical client-side use is the `randomUUID` for a stable list key or a correlation ID for client-emitted logs.
- **The watch-outs a senior names:**
  - **`crypto.subtle` doesn't exist on insecure HTTP origins in the browser.** Calling `crypto.subtle.sign` over HTTP throws. `mkcert` for dev (Chapter 3.1.3), HTTPS in production. Server-side has no constraint.
  - **`importKey` is asynchronous; cache the result.** A route handler that calls `importKey` on every request pays the conversion cost on every request. The senior reach: hoist the key import to module scope (or use a memoized helper) so the key is constructed once per process.
  - **`subtle.sign` returns an `ArrayBuffer`, not a string.** The wire format is hex or base64 — the application encodes explicitly. The senior watch-out: forgetting to encode produces `[object ArrayBuffer]` in the header (the silent stringify).
  - **HMAC keys are symmetric; protect them like passwords.** A leaked webhook secret means an attacker can forge webhooks the application will accept. The 2026 senior reach: the secret lives in environment variables (`@t3-oss/env-nextjs`-validated), never in code, never in client bundles. Chapter 17.2.6 owns the secrets discipline.
  - **`Math.random()` is the wrong primitive for any security value.** The senior reflex names this every time a token or an ID needs to be unguessable.
  - **`crypto.randomUUID()` is v4 only as of 2026; v7 (time-ordered) is the future.** Named once; reach for `randomUUID()` everywhere the course needs a UUID right now.
  - **`crypto.subtle` operations don't auto-batch; sequential awaits compound latency.** A route handler that signs three values sequentially with three awaits is slower than `Promise.all([...])` over three signs in parallel. Rare in the course's stack, but the watch-out is real.
  - **Cross-realm `BufferSource` equality.** A `Uint8Array` from a Web Worker isn't `instanceof Uint8Array` in the main thread (different realm). Rare in 2026 SaaS code; named for the boundary.
  - **The `'raw'` key format vs. `'jwk'`.** `importKey` takes a format argument. `'raw'` for HMAC (the secret is bytes); `'jwk'` for JWK-formatted keys (the asymmetric reach); `'pkcs8'` and `'spki'` for the private and public halves of asymmetric keys. The senior default for the course's HMAC reach: `'raw'`.

What this lesson does not cover:

- Webhook signature verification end-to-end with `processed_events` and the outer transaction (Chapter 12.1).
- The full invitation token flow — generation, signing, email send, accept handler (Chapter 10.3).
- Better Auth's session token and magic-link token signing (Chapter 9.3.5, Chapter 9.3.8) — Better Auth wraps the Web Crypto surface internally.
- Asymmetric cryptography at depth — RSA, ECDSA, key pair generation, JWT signing and verification.
- Password hashing (argon2id, bcrypt, scrypt) — out of scope; Better Auth owns the surface.
- Symmetric encryption (AES-GCM) — out of scope; the SaaS rarely encrypts at this layer (TLS handles transport, the database handles at-rest encryption transparently).
- Key derivation (PBKDF2, HKDF) — out of scope.
- The full `SubtleCrypto` API surface beyond HMAC sign / verify / digest — named once for the boundary.
- The new `Uint8Array.prototype.toBase64()` / `fromBase64()` methods in detail — named for the future.

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson teaches a specific API surface (the three faces of `crypto`) and the senior shape for HMAC sign / verify as one canonical pattern. The deliverable is recognition — the student names which `crypto` surface owns which job (UUIDs, random bytes, HMAC sign / verify, digest), writes the HMAC import-and-sign pattern by reflex, and reaches for `subtle.verify` (constant-time) over manual string comparison every time.

Open with the senior question — "you need an invitation token, a webhook signature check, and a stable list key; what's the platform global?" — and a `MultipleChoice` exercise comparing four options (`uuid` package + `crypto-js` for signatures — wrong, legacy; `Math.random()` + `===` for signatures — wrong, insecure; `crypto.randomUUID()` + `crypto.subtle.verify()` — right; the framework's helper that wraps it — wrong, the framework doesn't have one). The discrimination installs the platform-first reach.

A `TabbedContent` block organizes the `crypto` global as three tabs. Tab 1 is `crypto.randomUUID()` — the signature, the canonical sites, the secure-context requirement, the v4-vs-v7 boundary. Tab 2 is `crypto.getRandomValues(typedArray)` — the signature, the byte-string reach, the 65,536-byte cap. Tab 3 is `crypto.subtle` — the asynchronous Promise-returning surface, the `BufferSource` types, the `importKey` step before sign / verify / digest. Each tab has the canonical use case and the senior trigger.

A `Figure` with a hand-authored SVG renders the HMAC sign-and-verify dance. On the left, the sender: the message, the secret, `subtle.sign` producing a signature. On the right, the receiver: the message, the same secret (imported as a key), the received signature, `subtle.verify` returning `true` / `false`. An annotation underneath names the constant-time-comparison guarantee.

An `AnnotatedCode` block walks the full HMAC sign and verify pattern in two short paired snippets. Annotations highlight: the `TextEncoder` for string-to-bytes conversion, the `importKey` step that produces a reusable `CryptoKey`, the `{ name: 'HMAC', hash: 'SHA-256' }` algorithm shape, the `extractable: false` flag, the usage list `['sign', 'verify']`, the `subtle.verify` that does the constant-time compare internally. The student sees the senior shape as one piece.

A second `AnnotatedCode` block walks the constant-time string compare helper — the XOR-accumulate loop. Annotations name why the naive `===` is wrong (short-circuits on first mismatch, leaks bytes through timing) and why the XOR loop is right (O(length) regardless of mismatch position).

A `ScriptCoding` block puts the student in the seat. They write `crypto.randomUUID()`-emitting code, then a small HMAC sign-and-verify pair where the test harness flips one byte of the message and asserts the verify returns `false`. The grader checks the shape: `importKey` once, `subtle.sign` for the sign side, `subtle.verify` for the verify side (not a manual `===`).

A `Buckets` exercise sorts ten scenarios into "use `randomUUID`" vs. "use `getRandomValues`" vs. "use `Math.random()`" — an invitation token (randomUUID), a 64-byte session secret (getRandomValues + encoding), a stable React list key (randomUUID), an animation-delay jitter (`Math.random`), a webhook secret (getRandomValues), an idempotency key (randomUUID), a randomly-picked tip from an array of strings (Math.random), a 16-character user-facing invitation code (getRandomValues + base32), a 6-digit one-time code (getRandomValues + modular reduction), a correlation ID for client-side logs (randomUUID). The discrimination locks in.

A `Matching` exercise pairs five `crypto.subtle` operations with their canonical SaaS site — HMAC `sign` (generating an invitation token signature), HMAC `verify` (verifying a webhook signature), `digest` SHA-256 (content addressing for ETags), `generateKey` (named once; not the course's reach), `importKey` (loading the env-var webhook secret into a `CryptoKey` at module scope). The vocabulary is locked in.

A `CodeReview` exercise on a 40-line snippet that mixes Web Crypto reaches with five seeded issues:
- A webhook handler that compares the expected and computed signatures with `===` (timing-attack vulnerability — should use `subtle.verify` or constant-time compare).
- A session token generated with `Math.random()` (insecure — should be `getRandomValues`).
- A route handler that calls `importKey` inside the handler on every request (per-request cost — should be hoisted to module scope).
- A `subtle.sign` whose result is interpolated into a header as `${signature}` without encoding (`[object ArrayBuffer]` in the header — should be hex / base64 encoded).
- A client component calling `crypto.subtle.sign` over HTTP in production (throws — secure context required).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `crypto.randomUUID()` called on `http://example.com` (throws — secure context required).
2. `crypto.randomUUID()` called on `http://localhost:3000` (works — browsers grant the localhost exception).
3. A `subtle.verify` where one byte of the message has been tampered (returns `false` — the digest doesn't match).

The recognition of secure-context behavior and HMAC tamper-detection is concrete.

Close with a `TrueFalse` round of five statements: "`Math.random()` is suitable for generating session tokens" (false — not cryptographic), "`crypto.subtle` is synchronous" (false — every method returns a Promise), "`crypto.subtle.verify` does the comparison in constant time internally" (true — the load-bearing point), "`crypto.randomUUID()` works on HTTP origins" (false — secure context required, except on localhost), "An HMAC key generated with the same secret on the sender and receiver produces matching signatures" (true — that's the model). The vocabulary is locked in.

Estimated student time: 55 to 70 minutes. Load-bearing for Chapter 9.3 (Better Auth token flows by reference), Chapter 10.3 (invitation tokens), Chapter 12.1 (webhook signature verification, the chapter's primary cash-in), Chapter 17.2.6 (secrets), and any later HMAC or random-token reach.

---

## Lesson 3.7.2 — The Clipboard API: the Copy button surface

Installs `navigator.clipboard.writeText` as the senior copy reach, the secure-context-plus-user-activation constraints, and the canonical "Copy" button shape with `'use client'`, `try/catch`, feedback state, and `aria-label`.

Topics to cover:

- The senior question: the application has just generated an invitation link and a webhook secret in an admin panel. The user needs to copy each to the clipboard with one click — the legacy reach is a hidden `<textarea>`, `select()`, `document.execCommand('copy')`. The 2026 senior reach is `navigator.clipboard.writeText(value)` — async, Promise-returning, no DOM hack. What are the constraints (secure context, transient user activation, browser-specific permission model), what's the canonical UI shape (the "Copy" button), and what are the failure modes the student will hit (no clipboard in a Server Component, permission denied without user activation, no clipboard in an HTTP dev environment)? The lesson installs the surface.
- **The Clipboard API in one paragraph.** The modern browser-only API for reading from and writing to the system clipboard. Exposed on `navigator.clipboard`. Asynchronous — every method returns a Promise. The senior reach is `navigator.clipboard.writeText(string)` for writing (the canonical SaaS site) and `navigator.clipboard.readText()` for reading (rare in SaaS UIs; the user can `Cmd+V` into a textarea instead). The legacy `document.execCommand('copy')` is deprecated; named once and dismissed.
- **The senior write shape**, the lesson's primary deliverable:
  ```tsx
  'use client';
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch (error) {
      // The user denied permission, or the browser refused (insecure context, no user activation).
      toast.error('Copy failed — please copy manually');
    }
  };
  return (
    <button type="button" onClick={handleCopy} aria-label="Copy invitation link">
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
  ```
  The annotations the lesson names: `'use client'` because `navigator` doesn't exist on the server, the `useState` for the post-copy feedback (the "Copy" → "Copied!" affordance is the canonical UX shape), the `setTimeout` to reset the state, the `try/catch` because the Promise rejects on permission denial, the `aria-label` because the icon-only button needs an accessible name (Chapter 4.11.3 owns the accessibility depth). The button's `onClick` is the user activation that the API requires.
- **`navigator.clipboard.writeText(text)`** — the write surface:
  - **The signature.** Takes a string. Returns a Promise that resolves when the write succeeds, rejects when it fails.
  - **The constraints.** Secure context (HTTPS or localhost). Transient user activation (the call must happen synchronously inside a user-initiated event handler — `click`, `keydown`, `submit`; a `setTimeout`-deferred call usually doesn't qualify). Most browsers also require the `clipboard-write` permission (granted implicitly on user activation in Chrome and Edge).
  - **The canonical SaaS sites.** Copy invite link (Chapter 10.3), copy API key (Chapter 12.2 surfaces), copy webhook secret (Chapter 12.1 admin views), copy share link, copy embed code, copy referral code. The senior pattern: every "Copy" affordance ships with the "Copied!" feedback state.
  - **The failure modes.** The Promise rejects if the user has denied clipboard permission (rare on modern browsers under user activation), if the call is made outside a user activation context (a `setTimeout`-deferred call after the click event has dispatched), or if the page isn't in a secure context. Each rejection is caught and surfaced to the user as a manual-copy fallback.
- **`navigator.clipboard.readText()`** — the read surface:
  - **The signature.** No arguments. Returns a Promise resolving to the clipboard's text content.
  - **The constraints.** Stricter than `writeText`. Secure context, user activation, **and** an explicit permission prompt the user must accept (or a paste affordance the user clicks like the OS context-menu "Paste" item). Firefox and Safari historically did not support the underlying permission model; in 2026 Firefox 147+ supports reading after user-clicked paste prompt, Safari still requires the user to invoke an OS-level paste.
  - **The canonical SaaS sites.** Almost none. The 2026 reality: the senior reach for "paste a value into the app" is a `<textarea>` or `<input>` the user `Cmd+V` into. Reading from `navigator.clipboard` is reserved for the rare power-user surface (a clipboard inspector tool, an analytics tool that prefills from copied text). The course doesn't write `readText` against any first-party flow.
  - **The watch-out.** Building a flow that depends on `readText` working without explicit user invocation fails on Safari and may fail on Firefox depending on user settings. Don't lean on it for any critical flow.
- **Clipboard items (rich content)** — named in one paragraph for the boundary. `navigator.clipboard.write(items)` and `navigator.clipboard.read()` operate on `ClipboardItem` objects that can carry multiple MIME types per entry (text plus HTML, an image as PNG, a custom format). The 2026 reach for SaaS: rarely; the canonical case is copy-an-image-to-clipboard (the user clicks a chart and pastes it into Slack as an image) and even that gets a single `write` call. Named for recognition; the course's first-party UI uses `writeText` and `readText` only.
- **The `clipboard-write` and `clipboard-read` permissions** — the model:
  - **`clipboard-write`** — granted implicitly on Chrome and Edge under user activation. Firefox and Safari don't expose a permission name but allow the write under user activation. The application doesn't usually query the Permissions API for `clipboard-write` because the implicit grant is the universal pattern.
  - **`clipboard-read`** — Chrome and Edge prompt the user; Firefox 147+ allows after paste-prompt; Safari requires OS-level paste. The application that needs `readText` queries `navigator.permissions.query({ name: 'clipboard-read' })` first and surfaces the prompt to the user.
  - **The senior watch-out.** Permissions querying is non-portable across browsers; the senior reach for `writeText` is to call it and catch the rejection rather than pre-querying.
- **Secure context** — the load-bearing precondition. Same as Web Crypto: the page must be HTTPS or `localhost`. An HTTP origin in production has no `navigator.clipboard`. The dev-time fix is `mkcert` from Chapter 3.1.3. The senior reach: feature-detect at the call site (`if (!navigator.clipboard) ...`) and surface a manual-copy fallback when unavailable.
- **User activation** — the second load-bearing precondition. The Clipboard API requires the call to be made *inside* a user-initiated event handler. A click that triggers an async fetch and then a `clipboard.writeText` after the fetch resolves often fails — the activation has lapsed by the time the await returns. The senior reach when copy needs to wait for a server round-trip:
  - **Option A: precompute.** Generate the value before showing the "Copy" button so the click handler can `writeText` synchronously.
  - **Option B: copy a placeholder.** Copy a "fetching..." placeholder synchronously, then update with the real value (rarely the right UX; named for completeness).
  - **Option C: keep the activation alive with a synchronous fetch trick.** Construct a `ClipboardItem` whose data is a Promise that resolves to the value; the browser keeps the activation alive while the promise resolves. This is the modern shape:
    ```ts
    const valuePromise = fetchValue().then(value => new Blob([value], { type: 'text/plain' }));
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/plain': valuePromise }),
    ]);
    ```
    Named once for the boundary; rare in 2026 SaaS code because the senior precomputes.
- **Server Component pitfall** — the canonical failure mode:
  - **The bug.** A component file forgets the `'use client'` directive; the component is a Server Component; the JSX is fine but the `onClick` handler that calls `navigator.clipboard.writeText` doesn't exist at runtime — the build error is "event handlers cannot be passed to Server Component props." The senior reflex: a component that calls a `navigator.*` API is a Client Component; the file starts with `'use client'`.
  - **The senior reach.** A "Copy" button is a leaf Client Component (the file's only export is the button, the entire file is `'use client'`); it can be rendered inside any Server Component parent that passes the text-to-copy as a serializable prop.
- **The legacy reach**, named once for recognition:
  - **`document.execCommand('copy')`.** The 2010-era pattern: select text in a hidden `<textarea>` or contenteditable element, call `document.execCommand('copy')`, the browser copies the selection to the clipboard. Synchronous, no Promise. Deprecated since 2018; still works in every browser for backward compatibility.
  - **The senior dismissal.** Don't use it. The async Clipboard API is the senior reach in 2026 for every browser the course supports. The legacy path is named for recognition only — when reading old code, the student knows what it does and what the modern replacement is.
- **The watch-outs a senior names:**
  - **Calling `navigator.clipboard` on the server throws.** Server Components, server-rendered pages, and any code path executed on the server has no `navigator`. The `'use client'` directive plus `useEffect` (or the event handler) is the senior pattern.
  - **The Promise from `writeText` rejects silently on permission denial.** The senior reach: every `writeText` call has a `try/catch` and surfaces a fallback to the user (a toast, a tooltip explaining that the value can be selected and copied manually).
  - **The user activation requirement is stricter than the call-inside-a-handler shorthand.** Awaiting a fetch inside the handler and then calling `writeText` after the fetch resolves usually loses the activation. The senior reach: precompute the value, or use the `ClipboardItem` with a Promise payload.
  - **Safari and Firefox don't expose the `Permissions` API for clipboard names uniformly.** Querying `navigator.permissions.query({ name: 'clipboard-write' })` throws on some browsers. The senior reach: don't pre-query; call the API and catch.
  - **Copy feedback should be visually distinct from the idle state but not garish.** The canonical pattern: swap the icon (`Copy` → `Check`) for ~2 seconds, optionally change the button's `aria-live` region content for screen readers. Don't reach for a full toast for a single-button feedback.
  - **The clipboard receives plain text by default.** A `writeText` with a string that contains HTML doesn't paste as rich content into Word or Gmail — it pastes as plain text including the tag syntax. For rich content the application uses `ClipboardItem` with `text/html` and `text/plain` formats together.
  - **`navigator.clipboard.writeText` can be called many times in rapid succession.** Each call overwrites the clipboard. The senior watch-out: rapid double-clicks on a "Copy" button cause two writes; the UX is fine but the senior names this if asked about race conditions.
  - **The 2024 Async Clipboard API permission landscape.** Chrome and Edge grant `clipboard-write` implicitly under user activation. Firefox 147+ and Safari current handle this through user-activation-only with no separate permission concept. The senior treats the API as "call it inside a user gesture and catch the failure"; the permission detail is platform-specific and the catch-all-and-fallback pattern handles every case.

What this lesson does not cover:

- The full DataTransfer API and drag-and-drop (out of scope).
- Reading rich-content `ClipboardItem`s at depth — named once for the boundary.
- The `paste` and `copy` DOM events (the browser fires these on the focused element; rarely intercepted by application code in 2026 SaaS — out of scope).
- The Clipboard's interaction with iframes and the Permissions API at depth.
- The full accessibility treatment for icon-only buttons (Chapter 4.11.3).
- The toast-notification component for surface failures (Chapter 4.6.5 portals, Chapter 4.11.5 empty/loading/error states).

Pedagogical approach:

Mechanics archetype with a strong UX-pattern beat. The lesson teaches a small API surface (`writeText` and `readText`) and the canonical UI shape (the "Copy" button with feedback). The deliverable is the copy-to-clipboard reflex — when the student sees an invitation link or an API key surface in a project, the corner of their mind hears "writeText, catch, feedback state."

Open with the senior question — "the admin panel surfaces a webhook secret and the user needs to copy it with one click; what's the platform reach?" — and a `MultipleChoice` exercise comparing four options (a hidden `<textarea>` plus `execCommand('copy')` — wrong, legacy; `document.copyToClipboard` — wrong, doesn't exist; `navigator.clipboard.writeText` — right; a third-party `clipboard.js` library — wrong, the platform owns the API in 2026). The discrimination installs the platform reach.

A `Figure` with a hand-authored SVG renders the copy flow: a "Copy" button on the left with the user's pointer click; an arrow to `navigator.clipboard.writeText(value)`; an arrow to the OS clipboard icon on the right; a callout naming the two preconditions (secure context, transient user activation). The model is one picture.

An `AnnotatedCode` block walks the senior copy-button pattern from the topics section — the `'use client'` directive, the `useState` for the copied flag, the `try`/`catch`, the `setTimeout` reset, the icon swap, the `aria-label`. Annotations name what each piece prevents (the directive prevents the server-side `navigator` crash; the catch prevents the silent rejection; the aria-label prevents the screen-reader bug). The student sees the senior shape as one piece.

A `ReactCoding` block puts the student in the seat. They build a "Copy" button component that takes a `value` prop, writes it to the clipboard on click, and shows a "Copied!" state for 2 seconds. The test harness fires a click and asserts `navigator.clipboard.writeText` was called with the right value and the rendered output shows the "Copied!" text. The grader checks the shape: `'use client'`, `useState`, `try/catch`.

A `Buckets` exercise sorts eight scenarios into "writeText" vs. "readText" vs. "neither — use a `<textarea>`" vs. "no clipboard interaction needed" — copy an invitation link (writeText), let the user paste a license key into the app (textarea — readText is fragile), copy a chart as an image (ClipboardItem write — out of scope, named as `write` not `writeText`), copy a webhook signing secret (writeText), copy a long code block from the docs (writeText), read the user's most recent clipboard entry without their click (no — would fail permissions and is creepy UX), populate a form from a copied URL when the user clicks "Paste from clipboard" (readText with permission, but textarea is simpler), copy a generated API key (writeText). The discrimination locks in.

A `CodeReview` exercise on a 30-line snippet with four issues:
- A Server Component (no `'use client'`) with a button that calls `navigator.clipboard.writeText` (build error — needs `'use client'`).
- A copy handler that awaits a `fetch` before calling `writeText` (loses user activation; should precompute or use the `ClipboardItem` Promise pattern).
- A `writeText` call with no `try/catch` (silent failure on permission denial; should catch and fall back).
- A button with only an icon and no `aria-label` (screen-reader bug; should have an accessible name).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `navigator.clipboard.writeText('hello')` called from a Server Component (build error — event handlers can't be Server Component props; the API itself would throw at runtime because `navigator` is undefined).
2. The same call on `http://example.com` in production (rejects — no `navigator.clipboard` on insecure origins).
3. The same call on `http://localhost:3000` (works — browsers grant the localhost exception).

The recognition of the secure-context and Server-Component pitfalls is concrete.

Close with a `TrueFalse` round of five statements: "`navigator.clipboard.writeText` is synchronous" (false — returns a Promise), "`navigator.clipboard.readText` works without any user interaction" (false — requires user activation and often a permission prompt), "A copy button in a Server Component file works without `'use client'`" (false — `navigator` is undefined on the server, and event handlers can't cross the RSC wire), "The legacy `document.execCommand('copy')` should still be the senior reach in 2026" (false — deprecated; `navigator.clipboard` is the senior surface), "An icon-only copy button needs an `aria-label` to be accessible" (true). The vocabulary is locked in.

Estimated student time: 30 to 40 minutes. Load-bearing for Chapter 10.3 (copy invite link), Chapter 12.1 (copy webhook secret), Chapter 12.2 (copy API key), and any future "copy to clipboard" affordance.

---

## Lesson 3.7.3 — Blob, File, and URL.createObjectURL: the upload primitives

Installs the three binary primitives every file-upload UI builds on — `Blob`, `File`, and `URL.createObjectURL` with `revokeObjectURL` cleanup — and foreshadows the R2 presigned-PUT flow from pick to preview to direct upload.

Topics to cover:

- The senior question: the application has an avatar upload form. The user picks a file with `<input type="file">`. Before the file is uploaded to R2 (Chapter 13.3, Chapter 13.4), the UI wants to show a thumbnail preview, validate the file size and MIME type, and pass the file to a `fetch` PUT against a presigned URL. What are the platform primitives that make all of that work — `Blob`, `File`, `URL.createObjectURL` — and what's the senior shape that lands cleanly in the R2 upload chapter? The lesson installs the three primitives at recognition depth, foreshadows the presigned-PUT flow, and names the lifetime discipline (`revokeObjectURL`) that prevents the canonical memory-leak shape.
- **The three primitives in one paragraph.**
  - **`Blob`** — a binary blob of bytes with a MIME type. Created from raw bytes (`new Blob([uint8array], { type: 'application/octet-stream' })`) or extracted from sources (a `fetch` response via `.blob()`, a canvas via `toBlob`). The base class for any binary payload.
  - **`File`** — a subclass of `Blob` that adds a filename, a `lastModified` timestamp, and a `name` property. Returned by `<input type="file">` (in the `FileList` of `input.files`), by drag-and-drop's `DataTransfer.files`, and by some clipboard read operations. The senior reach when the application is handling user-chosen files (uploads, previews).
  - **`URL.createObjectURL(blob)`** — the static method that produces a `blob:` URL string pointing at the in-memory blob. Usable anywhere a URL is expected — `<img src>`, `<a href>`, `<video src>`. The URL is local to the page, doesn't traverse the network, and is freed by `URL.revokeObjectURL(url)`.
- **Where files come from in 2026 SaaS UIs:**
  - **`<input type="file">`** — the canonical reach. The DOM property `input.files` returns a `FileList` (a live, array-like collection of `File` objects). Multi-file selection via `<input type="file" multiple>` produces multiple files in the list. The senior shape:
    ```tsx
    'use client';
    const [file, setFile] = useState<File | null>(null);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = event.target.files?.[0];
      if (!picked) return;
      setFile(picked);
    };
    return <input type="file" accept="image/png,image/jpeg" onChange={handleChange} />;
    ```
    The annotations the lesson names: `accept` is a hint to the OS file picker (not a security boundary — the application validates server-side); `multiple` adds multi-file selection; the typing is `React.ChangeEvent<HTMLInputElement>` for the event.
  - **Drag-and-drop** — `DataTransfer.files` carries `File` objects when the user drops files onto a drop zone. Out of scope for this lesson's depth; named once.
  - **Programmatic construction** — `new File([bytes], 'name.txt', { type: 'text/plain' })`. Rare in client code; the senior reach when wrapping arbitrary bytes for a multipart `FormData` upload.
- **`Blob` as the universal binary payload:**
  - **Properties.** `blob.size` (bytes), `blob.type` (MIME type as a string, or empty), `blob.arrayBuffer()` (async, returns the bytes as `ArrayBuffer`), `blob.text()` (async, returns as UTF-8 string), `blob.stream()` (returns a `ReadableStream` over the bytes).
  - **The MIME type watch-out.** `blob.type` is whatever the source declared. For a `File` from `<input type="file">` it's the browser's best guess from the file extension and OS metadata — not authoritative. The application validates server-side by reading the actual file bytes (the magic-number sniff). Chapter 13.3 owns the depth; the watch-out lands here.
  - **`Blob` slicing.** `blob.slice(start, end, contentType?)` returns a sub-blob. The reach for chunked uploads (uploading a 1 GB file in 10 MB chunks against an S3 multipart upload API). Out of scope here; named for recognition.
- **`File` as a `Blob` with metadata:**
  - **Properties.** Everything `Blob` has, plus `file.name` (the filename), `file.lastModified` (epoch ms), `file.webkitRelativePath` (folder upload context — rare).
  - **The senior reach.** Use `File` when the application needs the filename (showing it in the UI, persisting it to the database as part of file metadata in Chapter 13.3). Use `Blob` when the bytes are all that matter (a canvas snapshot, a programmatically-generated PDF).
- **`URL.createObjectURL(blob)`** — the local-URL primitive:
  - **The model.** Produces a `blob:https://example.com/{uuid}` URL that the browser resolves to the blob's bytes when used as a URL. The URL is *local to the document* — it cannot be shared with another page, cannot be fetched from a different origin, and is invalidated when the page unloads.
  - **The canonical SaaS sites.** Image preview before upload (`<img src={URL.createObjectURL(file)}>`); audio / video preview (`<video src={...}>`); generating a download link for a client-generated file (a CSV the app built in-browser).
  - **The lifetime discipline.** Every `createObjectURL` holds a reference to the blob bytes until either `revokeObjectURL(url)` is called or the page unloads. A long-lived page that creates many object URLs without revoking leaks memory. The senior reach:
    ```tsx
    useEffect(() => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);
    ```
    The annotation: the `useEffect` cleanup revokes the URL when the file changes or the component unmounts; the cleanup is the structural prevention.
- **The presigned-upload flow**, foreshadowed for Chapter 13.3:
  - The canonical 2026 client-side upload shape:
    1. **User picks a file.** `<input type="file">` fires `onChange`; the component holds the `File` in state.
    2. **The client requests a presigned URL.** A Server Action (`presignedPut`) takes the filename, MIME type, and size; returns a presigned PUT URL for an R2 bucket plus the final object key. Chapter 13.3 owns the server-side wiring; Chapter 13.4 builds the Server Action.
    3. **The client uploads directly to R2.** `fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })` — the `File` (or `Blob`) is the request body. The browser streams the bytes to R2; the application's server is bypassed for the upload itself.
    4. **The client confirms the upload.** A second Server Action records the file metadata (filename, size, MIME type, R2 object key) in Postgres.
  - The lesson installs the *primitives* — `File` as the body, the `fetch` PUT shape, the `Content-Type` header from `file.type`. Chapter 13.3 owns the depth.
- **`FileReader` — the legacy reach, named once and dismissed:**
  - The 2010-era API for reading file bytes — `new FileReader()`, `reader.readAsDataURL(file)`, `reader.onload = ...`. Event-based, not Promise-returning.
  - The 2026 senior dismissal. `Blob.prototype.arrayBuffer()`, `Blob.prototype.text()`, `URL.createObjectURL` cover every `FileReader` use case with a cleaner Promise-based or URL-based shape. `FileReader` is named for recognition (legacy codebases use it); the course doesn't write it.
- **Validating file size and MIME type on the client:**
  - **Size.** `file.size` returns the byte count. The senior reach: validate against an upper bound (5 MB for avatars, 100 MB for documents) before triggering the upload, surface a clear error if the file is too large. Don't trust client-side validation alone — Chapter 13.3 owns the server-side size limit via R2's presigned URL constraints.
  - **MIME type.** `file.type` is the browser's guess. The senior reach: validate against an allowlist on the client for UX (don't even attempt an upload of a `.exe`); validate authoritatively on the server by sniffing the magic bytes of the actual file content (or by relying on R2's content-type constraint on the presigned URL).
  - **The canonical pattern:**
    ```ts
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (file.size > MAX_SIZE) return toast.error('File too large (max 5 MB)');
    if (!ALLOWED_TYPES.has(file.type)) return toast.error('Unsupported file type');
    ```
- **`Blob` and `File` in `FormData`** — the cross-reference to Chapter 3.6.1:
  - The `FormData` lesson named that `formData.append('avatar', file)` adds a file to a multipart upload. The browser uses the `File`'s name and type to build the multipart boundary entry. The senior reach when the upload goes through a Route Handler that parses `formData()` (rare in the course's stack — the R2 presigned PUT is the canonical reach).
  - The senior call between presigned PUT and Route Handler multipart upload. Presigned PUT (Chapter 13.3) is the default — the file bypasses the application server entirely, the upload doesn't count against Vercel function bandwidth, and R2 handles the storage. Route Handler multipart upload is the conditional reach for files that need server-side transformation before storage (a resize, a virus scan, a content-extraction step) — even then, the senior pattern is "PUT to a temp R2 bucket, trigger a background job that transforms and re-stores."
- **The watch-outs a senior names:**
  - **The `blob:` URL is invalidated on page navigation.** A blob URL stored across a route change is no longer valid. The senior reach: don't persist blob URLs across navigations; regenerate them on the destination route from the in-memory `File` (or skip the blob URL and store the `File` itself).
  - **`URL.createObjectURL` without `revokeObjectURL` leaks memory.** The browser holds the blob bytes until the page unloads. In a long-lived SPA where the user uploads many files, the leak is real. The `useEffect` cleanup pattern is the structural fix.
  - **`<img src={blobUrl}>` works; `<img src={file}>` doesn't.** The image element expects a string URL, not a `File` or `Blob`. The student who confuses this gets a broken image. The senior reach: always pipe through `createObjectURL` before using in `src`.
  - **`file.type` can be empty.** Some files (especially via drag-and-drop from certain OS contexts) arrive with an empty MIME type. The senior reach: handle the empty case in the validator (fall back to extension-based heuristic, or reject).
  - **`<input type="file">` doesn't fire `onChange` when the user re-picks the same file.** The browser optimizes — picking the same file twice is a no-op. The senior fix: reset the input's value (`input.value = ''`) in the change handler so the next pick of the same file fires the event.
  - **`Blob.prototype.arrayBuffer()` reads the entire blob into memory.** For a 100 MB file, that's 100 MB of memory. The senior reach for large files: stream via `blob.stream()` and process chunks, or skip client-side processing entirely and upload to R2 first.
  - **Object URLs are origin-scoped.** A `blob:` URL created on `app.example.com` can't be opened from `other.example.com` (or from a Web Worker on a different origin). Rarely matters in 2026 SaaS code; named for the boundary.
  - **`File` objects are not serializable across the RSC wire.** A Server Action can't take a `File` directly as a parameter — the action accepts `FormData` (which can carry files) or a presigned PUT happens client-side and the action only takes the object key. Chapter 13.4 cashes this in.
  - **The `accept` attribute on `<input type="file">` is a UX hint, not a security boundary.** The user can override it in some OS file pickers and can drag-and-drop arbitrary files. Always validate server-side.

What this lesson does not cover:

- The R2 presigned PUT flow end-to-end — bucket setup, S3-compatible SDK, credentials (Chapter 13.3).
- The Server Action that returns a presigned URL and the file-metadata persistence (Chapter 13.4).
- Chunked / multipart uploads for large files (S3 multipart, named once for the boundary).
- Drag-and-drop UI patterns at depth.
- Image transforms (resize, crop, format conversion) — Vercel's automatic image optimization for stored images (Chapter 5.6.5, Chapter 5.6.6).
- `FileReader` at depth — dismissed as legacy.
- The Streams API at depth — Chapter 3.6.2 owns it.
- Server-side file validation, virus scanning, content sniffing.
- Direct uploads to UploadThing / Tigris / S3 / Azure Blob — out of scope (R2 is the course's choice, Chapter 13.3.1 owns the decision).

Pedagogical approach:

Mechanics-plus-pattern archetype. The lesson teaches three primitives (`Blob`, `File`, `URL.createObjectURL`) and the canonical pattern (pick → preview → presign → PUT → record) that Chapter 13.3 and Chapter 13.4 will cash in. The deliverable is recognition — the student picks a file from an `<input>`, previews it with `createObjectURL`, validates size and type, and recognizes the senior shape of the presigned-PUT flow.

Open with the senior question — "the user picks an avatar; you need a preview, a size check, and a body for the PUT to R2; what are the primitives?" — and a `MultipleChoice` exercise comparing four options (read the file with `FileReader.readAsDataURL` and base64 it — wrong, legacy and expensive; use `URL.createObjectURL(file)` for the preview and pass `file` as the `fetch` body — right; convert the file to a base64 string and POST it to a Route Handler — wrong, doubles the bandwidth and bypasses presigned URL benefits; upload the file to the application server first, transform, then forward to R2 — wrong, wastes Vercel bandwidth). The discrimination installs the primitive reach.

A `Figure` with a hand-authored SVG renders the three primitives. On the left, an `<input type="file">` element with a callout "produces a `File` (subclass of `Blob` with `name` and `lastModified`)". In the middle, the `File` object with three arrows: one to `<img src={URL.createObjectURL(file)}>` (preview), one to a size / type validator (`file.size`, `file.type`), one to `fetch(presignedUrl, { method: 'PUT', body: file })` (upload). On the right, the R2 bucket. The model is one picture.

A Mermaid sequence diagram walks the presigned-upload flow: User → File Input (pick) → Client Component (preview, validate) → Server Action `presignedPut` → R2 (returns presigned URL) → Client Component (PUT direct to R2) → R2 (200 OK) → Server Action `recordUpload` (save file metadata) → Postgres. The four steps are explicit; Chapter 13.4 will cash in.

An `AnnotatedCode` block walks the senior file-picker component — the `'use client'`, the `useState<File | null>(null)`, the `onChange` handler, the `accept` attribute, the size and type validation, the `useEffect` that creates and revokes the object URL. Annotations highlight: the `accept` is UX-only, the validation is also UX-only (server validates authoritatively), the `revokeObjectURL` in the effect cleanup prevents the memory leak.

A `ReactCoding` block has the student build a file picker that takes a file, shows a preview, validates a 2 MB size cap, and renders an "Upload" button (the actual upload call is stubbed). The grader checks: `'use client'`, the `createObjectURL` / `revokeObjectURL` pair in the effect, the size check, the preview rendered.

A `Buckets` exercise sorts ten scenarios into "use `Blob`" vs. "use `File`" vs. "use `URL.createObjectURL`" vs. "none of these" — uploading a user-chosen avatar (File), previewing the chosen avatar in an `<img>` (createObjectURL), wrapping arbitrary bytes for a multipart `FormData` upload (Blob), downloading a server-generated CSV from a Server Action's response (the response.blob() returns a Blob; createObjectURL produces the download link), reading a file's text content (file.text() — Blob method), accessing the filename of an uploaded file (File), reading a fetch response as binary (response.blob() — Blob), serving a profile image already stored in R2 (none — that's `next/image` with the R2 URL), generating a PDF in-browser and offering it as a download (Blob + createObjectURL), storing a user's chosen file across a page reload (none of these work — File / Blob are in-memory and don't persist; needs IndexedDB or re-pick). The discrimination locks in.

A `CodeReview` exercise on a 35-line snippet with five issues:
- A `<img src={file}>` (broken — needs `URL.createObjectURL(file)`).
- `URL.createObjectURL` called without a matching `revokeObjectURL` (memory leak).
- An `<input type="file">` that doesn't reset its value, so re-picking the same file doesn't fire `onChange` (no event; the senior fix is `input.value = ''` in the handler).
- Client-side MIME type check trusted as the security boundary (`file.type === 'image/png'`; server doesn't validate again — XSS or upload-malicious-file vector).
- A `fetch` PUT to a presigned URL where `body: JSON.stringify(file)` is set instead of `body: file` (uploads `[object File]` as JSON garbage; should pass the `File` directly as the body).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. A `useEffect` that calls `createObjectURL(file)` and stores the URL in state but doesn't `revokeObjectURL` on cleanup; the user picks a 50 MB file ten times — predict the memory shape (500 MB held in memory after the tenth pick; growing).
2. `input.files?.[0]?.type` for a file picked via drag-and-drop from an unusual source — predict the type (may be empty string; the senior reach handles the empty case).
3. `fetch(presignedUrl, { method: 'PUT', body: file })` where `file` is a 100 MB video and the user closes the tab mid-upload — predict the abort behavior (the fetch aborts; the senior reach is to pair with `AbortSignal` so explicit cancellation is possible — Chapter 2.7.4 cross-reference).

The recognition of lifetime, MIME-type defaults, and abort behavior is concrete.

Close with a `TrueFalse` round of five statements: "`File` is a subclass of `Blob`" (true), "`URL.createObjectURL` produces a network-accessible URL anyone can fetch" (false — the URL is local to the document, origin-scoped, in-memory), "`FileReader.readAsDataURL` is the senior reach in 2026 for image previews" (false — `URL.createObjectURL` is faster and doesn't double the bytes), "Setting `<input type='file' accept='image/png'>` prevents the user from uploading non-PNG files" (false — `accept` is a UX hint; the user can override, drag-and-drop bypasses it; server validates authoritatively), "A `File` from `<input type='file'>` can be passed as the `body` of a `fetch` PUT directly" (true — `File` is a `Blob`, `fetch` accepts `Blob` bodies). The vocabulary is locked in.

Estimated student time: 40 to 50 minutes. Load-bearing for Chapter 13.3 (R2 conditional infrastructure) and Chapter 13.4 (the presigned R2 upload project), and any future file-handling surface.

---

## Lesson 3.7.4 — Web Storage: where localStorage earns its weight

Installs the `localStorage` and `sessionStorage` API surface, the SSR safety dance under Next.js 16, and the cookie / URL state / server state / `localStorage` / `useState` decision tree with what `localStorage` is explicitly not for.

Topics to cover:

- The senior question: the user picks a dark theme on the marketing site and then refreshes the page; the theme should persist. The user is mid-way through a multi-step wizard and refreshes the tab; the wizard state should... reset, actually, per the senior call. The user signs in; the session should ride the next request. Three different persistence needs, three different platform primitives. Where does `localStorage` earn its weight, where does it not, and what are the constraints the student needs to recognize before they reach for it? The lesson installs the surface lightly — the chapter's name is "the SaaS UI reaches for"; storage primitives are *less* of the reach than students often assume.
- **The Web Storage API in one paragraph.** Two key-value stores exposed on `window` — `window.localStorage` and `window.sessionStorage`. String-keyed, string-valued; everything is `string` and the application serializes / parses (typically with `JSON.stringify` and `JSON.parse`). Synchronous (every read and write blocks the main thread for the duration of the I/O — measurable for large values but negligible for small ones). Per-origin (`localStorage` for `https://app.example.com` is invisible to `https://other.example.com`). The senior reach: store small client-only values; recognize the boundary that points everything else to cookies, server state, or URL state.
- **`localStorage` vs. `sessionStorage`:**
  - **`localStorage`** — persists across browser sessions. The data stays until the user clears it (DevTools, browser settings, "clear cache for this site") or the application explicitly removes it. The canonical SaaS site: theme preference (a non-cookie, client-only theme flag that the next page load reads to skip the flash of unstyled content), the cookie-consent decision (the boolean the client reads to gate analytics before the next page load), a small set of recently-viewed item IDs, a "tour dismissed" flag.
  - **`sessionStorage`** — scoped to the *tab*. The data is alive only as long as the tab is open. Open the same site in a new tab and `sessionStorage` is empty there. Close the tab and the data is gone. The canonical SaaS site: transient state that should reset on tab close (a multi-step wizard's intermediate state, a draft form the user might or might not submit). The 2026 senior reach: rarely. The wizard belongs in URL state for shareability (Chapter 5.5.4) or in Zustand for the deeply-nested-shared-state case (Chapter 16.3 conditional); `sessionStorage` for a wizard is a "lose on refresh" UX call the senior makes deliberately (Chapter 16.4 cashes this in).
- **The API surface a senior knows:**
  - **`localStorage.setItem(key, value)`** — write. Both arguments must be strings; if you pass a number or object, it's coerced to a string.
  - **`localStorage.getItem(key)`** — read. Returns `string | null`. The `null` is for "key not present."
  - **`localStorage.removeItem(key)`** — delete a single key.
  - **`localStorage.clear()`** — delete every key (every key for the origin).
  - **`localStorage.length`**, **`localStorage.key(index)`** — iteration. Rare in application code.
  - **The senior pattern.** Wrap reads and writes in a tiny helper that JSON-serializes on write, JSON-parses on read with a Zod schema, and falls back to a default on parse failure (corrupted entry, schema mismatch from an old app version). The shape:
    ```ts
    const readTheme = (): Theme => {
      try {
        const raw = localStorage.getItem('theme');
        if (!raw) return 'system';
        return ThemeSchema.parse(JSON.parse(raw));
      } catch {
        return 'system';
      }
    };
    ```
- **What `localStorage` is *not* for** — the load-bearing boundary the lesson installs:
  - **Auth tokens, session tokens, refresh tokens.** Any value JavaScript can read is a value an XSS injection can exfiltrate. The session belongs in an `HttpOnly` cookie (Chapter 3.4). The 2026 senior reach: never put a session token in `localStorage`. Period.
  - **PII or anything sensitive.** Same reason — the value is readable from JavaScript, including from injected scripts.
  - **Anything the server needs to read on the next request.** The server has no access to `localStorage` — it's browser-only. Values the server needs (the locale preference, the org context) belong in cookies so the SSR can read them.
  - **State that should sync across browser tabs.** Two tabs of the same SaaS share `localStorage` but don't notify each other automatically. The `storage` event fires on *other* tabs when one tab writes (named once, see below), but using it as an inter-tab event bus is a senior power-tool reach; for shared real-time state the senior reaches for SSE (Chapter 3.6.2) or the BroadcastChannel API.
  - **Large values.** The browser caps `localStorage` at ~5-10 MB per origin (varies by browser). The 2026 senior reach for larger data: IndexedDB (out of scope for this lesson; named once).
  - **Anything that should expire automatically.** `localStorage` entries don't expire; the application would need its own expiry tracking with timestamps. The cookie has `Max-Age` built in; the cookie wins for time-bounded data.
- **The SSR safety dance** — the load-bearing pitfall on Next.js 16:
  - **The bug.** A component file accesses `localStorage` at module scope or in a Server Component. The server renders, has no `window`, throws `ReferenceError: localStorage is not defined`. The build fails or the page crashes at request time.
  - **The senior reflexes.** Three options:
    1. **`'use client'` + `useEffect`.** The component is a Client Component; the `localStorage` access happens in an effect after mount (not during SSR or initial render). The canonical reach:
       ```tsx
       'use client';
       const [theme, setTheme] = useState<Theme>('system'); // SSR-safe default
       useEffect(() => {
         setTheme(readTheme());
       }, []);
       ```
    2. **`typeof window !== 'undefined'` guard.** The synchronous check that lets a function be called during SSR without crashing. Used in `next-themes` and similar libraries. The senior watch-out: the SSR render and the client's first render with the localStorage value differ — a hydration mismatch warning fires. The fix is the third pattern.
    3. **The `next-themes` shape.** The library writes a tiny inline script in the document `<head>` that runs before React hydrates and sets the `class` attribute on `<html>` from localStorage. The SSR rendered the HTML with no theme class; the inline script applies the theme class; React hydrates against the now-correct DOM. No flash, no mismatch. Chapter 4.2.6 owns the depth; the lesson installs the model.
  - **The recognition signal.** A "ReferenceError: localStorage is not defined" or a "hydration mismatch" warning around theme / consent / persisted UI state is the senior's call to look for the SSR safety pattern.
- **The `storage` event** — named once for the boundary:
  - **The model.** When tab A writes to `localStorage`, the browser fires a `storage` event on *every other tab* of the same origin. The event carries the key, old value, new value, and the URL of the page that made the change.
  - **The reach.** Logout-from-all-tabs (one tab clears the session marker; other tabs detect the change and redirect to sign-in), cross-tab state sync (a UI flag the user toggled in one tab applies to another), theme propagation (rare — the canonical reach is the inline-script-in-head pattern).
  - **The senior watch-out.** The `storage` event does *not* fire in the tab that made the change. The application that wants to react to its own writes does so in the same call as the write; the `storage` event is purely a cross-tab mechanism.
- **The cookie / `localStorage` / URL state / server state decision** — the lesson's primary deliverable:
  - **Cookie** — the value needs to ride to the server on requests. Auth, locale preference, org context, cookie consent. Use cookies (Chapter 3.4).
  - **URL state (`searchParams`)** — the value defines what the page is showing and should be shareable / refreshable. Filters, pagination, the current tab, sort order. Use the URL (Chapter 5.5.4, Chapter 11.1).
  - **Server state** — the value is the source of truth and the client just reflects it. The user's profile, their invoices, their settings. Use the database (Drizzle) with Server Components fetching directly.
  - **React state (`useState`)** — the value is transient and lives only as long as the component is mounted. A modal's open / closed flag, a hover state, a form's draft value before submit. Use `useState`.
  - **`localStorage`** — the value is client-only, persists across refreshes and tabs, doesn't need to ride to the server, and is small. Theme preference, cookie-consent decision, a "you've seen the welcome banner" flag, the user's last-selected view mode (grid vs. list) where the URL is too noisy. Use `localStorage`.
  - **`sessionStorage`** — the value is client-only, scoped to this tab, lost on tab close. Almost never the right reach — if the data should survive a refresh, use `localStorage` or URL state; if it shouldn't survive a refresh, use `useState`. The narrow case: a multi-step process where refresh-loses-state is acceptable UX (Chapter 16.4 cashes this in for the wizard project).
- **IndexedDB**, named once for the boundary:
  - The browser-native indexed key-value-and-object database. Larger storage (gigabytes per origin), structured queries, transactions, asynchronous. The senior reach when the SaaS has a genuine offline-capable UI (a notes app that syncs when reconnected) or large client-side caching (a complex CRM with snapshotted data). Out of scope for this lesson; named for recognition. The 2026 senior reach for IndexedDB is via a small wrapper like `idb` (the most popular abstraction) — the raw IndexedDB API is famously verbose.
- **The Cache API**, named once for the boundary:
  - `caches.open(name)` opens a named cache; `cache.put(request, response)` stores a `Response`; `cache.match(request)` retrieves. The reach for Service Worker integrations (PWA, offline-first). Out of scope; the course's stack is a server-rendered SaaS, not a PWA.
- **The watch-outs a senior names:**
  - **Don't store sensitive data in `localStorage`.** Auth tokens, PII, anything an XSS injection could exfiltrate. The cookie with `HttpOnly` is the security boundary.
  - **`localStorage` access on the server throws.** Every `'use client'` component that reads `localStorage` does so in a `useEffect` (not at module scope, not in the render body). The hydration-safe pattern is the SSR-default value plus the effect-read.
  - **`localStorage` is synchronous and blocks the main thread.** Small values are fine; large values measurably stall rendering. For anything past a kilobyte, consider IndexedDB.
  - **`localStorage` has a per-origin quota (typically 5-10 MB).** Exceeding the quota throws `QuotaExceededError`. The senior reach: don't accumulate in `localStorage` without bounds; prune old entries explicitly.
  - **`JSON.parse` on a tampered or schema-drifted value throws.** The senior reach: wrap reads in `try`/`catch` and validate with Zod; fall back to the default on failure.
  - **The `storage` event doesn't fire in the writing tab.** Use a local callback for the writing tab's own UI update.
  - **`sessionStorage` doesn't survive a navigation that's a full document load** (a `window.location.href = '...'` or a hard refresh). It survives soft navigations through the same tab.
  - **Two browser windows of the same site can share `localStorage` but not `sessionStorage`.** `sessionStorage` is per-tab; opening a link in a new tab makes a fresh `sessionStorage` for that tab.
  - **Private / incognito browsing.** Most browsers expose `localStorage` and `sessionStorage` in private mode but clear them when the private session ends. Some apply stricter quotas. The application that depends on persistence in private mode gets surprised; the senior reach is to treat private mode as "no persistence" gracefully.
  - **The `document.cookie` reach** is named once and dismissed for the same reasons as Chapter 3.4 (the modern reach is the framework's cookie helper; `document.cookie` is a 2010-era surface).

What this lesson does not cover:

- IndexedDB at depth (out of scope; named once).
- The Cache API and Service Worker storage (out of scope; the course doesn't ship as a PWA).
- The `BroadcastChannel` API for cross-tab messaging (out of scope; the `storage` event is named as the lightweight alternative).
- The `next-themes` library wiring (Chapter 4.2.6 owns it).
- The cookie-consent gate (Chapter 17.2.5).
- Cookie-vs-localStorage at the full depth — Chapter 3.4 owns cookies; this lesson installs the boundary.
- URL state at depth (Chapter 5.5.4, Chapter 11.1).
- The Origin-Private File System (OPFS) — out of scope.
- The Web Storage API's deprecated and broken cousins (`window.name`, document.cookie quirks) — out of scope.

Pedagogical approach:

Decision archetype with a thin mechanics beat. The lesson teaches a small API (`getItem` / `setItem` / `removeItem`) and a larger decision (where `localStorage` earns its weight against cookies, URL state, server state, and `useState`). The deliverable is the storage-decision reflex — when the student sees a persistence question, the corner of their mind walks the four-way decision tree and lands on the right primitive.

Open with the senior question — "the user picks a theme and refreshes; the user is mid-wizard and refreshes; the user signs in and reloads; where does each piece of state go?" — and a `MultipleChoice` exercise pitting four storage placements for the three values (everything in `localStorage` — wrong, session goes in cookie; theme in cookie, wizard in `localStorage`, session in `localStorage` — wrong, session leaks; theme in `localStorage`, wizard in URL or Zustand, session in `HttpOnly` cookie — right; everything in cookies — wrong, theme doesn't need server-side reads and `localStorage` is simpler). The discrimination installs the decision framing.

A `TabbedContent` block organizes the five persistence primitives as a decision card. Tab 1: cookies (server reads it, auth or locale or consent — Chapter 3.4 cross-reference). Tab 2: URL `searchParams` (shareable, refreshable, defines the page view — Chapter 5.5.4 cross-reference). Tab 3: server state (Drizzle, source of truth, fetched by Server Components — Chapter 6 cross-reference). Tab 4: `localStorage` (client-only, small, persists, theme / consent / view-mode flag). Tab 5: `useState` (transient, mounted-lifecycle only). Each tab has the canonical use case and the trigger.

A `Buckets` exercise sorts ten pieces of state into the right primitive — the user's session token (cookie, `HttpOnly`), the user's locale preference (cookie, server reads on SSR), the current page in a paginated list (URL searchParam), the user's chosen theme (localStorage), the user's profile name (server state / Drizzle), a modal's open / closed flag (useState), the user's draft text in a form before submit (useState), the user's filter selection in a list view (URL searchParam), a multi-step wizard's intermediate state (URL searchParam or Zustand — senior call, refresh-loses-state is acceptable), a "you've seen the welcome banner" flag (localStorage). The discrimination locks in the decision.

An `AnnotatedCode` block walks the senior `localStorage` reach pattern — the SSR-default state, the `useEffect` that reads localStorage and updates state, the `setTheme` action that writes to both state and localStorage, the Zod-validated parse on read with a fallback. Annotations name what each piece prevents (SSR crash, hydration mismatch, corrupted-entry crash, schema-drift crash).

A `ScriptCoding` block has the student write a tiny `useLocalStorage` custom-hook-like function — read at mount, write on update, Zod-validate the parsed value, fall back to a default on any failure. The grader checks the shape: the read is inside an effect, the write is synchronous, the parse is guarded by try/catch.

A `CodeReview` exercise on a 30-line snippet with five issues:
- A Server Component reading `localStorage.getItem('theme')` at module scope (SSR crash — needs `'use client'` + `useEffect`).
- A session token stored in `localStorage` (security bug — should be in an `HttpOnly` cookie).
- A `localStorage.setItem('user', user)` without `JSON.stringify` (stores `[object Object]` — corrupted entry).
- A `localStorage.getItem('user')` read with `JSON.parse` and no `try/catch` (crash on any parse failure, including tampered values).
- A theme preference stored in `sessionStorage` (lost on tab close — should be `localStorage` for cross-session persistence).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. `localStorage.setItem('count', 5)` then `typeof localStorage.getItem('count')` — predict the type (string — `5` was coerced; the senior reach is explicit `JSON.stringify` and `Number(...)` on read).
2. A user opens the site in Tab 1, writes `localStorage.setItem('mode', 'dark')`, then opens Tab 2 of the same origin — predict what Tab 2 sees on load (`'dark'` — `localStorage` is shared across tabs of the same origin).
3. The same user opens Tab 1, writes `sessionStorage.setItem('step', '3')`, then opens Tab 2 — predict what Tab 2 sees (empty / null — `sessionStorage` is per-tab, not shared).

The recognition of the storage scope is concrete.

Close with a `TrueFalse` round of five statements: "`localStorage` values survive a browser restart" (true — until the user clears them), "`sessionStorage` values are shared across tabs of the same origin" (false — `localStorage` is shared; `sessionStorage` is per-tab), "It's safe to store an auth token in `localStorage`" (false — XSS-exfiltratable; cookies with `HttpOnly` are the security boundary), "`localStorage.setItem` accepts any value type" (false — the value is coerced to a string; the senior reach is explicit `JSON.stringify`), "Reading `localStorage` in a Server Component works because Next.js polyfills it" (false — `localStorage` is browser-only; SSR has no `window`). The vocabulary is locked in.

Estimated student time: 35 to 45 minutes. Load-bearing for Chapter 4.2.6 (`next-themes`), Chapter 16.4 (the Zustand wizard project as a contrast), Chapter 17.2.5 (cookie-consent gate), and any future client-side persistence reach.

---

## Lesson 3.7.5 — Quizz

Top ten topics to quiz:

1. The `crypto` global has three surfaces — `crypto.randomUUID()` (synchronous, v4 UUID string), `crypto.getRandomValues(typedArray)` (synchronous, fills bytes), `crypto.subtle` (asynchronous Promise-returning surface for HMAC / hash / encrypt / sign / verify). `Math.random()` is not cryptographic and never the right reach for security values.
2. HMAC sign and verify with `crypto.subtle` — `importKey` once at module scope (or memoized), `subtle.sign` produces an `ArrayBuffer`, `subtle.verify` does constant-time comparison internally. The senior default algorithm is `{ name: 'HMAC', hash: 'SHA-256' }`. SHA-1 is broken; never reach for it.
3. Constant-time comparison for signature checks — never use `===` on the expected and computed digests; reach for `subtle.verify` (constant-time guaranteed) or a byte-wise XOR-accumulate compare; the naive equality leaks bytes through timing.
4. Secure context is the load-bearing precondition — Web Crypto in the browser (except `getRandomValues`), Clipboard API, and modern browser capability APIs require HTTPS or `localhost`; `mkcert` from Chapter 3.1.3 is the dev-time enabler.
5. The Clipboard API — `navigator.clipboard.writeText(string)` is the senior write reach, async, requires secure context plus transient user activation (a `click` handler is the canonical site); `readText` is rare in 2026 SaaS UIs; the legacy `document.execCommand('copy')` is deprecated. Always wrap in `try/catch` and surface a fallback.
6. The Server Component pitfall — `navigator.*` and `window.*` APIs don't exist on the server; any component that calls them is a Client Component (`'use client'`), and any storage / clipboard / DOM access happens in event handlers or `useEffect`.
7. The file-upload primitives — `Blob` (binary payload with MIME type), `File` (subclass of `Blob` with `name` and `lastModified`), `URL.createObjectURL(blob)` (local `blob:` URL for previews); always pair with `URL.revokeObjectURL` in `useEffect` cleanup to prevent memory leaks.
8. The presigned-PUT pattern foreshadowed for Chapter 13.3 — `<input type="file">` → `File` → presigned URL from a Server Action → `fetch(url, { method: 'PUT', body: file })` direct to R2 → record metadata in Postgres. The `File` is passed as the `fetch` body directly; not stringified, not base64-encoded.
9. The cookie / `localStorage` / URL state / server state / `useState` decision tree — cookies for what the server reads (auth, locale, consent); URL `searchParams` for shareable / refreshable state (filters, pagination); server state for source of truth; `localStorage` for client-only persistent small values (theme, consent flag); `useState` for transient mounted-lifecycle state.
10. What `localStorage` is *not* for — auth tokens (XSS-exfiltratable; cookies with `HttpOnly` are the security boundary), PII, anything the server needs to read, large values (5-10 MB quota), anything time-expiring. `localStorage` is browser-only (SSR crashes on direct access) and synchronous (blocks the main thread).

---

## Total chapter time

Roughly 160 to 205 minutes across the four teaching lessons plus the quiz. The chapter fits across two evenings — Web Crypto and the Clipboard in the first sitting (90-110 minutes), file primitives and storage primitives in the second sitting (75-90 minutes including the quiz). The student finishes Unit 3 able to write a `crypto.randomUUID()` for an invitation token by reflex, sign and verify an HMAC payload with `crypto.subtle` using the senior shape (import the key once, `subtle.verify` for constant-time comparison), wire a copy-to-clipboard button with the right `'use client'` / `try`/`catch` / aria-label discipline, build a file picker with `URL.createObjectURL` preview and `revokeObjectURL` cleanup, and place every piece of client-side state in the right storage primitive by walking the cookie / URL / server / `localStorage` / `useState` decision. Unit 4 opens on the other side with JSX and HTML semantics — the React rendering surface that lands on the DOM substrate Chapter 3.5 installed and the Client Component patterns this chapter foreshadowed.
