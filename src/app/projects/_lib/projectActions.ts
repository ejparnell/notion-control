'use server';

import { revalidatePath } from 'next/cache';

import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectValidation,
  type UpdateProjectInput,
} from '@/lib/validations/projects';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import { getAllProjects, createProject, getProjectById, updateProject, deleteProject } from '@/dal/projects';
import { getTasksByProject } from '@/dal/tasks';

export const fetchProjects = async (): Promise<ProjectInterface[]> => {
  return await getAllProjects();
};

export const fetchProjectContext = async (
  id: string,
): Promise<ProjectInterface | null> => {
  return await getProjectById(id);
};

export const fetchTasksForProject = async (
  projectId: string,
): Promise<TaskInterface[]> => {
  return await getTasksByProject(projectId);
};

export const createProjectAction = async (
  projectData: CreateProjectValidation,
) => {
  const validation = createProjectSchema.safeParse(projectData);

  if (!validation.success) {
    throw new Error('Invalid project data');
  }

  await createProject(validation.data);

  revalidatePath('/projects');
};

export const updateProjectAction = async (
  projectId: string,
  projectData: UpdateProjectInput,
) => {
  const validation = updateProjectSchema.safeParse(projectData);

  if (!validation.success) {
    throw new Error('Invalid project data');
  }

  const project = await updateProject(projectId, validation.data);

  if (!project) {
    throw new Error('Project could not be found or updated');
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);

  return {
    ...project,
    tags: project.tags ?? [],
    startDate: project.startDate?.toISOString(),
    endDate: project.endDate?.toISOString(),
  };
};

export const deleteProjectAction = async (
  projectId: string,
) => {
  await deleteProject(projectId);

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
};
