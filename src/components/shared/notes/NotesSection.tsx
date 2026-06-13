'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/shared/overlays/Modal';
import NoteCard from './NoteCard';
import NoteForm from './NoteForm';
import { fetchNotesAction } from '@/app/notes/_lib/noteActions';
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from '@/app/notes/_lib/noteActions';
import type { NoteInterface } from '@/lib/types/note';
import type { NoteTargetType } from '@/lib/constants';

type NotesSectionProps = {
  targetType: NoteTargetType;
  targetId: string;
  refreshKey?: number;
};

type ModalState =
  | { kind: 'closed' }
  | { kind: 'creating' }
  | { kind: 'editing'; note: NoteInterface };

export default function NotesSection({
  targetType,
  targetId,
  refreshKey = 0,
}: NotesSectionProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotesAction(targetType, targetId);
      setNotes(result);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes, refreshKey]);

  const handleCreate = async (content: string) => {
    const note = await createNoteAction({
      content,
      targetType,
      targetId,
    });
    setNotes((current) => [note, ...current]);
    setModal({ kind: 'closed' });
    router.refresh();
  };

  const handleUpdate = async (content: string) => {
    if (modal.kind !== 'editing') return;

    const updated = await updateNoteAction(modal.note.id, { content });
    setNotes((current) =>
      current.map((n) => (n.id === updated.id ? updated : n)),
    );
    setModal({ kind: 'closed' });
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    await deleteNoteAction(confirmDeleteId);
    setNotes((current) => current.filter((n) => n.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    router.refresh();
  };

  return (
    <section className="rounded-lg border border-border bg-surface/80 p-5 text-foreground shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Notes
          {notes.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-soft">
              ({notes.length})
            </span>
          )}
        </h2>

        <button
          type="button"
          onClick={() => setModal({ kind: 'creating' })}
          className="rounded-lg border border-primary/50 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary-soft/80"
        >
          + Add note
        </button>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-surface-soft"
            />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-soft">
          No notes yet. Add the first note to track progress or jot down ideas.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(note) => setModal({ kind: 'editing', note })}
              onDelete={(noteId) => setConfirmDeleteId(noteId)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={modal.kind !== 'closed'}
        title={modal.kind === 'creating' ? 'Add note' : 'Edit note'}
        onClose={() => setModal({ kind: 'closed' })}
      >
        <NoteForm
          initialContent={modal.kind === 'editing' ? modal.note.content : ''}
          submitLabel={modal.kind === 'creating' ? 'Add note' : 'Save changes'}
          onSubmit={modal.kind === 'creating' ? handleCreate : handleUpdate}
          onCancel={() => setModal({ kind: 'closed' })}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={confirmDeleteId !== null}
        title="Delete note"
        onClose={() => setConfirmDeleteId(null)}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            Are you sure you want to delete this note? This action cannot be
            undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft hover:text-foreground"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-danger bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground shadow-glow transition hover:bg-danger/90"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
