import { NextResponse } from "next/server";
import {
  LocalMemorySourceError,
  readLocalMemorySourceDocument,
  type LocalMemorySourceErrorCode,
} from "@/lib/agents/rag/source-document";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourcePath = url.searchParams.get("path");

  if (!sourcePath) {
    return NextResponse.json(
      { error: "Missing source path." },
      { status: 400 }
    );
  }

  try {
    const document = await readLocalMemorySourceDocument(sourcePath);
    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof LocalMemorySourceError) {
      return NextResponse.json(
        { error: error.message },
        { status: statusForSourceError(error.code) }
      );
    }

    return NextResponse.json(
      { error: "Local memory source could not be opened." },
      { status: 500 }
    );
  }
}

function statusForSourceError(code: LocalMemorySourceErrorCode): number {
  if (code === "not_found") return 404;
  if (code === "too_large") return 413;
  if (code === "unreadable") return 500;
  return 400;
}
