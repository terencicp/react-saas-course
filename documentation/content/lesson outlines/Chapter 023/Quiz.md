sources:
  23.1: What triggers a render
  23.2: Reconciliation and the key prop
  23.3: The purity contract
  23.4: State is a snapshot
  23.5: Remounting with key
  23.6: Synthetic events

questions:
  - source: 23.1
    question: |
      A `<UserCard user={user} />` re-renders on every keystroke in a search box that lives in the same parent, even though the `user` object never changes. What actually caused the card to re-run?
    choices:
      - text: |
          The parent re-rendered, and re-rendering a component re-runs all of its children by default — the unchanged `user` prop is a passenger, not the cause.
        correct: true
      - text: |
          The `user` prop changed identity, and a prop change is one of the triggers that makes a child re-render.
        correct: false
      - text: |
          The card subscribes to a context whose value the search box updates on every keystroke.
        correct: false
    why: |
      A prop changing is *not* a render trigger — the three triggers are the component's own state, an ancestor re-rendering, and a subscribed context changing. The keystroke updated state in the parent, the parent re-ran, and re-running a parent re-runs every child regardless of whether its props changed. Chasing "stop the prop from changing" looks one level too low; the cause is one level up.

  - source: 23.2
    question: |
      You render a reorderable list of rows, each containing an uncontrolled `<input>`. With `key={i}` (the array index), a user types into the first row and then sorts the list. What happens?
    choices:
      - text: |
          The typed text stays in the first slot and ends up attached to whichever item sorted into that position — React matched by index, which is just position again.
        correct: true
      - text: |
          The typed text travels with its original item to the item's new position, because the key follows the data.
        correct: false
      - text: |
          Every row remounts and all inputs clear, because changing the order changes every index.
        correct: false
    why: |
      `key={i}` pins identity to the slot, not the item — it does exactly what position-matching already did, so the input's DOM node stays in slot 0 while the label around it is repatched to a different item. The text desyncs onto the wrong row. `key={item.id}` is what makes identity travel with the data so React moves the DOM node along with it.

  - source: 23.3
    question: |
      The React Compiler reads a component and finds it mutates a prop during render. What does it do, and how would you notice?
    choices:
      - text: |
          It silently skips that component — leaving it un-memoized but still working — and the only tell is a missing optimization badge in React DevTools.
        correct: true
      - text: |
          It fails the build with a purity error pointing at the mutation.
        correct: false
      - text: |
          It memoizes the component anyway and strips the mutation, since the output is unchanged.
        correct: false
    why: |
      The compiler never errors or warns on impurity — it just declines to optimize the component, which keeps working the old, un-memoized way. Nothing in the build log tells you the optimization fell off; the audit signal is the missing DevTools badge on a component you expected to be optimized. That's why purity is a discipline you keep, not a rule the toolchain enforces for you.

  - source: 23.4
    question: |
      Inside a render where `count === 0`, a click handler runs `setCount(count + 1)` three times in a row. After one click, the counter shows `1`. You want it to add 3. What's the fix and why does it work?
    choices:
      - text: |
          Use the updater form `setCount((c) => c + 1)` — each updater receives the running queued value (`0 → 1 → 2 → 3`) instead of re-reading the frozen snapshot.
        correct: true
      - text: |
          Wrap the three calls in `flushSync` so each one commits and the next reads the updated `count`.
        correct: false
      - text: |
          Call `setCount(count + 3)` once — three setter calls on the same snapshot can only ever land on one value.
        correct: false
    why: |
      `count` is frozen at `0` for the whole render, so all three `setCount(count + 1)` calls are `setCount(1)` and collapse to one. The updater form reads the value the queue has computed so far rather than the snapshot, so three of them thread `0 → 1 → 2 → 3`. `setCount(count + 3)` happens to give `3` here but doesn't generalize to async or stacked updates, and `flushSync` is a batching opt-out for measuring the DOM, not the tool for sequential updates.

  - source: 23.5
    question: |
      A master-detail screen renders `<UserForm user={selectedUser} />`, and the form seeds its fields from props with `useState(user.email)`. Switching the selected user leaks the previous user's unsaved edits onto the next record. A teammate proposes a `useEffect` that copies the new props into state on `user.id` change. What's the senior call?
    choices:
      - text: |
          Reach for `<UserForm key={user.id} … />` — changing the key remounts the form, so it's reborn from the new prop, resetting every field at once with no per-field bookkeeping.
        correct: true
      - text: |
          Ship the effect — copying props into state on id change is the canonical, declarative way to keep the form in sync.
        correct: false
      - text: |
          Stop seeding state from props in the child, since that's the root cause of the leak.
        correct: false
    why: |
      The effect "works" but is brittle: it's one setter per field (forget one and that field leaks again), it renders the stale data for one beat before correcting, and it's the textbook "you might not need an effect" anti-pattern. The `key` reset is declarative, resets all fields for free, and can never go stale because there's no copy to keep in sync. Seeding state from props isn't the bug — it's exactly what makes the keyed version come up pre-filled with the right record.

  - source: 23.6
    question: |
      A native shortcut listener is registered with `document.addEventListener('click', …)`, and a button deep in the React tree calls `e.stopPropagation()` in its `onClick`. On React 17+, does the `document` listener fire when the button is clicked?
    choices:
      - text: |
          No — React's listener sits on the root container, so a child's `stopPropagation` contains the event before it can bubble up to `document`.
        correct: true
      - text: |
          Yes — `stopPropagation` inside a React handler can only silence other React handlers, never a native `document` listener.
        correct: false
      - text: |
          Yes — by the time the React handler runs, `document` has already received the event, so it can't be un-fired.
        correct: false
    why: |
      Since React 17, React attaches one listener per event type at the root container, not at `document`. A React child's `stopPropagation` halts the native event at that root, so it never reaches an ancestor listener on `document`. The two "yes" answers describe the pre-17 model, when React listened at `document` itself and couldn't un-fire an event it had already delivered — a note that outlived the behavior it described.
