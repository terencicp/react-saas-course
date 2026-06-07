# OAuth 2.1, PKCE, and the code-for-tokens exchange

Sidebar label: OAuth 2.1 and PKCE

## Lesson framing

**Type.** Concept-archetype, the densest of the three in this chapter. No real library API is taught — the deliverable is a mental model the student can draw from memory, so that Better Auth's `socialProviders` config (Ch 053 L8) reads as obvious rather than magic. Code samples are illustrative URL/JSON sketches, never runnable Better Auth/Next calls. Mark them as such, the same discipline L1 and L2 used.

**The one senior question that frames the whole lesson** (state it implicitly in the intro, never as a heading): *Sign in with Google — under the button, what actually happens between the app, the browser, and Google, and why does it need all those query params?* Everything else is the answer unfolding.

**The single hardest pivot for a first-timer**, and the lesson's central job: OAuth is an *authorization-delegation* protocol that this app *repurposes for authentication* by reading the provider's identity claims after the exchange. Beginners assume "OAuth = login." The senior framing: OAuth hands you *tokens* (authz — "this app may act on the user's behalf"); OIDC, layered on top via the `openid` scope, hands you *identity* (authn — "the provider asserts this is `ada@acme.com`"). The student leaves saying "OAuth login" while *knowing* it's "OIDC over OAuth." This connects straight back to L1's authn/authz dictionary — name that link explicitly.

**The spine.** A single eight-step authorization-code-with-PKCE flow carries the lesson. Introduce it once as a low-detail skeleton (the three parties + the redirect-then-callback-then-exchange shape), then walk it step-by-step in a scrubbable sequence diagram, then layer the three hardening concerns (PKCE, `state`, redirect-URI exact match) onto steps the student has already seen. This is the cognitive-load discipline from the guidelines: simplified model first, complexity added in named layers, never all at once.

**The payoff to keep returning to.** Every concept must answer "what does this let me read in a provider's OAuth dashboard / a library's config?" The student is not implementing this — they are learning to *configure it correctly and recognize when it's wrong*. The redirect-URI exact-match rule, the scope list, the client secret, the callback path — these are the things they will actually type into Google Cloud Console and a config object. Tie each abstract rule to that concrete surface.

**Mental model the student ends with.** Three parties (app, browser, provider). The browser is a courier that carries a one-time `code` from provider to app via a redirect; the app trades that `code` (plus a secret it never sent over the front channel) for tokens on a direct back-channel call; the app reads identity from the tokens and then mints *its own* session (the L2 cookie) — the provider's tokens are *input*, not the app's session. PKCE proves the app that started the flow is the one finishing it; `state` proves the callback answers a request this user actually made; exact-match redirect URIs keep the `code` from being delivered anywhere but the registered app.

**Front-channel vs back-channel is the load-bearing distinction** that makes every hardening make sense — introduce this framing early (it is the *why* behind PKCE, `state`, and not putting the secret in the redirect) and reuse the two terms throughout. The browser/redirect path is the front channel (visible in history, logs, referrers, extensions — untrusted); the app↔provider server call is the back channel (TLS, no browser — trusted).

**Threads inherited from the chapter that must stay consistent:** PKCE is mandatory in 2026 for *all* clients, public and confidential, per OAuth 2.1 — never frame it as "for SPAs/mobile." The OAuth tokens are not the session (L2 owns sessions; this lesson hands off to it). Enumeration discipline and open-redirect closure (`safeNext`) are course conventions that surface here. Better Auth named once as "what implements this," zero API.

**Scope guard for the writer.** This is a *model* lesson. Resist drifting into Better Auth config, the `account` table schema, account-linking, or the callback route file — all are explicitly downstream (see Scope). When tempted to show "how you'd wire this," stop at the conceptual sketch.

---

## Lesson sections

### Introduction (no heading or short intro before first h2)

Open with the concrete scene: a "Sign in with Google" button, one click, the page bounces to Google, the user picks an account, bounces back, and they're logged in — address bar flashing `?code=...&state=...` on the way. Pose the senior question implicitly: that two-second bounce is a precisely choreographed protocol with real security stakes, and a senior has to be able to describe it because they will configure it, debug its redirect URIs, and choose its scopes. Connect to prior knowledge in one line each: L1 gave us authn vs authz; L2 gave us the session cookie this flow ultimately produces; this lesson is the bridge — how a third party's word becomes our proven identity. Preview the payoff: by the end you can draw the flow and read any provider's OAuth setup without confusion.

