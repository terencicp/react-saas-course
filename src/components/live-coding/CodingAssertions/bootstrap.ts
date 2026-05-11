// Per-card bootstrap. Wires a CodeMirror editor into each `.lc-card` and
// dispatches to the runner declared by `data-runner`.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { clearOutput } from './dom';
import { setupVanillaRunner } from './vanilla-runner';
import { setupSandpackRunner } from './sandpack-runner';

type Runner = 'vanilla' | 'sandpack';

document.querySelectorAll<HTMLElement>('.lc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.lc-editor')!;
  const runBtn = card.querySelector<HTMLButtonElement>('.lc-run')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.lc-reset')!;
  const statusEl = card.querySelector<HTMLElement>('.lc-status');
  const resultsEl = card.querySelector<HTMLElement>('.lc-results')!;
  const starter = editorEl.dataset.starter ?? '';
  const tests = resultsEl.dataset.tests ?? '';
  const runner = (card.dataset.runner as Runner) || 'vanilla';

  const view = new EditorView({
    state: EditorState.create({
      doc: starter,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentOnInput(),
        javascript(),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    clearOutput(card);
  });

  const getCode = () => view.state.doc.toString();

  if (runner === 'sandpack') {
    setupSandpackRunner(card, getCode, tests, runBtn, statusEl!);
  } else {
    setupVanillaRunner(card, getCode, tests, runBtn);
  }
});
