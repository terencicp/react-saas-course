# Lesson 4 outline — HTTPS on localhost with mkcert

## Lesson title

- **Title (h1):** HTTPS on localhost with mkcert
- **Sidebar label:** HTTPS on localhost

The chapter-outline title is precise — keep it. It names the wiring task and the tool, in that order.

## Lesson framing — conclusions from brainstorm

**Target student.** Junior arriving from lessons 1–3 of this chapter. Has read the four-stage network map, knows the rendering pipeline, has toured DevTools. Has heard "HTTPS" but never run a dev server over it; has never seen a certificate viewer in the wild. Was promised in lesson 1 that "TLS at debug depth lives in lesson 4" — this is the payoff.

**What this lesson is.** Two-thirds wiring, one-third concept. Open with the senior question (why bother with HTTPS on localhost when it "works fine on `http://localhost:3000`?"); answer it with the secure-context gate and the cost of "works on my machine, breaks in preview"; then deliver just enough TLS 1.3 mental model to understand what the certificate is and why the browser trusts (or doesn't trust) it; then wire `mkcert` and `next dev --experimental-https` end to end so the student finishes with a green padlock on `https://localhost:3000`. The student exits able to (a) explain why `mkcert` works where a self-signed cert doesn't, (b) name the three handshake phases and the four load-bearing fields (SNI, ALPN, cipher suite, cert chain), (c) install a local CA once per machine and issue project-specific certs, (d) read a `Buckets` exercise about which APIs work on which URL.

**The senior framing carried through.** Flip to HTTPS on day one. The `http://localhost` loopholes are *partial*, asymmetric, and quietly different across browser versions; the bug class they produce — "works locally, breaks on the LAN/preview/teammate" — is exactly the loss this course is trying to prevent. The five-minute setup buys production parity for the life of the project.

**Pedagogical levers.**
- **Mental model first, wiring second.** The TLS handshake diagram and the certificate-chain figure land before the terminal commands. The student should not paste `mkcert -install` without knowing what gets installed and into which trust store.
- **One progressive worked example.** A single `<Steps>` block walks `mkcert -install` → `mkcert <hostnames>` → file placement and `.gitignore` → wiring `next dev --experimental-https` → visit and verify in the browser. Each step has its expected terminal output and a one-sentence "what changed on disk." No detours, no alternate tracks.
- **Defaults before conditionals.** Next.js 16's `next dev --experimental-https` is the 2026 default path; it auto-detects `mkcert` and generates its own certs into `./certificates/`. Mention pointing it at custom `mkcert`-issued files only when team-wide cert sharing actually matters (`--experimental-https-key` / `--experimental-https-cert` / `--experimental-https-ca`).
- **Cognitive load.** Each TLS handshake phase is one paragraph anchored to one swimlane in the diagram. The cert chain is one figure with three boxes (leaf → intermediate → root). The wiring is one `<Steps>` block. No extra ceremony.
- **Real, not theatre.** The "lab" is the student's own browser inspecting the cert their machine just issued. The closing `<Buckets>` exercise confirms the secure-context model transferred.

**Common beginner traps to defuse.**
- Thinking a self-signed cert is "just as good" — the chain validation fails because the signing CA isn't trusted. `mkcert` exists exactly because of this.
- Forgetting `mkcert -install` (the CA install step) and wondering why the cert is "still untrusted" — the issued cert is signed but the signer is unknown to the OS/browser.
- Issuing for `localhost` but visiting `127.0.0.1` (or vice versa). SANs must include every hostname the browser will use.
- Committing `*-key.pem` to Git. Public cert is shareable; private key never is.
- Confusion about `http://localhost` *being* a secure context for most APIs — true and a foot-gun. The course's stance: yes, it is for `crypto.subtle`/`Clipboard`; it is *not* fully for `Secure` cookies, service workers, Push, and the moment the student uses a LAN IP or a `.local` hostname for cross-device testing the loopholes evaporate. Flip to HTTPS once and the question disappears.
- Browser caching the previous untrusted cert; hard-reload or restart the browser after `mkcert -install`.

**Forward links named once each, never elaborated:** the `Secure`/`SameSite`/`HttpOnly` cookie default — chapter 013; `crypto.subtle` for HMAC sign/verify — chapter 016 (lesson 1); `navigator.clipboard.writeText` for the Copy button — chapter 016 (lesson 2); HSTS and the production security baseline — chapter 081; production cert provisioning (auto-renewed by Vercel, developer never touches it) — named in one line in this lesson, not elaborated.

**Out-of-scope, no application code.** This lesson ships a `package.json` script edit and a `.gitignore` line. That is the entirety of the "code." The certs, keys, and `./certificates/` directory the student creates are environment, not source.

**Estimated student time:** 30–40 minutes.

---

## Lesson sections

Open with one introduction paragraph (no h2), then five h2 sections: the secure-context gate (motivation), the TLS 1.3 handshake (mental model), the certificate chain and trust stores (mental model), wiring `mkcert` + Next.js 16 (the worked procedure), and the closing `<Buckets>` exercise. Two thin "pitfalls" and "what's next" wrap-ups close the lesson.

### Introduction (no header)

Two short beats.

1. **The senior question, plainly stated.** Modern browsers gate a growing set of APIs behind the *secure context* condition. The page must be served over HTTPS — or be on `http://localhost` with a small, asymmetric set of carve-outs. Most days `http://localhost` "feels fine," and most days a junior team ships on it for months without trouble. The trouble lands the day someone tests on a LAN IP, opens the preview URL on a phone, sets a `Secure` cookie, or wires a service worker. The senior move is to flip to HTTPS on day one of every project — the setup is five minutes, and the entire class of "works on my machine, breaks in preview" bugs disappears.
2. **What we're doing.** Install `mkcert` (a tool that creates a *machine-trusted* local CA and signs localhost certs with it), wire it into `next dev --experimental-https`, and verify the green padlock in the browser. Along the way, two visuals' worth of TLS mental model so the student knows *why* the cert needs a trusted signer.

End with one directive: "By the end of this lesson, `https://localhost:3000` will load without a warning, and you will know exactly what made the browser stop complaining."

### Why HTTPS on localhost — the secure-context gate

One short paragraph plus one inline `<Term>` definition.

- **The gate.** Define `<Term definition="A browser condition that gates powerful APIs (Clipboard, Web Crypto subtle, Service Workers, Push, geolocation, and more). Met by HTTPS pages, and by special-cased localhost/127.0.0.1 URLs for most — but not all — gated APIs.">secure context</Term>` once. The browser's `window.isSecureContext` returns `true` on HTTPS pages and on `http://localhost`/`http://127.0.0.1`/`http://*.localhost`. The gate exists because these APIs handle data — clipboard contents, cryptographic keys, persistent service workers — that an attacker on a non-secure transport could observe or hijack.
- **The asymmetry that bites.** The `http://localhost` carve-out is *partial* in three ways the student will hit:
  1. **Cookies with `Secure`** — chapter 013 owns this contract; some browsers silently drop `Secure` cookies set over plain HTTP-on-localhost, others accept them. HTTPS removes the divergence. One line, do not elaborate.
  2. **Non-localhost dev URLs** — the moment you serve to a teammate over LAN IP (`192.168.1.42:3000`), or open the preview on your phone using a `.local` mDNS name, the secure-context bypass evaporates. `Clipboard.writeText` will silently throw; `crypto.subtle` is unavailable. The same code that "worked on localhost" breaks on the LAN.
  3. **Service workers and Push** — these always require real HTTPS, even on localhost. Out of scope for this course's stack, named once.
- **The senior reflex.** Flip to HTTPS on day one. The setup is five minutes; the bug class it eliminates is a recurring weekly cost otherwise.

Render the secure-context check itself as one tiny fenced code block so the student knows the boolean exists and can sanity-check from the Console panel:

````md
```js
// In any browser DevTools Console:
window.isSecureContext; // true on HTTPS or on http://localhost
```
````

`title="Console"` and `frame="terminal"` not needed — a bare fence reads as "throwaway snippet."

### The TLS 1.3 handshake, at debug depth

Lesson 1 deferred the handshake to here. Deliver it as one diagram plus three short paragraphs — one per phase.

**Diagram — Mermaid `sequenceDiagram`, wrapped in `<Figure>`.** Actors: `Client`, `Server`. Three swim-labeled exchanges:

1. `Client ->> Server: ClientHello` with a `Note over Client: cipher suites, key share, SNI=example.com, ALPN=[h3, h2, http/1.1]`
2. `Server ->> Client: ServerHello + Certificate + Finished` with a `Note over Server: chosen cipher suite, cert chain, server key share, signature`
3. `Client ->> Server: Finished + (HTTP request)` with a `Note over Client,Server: keys derived, application data flows`

Caption: "TLS 1.3 in one round trip — ClientHello, ServerHello with the certificate chain, Finished. In HTTP/3 over QUIC, this handshake is folded into the transport handshake (see lesson 1)."

Use the `themeCSS` font-size bump from `documentation/diagrams/mermaid.md` if the messages render below ~16px after figure-card scaling: `.messageText, .messageText tspan, .noteText, .noteText tspan { font-size: 18px !important; }`.

**Phase 1 — ClientHello.** The client opens with its supported cipher suites, a fresh random, its key share for the (forward-secure) Diffie–Hellman exchange, and two load-bearing extensions:
- `<Term definition="Server Name Indication — the hostname the client expects to reach, sent in the clear inside the ClientHello so a server hosting multiple sites picks the right certificate.">SNI</Term>` — the hostname, so a server hosting multiple sites picks the right cert.
- `<Term definition="Application-Layer Protocol Negotiation — the client lists the protocols it speaks (h3, h2, http/1.1) and the server picks one in its hello.">ALPN</Term>` — the protocol list (`h3`, `h2`, `http/1.1`), so the server picks the application protocol in its response.

**Phase 2 — ServerHello + Certificate + Finished.** The server picks one cipher suite, returns its own key share, sends the certificate chain (covered in the next section), and signs a transcript hash with the private key matching the leaf cert. The signature is what proves the server is the legitimate owner of the cert — anyone could *send* a cert; only the holder of the private key can sign with it.

**Phase 3 — Client Finished + application data.** With both key shares in hand, both sides derive session keys. The client sends Finished (an authenticated check that no one tampered with the handshake) and immediately follows with the first HTTP request. Total round trips: **1**. (Resumed connections collapse to 0-RTT, as covered in lesson 1.)

One closing one-liner: `<Term definition="Even if the server's long-term private key is leaked years later, recorded sessions cannot be decrypted, because the session keys came from per-connection Diffie–Hellman key shares that were never sent in the clear.">Forward secrecy</Term>` is the property TLS 1.3 always provides for normal traffic; 0-RTT early data is the one exception (named in lesson 1).

### The certificate chain and the trust store

The single most load-bearing concept of the lesson. The student must understand *why* `mkcert` works where a hand-rolled `openssl req -new -x509` doesn't.

- **One paragraph framing.** A certificate is a public key plus metadata (hostnames, validity dates, intended uses) signed by a Certificate Authority (CA). The browser cannot trust a public key just because it arrived in a TLS handshake; it trusts a public key because some authority it already trusts vouches for it. That trust is bootstrapped by a small set of *root CAs* preinstalled in the operating system and browser trust stores.

**Diagram — hand-coded SVG inside `<Figure>`.** Three labeled boxes left-to-right with arrows pointing right-to-left from each box to the one above it:

- Box 1 (left, smallest): **Leaf cert** — `CN=localhost`, valid 1 year, public key.
- Box 2 (middle): **Intermediate CA** — signs the leaf. In production this is "Let's Encrypt R3" or similar; for `mkcert` it's the local CA itself acting as the only intermediary (mkcert's "CA" actually doubles as both root and leaf signer — one box if simplifying).
- Box 3 (right, largest): **Root CA** — the trust anchor. In production this is in the OS/browser trust store from day one. For `mkcert` it's the local CA installed by `mkcert -install`.

