export function WorkCreateList({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  const visibleItems = items?.filter(item => item.trim().length > 0) ?? [];

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase text-muted-soft">
        {label}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-muted">
        {visibleItems.slice(0, 4).map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
