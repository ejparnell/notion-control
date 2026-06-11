import fs from "node:fs/promises";
import { collectDocumentFiles } from "./collect";
import { loadIngestionConfig } from "./config";
import { createLocalEmbedder } from "./embeddings";
import {
  VECTOR_INDEX_VERSION,
  type Embedder,
  type IndexedChunk,
  type VectorIndex,
} from "./types";
import type { ChatSource, LocalMemoryCategory, LocalMemoryContext } from "@/lib/types/chat";

export const DEFAULT_RETRIEVAL_TOP_K = 8;
export const DEFAULT_RETRIEVAL_CONTEXT_CHAR_BUDGET = 8_000;
export const DEFAULT_RETRIEVAL_MIN_SCORE = 0.32;
export const DEFAULT_RETRIEVAL_KEYWORD_WEIGHT = 0.35;
export const DEFAULT_SOURCE_EXCERPT_CHARS = 280;
export const DEFAULT_MAX_CHUNKS_PER_SOURCE = 4;

export type RetrievedChunk = {
  source: ChatSource;
  text: string;
};

export type RetrievalResult = {
  sources: ChatSource[];
  context: string;
  categories: LocalMemoryCategory[];
};

type RetrieveRelevantChunksOptions = Partial<{
  index: VectorIndex;
  indexPath: string;
  embedder: Embedder;
  topK: number;
  contextCharBudget: number;
  minScore: number;
  keywordWeight: number;
  maxChunksPerSource: number;
  localMemoryContext: LocalMemoryContext;
  sourcePaths: string[];
  checkStale: boolean;
}>;

type CachedIndex = {
  indexPath: string;
  mtimeMs: number;
  index: VectorIndex;
};

type QueryHints = {
  categories: Set<LocalMemoryCategory>;
  sourcePaths: Set<string>;
  isFollowUp: boolean;
};

const embedderCache = new Map<string, Promise<Embedder>>();
let cachedIndex: CachedIndex | null = null;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "with",
]);

const SOURCE_ALIASES: Array<{
  pattern: RegExp;
  sourcePaths: string[];
  categories: LocalMemoryCategory[];
}> = [
  {
    pattern: /\b(scriti|spectrum clinical research investigator training institute)\b/i,
    sourcePaths: ["local-memory/contracts/scriti/brief.md"],
    categories: ["contracts"],
  },
  {
    pattern: /\b(cmg|clinmatchgo|clinical match go)\b/i,
    sourcePaths: [
      "local-memory/projects/clinmatchgo/brief.md",
      "local-memory/contracts/clinmatchgo/brief.md",
    ],
    categories: ["projects"],
  },
  {
    pattern: /\bcrtms\b/i,
    sourcePaths: [
      "local-memory/projects/crtms/brief.md",
      "local-memory/contracts/crtms/brief.md",
    ],
    categories: ["projects"],
  },
  {
    pattern: /\b(resume|wayfair|general assembly|break through tech|cornell)\b/i,
    sourcePaths: ["local-memory/personal-notes/resume/master-resume.md"],
    categories: ["personal-notes"],
  },
  {
    pattern: /\b(next\.?js|nextjs|app router|route handler|route handlers)\b/i,
    sourcePaths: [],
    categories: ["technologies"],
  },
  {
    pattern: /\b(mongoose|mongodb)\b/i,
    sourcePaths: [],
    categories: ["technologies"],
  },
];

export class RetrievalConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetrievalConfigurationError";
  }
}

export class MissingVectorIndexError extends RetrievalConfigurationError {
  constructor(indexPath: string) {
    super(`Vector index not found at ${indexPath}. Run npm run rag:ingest before asking local-memory questions.`);
    this.name = "MissingVectorIndexError";
  }
}

export class StaleVectorIndexError extends RetrievalConfigurationError {
  constructor(indexPath: string) {
    super(`Vector index at ${indexPath} is stale. Run npm run rag:ingest to refresh local-memory embeddings.`);
    this.name = "StaleVectorIndexError";
  }
}

export class VectorIndexValidationError extends RetrievalConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "VectorIndexValidationError";
  }
}

