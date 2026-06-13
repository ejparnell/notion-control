import z from 'zod';
import { noteTargetTypeValues } from '@/lib/constants';
import type { NoteInterface } from '@/lib/types/note';

export const noteSchema = z.object({
  id: z.string(),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(5000, 'Content must be under 5000 characters'),
  targetType: z.enum(noteTargetTypeValues),
  targetId: z.string().min(1, 'Target is required'),
});

export const createNoteSchema = noteSchema.omit({ id: true });

export const updateNoteSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Content is required')
      .max(5000, 'Content must be under 5000 characters'),
  })
  .refine((data) => data.content.trim().length > 0, {
    message: 'Content is required',
  });

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type CreateNoteValidation = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;
export type UpdateNoteValidation = z.infer<typeof updateNoteSchema>;

export const validateCreateNote = (data: unknown) => {
  return createNoteSchema.safeParse(data);
};

export const validateUpdateNote = (data: unknown) => {
  return updateNoteSchema.safeParse(data);
};

export const validateNote = (note: NoteInterface) => {
  return noteSchema.safeParse(note);
};
