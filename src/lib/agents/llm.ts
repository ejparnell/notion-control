/**
 * Server-only DeepSeek provider adapter.
 * Sends exactly the messages it receives — no system prompt injection, no assembly.
 * Do not import this module from client components.
 */
import "server-only";

import type { ChatMessage } from "@/lib/types/chat";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  thinking?: { type: "enabled" | "disabled" };
  reasoningEffort?: "low" | "medium" | "high";
}

export interface ChatCompletionResult {
  message: ChatMessage;
}

/**
 * Send `messages` to DeepSeek and return the first assistant reply.
 * The caller is responsible for including any system prompt in `messages`.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set.");
  }

  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.7;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
      ...(options.thinking && { thinking: options.thinking }),
      ...(options.reasoningEffort && {
        reasoning_effort: options.reasoningEffort,
      }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { role: string; content: string } }>;
  };

  const choice = data.choices?.[0]?.message;
  if (!choice) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return {
    message: { role: "assistant", content: choice.content },
  };
}
