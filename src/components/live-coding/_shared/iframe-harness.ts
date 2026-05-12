// Shared helpers for components that run student code in an iframe (HtmlCss,
// React, Script). Two pieces are genuinely common across all three:
//   1. The test-result list rendering (<ul class="lc-results"> + per-item
//      <li class="lc-result-item">) — pixel-identical UI everywhere.
//   2. The postMessage protocol kinds — pass/fail per test, lifecycle events.
//
// Each component still BUILDS its own srcdoc (the contents differ wildly
// across vanilla JS, HTML/CSS preview, and React+esbuild) and owns its
// iframe lifecycle (some persist a single iframe; ScriptCoding creates one
// per Run). The harness provides the common surface but doesn't try to
// abstract the iframe itself.

import type { TestStatus, TestResult } from './types';

// ---- postMessage envelope ----

export type HarnessMessage =
    | { lcType: 'tests-ready' }
    | { lcType: 'tests-begin' }
    | { lcType: 'test-result'; name: string; status: TestStatus; error?: string }
    | { lcType: 'tests-end' }
    | { lcType: 'compile-error'; message: string }
    | { lcType: 'runtime-error'; message: string; stack?: string }
    | { lcType: 'resize'; height: number }
    | { lcType: 'console'; method: 'log' | 'warn' | 'error' | 'info'; args: string[] };

export function isHarnessMessage(value: unknown): value is HarnessMessage {
    if (!value || typeof value !== 'object') return false;
    const v = value as { lcType?: unknown };
    return typeof v.lcType === 'string';
}

// ---- Result list rendering ----

export function clearTestResults(resultsEl: HTMLElement | null): void {
    if (resultsEl) resultsEl.innerHTML = '';
}

export function appendTestResult(
    resultsEl: HTMLElement | null,
    name: string,
    status: TestStatus,
    error?: string,
): void {
    if (!resultsEl) return;
    const li = document.createElement('li');
    li.className = 'lc-result-item';
    li.dataset.status = status;

    const nameEl = document.createElement('span');
    nameEl.className = 'lc-result-name';
    nameEl.textContent = name;

    const body = document.createElement('div');
    body.className = 'lc-result-body';
    body.appendChild(nameEl);

    if (error && status !== 'pass') {
        const pre = document.createElement('pre');
        pre.className = 'lc-result-error';
        pre.textContent = error;
        body.appendChild(pre);
    }

    const icon = document.createElement('span');
    icon.className = 'lc-result-icon';
    icon.setAttribute('aria-hidden', 'true');
    li.appendChild(icon);
    li.appendChild(body);
    resultsEl.appendChild(li);
}

/** Snapshot of the rendered result list for feedback prompts. */
export function collectTestResults(resultsEl: HTMLElement | null): string {
    if (!resultsEl) return '(no tests configured)';
    const items = resultsEl.querySelectorAll<HTMLElement>('.lc-result-item');
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

/** Collect TestResult objects (not formatted strings) — useful when the
 * caller needs the raw shape (e.g. ZodCoding's fixture comparison). */
export function snapshotTestResults(resultsEl: HTMLElement | null): TestResult[] {
    if (!resultsEl) return [];
    return Array.from(resultsEl.querySelectorAll<HTMLElement>('.lc-result-item')).map(
        (li) => ({
            name: li.querySelector('.lc-result-name')?.textContent ?? '',
            status: (li.dataset.status as TestStatus) ?? 'error',
            error:
                li.querySelector('.lc-result-error')?.textContent ?? undefined,
        }),
    );
}

// ---- Iframe message listener ----

export interface IframeListenerOpts {
    iframe: HTMLIFrameElement;
    onMessage: (msg: HarnessMessage) => void;
}

/** Register a window-level postMessage listener that only fires for messages
 * originating from `opts.iframe.contentWindow`, with the message normalized
 * to the HarnessMessage union. Returns a disposer. */
export function listenToIframe(opts: IframeListenerOpts): () => void {
    const handler = (e: MessageEvent): void => {
        if (e.source !== opts.iframe.contentWindow) return;
        if (!isHarnessMessage(e.data)) return;
        opts.onMessage(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}
