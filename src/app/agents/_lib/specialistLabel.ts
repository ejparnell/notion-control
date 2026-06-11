import type { AgentOrchestratorSpecialistNote } from "@/lib/agents/orchestrator/types";

export function specialistLabel(agent: AgentOrchestratorSpecialistNote["agent"]) {
  if (agent === "frontend") {
    return "Frontend";
  }

  if (agent === "backend") {
    return "Backend";
  }

  return "Coding";
}
