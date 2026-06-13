'use client';

import { useState, useMemo } from 'react';
import type { NoteInterface } from '@/lib/types/note';

type NoteCardProps = {
  note: NoteInterface;
  onEdit: (note: NoteInterface) => void;
  onDelete: (noteId: string) => void;
};

function relativeTime(date: Date | undefined): string {
  if (!date) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = note.content.length > 280;
  const timeAgo = useMemo(() => relativeTime(note.createdAt), [note.createdAt]);

  return (
    <div className="group rounded-lg border border-border bg-surface-soft p-4 text-sm text-foreground shadow-sm transition hover:border-border/80">
      <div className="whitespace-pre-wrap break-words leading-6 text-muted">
        {isLong && !isExpanded
          ? `${note.content.slice(0, 280).trimEnd()}...`
          : note.content}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-xs text-muted-soft">{timeAgo}</span>

        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="rounded px-2 py-0.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-foreground"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="rounded px-2 py-0.5 text-xs font-medium text-danger/70 transition hover:bg-danger-soft/40 hover:text-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
