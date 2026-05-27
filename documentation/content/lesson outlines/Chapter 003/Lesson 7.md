# Lesson 7 — VS Code as a team artifact

- **Title (h1):** VS Code as a team artifact
- **Sidebar label:** VS Code as a team artifact

## Lesson framing

This is the only lesson in chapter 003 that doesn't teach a JS/TS language surface. It's a **setup/wiring** lesson sitting between the last container lesson (regex) and the first lesson that runs `.ts` locally (Lesson 8). The purpose is to install one mental model before that switch happens: **the editor's behaviour on a project is a property of the repo, not of the developer's machine.**

### Senior question (implicit in the intro)

"My teammate clones the repo, opens it, hits save, and Prettier-flavoured double quotes spread across every file because their User settings overrode the workspace default. Why didn't the repo prevent that?" The answer is the three committed files this lesson writes, plus the workspace TypeScript pin. The student should leave with the *team-artifact* instinct, not a productivity-tutorial vibe.

### Pedagogical conclusions that apply lesson-wide

- **Decision archetype with a Setup spine.** Open with a one-paragraph commitment (VS Code, alternatives parked in one line each), then transition into a `<Steps>` walk that creates the three files. Close with a `<Buckets>` exercise that confirms the workspace-vs-user boundary landed.
- **Cognitive load minimization.** Every extension gets *one line* of senior reasoning — no padded paragraphs. Files are short, copy-pasteable, captioned by what they pin, not commented inside.
- **No VS Code tour, no shortcuts, no theme talk.** The course doesn't care about the editor's surface area beyond what the repo can pin. Stated explicitly so the lesson doesn't drift into a productivity guide.
- **Forward-link discipline.** Biome rules land in Ch 028 L5; this lesson only installs the LSP and wires the formatter pipe. `.tsconfig.json` lands in Ch 028 L4; this lesson only flips the "Use Workspace Version" toggle. Tailwind extension earns its weight from Ch 018 onward; installed here to never revisit.
- **Continuity with prior lessons.** The seed domain (`invoice`, `customer`) and Node 24 LTS framing from L1-L6 carry; mise/`.mise.toml` are *not* introduced here (they're L8's job). The lesson ends right before the `.mise.toml` lands, on purpose.
- **No diagram, no video.** Both would inflate a configuration lesson past its weight. The three files at the close are the visual artifact.
- **No live coding exercise.** Nothing to play with — the editor's behaviour can't be sandboxed in-browser. A `<Buckets>` close confirms the conceptual partition.

## Lesson sections

The lesson opens cold (no intro h2), matching the chapter pattern established in L1-L6. The opening paragraph lands the senior question concretely. No standalone "Why VS Code" heading — that's the cold open. The body has four h2 sections.

### Cold open (no heading)

Two short paragraphs, no code yet.

- Para 1 — The failure mode. A teammate joins the repo, opens it in their editor with their personal "format on save with Prettier defaults" setting, saves one file, the diff is a 200-line whitespace storm because their formatter, their indentation rule, and their auto-organize-imports behaviour all disagree with the project's. The fix isn't a code-of-conduct doc; it's three files the repo commits so the editor reads the project's rules instead of the developer's.
- Para 2 — The framing. The last six lessons lived in TS Playground; from Lesson 8 onward, the student edits `.ts` files on disk. Before that switch lands, this lesson pins the editor and its team-shared config so the next lesson opens against a known surface.

State Node 24 LTS, Biome, and the upcoming `.mise.toml`/`tsconfig.json` as forward-refs in one sentence each (the student has met all three terms in earlier-lesson continuity notes).

### Why VS Code (h2)

One paragraph commitment + one-line dismissal of alternatives.

Content:

- VS Code is the 2026 default for SaaS work: broadest extension ecosystem, the stack's official LSPs target it first (Biome, Tailwind, TypeScript), free, cross-platform, the editor every junior teammate will already have or will install in five minutes.
- One line each on three alternatives, each with the trigger that would flip the choice:
  - **Cursor** — AI-first workflows the course deliberately doesn't teach against (per the pedagogical guideline that AI direction goes stale before the course ships).
  - **Zed** — editing speed past the point a senior would notice; Zed's LSP support for the stack lags the VS Code surface.
  - **Neovim** — keyboard fluency a returning dev usually doesn't have time to invest in.
