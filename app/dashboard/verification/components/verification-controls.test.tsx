import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import * as React from "react";

const get = mock(async () => ({
  id: "00000000-0000-4000-8000-000000000001",
  username: "target-owner",
  isVerified: false,
  role: "user",
}));
const post = mock(async () => ({}));
const triggerReload = mock(() => {});
mock.module("@/services/apiClient", () => ({
  apiClient: { get, post },
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
}));

const { default: VerifyButton } = await import("./VerifyButton");
const { default: AdminVerificationPanel } =
  await import("./AdminVerificationPanel");

function renderQuery(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000001",
    username: "target-owner",
    isVerified: false,
    role: "user",
  });
  post.mockReset();
  post.mockResolvedValue({});
  triggerReload.mockClear();
});

afterEach(cleanup);

describe("verification controls", () => {
  it("keeps the owner on-page and exposes a provider start failure", async () => {
    post.mockRejectedValueOnce(new Error("Verification sandbox unavailable"));
    renderQuery(<VerifyButton enabled />);
    fireEvent.click(screen.getByRole("button", { name: "Start now" }));
    expect(
      await screen.findByText("Verification sandbox unavailable"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Start now" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("keeps admin status unchanged and the dialog open after a failed update", async () => {
    post.mockRejectedValueOnce(new Error("Update denied"));
    renderQuery(
      <AdminVerificationPanel targetUserId="00000000-0000-4000-8000-000000000001" />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark as verified" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Mark as verified",
      }),
    );
    expect(await screen.findByText("Update denied")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Not verified")).toBeTruthy();
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("updates cached status and preview only after admin success", async () => {
    renderQuery(
      <AdminVerificationPanel targetUserId="00000000-0000-4000-8000-000000000001" />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark as verified" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Mark as verified",
      }),
    );
    await waitFor(() => expect(screen.getByText("Verified")).toBeTruthy());
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });
});
