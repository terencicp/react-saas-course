// Message input. Enter sends, Shift+Enter inserts a newline; while a reply
// streams the send button becomes Stop. The draft lives in ChatApp so the
// selection→Ask AI flow can prefill it.
import { useEffect, useRef } from 'react';

export default function Composer({
	draft,
	onDraftChange,
	streaming,
	onSend,
	onStop,
	disabled,
	focusSignal,
}: {
	draft: string;
	onDraftChange: (value: string) => void;
	streaming: boolean;
	onSend: (text: string) => void;
	onStop: () => void;
	disabled: boolean;
	/** Bumped by ChatApp on open / quote-insert to focus the input. */
	focusSignal: number;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);

	// Grow with content up to the CSS max-height.
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}, [draft]);

	// Focus with the caret at the end whenever the panel opens or a quote is
	// inserted, so the student can type their question immediately. Runs after
	// the draft value has been committed, so `value.length` is the new end.
	// biome-ignore lint/correctness/useExhaustiveDependencies: focusSignal is the trigger
	useEffect(() => {
		const el = ref.current;
		if (!el || disabled) return;
		el.focus();
		const end = el.value.length;
		el.setSelectionRange(end, end);
	}, [focusSignal, disabled]);

	const submit = () => {
		const text = draft.trim();
		if (!text || streaming || disabled) return;
		onSend(text);
	};

	return (
		<form
			className="ai-chat-composer"
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<textarea
				ref={ref}
				rows={1}
				value={draft}
				placeholder="Ask about this lesson…"
				disabled={disabled}
				onChange={(e) => onDraftChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						submit();
					}
				}}
			/>
			{streaming ? (
				<button type="button" className="ai-chat-send ai-chat-stop" onClick={onStop}>
					Stop
				</button>
			) : (
				<button type="submit" className="ai-chat-send" disabled={!draft.trim() || disabled}>
					Send
				</button>
			)}
		</form>
	);
}
