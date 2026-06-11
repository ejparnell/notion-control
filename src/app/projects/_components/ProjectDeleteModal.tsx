'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import Modal from '@/components/shared/overlays/Modal';
import { deleteProjectAction } from '../_lib/projectActions';

type ProjectDeleteModalProps = {
  projectId: string;
  projectName: string;
};

export default function ProjectDeleteModal({
  projectId,
  projectName,
}: ProjectDeleteModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleDeleteProject() {
    await deleteProjectAction(projectId);
    setIsOpen(false);
    router.push('/projects');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-danger/50 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger shadow-sm transition hover:border-danger hover:bg-danger-soft/80 hover:shadow-glow-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Delete Project
      </button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          title="Delete Project"
          onClose={() => setIsOpen(false)}
        >
          <ConfirmDelete
            itemName={projectName}
            itemType="project"
            confirmLabel="Delete project"
            onConfirm={handleDeleteProject}
            onCancel={() => setIsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
