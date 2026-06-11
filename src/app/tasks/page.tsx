import { fetchTasks } from "./_lib/taskActions";
import { fetchProjects } from "../projects/_lib/projectActions";
import TaskClient from "./_components/TaskClient";

export default async function TasksPage() {
    const [tasks, projects] = await Promise.all([
        fetchTasks(),
        fetchProjects(),
    ]);

    return (
        <>
            <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
            <p className="mt-1 text-sm text-muted">List of tasks with details.</p>

            <TaskClient tasks={tasks} projects={projects} />
        </>
    )
}
