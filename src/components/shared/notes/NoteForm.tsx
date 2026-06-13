'use client';

import { useState } from 'react';

const labelClassName = 'block text-sm font-medium text-foreground';
const fieldClassName =
  'mt-2 block w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none';
const errorClassName = 'mt-2 text-sm font-medium text-danger';

type NoteFormProps = {
  initialContent?: string;
  submitLabel?: string;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel: () => void;
};

export default function NoteForm({
  initialContent = '',
  submitLabel = 'Save note',
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = content.trim();

    if (!trimmed) {
      setError('Note content cannot be empty');
      return;
    }

    if (trimmed.length > 5000) {
      setError('Note content must be under 5000 characters');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="noteContent" className={labelClassName}>
          Note
        </label>

        <textarea
          id="noteContent"
          name="noteContent"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            if (error) setError('');
          }}
          rows={4}
          placeholder="Write your note..."
          className={fieldClassName}
          autoFocus
        />

        <div className="mt-1 flex justify-between">
          {error ? (
            <p className={errorClassName}>{error}</p>
          ) : (
            <span />
          )}

          <span className="text-xs text-muted-soft">
            {content.length}/5000
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft hover:text-foreground"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 hover:shadow-glow-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-glow"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
