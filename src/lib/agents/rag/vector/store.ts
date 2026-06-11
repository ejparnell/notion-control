import fs from "node:fs/promises";
import path from "node:path";
import {
  VECTOR_INDEX_VERSION,
  type DocumentChunk,
  type IngestionConfig,
  type ParsedDocument,
  type VectorIndex,
} from "./types";

type BuildVectorIndexOptions = {
  config: IngestionConfig;
  createdAt: string;
  embeddingModel: string;
  normalized: boolean;
  documents: ParsedDocument[];
  chunks: DocumentChunk[];
  embeddings: number[][];
};

export class VectorIndexBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VectorIndexBuildError";
  }
}

export function buildVectorIndex(options: BuildVectorIndexOptions): VectorIndex {
  const dimensions = validateEmbeddings(options.chunks.length, options.embeddings);
  const chunkCountsBySourceId = countChunksBySourceId(options.chunks);

  return {
    version: VECTOR_INDEX_VERSION,
    createdAt: options.createdAt,
    embedding: {
      model: options.embeddingModel,
      dimensions,
      normalized: options.normalized,
    },
    chunking: {
      strategy: "heading-aware",
      chunkSize: options.config.chunkSize,
      chunkOverlap: options.config.chunkOverlap,
    },
    documents: options.documents.map((document) => ({
      sourceId: document.sourceId,
      path: document.relativePath,
      fileName: document.fileName,
      extension: document.extension,
      contentHash: document.contentHash,
      chunkCount: chunkCountsBySourceId.get(document.sourceId) ?? 0,
    })),
    chunks: options.chunks.map((chunk, index) => ({
      ...chunk,
      embedding: options.embeddings[index],
    })),
  };
}

export async function writeVectorIndex(index: VectorIndex, indexPath: string): Promise<void> {
  await fs.mkdir(path.dirname(indexPath), {
    recursive: true,
  });

  const temporaryPath = `${indexPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, indexPath);
}

function validateEmbeddings(chunkCount: number, embeddings: number[][]): number {
  if (embeddings.length !== chunkCount) {
    throw new VectorIndexBuildError(
      `Embedding count (${embeddings.length}) did not match chunk count (${chunkCount}).`
    );
  }

  const dimensions = embeddings[0]?.length ?? 0;

  if (dimensions <= 0) {
    throw new VectorIndexBuildError("Vector index requires at least one non-empty embedding.");
  }

  for (const embedding of embeddings) {
    if (embedding.length !== dimensions) {
      throw new VectorIndexBuildError("Vector index embeddings must all have the same dimensions.");
    }

    if (!embedding.every((value) => Number.isFinite(value))) {
      throw new VectorIndexBuildError("Vector index embeddings must contain only finite numbers.");
    }
  }

  return dimensions;
}

function countChunksBySourceId(chunks: DocumentChunk[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const chunk of chunks) {
    counts.set(chunk.metadata.sourceId, (counts.get(chunk.metadata.sourceId) ?? 0) + 1);
  }

  return counts;
}
