import path from "node:path";
import type { IngestionConfig } from "./types";

export const DEFAULT_DOCUMENTS_DIR = "local-memory";
export const DEFAULT_VECTOR_STORE_DIR = "data/local-memory-vector-store";
export const DEFAULT_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_CHUNK_SIZE = 1_000;
export const DEFAULT_CHUNK_OVERLAP = 150;
export const DEFAULT_EMBEDDING_BATCH_SIZE = 16;
export const VECTOR_INDEX_FILE_NAME = "index.json";

type IngestionEnv = Partial<{
  LOCAL_MEMORY_DIR: string;
  DOCUMENTS_DIR: string;
  LOCAL_MEMORY_VECTOR_STORE_DIR: string;
  VECTOR_STORE_DIR: string;
  EMBEDDING_MODEL: string;
  CHUNK_SIZE: string;
  CHUNK_OVERLAP: string;
  EMBEDDING_BATCH_SIZE: string;
}>;

type ConfigOverrides = Partial<{
  cwd: string;
  documentsDir: string;
  vectorStoreDir: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingBatchSize: number;
}>;

export class IngestionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionConfigError";
  }
}

export function loadIngestionConfig(
  env: IngestionEnv = process.env as IngestionEnv,
  cwd = process.cwd()
): IngestionConfig {
  return createIngestionConfig({
    cwd,
    documentsDir:
      env.LOCAL_MEMORY_DIR?.trim() ||
      env.DOCUMENTS_DIR?.trim() ||
      DEFAULT_DOCUMENTS_DIR,
    vectorStoreDir:
      env.LOCAL_MEMORY_VECTOR_STORE_DIR?.trim() ||
      env.VECTOR_STORE_DIR?.trim() ||
      DEFAULT_VECTOR_STORE_DIR,
    embeddingModel: env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
    chunkSize: parsePositiveInteger("CHUNK_SIZE", env.CHUNK_SIZE, DEFAULT_CHUNK_SIZE),
    chunkOverlap: parsePositiveInteger("CHUNK_OVERLAP", env.CHUNK_OVERLAP, DEFAULT_CHUNK_OVERLAP),
    embeddingBatchSize: parsePositiveInteger(
      "EMBEDDING_BATCH_SIZE",
      env.EMBEDDING_BATCH_SIZE,
      DEFAULT_EMBEDDING_BATCH_SIZE
    ),
  });
}

export function createIngestionConfig(overrides: ConfigOverrides = {}): IngestionConfig {
  const cwd = overrides.cwd ?? process.cwd();
  const documentsDir = path.resolve(cwd, overrides.documentsDir ?? DEFAULT_DOCUMENTS_DIR);
  const vectorStoreDir = path.resolve(cwd, overrides.vectorStoreDir ?? DEFAULT_VECTOR_STORE_DIR);
  const chunkSize = assertPositiveInteger("chunkSize", overrides.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const chunkOverlap = assertPositiveInteger("chunkOverlap", overrides.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP);
  const embeddingBatchSize = assertPositiveInteger(
    "embeddingBatchSize",
    overrides.embeddingBatchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE
  );

  if (chunkOverlap >= chunkSize) {
    throw new IngestionConfigError("chunkOverlap must be less than chunkSize.");
  }

  return {
    cwd,
    documentsDir,
    vectorStoreDir,
    indexPath: path.join(vectorStoreDir, VECTOR_INDEX_FILE_NAME),
    embeddingModel: overrides.embeddingModel ?? DEFAULT_EMBEDDING_MODEL,
    chunkSize,
    chunkOverlap,
    embeddingBatchSize,
  };
}

function parsePositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new IngestionConfigError(`${name} must be a positive integer.`);
  }

  return assertPositiveInteger(name, Number(trimmed));
}

function assertPositiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new IngestionConfigError(`${name} must be a positive integer.`);
  }

  return value;
}
