import ListView from '@/components/shared/data-display/ListView';

type TaskListItem = {
  id: string;
  name: string;
  status?: string;
};

type TaskRelatedTasksSectionProps = {
  projectName?: string;
  tasks: TaskListItem[];
};

export default function TaskRelatedTasksSection({
  projectName,
  tasks,
}: TaskRelatedTasksSectionProps) {
  return (
    <section>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Related Tasks
          </h2>
          <p className="text-sm text-muted">
            {projectName
              ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} also linked to ${projectName}`
              : 'No project is attached to this task yet'}
          </p>
        </div>
      </div>

      <div className="px-6">
        {tasks.length > 0 ? (
          <ListView to="/tasks" items={tasks} />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            No related tasks yet.
          </div>
        )}
      </div>
    </section>
  );
}
