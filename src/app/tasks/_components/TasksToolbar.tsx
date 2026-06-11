'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataToolbar } from '@/components/shared/data-display/DataToolbar';
import { DataToolbarSettingsMenu } from '@/components/shared/data-display/DataToolbarSettingsMenu';
import Modal from '@/components/shared/overlays/Modal';
import type { DataLayout } from '@/lib/helper/data-display';
import type { ProjectInterface } from '@/lib/types/project';
import {
  AiIcon,
  AutomationIcon,
  FilterIcon,
  SearchIcon,
  SettingsIcon,
  SortIcon,
} from '@/components/svg';
import { createTaskForProjectAction } from '../_lib/taskActions';
import TaskForm, { type TaskFormSubmitValues } from './TaskForm';

type ActivePanel =
  | 'filter'
  | 'sort'
  | 'automation'
  | 'ai'
  | 'search'
  | 'settings'
  | null;

type TasksToolbarProps = {
  projects: ProjectInterface[];
  selectedLayout: DataLayout;
  onLayoutChange: (layout: DataLayout) => void;
};

export default function TasksToolbar({
  projects,
  selectedLayout,
  onLayoutChange,
}: TasksToolbarProps) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [openCreateTaskModal, setOpenCreateTaskModal] = useState(false);

  const toolbarItems = [
    {
      id: 'filter',
      label: 'Filter',
      icon: <FilterIcon />,
      active: activePanel === 'filter',
      onClick: () => setActivePanel('filter'),
    },
    {
      id: 'sort',
      label: 'Sort',
      icon: <SortIcon />,
      active: activePanel === 'sort',
      onClick: () => setActivePanel('sort'),
    },
    {
      id: 'automation',
      label: 'Automation',
      icon: <AutomationIcon />,
      active: activePanel === 'automation',
      onClick: () => setActivePanel('automation'),
    },
    {
      id: 'ai',
      label: 'AI',
      icon: <AiIcon />,
      active: activePanel === 'ai',
      onClick: () => setActivePanel('ai'),
    },
    {
      id: 'search',
      label: 'Search',
      icon: <SearchIcon />,
      active: activePanel === 'search',
      onClick: () => setActivePanel('search'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      active: activePanel === 'settings',
      onClick: () => {
        setActivePanel(current => current === 'settings' ? null : 'settings');
      },
    },
  ];

  async function handleCreateTask(values: TaskFormSubmitValues) {
    if (!values.project) {
      throw new Error('Project id is required.');
    }

    await createTaskForProjectAction(values.project, values);
    setOpenCreateTaskModal(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <DataToolbar
        className="mt-4"
        items={toolbarItems}
        primaryAction={{
          label: 'New Task',
          onClick: () => setOpenCreateTaskModal(true),
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

      {openCreateTaskModal && (
        <Modal
          isOpen={openCreateTaskModal}
          title="Create Task"
          onClose={() => setOpenCreateTaskModal(false)}
        >
          <TaskForm
            projectOptions={projects}
            submitLabel="Save task"
            onSubmit={handleCreateTask}
          />
        </Modal>
      )}
    </div>
  );
}