export async function retrieveRelevantChunks(
  query: string,
  options: RetrieveRelevantChunksOptions = {}
): Promise<RetrievalResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      sources: [],
      context: "",
      categories: [],
    };
  }

  const config = loadIngestionConfig();
  const indexPath = options.indexPath ?? config.indexPath;
  const index = options.index ?? (await loadVectorIndex(indexPath));
  validateVectorIndex(index);

  if (!options.index && options.checkStale !== false && (await isVectorIndexStale(index, config))) {
    throw new StaleVectorIndexError(indexPath);
  }

  const embedder = options.embedder ?? (await getCachedEmbedder(index.embedding.model));
  const queryEmbedding = await embedder.embedQuery(trimmedQuery);

  if (queryEmbedding.length !== index.embedding.dimensions) {
    throw new VectorIndexValidationError(
      `Question embedding has ${queryEmbedding.length} dimensions, but the vector index expects ${index.embedding.dimensions}. Re-run npm run rag:ingest with the current embedding model.`
    );
  }

  const hints = detectQueryHints(trimmedQuery, options.localMemoryContext);
  const keywordWeight = options.keywordWeight ?? DEFAULT_RETRIEVAL_KEYWORD_WEIGHT;
  const requestedSourcePaths = new Set(options.sourcePaths ?? []);
  const chunks = requestedSourcePaths.size > 0
    ? index.chunks.filter((chunk) => requestedSourcePaths.has(chunk.metadata.sourcePath))
    : index.chunks;
  const rankedChunks = chunks
    .map((chunk) => {
      const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      const keywordScore = keywordRelevance(trimmedQuery, chunk);
      const routingScore = routingRelevance(chunk, hints, options.localMemoryContext);

      return {
        chunk,
        score: combineScores(vectorScore, keywordScore, keywordWeight) + routingScore,
        vectorScore,
      };
    })
    .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.vectorScore))
    .sort((left, right) => right.score - left.score);

  const selectedChunks = selectChunksWithinBudget(rankedChunks, {
    topK: options.topK ?? DEFAULT_RETRIEVAL_TOP_K,
    contextCharBudget: options.contextCharBudget ?? DEFAULT_RETRIEVAL_CONTEXT_CHAR_BUDGET,
    minScore: options.minScore ?? DEFAULT_RETRIEVAL_MIN_SCORE,
    maxChunksPerSource: options.maxChunksPerSource ?? DEFAULT_MAX_CHUNKS_PER_SOURCE,
  });

  return {
    sources: selectedChunks.map((chunk) => chunk.source),
    context: formatRetrievedContext(selectedChunks),
    categories: categoriesFromSources(selectedChunks.map((chunk) => chunk.source.sourcePath)),
  };
}

