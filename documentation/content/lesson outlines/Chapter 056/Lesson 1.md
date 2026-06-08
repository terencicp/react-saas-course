# Standing up organizations and the active-org slot

Title: Standing up organizations and the active-org slot
Sidebar label: Organizations and the active org

## Lesson framing

First lesson of Unit 9. The student arrives from Unit 8 with a working email+password auth stack: the `user` / `session` / `account` / `verification` tables, the `auth` instance in `src/lib/auth.ts` (with `plugins: [nextCookies()]`), the `authClient` in `src/lib/auth-client.ts`, the `getCurrentUser` / `requireUser` session-read ladder, the `Result` contract, and the five-seam Server Action shape. This lesson turns that single-user app into one that knows about *companies*.

The spine of the lesson is one senior question, posed up front and answered piece by piece: a SaaS user signs up — they might run one company through the app or three, and their teammates belong to the same company. Where does "the company" live in the schema, how does the session know which one the user is *currently* operating inside, and what does *switching* companies actually do to the session, to the next request, and to the in-flight cache? Everything in the lesson is an answer to some part of that question.

Three mental-model anchors the student must leave with, each contradicting a plausible wrong instinct:

1. **The org plugin owns its tables.** The student does not hand-write `organization` / `member` / `invitation`. They add Better Auth's organization plugin, regenerate the schema, and the tables drop in next to the Unit 8 four. The senior reflex is *don't rename them to match house style* — every plugin call assumes its own names.
2. **The active org is server-side session state, not URL or client state.** It lives as a nullable column on the `session` row, set on session creation by a database hook, switched by a Server Action that calls `setActive`. The wrong instinct — carry `orgId` in the URL or `localStorage` — is named and refuted because it reappears as a security hole in lesson 2 (`tenantDb` trusts the session, never a param).
3. **Switching orgs invalidates cache.** After `setActive`, every cached read of the old org is stale. The switch action revalidates and the client refreshes. Forgetting this is the headline bug of the lesson — the user switches to Acme and still sees Personal's data.

Pedagogical strategy. This is the "mechanics + setup hybrid" the chapter outline calls for. Lead each section with the decision, then the code. The student is past beginner scaffolding — keep prose terse and adult. The lesson is concept-dense but the code is short (plugin config, a four-line hook, two thin Server Actions, one switcher component, one helper), so the cognitive budget goes to *why each piece lives where it does*, not to syntax volume. Build the model in the order a developer would actually wire it: schema first (where the company lives), then the session slot (which one is active), then initial-active (sign-in), then the null branch (brand-new user), then create, then switch + the cache reflex, then read-at-request-time (`requireOrgUser`). Two diagrams carry the load: an ER diagram pinning `activeOrganizationId` to the table graph, and a sequence diagram for the switch-and-revalidate flow. Two checks for understanding: a `Buckets` sort on session-vs-user-vs-url state placement, and a `Sequence` ordering drill on the switch lifecycle. No live-coding sandbox — the Better Auth org plugin can't run in `ReactCoding` (react-only iframe) and the wiring is config/server-side, so understanding checks are the right tool here.

