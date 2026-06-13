# Lesson 3 — Timezone on the profile

- **Title:** Timezone on the profile
- **Sidebar label:** Profile timezone

---

## Lesson framing

This is the **edge** lesson of the chapter — the third box on lesson 1's storage/domain/edge strip, the one that was deferred twice ("whose timezone?" left as a teaser at the close of both L1 and L2). The chapter's storage/domain half is built; this lesson answers the question that makes the edge work: *which* timezone do you format and schedule with? The whole lesson is one decision and its consequences. **The user's timezone is a profile column — data that follows the user — not something you derive per request.** Everything else (the column, browser-seeding, validation, session read, org fallback, drift detection) is downstream of that one commitment.

The senior frame is a single load-bearing bug, named early and returned to throughout: `Intl.DateTimeFormat().resolvedOptions().timeZone` called in server code on Vercel returns `'UTC'` — every time, for every user — because Vercel pins `TZ=UTC`. The trap is that this bug is *invisible in development* (the dev's laptop isn't UTC, so it looks correct locally) and *silent in production* (no error — every user's data just renders in UTC and every reminder fires at midnight UTC). This "passes locally, wrong in prod, no error" shape is the canonical reason the derive-per-request architecture loses, and it's the spine of the lesson. The mental model the student must leave with: **timezone is a user attribute, read from the session and passed explicitly into every formatter and every scheduler — never ambient, never derived from the runtime, never inferred from infrastructure.**

The student already owns the surrounding machinery. From L1/L2: the `instantColumn`/`dateColumn` codecs, the storage triple discipline, "Temporal in memory, ISO on the wire," `toZonedDateTime({ timeZone, plainTime })` and `toZonedDateTimeISO(tz)` as the explicit zone-naming crossings. From Unit 8 / the auth conventions: `requireOrgUser()` returning `{ user, orgId, role }`, Better Auth as the session seam, the `authedAction(role, schema, fn)` wrapper, the five-seam action shape. From Unit 10: `tenantDb`, `db/queries/`. This lesson does **not** re-teach any of that — it adds one column, the rules for sourcing and validating it, and the discipline for consuming it. It is the *substrate* for ch084's locale-aware formatting; the i18n convention already encodes the handoff ("timezone comes from `users.timeZone` on the session" feeding next-intl's formatters). This lesson installs that column and the session/helper plumbing; ch084 wires it into `Intl.DateTimeFormat`/next-intl.

Pedagogically: the core is a **decision** (the three architectures for "whose timezone?"), so lead with a decision artifact, not syntax. The Vercel-UTC bug is best shown as a concrete before/after (dev machine vs. Vercel) rather than described. The structural defense — a `formatDate(value, { timeZone })` wrapper whose required argument makes the no-arg bug *unwriteable* — is the senior takeaway and should be framed as "make the bug impossible to express," echoing L2's type-guard framing. Two genuinely surprising-to-beginners facts deserve their own beats: (1) store an IANA *name*, never a UTC *offset* (offsets don't carry DST), and (2) `Intl.supportedValuesOf('timeZone')` famously omits `'UTC'` on Chromium/Node, so naive membership-validation rejects your own fallback default — a real footgun. Keep cognitive load down by sequencing: bug first → column → seed it → read it → validate it → the scope nuances (org, drift, "data not config") as short consequence sections, each tied to the central decision.

Estimated student time: 40–50 minutes.

---

## Lesson sections

### Intro (no header)

Open with the three concrete demands that all need an answer to "whose timezone?", drawn straight from the chapter framing so it reads as the natural next question after L2's Sydney cliffhanger:

- A monthly billing email must land at **9 AM in the customer's** timezone.
- A "due in 3 days" reminder must count days from **their** perspective, not the server's.
- A Server-Component activity list must format each row's timestamp **as that user reads it**.

