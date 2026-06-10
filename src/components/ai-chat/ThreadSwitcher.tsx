// History dropdown: lists saved threads (newest first) with relative time
// and per-thread delete. Plain controlled popover — no portal needed inside
// the fixed panel.
import { useEffect, useRef, useState } from 'react';
import { ChatsIcon, XIcon } from './Icons';
import type { ThreadMeta } from './lib/storage';

const relativeTime = (ts: number): string => {
	const minutes = Math.round((Date.now() - ts) / 60_000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	return days < 30 ? `${days}d ago` : new Date(ts).toLocaleDateString();
};

export default function ThreadSwitcher({
	threads,
	activeId,
	onSelect,
	onDelete,
}: {
	threads: ThreadMeta[];
	activeId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	return (
		<div className="ai-chat-threads" ref={rootRef}>
			<button
				type="button"
				className="ai-chat-icon-btn"
				title="Conversation history"
				aria-label="Conversation history"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				<ChatsIcon />
			</button>
			{open && (
				<div className="ai-chat-threads-menu">
					{threads.length === 0 && <p className="ai-chat-threads-empty">No conversations yet.</p>}
					{threads.map((thread) => (
						<div
							key={thread.id}
							className={`ai-chat-thread-row${thread.id === activeId ? ' is-active' : ''}`}
						>
							<button
								type="button"
								className="ai-chat-thread-open"
								onClick={() => {
									onSelect(thread.id);
									setOpen(false);
								}}
							>
								<span className="ai-chat-thread-title">{thread.title}</span>
								<span className="ai-chat-thread-time">{relativeTime(thread.updatedAt)}</span>
							</button>
							<button
								type="button"
								className="ai-chat-thread-delete"
								title="Delete conversation"
								aria-label={`Delete “${thread.title}”`}
								onClick={() => onDelete(thread.id)}
							>
								<XIcon size={14} />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
