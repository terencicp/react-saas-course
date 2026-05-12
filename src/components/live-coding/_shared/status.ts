// Tiny helper for the status indicator pill in the toolbar. Centralizes the
// `data-state` ↔ color mapping (see styles.css `.lc-status[data-state=…]`).

export type StatusState = 'idle' | 'running' | 'error';

export function setStatus(
    statusEl: HTMLElement | null,
    state: StatusState,
    text = '',
): void {
    if (!statusEl) return;
    if (state === 'idle') {
        delete statusEl.dataset.state;
        statusEl.textContent = text;
    } else {
        statusEl.dataset.state = state;
        statusEl.textContent =
            text || (state === 'running' ? 'Running…' : 'Error');
    }
}

export function setError(errorPane: HTMLElement, message: string | null): void {
    if (message == null) {
        errorPane.hidden = true;
        errorPane.textContent = '';
    } else {
        errorPane.hidden = false;
        errorPane.textContent = message;
    }
}
