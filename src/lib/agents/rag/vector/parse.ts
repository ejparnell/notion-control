import {
  getMarkdownBoilerplateLines,
  isMarkdownFenceLine,
  normalizeDocumentText,
} from "./markdown-cleanup";
import type { ParsedDocument, ParsedSection, SourceDocument } from "./types";

export function parseDocument(source: SourceDocument): ParsedDocument {
  const text = normalizeDocumentText(source.rawContent);
  const sections = isMarkdown(source.extension) ? parseMarkdownSections(text) : parsePlainTextSections(text);

  return {
    sourceId: source.sourceId,
    absolutePath: source.absolutePath,
    relativePath: source.relativePath,
    fileName: source.fileName,
    extension: source.extension,
    contentHash: source.contentHash,
    text,
    sections,
  };
}

export { normalizeDocumentText };

function parseMarkdownSections(text: string): ParsedSection[] {
  const lines = text.split("\n");
  const sections: ParsedSection[] = [];
  const headingStack: Array<{ level: number; title: string }> = [];
  const skippedLineNumbers = getMarkdownBoilerplateLines(lines);
  let inCodeFence = false;
  let currentLines: string[] = [];
  let currentHeadingPath: string[] = [];
  let currentStartLine = 1;

  const flushCurrentSection = (endLine: number) => {
    const sectionText = currentLines.join("\n").trim();

    if (sectionText) {
      sections.push({
        text: sectionText,
        headingPath: currentHeadingPath,
        startLine: currentStartLine,
        endLine: Math.max(currentStartLine, endLine),
      });
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;

    if (!inCodeFence && skippedLineNumbers.has(lineNumber)) {
      continue;
    }

    if (isMarkdownFenceLine(line)) {
      inCodeFence = !inCodeFence;
      if (currentLines.length === 0) {
        currentStartLine = lineNumber;
      }
      currentLines.push(line);
      continue;
    }

    const heading = !inCodeFence ? parseAtxHeading(line) : null;

    if (heading) {
      flushCurrentSection(lineNumber - 1);
      while (headingStack.at(-1) && headingStack.at(-1)!.level >= heading.level) {
        headingStack.pop();
      }
      headingStack.push(heading);
      currentHeadingPath = headingStack.map((item) => item.title);
      currentStartLine = lineNumber;
      currentLines = [line];
      continue;
    }

    if (currentLines.length === 0 && line.trim()) {
      currentStartLine = lineNumber;
    }
    currentLines.push(line);
  }

  flushCurrentSection(lines.length);

  return sections;
}

function parsePlainTextSections(text: string): ParsedSection[] {
  if (!text.trim()) {
    return [];
  }

  return [
    {
      text,
      headingPath: [],
      startLine: 1,
      endLine: text.split("\n").length,
    },
  ];
}

function parseAtxHeading(line: string): { level: number; title: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    level: match[1].length,
    title: match[2].trim(),
  };
}

function isMarkdown(extension: string): boolean {
  return extension === ".md" || extension === ".mdx";
}
