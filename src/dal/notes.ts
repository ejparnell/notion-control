'use server';

import { connectToDatabase } from '@/lib/db/connection';
import { NoteModel } from '@/lib/db/models/note';
import type { NoteInterface } from '@/lib/types/note';
import type { NoteTargetType } from '@/lib/constants';
import type {
  CreateNoteValidation,
  UpdateNoteValidation,
} from '@/lib/validations/notes';

type NoteRecord = Omit<NoteInterface, 'id'> & {
  id?: string;
  _id?: { toString(): string };
};

const noteId = (note: NoteRecord) => {
  const id = note.id ?? note._id?.toString();

  if (!id) {
    throw new Error('Note record is missing an id');
  }

  return id;
};

const serializeNote = (note: NoteRecord): NoteInterface => ({
  id: noteId(note),
  content: note.content,
  targetType: note.targetType,
  targetId: note.targetId,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

export const getNotes = async (
  targetType: NoteTargetType,
  targetId: string,
): Promise<NoteInterface[]> => {
  await connectToDatabase();

  const notes = await NoteModel.find({ targetType, targetId })
    .sort({ createdAt: -1 })
    .lean();

  return notes.map((note) => serializeNote(note as NoteRecord));
};

export const getNoteById = async (id: string): Promise<NoteInterface | null> => {
  await connectToDatabase();

  const note = await NoteModel.findById(id).lean();
  return note ? serializeNote(note as NoteRecord) : null;
};

export const createNote = async (
  data: CreateNoteValidation,
): Promise<NoteInterface> => {
  await connectToDatabase();

  const note = new NoteModel(data);
  await note.save();

  return serializeNote(note.toObject() as NoteRecord);
};

export const updateNote = async (
  id: string,
  data: UpdateNoteValidation,
): Promise<NoteInterface | null> => {
  await connectToDatabase();

  const note = await NoteModel.findByIdAndUpdate(
    id,
    { content: data.content },
    { new: true, runValidators: true },
  ).lean();

  return note ? serializeNote(note as NoteRecord) : null;
};

export const deleteNote = async (id: string): Promise<void> => {
  await connectToDatabase();
  await NoteModel.findByIdAndDelete(id);
};