Keep it warm and brief, per guidelines. Do not enumerate the eight steps here — that is the body's job.

### OAuth is authorization; login is a thing we build on top of it

The conceptual pivot, first thing, because every later misread traces back to it.

- **Decode the name.** OAuth = *Open Authorization*. Its actual job: let a third-party app act on a resource owner's behalf at a resource server, with the user's consent, *without the app ever seeing the user's password*. The canonical non-login example to ground it (one sentence): "let this photo-printing site read your Google Photos" — that is delegation, and that is what OAuth was built for.
- **The repurposing.** "Sign in with Google" hijacks that delegation machinery for authentication: instead of reading your photos, the app reads your *identity* (`email`, `name`) and treats "Google vouches for this email" as proof of who you are. OAuth itself only ever proves *authorization*; the authentication layer is **OpenID Connect (OIDC)**, an extension that standardizes an identity token (`id_token`) and a `userinfo` endpoint. Opt in with the `openid` scope.
- **The senior's two-level vocabulary.** They say "OAuth login" in conversation; they *know* it's "OIDC over OAuth" underneath. State the rule of thumb: **OAuth gives you tokens (can-act); OIDC tells you who the user is (identity).** Tie back to L1 explicitly — this is the authn/authz split showing up at the protocol layer.

Pedagogy: this is pure framing, prose-led. One small visual earns its place — see the front/back-channel callout below, which can live here or open the next section. Use a `Term` for **OIDC** and **resource owner** on first use.

Suggested `Term` tooltips in this section: `OIDC` ("OpenID Connect — an authentication layer standardized on top of OAuth 2.0; adds the id_token and userinfo endpoint."), `resource owner` ("The human user who owns the data and grants the app access — in a login flow, the person signing in.").

### The four roles and the two channels

Two small framings that make the diagram legible before it appears. Keep tight.

