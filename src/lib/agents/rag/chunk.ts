/**
 * Document chunking utilities for the RAG pipeline.
 * Splits MemoryDocuments into MemoryChunks that fit comfortably inside a prompt.
 */

import type { MemoryChunk, MemoryDocument } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_CHUNK_SIZE = 1_500; // characters — aim for the 1200-1800 range
const MIN_CHUNK_SIZE = 100; // discard whitespace-only or trivially small chunks

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split a single document into chunks.
 */
export function chunkDocument(doc: MemoryDocument): MemoryChunk[] {
  const raw = splitText(doc.content);
  return raw
    .filter((c) => c.trim().length >= MIN_CHUNK_SIZE)
    .map((content, chunkIndex) => ({
      id: `${doc.path}#chunk-${chunkIndex}`,
      path: doc.path,
      title: doc.title,
      chunkIndex,
      content: content.trim(),
    }));
}

/**
 * Chunk every document in the list.
 */
export function chunkDocuments(docs: MemoryDocument[]): MemoryChunk[] {
  return docs.flatMap(chunkDocument);
}

// ---------------------------------------------------------------------------
// Internal splitting logic
// ---------------------------------------------------------------------------

/**
 * Split `text` into segments of roughly TARGET_CHUNK_SIZE characters.
 * Priority order: paragraph boundary → line boundary → hard character split.
 */
function splitText(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= TARGET_CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }

    // Look for a paragraph boundary (blank line) within the window.
    const window = remaining.slice(0, TARGET_CHUNK_SIZE + 400);
    const paraBreak = findLastIndex(window, /\n\s*\n/g, TARGET_CHUNK_SIZE - 200, TARGET_CHUNK_SIZE + 400);

    if (paraBreak !== -1) {
      const match = /\n\s*\n/.exec(window.slice(paraBreak));
      const splitAt = paraBreak + (match ? match.index + match[0].length : 0);
      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
      continue;
    }

    // Fall back to a line boundary.
    const lineBreak = window.lastIndexOf("\n", TARGET_CHUNK_SIZE);
    if (lineBreak > TARGET_CHUNK_SIZE / 2) {
      chunks.push(remaining.slice(0, lineBreak + 1));
      remaining = remaining.slice(lineBreak + 1);
      continue;
    }

    // Hard character split at a word boundary if possible.
    const hardSplit = window.lastIndexOf(" ", TARGET_CHUNK_SIZE);
    const splitAt = hardSplit > TARGET_CHUNK_SIZE / 2 ? hardSplit + 1 : TARGET_CHUNK_SIZE;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  return chunks;
}

/**
 * Find the last regex match start index within [minPos, maxPos) of `text`.
 * Returns -1 if none found.
 */
function findLastIndex(text: string, re: RegExp, minPos: number, maxPos: number): number {
  let last = -1;
  const source = text.slice(0, maxPos);
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index >= minPos) last = m.index;
    re.lastIndex = m.index + 1;
  }
  return last;
}
