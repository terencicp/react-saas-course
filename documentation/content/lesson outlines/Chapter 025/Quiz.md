sources:
  25.1: Strict Mode is the messenger
  25.2: useEffect as synchronization
  25.3: useEffectEvent and the non-reactive seam
  25.4: You probably don't need an effect
  25.5: useContext without the re-render storm
  25.6: Marking updates as non-urgent
  25.7: Reading promises with use()
  25.8: Rules of hooks and the lint that enforces them

questions:
  - source: 25.1
    question: |
      Your effect runs twice in dev. A teammate "fixes" it with a `useRef(false)` guard that skips the second run, and the doubling stops. Why is this the wrong move?
    choices:
      - text: |
          The guard hides the symptom but leaves the missing cleanup in place — and React 19 genuinely mounts, unmounts, and remounts components in production, where the leak it was masking still bites.
        correct: true
      - text: |
          `useRef(false)` re-initializes to `false` on every render, so the guard never actually holds and the second run still fires.
        correct: false
      - text: |
          Strict Mode double-invokes the ref guard too, so the two extra runs cancel out and leave the effect running an odd number of times.
        correct: false
    why: |
      Strict Mode's double-invocation is a preview of real production behavior (transitions, prefetching, the Activity API), not a dev-only fiction. The guard suppresses the second setup while the first setup's resource is still never torn down — you blindfold the smoke detector. The fix is always to write the cleanup that makes a remount safe.

  - source: 25.2
    question: |
      In a chat component, `roomId` changes from `"general"` to `"random"`. In what order does React run the effect's cleanup and setup, and why?
    choices:
      - text: |
          Cleanup first (disconnect `general`), then setup (connect `random`) — cleanup runs before every re-sync, not only on unmount.
        correct: true
      - text: |
          Setup first (connect `random`), then cleanup (disconnect `general`), because the new connection must exist before the old one is dropped.
        correct: false
      - text: |
          Only setup runs; cleanup is reserved for when the component unmounts entirely.
        correct: false
    why: |
      The effect's job is to keep the outside world matching current props. When a dependency changes, the world built from the old value is stale, so React tears it down *first* and rebuilds. Cleanup is "before the next setup and on unmount," not "the unmount handler" — that wrong model is exactly what leaves the `general` socket open.

  - source: 25.3
    question: |
      Two engineers want a chat socket to reconnect only when `roomId` changes, while still calling the freshest `onMessage` and `currentUser` on each message. One wraps the handler in `useCallback([onMessage, currentUser])`; the other moves it into a `useEffectEvent`. Why does only the Effect Event actually work?
    choices:
      - text: |
          `useCallback` returns a *stable* function over a fixed snapshot — a real change to `currentUser` still mints a new identity and reconnects the socket. `useEffectEvent` reads the latest values yet stays out of the deps entirely, so `[roomId]` is the only thing that re-syncs.
        correct: true
      - text: |
          `useCallback` can't be given a dependency array inside a component, so it captures a stale `currentUser` and never updates.
        correct: false
      - text: |
          Both work identically; `useEffectEvent` is just newer syntax for the same `useCallback` behavior.
        correct: false
    why: |
      `useCallback` only stabilizes identity — when its deps legitimately change, the new function identity re-runs the effect, the exact reconnect you were killing. An Effect Event is an *unstable* function over the latest values that is excluded from deps by design, so the genuinely-reactive `roomId` is the lone dependency.

  - source: 25.4
    question: |
      You run the audit's two-question code review on a `useEffect`: "What external system does it synchronize with?" and "What does its cleanup tear down?" Both answers come back blank. What does that tell you?
    choices:
      - text: |
          It's almost certainly one of the catalog anti-patterns in disguise — a derived value, misplaced handler logic, or a fetch — and should be reshaped, not kept.
        correct: true
      - text: |
          The effect is correctly minimal; an empty cleanup is the sign of a well-scoped effect with no side effects to undo.
        correct: false
      - text: |
          The effect just needs an `AbortController` added to its cleanup to become a legitimate synchronization.
        correct: false
    why: |
      A genuine effect synchronizes with a system React doesn't own and returns a cleanup that tears down exactly what it set up. No external system plus an empty cleanup is the tell that the work belongs in render, a handler, or a Server Component. Adding an `AbortController` only race-proofs an effect that shouldn't exist.

  - source: 25.5
    question: |
      A reducer-backed `NotificationsContext` exposes `{ state, dispatch }` as one value. A "Clear all" button reads only `dispatch`, yet it re-renders on every toast that comes and goes. What is the canonical fix?
    choices:
      - text: |
          Split into two contexts — a state context and a dispatch context — so dispatch-only consumers subscribe to `dispatch`, whose reference is stable for the component's life and never changes.
        correct: true
      - text: |
          Wrap the `{ state, dispatch }` object in `useMemo` so its reference stays stable across notification changes.
        correct: false
      - text: |
          Read `dispatch` with `use(NotificationsContext)` instead of `useContext`, which subscribes to only the `dispatch` field.
        correct: false
    why: |
      `dispatch` is reference-stable, so a dispatch-only context never updates and its consumers stop re-rendering entirely. `useMemo` can't help — the value genuinely changes on every notification, so its reference *should* change. And `use(Context)` only relaxes where the call can sit; it does not narrow the subscription to one field.

  - source: 25.6
    question: |
      "Marking the slow list update as a transition will make filtering 5,000 rows faster." Is this right?
    choices:
      - text: |
          No — transitions are priority markers, not speed boosts. The filter render costs exactly what it did; it just no longer blocks the keystroke, rendering in an interruptible background lane instead.
        correct: true
      - text: |
          Yes — `startTransition` batches the work and skips intermediate renders, so the final filter runs faster.
        correct: false
      - text: |
          Yes — wrapping the update in a transition debounces it, so the expensive filter runs fewer times overall.
        correct: false
    why: |
      The single most-misread point of the lesson: these hooks reorder work, they don't accelerate it. The expensive render still happens and still costs the same; the urgent keystroke just commits first and the transition yields to it. A transition is not a debounce and not a batcher.

  - source: 25.7
    question: |
      A Client Component reads its data with `use(fetch('/api/activity').then(r => r.json()))` written directly in the render body. It spins forever and the Network tab fires the same request on a loop. Why?
    choices:
      - text: |
          The render body creates a brand-new promise on every render. `use()` tracks promises by reference, sees a new resource each time, suspends, resolves, re-renders, and creates another promise — an endless loop.
        correct: true
      - text: |
          `use()` may only read a promise that originates in a Server Component; calling it in a Client Component always re-suspends.
        correct: false
      - text: |
          The promise needs to be wrapped in a `<Suspense>` boundary, and without one `use()` retries the fetch indefinitely.
        correct: false
    why: |
      `use()` identifies the resource by `Object.is` reference, so the promise must be referentially stable across renders — created once in a Server Component or held in a stable reference, not minted inside the render body. `use()` works fine in Client Components, and a missing Suspense boundary suspends the tree, it doesn't cause a refetch loop.

  - source: 25.8
    question: |
      A junior reads that `use()` can be called inside an `if` and concludes "hooks can be conditional now," so they wrap a `useState` in a condition. Why does this break, when the conditional `use()` did not?
    choices:
      - text: |
          `useState` claims a numbered slot by call order, so skipping it on some renders drifts the slot count and misaligns every hook below it. `use()` claims no slot — it's tracked by reference or tree position — so moving it lines up against nothing.
        correct: true
      - text: |
          `useState` is fine inside an `if` too; the lint flags it only as a style warning, not a real bug.
        correct: false
      - text: |
          `useState` must be conditional-free because it triggers re-renders, whereas `use()` never does.
        correct: false
    why: |
      The exemption belongs to `use()` alone and generalizes to nothing. Regular hooks rely on a stable call order so React's positional slot pointer finds the right stored value; a conditional `useState` makes the count drift and corrupts state with no error. `use()` needs no slot, so the rule it would break simply doesn't apply.
