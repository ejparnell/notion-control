export function ProjectBadge({
  value,
  className,
}: {
  value: string | null | undefined;
  className: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {value}
    </span>
  );
}