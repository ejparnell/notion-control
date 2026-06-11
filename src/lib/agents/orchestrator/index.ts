import "server-only";

import { createChatCompletion } from "@/lib/agents/llm";
import { localMemoryContextProvider } from "@/lib/agents/chat/localMemoryContext";
import type { ChatMessage } from "@/lib/types/chat";
import {
  BACKEND_SPECIALIST_PROMPT,
  CODING_SPECIALIST_PROMPT,
  FRONTEND_SPECIALIST_PROMPT,
  PM_SYNTHESIS_PROMPT,
  buildAssignmentTargetContextMessage,
  buildSpecialistContextMessage,
} from "./prompts";
import { completionOptionsForMode } from "./model";
import { parsePmOutput, parseSpecialistOutput } from "./parser";
import type {
  AgentOrchestratorMessage,
  AgentOrchestratorModelMode,
  AgentOrchestratorAssignmentTarget,
  AgentOrchestratorSpecialist,
  AgentOrchestratorSpecialistNote,
} from "./types";

type RunAgentOrchestratorInput = {
  messages: AgentOrchestratorMessage[];
  modelMode: AgentOrchestratorModelMode;
  assignmentTargets: AgentOrchestratorAssignmentTarget[];
};

type RunAgentOrchestratorResult = {
  message: AgentOrchestratorMessage;
};

const specialistPrompts: Record<AgentOrchestratorSpecialist, string> = {
  frontend: FRONTEND_SPECIALIST_PROMPT,
  backend: BACKEND_SPECIALIST_PROMPT,
  coding: CODING_SPECIALIST_PROMPT,
};

export async function runAgentOrchestratorChat({
  messages,
  modelMode,
  assignmentTargets,
}: RunAgentOrchestratorInput): Promise<RunAgentOrchestratorResult> {
  const conversationMessages = toChatMessages(messages);
  const localMemory = await localMemoryContextProvider(
    {
      messages: buildRetrievalMessages(messages),
    },
    {
      presentation: "hidden",
    },
  );

  const modelOptions = completionOptionsForMode(modelMode);
  const specialistNotes = await Promise.all([
    runSpecialist("frontend", conversationMessages, localMemory.messages, modelOptions),
    runSpecialist("backend", conversationMessages, localMemory.messages, modelOptions),
    runSpecialist("coding", conversationMessages, localMemory.messages, modelOptions),
  ]);

  const pmResult = await createChatCompletion(
    [
      {
        role: "system",
        content: PM_SYNTHESIS_PROMPT,
      },
      ...localMemory.messages,
      ...conversationMessages,
      {
        role: "system",
        content: buildAssignmentTargetContextMessage(assignmentTargets),
      },
      {
        role: "system",
        content: buildSpecialistContextMessage(specialistNotes),
      },
    ],
    modelOptions,
  );

  const output = parsePmOutput(pmResult.message.content);

  return {
    message: {
      role: "assistant",
      content: output.content || "I have the specialist analysis ready, but the PM summary came back empty.",
      specialistNotes,
      suggestedActions: output.suggestedActions,
    },
  };
}

async function runSpecialist(
  agent: AgentOrchestratorSpecialist,
  conversationMessages: ChatMessage[],
  localMemoryMessages: ChatMessage[],
  modelOptions: ReturnType<typeof completionOptionsForMode>,
): Promise<AgentOrchestratorSpecialistNote> {
  const result = await createChatCompletion(
    [
      {
        role: "system",
        content: specialistPrompts[agent],
      },
      ...localMemoryMessages,
      ...conversationMessages,
    ],
    modelOptions,
  );

  const output = parseSpecialistOutput(result.message.content, agent);

  return {
    agent,
    title: output.title,
    content: output.content,
  };
}

function toChatMessages(messages: AgentOrchestratorMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({
    role,
    content,
  }));
}

function buildRetrievalMessages(messages: AgentOrchestratorMessage[]): ChatMessage[] {
  return messages
    .slice(-4)
    .map(({ role, content }) => ({ role, content }));
}
