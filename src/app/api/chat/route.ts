import { type NextRequest, NextResponse } from "next/server";
import { runChat } from "@/lib/agents/chat/graph";
import type { ChatMessage, LocalMemoryContext, NotionContext } from "@/lib/types/chat";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Parse body
  let body: {
    messages?: ChatMessage[];
    notionContext?: NotionContext;
    localMemoryContext?: LocalMemoryContext;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const { messages, notionContext, localMemoryContext } = body;

  // Validate messages
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.some(
      (m) => m.role === "user" && typeof m.content === "string" && m.content.trim().length > 0
    )
  ) {
    return NextResponse.json(
      { error: "Request must include at least one non-empty user message." },
      { status: 400 }
    );
  }

  // Orchestrate chat
  try {
    const result = await runChat({ messages, notionContext, localMemoryContext });
    return NextResponse.json({
      message: result.message,
      ...(result.sources !== undefined && { sources: result.sources }),
      ...(result.notionContext !== undefined && { notionContext: result.notionContext }),
      ...(result.localMemoryContext !== undefined && { localMemoryContext: result.localMemoryContext }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("DEEPSEEK_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error: DeepSeek API key is not set." },
        { status: 500 }
      );
    }

    if (message.includes("NOTION_DATABASE_ID") || message.includes("NOTION_API_KEY")) {
      return NextResponse.json(
        { error: `Notion configuration error: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Upstream error: ${message}` },
      { status: 502 }
    );
  }
}
