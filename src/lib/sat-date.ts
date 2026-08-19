export type SatCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Resolve a date-input value to 8:00 AM in the browser's current time zone. */
export function satExamTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 8, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date.getTime();
}

export function satCountdown(target: number, now: number): SatCountdown {
  const secondsLeft = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(secondsLeft / 86_400),
    hours: Math.floor((secondsLeft % 86_400) / 3_600),
    minutes: Math.floor((secondsLeft % 3_600) / 60),
    seconds: secondsLeft % 60,
  };
}

export function formatSatDate(value: string, timeZone?: string): string {
  const target = satExamTime(value);
  if (target === null) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(target);
}
