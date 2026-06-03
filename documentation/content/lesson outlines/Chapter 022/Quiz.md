sources:
  22.1: The typed props contract
  22.2: Children and compound components
  22.3: Polymorphism with Slot and CVA
  22.4: Refs as a regular prop
  22.5: Portals and the layout escape

questions:
  - source: 22.1
    question: |
      You wrap a native `<button>` and want every standard button attribute — `disabled`, `type`, `onClick`, `aria-label` — to reach it without re-typing each one, while merging the caller's `className` with your own. Which body is correct?
    choices:
      - text: |
          ```tsx
          type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };
          const Button = ({ variant = 'primary', className, ...rest }: Props) => (
            <button className={cn(buttonClasses({ variant }), className)} {...rest} />
          );
          ```
        correct: true
      - text: |
          ```tsx
          type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };
          const Button = ({ variant = 'primary', ...rest }: Props) => (
            <button {...rest} className={cn(buttonClasses({ variant }))} />
          );
          ```
        correct: false
      - text: |
          ```tsx
          type Props = HTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };
          const Button = ({ variant = 'primary', className, ...rest }: Props) => (
            <button className={cn(buttonClasses({ variant }), className)} {...rest} />
          );
          ```
        correct: false
    why: |
      `className` arrives *inside* `ComponentProps<'button'>`, so you must destructure it out and merge it last — otherwise it rides in `...rest`. The second option spreads `...rest` (which still holds the caller's `className`) and then sets `className` after it, so the spread's value is clobbered and the merge is lost; it also drops the caller's class entirely. The third uses `HTMLAttributes`, which carries the *base* attributes every element has but not button-specific ones like `type` or `disabled` — a silent gap. `ComponentProps<'button'>` is the 2026 default.

  - source: 22.1
    question: |
      A component needs a prop that is *either* an `href` (a link) *or* an `onClick` (a button), but never both and never neither. Which typing actually enforces that at compile time?
    choices:
      - text: |
          A discriminated union: `{ href: string; onClick?: never } | { onClick: () => void; href?: never }`.
        correct: true
      - text: |
          Two optionals, `href?: string` and `onClick?: () => void`, plus a runtime check in the body.
        correct: false
      - text: |
          A variant union: `variant: 'link' | 'button'` with `href` and `onClick` both optional.
        correct: false
    why: |
      Two optionals *describe* the rule but enforce nothing — a caller can still pass both or neither and the bug only surfaces at runtime. A variant union picks an appearance, not a mutual exclusion of two payloads. The discriminated union makes each illegal combination match *no* branch, so passing both `href` and `onClick`, or passing an empty object, is a compile error. The cost is narrowing in the body, so reach for it only when the exclusion is real.

  - source: 22.2
    question: |
      You're designing a `<Dialog>` that owns a header, a body, and a footer, and consumers need to reorder them and occasionally drop the footer. A teammate proposes `<Dialog header={...} body={...} footer={...} />`. What's the senior call?
    choices:
      - text: |
          Ship a compound family — `<Dialog><DialogHeader>…</DialogHeader>…</Dialog>` — so a new region is a new export, and consumers control order and presence in JSX.
        correct: true
      - text: |
          Keep the three props but add an `order` prop and a `hideFooter` boolean to recover the flexibility.
        correct: false
      - text: |
          Pass all three regions as a single `children` prop and let the dialog parse them by position.
        correct: false
    why: |
      Two-or-more named regions, plus a need to reorder and omit, is exactly the trigger for a compound component: each part is a thin exported wrapper, the consumer composes with JSX, and adding a region later never touches existing call sites. Bolting `order` and `hideFooter` onto the prop-per-region design just grows the very prop list that was the smell. Parsing `children` by position is brittle and gives the consumer no named, restylable slots.

  - source: 22.2
    question: |
      A badge should appear only when there are unread messages: `{unreadCount && <Badge>New</Badge>}`. With `unreadCount` at `0`, what renders, and what's the fix?
    choices:
      - text: |
          A literal `0` prints — `0` is falsy so `&&` short-circuits to the number `0`, which is renderable. Fix it with a real boolean on the left: `unreadCount > 0 && …`.
        correct: true
      - text: |
          Nothing renders — `0` is falsy, so the whole expression drops out cleanly. No fix needed.
        correct: false
      - text: |
          A runtime error — `&&` can't combine a number with a JSX element. Wrap the count in `String()`.
        correct: false
    why: |
      `&&` returns its left operand when that operand is falsy, so the expression's value is the *number* `0`, and numbers are renderable `ReactNode` — React prints a stray `0`. It isn't an error and it doesn't render nothing. The fix is to put a genuine boolean on the left (`unreadCount > 0`, `Boolean(unreadCount)`, or `value != null` for nullable values), so the falsy branch is `false`, which renders nothing.

  - source: 22.3
    question: |
      `<Button>` needs to sometimes render a real `<button>` and sometimes a navigation `<a>` (a Next.js `<Link>`), without rebuilding its variant table. Why is `asChild` + Radix `Slot` the course's pick over a generic `as` prop?
    choices:
      - text: |
          The consumer brings the element as a normal child, so it stays typed by its own props; the component only contributes classes and behavior via `Slot`. An `as` prop forces the component to retype its whole surface through conditional generics, degrading inference and producing unreadable errors.
        correct: true
      - text: |
          `asChild` renders faster because `Slot` skips a DOM node, whereas `as` always adds a wrapper element.
        correct: false
      - text: |
          `as` is deprecated in React 19, so `asChild` is the only option that still type-checks.
        correct: false
    why: |
      With `asChild`, the child is just the consumer's own JSX — a `<Link>` typed as a `<Link>` — and `Slot` merges the parent's `className`, handlers, and ref onto it. The `as` prop instead makes the *component* own the polymorphism, retyping every prop through the target element with conditional generics; inference degrades and the errors are unreadable. It's a composition-over-configuration call, not a performance one, and `as` isn't a React 19 deprecation.

  - source: 22.3
    question: |
      A caller writes `<Button variant="primary" className="bg-destructive">Delete</Button>`. The variant table emits `bg-primary`. With the component built as `cn(buttonVariants({ variant }), className)`, what ships to the DOM and why?
    choices:
      - text: |
          Only `bg-destructive` — `cn()` runs `tailwind-merge`, which sees the two classes target the same property, keeps the last (the caller's), and drops `bg-primary`.
        correct: true
      - text: |
          Both `bg-primary` and `bg-destructive` — `cn()` concatenates classes, and the cascade decides which wins at runtime.
        correct: false
      - text: |
          Only `bg-primary` — the component's own variant classes always take precedence over a caller override.
        correct: false
    why: |
      `cn()` is `twMerge(clsx(...))`, and `tailwind-merge` resolves conflicts between utilities that set the same CSS property by keeping the *last* one in source order. Because `className` is passed last, the caller's `bg-destructive` wins deterministically and `bg-primary` never reaches the DOM. A plain string concat would ship both and let CSS order decide — a coin flip the merge exists to prevent.

  - source: 22.4
    question: |
      You're migrating a React 19 `<Input>` to accept a ref. Which signature is the modern, correct form?
    choices:
      - text: |
          ```tsx
          const Input = ({ ref, ...props }: ComponentProps<'input'>) => (
            <input ref={ref} {...props} />
          );
          ```
        correct: true
      - text: |
          ```tsx
          const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
            (props, ref) => <input ref={ref} {...props} />,
          );
          ```
        correct: false
      - text: |
          ```tsx
          type Props = ComponentProps<'input'> & { ref: Ref<HTMLInputElement> };
          const Input = ({ ...props }: Props) => <input {...props} />;
          ```
        correct: false
    why: |
      In React 19 `ref` is an ordinary prop — destructure it and forward it to the inner element. `ComponentProps<'input'>` *already* includes `ref` typed against the input, so you neither add it to the type nor wrap the component. `forwardRef` still runs but is deprecated legacy ceremony you recognize, not write. The third option re-declares a `ref` that's already in the alias and then leaves it inside `...props` without ever placing it on the `<input>`, so the ref never lands.

  - source: 22.4
    question: |
      A ref callback wires up an `IntersectionObserver` on a node. In React 19, how do you tear it down when the node unmounts?
    choices:
      - text: |
          `return` a cleanup function from the callback — React runs it on detach, and no longer re-invokes the callback with `null`.
        correct: true
      - text: |
          Branch on the argument: when React calls the callback again with `null`, disconnect the observer there.
        correct: false
      - text: |
          Pair the callback ref with a `useEffect` that returns `observer.disconnect()` in its cleanup.
        correct: false
    why: |
      React 19 lets a ref callback return a cleanup function — a mini-effect scoped to the node's life: setup on attach, the returned function on detach. When you return cleanup, React *stops* calling the callback again with `null`; the null-branch pattern is the pre-19 form, now superseded. Reaching for a separate `useEffect` is exactly the ceremony the cleanup return removes. (Watch the implicit-return trap: a brace-less arrow that returns the node, not a cleanup, is a type error.)

  - source: 22.5
    question: |
      A `fixed inset-0` modal nested inside a card with `-translate-y-0.5` is clipped to the card and sized against it, not the viewport. Why does a portal to `document.body` fix it when raising `z-index` doesn't?
    choices:
      - text: |
          The card's `transform` makes it the containing block for `position: fixed`; portaling the modal's DOM under `<body>` removes every transformed/overflow ancestor from its chain, so `fixed` measures against the viewport again. `z-index` can't undo a containing-block trap.
        correct: true
      - text: |
          The card's `overflow: hidden` lowers the modal's stacking order; a portal resets `z-index` to the top of the page.
        correct: false
      - text: |
          A portal applies `isolation: isolate`, which lifts the modal out of the card's stacking context.
        correct: false
    why: |
      A `transform` (also `filter`, `perspective`, …) on an ancestor turns it into the containing block, so `fixed` resolves against the card instead of the viewport — and `z-index` only touches stacking order, not where `fixed` measures from. `isolation: isolate` fixes stacking-context burial, not the containing-block trap. The portal moves the DOM out of the trapping subtree entirely, so the `fixed` ancestor chain is just `<body>` and all three traps dissolve at once.

  - source: 22.5
    question: |
      A parent `<div>` has `onClick`, and renders a portaled `<button onClick={…}>` into `document.body`. The user clicks the button. Whose handlers run?
    choices:
      - text: |
          Both — the button's handler, then the parent's. Portals move the DOM but events bubble through the *React* tree, where the button is still the div's child.
        correct: true
      - text: |
          Only the button's — its DOM lands under `<body>` as a sibling of the div, so the click can't bubble to the parent.
        correct: false
      - text: |
          Only the parent's — React re-targets portaled clicks to the nearest tree ancestor that owns a handler.
        correct: false
    why: |
      A portal relocates only the DOM; in the React tree the button is still a descendant of the parent `<div>`, and React replays events along the tree it knows. So the button's handler fires, then the click bubbles to the parent — even though in the real DOM the two are siblings under `<body>`. This is why a portaled "click outside to close" menu can close itself on an inside click: the fix is `stopPropagation()` or a `document` listener.
