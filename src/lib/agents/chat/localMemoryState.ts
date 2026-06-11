import type { ChatSource, LocalMemoryCategory, LocalMemoryContext } from "@/lib/types/chat";

export function normalizeLocalMemoryContext(context: LocalMemoryContext | undefined): LocalMemoryContext {
  return {
    pinnedSourcePaths: uniqueStrings(context?.pinnedSourcePaths ?? []),
    lastSourcePaths: uniqueStrings(context?.lastSourcePaths ?? []),
    lastCategories: uniqueCategories(context?.lastCategories ?? []),
  };
}

export function updateLocalMemoryContext(
  context: LocalMemoryContext,
  sources: ChatSource[],
  categories: LocalMemoryCategory[]
): LocalMemoryContext {
  return {
    pinnedSourcePaths: uniqueStrings(context.pinnedSourcePaths ?? []),
    lastSourcePaths: uniqueStrings(sources.map((source) => source.sourcePath)).slice(0, 8),
    lastCategories: uniqueCategories(categories).slice(0, 4),
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueCategories(values: LocalMemoryCategory[]): LocalMemoryCategory[] {
  const valid = new Set<LocalMemoryCategory>([
    "contracts",
    "projects",
    "technologies",
    "personal-notes",
    "other",
  ]);

  return [...new Set(values.filter((value) => valid.has(value)))];
}