- **The four roles, named once.** *Resource owner* = the human. *Client* = our app (the thing requesting access). *Authorization server* = the provider's identity endpoint (Google's `accounts.google.com`). *Resource server* = the API a token unlocks (for pure login, the only "resource" read is the user's own `userinfo`). Stress that one company (Google) plays both server roles — the names exist so the spec can be unambiguous, not because they're four separate machines. A compact mapping (Google in each role) makes this concrete.
- **Front channel vs back channel — the distinction the rest of the lesson leans on.** *Front channel* = anything that travels through the browser via redirects and URLs: visible in history, server access logs, the `Referer` header, and to any browser extension. Untrusted by default. *Back channel* = the direct server-to-server HTTPS call from app to provider: no browser in the middle, TLS-protected, where secrets are safe. The single most useful sentence in the lesson: **the `code` travels the front channel (so it must be useless on its own); the secret and the token exchange travel the back channel (so they can be trusted).** This is the *why* behind PKCE, behind not using the implicit grant, behind never logging the `code`.

Diagram (small, here): a two-lane illustration — top lane "Front channel (browser, redirects)" carrying the authorization request and the callback-with-`code`; bottom lane "Back channel (server-to-server, TLS)" carrying the token exchange. Goal: anchor the channel vocabulary spatially so that when the sequence diagram shows the same arrows, the student already has the trust model. Build with **plain HTML + CSS** inside a `<Figure>` (two labeled horizontal lanes with a few chips), or `ArrowDiagram` if arrows between app/browser/provider boxes read cleaner. This is a "simple visual aid," exactly the kind the diagram guidance says earns its weight. Cap height tightly.

Suggested `Term`: `authorization server` ("The provider endpoint that authenticates the user and issues the code and tokens — e.g. Google's accounts.google.com."), `back channel` ("A direct server-to-server HTTPS request, with no browser in the middle — safe to carry secrets, unlike browser redirects.").

### The authorization-code flow with PKCE, end to end

The heart of the lesson. The student must be able to reconstruct this. Two-pass structure to manage load.

**Pass 1 — the skeleton (prose + one tiny figure).** Before any detail, give the three-beat shape: (1) app sends the browser to the provider with a request; (2) provider authenticates the user and redirects the browser back to the app with a one-time `code`; (3) app trades the `code` on the back channel for tokens, reads identity, and starts its own session. Three sentences. This is the simplified model the guidelines ask for — everything after is detail hung on these three beats.

**Pass 2 — the eight steps (scrubbable sequence diagram, load-bearing).** The chapter outline calls a Mermaid sequence diagram load-bearing; honor that, but make it *scrubbable* so each step lands one at a time and cognitive load stays bounded. Use **`DiagramSequence`**, with each `DiagramStep` containing a **Mermaid `sequenceDiagram`** wrapped in `<Figure>` that highlights/reveals the current message (or builds up cumulatively). Actors: `App`, `Browser`, `Google` (rename "Provider" to a concrete provider for grounding). Per-step caption carries the prose. Apply the `themeCSS` font-size bump from the Mermaid doc so messages stay legible after the SVG scales to the figure card.

The eight steps (each its own `DiagramStep`, caption = the explanation):

1. **App prepares the request.** Generate a high-entropy `code_verifier` (random 43–128 chars from the unreserved set). Derive `code_challenge = BASE64URL(SHA256(code_verifier))`. Generate a random `state` and stash it server-side (pre-auth). (OIDC also adds a `nonce` for id_token binding — name in one clause, don't expand.) Stress: the verifier *never* leaves the app yet; only its hash (the challenge) goes out.
2. **App redirects the browser to the authorization server.** Show the URL with its params: `response_type=code`, `client_id`, `redirect_uri`, `scope=openid email profile`, `state`, `code_challenge`, `code_challenge_method=S256`. Note this is a full-page browser navigation (front channel).
3. **User authenticates and consents at the provider.** Google shows the account picker + consent screen listing the requested scopes; user approves. (Hook for the scopes section: what they see here is exactly the scope list.)
4. **Provider redirects back to `redirect_uri`** with `?code=...&state=...`. The `code` is one-time and short-lived (~tens of seconds). Front channel again — hence the protections in the next sections.
5. **App verifies `state`** against the stored value; reject on mismatch. (Forward-ref the CSRF reasoning to its own subsection so the diagram step stays short.)
6. **App exchanges the code on the back channel.** `POST` to the token endpoint with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`, and `code_verifier`. The provider re-derives `SHA256(code_verifier)` and checks it equals the original `code_challenge` — the PKCE loop closes here. This is the first time the secret and the verifier travel, and they travel back-channel.
7. **Provider returns tokens.** `{ access_token, refresh_token?, id_token?, expires_in, token_type: 'Bearer', scope }`. For login, the app reads the `id_token` (a JWT with `sub`, `email`, `email_verified`, `name`, `picture`) or calls `userinfo` with the access token. The `id_token` must be verified before it's trusted (forward-ref to the tokens section).
8. **App provisions/links the local user and mints its own session.** Look up by `(provider, providerAccountId)`; sign in if found, else create the user + provider link. Then issue the app's *own* session cookie (the L2 `__Host-` session). Hammer the punchline: **the OAuth tokens are not the session** — they were the proof-of-identity input; the session is the cookie from L2. For pure login the access/refresh tokens can be discarded after `userinfo`.

After the diagram, a short consolidation paragraph restating the three-beat skeleton with the hardening now visible, so the student can mentally compress the eight steps back to three.

Code handling: for steps 2, 6, 7 the URL/POST-body/JSON shapes are worth showing as small `Code` blocks (lang `http` or `json`) *inside the relevant step captions* or immediately after the diagram. Keep them illustrative — fabricated example values, clearly not a Better Auth call. If one shape (the authorization URL) deserves param-by-param attention, an `AnnotatedCode` walkthrough of that single URL string is the right tool (steps: client_id, redirect_uri, scope, state, code_challenge, code_challenge_method); otherwise a plain annotated `Code` block suffices. Prefer the lighter option — the diagram is already carrying the sequence.

**Exercise (placed right after the diagram):** a `Sequence` ordering drill — shuffle the eight steps, student drags them into order. This directly serves the "draw it from memory" goal and is the single best fit. Keep step labels terse (one line each, matching the diagram). This is the primary comprehension check of the lesson.

### PKCE — proof you started the flow you're finishing

Now zoom into the mechanism the diagram referenced, with the threat model. Three-part structure: mechanism, threat it closes, why 2.1 makes it universal.

- **Mechanism (restate compactly, now that steps 1 and 6 are seen).** Verifier stays in the app; only the challenge (its SHA-256 hash) goes out on the front channel; at exchange time the app presents the verifier on the back channel and the provider checks the hash matches. Only the party holding the original verifier can redeem the code. One-way hash is the crux — name *why* SHA-256: the challenge leaks nothing about the verifier.
- **The threat: authorization-code interception.** An attacker who captures the `code` in transit — malicious browser extension, a logging proxy, a leaked server log, a crafted redirect — still cannot exchange it, because they lack the verifier. Without PKCE, a stolen front-channel `code` is enough; with PKCE it's inert. This is the concrete payoff of the front/back-channel framing.
- **Why OAuth 2.1 makes PKCE mandatory for every client.** The killer misconception to dismantle: "we're a confidential client with a `client_secret`, so we don't need PKCE." OAuth 2.0 treated PKCE as a public-client (SPA/mobile) concern. 2.1 requires it everywhere because the secret-alone model fails in practice — shared secrets across deploys, code injection variants, replay against staging. The senior reflex, stated plainly: **PKCE on every flow, regardless of client type; every 2026 library defaults it on.** This is the chapter's load-bearing 2026 thread — do not hedge it.

Visual: a tiny "lock" framing diagram is optional and probably not worth it — the sequence diagram already showed the verifier/challenge split. Prefer prose here. A single `Term` for **PKCE** ("Proof Key for Code Exchange — pronounced 'pixy'; binds the start and finish of an OAuth flow so a stolen authorization code can't be redeemed.") and **code verifier**.

**Optional micro-exercise:** a `TrueFalse` round of 3–4 statements targeting the exact misconceptions ("A confidential server-side app doesn't need PKCE — false"; "The code verifier is sent in the redirect to the provider — false"; "PKCE protects against a stolen authorization code — true"). Cheap, high-yield for the misconception. Include only if it doesn't crowd the lesson; the PKCE misconception is important enough to justify it.

### The `state` parameter — proving the callback answers your request

Short, focused subsection. The diagram's step 5 expanded.

- **Why the callback is dangerous by default.** Structurally, the provider's redirect to `/callback?code=...` is a cross-site request the browser makes; the app can't tell, from the request alone, whether *this user* started *this* flow.
- **The attack (CSRF / login-CSRF).** Without `state`, an attacker initiates an OAuth flow with *their* Google account, captures the resulting `code`, and tricks a victim's logged-in browser into hitting the app's callback with the attacker's `code`. The app links the attacker's Google identity onto the victim's account — now the attacker can sign into the victim's account via Google. Frame it concretely; this is the non-obvious one.
- **The fix.** App generates a random `state`, stores it server-side (or in a short-lived signed cookie) bound to this flow, sends it in the authorization request, and rejects any callback whose `state` doesn't match. `state` is mandatory; a library that omits it is broken. Tie to L2's CSRF/`SameSite` seed in one clause — `state` is the OAuth-specific CSRF defense, distinct from same-site cookies.

Pedagogy: prose-led, one clear attack narrative. The `Sequence`/diagram already showed where `state` rides; here it's the *why*. A `Term` for `state` is optional since it's explained in place.

### Redirect URIs, scopes, and the secret — what you'll actually configure

This is the "read the dashboard / read the config" section — the most directly actionable, deliberately grouped because these are the three things the student will type into a provider console and a config object. Keep it practical and senior-reflex-flavored.

- **Redirect URI: exact-match, no wildcards (OAuth 2.1).** The provider compares the `redirect_uri` against the registered list by *exact string*. Implications, each as a concrete reflex:
  - Register every environment explicitly — `https://app.example.com/api/auth/callback/google`, the staging equivalent, and `http://localhost:3000/...` for dev. Three rows in the console, not one wildcard.
  - Trailing slash, path, scheme all matter — a slash in one env and not another silently breaks that env. Call this out as a top real-world failure mode (it bites everyone once).
  - **Open-redirect / `?next=` discipline.** Never reflect untrusted input into the post-sign-in destination. Allowlist post-login paths. Name the course convention by its real name: the `safeNext(url)` helper (`lib/redirects.ts`) is the project's open-redirect closure for every `?next=` — the student will meet it in the auth code later; here they learn *why* it exists. This grounds an abstract rule in a concrete artifact.
- **Scopes: least privilege, because the user sees them.** For login, request exactly `openid email profile`. The senior reflex: the consent screen *is* the user's trust judgment, and it shows precisely what you ask for — asking for `drive` on a login flow scares users and triggers provider security review for sensitive scopes. If a later feature needs more, run a *separate* consent at that feature's entry point. Connect back to step 3 (what the user saw).
- **The client secret: a back-channel credential, per-environment.** It authenticates the app to the provider at token exchange (step 6) and never touches the browser. Two reflexes: distinct secret per environment (a staging leak must not expose prod); treat the `code` and `id_token` as secrets in logs (redact, same discipline as passwords). Connects the secret to the back channel established earlier.

Pedagogy: this section maps abstractions to the actual config surface — the lesson's stated payoff. Consider a small **`Buckets`** exercise here OR at the tokens section (decide one home for a classification drill to avoid exercise fatigue): sort scope strings into "fine for a login flow" vs "needs a separate consent flow later" (`openid`/`email`/`profile` vs `drive`/`gmail.readonly`/`calendar`). Reinforces least-privilege viscerally. Keep it optional if the section is already dense.

`Term` candidates: `redirect URI` ("The exact URL the provider sends the browser back to after sign-in; must be pre-registered and matched character-for-character."), `scope` ("A string naming one slice of access the app requests; shown to the user on the consent screen.").

### Access, refresh, and ID tokens — three jobs, one response

The token taxonomy, kept tight. The student saw all three arrive in step 7; now disambiguate by *purpose*, which is where beginners conflate them.

- **Access token** — a bearer credential for calling the resource server's APIs. Short-lived (minutes to ~1h). Treat as opaque (it may be a JWT or not — the client shouldn't care). For pure login, used once to read `userinfo`, then often discarded.
- **Refresh token** — long-lived, server-side only, used to mint new access tokens without re-prompting. Never touches the browser in this stack. For pure login, frequently *not stored at all* — you only keep it if the app calls provider APIs on a schedule later. State that plainly so students don't over-engineer token storage.
- **ID token (OIDC)** — a signed JWT carrying identity claims (`sub`, `email`, `email_verified`, `aud`, `iss`, `iat`, `exp`). **Must be verified before trust:** signature against the provider's **JWKS** endpoint, plus `aud` (is this token for *us*?), `iss` (did *the right provider* issue it?), and `exp` (not expired?). This is the step beginners skip — "the JWT says `email`, so I trust it." Connect back to L2: signed ≠ encrypted, the payload is readable by anyone, so *verification*, not *reading*, is what makes it trustworthy. Better Auth does this verification for you; the point is recognizing the step exists and why.
- **Tokens are not the session, again.** One-line callback to step 8 / L2: identity from the verified id_token → mint the app's own cookie session. Close the loop the whole lesson has been building.

Pedagogy: a compact **comparison table** (token / lifetime / lives where / purpose / kept for login?) is the right tool — three rows, scannable, mirrors L2's session-vs-JWT table style. This is the clearest way to hold three similar things apart. Put the JWKS-verification emphasis in prose below the table (it's a process, not a table cell).