State the through-line: L1 built storage, L2 finished the domain, and both ended by pointing here — the edge, where the timezone finally enters. Name the lesson's single commitment up front (the user's timezone is a profile column, read from the session, passed explicitly everywhere) and preview the one bug that makes every shortcut fail (deriving it per request silently formats everyone in UTC on Vercel). Connect to what they own: `requireOrgUser()`, the `authedAction` wrapper, the explicit-zone crossings from L2. Keep it warm and short. Include `<CourseProgressBar value={frontmatter['course-progress']} />` as the first body line (match L1/L2 frontmatter shape: `chapter-id: 83`, `course-progress` consistent with siblings, `sidebar: { order: 3, label: 'Profile timezone' }`).

### Whose timezone? Three answers, one survivor

**Goal:** establish the central decision as a *senior decision*, with the wrong paths' failure modes made vivid, before any column or code. This is the section the whole lesson hangs on.

Walk the three architectures from the chapter framing, each with its disqualifying failure:

1. **Derive at request time** via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Fails because in server code on Vercel it returns `'UTC'` (runtime `TZ`), not the user's zone. The killer property: invisible locally, silent in prod.
2. **Infer from the request** — `Accept-Language` or geo-IP. `Accept-Language` carries *language*, not timezone (`en-US` ≠ New York; a Spaniard's browser may send `en-US`). Geo-IP is a privacy and accuracy lottery (VPNs, mobile carriers, travelers). Category error: language and location are not timezone.
3. **Store the user's IANA timezone on the profile**, read from the session, pass explicitly to every formatter and scheduler. The only one that survives past the second timezone.

**Component — `StateMachineWalker` (kind="decision", do NOT wrap in `<Figure>`, title "Where does the user's timezone come from?").** This is the right tool because the lesson lives in the *order a senior asks the questions* and in walking *into* each wrong branch to see why it dies — exactly the walker's strength (committed walk, one branch at a time, failure surfaced at the leaf). Pedagogical goal: force the student to confront each tempting shortcut and read its concrete failure, landing every path on the same verdict. Nodes:

- Root `<Question id="source" prompt="You need to render a timestamp in the user's timezone. Where do you get the timezone?">` with three branches:
  - "Read it from the runtime — `Intl.DateTimeFormat().resolvedOptions().timeZone`" → `runtime-check`
  - "Infer it from the request — `Accept-Language` or their IP" → `infer-check`
  - "Store it on the user's profile" → `profile`
- `<Question id="runtime-check" prompt="Your code runs in a Vercel serverless function. What timezone does the runtime report?">`:
  - Branch "UTC — Vercel sets `TZ=UTC`" rationale "So every user formats in UTC, and your dev machine hid it because it isn't UTC." → `runtime-fail`
- `<Question id="infer-check" prompt="A user's browser sends `Accept-Language: en-US` from Madrid. What timezone is that?">`:
  - Branch "You can't tell — language isn't location, and location isn't timezone" → `infer-fail`
- `<Leaf id="runtime-fail" verdict="Dead end: every user renders in UTC">` body: the no-arg derivation reports the *runtime's* zone, which Vercel pins to UTC. Passes locally (your laptop isn't UTC), silent in prod (no error, just wrong times for everyone). Re-route: the timezone has to be *data you stored*, not a runtime read.
- `<Leaf id="infer-fail" verdict="Dead end: a category error">` body: `Accept-Language` is language; geo-IP is a privacy/accuracy lottery and breaks for every traveler and VPN. Neither is the user's chosen timezone. Re-route: ask the user, store the answer.
- `<Leaf id="profile" verdict="Store the IANA timezone on the profile">` body: a `users.timeZone` column, seeded from the browser at sign-up, validated, read from the session, passed explicitly into every formatter and scheduler. The only path that scales past one timezone — the rest of the lesson builds it.

After the walker, state the rule the student carries: **timezone is data you store about the user, not a value you derive from the runtime or the request.** Close with the one-sentence reframe that recurs: never call the no-argument `Intl.DateTimeFormat()` in server code.

### The `users.timeZone` column: an IANA name, never an offset

