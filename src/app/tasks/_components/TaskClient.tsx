'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListView from '@/components/shared/data-display/ListView';
import type { DataLayout } from '@/lib/helper/data-display';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import type { StatusName } from '@/lib/constants';
import { updateTaskAction } from '../_lib/taskActions';
import TaskKanbanView from './TaskKanbanView';
import TaskTableView from './TaskTableView';
import TasksToolbar from './TasksToolbar';

type TaskClientProps = {
  tasks: TaskInterface[];
  projects: ProjectInterface[];
};

export default function TaskClient({
  tasks,
  projects,
}: TaskClientProps) {
  const router = useRouter();
  const [selectedLayout, setSelectedLayout] = useState<DataLayout>('table');
  const [taskItems, setTaskItems] = useState(tasks);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setTaskItems(tasks);
  }, [tasks]);

  function handleLayoutChange(layout: DataLayout) {
    setSelectedLayout(layout);
    setBoardError(null);
  }

  async function handleTaskStatusMove({
    taskId,
    toStatus,
  }: {
    taskId: string;
    fromStatus: StatusName;
    toStatus: StatusName;
  }) {
    const previousTasks = taskItems;

    setBoardError(null);
    setTaskItems(current =>
      current.map(task =>
        task.id === taskId
          ? { ...task, status: toStatus }
          : task,
      ),
    );

    try {
      await updateTaskAction(taskId, { status: toStatus });
      router.refresh();
    } catch {
      setTaskItems(previousTasks);
      setBoardError('Task status could not be saved. The board has been restored.');
    }
  }

  const itemList = taskItems.map(task => ({
    id: task.id,
    name: task.name,
    status: task.status,
  }));

  return (
    <>
      <TasksToolbar
        projects={projects}
        selectedLayout={selectedLayout}
        onLayoutChange={handleLayoutChange}
      />

      {selectedLayout === 'list' && (
        <ListView to="/tasks" items={itemList} />
      )}

      {selectedLayout === 'table' && (
        <TaskTableView tasks={taskItems} projects={projects} />
      )}

      {selectedLayout === 'board' && (
        <>
          {boardError && (
            <div className="mt-4 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {boardError}
            </div>
          )}
          <TaskKanbanView
            tasks={taskItems}
            projects={projects}
            onMoveStatus={handleTaskStatusMove}
          />
        </>
      )}
    </>
  );
}
