/**
 * Shared RAG types for the local-memory retrieval pipeline.
 */

/** A raw document loaded from the local-memory folder. */
export interface MemoryDocument {
  /** Relative path from the repo root, e.g. `local-memory/project/foo.md` */
  path: string;
  /** Derived from the first heading or filename. */
  title: string;
  /** Full UTF-8 text of the file. */
  content: string;
}

/** A single chunk produced by splitting a MemoryDocument. */
export interface MemoryChunk {
  /** Stable identifier: `<path>#chunk-<chunkIndex>` */
  id: string;
  path: string;
  title: string;
  chunkIndex: number;
  content: string;
}

/** A chunk with a relevance score from the lexical search. */
export interface RetrievedMemoryChunk extends MemoryChunk {
  score: number;
}

/** Tuning knobs for retrieval. */
export interface LocalMemorySearchOptions {
  /** Maximum number of chunks to return. Default: 5 */
  maxChunks: number;
  /** Truncate each chunk to this many characters before injecting. Default: 1800 */
  maxCharsPerChunk: number;
  /** Hard cap on total injected characters across all chunks. Default: 7000 */
  maxTotalChars: number;
}
