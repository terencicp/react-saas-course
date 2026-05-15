# Chapter 8.2 prerequisites review

## Missing prerequisites

- **Lesson 8.2.1** — JS config object for the `<Tailwind>` component. Quote: "A `tailwind.config` can be passed for theme tokens; for a project-shared brand palette, import the same `theme` object the web app reads from." The course teaches Tailwind v4 CSS-first config only (`@theme` in `globals.css`); lesson 4.2.1 explicitly states the legacy `tailwind.config.ts` form is "named once for recognition, never taught." The web app has no exportable JS `theme` object for students to import. Students are told to do something the prior curriculum deliberately did not teach. Suggested source: a new short note in 4.2.2 or 8.2.1 explaining how to extract a v4 theme as a v3-compatible JS object for the React Email `<Tailwind>` config prop (e.g., via `resolveConfig` or a hand-authored shared `emailTailwindConfig.ts`). Severity: medium.
