// Per-card bootstrap. Wires a CodeMirror editor into each card and dispatches
// to the runner declared by `data-runner` (vanilla iframe or Sandpack).

import { clearResults } from './dom';
import { setupVanillaRunner } from './vanilla-runner';
import { setupSandpackRunner } from './sandpack-runner';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { wireReset } from '../_shared/reset';
import { wireFeedback } from '../_shared/feedback-loop';
import { collectTestResults } from '../_shared/iframe-harness';

type Runner = 'vanilla' | 'sandpack';

document.querySelectorAll<HTMLElement>('.lc-script').forEach((card) => {
    const refs = getCardRefs(card);
    const resultsEl = card.querySelector<HTMLElement>('.lc-results')!;

    const starter = card.dataset.starter ?? '';
    const tests = card.dataset.tests ?? '';
    const runner = (card.dataset.runner as Runner) || 'vanilla';

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'js',
        onDocChange: () => feedback.refreshGate(),
    });

    wireReset({
        card,
        resetBtn: refs.resetBtn,
        view,
        starter,
        feedbackPanel: refs.feedbackPanel,
        feedbackStream: refs.feedbackStream,
        errorPane: refs.errorPane,
        onAfterReset: () => clearResults(card),
    });

    const getCode = () => view.state.doc.toString();

    if (runner === 'sandpack') {
        void setupSandpackRunner(card, getCode, tests, refs.runBtn!, refs.status!);
    } else {
        setupVanillaRunner(card, getCode, tests, refs.runBtn!);
    }

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        isDirty: () => getCode() !== starter,
        buildPrompt: () => (
            `You are an AI tutor helping a student who is stuck on a coding exercise.\n` +
            `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n\n` +
            (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
            `TESTS:\n${tests}\n\n` +
            `STUDENT'S CURRENT CODE:\n${getCode()}\n\n` +
            `CURRENT TEST RESULTS:\n${collectTestResults(resultsEl)}\n\n` +
            `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
            `student in second person. Be terse: point at the single thing to check ` +
            `next, no warm-up phrases, no restating what they did. ` +
            `No code blocks, no headers, no preamble.`
        ),
    });
});
