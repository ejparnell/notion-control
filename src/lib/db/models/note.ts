import { Schema, deleteModel, model, models, type Model } from 'mongoose';
import { buildSchemaOptions } from './shared/baseSchema';
import type { NoteInterface } from '@/lib/types/note';
import { noteTargetTypeValues } from '@/lib/constants';

const noteSchema = new Schema<NoteInterface>(
  {
    content: { type: String, required: true },
    targetType: {
      type: String,
      required: true,
      enum: noteTargetTypeValues,
    },
    targetId: { type: String, required: true, index: true },
  },
  buildSchemaOptions('notes'),
);

const existingNoteModel = models.Note as Model<NoteInterface> | undefined;

if (
  existingNoteModel &&
  (
    existingNoteModel.schema.path('targetId')?.instance !== 'String' ||
    !existingNoteModel.schema.path('targetType')?.options?.enum
  )
) {
  deleteModel('Note');
}

export const NoteModel: Model<NoteInterface> =
  (models.Note as Model<NoteInterface> | undefined) ||
  model<NoteInterface>('Note', noteSchema);
