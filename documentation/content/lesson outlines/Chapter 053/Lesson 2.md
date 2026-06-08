# Password sign-in

- **Title (h1):** Password sign-in
- **Sidebar label:** Password sign-in

---

## Lesson framing

The twin of Lesson 1. Sign-up wrote the rows; sign-in reads them and issues a session. Same five-seam Server Action shape, same enumeration discipline, same `Result` contract — so the teaching weight is **not** the mechanics (the student has the action shape cold from L1) but the things sign-in adds that sign-up lacked:

1. **A wider outcome surface, split across two channels.** Sign-up returned essentially `ok | validation | internal`. Sign-in fans into the chapter's full credential catalog: `'invalid-credentials'`, `'email-not-verified'`, `'too-many-attempts'`, `'requires-second-factor'`, `'ok'`. **Crucial mechanism the student must get right (and a correction to the chapter outline's framing):** these do *not* all arrive the same way. Most failures arrive as a **thrown `APIError`** caught in the `catch` (wrong credentials → 401, unverified → 403, rate-limited → 429). But the **2FA case arrives on the *success* path**: `auth.api.signInEmail` returns *normally* with `data.twoFactorRedirect: true` and `data.twoFactorMethods` (e.g. `['totp']`) — no throw. So the action's logic is two-pronged: inspect the *resolved value* for `twoFactorRedirect`, and translate the *thrown error* for everything else. Cataloguing these — and classifying each as error / continuation / success — is the spine of the lesson.
2. **The honest brute-force story.** Core Better Auth ships **per-IP rate limiting only** (the `/sign-in/email` default is strict — 3 requests / 10 seconds — and enabled in production, disabled in dev). It does **not** ship a per-account failed-attempt lockout counter out of the box. The senior beat is therefore: name the per-IP default as what you get for free, then name the *per-account* counter as the gap a senior fills (the course adds it as the dual-key per-IP-**and**-per-email limit in Ch 074, matching the code conventions' "dual-key on auth endpoints" rule). The "why both" argument is the *case for adding* the second key, not a claim that it's already on.
3. **Small but load-bearing extras:** `rememberMe` (cookie persistence ≠ server-side lifetime), session rotation on sign-in (the fixation defense from Ch 051 L2 made concrete, zero config), sign-out (always POST), open-redirect closure on `?next=`.

**Senior mental model the student leaves with:** a sign-in is a *classifier*, not a boolean — and it reads from two channels. The action runs one library call and fans the outcome into a small closed set: a success that's *either* a real session *or* a 2FA-redirect continuation, plus a handful of thrown failures. Two of the non-`ok` states (`email-not-verified`, `requires-second-factor`) are not failures at all but *continuations* that hand the form a different screen. The security posture is the same enumeration discipline from L1 (wrong-password and unknown-email collapse to one shape) plus the per-IP rate limit the library ships and the per-account limit the senior adds.

**Cognitive-load order (mirrors L1 deliberately so the student feels the symmetry):** the call → the outcome catalog (the teaching core, landed *before* the action so the action is just wiring the student already understands) → the action wiring (success-path `twoFactorRedirect` check + `catch` translation) → the brute-force defenses (hardening lands after the happy path, as in L1) → rememberMe + rotation → sign-out + open-redirect → the end-to-end sequence. Enumeration is *not* re-taught as a section (L1 owns it); it's named at the `'invalid-credentials'` outcome where it bites.

**Format:** mechanics + pattern hybrid. No live sandbox — Better Auth is server-side against Postgres; ReactCoding is react-family only (per project memory). Checks of understanding are recall/classification/ordering: a `Buckets` drag-sort that makes the student classify each discriminant as error/continuation/success (the single highest-value exercise in the lesson), plus a `Sequence` ordering drill on the library flow.

**Canonical shapes to reuse verbatim from L1** (do not redesign — the chapter's win condition is cross-lesson consistency; memory flags cross-lesson contract drift as a recurring failure):
- The five-seam action signature: `export async function signIn(prevState, formData): Promise<Result<...>>` with `safeParse(Object.fromEntries(formData))` first, `z.flattenError(parsed.error).fieldErrors` on parse failure, `try/catch` around the single `auth.api.*` call, `ok(...)`/`err(...)` returns.
- The two call faces: client `authClient.signIn.email(...)` returns `{ data, error }`; server `auth.api.signInEmail(...)` **throws `APIError`** on failure carrying `error.body.code` + `error.status`, but **resolves normally** on success — and that resolved value is where the 2FA continuation lives. (L1 established the throw-on-failure half; reference it, do not re-derive it.)
- The `mapSignInError(error)` helper mirrors L1's `mapSignUpError` — same `error instanceof APIError` narrowing, same "wrong-password and unknown-email collapse to one code" enumeration move. It handles **only the thrown failures**; the 2FA branch is *not* in here (it's a success).

**Verified ground-truth (researched against current Better Auth — supersedes the chapter outline where they differ):**
- `INVALID_EMAIL_OR_PASSWORD` → HTTP **401**; covers both wrong password and unknown email (enumeration-safe by design). `EMAIL_NOT_VERIFIED` → HTTP **403**. Rate-limit exceeded → HTTP **429** (with a retry-after header).
- **2FA is not an error.** A 2FA-enabled user makes `signInEmail` *resolve* with `{ twoFactorRedirect: true, twoFactorMethods: [...] }` instead of a session. TypeScript does **not** infer this field — the documented check is `if ('twoFactorRedirect' in result)`. The action inspects the *resolved value*, then returns the `'requires-second-factor'` `Result`. Do **not** route this through `mapSignInError`.
- **No built-in per-account lockout.** Core Better Auth's brute-force defense is the per-IP rate limiter only; the per-account/per-email limit is course-added (Ch 074). Frame accordingly.
- Still ground the exact code *strings* against the client's `$ERROR_CODES` at build time — versions rename these (L1's `USER_ALREADY_EXISTS`-variant caution applies).

