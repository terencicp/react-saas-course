# Lesson 047.3 — Result, or throw

## Lesson framing

This is a **decision archetype** lesson. The deliverable is not syntax mastery; it's a hard-wired mental model for "throw versus return Result" that the student applies every time they write an action body for the rest of the course. The student already knows (from 047.1) that an action is a public POST endpoint and (from 047.2) that `safeParse` returns a discriminated union. This lesson generalizes that pattern to the action's return value — every failure the form should render becomes a `Result<T>` failure branch; every failure the framework should handle stays a thrown exception.

Target student concerns and pain points to relieve:

- Junior reflex from other-language backgrounds is to `throw` everything, then `try/catch` in the caller. This is wrong here for two reasons: (1) the action's caller is a `useActionState` hook, not a `try/catch` block; (2) thrown errors in actions kick the user to `error.tsx` and lose form state. The lesson must make this loss tangible.
- The "what error message do I return?" anxiety. The lesson resolves it with two contracts: a small enumerated `code` set (machine-readable, for branching) and a `userMessage` (human-readable, for rendering).
- The instinct to expose database errors verbatim ("just return the error message"). The lesson names this as a security and UX anti-pattern and gives the senior alternative (catch known errors, map to typed codes, log the rest).

Mental model the student leaves with:

- An action's failures split into two buckets: **caller branches** on it (return `Result`) or **the framework handles it** (throw). The throw set is small and known: `notFound()`, `redirect()` (control-flow, not errors), `auth()` (061), and genuinely unrecoverable programmer/infrastructure errors.
- The `Result<T>` shape is a discriminated union on `ok`. The success branch carries `data: T`; the failure branch carries `error: { code, userMessage, fieldErrors? }`.
- Error codes are a small, app-wide enum. The form layer branches on them; the action authors pick from them.

Pedagogical strategy:

- Lead with a **lived problem** in the introduction — the action threw, the user lost their typed input, the support ticket arrives. Make the "throw kicks you to `error.tsx`" failure mode tangible before introducing the alternative.
- Use a **decision diagram** (Mermaid flowchart) for the throw-versus-`Result` rule. This is the lesson's load-bearing visual.
- Use **`CodeVariants`** to show the wrong-versus-right action body (throw everywhere vs. return `Result`), and to show the raw-error-leaked-to-client vs. mapped-to-code patterns.
- Use **`AnnotatedCode`** for the canonical `/lib/result.ts` file and for the worked example showing parse failure, business-rule failure, and database-constraint failure all returning the same shape.
- One **interactive exercise**: a `Buckets` exercise classifying failure scenarios into "throw" vs. "return Result" — this is the lesson's payoff and the cheapest way to verify the decision rule is internalized.
- One **`MultipleChoice`** to spot the "leaked raw error" anti-pattern.
- Optional **`StateMachineWalker`** (decisions mode) as an alternative or supplement to the flowchart for the throw-vs-Result decision.

The lesson sits between 047.2 (parse on entry, which already returns a `Result` from the validation seam) and 047.4 (thin actions, pure `/lib`). The `/lib/result.ts` file is introduced here and referenced from 047.4 forward.

**Zod v4 helper choice (important for lesson writers):** the chapter outline references `z.treeifyError(parsed.error).properties` for field errors. For flat form schemas — the typical case for SaaS CRUD forms — `z.flattenError(parsed.error).fieldErrors` is the more idiomatic helper in Zod v4 and produces exactly the `Record<string, string[]>` shape this lesson's `fieldErrors` channel expects. Default to `z.flattenError` in worked examples; name `z.treeifyError` once for nested-object schemas (rare in the course's form layer). Both are current Zod v4 APIs.

## Lesson sections

### Introduction (no heading, opens the page)

Open with the senior question framed as a scene: the user is filling out a form, hits submit, the action runs and fails for a reason the user could recover from — the email is already taken, the slug is in use, the plan limit is reached. If the action throws, the user lands on the global error page and loses every character they typed. That's not an error model; it's a UX bug. The lesson lays the contract every action returns and every form reads.

Briefly preview: a shared `Result<T>` shape, two helpers (`ok` and `err`), a decision rule for when to throw versus return, a small set of standardized error codes, and the discipline of never leaking raw database errors to the client.

