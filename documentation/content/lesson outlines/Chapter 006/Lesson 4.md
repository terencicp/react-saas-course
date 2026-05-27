# Lesson 4 — Augmenting third-party modules

- **Title** (h1): `Augmenting third-party modules`
- **Sidebar label**: `Module augmentation`

## Lesson framing

This lesson installs the **`declare module` pattern** — TypeScript's interface-merging mechanism for extending a third-party package's published types from a project-owned `.d.ts` file. The chapter has framed every file as a node in a typed graph; this lesson teaches the senior reach for **when a third-party node's type doesn't match the project's domain** (a branded `UserId` vs. the library's `string`, a typed messages JSON vs. the library's `Record<string, unknown>`), and how to **fix the type at the source rather than cast at every call site**.

Conclusions from brainstorming that apply lesson-wide:

- **The senior pain point is the drifting cast.** The student leaves chapter 005 with branded IDs; the moment they wire a real third-party library (Better Auth, `next-intl`, Drizzle), the library's published type erases the brand. Casting at every call site is the obvious-but-wrong fix — it drifts, it survives renames, and the brand exists precisely to prevent the bug class the cast re-introduces. Module augmentation is the **type-at-the-source** fix.
- **The trigger to augment is non-trivial.** Not every type-mismatch earns a `.d.ts` file. The lesson teaches three trigger questions (call-site count, brand preservation, library designed for augmentation) so the student can recognize when augmentation pays for itself and when a narrow at the call site is the smaller move.
- **Critical 2026 correction:** the chapter outline's Better Auth example is **outdated**. Better Auth's 2026 idiom is `additionalFields` config + `typeof auth.$Infer.Session` inference, **not** `declare module 'better-auth'`. The lesson re-frames the Better Auth case as **"library ships its own extension mechanism — use it"**: the student learns that the first question before `declare module` is "does the library document a better path?" — `$Infer`, generics, builder return-types — and only reach for module augmentation when the library opts into it (`next-intl` does; modern Better Auth does not). This **strengthens** the lesson by teaching the senior reflex: read the library's extension contract before patching its types.
- **Three canonical 2026 surfaces stay relevant:** (1) **`next-intl` typed messages** — the library documents `declare module 'next-intl' { interface AppConfig { Messages } }` as the supported path; (2) **`declare global { interface IntlMessages }`** for projects on older next-intl shapes, named as the same pattern at a different surface; (3) **Drizzle relations** for narrowing inferred-as-nullable relations the application always joins. Better Auth is taught as the **counter-example**: `$Infer` over augmentation.
- **The mental model:** TypeScript interfaces (only interfaces, not `type` aliases) are **open** — multiple declarations of the same `interface Foo` in the same module merge into one. `declare module 'x' { interface Y { ... } }` in a project-owned `.d.ts` file reaches into module `'x'`'s declaration space and merges into its already-published interfaces. The merger is build-time only; no runtime cost.
- **The file convention:** augmentations live in `types/<package>.d.ts` (e.g. `types/next-intl.d.ts`), included by `tsconfig.json`'s `include`, type-only imports at the top. One file per package — easy to find, easy to delete when no longer needed. The student should leave with this folder shape memorized.
- **Pedagogical archetype:** Pattern. Open with the cast-at-every-call-site bug; introduce `declare module` as the type-at-the-source fix; walk the three trigger questions; show two canonical sites (`next-intl`, Drizzle relations) with worked code; show Better Auth as the counter-example with the `$Infer` + `additionalFields` path; close with anti-patterns and a recognition exercise.
- **Cognitive load:** the student already knows branded types (ch. 005), `.d.ts` files exist (ch. 024 lesson 4 covers `include`), and the `verbatimModuleSyntax` `import type` discipline (ch. 006 lesson 1). Build on those without re-teaching. Keep code blocks tight; the lesson is short (~30 min).

## Lesson sections

### Introduction (no h2 heading — preface prose)

Open with the **drifting cast bug**, in three sentences. Concrete scenario: the project has `type UserId = string & Brand<'UserId'>` (from ch. 005). Better Auth's `Session.user.id` is `string`. Every Server Action that reads `session.user.id` and passes it to a function expecting `UserId` either casts (`session.user.id as UserId`) or unbrands at the boundary — both lose the brand's protection.

