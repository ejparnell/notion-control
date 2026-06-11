import { agentGroupForValue } from "../_lib/agentGroupForValue";
import { workloadGroups } from "../_lib/workloadGroups";
import type { ProjectInterface } from "@/lib/types/project";
import type { TaskInterface } from "@/lib/types/task";

export function AgentWorkload({
  projects,
  tasks,
}: {
  projects: ProjectInterface[];
  tasks: TaskInterface[];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/80 p-4 text-foreground shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-foreground">Agent Workload</h2>
      <div className="mt-3 space-y-3">
        {workloadGroups.map((assignee) => {
          const assignedProjects = projects.filter(project =>
            agentGroupForValue(project.assignedTo) === assignee,
          );
          const assignedTasks = tasks.filter(task =>
            agentGroupForValue(task.assignedTo) === assignee,
          );

          return (
            <div
              key={assignee}
              className="rounded-md border border-border bg-surface-soft px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {assignee}
                </p>
                <p className="text-xs text-muted-soft">
                  {assignedProjects.length} projects | {assignedTasks.length} tasks
                </p>
              </div>

              <div className="mt-2 space-y-1 text-xs text-muted">
                {assignedProjects.slice(0, 2).map(project => (
                  <p key={project.id} className="truncate">
                    Project: {project.name}
                  </p>
                ))}
                {assignedTasks.slice(0, 3).map(task => (
                  <p key={task.id} className="truncate">
                    Task: {task.name}
                  </p>
                ))}
                {assignedProjects.length === 0 && assignedTasks.length === 0 && (
                  <p className="text-muted-soft">No assigned work</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
