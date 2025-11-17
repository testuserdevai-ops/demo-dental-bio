export const fillTemplate = (template: string, vars: Record<string, string | number>): string => {
  return template.replace(/{{(.*?)}}/g, (_, key) => String(vars[key.trim()] ?? ""));
}

export const toTitleCase = (str: string) => {
  return str
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const usernameRegex = /^[a-zA-Z0-9._-]{3,30}$/;

export const isValidUsername = (username: string) => {
  return usernameRegex.test(username);
}

// New: Parse various date string formats (dd/mm/yyyy, yyyy-mm-dd, ISO)
export const parseAnyDate = (input: string | null | undefined): Date | undefined => {
  const raw = (input || "").trim();
  if (!raw) return undefined;

  // dd/mm/yyyy
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m1 = ddmmyyyy.exec(raw);
  if (m1) {
    const day = Number(m1[1]);
    const month = Number(m1[2]);
    const year = Number(m1[3]);
    return new Date(year, month - 1, day);
  }

  // yyyy-mm-dd or yyyy-mm-ddTHH:MM:SS...
  const isoLike = /^(\d{4})-(\d{2})-(\d{2})/;
  const m2 = isoLike.exec(raw);
  if (m2) {
    const year = Number(m2[1]);
    const month = Number(m2[2]);
    const day = Number(m2[3]);
    return new Date(year, month - 1, day);
  }

  // Fallback to Date constructor
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  return undefined;
};