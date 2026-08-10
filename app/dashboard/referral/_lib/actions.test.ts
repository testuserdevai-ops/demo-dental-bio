import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ReferralInviteDependencies } from "./invite-policy";
import { sendReferralInviteWithDependencies } from "./invite-policy";

const userId = crypto.randomUUID();
const targetId = crypto.randomUUID();
const deliver = mock(async () => undefined);
const getSender = mock(async () => ({
  username: "authorized-user",
  firstName: "Authorized",
}));
const getBrand = mock(async () => ({
  baseUrl: "https://dental.bio",
  brandName: "Dentalbio",
}));
const identity = {
  scope: {
    effectiveUserId: userId,
    dentistryId: crypto.randomUUID(),
    username: "authorized-user",
    canManageSubscription: true,
  },
  shell: {
    subscriptionStatus: "PRO",
    isVerified: false,
    useDentalBrand: false,
    position: null,
    createdAt: null,
    trialEnd: null,
    currentPeriodEnd: null,
  },
};
const resolveIdentity = mock(async () => identity);
const dependencies = {
  resolveIdentity,
  getSender,
  getBrand,
  deliver,
} satisfies ReferralInviteDependencies;

beforeEach(() => {
  deliver.mockClear();
  getSender.mockClear();
  getBrand.mockClear();
  resolveIdentity.mockClear();
});

describe("referral invitation policy", () => {
  it("rejects malformed and caller-controlled sender data before authorization or delivery", async () => {
    const result = await sendReferralInviteWithDependencies(
      undefined,
      {
        email: "friend@example.com",
        referralLink: "https://evil.example",
        name: "Forged",
      },
      dependencies,
    );
    expect(result.ok).toBe(false);
    expect(resolveIdentity).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("uses the authorized target and only server-derived sender/link/brand values", async () => {
    const result = await sendReferralInviteWithDependencies(
      targetId,
      { email: "FRIEND@EXAMPLE.COM" },
      dependencies,
    );
    expect(result.ok).toBe(true);
    expect(resolveIdentity).toHaveBeenCalledWith(targetId);
    expect(getSender).toHaveBeenCalledWith(userId);
    expect(deliver).toHaveBeenCalledWith({
      recipient: "friend@example.com",
      senderName: "Authorized",
      referralUrl: "https://dental.bio/api/invite?referral=authorized-user",
      brandName: "Dentalbio",
    });
  });

  it("blocks an unentitled identity before sender, brand, or provider work", async () => {
    resolveIdentity.mockImplementationOnce(async () => ({
      ...identity,
      shell: {
        ...identity.shell,
        subscriptionStatus: "FREE",
      },
    }));
    const result = await sendReferralInviteWithDependencies(
      undefined,
      { email: "friend@example.com" },
      dependencies,
    );
    expect(result).toEqual({
      ok: false,
      code: "ENTITLEMENT_REQUIRED",
      formError: "Upgrade your plan before sending referral invitations",
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("sanitizes authorization and provider failures", async () => {
    resolveIdentity.mockImplementationOnce(async () => {
      throw new Error("forbidden target");
    });
    const unauthorized = await sendReferralInviteWithDependencies(
      targetId,
      { email: "friend@example.com" },
      dependencies,
    );
    expect(unauthorized).toEqual({
      ok: false,
      code: "INVITE_FAILED",
      formError: "The invitation could not be sent. Try again.",
    });
    expect(deliver).not.toHaveBeenCalled();

    deliver.mockImplementationOnce(async () => {
      throw new Error("provider details");
    });
    const providerFailure = await sendReferralInviteWithDependencies(
      undefined,
      { email: "friend@example.com" },
      dependencies,
    );
    expect(providerFailure).toEqual(unauthorized);
  });
});
