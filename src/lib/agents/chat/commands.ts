/**
 * Slash command parsing for the chat graph.
 * Supported commands (exact match only):
 *   /tasks            – load tasks into context
 *   /tasks refresh    – re-fetch and replace task snapshot
 *   /tasks unload     – remove task context
 *   /projects         – load projects into context
 *   /projects refresh – re-fetch and replace project snapshot
 *   /projects unload  – remove project context
 *   /memory status    – show pinned and recent local-memory context
 *   /memory pin ...   – pin local-memory source(s) by path or known name
 *   /memory unpin ... – unpin local-memory source(s) by path or known name
 *   /memory clear     – clear pinned and recent local-memory context
 */

export type SlashCommand =
  | { type: "tasks"; action: "load" | "refresh" | "unload" }
  | { type: "projects"; action: "load" | "refresh" | "unload" }
  | { type: "memory"; action: "status" | "clear" }
  | { type: "memory"; action: "pin" | "unpin"; query: string }
  | { type: "unknown"; raw: string };

/**
 * Returns a parsed slash command if the trimmed content starts with `/`,
 * or `null` if it is not a slash command at all.
 */
export function parseSlashCommand(content: string): SlashCommand | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("/")) return null;

  switch (trimmed) {
    case "/tasks":
      return { type: "tasks", action: "load" };
    case "/tasks refresh":
      return { type: "tasks", action: "refresh" };
    case "/tasks unload":
      return { type: "tasks", action: "unload" };
    case "/projects":
      return { type: "projects", action: "load" };
    case "/projects refresh":
      return { type: "projects", action: "refresh" };
    case "/projects unload":
      return { type: "projects", action: "unload" };
    case "/memory status":
      return { type: "memory", action: "status" };
    case "/memory clear":
      return { type: "memory", action: "clear" };
    default:
      if (trimmed.startsWith("/memory pin ")) {
        return { type: "memory", action: "pin", query: trimmed.slice("/memory pin ".length).trim() };
      }

      if (trimmed.startsWith("/memory unpin ")) {
        return { type: "memory", action: "unpin", query: trimmed.slice("/memory unpin ".length).trim() };
      }

      return { type: "unknown", raw: trimmed };
  }
}
