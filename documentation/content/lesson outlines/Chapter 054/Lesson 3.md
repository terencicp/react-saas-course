# Lesson 3 — Active sessions and revoke-across-devices

- **Title (h1):** Active sessions and revoke-across-devices
- **Sidebar label:** Active sessions

---

## Lesson framing

Third lesson of Chapter 054, and the **payoff for Ch 054 L2**. L2 killed sessions with a *flag* (`revokeOtherSessions: true` rode along on `changePassword`); this lesson hands the user the **surface** to *see* every active session across their devices and revoke them *directly* — one device, all-other devices, or everywhere-including-here. The data model is fully in place (`session` table from Ch 052 L2), the revocation semantics are understood (Ch 053 L4 / Ch 054 L2), and the cookie-cache staleness window was configured in Ch 052 L3 — so almost nothing here is a new primitive. The teaching weight is **three judgment calls** layered on familiar mechanics: which-button-deletes-what, never-revoke-the-current-session-by-accident, and the revocation-isn't-instant truth that the cookie cache forces you to design around.

**The spine.** An active-sessions list is two things at once: a **convenience surface** ("sign out the work laptop I left at the office") and a **security-audit surface** ("when did I sign in from Bangalore? I'm in Boston"). Build `/settings/security/sessions`: a server-trusted list with per-row device/location/recency, current-session detection, a per-row revoke, a "sign out other devices" button, a "sign out everywhere" button — and the "new device signed in" email that turns the list from a passive page into real takeover detection.

**The central distinction the student must leave with (the trap this lesson exists to fix).** Three revoke calls look interchangeable and are not — the difference is **which sessions die and where the user lands**:
- **`revokeSession({ token })`** — kills *one* named session. The selected device is signed out; you stay signed in.
- **`revokeOtherSessions()`** — kills *every session except the current one*. This is the *exact same endpoint* `changePassword({ revokeOtherSessions: true })` triggered in L2 — now surfaced as a button. You stay signed in; every other device is out. The "I think someone got in" button.
- **`revokeSessions()`** — kills *every* session *including the current one*. You are signed out here too and bounced to `/sign-in`. The "log me out of everywhere, yes really, this device too" button.

The mental model: *each call deletes a different set of `session` rows, and the copy on the button must make the set — especially whether the current device goes too — unambiguous.*

**Mental model the student leaves with.** A session is **one `session` row**; the list is just `SELECT * FROM session WHERE userId = ? ORDER BY updatedAt DESC`, read server-side via `auth.api.listSessions({ headers })` (the page is a Server Component, so this is the call face — not the client `authClient.listSessions()`). Each row carries `ipAddress` + `userAgent`, which the *app* parses into a human row ("Chrome on macOS · San Francisco · last active 5 min ago"); Better Auth ships **no** UA/GeoIP helper, so a small server util does it. Revocation is a single `DELETE`: the opaque-session-id model (Ch 051 L2) makes the row's *absence* the revocation — no denylist, no token rotation. The one wrinkle: with the cookie cache on (Ch 052 L3, 5-min default), a revoked session can still read as valid for up to that window on the cached path — so revocation is **eventually** enforced, and the UI says so.

