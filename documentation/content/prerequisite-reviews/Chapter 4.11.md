# Chapter 4.11 prerequisites review

## Missing prerequisites

- **Lesson 4.11.4** — `usePathname` / pathname-change detection. Quote: "a `useEffect` in a layout (or a small `<RouteFocus />` client component) that runs on `pathname` change and moves focus to the page's `<h1>` or main landmark". The lesson teaches a concrete implementation pattern that requires knowing how to read the current pathname in the App Router, but `usePathname` (from `next/navigation`) is not introduced until Lesson 5.5.5. At this point in the course students have no mechanism to detect route changes programmatically. Suggested source: 5.5.5 (forward reference note) or a brief inline gloss naming `usePathname` as the Next.js hook used here, with the full treatment deferred to 5.5.5. Severity: medium.
