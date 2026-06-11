import type { AgentAssigneeName } from "@/lib/constants";

export function agentGroupForValue(value: AgentAssigneeName | undefined) {
  return value ?? "Unassigned";
}
