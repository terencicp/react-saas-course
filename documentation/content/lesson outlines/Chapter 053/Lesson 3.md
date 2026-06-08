# Email verification

- Title: `Email verification`
- Sidebar label: `Email verification`

> Committed slug must stay `/053-authentication-flows/3-verifying-email/` — L1 and L2 already link to it by that path. Do not rename.

---

## Lesson framing

This is the lesson that **closes the loop L1 opened**. L1 stopped the instant the verification email was *queued* ("check your inbox", no session); L2 returns `'email-not-verified'` and stops. L3 fills the gap between them: it makes the email actually send, mints and stores the token, builds the click-through endpoint that flips `emailVerified`, and (optionally) issues the session so the user lands signed in. By the end the student has a complete sign-up → verify → in-the-app circuit.

**Lesson type:** setup + pattern hybrid, not heavy mechanics. There is little new *imperative* code the student writes — the heavy lifting is one config callback, one React Email template, and a catch-all route Better Auth already serves. The teaching weight is in the **mental model** (where the token lives, why it's hashed, why the link is one-time and short-lived) and the **enumeration discipline carried to a new surface** (the verify endpoint itself). Frame every section around the senior question, per pedagogical guidelines.

**The spine metaphor:** the verification link is a **short-lived, single-use, hashed-at-rest bearer token** delivered out-of-band (the inbox is the side channel that proves email control). Three properties hang off that one sentence — expiry, one-time use, hashed storage — and each has a concrete failure mode. Teach the property, then the failure it prevents.

**Cognitive-load order** (mirrors L1/L2 — model before wiring):
1. Wire the send callback (the seam L1 named, now filled).
2. The token: what's in the `verification` row, why hashed, expiry policy.
3. The verify endpoint: the link shape, what the catch-all does on click, the redirect.
4. The React Email template (one job, one button).
5. Re-send semantics (two paths: explicit button + `sendOnSignIn`), token rotation, rate-limit named.
6. Enumeration discipline at the verify surface (the new entry point this lesson adds to the chapter's running thread).
7. The downstream gate — what flipping `emailVerified` unlocks — and the end-to-end sequence diagram.

**Continuity anchors (from committed L1/L2 — reuse, do not re-derive):**
- The `auth` instance lives in `lib/auth.ts`; this lesson adds an `emailVerification` block as a **sibling of `emailAndPassword`**, same as L1 added `emailAndPassword`. Show it as an *addition*, not a new file.
- `sendEmail` is the Unit 7 Resend wrapper (`lib/email.ts`), assumed built. The callback *calls* it; the pipeline (DKIM, suppression, from-address) is NOT re-taught.
- The `verification` table (`identifier`, `value`, `expiresAt`) was generated in Ch 052 L2. This lesson is its first real consumer — L1 *wrote* the row, L3 *reads and deletes* it.
- Color palette inherited from L1/L2: **blue** = parse/config, **orange** = library call/endpoint work, **violet** = the hinge/continuation, **green** = success/session/flag-flip, **red** = insecure variant.
- `Term`, `CourseProgressBar`, `ExternalResource`, `CardGrid` import lines and the frontmatter shape copy L1 exactly.
- Enumeration is the chapter's running thread (L1 closed it at sign-up; this lesson extends it to verify/resend). Reference L1's threat-model framing, do not re-teach `user enumeration` from scratch — re-`Term` it once for readers landing here directly.

**No live sandbox** — Better Auth is server-side against Postgres; `ReactCoding` is react-family only (per project memory). Checks of understanding are recall/ordering/classification (`Sequence`, `MultipleChoice`, `Buckets`), plus one `Dropdowns` over the config callback.

**Verification-truth caveat for the writer (important):** the chapter outline asserts the token is `SHA-256(token)` stored in `verification.value`, raw token in the email. Better Auth's *current* internals may store a signed token rather than a literal SHA-256 hash, and the docs do not expose the mechanism. Teach the **security property** the student must reason about — *the raw token in the email is never the thing stored; a DB snapshot does not yield working links; the lookup is a constant-time compare* — and attribute the at-rest protection to the library ("the library stores it hashed, you never store the raw token"). Do **not** hard-assert "SHA-256" as a fact the student could verify by reading the row unless grounded against the installed version. This keeps the lesson true regardless of the exact primitive. Frame it as "what the library guarantees," not "the exact bytes in the column."

---

## Lesson sections

### Introduction (no header)

Warm, brief, per pedagogical structure. Open by snapping the two open threads together: *L1 handed the user a "check your inbox" page and stopped; L2 refuses to sign them in until `emailVerified` is true. This lesson is the bridge — the email that actually arrives, the link that flips the flag, and the moment the app finally opens.* State the four senior questions this lesson answers (inline, not as a list-as-section):
- What's in the link, and what stores the token?
- What happens, step by step, when the user clicks it?
- How long does the link live, and what makes it un-replayable?
- How does the chapter's enumeration discipline survive a brand-new public surface — the verify endpoint?

Preview the end state: a working verify circuit where a click flips `emailVerified: false → true`, deletes the pending row, and (with one config flag) drops the user straight into the app. Draw the boundary up front, same as L1/L2 did: this lesson does **not** cover password reset, magic links, or the email-change-from-settings flow — each named at the seam where it reuses these primitives.

Render `<CourseProgressBar value={frontmatter['course-progress']} />` immediately after frontmatter, as L1/L2 do.

---

### Turning the email on

**Senior question:** L1 named `sendVerificationEmail` as "the seam the email rides" but left it empty — what's the smallest config that makes the email actually send, and which knobs reshape the *post-click* experience?

Content:
- This is an `emailVerification` block added to `betterAuth({ ... })` in `lib/auth.ts`, a **sibling of `emailAndPassword`** (not nested). Emphasize the symmetry with L1's `emailAndPassword` addition — same file, same "drop a block in" move.
- Walk the callback and the three knobs as *default → why we set it*, mirroring L1's "four knobs" treatment.

**Component — `AnnotatedCode` (`emailVerification` config), lang `ts`.** This is the section's centerpiece. `code` prop (writer finalizes exact whitespace):

```ts
emailVerification: {
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      react: VerifyEmail({ url }),
    });
  },
  sendOnSignIn: true,
  autoSignInAfterVerification: true,
  expiresIn: 60 * 60,
},
```

Steps:
- Step 1 — `sendVerificationEmail` callback, color **orange**: the seam L1 named is now filled. Better Auth hands you `{ user, url }` — `user.email` is the recipient, `url` is the **fully-formed verify link** (token already embedded; you do not build it). Your job is one line: hand it to the Unit 7 `sendEmail` wrapper. Stress *you don't mint the token or build the URL* — the library does; the callback only delivers.
- Step 2 — `sendOnSignIn: true`, color **violet** (it's the L2 hand-off): this is the knob that pays L2's debt. When an *unverified* user signs in, Better Auth re-fires `sendVerificationEmail` automatically — that's why L2's `'email-not-verified'` branch can say "we re-sent your link, check your inbox" without the form making a second call. Name the cross-reference to L2 explicitly. (Watch-out the writer should surface here, not later: `sendOnSignIn` only re-sends for *unverified* users; a verified user signing in triggers nothing.)
- Step 3 — `autoSignInAfterVerification: true`, color **green**: the post-click reshape. With this on, the verify endpoint doesn't just flip the flag — it **issues a session** and the user lands signed in, no second trip to the sign-in form. Off (the default), the click flips the flag and redirects to `callbackURL`, but the user must then sign in. The 2026 senior call for a consumer SaaS is **on** — the click already proved email control, making them sign in again is pure friction. Name the high-stakes exception (banking/admin: force an explicit sign-in even after verify).
- Step 4 — `expiresIn: 60 * 60`, color **blue**: 1 hour, which is also the library default — call that out (unlike L1's `minPasswordLength`, here we're *agreeing* with the default, and the reason is worth stating). The trade: long enough that a user who checks email an hour later still has a working link; short enough that a link leaked into a forwarded thread or a proxy log is mostly inert by the time anyone finds it. Contrast forward: password-reset (L4) uses a *shorter* 10 min because reset is higher-stakes; magic-link (L5) shorter still at 5 min because the link *is* the credential. One sentence, plant the comparison.

After the AnnotatedCode, one paragraph: that's the whole on-switch — a delivery callback and three trust/UX decisions. The token machinery, the endpoint, and the email body are all things the library hands you; the next sections open each box.

**Exercise — `Dropdowns` over the config block.** Fenced `ts` block with `___` placeholders on the three knob *values* (`sendOnSignIn`, `autoSignInAfterVerification`, `expiresIn`) and the `sendEmail` call inside the callback; `answers` prop. Goal: cement which knob does what (especially `sendOnSignIn` → L2 re-send, `autoSignInAfterVerification` → session-at-click). Low-friction recall, fits right after the walkthrough.

`Term`s in this section: `sendVerificationEmail` (re-`Term` lightly — "the callback Better Auth invokes when a verification email needs to go out; it hands you the user and a ready-made link"), `sendOnSignIn`, `autoSignInAfterVerification`.

---

### The token, and why it never touches your database in the clear

**Senior question:** the user gets a link with a token in it. Where does the matching secret live, and what stops a leaked database backup from becoming a pile of working verification links?

Content — the conceptual heart of the lesson:
- One row per pending verification in the `verification` table (the one Ch 052 L2 generated, L1's sign-up wrote): `identifier` = the email, `value` = the **stored (hashed) token**, `expiresAt` = `now + expiresIn`. Frame `value` as "what the library compares against," not "the token" — that distinction *is* the security lesson.
- **The two-secret split.** The raw token travels in the email URL. What sits in the database is a one-way transform of it. Two properties fall out, and naming both is the point:
  1. **Brute-force is intractable.** The token is generated from a CSPRNG with enough entropy (on the order of 256 bits) that guessing a valid one is not a thing that happens. Re-use the "the library owns the crypto" posture from L1 — the student doesn't pick the byte count, the library encodes the safe default.
  2. **A database snapshot is inert.** Because only the transformed value is stored, an attacker who exfiltrates the `verification` table cannot reconstruct a single working link. This mirrors *exactly* the password-on-`account` story from L1 — the secret the user holds is never the secret you store. Call that parallel out loud; it's the same principle the student already owns, applied to a second kind of secret.
- **The lookup is constant-time.** When the click arrives, the library hashes the incoming token and compares against `value` in constant time — re-invoke the constant-time reflex L2 introduced for password verify. Same defense, different token.
- **Lifecycle:** the row is **deleted on successful verification** (one-time use is enforced by deletion — once consumed, the link is gone). Expired rows are swept either by a query-time filter (the lookup ignores rows past `expiresAt`) or a periodic cleanup job; name both, recommend not letting them accumulate unbounded (a watch-out, taught inline here where it belongs).

**Component — small custom HTML/CSS figure (`token-two-secrets.astro`) inside `<Figure>`.** Pedagogical goal: make the "raw in the email, hashed in the DB" split a single glance. Build at `src/components/lessons/053/3/token-two-secrets.astro`. Two side-by-side panels with an arrow/transform between:
- Left panel — "In the email (what the user holds)": a link chip `…/verify-email?token=ab3f…9d2` with the raw token highlighted.
- Transform arrow labelled "one-way hash (the library does this)".
- Right panel — "In the `verification` row (what you store)": a row-card with `identifier: ada@acme.com`, `value: 7f1c…e84` (clearly a *different*, hashed value), `expiresAt: …`.
- A short caption: "The thing in the inbox and the thing in the database are never the same string. A stolen database yields no working links." Color the row-card to echo the Ch 052 ER diagram (continuity with L1's `rows-after-signup` figure).

> Writer: keep this figure conceptual. Do NOT label the transform "SHA-256" as ground truth (see the verification-truth caveat in framing); "one-way hash, handled by the library" is the honest, version-proof framing.

`Term`s: `CSPRNG` ("cryptographically secure pseudo-random number generator — the source of unguessable tokens; the library uses it so you don't have to"), `bearer token` ("a token that grants access to whoever holds it — no extra proof of identity; why short expiry and one-time use matter so much"), re-use `constant-time` from L2 via `Term`.

---

### What happens when the user clicks

**Senior question:** the user clicks the link in their inbox. Which route handles it, and what's the exact sequence from click to signed-in (or click to "this link is dead")?

Content:
- **The link shape:** `https://app.example.com/api/auth/verify-email?token=<token>&callbackURL=<dest>`. Point out it hits the **same `[...all]` catch-all** the student mounted in Ch 052 L1 — they already built the route that handles this; they just never had a reason to exercise this path. No new route file. The `callbackURL` is the post-verify destination that rode all the way through from L1's `signUp.email({ callbackURL })`.
- **The happy path, server-side** (the library does all of it): hash the incoming token → look up the `verification` row by the hashed value → check `expiresAt` hasn't passed → flip `user.emailVerified` to `true` → delete the `verification` row → (if `autoSignInAfterVerification`) issue a session → `302` redirect to `callbackURL`.
- **The failure path:** an invalid, expired, or already-consumed token → redirect with `?error=invalid_token` in the query string (verified against current Better Auth). The page reads that param and renders a calm "this link is invalid or has expired — request a new one" with a resend affordance. **Crucially: one error string for all three failure causes** — this is the enumeration discipline preview, fully developed two sections down. (Production reach worth one line: Better Auth also accepts an `errorCallbackURL` so errors route to a dedicated page; absent it, errors land on `callbackURL` with the `?error=` param. Name it, default to the single-page form for the lesson.)
- Note the student writes a tiny **landing page** for `callbackURL` (or reuses an existing one) that handles both outcomes: success (signed in, show the app or a one-time "email verified" toast) and the `?error=invalid_token` branch (show the resend path). This is the only real UI code in the lesson and it's small.

**`callbackURL` is an untrusted input — close the open redirect.** This is a real, recent security beat, not a hypothetical: Better Auth shipped security advisories for an **open-redirect on the `/verify-email` endpoint** (a scheme-less / unvalidated `callbackURL` could bounce the user to an attacker origin), fixed by enforcing domain validation on `callbackURL` for `/verify-email` (Better Auth ≥ v1.1.6 validates against `trustedOrigins`). Two teaching points, both reinforcing prior threads:
- The library now validates its own redirect targets against `trustedOrigins` (Ch 052 territory) — keep `trustedOrigins` correct or legitimate links break and malicious ones might not.
- **Any `callbackURL` / `?next=` your own landing-page code reflects is still on you** — route it through `safeNext` (code conventions §Security baseline; the exact rule L2 taught for `?next=`). Reflecting a raw query param into a redirect is the open-redirect footgun; the same `safeNext` allowlist (same-site `/…` only, reject `//` and absolute URLs) applies here. Cross-reference L2's open-redirect closure rather than re-deriving it.

> Writer gotcha (do not over-teach, but get the code right): `callbackURL` semantics differ subtly between the `signUp` and `signIn` flows in Better Auth, and the param can be URI-decode-sensitive. Use the documented shape; don't invent encoding. If a code sample shows the landing page, pass the redirect target through `safeNext`, never `redirect(searchParams.get('callbackURL'))`.

**Component — `DiagramSequence` (verify-flow), the lesson's named load-bearing visual.** Pedagogical goal: hold the whole click-to-session motion as one scrubael sequence, the L3 counterpart to L1's `signup-flow` and L2's `signin-happy-path`. Reuse the section colors. Use a horizontal pipeline strip with the active stage lit, per the DiagramSequence docs pattern. Stages: `Click link` → `Hash token` → `Look up + check expiry` → `Flip emailVerified` → `Delete row` → `Issue session` → `Land in app`. Six-to-seven `DiagramStep`s, each with a one-sentence "what's true now" caption:
1. **Click link** lit. Caption: "The user clicks the link in their inbox. The request hits the `[...all]` catch-all you mounted in Chapter 052 — no new route."
2. **Hash token** lit (orange). Caption: "The library hashes the token from the URL — the raw token is never looked up directly."
3. **Look up + check expiry** lit (orange). Caption: "It finds the `verification` row by the hashed value and checks `expiresAt`. Expired, missing, or already-used → the link is dead."
4. **Flip `emailVerified`** lit (green/violet). Caption: "`user.emailVerified` flips `false → true`. This is the flag L2's sign-in was waiting on."
5. **Delete row** lit. Caption: "The `verification` row is deleted — one-time use, enforced by deletion. The link can never work twice."
6. **Issue session** lit (green). Caption: "Because `autoSignInAfterVerification` is on, a session is issued right here — no second trip to the sign-in form."
7. **Land in app** lit. Caption: "A `302` to `callbackURL`. The user is verified and signed in. The circuit L1 opened is closed."

(If the writer prefers, fold "delete row" into step 4's caption to keep it to six steps — either is fine; the load-bearing beats are hash → check expiry → flip → session.)

`Term`: re-use `catch-all` / `[...all]` lightly if helpful; `302` only if the audience needs it (likely skip — they've seen redirects).

---

### The verification email itself

**Senior question:** what's actually *in* the email — and what's the discipline that keeps a transactional verify mail from turning into a marketing surface?

Content:
- The template lives at `emails/verify-email.tsx` and exports `VerifyEmail` (the component the config callback rendered via `react:`). React Email anatomy and the send pipeline were taught in Unit 7 (Ch 049/050) — **do not re-teach them**; this is just the one template this flow needs. Reference back, keep it tight.
- **One job.** The senior principle for transactional auth email: a verification email does exactly one thing — get the user to click verify. No cross-sells, no "while you're here", no newsletter footer. Every extra element is a reason for a spam filter to flag it and a reason for the user to hesitate.
- The anatomy (keep minimal): a single primary CTA `<Button href={url}>Verify email</Button>`; a **plain-text fallback URL** below it (some clients strip buttons; the raw link must be clickable/copyable); an **expiry note** ("this link expires in 1 hour"); and the from-address / sender discipline that lives in the Unit 7 pipeline (named, not re-taught — `Term` or one-liner pointer to Ch 048).

**Component — `Code` (lang `tsx`, `title="emails/verify-email.tsx"`).** A single block is right here — the file is short and the focus isn't on multiple parts, it's "see the whole one-job template at once." Sketch:

```tsx
export const VerifyEmail = ({ url }: { url: string }) => (
  <Html>
    <Body>
      <Text>Confirm your email to finish setting up your account.</Text>
      <Button href={url}>Verify email</Button>
      <Text>Or paste this link into your browser:</Text>
      <Text>{url}</Text>
      <Text>This link expires in 1 hour.</Text>
    </Body>
  </Html>
);
```

> Writer: import the components from `@react-email/components` (the consolidated package — the deprecated per-component imports were corrected chapter-wide per a recent commit; honor that). Strip imports in the displayed block per MDX display rules, but the prop signature and the one-CTA structure are load-bearing — keep them.

One paragraph after: stress the `{ url }` prop is the same `url` the config callback received — the template is a pure render of the link the library minted, nothing more. This connects the template back to the config callback two sections up.

`Term`: skip heavy terms here; maybe `transactional email` ("triggered by a user action — verify, reset, receipt — as opposed to marketing blasts; different deliverability rules, different sender reputation") if not already defined in Unit 7.

---

### Re-sending: two doors, and only the newest link works

**Senior question:** the email landed in spam, or the link expired. How does the user get a fresh one, and what stops the old link (or the resend button) from becoming a problem?

Content:
- **Two paths to a fresh link**, and they're already half-built:
  1. **Explicit resend** — the "resend" button L1 wired on the "check your inbox" page calls `authClient.sendVerificationEmail({ email })`. (Re-reference L1; this is where that button's other end lives.)
  2. **Implicit on sign-in** — `sendOnSignIn: true` (set two sections ago) re-fires the email when an unverified user tries to sign in. This is L2's `'email-not-verified'` branch made whole.
- **Rotation: only the most recent link works.** Each resend mints a new token and supersedes the previous — the old link stops working. Explain *why* this is the safe default: if old links stayed valid, every resend would widen the attack surface (more live bearer tokens floating in more inboxes/logs). One live link at a time. (Whether this is literal row-replacement or newest-wins-by-timestamp is a library detail — teach the *guarantee*: don't promise the old link works.)
- **Rate-limiting, named not built.** The resend endpoint is rate-limited by design (e.g. one per ~60 s per email) so the button can't be weaponized to flood someone's inbox. This is the same posture L1 took at the same call site — protection exists from day one; the full dual-key (per-IP + per-email) wiring with `safeLimit` is Ch 074. Name it at the call site, defer the mechanics. (Code conventions §Security baseline mandates the dual-key limiter on auth endpoints — cite the intent, not the implementation.)

This section is mostly prose tying threads together — no heavy component. Optionally a tiny two-row `Code` or inline showing the two call sites (`authClient.sendVerificationEmail({ email })` vs the automatic `sendOnSignIn` path) side by side, but a clean paragraph carries it. Writer's call.

`Term`: re-use `bearer token` reasoning; `rate limit` if not yet defined in the chapter.

---

### Same answer at every door: enumeration on the verify surface

**Senior question:** sign-up and sign-in are enumeration-safe (L1/L2). The verify endpoint and the resend button are *new* public surfaces — does the discipline hold, or did we just open a fresh oracle?

Content — this is the lesson's decision insert, the chapter's running thread extended to L3's two new surfaces:
- Re-`Term` `user enumeration` once (readers may land here directly), then state the rule: **every entry point in the auth surface answers "does this email exist?" with the same shape.** L1 closed sign-up; L2 closed sign-in; this lesson must close *resend* and *verify-token*.
- **Resend:** `authClient.sendVerificationEmail({ email })` must return the **same response to the caller whether or not the email belongs to a real, unverified account.** It must not say "no account with that email" or "that email is already verified" — either tell is an oracle. Teach the *requirement* (uniform response), not a guarantee about whether mail goes out: the library's send behavior for already-verified/non-existent addresses is a version-sensitive detail (there's an open issue about it still sending when `emailVerified` is true), so the senior posture is "the response the attacker sees is identical; if you add an `emailVerified` short-circuit in the callback, it must not change the response shape." Frame as discipline the student owns, not library trivia.
- **Verify-token:** the failure redirect carries **one** `?error=invalid_token` for *all* of: token never existed, token expired, token already used. Naming the specific cause ("this link already used" vs "this link expired") would leak whether a token was ever valid — collapse them. This is the exact same move as L1's `mapSignUpError` collapsing `USER_ALREADY_EXISTS` into success, applied to a redirect param instead of a `Result` code. Call that parallel out.
- The senior framing (reuse L1's): enumeration safety is a **whole-path property** — the library answers uniformly, and the landing page must not re-introduce a distinction in the copy it renders. One leaking layer reopens it.

**Component — `Buckets` (classify the verify/resend responses).** Two columns: **"Leaks — hands the attacker a tell"** vs **"Safe — same shape either way."** Items (phrase as behaviors, not lifted prose, so it's reasoning):
- Leaks: "Resend replies 'no account found' for unknown emails." / "Verify shows 'this link was already used' but 'this link expired' for a different token." / "Resend returns success for real emails, a 404 for unknown ones."
- Safe: "Resend returns the same acknowledgement for every email submitted." / "Every failed verify click lands on one 'invalid or expired link' page." / "A non-existent email simply results in no mail, with an identical response to the caller."

Pedagogical goal: force the student to *discriminate* observable-difference from no-difference on the two new surfaces — the same skill L1 drilled with `MultipleChoice`, now on this lesson's surfaces. `Buckets` (classification) is the right fit per the continuity notes' preference for it on enumeration drills.

**Aside — `:::danger`** (the both-layers rule, mirroring L1's): "The library answers the verify and resend endpoints uniformly — but if your landing page renders different copy for 'expired' vs 'never existed', or your resend UI shows 'unknown email', you've rebuilt the oracle by hand. Enumeration safety is a property of the whole path, from endpoint to pixels."

`Term`: re-`Term` `user enumeration` (short), reference `credential stuffing` from L1 if reinforcing the *why*.

---

### What the flipped flag unlocks (and what it doesn't)

**Senior question:** `emailVerified` is now `true`. What does that actually grant the user — and what's the senior trap in treating it as more than it is?

Content — the downstream gate, closing the lesson on a systems-design note:
- **What flips open the instant the flag is true:** L2's sign-in now lets the user through (no more `'email-not-verified'`); the `proxy.ts` cookie-gate from Ch 052 L4 lets them past `/dashboard`; and (forward pointer) Ch 054 L1's billing/capability patterns can read the flag. The flag is the **floor for capability, not the ceiling** — it proves "this person controls this inbox," nothing more.
- **The trap to name (senior mindset):** `emailVerified: true` is **not** authorization. It does not mean "this user may do X" — every per-action authz check (tenancy, role, ownership) still runs on top. A verified email is necessary-not-sufficient. This connects forward to Unit 9's RBAC without teaching it — plant that `emailVerified` and "is allowed to" are different questions answered in different places (the action boundary, per code conventions §Authentication — "authorization decisions live at the action boundary"). Keep it to a sentence or two; the point is to prevent the beginner conflation, not to teach authz.
- **Email-change reuses this exact machinery — named, not built.** When a user changes their email from account settings (Ch 054 L2), the *same* `verification` table holds the new-email token, just under a different `identifier` namespace (scoped to the user, not a bare email). Same primitives — hashed token, short expiry, one-time use, click-to-confirm — different entry point. One sentence: the student should recognize they've already learned the reusable primitive; the change-email flow is a re-skin, covered later.

**Component — end-of-lesson `Sequence` ordering drill.** `instructions`: "Order what happens from the moment the user clicks the verification link to the moment they're signed in." Steps in correct order (the temporal model the DiagramSequence walked — rebuilding from memory is how it sticks):
- `<Step>The user clicks the link in their inbox</Step>`
- `<Step>The catch-all route hashes the token from the URL</Step>`
- `<Step>The library finds the `verification` row and checks it hasn't expired</Step>`
- `<Step>`emailVerified` flips from false to true</Step>`
- `<Step>The `verification` row is deleted — the link can't be reused</Step>`
- `<Step>A session is issued and the user is redirected into the app</Step>`

This drill plus the `Buckets` give the lesson two checks: one on the *mechanism* (Sequence), one on the *security discipline* (Buckets) — matching the chapter's pattern of drilling both the flow and the watch-out.

---

### External resources

`CardGrid` of `ExternalResource` cards, mirroring L1's four-card close:
- **Better Auth — Email verification / Email concepts docs.** The `emailVerification` option surface (`sendVerificationEmail`, `sendOnSignIn`, `autoSignInAfterVerification`, `expiresIn`) and the verify-email endpoint behavior. `icon="simple-icons:betterauth"` if available.
- **Better Auth — API & the catch-all handler.** How `/api/auth/verify-email` is served by the `[...all]` mount, the `?error=invalid_token` / `errorCallbackURL` redirect behavior, and the `trustedOrigins` validation that closes the open redirect on this endpoint (link the relevant security advisory if a stable URL exists).
- **React Email — components / `Button`.** Grounding for the one-CTA template (cross-link to the Unit 7 material, not a re-teach). `icon="simple-icons:react"` or the react-email glyph.
- **OWASP — Authentication / account-enumeration prevention cheat sheet.** Same canonical ground L1 cited, here for the verify/resend surfaces. `icon="simple-icons:owasp"` if available.

---

## Scope

**This lesson covers:** the `emailVerification` config block (`sendVerificationEmail` callback, `sendOnSignIn`, `autoSignInAfterVerification`, `expiresIn`); the `verification`-table token model (hashed at rest, short expiry, one-time-use-by-deletion, constant-time lookup); the `/api/auth/verify-email?token=…&callbackURL=…` click-through served by the existing catch-all and the success/`?error=invalid_token` outcomes; the `emails/verify-email.tsx` one-job React Email template; the two resend paths (explicit button + `sendOnSignIn`) with token rotation; enumeration discipline at the verify and resend surfaces; and what flipping `emailVerified` unlocks downstream.

**Out of scope — do not teach (named at the seam only):**
- **Sign-up config and the action that writes the `verification` row** — Ch 053 L1 (committed). This lesson *consumes* what L1 wrote; re-state in one sentence (sign-up queued the email, wrote three rows), don't re-derive `emailAndPassword`, the hash-on-`account` story, or `mapSignUpError`.
- **Sign-in, the `Result` discriminant catalog, the failed-attempt/`'email-not-verified'` branch** — Ch 053 L2 (committed). Reference `'email-not-verified'` and `sendOnSignIn` as the hand-off; don't re-teach the sign-in classifier.
- **Password reset** (Ch 053 L4) — the *sibling* flow with `sendResetPassword`, 10-min expiry, session-invalidation-on-success. Contrast expiry once (reset is shorter/higher-stakes); do not build it.
- **Magic links** (Ch 053 L5) — inbox-as-credential, 5-min expiry. Contrast expiry once; do not build.
- **Email-change-from-settings** (Ch 054 L2) — same `verification` table, user-scoped `identifier` namespace. Name as "same primitive, different door"; do not build.
- **React Email template anatomy + the `sendEmail`/Resend send pipeline** (Unit 7, Ch 048/049/050) — assumed built. Use `sendEmail` and the `VerifyEmail` template; do not teach DKIM, suppression lists, from-address config, or React Email primitives from scratch.
- **`verification` table schema generation** (Ch 052 L2) — the table already exists. Reference its columns (`identifier`, `value`, `expiresAt`); do not re-run the CLI or re-teach the migration.
- **The catch-all route mount** (Ch 052 L1) — already built. Reference that the verify link hits it; do not re-mount it.
- **Full rate-limit wiring** (`safeLimit`, dual-key per-IP + per-email, `RateLimit-*` headers, Upstash) — Ch 074. Name the resend rate-limit at the call site; defer mechanics.
- **Authorization / RBAC** (Unit 9) — `emailVerified` is the capability *floor*, not authz. Plant the distinction in one or two sentences; do not teach action-boundary authz, roles, or tenancy.
- **2FA composition on the verify path** — not relevant here (verify proves email control; 2FA is L6). Do not introduce.

**Prerequisites to restate concisely (one line each, not re-taught):** the `verification` table columns (Ch 052 L2); `sendEmail` is the Unit 7 Resend wrapper (`lib/email.ts`); the `[...all]` catch-all serves `/api/auth/*` (Ch 052 L1); `auth` instance config lives in `lib/auth.ts` (Ch 052 L1); enumeration threat model and the both-layers rule (Ch 053 L1); `'email-not-verified'` is L2's branch that this lesson's `sendOnSignIn` re-sends for; constant-time compare reflex (Ch 053 L2).
