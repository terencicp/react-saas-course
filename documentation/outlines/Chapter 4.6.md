# Chapter 4.6 — Components and composition

## Chapter framing

Chapters 4.1 through 4.5 taught how to write a single styled element. Chapter 4.6 is the chapter where the student stops writing elements and starts writing *components* — units of UI that take props, accept children, expose composition seams, and forward refs. The senior framing is that the 2026 React component is a small, opinionated function with a typed props contract, `children` as the universal slot, named children for compound layouts, the Radix `Slot` + `class-variance-authority` pair for polymorphic shadcn-style components, `ref` as a regular prop (no more `forwardRef`), and `createPortal` as the only escape hatch from the React tree. Everything in this chapter is the API surface every shadcn component in Chapter 4.11 uses — the lessons here teach the reader of those components how to write them.

Several threads run through every lesson. **Composition over configuration**: a long prop list is a smell; the senior reach is `children` plus named slots. **The render model is held off until 4.7** — this chapter treats components as functions of props, names re-rendering only where the discussion demands it (key prop on portals, ref stability for callbacks), and trusts the next chapter to formalize. **Tailwind composition (`cn()`, `cva`, the `dark:` variant) lands as the styling form** for every component, building on 4.2.3 and 4.2.5. **`asChild` and `Slot` are the polymorphism pattern** the course commits to — generic `as` props with TypeScript gymnastics are named once as the alternative and rejected. **Refs are a prop, not a forward** — React 19's model is the only one taught; `forwardRef` is named once for legacy recognition. **Portals are the layout-escape** for modals, toasts, and anchored popovers, paired with the stacking-context fix from 4.4.9 and a forward reference to CSS anchor positioning (4.11). The chapter ships five teaching lessons plus the quiz, in dependency order: components and props (4.6.1), composition patterns and `children` (4.6.2), polymorphic components with `Slot` and CVA (4.6.3), refs in React 19 (4.6.4), and portals (4.6.5). Forward references land in 4.7 (the render model), 4.8.6 (`useRef` at depth), 4.11 (shadcn components and accessibility), and 4.12 (the project that cashes in CVA variants, portal modals, and the polymorphic button).

---

## Lesson 4.6.1 — The typed props contract

Teaches how to write a React 19 component as a typed function of props, using `ComponentProps`, variant unions, default destructuring, and the `className`-plus-`...rest` discipline.

Topics to cover:

- **The senior question.** A `<Button variant="primary" size="lg">Save</Button>` reads as one thing because its contract is small and named; a `<Button isPrimary isLarge withIcon iconName="save" iconPosition="left" loading={false}>Save</Button>` reads as a coffin because every prop is a boolean or a stringly-typed enum. The lesson installs the form a senior writes a React component in 2026 — destructured props, an inferred or explicit type, sensible defaults, and a deliberate API surface.
- **The component as a typed function.** A React component is a function from props to JSX. The 2026 form: arrow function, destructured props in the parameter, and an inline `type Props = { ... }` either above or via an inline annotation. Inference handles the return type. Components are PascalCase; the file usually matches.
- **Typing props — `type` over `interface` for component props, plus the standard primitives.** The convention: `type Props = { ... }` for component props (not extended across files; `interface` reserved for cases where declaration merging or class implementation earns it). Strings, numbers, booleans, unions of string literals for variants (`variant: 'primary' | 'secondary' | 'destructive'`), optional props with `?`, function props typed by their signature (`onClick: (event: MouseEvent<HTMLButtonElement>) => void`).
- **Default values via parameter destructuring.** `({ variant = 'primary', size = 'md' }: Props)` is the 2026 default form. `defaultProps` is gone in function components. The senior reach is to default at the destructure, never via a falsy check inside the body.
- **The boolean-prop smell and the variant union.** Three booleans (`isPrimary`, `isDestructive`, `isGhost`) collapse into one `variant: 'primary' | 'destructive' | 'ghost'` union — exhaustive, mutually exclusive, and type-safe. Same logic for size: `'sm' | 'md' | 'lg'` over `isSmall` / `isLarge`. The pattern foreshadows CVA (4.6.3) where these unions are the source of the variant table.
- **The `...rest` spread for native HTML attributes.** A `<Button>` that wraps a native `<button>` should accept every standard `<button>` attribute — `disabled`, `aria-label`, `onClick`, `type`. The form: `type Props = ComponentProps<'button'> & { variant?: ... }`, then `({ variant, className, ...rest }: Props) => <button className={cn(...)} {...rest} />`. The student stops re-typing every native handler.
- **`ComponentProps<T>` vs. `HTMLAttributes<HTMLButtonElement>` vs. `ButtonHTMLAttributes`.** `ComponentProps<'button'>` is the 2026 reach — it pulls *everything* the JSX element accepts, including `ref` and event handlers, in one alias. `HTMLAttributes` and the per-element `*Attributes` types are the older form and still work; the lesson lands `ComponentProps` as the default.
- **`ComponentProps<typeof OtherComponent>` — typing a wrapper.** A `<SubmitButton>` that wraps `<Button>` types its props as `ComponentProps<typeof Button> & { ... }`. The wrapper inherits every variant and HTML attribute the inner component exposes. Reach: building thin specializations (a confirm button that wraps a destructive button).
- **`className` as the styling contract.** Every component the project ships accepts an optional `className` and merges it with `cn(...)` (cross-reference to 4.2.3). The lesson names this as a discipline: never lock down styling, always allow a caller-side override at the outermost element.
- **Discriminated unions for mutually-exclusive props.** When two props can't both be set — `{ href: string } | { onClick: () => void }` — a discriminated union beats two optionals plus a runtime guard. The senior reach for polymorphic-but-typed components before CVA enters in 4.6.3.
- **Generic components (light).** A `<List<Item>>` that takes a `data: Item[]` and `render: (item: Item) => ReactNode` is the canonical generic-component example. Syntax is `<Item,>(props: ListProps<Item>) => ...` in `.tsx` (the trailing comma disambiguates from a JSX tag). Reach: data-driven generic list and form-row helpers; rare elsewhere.
- **Component file conventions.** One component per file by default; the file is named after the component (`Button.tsx`). Internal subcomponents live in the same file. The shadcn convention (a single file exporting the surface — `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardFooter>`) is named as the canonical exception when components compose tightly.
- **Watch-outs:**
  - Don't type props as `any`; reach for `ComponentProps<'tag'>` or `unknown` and narrow.
  - Don't put both `onClick` and `href` on a single `<Button>` API — pick one or use a discriminated union.
  - The `key` prop is not part of `Props` — it's a React-side reconciliation prop (covered in 4.7.2) and isn't passed through. Trying to read `props.key` returns `undefined`.
  - The `ref` prop in React 19 *is* now passed through to the component (covered in 4.6.4) — but unlike `key`, it's an actual function parameter the component can name.
  - Spreading `{...rest}` before `className` clobbers the merged class; spread first, then set the className you computed.
  - Components must be PascalCase or React treats them as DOM elements and ignores props.

What this lesson does not cover:

- The render model (when and why a component re-runs) — Chapter 4.7.
- State and hooks — Chapters 4.8 and 4.9.
- Children and slot composition — Lesson 4.6.2.
- Polymorphic components with `asChild` — Lesson 4.6.3.
- Refs as props — Lesson 4.6.4.
- Class components — out of scope; the course only teaches function components.
- Higher-order components (HOCs) — named once as a legacy pattern that hooks and composition retired; no airtime.
- Prop-validation libraries (`PropTypes`) — gone; TypeScript is the contract.

---

## Lesson 4.6.2 — Children and compound components

Teaches `children: ReactNode`, the shadcn-style compound-component pattern for multi-region UIs, prop-as-slot for single named regions, render props as a recognition-only fallback, and the conditional-render `0`-falsy trap.

Topics to cover:

- **The senior question.** A `<Card title="..." body={<p>...</p>} footer={<Button>...</Button>}>` works but the props list grows with every new region; the same card written as `<Card><CardHeader>...</CardHeader><CardContent>...</CardContent><CardFooter>...</CardFooter></Card>` lets the consumer place arbitrary JSX in each slot and reads as HTML. The lesson installs the composition patterns a senior reaches for in 2026 — `children` as the universal slot, named children via subcomponents (the shadcn pattern), the render-prop form when `children` needs data, and the prop-as-slot form when a component owns one named region.
- **`children` as a typed prop.** `children: ReactNode` is the canonical type. `ReactNode` accepts JSX, strings, numbers, arrays, fragments, portals, booleans (rendered as nothing), and `null`/`undefined`. Reach: nearly every component that wraps content (`<Card>`, `<Section>`, `<Dialog>`). `children` is destructured like any other prop.
- **The `ReactNode` vs. `ReactElement` distinction.** `ReactNode` is the wide type (anything renderable); `ReactElement` is the narrow type (a single JSX element). The lesson names `ReactNode` as the 99% default and `ReactElement` only when the component must call `cloneElement` or inspect props on its child (rare in 2026, named once for context).
- **The compound-component pattern — the 2026 shadcn shape.** A `<Card>` ships as a tightly-coupled set: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>`. Each subcomponent is a thin wrapper around a `<div>` with its own classes and accepts its own `className`. The consumer composes them with JSX rather than passing a `header` prop. The lesson names this as the form every modern component library (shadcn, Radix, Ariakit) uses and trusts 4.11 for the surface.
- **Why compound components beat prop-as-slot.** The compound form scales: adding a `<CardBadge>` is a new file, not a new optional prop. The consumer controls ordering, can omit slots, and can wrap subcomponents (`<CardHeader className="bg-muted">`). Prop-as-slot is fine for *one* named region (`label`, `icon`) but breaks down past two.
- **Prop-as-slot — the case where one named region wins.** A `<Button leftIcon={<TrashIcon />}>Delete</Button>` is cleaner than `<Button><ButtonIcon><TrashIcon /></ButtonIcon>Delete</Button>` because the button only has one icon slot. The decision rule: zero or one named region → prop-as-slot; two or more → compound. Both forms accept `ReactNode`; both forward classes via `cn()`.
- **Children-as-a-function (render-prop) — the narrow modern case.** The form `<DataLoader>{(data) => <List items={data} />}</DataLoader>` survives in 2026 but is rare. The reach: a component owns state or a subscription and wants to pass the value into a render that the consumer controls. Most cases that used to need render props are now custom hooks (Chapter 4.10). The lesson names render props as a recognition-level pattern with one canonical example.
- **Multiple children as an array — `Children.map` and `Children.toArray`.** The `React.Children` utilities exist but the 2026 senior reach is to *not* iterate children; instead, expose a data prop. `Children.toArray` is named once as the form that gives stable keys when a component must inspect its children — for a custom `<Tabs>` that reads `<Tab>` subcomponents, for example. The lesson names this reach as rare and intentional.
- **`React.Fragment` and the `<>` shorthand.** Fragments group children without a wrapper DOM node. The `<>...</>` form is the daily reach; `<React.Fragment key={...}>` is the keyed form for lists that need fragment items.
- **Conditional rendering with children.** `{condition && <Thing />}` for the on/off case; `{condition ? <A /> : <B />}` for the pick-one. The lesson names the `&&` zero-vs-empty-string trap: `{count && <List />}` renders `0` when count is `0` because `0` is falsy but renderable. Reach `{count > 0 && <List />}` or `{!!count && <List />}`. (Same lesson cashes in the JSX rendering rules from 4.1.1.)
- **Component composition as the alternative to context — preview only.** The "lifting state up" alternative to passing a prop through five layers is to *compose* — accept a `<Toolbar>` as `children` of the layout, so the consumer wires the props at the call site instead of every intermediate component drilling them. Cross-reference forward to 4.9.4 where context enters and 4.8.4 where lifting state is taught.
- **Watch-outs:**
  - `ReactNode` accepts `boolean`, `null`, `undefined` — all render as nothing. Useful for `{condition && <Thing />}` but the `0` trap is real.
  - Don't reach for `cloneElement` and `Children.map` to inject props into children — `asChild` (Lesson 4.6.3) does the same with a typed contract.
  - The compound-component pattern requires consumers to use the subcomponents — there's no compile-time enforcement that `<CardFooter>` only renders inside `<Card>`. Document the surface; trust the convention.
  - Render props are not deprecated, but the cases that used them are now custom hooks. Don't reach for them when a hook would do.
  - A component that takes `children: ReactElement` (narrow) instead of `ReactNode` breaks on strings and fragments — the constraint is rarely worth the friction.
  - Don't put a `key` on a fragment unless the fragment is part of a list; fragments are otherwise key-free.

What this lesson does not cover:

- The `asChild` polymorphism pattern and Radix `Slot` — Lesson 4.6.3.
- Refs threaded through `children` — Lesson 4.6.4 covers refs as props; `Slot` covers the merging.
- The render model and key-driven reconciliation — Chapter 4.7.
- Context as an alternative to prop drilling — Lesson 4.9.4.
- State management beyond local state — out of scope; the lesson assumes the consumer composes static UI.
- Higher-order components — named once in 4.6.1 and not revisited.
- Slot props in routing (parallel route slots, `@slot`) — Next.js territory (Chapter 5.1.5); same word, different concept.

---

## Lesson 4.6.3 — Polymorphism with Slot and CVA

Teaches the shadcn-style polymorphic component built from `@radix-ui/react-slot` plus `asChild`, the `class-variance-authority` variant table with `VariantProps` and `compoundVariants`, and why this pair beats a generic `as` prop.

Topics to cover:

- **The senior question.** A `<Button>` should sometimes render as a real `<button>` for actions and sometimes as an `<a>` for navigation — but rebuilding the variant table for every element is duplication, and a generic `as` prop forces the author into seven layers of TypeScript gymnastics that still doesn't quite work. The 2026 answer is `<Button asChild><Link href="/dashboard">Open</Link></Button>` — Radix's `Slot` merges the button's classes and props onto the inner `<Link>`, keeps the inner element's types intact, and lives in one line. The lesson installs `asChild` plus `cva` as the polymorphic component pattern the course commits to.
- **The `asChild` problem.** Without `asChild`, a `<Button>` rendering as a link requires either a duplicated `<LinkButton>` component, a generic `as` prop with brittle types, or wrapping `<a><Button /></a>` (which produces invalid nested interactive HTML). All three lose. The senior reach is composition: let the consumer pass the inner element and let the component merge its styling onto it.
- **`@radix-ui/react-slot` — what `Slot` does.** `Slot` from `@radix-ui/react-slot` is a component that takes one child and merges the parent's props onto that child. The form: `<Slot {...props}><Child /></Slot>` renders `<Child {...mergedProps} />`. Class names are merged (the parent's `className` is concatenated with the child's), event handlers are composed (both fire), and refs are forwarded. The student installs once, then reads the API.
- **The `asChild` pattern as the consumer-facing surface.** The component author writes the `asChild` branch internally:
  - When `asChild` is true, render `<Slot>` and pass props to `Slot`, which merges them onto the single child.
  - When `asChild` is false, render the default element (e.g., `<button>`).
  The consumer writes `<Button asChild><Link href="/">Home</Link></Button>` and the rendered DOM is `<a class="...button-classes..." href="/">Home</a>`. The lesson shows the canonical implementation in 8–10 lines and trusts it as the template.
- **`class-variance-authority` (CVA) — the variant table.** A `<Button>` with `variant: 'primary' | 'destructive' | 'ghost' | 'outline'` and `size: 'sm' | 'md' | 'lg'` becomes a multiplication problem — 4 × 3 = 12 combinations. `cva` declares the variant table once: a base class, a `variants` object keyed by prop name, and `defaultVariants`. The function returns a string of classes for any combination of variants. shadcn ships every component built on CVA.
- **The `cva` API in one read.** `const buttonVariants = cva('inline-flex items-center ...base...', { variants: { variant: { primary: '...', destructive: '...' }, size: { sm: '...', md: '...' } }, defaultVariants: { variant: 'primary', size: 'md' } })`. Then `buttonVariants({ variant, size })` returns the joined class string. Combined with `cn(...)` to merge a caller's `className` override: `className={cn(buttonVariants({ variant, size }), className)}`.
- **`VariantProps<typeof buttonVariants>` — typing the variants automatically.** CVA's `VariantProps` helper extracts the variant prop types from the `cva` call. The component types become `ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }`. The student writes the variants in one place; the types follow.
- **`compoundVariants` — variant combinations that need special handling.** Some variant combinations need extra classes — a `variant: 'primary'` `size: 'lg'` button that also gets a slight padding bump, for example. `compoundVariants: [{ variant: 'primary', size: 'lg', class: 'px-8' }]` handles the case. Rare; the lesson names it as the escape valve for design-system edge cases.
- **The full canonical Button — `Slot` + `cva` + `cn()` + `asChild`.** The lesson walks the template every shadcn component follows: `cva` for the variants, `Slot` vs. `<button>` via `asChild`, `cn(buttonVariants({ variant, size }), className)` for the merge, `...props` spread, ref-as-prop wired through. The student leaves with the form they'll see in every shadcn file in Chapter 4.11.
- **The generic `as` prop — named once as the rejected alternative.** Some libraries (Chakra v1, Mantine, MUI) ship a generic `as` prop that retypes the component as the passed element. TypeScript can do this with generics and conditional types, but the errors are unreadable and the inferred props get lost. `asChild` plus `Slot` is the senior cut — the consumer brings the element, the component contributes classes and behavior, and types stay clean because the inner element is just its own JSX.
- **The accessibility implication of polymorphism.** A `<Button asChild><a>...</a></Button>` produces an anchor styled as a button — semantically it's a link, navigates with Cmd+click, opens in new tabs, gets read by screen readers as "link." A button styled as an anchor (`<Button>` with `onClick` that navigates) loses all of that. The senior rule: pick the element that matches the behavior; use `asChild` to vary the *element*, not to fake one.
- **`tailwind-merge` and the variant collision problem.** When the variant table says `bg-primary` and the caller passes `className="bg-destructive"`, `cn()` (which uses `tailwind-merge` under the hood) keeps only the destructive class — the same conflict-resolution rule from 4.2.3 cashes in here. Without `tailwind-merge`, both classes ship to the DOM and the last one wins per cascade, which is brittle.
- **Watch-outs:**
  - `Slot` expects *one* child element — passing two children or a fragment throws. For multi-child slots, restructure or use a different composition.
  - `asChild` forwards every prop including event handlers — the child's `onClick` and the parent's both run. Composition is the senior reach but be aware.
  - Don't reach for `asChild` to swap *kinds* of elements (button to div); the variant should match the semantics.
  - `cva` returns a string of classes; passing it to a non-Tailwind component does nothing. The pattern assumes a Tailwind project.
  - `compoundVariants` runs *after* the base variants — its classes win conflicts via `tailwind-merge`.
  - `VariantProps<typeof buttonVariants>` types include `null` for each variant (the "unset" branch). The default-via-`defaultVariants` handles it at runtime; types still allow explicit `null`.
  - When `asChild` is true, the component's own DOM element doesn't render — so a `<button type="button">` default doesn't reach the rendered `<a>`. The consumer's child element is responsible for its own semantics.
  - `Slot` doesn't merge styles intelligently — only `className` (via concat) and event handlers (via composition). Inline `style` props are last-write-wins.

What this lesson does not cover:

- The shadcn component library surface — Chapter 4.11.
- Refs through `Slot` — covered in 4.6.4 (Slot already forwards refs; the mechanism is taught there).
- Tailwind variant ordering and arbitrary values — Chapter 4.2.1 owns them.
- `clsx` and `tailwind-merge` internals — Chapter 4.2.3 owns them.
- Styled-components, Emotion, and CSS-in-JS — out of scope; the project is Tailwind-only.
- Compound components with shared state via context — Lesson 4.9.4 owns context.
- Polymorphic generic-`as` typing with conditional types — named once and rejected.

---

## Lesson 4.6.4 — Refs as a regular prop

Teaches React 19's ref-as-prop model, the `Ref<T>` and `RefObject<T>` types, ref callbacks with the new cleanup return, merging multiple refs onto one node, and `useImperativeHandle` as the rare escape valve.

Topics to cover:

- **The senior question.** A `<Input>` that the parent wants to focus on mount used to require `forwardRef`, a typed ref forwarding signature, and a six-line ceremony per component. The React 19 form is `function Input({ ref, ...props }: ComponentProps<'input'>) { return <input ref={ref} {...props} />; }` — `ref` is a regular prop, the same as `onClick` or `className`. The lesson installs the React 19 ref-as-prop model, covers the typed ref types, names ref callbacks with their new cleanup return, and lands the `useImperativeHandle` reach for the rare component that wants to expose methods rather than a DOM node.
- **The ref-as-prop model in React 19.** Function components in React 19 accept `ref` as a regular prop. No `forwardRef`, no wrapper, no type gymnastics. The form is `({ ref, ...props }: ComponentProps<'input'>) => <input ref={ref} ... />` — the component destructures `ref` and forwards it to the inner DOM element. `ComponentProps<'input'>` already includes the `ref` prop typed against the input element.
- **`forwardRef` is legacy.** The lesson names `forwardRef` once for recognition — every codebase before 2024 used it, every shadcn file before mid-2025 used it, every React tutorial before React 19 used it. It still works in React 19 (deprecated, not removed). The student reads it, doesn't write it. The eslint-plugin-react `no-forward-ref` rule and React's codemod are the migration path.
- **`Ref<T>` — the type of a ref.** `Ref<HTMLInputElement>` is the type accepted by an element's `ref` prop. It's a union of `RefObject<T> | RefCallback<T> | null`. The student rarely names this type directly because `ComponentProps<'input'>['ref']` resolves to the right thing. When typing custom-component ref props explicitly, the form is `ref?: Ref<HTMLInputElement>`.
- **`RefObject<T>` vs. `MutableRefObject<T>` vs. the new types in React 19.** `RefObject<T>` historically meant "the ref's `.current` is readonly"; `MutableRefObject<T>` meant "you can write to `.current`." React 19 simplified — `RefObject<T>` now has a writable `.current` by default. The lesson names this so students reading older TypeScript types don't get confused, but the writable RefObject is the only form they write.
- **Ref callbacks — `ref={(node) => { ... }}`.** A function-form ref runs on mount with the DOM node and on unmount with `null`. The 2026 reach: setting up an `IntersectionObserver` on a child, measuring an element on mount, or wiring multiple refs to one node (`<input ref={(node) => { internalRef.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }} />`).
- **Ref callback cleanup — the React 19 addition.** A ref callback can now `return` a cleanup function, the same way `useEffect` does. React 19 calls the returned function on unmount instead of invoking the callback again with `null`. The form: `ref={(node) => { const observer = new IntersectionObserver(...); observer.observe(node); return () => observer.disconnect(); }}`. The reach: any teardown that should pair with the mount of a DOM node, without `useEffect` ceremony.
- **The `useRef` lesson, foreshadowed.** Lesson 4.8.6 owns `useRef` for DOM access and instance values. This lesson covers the *prop* shape — how refs travel through components — and trusts 4.8.6 for the hook. The two work together: parent calls `useRef`, passes it as the `ref` prop, child destructures and forwards to a DOM element.
- **Merging refs — the `useImperativeHandle` and external-ref pattern.** When one component needs *its own* ref on a DOM node *and* needs to forward a ref to the parent, both refs need the same node. The 2026 reach: a ref callback that writes both refs, or a `mergeRefs` utility (a 5-line function commonly shipped in a `lib/refs.ts`). The lesson shows the callback form and trusts utility libraries (`react-merge-refs`) as the imported alternative.
- **`useImperativeHandle` — the rare escape valve.** A component that wants to expose methods to the parent (`inputRef.current.focus()`, `inputRef.current.scrollToBottom()`) but doesn't want to expose a raw DOM node uses `useImperativeHandle(ref, () => ({ focus, scrollToBottom }))`. The reach is genuinely rare — most cases that reach for it should expose the DOM node directly via ref-as-prop. Named once as the form that exists; the lesson lands the rule "prefer exposing the node."
- **The `Slot` and `asChild` ref story.** Radix `Slot` (from Lesson 4.6.3) already forwards the parent's ref onto the child element. The senior takeaway: when a component is built on `Slot`, refs work end-to-end without ceremony — `<Button asChild ref={btnRef}><Link href="/">Open</Link></Button>` puts the ref on the `<a>` element.
- **Why React 19 made this change — the senior frame.** `forwardRef` existed because `ref` was magic — reserved by the React runtime, like `key`. Making it a regular prop removes the magic, eliminates the wrapper, and lets the React Compiler reason about it like any other prop. The pattern is consistent with React 19's broader move toward "less magic, more contract" (cross-reference to the `"use client"` / `"use server"` directives in 5.2.3 as the same principle in another shape).
- **Watch-outs:**
  - Class components still can't accept `ref` as a prop — the course doesn't ship class components, but reading older code requires recognition.
  - Don't try to read `ref` from `props` when destructuring rest — `({ ref, ...rest })` works because `ref` is now a regular prop, but spreading `{...rest}` won't include it (it's been destructured out).
  - A ref-as-prop on a component that doesn't accept a `ref` prop in its type just gets ignored at runtime — the type system catches the misuse.
  - The cleanup-from-ref-callback runs *before* the next render's ref callback runs; it's the same lifecycle as `useEffect` cleanup.
  - Don't reach for `useImperativeHandle` when the parent just needs to focus a child input — pass the ref through and call `ref.current.focus()` directly.
  - `Ref<T>` is `RefObject<T> | RefCallback<T> | null` — passing a ref callback works wherever a ref prop is accepted.

What this lesson does not cover:

- `useRef` for instance values and DOM access — Lesson 4.8.6.
- `useImperativeHandle` at depth — recognition only here; the API is documented in 4.10 territory if a custom hook earns it.
- Refs in class components — the course doesn't teach class components.
- The legacy callback-ref form before React 16.3 — out of scope.
- Refs for measuring DOM (`useResizeObserver`, `useElementSize`) — Chapter 4.10 if a custom hook earns it.
- Stale refs in closures — Chapter 4.9 territory (effects and external systems).
- React DevTools' ref inspection — Chapter 1.3.3 introduced DevTools.

---

## Lesson 4.6.5 — Portals and the layout escape

Teaches `createPortal` for modals, toasts, and anchored popovers, the SSR `document` guard, the accessible-modal contract (focus trap, scroll lock, `Esc`), the native `<dialog>` and CSS anchor-positioning alternatives, and why events still bubble through the React tree.

Topics to cover:

- **The senior question.** A `<Dialog>` rendered inside a card with `transform: translate-y` (from 4.4.9) gets trapped — its `position: fixed` inset stops respecting the viewport because the transformed ancestor created a containing block; even worse, `overflow: hidden` on a parent clips the dialog. The 2026 fix is a portal: render the dialog into `<body>`, escaping every ancestor's stacking context and overflow. The lesson installs `createPortal` as the layout escape, names the three canonical reaches (modals, toasts, anchored popovers), wires the accessibility companions (focus trap, scroll lock, `Esc` close, `aria-modal`), and forward-references CSS anchor positioning as the popover surface.
- **`createPortal(children, container)` — the API.** From `react-dom`: `createPortal(<Dialog />, document.body)` renders the dialog's DOM into `<body>` while keeping it in the React tree at its original location. Context flows down through portals; events bubble *through the React tree* (not the DOM tree); state updates propagate normally. The two arguments are the children and a DOM node; the second is usually `document.body` or a dedicated portal root.
- **The portal target — `document.body` vs. a named root.** `document.body` is the daily reach for modals and toasts. A named root (`<div id="portal-root" />` in `RootLayout`) is the senior reach when a project wants to keep portal content under a specific ancestor for CSS-variable inheritance (a `.dark` theme on `<html>` reaches portals attached to `<body>`, but a portal attached to `<html>` itself would not inherit the theme tokens). Most SaaS projects attach to `<body>`.
- **Where portals matter — the three canonical reaches.** (1) **Modals and dialogs** that need to overlay the entire page regardless of ancestor `overflow: hidden` or stacking-context traps. (2) **Toast notifications** that anchor to a corner of the viewport via `position: fixed` and stack vertically. (3) **Anchored popovers, tooltips, and menus** that need to escape parent overflow (a dropdown in a scrollable table). The lesson treats these as the surface; bespoke portal reaches are rare and project-specific.
- **The Next.js / SSR caveat — `document` is not defined on the server.** Server-rendered components can't reference `document.body` because `document` doesn't exist server-side. The senior reach: gate the portal on the client. The forms — `'use client'` directive on the component file (cross-reference forward to 5.2.2) and either a `useEffect` mount flag (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`) or `typeof window !== 'undefined'`. The lesson names the pattern, then trusts shadcn's Dialog (which handles this internally) as the production answer.
- **The accessible-modal contract — the WAI-ARIA APG checklist.** A modal needs: (1) `role="dialog"` and `aria-modal="true"`, (2) `aria-labelledby` pointing at the title and `aria-describedby` at the description, (3) focus moved into the dialog on open, (4) focus trapped inside while open, (5) focus restored to the trigger on close, (6) `Esc` closes the dialog, (7) clicks on the backdrop close (unless the dialog is destructive), (8) the body scroll is locked while the dialog is open. The lesson names the contract; Chapter 4.11 owns the discipline-level treatment; the project chapter (4.12.5) builds a focus trap and scroll lock from primitives.
- **The native `<dialog>` element — the 2026 platform alternative.** `<dialog>` shipped with `showModal()` and built-in focus trap, `Esc` handling, and the top-layer rendering that bypasses every stacking context. Production-safe in 2026. The senior call: native `<dialog>` is the right reach when the project wants the platform behavior and shadcn-style styling is fine; the Radix Dialog (which uses `createPortal` plus manual focus management) is the right reach when the project needs animated entrance/exit choreography or custom backdrop interaction. The lesson names the alternative and trusts shadcn's Dialog for the project's daily reach.
- **Toasts — the portal-plus-fixed pattern.** A toast container lives in `<body>` via a portal; each toast is `position: fixed` to the viewport corner with `gap-2` stacking; entrance animation uses `tw-animate-css` (4.5.5); the toast auto-dismisses after a timeout. The lesson names `sonner` as the canonical 2026 toast library shadcn ships with — the student installs and reads, doesn't reimplement.
- **Anchored popovers and the `position: fixed` problem.** A dropdown menu attached to a button needs to track the button's position even while scrolling; `position: absolute` inside the trigger is broken by parent `overflow: hidden`; `position: fixed` plus a portal escapes overflow but needs JavaScript to track scroll. Two production answers: (1) `@floating-ui/react` (the Radix dependency) for full positioning logic with collision detection and flip; (2) **CSS anchor positioning** (Baseline 2026) for the platform-native form when the trigger and the popover share a layout root — `anchor-name`, `position-anchor`, and `position-area` retire the JavaScript. Forward reference to 4.11 for the shadcn surface; recognition here.
- **Portals and the stacking-context fix from 4.4.9.** The canonical bug: a modal inside a card with `transform: translate(...)` gets trapped because `transform` on an ancestor creates a containing block for `position: fixed`. The senior fix is portal-to-body; the alternative is `isolation: isolate` on the trapping ancestor (which doesn't help for `position: fixed` containing blocks but does for `z-index` traps). Portals are the canonical answer when the modal needs to escape *both* overflow and containing block.
- **Event bubbling through the React tree, not the DOM tree.** A `<Card>` with an `onClick` handler that contains a portaled `<Tooltip>` will see clicks on the tooltip — because the React tree still has the tooltip as a descendant of the card. The senior frame: portals only escape *layout*, not *React event flow*. The lesson names this as the surprise and the design intent.
- **Scroll lock — preventing the page from scrolling behind a modal.** The body needs `overflow: hidden` while the modal is open; on iOS, also `position: fixed` with the current scroll position preserved (the iOS body-scroll bug). The lesson names the requirement; the `useLockBodyScroll` custom hook is built in the project chapter (4.12.5). shadcn's Dialog handles this internally.
- **Watch-outs:**
  - Don't render a portal during SSR — `document` is undefined. Mount-flag, `useEffect`, or `'use client'` plus client-only logic. shadcn's Dialog already does this; bespoke portals don't.
  - Portals don't escape *React* — context flows through, errors bubble through, events bubble through the tree. The DOM is the only thing that moves.
  - A portal target that doesn't exist (`document.getElementById('does-not-exist')`) returns `null` and `createPortal` throws. Provide the target or default to `document.body`.
  - `position: fixed` inside a portal works against the viewport because the ancestor chain in the DOM is now `<body>` — no transformed ancestor in the way.
  - The native `<dialog>` element uses the *top layer*, which is above every stacking context — no portal needed, no z-index management. The trade-off is less styling flexibility on the backdrop pseudo-element (though CSS support is improving).
  - Scroll lock without preserving scroll position causes the page to jump to the top — measure `window.scrollY`, set `top: -<scrollY>px`, restore on close.
  - Toast containers attached to `document.body` survive route changes (good for cross-route notifications); per-page portal targets reset on navigation.
  - Animated portals need entrance and exit choreography — the exit animation must run before the React tree unmounts. shadcn's Dialog uses Radix's `data-state="open"` / `"closed"` pattern (cross-reference to 4.5.5) which keeps the DOM around through the exit transition.

What this lesson does not cover:

- The shadcn Dialog, Sheet, Popover, Tooltip surfaces — Chapter 4.11.
- Focus trap and scroll lock implementations — Chapter 4.12.5 (the project chapter cashes in).
- CSS anchor positioning at depth — Chapter 4.11 territory.
- `@floating-ui/react` API — recognition only here; shadcn wraps it.
- Toast library internals (`sonner`, `react-hot-toast`) — recognition only; the library is installed and read.
- ARIA roles and live regions at depth — Chapter 4.11.3 owns ARIA basics.
- The history-API and modal-as-URL pattern — Chapter 5.1.6 (intercepting routes).
- Top-layer CSS and the `::backdrop` pseudo-element at depth — recognition only.
- The `popover` HTML attribute and `<button popovertarget>` — Baseline 2026, named once as the platform anchor-positioning companion.

---

## Lesson 4.6.6 — Quizz

Top 10 topics to quiz:

- The typed component contract — `type Props` over `interface`, `ComponentProps<'tag'>` and `ComponentProps<typeof Component>` for native attribute inheritance and wrapper typing, default values via destructuring, the variant-union over boolean-prop reflex, the `className` plus `...rest` discipline.
- `children` and the `ReactNode` type — `ReactNode` vs. `ReactElement`, the `{0 && <Thing />}` zero-vs-falsy trap, fragments and the `<>` shorthand, conditional rendering reflexes.
- Compound components vs. prop-as-slot — the decision rule (zero/one named region → prop-as-slot; two or more → compound), the shadcn `<Card><CardHeader>...</CardHeader></Card>` pattern, why composition beats configuration as the prop list grows.
- Render-prop and `Children.map` recognition — when render-as-function survives in 2026 (data-loader exposing state to the consumer's render) and when a custom hook is the better reach.
- The `asChild` + `Slot` polymorphism pattern — `@radix-ui/react-slot` merging classes, props, and refs onto the consumer's child element; why `asChild` beats a generic `as` prop on both ergonomics and TypeScript clarity; the accessibility rule "match the element to the behavior."
- `class-variance-authority` — the variant table API (`cva(base, { variants, defaultVariants })`), `VariantProps<typeof variants>` for automatic typing, `compoundVariants` for combination-specific tweaks, the canonical Button template with `Slot` + `cva` + `cn()`.
- React 19 refs as a regular prop — destructuring `ref` from props, `ComponentProps<'tag'>` already including the ref type, `forwardRef` named once as deprecated, the eslint and codemod migration path.
- Ref callbacks and the React 19 cleanup return — the callback runs with the node on mount, the returned cleanup runs on unmount; merging multiple refs via a callback or `react-merge-refs`; `useImperativeHandle` as the rare escape valve.
- Portals — `createPortal(children, document.body)` for layout escape, the three canonical reaches (modals, toasts, anchored popovers), the stacking-context-trap fix from 4.4.9, events bubbling through the React tree not the DOM tree, the SSR `document` guard.
- The accessible-modal contract — `role="dialog"`, `aria-modal`, focus management on open and close, focus trap, `Esc` close, scroll lock, backdrop click behavior; the native `<dialog>` element with `showModal()` and the top-layer as the platform alternative; recognition that shadcn's Dialog ships these baseline.