Code conventions to honor (grounded in the Chapter 055 project + Code conventions doc): the org plugin goes in `plugins: [...]` **before** `nextCookies()` (nextCookies must stay last or Set-Cookie doesn't flush); the schema lands in `src/db/schema/auth.ts`; Server Actions follow parse → authorize → mutate → revalidate → return and return `Result<T>`; `requireOrgUser(role?)` returning `{ user, orgId, role }` is already named in the conventions as the third rung of the session-read ladder — this lesson stands up its org-resolution half (the `role` is threaded but its *semantics* are Chapter 057, see Scope). Slugs validated at the action boundary against `^[a-z0-9-]{3,32}$` with a reserved-slug blocklist. `revalidatePath('/', 'layout')` after `setActive`.

## Lesson sections

### Where the company lives: three tables from one plugin

Open with the senior question (framing above) stated as the lesson's spine, then answer the first third: the data shape. The student already has four auth tables; companies need their own.

Introduce Better Auth's organization plugin as the owner of three tables, generated together:

- `organization` — `id`, `name`, `slug`, `logo?`, `metadata?`, `createdAt`.
- `member` — `id`, `userId`, `organizationId`, `role`, `createdAt`. The join row: which user belongs to which org, in what role.
- `invitation` — generated now, **wired in Chapter 058**. Name it, note its columns exist but stay dormant this chapter, and move on. Do not teach the invite flow here (see Scope).

Wiring, shown as a `CodeVariants` (two related files, before/after the same edit):

- Tab 1 — `src/lib/auth.ts`: add `organization()` to `plugins`, **before** `nextCookies()`. Use a `// new` marker on the added import and the plugin call. Reinforce the ordering rule inline (nextCookies last, flushes Set-Cookie). Configure `organization({ teams: { enabled: false } })` here so the teams decision is visible in the same block (next section explains it).
- Tab 2 — `src/lib/auth-client.ts`: add the matching `organizationClient()` to the browser client's `plugins`. The senior rule: the client plugin set must mirror the server's, or the typed `authClient.organization.*` methods don't exist.

Then the generate step in a `Steps` block: run the Better Auth schema generator (the same CLI used in Chapter 052 for the four core tables), review the diff, and the new tables + the `activeOrganizationId` column on `session` appear in `src/db/schema/auth.ts`. Migrate with Drizzle Kit. Note `drizzle-kit generate --name add_organizations` then `migrate` per the migration-naming convention.

The senior reflex, stated plainly: **do not rename the plugin's tables or columns.** Every internal plugin call (`create`, `setActive`, `list`) issues SQL against `organization` / `member` by those exact names; a "house style" rename breaks them silently — no type error, a runtime failure on first call. This is the same "consume the library on its terms" instinct from Unit 8.

Diagram (the lesson's primary visual) — **D2 ER diagram** (`shape: sql_table`), `direction: right`, inside `<Figure>`. Show five tables: `user`, `session`, `organization`, `member`, plus a greyed/de-emphasized `invitation` (labelled "Chapter 058"). Draw the FKs: `member.userId → user.id`, `member.organizationId → organization.id`, `session.userId → user.id`, and the load-bearing one this lesson adds — `session.activeOrganizationId → organization.id` (render this edge in an accent color, it's the lesson's centerpiece). Pedagogical goal: make "a user reaches an org *through* a membership row, and the session points at one active org" a picture the student can hold. Caption ties the accent edge to the next section.

Tooltips (`Term`): "tenancy / multi-tenant" (one app instance serving many isolated customer orgs) on first use; "join table" if used for `member`.

### organizations, not teams — the two-level hierarchy you turn off

Short decision section. The plugin supports a second level: an org can contain *teams*, and a member belongs to the org (with a role) and optionally to teams within it.

Frame as a defaults-before-conditionals call. For a year-1 SaaS the senior decision is **organizations only**. Teams are the conditional reach — the right tool *when the product surfaces "departments inside a company"* (an org with separate Sales / Engineering scopes). Until that requirement is real, the team layer is config surface and migration weight with no payoff.

The student already wrote `teams: { enabled: false }` in the previous section's config; here just explain *why* that line is there and what flipping it would add. One sentence on the conditional: when departments become a real requirement, flip `enabled: true` and the plugin adds the `team` / `teamMember` tables and an `activeTeamId` slot — the same shape, one level deeper. Named once, not built (see Scope).

This section earns its place by teaching the *decision*, not the feature — it's the senior-mindset filter applied to a plugin knob.

### One slot per session: adding activeOrganizationId

The heart of the lesson's model. The generate step already added the column; now explain what it *is* and why it lives where it does.

`session.activeOrganizationId` — nullable string FK to `organization.id`. **One row per session.** Switching orgs *updates the existing session row*; it does not mint a new session.

The load-bearing decision, taught against the wrong instinct: **why on `session` and not on `user`.** The same human can have two browser sessions open at once — reviewing their own invoices in their Personal org in one tab while triaging Acme's in another. Active org is per-*session*, not per-*user*, so each device/tab carries its own. This composes directly with the multi-device session model from Chapter 054 lesson 3 (each `session` row is independent) — call that linkage out explicitly so the student sees it's the same model extended, not a new one.

Reinforce the contrast that defines the rest of the unit: active org is **server-side session state**. It is *not* URL state (no `/o/:orgId` for tenancy decisions) and *not* client state (`localStorage`/a separate cookie). Foreshadow why, without teaching it yet: lesson 2's `tenantDb` reads `orgId` from the validated session, so any other source is a membership-check bypass. This is the first appearance of a thread that runs through the whole chapter.

Understanding check — **`Buckets`** (classification drag-and-drop). Items the student sorts into "session row" / "user row" / "URL or client (wrong for tenancy)": `activeOrganizationId`, `userId`, `email`, "which org's data the dashboard shows right now", "the org slug in a shareable deep link" (URL is fine for *linking*, not for the tenancy *decision* — make the distinction the teachable moment in the explanation), "`localStorage.activeOrg`" (wrong bucket — drifts from server truth, breaks across devices). Goal: cement the placement decision before the student writes code that depends on it.

Tooltip (`Term`): "FK / foreign key" only if not already defined earlier in the lesson.

### Setting the initial active org with a session-creation hook

Now the slot exists; who fills it on sign-in? Every flow that mints a session must set the initial active org, and there are several entry points (sign-in, sign-up, future OAuth callback, magic link).

The senior reflex up front: **don't set it in the sign-in action.** That covers exactly one entry point and silently leaves the slot `null` for sign-up and every future auth method — a latent bug that ships the day someone adds OAuth. The one place that structurally covers *every* session-minting path is the database hook.

Teach `databaseHooks.session.create.before`. Show the exact shape (verified against current Better Auth docs):

```ts
databaseHooks: {
  session: {
    create: {
      before: async (session) => {
        const orgId = await resolveInitialOrg(session.userId);
        return { data: { ...session, activeOrganizationId: orgId } };
      },
    },
  },
}
```

Use **`AnnotatedCode`** here — the hook has three things the student's eye must land on separately: the `before` phase (runs *before* the row is written, so the returned object becomes the inserted row), the `{ data: { ...session, ... } }` return contract (spread the existing session, override one field — getting this shape wrong is the common mistake), and the `resolveInitialOrg` call. Steps:
1. `{ data: { ...session } }` return shape — must return an object with a `data` key, not the bare session; must spread existing fields.
2. The override — set `activeOrganizationId` on top of the spread.
3. The lookup — delegate to a small helper.

Then show `resolveInitialOrg(userId)` as a plain `Code` block: the precedence is **most-recent active org if one exists → else first membership → else `null`**. A ~4-line query against `member` (ordered, `limit 1`) returning the org id or null. Keep it small; the point is the precedence policy, not query golf.

Senior note: the hook runs on *every* session creation by construction — that's the whole reason to use it over an action. One place, every path, covered.

### The brand-new user has no org: the null branch

The deliberate edge case. A fresh sign-up has zero memberships, so `resolveInitialOrg` returns `null` and the session's `activeOrganizationId` is `null`. The app must handle exactly one "signed in but no active org" state — and exactly one place where it's allowed.

Teach the protected-layout gate. The student already has a `(protected)/layout.tsx` from Chapter 055 that calls `requireUser()`. Show extending the layout's read to also resolve the active org and branch: if `activeOrganizationId` is `null`, `redirect('/onboarding/create-org')`. Stub that route as a placeholder page (the real create form lands two sections down).

The senior reflex, stated as an invariant: **`/onboarding/create-org` is the only route in the authenticated app that tolerates a null active org.** Every other read assumes a non-null org, and lesson 2's helper enforces that assumption. This is why the branch is centralized in the layout, not scattered per-page.

Watch-out, made concrete: the proxy's authed-pages matcher (Chapter 054 lesson 1) must **not** block `/onboarding/create-org`. A user with a valid session cookie but no org would be allowed past the proxy, hit the layout, get redirected to `/onboarding/create-org`, and — if the proxy also gated that route on "has org" (it can't, the proxy is cookie-presence only, but if someone added an org check there) — loop forever. Frame it as: keep authorization out of the proxy (the Chapter 054 rule), and this loop can't form. Use an `Aside` (caution).

### Creating an organization

The create flow, mirroring every Unit 6 form the student has built. This is where the slug decision lands.

**The slug decision** (decision before code). Every org gets a slug because URLs and emails want a stable handle (`/o/acme/...`, `noreply+acme@`). Two strategies:
- App-generated from the name with a uniqueness suffix (`acme`, `acme-2`).
- User-chosen at create time with a uniqueness check.

Senior default: **user-chosen.** Companies care about their URL identity, and the "that slug is taken" message is part of the create flow's UX — an app-generated `acme-2` surprises the user later. Validate at the action boundary: allowlist `^[a-z0-9-]{3,32}$` and a reserved-slug blocklist (`admin`, `api`, `app`, `auth`, `billing`) so the plugin's tables can't collide with future top-level routes.

**The call.** `authClient.organization.create({ name, slug, logo? })`. The library validates slug uniqueness, inserts the `organization` row plus a `member` row with role `owner` for the creator, and — because `keepCurrentActiveOrganization` defaults false — sets the new session's `activeOrganizationId` to the new org. One round trip.

**The Server Action**, shown as `AnnotatedCode` (the canonical five-seam shape applied — the student should recognize it from Unit 6 and see the org-specific parts):
- `parse` — Zod `strictObject` with `name`, `slug` (regex-refined), optional `logo`; `safeParse` `Object.fromEntries(formData)` first.
- `authorize` — `requireUser()` (any signed-in user may create an org; no role gate — role semantics are Chapter 057).
- `mutate` — call `auth.api.createOrganization({ body, headers: await headers() })` (server-side form; note `headers` is required, mirroring the `getSession` call shape from Chapter 052).
- `revalidate` — `revalidatePath('/', 'layout')` (the new org is now active; the layout's switcher and any org-scoped read must refresh).
- `return` / redirect — map the slug-taken error to `Result.err({ code: 'conflict', ... })` with a `fieldErrors.slug` message; on success `redirect('/dashboard')`.

Highlight the `Result` discriminants the form consumes: `ok`, `conflict` (slug taken), `validation` (bad slug shape). Keep the form itself to a `Code` snippet or a brief mention — the student built this exact form shape (uncontrolled inputs, `useActionState`, `<SubmitButton>`) repeatedly in Unit 6; don't re-teach it, just point at the slug field reading `state.error.fieldErrors?.slug?.[0]`.

Tooltip (`Term`): "slug" (URL-safe lowercase identifier for a resource).

### Switching organizations and the cache that goes stale

The conceptual peak. Switching is two moves the student must never separate: change the active org **and** invalidate the cache that was keyed to the old one.

**The call.** `authClient.organization.setActive({ organizationId })`. The library verifies the user is a member of the target org, updates `session.activeOrganizationId` on the existing row, and updates the cookie-cached session immediately so the next request reads the new value.

**The cache reflex — the headline bug of the lesson.** After `setActive`, every cached layout/page read computed under the *old* org is stale. If the action doesn't invalidate, the user switches to Acme and the dashboard still streams Personal's invoices until the route cache expires. The senior reflex: wipe the layout cache on switch, don't hope for a reload. The switch Server Action calls `revalidatePath('/', 'layout')` after `setActive`; the client completes the picture with `router.refresh()`. Tie back to Chapter 052 lesson 3's cookie-cache: the `maxAge` window is *irrelevant* here because `setActive` rewrites the cookie immediately — don't reach for a shorter/longer cookie-cache on this account.

Diagram (second primary visual) — **Mermaid sequence diagram** in `<Figure>`, actors: User, Switcher (client), Switch Action (server), Better Auth, DB, Cache. The chapter outline explicitly asks for this one. Steps: click switch → `setActiveOrgAction(orgId)` → `auth.api.setActiveOrganization` → DB updates `session.activeOrganizationId` + cookie rewritten → `revalidatePath('/', 'layout')` invalidates → action returns → `router.refresh()` → next render reads the new `orgId` → new org's data renders. Pedagogical goal: make the *ordering* legible — the revalidate sits between the DB write and the next render, and skipping it is the visible gap.

Understanding check — **`Sequence`** ordering drill. Scrambled steps of the switch lifecycle (call `setActive` / verify membership / update session row / rewrite cookie / `revalidatePath` / `router.refresh` / next request reads new org / render new data). Goal: the student reconstructs the lifecycle and internally flags the revalidate step as non-optional. Pairs with the sequence diagram (diagram teaches, drill checks).

Edge case worth one short paragraph (senior nuance, not a watch-out): a switch fired while a Server Action from the *old* org is still in flight (a slow save). That action read the old `orgId` at its start and completes against the old org — **this is correct**, actions resolve in the context they began. The `router.refresh()` after switch keeps the UI unambiguous, but the in-flight write is not a bug. Frame as "actions are snapshots of the org they started in" — reassures the student that the model is consistent under concurrency.

### The org switcher in the layout

The UI surface, kept tight. A `<Select>` (shadcn) in the protected-layout header listing the user's orgs, calling `setActiveOrgAction(orgId)` on change.

Where the list comes from: server-side `auth.api.listOrganizations({ headers: await headers() })` in the layout (SSR, passed as a prop) — preferred over the client `authClient.organization.list()` for the initial render so the switcher isn't empty on first paint. Name both; default to the server read in the layout.

Senior reflex: **render the switcher once, in the protected layout — not per page.** One mount point, one source of truth for the membership list, one place that calls the switch action. Scattering it per-page means N copies drifting. This is the same "layout owns the cross-cutting chrome" instinct as the `AppNav` the student already has.

Show as a brief `Code` block or short `AnnotatedCode`: the layout reads the org list + current active id, passes them to a client `<OrgSwitcher>` island that renders the `<Select>` and on change calls the action then `router.refresh()`. Don't over-build the component — the lesson's weight is on the model, and the switcher is its thin UI cap.

### Reading the active org at request time: requireOrgUser

The closing piece that hands off to lesson 2. Every server surface that touches tenant data needs the active org, read from one place.

The student has `getCurrentUser` / `requireUser` (Chapter 052 lesson 4). Introduce the third rung named in the code conventions: **`requireOrgUser(role?)`** returning `{ user, orgId, role }`. This lesson builds its org-resolution half:
- Resolve the session once (through the same `cache`d `getSession` ladder — never a second `getSession` call).
- If no user → `redirect('/sign-in')`.
- If `activeOrganizationId` is `null` → `redirect('/onboarding/create-org')` (the same null branch as the layout, now centralized in the helper so actions get it too).
- Return `{ user, orgId, role }` where `orgId` is the non-null active org and `role` is the caller's membership role.

Be explicit about the Scope boundary: this lesson wires `requireOrgUser` to *resolve and return* `orgId` (and to redirect on the null branch). The `role?` parameter and the **enforcement** of roles is Chapter 057 lesson 1 — here `role` is threaded through the return but not gated on. Say so in one sentence so the next-lesson author and the student both know where the seam is.

The non-negotiable rule, stated as the lesson's final invariant and the bridge to lesson 2: **`orgId` comes only from the server-validated session — never a route param, a form field, or a client header.** `tenantDb(orgId)` in the next lesson trusts this helper completely; if `orgId` could come from the URL, a user could read another company's data by editing it. This is the security payoff of every "active org lives on the session" decision in this lesson, made concrete.

Show the canonical action opener as a tiny `Code` block: `const { user, orgId } = await requireOrgUser();` — three words that will start every tenant-scoped action and Server Component in the rest of the course. End the lesson by pointing forward: lesson 2 takes this `orgId` and makes the missing org filter *not compile*.

### Watch-outs that ship the bug

Gather the lesson's failure modes that didn't get a full section, each as one or two tight lines (an `Aside` cluster or a compact bulleted list — keep them attached to the concepts they qualify, per the no-orphan-watchouts rule; these are the residue, the big ones are taught inline above). Frame each as "the bug that ships if the discipline isn't structural":

- Storing active org in `localStorage` or a side cookie — drifts from session truth, breaks across devices. (Already refuted in the `Buckets` check; one-line reprise.)
- Reading `activeOrganizationId` from a URL/route param and trusting it — bypasses the membership check; the lesson 2 security hole previewed.
- Renaming the plugin's `organization` / `member` tables — every plugin call breaks silently.
- Setting active org in the sign-in action only — sign-up and future OAuth paths leave it null.
- Forgetting `revalidatePath` after `setActive` — stale org data until the route cache expires.
- Blocking `/onboarding/create-org` in the proxy matcher — redirect loop for org-less users.
- Trusting that `setActive` can be called for a non-member — it can't (the library checks), but the senior reads the source on first use rather than assuming.

Keep this short — most of these are reprises of inline teaching, collected for recall.

## Scope

**Prerequisites (assume, redefine in one line at most):**
- Better Auth `auth` instance, `authClient`, the `[...all]` route, `getCurrentUser`/`requireUser`, cookie-cache (Chapters 052–054).
- The `user`/`session`/`account`/`verification` schema and the Better Auth schema generator + Drizzle Kit migrate flow (Chapter 052 lesson 2).
- Five-seam Server Action shape, `Result` contract, Zod `safeParse`, uncontrolled forms + `useActionState` + `<SubmitButton>` (Unit 6).
- Multi-device session model — each `session` row is independent (Chapter 054 lesson 3).
- `revalidatePath` and `router.refresh()` mechanics (Unit 4 / Chapter 052 lesson 3); cookie-presence proxy gate (Chapter 054 lesson 1).

**This lesson does NOT cover (defer, do not teach):**
- **Role semantics** — `owner`/`admin`/`member` authority, the single-owner invariant, `roleAtLeast`. `requireOrgUser` *returns* `role` but does not gate on it here. → Chapter 057 lesson 1.
- **The `authedAction(role, schema, fn)` wrapper.** This lesson writes raw five-seam actions; the wrapper that lifts session+role+parse out of them is → Chapter 057 lesson 2.
- **`tenantDb(orgId)`** — the data-scoping helper. This lesson stops at producing a trusted `orgId`; the next lesson consumes it. → Chapter 056 lesson 2.
- **Invitations and the accept handshake** — the `invitation` table is generated and named here, wired → Chapter 058.
- **Member management** — remove, leave, transfer ownership, change role. → Chapter 057 lesson 4.
- **Teams inside an org** — named once as the conditional reach, `teams.enabled` left false; not built.
- **The audit-log row** on create/switch. → Chapter 057 lesson 5.
- **RLS / database-layer scoping.** → Chapter 056 lessons 3–4.
- The full onboarding/create-org *form* polish and the org *settings* surface — stub the route; the create action is taught, the broader onboarding UX is out of scope.
