# Account linking

- Title: Account linking
- Sidebar label: Account linking

## Lesson framing

Last teaching lesson of Ch 053 (quiz follows in L10). It closes the loop L8 deliberately left open: L8 landed the find-or-create lookup and named the **refuse** branch (`account-not-linked`) as the safe default that fires *because* `trustedProviders` has no default list. This lesson configures the trust the refusal was waiting for, then builds the two ways a second credential attaches to one user (implicit on-sign-in, explicit from-settings) and the unlink guard that stops a user from locking themselves out.

**This is a decision-archetype lesson, not a mechanics lesson.** Every primitive is already owned — the `account`/`user` split (Ch 052), the OAuth flow + find-or-create (L8), `safeNext` (L2), `freshAge` elevation + `revokeOtherSessions` (Ch 052 / Code conventions), the Unit-7 notification-email seam (L8's `databaseHooks` welcome-email pattern). There is **almost no new code**: a config block, two short client calls (`linkSocial`, `unlinkAccount`), one guard. The teaching weight is three security/UX *judgments*, in this order of difficulty:

1. **`trustedProviders` is a trust-transfer decision, not a feature flag.** Putting a provider on the list says "I will treat this provider's `email_verified` claim as proof that whoever controls this Google identity is the same human who set this password." Get the claim wrong (provider bug, Workspace edge, domain takeover) and an attacker links into an account with no password. This is the lesson's spine.
2. **`allowDifferentEmails` widens the attack surface by removing the email-match signal** — it's the deliberate reach for the "personal Google into a work-email account" product, and it's *only* safe paired with explicit, elevated link-from-settings. The dangerous combination (the one watch-out the chapter outline flags hardest) is `allowDifferentEmails: true` + implicit on-sign-in linking.
3. **The unlink guard** — refusing to remove a user's last sign-in method — is the resilience payoff stated as a footgun: the happy-path build that lets the unlink through passes every test and strands the user.

**The mental model the student leaves with:** "one human, one `user` row, many `account` rows — each `account` is one proof-of-identity, and *linking is a trust transfer between proofs.*" The schema already does the join; the only real questions are **when** the second `account` row gets inserted and **whose word** you took for it.

**Chapter-wide threads to honor.** This lesson reuses, never re-derives: the `account` vs `user` split and the "secret/pointer the user holds ≠ the row" framing (L8: OAuth `account` holds a pointer, not a secret); `safeNext` for any reflected `callbackURL`; the "runs perfectly, protects no one" insecure-default family (L4 `revokeSessionsOnPasswordReset`, L5 `storeToken:'hashed'`, L8 `encryptOAuthTokens`) — account linking's instance is **`trustedProviders` empty/unset = every provider untrusted = silent refuse**, the *inverse* footgun (the unsafe state here is the over-permissive `enabled` without a curated list). The recurring **notification-email** discipline ("tell the user a security-relevant thing just changed") gets its strongest instance here. The recurring **enumeration** discipline does *not* re-appear as a new surface — name it absent on purpose so a reviewer doesn't bolt on a redundant drill.

**Color palette inherited L1–L8** (keep consistent): blue = config knobs, orange = library call / endpoint / callback, green = session/success, **violet = the hinge (here: the trust-transfer + the two-row post-link state + the unlink guard)**, red = the insecure variant / attacker.

**No live sandbox** (Better Auth is server-side against Postgres; ReactCoding is react-family only, per memory). Checks of understanding are decision/classification/recall: a `StateMachineWalker` decision tree is the single decision artifact (do *not* also ship the chapter-outline's comparison table — the L5/L6/L7 "one artifact, not two" rule), a `Buckets` keystone classifying outcomes, an MCQ probing the dangerous-combination judgment. Two `DiagramSequence`s carry the two link paths.

**Estimated student time:** 30–40 min. Cognitive-load order (model before wiring, mirrors the whole chapter): one-human-many-accounts schema recap → the three config knobs → link-on-sign-in (implicit) → link-from-settings (explicit, the senior-preferred first link) → unlink + the guard → the security trade (`trustedProviders` / `allowDifferentEmails`) consolidated → recovery-as-resilience payoff.

---

## Lesson sections

### One human, many credentials

**Goal:** install the mental model before any config, by recapping the schema the student already owns and naming the one open question.

- Open with the **senior question** as a concrete narrative (reuse the chapter-outline's Ada story, it's good): Ada signs up email+password in January with `ada@acme.com`; in March she clicks "Sign in with Google" with the same email. Two futures — a *second* `user` row (her data now lives in two disconnected accounts, a support nightmare) or the system recognizes the email match and attaches Google to her *existing* `user`. The fork is one config block.
- Recap the schema, **reused not re-derived** from Ch 052 / L8: one `user`, many `account` rows; each `account` carries `(providerId, accountId)`. Pre-link state = one `user` + one `account` (`providerId:'credential'`, holds the password hash). Post-link state = one `user` + two `account` rows (`'credential'` + `'google'`). Sign-in via *either* row resolves to the **same** `user`. State the takeaway plainly: **the schema already does the join — the only question is when the second `account` row gets inserted, and on whose authority.**
- Land the spine sentence here: **linking is a trust transfer between proofs of identity.** Each `account` row is one proof; adding one says "I believe this new proof belongs to the same human as the existing one."

**Components:**
- Lesson-specific `.astro` figure: a **before/after row-card pair** showing the `user` row unchanged in the middle, one `account` (`credential`) on the left → two `account` rows (`credential` + `google`) on the right, both pointing at the same `userId`. Echo the **Ch 052 ER-diagram colors** and match the visual language of L1's `rows-after-signup`, L3's `token-two-secrets`, L8's `account-row-after-oauth` (this is the same family — the row-card is the chapter's recurring schema-state visual). Path `src/components/lessons/053/9/accounts-before-after-link.astro`. Wrap in `<Figure>` with a caption naming "same `user`, second `account`." **Pedagogical goal:** make "linking = one more row against the same user" literally visible, so the rest of the lesson is about *gating* that insert, not about plumbing.

**Terms:** `account` vs `user` (re-`Term` once for direct landers — short, points back to Ch 052); `providerId` / `accountId` (the latter = the provider's stable user id, the OIDC `sub` from L8 — safe to log).

---

### Turning linking on: three knobs

**Goal:** show the `account.accountLinking` config block and frame each knob as the decision it encodes, not a setting to copy.

- The config lands in `lib/auth.ts` under a top-level **`account`** key (sibling of `emailAndPassword` / `socialProviders`), specifically `account: { accountLinking: { enabled, trustedProviders, allowDifferentEmails } }`.
- **Critical correction carried from L8 (verify in step 6, see Scope/fact-check): `accountLinking.enabled` defaults to `true` in current Better Auth.** So `enabled` is *not* the on-switch the chapter-outline implies. What was actually gating L8's refuse branch is the **empty `trustedProviders` list** — linking is "on" but trusts nobody, so a same-email OAuth sign-in *refuses* (`account-not-linked`) rather than links. Frame the block as **"linking is already on; what you're configuring is *trust* and *match policy*"**, not "switching linking on." This reframing is the single most important correction in the lesson — present `trustedProviders` as the real hinge.
- Walk the three knobs:
  - **`enabled`** — defaults `true`. With it `false`, OAuth sign-in to an email that already has a user *always* refuses with `account-not-linked` (no linking attempted, ever). Leave it true; the gate you actually want lives in the next knob.
  - **`trustedProviders`** (the violet hinge) — the allowlist of providers whose `email_verified` claim you'll trust enough to **auto-link on email match**. Google and GitHub qualify in 2026 (strong verified-email signals); Twitter/X does **not** (no reliable `email_verified`). **No default list** — unset means nobody is trusted, which is why L8 refused. This is a curated security decision: a provider goes on the list only when its verified-email signal is trustworthy.
  - **`allowDifferentEmails`** — defaults **`false`** (the senior default). `false` = linking only ever happens on an exact email match. `true` = a user can link a provider whose email differs from their account email (Ada signs up `ada@personal.com`, later links Google `ada@acme.com`). Deferred to its own decision in the security-trade section — name it here, justify it later.
- Note explicitly that **`trusted` providers must also be configured as actual `socialProviders`** (L8) — you can't trust a provider you haven't wired.

**Components:**
- `AnnotatedCode` (ts) over the `accountLinking` block, ~3 steps. Step 1 blue on `account: { accountLinking: {` (where it lives, sibling key). Step 2 **violet on `trustedProviders: ['google', 'github']`** (the real hinge — the trust decision). Step 3 blue on `allowDifferentEmails: false` (the match-policy default, "we'll come back to this"). Keep `enabled: true` visible but unhighlighted with a one-line prose note that it's already the default. `maxLines` default fine (block is tiny).
- `:::caution` immediately after: **enabling linking without curating `trustedProviders` is the footgun** — but spell out the *correct* version of the danger (not the chapter-outline's "every provider becomes trusted", which is backwards now that the list has no default). The real danger is **adding a provider to the list whose `email_verified` you shouldn't trust** (e.g. a provider that reports verified without verifying), which silently auto-links an attacker on a forged email match. The empty-list state is *safe but inert* (refuses); the over-trusting list is the dangerous one.

**Terms:** `trustedProviders`, `account-not-linked` (re-`Term` from L8 — the refusal code), `email_verified` (a provider *claim*, not a guarantee — L8 thread, re-`Term` once).

---

### Linking on sign-in: the implicit path

**Goal:** walk the path that fires automatically when a returning user signs in with a new provider on a matching, trusted email — and show why it needs a "we linked your account" notification.

- The flow, **reusing L8's find-or-create lookup, not re-deriving it**: Ada (existing `'credential'` user, `ada@acme.com`) clicks "Sign in with Google." Callback runs the L8 lookup — no `(google, accountId)` row yet, so it falls to the email branch; finds her existing user by email; checks **Google is in `trustedProviders`** → inserts a new `account` row (`providerId:'google'`) against her existing `user`; signs her in. One Google click, no separate consent-to-link step.
- **The sharp edge to land precisely (verified June 2026):** a provider on `trustedProviders` **auto-links even when the provider does not confirm `email_verified`** — being on the trusted list *is* the trust; the library does **not** additionally require an `email_verified:true` claim for trusted providers. The Better Auth docs themselves flag this as an account-takeover risk. So `trustedProviders` is a *stronger* trust transfer than "trust this provider's verified-email claim" — it's "auto-link this provider on email match, verified or not." This makes the curation of the list (next-but-one section) the entire security boundary. Do not frame trusted-linking as gated on `email_verified` — it isn't.
- This is the branch L8's diagram labeled **"link"** — the same find-or-create node, now with trust configured so it resolves to link instead of refuse. Make the connective tissue explicit ("this is the branch L8 left as `account-not-linked`"). (Note the diagram's trust-check node, below, is "provider trusted?" — **not** "`email_verified`?"; keep it accurate to the verified behavior.)
- **The UX obligation:** implicit linking is *surprising* — Ada clicked "sign in," not "connect Google." Surface a one-time **"We've linked your Google account to your existing sign-in"** toast/banner on landing, **and** (the security-grade version) fire the **notification email** ("a new sign-in method was added to your account"). This reuses L8's `databaseHooks` side-effect seam and the Unit-7 `sendEmail` pipeline — name it, don't rebuild it. Tie to the chapter's recurring notification discipline.
- **Honest framing:** implicit on-sign-in linking is the *convenience* layer, acceptable for "forgivable email matches" with a trusted provider. The senior-preferred path for a *first* link is the explicit one (next section) — implicit linking trades a confirmation step for convenience and leans entirely on the `email_verified` claim being honest.

**Components:**
- `DiagramSequence` (the load-bearing visual for this section): **link-on-sign-in**, ~5 steps. Click Google → callback runs find-or-create → email matches existing user **and provider is trusted** (**violet** node, the trust check — label it "provider in `trustedProviders`?", *not* "`email_verified`?") → insert second `account` row (green, the row appears against the same `userId`) → signed in + notification fired. Caption must connect to L8 ("the `link` branch of L8's lookup, now configured"). Wrap in `<Figure>`.

**Terms:** none new (all carried). Optionally re-`Term` `databaseHooks` (L8) at the notification mention.

---

### Linking from settings: the explicit path

**Goal:** build the senior-preferred first-link flow — an already-signed-in user deliberately connecting a provider — and land the `linkSocial` call + the elevation requirement.

- The flow: Ada is **already signed in**. She goes to `/settings/security/accounts`, sees her current sign-in methods, clicks **"Connect Google."** The client calls **`authClient.linkSocial({ provider: 'google', callbackURL: '/settings/security/accounts' })`**. This kicks the *same* OAuth redirect → consent → callback round-trip as sign-in (L8), but because she's already authenticated the callback **inserts the new `account` row against her current `user`** instead of doing a find-or-create. She lands back on the settings page with Google now listed.
- **Why this is the senior-preferred path for the first link:** it carries **explicit user intent and consent** — she chose "connect," she saw the Google consent screen, there's no surprise. Implicit on-sign-in linking is the convenience layer *on top of* this; the explicit path is the floor.
- **Not a Server Action** — like L8's OAuth start, `linkSocial` triggers a *redirect*, so there's no FormData/Zod/`Result` boundary on the start; the **callback** (catch-all, L8) is the boundary. Don't force the five-seam skeleton (consistent with L8's "no Server Action on the OAuth start" note). The button is a small `'use client'` island; the settings page itself stays a Server Component that reads the user's existing `account` rows to render the list.
- **The elevation requirement (the security gate on this path):** linking from settings is a **security-posture change**, so it must sit behind **`freshAge` elevation** (Ch 052 / Code conventions — re-prove the password / require a fresh session before the link is allowed). A stale or borrowed session shouldn't be able to attach a new permanent sign-in method. Name the `requires-re-authentication` `Result` code as where a too-old session surfaces (the Code-conventions pattern — re-prompt for password, refresh, retry), consistent with L6's elevation spine. Don't build the generic re-auth modal (deferred to Ch 054 L2) — name it as the gate this action sits behind.
- The settings page also surfaces **`scopes` on demand** here: mention (one line, from L8's incremental-scope thread) that `linkSocial({ provider, scopes })` is how a feature later adds a provider scope at the moment the user opts in — this is the mechanism L8 named and deferred. Don't expand it.

**Components:**
- `CodeVariants` (tsx) or two small `Code` fences grouping the **two faces** of the explicit link: (a) the client `"use client"` button calling `authClient.linkSocial({...})` (orange on the call); (b) a sketch of the **elevation gate** — the action/route checking `session.freshAge` and returning `err('requires-re-authentication')` when stale (violet on the gate). Keep both short. Prefer `CodeVariants` titled tabs ("Connect button (client)" / "Elevation gate") so the student sees the call and its guard side by side without a wall of code.
- `DiagramSequence` **link-from-settings**, ~5 steps, the deliberate mirror of the on-sign-in sequence: signed-in user clicks Connect → **elevation check** (violet, re-prove freshness) → OAuth redirect + consent → callback inserts `account` row against current user (green) → back on settings, provider listed. Caption contrasts with the implicit path ("intent + consent up front; the row attaches to the session's user, no find-or-create"). Wrap in `<Figure>`. The matched-pair framing (implicit vs explicit, same two diagrams side-conceptually) is the comparison artifact — this is why the chapter-outline's comparison *table* is cut.

**Terms:** `freshAge` / elevation (re-`Term` from L6 / Ch 052 — re-proving credentials despite a live session); `linkSocial`.

---

### Unlinking and the last-method guard

**Goal:** build unlink, then land the guard that refuses to leave a user with no way back in — the resilience payoff framed as a footgun.

- The same settings page surfaces **"Disconnect Google."** The call is **`authClient.unlinkAccount({ providerId: 'google' })`** (also pass `accountId` when a user has *multiple* accounts under one provider — edge, name it once), which deletes that `account` row. After unlink the user has one fewer sign-in method.
- **The guard (the hinge of this section):** unlink must **refuse if it would remove the user's *only* sign-in method.** A user with just a Google `account` and no `'credential'` row who disconnects Google has **locked themselves out** — no password, no remaining provider, no way in. The senior reflex: before deleting, count the user's remaining sign-in-capable `account` rows; if this is the last one, refuse and surface **"You can't disconnect your only sign-in method — set up a password first."**
- **Better Auth already protects this by default (verified June 2026), but the senior owns the UX:** if a user has only one account, `unlinkAccount` is **prevented by default** to stop lockout — overridable with **`account: { accountLinking: { allowUnlinkingAll: true } }`** (leave it at the default `false`). So you usually don't write the count-and-refuse logic yourself; the library blocks the delete. What's yours is turning the library's hard rejection into a **helpful "set up a password first" off-ramp** — catch the rejection and render the actionable copy + a link to the add-password flow, rather than surfacing a raw error. Frame it: the library stops the footgun, the senior makes the dead-end a door.
- **Frame the resilience stakes** as the inverse of the chapter's "runs perfectly, protects no one" family: here Better Auth *defaults to safe* (it refuses the last-method unlink), so the footgun is the developer who flips `allowUnlinkingAll: true` for "flexibility" and re-opens the lockout, or who surfaces the library's raw refusal as a confusing error instead of an actionable off-ramp. The missing test is "unlink the last method → user gets a helpful next step, not a dead end."
- This naturally sets up the resilience payoff (next section): the reason multiple linked methods are *good* is exactly that losing one isn't a lockout.

**Components:**
- `Code` (tsx) fence: the unlink button calling `authClient.unlinkAccount({ providerId })` (orange) **plus the `{ error }`-handling branch** that catches the library's last-account rejection and routes to the "set up a password first" copy (green/violet on the handled branch). The teaching point is *handling the library's refusal well*, not hand-rolling the count — so don't show a manual count-and-refuse as if the library didn't already guard it. A `:::note` can name `allowUnlinkingAll` as the (default-`false`, leave-it) override that would *disable* this protection.
- `:::danger`: **never set `allowUnlinkingAll: true` without a guaranteed alternative sign-in path** — disabling the default last-method protection ships a lockout generator; the one-line rule.

**Terms:** `unlinkAccount`.

---

### The trust you're transferring

**Goal:** consolidate the security model — `trustedProviders` and `allowDifferentEmails` — now that the student has seen both link paths. This is the section the whole lesson builds toward.

- State the attack plainly: **linking transfers trust — "whoever controls this Google identity is the same person who knows this password."** Sharpen it with the verified behavior: a trusted provider **auto-links on email match even without an `email_verified` claim**, so trust lives entirely in *which providers you put on the list*. If a listed provider's identity for `ada@acme.com` falls into an attacker's hands (provider bug, Workspace edge, a domain-takeover where an attacker stands up a Google account on Ada's domain), the attacker can **link into Ada's account and sign in without ever knowing her password.** The password stops being the only thing protecting the account. (Better Auth's own docs flag trusted auto-linking as an account-takeover risk — quote the spirit of it.)
- The **layered mitigations**, each tying back to something already built:
  - **`trustedProviders` allowlist — curated tightly.** A provider earns the list only when *you* judge its identity-for-an-email trustworthy; an untrusted provider refuses (`account-not-linked`) instead of linking. This is the whole boundary — there is no `email_verified` backstop for trusted providers.
  - **Elevation on link-from-settings** (`freshAge`, prior section) — the explicit path re-proves the user before attaching a method.
  - **Notification email** on every new sign-in method (the on-sign-in section's obligation) — even if a link slips through, the legitimate user is told immediately and can act.
  - **Audit-log the linking event** — named once as the durable record; the audit-log *table* is Ch 057, so this is a forward-pointer, not a build.
- **`allowDifferentEmails: true` — when it earns the call** (the second judgment): the deliberate reach for products where a user legitimately wants to use, e.g., a personal Google to sign into a work-email account. The cost: you **lose the email-match signal**, which was the implicit-trust anchor. Therefore `allowDifferentEmails: true` is **only safe paired with explicit, elevated link-from-settings** — never with implicit on-sign-in linking. Spell out **the dangerous combination** as its own beat: `allowDifferentEmails: true` + implicit on-sign-in linking = the library would attach a provider with a *different, unverified-against-this-account* email automatically. Default `false`; flip only when the product specifically needs the multi-email pattern, and only behind the explicit path.
- Briefly: the **primary-identifier / canonical-email** question. A user with `'credential'` (`ada@acme.com`) + Google (`ada@acme.com`) + (after `allowDifferentEmails`) GitHub (`a.lovelace@gmail.com`) has several addresses across `account` rows; **`user.email` holds one canonical address** (the original by default), used for outbound mail, profile display, audit identity. Changing the canonical is a *separate* flow (Ch 054 L2) with a *different* threat model — **don't conflate account-linking with canonical-email change** even though they share schema. One sentence + the forward-pointer.

**Components:**
- `StateMachineWalker` (`kind="decision"`, the single decision artifact for the lesson — do **not** also ship a comparison table): **"Should this provider auto-link, and how?"** Walk the senior question order: *Do you trust whoever controls a given email at this provider to be that account's owner?* (i.e. is its identity-for-an-email strong enough to auto-link **without an `email_verified` backstop**) → no → **Leaf: keep it off `trustedProviders` (it'll refuse with `account-not-linked`, which is correct)**; yes → *Do you need to link providers across different emails?* → no → **Leaf: `trustedProviders:[...]`, `allowDifferentEmails:false`, on-sign-in linking is fine**; yes → *Will linking be gated behind explicit, elevated settings-flow?* → no → **Leaf: stop — `allowDifferentEmails:true` + implicit linking is the dangerous combination; require the explicit path first**; yes → **Leaf: `allowDifferentEmails:true`, link-from-settings only, elevated + notified.** The lesson lives in the *order* of these questions (trust before multi-email before gating). Don't wrap in `<Figure>` (the walker is its own card).
- `MultipleChoice` (multi-select, judgment not recall): "Which of these is/are unsafe?" with the **dangerous combination** as a correct pick, plus decoys like "auto-linking a same-email Google account" (safe — trusted) and "requiring a password before linking from settings" (safe — that's the mitigation). Probes whether the student internalized *which* combination is the risk, not just definitions.

**Terms:** `email_verified` (reused), `domain takeover` (one-line `Term` — the concrete way `email_verified` goes wrong), `canonical email` (the one address on `user`).

---

### More ways in, fewer ways out

**Goal:** end on the positive payoff — multiple linked methods are a *resilience* feature — so the student leaves with linking framed as user-protective, not just a risk to manage.

- The flip side of the unlink guard: a user with **two or more linked methods can recover from losing one.** Forgot your password? Sign in with Google, then reset the password from settings. Lost access to Google? Your password still works. Each linked method is a redundant door.
- This is the **same recovery principle the whole chapter returns to** (L6 recovery codes, L7 passkey fallback): *a credential the user can lose should have another way in established before they lose it.* Account linking is one more instance — linking *is* a recovery strategy.
- Concrete UX: surface **"You have N sign-in methods"** with the list in settings (the same surface that powers connect/disconnect). Encourage users to keep at least two. This closes the loop with the unlink guard — the guard exists precisely to protect the resilience this section celebrates.
- Brief closing tie-back to the chapter: this was the last flow. The student now has every Better Auth credential path — password lifecycle (L1–L4), magic link (L5), TOTP + passkeys (L6–L7), OAuth (L8), and now the linking that lets one human hold several of them against one account. The senior judgment threaded through all nine — *which* flows to enable per product — is the chapter's real deliverable; linking is what makes "enable several" coherent rather than chaotic.

**Components:** prose-only is fine here (short, motivational close). Optionally a tiny `Card`/`CardGrid` "you have N sign-in methods" mock of the settings list (password ✓, Google ✓, "+ add passkey") — *optional, not load-bearing*; prose carries it if not built.

**Terms:** none new.

---

### External resources

Four `ExternalResource` cards:
- Better Auth — Account linking docs (the `accountLinking` config, `trustedProviders`, `allowDifferentEmails`).
- Better Auth — `linkSocial` / `unlinkAccount` client API reference.
- Better Auth — Sessions & `freshAge` / fresh-session reference (the elevation gate).
- OWASP — Authentication / account-linking guidance (the trust-transfer threat framing) — or the OWASP Authentication cheat sheet if no dedicated linking page.

---

## Scope

**Prerequisites to recap concisely (do not re-teach):**
- The `account` vs `user` schema split and `(providerId, accountId)` (Ch 052 L2) — one row-card recap, no ER-diagram rebuild.
- The OAuth flow + **find-or-create lookup** + the `account-not-linked` refuse branch (L8) — *reused verbatim as the substrate*; this lesson configures the trust that branch was waiting for, it does not re-derive the lookup order.
- `safeNext` open-redirect guard (L2) — applies to any `callbackURL` your code reflects; one-line reminder at the `linkSocial` call site.
- `freshAge` elevation + the `requires-re-authentication` `Result` (Ch 052 / Code conventions / L6's elevation spine) — *named as the gate* link-from-settings sits behind; the generic re-auth modal is **not** built here.
- The Unit-7 `sendEmail` notification seam via `databaseHooks` (L8) — reused for the "new sign-in method" email; not rebuilt.

**Explicitly out of scope (defer, do not teach):**
- **OAuth protocol mechanics** — code-for-token exchange, PKCE, `state` (Ch 051 L3). Linking rides the same redirect; don't re-explain it.
- **Per-provider config and quirks** — Google console setup, GitHub null-email, Apple first-sign-in-only, Microsoft `tenant` (L8). Linking is provider-agnostic here; Google/GitHub are named only as the trustworthy-`email_verified` examples.
- **Change-email / canonical-email at settings** (Ch 054 L2) — shares the `account`/`user` schema but a *different* threat model; named once with a hard "don't conflate" and a forward-pointer, never built.
- **Active-sessions list / session revocation UI** (Ch 054 L3) — the settings *page* this lesson touches will host these later, but only the linked-accounts list is in scope now.
- **The generic re-auth / elevation modal** (Ch 054 L2) — named as the gate, not built.
- **Audit-log table** (Ch 057) — linking should be audited; named as a forward-pointer only.
- **Incremental-scope OAuth flows** — `linkSocial({ scopes })` is named once (L8's deferred mechanism); the on-demand-scope feature flow is not built.
- **Full rate-limit wiring** (Ch 074) — link/unlink endpoints sit behind the same dual-key limiter; named at the call site only, per chapter convention.
- **`genericOAuth()`** for non-built-in providers (named once in L8) — not revisited.

---

## Notes for downstream agents

- **Honor the chapter's verified corrections to the outline.** Two outline claims for *this* lesson are likely stale and must be checked against current Better Auth in step 6, then framed as deliberate:
  1. The outline says `accountLinking.enabled` is the on-switch ("without it, OAuth sign-in … fails with `account-not-linked`. With it, library tries linking"). Per L8's verified continuity note, **`accountLinking.enabled` defaults to `true`** and the *actual* gate is the empty `trustedProviders` list. The lesson is reframed around `trustedProviders` as the hinge — **do not "restore" `enabled` as the on-switch.**
  2. The outline frames the unlink-last-method guard as something the *senior builds* ("refuse the unlink if it would leave the user with no sign-in method"). **Verified (June 2026): Better Auth already prevents last-account unlink by default**, overridable via `account.accountLinking.allowUnlinkingAll` (default `false`). So the lesson teaches *handling the library's built-in refusal well* (the "set up a password first" off-ramp) and the `allowUnlinkingAll` footgun — **not** a hand-rolled count-and-refuse. Don't restore the outline's "you write the guard" framing.
- **Schema-state row-cards are a chapter visual family** — match L1/L3/L8's existing `.astro` files in styling (Ch 052 ER colors). The lesson-specific component path follows the `053/<n>/` convention (L7's `053-7/` was an anomaly — do **not** copy it).
- **One decision artifact only** (the `StateMachineWalker`); the chapter-outline's "link-on-sign-in vs link-from-settings" comparison table is intentionally cut — the two mirrored `DiagramSequence`s + the walker do that work.
- **No new enumeration drill** — the enumeration thread is named-absent on purpose; don't add a `Buckets`/`TrueFalse` enumeration classifier (it'd be the chapter's fourth and would fatigue).
- This is a **decision-archetype, low-new-code lesson** — spend the annotation/diagram budget on the *judgments* (trust transfer, dangerous combination, last-method guard), not on the wiring. The actions are thin by design; don't pad them into full `AnnotatedCode` walkthroughs.
