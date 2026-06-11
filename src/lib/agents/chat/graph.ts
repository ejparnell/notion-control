/**
 * Chat orchestration layer.
 * Owns system prompt injection, context assembly, and the call to the LLM adapter.
 * The route and the LLM adapter should not need to change as this layer grows.
 */
import "server-only";

import type { ChatMessage, ChatSource, LocalMemoryContext, NotionContext } from "@/lib/types/chat";
import { createChatCompletion } from "@/lib/agents/llm";
import { localMemoryContextProvider, normalizeLocalMemoryContext } from "./localMemoryContext";
import { buildNotionContextMessages } from "./notionContextProvider";
import { parseSlashCommand } from "./commands";
import { getTasks } from "@/lib/notion/db/tasks";
import { getProjects } from "@/lib/notion/db/projects";
import { resolveLocalMemorySources } from "@/lib/agents/rag/vector/retrieval";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunChatInput {
  messages: ChatMessage[];
  notionContext?: NotionContext;
  localMemoryContext?: LocalMemoryContext;
}

export interface RunChatResult {
  message: ChatMessage;
  notionContext?: NotionContext;
  localMemoryContext?: LocalMemoryContext;
  sources?: ChatSource[];
}

/**
 * A context provider can inject additional messages (e.g. Notion page content)
 * into the conversation before it reaches the LLM.
 * Return an empty array to contribute nothing.
 */
export type ChatContextProvider = (
  input: RunChatInput
) => Promise<ChatMessage[]> | ChatMessage[];

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Be concise and clear. " +
  "When local memory context is provided, prefer those facts over assumptions. " +
  "Cite local-memory facts with source labels like [Source 1] when sources are provided. " +
  "When Notion task or project context is provided, use it to answer questions about the user's work. " +
  "If local memory or Notion context does not contain enough information to answer fully, " +
  "state what is missing rather than inventing details.";

/**
 * Run the chat pipeline:
 *  1. Check the latest user message for an exact slash command; handle it without calling the LLM.
 *  2. Collect context messages from all registered providers.
 *  3. Prepend the system prompt, Notion context, then provider context.
 *  4. Append the conversation messages.
 *  5. Call the LLM adapter and return the assistant reply plus (optionally) updated notionContext.
 */
export async function runChat(input: RunChatInput): Promise<RunChatResult> {
  // Find the latest user message to check for slash commands.
  const latestUser = [...input.messages]
    .reverse()
    .find((m) => m.role === "user");

  if (latestUser) {
    const cmd = parseSlashCommand(latestUser.content);
    if (cmd !== null) {
      return handleSlashCommand(cmd, input.notionContext ?? {}, input.localMemoryContext);
    }
  }

  // Normal chat path
  const systemMessage: ChatMessage = {
    role: "system",
    content: DEFAULT_SYSTEM_PROMPT,
  };

  const notionMessages = input.notionContext
    ? buildNotionContextMessages(input.notionContext)
    : [];

  const localMemory = await localMemoryContextProvider(input);
  const contextMessages = localMemory.messages;

  const fullMessages: ChatMessage[] = [
    systemMessage,
    ...notionMessages,
    ...contextMessages,
    ...input.messages,
  ];

  const result = await createChatCompletion(fullMessages);
  const assistantMessage: ChatMessage = {
    ...result.message,
    ...(localMemory.sources.length > 0 && { sources: localMemory.sources }),
  };

  return {
    message: assistantMessage,
    sources: localMemory.sources,
    localMemoryContext: localMemory.localMemoryContext,
  };
}

// ---------------------------------------------------------------------------
// Slash command handler
// ---------------------------------------------------------------------------