**Goal:** install the column and lock the single most error-prone modeling choice — IANA name, not UTC offset.

Teach the column shape: a `text` column on the `users` table (`timeZone`), `NOT NULL` with a `'UTC'` default (the safe fallback at backfill / when detection fails). It stores an IANA identifier — `'America/New_York'`, `'Europe/Berlin'`, `'Asia/Tokyo'`, `'UTC'`.

**The load-bearing distinction: IANA name vs. UTC offset.** This is where beginners reach wrong. An offset (`-05:00`) is *not* a timezone — it's a timezone's value *at one instant*. `America/New_York` is `-05:00` in winter and `-04:00` in summer; the same offset string means a different real wall-clock relationship across the year, and storing the offset throws away the DST rules entirely. Store `'America/New_York'` and the platform's `tzdata` resolves the correct offset for any instant; store `-05:00` and every spring-forward silently shifts the user's times by an hour. **An IANA name carries the DST history; an offset is a single frozen sample of it.** Frame this as the structural reason the column is `text` holding a name, not an integer offset.

**Component — small custom HTML+CSS `<Figure>` (caption: "An IANA name is a rule across the year; an offset is one frozen sample of it.").** Pedagogical goal: make "offset is not a timezone" a *picture*, killing the most common modeling mistake before it forms. Keep horizontal and compact (vertical-space budget). Layout: a single horizontal year axis (Jan → Dec) for one zone labeled `America/New_York`. A shaded band showing `-05:00` (EST) for the winter months and `-04:00` (EDT) for the summer months, with two vertical DST-transition markers (spring forward / fall back). Below it, a single flat `-05:00` line spanning the whole year, labeled "what you'd store as an offset — wrong half the year." The visual takeaway: one IANA name covers both bands; a stored offset is correct only until the next transition. Use the chapter's accent palette; the two-color winter/summer band is the load-bearing cue.

**Code — `Code` block (ts).** The Drizzle column on the `users` table, matching the schema conventions (snake-case casing set on the client, `text`, `.notNull().default('UTC')`):

```ts
// db/schema.ts — on the users table
timeZone: text('time_zone').notNull().default('UTC'),
locale: text('locale').notNull().default('en-US'),
```

Show `locale` *adjacent but greyed/labeled as "next chapter's"* — named once because the convention pairs them and the student will see both on the profile, but explicitly out of scope here (locale is ch084). One sentence: locale drives number/weekday/currency formatting, timezone drives date/time; independent (a Berlin user can read in `en-GB`); both live on the profile; this chapter owns timezone only.

**Better Auth note (short `Aside` or inline):** because the session must carry `timeZone` for `requireOrgUser()` to return it on `user`, the field is also declared in Better Auth's `user.additionalFields` (`timeZone: { type: 'string', required: false }`) so the session surface includes it. The Drizzle schema stays the source of truth for the column; `additionalFields` is the mirror that lets the value ride the session. Keep this to two sentences — Better Auth's session mechanics are Unit 8's, named here only so the session-read in a later section is grounded.

**Terms:** `IANA timezone` (Term: "A named zone from the IANA tz database, e.g. America/New_York, that carries the zone's full history of DST and offset rules — not a fixed offset."); `tzdata` (Term: "The IANA timezone database; the platform-bundled data that maps an IANA name to the correct offset at any instant. Updated several times a year as countries change DST rules.").

### Seeding it at sign-up from the browser

**Goal:** answer "how does the value get there in the first place?" — the browser is the one place that actually knows the user's zone — and frame the value as *user-asserted*, not authoritative.

Teach the source: the **browser** knows the user's zone via `Intl.DateTimeFormat().resolvedOptions().timeZone` — and here, on the *client*, that call is *correct* (it reports the user's machine zone). Name the symmetry sharply: the exact call that returns `'UTC'` and lies in server code returns the real zone in client code. *Where* it runs is the whole difference. This is the one place the no-arg form is the right tool.

