"use client";

import { useEffect, useState } from "react";
import type { ChatSource, LocalMemorySourceDocument } from "@/lib/types/chat";

export default function SourcePanel({ sources }: { sources: ChatSource[] }) {
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null);
  const [document, setDocument] = useState<LocalMemorySourceDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSource) return;

    const controller = new AbortController();
    const source = selectedSource;

    async function loadDocument() {
      setLoading(true);
      setDocument(null);
      setError(null);

      try {
        const res = await fetch(
          `/api/local-memory/source?path=${encodeURIComponent(source.sourcePath)}`,
          { signal: controller.signal }
        );
        const data = (await res.json()) as Partial<LocalMemorySourceDocument> & {
          error?: string;
        };

        if (
          !res.ok ||
          typeof data.content !== "string" ||
          typeof data.sourcePath !== "string" ||
          typeof data.fileName !== "string"
        ) {
          throw new Error(data.error ?? `Unexpected error (${res.status})`);
        }

        setDocument({
          sourcePath: data.sourcePath,
          fileName: data.fileName,
          content: data.content,
          lineCount: data.lineCount ?? 0,
        });
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Source could not be opened.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      controller.abort();
    };
  }, [selectedSource]);

  return (
    <aside
      aria-label="Sources"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Sources</h2>
        <span className="rounded-full border border-border bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">
          {sources.length}
        </span>
      </header>

      {selectedSource ? (
        <SourceDetail
          source={selectedSource}
          document={document}
          loading={loading}
          error={error}
          onBack={() => setSelectedSource(null)}
        />
      ) : (
        <SourceList sources={sources} onSelect={setSelectedSource} />
      )}
    </aside>
  );
}

function SourceList({
  sources,
  onSelect,
}: {
  sources: ChatSource[];
  onSelect: (source: ChatSource) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-soft">
        No sources yet.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {sources.map((source, index) => (
        <button
          key={source.chunkId}
          type="button"
          onClick={() => onSelect(source)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-muted shadow-sm transition-colors hover:border-primary/50 hover:bg-primary-soft/40 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-medium text-foreground">
              Source {index + 1}: {source.fileName}
            </span>
            <span className="shrink-0 text-muted-soft">{source.score.toFixed(2)}</span>
          </span>
          <span className="mt-1 block truncate font-mono text-[11px] text-muted-soft">
            {source.sourcePath}
          </span>
          {source.headingPath.length ? (
            <span className="mt-1 block truncate text-muted-soft">
              {source.headingPath.join(" > ")}
            </span>
          ) : null}
          <span className="mt-1 block text-muted-soft">
            Lines {source.startLine}-{source.endLine}
          </span>
          <span className="mt-2 block line-clamp-3 text-muted">{source.excerpt}</span>
        </button>
      ))}
    </div>
  );
}

function SourceDetail({
  source,
  document,
  loading,
  error,
  onBack,
}: {
  source: ChatSource;
  document: LocalMemorySourceDocument | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 rounded-md border border-border bg-surface-soft px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Back
        </button>
        <h3 className="break-words text-sm font-semibold text-foreground">{source.fileName}</h3>
        <div className="mt-1 break-words font-mono text-[11px] text-muted-soft">
          {source.sourcePath}
        </div>
        {source.headingPath.length ? (
          <div className="mt-1 text-xs text-muted-soft">{source.headingPath.join(" > ")}</div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-warning">
            Lines {source.startLine}-{source.endLine}
          </span>
          <span className="rounded-full border border-border bg-surface-soft px-2 py-0.5">
            Score {source.score.toFixed(2)}
          </span>
          {document ? (
            <span className="rounded-full border border-border bg-surface-soft px-2 py-0.5">
              {document.lineCount} lines
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-soft">
        {loading ? (
          <div className="px-4 py-6 text-sm text-muted-soft">Loading source...</div>
        ) : null}
        {error ? (
          <div role="alert" className="m-4 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {document ? <DocumentReader source={source} document={document} /> : null}
      </div>
    </div>
  );
}

function DocumentReader({
  source,
  document,
}: {
  source: ChatSource;
  document: LocalMemorySourceDocument;
}) {
  const lines = splitLines(document.content);

  return (
    <div className="py-3 font-mono text-xs leading-5">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const highlighted = lineNumber >= source.startLine && lineNumber <= source.endLine;

        return (
          <div
            key={`${document.sourcePath}-${lineNumber}`}
            className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-3 px-3 ${
              highlighted ? "bg-warning-soft text-warning" : "text-muted"
            }`}
          >
            <span className="select-none text-right text-muted-soft">{lineNumber}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

function splitLines(content: string): string[] {
  if (!content) return [];
  return content.split(/\r\n|\r|\n/);
}
