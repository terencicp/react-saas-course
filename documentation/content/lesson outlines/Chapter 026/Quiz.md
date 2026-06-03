sources:
  26.1: Extracting custom hooks
  26.2: The React Compiler
  26.3: Memoization as escape hatch

questions:
  - source: 26.1
    question: |
      A `useCounter()` hook returns `[count, increment]`. You call it in both a `<Header>` and a `<Footer>`, expecting both to show the same number. Clicking the header's button leaves the footer's count untouched. Why?
    choices:
      - text: |
          Calling the same custom hook in two components shares the *code* — the wiring recipe — not the *state*. Each call gets its own `useState` cell, so the two counters are independent. Shared state needs lifting, context, or an external store.
        correct: true
      - text: |
          The hook is missing a dependency array, so each component re-runs it with a fresh closure instead of subscribing to the shared value.
        correct: false
      - text: |
          A custom hook only shares state if it returns an object; switching the return from a tuple to `{ count, increment }` would sync both components.
        correct: false
    why: |
      A custom hook is a recipe executed fresh per consumer — two cooks following one recipe don't share a plate. Each call site mints its own `useState`, `useEffect`, and refs. Neither the return shape (tuple vs. object) nor a dependency array changes that; the only way to share state is to lift it, put it in context, or use an external store.

  - source: 26.2
    question: |
      You turn on the React Compiler, open DevTools, and a component carrying the `Memo ✨` badge still re-renders on every parent state change. The Profiler confirms its own props didn't change. What's the most likely explanation?
    choices:
      - text: |
          The badge means the compiler *processed* the component, not that it never re-renders. An unstable reference is flowing in as a prop from a parent the compiler couldn't optimize — it stabilizes references it owns, not churn injected from above.
        correct: true
      - text: |
          The badge is stale; you need to clear the build cache and recompile for the memoization to take effect at runtime.
        correct: false
      - text: |
          The component has an impure render, which is why the compiler skipped it — the badge appears but the optimization is silently disabled.
        correct: false
    why: |
      The `Memo ✨` badge is the contract that the compiler processed the component, not a promise it never re-renders. The compiler optimizes within a component's visibility; a churning reference passed down from an un-optimized parent still forces re-renders. A skipped component would have *no* badge — the badge's presence rules that out.

  - source: 26.2
    question: |
      A component does `props.items.sort()` directly in its render body. Under the React Compiler, it gets no `Memo ✨` badge and a build warning. What is the senior response?
    choices:
      - text: |
          Fix the violation — sort a copy (`[...props.items].sort()`) so render stays pure. The compiler skipped the component because it mutates during render; it's the messenger surfacing a latent bug.
        correct: true
      - text: |
          Add `'use no memo'` to the top of the file. The directive resolves the warning and lets the rest of the file keep its optimizations.
        correct: false
      - text: |
          Wrap the sort in `useMemo` so the mutation only runs when `items` changes, which satisfies the compiler's purity check.
        correct: false
    why: |
      The compiler doesn't retrofit purity — when it detects an in-render mutation it skips the component and warns rather than ship wrong output. The fix is the violation: copy before sorting. `'use no memo'` only silences the message while shipping the original behavior (a TODO, never a fix), and `useMemo` still mutates the caller's array — it just does so less often.

  - source: 26.3
    question: |
      With the React Compiler on, which of these manual memoizations earn their weight in a 2026 codebase? Select all that apply.
    choices:
      - text: |
          A `useMemo` on a sort the Profiler shows costs 18ms on every keystroke, with a comment naming the measurement.
        correct: true
      - text: |
          A `useCallback` passed to a `react-hook-form` field that re-runs when the callback's reference changes.
        correct: true
      - text: |
          A `useMemo(() => firstName + ' ' + lastName, [firstName, lastName])` to avoid recomputing the full name each render.
        correct: false
      - text: |
          A `React.memo` on a leaf component whose parent never re-renders, added "for safety."
        correct: false
    why: |
      Manual memoization is now an escape hatch justified by a *measured* cost or a *contractual* reference-equality need, and it carries a comment. A Profiler-confirmed expensive computation and a library that reads by reference both qualify. Concatenating two strings is trivially cheap, and memoizing a leaf whose parent never re-renders guards against nothing — both are 2020 reflexes the compiler made dead weight.
