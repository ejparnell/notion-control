'use client';

import { useState } from 'react';
import Modal from '@/components/shared/overlays/Modal';
import type { ProjectInterface } from '@/lib/types/project';
import { updateProjectAction } from '../_lib/projectActions';
import ProjectForm, { type ProjectFormSubmitValues } from './ProjectForm';

type EditableProject = Omit<ProjectInterface, 'startDate' | 'endDate'> & {
  startDate?: string;
  endDate?: string;
};

type ProjectEditModalProps = {
  project: EditableProject;
};

export default function ProjectEditModal({ project }: ProjectEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleUpdateProject(values: ProjectFormSubmitValues) {
    await updateProjectAction(project.id, values);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-primary/50 bg-primary-soft px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary-soft/80 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Edit Project
      </button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          title="Edit Project"
          onClose={() => setIsOpen(false)}
        >
          <ProjectForm
            initialProject={project}
            submitLabel="Save changes"
            onSubmit={handleUpdateProject}
          />
        </Modal>
      )}
    </>
  );
}
