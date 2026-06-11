import { AssignmentActionCard } from "./AssignmentActionCard";
import { WorkCreateActionCard } from "./WorkCreateActionCard";
import type { ActionApplyState } from "../_lib/actionState";
import type {
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorSuggestedAction,
  AgentOrchestratorWorkCreateAction,
} from "@/lib/agents/orchestrator/types";

export function SuggestedActionCard({
  action,
  state,
  onApplyAssignment,
  onApplyWorkCreate,
}: {
  action: AgentOrchestratorSuggestedAction;
  state: ActionApplyState;
  onApplyAssignment: (action: AgentOrchestratorAssignmentAction) => void;
  onApplyWorkCreate: (action: AgentOrchestratorWorkCreateAction) => void;
}) {
  if (action.type === "work-create") {
    return (
      <WorkCreateActionCard
        action={action}
        state={state}
        onApply={onApplyWorkCreate}
      />
    );
  }

  return (
    <AssignmentActionCard
      action={action}
      state={state}
      onApply={onApplyAssignment}
    />
  );
}
