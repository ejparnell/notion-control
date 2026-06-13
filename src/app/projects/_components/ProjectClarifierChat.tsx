'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateProjectAction } from '../_lib/projectActions';
import { createTasksForProjectAction } from '../_lib/taskActions';
import {
  agentAssigneeValues,
  type AgentAssigneeName,
} from '@/lib/constants';
import LocalMemorySourcePicker from '@/components/local-memory/LocalMemorySourcePicker';
import type {
  ProjectClarifierContext,
  ProjectClarifierMessage,
  ProjectClarifierProjectUpdateAction,
  ProjectClarifierProjectUpdatePatch,
  ProjectClarifierSuggestedAction,
  ProjectClarifierTaskContext,
  ProjectClarifierTaskCreateAction,
} from '@/lib/types/project-clarifier';

type ProjectClarifierChatProps = {
  context: ProjectClarifierContext;
  onProjectUpdated?: (patch: ProjectClarifierProjectUpdatePatch) => void;
  onTasksCreated?: (tasks: ProjectClarifierTaskContext[]) => void;
  onNoteCreated?: () => void;
};

type ActionApplyState = {
  status: 'idle' | 'applying' | 'applied' | 'error' | 'superseded';
  error?: string;
};

type ProjectClarifierChatResponse = {
  message?: ProjectClarifierMessage;
  createdNotes?: { id: string; content: string }[];
  error?: string;
};

const idleActionState: ActionApplyState = { status: 'idle' };
const controlClassName =
  'border border-border bg-surface-soft text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50';

