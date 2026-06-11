'use server';

import { revalidatePath } from 'next/cache';

import { getRecentAgentActivities } from '@/dal/agentActivities';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
} from '@/dal/projects';
import {
  createTaskByProject,
  getAllTasks,
  getTaskById,
  updateTask,
} from '@/dal/tasks';
import { agentAssigneeValues, type AgentAssigneeName } from '@/lib/constants';
import type {
  AgentOrchestratorAssignment,
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorWorkCreateAction,
} from '@/lib/agents/orchestrator/types';
import { buildWorkCreateTaskDescription } from '@/lib/agents/orchestrator/work-description';
import { createProjectSchema } from '@/lib/validations/projects';
import { createTaskSchema } from '@/lib/validations/tasks';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';

export async function fetchAgentDashboardData() {
  const [projects, tasks, activities] = await Promise.all([
    getAllProjects(),
    getAllTasks(),
    getRecentAgentActivities(5),
  ]);

  return {
    projects,
    tasks,
    activities,
  };
}

export async function applyAgentAssignmentAction(
  action: AgentOrchestratorAssignmentAction,
): Promise<AgentOrchestratorAssignment[]> {
  if (action.type !== 'assignment-update' || !Array.isArray(action.assignments)) {
    throw new Error('Invalid assignment action.');
  }

  const plans = await Promise.all(
    action.assignments.map(async assignment => {
      if (!isAgentAssignee(assignment.assignedTo)) {
        throw new Error('Invalid agent assignee.');
      }

      if (assignment.targetType === 'project') {
        const project = await getProjectById(assignment.targetId);

        if (!project) {
          throw new Error(`Project could not be found: ${assignment.targetName}`);
        }

        return {
          assignment: {
            ...assignment,
            targetName: project.name,
            currentAssignedTo: project.assignedTo,
          },
          project,
        };
      }

      if (assignment.targetType === 'task') {
        const task = await getTaskById(assignment.targetId);

        if (!task) {
          throw new Error(`Task could not be found: ${assignment.targetName}`);
        }

        return {
          assignment: {
            ...assignment,
            targetName: task.name,
            currentAssignedTo: task.assignedTo,
          },
          task,
        };
      }

      throw new Error('Invalid assignment target.');
    }),
  );

  const appliedAssignments: AgentOrchestratorAssignment[] = [];

  for (const plan of plans) {
    if ('project' in plan && plan.project) {
      await updateProject(plan.project.id, {
        assignedTo: plan.assignment.assignedTo,
      });
      revalidatePath(`/projects/${plan.project.id}`);
      appliedAssignments.push(plan.assignment);
      continue;
    }

    if (!('task' in plan)) {
      continue;
    }

    await updateTask(plan.task.id, {
      assignedTo: plan.assignment.assignedTo,
    });
    revalidatePath(`/tasks/${plan.task.id}`);

    if (plan.task.project) {
      revalidatePath(`/projects/${plan.task.project}`);
    }

    appliedAssignments.push(plan.assignment);
  }

  revalidatePath('/agents');
  revalidatePath('/projects');
  revalidatePath('/tasks');

  return appliedAssignments;
}

export async function applyAgentWorkCreateAction(
  action: AgentOrchestratorWorkCreateAction,
): Promise<{
  project: ProjectInterface;
  tasks: TaskInterface[];
}> {
  if (action.type !== 'work-create') {
    throw new Error('Invalid work creation action.');
  }

  const projectValidation = createProjectSchema.safeParse(action.project);

  if (!projectValidation.success) {
    throw new Error('Invalid project draft.');
  }

  if (!Array.isArray(action.tasks) || action.tasks.length === 0) {
    throw new Error('At least one task draft is required.');
  }

  const taskValidations = action.tasks.map(task =>
    createTaskSchema.safeParse(task),
  );

  if (taskValidations.some(validation => !validation.success)) {
    throw new Error('Invalid task draft.');
  }

  const project = await createProject(projectValidation.data);
  const tasks: TaskInterface[] = [];

  for (const validation of taskValidations) {
    if (!validation.success) {
      continue;
    }

    const description = buildWorkCreateTaskDescription(validation.data);
    const taskData = {
      ...validation.data,
      ...(description && { description }),
    };
    const task = await createTaskByProject(project.id, taskData);
    tasks.push(task);
  }

  revalidatePath('/agents');
  revalidatePath('/projects');
  revalidatePath(`/projects/${project.id}`);
  revalidatePath('/tasks');

  for (const task of tasks) {
    revalidatePath(`/tasks/${task.id}`);
  }

  return { project, tasks };
}

function isAgentAssignee(value: unknown): value is AgentAssigneeName {
  return (
    typeof value === 'string' &&
    agentAssigneeValues.includes(value as AgentAssigneeName)
  );
}