Walk the three senior seeding shapes from the framing, with the recommendation:

- **(a) Client-detect at the sign-up form** — capture the detected zone in a hidden input (or the sign-up Server Action payload) so it lands in the column at account creation. **Senior default** — zero friction, right most of the time.
- **(b) Onboarding picker** — a post-sign-up step where the user selects from a list. Higher friction, fully explicit; reach for it when correctness matters more than speed.
- **(c) `'UTC'` fallback + first-sign-in prompt** — lowest-friction migration path for existing accounts with no zone yet.

State the resolution chain: client-detected → `'UTC'` if detection fails → fixed up on the profile page. Emphasize the senior caveat: the client value is **user-asserted, not authoritative** — it's a sensible default the user can correct, not ground truth. (Tie back to L1's "never trust the client clock" — same family: the client *reports*, the server *decides what to keep*; here a sane reported default is fine because the user owns and can edit it.)

**Code — `Code` block (tsx), short.** The client-detect-into-hidden-input pattern at the sign-up form. A `'use client'` snippet computing the zone once and stashing it in a hidden field the sign-up action reads:

```tsx
'use client';
// at the sign-up form — runs in the browser, so this is the USER's zone
const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// ...
<input type="hidden" name="timeZone" defaultValue={detectedTimeZone} />
```

One annotation in prose: the same `Intl.DateTimeFormat()` no-arg call that was forbidden in server code is exactly right here — because "here" is the browser. Note that the value still gets *validated* on the server before it touches the column (next section); a hidden input is user-supplied and therefore untrusted input.

### Reading it from the session

**Goal:** show the two consumption seams, both enforcing "pass the zone explicitly."

Two ways code gets the user's zone, both grounded in surfaces the student owns:

- **(a) The session.** `requireOrgUser()` returns `{ user, orgId, role }`, and `user` carries `timeZone`. This is the reflex for actions, pages, and route handlers under the authenticated app.
- **(b) A `getCurrentUserTimeZone()` helper** in `lib/user-time.ts` — a thin React-`cache`d read for deeply-nested Server Components that need the zone without prop-drilling it through every layer. Mention it resolves through the same session read (`requireOrgUser`/`getCurrentUser`), so it's one source, not a second one.

**The non-negotiable:** whichever seam, the zone is **passed explicitly** into every Temporal and `Intl` call. The global/ambient form (a module-level "current timezone", a no-arg `Intl` call) is *not allowed* — it's the door the Vercel-UTC bug walks through.

**Code — `Code` block (ts), short.** Reading the zone off the session and passing it explicitly into an L2-style crossing, to make the "explicit argument" reflex concrete with a call the student already knows:

```ts
const { user } = await requireOrgUser();

// "what calendar day is this instant, for THIS user?" — zone named, never ambient
const localDay = invoice.createdAt.toZonedDateTimeISO(user.timeZone).toPlainDate();
```

Note this is the same `toZonedDateTimeISO(tz)` crossing from L2 — the new part is *where the `tz` comes from* (the session) and the rule that it's always supplied, never defaulted.

### Validating it at the write edge

**Goal:** the profile-edit surface and the validation that keeps an invalid string out of the column — including the genuinely surprising `'UTC'`-omission footgun.

Teach the profile settings surface: a `/settings/profile` page (the Unit 8 surface, fully shipped in ch085 — named, not built here) renders a **timezone select**. The option list comes from `Intl.supportedValuesOf('timeZone')` — a standard API (Node 18+, Baseline in browsers since 2022) returning the platform's known IANA names. Display each with its current UTC offset for legibility (`'America/New_York (UTC−04:00)'`), but the *stored value* is the bare IANA name.

The write goes through the canonical `authedAction(role, schema, fn)` wrapper with a Zod schema that validates the submitted zone. Why validation is non-optional: an invalid string in the column produces `RangeError: Invalid time zone specified` on **every read** that touches it (any `toZonedDateTimeISO`, any `Intl.DateTimeFormat` with that zone) — a runtime explosion on a value that should have been caught at the write boundary. Validate at the edge; the column never holds a zone the runtime can't resolve.