> **VERIFIED against current Better Auth (June 2026).** The four calls are confirmed: `authClient.listSessions()` returns the active-session array; `authClient.revokeSession({ token })` (the stable endpoint keys on the session **token**); `authClient.revokeOtherSessions()` (all but current); `authClient.revokeSessions()` (all, including current). The session row carries `ipAddress` and `userAgent`. **One sharp gotcha for the per-row revoke (downstream agents MUST verify against the installed version):** `list-sessions` may return the `token` field **empty for every session except the current one** (intentional — the token is a credential), and `revoke-session` keys on `token` — so naively wiring "revoke this row by its token" can fail for *other* devices. An open feature request (#6940, Dec 2025) proposes a `sessionId` parameter to close this. Until the installed version supports it, the working pattern is the **bulk** calls (`revokeOtherSessions` / `revokeSessions`, which need no per-row token) plus, for single-device revoke, whichever identifier the installed version actually accepts — **ground the per-row revoke against the installed `revoke-session` signature; do not assume `token` is populated on non-current rows.** There is **no built-in user-agent parser and no built-in GeoIP** — the app provides both (a `ua-parser-js`-style util for device, a GeoIP lookup for approximate location). There is **no documented `maximumSessions` cap option** in the stable core — treat the cap as "named, not built; revisit if compliance demands it," do not invent a config key. The cookie cache is bypassable per-call via **`disableCookieCache: true`** on `getSession` (Ch 052 L3's config knob, re-applicable here). There is **no documented turnkey "new device signed in" hook**; a `databaseHooks.session.*` surface exists but session-level `create.after` is less explicitly documented than the user hooks — install the notification via a **`databaseHooks.session.create.after`** callback (fires when a new `session` row is written, i.e. a fresh sign-in) that compares the new `ipAddress` + `userAgent` against the user's prior rows and emails on a new combination, **and ground the exact hook shape against the installed version**. Downstream agents: do not hardcode a `signIn.after`/`onNewDevice` library hook name.

**Pedagogical pain points to pre-empt.**
- *Why is "this device" special?* A list of identical-looking rows invites the user to revoke the very session rendering the page — booting themselves mid-task. The senior reach is **current-session detection**: the row whose token matches the current cookie gets a "This device" badge and is *guarded* (no per-row revoke, or an explicit "this signs you out here" confirm). Make this the first design move, not an afterthought.
- *Why isn't revoke instant?* Beginners assume `DELETE` = immediate sign-out everywhere. With the cookie cache on, a still-open tab on the revoked device keeps working for up to 5 minutes (it's reading the cached decode, not the DB). This is the one genuinely surprising behavior; name it, show where the latency comes from, and put it in the user-facing copy.
- *`revokeOtherSessions` vs `revokeSessions` — the copy trap.* "Sign out everywhere" is ambiguous: does it include this device? Conflating the two endpoints in button copy is the field mistake. Force the distinction: "sign out other devices" (you stay) vs "sign out everywhere, including this device" (you go).
- *The list is detection only if someone looks.* A page nobody visits catches no breach. The list earns its security value when paired with the **push** signal — the "new device signed in" email that drives the user *to* the list with a "wasn't you?" CTA.
- *Elevation carries forward (the L2 thread).* The sessions page sits behind the L1 proxy gate ("signed in") — but revoking another user's sessions is a takeover-grade action; a borrowed laptop must not silently nuke the real owner's other devices. The page's mutations belong behind elevation, the L2 distinction re-applied (named, not re-built).

