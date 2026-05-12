// Per-card bootstrap. Mounts one CodeMirror editor per language pane (HTML,
// CSS, optional JS), wires tab switching, and builds an iframe `srcdoc` from
// the combined sources. Live cards rebuild on edit (400 ms debounce); non-live
// cards rebuild on Run.

import type { EditorView } from '@codemirror/view';

import { buildSrcdoc } from './srcdoc-builder';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { setError } from '../_shared/status';
import { wireFeedback } from '../_shared/feedback-loop';
import {
    appendTestResult,
    clearTestResults,
    collectTestResults,
    isHarnessMessage,
    type HarnessMessage,
} from '../_shared/iframe-harness';

type Lang = 'html' | 'css' | 'js';

document.querySelectorAll<HTMLElement>('.lc-html-css').forEach((card) => {
    initCard(card);
});

function initCard(card: HTMLElement): void {
    const refs = getCardRefs(card);
    const tabsEl = card.querySelector<HTMLElement>('.lc-hc-tabs')!;
    const tabBtns = card.querySelectorAll<HTMLButtonElement>('.lc-hc-tab');
    const paneEls = card.querySelectorAll<HTMLElement>('.lc-hc-pane');
    const iframe = card.querySelector<HTMLIFrameElement>('.lc-hc-preview')!;
    const resultsEl = card.querySelector<HTMLElement>('.lc-results');

    const tests = card.dataset.tests ?? '';
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
        views[lang] = createEditor({
            parent: paneEl,
            doc: starter,
            lang,
            onDocChange: () => {
                feedback.refreshGate();
                if (live) {
                    if (liveDebounce) clearTimeout(liveDebounce);
                    liveDebounce = setTimeout(() => {
                        initialBuild = false;
                        void rebuild({ live: true });
                    }, 400);
                }
            },
        });
    });

    // ---------- tabs ----------

    tabsEl.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.lc-hc-tab');
        if (!btn) return;
        const target = btn.dataset.lang as Lang | undefined;
        if (!target) return;
        tabBtns.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        paneEls.forEach((p) => { p.hidden = p.dataset.lang !== target; });
        // CodeMirror computes layout lazily; nudge the now-visible editor so
        // its scroller settles in the new geometry.
        views[target]?.requestMeasure();
    });

    // ---------- build / rebuild ----------

    let initialBuild = true;
    let running = false;

    const getSource = (lang: Lang): string =>
        views[lang]?.state.doc.toString() ?? '';

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
            setError(refs.errorPane, null);
            if (!hasTests && refs.runBtn) refs.runBtn.disabled = false;
        } catch (err) {
            // Live keystroke errors stay quiet — the last good preview wins.
            if (opts.live) return;
            const message = err instanceof Error ? err.message || String(err) : String(err);
            setError(refs.errorPane, message);
            running = false;
            if (refs.runBtn) refs.runBtn.disabled = false;
        }
    }

    void rebuild();

    // ---------- iframe → parent messages ----------
    // srcdoc-builder still posts the old `hcType` envelope; map to the shared
    // lcType union here so callers stay component-specific without changing
    // the in-iframe runner code.

    window.addEventListener('message', (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow) return;
        const data = e.data;
        if (!data || typeof data !== 'object') return;
        // Map legacy `hcType` envelope to the shared HarnessMessage union.
        let msg: HarnessMessage | null = null;
        if (typeof (data as { hcType?: unknown }).hcType === 'string') {
            const d = data as { hcType: string; [k: string]: unknown };
            switch (d.hcType) {
                case 'tests-ready':
                case 'tests-begin':
                case 'tests-end':
                    msg = { lcType: d.hcType } as HarnessMessage;
                    break;
                case 'test-result':
                    msg = {
                        lcType: 'test-result',
                        name: String(d.name ?? ''),
                        status: (d.status as 'pass' | 'fail' | 'error') ?? 'error',
                        error: d.error ? String(d.error) : undefined,
                    };
                    break;
                case 'runtime-error':
                    msg = {
                        lcType: 'runtime-error',
                        message: String(d.message ?? 'Runtime error'),
                        stack: d.stack ? String(d.stack) : undefined,
                    };
                    break;
                case 'resize':
                    msg = { lcType: 'resize', height: Number(d.height ?? 0) };
                    break;
            }
        } else if (isHarnessMessage(data)) {
            msg = data;
        }
        if (!msg) return;

        switch (msg.lcType) {
            case 'tests-ready':
                if (!running && refs.runBtn) refs.runBtn.disabled = false;
                break;
            case 'tests-begin':
                clearTestResults(resultsEl);
                break;
            case 'test-result':
                appendTestResult(resultsEl, msg.name, msg.status, msg.error);
                break;
            case 'tests-end':
                running = false;
                if (refs.runBtn) refs.runBtn.disabled = false;
                break;
            case 'runtime-error':
                setError(refs.errorPane, msg.stack || msg.message);
                running = false;
                if (refs.runBtn) refs.runBtn.disabled = false;
                break;
            case 'resize':
                if (typeof msg.height === 'number') {
                    const next = Math.min(Math.max(msg.height, 56), 600) + 'px';
                    if (iframe.style.height !== next) iframe.style.height = next;
                }
                break;
        }
    });

    // ---------- toolbar (non-live mode) ----------

    refs.runBtn?.addEventListener('click', () => {
        if (liveDebounce) {
            clearTimeout(liveDebounce);
            liveDebounce = null;
        }
        setError(refs.errorPane, null);
        running = hasTests;
        refs.runBtn!.disabled = true;
        initialBuild = false;
        void rebuild();
    });

    refs.resetBtn.addEventListener('click', () => {
        if (liveDebounce) {
            clearTimeout(liveDebounce);
            liveDebounce = null;
        }
        (Object.keys(views) as Lang[]).forEach((lang) => {
            const view = views[lang]!;
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: starters[lang] ?? '',
                },
            });
        });
        clearTestResults(resultsEl);
        setError(refs.errorPane, null);
        if (refs.feedbackPanel) refs.feedbackPanel.hidden = true;
        if (refs.feedbackStream) refs.feedbackStream.textContent = '';
        initialBuild = true;
        void rebuild();
    });

    // ---------- feedback (Ollama) ----------

    const isCodeChanged = (): boolean =>
        (Object.keys(views) as Lang[]).some(
            (lang) => getSource(lang) !== (starters[lang] ?? ''),
        );

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        unavailableBehavior: live ? 'hide' : 'disable',
        isDirty: isCodeChanged,
        buildPrompt: () => {
            const sources = (['html', 'css', 'js'] as Lang[])
                .filter((lang) => views[lang])
                .map((lang) => `${lang.toUpperCase()}:\n${getSource(lang)}`)
                .join('\n\n');
            return (
                `You are an AI tutor helping a student who is stuck on an HTML/CSS coding exercise.\n` +
                `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n\n` +
                (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
                `TESTS:\n${tests || '(no tests configured)'}\n\n` +
                `STUDENT'S CURRENT CODE:\n${sources}\n\n` +
                `CURRENT TEST RESULTS:\n${collectTestResults(resultsEl)}\n\n` +
                `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
                `student in second person. Be terse: point at the single thing to check ` +
                `next, no warm-up phrases, no restating what they did. ` +
                `No code blocks, no headers, no preamble.`
            );
        },
    });
}
