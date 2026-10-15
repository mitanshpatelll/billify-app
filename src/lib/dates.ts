// Times are stored as ISO UTC strings; "today" and "this week" are the phone's local days (IST
// for the shops this is for). The shop's day starts at midnight, the week on Monday.

export function startOfDay(now: Date = new Date()): Date {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function startOfWeek(now: Date = new Date()): Date {
  const day = startOfDay(now);
  const sinceMonday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - sinceMonday);
  return day;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "3 days ago", "12 Oct": how long ago, in a shopkeeper's words. */
export function ago(iso: string, now: Date = new Date()): string {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
