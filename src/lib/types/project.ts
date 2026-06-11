import {
  AgentAssigneeName,
  PriorityName,
  StatusName,
  TagName,
} from "@/lib/constants";

export interface ProjectInterface {
  id: string;
  name: string;
  summary?: string;
  status?: StatusName;
  priority?: PriorityName;
  tags?: TagName[];
  startDate?: Date;
  endDate?: Date;
  estTime?: number;
  assignedTo?: AgentAssigneeName;
}
