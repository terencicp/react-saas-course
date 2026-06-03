sources:
  24.1: The useState surface and lazy initialization
  24.2: Derive in render, do not mirror into state
  24.3: The four homes for state
  24.4: useReducer when transitions multiply
  24.5: useRef as the non-rendering escape hatch
  24.6: useId for stable IDs across the server boundary

questions:
  - source: 24.1
    question: |
      A component seeds its state by reading and parsing a draft out of `localStorage`. Which call does that read-and-parse work exactly once, on mount?
    choices:
      - text: |
          ```tsx
          useState(parseDraft(getStoredDraft()))
          ```
        correct: false
      - text: |
          ```tsx
          useState(() => parseDraft(getStoredDraft()))
          ```
        correct: true
      - text: |
          ```tsx
          useState<Draft>(parseDraft(getStoredDraft()))
          ```
        correct: false
    why: |
      Passing a *function* tells React to call it once at mount and ignore it afterward. The bare-call form runs `parseDraft(getStoredDraft())` on every render and throws all but the first result away — wasted work on every keystroke. The annotation only fixes types; it does nothing about *when* the work runs.

  - source: 24.5
    question: |
      You're holding the `setTimeout` ID that debounces a search input. Why is this a `useRef` and not a `useState`?
    choices:
      - text: |
          The JSX never reads the timer ID, so storing it in state would schedule a re-render that paints nothing new.
        correct: true
      - text: |
          A timer ID is a number, and `useState` can only hold objects.
        correct: false
      - text: |
          `useRef` survives re-renders while a `useState` value is reset to its initial value on each render.
        correct: false
    why: |
      The deciding question is "does the JSX read it?" — no, so it's a ref. Writing `.current` never re-renders, which is exactly right for a value the user never sees. The type claim is false, and `useState` *also* survives renders — the difference is that updating it forces a render you don't want here.

  - source: 24.2
    question: |
      A junior keeps `fullName` in its own `useState` and resyncs it with a `useEffect` watching `firstName` and `lastName`. Beyond the extra render, what is the more dangerous problem with this shape?
    choices:
      - text: |
          `fullName` is a second copy of data that already exists, kept current by hand — add a `middleName` and forget the dependency array, and it silently goes stale with no error.
        correct: true
      - text: |
          String concatenation in an effect is too slow to run on every keystroke.
        correct: false
      - text: |
          `useEffect` can only depend on one value, so watching both names is unsupported.
        correct: false
    why: |
      The real cost is the second source of truth maintained by a hand-written dependency list. A derived `const fullName = firstName + ' ' + lastName` can't drift because there's nothing to keep in sync. The concatenation is rounding error next to the render, and effects can depend on any number of values.

  - source: 24.3
    question: |
      A list view has a search filter the user types into. A teammate argues it should live in the URL as `?q=...` rather than in lifted `useState`. Which facts actually justify the URL home? (Select all that apply.)
    choices:
      - text: |
          After a refresh, the user expects their filter to still be applied.
        correct: true
      - text: |
          A shared link should land the recipient on the same filtered view.
        correct: true
      - text: |
          Two sibling components on screen both need to read the filter.
        correct: false
      - text: |
          The filtered rows are expensive to recompute on every render.
        correct: false
    why: |
      The URL test is two questions: survive a refresh? shareable as a link? Either "yes" sends the value to the URL. "Two siblings need it" is the trigger for *lifting*, not for the URL — and recompute cost is a memoization concern, unrelated to where the source of truth lives.

  - source: 24.4
    question: |
      A submit form tracks `isSubmitting`, `isSaved`, `submitError`, and more across separate `useState`s, and a bug lets the spinner stay on after a validation failure. What is the core reason modelling this as a `useReducer` with a single `status` field fixes the class of bug?
    choices:
      - text: |
          Combinations like "submitting and saved at once" become unrepresentable — there's no value of `status` that means both — instead of merely discouraged.
        correct: true
      - text: |
          A reducer is always fewer lines of code than the equivalent `useState` calls.
        correct: false
      - text: |
          Putting the `await` inside the reducer guarantees the spinner is reset on every exit path.
        correct: false
    why: |
      The win is collapsing several booleans into one `status` with a fixed set of legal values, so the illegal combinations can't be constructed. A reducer is often *more* code, not less — and async must never live in the reducer; it stays in the handler that brackets the `await` with dispatches.

  - source: 24.6
    question: |
      A teammate proposes using `crypto.randomUUID()` instead of `useId()` to generate the `id` that links a `<label>` to its `<input>`, reasoning it's "more unique." What goes wrong?
    choices:
      - text: |
          It rolls a different value on the server and in the browser, so the rendered HTML and hydration disagree and React warns about a mismatch.
        correct: true
      - text: |
          `crypto.randomUUID()` is too slow to call during render.
        correct: false
      - text: |
          UUIDs contain characters that are invalid in an HTML `id` attribute.
        correct: false
    why: |
      `useId` is deterministic across the server boundary because it derives from the component's position in the tree; a random generator runs twice and produces two different strings, breaking hydration. The same `crypto.randomUUID()` is the *right* tool when minted once at item creation and stored on the data — just not for a render-time ARIA id.
