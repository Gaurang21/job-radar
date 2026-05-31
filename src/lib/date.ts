/**
 * Timezone-safe date helpers.
 * Never use `new Date().toISOString().slice(0, 10)` — that returns UTC and
 * shifts the day for users in timezones behind UTC.
 */

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayLocalISO(): string {
  return localISO(new Date());
}

/** Format any Date as YYYY-MM-DD in the user's local timezone. */
export function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** N days ago as YYYY-MM-DD in the user's local timezone. */
export function daysAgoLocalISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}

/** The Monday of the week containing `date` (defaults to today). */
export function mondayOfLocal(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Human-readable relative date label.
 * Returns "Today", "Yesterday", "3 days ago", or a locale date string.
 */
export function relativeLabel(iso: string): string {
  const today = todayLocalISO();
  const yesterday = daysAgoLocalISO(1);
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  const diffDays = Math.round(
    (new Date(today).getTime() - new Date(iso).getTime()) / 86_400_000
  );
  if (diffDays > 0 && diffDays < 30) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Parse an ISO date string (YYYY-MM-DD or full ISO) and return a
 * `Date` at local midnight to avoid off-by-one from UTC parsing.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
