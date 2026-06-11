import type { Task } from "@/lib/notion/db/tasks";
import type { Project } from "@/lib/notion/db/projects";

export type LocalMemoryCategory =
  | "contracts"
  | "projects"
  | "technologies"
  | "personal-notes"
  | "other";

export interface ChatSource {
  chunkId: string;
  sourcePath: string;
  fileName: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
  score: number;
  excerpt: string;
}

export interface LocalMemorySourceDocument {
  sourcePath: string;
  fileName: string;
  content: string;
  lineCount: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export interface NotionContext {
  tasks?: Task[];
  projects?: Project[];
}

export interface LocalMemoryContext {
  pinnedSourcePaths?: string[];
  lastSourcePaths?: string[];
  lastCategories?: LocalMemoryCategory[];
}
