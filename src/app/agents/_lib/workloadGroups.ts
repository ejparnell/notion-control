import { agentAssigneeValues, type AgentAssigneeName } from "@/lib/constants";

export const workloadGroups: Array<AgentAssigneeName | "Unassigned"> = [
  ...agentAssigneeValues,
  "Unassigned",
];