export default function ProjectClarifierChat({
  context,
  onProjectUpdated,
  onTasksCreated,
  onNoteCreated,
}: ProjectClarifierChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ProjectClarifierMessage[]>([]);
  const [input, setInput] = useState('');
  const [plannerAgent, setPlannerAgent] = useState<AgentAssigneeName>('PM');
  const [selectedSourcePaths, setSelectedSourcePaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, ActionApplyState>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const canSubmit = input.trim().length > 0 && !loading;
  const canPlan = !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    const userMessage: ProjectClarifierMessage = {
      role: 'user',
      content: input.trim(),
    };
    const nextMessages = [...messages, userMessage];

    supersedePendingActions();
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/project-clarifier-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          context,
          selectedSourcePaths,
        }),
      });

      const data = (await res.json()) as ProjectClarifierChatResponse;

      if (!res.ok || !data.message) {
        throw new Error(data.error ?? `Unexpected error (${res.status})`);
      }

      setMessages((currentMessages) => [...currentMessages, data.message!]);
      handleCreatedNotes(data.createdNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanProject() {
    if (!canPlan) {
      return;
    }

    const userMessage: ProjectClarifierMessage = {
      role: 'user',
      content: `Plan this project with ${plannerAgent}.`,
    };
    const nextMessages = [...messages, userMessage];

    supersedePendingActions();
    setMessages(nextMessages);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/project-clarifier-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          context,
          plannerAgent,
          selectedSourcePaths,
        }),
      });

      const data = (await res.json()) as ProjectClarifierChatResponse;

      if (!res.ok || !data.message) {
        throw new Error(data.error ?? `Unexpected error (${res.status})`);
      }

      setMessages((currentMessages) => [...currentMessages, data.message!]);
      handleCreatedNotes(data.createdNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  async function handleApplyProjectUpdate(
    action: ProjectClarifierProjectUpdateAction,
  ) {
    setActionStates((currentStates) => ({
      ...currentStates,
      [action.id]: { status: 'applying' },
    }));

    try {
      const updatedProject = await updateProjectAction(
        context.project.id,
        action.patch,
      );

      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: { status: 'applied' },
      }));
      onProjectUpdated?.(updatedProject);
      router.refresh();
    } catch (err) {
      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Project update failed.',
        },
      }));
    }
  }

  async function handleApplyTaskCreate(
    action: ProjectClarifierTaskCreateAction,
  ) {
    setActionStates((currentStates) => ({
      ...currentStates,
      [action.id]: { status: 'applying' },
    }));

    try {
      const createdTasks = await createTasksForProjectAction(
        context.project.id,
        action.tasks,
      );

      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: { status: 'applied' },
      }));
      onTasksCreated?.(createdTasks);
      router.refresh();
    } catch (err) {
      setActionStates((currentStates) => ({
        ...currentStates,
        [action.id]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Tasks could not be created.',
        },
      }));
    }
  }

  function handleCreatedNotes(createdNotes: ProjectClarifierChatResponse['createdNotes']) {
    if (!createdNotes || createdNotes.length === 0) {
      return;
    }

    onNoteCreated?.();
    router.refresh();
  }

  function supersedePendingActions() {
    setActionStates((currentStates) => {
      let changed = false;
      const nextStates = { ...currentStates };

      for (const message of messages) {
        for (const action of message.suggestedActions ?? []) {
          const currentStatus = nextStates[action.id]?.status ?? 'idle';

          if (currentStatus === 'idle' || currentStatus === 'error') {
            nextStates[action.id] = { status: 'superseded' };
            changed = true;
          }
        }
      }

      return changed ? nextStates : currentStates;
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur">
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Project Clarifier
          </h2>
          <p className="text-sm text-muted">
            {context.tasks.length} {context.tasks.length === 1 ? 'task' : 'tasks'} in context
          </p>
        </div>
      </div>

      <div
        role="log"
        aria-label="Project clarifier messages"
        aria-live="polite"
        className="max-h-[28rem] min-h-80 space-y-3 overflow-y-auto px-6 py-4"
      >
        {messages.length === 0 && (
          <p className="mt-28 select-none text-center text-sm text-muted-soft">
            Start a conversation...
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[78%] space-y-2">
              <div
                className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                  message.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground shadow-glow'
                    : 'rounded-bl-sm bg-surface-soft text-foreground'
                }`}
              >
                {message.content}
              </div>

              {message.role === 'assistant' && message.suggestedActions?.map((action) => (
                <SuggestedActionCard
                  key={action.id}
                  action={action}
                  state={actionStates[action.id] ?? idleActionState}
                  onApplyProjectUpdate={handleApplyProjectUpdate}
                  onApplyTaskCreate={handleApplyTaskCreate}
                />
              ))}
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
        className="border-t border-border px-6 py-4"
      >
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <LocalMemorySourcePicker
            selectedSourcePaths={selectedSourcePaths}
            onChange={setSelectedSourcePaths}
            disabled={loading}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <label htmlFor="project-planner-agent" className="sr-only">
              Planning agent
            </label>
            <select
              id="project-planner-agent"
              value={plannerAgent}
              onChange={(e) => setPlannerAgent(e.target.value as AgentAssigneeName)}
              disabled={loading}
              className={`h-9 rounded-lg px-3 text-sm ${controlClassName}`}
              aria-label="Planning agent"
            >
              {agentAssigneeValues.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePlanProject}
              disabled={!canPlan}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-secondary/50 bg-secondary-soft px-3 text-sm font-semibold text-secondary transition-colors hover:border-secondary hover:bg-secondary-soft/80 focus:outline-none focus:ring-2 focus:ring-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Plan project"
            >
              Plan project
            </button>
          </div>
        </div>

        <div className="flex items-end gap-2">
        <label htmlFor="project-clarifier-input" className="sr-only">
          Message
        </label>
        <textarea
          id="project-clarifier-input"
          name="message"
          rows={1}
          placeholder="Message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className={`max-h-40 flex-1 resize-none overflow-y-auto rounded-xl px-3 py-2 text-sm ${controlClassName}`}
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
        </div>
      </form>
    </section>
  );
}

function SuggestedActionCard({
  action,
  state,
  onApplyProjectUpdate,
  onApplyTaskCreate,
}: {
  action: ProjectClarifierSuggestedAction;
  state: ActionApplyState;
  onApplyProjectUpdate: (action: ProjectClarifierProjectUpdateAction) => void;
  onApplyTaskCreate: (action: ProjectClarifierTaskCreateAction) => void;
}) {
  if (action.type === 'task-create') {
    return (
      <TaskCreateActionCard
        action={action}
        state={state}
        onApply={onApplyTaskCreate}
      />
    );
  }

  if (action.type === 'note-create') {
    return null;
  }

  return (
    <ProjectUpdateActionCard
      action={action}
      state={state}
      onApply={onApplyProjectUpdate}
    />
  );
}

function ProjectUpdateActionCard({
  action,
  state,
  onApply,
}: {
  action: ProjectClarifierProjectUpdateAction;
  state: ActionApplyState;
  onApply: (action: ProjectClarifierProjectUpdateAction) => void;
}) {
  const disabled =
    state.status === 'applying' ||
    state.status === 'applied' ||
    state.status === 'superseded';
  const buttonLabel = actionButtonLabel(state.status);

  return (
    <div className="rounded-xl border border-primary/40 bg-primary-soft px-3 py-3 text-sm text-foreground shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{action.title}</p>
          {action.description && (
            <p className="mt-1 text-xs leading-5 text-muted">
              {action.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onApply(action)}
          disabled={disabled}
          aria-label={`Apply ${action.title}`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted"
        >
          {buttonLabel}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {action.changes.map((change) => (
          <div
            key={change.field}
            className="rounded-lg border border-border bg-surface/80 px-3 py-2"
          >
            <p className="text-xs font-semibold uppercase text-muted-soft">
              {change.label}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-muted">
              <span className="text-muted-soft">{change.before}</span>
              <span className="px-1 font-medium text-muted-soft">to</span>
              <span className="font-medium text-foreground">{change.after}</span>
            </p>
          </div>
        ))}
      </div>

      {state.status === 'error' && state.error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}

function TaskCreateActionCard({
  action,
  state,
  onApply,
}: {
  action: ProjectClarifierTaskCreateAction;
  state: ActionApplyState;
  onApply: (action: ProjectClarifierTaskCreateAction) => void;
}) {
  const disabled =
    state.status === 'applying' ||
    state.status === 'applied' ||
    state.status === 'superseded';
  const buttonLabel = actionButtonLabel(state.status);

  return (
    <div className="rounded-xl border border-success/40 bg-success-soft px-3 py-3 text-sm text-foreground shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{action.title}</p>
          {action.description && (
            <p className="mt-1 text-xs leading-5 text-muted">
              {action.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onApply(action)}
          disabled={disabled}
          aria-label={`Apply ${action.title}`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-success bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground transition-colors hover:bg-success/90 focus:outline-none focus:ring-2 focus:ring-success disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted"
        >
          {buttonLabel}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {action.tasks.map((task, index) => (
          <div
            key={`${task.name}-${index}`}
            className="rounded-lg border border-border bg-surface/80 px-3 py-2"
          >
            <p className="break-words text-sm font-semibold text-foreground">
              {task.name}
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-muted">
              {formatTaskCreateDetails(task)}
            </p>
            {task.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted">
                {task.description}
              </p>
            )}
            <PlanList label="Acceptance" items={task.acceptanceCriteria} />
            <PlanList label="Testing" items={task.testingCriteria} />
            <PlanList label="Implementation" items={task.implementationPlan} />
          </div>
        ))}
      </div>

      {state.status === 'error' && state.error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}

function formatTaskCreateDetails(
  task: ProjectClarifierTaskCreateAction['tasks'][number],
) {
  const details = [
    task.status,
    task.priority,
    task.dueDate ? `Due ${task.dueDate}` : undefined,
    task.completedOn ? `Completed ${task.completedOn}` : undefined,
    typeof task.estTime === 'number' ? `${task.estTime} minutes` : undefined,
    task.assignedTo ? `Assigned to ${task.assignedTo}` : undefined,
    task.tags && task.tags.length > 0 ? task.tags.join(', ') : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : 'No extra details';
}

function PlanList({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  const visibleItems = items?.filter(item => item.trim().length > 0) ?? [];

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase text-muted-soft">
        {label}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-muted">
        {visibleItems.slice(0, 4).map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function actionButtonLabel(status: ActionApplyState['status']) {
  if (status === 'applying') {
    return 'Applying...';
  }

  if (status === 'applied') {
    return 'Applied';
  }

  if (status === 'superseded') {
    return 'Superseded';
  }

  if (status === 'error') {
    return 'Retry';
  }

  return 'Apply';
}
