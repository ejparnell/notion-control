/**
 * Local file ingestion for the RAG pipeline.
 * Reads all .md / .mdx / .txt files from the repo-local `local-memory/` folder.
 * Per-request scan — no caching — so edits are always picked up immediately.
 */
import "server-only";

import fs from "fs/promises";
import path from "path";
import type { MemoryDocument } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEMORY_ROOT = path.join(process.cwd(), "local-memory");
const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const MAX_FILE_BYTES = 1_048_576; // 1 MB

const SKIP_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "_meta",
  "_sources",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function shouldSkipDir(name: string): boolean {
  return isHidden(name) || SKIP_NAMES.has(name);
}

/**
 * Derive a human-readable title from the file content or its filename.
 * Prefers the first Markdown heading; falls back to the filename stem.
 */
function deriveTitle(content: string, filePath: string): string {
  const headingMatch = content.match(/^#{1,3}\s+(.+)/m);
  if (headingMatch) return headingMatch[1].trim();
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, " ");
}

/**
 * Convert an absolute path to a repo-relative path using forward slashes.
 */
function toRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recursively scan `local-memory/` and return one MemoryDocument per file.
 * Returns an empty array if the folder does not exist.
 */
export async function loadLocalMemoryDocuments(): Promise<MemoryDocument[]> {
  try {
    await fs.access(MEMORY_ROOT);
  } catch {
    // Folder does not exist — treat as empty, not an error.
    return [];
  }

  const documents: MemoryDocument[] = [];
  await walk(MEMORY_ROOT, documents);
  return documents;
}

async function walk(dir: string, out: MemoryDocument[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (isHidden(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      await walk(fullPath, out);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    try {
      const stat = await fs.stat(fullPath);
      if (stat.size > MAX_FILE_BYTES) continue;

      const content = await fs.readFile(fullPath, "utf-8");
      const relativePath = toRelativePath(fullPath);

      out.push({
        path: relativePath,
        title: deriveTitle(content, relativePath),
        content,
      });
    } catch {
      // Skip files that cannot be read.
    }
  }
}
