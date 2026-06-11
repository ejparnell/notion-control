'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ListView from '@/components/shared/data-display/ListView';
import Modal from '@/components/shared/overlays/Modal';
import TaskForm, {
  type TaskFormSubmitValues,
} from '@/app/tasks/_components/TaskForm';
import { createTaskForProjectAction } from '@/app/tasks/_lib/taskActions';

type TaskListItem = {
  id: string;
  name: string;
  status?: string;
};

type ProjectTasksSectionProps = {
  projectId: string;
  tasks: TaskListItem[];
};

export default function ProjectTasksSection({
  projectId,
  tasks,
}: ProjectTasksSectionProps) {
  const router = useRouter();
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(false);

  async function handleCreateTask(values: TaskFormSubmitValues) {
    await createTaskForProjectAction(projectId, values);
    setOpenCreateTaskModal(false);
    router.refresh();
  }

  return (
    <section>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
            <p className="text-sm text-muted">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} linked to
              this project
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenCreateTaskModal(true)}
            className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 hover:shadow-glow-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            New Task
          </button>
        </div>
      </div>

      <div className="pr-6 pl-6">
        <ListView to={'/tasks'} items={tasks} />
      </div>

      {openCreateTaskModal && (
        <Modal
          isOpen={openCreateTaskModal}
          title="Create Task"
          onClose={() => setOpenCreateTaskModal(false)}
        >
          <TaskForm
            projectId={projectId}
            onSubmit={handleCreateTask}
          />
        </Modal>
      )}
    </section>
  );
}
