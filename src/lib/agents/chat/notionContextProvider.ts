/**
 * Injects loaded Notion tasks / projects as a grounding system message.
 * Returns an empty array when neither tasks nor projects are present.
 */
import "server-only";

import type { ChatMessage, NotionContext } from "@/lib/types/chat";

export function buildNotionContextMessages(ctx: NotionContext): ChatMessage[] {
  const sections: string[] = [];

  if (ctx.tasks && ctx.tasks.length > 0) {
    const lines = ctx.tasks.map(
      (t) =>
        `- ${t.name} | status: ${t.status ?? "—"} | priority: ${t.priority ?? "—"} | due: ${t.dueDate ?? "—"} | project: ${t.project ?? "—"} | est: ${t.estTime != null ? `${t.estTime}h` : "—"}`
    );
    sections.push(`### Tasks (${ctx.tasks.length})\n${lines.join("\n")}`);
  }

  if (ctx.projects && ctx.projects.length > 0) {
    const lines = ctx.projects.map(
      (p) =>
        `- ${p.name} | status: ${p.status ?? "—"} | priority: ${p.priority ?? "—"} | tags: ${p.tags ?? "—"} | start: ${p.startDate ?? "—"} | est: ${p.estTime != null ? `${p.estTime}h` : "—"} | summary: ${p.summary}`
    );
    sections.push(`### Projects (${ctx.projects.length})\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return [];

  return [
    {
      role: "system",
      content: [
        "## Notion Context",
        "Use the following Notion data to answer questions about tasks and projects.",
        "Prefer these facts over assumptions.",
        "",
        ...sections,
      ].join("\n"),
    },
  ];
}