**The footgun — `supportedValuesOf` omits `'UTC'`.** This is the senior detail and a real, current quirk: Chromium and Node famously drop `Etc/*` zones from `Intl.supportedValuesOf('timeZone')`, so `'UTC'` — the column's own default and fallback — is frequently **not in the list**. Naive membership validation (`refine(tz => Intl.supportedValuesOf('timeZone').includes(tz))`) therefore *rejects the very fallback the column ships with*, and the select that's built from the raw list silently lacks a UTC option. Two correct defenses, taught as the fix:

1. **Validate by acceptance, not membership** — the authoritative test of "is this a real zone?" is whether the runtime accepts it: `new Intl.DateTimeFormat('en-US', { timeZone: tz })` throws `RangeError` on a bad zone. A `refine` that try/catches that construction validates *every* zone the runtime can actually use, `'UTC'` included.
2. Or, if validating by membership, **explicitly union `'UTC'`** (and any `Etc/*` zones you support) into the allow-list, and prepend it to the select options.

Present the acceptance-based validator as the recommended form (it can't drift from the runtime's real capability set).

**Component — `CodeVariants`** contrasting the buggy membership validator with the robust acceptance validator. Pedagogical goal: show the trap and its fix side by side so the student internalizes *why* membership is fragile.
- Variant "Membership check — silently rejects UTC" (`data-mark-color="red"`): `z.string().refine((tz) => Intl.supportedValuesOf('timeZone').includes(tz))`. Prose: looks right, but `supportedValuesOf` drops `'UTC'` on Chromium/Node, so this `refine` rejects the column's own default and the select built from the same list has no UTC option.
- Variant "Acceptance check — validates anything the runtime can use" (`data-mark-color="green"`): a `refine` that does `try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }`. Prose: tests the real capability — if the runtime can format in this zone, it's valid; can't drift from the platform's actual zone set; accepts `'UTC'`.

Tie the schema to the conventions: top-level Zod builders, `safeParse` at the action boundary, the `authedAction` wrapper lifting session+parse. Keep the action body itself to the five-seam shape by reference, not a full re-teach.

**The structural defense (senior takeaway, echoing L2's type-guard framing).** A free helper `formatDate(value, { timeZone })` whose `timeZone` argument is **required** makes the no-arg `Intl.DateTimeFormat()` bug *impossible to write* at every call site — you physically cannot call the wrapper without naming a zone. Frame it exactly as L2 framed type guards: the cure isn't "remember to pass the zone," it's "make forgetting unrepresentable." (Note for downstream: the *implementation* of `formatDate` — the actual `Intl.DateTimeFormat` formatting, locale resolution — is ch084; here it's named as the *shape* of the defense, a required-argument wrapper, not built out.)

**Exercise — `ZodCoding`.** Pedagogical goal: the student writes the acceptance-based timezone validator and sees it pass the `'UTC'` case that the membership version fails. `ZodCoding` is the right pick (real-Zod iframe runner over pinned `safeParse` scenarios; per the components index it runs actual Zod, unlike the react-only ReactCoding sandbox). Setup:
- Instructions: "Write a Zod schema for a timezone string that accepts any zone the runtime can actually format with — including `'UTC'`. Don't use `supportedValuesOf().includes(...)`; it drops `'UTC'`."
- Starter: a stubbed `z.string().refine(/* your check */)` with the `try`/`catch` `new Intl.DateTimeFormat(...)` hint in a comment.
- `safeParse` scenarios (the grading): `'America/New_York'` → pass; `'Europe/Berlin'` → pass; `'UTC'` → **pass** (the case the membership version fails — this is the point of the exercise); `'Mars/Phobos'` → fail; `'-05:00'` → fail (an offset is not an IANA name — reinforces the earlier section).
- Builder note: if `Intl.DateTimeFormat`-in-`refine` proves flaky in the ZodCoding iframe, fall back to a `MultipleChoice` asking which of two validators correctly accepts `'UTC'`, keeping the membership-vs-acceptance contrast intact.

