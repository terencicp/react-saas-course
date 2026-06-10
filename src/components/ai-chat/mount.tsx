// Entry point of the lazily-loaded chat bundle. The Footer override's loader
// dynamic-imports this module on the first open request and calls openChat().
// Requests are queued module-side so a payload that arrives while React is
// still mounting (always true for the very first one) isn't lost.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ChatApp from './ChatApp';
import './chat.css';

export type OpenPayload = { quote?: string; headingText?: string; toggle?: boolean };

const queue: (OpenPayload | undefined)[] = [];
let notify: (() => void) | null = null;
let mounted = false;

/** ChatApp drains the queue on mount and after each notification. */
export const takeOpenRequests = (): (OpenPayload | undefined)[] => queue.splice(0);
export const setOpenListener = (fn: (() => void) | null): void => {
	notify = fn;
};

export const openChat = (payload?: OpenPayload): void => {
	queue.push(payload);
	if (!mounted) {
		mounted = true;
		const rootEl = document.getElementById('ai-chat-root');
		if (!rootEl) return;
		// The root div is authored inside the Footer, which sits within
		// Starlight's `.main-pane` — a stacking context. Trapped there, the
		// panel's z-index loses to the fixed right-sidebar (a sibling subtree).
		// Reparent to <body> so the fixed panel lives in the root stacking
		// context and reliably paints above everything. Layout is unaffected
		// because the panel is position:fixed.
		if (rootEl.parentElement !== document.body) document.body.appendChild(rootEl);
		createRoot(rootEl).render(
			<StrictMode>
				<ChatApp />
			</StrictMode>,
		);
	}
	notify?.();
};
