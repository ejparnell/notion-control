import { getAllProjects } from "@/dal/projects";
import { getAllTasks } from "@/dal/tasks";
import AryaChat from "./_components/AryaChat";

export const dynamic = "force-dynamic";

export default async function AryaPage() {
  const [projects, tasks] = await Promise.all([
    getAllProjects().catch(() => []),
    getAllTasks().catch(() => []),
  ]);

  return <AryaChat initialProjects={projects} initialTasks={tasks} />;
}
