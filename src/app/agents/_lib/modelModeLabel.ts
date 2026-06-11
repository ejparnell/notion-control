import { modelModes } from "./modelModes";
import type { AgentOrchestratorModelMode } from "@/lib/agents/orchestrator/types";

export function modelModeLabel(mode: AgentOrchestratorModelMode) {
  return modelModes.find(item => item.value === mode)?.label ?? mode;
}
