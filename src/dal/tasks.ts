'use server';

import { connectToDatabase } from '@/lib/db/connection';
import { TaskModel } from '@/lib/db/models/task';
import type { TaskInterface } from '@/lib/types/task';
import type {
  CreateTaskValidation,
  UpdateTaskValidation,
} from '@/lib/validations/tasks';

type TaskRecord = Omit<TaskInterface, 'id'> & {
  id?: string;
  _id?: { toString(): string };
};

const taskId = (task: TaskRecord) => {
  const id = task.id ?? task._id?.toString();

  if (!id) {
    throw new Error('Task record is missing an id');
  }

  return id;
};

const serializeTask = (task: TaskRecord): TaskInterface => ({
  id: taskId(task),
  name: task.name,
  description: task.description,
  status: task.status,
  dueDate: task.dueDate,
  priority: task.priority,
  tags: task.tags ? [...task.tags] : undefined,
  project: task.project,
  completedOn: task.completedOn,
  estTime: task.estTime,
  assignedTo: task.assignedTo,
  acceptanceCriteria: task.acceptanceCriteria ? [...task.acceptanceCriteria] : undefined,
  testingCriteria: task.testingCriteria ? [...task.testingCriteria] : undefined,
  implementationPlan: task.implementationPlan ? [...task.implementationPlan] : undefined,
});

export const getTasksByProject = async (
  projectId: string,
): Promise<TaskInterface[]> => {
  await connectToDatabase();

  const tasks = await TaskModel.find({ project: projectId }).lean();
  return tasks.map((task) => serializeTask(task as TaskRecord));
};

export const getTaskById = async (
  id: string,
): Promise<TaskInterface | null> => {
  await connectToDatabase();

  const task = await TaskModel.findById(id).lean();
  return task ? serializeTask(task as TaskRecord) : null;
};

export const createTaskByProject = async (
  projectId: string,
  data: CreateTaskValidation,
): Promise<TaskInterface> => {
  await connectToDatabase();

  const task = new TaskModel({
    ...data,
    project: projectId,
  });

  await task.save();

  return serializeTask(task.toObject() as TaskRecord);
};

export const getAllTasks = async (): Promise<TaskInterface[]> => {
  await connectToDatabase();

  const tasks = await TaskModel.find().lean();
  return tasks.map((task) => serializeTask(task as TaskRecord));
};

export const updateTask = async (
  id: string,
  updateData: UpdateTaskValidation,
): Promise<TaskInterface | null> => {
  await connectToDatabase();

  const updatePayload = buildTaskUpdatePayload(updateData);
  const task = await TaskModel.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  }).lean();

  return task ? serializeTask(task as TaskRecord) : null;
};

export const deleteTask = async (id: string): Promise<void> => {
  await connectToDatabase();
  await TaskModel.findByIdAndDelete(id);
};

function buildTaskUpdatePayload(updateData: UpdateTaskValidation) {
  if (!Object.prototype.hasOwnProperty.call(updateData, 'assignedTo')) {
    return updateData;
  }

  if (updateData.assignedTo !== undefined) {
    return updateData;
  }

  const { assignedTo: _assignedTo, ...rest } = updateData;

  return {
    ...rest,
    $unset: {
      assignedTo: '',
    },
  };
}
