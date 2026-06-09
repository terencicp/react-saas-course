# Lesson title

- Title: Newer wins, single writer
- Sidebar label: Newer wins, single writer

# Lesson framing

This is the chapter's "money seam" lesson. L1 verified the sender, L2 made each event land *at most once*. This lesson closes the third gap: *different* events for the same entity arriving in the **wrong order**, plus the user-facing race where the Checkout redirect outruns the webhook. The bugs taught here are incident-postmortem bugs — silent state corruption (a `past_due` subscription overwritten back to `active`) and "I paid but the app says I'm on the free plan."

Two distinct topics, taught in this order:

1. **Out-of-order delivery** — `event.created` + a `last_event_at` predicate inside the UPDATE WHERE; UPDATE-RETURNING to detect the stale no-op; "the webhook is the single writer for the entity it owns."
2. **The redirect-vs-webhook race** — success page reads stale entitlement before the webhook lands; the wrong fix (let the success page write) vs. the right fix (read-and-poll via `router.refresh()`); the `retrieve` fast-path as a conditional reach.

Pedagogical spine, carried from L2's established voice (concrete failure first, then the structural fix; "wrong-then-right"; senior-question framing in the intro):

- **The two topics share one principle**: *single writer*. Topic 1 is "the webhook is the only writer, and a stale event must not clobber newer state." Topic 2 is "the success page must not become a *second* writer just to win a race." Make this the connective tissue — the lesson is not two unrelated tricks, it's one rule (single authoritative writer) defended on two fronts. State it explicitly in the intro and again in the close.
- **The dominant misconception to kill**: that ordering can be fixed in application code with an `if (event.created > row.lastEventAt) update`. This has the *exact same TOCTOU race* L2 just killed for dedup — two concurrent handlers both read, both decide they're newer, both write, the older wins. The fix rhymes with L2: push the comparison *into the UPDATE WHERE* so the database evaluates it atomically under row-lock. Lean hard on this parallel; the student already owns the atomic-claim mental model from L2, so this is "same shape, applied to ordering instead of identity."
- **Second misconception**: comparing `event.created` against `now()` (wall clock) instead of against the *row's* stored `last_event_at`. The clock isn't the reference; the last-applied event's timestamp is. Name it.
- **Mental model the student leaves with**: every entity the webhook owns carries a `last_event_at` high-water mark; each mutation is a single statement that *both* checks "am I newer?" and writes, atomically; zero rows back = stale, log-and-200. For the UI race: the webhook owns the write, the page only *reads and waits*.
- **Cognitive-load staging**: start each topic from a concrete two-event / redirect-timeline failure (diagram), then the naive fix, then watch it race (or double-write), then the structural fix. Don't open with the predicate syntax.
- **Reuse L2's scaffold, don't rebuild it.** The handler skeleton (`verify → transaction → claim → mutate → 200`) is already shipped. This lesson *grows the `mutate` step* — the ordering predicate slots into the business-work UPDATE inside the same transaction. Show the diff against L2's shape, not a fresh handler.
- **The asymmetry — state vs. facts**: ordering only matters for entities that hold *state* (subscription status). Events that are *facts* (a `payment_intent.payment_failed` appended to a log) need dedup but no ordering predicate. Teach this so the student doesn't over-apply the predicate everywhere.
- **Schema honesty**: `plan_entitlements` is *wired* in ch064 L4 — this lesson uses it only to demonstrate the conflict-resolution shape. Every code sample must say so (matches L2's honesty about `onCheckoutCompleted` stubs). The student is learning the *predicate pattern*, not shipping the billing schema.
- **`router.refresh()` gotcha (fact-checked, load-bearing)**: under Next.js 16 `cacheComponents: true`, `router.refresh()` clears the *client* router cache and re-runs Server Components, but it does **not** invalidate the server-side `'use cache'` layer. So the success page's entitlement read must be **dynamic (uncached)** for polling to observe the webhook's write — OR the webhook must `revalidateTag` the entitlement and the page reads a tagged cache. The course picks: success-page read is dynamic (it's a one-shot finalize screen, caching it is pointless), and the webhook *also* `revalidateTag`s so the rest of the app's cached reads update eventually. Call this out — silently caching the success-page read makes the poll loop spin forever, which is a nasty real bug.
- **Polling primitive nuance (fact-checked)**: Next.js 16 added a Server-Action-only `refresh()` function distinct from the Client-Component `router.refresh()`. The success-page poller is a Client Component, so it uses `router.refresh()` from `useRouter()`. Name the distinction in one line so the student doesn't grab the wrong one.
- This lesson does **not** install TanStack Query. The poll is a bare `setInterval` + `router.refresh()` on a Server-Component read — the lightest tool that works. (TanStack's polling triggers are an Unit-onward concern; here the data is server state read by a Server Component, so `router.refresh()` is the idiomatic fit per the caching convention's "client-only refresh after navigation" row.)

# Lesson sections

## Introduction (no header)

Pick up from L2's exact closing thread (L2 ends by naming *this* lesson: "dedup protects against the same event twice; it says nothing about different events in the wrong order"). Render `<CourseProgressBar value={frontmatter['course-progress']} />` first, as every lesson does.

Open with the two concrete failures, stated plainly and side by side, because both are "looks fine in dev, corrupts in prod":

1. Two `customer.subscription.updated` events: `active`, then moments later `past_due`. The network reorders them; `past_due` lands first, `active` lands second. A naive handler applies them in *arrival* order and parks the subscription at `active` — a delinquent customer keeps full access. Real revenue / entitlement bug.
2. Checkout completes → Stripe redirects the user to `/success?session_id=...` → the page renders → but `checkout.session.completed` is still in flight. The page reads the *old* entitlement and tells a paying customer they're on the free plan.

State the senior question: both are races against an asynchronous webhook; what's the structural fix for each, and what's the single principle underneath? Land the through-line up front: **one authoritative writer per entity, and time-ordered writes that never let stale data win.** Preview the deliverable: by the end, the student extends L2's handler so out-of-order events are structurally impossible to misapply, and builds a success page that waits for the webhook instead of racing it. Keep it warm and brief per the guidelines.

## Stripe makes no ordering promise

Establish the contract before the mechanism (mirrors L2's "at-least-once is the contract" opening beat). Stripe emits events *roughly* in the order things happen, but **delivery is unordered** — the docs state this explicitly (fact-checked: "Stripe doesn't guarantee delivery of events in the order generated... use the `created` timestamp for ordering"). The senior anchor: out-of-order is the **default assumption**, not an edge case. A handler that's only correct when events arrive in order is a handler that's correct only in dev.

Introduce `event.created` (Unix seconds, present on every Stripe event) as the ground truth for *emission* order. Two events for the same subscription have monotonically increasing `created` even when they *arrive* reversed — `created` is the order Stripe *intended*, independent of delivery. This is the value the predicate will compare against.

`<Term>` candidates here: none new beyond what L2 established (idempotency, at-least-once already defined in L2 — do not re-Term them, just reference). Possibly `Term` for "high-water mark" when introduced in the next section.

Small visual to make "emitted in order, delivered reversed" vivid:

DIAGRAM — `<Figure>` wrapping a compact horizontal HTML/CSS strip (two parallel tracks). Engine: plain HTML+CSS (per diagrams INDEX, "sequential phase strip / timeline without parallelism" — here a two-lane before/after). Pedagogical goal: separate *emission order* from *arrival order* in the student's head.
- Top lane "Emitted by Stripe (`created` order)": `active` (created=100) → `past_due` (created=160), left-to-right, green arrow.
- Bottom lane "Arrived at your handler": `past_due` (created=160) → `active` (created=100), with the arrows visibly *crossed* / reordered, red tint.
- Caption: "Stripe emits in order and stamps each event with `created`. The network delivers in whatever order it likes. `created` is how you recover the intended order."
Keep it short (well under the height cap). This is a simple visual aid, not a system graph — exactly the kind of low-effort enrichment the diagram guidance encourages.

## Why "if newer, then update" still races

This is the pivotal "wrong-then-right" beat. Present the *obvious* application-code fix and demolish it by pointing straight at the TOCTOU lesson from L2.

The naive shape (show as `Code`, red-tinted, kept short):
```ts
const [row] = await tx.select().from(planEntitlements).where(eq(planEntitlements.orgId, orgId));
if (row.lastEventAt === null || row.lastEventAt < event.created) {
  await tx.update(planEntitlements).set({ status: newStatus, lastEventAt: event.created })
    .where(eq(planEntitlements.orgId, orgId));
}
```
Prose: reads like plain English, *and it's the exact same race L2 just taught you to recognize.* The read of `lastEventAt` and the write are two separate moments. Two concurrent handlers (the `active` event and the `past_due` event, delivered close together on different workers) both read the *same* current `lastEventAt`, both evaluate "yes I'm newer than what's stored," both update. Last writer wins by wall-clock arrival — which is precisely the ordering you were trying to defeat.

Explicitly name the parallel to L2: *this is TOCTOU again.* The check ("am I newer?") and the act ("write") have a gap, and concurrency lives in the gap. The student already has this reflex from L2's dedup — invoke it by name (`Term` already defined there; reference, don't redefine). The fix will rhyme: collapse check-and-act into one atomic statement.

Optional reinforcement: a short `DiagramSequence` walking two workers (A = `active`/created=100, B = `past_due`/created=160) through read-read-write-write to show the older event winning. BUT — L2 already shipped a near-identical TOCTOU `DiagramSequence` for dedup. To avoid redundancy, prefer a *compact* version or skip the full scrub and rely on prose + the crossed-arrows figure above, explicitly calling back "you watched this exact race for dedup last lesson." Decision for the writer: if it adds clarity without feeling like a repeat, use a 3-step `DiagramSequence`; otherwise a tight `Code` + prose callback is enough. Lean toward *not* repeating the full animation.

## The predicate lives in the UPDATE WHERE

The structural fix, stated in one sentence first (L2's rhythm): move the "am I newer?" comparison *into* the UPDATE's WHERE clause so the database evaluates it atomically, under the row lock it already takes to write.

Introduce the `last_event_at` column as a **high-water mark** (`<Term definition="A stored marker of the furthest-along value seen so far. Here, the created timestamp of the most recent event already applied to the row — any event older than it is stale by definition.">high-water mark</Term>`) on every entity the webhook mutates. Then the canonical statement:

`AnnotatedCode` (lang `ts`, single color per step) — the conflict-resolving UPDATE on its own, before it goes back into the handler. This is the heart of topic 1, so give it the stepped treatment.

```ts
const applied = await tx
  .update(planEntitlements)
  .set({ status: newStatus, lastEventAt: event.created })
  .where(
    and(
      eq(planEntitlements.orgId, orgId),
      or(
        isNull(planEntitlements.lastEventAt),
        lt(planEntitlements.lastEventAt, event.created),
      ),
    ),
  )
  .returning({ id: planEntitlements.id });

if (applied.length === 0) {
  // stale event — a newer one already won. log + fall through to 200.
}
```
AnnotatedStep walkthrough:
1. The `.set(...)` — note `lastEventAt` is updated *in the same statement* as `status` [blue]. The high-water mark advances atomically with the state it guards; never a separate follow-up UPDATE (that reopens the race).
2. The tenant predicate `eq(orgId)` [blue] — which row.
3. The ordering predicate `or(isNull(...), lt(lastEventAt, event.created))` [green — the payoff]. Prose: this is the whole ordering guarantee. The row updates *only if* the incoming event is strictly newer than what's stored (or nothing's stored yet). A stale event matches zero rows because its `created` is not `<` the stored mark.
4. `.returning({ id })` + the `applied.length === 0` branch [orange]. Prose: zero rows = the predicate didn't match = a newer event already won. Not an error — a stale ordering. Log it, return 200.

Then the senior point, explicitly echoing L2's constraint-first reflex: **the database does the ordering for you, atomically.** No app-level read, no lock, no compare-in-code. The WHERE predicate is evaluated under the same row lock the UPDATE takes, so two concurrent handlers can't both pass it for the same stale comparison. Same instinct as L2's unique constraint — *lean on the database's atomicity, not application cleverness* — applied to ordering instead of identity.

Call out the `now()` misconception here, inline at the moment it's relevant: do **not** compare `event.created` against `now()`. The reference point is the *row's* `last_event_at`, not the wall clock. Comparing to `now()` is a clock-skew bug (a slightly-future `created` or a slow handler makes every event look "newer"). Compare row-against-event, never event-against-clock.

Code-conventions note for the writer: production schema uses client-level `casing: 'snake_case'` (camelCase keys → snake SQL), matching L2's `processedEvents`. `last_event_at` stores the Stripe `created`. NOTE A DELIBERATE SIMPLIFICATION: the course's time convention is Temporal + `timestamptz`, with `Date` confined to third-party seams. Stripe's `created` is a Unix-seconds integer at exactly such a seam. For teaching clarity the examples may compare the integer directly (store `event.created` as-is, or as the column type the ch064 schema will define). Flag this so downstream agents and ch064 keep the column type coherent — don't let the lesson imply raw `Date` arithmetic in domain code. Keep the column type sketch-level; ch064 owns the final `plan_entitlements` schema.

## Ordering and dedup are orthogonal guards

Short but important conceptual section: the student now has two predicates and must understand they protect against *different* things and **compose** inside the one transaction.

- **Dedup** (L2): protects against the *same* event arriving twice → `processed_events` claim.
- **Ordering** (this lesson): protects against *different* events for the same entity arriving out of order → `last_event_at` predicate.

They're orthogonal — neither replaces the other. A single event can be both a duplicate *and* out of order; both guards run. Show the full grown handler so the student sees where each guard sits.

`CodeVariants` (or `AnnotatedCode`) — "L2 shape" vs "this lesson's shape", framed as a diff. Prefer `CodeVariants` with two tabs since it's a before/after of the same handler:
- Tab "After L2 (dedup only)": the claim + a stubbed `onSubscriptionUpdated(tx, event)` whose body is a plain UPDATE with no ordering predicate.
- Tab "After this lesson (dedup + ordering)": same handler, but the business UPDATE now carries the `last_event_at` predicate and the stale-no-op branch.
Highlight (`ins=`) the added predicate lines in the second tab. Prose (≤6 lines each): tab 1 — claims once but a stale event still clobbers; tab 2 — claim *and* high-water-mark check, both inside the same `db.transaction`. The two guards are independent and both live in one commit.

Reinforce: both predicates inside the **same outer transaction** L2 established. The claim and the ordered write commit together or roll back together — the L2 guarantee is unchanged, the mutate step just got smarter.

## Order state, not facts

The "don't over-apply it" section — prevents the student from bolting `last_event_at` onto everything.

The asymmetry: the ordering predicate matters only for entities that carry **mutable state** that later events overwrite — a subscription's `status`, an entitlement tier. It's meaningless for events that are **immutable facts** appended to a log — a `payment_intent.payment_failed` row, an audit entry. A fact doesn't get "overwritten by a newer fact"; it's just inserted. Adding `last_event_at` there is over-engineering.

The rule, stated crisply: **ordering protects *state*; dedup protects *facts*.** For state-bearing entities you need both guards; for append-only fact logs, dedup alone is the discipline.

Small exercise to lock in the discrimination:

EXERCISE — `Buckets` (two-column classify). Items are Stripe-ish event/handler scenarios; buckets are "Needs ordering predicate (state)" vs "Dedup is enough (fact)".
- Items for "Needs ordering": "Set subscription status to `past_due`", "Update the org's plan tier", "Flip `cancel_at_period_end` on the subscription".
- Items for "Dedup is enough": "Append a failed-payment attempt to the payments log", "Record a `charge.refunded` audit row", "Log that a dunning email was sent".
Goal: the student internalizes state-vs-fact as the decision criterion, not a syntax rule. (Per components INDEX, `Buckets` is the classification drag-and-drop — exactly this shape.)

## Observing what you drop

Brief operational beat (matches L2's "log the event id" note; don't re-teach logging, ch092 owns it). A handler that silently no-ops stale events is invisible when something's wrong upstream. Log every stale drop with `event.id`, `event.type`, `event.created`, and the row's `lastEventAt`, routed through the same per-seam child logger L2 used (`logger.child({ seam: 'webhook.stripe' })`).

The senior nuance: **alert on the *rate*, not the count.** Dropping 1-in-10,000 events as stale is normal background noise (genuine reordering happens). Dropping 1-in-10 means a real upstream problem — clock skew, a misconfigured retry, a delivery backlog. The absolute number is meaningless; the ratio is the signal. One line; point to ch092 for the mechanism.

## The success page renders before the webhook lands

Hard pivot to topic 2 — the user-facing race. Bridge sentence: ordering was server-to-server (webhook vs webhook); this is server-to-user (the redirect vs the webhook). Same enemy (an async webhook you're racing), different surface.

Lay out the timeline concretely:
1. User completes Stripe Checkout.
2. Stripe redirects the browser to `${app}/success?session_id=cs_...`.
3. The success page (Server Component) renders and reads `plan_entitlements`.
4. **But** `checkout.session.completed` is still in flight — the webhook hasn't run, the row still says "free."
5. The paying user sees "You're on the Free plan." Worst possible moment to look broken.

The root cause, named: the redirect and the webhook are **two independent channels** from Stripe, with no ordering between them. The redirect almost always wins (it's a browser hop; the webhook is a server round-trip through Stripe's delivery queue). So the success page reliably renders *before* the entitlement exists.

DIAGRAM — `<Figure>` wrapping a Mermaid `sequenceDiagram` (per diagrams INDEX, sequences → Mermaid). Pedagogical goal: make the two-channel race legible and show *why* the page reads stale. Actors: `Browser`, `Stripe`, `Your App (webhook)`, `DB`.
- Browser → Stripe: completes Checkout.
- Stripe → Browser: 302 redirect to `/success` (fast, solid arrow).
- Stripe -->> Your App (webhook): `checkout.session.completed` (dashed, labeled "async, slower").
- Browser → DB (via success page): read entitlement → returns "free" (the stale read, before the webhook).
- Your App (webhook) → DB: UPDATE entitlement → "paid" (happens *after* the read).
- Note over the gap: "page already rendered stale."
Keep actors to 4 and messages tight so text stays readable (apply the `themeCSS` font bump from the Mermaid doc if it renders small). Caption: "Two channels, no ordering. The redirect beats the webhook, so the first read is stale."

## The wrong fix: a second writer

Wrong-then-right, topic 2's version. The tempting fix: *let the success page write the entitlement* — it has the `session_id`, it could call Stripe, confirm payment, and update the row itself. This *feels* like it kills the race (no more waiting).

Demolish it: now the entitlement has **two writers** — the success page *and* the webhook. The race didn't disappear; it changed shape into a write-write conflict (both write near-simultaneously; which wins? what if the page writes `active` while a `past_due` webhook is also landing?). You've reintroduced exactly the ordering problem topic 1 just solved, *plus* duplicated the write logic in two places that will drift. This is the single-writer principle stated as a hard rule:

> **The webhook is the only writer for the entity it owns.** Everything else *reads*.

Tie it back to topic 1 explicitly: topic 1 made the single writer *order-safe*; topic 2 protects the single writer from being *joined by a second one*. Same principle, both halves of the lesson. This is the moment the "single writer" in the title pays off — name it.

## The right fix: read and poll

The structural fix: the success page stays a **reader**. It reads the entitlement; if not yet updated, it renders a "finalizing your subscription…" state and a small Client Component **polls** — calling `router.refresh()` on an interval until the read comes back updated, with a hard time budget.

`AnnotatedCode` (lang `tsx`) for the poller Client Component — this is the new mechanism, give it steps:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function FinalizePoller({ done }: { done: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (done) return;
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started > 30_000) {
        clearInterval(id);
        return; // give up; UI shows the "taking longer" message
      }
      router.refresh();
    }, 1000);
    return () => clearInterval(id);
  }, [done, router]);

  return null;
}
```
AnnotatedStep walkthrough:
1. `'use client'` + `useRouter` [blue] — a Client Component; the poller can't be a Server Component because it holds an interval and calls the router.
2. `if (done) return;` [green] — the parent Server Component passed `done` (entitlement already updated). Once true, stop polling. The poll's *exit condition is server state*, surfaced as a prop.
3. The `setInterval` + 30s budget [blue] — re-`router.refresh()` on a cadence; bail after 30s. Name the budget: ~30s is the standard — long enough that the webhook lands even on a slow day, short enough that the user isn't stuck staring forever.
4. `router.refresh()` [green — the primitive] — re-runs the Server Component, which re-reads the entitlement. When the webhook has landed, the next refresh sees "paid" and the parent flips `done` → poll stops.
5. cleanup `clearInterval` [blue] — clear on unmount and on `done`; never leak the interval.

Then the parent shape (`Code`, short): a Server Component success page that reads the entitlement, computes `done`, renders either the success state or the finalizing state + `<FinalizePoller done={done} />`. Keep it sketch-level — the focus is the loop, not the markup.

Two load-bearing nuances (both fact-checked) get their own emphasis here:

- **`router.refresh()` does not bust the server cache.** Under Next.js 16 `cacheComponents: true`, `router.refresh()` clears the *client* router cache and re-runs Server Components, but it does **not** invalidate `'use cache'` server data. So the success page's entitlement read must be **dynamic / uncached** — otherwise every refresh returns the same stale cached value and the poll spins for the full 30s, then "fails," even though the webhook landed. State this as a watch-out with teeth: *if your poll never resolves, this is almost always why.* The success page is a one-shot finalize screen — caching its read buys nothing and breaks the poll. (Use an `Aside` `caution`.)
- **Two `refresh`es, pick the right one.** Next.js 16 has a Server-Action-only `refresh()` *and* the Client-Component `router.refresh()` from `useRouter()`. The poller is a Client Component, so it's `router.refresh()`. One sentence so the student doesn't import the wrong one.

Also state the eventual-consistency completion: the **webhook**, when it applies the entitlement, should `revalidateTag(...)` the entitlement (per the caching convention: "eventual from a webhook → `revalidateTag(tag, profile)`, profile now required as the second arg") so the *rest* of the app's cached reads update too — the success-page poll handles the immediate finalize screen, the tag handles everywhere else. Keep this to two sentences; ch032 owns the cache mechanics.

`<Term>` candidate: `revalidateTag` (one-line definition, since it's named-not-taught here) — or just link ch032. Prefer a brief inline reference over a `Term` to avoid clutter; the writer decides.

## When perceived speed wins: the retrieve fast path

The conditional reach (the course's "defaults before conditionals" stance — give the default, then name the escape hatch and its cost). Some products won't accept even a ~1s finalize spinner. The alternative: the success page calls `stripe.checkout.sessions.retrieve(sessionId)` directly (via the L1 singleton client), confirms `payment_status === 'paid'`, and provisions the entitlement *itself* — no waiting for the webhook.

Be honest about the trade: this **violates the single-writer principle** (the success page becomes a second writer) and you take on the write-write reconciliation you were warned about. It's shipped in the wild because it makes the success instant. The course's stance: **default to read-and-poll because correctness beats perceived latency**; reach for `retrieve`-and-write only when product genuinely demands instant confirmation, and *only if* you make the write idempotent and order-safe (the same `last_event_at` predicate + claim), so the success-page write and the webhook write converge instead of fighting. Name it as the conditional, don't drill it.

This is also a nice callback: the *reason* the fast path is even survivable is the ordering+dedup machinery from the first half. Without it, two writers is chaos; with it, two writers is merely redundant. Mention this — it shows the first-half discipline is what makes the second-half escape hatch safe.

## Putting both guards on one handler

Closing worked example + consolidation. Pull the `customer.subscription.updated` handler together end-to-end so the student sees ordering live inside the L2 scaffold (not a fresh handler — the *grown* one).

`AnnotatedCode` (lang `ts`, `maxLines={18}`) — the handler from verify → claim → ordered UPDATE → 200, with the verify+claim elided/condensed (already taught) and the new ordered-write expanded. Reuse L2's eliding convention (`// verify … (L1)`, claim shown, business UPDATE is the focus).
```ts
export const POST = async (request: NextRequest) => {
  const event = await verifyStripeEvent(request); // L1

  try {
    await db.transaction(async (tx) => {
      const claimed = await tx /* …onConflictDoNothing… */ .returning({ id: processedEvents.id }); // L2
      if (claimed.length === 0) return;

      if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        const applied = await tx
          .update(planEntitlements)
          .set({ status: sub.status, lastEventAt: event.created })
          .where(and(
            eq(planEntitlements.orgId, /* resolved from sub */ orgId),
            or(isNull(planEntitlements.lastEventAt), lt(planEntitlements.lastEventAt, event.created)),
          ))
          .returning({ id: planEntitlements.id });

        if (applied.length === 0) {
          // stale ordering — newer event already applied. log; fall through to 200.
        }
      }
    });
  } catch {
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
};
```
Steps focus on: the claim is L2 (one step, dimmed/blue, "you built this"); the ordered UPDATE is the new heart (green); the stale-no-op branch (orange); the single 200 covering processed / duplicate / stale-no-op alike. Honesty note (build-agent): `planEntitlements`, `orgId` resolution, and the exact Stripe field access are *sketches* — `plan_entitlements` is wired in ch064 L4, org resolution is project work. The point is the *predicate shape inside the L2 scaffold*, not a runnable billing handler. Say so in prose, as L2 said it about `onCheckoutCompleted`.

