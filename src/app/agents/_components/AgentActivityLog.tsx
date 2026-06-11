import { formatActivityDate } from "../_lib/formatActivityDate";
import { modelModeLabel } from "../_lib/modelModeLabel";
import type { AgentActivityInterface } from "@/lib/types/agent-activity";

export function AgentActivityLog({
  activities,
}: {
  activities: AgentActivityInterface[];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface/80 p-4 text-foreground shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
      <div className="mt-3 space-y-3">
        {activities.length === 0 && (
          <p className="text-sm text-muted-soft">No orchestrator runs yet.</p>
        )}

        {activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-md border border-border bg-surface-soft px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase text-muted-soft">
                {modelModeLabel(activity.modelMode)}
              </p>
              <p className="text-xs text-muted-soft">
                {formatActivityDate(activity.createdAt)}
              </p>
            </div>
            <p className="mt-1 break-words text-sm text-foreground">
              {activity.promptPreview}
            </p>
            <p className="mt-1 text-xs text-muted">
              {activity.proposedActions.length} proposed actions
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