`Term` candidates: `JWKS` ("JSON Web Key Set — the provider's published public keys, used to verify an id_token's signature without contacting the provider per request."), `access token` / `refresh token` / `id token` if not already clear from the table (prefer the table to carry these — avoid over-tooltipping).

### Where this lives in your stack, and the provider quirks

Short closing orientation — explicitly the "you won't hand-write this" beat, so the student knows what they're responsible for vs what the library owns.

- **Better Auth handles the whole flow; you read the config.** Named exactly once: when the student later writes `google: { clientId, clientSecret, scope: ['openid','email','profile'] }`, they now understand what each value *means*, why the registered redirect URI must match the callback path exactly, why the consent screen shows what it shows, and what arrives at the callback (a `code` + `state`, exchanged for tokens, mapped to a local user, then a session). The mental model survives any framework; the config call is downstream (Ch 053). No Better Auth API beyond this illustrative shape.
- **Providers differ at the surface, not the core.** Name the quirks in one line each, deferring detail to Ch 053 L8: Google needs the consent screen configured (publishing status; review for sensitive non-OIDC scopes); GitHub returns the primary email only with `user:email` and may have it private (extra API call); Apple uses `form_post` and returns email only on first sign-in; Microsoft splits personal vs org accounts via `tenant`. The senior expectation: *every provider has quirks; the underlying flow is the one you just learned; read the provider's docs for its surface.*
- **Enumeration discipline carries here too** (one clause, course convention): the OAuth callback's error responses stay opaque, same as password sign-in — don't leak whether an account existed.

