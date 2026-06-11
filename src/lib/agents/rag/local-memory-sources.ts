import "server-only";

import { loadVectorIndex } from "@/lib/agents/rag/vector/retrieval";
import { LocalMemorySourceError, normalizeSourcePath } from "@/lib/agents/rag/source-document";

export type LocalMemorySourceOption = {
  sourcePath: string;
  fileName: string;
  category: string;
};

const MAX_SELECTED_SOURCE_PATHS = 12;

export async function listLocalMemorySourceOptions(): Promise<LocalMemorySourceOption[]> {
  const index = await loadVectorIndex();

  return index.documents
    .map((document) => ({
      sourcePath: document.path,
      fileName: document.fileName,
      category: categoryFromSourcePath(document.path),
    }))
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

export async function parseSelectedLocalMemorySourcePaths(value: unknown): Promise<string[]> {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new LocalMemorySourceError(
      "invalid_path",
      "selectedSourcePaths must be an array of local-memory paths.",
    );
  }

  if (value.length > MAX_SELECTED_SOURCE_PATHS) {
    throw new LocalMemorySourceError(
      "invalid_path",
      `Select ${MAX_SELECTED_SOURCE_PATHS} or fewer local-memory files.`,
    );
  }

  if (value.length === 0) {
    return [];
  }

  const normalizedPaths = value.map((item) => {
    if (typeof item !== "string") {
      throw new LocalMemorySourceError(
        "invalid_path",
        "selectedSourcePaths may only contain strings.",
      );
    }

    return normalizeSourcePath(item);
  });

  const uniquePaths = [...new Set(normalizedPaths)];
  const options = await listLocalMemorySourceOptions();
  const indexedPaths = new Set(options.map((option) => option.sourcePath));
  const unknownPath = uniquePaths.find((sourcePath) => !indexedPaths.has(sourcePath));

  if (unknownPath) {
    throw new LocalMemorySourceError(
      "not_found",
      `Selected local-memory file is not indexed: ${unknownPath}`,
    );
  }

  return uniquePaths;
}

function categoryFromSourcePath(sourcePath: string): string {
  const parts = sourcePath.split("/");

  if (parts.length >= 3) {
    return parts[1];
  }

  return "root";
}
