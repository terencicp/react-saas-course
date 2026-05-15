# Chapter 2.7 prerequisites review

## Missing prerequisites

- **Lesson 2.7.3** — `try`/`catch` syntax and mechanics. Quote: "The senior rule: **inside a `try`/`catch`, `return await` is mandatory** (otherwise the `catch` doesn't catch the rejection)." The `return await` teaching in 2.7.3 is entirely about how `try`/`catch` interacts with async rejections, yet `try`/`catch` is not taught until 2.8.1. Chapter 2.2.4's "What this lesson does not cover" explicitly states "`try`/`catch` as control flow — covered in Chapter 2.8," confirming no prior chapter introduces it. Suggested source: introduce `try`/`catch` basic mechanics in a new lesson in Chapter 2.2 (or early 2.7), or reorder so 2.8.1 precedes 2.7.3. Severity: **high**.

- **Lesson 2.7.4** — `try`/`catch` catch-block syntax. Quote: "**The shape.** `catch (err) { if (err instanceof Error && err.name === 'AbortError') return; throw err }` — the abort is intentional; treat it as a no-op." This code block is the lesson's canonical worked example and requires the student to read and write a `catch` block, but `try`/`catch` mechanics are not taught until 2.8.1. Same suggested source as above. Severity: **high**.

- **Lesson 2.7.2** — `try`/`catch` assumed for unhandled-rejection handling. Quote: "every Promise the app creates either is `await`ed inside a `try`/`catch`, has a `.catch`, or is fed to a combinator that handles rejection." The rule references `try`/`catch` as an established pattern the student is expected to apply, but no prior chapter teaches it. Same suggested source. Severity: **medium**.