State the lesson's promise in one line: this lesson teaches `declare module` — TypeScript's mechanism to extend a published package's interfaces from a project-owned `.d.ts` file — and the senior reflex of **reading the library's extension contract before patching its types**.

Preview the four moves: (1) the `declare module` mechanism; (2) the three trigger questions that earn an augmentation; (3) two canonical sites (`next-intl`, Drizzle relations); (4) the Better Auth counter-example where the library ships its own extension mechanism (`$Infer` + `additionalFields`) and augmentation is the **wrong** reach.

`<Term>`s to introduce here: `declaration merging`, `module augmentation`, `ambient declaration` (the `.d.ts` file's job).

### The drifting-cast bug

One short section. Show the bug in a `<CodeVariants>` block:

- **Variant 1 ("Cast at the call site")**: a small handler reads `session.user.id` (typed as `string`), then casts to `UserId` when calling a tenant-scoped query. Mark the cast line in red. Prose: this works, the type checker is happy, but the brand exists exactly to prevent the silent string-substitution bug — the cast just rewrites the type signature at one site, with no enforcement that other sites do the same. A teammate copies the handler and forgets the cast — the brand never fires.
- **Variant 2 ("Unbrand at the boundary")**: the function signature accepts `string` instead of `UserId`. Mark the parameter type in red. Prose: erases the brand entirely. Every downstream function now accepts any string. The investment in branding from chapter 005 evaporates.

Land the senior framing: the right fix is to make `session.user.id` **be** `UserId` at the type level — at the seam where the library publishes its session shape — so every caller inherits the right type and the cast disappears across the codebase.

Forward-link in one line: this is exactly what `declare module` exists for; show it next.

Code: `<CodeVariants>` with two TypeScript variants. Use `del=` highlighting on the cast / unbrand lines. Keep each variant under 8 lines.

### The `declare module` mechanism

Teach the pattern in one tight block.

**Step 1 — the core syntax.** Show the canonical form as a standalone code block:

```ts
// types/example.d.ts
import type { UserId } from '@/lib/branded';

declare module 'some-library' {
  interface User {
    id: UserId;
  }
}
```

Explain in three short paragraphs:

- `declare module 'some-library' { ... }` reaches into the declaration space of the package and merges into its already-published types.
- The `interface` keyword is load-bearing: **TypeScript merges interfaces with the same name; it refuses to merge `type` aliases.** This is why every library that wants to be augmentable publishes its extensible surface as `interface`, not `type`. If the library exported `type Session = { ... }`, augmentation is impossible — there's no merge target. Name this rule once.
- The `import type { UserId } from '@/lib/branded'` at the top makes the `.d.ts` file a **module** (it has a top-level import). A `.d.ts` file with no imports/exports is a **global** ambient declaration. The `declare module` form only works inside a module file. This is the one foot-gun that bites in this pattern — name it explicitly.

`<Term>` here: `ambient declaration` (a `.d.ts` declaration that participates in the type checker without any runtime code).

**Step 2 — the file convention.** Show a `<FileTree>` with the canonical layout:

```
types/
  next-intl.d.ts
  drizzle.d.ts
src/
  app/
  lib/
tsconfig.json
```

Three short bullets:

- **One file per package augmented.** `types/next-intl.d.ts`, not `types/global.d.ts`. Easy to find, easy to delete when the upstream library adds the field natively.
- **Outside the regular source tree.** A `types/` directory makes the intent obvious — these files are type-only seams to third-party packages, not application code.
- **Picked up by `tsconfig.json` `include`.** From chapter 024 lesson 4, the `include` array picks up `**/*.ts` and `**/*.d.ts`. The augmentation fires automatically across the project once the file is on disk; the editor's language server picks it up after a TS-server restart on first add.

Code component: a single `Code` block for the canonical syntax, plus a `<FileTree>` from Starlight for the folder layout.

### The three trigger questions

A short decision section. The student should leave able to recognize when augmentation earns its weight versus when a narrow at the call site is the smaller move.

State the three questions plainly (numbered list):

1. **Does the third-party type appear in five or more places without the augmentation?** Below that count, casting at the call site is faster than maintaining the `.d.ts` file across library version bumps. Module augmentation has a real cost — the augmentation file lives in the repo, must be reviewed on upgrade, can subtly break when the library changes its interface shape.
2. **Does the augmentation tie a branded ID or domain type to the third-party shape?** Augmentation is the right reach when the cast would erase a brand the project authored. The brand is the whole point — the augmentation makes it permanent at the seam.
3. **Is the third-party type designed to be extended?** Library docs that name `declare module` (the `next-intl` `AppConfig` shape, older Better Auth versions, Auth.js `Session`) are signalling that augmentation is the supported path. Augmenting a type the library treats as internal is a smell — the library can change the shape between minor versions and the augmentation breaks silently.

Add one paragraph after the list: **before any of these three questions, ask question zero — does the library ship its own extension contract?** Generic type parameters (Drizzle's schema generic), inference helpers (`typeof auth.$Infer.Session`), or builder-pattern return types are the library's preferred path. Reach for them first; `declare module` is for libraries that haven't shipped a better mechanism, or for surfaces (like typed messages) where the library explicitly documents augmentation as the path.

This question-zero framing is the lesson's senior takeaway and threads into the Better Auth counter-example below.

No code in this section — pure decision prose. Could optionally render the three questions as a `<Steps>` list for visual rhythm.

### Canonical site 1 — `next-intl` typed messages

The lesson's first worked augmentation. `next-intl` documents `declare module 'next-intl'` as the supported way to type the message-keys surface so `useTranslations('home')` and `t('title')` are autocomplete-checked.

Walk a single `<AnnotatedCode>` block (4 steps) over the augmentation file:

```ts
// types/next-intl.d.ts
import type messages from '@/messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
```

Steps:

1. **Step 1 (`{1}`, color blue)**: the file lives in `types/next-intl.d.ts` — one file per package, outside `src/`.
2. **Step 2 (`{2}`, color violet)**: the `import type` of the source-of-truth English messages JSON. This is what makes the file a module (the `import` at top level), and `import type` keeps the file type-only — no runtime cost. The JSON import works under the chapter 006 lesson 1 `with { type: 'json' }` rule at runtime, but `import type` skips the runtime path entirely.
3. **Step 3 (`{4} "AppConfig"`, color green)**: the `AppConfig` interface is the surface `next-intl` publishes for the project to extend. The library's docs name this interface and the keys it accepts (`Messages`, `Locale`, `Formats`). The augmentation merges the `Messages` field with the project's actual messages shape — `typeof messages` derives the type from the runtime JSON, so the augmentation stays in sync.
4. **Step 4 (`{5}`, color orange)**: after this file lands, `useTranslations('home').` autocompletes the keys under `home` in `en.json`. A typo (`useTranslations('hme')`) is a type error. The augmentation pays for itself the moment a message key gets renamed and the editor flags every stale call site.

After the AnnotatedCode block, a one-line follow-up: this is the **course-canonical** shape for the i18n typing seam (forward-link to chapter 084 where the full setup lands; here we only teach the augmentation).

### Canonical site 2 — narrowing a Drizzle relation

The lesson's second worked augmentation. Drizzle's `relations()` helper infers relation types from the schema; for one-to-one optional relations the inferred type is `Customer | undefined`, but if the application's query **always** joins the customer, the runtime value is never undefined. Augmentation can narrow this at the type level.

This site is **lower weight** than `next-intl` — name it as a real-world reach without spending too much code. Use a short `<CodeVariants>` block (2 variants):

- **Variant 1 ("inferred")**: a one-line type alias from `typeof query.findFirst.$inferResult` showing `customer: Customer | undefined`. Prose: Drizzle widens to optional because the relation column is nullable in the schema, but the app's query path guarantees the join hits. Every consumer pays the optional-narrowing tax with a `?.` or non-null assertion.
- **Variant 2 ("narrowed via augmentation")**: the augmentation file that narrows the relation. Prose: now the consumer reads `result.customer.name` without narrowing. The augmentation is paid once; the narrowing is gone from every call site.

After the variants, name the watch-out in one line: this is **narrowing**, not lying. The type narrows because the query path enforces the join; if a future change adds a query path that doesn't join, the type still claims non-null and the bug ships. This is the same risk as a non-null assertion, just centralized. The lesson teaches the pattern and names the trade-off; the rule of thumb is that narrowing augmentations carry a maintenance debt the cast doesn't.

This section deliberately stays light — Drizzle relations at depth land in chapter 037. The point here is **recognition** of the pattern, not implementation depth.

### Counter-example — Better Auth ships its own extension mechanism

**This section is the lesson's senior payload.** The student arrives expecting "augment Better Auth's `Session`" — the chapter outline brainstorm proposes exactly this. The lesson teaches the opposite: in 2026, Better Auth's idiom is **`additionalFields` config + `typeof auth.$Infer.Session`**, not `declare module 'better-auth'`. The augmentation path still works but is not the senior reach.

Walk the right path in two short blocks:

**Block 1 — the server config:**

```ts
// lib/auth.ts
import 'server-only';
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  user: {
    additionalFields: {
      orgId: { type: 'string', input: false },
      role: { type: 'string', input: false },
    },
  },
  // ... database, plugins, etc.
});

export type Session = typeof auth.$Infer.Session;
```

**Block 2 — the consumer:**

```ts
import type { Session } from '@/lib/auth';

function readSession(session: Session) {
  // session.user.id, session.user.orgId, session.user.role — all typed
}
```

Prose around the blocks:

- Better Auth's `additionalFields` config is the library's **published extension contract**. The fields land in the runtime session shape (the library hydrates them from the DB) and the `$Infer.Session` inference picks them up automatically. The TypeScript shape and the runtime shape stay in sync because they derive from the same source — the config.
- Compare to a `declare module 'better-auth' { interface Session { ... } }` augmentation: the augmentation tells TypeScript the field exists, but the library doesn't hydrate it at runtime, so the type says `string` and the value is `undefined`. The augmentation is **lying**.
- The senior reflex: before reaching for `declare module`, check what the library's docs say. If the library ships `$Infer`, generics, or an `additionalFields`-style config, use that path. If the library documents `declare module` as the augmentation point (like `next-intl` does), reach for it. If the library does neither and the type-mismatch is structural, augmentation is the fallback — but the bar is "the library has no other path," not "I want to add a field."

Land the rule in one sentence: **the library's extension contract is the first thing to read; `declare module` is the fallback, not the default.**

Add a `<Term>` for `$Infer` here, briefly explained inline as "Better Auth's type-inference helper that derives the session type from the runtime config."

For branded IDs on the session specifically — the original bug from the lesson's opening — name the resolution in one line: the project augments `orgId` and similar fields as `string` (via `additionalFields`) and brands them at the **query boundary** where the value crosses into application code. Forward-link to chapter 049 (Better Auth setup) for the full pattern. The augmentation path is not the right reach here.

Code: two adjacent `Code` blocks, no need for `CodeVariants` since they're not alternatives — they're a sequence (server config, then consumer).

### Anti-patterns: when augmentation is the wrong reach

A short section listing three anti-patterns. Use `<Aside type="caution">` for each, or render as a compact `<CardGrid>` of three cards.

1. **Augmenting to bypass a strict type.** If the library says `string | undefined` and you augment to `string`, the augmentation is **lying** — the runtime can still be `undefined`. The fix is a narrow at the call site (with a check), not an augmentation. The augmentation pattern is for **adding** fields or **narrowing with a runtime guarantee** (like the Drizzle join), never for erasing the library's safety.
2. **Augmenting application types.** Module augmentation is for **third-party** modules. The project's own types are owned by the project — edit them in place. A `declare module '@/lib/branded'` is a smell; just open `lib/branded.ts` and change the type.
3. **`declare global` for ambient values in app code.** The `declare global { interface Window { dataLayer: unknown[] } }` form is occasionally needed for third-party globals (Google Tag Manager, Sentry sometimes), but the senior reflex in app code is: every value enters through an import, not through a global. Name this form once; the course rule is to avoid it unless the third-party script genuinely installs a global the type checker can't see otherwise.

Code: one tiny snippet per anti-pattern showing the wrong reach, marked with `del=` highlighting. Keep each under 4 lines.

### The build-time payoff

One short closing section before the recognition exercise. Walk one concrete win in three sentences:

- The student adds `types/next-intl.d.ts` with the messages augmentation.
- They rename a key in `messages/en.json` (`home.title` → `home.heading`).
- The editor immediately flags every `t('home.title')` call across the codebase as a type error.

The augmentation pays for itself the moment a downstream type catches a real mismatch. Without the augmentation, the bug ships and the user sees a missing-translation key in production.

No code, just the framing. The point: augmentation is a **build-time investment** that turns a class of runtime bugs into compile-time errors.

### Recognition recap — augment, don't augment, or narrow at the call site

Close with a `<Buckets>` exercise — three buckets, six chips. Tests the trigger-question reasoning from earlier in the lesson.

**Buckets:**

- `augment` — "Augment via `declare module`"
- `library-path` — "Use the library's own extension mechanism"
- `narrow` — "Narrow at the call site (no augmentation)"

**Items:**

1. `next-intl` doesn't autocomplete my message keys. → **augment** (`declare module 'next-intl' { interface AppConfig { Messages } }`)
2. Better Auth's `session.user` needs a custom `role` field. → **library-path** (`additionalFields` config + `$Infer.Session`)
3. The library's `fetchUser` returns `User | undefined`, my call site assumes it exists. → **narrow** (call-site check; augmenting to `User` would be lying)
4. Drizzle infers a relation as nullable, but my query always joins. → **augment** (narrowing augmentation, with the maintenance-debt watch-out)
5. My own `User` type from `@/lib/types` is missing an `email` field. → **narrow** (it's app code — edit `@/lib/types` in place; no augmentation)
6. The third-party analytics SDK installs `window.posthog` and I need to call it. → **library-path** first (most SDKs ship type packages); if no types, `declare global { interface Window }` as the fallback.

The exercise tests both the **augment vs. narrow** call (items 3, 4, 5) and the **augment vs. library-path** call (items 1, 2, 6) — which is the lesson's senior payload.

Instructions: `"Sort each scenario by the right tool for the job."`

Three buckets, `twoCol` off (three columns won't fit cleanly; one column is fine).

No separate summary section — the bucket exercise is the recap.

## Scope

### What this lesson does not cover

- **Full Better Auth setup, plugins, or session-read ladder.** Chapter 049 owns the Better Auth depth. This lesson uses Better Auth only to illustrate the library-ships-its-own-extension-mechanism counter-example. The `additionalFields` example here shows two fields and the `$Infer.Session` derivation; that's the depth.
- **Drizzle's relations API at depth.** Chapter 037 owns relation declarations, the `defineRelations` shape, query API, and N+1 patterns. This lesson uses Drizzle relations only to illustrate a narrowing augmentation; the schema, relation graph, and query shapes are out of scope.
- **`next-intl` setup, locale routing, message authoring.** Chapter 084 owns the i18n stack. This lesson teaches the **augmentation shape** for typed messages — `declare module 'next-intl' { interface AppConfig { Messages: typeof messages } }` — without teaching where `messages/en.json` lives, how the routing middleware works, or what `useTranslations` and `t.rich` do.
- **`declare global` at depth.** Named once in the anti-patterns section as the form to use sparingly. The course's rule is "every value enters through an import"; deeper coverage of global type augmentation isn't worth a section.
- **Writing publishable library types with proper extension points.** The inverse direction — designing a library API that wants to be augmented — is out of scope. The course writes app code, not libraries.
- **`pnpm patch` for third-party `.d.ts` files.** Runtime patches earn a different lesson if they earn one at all; this lesson handles the type story via the augmentation seam.
- **`verbatimModuleSyntax`, `import type` discipline.** Owned by chapter 006 lesson 1; this lesson uses `import type` inside the `.d.ts` file consistently but doesn't re-teach the rule.
- **`'server-only'` / `'client-only'`.** Owned by chapter 006 lesson 2. The augmentation files in this lesson don't need these directives (they're type-only, `.d.ts` files have no runtime), so they don't appear.
- **Branded types depth.** Chapter 005 lesson 4 owns branded IDs. This lesson uses `UserId`, `OrgId` as branded types without re-teaching the brand mechanism — it assumes the student knows `UserId = string & Brand<'UserId'>` from chapter 005.

### Prerequisites the lesson assumes (do not re-teach)

- Branded ID pattern (`UserId`, `OrgId`) from chapter 005 lesson 4.
- `.d.ts` files exist and are picked up by `tsconfig.json` `include` from chapter 024 lesson 4.
- `import type` discipline under `verbatimModuleSyntax` from chapter 006 lesson 1.
- Module graph framing (modules as nodes, imports as edges) from chapter 006 lessons 1 and 2.
- The difference between `type` aliases and `interface`s from chapter 004 (the lesson names that only interfaces merge, but doesn't re-teach when to use each).

## Components and conventions checklist for the writer

- **Code blocks**: `Code` (default) for single-file snippets; `CodeVariants` for the cast-vs-unbrand bug and the Drizzle inferred-vs-narrowed comparison; `AnnotatedCode` (with 4 `AnnotatedStep`s) for the `next-intl` walkthrough. No `CodeTooltips` needed — the lesson's types are simple enough to read inline.
- **File tree**: one `<FileTree>` from Starlight showing the `types/` folder layout.
- **Exercises**: one `<Buckets>` at the end as the recognition recap. No `ScriptCoding` — the lesson is reference/decision-shaped, and the recognition pattern matches `Buckets` cleanly. (The chapter outline brainstorm proposes a `ScriptCoding` exercise to write the augmentation; we cut it because the surface is too narrow to test meaningfully without bringing in a full TypeScript runtime, and the recognition is the load-bearing skill.)
- **Asides**: three `<Aside type="caution">` for the anti-patterns, or alternatively a `<CardGrid>` of three compact cards — writer's choice based on layout flow.
- **Terms** (`<Term>`): `declaration merging`, `module augmentation`, `ambient declaration`, `$Infer` (Better Auth's inference helper). Introduce each at first use; do not over-term.
- **Forward links** to chapter 037 (Drizzle relations), chapter 049 (Better Auth), chapter 084 (next-intl). One line each, in their respective sections.
- **No diagrams.** The lesson is text-and-code-heavy; the patterns don't benefit from a Mermaid or D2 diagram. The `<FileTree>` is the only visual.
- **No video callout.** This is a niche TypeScript pattern; no canonical 2026 video earns a slot.
- **External resources** (optional): one or two `<ExternalResource>` cards at the bottom — the TypeScript handbook's [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) page and the [`next-intl` TypeScript augmentation docs](https://next-intl.dev/docs/workflows/typescript). Optional, writer's call.
- **Naming**: `types/<package>.d.ts` (kebab-cased filename matching the package's import specifier — `next-intl.d.ts`, `drizzle.d.ts`).
- **Imports inside `.d.ts`**: always `import type { ... }` at the top to (a) make the file a module so `declare module` works and (b) document the file as pure type-level. Never a runtime `import` inside a `.d.ts`.

## Notes for downstream agents

- **Deliberate divergence from chapter outline.** The chapter outline brainstorm proposes Better Auth `declare module` as the primary canonical example. The 2026 verified-correct path is `additionalFields` + `$Infer.Session`. This outline pivots the Better Auth example to the **counter-example** role — the senior payload becomes "read the library's extension contract before reaching for `declare module`," which is a stronger pedagogical landing than walking through an augmentation the project shouldn't actually write.
- **Deliberate scope cut.** The chapter outline brainstorm includes a `ScriptCoding` exercise to write an augmentation against a stub `better-auth` module. We cut it because (a) the Better Auth case is now the counter-example, not the canonical site, and (b) writing the augmentation in a runner sandbox is fiddly — the value lands in **recognition** (the `<Buckets>` exercise) not in keystrokes.
- **Lesson estimated time**: 25–30 minutes. The lesson is shorter than the chapter outline's estimate (30–35 min) because cutting the script-coding exercise saves time and the lesson is fundamentally a recognition pattern, not a build-something pattern.
