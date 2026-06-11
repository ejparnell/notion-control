import z from 'zod';
import {
  agentAssigneeValues,
  priorityValues,
  statusValues,
  tagValues,
} from '@/lib/constants';
import { dateForValidation } from '@/lib/helper/client';
import type { TaskInterface } from '@/lib/types/task';

const optionalDate = z.preprocess(dateForValidation, z.date().optional());

const optionalNumber = z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().min(0, 'Estimated time cannot be negative').optional(),
);

const optionalString = z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.string().trim().optional(),
);

const optionalStringList = z.preprocess(
  value => {
    if (!Array.isArray(value)) {
      return value;
    }

    const items = value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    return items.length > 0 ? items : undefined;
  },
  z.array(z.string().trim().min(1)).optional(),
);

export const taskSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  description: optionalString,
  status: z.enum(statusValues).optional(),
  dueDate: optionalDate,
  priority: z.enum(priorityValues).optional(),
  tags: z.array(z.enum(tagValues)).optional(),
  project: z.string().min(1, 'Project is required').optional(),
  completedOn: optionalDate,
  estTime: optionalNumber,
  assignedTo: z.enum(agentAssigneeValues).optional(),
  acceptanceCriteria: optionalStringList,
  testingCriteria: optionalStringList,
  implementationPlan: optionalStringList,
});

export const createTaskSchema = taskSchema.omit({
  id: true,
  project: true,
});

export const updateTaskSchema = taskSchema
  .omit({ id: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type TaskValidation = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskValidation = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskValidation = z.infer<typeof updateTaskSchema>;

export const validateTask = (task: TaskInterface) => {
  return taskSchema.safeParse(task);
};

export const validateCreateTask = (task: unknown) => {
  return createTaskSchema.safeParse(task);
};

export const validateUpdateTask = (task: unknown) => {
  return updateTaskSchema.safeParse(task);
};
