export function formatWorkCreateDetails(values: Array<string | undefined>) {
  const details = values.filter((value): value is string =>
    Boolean(value && value.trim().length > 0),
  );

  return details.length > 0 ? details.join(" | ") : "No extra details";
}