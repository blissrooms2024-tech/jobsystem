function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function lastOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return toISODate(new Date(y, m, 0));
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}