export async function loadVectorIndex(indexPath = loadIngestionConfig().indexPath): Promise<VectorIndex> {
  let stat;

  try {
    stat = await fs.stat(indexPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new MissingVectorIndexError(indexPath);
    }

    throw error;
  }

  if (cachedIndex?.indexPath === indexPath && cachedIndex.mtimeMs === stat.mtimeMs) {
    return cachedIndex.index;
  }

  const raw = await fs.readFile(indexPath, "utf8");
  const parsed = JSON.parse(raw) as VectorIndex;

  validateVectorIndex(parsed);
  cachedIndex = {
    indexPath,
    mtimeMs: stat.mtimeMs,
    index: parsed,
  };

  return parsed;
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    throw new VectorIndexValidationError(
      `Cannot compare embeddings with different dimensions: ${left.length} and ${right.length}.`
    );
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const heading = chunk.source.headingPath.join(" > ");

      return [
        `[Source ${index + 1}]`,
        `Document: ${chunk.source.sourcePath}`,
        heading ? `Heading: ${heading}` : null,
        `Lines: ${chunk.source.startLine}-${chunk.source.endLine}`,
        `Chunk ID: ${chunk.source.chunkId}`,
        `Content:\n${chunk.text}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
    })
    .join("\n\n");
}

export function isRetrievalConfigurationError(error: unknown): error is RetrievalConfigurationError {
  return (
    error instanceof RetrievalConfigurationError ||
    (error as Error | undefined)?.name === "RetrievalConfigurationError" ||
    (error as Error | undefined)?.name === "MissingVectorIndexError" ||
    (error as Error | undefined)?.name === "StaleVectorIndexError" ||
    (error as Error | undefined)?.name === "VectorIndexValidationError"
  );
}

export function getCategoryForSourcePath(sourcePath: string): LocalMemoryCategory {
  const normalized = sourcePath.toLowerCase();

  if (normalized.includes("/contracts/")) return "contracts";
  if (normalized.includes("/projects/")) return "projects";
  if (normalized.includes("/technologies/")) return "technologies";
  if (normalized.includes("/personal-notes/")) return "personal-notes";

  return "other";
}

export function categoriesFromSources(sourcePaths: string[]): LocalMemoryCategory[] {
  return [...new Set(sourcePaths.map(getCategoryForSourcePath))];
}

export function detectQueryHints(
  query: string,
  localMemoryContext: LocalMemoryContext = {}
): QueryHints {
  const sourcePaths = new Set<string>();
  const categories = new Set<LocalMemoryCategory>();
  const lowerQuery = query.toLowerCase();

  if (/\b(contract|agreement|sow|statement of work|scope|retainer|billable|billing|teach|teaching|hours|out[-\s]?of[-\s]?scope)\b/i.test(query)) {
    categories.add("contracts");
  }

  if (/\b(project|platform|app|product|cmg|clinmatchgo|crtms)\b/i.test(query)) {
    categories.add("projects");
  }

  if (/\b(next\.?js|nextjs|mongoose|mongodb|api|route handler|component|react)\b/i.test(query)) {
    categories.add("technologies");
  }

  if (/\b(resume|experience|job|wayfair|skills|career|background)\b/i.test(query)) {
    categories.add("personal-notes");
  }

  for (const alias of SOURCE_ALIASES) {
    if (!alias.pattern.test(query)) {
      continue;
    }

    for (const sourcePath of alias.sourcePaths) {
      sourcePaths.add(sourcePath);
    }

    for (const category of alias.categories) {
      categories.add(category);
    }
  }

  for (const pinnedPath of localMemoryContext.pinnedSourcePaths ?? []) {
    if (lowerQuery.includes(pinnedPath.toLowerCase())) {
      sourcePaths.add(pinnedPath);
    }
  }

  return {
    categories,
    sourcePaths,
    isFollowUp: /\b(that|this|it|its|they|them|there|same|previous|above)\b/i.test(query),
  };
}

export async function resolveLocalMemorySources(
  query: string,
  options: Pick<RetrieveRelevantChunksOptions, "index" | "indexPath"> = {}
): Promise<string[]> {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return [];
  }

  const indexPath = options.indexPath ?? loadIngestionConfig().indexPath;
  const index = options.index ?? (await loadVectorIndex(indexPath));
  const hints = detectQueryHints(query);
  const directMatches = index.documents
    .map((document) => document.path)
    .filter((sourcePath) => {
      const normalized = sourcePath.toLowerCase();
      const fileName = normalized.split("/").at(-1) ?? normalized;
      return normalized.includes(trimmed) || fileName.includes(trimmed.replace(/\s+/g, "-"));
    });

  return [...new Set([...hints.sourcePaths, ...directMatches])].filter((sourcePath) =>
    index.documents.some((document) => document.path === sourcePath)
  );
}

function combineScores(vectorScore: number, keywordScore: number, keywordWeight: number): number {
  const boundedKeywordWeight = Math.min(1, Math.max(0, keywordWeight));
  const vectorWeight = 1 - boundedKeywordWeight;

  return vectorScore * vectorWeight + keywordScore * boundedKeywordWeight;
}

function keywordRelevance(query: string, chunk: IndexedChunk): number {
  const queryTokens = uniqueTokens(tokenizeSearchText(query));

  if (queryTokens.length === 0) {
    return 0;
  }

  const textTokens = new Set(tokenizeSearchText(chunk.text));
  const metadataTokens = new Set(
    tokenizeSearchText([
      chunk.metadata.sourcePath,
      chunk.metadata.fileName,
      ...chunk.metadata.headingPath,
    ].join(" "))
  );
  const weightedMatches = queryTokens.reduce((total, token) => {
    if (metadataTokens.has(token)) {
      return total + 1.4;
    }

    if (textTokens.has(token)) {
      return total + 1;
    }

    return total;
  }, 0);
  const tokenScore = weightedMatches / (queryTokens.length * 1.4);
  const phraseScore = phraseRelevance(queryTokens, [...metadataTokens, ...textTokens]);

  return Math.min(1, tokenScore * 0.75 + phraseScore * 0.25);
}

function routingRelevance(
  chunk: IndexedChunk,
  hints: QueryHints,
  localMemoryContext: LocalMemoryContext = {}
): number {
  let score = 0;
  const sourcePath = chunk.metadata.sourcePath;
  const category = getCategoryForSourcePath(sourcePath);

  if (hints.sourcePaths.has(sourcePath)) {
    score += 0.5;
  }

  if (hints.categories.has(category)) {
    score += 0.18;
  }

  if (localMemoryContext.pinnedSourcePaths?.includes(sourcePath)) {
    score += 0.35;
  }

  if (hints.isFollowUp && localMemoryContext.lastSourcePaths?.includes(sourcePath)) {
    score += 0.32;
  }

  if (hints.isFollowUp && localMemoryContext.lastCategories?.includes(category)) {
    score += 0.12;
  }

  return score;
}

function phraseRelevance(queryTokens: string[], corpusTokens: string[]): number {
  const queryBigrams = createBigrams(queryTokens);

  if (queryBigrams.length === 0) {
    return 0;
  }

  const corpusBigrams = new Set(createBigrams(corpusTokens));
  const matches = queryBigrams.filter((bigram) => corpusBigrams.has(bigram)).length;

  return matches / queryBigrams.length;
}

function createBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return bigrams;
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function tokenizeSearchText(value: string): string[] {
  return (
    value
      .toLowerCase()
      .replace(/\bnext\.?js\b/g, "next js")
      .match(/[a-z0-9]+/g)
      ?.map(normalizeSearchToken)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)) ?? []
  );
}

function normalizeSearchToken(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.length > 3 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

function selectChunksWithinBudget(
  rankedChunks: Array<{ chunk: IndexedChunk; score: number; vectorScore: number }>,
  options: {
    topK: number;
    contextCharBudget: number;
    minScore: number;
    maxChunksPerSource: number;
  }
): RetrievedChunk[] {
  const selectedChunks: RetrievedChunk[] = [];
  const chunksBySource = new Map<string, number>();
  let usedCharacters = 0;

  for (const item of rankedChunks) {
    if (selectedChunks.length >= options.topK || usedCharacters >= options.contextCharBudget) {
      break;
    }

    if (item.score < options.minScore) {
      continue;
    }

    const sourceCount = chunksBySource.get(item.chunk.metadata.sourcePath) ?? 0;
    if (sourceCount >= options.maxChunksPerSource) {
      continue;
    }

    const remainingCharacters = options.contextCharBudget - usedCharacters;
    const selectedText =
      item.chunk.text.length > remainingCharacters
        ? item.chunk.text.slice(0, remainingCharacters).trim()
        : item.chunk.text;

    if (!selectedText) {
      continue;
    }

    selectedChunks.push({
      text: selectedText,
      source: toChatSource(item.chunk, item.score),
    });
    chunksBySource.set(item.chunk.metadata.sourcePath, sourceCount + 1);
    usedCharacters += selectedText.length;
  }

  return selectedChunks;
}

function toChatSource(chunk: IndexedChunk, score: number): ChatSource {
  return {
    chunkId: chunk.metadata.chunkId,
    sourcePath: chunk.metadata.sourcePath,
    fileName: chunk.metadata.fileName,
    headingPath: chunk.metadata.headingPath,
    startLine: chunk.metadata.startLine,
    endLine: chunk.metadata.endLine,
    score: roundScore(score),
    excerpt: createExcerpt(chunk.text),
  };
}

function createExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= DEFAULT_SOURCE_EXCERPT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, DEFAULT_SOURCE_EXCERPT_CHARS - 3).trimEnd()}...`;
}

function roundScore(score: number): number {
  return Math.round(score * 10_000) / 10_000;
}

function getCachedEmbedder(model: string): Promise<Embedder> {
  const cached = embedderCache.get(model);

  if (cached) {
    return cached;
  }

  const created = createLocalEmbedder(model);
  embedderCache.set(model, created);
  return created;
}

function validateVectorIndex(index: VectorIndex): void {
  if (index.version !== VECTOR_INDEX_VERSION) {
    throw new VectorIndexValidationError("Vector index version is not supported. Re-run npm run rag:ingest.");
  }

  if (!Number.isInteger(index.embedding?.dimensions) || index.embedding.dimensions <= 0) {
    throw new VectorIndexValidationError("Vector index embedding metadata is invalid. Re-run npm run rag:ingest.");
  }

  if (!Array.isArray(index.documents)) {
    throw new VectorIndexValidationError("Vector index documents are invalid. Re-run npm run rag:ingest.");
  }

  if (!Array.isArray(index.chunks)) {
    throw new VectorIndexValidationError("Vector index chunks are invalid. Re-run npm run rag:ingest.");
  }

  for (const chunk of index.chunks) {
    if (!Array.isArray(chunk.embedding) || chunk.embedding.length !== index.embedding.dimensions) {
      throw new VectorIndexValidationError(
        "Vector index contains chunk embeddings with unexpected dimensions. Re-run npm run rag:ingest."
      );
    }
  }
}

async function isVectorIndexStale(index: VectorIndex, config = loadIngestionConfig()): Promise<boolean> {
  const documents = await collectDocumentFiles(config);
  const currentHashesByPath = new Map(documents.map((document) => [document.relativePath, document.contentHash]));

  if (currentHashesByPath.size !== index.documents.length) {
    return true;
  }

  return index.documents.some((document) => currentHashesByPath.get(document.path) !== document.contentHash);
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}
