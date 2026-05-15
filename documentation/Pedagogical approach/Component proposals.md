# Component proposals — cross-chapter synthesis

A reusable-component backlog derived from the 105 per-chapter pedagogy outlines under [outlines/](./outlines/). Each entry generalizes a shape that recurred across many lesson-specific proposals; the goal is one build that pays back across a unit, not one component per lesson.

## Method

Every outline ends in a `## Component proposals` section listing the lesson-specific components the chapter would want. 65 of 105 chapters proposed at least one (the other 40 explicitly chose to ship on existing components — that's a deliberate filter the pedagogy guidelines impose). A regex pass over the outlines pulled 255 named proposals with their sketches. The proposals were then clustered by *artifact shape* rather than topic — a "rate-limit token-bucket strip" and a "render-trace strip" are the same shape filled with different data, and the report treats them as one recommendation.

Ten generalized components below subsume the bulk of those 255. They are ordered by leverage — the count in each header is the number of lesson-specific proposals that fold into the generalization. A topic-specific tail at the bottom names the shapes that genuinely don't generalize and earn a one-off build.

Cross-references to [components/INDEX.md](../components/INDEX.md) flag overlaps with what already exists.

---

## 1. `ScrubbableTimeline` — ≈45 proposals

A multi-track horizontal timeline with a draggable scrubber. Each track carries an ordered sequence of labeled events; the scrubber reveals each track's state at the current instant. Optional mid-scrub toggles flip the underlying behavior (e.g. "with idempotency-key on/off", "checkpointed vs inline"); optional fault-injection markers (crash here, network drop here, payload delay here) reshape downstream events. One or two tracks is the common case; the agent-loop and event-loop variants want three or four.

**v1 build sketch.** Props: `tracks: { id, label, events: { at: number, label: string, payload?: ReactNode }[] }[]`, `duration`, `toggles?: { id, label, options }[]` whose state mutates the events array, `faultMarkers?: { trackId, at, kind, effect }[]`. Renders horizontal lanes with event ticks; cursor pulled by scrubber or play/pause control; below-fold state readout shows each track's "active event" at cursor. Composes inside `Figure`. Static fallback for v0: render each track as a single SVG strip with no interactivity (this is the leanest-v1 path many chapters propose individually).

**Subsumes** (chapter-tagged):
- Cache & data: `CacheLifeTimeline` (15.1), `LimiterCacheTimeline` (15.4), `CacheReadComparison` (15.2 — overlaps `SideBySideCompare`).
- Async, race, lifecycle: `EventOrderingTimeline` (12.1), `IdempotencyReplaySimulator` (3.2), `CrashTimeline` (12.3), `RaceLanes` (12.3), `TwoClientRaceSimulator` (11.2), `CommitBoundaryDiagram` (14.2), `TransactionTimeline` (17.2), `TxScrubber` (19.6), `ConcurrencyTimeline` (19.1), `AbortSignalTimeline` (3.6), `WatcherSequenceDiagram` (15.2).
- Background work: `InvocationTimeline` (13.1), `RunReplayTimeline` (13.1), `CheckpointTimeline` (13.2), `QueueTopologySim` (13.1 — overlaps `ScenarioRunner`).
- Streaming, render, parsing: `StreamingTimeline` (5.3, 5.7), `RenderTrace` (4.8), `ParserTimeline` (3.1), `EventLoopQueues` (19.2), `MutationLifecycleScrubber` (16.2), `MutationTimeline` (16.1), `PollingClockExplorable` (16.2), `LifecycleScrubber` (23.2).
- Time, DST, observability: `DstScrubTimeline` (18.1), `LabVsFieldScrubber` (20.3), `SupplyChainTimeline` (17.2), `CadenceTimeline` (21.5).
- AI, streaming UI: `AgenticLoopSimulator` (23.4), `AgentLoopSimulator` (23.3), `PartsTimelinePlayer` (23.4), `QuotaLifecycleScrubber` (23.4).
- Misc: `TypedVsCommittedTimeline` (11.1), `TrustWindowTimeline` (13.3), `BytePipeSimulator` (13.3), `TwoStepWriteSimulator` (13.3), `SuccessPageSim` (12.3), `DedupSim` (14.1), `DedupTimelineSimulator` (14.2), `SnapshotVsLive` (14.1).

**Overlap with existing.** [`DiagramSequence`](../components/figures/diagram-sequence.md) gives discrete-step scrubbing of any content but doesn't model parallel tracks or per-event payload reveal. `ScrubbableTimeline` is its natural extension — most chapters already propose `DiagramSequence` as their leanest v1, which is the signal that the existing primitive is one step short of carrying the shape.

---

## 2. `ScenarioRunner` — ≈25 proposals

A code or handler panel on the left, a scenario picker on top (preset buttons or a small input form), and an outcome readout below — status badge, DB-state ribbon, request log, computed metric. The student picks a scenario, hits "run", and observes a deterministic outcome. No live coding, no grading: the lesson lives in the scenarios the author curated. A common sub-shape is **attack-and-defense**: a defense toggle plus an attack scenario, where flipping the toggle visibly changes the outcome — this is the load-bearing shape across Unit 17 and the auth/security pieces of Units 12-14.

**v1 build sketch.** Props: `code: { source: string, lang: string }` (rendered through Expressive Code), `scenarios: { id, label, inputs: Record<string, unknown> }[]`, `run: (scenario, toggles) => RunResult` (pure function; in v1 just a lookup table from scenario+toggles to canned outputs), `toggles?: { id, label }[]`, `outcomeSlots: { id, label, render: (result) => ReactNode }[]` (e.g. status badge slot, DB ribbon slot, log slot). The component owns scenario selection state and re-runs on toggle change. No async, no real backend.

**Subsumes:**
- Webhooks, idempotency, races: `CorsSimulator` (3.3), `ConcurrencyHarness` (12.1), `TxBoundarySim` (12.1), `IdempotencyReplaySimulator` (3.2 — also `ScrubbableTimeline`), `WebhookAttackReplay` (12.1), `RedirectRaceSandbox` (12.1), `RetryStorm` (12.3), `AttackProbe` (12.3).
- Rate-limit, auth, gates: `LayeredRequestSimulator` (15.3), `RateLimitRepairSandbox` (15.3), `DualKeyingSimulator` (15.4), `GateOutcomeSimulator` (17.1), `RequestLifecycleSimulator` (9.1).
- Background work: `QueueSimulator` (13.2), `QueueTopologySim` (13.1), `WaitpointFlow` (13.1).
- Storage & defense: `PresignedExpiryDemo` (13.4), `KeyConstructionAmbush` (13.4), `LayeredDefenseTrace` (13.4), `BucketTrustPuzzle` (13.3).
- Notifications: `ChannelIndependenceSim` (14.1), `PrefsResolverSandbox` (14.1).
- State, schema: `WrongByDefaultListSandbox` (11.1), `SchemaDriftSim` (6.2), `IsolationLevelSim` (6.4), `ProxySimulator` (5.5), `HmacVerifySim` (12.1), `MatcherCostSimulator` (5.5).

**Overlap with existing.** Distinct from [`ReactCoding`](../components/live-coding/react-coding.md) / [`ScriptCoding`](../components/live-coding/script-coding.md), which grade student-written code. `ScenarioRunner` is observational; the student doesn't type. Many chapters propose v1 as `ReactCoding` with a custom assertion — that's a workaround. A dedicated component spares 20+ chapters the workaround and gives them a cleaner visual vocabulary (no "run tests" button, no submit/grade UI).

---

## 3. `ParamPlayground` — ≈22 proposals

A wrapper that pairs a *controls* slot (sliders, dropdowns, toggles, color pickers, number inputs) with a *preview* slot (any JSX, iframe, or HTML). Control values pipe into the preview as CSS custom properties or as React props. Optional readouts (computed CSS value, contrast ratio, breakpoint badge, count) sit beside the preview. The preview frame may itself be sized — see `PreviewFrame` (component 9) for the chrome/viewport variant.

**v1 build sketch.** Props: `controls: Control[]` where `Control = { id, kind: 'slider' | 'select' | 'toggle' | 'color' | 'text', label, default, ... }`; `preview: ReactNode` rendered with control values injected as CSS variables `--{id}` on a wrapper div (and exposed as a `useParams()` hook to the preview); `readouts?: ({ params }) => ReactNode`. v1 wires CSS variables only; the React-props variant is a v1.5 reach.

**Subsumes:**
- Tokens & theme: `TokenPlayground` (4.11), `TokenConsole` (4.5), `TokenNamespaceExplorer` (4.2), `TokenTracer` (4.3), `DarkTokenTrace` (4.2), `ThemeToggleMatrix` (4.5), `ColorChannelLab` (4.5), `CustomPropertyPlayground` (4.3).
- Layout & responsive: `BoxModelSizer` (4.4), `ResponsiveFrame` (4.5), `ContainerSlot` (4.5), `ViewportToggle` (4.12), `MotionPreferenceToggle` (4.12).
- I18n & ICU: `IcuPluralExplorable` (18.2), `PluralProbe` (18.3), `LocaleCurrencyGrid` (18.3), `LocaleNegotiationSimulator` (18.2), `DstClockPair` (18.3).
- Web platform: `URLPlayground` (3.3), `ClassToSelector` (4.2), `PreflightPredictor` (3.3), `ProviderCostCalculator` (13.3).

**Overlap with existing.** Nothing close exists. The current fallback is `Figure` + hand-SVG which loses interactivity. This is the single biggest expressiveness gap in the toolkit.

---

## 4. `RenderTrackingPreview` — ≈10 proposals (React-only, highest density in Unit 4 and 16)

Wraps a small React subtree and overlays per-component render-count badges. Each badge increments on re-render; a brief flash highlights the rendered subtree. Optional implementation toggle (e.g. "selector-object vs atomic selector", "with `memo()` vs without") swaps the implementation while preserving the same external props.

**v1 build sketch.** Props: `children: ReactNode`, `track?: { selector: string, label?: string }[]` (CSS-selector-style addressing of subtrees to badge), `implementations?: { id, label, render: () => ReactNode }[]`, `defaultImplementation?: string`. Internally wraps each tracked node in a hook that counts renders via `useReducer` ticking on every render; renders the count as a small absolute-positioned badge. The flash is `:state(rendering)` + a 100ms transition.

**Subsumes:** `RenderTrigger` (4.7), `SelectorRerenderHeatmap` (16.3), `SelectorRerenderSim` (16.4), `HookInstanceCompare` (4.10), `ContextRenderStorm` (4.9), `LeakySessionDemo` (16.4), `StateShapeProbe` (4.8), `PurityProbe` (4.7), `KeyedListExplorable` (4.7), `RenderTrace` (4.8 — also `ScrubbableTimeline` if the timeline view is wanted).

**Overlap with existing.** None — this is React-runtime instrumentation that nothing in the index provides. High-leverage in Unit 4 (React mechanics) and Unit 16 (Zustand selectors); not used elsewhere.

---

## 5. `SideBySideCompare` — ≈18 proposals

Two panes rendering parallel content (HTML, computed output, terminal output, JSX, file tree, JSON), driven by a *shared* control, scrubber, or input. A shared toggle flips both panes — "with cache wrapper / without", "v3 / v4", "live / snapshot" — making the asymmetry the lesson. Different from [`TabbedContent`](../components/figures/tabbed-content.md) and [`CodeVariants`](../components/code/code-variants.md) because both panes are *simultaneously visible*; the comparison is the teaching beat, not a navigation choice.

**v1 build sketch.** Props: `left: { label, content: ReactNode }`, `right: { label, content: ReactNode }`, optional `sharedControl?: { kind, label, options }` whose value is passed to both `content` render functions (so each side reacts to the same input), optional `highlightPairs?: { leftId, rightId }[]` for hover-linked highlighting between panes. Renders a responsive two-column layout with shared caption and shared control above. Collapses to vertical stack on narrow viewports.

**Subsumes:**
- RSC and server boundary: `WhatShips` (5.2), `WorldBoundary` (13.1), `RscWireSandbox` (5.2 — partial), `LandmarkMap` (4.1).
- Diff & before/after: `MockVsRealComparison` (19.3), `CompilerDiff` (4.10), `HandlerDiffViewer` (12.1), `BeforeAfterCSSToggle` (4.3), `RedirectVsRewriteScrub` (5.5), `SchemaCritiqueDiff` (13.3), `ImageDeliveryCompare` (5.6), `StreamingComparison` (20.3), `RenameDriftToggle` (14.2), `FieldTrace` (12.3).
- DOM vs source: `SourceVsDomScrubber` (3.5), `AttributeVsPropertyPlayground` (3.5).
- Caching/rate-limit response: `CacheReadComparison` (15.2), `ResponseInspectorPanel` (15.3), `OffsetVsCursorSim` (6.3 — partial).

**Overlap with existing.** Adjacent to but distinct from `TabbedContent`/`CodeVariants`. Many chapters propose v1 as "two `Figure`s side by side" which gets the layout but loses the shared control wiring.

---

## 6. `GraphExplorer` — ≈12 proposals

Nodes-and-edges visualization (rendered as Mermaid for relational graphs, hand-SVG for spatial ones) where clicking a node opens a side panel with prose, code, or further interactions, and clicking an edge reveals the transition/relationship. An optional traversal-scrub mode animates a walk across the graph.

**v1 build sketch.** Props: `nodes: { id, label, x?, y?, group?, panel: ReactNode }[]`, `edges: { from, to, label?, panel?: ReactNode }[]`, `traversal?: { ordered: string[], label: string }`. v1 renders nodes as positioned boxes (Mermaid auto-layout if `x/y` omitted) with edges; node click opens a fixed right-side panel slot. Traversal mode adds a play/scrub control that highlights nodes in order and surfaces each node's panel as the cursor passes.

**Subsumes:** `StackMap` (1.1), `DependencyTreeCompare` (1.2), `TypeHierarchyExplorer` (3.5), `TemporalTypeGraph` (18.1), `GraphWalker` (2.6), `ModuleGraphScrubber` (20.3), `TrustTopology` (23.4), `SeamMap` (17.1), `TagHierarchyExplorer` (15.3), `SegmentFileDesugarer` (5.3 — partial; also `AnnotatedFileTree`), `SignedUrlAnatomy` (13.3 — clickable URL with anatomy tooltips fits when the URL is treated as a small graph), `CORSActorDiagram` (13.4).

**Overlap with existing.** [`ArrowDiagram`](../components/figures/arrow-diagram.md) draws boxes-and-arrows but is static and doesn't carry per-node side-panel content. `GraphExplorer` extends it with interactivity and panel slots.

---

## 7. `StateMachineWalker` — ≈8 proposals

Click-navigable directed graph of question nodes leading to leaf reveal cards. Different from `GraphExplorer` in that the user *walks a path* — each click commits to a branch and reveals the next layer; the full graph is not visible at once. Useful for decision trees ("when to reach for X") and small state machines (consent flow, auth state).

**v1 build sketch.** Props: `root: NodeId`, `nodes: Record<NodeId, { question: ReactNode, branches: { label, to: NodeId | LeafCard }[] }>`, where `LeafCard = { verdict: ReactNode, reason: ReactNode }`. Renders the current node's question and branch buttons; clicking a branch animates a transition and replaces content. A breadcrumb across the top shows the path taken; clicking a crumb backtracks.

**Subsumes:** `DecisionTree` (20.3), `DecisionTreeWalker` (3.6), `DiagnosticTree` (19.3), `DecisionFunnel` (16.1), `StateMachineExplorer` (2.5), `StateMachineExplorable` (4.8), `ConsentStateMachine` (17.2).

**Overlap with existing.** None — `ArrowDiagram` is static, `Buckets` is bulk classification not stepwise navigation. The walker shape recurs whenever a lesson teaches a *senior decision filter*, which is core to the course's pillar 1 stance.

---

## 8. `PredictRevealTable` — ≈8 proposals

A rows × columns grid where the student commits a prediction in each cell (dropdown, true/false, multi-choice) and on submit the senior verdict reveals per cell with a one-line rationale. Distinct from `Buckets` (classification by dragging items into columns) and `Dropdowns` (fill-in-the-blank in prose/code): here the *grid is the artifact*, and seeing all cells filled at once is the teaching beat.

**v1 build sketch.** Props: `rows: { id, label, render?: ReactNode }[]`, `columns: { id, label, kind: 'enum' | 'bool' | 'text', options? }[]`, `correct: Record<RowId, Record<ColumnId, { value, rationale: ReactNode }>>`, optional `progressiveReveal: boolean` (reveal whole table after submit, or cell-by-cell on click). Renders the grid with per-cell input control; submit button fires comparison and renders rationale popovers per cell with correct/incorrect styling.

**Subsumes:** `DecisionTableWalker` (12.3), `WorkloadCaseTable` (13.1), `PatternMatrix` (12.1), `ClassificationTable` (15.1), `EndpointTriageGrid` (17.2 — borderline with `Buckets`), `ErrorClassifier` (13.1 — borderline with `Buckets`), `CookieAttachmentMatrix` (3.4), `CallSiteAudit` (16.2).

**Overlap with existing.** [`Buckets`](../components/exercises/buckets.md) covers single-axis classification; [`Dropdowns`](../components/exercises/dropdowns.md) covers inline fill-in. Neither carries a 2D grid with per-cell rationale reveals.

---

## 9. `PreviewFrame` — ≈7 proposals

A chrome-and-sizing wrapper for any preview slot. Composes: fake browser chrome (address bar, back/refresh, URL display), resizable viewport with a width handle and breakpoint badge, optional mobile-device frame, optional class-context injection on the iframe root (`dark`, `prefers-reduced-motion: reduce`, `container-type: inline-size`).

**v1 build sketch.** Props: `chrome?: 'browser' | 'mobile' | 'none'`, `width?: number | 'fill'`, `widthControls?: { presets: number[] }`, `classOverrides?: { id, label, className }[]`, `srcDoc | children` (the preview). v1 ships with `chrome: 'browser'` and width presets only; the mobile chrome and class-context toggles are v1.5.

**Subsumes:** `BrowserChrome` (4.8), `ResponsiveFrame` (4.5), `ContainerSlot` (4.5), `ViewportToggle` (4.12), `MotionPreferenceToggle` (4.12), `MobileViewportSimulator` (4.4).

**Overlap with existing.** [`SandboxCallout`](../components/ui/sandbox-callout.md) embeds a sandbox but is an *expandable* callout — different intent (optional play surface) and shape (collapsed by default). `PreviewFrame` is always-visible and is the chrome around a preview rather than the lazy-loading container.

---

## 10. `AnnotatedFileTree` — ≈3 proposals (extension of existing `FileTree`)

The existing [`FileTree`](../components/starlight/file-tree.md) with two additions: per-entry caption slots (one short sentence per file or directory, rendered to the right on wide viewports, beneath on narrow), and an optional "arrow link to partner panel" mode where each tree node anchors a visible line to a sibling diagram or code block.

**v1 build sketch.** A wrapper around the existing `FileTree` that takes `captions: Record<Path, ReactNode>`; a v1.5 reach adds `linkTargets: Record<Path, ElementId>` and overlays SVG lines connecting tree entries to addressed elements elsewhere on the page. Build the captioned version first; the arrow-link variant only earns its weight if `SegmentFileDesugarer` (5.3) ships its file → React tree linking.

**Subsumes:** `AnnotatedFileTree` (1.4), `SegmentFileDesugarer` (5.3), `CodebaseLayoutComparison` (16.3).

**Overlap with existing.** Clear extension of `FileTree`, not a new primitive. Worth building because the per-entry caption pattern recurs in every project chapter's "what got added and why" walkthrough — roughly 15 chapters across Units 5–14.

---

## Build priority

The largest force-multipliers are `ScrubbableTimeline` and `ScenarioRunner` (about 70 proposals between them across most of the course). Build those first. After that, `ParamPlayground` unblocks the design-system and i18n units, and `SideBySideCompare` removes a fallback (`Figure` + `Figure`) that loses the shared-control wiring.

`RenderTrackingPreview` is high-density in two units only (4 and 16) but those are critical lessons; pair it with whichever unit goes first.

`PredictRevealTable`, `StateMachineWalker`, and `GraphExplorer` are mid-tier — they each subsume around a dozen proposals and have clear, narrow scope.

`PreviewFrame` and `AnnotatedFileTree` are extensions of existing components and can land incrementally.

---

## Single-purpose proposals worth a one-off build

These don't generalize, but their lesson is load-bearing in the chapter that owns them and the proposed v1 is well-defined. Build as small one-offs.

- **`SpecificityCalculator`** (4.3) — input a CSS selector, output the four-part tuple and per-token breakdown. Genuinely unique to the specificity lesson; nothing else in the course teaches this calculation.
- **`CnComposer`** (4.2) — `cn()` argument-slot composer with live deduped class string. The single highest-leverage widget in Chapter 4.2 per the outline; cleanly one-of-a-kind.
- **`BTreeInsertSim`** (6.2) — UUIDv4 vs UUIDv7 B-tree insert visualizer with page-split counter. Niche; the teaching beat is the page-split visual.
- **`TimingLeakSimulator`** (3.7) — constant-time vs naive comparison stepper with comparison counter. Single-use in the curriculum but the visual *is* the lesson.
- **`BoundaryTreeBuilder`** (5.2) — drag-and-drop component tree with legality lighting on edges (Server, Client, Server-as-`children`). RSC-specific; nothing else in the course needs this composition rule.
- **`OgCardSandbox`** (5.6) — editable `opengraph-image.tsx` with live Satori render. Topic-specific to the OG card lesson.
- **`BytePairDiff` / `HmacByteDiff`** (12.1, 19.3) — two-row monospaced view with byte-index highlight and HMAC display. Could merge into one shared component.
- **`WaterfallTimingTokens`** (3.1) — extends existing [`Tokens`](../components/exercises/tokens.md) from substrings in code to image regions on a DevTools screenshot. Worth building as a `Tokens` variant rather than a new primitive.
- **`DispatchPipelineDiagram`** (14.2) — four-station horizontal pipeline with counter chips. Could ride on `ScrubbableTimeline` if treated as one track with stations, but the visual vocabulary (counters at stations, not events on a track) is distinct enough to consider standalone.

---

## Open pedagogical questions

A few decisions surfaced during clustering that aren't mine to make:

- **`StateMachineWalker` vs `GraphExplorer`.** Both visualize a graph; the split is interaction model (walk-a-path vs explore-the-whole). If the prop surfaces converge, these could be one component with a `mode: 'walk' | 'explore'` switch. Worth sketching the API for both side-by-side before committing.
- **`ScrubbableTimeline` payload reveal.** Some proposals want each event tick to surface a payload card on hover/click; others want the payload baked into the lane below. v1 should pick one — recommendation: payload card on click (cleaner for many small events), with the below-fold readout reserved for *cursor-position* state.
- **`ScenarioRunner` attack-and-defense as a separate variant?** The defense-toggle subset (`AttackProbe`, `BucketTrustPuzzle`, `LayeredDefenseTrace`, `KeyConstructionAmbush`, `RateLimitRepairSandbox`) has a distinctive visual ask: before/after state panels keyed to the toggle. Decide whether the base `ScenarioRunner` accepts this as a configured outcome slot, or whether `AttackDefenseRunner` is a sibling. Cleaner to keep it one component with a `compareToggles` mode.
- **Static fallback policy.** Most proposals' "leanest v1" path is a static `Figure` + hand-SVG, deliberately because interactive components are expensive. Once a generalized component ships, the chapter authors should be told to *use it* rather than re-propose a static fallback — otherwise the leverage is lost. This is a process question more than a component question.
