export interface BillingPayment {
  date: number;
  amount: number;
  currency: string;
  description: string;
  invoiceId?: string;
  type: "payment" | "refund";
}

export interface BillingUser {
  customerId: string;
  email: string;
  name: string;
  totalPaid: number;
  totalRefunded: number;
  payments: BillingPayment[];
}

export type BillingSortKey =
  | "name"
  | "totalPaid"
  | "totalRefunded"
  | "netAmount"
  | "paymentCount"
  | "lastPayment";

export type BillingSortDirection = "asc" | "desc";

export interface BillingSort {
  key: BillingSortKey;
  direction: BillingSortDirection;
}

export const MAX_BILLING_SEARCH_LENGTH = 100;

export function normalizeBillingSearch(value: string) {
  return value.slice(0, MAX_BILLING_SEARCH_LENGTH);
}

export function getGrossPaid(user: BillingUser) {
  return user.totalPaid + (user.totalRefunded || 0);
}

export function getPaymentCount(user: BillingUser) {
  return user.payments.filter(({ type }) => type === "payment").length;
}

export function getLastPayment(user: BillingUser) {
  const paymentDates = user.payments
    .filter(({ type }) => type === "payment")
    .map(({ date }) => date);
  return paymentDates.length > 0 ? Math.max(...paymentDates) : 0;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareUsers(
  left: BillingUser,
  right: BillingUser,
  key: BillingSortKey,
) {
  switch (key) {
    case "name":
      return compareText(left.name, right.name);
    case "totalPaid":
      return getGrossPaid(left) - getGrossPaid(right);
    case "totalRefunded":
      return (left.totalRefunded || 0) - (right.totalRefunded || 0);
    case "netAmount":
      return left.totalPaid - right.totalPaid;
    case "paymentCount":
      return getPaymentCount(left) - getPaymentCount(right);
    case "lastPayment":
      return getLastPayment(left) - getLastPayment(right);
  }
}

export function filterAndSortBillingUsers(
  users: BillingUser[],
  search: string,
  sort: BillingSort,
) {
  const query = normalizeBillingSearch(search).trim().toLocaleLowerCase("en");
  const filteredUsers = query
    ? users.filter((user) =>
        [user.name, user.email, user.customerId].some((value) =>
          value.toLocaleLowerCase("en").includes(query),
        ),
      )
    : users;

  return [...filteredUsers].sort((left, right) => {
    const result = compareUsers(left, right, sort.key);
    if (result !== 0) return sort.direction === "asc" ? result : -result;
    return compareText(left.customerId, right.customerId);
  });
}

function csvCell(value: string | number) {
  const text = String(value);
  const formulaSafe =
    /^\s*[=+\-@]/.test(text) || /^[\t\r]/.test(text) ? `'${text}` : text;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function createBillingCsv(users: BillingUser[]) {
  const headers = [
    "Name",
    "Email",
    "Customer ID",
    "Total paid (GBP)",
    "Total refunded (GBP)",
    "Net amount (GBP)",
    "Payment count",
    "Last payment (UTC)",
  ];
  const rows = users.map((user) => {
    const lastPayment = getLastPayment(user);
    return [
      user.name,
      user.email,
      user.customerId,
      getGrossPaid(user).toFixed(2),
      (user.totalRefunded || 0).toFixed(2),
      user.totalPaid.toFixed(2),
      getPaymentCount(user),
      lastPayment ? new Date(lastPayment * 1000).toISOString() : "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function createBillingCsvFilename(startDate: string, endDate: string) {
  const safeDate = (value: string) => value.replace(/[^0-9-]/g, "");
  return `billing-insights_${safeDate(startDate)}_to_${safeDate(endDate)}.csv`;
}
