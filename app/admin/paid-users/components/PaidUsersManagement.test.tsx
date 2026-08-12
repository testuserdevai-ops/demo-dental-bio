import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { DateRange } from "react-day-picker";

const push = mock();
let selectRange: ((range: DateRange | undefined) => void) | undefined;

mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

mock.module("@/app/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect: (range: DateRange | undefined) => void;
  }) => {
    selectRange = onSelect;
    return <button type="button">Choose range focus target</button>;
  },
}));

const originalFetch = globalThis.fetch;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function incomeData(userCount = 1) {
  return {
    totalIncome: 120,
    totalRefunds: 20,
    totalPaidUsers: userCount,
    availableBalance: 100,
    period: { startDate: "2026-02-01", endDate: "2026-03-01" },
    paidUsers: Array.from({ length: userCount }, (_, index) => ({
      customerId: `customer-${String(index + 1).padStart(2, "0")}`,
      email: `user-${index + 1}@example.com`,
      name: `User ${index + 1}`,
      totalPaid: 120,
      totalRefunded: 0,
      payments: [
        {
          date: 1_770_000_000 + index,
          amount: 120,
          currency: "GBP",
          description: "Pro subscription",
          type: "payment" as const,
        },
      ],
    })),
  };
}

function installFetch(responses: Array<Response | (() => Response)>) {
  globalThis.fetch = mock(() => {
    const next = responses.shift();
    if (!next) throw new Error("Unexpected income request");
    return Promise.resolve(typeof next === "function" ? next() : next);
  }) as unknown as typeof fetch;
}

const { default: PaidUsersManagement } = await import("./PaidUsersManagement");

afterEach(() => {
  globalThis.fetch = originalFetch;
  push.mockClear();
  selectRange = undefined;
});

describe("PaidUsersManagement", () => {
  it("keeps the applied period and existing results until a complete new date range is selected", async () => {
    installFetch([
      json(incomeData()),
      json({ error: "Reporting service unavailable" }, 503),
    ]);
    render(<PaidUsersManagement />);

    expect(await screen.findByText("User 1")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Select reporting period" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Choose reporting period" }),
    ).toBeTruthy();
    const initialCalendarButton = await screen.findByRole("button", {
      name: "Choose range focus target",
    });
    expect(document.activeElement).toBe(initialCalendarButton);

    await act(async () => {
      selectRange?.({ from: new Date(2026, 3, 1) });
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("User 1")).toBeTruthy();

    await act(async () => {
      selectRange?.({
        from: new Date(2026, 3, 1),
        to: new Date(2026, 3, 30),
      });
    });
    expect(
      await screen.findByText("Income data could not be refreshed"),
    ).toBeTruthy();
    expect(screen.getByText("Reporting service unavailable")).toBeTruthy();
    expect(screen.getByText("User 1")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select reporting period" })
        .textContent,
    ).not.toContain("30/04/2026");
  });

  it("closes the calendar with Escape and restores focus to its trigger", async () => {
    installFetch([json(incomeData())]);
    render(<PaidUsersManagement />);
    expect(await screen.findByText("User 1")).toBeTruthy();

    const trigger = screen.getByRole("button", {
      name: "Select reporting period",
    });
    fireEvent.click(trigger);
    const calendarButton = await screen.findByRole("button", {
      name: "Choose range focus target",
    });
    expect(document.activeElement).toBe(calendarButton);
    fireEvent.keyDown(calendarButton, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Choose reporting period" }),
    ).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("supports accessible payment-history expansion and pagination", async () => {
    installFetch([json(incomeData(12))]);
    render(<PaidUsersManagement />);

    expect(await screen.findByText("User 1")).toBeTruthy();
    const expand = screen.getByRole("button", {
      name: "Expand payment history for User 1",
    });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(expand);
    expect(expand.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Payment & Refund History")).toBeTruthy();
    expect(screen.getByText("Pro subscription")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(await screen.findByText("User 11")).toBeTruthy();
    expect(screen.queryByText("User 1")).toBeNull();

    fireEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
    fireEvent.click(await screen.findByRole("option", { name: "25" }));
    expect(await screen.findByText("User 1")).toBeTruthy();
  });

  it("searches the loaded result, reports empty matches, and clears without changing the period", async () => {
    installFetch([json(incomeData(3))]);
    render(<PaidUsersManagement />);

    expect(await screen.findByText("User 1")).toBeTruthy();
    const period = screen.getByRole("button", {
      name: "Select reporting period",
    }).textContent;
    fireEvent.change(screen.getByLabelText("Search billing results"), {
      target: { value: "customer-02" },
    });
    expect(screen.getByText("User 2")).toBeTruthy();
    expect(screen.queryByText("User 1")).toBeNull();
    expect(screen.getByText("1 result of 3")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search billing results"), {
      target: { value: "missing customer" },
    });
    expect(
      screen.getByText("No billing results match your search."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Export CSV" })
        .hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("User 1")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select reporting period" })
        .textContent,
    ).toBe(period);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
