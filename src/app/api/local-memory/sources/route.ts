import { NextResponse } from "next/server";

import { listLocalMemorySourceOptions } from "@/lib/agents/rag/local-memory-sources";
import { isRetrievalConfigurationError } from "@/lib/agents/rag/vector/retrieval";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sources = await listLocalMemorySourceOptions();

    return NextResponse.json({ sources });
  } catch (error) {
    if (isRetrievalConfigurationError(error)) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Local memory index is unavailable." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Local memory sources could not be loaded." },
      { status: 500 },
    );
  }
}
