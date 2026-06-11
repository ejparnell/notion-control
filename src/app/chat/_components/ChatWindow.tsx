"use client";

import { useState, useRef, useEffect } from "react";
import SourcePanel from "./SourceRows";
import type { ChatMessage, ChatSource, LocalMemoryContext, NotionContext } from "@/lib/types/chat";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestSources, setLatestSources] = useState<ChatSource[]>([]);
  const [sourcePanelVersion, setSourcePanelVersion] = useState(0);
  const [notionContext, setNotionContext] = useState<NotionContext>({});
  const [localMemoryContext, setLocalMemoryContext] = useState<LocalMemoryContext>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const canSubmit = input.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, notionContext, localMemoryContext }),
      });

      const data = (await res.json()) as {
        message?: ChatMessage;
        sources?: ChatSource[];
        notionContext?: NotionContext;
        localMemoryContext?: LocalMemoryContext;
        error?: string;
      };

      if (!res.ok || !data.message) {
        throw new Error(data.error ?? `Unexpected error (${res.status})`);
      }

      const sources = data.sources ?? data.message.sources ?? [];
      const assistantMessage = sources.length
        ? { ...data.message, sources }
        : data.message;
      setMessages((prev) => [...prev, assistantMessage!]);
      setLatestSources(sources);
      setSourcePanelVersion((version) => version + 1);
      if (data.notionContext !== undefined) {
        setNotionContext(data.notionContext);
      }
      if (data.localMemoryContext !== undefined) {
        setLocalMemoryContext(data.localMemoryContext);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(12rem,16rem)] gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur">
        <div
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <p className="mt-16 select-none text-center text-sm text-muted-soft">
              Start a conversation...
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%]">
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground shadow-glow"
                      : "rounded-bl-sm bg-surface-soft text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-surface-soft px-4 py-2 text-sm text-muted-soft">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex justify-center"
            >
              <div className="max-w-[75%] rounded-lg border border-danger/40 bg-danger-soft px-4 py-2 text-sm text-danger">
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t border-border px-4 py-3"
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            name="message"
            rows={1}
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="max-h-40 flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90 hover:shadow-glow-strong focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-glow"
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </section>

      <SourcePanel key={sourcePanelVersion} sources={latestSources} />
    </div>
  );
}
