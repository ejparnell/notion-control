import { actionButtonLabel } from "../_lib/actionButtonLabel";
import type { ActionApplyState } from "../_lib/actionState";
import type { AgentOrchestratorAssignmentAction } from "@/lib/agents/orchestrator/types";

export function AssignmentActionCard({
  action,
  state,
  onApply,
}: {
  action: AgentOrchestratorAssignmentAction;
  state: ActionApplyState;
  onApply: (action: AgentOrchestratorAssignmentAction) => void;
}) {
  const disabled =
    state.status === "applying" ||
    state.status === "applied" ||
    state.status === "superseded";

  return (
    <div className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-3 text-sm text-foreground shadow-sm">
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
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted"
        >
          {actionButtonLabel(state.status)}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {action.assignments.map((assignment) => (
          <div
            key={`${assignment.targetType}-${assignment.targetId}`}
            className="rounded-lg border border-border bg-surface/80 px-3 py-2"
          >
            <p className="break-words text-sm font-semibold text-foreground">
              {assignment.targetName}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              <span className="capitalize">{assignment.targetType}</span>
              <span className="px-1 text-muted-soft">|</span>
              <span>{assignment.currentAssignedTo ?? "Unassigned"}</span>
              <span className="px-1 font-medium text-muted-soft">to</span>
              <span className="font-medium text-foreground">
                {assignment.assignedTo}
              </span>
            </p>
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
