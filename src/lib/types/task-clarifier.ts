import type { ChatMessage } from '@/lib/types/chat';
import type {
  AgentAssigneeName,
  PriorityName,
  StatusName,
  TagName,
} from '@/lib/constants';

export type TaskClarifierTaskUpdateField =
  | 'name'
  | 'description'
  | 'status'
  | 'priority'
  | 'tags'
  | 'dueDate'
  | 'completedOn'
  | 'estTime'
  | 'assignedTo'
  | 'acceptanceCriteria'
  | 'testingCriteria'
  | 'implementationPlan';

export type TaskClarifierTaskUpdatePatch = Partial<{
  name: string;
  description: string;
  status: StatusName;
  priority: PriorityName;
  tags: TagName[];
  dueDate: string;
  completedOn: string;
  estTime: number;
  assignedTo: AgentAssigneeName;
  acceptanceCriteria: string[];
  testingCriteria: string[];
  implementationPlan: string[];
}>;

export type TaskClarifierTaskCreateDraft = {
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

export type TaskClarifierSuggestedActionChange = {
  field: TaskClarifierTaskUpdateField;
  label: string;
  before: string;
  after: string;
};

export type TaskClarifierTaskUpdateAction = {
  type: 'task-update';
  id: string;
  title: string;
  description?: string;
  patch: TaskClarifierTaskUpdatePatch;
  changes: TaskClarifierSuggestedActionChange[];
};

export type TaskClarifierTaskCreateAction = {
  type: 'task-create';
  id: string;
  title: string;
  description?: string;
  tasks: TaskClarifierTaskCreateDraft[];
};

export type TaskClarifierSuggestedAction =
  | TaskClarifierTaskUpdateAction
  | TaskClarifierTaskCreateAction;

export type TaskClarifierMessage = {
  role: Extract<ChatMessage['role'], 'user' | 'assistant'>;
  content: string;
  suggestedActions?: TaskClarifierSuggestedAction[];
};

export type TaskClarifierProjectContext = {
  id: string;
  name: string;
  summary?: string;
  status?: string;
  priority?: string;
  tags: string[];
};

export type TaskClarifierTaskContext = {
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

export type TaskClarifierContext = {
  task: TaskClarifierTaskContext;
  project?: TaskClarifierProjectContext;
  relatedTasks: TaskClarifierTaskContext[];
};
