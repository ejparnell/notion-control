'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import Modal from '@/components/shared/overlays/Modal';
import { deleteTaskAction } from '../_lib/taskActions';

type TaskDeleteModalProps = {
  taskId: string;
  taskName: string;
};

export default function TaskDeleteModal({
  taskId,
  taskName,
}: TaskDeleteModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleDeleteTask() {
    await deleteTaskAction(taskId);
    setIsOpen(false);
    router.push('/tasks');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-danger/50 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger shadow-sm transition hover:border-danger hover:bg-danger-soft/80 hover:shadow-glow-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Delete Task
      </button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          title="Delete Task"
          onClose={() => setIsOpen(false)}
        >
          <ConfirmDelete
            itemName={taskName}
            itemType="task"
            confirmLabel="Delete task"
            onConfirm={handleDeleteTask}
            onCancel={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
