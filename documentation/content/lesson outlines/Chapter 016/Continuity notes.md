# Chapter 016 — Browser capability APIs

## Lesson 1 — Web Crypto: random IDs and HMAC signatures

**Taught.** The `crypto` global (ambient, no import, identical in browser/Node 24+/Edge/Server Components) across three surfaces: `randomUUID` (v4 UUID IDs), `getRandomValues` (CSPRNG bytes into a typed array, rendered base64url), and the async `subtle` surface — `digest` (SHA-256 → hex) and HMAC `importKey`/`sign`/`verify` at depth, with constant-time comparison as the verify reflex.

**Cut.** No full Route Handler shown — webhook is motivation only; params/body Zod schemas, `authedRoute`, Problem Details, and the `processed_events` replay ledger are deferred to Ch 046 (flagged in outline). `subtle.encrypt`/`decrypt`, asymmetric crypto, and `deriveKey`/`deriveBits` named for recognition only.

**Debts.**
- base64url landed here (punted from Ch 015 L2).
- Forward refs made: UUID v7 for primary keys (Code conventions / Unit 5), idempotency keys (Ch 011 L1 + Unit 11), correlation/request IDs (observability, Unit 19/20), Drizzle UUID columns (Unit 5), Better Auth session IDs + JWT public-key verify (Unit 8/9), Stripe/Resend webhook HMAC verify (Unit 7/11), content-addressable digest→hex pipeline (Unit 12 object storage).
- Promised Ch 046 owns the production webhook handler; "verify on raw body before parsing, dedupe via `processed_events` ledger" stated as the carry-forward rule.
- Referred back to Ch 010 L4 (`mkcert` / secure context) and Ch 015 L2 (`Uint8Array`, `TextEncoder`, `ArrayBuffer`-vs-view).

**Terminology.**
- "One global, three surfaces" framing; `subtle` is "the async algorithm surface" (every method returns a Promise).
- `CryptoKey` = "sealed envelope" opaque handle metaphor.
- base64url = base64 with `-`/`_` alphabet, no `=` padding.
- Defined `Term` tooltips: CSPRNG, secure context, base64url, CryptoKey, HMAC.

**Patterns and best practices.**
- Never `Math.random()` for security/IDs/tokens/nonces — only visual jitter; `crypto` is the default.
- Algorithm strings `'SHA-256'` / `'HMAC'` are case-sensitive.
- Hex render always uses `.padStart(2, '0')` (low-byte corruption guard).
- `importKey` usages array must include both `['sign', 'verify']` when both ends are used; `false` = not extractable.
- Every `subtle` call `await`ed; a missing `await` is a defect.
- Never compare a signature with `===` (timing attack); prefer `crypto.subtle.verify`, fall back to a byte-wise XOR-accumulator carrying the sanctioned comment `// constant-time compare to prevent timing attack`.
- Verify on the raw unparsed body before `JSON.parse`.
- Manual `btoa`+replace base64url path is the default on pinned Node 24; `Uint8Array.toBase64({ alphabet: 'base64url' })` is the cleaner reach once on Node 25+.

**Misc.**
- `getRandomValues` is the single Web Crypto member that also works in an insecure (`http://`) context; throws `QuotaExceededError` above 65,536 bytes.
- Node's `crypto.timingSafeEqual` named once as the Node equivalent; course standardizes on the cross-runtime `subtle.verify`.
- New lesson component: `src/components/lessons/016/1/ConstantTimeCompare.astro` (timing-leak `DiagramSequence`, `step` prop); plus inline `CryptoThreeSurfaces.astro` map. `Result`/`ok`/`err` not used in this lesson.

## Lesson 2 — The Clipboard API

**Taught.** `navigator.clipboard.writeText(string)` as the only 2026 copy API (async, rejects on failure, replaces whole clipboard, coerces non-strings via `String()`); the two gates — secure context and transient user activation — that decide whether a write lands; the canonical `CopyButton` Client Component; the honest-degrade catch branch; `readText`/`read` and `ClipboardItem` rich content as recognition-only.