**Terms:** `Intl.supportedValuesOf` (Term: "A standard API returning the platform's list of known IANA timezone names. Caveat: Chromium and Node omit Etc/* zones, so 'UTC' is often missing from the list."); `RangeError: Invalid time zone specified` (Term: "The error thrown the moment any Intl or Temporal call receives an IANA name the runtime doesn't recognize — which is why timezone strings are validated at the write edge, not on read.").

### The user's clock is the user's truth

**Goal:** the rule that interpretation context is always the user's zone, with the two canonical computations, reinforcing the explicit-conversion discipline on real scheduling shapes (and seating the next lesson on DST/recurring jobs).

Teach the principle: when a user says "remind me at 9 AM tomorrow," "due by end of day," "in 24 hours," they mean **their** clock. Every scheduling input and every deadline interprets with `user.timeZone` as the calendar/clock context — and the result is always converted down to a `Temporal.Instant` for storage (the L1 storage shape). The user's zone lives *in the conversion*, then disappears into the stored instant.

**Code — `AnnotatedCode` (ts)** on the two canonical computations from the framing, so the explicit-zone discipline lands on real scheduling math (and previews the ZonedDateTime → Instant flow L4 leans on). The block:

```ts
const { user } = await requireOrgUser();

// "end of day, for this user"
const endOfToday = Temporal.Now
  .zonedDateTimeISO(user.timeZone)
  .with({ hour: 23, minute: 59, second: 59 })
  .toInstant();

// "9 AM tomorrow, for this user"
const remindAt = Temporal.Now
  .zonedDateTimeISO(user.timeZone)
  .add({ days: 1 })
  .with({ hour: 9, minute: 0, second: 0 })
  .toInstant();
```

