const WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
const WEEKDAYS_LONG = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];
const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

export function dateFromYmd(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatUzShortDay(date: Date): string {
  return WEEKDAYS_SHORT[date.getDay()] ?? "";
}

export function formatUzShortDate(date: Date): string {
  return `${formatUzShortDay(date)}, ${date.getDate()}`;
}

export function formatUzLongDate(date: Date): string {
  return `${WEEKDAYS_LONG[date.getDay()] ?? ""}, ${date.getDate()} ${
    MONTHS[date.getMonth()] ?? ""
  }`;
}