Set the stake explicitly: the contract installed here is what `useActionState` consumes in 048.4 — it's the seam, locked.

### The two kinds of failure

Open the body by splitting failures into two named buckets before introducing any syntax:

- **Failures the user can correct in this form** — invalid input, business-rule rejections (slug taken, plan limit, suppressed email), database constraint violations the user could resolve by editing fields. The user stays on the page; the form re-renders with a message.
- **Failures the framework should handle** — the resource doesn't exist (`notFound`), navigation as control flow (`redirect`), the user isn't authenticated, or genuinely unrecoverable problems (database is down, env is misconfigured). The user leaves this form; the framework owns the next screen.

This split is the lesson's spine. State it once, plainly, then everything that follows is mechanics for one bucket or the other.

Include the **tangible cost** of getting the split wrong: a throw inside the action for a recoverable failure kicks the user to `error.tsx`, which means form state, scroll position, and unsaved input are all gone. Frame this as the senior's lived reaction — losing form state on a unique-violation is a recoverable bug ticket; never write it.

### The canonical `Result<T>` shape

Define the type, once, with `AnnotatedCode`:

```ts
// /lib/result.ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; userMessage: string; fieldErrors?: Record<string, string[]> } };
```

Annotation steps:

1. Discriminator on `ok` — `true` proves `data` is present; `false` proves `error` is present. The form can't read both at once. Tie back to Principle #7 (make impossible states unrepresentable) and the discriminated-union pattern from 009.1.
2. `data: T` carries whatever the success path produces — typically the created entity's ID, sometimes the full row, often `null` for fire-and-forget.
3. `error.code` is machine-readable, app-wide enumerated — for branching and analytics.
4. `error.userMessage` is human-readable, ready to render — the action owns the copy.
5. `error.fieldErrors` is optional, `Record<string, string[]>` — populated by the Zod parse path (via `z.flattenError(...).fieldErrors`), mirrors the form's flat field shape.

End the section with the senior anchor: this type lives in one file, every action imports it, every form reads it. No per-action `{ success, error }` variants. Reference Principle #5 (frameworks over rolled-from-scratch) for the "one shape" reflex.

### Two helpers: `ok` and `err`

Show the helpers (Code block), then the action body before-and-after with `CodeVariants`:

```ts
// /lib/result.ts (continued)
export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (
  code: ErrorCode,
  userMessage: string,
  fieldErrors?: Record<string, string[]>,
): Result<never> => ({ ok: false, error: { code, userMessage, fieldErrors } });
```

`CodeVariants` tabs:

- **Without helpers** — verbose object literals, easy to typo the discriminator (`{ success: ... }` vs `{ ok: ... }`), reviewer has to read every field.
- **With helpers** — one-line returns at every failure seam, intent visible at the call site.

The point isn't keystrokes saved; it's that the helpers make the action body scan as a sequence of decisions, not a sequence of object literals.

### The throw-versus-Result decision

This is the lesson's load-bearing section. Open with the one-liner rule:

> Throw at the framework edge. Return `Result` everywhere the form branches on the shape.

Then unpack with a **Mermaid flowchart LR** (wrapped in `<Figure>`):

Diagram pedagogical goal: give the student a memorable visual mnemonic for the decision. Author the flowchart as:

- Root: "Action fails. What kind of failure?"
- Branch 1: "Resource doesn't exist?" → `notFound()` (framework handles)
- Branch 2: "Need to navigate elsewhere?" → `redirect()` (control flow, not an error)
- Branch 3: "User not authenticated/authorized?" → throw via auth helper (061), framework handles
- Branch 4: "Genuinely unrecoverable (DB down, env misconfigured)?" → let it throw, framework handles
- Branch 5: "User can fix this on the form?" → return `Result` failure with code + message
- Branch 6: "Business rule rejected (plan limit, suppressed email)?" → return `Result` failure with code
- Branch 7: "Database constraint violation (unique, FK)?" → catch, map to code, return `Result`

Right of the flowchart, list (in prose) the canonical throw cases and the canonical Result cases. Two short bullet lists, parallel, side-by-side conceptually.

