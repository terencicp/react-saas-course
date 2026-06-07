sources:
  49.1: JSX for the email DOM
  49.2: The preview server loop
  49.3: Readable in every client

questions:
  - source: 49.1
    question: |
      You need a two-column header — logo on the left, a "Open dashboard" link on the right. You write it with `<div className="flex justify-between">`, and it looks perfect in the preview server. Why is this still the wrong call?
    choices:
      - text: |
          The preview renders in Chrome, which honors `flex`; Gmail discards it and collapses the two columns into one stack. Use `<Row>` and `<Column>`, which compile to the table layout every client understands.
        correct: true
      - text: |
          `flex` works in every client, but `<div>` is disallowed in React Email templates — you must use `<Section>` as the outer wrapper for the styles to inline.
        correct: false
      - text: |
          The `<Tailwind>` component would throw a build error on `flex`, so the template never compiles.
        correct: false
    why: |
      The trap is that the preview lies: it's a Chrome renderer, so `flex` looks aligned there, then Gmail throws the flex away and stacks everything into one column with no warning. Horizontal layout in email is `<Row>` plus `<Column>`, which emit table cells. `<div>` itself is fine, and `<Tailwind>` doesn't error on unsupported utilities — it silently drops them, which is exactly why the failure is so easy to miss.

  - source: 49.1
    question: |
      Your brand color is defined in the web app as an OKLCH value in a Tailwind v4 `@theme` block. What has to happen for it to render reliably on a `<Button>` across mailbox clients?
    choices:
      - text: |
          Mirror the token into a JS config (`emailTailwindConfig`) as a hex value, because some clients can't parse OKLCH and silently drop the whole `background-color`, leaving the button with no fill.
        correct: true
      - text: |
          Pass the web app's CSS `@theme` block to `<Tailwind>`'s `config` prop so the same OKLCH tokens are reused without duplication.
        correct: false
      - text: |
          Nothing — `<Tailwind>` converts OKLCH to a client-safe color space automatically at render time.
        correct: false
    why: |
      Two things bite here. The `<Tailwind>` component is configured through a JS object, not a CSS `@theme` block, so the web tokens can't be reused directly. And a client that can't parse OKLCH doesn't fall back gracefully — it drops the property entirely, so the brand button renders with no background. The fix is a hand-maintained config mirroring each token as hex, which renders everywhere.

  - source: 49.1
    question: |
      A teammate inlines the logo as a base64 data URL so there's "nothing to host." Beyond the image possibly not appearing, what's the more serious consequence?
    choices:
      - text: |
          The encoded bytes can push the message past Gmail's 102 KB limit, which clips it — hiding everything after the cut, including the footer's unsubscribe link and legal address, behind a link most people never tap.
        correct: true
      - text: |
          Base64 images break the auto-generated plain-text part, so the message ships HTML-only and fails spam filters.
        correct: false
      - text: |
          Inline images force Outlook to render at natural size, blowing past the 600px column.
        correct: false
    why: |
      The hard wall is the 102 KB Gmail clip: a base64 logo can eat the budget by itself, and when Gmail clips it buries the unsubscribe link and legal address behind "View entire message" — a compliance problem on top of a visual one. The plain-text part is derived from the JSX regardless of image encoding, and the natural-size issue is about missing `width`/`height` attributes, not base64.

  - source: 49.1
    question: |
      Which lines belong *inside* a `WelcomeEmail` template, and which belong in the Server Action that calls it? Select every statement that's correct.
    choices:
      - text: |
          Reading `firstName` and `verifyUrl` from props belongs inside the template — it's pure presentation.
        correct: true
      - text: |
          Building `verifyUrl` from `process.env.APP_URL` and a token belongs in the Server Action, not the template.
        correct: true
      - text: |
          The template should query the database for the user record when only an id is passed, to keep the call site simple.
        correct: false
      - text: |
          Keeping the template props-only is what lets the same file render unchanged in the preview, in a test, and in a real send.
        correct: true
    why: |
      A template is a pure renderer: every dynamic value arrives as a prop, and it never reads env, the session, or the database. The caller computes those and passes finished values in. That discipline is exactly what makes the one file render identically across the preview server, a unit test, and production — no `if preview / else production` branching anywhere.

  - source: 49.2
    question: |
      The preview server's dark-mode toggle shows your template looking clean in dark mode. What can you correctly conclude?
    choices:
      - text: |
          That the obviously-broken cases are caught, but not that dark mode is correct everywhere — the toggle only *emulates* `prefers-color-scheme: dark` and can't reproduce Gmail Android's blanket inversion. Confirm with a real test-send.
        correct: true
      - text: |
          That the email is confirmed correct in dark mode on every client, since the toggle renders the same way real clients do.
        correct: false
      - text: |
          Nothing useful — the toggle is purely decorative and should be ignored in favor of the test-send.
        correct: false
    why: |
      Calibrate trust precisely: the toggle emulates a preference-respecting client, so it's great for catching the obvious failures (a white logo vanishing on an inverted background) cheaply. But real clients apply their own inversion heuristics the toggle can't reproduce, so dark mode is only *confirmed* by a test-send to a real client. It's neither authoritative nor useless — it narrows the problem, the gate closes it.

  - source: 49.2
    question: |
      You're about to declare a template done. Order matters: which check sits *last* in the loop, and why isn't it just another preview pass?
    choices:
      - text: |
          A test-send to real inboxes you actually open — it's the only thing that reveals what a real client does (dark-mode inversion, the Outlook VML button path) that no local render can fake.
        correct: true
      - text: |
          Toggling the mobile viewport — once it wraps cleanly at 375px, every other client follows.
        correct: false
      - text: |
          Reading the HTML view to confirm the `<Tailwind>` classes inlined — once the styles are on the wire, rendering is guaranteed.
        correct: false
      - text: |
          Editing `PreviewProps` to a long name and URL to stress the layout — the worst-case render proves the rest.
        correct: false
    why: |
      The mobile toggle, the HTML view, and the props-panel stress test are all part of the fast inner loop — they catch layout and content issues locally and cheaply. But the loop has a ceiling: it can't reproduce a real client's inversion or Outlook's VML rendering. The test-send is the verification gate, run once at the end against inboxes you genuinely read, before the template is wired into a Server Action.

  - source: 49.3
    question: |
      The Resend SDK auto-derives the `text/plain` body from the `react` node you send. Given that, what's the correct working habit for the plain-text version?
    choices:
      - text: |
          Read it in the preview's plain-text tab as a standalone message, and fix any incoherence in the HTML JSX — there's no separate text file, the text is downstream of the JSX.
        correct: true
      - text: |
          Hand-write a parallel `text` string for every send so you control exactly what plain-text readers see.
        correct: false
      - text: |
          Call `render(<T/>, { plainText: true })` on the send path to guarantee the text part is generated.
        correct: false
    why: |
      Because the text is generated from the JSX, a bad text version is a bug in the HTML, and the fix lives in `welcome.tsx` — reword the copy, fix the link text, adjust an `alt`. Hand-maintaining a parallel string drifts from the HTML within a release or two. And the `plainText` flag on `render` is deprecated in favor of `toPlainText(html)`; on the send path you pass the node and get both bodies for free.

  - source: 49.3
    question: |
      The plain-text tab shows the decorative sparkle image's filename leaking in as a stray line above the greeting. What's the right fix, and what's the trap?
    choices:
      - text: |
          Set the decorative image's `alt` to an explicit empty string — that drops it from the text. The trap is doing the same to an *informational* image, which silences real content for screen-reader users.
        correct: true
      - text: |
          Delete the offending line directly in the generated text body — it's faster than touching the JSX.
        correct: false
      - text: |
          Shrink the image with smaller `width`/`height` so the generator emits less text for it.
        correct: false
    why: |
      An explicit `alt=""` marks an image as decorative, so the generator skips it. There's no separate text file to edit — it's re-derived from the JSX every render. The trap is using `alt=""` to "clean up" an *informational* image: that empties the alt to silence the text and blinds screen-reader users to real content. `width`/`height` are layout only and have no bearing on the text body.

  - source: 49.3
    question: |
      You ship a CTA whose text only clears 4.5:1 contrast *after* a client applies your `@media (prefers-color-scheme: dark)` styles. In its light form it sits at 3:1. Is the template accessible enough to ship?
    choices:
      - text: |
          No — the *light* template must meet WCAG contrast on its own. Most clients ignore the dark preference (and some Gmail clients strip `<style>` blocks), so dark mode is a courtesy layer, never the contrast strategy.
        correct: true
      - text: |
          Yes — as long as the message clears 4.5:1 in *some* rendering, it satisfies WCAG AA for that text.
        correct: false
      - text: |
          Yes, provided the `color-scheme` meta tags are present so the dark styles are guaranteed to apply.
        correct: false
    why: |
      A message that only reaches AA after a dark transform fails contrast for the majority of readers whose clients ignore the preference — and some Gmail clients strip `<style>` blocks outright, so the dark rules may never arrive. The light, inline-styled template has to pass on its own. Dark mode sits on top of a template that already passes; it never makes one pass.

  - source: 49.3
    question: |
      You add Tailwind `dark:` utilities to your CTA but put nothing else in `<Head>`. A user opens it in Apple Mail with the OS set to dark. What happens?
    choices:
      - text: |
          The dark styling is ignored — Apple Mail only applies your dark styles once the template declares it's dark-aware via the `color-scheme` and `supported-color-schemes` meta tags. The plumbing is the opt-in.
        correct: true
      - text: |
          Apple Mail applies the `dark:` styles automatically, because it always honors `prefers-color-scheme`.
        correct: false
      - text: |
          Apple Mail fully inverts the whole message regardless, so the `dark:` styles are redundant.
        correct: false
    why: |
      The head plumbing is the opt-in: without `<meta name="color-scheme">` and `<meta name="supported-color-schemes">`, Apple Mail won't apply your dark styles even with the user in dark mode — your `dark:` (or `@media`) rules are simply ignored. Apple Mail is a "no transformation" client, so it doesn't blanket-invert; the styling rides on top of the declared plumbing.
