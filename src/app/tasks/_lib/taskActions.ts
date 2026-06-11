'use server';

import { revalidatePath } from 'next/cache';

import {
  createTaskByProject,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByProject,
  updateTask,
} from '@/dal/tasks';
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type CreateTaskValidation,
  type UpdateTaskInput,
} from '@/lib/validations/tasks';
import { buildWorkCreateTaskDescription } from '@/lib/agents/orchestrator/work-description';
import type { ProjectClarifierTaskContext } from '@/lib/types/project-clarifier';
import type { TaskInterface } from '@/lib/types/task';

type CreateTaskFieldErrors = Partial<
  Record<keyof CreateTaskValidation, string[]>
>;

export type CreateTaskActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: CreateTaskFieldErrors;
  taskId?: string;
};

export type TaskClientTask = Omit<TaskInterface, 'dueDate' | 'completedOn'> & {
  dueDate?: string;
  completedOn?: string;
};

const optionalFormValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const formDataStringValues = (formData: FormData, key: string) => {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string');

  return values.length > 0 ? values : undefined;
};

const formDataTextList = (formData: FormData, key: string) => {
  const rawValue = optionalFormValue(formData.get(key));

  if (!rawValue) {
    return undefined;
  }

  const values = rawValue
    .split('\n')
    .map(value => value.trim())
    .filter(value => value.length > 0);

  return values.length > 0 ? values : undefined;
};

const createTaskInputFromFormData = (
  formData: FormData,
): Record<keyof CreateTaskValidation, unknown> => ({
  name: optionalFormValue(formData.get('name')),
  description: optionalFormValue(formData.get('description')),
  status: optionalFormValue(formData.get('status')),
  dueDate: optionalFormValue(formData.get('dueDate')),
  priority: optionalFormValue(formData.get('priority')),
  tags: formDataStringValues(formData, 'tags'),
  completedOn: optionalFormValue(formData.get('completedOn')),
  estTime: optionalFormValue(formData.get('estTime')),
  assignedTo: optionalFormValue(formData.get('assignedTo')),
  acceptanceCriteria: formDataTextList(formData, 'acceptanceCriteria'),
  testingCriteria: formDataTextList(formData, 'testingCriteria'),
  implementationPlan: formDataTextList(formData, 'implementationPlan'),
});

function dateForClient(value: Date | null | undefined) {
  return value?.toISOString();
}

function taskForClient(task: TaskInterface): TaskClientTask {
  return {
    id: task.id,
    name: task.name,
    status: task.status,
    dueDate: dateForClient(task.dueDate),
    priority: task.priority,
    tags: task.tags ?? [],
    project: task.project,
    completedOn: dateForClient(task.completedOn),
    estTime: task.estTime,
    assignedTo: task.assignedTo,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    testingCriteria: task.testingCriteria,
    implementationPlan: task.implementationPlan,
  };
}

function taskForClarifier(task: TaskInterface): ProjectClarifierTaskContext {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags ?? [],
    dueDate: dateForClient(task.dueDate),
    completedOn: dateForClient(task.completedOn),
    estTime: task.estTime,
    assignedTo: task.assignedTo,
    acceptanceCriteria: task.acceptanceCriteria,
    testingCriteria: task.testingCriteria,
    implementationPlan: task.implementationPlan,
  };
}

function revalidateTaskViews(taskId?: string, projectId?: string) {
  revalidatePath('/tasks');

  if (taskId) {
    revalidatePath(`/tasks/${taskId}`);
  }

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export const fetchTasks = async (): Promise<TaskInterface[]> => {
  return await getAllTasks();
};

export const fetchTaskContext = async (
  id: string,
): Promise<TaskInterface | null> => {
  return await getTaskById(id);
};

export const fetchRelatedTasksForTask = async (
  task: TaskInterface,
): Promise<TaskInterface[]> => {
  if (!task.project) {
    return [];
  }

  const tasks = await getTasksByProject(task.project);
  return tasks.filter((relatedTask) => relatedTask.id !== task.id);
};

export async function createTaskAction(
  projectId: string,
  formData: FormData,
): Promise<CreateTaskActionState>;
export async function createTaskAction(
  projectId: string,
  previousState: CreateTaskActionState,
  formData: FormData,
): Promise<CreateTaskActionState>;
export async function createTaskAction(
  projectId: string,
  formDataOrPreviousState: FormData | CreateTaskActionState,
  maybeFormData?: FormData,
): Promise<CreateTaskActionState> {
  if (!projectId.trim()) {
    return {
      status: 'error',
      message: 'Project id is required.',
    };
  }

  const formData =
    maybeFormData ?? (formDataOrPreviousState instanceof FormData
      ? formDataOrPreviousState
      : undefined);

  if (!formData) {
    return {
      status: 'error',
      message: 'Task form data is missing.',
    };
  }

  const validation = createTaskSchema.safeParse(
    createTaskInputFromFormData(formData),
  );

  if (!validation.success) {
    return {
      status: 'error',
      message: 'Invalid task data.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const task = await createTaskByProject(projectId, validation.data);

  revalidateTaskViews(task.id, projectId);

  return {
    status: 'success',
    message: 'Task created.',
    taskId: task.id,
  };
}

export async function createTaskForProjectAction(
  projectId: string,
  taskData: CreateTaskInput,
): Promise<TaskClientTask> {
  if (!projectId.trim()) {
    throw new Error('Project id is required.');
  }

  const validation = createTaskSchema.safeParse(taskData);

  if (!validation.success) {
    throw new Error('Invalid task data.');
  }

  const task = await createTaskByProject(projectId, validation.data);

  revalidateTaskViews(task.id, projectId);

  return taskForClient(task);
}

export async function createTasksForProjectAction(
  projectId: string,
  tasks: CreateTaskInput[],
): Promise<ProjectClarifierTaskContext[]> {
  if (!projectId.trim()) {
    throw new Error('Project id is required.');
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('At least one task is required.');
  }

  const validations = tasks.map(task => createTaskSchema.safeParse(task));

  if (validations.some(validation => !validation.success)) {
    throw new Error('Invalid task data.');
  }

  const createdTasks: ProjectClarifierTaskContext[] = [];

  for (const validation of validations) {
    if (!validation.success) {
      continue;
    }

    const description = buildWorkCreateTaskDescription(validation.data);
    const taskData = {
      ...validation.data,
      ...(description && { description }),
    };
    const task = await createTaskByProject(projectId, taskData);
    createdTasks.push(taskForClarifier(task));
  }

  revalidateTaskViews(undefined, projectId);

  return createdTasks;
}

export async function updateTaskAction(
  taskId: string,
  taskData: UpdateTaskInput,
): Promise<TaskClientTask> {
  const previousTask = await getTaskById(taskId);
  const validation = updateTaskSchema.safeParse(taskData);

  if (!validation.success) {
    throw new Error('Invalid task data.');
  }

  const task = await updateTask(taskId, validation.data);

  if (!task) {
    throw new Error('Task could not be found or updated.');
  }

  revalidateTaskViews(taskId, task.project);

  if (previousTask?.project && previousTask.project !== task.project) {
    revalidatePath(`/projects/${previousTask.project}`);
  }

  return taskForClient(task);
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  const task = await getTaskById(taskId);

  await deleteTask(taskId);

  revalidateTaskViews(taskId, task?.project);
}
