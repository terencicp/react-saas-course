// Per-card bootstrap. Mounts CodeMirror, debounces edits, and renders diagnostics
// plus Twoslash `^?` query results below the editor. Type-checking is live (no
// "Run" button) because the senior payoff is watching the type ripple as you
// change the source.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import type { Diagnostic, TypeQuery } from './type-checker';

const DEBOUNCE_MS = 300;

document.querySelectorAll<HTMLElement>('.tc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.tc-editor')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.tc-reset')!;
  const bootEl = card.querySelector<HTMLElement>('.tc-boot')!;
  const diagnosticsEl = card.querySelector<HTMLElement>('.tc-diagnostics')!;
  const queriesWrap = card.querySelector<HTMLElement>('.tc-queries')!;
  const queriesList = card.querySelector<HTMLElement>('.tc-queries-list')!;
  const criteriaEl = card.querySelector<HTMLElement>('.tc-criteria');
  const starter = editorEl.dataset.starter ?? '';

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
        EditorView.updateListener.of((u) => {
          if (u.docChanged) scheduleCheck();
        }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
  });

  let timer: number | null = null;
  function scheduleCheck() {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(runCheck, DEBOUNCE_MS);
  }

  // Lazy-import the type-checker module so the (heavy) TypeScript compiler
  // bundle isn't on the editor's critical path. The dynamic import() is
  // deduped by the module loader, so re-calling it on every check is free.
  async function runCheck() {
    const code = view.state.doc.toString();
    try {
      const { checkCode } = await import('./type-checker');
      const { diagnostics, queries } = await checkCode(code);
      renderQueries(queries);

      // Walk the criteria checklist, flip each item's met state per its kind,
      // and collect the set of "expected" errors so we can hide them from the
      // diagnostics panel (they're part of the exercise, not failures).
      const expectedErrorMatchers = evaluateCriteria(diagnostics, queries);
      const unexpectedDiagnostics = diagnostics.filter(
        (d) => !expectedErrorMatchers.some(
          (ee) => d.message.includes(ee.contains) && (ee.line == null || d.line === ee.line),
        ),
      );
      renderDiagnostics(unexpectedDiagnostics);

      // The first successful check hides the "Booting…" hint.
      bootEl.hidden = true;
    } catch (err) {
      bootEl.textContent = 'Type-checker failed to load';
      console.error(err);
    }
  }

  // The criteria checklist is the single source of truth for what an exercise
  // is checking. Each <li> declares its kind + match config via data-attrs,
  // and this function reads them, decides met/unmet, and writes back data-met.
  // Returns the set of error matchers (for the unexpected-diagnostics filter).
  function evaluateCriteria(diagnostics: Diagnostic[], queries: TypeQuery[]) {
    const matchers: Array<{ contains: string; line?: number }> = [];
    if (!criteriaEl) return matchers;
    const items = criteriaEl.querySelectorAll<HTMLElement>('.tc-criterion');
    items.forEach((li) => {
      const kind = li.dataset.kind;
      let met = false;
      if (kind === 'query') {
        // Line is informational only — the student's refactor often shifts
        // the `^?` marker (e.g. condensing a wide type alias collapses
        // everything below it), and we don't want a working refactor to
        // miss a criterion because the line number changed. We match on the
        // substring across every resolved query; since cards typically have
        // one or two `^?`s and the lesson author pins distinctive substrings,
        // collisions are rare.
        const contains = li.dataset.contains ?? '';
        met = queries.some((q) => q.type.includes(contains));
      } else if (kind === 'error') {
        const lineRaw = li.dataset.line ?? '';
        const line = lineRaw === '' ? undefined : Number(lineRaw);
        const contains = li.dataset.contains ?? '';
        met = diagnostics.some(
          (d) => d.message.includes(contains) && (line == null || d.line === line),
        );
        matchers.push({ contains, line });
      } else if (kind === 'clean') {
        // Implicit "no errors" criterion — used when the lesson didn't pin any
        // queries or expected errors. The exercise finishes when diagnostics
        // hits zero.
        met = diagnostics.length === 0;
      }
      li.dataset.met = met ? 'true' : 'false';
    });
    return matchers;
  }

  function renderDiagnostics(items: Diagnostic[]) {
    diagnosticsEl.innerHTML = '';
    if (items.length === 0) {
      diagnosticsEl.hidden = true;
      return;
    }
    diagnosticsEl.hidden = false;
    for (const d of items) {
      const li = document.createElement('li');
      li.className = 'tc-diagnostic';
      li.dataset.category = d.category;
      const loc = document.createElement('span');
      loc.className = 'tc-diag-loc';
      loc.textContent = `${d.line}:${d.column}`;
      const msg = document.createElement('span');
      msg.className = 'tc-diag-msg';
      msg.textContent = d.message;
      li.append(loc, msg);
      diagnosticsEl.appendChild(li);
    }
  }

  function renderQueries(items: TypeQuery[]) {
    queriesList.innerHTML = '';
    if (items.length === 0) {
      queriesWrap.hidden = true;
      return;
    }
    queriesWrap.hidden = false;
    for (const q of items) {
      const li = document.createElement('li');
      li.className = 'tc-query';
      const loc = document.createElement('span');
      loc.className = 'tc-query-loc';
      // The `^?` marker points at the previous line, so that's what we show.
      loc.textContent = String(q.line - 1);
      const type = document.createElement('code');
      type.className = 'tc-query-type';
      type.textContent = q.type;
      li.append(loc, type);
      queriesList.appendChild(li);
    }
  }

  // Initial pass so the learner sees the starter's type state without typing.
  scheduleCheck();
});
