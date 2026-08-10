import { describe, expect, it, mock } from "bun:test";
mock.module("server-only", () => ({}));
const { getReferralViewModel } = await import("./queries");

describe("getReferralViewModel", () => {
  it("derives the link, sender, and entitlement from authorized server data", async () => {
    const single = mock(async () => ({
      data: {
        username: "owner-user",
        first_name: "Owner",
        subscription_status: "PRO",
        trial_end: null,
      },
      error: null,
    }));
    const client = {
      from: () => ({
        select: () => ({ eq: () => ({ single }) }),
      }),
    };
    const view = await getReferralViewModel(
      {
        effectiveUserId: crypto.randomUUID(),
        dentistryId: crypto.randomUUID(),
        username: "ignored-client-value",
        canManageSubscription: true,
      },
      client as never,
      {
        baseUrl: "https://dental.bio",
        brandName: "Dentalbio",
      } as never,
    );
    expect(view).toEqual({
      referralUrl: "https://dental.bio/api/invite?referral=owner-user",
      senderDisplayName: "Owner",
      canInvite: true,
    });
  });
});
