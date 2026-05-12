// ScriptCoding-specific DOM helpers. Both runners post results back via
// different transports (iframe postMessage vs. Sandpack callbacks), but the
// rendering into the card is identical.
//
// Re-runs use a keyed diff (begin → upsert per test → end) so unchanged rows
// stay mounted; only their status flips. Wiping the list on every run causes
// a visible flicker in vanilla mode while the iframe is still booting.

export type ResultStatus = 'pass' | 'fail' | 'error';

export function beginResults(card: HTMLElement): void {
    const list = card.querySelector<HTMLElement>('.lc-results')!;
    list.querySelectorAll<HTMLElement>('.lc-result-item').forEach((li) => {
        li.dataset.stale = '';
    });
    const consoleEl = card.querySelector<HTMLElement>('.lc-script-console')!;
    const consoleBody = card.querySelector<HTMLElement>('.lc-script-console-body')!;
    consoleEl.hidden = true;
    consoleBody.innerHTML = '';
}

export function upsertResult(
    list: HTMLElement,
    name: string,
    status: ResultStatus,
    error?: string,
): void {
    let li = list.querySelector<HTMLElement>(
        `.lc-result-item[data-test-key="${CSS.escape(name)}"]`,
    );
    if (!li) {
        li = document.createElement('li');
        li.className = 'lc-result-item';
        li.dataset.testKey = name;
        li.innerHTML = `
            <span class="lc-result-icon" aria-hidden="true"></span>
            <div class="lc-result-body">
                <span class="lc-result-name"></span>
            </div>
        `;
        list.appendChild(li);
    }
    delete li.dataset.stale;
    li.dataset.status = status;
    li.querySelector('.lc-result-name')!.textContent = name;

    const body = li.querySelector('.lc-result-body')!;
    let pre = body.querySelector<HTMLPreElement>('.lc-result-error');
    // 'error' status keeps the raw error text so users can see runtime
    // crashes (syntax errors, exceptions) that aren't tied to a specific
    // assertion.
    if (error && status === 'error') {
        if (!pre) {
            pre = document.createElement('pre');
            pre.className = 'lc-result-error';
            body.appendChild(pre);
        }
        pre.textContent = error;
    } else if (pre) {
        pre.remove();
    }
}

export function endResults(card: HTMLElement): void {
    const list = card.querySelector<HTMLElement>('.lc-results')!;
    list
        .querySelectorAll<HTMLElement>('.lc-result-item[data-stale]')
        .forEach((li) => li.remove());
}

export function appendConsole(
    card: HTMLElement,
    method: string,
    args: string[],
): void {
    const wrap = card.querySelector<HTMLElement>('.lc-script-console')!;
    const body = card.querySelector<HTMLElement>('.lc-script-console-body')!;
    wrap.hidden = false;
    const line = document.createElement('div');
    line.className = 'lc-console-line';
    line.dataset.method = method;
    line.textContent = args.join(' ');
    body.appendChild(line);
}

export function clearResults(card: HTMLElement): void {
    card.querySelector<HTMLElement>('.lc-results')!.innerHTML = '';
    const consoleEl = card.querySelector<HTMLElement>('.lc-script-console')!;
    const consoleBody = card.querySelector<HTMLElement>('.lc-script-console-body')!;
    consoleEl.hidden = true;
    consoleBody.innerHTML = '';
}