Optionally, in place of or alongside the flowchart, use `StateMachineWalker` (decisions mode) so the student can walk the decision tree interactively and land on the recommendation. Author's choice — either works; the static flowchart is sufficient. Lean toward the flowchart for token efficiency, mention `StateMachineWalker` as the upgrade if a more guided walk would help.

After the diagram, name the framework conventions that look like throws but aren't really errors:

- `notFound()` — the framework catches and renders `not-found.tsx`. Use when an `id` in the input doesn't resolve.
- `redirect(path)` — the framework catches and issues a 303. Use after a successful create to navigate to the detail page. Already named in 047.5 (preview); the point here is that it doesn't conflict with the `Result` shape because it terminates the action before the return.

### Standardized error codes

Define the small enumerated set:

```ts
// /lib/result.ts (continued)
export type ErrorCode =
  | 'validation'
  | 'unauthenticated'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'plan_limit'
  | 'internal';
```

Explain each in one line:

- `validation` — Zod parse failed; `fieldErrors` is populated.
- `unauthenticated` — no session (foreshadow 061).
- `unauthorized` — session exists but lacks the role (foreshadow 061).
- `not_found` — referenced resource doesn't exist; usually thrown with `notFound()` instead, but available for the cases where the form needs to render the message inline.
- `conflict` — unique constraint or FK violation; the slug is taken, the email is registered.
- `rate_limited` — too many attempts; foreshadow 078.
- `plan_limit` — billing tier doesn't include this feature; foreshadow 068.
- `internal` — fallback for genuinely unexpected failures the action chose to surface inline rather than throw.

Senior anchor: codes are the **contract between layers**. The form branches on code (a `conflict` shows a banner; a `validation` shows inline field errors). Analytics groups failures by code (096). `userMessage` is what the user reads. Six to ten codes for the whole app — proliferation is the smell that the abstraction is wrong.

### The `userMessage` discipline

Short section, one paragraph plus a small code snippet. The action owns the copy for its failure modes — every `err(...)` returns a `userMessage` ready to render. The form never invents fallback copy like "Something went wrong"; if the message is missing, the bug is in the action, not the form. Tie to Principle #5: one source of truth per concern.

Show the contrast with `CodeVariants`:

- **Bad** — form layer hard-codes "Something went wrong" because the action returned `err('internal')` with no message.
- **Good** — action returns `err('internal', 'Could not save your changes. Try again in a moment.')`; form just renders it.

### Never leak the raw error

This is the lesson's security and UX critical point. Open with the anti-pattern in a `CodeVariants` block:

- **Tab 1 — leaked**: `catch (e) { return err('internal', e.message); }` exposes database internals ("duplicate key value violates unique constraint \"invoices_slug_unique\"") to the client. Database schema and Postgres versions visible to anyone who triggers a constraint violation.
- **Tab 2 — mapped**: catch, detect known errors via a `/lib` helper, return typed codes for known cases, re-throw everything else.

Then show the canonical mapping with `AnnotatedCode`:

```ts
try {
  const [invoice] = await db.insert(invoices).values(parsed.data).returning();
  return ok({ id: invoice.id });
} catch (e) {
  if (isUniqueViolation(e, 'invoices_slug_unique')) {
    return err('conflict', 'That slug is already taken.', { slug: ['Already taken'] });
  }
  throw e;
}
```

Annotation steps:

