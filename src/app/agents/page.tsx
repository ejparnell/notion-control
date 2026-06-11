import AgentOrchestratorChat from "./_components/AgentOrchestratorChat";
import { fetchAgentDashboardData } from "./_lib/agentActions";

export default async function AgentsPage() {
  const { projects, tasks, activities } = await fetchAgentDashboardData();

  return (
    <AgentOrchestratorChat
      initialProjects={projects}
      initialTasks={tasks}
      initialActivities={activities}
    />
  );
}
