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
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

type Runner = 'vanilla' | 'sandpack';

// Single probe shared across every card on the page — Ollama either reachable
// or not, no point hitting `/api/tags` once per widget.
const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.lc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.lc-editor')!;
  const runBtn = card.querySelector<HTMLButtonElement>('.lc-run')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.lc-reset')!;
  const statusEl = card.querySelector<HTMLElement>('.lc-status');
  const resultsEl = card.querySelector<HTMLElement>('.lc-results')!;
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.lc-feedback-btn')!;
  const feedbackEl = card.querySelector<HTMLElement>('.lc-feedback')!;
  const feedbackStream = card.querySelector<HTMLElement>('.lc-feedback-stream')!;
  const instructionsEl = card.querySelector<HTMLElement>('.lc-instructions');
  const instructions = instructionsEl?.textContent?.trim() ?? '';
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
        // Fires on every doc change so we can re-evaluate whether the
        // Feedback button should be active (it gates on "code !== starter").
        EditorView.updateListener.of((u) => { if (u.docChanged) updateFeedbackEnabled(); }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    clearOutput(card);
    // Wipe any AI feedback too — restoring the starter means the previous
    // hint no longer matches the code on screen.
    feedbackEl.hidden = true;
    feedbackStream.textContent = '';
  });

  const getCode = () => view.state.doc.toString();

  if (runner === 'sandpack') {
    setupSandpackRunner(card, getCode, tests, runBtn, statusEl!);
  } else {
    setupVanillaRunner(card, getCode, tests, runBtn);
  }

  // Three reasons the button stays disabled: (1) Ollama still being probed or
  // unreachable, (2) student hasn't edited the starter yet so there's nothing
  // to give feedback on, (3) a request is currently streaming. The third is
  // handled by toggling `disabled` directly inside the click handler; the
  // helper covers the first two and is the single source of truth when the
  // request completes.
  let ollamaOk = false;
  let streaming = false;
  function updateFeedbackEnabled(): void {
    if (streaming) return;
    const codeChanged = view.state.doc.toString() !== starter;
    feedbackBtn.disabled = !(ollamaOk && codeChanged);
    feedbackBtn.title = !ollamaOk
      ? 'AI tutor unavailable — Ollama is not reachable.'
      : !codeChanged
        ? 'Edit the code first, then ask for feedback.'
        : '';
  }
  // Initial gate: disable until the ping resolves.
  feedbackBtn.disabled = true;
  ollamaReady.then((ok) => { ollamaOk = ok; updateFeedbackEnabled(); });

  function collectResults(): string {
    const items = card.querySelectorAll<HTMLElement>('.lc-result');
    if (items.length === 0) return '(tests have not been run yet)';
    return Array.from(items)
      .map((li) => {
        const name = li.querySelector('.lc-result-name')?.textContent ?? '';
        const status = li.dataset.status ?? '';
        const err = li.querySelector('.lc-result-error')?.textContent ?? '';
        return `- ${name} [${status}]${err ? `: ${err}` : ''}`;
      })
      .join('\n');
  }

  function buildFeedbackPrompt(): string {
    return (
      `You are an AI tutor helping a student who is stuck on a coding exercise.\n` +
      `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
      `TESTS:\n${tests}\n\n` +
      `STUDENT'S CURRENT CODE:\n${getCode()}\n\n` +
      `CURRENT TEST RESULTS:\n${collectResults()}\n\n` +
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
      // Stream failure usually means Ollama died between probe and click.
      ollamaOk = false;
    } finally {
      delete card.dataset.feedbackState;
      streaming = false;
      updateFeedbackEnabled();
    }
  });
});