**Inherited conventions that MUST hold (a reviewer grounding on the chapter outline alone will try to restore stale shapes).**
- **Color palette (Ch 053 L1–L8, Ch 054 L1–L2):** blue = parse/config knobs, orange = library call / endpoint work, green = session/success / a live session, **violet = the hinge / load-bearing move** (here: current-session detection *and* the revoke-scope choice), red = the attacker / hostile-but-live session. The chip vocabulary is the established `.sar-chip` language from Ch 053 L4's `sessions-after-reset.astro` and Ch 054 L2's `sessions-after-change.astro` — reuse it so the three figures read as one continuous visual language.
- **Two call faces of one instance:** the *page* (Server Component) reads via `auth.api.listSessions({ headers: await headers() })` (throws `APIError`, wrapped in the read ladder); the *client* revoke buttons fire `authClient.revokeSession(...)` / `revokeOtherSessions()` / `revokeSessions()` (return `{ data, error }`). Do not rebuild the list client-side from any client-readable state — it is a **server-trusted read**.
- **`mapXError` discipline:** any revoke that surfaces a failure translates via `mapXError` keyed on numeric HTTP `status`, codes read off `$ERROR_CODES`, never hardcoded; never expose Better Auth messages.
- **Session invalidation is opt-in / explicit** (the Ch 053 L4 + L2 thread): the list is where `revokeOtherSessions` — the flag in L2 — becomes a *user-triggered button*. Same endpoint, two entry points.
- **`disableCookieCache` and the staleness window** are Ch 052 L3's config; this lesson *reads* the consequence and may *apply* `disableCookieCache: true` on the `/settings` subtree, it does not re-explain the cookie-cache mechanism.
- **`useActionState` form wiring is Ch 044 L3** (the chapter's standing correction over Ch 045) — the revoke buttons are Server-Action-backed; named, not re-taught.

**No live sandbox** — Better Auth is server-side against Postgres; `ReactCoding` is react-family only (repo memory). Checks of understanding are recall / classification / decision, consistent with the whole chapter.

**Slug:** `/054-the-signed-in-session/3-active-sessions-and-revoke/`. Frontmatter mirrors the chapter: `chapter-id: 54`, `course-progress` per the chapter's running value, `sidebar.order: 3`, `title`/`label` per above. Open with `<CourseProgressBar value={frontmatter['course-progress']} />` as every lesson does.

**Lesson type:** mechanics + pattern hybrid. The list rendering and the three revoke calls are mechanical (the student owns Server Components, the read ladder, and Server-Action buttons cold) — so they ship as **plain `Code` fences, not `AnnotatedCode` walkthroughs**. The annotation budget is spent on the **`revokeSession`/`revokeOtherSessions`/`revokeSessions` comparison table**, the **current-session-detection figure**, and the **cookie-cache staleness `DiagramSequence`** — where the new thinking lives. Flag this as intentional for downstream agents.

---

## Lesson sections

### Introduction (no header)

Warm, brief, per lesson structure. Connect backward in two sentences: Ch 054 L2 killed the old credential's sessions with a *flag* the user never saw; this lesson hands the user the *surface* to see every device they're signed in on and revoke any of them on demand. State the goal: build `/settings/security/sessions` — a server-trusted list with per-device detail, a per-row revoke, a "sign out other devices" button, a "sign out everywhere" button, and the "new device signed in" email that turns the list into real breach detection.

Pose the senior questions as a short bulleted list (the chapter's intro format):
- A user is signed in on a phone, a laptop, and a desktop — three `session` rows. How do they see the list, and how does the page avoid letting them accidentally sign *out the session reading the page*?
- Three revoke calls — one device, all-other devices, everywhere-including-here — which is which, and how must the button copy disambiguate them?
- A `DELETE` ran on the session row; why might the revoked device keep working for a few minutes anyway?
- A list nobody opens catches no breach — what turns this page from passive into active takeover detection?

Draw the boundary up front (the chapter pattern): this lesson does **not** re-configure the cookie cache (Ch 052 L3), build an audit-log table of sign-in/revoke events (Ch 057), do IP anomaly detection beyond the one email (Ch 074), or build the multi-session account-switcher UI (named, not built). Each is named at its seam.

**Term candidates:** none new in the intro — reuse is fine.

### One row per device: the session list as a server-trusted read

**Senior question:** the user wants to see everywhere they're signed in — where does that list come from, and why must it never be rebuilt on the client?

This section grounds the data before any UI, the chapter's model-before-code discipline. The whole lesson is "render rows, then delete rows" — so nail what a row *is* first.

Content:
- **The data model, already in place** (Ch 052 L2, one clause — do not re-derive the schema): one `session` row per active session, columns `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`. The list is conceptually `SELECT * FROM session WHERE userId = ? ORDER BY updatedAt DESC` — most-recently-active first.
- **The call, and the call face that matters:** the page is a **Server Component**, so the list is read with **`auth.api.listSessions({ headers: await headers() })`** — the server face, wrapped exactly like the rest of the read ladder (Ch 052 L4 posture). The client face `authClient.listSessions()` exists and returns the same typed array, but the *list itself* is a **server-trusted read**: render it on the server and pass the rows down as props. State the watch-out here: do **not** fetch-and-render the list from client state the user could tamper with — the security value of "these are your real sessions" depends on the server being the source.
- **Why opaque-session-ids make this cheap** (callback to Ch 051 L2, one sentence): each row *is* a session — there's no JWT to decode, no denylist to consult. The list is just rows; the revoke (next sections) is just `DELETE`. Plant the contrast that pays off in the closing: a JWT model would need a denylist consulted on every request.
- **`rememberMe` sessions look identical in the list** (Ch 053 L2, one clause): a `rememberMe: true` session has a longer `expiresAt`, a `rememberMe: false` one a shorter server-side life — but both render as ordinary rows. Senior reflex: **don't** surface "remember me" in the UX; users think "the laptop I was on yesterday," not in cookie-lifetime terms.

**Component — a `FileTree`** of the small surface (`app/(app)/settings/security/sessions/page.tsx`, `actions.ts` for the revoke Server Actions, `_components/{session-list,session-row,sign-out-everywhere}.tsx`, and `lib/parse-user-agent.ts` for the device util), so the student sees the shape before the code. Lean to `FileTree` + prose; do not over-build.

**`Term`s:** `Server Component` (re-`Term` lightly only for a direct lander — "renders on the server; the call face is `auth.api.*`, and the result ships as serialized props"), otherwise reuse.

### Reading the row: device, location, and "this device"

**Senior question:** `ipAddress` and `userAgent` are opaque strings — how do they become a row a human can audit, and how does the page mark the one session the user is *currently* using?

This is the per-row UX and the **first violet hinge** (current-session detection). It's where the raw columns become an audit surface.

Content:
- **Parsing the row** (Better Auth ships no helper — say so): the app turns the opaque columns into human text in a **server util**.
  - *Device* — parse `userAgent` into "Chrome on macOS", "Safari on iPhone". A small library (`ua-parser-js`-class) in `lib/parse-user-agent.ts`, run server-side. Never trust the UA for security (it's client-controlled) — it's *display only*, an audit hint.
  - *Location* — parse `ipAddress` into an approximate "San Francisco, CA" via a GeoIP lookup. **Conditional on privacy posture and product** — approximate, never precise; some products omit it. Frame it as a senior toggle, not a default.
  - *Recency* — `createdAt` → "signed in 3 days ago", `updatedAt` → "last active 5 minutes ago" (relative time).
- **Current-session detection (the violet hinge):** the row whose `token` matches the current session cookie is **the device reading this page**. Mark it with a **"This device"** badge and *guard* it — either no per-row revoke button at all, or a per-row revoke that swaps to a distinct "this signs you out here" confirm. The senior reach: *never let the user revoke the session they're using without an explicit, differently-worded confirm* — silent self-revoke is the field mistake (watch-out, landed here).
- **The privacy watch-out:** `ipAddress` / `userAgent` are sensitive; do not let them leak into error breadcrumbs / Sentry (watch-out, landed here, one clause).

**Component — a lesson-specific figure (`session-row-anatomy.astro`, build at `src/components/lessons/054/3/`), wrapped in `<Figure>`.** Reuse the `.sar-chip` chip vocabulary (Ch 053 L4 / Ch 054 L2) for visual continuity. Show a **stacked list of three session chips** as the user sees them, each annotated with callout labels pointing at *where each piece comes from*:
- Row 1 — "Chrome on macOS · San Francisco · last active 2 min ago", green/live, carrying a **violet "This device" badge** and **no revoke button** (the guarded current session).
- Row 2 — "Safari on iPhone · San Francisco · last active 3 days ago", neutral/live, with a "Sign out" button.
- Row 3 — "Firefox on Windows · **Bangalore** · last active 1 hour ago", neutral/live but the location subtly flagged (the "you're in Boston" recognition moment), with a "Sign out" button.
Callouts map: `userAgent` → device text, `ipAddress` → location text, `updatedAt` → "last active", token-match → the "This device" badge. Pedagogical goal: make "the opaque columns become a human, auditable row" and "the current session is special" both single-glance facts. `<Figure>` caption: "Two opaque columns — `userAgent` and `ipAddress` — and the cookie's token become a row a human can audit. The session reading this page is badged and guarded."

**`Term`s:** `userAgent` (re-`Term` lightly: "the browser's self-reported identity string; display-only, never trusted for security"), `GeoIP` ("approximate geographic lookup from an IP address — city-level at best").

### Three ways to revoke: one device, the others, or everywhere

**Senior question:** the user wants to kill sessions — but "kill which?" is three different questions with three different endpoints. Which call for which intent, and what does each leave standing?

This is the **second violet hinge** and the lesson's mechanical core: the three calls, and the copy that makes the scope unambiguous. Structure it call-by-call, then lock it with the comparison table.

Content:
- **`revokeSession({ token })` — kill one device.** `authClient.revokeSession({ token })` keys on the session **token**. The library `DELETE`s that one row; the cookie holding that token is invalid on its next request (the validating read returns null and the L1 proxy redirects). Senior reflex: **confirm before revoking a non-current session** ("Sign out the session on Chrome / macOS?") — it's irreversible (the user just re-signs-in on that device, but it's still a deliberate action). Wire it as a per-row Server-Action button. **The version gotcha to surface honestly (don't paper over it):** `list-sessions` may return the `token` *empty* for every row except the current one (the token is a credential, intentionally withheld), so a per-row revoke that reaches for the row's token can fail on *other* devices on those versions — downstream agents must wire this against whatever identifier the installed `revoke-session` accepts. The robust always-available controls are the two **bulk** buttons below (they need no per-row token); treat per-row single-device revoke as version-dependent.
- **`revokeOtherSessions()` — kill every device but this one.** `authClient.revokeOtherSessions()` deletes every session except the current. **This is the same endpoint `changePassword({ revokeOtherSessions: true })` fired automatically in L2** — name the parallel explicitly: *the flag in L2 and this button are the same revocation, two entry points.* The current session survives, so the user stays signed in here. This is the **"I think someone got into my account"** button — surface it prominently on `/settings/security/sessions`, not buried.
- **`revokeSessions()` — kill everything, including here.** `authClient.revokeSessions()` deletes *every* row, the current included. The library clears the current cookie (via `nextCookies`), so the user is signed out *on this device too* and bounced to `/sign-in`. This is the **"log me out of everywhere, yes really, this device too"** button — distinct from `revokeOtherSessions`. UX: a single confirm ("You'll need to sign in again on this device too.") then the call.
- **The copy is the safety mechanism (land the watch-out here):** "sign out everywhere" alone is ambiguous about whether *this* device goes. Force the wording: **"Sign out other devices"** (`revokeOtherSessions`, you stay) vs **"Sign out everywhere, including this device"** (`revokeSessions`, you go). Conflating the two in copy is the field mistake this section exists to prevent.
- **What happens server-side (the one-statement truth):** every revoke is a single `DELETE FROM session WHERE token = ?` (or `WHERE userId = ?` for the bulk calls) — **no token blacklist, no JWT rotation, no cache invalidation beyond the cookie-cache window** (next section). The opaque-session-id model (Ch 051 L2) makes the row's absence *be* the revocation. Senior contrast (pays off the plant from §2): a JWT-based session would need a denylist consulted on **every** request, doubling the per-request lookup — one more reason the cookie+row default earns its place.

**Component — a comparison table (the chapter outline calls for it explicitly), wrapped in `<Figure>` or as a plain Markdown table.** Three rows (`revokeSession` / `revokeOtherSessions` / `revokeSessions`), columns: **What it deletes** ("one named row" / "all rows but current" / "all rows incl. current"), **The current session** ("untouched" / "survives" / "killed — you're signed out here"), **Where the user lands** ("stays" / "stays" / "→ `/sign-in`"), **The right button copy** ("Sign out this session" / "Sign out other devices" / "Sign out everywhere, incl. this device"), **Also triggered by** ("—" / "`changePassword({ revokeOtherSessions: true })` — Ch 054 L2" / "—"). Pedagogical goal: collapse three confusable calls into one glanceable contrast where the differentiator (does the current session die?) is the load-bearing column. This table is the section's anchor.

**Component — the two action wirings as plain `Code` fences** (`revoke-actions`, `title=".../settings/security/sessions/actions.ts"`): the per-row `revokeSession` action (takes the row token) and the two bulk actions. Five-seam skeleton, Nth repetition — line-highlight (`data-mark-color="violet"`) the call that differs in each. `CodeTooltips` on the three calls: one-line each ("deletes this one session" / "deletes every session but the current" / "deletes every session, including the current"). Imports stripped per MDX rules.

**`Term`s:** none new — `Server Action`, opaque session id owned.

### Revoke isn't instant: the cookie-cache staleness window

**Senior question:** the `DELETE` ran — so why does the revoked device keep loading pages for the next few minutes?

This is the lesson's genuinely surprising fact and the **third teaching beat**. Ch 052 L3 *configured* the cookie cache; this section makes the student *feel its consequence* on revoke and design the copy around it.

Content:
- **The mechanism, re-grounded in one clause** (Ch 052 L3 owns the config — do not re-explain the cache itself): Better Auth caches the decoded session for a short window (5-min default `maxAge`) to skip a DB hit per request. The cached path reads the *decode*, not the row.
- **The consequence on revoke:** after `revokeSession`, the row is gone — but a still-open tab on the revoked device may keep reading the *cached* session for up to that window. So revocation is **eventually** enforced, not instantly: the next *un-cached* read (cache expiry, or a path that bypasses it) returns null and the proxy redirects. This is the gap between "I clicked revoke" and "that device is actually out."
- **The senior trades** (decisions, not a fixed answer):
  - *Shorten `maxAge`* for products where revocation latency is a real risk (lower cache = fresher reads = more DB hits — the trade is explicit).
  - *Bypass the cache on the sensitive subtree* — apply **`disableCookieCache: true`** on the `/settings` (or the whole authed) read so those validating reads always hit the DB. Ch 052 L3's config knob, re-applied here, not re-explained.
  - *Tell the user the truth in the copy* — don't pretend the cache is gone. The post-revoke toast should hint: "Session revoked. It may take a few minutes to take effect on tabs that are currently open."
- **Do not pretend it's instant** (watch-out, landed here): a UI that says "Signed out" with certainty while the cache window is open is lying; the honest copy sets the right expectation.

**Component — a `DiagramSequence` (`revoke-staleness`), the section's load-bearing visual.** Reuse the palette. A short temporal walk showing *why* the revoked device lingers — one timeline, the cookie-cache window as the protagonist:
1. **t=0 · Revoke clicked** (violet) — "On the laptop, the user revokes the phone's session. `DELETE FROM session` runs — the row is gone."
2. **t=0 · The row is gone, but the phone's cache isn't** (orange) — "The phone still holds a *cached decode* of its session, valid until the cache window expires. Its open tab keeps loading."
3. **t < 5 min · Phone reads cache** (neutral/green) — "Each request on the phone's cached path reads the decode, not the deleted row — so it still looks signed in."
4. **t = cache expiry · The next read hits the DB** (orange) — "When the cache window lapses (or a path bypasses it), the validating read queries the row — finds nothing."
5. **t = cache expiry · Phone redirected to /sign-in** (red→green) — "Null session → the L1 proxy bounces the phone to `/sign-in`. *Now* it's really out."
Optional 6th panel — "With `disableCookieCache: true` on `/settings`: that subtree's reads skip step 3 entirely and enforce immediately." Pedagogical goal: make "revocation is eventually-consistent, and the lag is the cookie cache" a visual, intuitive fact — and show the one knob that tightens it. `DiagramSequence` provides its own card — do **not** wrap in `<Figure>`.

**`Term`s:** `cookie cache` (re-`Term`: "Better Auth's short-lived in-cookie cache of the decoded session — skips a DB read per request, at the cost of a revocation-latency window; 5 min by default"), `eventually consistent` ("the change is guaranteed to take effect, but not instantly — there's a propagation window").

### From passive list to active detection: the "new device signed in" email

**Senior question:** an attacker signs in from Bangalore at 3am — the list would *show* it, but only if the user happens to look. How does the list become a signal that *reaches* the user?

This section closes the loop: the list is the **pull** surface; this is the **push** signal that drives the user to it. It's the senior reach that turns an audit page into real takeover detection.

Content:
- **The push signal:** send a **"new device signed in"** email through the **Unit 7 `sendEmail` pipeline** (owned, referenced, not re-taught) whenever a sign-in lands an `ipAddress` + `userAgent` combination the user hasn't seen before. The email names the device + approximate location + time, and carries a **"This wasn't me"** CTA that links to `/settings/security/sessions` *and* revokes all other sessions + forces a password reset (the L2 "wasn't you?" escape hatch, re-used).
- **Where it installs (the verified bit — state the uncertainty):** Better Auth ships **no documented turnkey "new device" hook**. The install point is a **`databaseHooks.session.create.after`** callback — it fires when a new `session` row is written (i.e. a fresh sign-in). Inside it: look up the user's prior sessions, compare the new `ipAddress` + `userAgent` against them, and on a *new* combination, fire the email. Frame this as "the library gives you the *write* hook; the new-device *logic* is app code." Downstream agents: ground the exact hook surface against the installed version; do **not** assume a named `onNewDevice`/`signIn.after` hook exists.
- **Pair the pull and the push** (the synthesis sentence): the active-sessions list is **detection-on-demand**; the email is **detection-that-finds-you**. Together they're the user-facing layer for compromised-credential discovery — the same recognition ("I never signed in from there") delivered two ways.
- **Scope boundary, named here:** this is the *one* email. Full IP-anomaly scoring, velocity checks, impossible-travel detection (Ch 074) and an audit-log table of every sign-in/revoke event (Ch 057) are **not** built — named at their seams. The account-takeover incident-response runbook is out of frame (named in passing).

**Component — a small lesson-specific figure (`new-device-loop.astro`, build at `src/components/lessons/054/3/`), wrapped in `<Figure>`, OR a tight `ArrowDiagram`.** Show the **pull/push loop** as a simple two-node cycle: a sign-in writes a new `session` row → `databaseHooks.session.create.after` sees a new IP+UA combo → "new device" email → user clicks "This wasn't me" → lands on the sessions list → `revokeOtherSessions` + reset. Reuse the palette (orange = the hook firing, red = the suspicious sign-in, green = the recovery). Pedagogical goal: make the list-plus-email a *loop* the student can see — passive page on one side, the push that activates it on the other. Keep it small; if an `ArrowDiagram` over-engineers it, a horizontal phase strip (HTML+CSS) in the established figure style is the right weight. (Per the diagrams index, a simple phase strip is HTML+CSS; `ArrowDiagram` needs `expandable={false}` inside `<Figure>`.)

**`Term`s:** `databaseHooks` (re-`Term` lightly: "Better Auth callbacks that fire around its own DB writes — here, after a new session row is created"), reuse `account takeover` if `Term`'d earlier, else a light gloss.

### The neighbours: multi-session and the session cap

**Senior question:** "can one browser hold two accounts?" and "can I limit a user to N devices?" sound like this lesson — they're adjacent features the student should *recognize and not conflate*, not build.

A short, recognition-only section (the chapter outline names both as "named, not built"). Keep it tight — it exists to disambiguate, not to teach a flow.

Content:
- **The `multiSession()` plugin — a different feature** (Ch 052 L3 named it): it lets *one browser* hold sessions for *multiple user accounts* simultaneously (the Gmail account-switcher pattern), with a UI to switch the active account. This is **not** "list my sessions across devices" — that list is **built-in and needs no plugin**. Name the distinction crisply: *multi-session = many accounts in one browser; this lesson's list = one account across many devices.* Don't enable it unless the product needs the switcher.
- **`maximumSessions` — the cap knob, named with a caveat:** a per-user cap on active sessions (when `N+1` arrives, the oldest by `updatedAt` is evicted) is a feature *some* setups want for compliance or share-abuse. **The stable core does not document a turnkey `maximumSessions` option** — so frame it as "*if* the product needs a cap, it's a deliberate addition (plugin/custom hook), not a one-line default; most year-1 SaaS leaves sessions uncapped." Do **not** present a fabricated config key as fact (the chapter outline's `session: { maximumSessions: N }` is unverified — soften to "a cap is a deliberate reach").

**Component — none.** Prose carries a recognition-only section; do not build a figure for features you're explicitly not building.

**`Term`s:** none new — reuse `multi-session` if glossed earlier, else a one-clause inline definition.

### Closing — the revoke-scope checklist, and the footguns

**Goal:** consolidate via active recall and inoculate against the field-mistakes in one sharp list.

Lead with a short **`MultipleChoice` (`revoke-scope-recall`, multi-select)** checking the lesson's spine (the three-call distinction + the staleness truth). Correct: "`revokeOtherSessions()` keeps the current session and signs out every other device"; "`revokeSessions()` signs the user out on the current device too"; "with the cookie cache on, a revoked session can read as valid for a few minutes." Decoys: "`revokeSession` takes the session *id*" (no — the **token**); "the active-sessions list should be fetched and rendered from client state" (no — server-trusted read); "revocation is always instant" (no — eventually-consistent within the cache window).

Then a tight **`:::caution` (or `Card`/`CardGrid`) of footguns** — the chapter-outline watch-outs, each a one-liner the student can pattern-match in review:
- **No "This device" badge / no current-session guard** — the user revokes the session reading the page and is booted mid-task.
- **Conflating "sign out other devices" and "sign out everywhere"** — the copy must say whether the current device goes too.
- **Rebuilding the session list from client state** — it's a server-trusted read; render it on the server.
- **Assuming revoke is instant with the cookie cache on** — it's eventually-consistent; say so in the toast, or `disableCookieCache` the sensitive subtree.
- **Leaking `ipAddress` / `userAgent` into error breadcrumbs (Sentry)** — they're sensitive; keep them out of logs.
- **The sessions page behind a gate that proves "signed in" but not "still you"** — a borrowed laptop can revoke the real owner's devices; the mutations belong behind elevation (Ch 054 L2).
- **No "new device" email** — the list is detection only if the user happens to look; the push signal is what finds them.

Close with one sentence tying the lesson into the chapter arc: the user can now *see and revoke* every session across every device, and the email tells them when a new one appears — completing the session's lifecycle from minting (Ch 053) through credential change (L2) to audit-and-revoke; the *next* lesson (Ch 054 L4) zooms out to the browser-security defaults — CSRF and XSS — the stack already ships to protect every one of these sessions.

### External resources

`CardGrid` of `ExternalResource` cards (the chapter close pattern):
- **Better Auth — Session Management.** The `listSessions()`, `revokeSession({ token })`, `revokeOtherSessions()`, `revokeSessions()` surface and the `disableCookieCache` knob. `icon="simple-icons:betterauth"` if it resolves. (Verify exact param names against the installed version.)
- **Better Auth — Database Hooks.** Grounding for the `databaseHooks.session.create.after` install point of the new-device email. (Verify the hook surface against the installed version.)
- **`ua-parser-js` (or equivalent).** The device-string parser for the row's "Chrome on macOS" — server-side, display-only. `icon="simple-icons:npm"` if it resolves.
- **OWASP — Session Management cheat sheet.** Canonical ground for session inventory, revocation, and "sign out everywhere" as security controls. `icon="simple-icons:owasp"` if it resolves.

---

## Scope

**Prerequisites the student already owns (redefine in one clause max, never re-teach):**
- The `session` table schema (`id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`) — **Ch 052 L2**. Listed, not re-derived.
- The opaque-session-id model (the row *is* the session; no JWT to decode/denylist) — **Ch 051 L2**. The "revoke = `DELETE`" cheapness rests on it; named, not re-argued.
- The session-read ladder (`getCurrentUser` / `requireUser`, all through `auth.api.getSession({ headers })` once) and the L1 proxy gate fronting `/settings` — **Ch 052 L4 + Ch 054 L1**. The page's perimeter; named, not re-built.
- The cookie cache, its 5-min `maxAge` default, the staleness window, and the `disableCookieCache` knob — **Ch 052 L3**. This lesson *reads* the consequence and may *apply* the knob; it does not re-explain the cache.
- Session invalidation on credential change as opt-in (`revokeOtherSessions: true` rode `changePassword`) — **Ch 054 L2**. This lesson surfaces the *same endpoint* as a user button; named as the parallel.
- The two call faces (`auth.api.*` throws `APIError`; `authClient.*` returns `{ data, error }`) and `mapXError` enumeration-collapse keyed on numeric `status`, codes off `$ERROR_CODES` — **Ch 053 L1/L2**.
- `useActionState` form / Server-Action-button wiring — **Ch 044 L3** (NOT Ch 045; the standing chapter correction; buttons plug in unchanged).
- `rememberMe` session lifetimes — **Ch 053 L2** (sessions render identically in the list; the distinction stays out of the UX).
- React Email anatomy + the Unit 7 `sendEmail` wrapper — **assumed built, not re-taught**; the "new device" email rides it.
- Elevation / step-up auth ("signed in" ≠ "still you") — **Ch 054 L2**. The page's mutations belong behind it; named, not re-built.
- The chip visual vocabulary (`.sar-chip`: live=neutral, attacker=red-while-live, dead=struck-through-grey, fresh=green) — **Ch 053 L4 / Ch 054 L2**. Reused for this lesson's figures.

**This lesson does NOT cover (reserve for their owners):**
- **Cookie-cache configuration** (Ch 052 L3) — this lesson reads the staleness consequence and may apply `disableCookieCache`; it does not set or re-explain the cache config.
- **An audit-log table recording sign-in / revoke events** (Ch 057) — out of frame; the list shows *current* state, not a history.
- **IP-based rate limiting and "new IP" anomaly detection beyond the one email** — velocity, impossible-travel, scoring (Ch 074) — named at the seam, not built. This lesson ships the single "new device" notification only.
- **The full account-takeover incident-response runbook** — out of scope; named in passing via the "wasn't you?" escape hatch.
- **The `multiSession()` account-switcher UI** (a different feature — many accounts in one browser) — named and disambiguated, **not built**.
- **A `maximumSessions` cap** — named as a deliberate compliance/abuse reach (not a documented turnkey default); **not built**, and not presented as a fabricated config key.
- **Authorization / role checks / org-scope** (Ch 057) — the list is the *current user's* own sessions; cross-user session admin is downstream, out of frame.
- **The two-layer proxy gate and the validating read** (Ch 054 L1 / Ch 052 L4) — the page's perimeter; named as "what fronts `/settings`," not re-built.

---

## Code-convention alignment notes (for downstream agents)

- **Read face:** the page is a Server Component — list via `auth.api.listSessions({ headers: await headers() })`, wrapped in the read-ladder posture (Ch 052 L4); never call `getSession`/`listSessions` raw from a component without the ladder. Pass the rows down as serialized props — the list is a **server-trusted read**, never rebuilt from client state.
- **Write face:** the revoke buttons are Server-Action-backed; inside the action, `authClient.*` (or `auth.api.*` on the server) for `revokeSession({ token })` / `revokeOtherSessions()` / `revokeSessions()`; translate any failure via `mapRevokeError` keyed on numeric HTTP `status`, codes off `$ERROR_CODES`, never hardcoded; never expose Better Auth messages. `revalidatePath('/settings/security/sessions')` after a revoke so the list re-reads.
- **Revoke param (version gotcha — verify before shipping):** `revokeSession` keys on the session **`token`**. But `list-sessions` may return `token` **empty on non-current rows** (the token is a credential; intentional), and an open request (#6940, Dec 2025) proposes a `sessionId` param to close this. So per-row single-device revoke is **version-dependent**: ground it against the installed `revoke-session` signature, do not assume the row carries a usable `token`. The **bulk** calls (`revokeOtherSessions` / `revokeSessions`) need no per-row token and are the always-available controls — wire those with confidence.
- **Better Auth posture:** all behavior flows through the single `auth` instance / `authClient`; no parallel calls. `disableCookieCache: true` on the `/settings` subtree's validating reads is the course's knob for tightening revocation latency (Ch 052 L3's config, re-applied) — applied, not re-explained.
- **Device/location parsing:** a **server-side** util (`lib/parse-user-agent.ts`) using a `ua-parser-js`-class library for device; GeoIP for approximate location is a privacy-gated senior toggle. The UA is **display-only**, never trusted for a security decision. Never log `ipAddress`/`userAgent` into error breadcrumbs.
- **New-device email:** install via **`databaseHooks.session.create.after`** (fires on a new session-row write); app code compares new `ipAddress`+`userAgent` against prior rows and sends through the Unit 7 `sendEmail` wrapper. Do **not** hardcode a named `onNewDevice`/`signIn.after` hook; ground against the installed `databaseHooks` surface.
- **Security baseline:** the sessions page sits behind the L1 proxy gate (cookie-presence) + the layout's `requireUser()` (validating read); its *mutations* belong behind elevation (Ch 054 L2) — a borrowed laptop must not silently revoke the owner's other sessions. Post-revoke copy must state the cookie-cache latency honestly, never claim instant sign-out.
- **MDX display:** strip imports in shown action/util code per §4 pedagogical rules; mark the differing revoke call in each action with `data-mark-color="violet"`.
- **Deliberate pedagogical divergence to flag:** the list rendering and the three revoke actions ship as **plain `Code` fences, not `AnnotatedCode` walkthroughs** — they are an Nth repetition of Server-Component-read + Server-Action-button shapes the student owns cold. The annotation budget is spent on the **revoke-scope comparison table**, the **`session-row-anatomy` / current-session figure**, and the **`revoke-staleness` `DiagramSequence`**, where the new thinking lives. This is intentional, not under-scaffolding.
- **Figure continuity:** the three lesson figures (`session-row-anatomy.astro`, `revoke-staleness` `DiagramSequence`, `new-device-loop.astro`) reuse the `.sar-chip` vocabulary and chapter palette from Ch 053 L4's `sessions-after-reset.astro` and Ch 054 L2's `sessions-after-change.astro`, so the chapter's session figures read as one continuous visual language.
