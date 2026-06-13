'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatDate } from '@/lib/helper/client';
import type {
  ProjectClarifierContext,
  ProjectClarifierNoteInfo,
  ProjectClarifierProjectUpdatePatch,
  ProjectClarifierTaskContext,
} from '@/lib/types/project-clarifier';
import type { ProjectInterface } from '@/lib/types/project';
import ProjectClarifierChat from './ProjectClarifierChat';
import NotesSection from '@/components/shared/notes/NotesSection';
import { ProjectBadge } from './ProjectBadge';
import ProjectDeleteModal from './ProjectDeleteModal';
import ProjectEditModal from './ProjectEditModal';
import ProjectInfoCard from './ProjectInfoCard';
import ProjectTasksSection from './ProjectTasksSection';

export type ProjectDetailClientProject =
  Omit<ProjectInterface, 'startDate' | 'endDate' | 'tags'> & {
    tags: NonNullable<ProjectInterface['tags']>;
    startDate?: string;
    endDate?: string;
  };

type ProjectDetailTaskListItem = {
  id: string;
  name: string;
  status?: string;
};

type ProjectDetailClientProps = {
  initialProject: ProjectDetailClientProject;
  taskItems: ProjectDetailTaskListItem[];
  taskContext: ProjectClarifierTaskContext[];
  noteInfo: ProjectClarifierNoteInfo[];
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

function dateFromProjectValue(value: string | null | undefined) {
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
    normalizedTag.includes('ai') ||
    normalizedTag.includes('agent') ||
    normalizedTag.includes('automation')
  ) {
    return 'border-secondary/40 bg-secondary-soft text-secondary';
  }

  if (
    normalizedTag.includes('frontend') ||
    normalizedTag.includes('ui') ||
    normalizedTag.includes('design')
  ) {
    return 'border-primary/40 bg-primary-soft text-primary';
  }

  if (
    normalizedTag.includes('backend') ||
    normalizedTag.includes('api') ||
    normalizedTag.includes('data')
  ) {
    return 'border-accent/40 bg-accent-soft text-accent';
  }

  return 'border-border bg-surface-soft text-muted';
}

export default function ProjectDetailClient({
  initialProject,
  taskItems,
  taskContext,
  noteInfo,
}: ProjectDetailClientProps) {
  const [project, setProject] = useState(initialProject);
  const [taskListItems, setTaskListItems] = useState(taskItems);
  const [clarifierTaskContext, setClarifierTaskContext] = useState(taskContext);
  const [noteRefreshKey, setNoteRefreshKey] = useState(0);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    setTaskListItems(taskItems);
  }, [taskItems]);

  useEffect(() => {
    setClarifierTaskContext(taskContext);
  }, [taskContext]);

  const clarifierContext = useMemo<ProjectClarifierContext>(
    () => ({
      project,
      tasks: clarifierTaskContext,
      notes: noteInfo,
    }),
    [project, clarifierTaskContext, noteInfo],
  );

  function handleClarifierProjectUpdate(
    patch: ProjectClarifierProjectUpdatePatch,
  ) {
    setProject((currentProject) => ({
      ...currentProject,
      ...patch,
    }));
  }

  function handleClarifierTasksCreated(tasks: ProjectClarifierTaskContext[]) {
    setClarifierTaskContext((currentTasks) => [
      ...currentTasks,
      ...tasks,
    ]);

    setTaskListItems((currentTasks) => [
      ...currentTasks,
      ...tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
      })),
    ]);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="p-5 text-foreground">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">
              Project
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>

            <p className="mt-4 text-sm leading-6 text-muted">
              {project.summary || 'No summary has been added for this project yet.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              <ProjectEditModal
                project={{
                  ...project,
                  startDate: project.startDate,
                  endDate: project.endDate,
                }}
              />

              <ProjectDeleteModal
                projectId={project.id}
                projectName={project.name}
              />
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <ProjectBadge
                value={project.status}
                className={getStatusBadgeStyle(project.status)}
              />

              <ProjectBadge
                value={project.priority}
                className={getPriorityBadgeStyle(project.priority)}
              />

              {project.tags.map((tag) => (
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

      <section className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <ProjectInfoCard label="Status" value={formatValue(project.status)} />
        <ProjectInfoCard label="Priority" value={formatValue(project.priority)} />
        <ProjectInfoCard label="Tags" value={formatListValue(project.tags)} />
        <ProjectInfoCard label="Est. Time" value={formatEstTime(project.estTime)} />
        <ProjectInfoCard label="Assigned To" value={formatValue(project.assignedTo)} />

        <ProjectInfoCard
          label="Start Date"
          value={formatDate(dateFromProjectValue(project.startDate), {
            variant: 'long',
            fallback: 'Not set',
          })}
        />

        <ProjectInfoCard
          label="End Date"
          value={formatDate(dateFromProjectValue(project.endDate), {
            variant: 'long',
            fallback: 'Not set',
          })}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProjectTasksSection projectId={project.id} tasks={taskListItems} />

        <ProjectClarifierChat
          context={clarifierContext}
          onProjectUpdated={handleClarifierProjectUpdate}
          onTasksCreated={handleClarifierTasksCreated}
          onNoteCreated={() => setNoteRefreshKey(k => k + 1)}
        />
      </div>

      <NotesSection targetType="project" targetId={project.id} refreshKey={noteRefreshKey} />
    </div>
  );
}
