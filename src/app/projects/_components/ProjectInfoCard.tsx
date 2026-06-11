type ProjectInfoCardProps = {
  label: string;
  value: string | number;
};

export default function ProjectInfoCard({ label, value }: ProjectInfoCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-foreground shadow-sm backdrop-blur">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}