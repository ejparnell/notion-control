/**
 * Local-memory RAG context provider for the chat graph.
 * Uses the vector index as the primary retriever and falls back to the legacy
 * lexical search when the generated index is missing, stale, or unavailable.
 */
import "server-only";

import type { ChatMessage, ChatSource, LocalMemoryCategory, LocalMemoryContext } from "@/lib/types/chat";
import type { RunChatInput } from "./graph";
import { normalizeLocalMemoryContext, updateLocalMemoryContext } from "./localMemoryState";
import { loadLocalMemoryDocuments } from "@/lib/agents/rag/local-memory";
import { chunkDocuments } from "@/lib/agents/rag/chunk";
import { searchChunks } from "@/lib/agents/rag/search";
import type { RetrievedMemoryChunk } from "@/lib/agents/rag/types";
import {
  categoriesFromSources,
  isRetrievalConfigurationError,
  retrieveRelevantChunks,
} from "@/lib/agents/rag/vector/retrieval";

export { normalizeLocalMemoryContext, updateLocalMemoryContext } from "./localMemoryState";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LocalMemoryContextResult {
  messages: ChatMessage[];
  sources: ChatSource[];
  localMemoryContext: LocalMemoryContext;
  retrievalMode: "vector" | "lexical" | "none";
}