- The course commits to VS Code. Installation: one sentence + an `<ExternalResource>` card link to [code.visualstudio.com/download](https://code.visualstudio.com/download). No walkthrough.

Use `<Term>` once on **LSP** (definition: "Language Server Protocol — the contract between an editor and a language tool like a type-checker or linter, so the same diagnostics can run in any editor that speaks the protocol.").

### The minimum-viable extension set (h2)

Open with the rule: "themes, icon packs, vim modes, productivity bundles — out of scope, install whatever you like; what follows is the set the *repo* needs the team to share."

Then a `<CardGrid>` of six `<Card>` tiles, one per extension. Each card:

- Title: extension display name.
- Icon: `simple-icons:*` where the brand exists (`simple-icons:biome`, `simple-icons:tailwindcss`), `lucide:*` otherwise.
- Body: the marketplace ID in inline `<code>`, then **one sentence** of senior reasoning.

The six tiles:

1. **Biome** (`biomejs.biome`) — Lint-and-format LSP for the stack's JS/TS/JSON files. Lands the formatter so the next time the student hits save, it's the project's formatter that runs, not the editor's default.
2. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Class-name autocomplete, hover-previewed generated CSS, design-system linting. Earns its weight from Ch 018; installed here so it never has to be revisited.
3. **EditorConfig for VS Code** (`EditorConfig.EditorConfig`) — Reads `.editorconfig` so non-VS Code editors on the team behave the same on indent, line endings, and final-newline rules.
4. **GitLens** (`eamodio.gitlens`) — Inline blame on the line under the cursor, file history, side-by-side compare. Code review starts with "who wrote this and why" — GitLens puts that question one click away.
5. **Error Lens** (`usernamehw.errorlens`) — Pulls TypeScript and Biome diagnostics inline next to the offending line. Tightens the feedback loop on every save — no hover needed.
6. **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`) — Flattens long structural type errors into something a human reads in one pass. Earns its weight the first time a Drizzle or Zod inferred type explodes into a wall of text.

Below the grid, one short paragraph: the install path is either clicking each card's marketplace link or running `code --install-extension <id>` for each — either works, neither is preached; the `extensions.json` file in the next section makes this self-prompting for any future teammate.

### The three repo-owned files (h2)

This is the spine of the lesson. Open with one paragraph stating the principle:

> Three files live in the repo so every editor on the team behaves the same: `.editorconfig` at the root for any editor that honours the spec, `.vscode/extensions.json` so VS Code prompts to install what the project needs, and `.vscode/settings.json` for the workspace-only overrides that pin formatter, default actions, and the TypeScript SDK choice. Personal preference — theme, font, keybindings — never lives in these files.

Then a `<Steps>` block walking the three files in order. Each step has one labeled `<Code>` block (Expressive Code) showing the full file content, then 1-2 short prose lines explaining what each line pins and why. No comments inside the code blocks — captions and prose carry the meaning, matching the chapter's "code stripped of decorative comments" convention.

**Step 1 — `.editorconfig` at the repo root.**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true
```

Prose lines after the block:

- Six rules: 2-space indent, LF line endings (so a Windows teammate doesn't introduce CRLF), UTF-8, final newline, trim trailing whitespace.
- Honored by VS Code (via the EditorConfig extension), IntelliJ family natively, every modern editor a teammate is likely to use. Biome 2.x reads `.editorconfig` for indent and line-ending settings too — same source of truth, no duplicate config to keep in sync once `biome.json` lands in Ch 028.

**Step 2 — `.vscode/extensions.json` with the recommendation list.**

```json
{
  "recommendations": [
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "EditorConfig.EditorConfig",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "yoavbls.pretty-ts-errors"
  ]
}
```

Prose lines:

- When a teammate clones the repo and opens the folder in VS Code, the editor prompts to install any of these six the teammate doesn't have. Structural enforcement: "I forgot to install Biome" is hard to leave un-fixed.
- The list is the same six extensions the previous section walked, in the same order.

**Step 3 — `.vscode/settings.json` with the workspace overrides.**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "[css]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

Prose lines (one short paragraph per setting cluster):

- `editor.formatOnSave` + `editor.defaultFormatter` — every save pipes through Biome instead of whatever each teammate happens to have set as their personal default. The per-language `[css]` override is here for the day Tailwind v4 code lands; not load-bearing yet, but pinning it now avoids revisiting the file.
- `editor.codeActionsOnSave` — the two Biome actions that run on save. `source.fixAll.biome` applies safe auto-fixes (the canonical Biome action ID per its VS Code extension docs); `source.organizeImports.biome` sorts and dedupes imports. Both use the `"explicit"` string form, mandatory since VS Code 1.83 (older `true`/`false` values stopped working).
- `typescript.tsdk` — points the editor at the workspace TypeScript, the version installed in `node_modules`. Why it matters: every fresh open of a TS project shows a "Use Workspace Version" toast; pinning it here pre-answers the prompt so the editor uses the same `tsc` that the build does. Forward-ref: `node_modules/typescript` lands when Ch 028 wires `package.json`; pinning the path now is harmless and means the moment the dep arrives the IDE picks it up.

Close the section with a one-paragraph **boundary callout** (use `<Aside type="tip">`):

> Settings the developer wants for *themselves* — theme, font, keybindings, mouse scrolling speed, mini-map visibility — belong in User settings (`Cmd/Ctrl + ,` → User tab), never in `.vscode/settings.json`. The workspace file is a team artifact; the User file is personal. Pushing a personal preference to the workspace file is one of the rare repo changes that should be reverted on PR review with no discussion.

### Workspace vs user — sort it now (h2)

A closing `<Buckets twoCol>` exercise (six items, two buckets). The goal: confirm the team-vs-personal distinction landed.

Buckets:

- **Workspace (`.vscode/settings.json`)** — Lives in the repo, everyone gets it.
- **User (machine-local)** — Lives in the developer's profile, nobody else sees it.

Six items (kept tight, all phrased as inline settings keys for recognition):

- `editor.formatOnSave` enabled — **workspace** (the *project* needs every save to pipe through Biome).
- `workbench.colorTheme: "GitHub Dark"` — **user** (theme is preference).
- `editor.fontFamily: "JetBrains Mono"` — **user** (font is preference).
- `editor.codeActionsOnSave` with Biome actions — **workspace** (the project's quick-fix and import-sort behaviour).
- `editor.lineHeight: 1.6` — **user** (visual preference).
- `editor.defaultFormatter` set to `biomejs.biome` for the workspace — **workspace** (otherwise every teammate's personal default fights the project's formatter).

Set `instructions="Decide where each setting belongs — the repo's `.vscode/settings.json` or the developer's User settings."`

### External resources (h2)

A `<CardGrid>` of three `<ExternalResource>` cards, no more:

- [Biome — VS Code extension docs](https://biomejs.dev/reference/vscode/) (icon: `simple-icons:biome`) — Reference for every Biome-related setting key the editor accepts, including the canonical `source.fixAll.biome` action ID.
- [EditorConfig.org](https://editorconfig.org/) (icon: `lucide:file-code-2`) — The spec, the property list, the editor support matrix.
- [VS Code workspace settings docs](https://code.visualstudio.com/docs/configure/settings) (icon: `simple-icons:visualstudiocode`, `iconColor="#007ACC"`) — Microsoft's reference on the User-vs-Workspace boundary if the student wants the canonical source.

No video. No StackBlitz/Sandpack. Nothing to embed — the lesson's artifact is three files on disk.

## Scope

### What this lesson covers

- The editor commitment (VS Code) with one-line dismissal of Cursor / Zed / Neovim.
- The six-extension minimum-viable set, each with one sentence of senior reasoning.
- The three repo-owned files (`.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json`) shown as full minimal contents.
- The workspace-vs-user boundary, taught in prose and confirmed by a closing `<Buckets>` exercise.
- The "Use Workspace Version" of TypeScript pin via `typescript.tsdk`.

### What this lesson does NOT cover

- **Biome rules / `biome.json`** — that lands in Ch 028 L5 when the first real project earns linting. This lesson installs the LSP only.
- **The `tsconfig.json` file contents** — that's Ch 028 L4. Here, the editor points at the workspace TS *path*, not its config.
- **`.mise.toml` / Node version pinning** — that's the next lesson (L8). Deliberate seam.
- **`package.json` / pnpm / `node_modules`** — pnpm install is Ch 028 L2. The `typescript.tsdk` path is pinned now and pays off later; no install step here.
- **Keyboard shortcuts, the command palette beyond noting `Cmd/Ctrl+Shift+P` exists in one sentence** — the lesson is not a productivity tutorial.
- **Settings Sync / personal cloud profile** — the lesson takes the explicit position that team config belongs in the repo, not in a per-user cloud sync. Mentioned only as the counter-pattern in one phrase.
- **Theme, font, icon-pack choices** — explicitly out of scope; the User-side belongs to the developer.
- **Cursor / Zed / Neovim deep dives** — one-line dismissal each, no more.
- **Bisecting an "extension breaks my editor" issue** — debugging the editor is not a course topic.
- **Multi-root workspaces, devcontainers, codespaces** — niche for chapter 003; named only if at all in passing, and even then probably not.

### Concepts the student already met (do not re-teach)

- The pedagogical thread "decisions before syntax" from chapter 001 onward — apply it; don't re-explain it.
- Node 24 LTS as the course-pinned runtime (L2 of this chapter named it; L8 will pin it). Just reference, don't re-justify.
- Biome as the formatter (named throughout earlier lessons in continuity notes; defined adequately by L8 needs). Define LSP via `<Term>` once here since it's the first lesson where the LSP layer earns explicit attention.
- The "right tool for the trigger" framing — applied here to extension choice without re-naming the principle.

### Concepts the student will meet right after (do not pre-teach)

- mise installation and `.mise.toml` writing — L8 of this chapter.
- The three TS execution paths (`node`, `tsx`, `tsc`) — L8 of this chapter.
- Biome rule configuration (`biome.json`) — Ch 028 L5.
- `tsconfig.json` authoring — Ch 028 L4.
- `package.json` + pnpm setup — Ch 028 L2.

## Components used

- `Steps` (Starlight built-in) — the three-file install.
- `Code` (Expressive Code) — each file content block, captioned by filename. Use the `title="<path>"` attribute to label.
- `CardGrid` + `Card` (Starlight built-ins) — the six-extension grid.
- `Aside` (Starlight built-in, `type="tip"`) — the workspace-vs-user boundary callout.
- `Buckets` + `Bucket` + `Item` (exercises) — the closing classification drill.
- `Term` (UI) — `LSP` once.
- `ExternalResource` + `CardGrid` — the External resources section.
- Icons: `simple-icons:biome`, `simple-icons:tailwindcss`, `lucide:file-code-2`, `lucide:git-branch`, `lucide:alert-circle`, `lucide:sparkles`, `simple-icons:visualstudiocode`.

## Terminology choices

- **"Team artifact"** as the lesson's keystone phrase — used in title, intro, and closing exercise frame to reinforce the workspace-vs-user partition.
- **"Workspace" vs "User"** — the VS Code-native vocabulary; preferred over "global" because VS Code's settings UI uses these terms verbatim, and the student will see them when they open settings.
- **`<Term>` on "LSP"** — first lesson where it earns explicit attention. Definition kept to two short clauses (see Why VS Code section).
- **"Pin"** as the verb for committing a tool decision to the repo (`pin the formatter`, `pin the TS SDK path`) — sets up L8's `mise use --pin` framing without re-defining.
- **Do NOT introduce** "monorepo," "multi-root workspace," "devcontainer" — out of scope.

## Estimated time

25 to 30 minutes per the chapter outline. The lesson is short by design — three files, six extensions, one exercise. Anything longer signals scope drift into a productivity tutorial.
