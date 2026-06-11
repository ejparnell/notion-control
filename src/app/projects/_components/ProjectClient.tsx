'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectAction } from '../_lib/projectActions';
import type { DataLayout } from '@/lib/helper/data-display';
import type { ProjectInterface } from '@/lib/types/project';
import ProjectsToolbar from './ProjectsToolbar';
import ListView from '@/components/shared/data-display/ListView';
import ProjectTableView from './ProjectTableView';
import ProjectKanbanView from './ProjectKanbanView';
import type { StatusName } from '@/lib/constants';

type ProjectClientProps = {
  projects: ProjectInterface[];
}

export default function ProjectClient({ projects }: ProjectClientProps) {
  const router = useRouter();
  const [selectedLayout, setSelectedLayout] = useState<DataLayout>('table');
  const [projectItems, setProjectItems] = useState(projects);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setProjectItems(projects);
  }, [projects]);

  function handleLayoutChange(layout: DataLayout) {
    setSelectedLayout(layout);
    setBoardError(null);
  }

  async function handleProjectStatusMove({
    projectId,
    toStatus,
  }: {
    projectId: string;
    fromStatus: StatusName;
    toStatus: StatusName;
  }) {
    const previousProjects = projectItems;

    setBoardError(null);
    setProjectItems(current =>
      current.map(project =>
        project.id === projectId
          ? { ...project, status: toStatus }
          : project,
      ),
    );

    try {
      await updateProjectAction(projectId, { status: toStatus });
      router.refresh();
    } catch {
      setProjectItems(previousProjects);
      setBoardError('Project status could not be saved. The board has been restored.');
    }
  }

  const itemList = projectItems.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
  }));

  return (
    <>
      <ProjectsToolbar
        selectedLayout={selectedLayout}
        onLayoutChange={handleLayoutChange}
      />

      {selectedLayout === 'list' && (
        <ListView to={'/projects'} items={itemList} />
      )}

      {selectedLayout === 'table' && (
        <ProjectTableView projects={projectItems} />
      )}

      {selectedLayout === 'board' && (
        <>
          {boardError && (
            <div className="mt-4 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {boardError}
            </div>
          )}
          <ProjectKanbanView
            projects={projectItems}
            onMoveStatus={handleProjectStatusMove}
          />
        </>
      )}
    </>
  );
}
