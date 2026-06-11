import type { ChatMessage } from '@/lib/types/chat';
import type {
  AgentAssigneeName,
  PriorityName,
  StatusName,
  TagName,
} from '@/lib/constants';

export type ProjectClarifierProjectUpdateField =
  | 'name'
  | 'summary'
  | 'status'
  | 'priority'
  | 'tags'
  | 'startDate'
  | 'endDate'
  | 'estTime';

export type ProjectClarifierProjectUpdatePatch = Partial<{
  name: string;
  summary: string;
  status: StatusName;
  priority: PriorityName;
  tags: TagName[];
  startDate: string;
  endDate: string;
  estTime: number;
}>;

export type ProjectClarifierTaskCreateDraft = {
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

export type ProjectClarifierSuggestedActionChange = {
  field: ProjectClarifierProjectUpdateField;
  label: string;
  before: string;
  after: string;
};

export type ProjectClarifierProjectUpdateAction = {
  type: 'project-update';
  id: string;
  title: string;
  description?: string;
  patch: ProjectClarifierProjectUpdatePatch;
  changes: ProjectClarifierSuggestedActionChange[];
};

export type ProjectClarifierTaskCreateAction = {
  type: 'task-create';
  id: string;
  title: string;
  description?: string;
  tasks: ProjectClarifierTaskCreateDraft[];
};

export type ProjectClarifierSuggestedAction =
  | ProjectClarifierProjectUpdateAction
  | ProjectClarifierTaskCreateAction;

export type ProjectClarifierMessage = {
  role: Extract<ChatMessage['role'], 'user' | 'assistant'>;
  content: string;
  suggestedActions?: ProjectClarifierSuggestedAction[];
};

export type ProjectClarifierProjectContext = {
  id: string;
  name: string;
  summary?: string;
  status?: string;
  priority?: string;
  tags: string[];
  startDate?: string;
  endDate?: string;
  estTime?: number;
  assignedTo?: string;
};

export type ProjectClarifierTaskContext = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  tags: string[];
  dueDate?: string;
  completedOn?: string;
  estTime?: number;
  assignedTo?: string;
  acceptanceCriteria?: string[];
  testingCriteria?: string[];
  implementationPlan?: string[];
};

export type ProjectClarifierContext = {
  project: ProjectClarifierProjectContext;
  tasks: ProjectClarifierTaskContext[];
};
