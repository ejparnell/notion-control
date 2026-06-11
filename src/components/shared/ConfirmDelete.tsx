'use client';

import { useState } from 'react';

type ConfirmDeleteProps = {
  itemName: string;
  itemType?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmDelete({
  itemName,
  itemType = 'item',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Something went wrong while deleting. Please try again.',
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
        <p className="font-semibold">
          Delete {itemType}: {itemName}
        </p>
        <p className="mt-2 leading-6">
          {message ??
            `This will permanently delete this ${itemType}. This action cannot be undone.`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-surface px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-soft px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-lg border border-danger bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground shadow-glow-danger transition hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </div>
  );
}
