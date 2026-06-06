# Lesson title

- Title: `Formats over regexes`
- Sidebar label: `Formats over regexes`

(L1 already used "the eight builders"; the chapter-outline title fits — this lesson's whole thesis is "name the format, don't hand-roll a regex.")

---

# Lesson framing

**Shape.** This is the chapter's reference-survey lesson, but reference-survey is a trap: a flat catalog of every builder is a glossary, not a lesson. Frame it as a single decision the student makes over and over — *"a string crosses the wire; what does the schema for it look like?"* — and the catalog falls out as the answer applied to email, IDs, URLs, dates, IPs, numbers. The senior reflex (**pick the named format, not a regex**) is the spine; every builder is an instance of it. Keep the prose between code thin and let the format reference itself carry the body.

**What L1 established that this lesson continues.** L1 taught the eight structural builders and the keystone idea (one schema declaration = a runtime parser + an inferred type). It deliberately wrote email fields as `z.string()` and promised the format builders here. The running example is the invoice-creation input (`email`, `quantity` positive int, `status` enum of `draft/sent/paid/overdue`, `tags` string array). Conventions locked in L1 and Code conventions: `import { z } from 'zod'`; schema const camelCase (`invoiceSchema`, `createInvoiceSchema`); inferred type alias PascalCase on the line directly below (`type Invoice = z.infer<typeof invoiceSchema>`); schemas live in `/lib`. Zod pinned to **4.4.3** in playground/coding callouts. `course-progress` frontmatter + `chapter-id: 42`. Inline vocab via `<Term definition="...">word</Term>`.

**The one v3→v4 callout this lesson owns** (chapter thread: name the v3 legacy once where relevant, then write v4 everywhere): the **string-format migration**. v3 chained `z.string().email()`; v4 promotes the format to a top-level builder `z.email()`. Show the v3 chain exactly once as the "what you'll see in older codebases / what AI may emit" form, struck through, then never write it again. The senior justification is concrete and worth stating: top-level builders **tree-shake** (the chain drags the whole `ZodString` class in even if you only need email) and each builds-in its own error message and JSON-Schema shape.

**The mental model the student should leave with.** "When a string of a known *kind* (email, UUID, URL, ISO date, IP) crosses an untrusted boundary, there is a named Zod builder for that kind — reach for it before reaching for `.regex()`. The format is the type, not a postfix modifier. Numbers and dates get inline constraint chains. The schema validates *shape and format*; cross-resource rules (uniqueness, blocklists) live at the action layer, not here." At the end the student can write the format half of any realistic SaaS input schema and can name, for a given field, which builder and which constraints it takes.

**Two fact-checked corrections to the chapter outline** (apply these; they override the outline):
1. **`z.number()` rejects `NaN` and `Infinity` by default in Zod 4.** This is a v3→v4 breaking change. The chapter outline's watch-out ("`z.number()` accepts NaN and Infinity by default — pair with `.finite()`") describes **v3** and is wrong for v4. Teach the v4 truth: `z.number()` already excludes them; `.finite()` is redundant in v4 (legacy/no-op for the common case). Do **not** teach `.finite()` as a production reflex — that would teach a stale pattern. If a field must *accept* `Infinity`, that's the rare opt-in (`.or(z.literal(Infinity))`), out of scope — name only if it comes up.
2. **`z.url()` protocol allowlist** — the current API is `z.url({ protocol: /^https?$/ })` and pairs with an optional `hostname` regex; `z.httpUrl()` exists as a related shortcut but the documented canonical pattern for "must be http/https" is the `protocol` option. Teach the `protocol` option as the primary; name `z.httpUrl()` once as the shorthand.

**Cognitive-load order.** Lead with the migration (the "why top-level") so every subsequent builder reads as an instance of one rule. Then the string-format reference (the densest, most-used block). Then numbers + dates (constraint chains, a different shape). Then the string-constraint chains that *complement* formats and the explicit "regex is the last resort" rule. Close with the boundary rule (schema validates shape, action validates cross-resource). One graded `ZodCoding` exercise mid-lesson on the migration, one classification drill (`Buckets`) near the end on builder-vs-regex / where-rules-live. Keep diagrams minimal — this lesson is text-and-code dense; the one visual worth it is a small "format is the type" before/after, best served by `CodeVariants`, not a drawn diagram.

---

# Lesson sections

## Introduction (no header)

Per pedagogical structure: warm, brief, states the senior question implicitly. Open on the running invoice/signup input from L1 but zoom to the fields L1 left as bare `z.string()`: the `email`, plus the new fields a real sign-up carries — an invitation-token `uuid`, a requested-start `iso.datetime`, a rate-limit-key `ip`. L1 validated these as "a string"; that parses `"not-an-email"` and `"banana"` as valid. The gap: a string that is *of a kind* needs more than "is a string." State the move: Zod 4 ships a named builder for every common kind, and reaching for the named builder beats hand-writing a regex on every axis that matters. Preview the practical skill: by the end, the student writes the format half of any SaaS input schema. Render the `<CourseProgressBar>` line as L1 does.

Carry the `z.email()` `<Term>` here (first use): "Zod 4 top-level builder that validates an RFC-aligned email string and infers as `string`."

## The format is the type, not a postfix modifier

**Goal:** install the central rule and retire the v3 chain in one move. This is the lesson's thesis section.

Teach: v3 wrote `z.string().email()` — a `ZodString` with a format check chained on. v4 ships `z.email()` as its **own top-level builder**: it infers as `string` and bundles the format validation. The two parse the same valid emails; the difference is structural and it matters for three concrete reasons — (1) **tree-shaking**: the top-level builder pulls in only the email validator, the chain pulls the whole `ZodString` surface; (2) each top-level builder **carries its own default error message** ("Invalid email" vs a generic string failure); (3) cleaner **JSON-Schema** output (matters once Unit's OpenAPI surface lands — name once, don't expand). The chain is **deprecated** in v4 (still parses, emits a deprecation signal); new code writes the top-level form. Frame it as: *the format is the type of the field, so it belongs at the top level where the type is declared, not bolted on after.*

**Component — `CodeVariants`**, two tabs, before/after framing (this is the one "visual" the lesson needs; CodeVariants is the right tool over a drawn diagram per its before/after strength):
- Tab "Zod 3 (legacy)": `email: z.string().email()` with the `.email()` struck via `del=`-style mark or `data-mark-color="red"`. Prose first sentence: "What you'll meet in older codebases and what an AI may still emit — deprecated in v4."
- Tab "Zod 4": `email: z.email()`, `data-mark-color="green"`. Prose first sentence: "The format is the builder. Infers as `string`, tree-shakes, ships its own error message."
Keep both inside the invoice/signup schema context (one or two sibling fields visible) so it reads as real code, not a snippet.

State the rule explicitly as a one-liner the student carries: **reach for the named format builder before `.regex()`.** This rule gets *proven* in the "When the format runs out" section later; here it's asserted.

**Graded exercise — `ZodCoding`** right after the rule lands. This is the canonical use of `ZodCoding` (the doc's own pitch: show inferred type + per-fixture pass/fail together). Starter: a `signupSchema` written the L1 way — every format field as `z.string()` — with a `^?` query on `type Signup = z.infer<typeof signupSchema>`. Task: replace each bare `z.string()` with the correct top-level format builder so the reject-fixtures fail. `schemaName="signupSchema"`. Fixtures:
- `{ name: 'valid signup', input: { email: 'ada@example.com', token: <a v4 uuid>, startAt: '2026-09-01T10:00:00Z' }, expect: 'pass' }`
- `{ name: 'bad email', input: { email: 'not-an-email', ... }, expect: 'fail', errorContains: 'email' }`
- `{ name: 'bad token', input: { ..., token: 'nope' }, expect: 'fail' }`
- `{ name: 'bad datetime', input: { ..., startAt: 'yesterday' }, expect: 'fail' }`
The `^?` query lets the student see the inferred type stays `string` after the swap — reinforces "the format is the type, the type didn't change." Instructions string: one sentence pointing at the `^?`.

## The format catalog for SaaS inputs

**Goal:** the reference body — the dozen builders the SaaS surface actually reaches for. This is the densest section; keep prose-between-entries to one line and let structure carry it. Do **not** use a drawn diagram; the natural shape is a tight reference. Author it as **prose grouped under bolded builder names with a one-line "what + when" each**, not a literal markdown table (the writer may use a compact list). Cover, in this order:

- **`z.email()`** — RFC-aligned email; the default is production-appropriate. Stricter regex is opt-in via the `pattern` option (`z.email({ pattern: z.regexes.html5Email })` or a custom regex) for the rare case a platform's deliverability rules demand it. Name `pattern` once; don't expand the regex zoo.
- **`z.uuid()` vs `z.guid()`** — the one distinction worth a beat (it's a quiz topic and a real footgun). `z.uuid()` is **strict** in v4: RFC 9562/4122, versions 1–8, the variant bits must be right. `z.guid()` is the **permissive** "any 8-4-4-4-12 hex" validator. The senior call: **`z.uuid()` for app-generated IDs** (the chapter-6 UUIDv7 primary keys round-trip cleanly through it), **`z.guid()` only when an upstream system hands you identifiers that may not be RFC-strict.** Flag the migration trap explicitly: v3's `z.string().uuid()` was *looser* and maps to v4's `z.guid()`, not `z.uuid()` — code that "worked in v3" can start rejecting in v4 if you reach for `z.uuid()` on a non-strict source.
- **`z.url()`** — `URL`-constructor-compatible. The production rule "must be http or https" is the **`protocol` allowlist**: `z.url({ protocol: /^https?$/ })`, optionally `hostname`. Name `z.httpUrl()` as the shorthand for exactly that case. This is a security boundary, not cosmetics — see the watch-out below (`javascript:` URLs).
- **ID encodings — `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.nanoid()`** — one line for the group: alternative ID formats. The senior call is not an opinion contest: **use the format the upstream system produces.** Named, not drilled.
- **`z.ipv4()`, `z.ipv6()`** — IP validators; the use-site is typing the client IP read from `headers()` (forward-pointer to Chapter 033's request-surface lesson — name it, don't teach it). Mention `z.cidrv4()`/`z.cidrv6()` exist for CIDR blocks in one half-sentence.
- **`z.iso.date()`, `z.iso.time()`, `z.iso.datetime()`, `z.iso.duration()`** — ISO 8601 string validators. The key teaching point, stated once and load-bearing: **these validate the string format and infer as `string`, not `Date`.** The in-memory date type is still `Date` (and the full timezone-aware story is Chapter 083 — forward-pointer). Reach for `z.iso.datetime()` for any string-shaped instant crossing the wire (URL params, JSON bodies). Note `z.iso.datetime()` rejects timezone offsets by default and takes `{ offset: true }` / `{ precision }` — name the options once, don't drill.
- **`z.jwt()`** — named once and dropped: auth flows (Unit 8, Better Auth) verify tokens through the auth library, not by parsing JWTs in a schema.
- **`z.e164()`** — the phone-number *format*. State the chapter's "named once, dropped" line verbatim in spirit: `z.e164()` validates the format; the full phone-parsing rabbit hole (libphonenumber) is a parser, not a schema concern, and is out of scope.

**No exercise here** — the reference is consolidated by the `ZodCoding` already done and the `Buckets` drill later. Keep momentum.

`<Term>` candidates in this section (be strategic — only non-obvious ones): **RFC 4122 / 9562** ("the spec that defines UUID structure and versions"), **CUID / ULID / nanoid** (one combined-ish: "alternative collision-resistant ID string formats produced by various systems"), **E.164** ("the international standard format for phone numbers, like `+14155550123`"), **ISO 8601** ("the international standard for representing dates and times as strings, like `2026-09-01T10:00:00Z`"). Skip Term on `JWT` if it was defined earlier in the course; if unsure, a one-liner Term is cheap and safe.

## Numbers and dates take constraint chains

**Goal:** the second builder shape — value-range constraints chained inline, a different mental shape from the format builders. This is where the **fact-checked v4 correction** lands.

Teach numbers first:
- `z.number()` accepts JS numbers and **rejects `NaN` and `Infinity` by default in Zod 4** — state this as a v4 fact and a small relief: the footgun is handled for you. (Do **not** teach `.finite()` as a reflex — it's redundant in v4. If the writer wants to mention it, frame strictly as "v3 needed `.finite()`; v4 doesn't" — one sentence, as a migration note, not a recommended pattern.)
- The constraint chain attaches inline: `.min(0)`, `.max(100)`, `.gt()`, `.gte()` (alias `.min`), `.lt()`, `.lte()` (alias `.max`), `.int()`, `.positive()`, `.nonnegative()`, `.multipleOf(0.01)`. Show the canonical money/quantity shapes: a quantity is `z.number().int().positive()` (this is the exact shape L1's running example used — call back to it), a money amount is `z.number().positive().multipleOf(0.01)` (name once that real money has a deeper story — `numeric`-as-string from the DB, `decimal.js` — reserved for L7/Drizzle; here it's the schema-level approximation).
- **`z.int()`** — the top-level shortcut for integer-only, equivalent to `z.number().int()`, clearer at the schema site. Prefer it when the field is conceptually an integer.

Then dates (kept tight — the deep version is Chapter 083):
- `z.date()` accepts `Date` instances (not strings) and takes ranges: `.min(new Date('2020-01-01'))`, `.max(...)`. Contrast in one line with `z.iso.datetime()` from the prior section: **`z.iso.datetime()` validates a string and infers `string`; `z.date()` validates a `Date` instance and infers `Date`.** Which one you reach for depends on whether the value arrives as a string off the wire (then `z.iso.datetime()`) or is already a `Date` in memory (then `z.date()`). The *bridge* between the two (coercing a form string to a `Date`) is L6's job — forward-pointer, one sentence.
- `z.bigint()` — accepts a `bigint`; one line noting the JSON-boundary serialization caveat (a `bigint` doesn't `JSON.stringify` cleanly — student met this earlier in the course; reference, don't re-teach).

**Component — `Code` (plain fenced block)** for the constraint-chain examples (they're short and the focus isn't multi-part). One small block showing the quantity / money / `z.int()` / `z.date().min()` lines together is enough. If the writer feels a single block needs directed attention across 3-4 distinct chains, `AnnotatedCode` (color blue, ≤4 steps) is acceptable — but default to plain `Code`; this is reference, not a complex single artifact.

**Optional `ZodPlaygroundCallout`** here for the student to poke at number constraints live (e.g. watch `z.number().int().positive()` reject `NaN`, `3.5`, `-1`, accept `3`). Use `version="4.4.3"` to match the chapter pin (note: the playground default is newer; pass the pin explicitly). `schema` must end with `return schema`. Keep it a single small callout; don't over-embed. This is the spot where "NaN is rejected by default" is most convincingly *shown* rather than asserted.

## When the format runs out: string constraints and the regex of last resort

**Goal:** close the format story by showing the constraints that *complement* the formats, and make the "regex last" rule operational (it was asserted earlier; here it's proven and bounded).

Teach the string-constraint chain that layers on top of (or beside) the formats: `.min(n)`, `.max(n)`, `.length(n)`, `.startsWith()`, `.endsWith()`, `.includes()`, `.regex(/.../)`, and the normalizers `.trim()`, `.toLowerCase()`, `.toUpperCase()`. Two teaching points carry this section:

1. **Format builders compose with constraints.** A real signup email is `z.email().max(254)` — the format validates the kind, `.max` defends against pathological inputs. State the production reflex: a max length is cheap insurance on any free-text field a stranger can submit.
2. **The normalizers are transforms that change the *value* but not the inferred type.** `.trim()` / `.toLowerCase()` produce a mutated string; the inferred type stays `string`, but the parsed value is *not* the input value. Name this once so the student doesn't expect the parse output to equal the input. (The type-*preserving* transform mechanism in general — `.overwrite` — and value transforms that *change* the type are L3's territory; here just flag that these specific helpers mutate the value, and stop. Forward-pointer to L3 in one half-sentence.)

Then the spine rule, now bounded: **reach for `.regex()` only when no built-in format fits.** Spell out *why* the named builder wins on every axis the student might not think about — it's **tested** against real-world inputs, **internationalized** (the email/URL validators handle cases a hand-rolled regex misses), **kept current** as specs evolve, and produces a **better error message** ("Invalid email" vs the opaque "does not match /^.../"). The student's instinct from other ecosystems is to reach for a clever regex; the chapter rule is the opposite, and this is the section that earns it. Give one legitimate `.regex()` example (a domain-specific code with no standard format — e.g. an internal SKU like `/^SKU-\d{6}$/`) so "last resort" doesn't read as "never."

**Graded/interactive exercise — `Buckets`** (classification drill; the right tool to consolidate "which builder for which field" without more typing). Two-column (`twoCol`). Buckets: **"Named format builder"** (description: "a built-in covers this") and **"Reach for `.regex()`"** (description: "no built-in fits — last resort"). Items (chips, inline code where natural):
- "A user's email address" → format
- "A v7 UUID primary key" → format
- "An ISO 8601 timestamp" → format
- "A redirect URL (must be https)" → format
- "An IPv4 rate-limit key" → format
- "An internal SKU like `SKU-000123`" → regex
- "A US ZIP+4 like `94105-1234`" → regex (defensible — no built-in)
- "A semantic-version string `1.4.2`" → regex
Instructions string: "Sort each field by whether Zod 4 ships a named builder for it, or whether it's a genuine last-resort regex."

## Where format validation stops: shape here, cross-resource rules at the action

**Goal:** draw the boundary so the student doesn't try to stuff database-dependent rules into the schema. Short, principled, closes the lesson. This is the "in production you'd also…" short-list from the chapter outline, framed as a boundary rule rather than a grab-bag.

Teach: the schema validates **shape and format** — things provable from the value alone. A real signup schema layers on a `.max(254)` and a `.toLowerCase()` normalization, and *that's the schema's job done*. But the rules a senior also knows a signup needs — *is this email already registered? is it on the `email_suppressions` blocklist (Chapter 048)? does the org slug collide?* — are **not** format rules. They require a **database lookup**, and a schema that needs a DB connection to parse is the failure mode. Those rules live in the **Server Action's body, after the parse** (Server Actions are the very next chapter, 043 — forward-pointer). State the principle as a one-liner the student carries into Unit 6: **the schema validates shape; cross-resource rules (uniqueness, blocklists, permissions) live at the action layer where database access is legitimate.** This also previews L3's "checks vs action layer" split without stealing it (L3 owns custom refinements; this is just the format-lesson's corner of the same boundary).

**No exercise** — end on the principle. Optionally a single `Aside` (note) restating the boundary as the takeaway.

## External resources (optional)

One or two `<ExternalResource>` cards: the Zod **Defining schemas / API** page (the format catalog) and the **v4 changelog / migration** page (the string-format-chain deprecation, in the student's own words "what changed"). Only if they add value; the lesson stands without them.

---

# Watch-outs to fold into their teaching sections

(Per pedagogical rule: watch-outs go *in* the section teaching the concept, never bundled. Listed here so the writer places each correctly.)

- **`z.url()` accepts `javascript:` URLs by default** → goes in the `z.url()` entry. For any URL the app will render or redirect to, the `protocol` allowlist is **non-negotiable** (this is the open-redirect class — Chapter 033 owns the full rule; name it). This is the strongest reason the `protocol` option isn't optional polish.
- **v4 `z.uuid()` is strict** → in the `z.uuid()`/`z.guid()` entry. A v3-style "close enough" UUID *fails* `z.uuid()`; switch to `z.guid()` if the upstream produces non-strict IDs. Already covered as the migration trap above — keep it there.
- **`.trim()` / `.toLowerCase()` mutate the parsed value** → in the string-constraints section. Inferred type stays `string`; the value changes. Already placed there.
- **`z.iso.datetime()` infers `string`, not `Date`** → in both the format-catalog ISO entry and the dates section. The string→`Date` conversion is a transform (L6/L3), not free.
- **`z.number()` and NaN/Infinity** → the *corrected* v4 watch-out: in v4 they're rejected by default, so the v3 advice to add `.finite()` is stale. Place in the numbers section. Do not reproduce the chapter outline's v3 wording.

---

# Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- A schema is a runtime parser + an inferred type (L1's keystone — assume it, one-clause reminder at most).
- The eight structural builders, especially `z.object`/`z.string`/`z.number`/`z.array`/`z.enum` and `z.infer` (L1 — used freely, not re-explained).
- "Parse `unknown` at the wire, trust nothing off the network" (earlier-course wire-boundary idea — referenced as the *why*, already taught).
- `bigint` doesn't JSON-serialize cleanly (earlier course — one-line reference).

**This lesson does NOT cover (reserved for later — name with a forward-pointer at most, never teach):**
- **Custom checks / refinements** when no built-in fits beyond a bare `.regex()` — `.refine`, `.superRefine`, cross-field rules — **L3**. (This lesson's "regex of last resort" is the format-level fallback; *logic* rules are L3.)
- **`.transform` / `.overwrite` / `.pipe`** — value transforms that change or preserve the inferred type — **L3**. This lesson only *flags* that `.trim()`/`.toLowerCase()` mutate the value; it does not teach the transform system, and it does not teach turning an ISO string into a `Date`.
- **`z.coerce`, `z.preprocess`, the `FormData` boundary** — coercing form strings to numbers/booleans/dates — **L6**. The string→`Date` bridge belongs there; here, only the `z.iso.datetime` (string) vs `z.date` (Date) *distinction* is drawn.
- **`z.input` / `z.output`** and composition (`.extend`/`.pick`/`.omit`/`.partial`) — **L4**.
- **`parse` vs `safeParse`, `ZodError`, `z.treeifyError`, the unified `error` option** — **L5**. This lesson does not drill error-message customization; `z.email({ error: '…' })` may appear *incidentally* in one example but the `error` surface is L5's to teach. Fixtures' `errorContains` checks *that* an error fires, not its customization.
- **`drizzle-zod` generation** (`createInsertSchema` etc.) and the money/`numeric`-as-string + `decimal.js` story — **L7**. Money is shown here only as the schema-level `z.number().positive().multipleOf(0.01)` approximation, flagged as incomplete.
- **Timezone-aware dates, `Temporal`, calendar-day vs instant** — **Chapter 083**. Dates here stay at "string format vs `Date` instance"; the in-memory type story is deferred.
- **Reading the client IP from `headers()`, proxy header trust, open-redirect handling** — **Chapter 033**. IP/URL builders are taught as validators; their *source* and the redirect security rule are forward-pointers only.
- **Email deliverability / `email_suppressions`** — **Chapter 048**. Named once as the canonical "cross-resource rule that lives at the action, not the schema" example.
- **Server Actions themselves** — **Chapter 043** (the next chapter). The action layer is referenced as *where cross-resource rules live*, not taught.
- **Async refinements / `parseAsync`** — out of scope entirely here (L3 names them; Unit 22 owns them).
- **OpenAPI / JSON-Schema generation** — named once as a *reason* top-level builders win (cleaner JSON-Schema), not taught.

---

# Code-convention notes for the writer

- Follow Code conventions §"Schemas with Zod 4": top-level format builders only (`z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`, `z.ipv4()`); the deprecated `.string().x()` chain appears **exactly once**, struck through, in the migration section.
- Schema naming: `<entity>Schema` camelCase for canonical shapes (`signupSchema`, `invoiceSchema`), `<verbEntity>Schema` for action-input shapes (`createInvoiceSchema`). Inferred type alias PascalCase on the line directly below the schema. `import { z } from 'zod';`. This matches L1 — do not drift to PascalCase schema consts.
- Pin Zod **4.4.3** in every `ZodPlaygroundCallout` (`version="4.4.3"`) and assume 4.4.x semantics in `ZodCoding`. `ZodPlaygroundCallout` `schema` must end with `return schema`; `values` are JS expressions (quote string literals).
- **Deliberate divergences from "production-complete" code, for pedagogy** (flag so downstream agents don't "fix" them): money modeled as `z.number().multipleOf(0.01)` rather than the `numeric`-string + `decimal.js` production pattern (that's L7); error messages left at Zod defaults (customization is L5); schemas shown standalone in `/lib`, not yet wired to a Server Action (that's Ch043). These are staged simplifications, not mistakes.
