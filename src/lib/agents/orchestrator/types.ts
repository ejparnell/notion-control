import type { ChatMessage } from "@/lib/types/chat";
import type {
  AgentAssigneeName,
  PriorityName,
  StatusName,
  TagName,
} from "@/lib/constants";

export type AgentOrchestratorModelMode =
  | "standard"
  | "pro-planning"
  | "coding-planning";

export type AgentOrchestratorSpecialist = "frontend" | "backend" | "coding";

export type AgentOrchestratorAssignmentTargetType = "project" | "task";

export type AgentOrchestratorAssignmentTarget = {
  type: AgentOrchestratorAssignmentTargetType;
  id: string;
  name: string;
  assignedTo?: AgentAssigneeName;
};

export type AgentOrchestratorAssignment = {
  targetType: AgentOrchestratorAssignmentTargetType;
  targetId: string;
  targetName: string;
  currentAssignedTo?: AgentAssigneeName;
  assignedTo: AgentAssigneeName;
};

export type AgentOrchestratorAssignmentAction = {
  type: "assignment-update";
  id: string;
  title: string;
  description?: string;
  assignments: AgentOrchestratorAssignment[];
};

export type AgentOrchestratorWorkCreateProjectDraft = {
  name: string;
  summary?: string;
  status?: StatusName;
  priority?: PriorityName;
  tags?: TagName[];
  startDate?: string;
  endDate?: string;
  estTime?: number;
  assignedTo?: AgentAssigneeName;
};

export type AgentOrchestratorWorkCreateTaskDraft = {
  name: string;
  description?: string;
  status?: StatusName;
  dueDate?: string;
  priority?: PriorityName;
  tags?: TagName[];
  completedOn?: string;
  estTime?: number;
  assignedTo?: AgentAssigneeName;
  acceptanceCriteria?: string[];
  testingCriteria?: string[];
  implementationPlan?: string[];
};

export type AgentOrchestratorWorkCreateAction = {
  type: "work-create";
  id: string;
  title: string;
  description?: string;
  project: AgentOrchestratorWorkCreateProjectDraft;
  tasks: AgentOrchestratorWorkCreateTaskDraft[];
};

export type AgentOrchestratorSuggestedAction =
  | AgentOrchestratorAssignmentAction
  | AgentOrchestratorWorkCreateAction;

export type AgentOrchestratorSpecialistNote = {
  agent: AgentOrchestratorSpecialist;
  title: string;
  content: string;
};

export type AgentOrchestratorMessage = {
  role: Extract<ChatMessage["role"], "user" | "assistant">;
  content: string;
  specialistNotes?: AgentOrchestratorSpecialistNote[];
  suggestedActions?: AgentOrchestratorSuggestedAction[];
};

export type SpecialistOutput = {
  title: string;
  content: string;
};

export type PmOutput = {
  content: string;
  suggestedActions?: AgentOrchestratorSuggestedAction[];
};
