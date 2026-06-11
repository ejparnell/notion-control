import { fetchProjects } from './_lib/projectActions';
import ProjectClient from './_components/ProjectClient';

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-wide text-foreground">
          Projects
        </h2>

        <p className="mt-1 text-sm text-muted">
          List of projects with details.
        </p>
      </div>

      <ProjectClient projects={projects} />
    </>
  );
}