# `GitBranchingEmbed`

Inline embed of [learngitbranching.js.org](https://learngitbranching.js.org) (LGB) — the LGB UI is the lesson, so this renders the iframe directly with no collapsible wrapper.

## Import

```ts
import GitBranchingEmbed from '../../../components/embeds/GitBranchingEmbed.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | yes | — | `<iframe title>` — for accessibility, not shown. |
| `level` | `string` | no | — | LGB level id to open at, e.g. `"intro1"`, `"rampup3"`, `"remote1"`. See the LGB `levels` command for the full list. |
| `command` | `string` | no | — | Raw command(s) to run on load, semicolon-separated. LGB's full sandbox command surface: git commands, `level <id>`, `levels`, `reset`, `undo`, etc. Combined with `level` if both are passed — `level` is prepended. |
| `height` | `number` | no | `720` | Iframe height in pixels. `720` clears the full LGB UI (terminal + tree + goal pane + bottom buttons) on most levels — override only when you need extra room. |
| `skipIntro` | `boolean` | no | `true` | Skip LGB's intro dialog. Leave at the default unless you want students to see it. |

## Slot

The default slot is the **caption** — one short line rendered on the bottom strip next to the *Open in a new tab* link. Use it to frame what the embed is for, e.g. *"Starts at Introduction to Git Commits. Type `git commit` a few times to grow the tree."*

## How the scroll-jump fix works

Clicking an interactive element inside a cross-origin iframe normally makes Chromium scroll the parent page so the iframe's top edge aligns with the viewport top (a 1000+ pixel jump for any iframe below the fold — Chromium issue [#400793](https://bugs.chromium.org/p/chromium/issues/detail?id=400793), CSSWG issue [#7134](https://github.com/w3c/csswg-drafts/issues/7134)). `GitBranchingEmbed` dodges this with two layers:

1. **Fake-inline via fixed positioning.** The iframe lives in a `position: fixed` figure whose `left`/`top`/`width` are JS-mirrored to its in-flow placeholder slot on every scroll/resize (and during a `requestAnimationFrame` loop while the slot is intersecting the viewport). Visually it looks like an inline block; structurally it has no document offset for `scrollIntoView` to target.
2. **Snapshot+restore safety net.** On `pointerdown` anywhere in the figure, `window.scrollY` is snapshotted; the first `scroll` event within 1s restores it. Catches anything that still slips through.

Together these prevent the page from scrolling when students click inputs, buttons, or the terminal inside LGB.

## Cross-origin isolation

The whole site sends `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` (see [astro.config.mjs](../../../astro.config.mjs) and [public/_headers](../../../public/_headers)). The iframe carries `credentialless` so it loads under that policy. See [sandbox-callout.md](./sandbox-callout.md) for the long version.

## Example

````mdx
<GitBranchingEmbed
  level="intro1"
  title="Learn Git Branching — Introduction Sequence, level 1"
>
  Starts at *Introduction to Git Commits*. Type `git commit` a few times to grow the tree.
</GitBranchingEmbed>
````

For a prefilled command sequence without picking a level:

````mdx
<GitBranchingEmbed
  command="git commit; git checkout -b feature; git commit"
  title="Branching demo"
>
  A linear history, then a branch off `main`.
</GitBranchingEmbed>
````

## Constraints & gotchas

- The iframe is `loading="lazy"`. First mount happens when the slot scrolls near the viewport.
- The figure is `position: fixed` with `z-index: 1`. If a lesson stacks other fixed/popover elements above the iframe, raise their `z-index` or lower the iframe's via a wrapper class.
- The slot reserves layout space matching `height + 2.5rem` (caption strip). The default `720` is the floor for the standard LGB UI — going lower clips the bottom command bar.
- `level` and `command` are URL-encoded into LGB's `?command=` query param. Authors don't need to encode themselves.
