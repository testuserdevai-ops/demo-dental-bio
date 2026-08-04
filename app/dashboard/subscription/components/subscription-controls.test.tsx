import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import * as React from "react";
import { DashboardQueryProvider } from "@/app/dashboard/_components/DashboardQueryProvider";
import type { SubscriptionPlan } from "@/lib/subscription/contracts";

const post = mock(async () => ({}));
const remove = mock(async () => ({}));
const clear = mock(() => {});
mock.module("@/services/apiClient", () => ({
  apiClient: { post, delete: remove, get: mock() },
}));
mock.module("@stripe/react-stripe-js", () => ({
  CardElement: () => <div>Secure card field</div>,
  useStripe: () => ({ createPaymentMethod: mock() }),
  useElements: () => ({ getElement: () => ({ clear }) }),
}));

const { default: CurrentPlanCard } = await import("./CurrentPlanCard");
const { PaymentMethodsList } = await import("./PaymentMethodsList");

const plan = {
  planName: "PRO" as const,
  price: 20,
  currency: "gbp",
  billingCycle: "monthly" as const,
  renewalDate: "2026-09-01T00:00:00.000Z",
  trialEnd: null,
  subscriptionDetails: {
    id: "sub_owner",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodStart: "2026-08-01T00:00:00.000Z",
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    trialEnd: null,
  },
} satisfies SubscriptionPlan;

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
  remove.mockReset();
  remove.mockResolvedValue({});
});
afterEach(cleanup);

describe("subscription controls", () => {
  it("uses a semantic change-plan link and preserves cancellation failure", async () => {
    post.mockRejectedValueOnce(new Error("Cancellation unavailable"));
    const refresh = mock(async () => {});
    render(<CurrentPlanCard subscription={plan} onRefresh={refresh} />);
    const link = screen.getByRole("link", { name: "Change Plan" });
    expect(link.getAttribute("href")).toBe("/upgrade");
    expect(link.getAttribute("target")).toBe("_blank");

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel Subscription" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Cancel subscription?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel subscription" }),
    );
    expect(await screen.findByText("Cancellation unavailable")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("names each card action and keeps failed removal in its dialog", async () => {
    remove.mockRejectedValueOnce(new Error("Removal unavailable"));
    const refresh = mock(async () => {});
    render(
      <DashboardQueryProvider>
        <PaymentMethodsList
          customerId="cus_owner"
          error={null}
          onRefresh={refresh}
          paymentMethods={[
            {
              id: "pm_1",
              type: "card",
              card: {
                brand: "visa",
                last4: "4242",
                expMonth: 8,
                expYear: 2030,
              },
              isDefault: false,
            },
          ]}
        />
      </DashboardQueryProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Set visa ending 4242 as default" }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove visa ending 4242" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Remove payment method?",
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Removal unavailable")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  });
});
