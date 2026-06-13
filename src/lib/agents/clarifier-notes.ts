import { createNoteSchema, type CreateNoteValidation } from '@/lib/validations/notes';
import type { NoteTargetType } from '@/lib/constants';
import type { NoteInterface } from '@/lib/types/note';

export type ClarifierNoteCreateAction = {
  type: 'note-create';
  content: string;
};

type AutoCreateClarifierNotesInput<TAction extends { type: string }> = {
  actions: TAction[];
  targetType: NoteTargetType;
  targetId: string;
  existingNotes: Pick<NoteInterface, 'content'>[];
  createNote: (data: CreateNoteValidation) => Promise<NoteInterface>;
};

type AutoCreateClarifierNotesResult<TAction extends { type: string }> = {
  createdNotes: NoteInterface[];
  remainingActions: TAction[];
};

export async function autoCreateClarifierNotes<TAction extends { type: string }>({
  actions,
  targetType,
  targetId,
  existingNotes,
  createNote,
}: AutoCreateClarifierNotesInput<TAction>): Promise<AutoCreateClarifierNotesResult<TAction>> {
  const createdNotes: NoteInterface[] = [];
  const remainingActions: TAction[] = [];
  const existingContent = new Set(
    existingNotes.map((note) => normalizeNoteContent(note.content)),
  );

  for (const action of actions) {
    if (!isNoteCreateAction(action)) {
      remainingActions.push(action);
      continue;
    }

    const validation = createNoteSchema.safeParse({
      content: action.content,
      targetType,
      targetId,
    });

    if (!validation.success) {
      continue;
    }

    const normalizedContent = normalizeNoteContent(validation.data.content);

    if (existingContent.has(normalizedContent)) {
      continue;
    }

    existingContent.add(normalizedContent);
    createdNotes.push(await createNote(validation.data));
  }

  return {
    createdNotes,
    remainingActions,
  };
}

export function normalizeNoteContent(content: string) {
  return content.trim().replace(/\s+/g, ' ');
}

function isNoteCreateAction(
  action: { type: string },
): action is { type: string } & ClarifierNoteCreateAction {
  return (
    action.type === 'note-create' &&
    typeof (action as ClarifierNoteCreateAction).content === 'string'
  );
}
