import type {
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorModelMode,
  AgentOrchestratorSuggestedAction,
  AgentOrchestratorSpecialistNote,
} from '@/lib/agents/orchestrator/types';

export interface AgentActivityInterface {
  id: string;
  modelMode: AgentOrchestratorModelMode;
  promptPreview: string;
  pmSummary: string;
  specialistNotes: AgentOrchestratorSpecialistNote[];
  proposedActions: AgentOrchestratorSuggestedAction[];
  proposedAssignments: AgentOrchestratorAssignmentAction[];
  createdAt?: Date | string;
}
