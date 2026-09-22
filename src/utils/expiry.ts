/* Expiration dates are day-precise, so they are kept as local 'YYYY-MM-DD' strings:
   that avoids timezone drift and makes them sortable as plain strings. */

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value: number): string => String(value).padStart(2, '0');

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const today = (): string => toIsoDate(new Date());

const parseIsoDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (isoDate: string, days: number): string => {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

/* Reminders land in the morning of the expiration day rather than at its midnight. */
const REMINDER_HOUR = 9;

/* The moment to remind about a date, or null once that moment has gone by. Fusing the two
   means a caller cannot build the date and forget to check it. */
export const reminderTime = (isoDate: string): Date | null => {
  const at = parseIsoDate(isoDate);
  at.setHours(REMINDER_HOUR);
  return at.getTime() > Date.now() ? at : null;
};

/* Rounded because local midnights are 23 or 25 hours apart across a DST change. */
export const daysUntil = (isoDate: string): number =>
  Math.round((parseIsoDate(isoDate).getTime() - parseIsoDate(today()).getTime()) / MILLISECONDS_PER_DAY);

export interface ExpiryChip {
  label: string;
  color: 'success' | 'warning' | 'danger';
}

export const expiryChip = (isoDate: string): ExpiryChip => {
  const days = daysUntil(isoDate);

  if (days > 1) {
    return { label: String(days), color: 'success' };
  }
  if (days === 1) {
    return { label: 'tomorrow', color: 'warning' };
  }
  if (days === 0) {
    return { label: 'today', color: 'danger' };
  }
  return { label: `+${-days}`, color: 'danger' };
};
