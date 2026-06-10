// Top-level chat state: panel visibility, settings, threads, and the
// streaming lifecycle. Children are presentational; everything stateful
// funnels through here.
import { useCallback, useEffect, useRef, useState } from 'react';
import { setOpenListener, takeOpenRequests } from './mount';
import Composer from './Composer';
import { CpuIcon, PlusIcon, XIcon } from './Icons';
import MessageList from './MessageList';
import SettingsModal from './SettingsModal';
import ThreadSwitcher from './ThreadSwitcher';
import { OpenRouterError, describeError, streamChat } from './lib/openrouter';
import { buildSystemPrompt, getCourseContext, getLessonContext } from './lib/prompt';
import { captureViewportContext } from './lib/viewport';
import {
	type ChatMessage,
	type Settings,
	type ThreadMeta,
	createThread,
	loadSettings,
	loadThread,
	loadThreadsIndex,
	deleteThread as removeThread,
	saveSettings,
	saveThread,
	setPanelOpen,
} from './lib/storage';

export default function ChatApp() {
	const [open, setOpen] = useState(false);
	const [settings, setSettings] = useState<Settings | null>(() => loadSettings());
	const [showSettings, setShowSettings] = useState(false);
	const [threads, setThreads] = useState<ThreadMeta[]>(() => loadThreadsIndex());
	const [activeId, setActiveId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState('');
	// Bumped on OS theme flips so mermaid diagrams re-render for the new theme.
	const [themeVersion, setThemeVersion] = useState(0);
	// Bumped whenever the panel is opened (esp. with a quote) so the Composer
	// focuses the input with the caret at the end.
	const [focusSignal, setFocusSignal] = useState(0);

	const abortRef = useRef<AbortController | null>(null);
	const settingsRef = useRef(settings);
	settingsRef.current = settings;
	// drain() is registered once but must see the live open state to toggle.
	const openRef = useRef(open);
	openRef.current = open;

	// --- open requests from the loader (header button / selection button) ----
	useEffect(() => {
		const drain = () => {
			const requests = takeOpenRequests();
			if (requests.length === 0) return;
			const quoted = requests.findLast((r) => r?.quote);
			// The header button sends { toggle: true }: it closes an open panel.
			// Any non-toggle request (selection quote, session reopen) always opens.
			const onlyToggles = !quoted && requests.every((r) => r?.toggle);
			const next = onlyToggles ? !openRef.current : true;
			setOpen(next);
			setPanelOpen(next);
			if (!next) return;
			if (!settingsRef.current?.apiKey) setShowSettings(true);
			if (quoted?.quote) {
				const attribution = quoted.headingText ? `\n*(from “${quoted.headingText}”)*\n` : '';
				setDraft((d) => {
					const quote = quoted.quote!.split('\n').map((l) => `> ${l}`).join('\n');
					return `${quote}\n${attribution}\n${d}`;
				});
			}
			setFocusSignal((s) => s + 1);
		};
		setOpenListener(drain);
		drain();
		return () => setOpenListener(null);
	}, []);

	// Reflect panel state on the header button(s) for assistive tech.
	useEffect(() => {
		for (const el of document.querySelectorAll('[data-ai-chat-toggle]')) {
			el.setAttribute('aria-expanded', String(open));
		}
	}, [open]);

	useEffect(() => {
		const onThemeChange = () => setThemeVersion((v) => v + 1);
		document.addEventListener('ai-chat:theme-change', onThemeChange);
		return () => document.removeEventListener('ai-chat:theme-change', onThemeChange);
	}, []);

	// --- streaming lifecycle --------------------------------------------------
	const streamAssistant = useCallback(async (threadId: string, history: ChatMessage[]) => {
		const current = settingsRef.current;
		if (!current?.apiKey) {
			setShowSettings(true);
			return;
		}
		setError(null);
		setStreaming(true);
		const controller = new AbortController();
		abortRef.current = controller;
		const assistant: ChatMessage = {
			role: 'assistant',
			content: '',
			ts: Date.now(),
			model: current.modelId,
		};
		let acc = '';
		let frame: number | null = null;
		let lastSave = 0;
		const flush = () => {
			frame = null;
			setMessages([...history, { ...assistant, content: acc }]);
			if (Date.now() - lastSave > 500) {
				lastSave = Date.now();
				saveThread(threadId, [...history, { ...assistant, content: acc }]);
			}
		};
		try {
			const [course, lesson] = await Promise.all([getCourseContext(), getLessonContext()]);
			const apiMessages = [
				{ role: 'system' as const, content: buildSystemPrompt(course, lesson) },
				// A user message carries the viewport snapshot taken when it was
				// sent, as a bracketed note the system prompt teaches the model
				// to read. Persisted on the message, so the payload — and any
				// provider prompt-prefix cache — stays stable across turns.
				...history.map(({ role, content, viewport }) => ({
					role,
					content: viewport ? `[${viewport}]\n\n${content}` : content,
				})),
			];
			for await (const delta of streamChat({
				apiKey: current.apiKey,
				model: current.modelId,
				messages: apiMessages,
				signal: controller.signal,
			})) {
				acc += delta;
				frame ??= requestAnimationFrame(flush);
			}
		} catch (err) {
			if (!(err instanceof DOMException && err.name === 'AbortError')) {
				setError(describeError(err));
				if (err instanceof OpenRouterError && err.status === 401) setShowSettings(true);
			}
		} finally {
			if (frame !== null) cancelAnimationFrame(frame);
			abortRef.current = null;
			setStreaming(false);
			const final = acc ? [...history, { ...assistant, content: acc }] : history;
			setMessages(final);
			saveThread(threadId, final);
			setThreads(loadThreadsIndex());
		}
	}, []);

	const send = useCallback(
		(text: string) => {
			const userMessage: ChatMessage = {
				role: 'user',
				content: text,
				ts: Date.now(),
				viewport: captureViewportContext() ?? undefined,
			};
			let threadId = activeId;
			if (!threadId) {
				const meta = createThread(text.replace(/\s+/g, ' '), location.pathname);
				threadId = meta.id;
				setActiveId(threadId);
				setThreads(loadThreadsIndex());
			}
			const history = [...messages, userMessage];
			setMessages(history);
			saveThread(threadId, history);
			setDraft('');
			void streamAssistant(threadId, history);
		},
		[activeId, messages, streamAssistant],
	);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	/** Re-asks the last user question, dropping the assistant reply (if any). */
	const regenerate = useCallback(() => {
		if (!activeId || streaming) return;
		const history = [...messages];
		while (history.length > 0 && history[history.length - 1]!.role === 'assistant') {
			history.pop();
		}
		if (history.length === 0) return;
		setMessages(history);
		void streamAssistant(activeId, history);
	}, [activeId, messages, streaming, streamAssistant]);

	// --- thread operations ------------------------------------------------------
	const newChat = useCallback(() => {
		abortRef.current?.abort();
		setActiveId(null);
		setMessages([]);
		setError(null);
	}, []);

	const selectThread = useCallback((id: string) => {
		abortRef.current?.abort();
		setActiveId(id);
		setMessages(loadThread(id));
		setError(null);
	}, []);

	const deleteThread = useCallback(
		(id: string) => {
			setThreads(removeThread(id));
			if (id === activeId) newChat();
		},
		[activeId, newChat],
	);

	const close = useCallback(() => {
		setOpen(false);
		setPanelOpen(false);
	}, []);

	const saveSettingsAndClose = useCallback((next: Settings) => {
		saveSettings(next);
		setSettings(next);
		setShowSettings(false);
	}, []);

	if (!open) return null;

	return (
		<div className="ai-chat-panel" role="dialog" aria-label="Course AI assistant">
			<header className="ai-chat-header">
				<span className="ai-chat-title">AI tutor</span>
				<div className="ai-chat-header-actions">
					<button
						type="button"
						className="ai-chat-icon-btn"
						title="New chat"
						aria-label="New chat"
						onClick={newChat}
					>
						<PlusIcon />
					</button>
					<ThreadSwitcher
						threads={threads}
						activeId={activeId}
						onSelect={selectThread}
						onDelete={deleteThread}
					/>
					<button
						type="button"
						className="ai-chat-icon-btn"
						title="Settings"
						aria-label="Settings"
						onClick={() => setShowSettings(true)}
					>
						<CpuIcon />
					</button>
					<button
						type="button"
						className="ai-chat-icon-btn"
						title="Close"
						aria-label="Close assistant"
						onClick={close}
					>
						<XIcon />
					</button>
				</div>
			</header>

			<MessageList
				messages={messages}
				streaming={streaming}
				error={error}
				themeVersion={themeVersion}
				onRegenerate={regenerate}
			/>

			<Composer
				draft={draft}
				onDraftChange={setDraft}
				streaming={streaming}
				onSend={send}
				onStop={stop}
				disabled={showSettings}
				focusSignal={focusSignal}
			/>

			{showSettings && (
				<SettingsModal
					settings={settings}
					onSave={saveSettingsAndClose}
					onClose={settings?.apiKey ? () => setShowSettings(false) : undefined}
				/>
			)}
		</div>
	);
}
