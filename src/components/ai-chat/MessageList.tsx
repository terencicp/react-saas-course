// Scrollable message history. Owns auto-scroll (sticks to the bottom unless
// the student scrolled up), the copy-button delegation for code frames, and
// the inline error bubble with its retry/regenerate affordance.
import { useEffect, useReducer, useRef } from "react";
import { applyMermaid, renderMarkdown } from "./lib/markdown";
import type { ChatMessage } from "./lib/storage";

function MarkdownMessage({
  content,
  streaming,
  themeVersion,
}: {
  content: string;
  streaming: boolean;
  themeVersion: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Re-renders when an async pass (shiki highlight, mermaid SVG) lands.
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = renderMarkdown(content, { streaming, onAsyncRender: bump });
    if (!streaming) applyMermaid(el, bump);
    for (const a of el.querySelectorAll("a")) {
      a.target = "_blank";
      a.rel = "noreferrer";
    }
  });

  return (
    <div
      ref={ref}
      className="ai-chat-markdown"
      data-theme-version={themeVersion}
    />
  );
}

export default function MessageList({
  messages,
  streaming,
  error,
  themeVersion,
  onRegenerate,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  themeVersion: number;
  onRegenerate: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  });

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  // Copy buttons are rendered by the markdown pipeline as inert HTML;
  // delegation here gives them behavior without per-message listeners.
  const onClick = (e: React.MouseEvent) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      ".ai-code-copy",
    );
    if (!button) return;
    const pre = button.closest(".ai-code-frame")?.querySelector("pre");
    if (!pre?.textContent) return;
    void navigator.clipboard.writeText(pre.textContent).then(() => {
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);
    });
  };

  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant",
  );

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: delegation for buttons inside rendered markdown
    <div
      className="ai-chat-messages"
      ref={scrollRef}
      onScroll={onScroll}
      onClick={onClick}
    >
      {messages.length === 0 && !error && (
        <p className="ai-chat-empty">
          Ask anything about this lesson, select lesson text to quote it.
        </p>
      )}
      {messages.map((message, i) => (
        <div
          key={`${message.ts}-${i}`}
          className={`ai-chat-message ai-chat-message-${message.role}`}
        >
          <MarkdownMessage
            content={message.content}
            streaming={
              streaming &&
              i === messages.length - 1 &&
              message.role === "assistant"
            }
            themeVersion={themeVersion}
          />
          {!streaming && i === lastAssistantIndex && (
            <button
              type="button"
              className="ai-chat-regenerate"
              onClick={onRegenerate}
              title="Regenerate this reply"
            >
              ↻ Regenerate
            </button>
          )}
        </div>
      ))}
      {streaming && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="ai-chat-message ai-chat-message-assistant">
          <span className="ai-chat-thinking">Thinking…</span>
        </div>
      )}
      {error && (
        <div className="ai-chat-error" role="alert">
          {error}
          {messages[messages.length - 1]?.role === "user" && (
            <button
              type="button"
              className="ai-chat-retry"
              onClick={onRegenerate}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