1. The try wraps only the database call — keep the surface small.
2. `isUniqueViolation` is a `/lib` helper (foreshadow 047.4's pure-helpers principle); the action doesn't import `pg` codes directly.
3. Known cases become `Result`; unknown cases re-throw to `error.tsx` — the senior reflex: catch what you can name and handle; let everything else propagate.
4. The `fieldErrors` channel lets the form render the message under the right input even when the failure came from the database, not Zod.

Mention operator logging: the raw error is logged server-side (foreshadow Chapter 096 for error monitoring) before the sanitized `Result` is returned. The user gets a clean message; the operator gets the full stack trace.

### The action body, end to end

Bring it together. Show a worked `createInvoice` action that exercises all three failure modes — parse failure, business-rule failure (uses a foreshadowed `isSuppressed` check), database constraint failure — and one success path. Use `AnnotatedCode` to walk it.

```ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { createInsertSchema } from 'drizzle-zod';
import { revalidatePath } from 'next/cache';
import { ok, err, type Result } from '@/lib/result';
import { isUniqueViolation } from '@/lib/db/errors';
import { isSuppressedEmail } from '@/lib/billing/suppression';

const Schema = createInsertSchema(invoices).omit({ id: true, organizationId: true });

export async function createInvoice(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors);
  }

  if (await isSuppressedEmail(parsed.data.recipientEmail)) {
    return err('conflict', 'That recipient is on the suppression list.', {
      recipientEmail: ['On the suppression list'],
    });
  }

  try {
    const [invoice] = await db.insert(invoices).values(parsed.data).returning();
    revalidatePath('/invoices');
    return ok({ id: invoice.id });
  } catch (e) {
    if (isUniqueViolation(e, 'invoices_slug_unique')) {
      return err('conflict', 'That slug is already taken.', { slug: ['Already taken'] });
    }
    throw e;
  }
}
```

Annotation steps:

1. The return type is explicit `Promise<Result<{ id: string }>>` — every action gets a typed return so the form layer sees the success shape.
2. Parse failure returns `err('validation', ...)` with `z.flattenError(parsed.error).fieldErrors` — the Zod v4 helper that produces `Record<string, string[]>` for flat form schemas, matching the `fieldErrors` channel exactly.
3. Business-rule failure (suppressed email) returns `err('conflict', ...)` with a single-field `fieldErrors` entry — same shape, hand-authored.
4. Database constraint failure is caught, detected by a pure helper, mapped to a code.
5. Unknown errors re-throw — the framework's `error.tsx` handles them.
6. Success path returns just the ID, not the full row (small payload across the wire; the client refetches via the revalidated cache).

### The form layer's read shape (preview)

Half a section, lightweight — the student should leave knowing what shape the form will read. Show one line:

```tsx
const [state, formAction, pending] = useActionState(action, null);
// state?.ok === false && state.error.code === 'validation' → render fieldErrors
// state?.ok === false → render error.userMessage as banner
// state?.ok === true → success path (redirect, toast, etc.)
```

Note that 048.4 owns the full wiring; the contract is fixed here. This previews the payoff so the student feels the value of the contract before reaching 048.

### Optimistic UI rollback (foreshadow)

One paragraph. When the form uses `useOptimistic` (048.6), an `ok: false` result triggers the rollback. The form layer subscribes to the discriminator — another reason `ok` is the seam. Don't teach the rollback mechanics; just name that the `Result` shape is what enables it.

### Practice: classify the failure

Use a **`Buckets`** exercise. Two columns: "Throw" and "Return Result". Items to classify (mix of clear and tricky cases):

- The user submitted an invalid email → Return Result (`validation`)
- The invoice ID in the URL doesn't exist → Throw (`notFound()`)
- The unique constraint on `slug` fired → Return Result (`conflict`)
- The user's session is expired → Throw (via auth helper; framework handles)
- The Postgres connection pool is exhausted → Throw (unhandled, framework handles)
- The recipient is on the suppression list → Return Result (`conflict` or business rule)
- The action wants to navigate to the detail page after success → Throw via `redirect()` (control flow)
- The user's plan doesn't include this feature → Return Result (`plan_limit`)
- A required env var is missing at runtime → Throw (unrecoverable)
- The user tried to submit twice in one second → Return Result (`rate_limited`)

Grading: each item placed in the correct bucket scores one point; the exercise is self-evaluating. The mix forces the student to apply the rule, not match keywords.

### Practice: spot the anti-pattern

Use a **`MultipleChoice`** with the leaked-raw-error code as the stem:

Stem: "What's wrong with this action's failure path?"

```ts
} catch (e) {
  return err('internal', e.message);
}
```

Choices (one correct):

- It leaks database internals (Postgres error codes, table names, column names) to the client. **(Correct)**
- It uses `'internal'` instead of `'conflict'`. (Plausible distractor — `code` choice is a real decision, but the bigger issue is the message.)
- It returns `Result` instead of throwing. (Wrong — returning `Result` is correct here.)
- It doesn't call `revalidatePath`. (Wrong — failure paths don't revalidate.)