**Cut.** Error taxonomy corrected from the chapter outline: insecure-context is **not** a catchable rejection — `navigator.clipboard` is `undefined` on `http://`, so it surfaces as a `TypeError`/feature-absence at access time, handled by feature-detection (not a `catch (e) { e.name === 'SecurityError' }` branch). `writeText` rejects with `NotAllowedError` (no/expired activation); `SecurityError`/`NotFoundError` from the outline dropped as inaccurate. No manual-copy fallback UI fully built (described in prose). No `ReactCoding` exercise.

**Debts.**
- Referred back to Ch 016 L1 (secure context / `mkcert`) as an owned reflex; did not re-teach.
- Named-and-deferred: `'use client'` directive (Unit 4 / Ch 033), `useState`/`useEffect`/`useRef` hook mechanics (Ch 024–025), ARIA live regions `role="status"` vs `role="alert"` and pre-mount rule (Ch 027 L3).
- Forward ref: `Blob`/`File`/`URL.createObjectURL` are next lesson (L3) — bridged as the substrate under rich `ClipboardItem` and file uploads.

**Terminology.**
- "Two gates" framing: Gate 1 = secure context, Gate 2 = transient user activation (the lesson's load-bearing new term, `Term`-defined: short-lived "user just interacted" flag, set on a gesture, cleared ~1s later).
- "The write goes inside the gesture handler, before you hand control back to the browser for anything slow" — the activation rule.
- "Smallest interactive leaf / tiny client island fed its data as props" — the client-boundary discipline.
- "Never show success you didn't achieve" — the degrade principle.
- New `Term`: transient user activation, secure context (reused), ClipboardItem.

**Patterns and best practices.**
- `'use client'` as literal first line; arrow-function component on `const`, named export, typed props `type` alias.
- Make the *button* the client island, not the whole page; parent stays a Server Component and passes `value`/`label` as string props.
- Clipboard write is the first synchronous line of the `onClick` handler — never after an `await fetch`, in a `setTimeout`, or in a `useEffect`. If server data is needed, fetch before the click.
- `try/catch` around `writeText` is mandatory; `setCopied(true)` is downstream of a resolved `await`, never beside it — no path flashes success without a real write.
- Feedback `setTimeout` handle stored in a `useRef`, cleared on unmount (cleanup discipline; lineage = Ch 014 L3 AbortController).
- `aria-label` on icon/word-only button; confirmation in a separate `role="status"` live region, visible label wrapped in `aria-hidden` so AT hears one clean announcement.
- Never reach for `document.execCommand('copy')` (legacy, deprecated) — named once, no code shown.
- Sanctioned simplification: bare semantic `<button>`, minimal Tailwind, no shadcn `<Button>`/`cn()` — deliberate, do not "fix" later. Production code would wrap the design-system button.
- Don't read the clipboard (`readText`/`read`) unless the feature genuinely needs it — paste is normally wired to an `<input>`/`<textarea>`, not polled.

**Misc.**
- New lesson component: `src/components/lessons/016/2/ActivationWindow.astro` (`DiagramSequence`, `step` prop, 3 steps), mirroring L1's `ConstantTimeCompare` build/import convention.
- Running invoices-table "Copy invoice URL" button is the chapter's recurring concrete trigger.
- Safari `ClipboardItem` async-data wrinkle (value may need to be a Promise resolving inside the gesture) flagged as recognition-only "look it up when you build an image-copy button" — not memorized.

## Lesson 3 — Blob, File, and object URLs: the upload primitives

**Taught.** Three byte primitives in a chain: `Blob` (immutable byte bag with `size` + claimed `type` MIME, constructed via `new Blob(parts, { type })`), `File` (a `Blob` subclass adding read-only `name` + `lastModified`, only ever browser-constructed off `event.target.files`), and the `URL.createObjectURL`/`revokeObjectURL` pair (a `blob:<origin>/<uuid>` string handle backed by an in-memory map that pins the bytes); assembled into the canonical leak-free pick-to-preview client island with revoke in a `useEffect` cleanup return.

**Cut.** `blob.slice`/`arrayBuffer`/`text`/`stream` body-consumer family named for recognition only, not exercised. No `ArrowDiagram` for the upload handoff (used a `Figure` + lesson component instead). `File.name` sanitize-before-storing watch-out folded into the server-validation forward ref rather than dwelt on. Client-side image processing (resize/EXIF/canvas), OPFS/File System Access, MediaSource, IndexedDB, WebTransport/WebRTC all cut or named-once.

**Debts.**
- Referred back to Ch 016 L1 (secure context — explicitly **corrected**: these primitives are NOT secure-context gated, work on plain `http://`), Ch 016 L2 (`'use client'` island, Copy button boundary), Ch 015 L1 (`Response.blob()`), Ch 015 L2 / Ch 016 L1 (`Uint8Array`).
- Named-and-deferred: `useState`/`useEffect` + the cleanup-return contract (Unit 3, Ch 024–025), `'use client'` directive (Unit 4 / Ch 033).
- Forward ref to the upload handoff: client sends `name`/`type`/`size` to a Server Action → gets a presigned PUT URL → PUTs the `File` itself straight to object storage (bytes skip the server) → reports the key back. Owned by **Ch 068 (presigned mechanics + content-type/magic-byte validation) and Ch 069 (project: XHR upload w/ progress, `file_metadata`, HEAD-verify)** — note the outline's vague "Ch 069/072" was corrected to Ch 068+069.
- Server-side content-type + magic-byte validation is where `accept`'s claim gets checked — explicitly Ch 068/069.

**Terminology.**
- The organizing sentence: **bytes from the user arrive as a `File`; bytes your own code mints are a `Blob`** — same container, two directions of travel.
- `Blob` = "the universal in-memory binary container" the platform passes around; `type` is *claimed*, never verified.
- Object URL = a string handle into an "in-memory map" that **pins** the bytes; "every `createObjectURL` has a matching `revokeObjectURL`."
- "`accept` is UX; real content-type and magic-byte validation is security, and it lives on the server."
- `FileList` = array-like, not an array (spread `[...files]` before mapping).
- New `Term`s: Blob, MIME type, FileList, object URL, data URL, revokeObjectURL, presigned URL; secure context reused.

**Patterns and best practices.**
- `createObjectURL` is the 2026 default for previews; `FileReader`/data URLs are the legacy event path (constant-size handle vs. ~33%-inflated inlined base64) — reach for `FileReader` only when you specifically need its progress events.
- Revoke belongs in the `useEffect` cleanup return keyed to the file (fires on file-change + unmount), or — for a one-shot generated download — synchronously right after `link.click()` (the download captures bytes before `click()` returns).
- **Footgun, equal billing with the leak:** never revoke on the line right after `createObjectURL` — `<img src>` reads the bytes asynchronously, so an early revoke blanks the preview ("I added cleanup and now my preview's blank").
- Pass an explicit `type` to `new Blob(...)` whenever a consumer will branch on content type (empty `type` → treated as `application/octet-stream`).
- Use `event.target.files?.[0] ?? null` (optional chain guards the cancelled-picker case); `accept` lists explicit MIME types, not `image/*`, in production-honest code.
- Render guards use `!= null` null-checks, not bare-truthy tests.
- No `useMemo`/`useCallback` (React Compiler); `useEffect` here is the sanctioned use — syncing with an external system (the object-URL map) and tearing it down.
- Sanctioned simplifications (do not "fix"): bare semantic `<input>`/`<img>`/`<p>`, no design-system component, no styling; hooks shown as shape only; no Server Action wiring; `alt=""` on the preview is correct (decorative), `alt={file.name}` the defensible upgrade.

**Misc.**
- New lesson components: `src/components/lessons/016/3/ObjectUrlLifecycle.astro` (`DiagramSequence`, `step` prop, 4 steps — pinned byte-blocks + live handle arrow, the leak being a block with no arrow; mirrors L1/L2 convention) and `src/components/lessons/016/3/UploadHandoff.astro` (inside a `Figure` — client `File` → object storage over presigned URL, bytes skip the server).
- Recurring concrete trigger: the account-settings profile-photo field (`AvatarPicker`).
- Cleanup reflex through-line continued: `revokeObjectURL` joins AbortController (Ch 014 L3) and the cleared `setTimeout` (L2) — "every resource you open in the browser, you close."
- `blob:` URLs are origin-scoped (no cross-tab, no surviving reload); browser auto-revokes all of a page's object URLs on unload, so manual revoke is about tab-lifetime memory only.
- `ReactCoding` "spot the leak" exercise shipped (fix the leaking preview; tests spy on `URL.revokeObjectURL`), plus a `VideoCallout` (Steve Griffith, videoId `ScZZoHj7mqY`).

## Lesson 4 — Web Storage: where localStorage earns its weight

**Taught.** The five-home state-location decision tree (`useState` → URL → server → cookie → `localStorage`/`sessionStorage`, "walk top-to-bottom, take the highest match; `localStorage` is the leaf, never a default"); the `localStorage`/`sessionStorage` API (same five methods `setItem`/`getItem`/`removeItem`/`clear` + `length`/`key(i)`, strings-only, synchronous, ~5–10 MB per-origin quota, scoped scheme+host+port); the two Next.js SSR hazards — server `ReferenceError` (no `window`, `'use client'` does **not** fix it because Client Components still server-pre-render) and hydration mismatch — with three guarded read forms (`typeof window` inline guard, `useEffect` deferred read, `useSyncExternalStore`); the cross-tab `storage` event; and what `localStorage` is explicitly not for (auth tokens, PII, real cart, large blobs).

**Cut.** No `ReactCoding` (deliberate — SSR/hydration hazard can't be demonstrated in the in-iframe runner; decision-tree skill assessed by `Buckets` instead); hooks shown as shape only (no real `useState`/`useEffect`/`useSyncExternalStore` wiring). Self-dispatched custom event for same-tab `storage` reaction (outline's option) dropped in favor of pointing to `useSyncExternalStore`. `BroadcastChannel`, `IndexedDB`, iframe-isolation watch-out named once for recognition only.

**Debts.**
- Referred back to Ch 016 L3 (secure context — **same correction reused**: Web Storage is NOT secure-context gated, works on plain `http://`, just browser-only), Ch 016 L2 (`'use client'` smallest-island discipline), Ch 014 L2 (attributes-vs-properties as the same hydration-mismatch class), Ch 013 (cookie trust model / `HttpOnly`, owns the session surface).
- Named-and-deferred: `useState`/`useEffect` mechanics (Unit 3, Ch 024–025), `useSyncExternalStore` at depth (Ch 025 / Unit 15), Server-vs-Client Components + SSR/hydration at depth (Unit 4, Ch 033), URL state / `nuqs` (Unit 10), Better Auth owning the auth-session surface so tokens never touch `localStorage` (Unit 8).
- `IndexedDB` named once as the home for large structured client data (recognition only, likely never reached for in 2026 SaaS UI).

**Terminology.**
- "Five homes a piece of state can live in" / "walk top-to-bottom, take the highest match"; `localStorage` is "per-device UI scratch — cheap to lose, not worth a server round-trip, meaningful only on this one device."
- "Not secure-context gated, just browser-only" (the L3-shape correction restated).
- Hydration mismatch = "first client render produces different markup than the server sent" → React warns, may discard server HTML and re-render (flicker).
- `storage` event "fires in OTHER same-origin tabs, never in the writing tab"; `null` `key` means `clear()` was called.
- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` — `getServerSnapshot` "must return the same value the first client render produces"; named as "what `next-themes` wraps."
- `?? 'null'` = the safe-default read idiom (`getItem` returns `null` for a missing key; substitutes the string `'null'` so `JSON.parse` yields `null`).
- New `Term`s: localStorage, origin (re-def), hydration mismatch, storage event.

**Patterns and best practices.**
- Decision-tree routing as a senior reflex: token → cookie (`HttpOnly`); PII / real cart / cross-device state → server; large structured data → IndexedDB; theme-before-paint → cookie (NOT `localStorage` read-after-mount).
- Strings-only: `JSON.stringify` in / `JSON.parse` out; `as T | null` cast only at the parse boundary; never `getItem(k) + n` (string concat footgun — `Number(...)` or parse first).
- `useEffect` deferred read (render server default, patch after mount) is the 2026 default for "read a stored value once on mount and show it"; `typeof window` inline guard for reads outside React's render cycle (event handlers/utilities); `useSyncExternalStore` for the React-aware bind incl. cross-tab updates.
- Make the first client render match the server (default first, patch post-commit) to avoid mismatch; `suppressHydrationWarning` is NOT a fix for storage mismatches — narrow escape hatch `next-themes` puts on `<html>` only.
- `import 'client-only'` at the top of a browser-only module turns a leaked server import into a build error (reused from L3-era guardrail).
- Every `setItem` carrying non-trivial data wrapped in `try/catch` (quota / Safari-Firefox private mode); degrade silently, never crash. `getItem` returning `null` is normal, not an error.
- Never call `clear()` from feature code — only explicit user "log out" / "reset settings" flows.
- Schema drift is the author's problem: stamp a `{ v: 1, ... }` version into stored values and migrate-or-discard on read (`localStorage` does not self-migrate like a DB schema).
- Cleanup through-line: `storage` listener subscribed with `AbortController` `signal`, aborted in cleanup — the **fourth and final** payoff of the chapter's "every resource you open, you close" reflex (joins AbortController Ch 014 L3, cleared `setTimeout` L2, `revokeObjectURL` L3).
- Sanctioned simplifications (do not "fix"): bare semantic `<aside>`, no Tailwind/shadcn, hooks shown as shape only, no Server Component parent wired, `!= null`/`=== null` guards not bare-truthy; `'use client'` literal first line, arrow-function components on `const`, typed props.

**Misc.**
- Closes Chapter 016 teaching (L5 is the quiz) and **closes Unit 2**.
- New lesson component: `src/components/lessons/016/4/SsrStorageTimeline.astro` (`step` prop, 4 steps inside `DiagramSequence` — server render → hydrate-mismatch → post-mount read → cross-tab sync; the mismatch is the two-columns-disagree moment). Mirrors L1/L2/L3 build/import convention.
- Recurring concrete trigger: the invoices-table "drag the column headers to reorder" dismissible coachmark (continues L2/L3 invoices/profile surface).
- Centerpiece is a `StateMachineWalker` (`kind="decision"`) — the decision tree, the lesson's senior payload; plus `Buckets` (place-the-state recall, the trap item is the auth token), `PredictOutput` (strings-only `"11"` footgun), and a wrong→right `CodeVariants` triple (reads-in-render breaks / deferred effect / `useSyncExternalStore`).
- Three `VideoCallout`s shipped (videoIds `Hx2UqlhPmnc` window-not-defined, `HYO8OuLuTFw` don't-store-tokens, plus library-path resources); MDN Web Storage + React `useSyncExternalStore` + TkDodo hydration + `use-local-storage-state` as `ExternalResource` cards.
- Chapter-outline error corrected: the decision tree is consistently called "five-home" (outline says "four-home") — `useState`, URL, server, cookie, `localStorage` are five; `Buckets` collapses server+cookie into one bucket for unambiguous classification.
