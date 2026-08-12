import { describe, expect, test } from "bun:test";

import type { ActivationSnapshot, LifecyclePreferences } from "./contract";
import {
  campaignAllowed,
  isActivated,
  nextBestAction,
  selectLifecycleCandidate,
} from "./policy";

const complete: ActivationSnapshot = {
  hasProfessionalPhoto: true,
  hasProfessionalDetails: true,
  hasTreatmentOrService: true,
  hasContactOrBookingAction: true,
  hasPreviewed: true,
  isPublished: true,
  hasShared: true,
  qualifiedViews: 42,
  countedContactActions: 8,
};

const preferences: LifecyclePreferences = {
  lifecycleEmailsEnabled: true,
  weeklySummaryEnabled: true,
  milestoneEmailsEnabled: true,
  promotionalUnsubscribedAt: null,
  permanentDeliveryFailureAt: null,
  supportPausedUntil: null,
};

describe("lifecycle policy", () => {
  test("uses one strict activation definition", () => {
    expect(isActivated(complete)).toBe(true);
    for (const field of [
      "hasProfessionalPhoto",
      "hasProfessionalDetails",
      "hasTreatmentOrService",
      "hasContactOrBookingAction",
      "isPublished",
    ] as const) {
      expect(isActivated({ ...complete, [field]: false })).toBe(false);
    }
  });

  test("chooses the earliest missing owner action in documented order", () => {
    expect(nextBestAction({ ...complete, hasProfessionalPhoto: false })).toBe(
      "add_profile_photo",
    );
    expect(
      nextBestAction({
        ...complete,
        hasProfessionalDetails: false,
        hasTreatmentOrService: false,
      }),
    ).toBe("complete_professional_details");
    expect(nextBestAction({ ...complete, hasShared: false })).toBe(
      "share_profile",
    );
    expect(nextBestAction(complete)).toBe("review_analytics");
  });

  test("applies preference, unsubscribe, failure, and support pauses", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    expect(campaignAllowed("weekly_performance", preferences, now)).toBe(true);
    expect(
      campaignAllowed(
        "weekly_performance",
        { ...preferences, weeklySummaryEnabled: false },
        now,
      ),
    ).toBe(false);
    expect(
      campaignAllowed(
        "zero_traffic",
        { ...preferences, promotionalUnsubscribedAt: now.toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      campaignAllowed(
        "zero_traffic",
        {
          ...preferences,
          supportPausedUntil: "2026-08-13T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  test("selects one deterministic campaign for a frequency window", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    expect(
      selectLifecycleCandidate(
        [
          {
            campaign: "weekly_performance",
            eligibleAt: "2026-08-12T09:00:00.000Z",
          },
          {
            campaign: "zero_traffic",
            eligibleAt: "2026-08-12T10:00:00.000Z",
          },
          {
            campaign: "first_value_milestone",
            eligibleAt: "2026-08-12T11:00:00.000Z",
          },
        ],
        preferences,
        now,
      )?.campaign,
    ).toBe("first_value_milestone");
    expect(
      selectLifecycleCandidate(
        [
          {
            campaign: "first_value_milestone",
            eligibleAt: "2026-08-13T11:00:00.000Z",
          },
        ],
        preferences,
        now,
      ),
    ).toBeNull();
  });
});
