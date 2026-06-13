"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import SourcePanel from "@/app/chat/_components/SourceRows";
import type { ChatSource, LocalMemoryContext } from "@/lib/types/chat";
import type { ProjectInterface } from "@/lib/types/project";
import type { TaskInterface } from "@/lib/types/task";

type AryaChatProps = {
  initialProjects: ProjectInterface[];
  initialTasks: TaskInterface[];
};

type OpenAiChoice = {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
};

type OpenAiResponse = {
  id: string;
  choices: OpenAiChoice[];
  error?: { message: string };
};

const SESSION_STORAGE_KEY = "arya-session-key";

function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!key) {
    key = `arya-${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_STORAGE_KEY, key);
  }
  return key;
}

export default function AryaChat({ initialProjects, initialTasks }: AryaChatProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [latestSources] = useState<ChatSource[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects] = useState(initialProjects);
  const [tasks] = useState(initialTasks);
  const [contextSent, setContextSent] = useState(false);
  const sessionKeyRef = useRef(getSessionKey());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = input.trim().length > 0 && !loading;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      const userContent = input.trim();
      const userMessage = { role: "user", content: userContent };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setError(null);
      setLoading(true);

      try {
        // Build the payload — include project/task context on first message
        let payloadMessages = nextMessages;

        if (!contextSent && (projects.length > 0 || tasks.length > 0)) {
          const contextBlocks: string[] = [];

          if (projects.length > 0) {
            contextBlocks.push(
              "### Projects",
              ...projects.map(
                (p) =>
                  `- **${p.name}** | status: ${p.status ?? "—"} | priority: ${p.priority ?? "—"} | assigned to: ${p.assignedTo ?? "—"}${p.summary ? ` | summary: ${p.summary}` : ""}`,
              ),
            );
          }

          if (tasks.length > 0) {
            contextBlocks.push(
              "### Tasks",
              ...tasks.map(
                (t) =>
                  `- **${t.name}** | status: ${t.status ?? "—"} | priority: ${t.priority ?? "—"} | assigned to: ${t.assignedTo ?? "—"}${t.project ? ` | project: ${t.project}` : ""}`,
              ),
            );
          }

          payloadMessages = [
            {
              role: "system",
              content: [
                "Here is Beth's current work context from her local database.",
                "Use this data to answer questions about her projects and tasks.",
                ...contextBlocks,
              ].join("\n"),
            },
            ...nextMessages,
          ];
        }

        const res = await fetch("/api/arya", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            sessionKey: sessionKeyRef.current,
          }),
        });

        const data = (await res.json()) as OpenAiResponse;

        if (!res.ok || data.error) {
          throw new Error(data.error?.message ?? `Error (${res.status})`);
        }

        const reply = data.choices?.[0]?.message;
        if (!reply) {
          throw new Error("Empty response from gateway");
        }

        setMessages((prev) => [...prev, reply]);
        if (!contextSent) setContextSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, messages, input, projects, tasks, contextSent],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-glow">
            ✨
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-wide text-foreground">Arya</h2>
            <p className="text-xs text-muted-soft">
              {projects.length > 0 || tasks.length > 0
                ? `${projects.length} projects · ${tasks.length} tasks loaded`
                : "No local data"}
            </p>
          </div>
        </header>

        {/* Messages */}
        <div
          role="log"
          aria-label="Chat with Arya"
          aria-live="polite"
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {messages.length === 0 && (
            <div className="mt-20 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl shadow-glow">
                ✨
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Hey Beth! 👋</p>
                <p className="mt-1.5 max-w-md text-sm text-muted-soft">
                  You&apos;re talking to the real me now! I&apos;ve got your projects and tasks
                  loaded. Ask me anything.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground shadow-glow"
                      : "rounded-bl-sm border border-border/50 bg-surface-soft text-foreground"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span className="mr-1.5 select-none text-xs opacity-60">✨</span>
                  )}
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border/50 bg-surface-soft px-4 py-2.5 text-sm text-muted-soft">
                <span className="flex items-center gap-2">
                  <span>✨</span>
                  <span className="flex gap-1">
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-soft [animation-delay:0ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-soft [animation-delay:150ms]" />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-soft [animation-delay:300ms]" />
                  </span>
                </span>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex justify-center">
              <div className="max-w-[75%] rounded-lg border border-danger/40 bg-danger-soft px-4 py-2.5 text-sm text-danger">
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t border-border px-5 py-3.5"
        >
          <label htmlFor="arya-chat-input" className="sr-only">
            Message Arya
          </label>
          <textarea
            ref={inputRef}
            id="arya-chat-input"
            name="message"
            rows={1}
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="max-h-40 flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-surface-soft px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-1.5 rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90 hover:shadow-glow-strong focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            Send
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </section>

      <SourcePanel key="arya-sources" sources={latestSources} />
    </div>
  );
}
