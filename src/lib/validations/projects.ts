import z from 'zod';
import {
  agentAssigneeValues,
  priorityValues,
  statusValues,
  tagValues,
} from '@/lib/constants';
import { dateForValidation } from '@/lib/helper/client';
import type { ProjectInterface } from '@/lib/types/project';

const optionalDate = z.preprocess(dateForValidation, z.date().optional());

const optionalNumber = z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.number().min(0, 'Estimated time cannot be negative').optional(),
);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  summary: z.string().optional(),
  status: z.enum(statusValues),
  priority: z.enum(priorityValues),
  tags: z.array(z.enum(tagValues)).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  estTime: optionalNumber,
  assignedTo: z.enum(agentAssigneeValues).optional(),
});

export const createProjectSchema = projectSchema.omit({ id: true });

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ProjectValidation = z.infer<typeof projectSchema>;
export type CreateProjectValidation = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type UpdateProjectValidation = z.infer<typeof updateProjectSchema>;

export const validateProject = (project: ProjectInterface) => {
  return projectSchema.safeParse(project);
};

export const validateCreateProject = (
  project: Omit<ProjectInterface, 'id'>
) => {
  return createProjectSchema.safeParse(project);
};

export const validateUpdateProject = (
  project: Partial<Omit<ProjectInterface, 'id'>>
) => {
  return updateProjectSchema.safeParse(project);
};