Pedagogy: prose-led, brief. This is the "the model is the durable skill, the framework call is not" message from the guidelines. Optionally a `TabbedContent` listing the four provider quirks as tabs if it reads cleaner than a bullet list — but a tight list is fine and lighter.

### Recap / closing (brief, optional heading)

One short paragraph compressing the model to its spine for retention: three parties, front vs back channel, `code` on the front (so PKCE + `state` protect it) traded for tokens on the back, verified id_token → identity → your own session. Reassert the two load-bearing 2026 facts: PKCE is mandatory for all clients; the OAuth tokens are not your session. Optional `ExternalResource` LinkCards: the OAuth 2.1 draft (datatracker), the OAuth 2.0 Simplified / oauth.net "Authorization Code + PKCE" explainer, and Google's "OpenID Connect" doc as the canonical provider reference. Keep to 2–3 cards.

**Optional video:** if the resourcer finds a current, accurate 5–10 min explainer of the authorization-code-with-PKCE flow (e.g. a reputable channel covering OAuth 2.1 / PKCE visually), a `VideoCallout` near the end of the flow section supports visual learners. Not required — the scrubbable diagram is the primary visual. Only include if the video matches 2.1 (PKCE-everywhere, no implicit grant); reject pre-2.1 material that frames PKCE as mobile-only.

