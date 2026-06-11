export function normalizeDocumentText(rawContent: string): string {
  const normalized = rawContent.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const cleanedLines: string[] = [];
  let blankLines = 0;
  let inCodeFence = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (isMarkdownFenceLine(line)) {
      inCodeFence = !inCodeFence;
      blankLines = 0;
      cleanedLines.push(line);
      continue;
    }

    if (!inCodeFence && line.trim() === "") {
      blankLines += 1;

      if (blankLines <= 1) {
        cleanedLines.push("");
      }

      continue;
    }

    blankLines = 0;
    cleanedLines.push(line);
  }

  return cleanedLines.join("\n").trim();
}

export function getMarkdownBoilerplateLines(lines: string[]): Set<number> {
  const skippedLineNumbers = new Set<number>();
  const frontMatterEndIndex = findYamlFrontMatterEndIndex(lines);

  if (frontMatterEndIndex !== -1) {
    for (let index = 0; index <= frontMatterEndIndex; index += 1) {
      skippedLineNumbers.add(index + 1);
    }
  }

  lines.forEach((line, index) => {
    if (isDocsIndexBoilerplate(line)) {
      skippedLineNumbers.add(index + 1);
    }

    if (isFooterDivider(line, lines, index)) {
      skippedLineNumbers.add(index + 1);
    }
  });

  return skippedLineNumbers;
}

export function isMarkdownFenceLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("```") || trimmed.startsWith("~~~");
}

function findYamlFrontMatterEndIndex(lines: string[]): number {
  if (lines[0]?.trim() !== "---") {
    return -1;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      return index;
    }
  }

  return -1;
}

function isDocsIndexBoilerplate(line: string): boolean {
  const trimmed = line.trim();

  return (
    /^>\s*For an index of all Next\.js documentation, see\b/.test(trimmed) ||
    /^For a semantic overview of all documentation, see\b/.test(trimmed) ||
    /^For an index of all available documentation, see\b/.test(trimmed)
  );
}

function isFooterDivider(line: string, lines: string[], index: number): boolean {
  if (line.trim() !== "---") {
    return false;
  }

  const nextContentLine = lines.slice(index + 1).find((candidate) => candidate.trim());

  return nextContentLine ? isDocsIndexBoilerplate(nextContentLine) : false;
}
