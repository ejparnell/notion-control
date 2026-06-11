export const VECTOR_INDEX_VERSION = 1;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [".md", ".mdx", ".txt"] as const;

export type SupportedDocumentExtension = (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number];

export type IngestionConfig = {
  cwd: string;
  documentsDir: string;
  vectorStoreDir: string;
  indexPath: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingBatchSize: number;
};

export type SourceDocument = {
  sourceId: string;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: SupportedDocumentExtension;
  rawContent: string;
  contentHash: string;
};

export type ParsedSection = {
  text: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
};

export type ParsedDocument = Omit<SourceDocument, "rawContent"> & {
  text: string;
  sections: ParsedSection[];
};

export type ChunkMetadata = {
  chunkId: string;
  sourceId: string;
  sourcePath: string;
  fileName: string;
  extension: SupportedDocumentExtension;
  contentHash: string;
  chunkIndex: number;
  headingPath: string[];
  startLine: number;
  endLine: number;
  createdAt: string;
};

export type DocumentChunk = {
  text: string;
  metadata: ChunkMetadata;
};

export type EmbeddingConfig = {
  model: string;
  dimensions: number;
  normalized: boolean;
};

export type Embedder = {
  model: string;
  normalized: boolean;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
};

export type IndexedDocument = {
  sourceId: string;
  path: string;
  fileName: string;
  extension: SupportedDocumentExtension;
  contentHash: string;
  chunkCount: number;
};

export type IndexedChunk = DocumentChunk & {
  embedding: number[];
};

export type VectorIndex = {
  version: typeof VECTOR_INDEX_VERSION;
  createdAt: string;
  embedding: EmbeddingConfig;
  chunking: {
    strategy: "heading-aware";
    chunkSize: number;
    chunkOverlap: number;
  };
  documents: IndexedDocument[];
  chunks: IndexedChunk[];
};

export type IngestionSummary = {
  documents: number;
  chunks: number;
  indexPath: string;
};
