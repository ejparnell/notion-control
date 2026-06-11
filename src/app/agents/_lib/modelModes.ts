import type { AgentOrchestratorModelMode } from "@/lib/agents/orchestrator/types";

export const modelModes: Array<{
  value: AgentOrchestratorModelMode;
  label: string;
}> = [
  { value: "standard", label: "Standard" },
  { value: "pro-planning", label: "Pro planning" },
  { value: "coding-planning", label: "Coding planning" },
];
