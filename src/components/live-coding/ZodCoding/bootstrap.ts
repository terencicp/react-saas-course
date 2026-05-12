// Per-card bootstrap. Mounts CodeMirror, debounces edits, kicks off both halves
// of the hybrid lesson (TS type-check + Zod runtime parse), and renders the
// resulting state into the card. Feedback prompt collects diagnostics, resolved
// `^?` queries, AND per-fixture pass/fail so the AI tutor's hint can address
// whichever side the student is stuck on.

import { EditorView, keymap, lineNumbers, Decoration, WidgetType, hoverTooltip } from '@codemirror/view';
import type { DecorationSet, Tooltip } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import type { Diagnostic, TypeQuery } from './type-checker';
import type { Fixture, FixtureResult } from './parse-runner';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

// ─── Hover-driven type-query reveal ───────────────────────────────────
// The lesson author still writes `// ^?` in the starter code (so authoring
// matches the Twoslash convention students will see in VS Code), but at
// render time we:
//   1. HIDE the `^?` marker line with a block-level replace decoration
//   2. UNDERLINE the symbol on the line above at the `^` column with a
//      mark decoration carrying the resolved type as a data attribute
//   3. SHOW a tooltip with that type on hover, via CodeMirror's built-in
//      hoverTooltip extension — styled to match the CodeTooltips widget
//
// Net effect: the editor looks clean (no `^?` line eating vertical space),
// and the inferred type stays one hover away — same UX as VS Code Twoslash.

// Empty 0-height widget — collapses the `^?` line entirely when used as
// the replacement for a block decoration. Without `display: contents`
// CodeMirror leaves an empty .cm-line in place; the explicit 0-height
// styling makes the collapse visible.
class HiddenLineWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.style.cssText = 'display: none';
    return el;
  }
  ignoreEvent(): boolean { return true; }
}

const setQueriesEffect = StateEffect.define<TypeQuery[]>();

