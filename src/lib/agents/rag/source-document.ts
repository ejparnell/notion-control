import fs from "node:fs/promises";
import path from "node:path";
import type { LocalMemorySourceDocument } from "@/lib/types/chat";
import { SUPPORTED_DOCUMENT_EXTENSIONS } from "./vector/types";

const DEFAULT_MEMORY_DIR = "local-memory";
const DEFAULT_MAX_FILE_BYTES = 1_048_576;
const supportedExtensions = new Set<string>(SUPPORTED_DOCUMENT_EXTENSIONS);

export type LocalMemorySourceErrorCode =
  | "invalid_path"
  | "not_found"
  | "too_large"
  | "unsupported_extension"
  | "unreadable";

export class LocalMemorySourceError extends Error {
  constructor(
    public readonly code: LocalMemorySourceErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LocalMemorySourceError";
  }
}

type ReadLocalMemorySourceOptions = Partial<{
  cwd: string;
  documentsDir: string;
  maxFileBytes: number;
}>;

export async function readLocalMemorySourceDocument(
  sourcePath: string,
  options: ReadLocalMemorySourceOptions = {}
): Promise<LocalMemorySourceDocument> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const documentsDir = options.documentsDir ?? DEFAULT_MEMORY_DIR;
  const documentsRoot = path.resolve(cwd, documentsDir);
  const normalizedPath = normalizeSourcePath(sourcePath, documentsDir);
  const absolutePath = path.resolve(cwd, normalizedPath);
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

  assertInsideDirectory(absolutePath, documentsRoot);

  let rootRealPath: string;
  let fileRealPath: string;
  let stat;

  try {
    rootRealPath = await fs.realpath(documentsRoot);
    fileRealPath = await fs.realpath(absolutePath);
    stat = await fs.stat(fileRealPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new LocalMemorySourceError("not_found", "Local memory source was not found.");
    }

    throw new LocalMemorySourceError("unreadable", "Local memory source could not be read.");
  }

  assertInsideDirectory(fileRealPath, rootRealPath);

  if (!stat.isFile()) {
    throw new LocalMemorySourceError("not_found", "Local memory source was not found.");
  }

  if (stat.size > maxFileBytes) {
    throw new LocalMemorySourceError("too_large", "Local memory source is too large to open.");
  }

  let content: string;
  try {
    content = await fs.readFile(fileRealPath, "utf8");
  } catch {
    throw new LocalMemorySourceError("unreadable", "Local memory source could not be read.");
  }

  return {
    sourcePath: normalizedPath,
    fileName: path.posix.basename(normalizedPath),
    content,
    lineCount: countLines(content),
  };
}

export function normalizeSourcePath(sourcePath: string, documentsDir = DEFAULT_MEMORY_DIR): string {
  const trimmed = sourcePath.trim();
  const normalizedDocumentsDir = toPosixPath(documentsDir).replace(/\/+$/, "");

  if (
    !trimmed ||
    trimmed.includes("\0") ||
    path.posix.isAbsolute(trimmed) ||
    path.win32.isAbsolute(trimmed)
  ) {
    throw new LocalMemorySourceError("invalid_path", "Source path must be a local-memory relative path.");
  }

  const posixPath = toPosixPath(trimmed);
  if (posixPath.split("/").includes("..")) {
    throw new LocalMemorySourceError("invalid_path", "Source path must not contain traversal segments.");
  }

  const normalizedPath = path.posix.normalize(posixPath);

  if (
    normalizedPath === "." ||
    normalizedPath === normalizedDocumentsDir ||
    normalizedPath.startsWith("../") ||
    !normalizedPath.startsWith(`${normalizedDocumentsDir}/`)
  ) {
    throw new LocalMemorySourceError("invalid_path", "Source path must stay inside local-memory.");
  }

  const extension = path.posix.extname(normalizedPath).toLowerCase();
  if (!supportedExtensions.has(extension)) {
    throw new LocalMemorySourceError("unsupported_extension", "Local memory source type is not supported.");
  }

  return normalizedPath;
}

function assertInsideDirectory(candidate: string, parent: string): void {
  const relative = path.relative(parent, candidate);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new LocalMemorySourceError("invalid_path", "Source path must stay inside local-memory.");
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/").replace(/\\/g, "/");
}

function countLines(content: string): number {
  if (!content) return 0;
  return content.split(/\r\n|\r|\n/).length;
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}
