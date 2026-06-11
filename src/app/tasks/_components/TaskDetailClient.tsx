'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  formatDate,
} from '@/lib/helper/client';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import type {
  TaskClarifierContext,
  TaskClarifierTaskContext,
  TaskClarifierTaskUpdatePatch,
} from '@/lib/types/task-clarifier';
import { ProjectBadge } from '@/app/projects/_components/ProjectBadge';
import ProjectInfoCard from '@/app/projects/_components/ProjectInfoCard';
import TaskClarifierChat from './TaskClarifierChat';
import TaskDeleteModal from './TaskDeleteModal';
import TaskEditModal from './TaskEditModal';
import TaskRelatedTasksSection from './TaskRelatedTasksSection';

export type TaskDetailClientTask =
  Omit<TaskInterface, 'dueDate' | 'completedOn' | 'tags'> & {
    tags: NonNullable<TaskInterface['tags']>;
    dueDate?: string;
    completedOn?: string;
  };

export type TaskDetailClientProject =
  Omit<ProjectInterface, 'startDate' | 'endDate' | 'tags'> & {
    tags: NonNullable<ProjectInterface['tags']>;
  };

type TaskDetailTaskListItem = {
  id: string;
  name: string;
  status?: string;
};

type TaskDetailClientProps = {
  initialTask: TaskDetailClientTask;
  projects: ProjectInterface[];
  project?: TaskDetailClientProject;
  relatedTaskItems: TaskDetailTaskListItem[];
  relatedTaskContext: TaskClarifierTaskContext[];
};

function formatValue(value: string | number | null | undefined) {
  return value ?? 'Not set';
}

function formatListValue(value: string[] | null | undefined) {
  return value?.length ? value.join(', ') : 'Not set';
}

function formatEstTime(value: number | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return `${value} minutes`;
}

