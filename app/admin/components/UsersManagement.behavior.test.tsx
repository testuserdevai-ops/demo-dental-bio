import { afterEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const toast = { success: mock(), error: mock() };
mock.module("sonner", () => ({ toast }));
mock.module("./upgradePlanModal", () => ({ default: () => null }));

const originalFetch = globalThis.fetch;
const user = {
  id: "user-1",
  title: "Dr",
  first_name: "Dental",
  last_name: "Owner",
  email: "owner@example.com",
  username: "owner",
  position: "Principal dentist",
  country: "Egypt",
  created_at: "2026-07-12T00:00:00.000Z",
  subscription_status: "PRO",
  current_period_end: "2027-01-01T00:00:00.000Z",
  trial_end: null,
  isVerified: false,
  dentistries: {},
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetch(overrides?: {
  announcementPut?: () => Promise<Response>;
  deleteUser?: () => Promise<Response>;
  refreshUsers?: () => Promise<Response>;
  onUserList?: (body: Record<string, unknown>) => void;
}) {
  let userListRequests = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/admin/user")
      return Promise.resolve(json({ role: "admin" }));
    if (url === "/api/announcements" && init?.method === "PUT") {
      return (
        overrides?.announcementPut?.() ??
        Promise.resolve(json({ status: "success" }))
      );
    }
    if (url === "/api/announcements") {
      return Promise.resolve(
        json({ title: "Notice", content: "Original message" }),
      );
    }
    if (url === "/api/user/list" && init?.method === "POST") {
      userListRequests += 1;
      overrides?.onUserList?.(
        JSON.parse(String(init.body)) as Record<string, unknown>,
      );
      if (userListRequests > 1 && overrides?.refreshUsers) {
        return overrides.refreshUsers();
      }
      return Promise.resolve(json({ data: [user], count: 1 }));
    }
    if (url === "/api/user" && init?.method === "DELETE") {
      return (
        overrides?.deleteUser?.() ??
        Promise.resolve(json({ status: "success" }))
      );
    }
    throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
  }) as unknown as typeof fetch;
}

const { default: UsersManagement } = await import("./UsersManagement");

afterEach(() => {
  globalThis.fetch = originalFetch;
  toast.success.mockClear();
  toast.error.mockClear();
});

describe("UsersManagement", () => {
  it("keeps an announcement draft open after a failed save", async () => {
    installFetch({
      announcementPut: () =>
        Promise.resolve(json({ error: "Announcement rejected" }, 422)),
    });
    render(<UsersManagement />);
    await screen.findByText("owner@example.com");
    expect(
      screen
        .getByRole("link", { name: "Paid Users & Income" })
        .getAttribute("href"),
    ).toBe("/admin/paid-users");

    fireEvent.click(screen.getByRole("button", { name: "Universal Message" }));
    const title = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Updated notice" } });
    fireEvent.click(screen.getByRole("button", { name: "Save announcement" }));

    expect(await screen.findByText("Announcement rejected")).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "Manage announcements" }),
    ).toBeTruthy();
    expect(title.value).toBe("Updated notice");
  });

  it("uses an accessible destructive dialog and preserves it after deletion fails", async () => {
    installFetch({
      deleteUser: () =>
        Promise.resolve(json({ error: "Deletion rejected" }, 409)),
    });
    render(<UsersManagement />);
    await screen.findByText("owner@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete owner@example.com" }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));

    expect(await screen.findByText("Deletion rejected")).toBeTruthy();
    expect(
      screen.getByRole("alertdialog", { name: "Delete user?" }),
    ).toBeTruthy();
    expect(screen.getByText("owner@example.com")).toBeTruthy();
  });

  it("keeps authoritative deletion success when the subsequent refresh fails", async () => {
    installFetch({
      refreshUsers: () =>
        Promise.resolve(json({ error: "Refresh unavailable" }, 503)),
    });
    render(<UsersManagement />);
    await screen.findByText("owner@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete owner@example.com" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("User deleted"),
    );
    expect(await screen.findByText("Refresh unavailable")).toBeTruthy();
    expect(screen.queryByText("owner@example.com")).toBeNull();
    expect(
      screen.queryByRole("alertdialog", { name: "Delete user?" }),
    ).toBeNull();
  });

  it("debounces bounded search, clears it visibly, and requests deterministic sorting", async () => {
    const requests: Record<string, unknown>[] = [];
    installFetch({ onUserList: (body) => requests.push(body) });
    render(<UsersManagement />);
    await screen.findByText("owner@example.com");

    const search = screen.getByLabelText("Search users") as HTMLInputElement;
    fireEvent.change(search, { target: { value: " Dental " } });
    expect(search.maxLength).toBe(160);
    await waitFor(() => expect(requests.at(-1)?.search).toBe("Dental"), {
      timeout: 1_500,
    });
    expect(requests.at(-1)).toMatchObject({
      page: 1,
      sort: "registered",
      direction: "desc",
    });

    fireEvent.click(screen.getByRole("button", { name: /Plan.*not sorted/ }));
    await waitFor(() =>
      expect(requests.at(-1)).toMatchObject({ sort: "plan", direction: "asc" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear user search" }));
    await waitFor(() => expect(requests.at(-1)?.search).toBeUndefined());
    expect(search.value).toBe("");
  });

  it("shows active advanced filters and opens a read-only account summary", async () => {
    installFetch();
    render(<UsersManagement />);
    await screen.findByText("owner@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const filterDialog = screen.getByRole("dialog", { name: "Filter users" });
    fireEvent.change(
      filterDialog.querySelector("#filter-country") as HTMLInputElement,
      { target: { value: "Egypt" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("Country: Egypt")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove Country filter" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "View account details for owner@example.com",
      }),
    );
    const details = screen.getByRole("dialog", { name: "Account details" });
    expect(details.textContent).toContain("Dr Dental Owner");
    expect(details.textContent).toContain("Principal dentist");
    expect(details.textContent).toContain("Egypt");
    expect(
      screen
        .getByRole("link", { name: "Open public profile" })
        .getAttribute("href"),
    ).toBe("/owner");
  });
});
