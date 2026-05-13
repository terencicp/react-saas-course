# `Sequence` + `Step`

Ordering drill. Each `<Step>` is a draggable row; **source order is the correct order**. The list is shuffled on render. The student drags steps into position (live-move: the dashed placeholder slides as the cursor passes each step's midpoint), then presses **Check** to colour each row green (correct slot) or red (wrong slot).

Optionally place a fenced Expressive Code block before the steps inside the slot — it stays put while the steps shuffle. Useful when the ordering relates to lines in a code sample.

## Imports

```ts
import Sequence from '../../../../components/exercises/sequence/Sequence.astro';
import Step from '../../../../components/exercises/sequence/Step.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `Sequence`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `instructions` | `string` | no | — | Task-specific lead-in prepended to the default "Drag the items into the correct order…" prompt. |

### `Step`

No props. The order in source = the correct order.

## Slots

- **`Sequence` default** — optional fenced code block first, then `<Step>` children. The code block stays put; the steps shuffle.
- **`Step` default** — row label. Inline markdown — backticks become `<code>`.

## Constraints & gotchas

- The runtime grabs the **first such shuffle** that isn't identical to source order (so a freshly mounted drill is always reorderable from the get-go).
- Step numbers reflect *DOM position*, not the original source — they always read 1…n top-to-bottom as the student rearranges.
- Reset re-randomises the order and clears marks.
- For ordering exercises that need to highlight specific code lines as context, use Expressive Code's `{1,3-5}` line-highlight meta on the fenced block.

## Example

Plain ordering:

````mdx
<Sequence>
  <Step>Wake up</Step>
  <Step>Brush teeth</Step>
  <Step>Make coffee</Step>
  <Step>Open laptop</Step>
  <Step>Check inbox</Step>
</Sequence>
````

Custom instructions:

````mdx
<Sequence instructions="Order the steps a browser takes to render a page from a fresh URL.">
  <Step>Resolve the domain to an IP via DNS</Step>
  <Step>Open a TCP connection to the server</Step>
  <Step>Send the HTTP request</Step>
  <Step>Receive and parse the HTML response</Step>
  <Step>Build the DOM and CSSOM</Step>
  <Step>Paint the rendered page</Step>
</Sequence>
````

With a fixed code block and highlighted lines:

````mdx
<Sequence>

```ts {3-5}
async function loadUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  return User.parse(data);
}
```

  <Step>Build the request URL from the `id`</Step>
  <Step>Send the request and await the response</Step>
  <Step>Throw if the response isn't OK</Step>
  <Step>Parse the JSON body</Step>
  <Step>Validate the shape with the `User` schema</Step>
</Sequence>
````
