import { WorkCreateList } from "./WorkCreateList";
import { actionButtonLabel } from "../_lib/actionButtonLabel";
import { formatWorkCreateDetails } from "../_lib/formatWorkCreateDetails";
import type { ActionApplyState } from "../_lib/actionState";
import type { AgentOrchestratorWorkCreateAction } from "@/lib/agents/orchestrator/types";

export function WorkCreateActionCard({
  action,
  state,
  onApply,
}: {
  action: AgentOrchestratorWorkCreateAction;
  state: ActionApplyState;
  onApply: (action: AgentOrchestratorWorkCreateAction) => void;
}) {
  const disabled =
    state.status === "applying" ||
    state.status === "applied" ||
    state.status === "superseded";

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
          {actionButtonLabel(state.status)}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-surface/80 px-3 py-2">
        <p className="text-xs font-semibold uppercase text-muted-soft">
          Project
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-foreground">
          {action.project.name}
        </p>
        {action.project.summary && (
          <p className="mt-1 break-words text-xs leading-5 text-muted">
            {action.project.summary}
          </p>
        )}
        <p className="mt-2 break-words text-xs leading-5 text-muted-soft">
          {formatWorkCreateDetails([
            action.project.status,
            action.project.priority,
            action.project.assignedTo
              ? `Assigned to ${action.project.assignedTo}`
              : undefined,
            typeof action.project.estTime === "number"
              ? `${action.project.estTime} minutes`
              : undefined,
            action.project.tags?.join(", "),
          ])}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {action.tasks.map((task, index) => (
          <div
            key={`${task.name}-${index}`}
            className="rounded-lg border border-border bg-surface/80 px-3 py-2"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">
                  {task.name}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-muted-soft">
                  {formatWorkCreateDetails([
                    task.status,
                    task.priority,
                    task.assignedTo ? `Assigned to ${task.assignedTo}` : undefined,
                    typeof task.estTime === "number"
                      ? `${task.estTime} minutes`
                      : undefined,
                    task.tags?.join(", "),
                  ])}
                </p>
              </div>
            </div>

            {task.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted">
                {task.description}
              </p>
            )}

            <WorkCreateList
              label="Acceptance"
              items={task.acceptanceCriteria}
            />
            <WorkCreateList
              label="Testing"
              items={task.testingCriteria}
            />
            <WorkCreateList
              label="Implementation"
              items={task.implementationPlan}
            />
          </div>
        ))}
      </div>

      {state.status === "error" && state.error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