// Computes both decoration kinds (hide marker line + mark symbol above)
// for the current snapshot of queries. Returns ranges already sorted by
// `from` so `Decoration.set` is happy.
function buildQueryDecorations(doc: { lines: number; line(n: number): { from: number; to: number; text: string; length: number } }, queries: TypeQuery[]) {
  const ranges: Array<{ from: number; to: number; deco: Decoration }> = [];
  for (const q of queries) {
    if (q.line < 1 || q.line > doc.lines) continue;
    const markerLine = doc.line(q.line);
    // 1. Hide the marker line itself. Extending the replace through the
    //    trailing newline (`+1`) collapses the line completely; without
    //    that, a blank line remains.
    ranges.push({
      from: markerLine.from,
      to: markerLine.to + 1,
      deco: Decoration.replace({ block: true, widget: new HiddenLineWidget() }),
    });
    // 2. Underline the symbol on the previous line at the `^` column. If
    //    the caret points at an identifier, span the whole identifier
    //    (so "Profile" gets underlined, not just one letter). If it
    //    points at a non-identifier character, fall back to a single-char
    //    span so the hover still works.
    if (q.line > 1) {
      const caretCol = Math.max(0, markerLine.text.indexOf('^'));
      const targetLine = doc.line(q.line - 1);
      const text = targetLine.text;
      const local = Math.min(caretCol, text.length);
      const isIdent = (ch: string) => /[A-Za-z0-9_$]/.test(ch);
      let start = local;
      while (start > 0 && isIdent(text[start - 1])) start--;
      let end = local;
      if (end < text.length && isIdent(text[end])) {
        while (end < text.length && isIdent(text[end])) end++;
      } else {
        end = Math.min(local + 1, text.length);
      }
      if (end > start) {
        ranges.push({
          from: targetLine.from + start,
          to: targetLine.from + end,
          deco: Decoration.mark({
            class: 'cm-query-mark',
            attributes: { 'data-type': q.type },
          }),
        });
      }
    }
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  return ranges;
}

const queryDecorationsField = StateField.define<DecorationSet>({
  create(): DecorationSet { return Decoration.none; },
  update(decos, tr): DecorationSet {
    decos = decos.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setQueriesEffect)) {
        const ranges = buildQueryDecorations(tr.newDoc, e.value);
        decos = Decoration.set(ranges.map(r => r.deco.range(r.from, r.to)), true);
      }
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Hover tooltip — when the cursor lands on a `.cm-query-mark`, surface
// the type it carries. CodeMirror handles positioning, hover delay, and
// dismiss-on-leave for us.
const queryHoverTooltip = hoverTooltip((view, pos): Tooltip | null => {
  const decos = view.state.field(queryDecorationsField);
  let found: { from: number; to: number; type: string } | null = null;
  decos.between(pos, pos + 1, (from, to, deco) => {
    const typeText = (deco.spec.attributes as Record<string, string> | undefined)?.['data-type'];
    if (typeText) {
      found = { from, to, type: typeText };
      return false;
    }
  });
  if (!found) return null;
  const hit = found as { from: number; to: number; type: string };
  return {
    pos: hit.from,
    end: hit.to,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'zc-cm-tip';
      dom.textContent = hit.type;
      return { dom };
    },
  };
});

// Slightly longer than TypeCoding's 300ms — the runtime side spins up an
// iframe, so debouncing more aggressively keeps a fast typer from queuing
// half a dozen sandbox boots they immediately invalidate.
const DEBOUNCE_MS = 450;

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.zc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.zc-editor')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.zc-reset')!;
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.zc-feedback-btn')!;
  const feedbackEl = card.querySelector<HTMLElement>('.zc-feedback')!;
  const feedbackStream = card.querySelector<HTMLElement>('.zc-feedback-stream')!;
  const bootEl = card.querySelector<HTMLElement>('.zc-boot')!;
  const instructionsEl = card.querySelector<HTMLElement>('.zc-instructions');
  const fixturesBodyEl = card.querySelector<HTMLElement>('.zc-fixtures-table tbody');
  const harnessErrorRowEl = card.querySelector<HTMLElement>('.zc-harness-error-row');
  const harnessErrorCellEl = card.querySelector<HTMLElement>('.zc-harness-error-cell');

  const instructions = instructionsEl?.textContent?.trim() ?? '';
  const starter = editorEl.dataset.starter ?? '';
  const schemaName = card.dataset.schemaName ?? '';
  const fixtures: Fixture[] = parseFixtures(card.dataset.fixtures ?? '[]');

  // Latest snapshots — kept around so the feedback prompt can include the
  // same state the student is looking at without re-running anything.
  let latestDiagnostics: Diagnostic[] = [];
  let latestQueries: TypeQuery[] = [];
  let latestFixtureResults: FixtureResult[] = [];
  let latestHarnessError: string | null = null;

  const view = new EditorView({
    state: EditorState.create({
      doc: starter,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentOnInput(),
        javascript({ typescript: true }),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        queryDecorationsField,
        queryHoverTooltip,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            scheduleCheck();
            updateFeedbackEnabled();
          }
        }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    feedbackEl.hidden = true;
    feedbackStream.textContent = '';
  });

  // Feedback gating mirrors TypeCoding: hidden until Ollama is reachable AND
  // the student has edited the starter. During a live stream we keep it
  // visible but disabled so the chip doesn't move out from under the cursor.
  let ollamaOk = false;
  let streaming = false;
  function updateFeedbackEnabled(): void {
    if (streaming) return;
    const codeChanged = view.state.doc.toString() !== starter;
    feedbackBtn.hidden = !(ollamaOk && codeChanged);
  }
  feedbackBtn.hidden = true;
  ollamaReady.then((ok) => { ollamaOk = ok; updateFeedbackEnabled(); });

  function collectDiagnostics(): string {
    if (latestDiagnostics.length === 0) return '(none)';
    return latestDiagnostics
      .map((d) => `- ${d.line}:${d.column} [${d.category}] ${d.message}`)
      .join('\n');
  }

  function collectQueries(): string {
    if (latestQueries.length === 0) return '(none)';
    return latestQueries
      .map((q) => `- line ${q.line - 1}: ${q.type}`)
      .join('\n');
  }

  function collectFixtures(): string {
    if (latestHarnessError) return `(harness error) ${latestHarnessError}`;
    if (latestFixtureResults.length === 0) return '(not yet run)';
    return latestFixtureResults
      .map((r) => {
        const verdict = r.ok ? 'matched expectation' : 'did NOT match expectation';
        const err = r.errorMessage ? ` — error: ${r.errorMessage}` : '';
        return `- ${r.name}: expected ${r.expect}, got ${r.actual} (${verdict})${err}`;
      })
      .join('\n');
  }

  function buildFeedbackPrompt(): string {
    return (
      `You are an AI tutor helping a student who is stuck on a Zod schema ` +
      `exercise. They are writing a TypeScript schema that must (a) produce ` +
      `the right inferred type and (b) accept/reject the lesson's fixtures ` +
      `correctly. Give a short, encouraging hint — do NOT give the full ` +
      `solution.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
      `SCHEMA NAME UNDER TEST: ${schemaName || '(unknown)'}\n\n` +
      `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
      `CURRENT TYPE ERRORS:\n${collectDiagnostics()}\n\n` +
      `CURRENT RESOLVED TYPE QUERIES (\`^?\`):\n${collectQueries()}\n\n` +
      `CURRENT FIXTURE RESULTS:\n${collectFixtures()}\n\n` +
      `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
      `student in second person. Be terse: point at the single thing to check ` +
      `next, no warm-up phrases, no restating what they did. ` +
      `No code blocks, no headers, no preamble.`
    );
  }

  feedbackBtn.addEventListener('click', async () => {
    streaming = true;
    feedbackBtn.disabled = true;
    feedbackEl.hidden = false;
    card.dataset.feedbackState = 'pending';
    feedbackStream.textContent = '';
    try {
      for await (const chunk of streamPrompt(buildFeedbackPrompt(), { temperature: 0.3 })) {
        feedbackStream.textContent = (feedbackStream.textContent ?? '') + chunk;
      }
    } catch (err) {
      feedbackStream.textContent =
        err instanceof OllamaError
          ? err.message
          : 'Could not reach the AI tutor. Please try again.';
      ollamaOk = false;
    } finally {
      delete card.dataset.feedbackState;
      streaming = false;
      feedbackBtn.disabled = false;
      updateFeedbackEnabled();
    }
  });

  // ───── Type + parse loop ────────────────────────────────────────────
  // A single debounced trigger kicks off both halves. The two halves run
  // independently — a type error doesn't gate the runtime check, and vice
  // versa — but we cancel any in-flight parse run when a newer one starts
  // so we don't apply stale results.

  let timer: number | null = null;
  let cancelParseRun: (() => void) | null = null;
  let runToken = 0;

  function scheduleCheck() {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(runCheck, DEBOUNCE_MS);
  }

  async function runCheck() {
    const myToken = ++runToken;
    const code = view.state.doc.toString();

    // Type-check side — lazy import keeps the (heavy) TS compiler bundle off
    // the editor's critical path; dynamic import() is deduped by the loader.
    let typeCheckPromise: Promise<{ diagnostics: Diagnostic[]; queries: TypeQuery[] }> | null = null;
    try {
      const { checkCode } = await import('./type-checker');
      typeCheckPromise = checkCode(code);
    } catch (err) {
      bootEl.textContent = 'Type-checker failed to load';
      console.error(err);
    }

    // Parse side — only run if the lesson actually pinned fixtures. The
    // iframe is light but it does network out to esm.sh; skip when there's
    // nothing to verify.
    if (fixtures.length > 0) {
      if (cancelParseRun) cancelParseRun();
      startParseRun(code, myToken);
    }

    if (typeCheckPromise) {
      const { diagnostics, queries } = await typeCheckPromise;
      if (myToken !== runToken) return;
      // Diagnostics aren't rendered visually — the fixtures table is the
      // student-facing signal. We still keep the latest snapshot in scope
      // so the AI feedback prompt can include TS errors when it generates
      // a hint (the tutor sees what the student doesn't).
      latestDiagnostics = diagnostics;
      latestQueries = queries;
      // Push the resolved types into the editor: the StateField listening
      // for this effect rebuilds the decoration set, hiding each `^?` line
      // and underlining the symbol on the line above. Hover that symbol to
      // see the type as a CodeMirror tooltip.
      view.dispatch({ effects: setQueriesEffect.of(queries) });
      bootEl.hidden = true;
    }
  }

  function startParseRun(code: string, token: number) {
    if (!fixturesBodyEl) return;
    resetFixtureRows();
    const incoming: FixtureResult[] = [];
    latestHarnessError = null;

    // Dynamic import keeps the iframe-spinning code out of the initial bundle.
    import('./parse-runner').then(({ runFixtures }) => {
      // Belt-and-suspenders: if a newer run started before the module loaded,
      // don't bother spinning the iframe up.
      if (token !== runToken) return;
      cancelParseRun = runFixtures(
        card,
        code,
        schemaName,
        fixtures,
        (r) => {
          if (token !== runToken) return;
          incoming.push(r);
          updateFixtureRow(r);
        },
        (msg) => {
          if (token !== runToken) return;
          latestHarnessError = msg;
          markFixturesHarnessFailure(msg);
        },
        () => {
          if (token !== runToken) return;
          latestFixtureResults = incoming;
          // A harness error already painted the status; don't let the
          // "N/M passing" summary overwrite it.
          if (!latestHarnessError) finalizeFixtures(incoming);
        },
      );
    }).catch((err) => {
      if (token !== runToken) return;
      console.error(err);
      markFixturesHarnessFailure('Could not load the parse runner.');
    });
  }

  function resetFixtureRows() {
    if (!fixturesBodyEl) return;
    fixturesBodyEl.querySelectorAll<HTMLElement>('.zc-fixture-row').forEach((row) => {
      row.dataset.status = 'pending';
    });
    // Hide any prior harness-error banner — a fresh run starts clean.
    if (harnessErrorRowEl) harnessErrorRowEl.hidden = true;
    if (harnessErrorCellEl) harnessErrorCellEl.textContent = '';
  }

  function updateFixtureRow(r: FixtureResult) {
    if (!fixturesBodyEl) return;
    // The row's pass/fail icon + colored background is the whole signal —
    // the Zod error string (`r.errorMessage`) is still collected on the
    // result object so the AI feedback prompt can use it, but it's not
    // surfaced visually to the student. Lessons that specifically teach
    // Zod's error shapes (e.g. Chapter 7.1.7) would opt that back in.
    const row = fixturesBodyEl.querySelector<HTMLElement>(
      `.zc-fixture-row[data-fixture-name="${cssEscape(r.name)}"]`,
    );
    if (row) row.dataset.status = r.ok ? 'ok' : 'bad';
  }

  function finalizeFixtures(_results: FixtureResult[]) {
    // Nothing to do — the per-row icons are the only result-state signal
    // now that the rollup pill and "running…" indicator are gone.
  }

  function markFixturesHarnessFailure(msg: string) {
    if (!fixturesBodyEl) return;
    // Surface the harness error in the dedicated top-of-tbody row. Per-row
    // icons also flip to red so the failure reads from two angles: "the
    // schema is broken (red rows)" and "here's why (banner)".
    if (harnessErrorRowEl && harnessErrorCellEl) {
      harnessErrorCellEl.textContent = msg;
      harnessErrorRowEl.hidden = false;
    }
    fixturesBodyEl.querySelectorAll<HTMLElement>('.zc-fixture-row').forEach((row) => {
      row.dataset.status = 'bad';
    });
  }

  scheduleCheck();
});

// data-fixtures is JSON-stringified at SSR time; parse defensively so a
// malformed prop doesn't take the whole page down.
function parseFixtures(raw: string): Fixture[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is Fixture =>
        f && typeof f === 'object' && typeof f.name === 'string' && (f.expect === 'pass' || f.expect === 'fail'),
    );
  } catch {
    return [];
  }
}

// Lightweight CSS.escape shim — used for the per-fixture row selector.
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
