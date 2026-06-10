// localStorage persistence for the AI assistant: settings, thread index, and
// per-thread messages. Keys follow the site-wide `react-saas-course:` prefix
// convention (see Quiz.astro). Storage is capped at MAX_THREADS; quota errors
// evict the two stalest threads and retry once.

const NS = 'react-saas-course:ai-chat';

export type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
	ts: number;
	model?: string;
};

export type ThreadMeta = {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	/** Pathname of the lesson the thread was started from (display only). */
	lessonSlug: string;
};

export type ModelInfo = {
	id: string;
	name: string;
	context_length: number;
	pricing: { prompt: string; completion: string };
};

export type Settings = {
	apiKey: string;
	modelId: string;
	modelsCache?: { fetchedAt: number; models: ModelInfo[] };
};

export const MAX_THREADS = 30;

const read = <T>(key: string): T | null => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
};

const write = (key: string, value: unknown): boolean => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
};

// --- settings ---------------------------------------------------------------

export const loadSettings = (): Settings | null =>
	read<{ v: number } & Settings>(`${NS}:settings`);

export const saveSettings = (settings: Settings): void => {
	write(`${NS}:settings`, { v: 1, ...settings });
};

// --- threads ----------------------------------------------------------------

export const loadThreadsIndex = (): ThreadMeta[] =>
	read<{ v: number; threads: ThreadMeta[] }>(`${NS}:threads-index`)?.threads ?? [];

const saveThreadsIndex = (threads: ThreadMeta[]): void => {
	write(`${NS}:threads-index`, { v: 1, threads });
};

export const loadThread = (id: string): ChatMessage[] =>
	read<{ v: number; messages: ChatMessage[] }>(`${NS}:thread:${id}`)?.messages ?? [];

export const deleteThread = (id: string): ThreadMeta[] => {
	try {
		localStorage.removeItem(`${NS}:thread:${id}`);
	} catch {}
	const index = loadThreadsIndex().filter((t) => t.id !== id);
	saveThreadsIndex(index);
	return index;
};

const evictStalest = (count: number): void => {
	const index = [...loadThreadsIndex()].sort((a, b) => a.updatedAt - b.updatedAt);
	for (const meta of index.slice(0, count)) deleteThread(meta.id);
};

export const createThread = (title: string, lessonSlug: string): ThreadMeta => {
	const meta: ThreadMeta = {
		id: crypto.randomUUID(),
		title: title.slice(0, 60) || 'New conversation',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		lessonSlug,
	};
	let index = [meta, ...loadThreadsIndex()];
	if (index.length > MAX_THREADS) {
		const stalest = [...index]
			.sort((a, b) => a.updatedAt - b.updatedAt)
			.find((t) => t.id !== meta.id);
		if (stalest) {
			try {
				localStorage.removeItem(`${NS}:thread:${stalest.id}`);
			} catch {}
			index = index.filter((t) => t.id !== stalest.id);
		}
	}
	saveThreadsIndex(index);
	return meta;
};

/** Persists messages and bumps the thread's `updatedAt` in the index. */
export const saveThread = (id: string, messages: ChatMessage[]): void => {
	const payload = { v: 1, messages };
	if (!write(`${NS}:thread:${id}`, payload)) {
		evictStalest(2);
		write(`${NS}:thread:${id}`, payload);
	}
	const index = loadThreadsIndex().map((t) =>
		t.id === id ? { ...t, updatedAt: Date.now() } : t,
	);
	saveThreadsIndex(index);
};

// --- panel session state ----------------------------------------------------

export const setPanelOpen = (open: boolean): void => {
	try {
		sessionStorage.setItem(`${NS}:open`, String(open));
	} catch {}
};
