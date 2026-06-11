'use client';

import { useState } from 'react';
import { createProjectAction } from '../_lib/projectActions';
import type { CreateProjectValidation } from '@/lib/validations/projects';
import Modal from '@/components/shared/overlays/Modal';
import ProjectForm from './ProjectForm';
import { DataToolbar } from '@/components/shared/data-display/DataToolbar';
import { DataToolbarSettingsMenu } from '@/components/shared/data-display/DataToolbarSettingsMenu';
import type { DataLayout } from '@/lib/helper/data-display';
import {
  AiIcon,
  AutomationIcon,
  FilterIcon,
  SearchIcon,
  SettingsIcon,
  SortIcon,
} from '@/components/svg';

type ActivePanel =
  | 'filter'
  | 'sort'
  | 'automation'
  | 'ai'
  | 'search'
  | 'settings'
  | null;

type ProjectsToolbarProps = {
  selectedLayout: DataLayout;
  onLayoutChange: (layout: DataLayout) => void;
};

export default function ProjectsToolbar({
  selectedLayout,
  onLayoutChange,
}: ProjectsToolbarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);

  const toolbarItems = [
    {
      id: 'filter',
      label: 'Filter',
      icon: <FilterIcon />,
      active: activePanel === 'filter',
      onClick: () => {
        console.log('Filter clicked');
        setActivePanel('filter');
      },
    },
    {
      id: 'sort',
      label: 'Sort',
      icon: <SortIcon />,
      active: activePanel === 'sort',
      onClick: () => {
        console.log('Sort clicked');
        setActivePanel('sort');
      },
    },
    {
      id: 'automation',
      label: 'Automation',
      icon: <AutomationIcon />,
      active: activePanel === 'automation',
      onClick: () => {
        console.log('Automation clicked');
        setActivePanel('automation');
      },
    },
    {
      id: 'ai',
      label: 'AI',
      icon: <AiIcon />,
      active: activePanel === 'ai',
      onClick: () => {
        console.log('AI clicked');
        setActivePanel('ai');
      },
    },
    {
      id: 'search',
      label: 'Search',
      icon: <SearchIcon />,
      active: activePanel === 'search',
      onClick: () => {
        console.log('Search clicked');
        setActivePanel('search');
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      active: activePanel === 'settings',
      onClick: () => {
        setActivePanel((current) =>
          current === 'settings' ? null : 'settings',
        );
      },
    },
  ];

  async function handleCreateProject(data: CreateProjectValidation) {
    await createProjectAction(data);
    setOpenCreateProjectModal(false);
  }

  return (
    <div className="relative">
      <DataToolbar
        className="mt-4"
        items={toolbarItems}
        primaryAction={{
          label: 'New Project',
          onClick: () => setOpenCreateProjectModal(true),
          menuLabel: 'Open new project menu',
          onMenuClick: () => console.log('Open new project menu'),
        }}
      />

      {activePanel === 'settings' && (
        <DataToolbarSettingsMenu
          selectedLayout={selectedLayout}
          onLayoutChange={(layout) => {
            onLayoutChange(layout);
            setActivePanel(null);
          }}
        />
      )}

      {/* Create Project Modal */}
      {openCreateProjectModal && (
        <Modal
          isOpen={openCreateProjectModal}
          title="Create Project"
          onClose={() => setOpenCreateProjectModal(false)}
        >
            <ProjectForm onSubmit={handleCreateProject} />

        </Modal>
      )}
    </div>
  );
}
