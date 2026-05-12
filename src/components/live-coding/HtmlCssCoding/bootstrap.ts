// Per-card bootstrap. Mounts one CodeMirror editor per language pane (HTML,
// CSS, optional JS), wires tab switching, and builds an iframe `srcdoc` from
// the combined sources. Live cards rebuild on edit (400 ms debounce); non-live
// cards rebuild on Run.
//
// iframe → parent message types (see srcdoc-builder.ts):
//   tests-ready, tests-begin, test-result, tests-end, runtime-error, resize

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { html as cmHtml } from '@codemirror/lang-html';
import { css as cmCss } from '@codemirror/lang-css';
import { javascript as cmJs } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { buildSrcdoc } from './srcdoc-builder';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

type Lang = 'html' | 'css' | 'js';

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.hc-card').forEach((card) => {
    initCard(card);
});

function initCard(card: HTMLElement): void {
    const tabsEl = card.querySelector<HTMLElement>('.hc-tabs')!;
    const tabBtns = card.querySelectorAll<HTMLButtonElement>('.hc-tab');
    const paneEls = card.querySelectorAll<HTMLElement>('.hc-pane');
    const runBtn = card.querySelector<HTMLButtonElement>('.hc-run');
    const resetBtn = card.querySelector<HTMLButtonElement>('.hc-reset')!;
    const resultsEl = card.querySelector<HTMLElement>('.hc-results');
    const errorEl = card.querySelector<HTMLElement>('.hc-error')!;
    const iframe = card.querySelector<HTMLIFrameElement>('.hc-preview')!;
    const feedbackBtn = card.querySelector<HTMLButtonElement>('.hc-feedback-btn')!;
    const feedbackEl = card.querySelector<HTMLElement>('.hc-feedback')!;
    const feedbackStream = card.querySelector<HTMLElement>('.hc-feedback-stream')!;
    const feedbackClose = card.querySelector<HTMLButtonElement>('.hc-feedback-close')!;
    const instructions = card.querySelector<HTMLElement>('.hc-instructions')?.textContent?.trim() ?? '';

    const tests = resultsEl?.dataset.tests ?? '';
    const hasTests = !!resultsEl;
    const tailwind = card.dataset.tailwind === 'true';
    const live = card.dataset.live === 'true';

    // ---------- editors (one per language pane) ----------

    const views: Partial<Record<Lang, EditorView>> = {};
    const starters: Partial<Record<Lang, string>> = {};

    let liveDebounce: ReturnType<typeof setTimeout> | null = null;

    paneEls.forEach((paneEl) => {
        const lang = paneEl.dataset.lang as Lang;
        const starter = paneEl.dataset.starter ?? '';
        starters[lang] = starter;
        const langExtension =
            lang === 'html' ? cmHtml() :
            lang === 'css' ? cmCss() :
            cmJs();
        const view = new EditorView({
            state: EditorState.create({
                doc: starter,
                extensions: [
                    lineNumbers(),
                    history(),
                    bracketMatching(),
                    indentOnInput(),
                    langExtension,
                    oneDark,
                    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                    EditorView.updateListener.of((u) => {
                        if (!u.docChanged) return;
                        updateFeedbackEnabled();
                        if (live) {
                            if (liveDebounce) clearTimeout(liveDebounce);
                            liveDebounce = setTimeout(() => {
                                initialBuild = false;
                                void rebuild({ live: true });
                            }, 400);
                        }
                    }),
                ],
            }),
            parent: paneEl,
        });
        views[lang] = view;
    });

    // ---------- tabs ----------

    tabsEl.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.hc-tab');
        if (!btn) return;
        const target = btn.dataset.lang as Lang | undefined;
        if (!target) return;
        tabBtns.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        paneEls.forEach((p) => { p.hidden = p.dataset.lang !== target; });
        // CodeMirror computes its layout lazily; nudge the now-visible editor
        // so its scroller/measurements settle in the new geometry.
        views[target]?.requestMeasure();
    });

    // ---------- build / rebuild ----------

    let initialBuild = true;
    let running = false;

    const getSource = (lang: Lang): string => views[lang]?.state.doc.toString() ?? '';

    async function rebuild(opts: { live?: boolean } = {}): Promise<void> {
        try {
            const srcdoc = buildSrcdoc({
                html: getSource('html'),
                css: getSource('css'),
                js: views.js ? getSource('js') : undefined,
                tests: hasTests ? tests : undefined,
                tailwind,
                // Initial build is passive (preview only); every rebuild
                // thereafter auto-runs the test suite when one exists.
                autoRun: hasTests && !initialBuild,
            });
            iframe.srcdoc = srcdoc;
            errorEl.hidden = true;
            errorEl.textContent = '';
            if (!hasTests && runBtn) runBtn.disabled = false;
        } catch (err) {
            // Live keystroke errors stay quiet — the last good preview wins.
            if (opts.live) return;
            const message = err instanceof Error ? (err.message || String(err)) : String(err);
            errorEl.hidden = false;
            errorEl.textContent = message;
            running = false;
            if (runBtn) runBtn.disabled = false;
        }
    }

    void rebuild();

    // ---------- iframe → parent messages ----------

    window.addEventListener('message', (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow) return;
        const data = e.data;
        if (!data || typeof data !== 'object' || typeof data.hcType !== 'string') return;

        switch (data.hcType) {
            case 'tests-ready':
                if (!running && runBtn) runBtn.disabled = false;
                break;
            case 'tests-begin':
                clearResults();
                break;
            case 'test-result':
                appendResult(data.name, data.status, data.error);
                break;
            case 'tests-end':
                running = false;
                if (runBtn) runBtn.disabled = false;
                break;
            case 'runtime-error':
                errorEl.hidden = false;
                errorEl.textContent = data.stack || data.message || 'Runtime error';
                running = false;
                if (runBtn) runBtn.disabled = false;
                break;
            case 'resize':
                if (typeof data.height === 'number') {
                    const next = Math.min(Math.max(data.height, 56), 600) + 'px';
                    if (iframe.style.height !== next) iframe.style.height = next;
                }
                break;
        }
    });

    // ---------- toolbar ----------

    runBtn?.addEventListener('click', () => {
        if (liveDebounce) { clearTimeout(liveDebounce); liveDebounce = null; }
        errorEl.hidden = true;
        errorEl.textContent = '';
        running = hasTests;
        runBtn.disabled = true;
        initialBuild = false;
        void rebuild();
    });

    resetBtn.addEventListener('click', () => {
        if (liveDebounce) { clearTimeout(liveDebounce); liveDebounce = null; }
        (Object.keys(views) as Lang[]).forEach((lang) => {
            const view = views[lang]!;
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: starters[lang] ?? '' },
            });
        });
        clearResults();
        errorEl.hidden = true;
        errorEl.textContent = '';
        feedbackEl.hidden = true;
        feedbackStream.textContent = '';
        initialBuild = true;
        void rebuild();
    });

    // ---------- result rendering ----------

    function clearResults(): void {
        if (resultsEl) resultsEl.innerHTML = '';
    }

    function appendResult(name: string, status: 'pass' | 'fail' | 'error', error?: string): void {
        if (!resultsEl) return;
        const li = document.createElement('li');
        li.className = 'hc-result';
        li.dataset.status = status;
        const nameEl = document.createElement('span');
        nameEl.className = 'hc-result-name';
        nameEl.textContent = name;
        const body = document.createElement('div');
        body.className = 'hc-result-body';
        body.appendChild(nameEl);
        if (error && status !== 'pass') {
            const pre = document.createElement('pre');
            pre.className = 'hc-result-error';
            pre.textContent = error;
            body.appendChild(pre);
        }
        const icon = document.createElement('span');
        icon.className = 'hc-result-icon';
        icon.setAttribute('aria-hidden', 'true');
        li.appendChild(icon);
        li.appendChild(body);
        resultsEl.appendChild(li);
    }

    // ---------- feedback (Ollama) ----------

    let ollamaOk = false;
    let streaming = false;

    function isCodeChanged(): boolean {
        return (Object.keys(views) as Lang[]).some(
            (lang) => getSource(lang) !== (starters[lang] ?? ''),
        );
    }

    function updateFeedbackEnabled(): void {
        const codeChanged = isCodeChanged();
        const unavailable = streaming || !(ollamaOk && codeChanged);
        feedbackBtn.disabled = unavailable;
        feedbackBtn.title = !ollamaOk
            ? 'AI tutor unavailable — Ollama is not reachable.'
            : !codeChanged
              ? 'Edit the code first, then ask for feedback.'
              : '';
    }
    feedbackBtn.disabled = true;
    ollamaReady.then((ok) => {
        ollamaOk = ok;
        updateFeedbackEnabled();
    });

    function collectResults(): string {
        if (!resultsEl) return '(no tests configured)';
        const items = resultsEl.querySelectorAll<HTMLElement>('.hc-result');
        if (items.length === 0) return '(tests have not been run yet)';
        return Array.from(items)
            .map((li) => {
                const name = li.querySelector('.hc-result-name')?.textContent ?? '';
                const status = li.dataset.status ?? '';
                const err = li.querySelector('.hc-result-error')?.textContent ?? '';
                return `- ${name} [${status}]${err ? `: ${err}` : ''}`;
            })
            .join('\n');
    }

    function buildFeedbackPrompt(): string {
        const sources = (['html', 'css', 'js'] as Lang[])
            .filter((lang) => views[lang])
            .map((lang) => `${lang.toUpperCase()}:\n${getSource(lang)}`)
            .join('\n\n');
        return (
            `You are an AI tutor helping a student who is stuck on an HTML/CSS coding exercise.\n` +
            `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n\n` +
            (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
            `TESTS:\n${tests || '(no tests configured)'}\n\n` +
            `STUDENT'S CURRENT CODE:\n${sources}\n\n` +
            `CURRENT TEST RESULTS:\n${collectResults()}\n\n` +
            `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
            `student in second person. Be terse: point at the single thing to check ` +
            `next, no warm-up phrases, no restating what they did. ` +
            `No code blocks, no headers, no preamble.`
        );
    }

    feedbackClose.addEventListener('click', () => {
        feedbackEl.hidden = true;
    });

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
            updateFeedbackEnabled();
        }
    });
}
