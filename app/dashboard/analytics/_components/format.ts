export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number) => `${formatNumber(value)}%`;

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatDateTime = (value: string, timezone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(value));
