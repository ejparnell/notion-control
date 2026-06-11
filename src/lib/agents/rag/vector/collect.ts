import fs from "node:fs/promises";
import path from "node:path";
import { sha256, shortHash } from "./hash";
import {
  SUPPORTED_DOCUMENT_EXTENSIONS,
  type IngestionConfig,
  type SourceDocument,
  type SupportedDocumentExtension,
} from "./types";

const supportedExtensions = new Set<string>(SUPPORTED_DOCUMENT_EXTENSIONS);
const ignoredDirectoryNames = new Set(["node_modules", ".next", "_meta", "_sources"]);

export async function collectDocumentFiles(config: IngestionConfig): Promise<SourceDocument[]> {
  if (!(await directoryExists(config.documentsDir))) {
    return [];
  }

  const files = await walkDocuments(config.documentsDir, config);
  const documents = await Promise.all(
    files.map(async (absolutePath) => {
      const rawContent = await fs.readFile(absolutePath, "utf8");

      if (!rawContent.trim()) {
        return null;
      }

      const relativePath = toPosixPath(path.relative(config.cwd, absolutePath));
      const extension = path.extname(absolutePath).toLowerCase() as SupportedDocumentExtension;

      return {
        sourceId: shortHash(relativePath),
        absolutePath,
        relativePath,
        fileName: path.basename(absolutePath),
        extension,
        rawContent,
        contentHash: sha256(rawContent),
      };
    })
  );

  return documents.filter((document): document is SourceDocument => document !== null);
}

async function walkDocuments(directory: string, config: IngestionConfig): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (isInsidePath(absolutePath, config.vectorStoreDir)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name)) {
        continue;
      }

      files.push(...(await walkDocuments(absolutePath, config)));
      continue;
    }

    if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    const stat = await fs.stat(directory);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function isInsidePath(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}
