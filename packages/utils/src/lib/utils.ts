export function formatDurationDays(days: number): string {
  return `${days} Days`;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
