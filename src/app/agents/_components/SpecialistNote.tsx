import { specialistLabel } from "../_lib/specialistLabel";
import type { AgentOrchestratorSpecialistNote } from "@/lib/agents/orchestrator/types";

export function SpecialistNote({ note }: { note: AgentOrchestratorSpecialistNote }) {
  const label = specialistLabel(note.agent);

  return (
    <details className="group rounded-lg border border-border bg-surface text-sm text-muted">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-medium text-foreground">
        <span>{label}: {note.title}</span>
        <span
          aria-hidden="true"
          className="text-muted-soft transition-transform group-open:rotate-180"
        >
          v
        </span>
      </summary>
      <div className="whitespace-pre-wrap border-t border-border px-3 py-2 leading-6 text-muted">
        {note.content}
      </div>
    </details>
  );
}
