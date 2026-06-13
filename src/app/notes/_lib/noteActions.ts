'use server';

import {
  createNoteSchema,
  updateNoteSchema,
  type CreateNoteValidation,
  type UpdateNoteInput,
} from '@/lib/validations/notes';
import type { NoteInterface } from '@/lib/types/note';
import type { NoteTargetType } from '@/lib/constants';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from '@/dal/notes';

export const createNoteAction = async (
  noteData: CreateNoteValidation,
): Promise<NoteInterface> => {
  const validation = createNoteSchema.safeParse(noteData);

  if (!validation.success) {
    throw new Error('Invalid note data');
  }

  return await createNote(validation.data);
};

export const updateNoteAction = async (
  noteId: string,
  noteData: UpdateNoteInput,
): Promise<NoteInterface> => {
  const validation = updateNoteSchema.safeParse(noteData);

  if (!validation.success) {
    throw new Error('Invalid note data');
  }

  const note = await updateNote(noteId, validation.data);

  if (!note) {
    throw new Error('Note could not be found or updated');
  }

  return note;
};

export const fetchNotesAction = async (
  targetType: NoteTargetType,
  targetId: string,
): Promise<NoteInterface[]> => {
  return await getNotes(targetType, targetId);
};

export const deleteNoteAction = async (
  noteId: string,
): Promise<void> => {
  await deleteNote(noteId);
};
