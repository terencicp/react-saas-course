sources:
  18.1: Utility-first on JSX
  18.2: CSS-first config in globals.css
  18.3: Composing classes with cn()
  18.4: Variants that read DOM state
  18.5: Dark mode via semantic tokens
  18.6: Theme switching without FOUC

questions:
  - source: 18.1
    question: |
      A `<Badge>` is supposed to take a brand color and tint itself. It renders fine in the editor, but in the deployed build every badge comes out with no background at all — and there's no error anywhere:

      ```tsx
      const Badge = ({ tone }: { tone: 'red' | 'green' }) => (
        <span className={`bg-${tone}-500`}>{tone}</span>
      );
      ```

      What went wrong?
    choices:
      - text: |
          Tailwind scans your source as plain *text* at build time and never runs your code, so it only sees the literal string `bg-${tone}-500` — never `bg-red-500` or `bg-green-500`. Those classes are assembled at runtime, so their CSS is never generated. The fix is a lookup map that contains each full class name as literal source text.
        correct: true
      - text: |
          Template literals aren't allowed in `className` — React strips interpolated class strings during the production build for security, which is why it works in dev but not in the deployed bundle.
        correct: false
      - text: |
          The classes exist, but `bg-red-500` and `bg-green-500` aren't on this project's theme scale, so the build drops them. Switching to semantic tokens like `bg-primary` would emit them.
        correct: false
    why: |
      This is the dynamic-class trap, and it's nasty precisely because nothing errors. Tailwind generates CSS by scanning your source files as text and emitting a rule for every class string it literally sees — it never executes your components. So `` `bg-${tone}-500` `` is, to the scanner, one opaque string it can't match to any utility; `bg-red-500` only ever exists after the code runs, which the scanner never does. No CSS, no background, no error. The rule that prevents the whole class of bug: never assemble a Tailwind class name from a variable. Write each complete class as literal text — usually a lookup map keyed by the variable (`{ red: 'bg-red-500', green: 'bg-green-500' }[tone]`) — so the scanner can find every name. It has nothing to do with React stripping classes or with the theme scale.

  - source: 18.2
    question: |
      You add this to `app/globals.css` and reach for `bg-brand` in a component, but the utility doesn't exist — IntelliSense doesn't even suggest it:

      ```css
      @theme {
        --brand-color: oklch(0.62 0.19 256);
      }
      ```

      What's the first thing to check?
    choices:
      - text: |
          The namespace prefix. A `@theme` token mints utilities by its *namespace*, and `brand` isn't one Tailwind recognizes — there's no `--brand-*` family. Lead with the real namespace: `--color-brand` mints `bg-brand`, `text-brand`, `border-brand`. Same name, same value; only the order is wrong.
        correct: true
      - text: |
          The token needs to be registered as a utility. Defining a CSS variable isn't enough on its own — you also have to declare `@utility bg-brand { ... }` so Tailwind knows to generate the class.
        correct: false
      - text: |
          The value. `oklch(...)` colors can't be used in `@theme`; tokens there must be hex or RGB, and the OKLCH value is silently rejected, taking the whole token with it.
        correct: false
    why: |
      In v4 a `@theme` token is a CSS variable whose *namespace* deterministically decides which utility family it joins — and the name you choose travels straight into the utility. `--color-brand` routes through the `color` namespace and mints `bg-brand`, `text-brand`, `border-brand`, `ring-brand` with no registration step at all. `--brand-color` flips that: `brand` isn't a namespace Tailwind knows, so it builds nothing, and the canonical fix is to lead with the namespace — `--color-brand`. So the first debugging question for any missing utility is "does the token start with a real namespace?" You never separately register utilities (that's exactly what the deterministic minting removes), and OKLCH is v4's *default* color space, not a rejected one.

  - source: 18.3
    question: |
      A reusable `<Button>` sets `px-4` internally. A consumer passes `className="px-8"` to make it wider. With the naive `` className={`... px-4 py-2 ${className}`} ``, both `px-4` and `px-8` end up on the element. Why is "the consumer's `px-8` comes later in the string, so it wins" the *wrong* mental model — and what actually fixes it?
    choices:
      - text: |
          Class order in the `class` attribute doesn't decide the winner — the cascade does, and among equal-specificity rules the last one *in the generated stylesheet* wins, in an order Tailwind fixes independently of your markup. So the outcome is build-dependent and silent. `cn()` fixes it because `tailwind-merge` *deletes* the losing `px-4`, leaving only `px-8` on the element.
        correct: true
      - text: |
          The model is right about order but `cn()` is still needed for performance — concatenation rebuilds the whole string on every render, while `cn()` memoizes the result so the merge runs only once.
        correct: false
      - text: |
          It's wrong because the *first* class in the attribute always wins in CSS, so `px-4` beats `px-8`. `cn()` fixes it by reversing the string so the consumer's class lands first.
        correct: false
      - text: |
          The model is wrong because `px-4` and `px-8` don't actually conflict — they set different properties. `cn()` simply keeps both, and the browser adds the two paddings together.
        correct: false
    why: |
      Two classes that set the same property both land on the element, and the browser can't apply both — it falls back to the cascade. Among equally-specific rules the last one *in the stylesheet* wins, and Tailwind emits its utilities in its own fixed source order, with nothing to do with where the tokens sit in your `class` attribute. So you can't reason about the winner from your own code, and it can shift between builds: silent and unpredictable. Concatenation can only ever *append* — it never removes the loser. The fix is `tailwind-merge` (reached through `cn()`), which parses the string as Tailwind, sees `px-4` and `px-8` as one horizontal-padding conflict, and keeps only the last — deleting `px-4` outright. It's a correctness fix, not a performance one, and `px-4`/`px-8` genuinely do conflict.

  - source: 18.3
    question: |
      Here's the corrected `<Button>`. Why must `className` be the *last* argument to `cn()` — and what breaks if you move it first?
    choices:
      - text: |
          `tailwind-merge` keeps the *last* of each conflicting utility, so last position is exactly what lets a consumer's `px-8` delete the component's `px-4`. Move `className` first and the component's own defaults land last and win — consumer overrides silently stop working.
        correct: true
      - text: |
          Argument order is just a style convention; `tailwind-merge` resolves conflicts by specificity, not position, so `className` wins from anywhere in the call. Putting it last is purely for readability.
        correct: false
      - text: |
          `className` must be last because `cn()` only reads its final argument for consumer overrides and treats every earlier argument as internal-only defaults that can't be overridden.
        correct: false
    why: |
      The whole override pattern rests on one fact about `tailwind-merge`: within a conflict group, the *last* class wins. So the call is ordered defaults first, conditional variants next, consumer `className` last — and that last slot is what makes the consumer's `px-8` delete the component's `px-4` deterministically, every build. Flip it so `className` comes first and the component's defaults now sit last; they win the merge and clobber whatever the consumer passed, so overrides quietly stop working with no error. It isn't specificity-based (position is the whole mechanism), and `cn()` doesn't treat arguments as privileged tiers — every argument is merged the same way, last-wins.

  - source: 18.4
    question: |
      A teammate is building a settings panel and reaches for `useState` + handlers for each of these. Which ones can be done with a Tailwind variant *instead* — no state, no handler — because the DOM already tracks the fact? Select all that apply.
    choices:
      - text: |
          A form's outer border turns red while *any* field inside it is invalid.
        correct: true
      - text: |
          A "Delete" button hidden inside a card fades in when the card is hovered.
        correct: true
      - text: |
          A radio-card highlights when the radio it wraps is the checked one.
        correct: true
      - text: |
          A "Saved!" banner appears two seconds after the server confirms the write succeeded.
        correct: false
    why: |
      The reflex is one question: can the DOM already tell me this? If yes, write a variant. A form reading its descendants' validity is `has-[:invalid]:border-destructive` — `:has()` lets a parent react to a child. A button reading its card's hover is the `group` / `group-hover:` pair. A label reading the checked state of the radio it contains is `has-[:checked]:`. None of those need a boolean or a handler — the browser and the DOM already hold the fact, and the selector reads it. The banner is different in kind: "the server confirmed, then two seconds passed" is a value no selector can match on, so it's genuine React state. Variants replace the state that was only ever *mirroring* a DOM fact — not state that tracks something the DOM never knew.

  - source: 18.4
    question: |
      You write `aria-current:font-semibold` on the active nav link to bold it, but it never applies — no error, no style. The element really does carry `aria-current="page"`. What's wrong?
    choices:
      - text: |
          `aria-current` has no built-in shorthand variant (its value can be `page`, `step`, `location`, …, so there's no single boolean case to target), so `aria-current:` compiles to nothing. You need the arbitrary form: `aria-[current=page]:font-semibold`.
        correct: true
      - text: |
          ARIA attributes can't be styled by Tailwind at all — they exist only for assistive tech. You have to mirror the active state into a `data-active` attribute and write `data-active:font-semibold`.
        correct: false
      - text: |
          `aria-current="page"` is a string, but the `aria-current:` variant matches the boolean `true`, so it only fires for `aria-current="true"`. Set the attribute to `"true"` and the shorthand works.
        correct: false
    why: |
      Tailwind ships shorthand variants only for the *boolean* ARIA attributes — `aria-expanded:`, `aria-pressed:`, `aria-checked:`, and the rest — and each targets the `="true"` case. `aria-current` isn't boolean: its value can be `page`, `step`, `location`, `date`, `time`, or `true`, so there's no single case a shorthand could target, and none is generated. Writing `aria-current:` therefore compiles to nothing, silently. The arbitrary form covers it: `aria-[current=page]:font-semibold`. (`aria-invalid` is the other common one with no shorthand, written `aria-[invalid=true]:`.) ARIA *is* styleable — that's the whole point, one attribute serving both assistive tech and your styles — and you don't mirror it into a `data-*`. Changing the value to `"true"` would be wrong markup for a nav link.

  - source: 18.5
    question: |
      Across your app a single card surface keeps appearing as `bg-white dark:bg-slate-800`, and the dimmer "last edited" text shows up as `dark:text-slate-400` on two different pages. The chapter's dark-mode model says one of these patterns should stay an inline `dark:` and the other should become a semantic token. Which is which, and what's the rule?
    choices:
      - text: |
          Both should become tokens. The test is *reuse*, not the kind of property: the surface recurs across components and the dimmer text is already duplicated on two pages — both are past the two-component threshold, so promoting them gives each one source of truth and stops the darks drifting.
        correct: true
      - text: |
          Both should stay inline `dark:`. Per-utility `dark:` is the senior default; semantic tokens are an advanced opt-in you reach for only once a design system is formally documented.
        correct: false
      - text: |
          The surface becomes a token (backgrounds always do); the dimmer text stays inline, because text color is a one-off styling concern that doesn't belong in the shared palette.
        correct: false
    why: |
      The threshold is reuse, full stop — not whether it's a background or a text color. A surface shared across components and a dimmer-text color already duplicated on two pages are both past the "if the same `dark:` adjustment shows up in two components, promote it" line: lift them into role-named tokens (`bg-card`, `text-muted-foreground`) so one value drives every instance and the dark values can't drift apart. The carve-out for inline `dark:` is for genuine *one-offs* — a shadow that's softer in dark on a single card, a hero gradient that flips on one screen — where promoting the value would pollute the palette with something nothing else references. Per-utility `dark:` everywhere is exactly the default this lesson argues *against*, and "backgrounds are tokens, text isn't" is not the rule.

  - source: 18.6
    question: |
      A theme setup reads the saved theme inside a `useEffect` and adds `.dark` to `<html>` after the component mounts. A user with a dark-set OS reloads and sees a white flash that snaps to dark. Why can't the effect-based approach ever fix this, and what does?
    choices:
      - text: |
          Effects run *after* hydration, which runs after the first paint — so by the time the effect sets the class, the wrong (light) pixels are already on screen. You can't repair a paint that already happened; you have to set the class *before* paint, with a synchronous `<head>` script (what `next-themes` injects for you).
        correct: true
      - text: |
          The effect runs fine, but `useEffect` can't mutate `<html>` because it sits outside React's root — switching to a `useLayoutEffect` that targets `document.documentElement` sets the class early enough to kill the flash.
        correct: false
      - text: |
          The server renders `.dark` correctly, but the effect *removes* it on mount and re-adds it a frame later. Deleting the redundant effect entirely lets the server-rendered class stand, with no flash.
        correct: false
    why: |
      The flash is a timing problem. The server can't read `localStorage` or the OS setting, so it ships HTML with the default theme; the browser paints that first frame *before any React runs*; only then does hydration happen and the effect fire and flip the class, forcing a repaint. Light, then dark — that gap is the flash. Anything that reads the theme inside React is structurally too late, because the wrong pixels are already painted. The only fix is to set the class before the body paints, which means a plain synchronous `<head>` script — exactly what `next-themes` injects. `useLayoutEffect` still runs after paint, and the server never rendered `.dark` to begin with, so there's nothing for it to wrongly remove.

  - source: 18.6
    question: |
      The root layout for the theme setup carries `suppressHydrationWarning` on `<html>`. Which statements correctly explain why it belongs there — and *only* there? Select all that apply.
    choices:
      - text: |
          The pre-paint inline script rewrites `<html>`'s class before React hydrates, so React is guaranteed to find a class the server's HTML never had. The mismatch is intentional, not a defect, and this prop acknowledges it.
        correct: true
      - text: |
          It's shallow — it silences mismatch warnings for `<html>`'s own attributes only, not its descendants, so it can't mask a real mismatch deeper in the tree.
        correct: true
      - text: |
          It makes React skip hydrating `<html>` entirely, so its class can never conflict.
        correct: false
      - text: |
          Theme-token utilities like `bg-background` need it too, or they won't match between server and client render.
        correct: false
    why: |
      `suppressHydrationWarning` acknowledges one specific, intentional mismatch: the inline script deliberately writes `.dark` onto `<html>` before hydration to win the race against first paint, so React inevitably finds a class the server never sent. That's the fix working, not a bug — and the prop tells React so. It's also deliberately *shallow*: it quiets warnings for that one element's own attributes and nothing below it, which is exactly why it's safe and why you don't scatter it around. It does *not* switch hydration off — React still hydrates `<html>` normally — and it has nothing to do with theme-token utilities, which resolve identically on server and client because CSS variables resolve the same in both.