type LocalMemoryContextProviderOptions = {
  presentation?: "cited" | "hidden";
  sourcePaths?: string[];
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Retrieves relevant local-memory chunks and returns a single system message
 * containing them as grounding context.
 * Returns empty messages when `local-memory/` is absent or no relevant chunks are found.
 */
export async function localMemoryContextProvider(
  input: RunChatInput,
  options: LocalMemoryContextProviderOptions = {}
): Promise<LocalMemoryContextResult> {
  const currentContext = normalizeLocalMemoryContext(input.localMemoryContext);
  const query = buildRetrievalQuery(input.messages);
  const presentation = options.presentation ?? "cited";
  const sourcePaths = uniqueStrings(options.sourcePaths ?? []);

  if (query.trim()) {
    try {
      const retrieved = await retrieveRelevantChunks(query, {
        localMemoryContext: currentContext,
        sourcePaths,
        ...(sourcePaths.length > 0 && {
          maxChunksPerSource: 8,
          minScore: 0,
        }),
      });

      if (retrieved.sources.length > 0) {
        const updatedContext = updateLocalMemoryContext(currentContext, retrieved.sources, retrieved.categories);

        return {
          messages: [
            {
              role: "system",
              content: buildVectorContextMessage(retrieved.context, presentation),
            },
          ],
          sources: retrieved.sources,
          localMemoryContext: updatedContext,
          retrievalMode: "vector",
        };
      }
    } catch (error) {
      if (!isRetrievalConfigurationError(error)) {
        throw error;
      }
      // The legacy lexical retriever keeps chat usable until the vector index is refreshed.
    }
  }

  const fallback = await retrieveLexicalContext(input.messages, sourcePaths);
  if (fallback.sources.length === 0) {
    return {
      messages: [],
      sources: [],
      localMemoryContext: currentContext,
      retrievalMode: "none",
    };
  }

  return {
    messages: [
      {
        role: "system",
        content: buildLexicalContextMessage(fallback.chunks, presentation),
      },
    ],
    sources: fallback.sources,
    localMemoryContext: updateLocalMemoryContext(currentContext, fallback.sources, fallback.categories),
    retrievalMode: "lexical",
  };
}

// ---------------------------------------------------------------------------
// Vector prompt assembly
// ---------------------------------------------------------------------------

function buildVectorContextMessage(
  context: string,
  presentation: LocalMemoryContextProviderOptions["presentation"]
): string {
  if (presentation === "hidden") {
    return [
      "## Local Memory Context",
      "Use the local-memory excerpts below as private grounding context.",
      "Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in the user-facing answer.",
      "If local memory does not contain enough information for a project, document, or personal-note answer, say what is missing instead of inventing details.",
      "",
      hideSourceMetadata(context),
    ].join("\n");
  }

  return [
    "## Local Memory Context",
    "Use the retrieved local-memory sources below as grounding context.",
    "Cite local-memory facts with source labels like [Source 1].",
    "If local memory does not contain enough information for a project, document, or personal-note answer, say what is missing instead of inventing details.",
    "",
    context,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Lexical fallback
// ---------------------------------------------------------------------------

async function retrieveLexicalContext(messages: ChatMessage[], sourcePaths: string[] = []): Promise<{
  chunks: RetrievedMemoryChunk[];
  sources: ChatSource[];
  categories: LocalMemoryCategory[];
}> {
  const allowedPaths = new Set(sourcePaths);
  const docs = (await loadLocalMemoryDocuments()).filter((document) =>
    allowedPaths.size === 0 || allowedPaths.has(document.path)
  );
  if (docs.length === 0) {
    return {
      chunks: [],
      sources: [],
      categories: [],
    };
  }

  const chunks = chunkDocuments(docs);
  if (chunks.length === 0) {
    return {
      chunks: [],
      sources: [],
      categories: [],
    };
  }

  const retrieved = searchChunks(chunks, messages);
  const sources = retrieved.map(toFallbackSource);

  return {
    chunks: retrieved,
    sources,
    categories: categoriesFromSources(sources.map((source) => source.sourcePath)),
  };
}

function buildLexicalContextMessage(
  chunks: RetrievedMemoryChunk[],
  presentation: LocalMemoryContextProviderOptions["presentation"]
): string {
  if (presentation === "hidden") {
    return [
      "## Local Memory Context",
      "Use the local-memory excerpts below as private grounding context.",
      "Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in the user-facing answer.",
      "If the answer is not found here, say what information is missing rather than inventing details.",
      "",
      chunks
        .map((chunk, index) => `Excerpt ${index + 1}:\n${chunk.content}`)
        .join("\n\n---\n\n"),
    ].join("\n");
  }

  // Group chunks by source path.
  const byPath = new Map<string, RetrievedMemoryChunk[]>();
  for (const chunk of chunks) {
    const list = byPath.get(chunk.path) ?? [];
    list.push(chunk);
    byPath.set(chunk.path, list);
  }

  const sections: string[] = [];
  let sourceIndex = 1;
  for (const [, pathChunks] of byPath) {
    for (const chunk of pathChunks) {
      sections.push(
        [
          `[Source ${sourceIndex}]`,
          `Document: ${chunk.path}`,
          `Chunk ID: ${chunk.id}`,
          `Content:\n${chunk.content}`,
        ].join("\n")
      );
      sourceIndex += 1;
    }
  }

  return [
    "## Local Memory Context",
    "Use the excerpts below as fallback grounding context. Prefer these facts over assumptions.",
    "Cite local-memory facts with source labels like [Source 1].",
    "If the answer is not found here, say what information is missing rather than inventing details.",
    "",
    sections.join("\n\n---\n\n"),
  ].join("\n");
}

function toFallbackSource(chunk: RetrievedMemoryChunk): ChatSource {
  return {
    chunkId: chunk.id,
    sourcePath: chunk.path,
    fileName: chunk.path.split("/").at(-1) ?? chunk.path,
    headingPath: [chunk.title],
    startLine: 1,
    endLine: 1,
    score: Math.round(chunk.score * 10_000) / 10_000,
    excerpt: createExcerpt(chunk.content),
  };
}

function buildRetrievalQuery(messages: ChatMessage[]): string {
  const nonSystem = messages.filter((message) => message.role !== "system");
  return nonSystem
    .slice(-4)
    .map((message) => message.content)
    .join("\n\n");
}

function hideSourceMetadata(context: string): string {
  const excerpts = [...context.matchAll(/Content:\n([\s\S]*?)(?=\n\n\[Source \d+\]|\s*$)/g)]
    .map((match) => match[1]?.trim())
    .filter((excerpt): excerpt is string => Boolean(excerpt));

  if (excerpts.length === 0) {
    return context;
  }

  return excerpts
    .map((excerpt, index) => `Excerpt ${index + 1}:\n${excerpt}`)
    .join("\n\n---\n\n");
}

function createExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= 280) {
    return normalized;
  }

  return `${normalized.slice(0, 277).trimEnd()}...`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
