import { birthdaySchema } from "@/lib/auth/schemas";

function formatDate(year: number, month: number, day: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function normalizeBirthday(value: string): string | null {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const match = isoMatch ?? displayMatch;

  if (!match) return null;

  const [, first, second, year] = match;
  const normalized = isoMatch
    ? formatDate(Number(first), Number(second), Number(year))
    : formatDate(Number(year), Number(second), Number(first));

  return birthdaySchema.safeParse(normalized).success ? normalized : null;
}