Annotation steps:
- `Temporal.Now.zonedDateTimeISO(user.timeZone)` — "now, *in the user's zone*, from the session. The `timeZone` argument is *optional* — and that's the trap: omit it and it defaults to the runtime's zone (UTC on Vercel), exactly like the no-arg `Intl.DateTimeFormat()`. The senior rule is the same — always pass it, always the user's." (Name the rhyme with the `Intl` no-arg trap. Do NOT claim the API *requires* the argument — it doesn't; the discipline is to always supply it.)
- `.with({ hour: 23, ... })` / `.with({ hour: 9, ... })` — "set the wall-clock time the user means, on their calendar."
- `.add({ days: 1 })` — "tomorrow on *their* calendar — which is when their next midnight falls, not the server's."
- `.toInstant()` — "collapse to the `Temporal.Instant` you store/schedule against. The user's zone did its work in the conversion and is now baked into a UTC instant."

One sentence forward-pointing to L4: across a DST transition these conversions are exactly where the wall clock skips or repeats an hour — `ZonedDateTime` is the type that handles it, and the next lesson uses this same pattern to schedule recurring jobs that survive spring-forward/fall-back. Do not teach DST disambiguation here (L4's scope) — just plant that `ZonedDateTime` is the DST-aware type and this is the conversion where it matters.

### Org timezone vs. user timezone

**Goal:** the scope nuance — some operations key off the *company's* clock, not the recipient's — kept short and decision-shaped.

Teach the split: most rendering and reminders use **`user.timeZone`** (the recipient reads it on their clock). But some operations — B2B billing, invoice issue dates, company-wide scheduling — key off the **organization's** clock: an invoice issued by a San Francisco company is dated by the company's day, not each recipient's. Mirror column `organizations.timeZone`; a small resolver picks "the right zone for *this* operation." The binary to internalize: **user-facing rendering → user tz; org-level business events (billing/issuance) → org tz.** Most code lands on user.

**Component — `MultipleChoice`** (or a compact two-row `Buckets`) to make the student *apply* the split rather than read it. Pedagogical goal: force the user-vs-org discrimination on realistic cases. If `MultipleChoice`: present 4–5 operations, ask which zone each keys off:
- "Format the 'created at' timestamp in an activity feed" → user
- "Send the monthly billing email at 9 AM" → user (the *recipient's* 9 AM)
- "Stamp the issue date printed on a company's invoice" → org
- "A 'due in 3 days' reminder counts down" → user
- "Close-of-business cutoff for a company-wide report run" → org

(Pick the MCQ form with one correct answer per a single well-chosen item, or a two-bucket `Buckets` "user tz / org tz" if sorting several reads better — Buckets is the cleaner fit for a multi-item sort; choose Buckets.) Keep the explanation tight: the test is *whose business event is this?* — the person reading, or the company acting.

### Timezone is data, not configuration

**Goal:** the closing principle that ties the lesson's wrong-paths together and seats two final watch-outs. Short, conclusion-shaped.

State the rule: the user's timezone is a **user attribute** — not an env var, not a deployment region, not a per-build flag. The canonical bug is treating the *deployment region* as a proxy for timezone ("the EU deployment serves Europe, default to `Europe/Brussels`"). Wrong: a Spanish user on the US deployment exists, an American on the EU deployment exists; **data follows the user, not the infrastructure.** This is the same error as the geo-IP branch of the opening walker, now stated as a principle.

Fold in two watch-outs as consequences (in prose, attached to this principle — not a tips dump):

- **`process.env.TZ` is poison.** Setting `TZ` (e.g. in a Docker base image) silently changes the meaning of every `new Date()` and every no-arg `Intl.DateTimeFormat()`/`Temporal.Now.*` in the whole app. On Vercel `TZ` is a *reserved* env var — you can't set it through project settings precisely because the platform pins the runtime to UTC — so the lesson's "every user renders in UTC" bug is the platform default, not an accident. Keep the runtime at UTC; the user's zone is *data on the row*, never the process environment. (Connects directly to the chapter rule: the runtime's `TZ` never enters business logic — and to L4, where Vercel Cron's UTC-only scheduling is exactly why named-IANA recurring jobs need Trigger.dev.)
- **`tzdata` updates, so don't pin offsets.** IANA ships several updates a year as countries change DST rules. Storing the IANA *name* means the platform's bundled `tzdata` (Node 26 / Vercel keep current) resolves the right offset automatically; the moment you hard-code an offset to "fix" something, you've frozen a rule that the world keeps changing. Don't ship a hand-rolled tz table or pin an old `tzdata`.

### Detecting timezone drift (brief)

**Goal:** the traveler case — common, and the place a naive auto-update silently corrupts scheduled work. Keep short; it's a refinement, not a pillar.

Teach the pattern: a user signing in from a new geographic zone is common. On sign-in, the client can send its current `Intl.DateTimeFormat().resolvedOptions().timeZone`; if it differs from the profile column, surface a **non-blocking banner** ("Looks like you're in Tokyo — update your timezone?"). The senior rule: **never auto-update.** Silently rebasing a traveler's profile zone would shift every one of their scheduled emails and reminders without consent — the cure is to *offer*, not *apply*. (Forward-link: L4 covers what actually propagates when the zone *does* change — future schedules re-register, already-stored instants honor past intent. Name it, don't teach it.)

This can be a tight paragraph plus one `Aside` (caution) stating the never-auto-update rule. No new component needed.

### Recap / forward-pointer (no header, or fold into the last section)

Close by reseating the strip: the **edge** box is now real — the user's timezone is a profile column, seeded from the browser, validated at the write edge, read from the session, and passed explicitly into every formatter and scheduler. The full three-layer split (storage/domain/edge) is now standing. Point forward: the next lesson takes this exact `user.timeZone` and the `Temporal.Now.zonedDateTimeISO(tz)` pattern into **recurring jobs that survive a DST transition** (Trigger.dev `schedules` with a named IANA zone); after that, the full Temporal arithmetic surface. One sentence on the ch084 handoff: locale and `Intl.DateTimeFormat`/next-intl formatting consume this column but aren't built here.

### External resources

`CardGrid` of 3 `ExternalResource` cards:
- MDN — `Intl.supportedValuesOf` (the API and its quirks; the source of the `'UTC'`-omission caveat).
- MDN — `Intl.DateTimeFormat().resolvedOptions()` (what `timeZone` resolves to and why it reports the *runtime's* zone in server code).
- IANA Time Zone Database (the authority on what an IANA name carries and the update cadence behind "store the name, not the offset").

---

## Scope

**This lesson covers:** the "whose timezone?" decision; the `users.timeZone` column (`text`, IANA name, `'UTC'` default); IANA-name-vs-offset; browser-seeding at sign-up and the user-asserted framing; reading the zone from the session (`requireOrgUser`) and a `getCurrentUserTimeZone()` helper; validating at the write edge with `Intl.supportedValuesOf`/acceptance-based Zod and the `'UTC'`-omission footgun; the required-argument `formatDate` defense (as *shape*, not implementation); the user's-clock interpretation rule with the two canonical `ZonedDateTime → Instant` computations; org-vs-user zone scope; "timezone is data not config" with the `process.env.TZ` and `tzdata` watch-outs; non-auto-updating drift detection.

**Explicitly out of scope (do not teach):**

- **The `timestamptz` column and `Temporal.Instant` codec** — L1 (`instantColumn`). Use it as given.
- **The `date` column and `Temporal.PlainDate` codec** — L2 (`dateColumn`). The `toZonedDateTime`/`toZonedDateTimeISO` crossings are L2's; reuse, don't re-teach.
- **DST mechanics, `ZonedDateTime` disambiguation, recurring jobs / Trigger.dev `schedules` with a `timezone` arg, per-tenant dynamic schedules, what propagates on a zone change** — all L4. Name `ZonedDateTime` as the DST-aware type and plant the forward-link; teach none of the disambiguation/scheduling surface.
- **The full Temporal arithmetic surface** (`add`/`subtract`/`since`/`until`/`round`/`with` at depth, the conversion graph, `Duration`, month-end clamping, the six anti-patterns, the polyfill seam) — L5. This lesson uses `.with`/`.add`/`.toInstant` only as needed for the two canonical computations, not as a taught surface.
- **`users.locale`, locale negotiation, the locale-resolution chain** — ch084 L4. Name the column adjacent to `timeZone`; do not build it.
- **`Intl.DateTimeFormat` formatting output, `Intl.RelativeTimeFormat`, next-intl formatter wiring (`useFormatter`/`getFormatter`), the `formatDate` *implementation*** — ch084 L3/L5. This lesson installs the column and session plumbing those consume; the actual formatting is theirs. `formatDate` appears here only as a required-argument *signature/shape*.
- **The full `/settings/profile` UI shipped in the project** — ch085. Render the timezone select conceptually; the production page is later.
- **Better Auth session internals** — Unit 8. Reference `requireOrgUser()`'s `{ user, orgId, role }` contract and the `additionalFields` mirror as established; do not re-teach the auth seam.
- **Treating tz as PII / GDPR redaction** — the chapter framing flags that timezone is correctly PII (a `Pacific/Chatham` user is a tiny population) but hands redaction to ch081 L4's redactor. Mention in one clause at most if it fits the "data, not config" section; do not build redaction.

**Prerequisite one-liners (assume, restate concisely if needed):** `requireOrgUser()` returns `{ user, orgId, role }` and `user` carries profile fields; `authedAction(role, schema, fn)` is the action wrapper lifting session+parse; storage triples and "Temporal in memory, ISO on the wire" are from L1/L2; `toZonedDateTimeISO(tz)`/`toZonedDateTime({ timeZone, plainTime })` are L2's explicit-zone crossings; `tenantDb`/`db/queries/` and the five-seam action shape are owned.