function dateFromTaskValue(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getStatusBadgeStyle(status: string | null | undefined) {
  switch (status) {
    case 'Done':
      return 'border-success/40 bg-success-soft text-success';

    case 'In Progress':
      return 'border-primary/40 bg-primary-soft text-primary';

    case 'Queued':
      return 'border-accent/40 bg-accent-soft text-accent';

    case 'Backlog':
    case 'Planning':
      return 'border-warning/40 bg-warning-soft text-warning';

    case 'Blocked':
    case 'Cancelled':
      return 'border-danger/40 bg-danger-soft text-danger';

    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

function getPriorityBadgeStyle(priority: string | null | undefined) {
  switch (priority) {
    case 'High':
      return 'border-danger/40 bg-danger-soft text-danger';

    case 'Medium':
      return 'border-warning/40 bg-warning-soft text-warning';

    case 'Low':
      return 'border-success/40 bg-success-soft text-success';

    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

function getTagBadgeStyle(tag: string) {
  const normalizedTag = tag.toLowerCase();

  if (
    normalizedTag.includes('client') ||
    normalizedTag.includes('ai') ||
    normalizedTag.includes('agent') ||
    normalizedTag.includes('automation')
  ) {
    return 'border-secondary/40 bg-secondary-soft text-secondary';
  }

  if (
    normalizedTag.includes('work') ||
    normalizedTag.includes('frontend') ||
    normalizedTag.includes('ui') ||
    normalizedTag.includes('design')
  ) {
    return 'border-primary/40 bg-primary-soft text-primary';
  }

  if (
    normalizedTag.includes('personal') ||
    normalizedTag.includes('backend') ||
    normalizedTag.includes('api') ||
    normalizedTag.includes('data')
  ) {
    return 'border-accent/40 bg-accent-soft text-accent';
  }

  if (normalizedTag.includes('urgent')) {
    return 'border-danger/40 bg-danger-soft text-danger';
  }

  return 'border-border bg-surface-soft text-muted';
}

function taskContextFromTask(task: TaskDetailClientTask): TaskClarifierTaskContext {
  return {
    id: task.id,
    name: task.name,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    dueDate: task.dueDate,
    completedOn: task.completedOn,
    estTime: task.estTime,
    assignedTo: task.assignedTo,
    acceptanceCriteria: task.acceptanceCriteria,
    testingCriteria: task.testingCriteria,
    implementationPlan: task.implementationPlan,
  };
}

export default function TaskDetailClient({
  initialTask,
  projects,
  project,
  relatedTaskItems,
  relatedTaskContext,
}: TaskDetailClientProps) {
  const [task, setTask] = useState(initialTask);
  const [relatedTasks, setRelatedTasks] = useState(relatedTaskItems);
  const [clarifierRelatedTasks, setClarifierRelatedTasks] =
    useState(relatedTaskContext);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    setRelatedTasks(relatedTaskItems);
  }, [relatedTaskItems]);

  useEffect(() => {
    setClarifierRelatedTasks(relatedTaskContext);
  }, [relatedTaskContext]);

  const clarifierContext = useMemo<TaskClarifierContext>(
    () => ({
      task: taskContextFromTask(task),
      ...(project && {
        project: {
          id: project.id,
          name: project.name,
          summary: project.summary,
          status: project.status,
          priority: project.priority,
          tags: project.tags,
        },
      }),
      relatedTasks: clarifierRelatedTasks,
    }),
    [task, project, clarifierRelatedTasks],
  );

  function handleClarifierTaskUpdate(patch: TaskClarifierTaskUpdatePatch) {
    setTask(currentTask => ({
      ...currentTask,
      ...patch,
      tags: patch.tags ?? currentTask.tags,
    }));
  }

  function handleClarifierTasksCreated(tasks: TaskClarifierTaskContext[]) {
    setClarifierRelatedTasks(currentTasks => [
      ...currentTasks,
      ...tasks,
    ]);
    setRelatedTasks(currentTasks => [
      ...currentTasks,
      ...tasks.map(createdTask => ({
        id: createdTask.id,
        name: createdTask.name,
        status: createdTask.status,
      })),
    ]);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">Task</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {task.name}
            </h1>

            <p className="mt-4 text-sm leading-6 text-muted">
              {project
                ? `Linked to ${project.name}.`
                : 'No project is attached to this task yet.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              <TaskEditModal
                task={task}
                projects={projects}
              />

              <TaskDeleteModal
                taskId={task.id}
                taskName={task.name}
              />
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <ProjectBadge
                value={task.status}
                className={getStatusBadgeStyle(task.status)}
              />

              <ProjectBadge
                value={task.priority}
                className={getPriorityBadgeStyle(task.priority)}
              />

              {task.tags.map(tag => (
                <ProjectBadge
                  key={tag}
                  value={tag}
                  className={getTagBadgeStyle(tag)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProjectInfoCard label="Status" value={formatValue(task.status)} />
        <ProjectInfoCard label="Priority" value={formatValue(task.priority)} />
        <ProjectInfoCard label="Tags" value={formatListValue(task.tags)} />
        <ProjectInfoCard label="Project" value={project?.name ?? 'Not set'} />
        <ProjectInfoCard label="Assigned To" value={formatValue(task.assignedTo)} />
        <ProjectInfoCard
          label="Due Date"
          value={formatDate(dateFromTaskValue(task.dueDate), {
            variant: 'long',
            fallback: 'Not set',
          })}
        />
        <ProjectInfoCard
          label="Completed On"
          value={formatDate(dateFromTaskValue(task.completedOn), {
            variant: 'long',
            fallback: 'Not set',
          })}
        />
        <ProjectInfoCard label="Est. Time" value={formatEstTime(task.estTime)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TaskDetailTextSection
          title="Description"
          content={task.description}
        />
        <TaskDetailListSection
          title="Acceptance Criteria"
          items={task.acceptanceCriteria}
        />
        <TaskDetailListSection
          title="Testing Criteria"
          items={task.testingCriteria}
        />
        <TaskDetailListSection
          title="Implementation Plan"
          items={task.implementationPlan}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TaskRelatedTasksSection
          projectName={project?.name}
          tasks={relatedTasks}
        />

        <TaskClarifierChat
          context={clarifierContext}
          onTaskUpdated={handleClarifierTaskUpdate}
          onTasksCreated={handleClarifierTasksCreated}
        />
      </div>
    </div>
  );
}

function TaskDetailTextSection({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/80 p-4 text-foreground shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
        {content?.trim() || 'Not set'}
      </p>
    </section>
  );
}

function TaskDetailListSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  const visibleItems = items?.filter(item => item.trim().length > 0) ?? [];

  return (
    <section className="rounded-lg border border-border bg-surface/80 p-4 text-foreground shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {visibleItems.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-soft">Not set</p>
      )}
    </section>
  );
}