Each box carries a one-line label below it. Arrows: "signs" between adjacent boxes; a final arrow from the root box labeled "trusted by OS/browser store."

Caption: "Validating a TLS certificate is walking this chain until you reach a CA already in the trust store. A self-signed cert has no chain — it stops at itself, fails validation, and the browser shows 'your connection is not private.'"

(If the production-vs-mkcert distinction muddies the diagram, simplify to two boxes — Leaf → Root — and add one prose sentence noting "production chains usually have an intermediate CA between leaf and root.")

- **Why self-signed fails.** One short paragraph. A self-signed cert is a leaf whose signer is itself — the chain stops at an unknown authority. The browser rejects it: "your connection is not private." This is correct behavior; if it didn't reject, every coffee-shop network could MITM your traffic with a self-issued `bank.com` cert.
- **What `mkcert` does differently.** It generates a one-machine-only root CA, installs the root into your OS trust store (and Firefox's separate trust store), and then signs your project-local leaf certs with it. The browser walks: leaf → local root → "yes, I trust that" → green padlock. The trust is local to your machine — `mkcert`'s CA is not (and must not be) shared across machines.

Inline `<Aside type="caution">`: "`mkcert`'s root CA is a security boundary on your machine. The local root key can sign certificates for *any* hostname — `google.com`, your bank, anything. Never copy `mkcert`'s root key (`rootCA-key.pem` under `mkcert -CAROOT`) onto a machine you don't fully control, and never check it into a repo. Per-machine, per-developer is the contract."

### Wiring it up — `mkcert` and `next dev --experimental-https`

The worked procedure. One `<Steps>` block, five steps, each with its terminal output block and a "what just happened on disk" sentence.

Lead-in paragraph: "Two phases. First, install `mkcert` and its local CA — once per machine, never again. Second, in any project, run Next.js's HTTPS-flagged dev server — it'll auto-detect `mkcert` and generate the project cert into `./certificates/`."

**`<Steps>`:**

1. **Install `mkcert`.** macOS / Linux / Windows tabs via `<TabbedContent>` (one fence per platform tab), or — if a single-tab approach reads cleaner — just the `brew install mkcert` command and a one-liner pointing Linux/Windows users to the `mkcert` README. **Recommendation:** use `<TabbedContent>` with three tabs (`macOS`, `Linux`, `Windows`) because the platform diversity is real and worth the small structural cost.
   - macOS: `brew install mkcert nss`
   - Linux (apt): `sudo apt install libnss3-tools && curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64" && chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert`
   - Windows: `choco install mkcert` (or `scoop install mkcert`)
   - On-disk note: nothing yet — only the `mkcert` binary on `PATH`.

2. **Install the local CA — once per machine.** Terminal block: `mkcert -install`. Expected output to show in the lesson:

   ```text
   Created a new local CA at "/Users/you/Library/Application Support/mkcert"
   The local CA is now installed in the system trust store! 
   The local CA is now installed in the Firefox trust store (requires browser restart)! 
   ```

   On-disk note: a new root CA key + cert under `mkcert -CAROOT` and a fresh trust entry in the OS keychain (macOS) / system trust store (Linux) / certificate store (Windows). Firefox uses its own trust store and gets a separate install — restart Firefox once after this step.

   Inline `<Aside type="tip">`: "If you ever wonder where the root lives, `mkcert -CAROOT` prints the path. The two files in that directory — `rootCA.pem` and `rootCA-key.pem` — are the machine-wide secret. Treat `rootCA-key.pem` like an SSH private key: never share, never commit."

3. **Issue a leaf cert for the project.** Inside the project root, run `mkcert localhost 127.0.0.1 ::1`. Show expected output:

   ```text
   Created a new certificate valid for the following names 📜
    - "localhost"
    - "127.0.0.1"
    - "::1"

   The certificate is at "./localhost+2.pem" and the key at "./localhost+2-key.pem"
   ```

   On-disk note: two new files in the project root. The public cert (`*.pem`) is shareable across the team; the private key (`*-key.pem`) is per-developer and never committed.

   Use `<Aside type="caution">` to call out the SAN rule: "The hostnames you list here are the only ones the cert will be valid for. If you visit `https://127.0.0.1:3000` after issuing only `localhost`, the browser will fail validation. Always include `localhost 127.0.0.1 ::1` together."

4. **Stash the certs and `.gitignore` the key.** Move both files into a stable directory (e.g. `./certificates/`). The course standardizes on `./certificates/` because that's where Next.js's own auto-generated certs land — keeping one directory for the whole project. Show the renamed-and-relocated state with a `<FileTree>` or a small fenced `text` block:

   ````md
   ```text title="Project root"
   ./
     certificates/
       localhost.pem        # public cert, OK to commit
       localhost-key.pem    # private key, NEVER commit
     .gitignore
     package.json
     next.config.ts
   ```
   ````

   Append the gitignore rule. Use `<div data-mark-color="green">` and `ins=` to make the addition feel like a diff:

   ````md
   ```diff lang="text" title=".gitignore"
   + certificates/*-key.pem
   ```
   ````

   On-disk note: the project will commit the cert (so a teammate using `mkcert -install` once already has a trusted root and can read your cert) but never the key.

5. **Wire it into `package.json` and start the server.** Two `dev` scripts: the default HTTP one (kept, because some workflows are easier without HTTPS) and an opt-in HTTPS one. Show as one fenced `json` block with `ins=` on the new line:

   ````md
   ```json title="package.json" ins={4}
   {
     "scripts": {
       "dev": "next dev",
       "dev:https": "next dev --experimental-https --experimental-https-key ./certificates/localhost-key.pem --experimental-https-cert ./certificates/localhost.pem"
     }
   }
   ```
   ````

   One-sentence "why both": "Pointing Next.js at the `mkcert` files (instead of letting it auto-generate its own) means the cert files live in one known place, are gitignored by one rule, and a teammate who already ran `mkcert -install` can use the committed cert without re-issuing."

   Then run it:

   ````md
   ```bash
   pnpm dev:https
   ```
   ````

   Expected output:

   ```text
   ▲ Next.js 16.x.x (Turbopack)
     - Local:        https://localhost:3000
     - Network:      https://192.168.1.42:3000

    ✓ Ready in 1.2s
   ```

   On-disk note: nothing further; the server is now reading from `./certificates/`.

After the `<Steps>` block, one closing visual: a `<Screenshot viewport="desktop">` of the browser's address bar showing the green padlock on `https://localhost:3000`, wrapped in `<Figure caption="…">`. Caption: "What success looks like — the padlock, no warning interstitial, `Connection is secure → Certificate is valid` in the lock menu. Click the padlock and the cert detail panel shows the chain terminating at your local mkcert CA."

Store the screenshot under `public/screenshots/010/04-padlock.png`. If a real capture isn't available at authoring time, fall back to a hand-coded SVG mock of the address bar (omit `<Screenshot>` and use raw `<svg>` inside `<Figure>` per `documentation/diagrams/svg.md`).

### Pitfalls and verification

A tight bulleted reference list. No `<Steps>` — these are watch-outs, not a procedure.

- **The "still not trusted" loop.** Forgetting `mkcert -install` is the single most common cause. Symptom: the cert is signed, but by a CA the browser doesn't know. Fix: run `mkcert -install`, restart the browser.
- **Cert valid for one hostname, browser uses another.** Issuing only `mkcert localhost` and then visiting `https://127.0.0.1:3000` fails validation — the SAN list doesn't include `127.0.0.1`. Always issue with all three: `mkcert localhost 127.0.0.1 ::1`.
- **Browser stuck on the previous untrusted cert.** Some browsers cache the cert rejection. Hard-reload (Cmd+Shift+R) or quit-and-relaunch the browser after `mkcert -install`.
- **Firefox didn't get the root.** Firefox uses its own trust store, separate from the OS one. `mkcert -install` does install into Firefox automatically — but you must restart Firefox afterwards for it to pick up the new root.
- **Committed the key.** If `*-key.pem` ever lands in Git history, the right move is to (1) `mkcert -uninstall && mkcert -install` to rotate the root, (2) re-issue project certs, (3) purge the leaked key from history. The `.gitignore` rule from step 4 makes step 1 the only one you'll ever need.

Close with a one-line verification: "Open DevTools → Application → Storage and confirm `window.isSecureContext` (in the Console) returns `true`. The Clipboard API, Web Crypto subtle, and `Secure` cookies all light up from this point on."

### Closing exercise — does this run in a secure context?

One `<Buckets>` exercise, three buckets, six items. Confirms the secure-context model transferred. Use `twoCol` for tight stacking.

**Buckets:**

- **Works** — secure-context APIs are fully available.
- **Works (localhost exception)** — the API is gated on a secure context, but the `http://localhost` carve-out covers it.
- **Blocked, needs real HTTPS** — the API will throw, reject, or silently fail.

**Items (six, shuffled by the component):**

1. `https://app.example.com` (production over HTTPS) → `clipboard.writeText('hi')` — **Works**.
2. `http://localhost:3000` → `crypto.randomUUID()` — **Works (localhost exception)** (synchronous Web Crypto primitives are available everywhere; the loophole isn't needed but it qualifies under the exception bucket).
3. `http://localhost:3000` → `crypto.subtle.sign(...)` — **Works (localhost exception)**.
4. `http://192.168.1.42:3000` (LAN IP, plain HTTP, opened on a teammate's phone) → `navigator.clipboard.writeText('hi')` — **Blocked, needs real HTTPS**.
5. `http://localhost:3000` → setting a cookie with `Secure; HttpOnly; SameSite=Lax` — **Blocked, needs real HTTPS** (some browsers silently drop `Secure` cookies on plain HTTP, even on localhost; the senior treats this as broken).
6. `https://localhost:3000` (after the `mkcert` setup just completed) → registering a Service Worker — **Works**.

Instructions string on the `<Buckets>`: "For each URL + API combination, decide whether it runs in a secure context."

Grading is automatic via the component. The exercise's pedagogical role: the student must internalize that the answer depends on *both* the URL scheme/host *and* the API — there is no single "is this secure" question.

### What's next

Two-line wrap. No `LinkCards`.

- "The `Secure` / `HttpOnly` / `SameSite` cookie contract is chapter 013 — once `https://localhost:3000` works, the senior cookie default lines up cleanly. The `crypto.subtle` and `navigator.clipboard` call sites land in chapter 016. Production cert provisioning is auto-handled on Vercel; the developer never touches it after this lesson."
- "The chapter quiz follows. You should leave able to point at any of the four network stages, the six rendering pipeline stages, the four DevTools panels, and the three TLS handshake phases — and know which chapter owns the deeper terrain for each."

No `<ExternalResource>` cards required — `mkcert`'s README is excellent and the curious will find it; if a card-grid is desired at end of lesson, link two: `mkcert` on GitHub, and Next.js's "Using HTTPS during development" docs section. Both optional.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| Secure-context boolean snippet | Bare fenced `js` `Code` block |
| TLS handshake diagram | Mermaid `sequenceDiagram` inside `<Figure>` |
| Certificate chain figure | Hand-coded `<svg>` (3 boxes + arrows) inside `<Figure>` |
| Senior cautions | `<Aside type="caution">` (security boundary on the local CA, SAN rule) |
| Senior tip | `<Aside type="tip">` (`mkcert -CAROOT` path) |
| Installation per platform | `<TabbedContent>` with macOS / Linux / Windows tabs |
| The wiring procedure | `<Steps>` (5 steps, one terminal output block per step) |
| File layout | Fenced `text` block (or `<FileTree>` if it reads cleaner — `text` block is lighter) |
| `.gitignore` and `package.json` deltas | Fenced `diff` blocks with `ins=` highlighting |
| Browser-padlock confirmation | `<Screenshot viewport="desktop">` inside `<Figure caption="…">` (preferred); SVG mock fallback |
| Closing recall drill | `<Buckets twoCol>` |
| (Optional) external links wrap | `<CardGrid>` of two `<ExternalResource>` — only if it adds clear value |

No live-coding component, no sandbox callout. The lesson's "sandbox" is the student's own terminal and browser; pre-built exercises would be theatre against a real-machine wiring task.

## Term tooltips to author

Strategic, lesson-bearing only.

- `secure context` — gate definition (Clipboard / WebCrypto subtle / SW / Push; HTTPS + localhost carve-outs).
- `SNI` — Server Name Indication, hostname-in-the-clear inside ClientHello.
- `ALPN` — Application-Layer Protocol Negotiation, the `h3`/`h2`/`http/1.1` list.
- `Forward secrecy` — recorded sessions can't be decrypted even if the long-term key leaks later.
- (Optional, if it reads naturally) `Certificate Authority` — entity that signs certs; root CAs are preinstalled in OS/browser trust stores.

`SNI`, `ALPN`, and forward secrecy were named once in lesson 1 (as the deferred terrain). They land at full depth here for the first time — define them with tooltips on first appearance in this lesson.

---

## Scope

### What this lesson covers

- The secure-context gate, why it exists, and the partial / asymmetric `http://localhost` carve-out.
- TLS 1.3 handshake at debug depth: ClientHello → ServerHello + Certificate → Finished, with SNI, ALPN, the cert chain, the server signature, and forward secrecy.
- The certificate chain (leaf → intermediate → root) and the OS/browser trust store as the trust anchor.
- Why self-signed certs fail and what `mkcert` does differently.
- Installing `mkcert` per platform; `mkcert -install` and the local root CA; issuing project leaf certs with `mkcert localhost 127.0.0.1 ::1`.
- Wiring `next dev --experimental-https` with `--experimental-https-key` and `--experimental-https-cert` pointing at the `mkcert`-issued files; the per-project `./certificates/` convention; gitignoring `*-key.pem`.
- Common pitfalls (forgotten `-install`, missing SAN, cached rejection, Firefox separate trust store, leaked key recovery).
- Reading `window.isSecureContext` and verifying the green padlock.

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **The cookie `Secure` / `HttpOnly` / `SameSite` contract** — chapter 013. Mentioned in one line as a forward link; do not enumerate cookie attributes here.
- **`crypto.subtle` sign/verify/key-derivation usage** — chapter 016 lesson 1. Mentioned as a secure-context-gated API; no code sample.
- **`navigator.clipboard.writeText` and the Copy button pattern** — chapter 016 lesson 2. Same: named, not coded.
- **The HTTP method/status/header contract** — chapter 011. Do not detail GET/POST/status families.
- **Origins, CORS, same-origin policy** — chapter 012.
- **HSTS, certificate transparency, OCSP stapling, mTLS** — chapter 081 (security baseline). HSTS in one line if mentioned at all; otherwise skip.
- **Production cert provisioning (Vercel, Let's Encrypt, auto-renewal)** — one line as "Vercel handles it; the developer never touches production certs after deploy." No detail.
- **Service worker authoring and Push API** — out of scope across the course; named once as the third partial-localhost loophole, nothing more.
- **Cipher suite enumeration, key-exchange algorithm details, ChaCha20-Poly1305 vs. AES-GCM choices** — explicitly out of scope. The course's TLS depth stops at "cipher suite is one of the things ClientHello carries."
- **The four network stages and 0-RTT replay-safety** — lesson 1 of this chapter. Referenced in one line ("the QUIC fold and 0-RTT story is lesson 1's terrain"), not re-taught.
- **The browser rendering pipeline, DevTools panels** — lessons 2 and 3. Not touched.
- **AI-related framing** — do not name AI; this is a wiring lesson.

### Prerequisites the student already has (do not re-teach)

The student arrives from lessons 1–3 of this chapter with:

- The four network stages and the 2026 default of HTTP/3 over QUIC + TLS 1.3.
- The browser rendering pipeline.
- Comfort opening DevTools, switching panels, reading the Network panel.
- Working terminal access on their dev machine, package manager installed (`brew` on macOS, `apt` on Linux, `choco`/`scoop` on Windows; the course standardizes on `pnpm` for Node deps).
- A scaffolded Next.js 16 project from earlier setup chapters — the lesson assumes the existence of a `package.json` to edit, not a fresh `create-next-app`. Single-line reminder if needed; do not detour into project setup.

Do not re-define "HTTPS," "TLS," "certificate," "private key," or "trust store" beyond the inline tooltips this lesson provides. One-line refreshers are fine in service of flow; no preamble.

---

## Notes for the writer agent

- **Two-thirds wiring, one-third concept.** The TLS handshake and cert chain sections set up the wiring — keep them tight (one figure + 2-3 short paragraphs each). The student should reach the `<Steps>` block at roughly the halfway mark of the lesson.
- **`./certificates/` is the chosen convention.** Next.js auto-generation also lands in `./certificates/`, so reusing the directory for `mkcert`-issued files keeps one mental model. The lesson commits to *pointing at `mkcert`-issued files* (step 5) rather than letting Next.js auto-generate, because (a) the team-share story is cleaner — a checked-in public cert plus one-time `mkcert -install` per teammate — and (b) it forces the student to learn the `mkcert` command surface they'll need on any non-Next.js project.
- **Per-platform install via `<TabbedContent>`.** Three tabs, one fenced terminal command each. Don't overthink — the README is the source of truth for any platform edge case; the lesson teaches the happy path.
- **Numerical claims to verify.** `mkcert` is the FiloSottile tool, GitHub `FiloSottile/mkcert`. Next.js 16's flag is still `--experimental-https` (with `--experimental-https-key`, `--experimental-https-cert`, `--experimental-https-ca`) — confirmed in the 16.2.6 CLI reference. Default auto-generated certs land in `./certificates/`. The course's screenshots, tone, and step output should match these literally.
- **The student's terminal is the lab.** Don't simulate the install in a sandbox; the lesson explicitly directs them to run the commands on their machine. The lab is real or it doesn't land.
- **Diagrams stay small.** The TLS handshake is *three* messages, not six — keep the Mermaid diagram tight. The cert chain is *three* boxes, not seven. If the figure looks busy, simplify before paddings or `themeCSS`.
- **The "production parity" frame is the why.** Every time the lesson is tempted to add depth on TLS internals, return to the senior framing: the student is wiring this so the bug class "works locally, breaks elsewhere" disappears. Depth that doesn't serve that framing is the wrong depth here.
- **Code conventions:** the only "code" shipped is the `package.json` script line and a `.gitignore` line. Both are environment-shape, not source-shape. Single quotes, 2-space indent, `pnpm` as the package manager in command examples — match `Code conventions.md` §Formatting and §Supply chain and tooling defaults.
- **One progressive worked example, no detours.** The lesson commits to the `mkcert` + `--experimental-https-key/-cert` path. If a sidebar wants to mention "you can also just run `next dev --experimental-https` with no flags and Next.js will invoke `mkcert` for you," fold it into a one-sentence `<Aside type="tip">` next to step 5 — *do not* make it a parallel track in the `<Steps>` block.
