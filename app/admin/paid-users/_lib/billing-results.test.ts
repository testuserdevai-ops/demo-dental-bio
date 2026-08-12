import { describe, expect, it } from "bun:test";
import {
  createBillingCsv,
  createBillingCsvFilename,
  filterAndSortBillingUsers,
  MAX_BILLING_SEARCH_LENGTH,
  normalizeBillingSearch,
  type BillingUser,
} from "./billing-results";

const users: BillingUser[] = [
  {
    customerId: "cus_beta",
    email: "beta@example.test",
    name: "Beta Practice",
    totalPaid: 80,
    totalRefunded: 20,
    payments: [
      {
        date: 200,
        amount: 20,
        currency: "GBP",
        description: "Refund",
        type: "refund",
      },
      {
        date: 100,
        amount: 100,
        currency: "GBP",
        description: "Plan",
        type: "payment",
      },
    ],
  },
  {
    customerId: "cus_alpha",
    email: "alpha@example.test",
    name: 'Alpha, "Dental"',
    totalPaid: 250,
    totalRefunded: 0,
    payments: [
      {
        date: 300,
        amount: 250,
        currency: "GBP",
        description: "Plan",
        type: "payment",
      },
    ],
  },
];

describe("billing results", () => {
  it("bounds and searches name, email, and customer identifier", () => {
    expect(normalizeBillingSearch("x".repeat(150))).toHaveLength(
      MAX_BILLING_SEARCH_LENGTH,
    );
    expect(
      filterAndSortBillingUsers(users, "ALPHA@EXAMPLE", {
        key: "name",
        direction: "asc",
      }).map(({ customerId }) => customerId),
    ).toEqual(["cus_alpha"]);
    expect(
      filterAndSortBillingUsers(users, "cus_beta", {
        key: "name",
        direction: "asc",
      }).map(({ customerId }) => customerId),
    ).toEqual(["cus_beta"]);
  });

  it("sorts reconciliation fields deterministically", () => {
    expect(
      filterAndSortBillingUsers(users, "", {
        key: "name",
        direction: "asc",
      }).map(({ customerId }) => customerId),
    ).toEqual(["cus_alpha", "cus_beta"]);
    for (const key of [
      "totalPaid",
      "netAmount",
      "paymentCount",
      "lastPayment",
    ] as const) {
      expect(
        filterAndSortBillingUsers(users, "", {
          key,
          direction: "desc",
        })[0]?.customerId,
      ).toBe("cus_alpha");
    }
    expect(
      filterAndSortBillingUsers(users, "", {
        key: "totalRefunded",
        direction: "desc",
      })[0]?.customerId,
    ).toBe("cus_beta");
  });

  it("creates formula-safe, correctly quoted CSV in visible order", () => {
    const csv = createBillingCsv([
      { ...users[1], name: '  =Alpha, "Dental"' },
      users[0],
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toStartWith('"\'  =Alpha, ""Dental"""');
    expect(lines[1]).toContain('"cus_alpha","250.00","0.00","250.00"');
    expect(lines[2]).toContain('"cus_beta","100.00","20.00","80.00"');
  });

  it("creates an unambiguous sanitized period filename", () => {
    expect(createBillingCsvFilename("2026-07-01", "2026-07-31")).toBe(
      "billing-insights_2026-07-01_to_2026-07-31.csv",
    );
  });
});