async function handleSlashCommand(
  cmd: ReturnType<typeof parseSlashCommand>,
  currentCtx: NotionContext,
  currentLocalMemoryContext?: LocalMemoryContext
): Promise<RunChatResult> {
  if (!cmd) {
    return { message: { role: "assistant", content: "Unknown command." } };
  }

  if (cmd.type === "unknown") {
    return {
      message: {
        role: "assistant",
        content: `Unknown command: \`${cmd.raw}\`. Supported commands: /tasks, /tasks refresh, /tasks unload, /projects, /projects refresh, /projects unload, /memory status, /memory pin <source>, /memory unpin <source>, /memory clear.`,
      },
    };
  }

  if (cmd.type === "memory") {
    return handleMemoryCommand(cmd, normalizeLocalMemoryContext(currentLocalMemoryContext));
  }

  const updatedCtx: NotionContext = { ...currentCtx };

  if (cmd.type === "tasks") {
    if (cmd.action === "unload") {
      delete updatedCtx.tasks;
      return {
        message: { role: "assistant", content: "Task context unloaded." },
        notionContext: updatedCtx,
      };
    }
    const tasks = await getTasks();
    updatedCtx.tasks = tasks;
    const verb = cmd.action === "refresh" ? "Refreshed" : "Loaded";
    return {
      message: {
        role: "assistant",
        content: `${verb} ${tasks.length} task${tasks.length === 1 ? "" : "s"} into context.`,
      },
      notionContext: updatedCtx,
    };
  }

  

  // cmd.type === "projects"
  if (cmd.action === "unload") {
    delete updatedCtx.projects;
    return {
      message: { role: "assistant", content: "Project context unloaded." },
      notionContext: updatedCtx,
    };
  }
  const projects = await getProjects();
  updatedCtx.projects = projects;
  const verb = cmd.action === "refresh" ? "Refreshed" : "Loaded";
  return {
    message: {
      role: "assistant",
      content: `${verb} ${projects.length} project${projects.length === 1 ? "" : "s"} into context.`,
    },
    notionContext: updatedCtx,
  };
}

async function handleMemoryCommand(
  cmd: Extract<ReturnType<typeof parseSlashCommand>, { type: "memory" }>,
  currentCtx: LocalMemoryContext
): Promise<RunChatResult> {
  if (!cmd) {
    return { message: { role: "assistant", content: "Unknown memory command." } };
  }

  if (cmd.action === "status") {
    return {
      message: {
        role: "assistant",
        content: formatMemoryStatus(currentCtx),
      },
      localMemoryContext: currentCtx,
    };
  }

  if (cmd.action === "clear") {
    const cleared: LocalMemoryContext = {
      pinnedSourcePaths: [],
      lastSourcePaths: [],
      lastCategories: [],
    };

    return {
      message: { role: "assistant", content: "Local memory context cleared." },
      localMemoryContext: cleared,
    };
  }

  if (cmd.action !== "pin" && cmd.action !== "unpin") {
    return { message: { role: "assistant", content: "Unknown memory command." } };
  }

  const query = cmd.query;
  const matches: string[] = await resolveLocalMemorySources(query).catch((): string[] => []);

  if (matches.length === 0) {
    return {
      message: {
        role: "assistant",
        content: `No local-memory source matched \`${query}\`. Try a path like \`local-memory/contracts/scriti/brief.md\` or a known name like \`SCRITI\`, \`CMG\`, \`CRTMS\`, or \`resume\`.`,
      },
      localMemoryContext: currentCtx,
    };
  }

  const currentPins = currentCtx.pinnedSourcePaths ?? [];
  const nextPins =
    cmd.action === "pin"
      ? [...new Set([...currentPins, ...matches])]
      : currentPins.filter((sourcePath) => !matches.includes(sourcePath));
  const nextCtx: LocalMemoryContext = {
    ...currentCtx,
    pinnedSourcePaths: nextPins,
  };
  const verb = cmd.action === "pin" ? "Pinned" : "Unpinned";

  return {
    message: {
      role: "assistant",
      content: `${verb} ${matches.length} local-memory source${matches.length === 1 ? "" : "s"}:\n${matches
        .map((sourcePath) => `- ${sourcePath}`)
        .join("\n")}`,
    },
    localMemoryContext: nextCtx,
  };
}

function formatMemoryStatus(context: LocalMemoryContext): string {
  const pinned = context.pinnedSourcePaths ?? [];
  const recent = context.lastSourcePaths ?? [];
  const categories = context.lastCategories ?? [];

  return [
    "Local memory status:",
    "",
    pinned.length ? `Pinned sources:\n${pinned.map((sourcePath) => `- ${sourcePath}`).join("\n")}` : "Pinned sources: none",
    "",
    recent.length ? `Recent sources:\n${recent.map((sourcePath) => `- ${sourcePath}`).join("\n")}` : "Recent sources: none",
    "",
    categories.length ? `Recent categories: ${categories.join(", ")}` : "Recent categories: none",
  ].join("\n");
}
