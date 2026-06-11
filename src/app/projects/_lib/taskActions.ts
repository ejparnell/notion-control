'use server';

import {
  createTaskAction as createTaskActionBase,
  createTasksForProjectAction as createTasksForProjectActionBase,
  type CreateTaskActionState,
} from '@/app/tasks/_lib/taskActions';
import type { CreateTaskInput } from '@/lib/validations/tasks';
import type { ProjectClarifierTaskContext } from '@/lib/types/project-clarifier';

export async function createTaskAction(
  projectId: string,
  formDataOrPreviousState: FormData | CreateTaskActionState,
  maybeFormData?: FormData,
): Promise<CreateTaskActionState> {
  if (maybeFormData) {
    return createTaskActionBase(
      projectId,
      formDataOrPreviousState as CreateTaskActionState,
      maybeFormData,
    );
  }

  return createTaskActionBase(projectId, formDataOrPreviousState as FormData);
}

export async function createTasksForProjectAction(
  projectId: string,
  tasks: CreateTaskInput[],
): Promise<ProjectClarifierTaskContext[]> {
  return createTasksForProjectActionBase(projectId, tasks);
}
