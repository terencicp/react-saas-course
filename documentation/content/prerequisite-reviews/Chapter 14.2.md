# Chapter 14.2 prerequisites review

## Missing prerequisites

- <Lesson 14.2.3> — `ComponentType<Payload>` as the TypeScript type for storing a React component reference in the registry. Quote: "Entry shape: `{ ..., template: { email: ComponentType<Payload>; inbox: (p: Payload) => { title: string; body: string } }, ... }`". The type appears in the provided `types.ts` (`EventDefinition`) that students read in 14.2.2 and must satisfy when filling `registry.ts` in 14.2.3. Chapter 4.6.1 teaches `ComponentProps` (extracting prop types from a component) but not `ComponentType<P>` (the type of a component itself, i.e., a component reference). No prior lesson introduces this distinction. Suggested source: add one bullet to 14.1.2 or 4.6.1. Severity: low.
