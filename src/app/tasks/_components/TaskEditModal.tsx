'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/shared/overlays/Modal';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import { updateTaskAction } from '../_lib/taskActions';
import TaskForm, { type TaskFormSubmitValues } from './TaskForm';

type EditableTask = Omit<TaskInterface, 'dueDate' | 'completedOn'> & {
  dueDate?: string;
  completedOn?: string;
};

type TaskEditModalProps = {
  task: EditableTask;
  projects: ProjectInterface[];
};

export default function TaskEditModal({
  task,
  projects,
}: TaskEditModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleUpdateTask(values: TaskFormSubmitValues) {
    await updateTaskAction(task.id, values);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-primary/50 bg-primary-soft px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary-soft/80 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Edit Task
      </button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          title="Edit Task"
          onClose={() => setIsOpen(false)}
        >
          <TaskForm
            initialTask={task}
            projectOptions={projects}
            submitLabel="Save changes"
            onSubmit={handleUpdateTask}
          />
        </Modal>
      )}
    </>
  );
}