Then a hands-on drill so the student writes the predicate themselves:

EXERCISE — `DrizzleCoding`. The student writes the conflict-resolving UPDATE and observes the **stale no-op** (zero rows), mirroring L2's "lost claim = empty result" drill so the two rhyme.
- Setup: a `plan_entitlements` table seeded with one row whose `last_event_at` is already set to a *later* timestamp (the newer event already applied).
- Task: apply a *stale* event (older `created`) with an UPDATE carrying the `or(isNull, lt(lastEventAt, <stale created>))` predicate + `returning`. Because the stored mark is newer, the predicate fails → **zero rows** → the stale event is correctly ignored.
- `expectedRows={[]}` (the stale no-op is the insight), `ordered={false}`.
- Then prose invites: change the incoming `created` to a value *newer* than the stored mark, re-run → one row back, and the stored `last_event_at` would advance. Two outcomes in the student's hands: newer wins (one row), stale loses (zero rows).
- Build-agent harness notes (PGlite/DrizzleCoding limits, per project memory): explicit SQL column names on every column (no `casing` config in sandbox); pick a literal-friendly PK (plain `text('id')` or seeded `uuid` literals, NOT `uuidv7()`); store `last_event_at` as a type the sandbox handles cleanly for `<` comparison — use `bigint`/`integer` Unix-seconds (mirrors `event.created`) rather than a timestamp, to keep the predicate literal and the comparison unambiguous in PGlite; constraint not needed here (it's an UPDATE drill, not a claim). If the empty-result case can't be graded reliably, fall back to the newer-wins one-row assertion (`[{ id: ... }]`) and note the swap — but prefer the zero-row version, it's the lesson.
- `<details>` reference solution after, per the components convention for reveal-on-demand solutions.

## Closing

Tie the two halves to the one principle the title names. **Single writer, newer wins.** The webhook is the sole writer for the entity state it owns; an out-of-order event can never clobber newer state because the high-water-mark predicate lives inside the UPDATE; and the UI never becomes a second writer just to win a race — it reads and waits. Restate the carry-forward skeleton: L2's `verify → claim → mutate → 200` is unchanged, the `mutate` step just grew a second guard, and the success page is a reader that polls.

Forward pointer: the *next* lesson promotes this whole dedup+ordering+single-writer discipline into a portable pattern across four surfaces (webhooks, Server Actions, jobs, public APIs) — [One pattern, four surfaces](/063-webhook-ingestion/4-one-pattern-four-surfaces). Also note `plan_entitlements` and the full Stripe state model are ch064's job; this lesson taught the *conflict-resolution shape*, ch064 ships the schema it lives on.

External resources (`ExternalResource`, 1–2 max):
- Stripe's event-delivery / "out-of-order events" docs (verify current URL — likely under https://docs.stripe.com/webhooks or the best-practices page), `icon="simple-icons:stripe"`, description naming it as the source for the no-ordering-guarantee + `created`-timestamp guidance.
- Optionally the Next.js `useRouter` / `refresh` API reference (https://nextjs.org/docs/app/api-reference/functions/use-router), for the `router.refresh()` semantics and the client-vs-server-cache caveat.

# Scope

**Prerequisites to restate concisely (taught earlier, do NOT re-teach):**
- The L2 handler scaffold (`verify → transaction → claim → mutate → 200`), `processed_events`, atomic claim via `onConflictDoNothing().returning()`, the single-transaction guarantee, the status-code surface (200 on dedup-hit, 5xx for genuine errors) — restate in one line each; this lesson *extends* the scaffold.
- TOCTOU / atomic-claim mental model (L2) — reference by name, do not redefine the `Term`.
- HMAC signature verification (L1) — `verifyStripeEvent(request)` is the elided entry point; not re-explained.
- `casing: 'snake_case'` Drizzle client convention, `db.transaction`, `tx`-not-`db` discipline (ch038/ch039, restated in L2) — assume known.
- `revalidateTag` / `'use cache'` / `router.refresh()` *exist* (caching convention, ch032) — named and used, mechanics not taught here.
- The Stripe singleton client `stripe` from `src/lib/stripe.ts` (L1) — referenced for the `retrieve` fast path, not re-wired.

**Explicitly out of scope (defer, do not teach):**
- The `plan_entitlements` schema, the derived-view billing state model, and the full set of Stripe subscription/invoice event types → **ch064**. This lesson uses `plan_entitlements` only to demonstrate the predicate shape; every sample says so.
- `router.refresh` / cache-invalidation *internals* and tag design → **ch032**. Used here, not taught.
- Server Action idempotency keys, the public-route `Idempotency-Key` header, the four-surfaces generalization → **L4** (next lesson). Do not preview the generalized pattern beyond the one-line forward pointer.
- Resend/Svix verification and `email_suppressions` → **L5**.
- Background jobs / the retention sweep / enqueuing post-webhook side-effects → **ch066**.
- Structured logging internals, alerting setup → **ch092** (log *what* to log, not *how*).
- Real-time alternatives to polling (WebSockets, SSE, subscriptions) → explicitly out of scope for this chapter; name them in one clause as "not what we reach for here" and move on, don't compare.
- TanStack Query polling → not installed; the bare `router.refresh()` loop is the right-sized tool for server-state-read-by-a-Server-Component. Don't introduce TanStack.
- Temporal date-handling depth → the `event.created` Unix-seconds integer is a third-party-seam value; the lesson compares it directly for clarity and flags the simplification, but does not teach Temporal codecs (already owned elsewhere).
