import type {
  AgentAssigneeName,
  PriorityName,
  StatusName,
  TagName,
} from '@/lib/constants';

export interface TaskInterface {
  id: string;
  name: string;
  description?: string;
  status?: StatusName;
  dueDate?: Date;
  priority?: PriorityName;
  tags?: TagName[];
  project?: string;
  completedOn?: Date;
  estTime?: number;
  assignedTo?: AgentAssigneeName;
  acceptanceCriteria?: string[];
  testingCriteria?: string[];
  implementationPlan?: string[];
}
