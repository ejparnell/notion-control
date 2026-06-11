import { collectDocumentFiles } from "./collect";
import { createLocalEmbedder } from "./embeddings";
import { parseDocument } from "./parse";
import { chunkParsedDocuments } from "./split";
import { buildVectorIndex, writeVectorIndex } from "./store";
import type { Embedder, IngestionConfig, IngestionSummary } from "./types";

export class IngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionError";
  }
}

type IngestionDependencies = Partial<{
  embedder: Embedder;
  now: () => string;
}>;

export async function runDocumentIngestion(
  config: IngestionConfig,
  dependencies: IngestionDependencies = {}
): Promise<IngestionSummary> {
  const createdAt = dependencies.now?.() ?? new Date().toISOString();
  const sourceDocuments = await collectDocumentFiles(config);

  if (sourceDocuments.length === 0) {
    throw new IngestionError(`No Markdown or text documents found in ${config.documentsDir}.`);
  }

  const parsedDocuments = sourceDocuments.map(parseDocument);
  const chunks = await chunkParsedDocuments(parsedDocuments, {
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    createdAt,
  });

  if (chunks.length === 0) {
    throw new IngestionError("Documents were found, but no ingestible text chunks were produced.");
  }

  const embedder = dependencies.embedder ?? (await createLocalEmbedder(config.embeddingModel));
  const embeddings = await embedChunks(embedder, chunks.map((chunk) => chunk.text), config.embeddingBatchSize);
  const index = buildVectorIndex({
    config,
    createdAt,
    embeddingModel: embedder.model,
    normalized: embedder.normalized,
    documents: parsedDocuments,
    chunks,
    embeddings,
  });

  await writeVectorIndex(index, config.indexPath);

  return {
    documents: parsedDocuments.length,
    chunks: chunks.length,
    indexPath: config.indexPath,
  };
}

async function embedChunks(embedder: Embedder, texts: string[], batchSize: number): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    embeddings.push(...(await embedder.embedDocuments(texts.slice(index, index + batchSize))));
  }

  if (embeddings.length !== texts.length) {
    throw new IngestionError("Embedding count did not match chunk count.");
  }

  return embeddings;
}
