# Chapter 4.12 prerequisites review

## Missing prerequisites

- Lesson 4.12.3 (and the shared reference-solution block) — `LucideIcon` TypeScript type used as a prop type with no prior introduction. Quote: "`FeatureCardProps = ComponentProps<'article'> & VariantProps<typeof featureCardVariants> & { title: string; description: string; icon: LucideIcon }`". `lucide-react` is named as a dependency in 4.11.1 but only as a library identifier ("lucide-react is the icon set; tree-shakeable"); the `LucideIcon` TypeScript interface — the type students must import and write in a prop signature — is never introduced. A junior dev writing `feature-card.tsx` from the reference signature has no prior lesson telling them where `LucideIcon` comes from or what it represents. Suggested source: add a brief callout to 4.11.1 ("importing named icon components is typed as `LucideIcon` from `lucide-react`") or cover it in the 4.12.3 build lesson itself. Severity: low.
