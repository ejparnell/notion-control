'use client';

import { useEffect, useMemo, useState } from 'react';

import Modal from '@/components/shared/overlays/Modal';

type LocalMemorySourceOption = {
  sourcePath: string;
  fileName: string;
  category: string;
};

type LocalMemorySourcePickerProps = {
  selectedSourcePaths: string[];
  onChange: (sourcePaths: string[]) => void;
  disabled?: boolean;
};

type SourceTreeFolder = {
  type: 'folder';
  name: string;
  path: string;
  children: SourceTreeNode[];
};

type SourceTreeFile = {
  type: 'file';
  name: string;
  sourcePath: string;
};

type SourceTreeNode = SourceTreeFolder | SourceTreeFile;

const ROOT_FOLDER = 'local-memory';
const buttonClassName =
  'inline-flex h-9 items-center justify-center rounded-lg border border-primary/50 bg-primary-soft px-3 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-soft/80 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40';
const secondaryButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface-soft px-3 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40';

export default function LocalMemorySourcePicker({
  selectedSourcePaths,
  onChange,
  disabled = false,
}: LocalMemorySourcePickerProps) {
  const [sources, setSources] = useState<LocalMemorySourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set([ROOT_FOLDER]));
  const [draftSourcePaths, setDraftSourcePaths] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadSources() {
      try {
        setLoading(true);
        const res = await fetch('/api/local-memory/sources');
        const data = (await res.json()) as {
          sources?: LocalMemorySourceOption[];
          error?: string;
        };

        if (!res.ok || !Array.isArray(data.sources)) {
          throw new Error(data.error ?? `Unexpected error (${res.status})`);
        }

        if (!ignore) {
          setSources(data.sources);
          setExpandedPaths(buildDefaultExpandedPaths(data.sources));
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Memory files could not be loaded.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadSources();

    return () => {
      ignore = true;
    };
  }, []);

  const tree = useMemo(() => buildSourceTree(sources), [sources]);
  const selectedSet = useMemo(
    () => new Set(draftSourcePaths),
    [draftSourcePaths],
  );
  const canOpen = !disabled && !loading && !error;

  function openModal() {
    setDraftSourcePaths(selectedSourcePaths);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setDraftSourcePaths([]);
  }

  function applySelection() {
    onChange(draftSourcePaths);
    setIsOpen(false);
  }

  function toggleExpanded(path: string) {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);

      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }

      return nextPaths;
    });
  }

  function toggleFile(sourcePath: string) {
    setDraftSourcePaths((currentPaths) => {
      if (currentPaths.includes(sourcePath)) {
        return currentPaths.filter((path) => path !== sourcePath);
      }

      return [...currentPaths, sourcePath].sort((left, right) => left.localeCompare(right));
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={openModal}
          disabled={!canOpen}
          className={buttonClassName}
          aria-label="Select memory files"
        >
          Memory: {selectionLabel(selectedSourcePaths.length)}
        </button>

        {selectedSourcePaths.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="self-start rounded-md px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
          >
            Clear
          </button>
        )}
      </div>

      <p className="min-h-4 max-w-md truncate text-xs text-muted-soft">
        {error ?? (loading ? 'Loading memory files...' : statusLabel(selectedSourcePaths.length))}
      </p>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          title="Select Memory Files"
          onClose={closeModal}
        >
          <div className="space-y-4">
            <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-border bg-surface-soft px-2 py-2">
              {tree.children.length > 0 ? (
                <SourceTree
                  nodes={tree.children}
                  depth={0}
                  expandedPaths={expandedPaths}
                  selectedSourcePaths={selectedSet}
                  onToggleExpanded={toggleExpanded}
                  onToggleFile={toggleFile}
                />
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-soft">
                  No indexed memory files found.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-soft">
                {selectionLabel(draftSourcePaths.length)}
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className={secondaryButtonClassName}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setDraftSourcePaths([])}
                  disabled={draftSourcePaths.length === 0}
                  className={secondaryButtonClassName}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applySelection}
                  className={buttonClassName}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SourceTree({
  nodes,
  depth,
  expandedPaths,
  selectedSourcePaths,
  onToggleExpanded,
  onToggleFile,
}: {
  nodes: SourceTreeNode[];
  depth: number;
  expandedPaths: Set<string>;
  selectedSourcePaths: Set<string>;
  onToggleExpanded: (path: string) => void;
  onToggleFile: (sourcePath: string) => void;
}) {
  return (
    <div className={depth === 0 ? 'space-y-1' : 'space-y-1 border-l border-border pl-3'}>
      {nodes.map((node) => {
        if (node.type === 'folder') {
          const expanded = expandedPaths.has(node.path);

          return (
            <div key={node.path}>
              <button
                type="button"
                onClick={() => onToggleExpanded(node.path)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary"
                aria-expanded={expanded}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-surface text-xs text-muted">
                  {expanded ? '-' : '+'}
                </span>
                <span className="min-w-0 truncate">{node.name}</span>
              </button>

              {expanded && node.children.length > 0 && (
                <div className="mt-1">
                  <SourceTree
                    nodes={node.children}
                    depth={depth + 1}
                    expandedPaths={expandedPaths}
                    selectedSourcePaths={selectedSourcePaths}
                    onToggleExpanded={onToggleExpanded}
                    onToggleFile={onToggleFile}
                  />
                </div>
              )}
            </div>
          );
        }

        const checked = selectedSourcePaths.has(node.sourcePath);

        return (
          <label
            key={node.sourcePath}
            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-muted"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleFile(node.sourcePath)}
              className="mt-1 h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {node.name}
              </span>
              <span className="block truncate text-xs text-muted-soft">
                {node.sourcePath}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function buildSourceTree(sources: LocalMemorySourceOption[]): SourceTreeFolder {
  const root: SourceTreeFolder = {
    type: 'folder',
    name: ROOT_FOLDER,
    path: ROOT_FOLDER,
    children: [],
  };

  for (const source of sources) {
    const segments = source.sourcePath.split('/').filter(Boolean);
    let currentFolder = root;
    let path = '';

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      path = path ? `${path}/${segment}` : segment;

      if (index === segments.length - 1) {
        currentFolder.children.push({
          type: 'file',
          name: source.fileName || segment,
          sourcePath: source.sourcePath,
        });
        continue;
      }

      if (index === 0 && segment === ROOT_FOLDER) {
        continue;
      }

      let nextFolder = currentFolder.children.find(
        (child): child is SourceTreeFolder =>
          child.type === 'folder' && child.path === path,
      );

      if (!nextFolder) {
        nextFolder = {
          type: 'folder',
          name: segment,
          path,
          children: [],
        };
        currentFolder.children.push(nextFolder);
      }

      currentFolder = nextFolder;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(folder: SourceTreeFolder) {
  folder.children.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  for (const child of folder.children) {
    if (child.type === 'folder') {
      sortTree(child);
    }
  }
}

function buildDefaultExpandedPaths(sources: LocalMemorySourceOption[]) {
  const paths = new Set<string>([ROOT_FOLDER]);

  for (const source of sources) {
    const segments = source.sourcePath.split('/').filter(Boolean);

    if (segments[0] === ROOT_FOLDER && segments[1]) {
      paths.add(`${ROOT_FOLDER}/${segments[1]}`);
    }
  }

  return paths;
}

function selectionLabel(count: number) {
  if (count === 0) {
    return 'Automatic RAG';
  }

  if (count === 1) {
    return '1 memory file';
  }

  return `${count} memory files`;
}

function statusLabel(count: number) {
  if (count === 0) {
    return 'Using automatic RAG context.';
  }

  return `${selectionLabel(count)} selected.`;
}
