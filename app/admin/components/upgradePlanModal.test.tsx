import { afterEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const originalFetch = globalThis.fetch;
const { default: UpgradePlanModal } = await import("./upgradePlanModal");

const user = {
  id: "user-1",
  first_name: "Dental",
  last_name: "Owner",
  email: "owner@example.com",
  subscription_status: "PRO",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("UpgradePlanModal", () => {
  it("resets to the selected user plan when a closed empty modal opens", async () => {
    const view = render(
      <UpgradePlanModal
        isOpen={false}
        user={null}
        onClose={mock()}
        onSuccess={mock()}
      />,
    );

    view.rerender(
      <UpgradePlanModal
        isOpen
        user={user}
        onClose={mock()}
        onSuccess={mock()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox").textContent).toContain("PRO"),
    );
  });

  it("uses an alert dialog and moves focus to its safe cancel action", async () => {
    const onClose = mock();
    render(
      <UpgradePlanModal
        isOpen
        user={user}
        onClose={onClose}
        onSuccess={mock()}
      />,
    );

    const review = screen.getByRole("button", { name: "Review plan change" });
    review.focus();
    fireEvent.click(review);
    await screen.findByRole("alertdialog", {
      name: "Apply this plan change?",
    });
    const goBack = screen.getByRole("button", { name: "Go back" });
    expect(document.activeElement).toBe(goBack);
    fireEvent.click(goBack);
    expect(screen.getByRole("dialog", { name: "Change plan" })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("preserves the plan form and draft when the mutation fails", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Provider unavailable" }), {
          status: 503,
        }),
      ),
    ) as unknown as typeof fetch;
    const onClose = mock();
    const onSuccess = mock();

    render(
      <UpgradePlanModal
        isOpen
        user={user}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.change(screen.getByLabelText("Period End Date"), {
      target: { value: "2027-03-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review plan change" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply plan change" }),
    );

    expect(await screen.findByText("Provider unavailable")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Change plan" })).toBeTruthy();
    expect(
      (screen.getByLabelText("Period End Date") as HTMLInputElement).value,
    ).toBe("2027-03-15");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("preserves the exact subscription payload and reports authoritative success", async () => {
    const fetchMock = mock((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ status: "success" }))),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const onClose = mock();
    const onSuccess = mock();

    render(
      <UpgradePlanModal
        isOpen
        user={user}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review plan change" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply plan change" }),
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      id: "user-1",
      subscription_status: "PRO",
      current_period_end: new Date("9999-12-31").toISOString(),
    });
    expect(onSuccess).toHaveBeenCalledWith(
      "user-1",
      "PRO",
      new Date("9999-12-31"),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