---

## Lesson sections

### Introduction (no header)

Open warm and brief, in the L1 voice. The verified user from L1's "check your inbox" finally has a confirmed email — now they come back and type it with their password. The senior question, stated implicitly via the outcomes (per pedagogical guideline — the senior question is *in* the intro, not a section): a sign-in looks like one yes/no, but a correct one answers a fan of questions — *is the password right? is the email even verified? have there been too many tries from this address? does this user have a second factor turned on?* Each is a different screen. Preview the deliverable: a sign-in Server Action that issues a session on success and, on every other path, returns a typed `Result` the form turns into the right copy — wrong-credentials, check-your-inbox, try-again-later, or a 2FA prompt.

State the one boundary up front (as L1 did): this lesson stops at *issuing the session*. It does **not** build the verify-email re-send screen (L3), the 2FA challenge UI (L6), or full rate-limit wiring (Ch 074) — those are named at their call sites and consumed as already-existing seams.

Render `<CourseProgressBar value={frontmatter['course-progress']} />` immediately after the frontmatter, matching L1.

### The call: one operation, two faces

**Goal:** re-establish the client/server split quickly (the student saw it in L1) and introduce the sign-in-specific input field `rememberMe`. Short section — this is recognition, not new theory.

Lead by reminding the student of L1's finding in one sentence: same instance, two faces, opposite failure shapes. Then show the sign-in call shape.

Use a **`CodeVariants`** (two tabs), parallel to L1's "two-call-faces" component so the symmetry is visible:
- Tab 1 "Client — returns `{ data, error }`": `authClient.signIn.email({ email, password, rememberMe, callbackURL })`. Prose: runs in the browser, failure is a value on `error.code`. Note `rememberMe` and `callbackURL` ride here.
- Tab 2 "Server — throws `APIError`": `auth.api.signInEmail({ body: { email, password, rememberMe }, headers: await headers() })`. Prose: the artifact we build; throws on failure, `error.body.code` + `error.status` carry the reason; our action catches and translates.

Introduce `rememberMe` here as a one-paragraph teaser only — defaults true, exposes a checkbox on the form — and explicitly forward-point its real mechanics to the dedicated section later ("what 'remember me' actually controls is subtler than it looks — its own section below"). Keep the depth there, not here, to protect cognitive-load ordering.

`CodeTooltips` / `Term` candidates in this section: `auth.api.signInEmail` (tooltip: "Server-side API; throws `APIError` on failure, unlike the client `signIn.email` which returns `{ data, error }`" — mirror L1's wording), `rememberMe` (brief: "toggles whether the session cookie survives the browser closing — not how long the server keeps the session").

### What the library checks, and the five answers it can give

**Goal — the teaching core of the lesson.** Before any action code, walk the student through what `signInEmail` does internally and the closed set of outcomes it produces. This is where the `Result` catalog is taught. Landing it *before* the action means the action section is pure wiring of a model the student already holds (same move L1 used for the action).

First, the **library flow** as an ordered list (prose + a small visual): the per-IP rate limiter checks the request isn't over the cap → resolve the email → find the `'credential'` account → verify the password hash **in constant time** → check `emailVerified` → if 2FA is enabled, stop and signal "second factor needed" → otherwise issue the session. Frame it as a gauntlet: the request walks a series of gates, and *where it falls out* determines which of five answers comes back.

**The one mechanism beginners get wrong — flag it explicitly here, it's a correction to the obvious mental model:** four of these five answers come back as a **thrown `APIError`** (rate-limited, wrong-credentials, unverified — caught in the action's `catch`). But the **2FA answer does not throw** — `signInEmail` *resolves successfully* with `{ twoFactorRedirect: true, twoFactorMethods }` and no session. So "did sign-in succeed?" is not the same question as "is the user signed in?": a resolved call can *still* be a 2FA continuation. The action reads two channels — the resolved value **and** the thrown error.