Explanation reinforces: catch, detect known errors via a `/lib` helper, return typed codes for known cases, re-throw the rest. The action's `userMessage` is authored by the human, not derived from the exception.

### Watch-outs

A small section listing the failure modes the lesson installs guards against. Keep terse — three to five bullets, each one or two sentences. Use a `<Aside type="caution">` or just a styled list. Items:

- Throwing inside an action that the form was supposed to recover from kicks the user to `error.tsx` and loses every typed character. The `Result` is the senior default for any failure the user can correct.
- Returning `{ ok: false, error: 'a string' }` breaks the `fieldErrors` channel and the form layer's branching. The contract is the object shape; every action obeys it.
- Mapping every error to `'internal'` defeats the codes — the form can't render meaningfully and analytics can't group failures.
- The failure-code set should be small (six to ten codes app-wide). Proliferating codes per action is the smell that the abstraction is wrong.
- Success returning the full Drizzle row crosses the wire on every mutation. Return the ID; the client refetches via the revalidated cache (036.6 thread).

### External resources (optional LinkCards / `ExternalResource`)

- React 19 `useActionState` docs — the consumer of this contract.
- Next.js Server Actions docs — the framework's behavior on throw vs. return.
- Zod v4 error-formatting docs — `flattenError` and `treeifyError` reference.

Keep this section optional and minimal — three external resources max, only if they meaningfully add to the lesson.

## Scope

**This lesson covers:**

- The `Result<T>` type as a shared discriminated union in `/lib/result.ts`.
- The `ok` and `err` helpers.
- The throw-versus-`Result` decision rule.
- The standardized error codes enum (one place, app-wide).
- The `userMessage` discipline.
- The pattern for catching known database errors and mapping them to codes.
- A worked end-to-end action exercising all three failure paths plus success.

**This lesson does NOT cover (taught elsewhere):**

- The `safeParse`-on-entry discipline and the five-seam shape — owned by 047.2 (just-prior lesson; reference once at the parse seam, do not re-teach).
- The `"use server"` directive, file-level vs. inline declarations, serializable-args contract — owned by 047.1 (assume the student knows the action mechanics).
- The form-side consumption: `useActionState` wiring, rendering `fieldErrors` under inputs, rendering banner-level errors — owned by 048.4. Preview the read shape only.
- The auth helper that throws on missing session, the `authedAction` wrapper — owned by 061. Name the `unauthenticated`/`unauthorized` codes here; don't build the wrapper.
- `revalidatePath`, `redirect()`, transactions — owned by 047.5 (next lesson). Reference once where the worked example uses them, do not teach.
- The `/lib` extraction principle, the `isUniqueViolation` helper's home, the directory shape — owned by 047.4 (next lesson). Use a `/lib` import in the example; defer the rationale.
- Optimistic UI rollback — owned by 048.6. Foreshadow only.
- Rate-limit implementation — owned by 078. The `rate_limited` code is named here; the mechanism is not.
- Plan-limit / billing wiring — owned by 068. The `plan_limit` code is named here; the surface is not.
- Idempotency keys (double-submit) — owned by 067. Not in this lesson at all.
- Error monitoring and structured logging — owned by 096. Mention once that the raw error is logged server-side; do not detail.
- The Drizzle error surface and Postgres error codes — owned by Chapter 043. Use the helper; do not derive it.
- The full cache-invalidation decision tree — owned by 036.6 / 076.

**Prerequisite concepts to redefine briefly inline:**

- Discriminated union on `ok` — one-line reminder from 009.1; the type signature carries the rest.
- `safeParse` returns a `{ success, data | error }` shape — one-line reminder from 046; the parse-failure return path uses it.
- `z.flattenError(error).fieldErrors` is the Zod v4 helper that produces `Record<string, string[]>` for flat schemas — one-line reminder at the parse-failure seam; full Zod error formatting is owned by 046.

**Prerequisites to assume without restating:**

- Action mechanics (047.1), `safeParse` discipline (047.2), Zod basics (046), Drizzle insert (043), the five-seam action shape (047.2).