---

## Scope

**Prerequisites — redefine in one clause each, do not re-teach:**
- authn vs authz, 401 vs 403, the "principal" (L1) — assume known; reference when making the OAuth=authz / OIDC=authn point.
- The session cookie: `__Host-` opaque session ID, server-stored, the carrier of proven identity; "signed ≠ encrypted" for JWTs; the JWT claim shape (`sub`/`iat`/`exp`) (L2) — assume known; reuse, don't re-explain. The OAuth flow *ends* by producing this session.
- Cookies, `SameSite` (Ch 013), CSRF seed (L2) — reference in the `state` section, don't re-derive.
- Web Crypto / hashing / CSPRNG / constant-time compare (Ch 016 L1) — reference for verifier entropy and SHA-256 challenge; don't re-teach the primitives.

**Out of scope — do not teach (belongs elsewhere):**
- Better Auth's `socialProviders` config, the callback route file `app/api/auth/callback/[provider]`, any real `auth.api.*` call (Ch 053 L8 / Ch 052). Name Better Auth once, illustratively, no more.
- The `account` table / Drizzle schema that stores provider identities (Ch 052 L1).
- Account linking — multiple providers on one user, the `(provider, providerAccountId)` uniqueness mechanics (Ch 053 L9). Step 8 may *mention* the lookup conceptually; do not build it.
- Hand-implementing the flow without a library — out of scope by course thesis; the model exists so the library config is legible, not so the student writes the handshake.
- Service-to-service / client-credentials and device-code grants — name once in the grant taxonomy as "alive but not for this web SaaS login," no detail.
- Token revocation endpoints, full OIDC RP-initiated logout, enterprise SSO/SAML — name once as the senior reach, defer.
- Sign-in methods generally (passwords, passkeys, TOTP, magic links) — Ch 053. This lesson is OAuth/social only.
- Rate limiting / brute-force on auth endpoints (Ch 074) — out of scope; `safeLimit` not introduced here.

**Grant taxonomy note:** include a *brief* "what's alive in 2026" list — authorization-code+PKCE (the focus), client-credentials (service-to-service, named), refresh (paired, named at the tokens section), device-code (out of scope, named) — and note 2.1 *removed* the implicit grant and ROPC, with one line on why each removal closed a real hole (implicit leaked the token in the URL fragment; ROPC required handing the password to the third party). This belongs woven into the 2.1-hardenings discussion (can sit in the PKCE section or a short paragraph after the four-roles section), not as its own heavy section.

---

## Notes for downstream agents

- All code is illustrative (URL strings, POST bodies, JSON responses with fabricated values). Mark not-real-API, matching L1/L2 discipline. No Better Auth/Drizzle/Next call appears anywhere — do not "upgrade" sketches to real calls.
- Diagram budget: the scrubbable eight-step `DiagramSequence` (Mermaid sequence per step) is load-bearing and non-negotiable. The front/back-channel two-lane figure is the second visual. Everything else is prose + at most one comparison table (tokens). Do not over-diagram a concept lesson.
- Exercise budget: one primary (`Sequence`, the eight-step order). At most one secondary (the PKCE `TrueFalse` *or* the scopes `Buckets`), chosen to not fatigue. Project chapters do the heavy assessment; this is a concept lesson with a final-chapter quiz (L4) downstream — don't quiz-stuff.
- Keep PKCE-mandatory-for-all-clients and tokens-are-not-the-session as the two sentences the student must not miss. Repeat each at least at first teaching and in the recap.
- Estimated student time: 45–55 min (chapter outline). Densest of the three; the two-pass flow structure is what keeps it tractable — preserve it.
