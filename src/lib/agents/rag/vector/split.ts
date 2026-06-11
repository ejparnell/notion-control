import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { shortHash } from "./hash";
import type { DocumentChunk, ParsedDocument, ParsedSection, SupportedDocumentExtension } from "./types";

type ChunkOptions = {
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
};

type TextSlice = {
  text: string;
  startOffset: number;
  endOffset: number;
};

export async function chunkParsedDocument(document: ParsedDocument, options: ChunkOptions): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];
  const splitter = createTextSplitter(document.extension, options);

  for (const section of document.sections) {
    let previousStartOffset = -1;

    for (const splitText of await splitter.splitText(section.text)) {
      if (!splitText.trim()) {
        continue;
      }

      const slice = locateTextSlice(section.text, splitText, previousStartOffset);
      const chunkIndex = chunks.length;
      const startLine = lineForOffset(section, slice.startOffset);
      const endLine = lineForOffset(section, Math.max(slice.startOffset, slice.endOffset - 1));
      const chunkId = shortHash(
        [document.sourceId, document.contentHash, String(chunkIndex), slice.text].join(":"),
        24
      );

      chunks.push({
        text: slice.text,
        metadata: {
          chunkId,
          sourceId: document.sourceId,
          sourcePath: document.relativePath,
          fileName: document.fileName,
          extension: document.extension,
          contentHash: document.contentHash,
          chunkIndex,
          headingPath: section.headingPath,
          startLine,
          endLine,
          createdAt: options.createdAt,
        },
      });
      previousStartOffset = slice.startOffset;
    }
  }

  return chunks;
}

export async function chunkParsedDocuments(
  documents: ParsedDocument[],
  options: ChunkOptions
): Promise<DocumentChunk[]> {
  const chunkLists = await Promise.all(documents.map((document) => chunkParsedDocument(document, options)));
  return chunkLists.flat();
}

function createTextSplitter(
  extension: SupportedDocumentExtension,
  options: ChunkOptions
): RecursiveCharacterTextSplitter {
  const splitterOptions = {
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
  };

  return isMarkdown(extension)
    ? RecursiveCharacterTextSplitter.fromLanguage("markdown", splitterOptions)
    : new RecursiveCharacterTextSplitter(splitterOptions);
}

function locateTextSlice(text: string, chunkText: string, previousStartOffset: number): TextSlice {
  const searchStartOffset = Math.max(0, previousStartOffset + 1);
  let startOffset = text.indexOf(chunkText, searchStartOffset);

  if (startOffset === -1) {
    startOffset = text.indexOf(chunkText);
  }

  if (startOffset === -1) {
    throw new Error("Could not map a generated chunk back to its source document section.");
  }

  return {
    text: chunkText,
    startOffset,
    endOffset: startOffset + chunkText.length,
  };
}

function lineForOffset(section: ParsedSection, offset: number): number {
  const prefix = section.text.slice(0, offset);
  return section.startLine + prefix.split("\n").length - 1;
}

function isMarkdown(extension: SupportedDocumentExtension): boolean {
  return extension === ".md" || extension === ".mdx";
}
