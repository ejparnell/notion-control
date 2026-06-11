"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyAgentAssignmentAction,
  applyAgentWorkCreateAction,
} from "../_lib/agentActions";
import { AgentActivityLog } from "./AgentActivityLog";
import { AgentWorkload } from "./AgentWorkload";
import { MessageBubble } from "./MessageBubble";
import { modelModes } from "../_lib/modelModes";
import type { ActionApplyState } from "../_lib/actionState";
import type {
  AgentOrchestratorAssignment,
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorMessage,
  AgentOrchestratorModelMode,
  AgentOrchestratorWorkCreateAction,
} from "@/lib/agents/orchestrator/types";
import type { AgentActivityInterface } from "@/lib/types/agent-activity";
import type { ProjectInterface } from "@/lib/types/project";
import type { TaskInterface } from "@/lib/types/task";

type AgentOrchestratorChatProps = {
  initialProjects: ProjectInterface[];
  initialTasks: TaskInterface[];
  initialActivities: AgentActivityInterface[];
};

export default function AgentOrchestratorChat({
  initialProjects,
  initialTasks,
  initialActivities,
}: AgentOrchestratorChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentOrchestratorMessage[]>([]);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [activities, setActivities] = useState(initialActivities);
  const [input, setInput] = useState("");
  const [modelMode, setModelMode] =
    useState<AgentOrchestratorModelMode>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, ActionApplyState>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const canSubmit = input.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    const userMessage: AgentOrchestratorMessage = {
      role: "user",
      content: input.trim(),
    };
    const nextMessages = [...messages, userMessage];

    supersedePendingActions();
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/agent-orchestrator-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          modelMode,
        }),
      });

      const data = (await res.json()) as {
        message?: AgentOrchestratorMessage;
        activity?: AgentActivityInterface;
        error?: string;
      };

      if (!res.ok || !data.message) {
        throw new Error(data.error ?? `Unexpected error (${res.status})`);
      }

      setMessages((currentMessages) => [...currentMessages, data.message!]);

      if (data.activity) {
        setActivities((currentActivities) => [
          data.activity!,
          ...currentActivities,
        ].slice(0, 5));
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

  async function handleApplyAssignment(action: AgentOrchestratorAssignmentAction) {
    setActionStates((currentStates) => ({
      ...currentStates,
      [action.id]: { status: "applying" },
    }));

    try {
      const appliedAssignments = await applyAgentAssignmentAction(action);

      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: { status: "applied" },
      }));
      applyAssignmentsLocally(appliedAssignments);
      router.refresh();
    } catch (err) {
      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: {
          status: "error",
          error: err instanceof Error ? err.message : "Assignments could not be applied.",
        },
      }));
    }
  }

  async function handleApplyWorkCreate(action: AgentOrchestratorWorkCreateAction) {
    setActionStates((currentStates) => ({
      ...currentStates,
      [action.id]: { status: "applying" },
    }));

    try {
      const appliedWork = await applyAgentWorkCreateAction(action);

      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: { status: "applied" },
      }));
      setProjects((currentProjects) => [
        appliedWork.project,
        ...currentProjects,
      ]);
      setTasks((currentTasks) => [
        ...appliedWork.tasks,
        ...currentTasks,
      ]);
      router.refresh();
    } catch (err) {
      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: {
          status: "error",
          error: err instanceof Error ? err.message : "Work could not be created.",
        },
      }));
    }
  }

  function applyAssignmentsLocally(assignments: AgentOrchestratorAssignment[]) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        const assignment = assignments.find(
          item => item.targetType === "project" && item.targetId === project.id,
        );

        return assignment
          ? { ...project, assignedTo: assignment.assignedTo }
          : project;
      }),
    );

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        const assignment = assignments.find(
          item => item.targetType === "task" && item.targetId === task.id,
        );

        return assignment
          ? { ...task, assignedTo: assignment.assignedTo }
          : task;
      }),
    );
  }

  function supersedePendingActions() {
    setActionStates((currentStates) => {
      let changed = false;
      const nextStates = { ...currentStates };

      for (const message of messages) {
        for (const action of message.suggestedActions ?? []) {
          const currentStatus = nextStates[action.id]?.status ?? "idle";

          if (currentStatus === "idle" || currentStatus === "error") {
            nextStates[action.id] = { status: "superseded" };
            changed = true;
          }
        }
      }

      return changed ? nextStates : currentStates;
    });
  }

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              PM Orchestrator
            </h1>
            <p className="text-sm text-muted">
              Frontend, backend, and coding specialists
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Model preset"
            className="grid grid-cols-3 overflow-hidden rounded-md border border-border text-sm font-medium"
          >
            {modelModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={modelMode === mode.value}
                disabled={loading}
                onClick={() => setModelMode(mode.value)}
                className={`px-3 py-2 transition-colors ${
                  modelMode === mode.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-soft text-muted hover:bg-surface-muted hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="log"
          aria-label="Agent orchestrator messages"
          aria-live="polite"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <p className="mt-20 select-none text-center text-sm text-muted-soft">
              Start a conversation...
            </p>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={`${message.role}-${index}`}
              message={message}
              actionStates={actionStates}
              onApplyAssignment={handleApplyAssignment}
              onApplyWorkCreate={handleApplyWorkCreate}
            />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-surface-soft px-4 py-2 text-sm text-muted-soft">
                <span className="animate-pulse">Planning...</span>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex justify-center">
              <div className="max-w-[78%] rounded-lg border border-danger/40 bg-danger-soft px-4 py-2 text-sm text-danger">
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
          <label htmlFor="agent-orchestrator-input" className="sr-only">
            Message
          </label>
          <textarea
            id="agent-orchestrator-input"
            name="message"
            rows={1}
            placeholder="Message PM orchestrator..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90 hover:shadow-glow-strong focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-glow"
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </section>

      <aside className="min-h-0 space-y-4 overflow-y-auto">
        <AgentWorkload projects={projects} tasks={tasks} />
        <AgentActivityLog activities={activities} />
      </aside>
    </div>
  );
}
