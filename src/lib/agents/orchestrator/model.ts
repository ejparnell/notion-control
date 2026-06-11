import "server-only";

import type { ChatCompletionOptions } from "@/lib/agents/llm";
import type { AgentOrchestratorModelMode } from "./types";

const PRO_PLANNING_MODEL = "deepseek-v4-pro";
const CODING_PLANNING_MODEL = "deepseek-v4-pro";

export function resolveModelMode(value: unknown): AgentOrchestratorModelMode | null {
  if (value === undefined || value === null || value === "standard") {
    return "standard";
  }

  if (value === "pro-planning") {
    return "pro-planning";
  }

  if (value === "coding-planning") {
    return "coding-planning";
  }

  return null;
}

export function completionOptionsForMode(
  mode: AgentOrchestratorModelMode,
): ChatCompletionOptions {
  if (mode === "pro-planning" || mode === "coding-planning") {
    return {
      model: mode === "coding-planning"
        ? process.env.DEEPSEEK_CODING_MODEL ??
          process.env.DEEPSEEK_PRO_MODEL ??
          CODING_PLANNING_MODEL
        : process.env.DEEPSEEK_PRO_MODEL ?? PRO_PLANNING_MODEL,
      temperature: 0.25,
      thinking: { type: "enabled" },
      reasoningEffort: "high",
    };
  }

  return {
    temperature: 0.35,
  };
}
