import { SpecialistNote } from "./SpecialistNote";
import { SuggestedActionCard } from "./SuggestedActionCard";
import { idleActionState, type ActionApplyState } from "../_lib/actionState";
import type {
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorMessage,
  AgentOrchestratorWorkCreateAction,
} from "@/lib/agents/orchestrator/types";

export function MessageBubble({
  message,
  actionStates,
  onApplyAssignment,
  onApplyWorkCreate,
}: {
  message: AgentOrchestratorMessage;
  actionStates: Record<string, ActionApplyState>;
  onApplyAssignment: (action: AgentOrchestratorAssignmentAction) => void;
  onApplyWorkCreate: (action: AgentOrchestratorWorkCreateAction) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[84%] space-y-2">
        <div
          className={`whitespace-pre-wrap break-words rounded-lg px-4 py-2 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-surface-soft text-foreground"
          }`}
        >
          {message.content}
        </div>

        {!isUser && message.specialistNotes?.length ? (
          <div className="space-y-2">
            {message.specialistNotes.map((note) => (
              <SpecialistNote
                key={`${note.agent}-${note.title}`}
                note={note}
              />
            ))}
          </div>
        ) : null}

        {!isUser && message.suggestedActions?.map(action => (
          <SuggestedActionCard
            key={action.id}
            action={action}
            state={actionStates[action.id] ?? idleActionState}
            onApplyAssignment={onApplyAssignment}
            onApplyWorkCreate={onApplyWorkCreate}
          />
        ))}
      </div>
    </div>
  );
}
