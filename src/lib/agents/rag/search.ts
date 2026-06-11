/**
 * Lexical retrieval for the local-memory RAG pipeline.
 * No embeddings or external dependencies — pure token-overlap scoring.
 */

import type {
  LocalMemorySearchOptions,
  MemoryChunk,
  RetrievedMemoryChunk,
} from "./types";
import type { ChatMessage } from "@/lib/types/chat";

// ---------------------------------------------------------------------------
// Stop words
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "its", "be", "as", "was",
  "are", "were", "has", "have", "had", "do", "does", "did", "will",
  "would", "could", "should", "can", "that", "this", "which", "what",
  "how", "when", "where", "who", "i", "me", "my", "we", "you", "your",
  "he", "she", "they", "them", "their", "not", "no", "if", "so",
]);

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: LocalMemorySearchOptions = {
  maxChunks: 5,
  maxCharsPerChunk: 1_800,
  maxTotalChars: 7_000,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search `chunks` for content relevant to `messages` and return the
 * top results, ordered by descending score, respecting the character budgets.
 *
 * @param chunks   Pre-chunked memory documents.
 * @param messages The current conversation (latest message last).
 * @param options  Override defaults.
 */
export function searchChunks(
  chunks: MemoryChunk[],
  messages: ChatMessage[],
  options: Partial<LocalMemorySearchOptions> = {}
): RetrievedMemoryChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const queryTokens = buildQueryTokens(messages);
  const rawQuery = buildRawQuery(messages);

  if (queryTokens.size === 0) return [];

  const scored: RetrievedMemoryChunk[] = chunks.map((chunk, index) =>
    scoreChunk(chunk, queryTokens, rawQuery, index, chunks.length)
  );

  // Sort descending by score, then by original order for ties.
  scored.sort((a, b) => b.score - a.score || 0);

  // Apply budgets.
  const results: RetrievedMemoryChunk[] = [];
  let totalChars = 0;

  for (const chunk of scored) {
    if (chunk.score <= 0) break;
    if (results.length >= opts.maxChunks) break;
    if (totalChars >= opts.maxTotalChars) break;

    const truncated = chunk.content.slice(0, opts.maxCharsPerChunk);
    totalChars += truncated.length;
    if (totalChars > opts.maxTotalChars) break;

    results.push({ ...chunk, content: truncated });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

/**
 * Build a token set from the latest user message plus the last few
 * user/assistant turns for broader context.
 */
function buildQueryTokens(messages: ChatMessage[]): Set<string> {
  const relevant = selectRelevantMessages(messages);
  const text = relevant.map((m) => m.content).join(" ");
  return tokenize(text);
}

function buildRawQuery(messages: ChatMessage[]): string {
  return selectRelevantMessages(messages)
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
}

function selectRelevantMessages(messages: ChatMessage[]): ChatMessage[] {
  // Latest user message + up to 3 preceding messages, skip system messages.
  const nonSystem = messages.filter((m) => m.role !== "system");
  return nonSystem.slice(-4);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreChunk(
  chunk: MemoryChunk,
  queryTokens: Set<string>,
  rawQuery: string,
  index: number,
  total: number
): RetrievedMemoryChunk {
  const contentTokens = tokenize(chunk.content);
  const titleTokens = tokenize(chunk.title);
  const pathTokens = tokenize(chunk.path.replace(/[/._-]/g, " "));

  // Base: proportion of query tokens present in content.
  let score = 0;
  let overlap = 0;
  for (const t of queryTokens) {
    if (contentTokens.has(t)) overlap++;
  }
  if (queryTokens.size > 0) {
    score += (overlap / queryTokens.size) * 10;
  }

  // Title match bonus.
  let titleOverlap = 0;
  for (const t of queryTokens) {
    if (titleTokens.has(t)) titleOverlap++;
  }
  score += titleOverlap * 2;

  // Path match bonus.
  let pathOverlap = 0;
  for (const t of queryTokens) {
    if (pathTokens.has(t)) pathOverlap++;
  }
  score += pathOverlap * 1.5;

  // Exact phrase bonus: check 3+ character query terms in raw content.
  const rawContent = chunk.content.toLowerCase();
  for (const t of queryTokens) {
    if (t.length >= 3 && rawContent.includes(t) && rawQuery.includes(t)) {
      score += 1.5;
    }
  }

  // Light tie-breaking: slightly prefer earlier chunks (order-neutral for large sets).
  if (total > 0) {
    score += (1 - index / total) * 0.1;
  }

  return { ...chunk, score };
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
  );
}
