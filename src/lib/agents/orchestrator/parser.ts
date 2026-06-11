import "server-only";

import type {
  AgentOrchestratorSuggestedAction,
  AgentOrchestratorSpecialist,
  PmOutput,
  SpecialistOutput,
} from "./types";

export function parseSpecialistOutput(
  rawContent: string,
  agent: AgentOrchestratorSpecialist,
): SpecialistOutput {
  const parsed = parseAssistantResponseJson(rawContent);
  const fallbackTitle = specialistFallbackTitle(agent);

  if (isRecord(parsed) && typeof parsed.content === "string") {
    return {
      title: normalizeText(parsed.title, fallbackTitle),
      content: normalizeText(parsed.content, stripSourceReferences(rawContent)),
    };
  }

  return {
    title: fallbackTitle,
    content: stripSourceReferences(rawContent).trim(),
  };
}

export function parsePmOutput(rawContent: string): PmOutput {
  const parsed = parseAssistantResponseJson(rawContent);

  if (isRecord(parsed) && typeof parsed.content === "string") {
    const suggestedActions = Array.isArray(parsed.suggestedActions)
      ? (parsed.suggestedActions as AgentOrchestratorSuggestedAction[])
      : undefined;

    return {
      content: normalizeText(parsed.content, stripSourceReferences(rawContent)),
      ...(suggestedActions && { suggestedActions }),
    };
  }

  return {
    content: stripSourceReferences(rawContent).trim(),
  };
}

function specialistFallbackTitle(agent: AgentOrchestratorSpecialist) {
  if (agent === "frontend") {
    return "Frontend review";
  }

  if (agent === "backend") {
    return "Backend review";
  }

  return "Coding review";
}

function parseAssistantResponseJson(rawContent: string): unknown | null {
  const trimmedContent = rawContent.trim();

  try {
    return JSON.parse(trimmedContent);
  } catch {
    const fencedJson = extractFencedJson(trimmedContent);

    if (fencedJson) {
      try {
        return JSON.parse(fencedJson);
      } catch {
        return extractFirstJsonObject(trimmedContent);
      }
    }

    return extractFirstJsonObject(trimmedContent);
  }
}

function extractFencedJson(content: string) {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(content);

  return fenceMatch?.[1]?.trim() ?? null;
}

function extractFirstJsonObject(content: string): unknown | null {
  const startIndex = content.indexOf("{");

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(content.slice(startIndex, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback.trim();
  }

  const trimmed = stripSourceReferences(value).trim();
  return trimmed.length > 0 ? trimmed : fallback.trim();
}

function stripSourceReferences(content: string) {
  return content.replace(/\s*\[Source\s+\d+\]/gi, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