Then the **outcome catalog** — the heart. Present as a definition-list / small table, one entry per outcome, each stating *(a)* what tripped it, *(b)* which channel it arrives on (thrown vs resolved), *(c)* what the user sees, *(d)* — the senior reframe — whether it's an **error**, a **continuation**, or **success**:

- **`'invalid-credentials'`** — wrong password **or** unknown email, returned with the *same shape* (Better Auth code `INVALID_EMAIL_OR_PASSWORD`, **401**, thrown). This is the enumeration discipline from L1 at the sign-in surface: the user must not be able to tell "no such account" from "wrong password," or you rebuild the harvesting oracle. One short paragraph, point back to L1 for the full threat model (`<Term>` user enumeration), do not re-teach it. Classification: **error**.
- **`'email-not-verified'`** — known account, correct password, `emailVerified` still false (the flag L1 wrote false and L3 flips true). Code `EMAIL_NOT_VERIFIED`, **403**, thrown. The library re-sends the verification mail when `sendOnSignIn: true` is configured (an L3 concern — name it, don't build it). UI swaps the form for the "check your inbox" view from L1. Classification: **continuation** — the user did nothing wrong, they're mid-onboarding.
- **`'too-many-attempts'`** — the **per-IP rate limiter** tripped (**429**, thrown, carries a retry-after). Not a per-account lockout — core Better Auth doesn't ship one; this is the IP cap. UI shows "too many attempts, try again in N seconds." Full story in the brute-force section. Classification: **error** (a *protective* one).
- **`'requires-second-factor'`** — credentials validated, 2FA enabled. **This one is the odd one out: it arrives on the *success* path**, not the `catch`. `signInEmail` resolves with `twoFactorRedirect: true` and `twoFactorMethods` (which factors are available, e.g. `['totp']`) — *no session is issued yet*. The action detects it with `if ('twoFactorRedirect' in result)` (TS doesn't infer the field) and returns the `'requires-second-factor'` `Result`, threading `twoFactorMethods` so the form knows which prompt to show. The factor is verified in a *separate* call (L6). **Emphasize the senior reframe hard:** this is the most-misread outcome — beginners catch it as an error and paint a red message; it is a *continuation*, a successful first factor, not a failure. Classification: **continuation**.
- **`'ok'`** — the gauntlet cleared with no 2FA: a `session` row is inserted, a fresh token issued, the cookie attached via `nextCookies()` (from Ch 052). Classification: **success**.

Put the **gauntlet** visual here as a small static figure (not the scrubable `DiagramSequence` — reserve that for the happy-path end-to-end in the final section). A horizontal strip of gates: `rate limit → verify hash → check verified → check 2FA → session`, with branch-off arrows labeled by the outcome each gate emits, and one arrow visibly leaving the *success* exit toward a "2FA?" fork so the dual-channel point is drawn, not just stated. Rationale: this section needs the *branching* shown (where each outcome falls out, and that 2FA forks off success), which a static labeled strip conveys better than a linear scrubber; the final section needs the *temporal* happy path, which the scrubber owns. Build as a hand-coded HTML/CSS figure (`<Figure>`, caption: "Where the request falls out names the `Result` — and 2FA forks off the *success* exit, not a failure."), color-coding error-exits red, continuations violet, success green, echoing the classification the student is about to drill.

`<Term>` candidates: `constant-time` compare (brief: "a comparison that takes the same time whether it matches or not, so an attacker can't learn the secret from response timing").

**`Buckets` exercise** — the single highest-value check in the lesson. Three buckets: **Error**, **Continuation (not a failure)**, **Success**. Items are the five outcomes (phrased as scenarios, not bare codes, to force reasoning): "Password didn't match the stored hash" → Error; "Correct password, but the email was never verified" → Continuation; "Correct password, account has 2FA on" → Continuation; "Eleventh request in ten seconds from this IP" → Error; "Everything checked out, a session row was written" → Success. This drills the exact senior reframe (`requires-second-factor` and `email-not-verified` are *not* errors) that the section turns on. Place it immediately after the catalog.

### Wiring the sign-in action

**Goal:** show the action — but lean on L1 hard. The student has written this shape once; this section is "same five seams, here's what's different for sign-in." Keep prose tight; the novelty budget goes to the `Result` mapping, not the seam walkthrough.

Use an **`AnnotatedCode`** (lang `ts`, `maxLines={18}`) of the finished `signIn` action, structured exactly like L1's `signup-action` so the diff is legible. **The structural difference from L1 the student must see: the success path is not a plain `ok` — it forks on `twoFactorRedirect`.** The action captures the resolved value and inspects it before returning success.

```ts
'use server';

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  rememberMe: z.preprocess((v) => v === 'on' || v === true, z.boolean()).default(true),
});

export async function signIn(
  prevState: Result<SignInOk> | null,
  formData: FormData,
): Promise<Result<SignInOk>> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors);
  }

  const { email, password, rememberMe } = parsed.data;

  let result;
  try {
    result = await auth.api.signInEmail({ body: { email, password, rememberMe }, headers: await headers() });
  } catch (error) {
    return mapSignInError(error);
  }

  if ('twoFactorRedirect' in result) {
    return ok({ status: 'second-factor', methods: result.twoFactorMethods });
  }
  return ok({ status: 'signed-in', redirectTo: safeNext(formData.get('next')) });
}
```

(`SignInOk` is a small discriminated union declared above: `{ status: 'signed-in'; redirectTo: string } | { status: 'second-factor'; methods: string[] }` — the *domain* outcome the form switches on. Note this is distinct from the generic `Result.error.code` union from `lib/result.ts` — the success channel carries its own shape; flag this to the build-out agent so they don't try to cram `requires-second-factor` into the error `code` set, which doesn't contain it.)

Steps (one short paragraph each, colors matching L1: blue parse, orange try/catch, green/violet returns):
- Step 1 — **parse**, blue, `meta={`{15} "safeParse"`}`: same `Object.fromEntries` → `safeParse` opening as sign-up. The schema differs in a way worth a beat: `password.min(1)` not `min(12)` (we never re-enforce the strength floor at sign-in — we're *checking* a password, not *setting* one; the floor lives at sign-up, and an existing weak password must still be able to sign in). Point this out explicitly — it's a real beginner error to copy `min(12)` here and lock users out.
- Step 2 — the **`rememberMe` checkbox coercion**, blue, `meta={`{6} "z.preprocess"`}`: HTML checkboxes submit the string `"on"` (or nothing), never a boolean. Per code conventions, **never `z.coerce.boolean()`** (it makes the string `"false"` truthy); use `z.preprocess(v => v === 'on' || v === true, z.boolean())`. Defaults true so a form without the field still gets a persistent session. A concrete instance of the FormData-boundary rule from the Zod conventions — name it as such.
- Step 3 — parse failure, green, `meta={`{16-18} "err"`}`: identical to sign-up — `err('validation', ...)` with the flat `fieldErrors`. One sentence; the student knows this.
- Step 4 — **authorize (the empty seam)**, no highlight: like sign-up, sign-in is a public endpoint — there's no *prior* caller to authorize, the credential check *is* the authorization. Name it deliberately empty, mirroring L1, so the student sees the seam was considered.
- Step 5 — **mutate**, orange, `meta={`{22-26} "signInEmail"`}`: the single library call. **Note it's assigned to `result`, not awaited-and-discarded** — that's the L1→L2 change, because on success we need to look at what came back. `try/catch` because the API throws on failure; `rememberMe` rides in the `body`; `headers: await headers()` (async in Next 16) hands Better Auth the request so it can attach the fresh session cookie via `nextCookies()`. No `db.transaction` — the library owns the session write.
- Step 6 — **the 2FA fork on the success path**, violet, `meta={`{28-30} "twoFactorRedirect"`}`: **the heart of this action.** A *resolved* call still might not be a finished sign-in. `if ('twoFactorRedirect' in result)` is the documented narrowing (TS can't infer the field), and when true we return `ok({ status: 'second-factor', methods })` — a *success-shaped* `Result` that tells the form to render the 2FA prompt with the available methods. The session isn't issued yet; L6 owns the factor-verification call. This is where the "continuation, not error" reframe becomes code.
- Step 7 — **the signed-in return**, green, `meta={`{31} "redirectTo"`}`: no 2FA → the real session exists, cookie already attached. Return `ok({ status: 'signed-in', redirectTo })` where `redirectTo` is the validated next-path (open-redirect section below). The form's job after this is to navigate. (Revalidate seam: nothing cached changes here — name it, skip it, as L1 did.)

Then a short prose beat on **why the action, not a raw client call** — compress to one sentence pointing back to L1's three reasons (server-side parse, throw→`Result`, no library copy leaks to UI), since the student just learned them.

Then the **`mapSignInError` helper** as a small `Code` block (not CodeVariants — there's no before/after to contrast here; L1 already taught the leaks-vs-safe contrast and we don't repeat it). Show the real, enumeration-safe mapping:

```ts
function mapSignInError(error: unknown): Result<never> {
  if (error instanceof APIError) {
    const code = error.body?.code;
    // unknown email and wrong password collapse to one shape — enumeration stays closed
    if (code === 'INVALID_EMAIL_OR_PASSWORD') {
      return err('unauthorized', 'Wrong email or password.');
    }
    if (code === 'EMAIL_NOT_VERIFIED') {
      return err('forbidden', 'Verify your email, then try again.');
    }
    if (error.status === 429) {
      return err('rate_limited', 'Too many attempts. Try again in a moment.');
    }
  }
  return err('internal', 'Something went wrong. Try again.');
}
```

Prose around it (one tight paragraph): this helper handles **only the thrown failures** — 2FA never reaches it (it's the success branch above). The comment is the kind production keeps: it names the non-obvious security reason two cases share a return. Three points to make: (1) the rate-limit case is detected on `error.status === 429` rather than a code string, the most version-stable check; (2) the exact code strings (`INVALID_EMAIL_OR_PASSWORD`, `EMAIL_NOT_VERIFIED`) must be read off Better Auth's `$ERROR_CODES`, not trusted from memory — versions rename these (the L1 grounding caution; the build-out agent verifies before finalizing); (3) the `Result.code` values used here (`'unauthorized'`, `'forbidden'`, `'rate_limited'`, `'internal'`) are the course's fixed `Result` union from `lib/result.ts` — the UI branches on this `code`, and `userMessage` is copy the developer wrote, never the library's wording. **The narrative discriminant `'requires-second-factor'` is deliberately *not* one of these error codes** — it lives on the success channel as `SignInOk.status`, which is exactly why beginners who try to model it as an error get stuck.

Close with one sentence on the form: the `useActionState` wiring that consumes this `Result` and renders per-code copy is the form shape from **Ch 044 L3** (`/044-forms-the-platform-way/3-useactionstate-pending-state-and-the-result/`) — the action plugs in unchanged; don't re-plumb it. (Note: L1's continuity flagged the chapter outline mis-cited Ch 045 — the correct reference is Ch 044 L3. Use Ch 044 L3.)

`CodeTooltips` / `Term`: `APIError` (reuse L1's definition), `safeNext` (brief: "validates a redirect target against an allowlist so `?next=//evil.com` can't bounce the user off-site" — full treatment in the open-redirect section).

### What the library defends, and the defense it leaves you to add

**Goal:** give the *honest* brute-force picture — what core Better Auth ships (per-IP rate limit, on in prod), what it does **not** ship (a per-account lockout), and why a senior closes that gap. This is the security-judgment beat, and getting it accurate is the point: a student who believes "the library locks accounts after N tries" ships a hole. (This corrects the chapter outline, which framed both defenses as built-in.)

Frame with the senior question implicitly: a sign-in endpoint is the most-attacked surface in any app — what stops an attacker from just trying passwords until one works? The answer comes in two layers — one the library gives you, one you add.

**Layer 1 — the per-IP rate limit (Better Auth ships this).** Better Auth applies rate limiting to all auth endpoints, with stricter caps on risky ones; `/sign-in/email` defaults to a tight **3 requests / 10 seconds** per IP. It's **enabled in production, disabled in development** (so local testing isn't throttled — name this, it surprises people the first time prod 429s and dev never did). Over the cap → **429**, which is the `'too-many-attempts'` outcome from the catalog. **The attack it stops:** a single IP hammering one endpoint. **Its hole:** an attacker who rotates IPs (botnet, proxy pool) sails under a per-IP cap — and the library does nothing per-account to stop them.

**Layer 2 — the per-account / per-email limit (you add this; core Better Auth does not).** State plainly: **core Better Auth has no built-in failed-attempt lockout counter.** Other platforms (Auth0, Clerk) ship one; Better Auth's brute-force story is the IP limiter only. So the senior move is to add a **second key** that limits attempts *per email address*, independent of IP — the course does exactly this in **Ch 074** as the dual-key (`per-IP` + `per-email`) `safeLimit` pattern, which the code conventions mandate for auth endpoints. **The attack it stops:** IP-rotation against one known-good account, which Layer 1 misses.

Teach the two layers as a contrast (a small two-column **`<Figure>`** comparison table or two side-by-side cards — per the diagrams index a comparison table is a legitimate diagram), with a column flagging **"who provides it": library vs you.**

The pedagogical payoff is the **Venn**: each layer has a hole the other plugs — "rotate IPs to beat the per-IP cap, the per-email key catches you; spread across accounts to beat the per-email key, the per-IP cap catches you." That's the argument for wiring *both* — and the reason the library's default alone (IP only) is not yet enough for a money-handling product.

Then the **non-negotiable rule**, as a `:::caution` or inline-bold, aimed at the per-email limit once it's added: never strip it "because users complain about lockouts." Once an attacker holds a valid email list (which L1 showed they can harvest via enumeration if you slip), a per-email cap is the *only* thing throttling guesses on a known-good account across rotating IPs. The right response to complaints is **clear copy** ("too many attempts — wait a moment, or reset your password") **plus a visible reset link** (forward to L4) — not removing the defense.

`<Term>` candidates: `credential stuffing` (reuse L1's definition).

### What "remember me" actually controls

**Goal:** correct the universal beginner misconception that "remember me" extends how long you stay logged in server-side. It doesn't — it controls *cookie persistence only*. Small, sharp section.

Lay out the two cases plainly:
- **Checked (true):** the session cookie is written with a `Max-Age` equal to the session's `expiresIn` — it survives the browser closing, so the user is still signed in when they reopen days later.
- **Unchecked (false):** a *session-only* cookie (no `Max-Age`) — the browser deletes it on close, so reopening lands them at sign-in.

The load-bearing correction, stated as the section's thesis: **the `session.expiresAt` row column is set the same either way.** "Remember me" controls the *cookie's* lifetime on the user's machine, **not** the server-side session lifetime. The server would honor the session for its full `expiresIn` in both cases; the checkbox only decides whether the browser hangs onto the cookie that long. A user who unchecks it and reopens isn't signed out because the session expired — it's because the *cookie* was discarded.

A tiny **hand-coded HTML/CSS figure** (`<Figure>`, optional) makes this concrete: two cookie "chips" side by side — one labeled `Max-Age: 30 days` (persistent), one labeled `Session` (cleared on close) — with a shared note underneath: "both back a `session` row with the same `expiresAt`." This is a one-glance reinforcement, not a diagram to study (per the diagrams index — any simple visual aid counts). Build at `src/components/lessons/053/2/remember-me-cookies.astro` only if a custom component is warranted; otherwise inline a small two-card figure. Keep optional — prose can carry it if the build budget is tight.

### Sign-in rotates the session token

**Goal:** make the Ch 051 L2 session-fixation defense concrete at the call site. Short — it's a "this happens for free, and here's the attack it closes" beat, zero config.

Recall in one sentence the fixation threat from Ch 051 L2 (`/051-the-auth-mental-model/2-sessions-versus-jwts-and-the-cookie-that-carries-them/`): an attacker who can plant a known session identifier in a victim's browser *before* they sign in would, in a naive system, still hold a valid handle *after* the victim authenticates. The defense: **issue a brand-new `session.token` on every successful sign-in, never reusing any pre-auth value.** Better Auth does exactly this — the token that comes out of a successful `signInEmail` is fresh, so any identifier an attacker planted is dead the instant the real user signs in.

The teaching point is the *posture*, mirroring L1's "the library owns the hash": you don't write rotation logic, you don't manage the token — the library encodes the fixation defense and you get it by calling `signInEmail`. Name it as the call-site payoff of the abstract model from Ch 051. No code block needed; one or two sentences and move on.

`<Term>`: `session fixation` (brief: "an attack where the attacker fixes a session ID in the victim's browser before login and reuses it after — defeated by minting a fresh token on every sign-in").

### Signing out

**Goal:** the inverse operation, plus the one security rule (always POST). Brief.

Show both faces in a small `Code` block (or two-line prose): client `authClient.signOut()` and server `auth.api.signOut({ headers: await headers() })`. What it does: deletes the `session` row, clears the cookie, and the app redirects to `/sign-in`.

The load-bearing rule, stated firmly: **sign-out must be a POST, never a GET.** A `GET /sign-out` is a CSRF target — any page can embed `<img src="/sign-out">` or a link an attacker tricks the user into following, and the victim is silently logged out (a nuisance attack, and a stepping stone to worse if logout clears CSRF tokens). Sign-out *changes server state* (kills a session), and state-changing requests go through POST so the browser's CSRF protections (and the framework's) apply. In practice this means a `<form>` with a submit button or an `onClick` that calls the action — never a bare `<a href>`.

`<Term>`: `CSRF` (brief: "Cross-Site Request Forgery — tricking a logged-in user's browser into firing a state-changing request they didn't intend; mitigated by requiring POST + a token on anything that mutates").

### Closing the open redirect on `?next=`

**Goal:** the last hardening beat — where the user goes *after* a successful sign-in, and why the destination can't be trusted raw. Pairs with the `redirectTo` the action already returned.

Set the scene: protected pages send signed-out users to `/sign-in?next=/dashboard/settings` so sign-in can bounce them back where they were headed. Convenient — and a hole if you `redirect(searchParams.get('next'))` blind. An attacker crafts `/sign-in?next=https://phish.example.com` (or the sneakier `//phish.example.com`, which browsers treat as a protocol-relative absolute URL), gets the victim to sign in through *your* trusted domain, and your own app hands them off to the attacker's lookalike page — now wearing the credibility of your domain.

The rule: **validate `?next=` against an allowlist before redirecting.** Accept only same-site paths — must start with a single `/`, must **not** start with `//` (protocol-relative), must not be an absolute `http(s)://` URL. The course centralizes this in `safeNext(url)` from `lib/redirects.ts` (per the security baseline in code conventions); the action's `ok({ redirectTo: safeNext(formData.get('next')) })` already routes through it — this section is where that line earns its explanation. Note that Better Auth validates *its own* internal redirects against `trustedOrigins`, but the rule applies to **your** surrounding form/redirect code — any `next` you handle yourself.

A small **`CodeVariants`** (two tabs) is the right vehicle for the before/after, since the contrast is the whole point:
- Tab 1 "Open redirect — don't" (mark color red): `redirect(formData.get('next') as string)` — prose: hands the user to whatever the query string says, including `//phish.example.com`.
- Tab 2 "Allowlisted — do" (mark color green): `redirect(safeNext(formData.get('next')))` — prose: `safeNext` returns the path only if it's a same-site `/...` path, else falls back to a safe default like `/dashboard`.

`<Term>`: `open redirect` (brief: "a redirect whose destination comes from untrusted input, letting an attacker bounce users off your trusted domain to a malicious one").

### The whole sign-in, end to end

**Goal:** consolidate the happy path as one motion (the L1 closing-sequence move), and let the student rebuild the temporal order from memory. Mirrors L1's final two components.

A **`DiagramSequence`** of the *successful* sign-in — the happy path only, because the branching/failure view already lives in the gauntlet figure earlier. Steps (horizontal pipeline strip with the current stage lit, per-step caption carrying "what's true now," colors echoing the sections: blue parse, orange library call, green session/ok):

Pipeline stages: `Submit` → `Parse` → `Verify hash` → `Checks pass` → `Rotate session` → `Redirect`.
1. **Submit** lit. Caption: "User submits email, password, and the remember-me choice."
2. **Parse** lit (blue). Caption: "The action parses with Zod, normalizes the email, and coerces the checkbox to a real boolean."
3. **Verify hash** lit (orange). Caption: "`auth.api.signInEmail` finds the `'credential'` account and verifies the password against the stored hash in constant time."
4. **Checks pass** lit (orange). Caption: "The request is under the rate cap, the email is verified, and no second factor is required — every gate clears."
5. **Rotate session** lit (green). Caption: "A fresh `session` row and token are issued — never reusing any pre-auth value — and the cookie is attached via `nextCookies()`."
6. **Redirect** lit (green). Caption: "The action returns `ok({ redirectTo })` and the user lands on the allowlisted destination, signed in."

Then a **`Sequence`** ordering drill, parallel to L1's. Instructions: "Order the steps a successful password sign-in takes, from the button press to the dashboard." Steps in correct order:
- The user submits email, password, and the remember-me choice
- The action parses and normalizes the input
- `auth.api.signInEmail` verifies the password against the stored hash
- The rate-limit, email-verified, and 2FA gates all pass
- A fresh session row and token are issued and the cookie is set
- The action returns `ok` and the user is redirected to their destination

### External resources

Four `ExternalResource` cards in a `<CardGrid>`, mirroring L1's pattern:
- **Better Auth — Email & Password (sign-in)**: the `signIn.email` / `signInEmail` surface, `rememberMe`, the sign-in error codes. `icon="simple-icons:betterauth"` if available.
- **Better Auth — Rate limiting / security reference**: the built-in per-IP rate limiter, the per-endpoint defaults (`/sign-in/email` at 3/10s), and the prod-on/dev-off behavior (grounds Layer 1 of the brute-force section).
- **OWASP — Authentication cheat sheet (credential / brute-force section)**: canonical ground for the per-IP-vs-per-account discussion and why a lockout layer is added. `icon="simple-icons:owasp"` if available.
- **OWASP — Unvalidated Redirects and Forwards cheat sheet**: canonical ground for the open-redirect section.

---

## Scope

**Prerequisites — assume taught, redefine in one line at most where needed, do not re-teach:**
- The five-seam Server Action shape, `Result<T>` / `ok` / `err`, `z.flattenError().fieldErrors`, `safeParse(Object.fromEntries(formData))` (Ch 043; exercised in full in L1 of this chapter).
- The two call faces and `APIError` throw semantics, the `mapXError` enumeration-collapse pattern, the scrypt/"library owns the hash" posture, the full enumeration *threat model* (L1 — reference, never re-derive).
- `useActionState` form wiring that consumes the `Result` (**Ch 044 L3**, not Ch 045 — L1's continuity corrected this mis-citation).
- `account` vs `user` split, the `credential` account row, `emailVerified`, `nextCookies()`, the `verification` table, cookie hardening / `expiresIn` / `freshAge` (Ch 052; L2 *reads* the `emailVerified` L1 wrote false).
- Session vs token model and the **session-fixation** threat (Ch 051 L2 — re-named at the rotation section, not re-explained).
- The FormData/Zod boundary rules incl. the `z.coerce.boolean()` ban (code conventions — applied at the `rememberMe` coercion, named not lectured).

**Explicitly out of scope — name at the call site, do not build:**
- **Email-verification flow** — token shape, the React Email template, `sendVerificationEmail` / `sendOnSignIn` body, the verify-click endpoint, `autoSignInAfterVerification` (L3). L2 stops at *returning* `'email-not-verified'`; it does not build the re-send screen.
- **Password reset** (L4) — named only as the "reset link" remedy to rate-limit/lockout complaints.
- **2FA enrollment, the TOTP challenge UI, recovery codes, the factor-verification call** (L6). L2 stops at *detecting* the `twoFactorRedirect` success response and returning the `'second-factor'` outcome with `twoFactorMethods`; the prompt that collects the code and the call that verifies it are L6.
- **OAuth / social sign-in** (L8), **magic links** (L5), **account linking** (L9) — sibling sign-in paths, not this lesson.
- **Active-sessions list / revocation, change-password/change-email from settings** (Ch 054 L2–L3).
- **Full production rate-limit wiring** — `safeLimit`, dual-key per-IP+per-email, `RateLimit-*` headers, Upstash (Ch 074). L2 names the library's per-IP default *and* the per-email gap a senior fills; it does not wire Upstash.
- **401-vs-403 wire shapes / RFC 9457 Problem Details** (Ch 046 L3, Ch 054 L4) — the action returns a `Result`, not an HTTP status; do not drift into status-code teaching. (The `Result.code` values like `'unauthorized'`/`'forbidden'` are the course's discriminants, *not* HTTP statuses — keep that distinction clean.)
- **The `freshAge` elevation pattern** for high-stakes mutations (Ch 054 / Unit 9) — sign-in establishes a fresh session; it doesn't *check* freshness.

---

## Notes for the build-out agent

- **Three facts in this outline were corrected against current Better Auth (June 2026) — do not regress them to the chapter outline's wording:** (1) the **2FA outcome arrives on the *success* path** as `{ twoFactorRedirect: true, twoFactorMethods }`, narrowed with `if ('twoFactorRedirect' in result)` — *not* a thrown error code; (2) **core Better Auth ships no per-account lockout** — its brute-force defense is the per-IP rate limiter only (`/sign-in/email` ≈ 3 req/10 s, prod-on/dev-off), and the per-email limit is course-added (Ch 074); (3) `EMAIL_NOT_VERIFIED` is **403**, `INVALID_EMAIL_OR_PASSWORD` is **401**, rate-limit is **429**. Re-verify all of these (and the exact code strings via `$ERROR_CODES`) against the library version pinned at build time before finalizing — they are version-volatile (L1's continuity flagged the same risk).
- **Reuse L1's component identities and colors** so the two lessons read as a matched pair: blue=parse, orange=library call / try-catch, green=returns/session, violet=continuation/hinge, red=the leaking/insecure variant. The `signIn` action `AnnotatedCode` should structurally echo L1's `signup-action` so the student sees the same skeleton.
- **The `Buckets` exercise (error/continuation/success) is the lesson's keystone check** — do not cut it for budget; it's the one drill that lands the central reframe.
- Frontmatter: `chapter-id: 53`, `sidebar.order: 2`, `sidebar.label: Password sign-in`, and a `course-progress` value one increment past L1's `0.00005` (confirm the increment convention against L1 / the pipeline; L1 used `0.00005`).
- Cross-ref slugs to use: this lesson `/053-authentication-flows/2-password-sign-in/`; sign-up `/053-authentication-flows/1-password-sign-up/`; verify-email `/053-authentication-flows/3-verifying-email/` (the slug L1 already links — note L3's file/title is "Email verification" in the chapter outline but L1 committed to the `verifying-email` slug; keep them consistent — flag if L3 lands under a different slug); Ch 044 L3 `/044-forms-the-platform-way/3-useactionstate-pending-state-and-the-result/`; Ch 051 L2 `/051-the-auth-mental-model/2-sessions-versus-jwts-and-the-cookie-that-carries-them/`.
- Lesson-specific component stubs (build only if warranted, prose can carry the lighter ones): `src/components/lessons/053/2/` — the **gauntlet strip** (the one worth building — branching, color-coded by classification), optionally `remember-me-cookies.astro` (two cookie chips).
