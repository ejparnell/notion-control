import type { NoteTargetType } from '@/lib/constants';

export interface NoteInterface {
  id: string;
  content: string;
  targetType: NoteTargetType;
  targetId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
