import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

type Result = {
  data: unknown;
  error: { code?: string; message: string } | null;
};
const ownerResults: Result[] = [];
const rpcSingle = mock(async (): Promise<Result> => ({
  data: null,
  error: null,
}));
const rpc = mock(() => ({ single: rpcSingle }));
const maybeSingle = mock(
  async (): Promise<Result> =>
    ownerResults.shift() ?? { data: null, error: null },
);
const eq = mock(() => ({ maybeSingle }));
const select = mock(() => ({ eq }));
const from = mock(() => ({ select }));
const createServerSupabaseClient = mock(async () => ({ from, rpc }));

mock.module("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const {
  getProfilePresentationState,
  publishProfilePresentation,
  saveProfilePresentationDraft,
} = await import("./repository");

const userId = "9250a849-9eb9-4986-b785-0dfe52a4cd5e";
const basic = {
  schemaVersion: 1,
  templateId: "basic",
  themeId: "clinical-light",
  layoutVariant: "classic-stack",
  answers: {},
} as const;
const premium = {
  schemaVersion: 1,
  templateId: "cosmetic-transformation",
  themeId: "premium-contrast",
  layoutVariant: "hero-overlap",
  answers: { signatureTreatmentId: "42" },
} as const;

function owner(overrides: Record<string, unknown> = {}) {
  return {
    subscription_status: "FREE",
    trial_end: null,
    profile_presentation_published: basic,
    profile_presentation_published_revision: 0,
    profile_presentation_published_at: null,
    profile_presentation_draft: null,
    profile_presentation_draft_revision: 0,
    profile_presentation_draft_updated_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  ownerResults.length = 0;
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockClear();
  rpc.mockClear();
  rpcSingle.mockReset();
  rpcSingle.mockResolvedValue({ data: null, error: null });
});

describe("profile presentation repository", () => {
  test("returns saved and entitlement-effective published state separately", async () => {
    ownerResults.push({
      data: owner({
        profile_presentation_published: premium,
        profile_presentation_published_revision: 4,
      }),
      error: null,
    });

    const state = await getProfilePresentationState(userId);
    expect(state.published.saved).toEqual(premium);
    expect(state.published.effective).toEqual({
      ...premium,
      themeId: "clinical-light",
      layoutVariant: "classic-stack",
    });
    expect(state.published.revision).toBe(4);
    expect(state.entitlement).toEqual({ tier: "free" });
    expect(select).toHaveBeenCalledWith(
      "subscription_status, trial_end, profile_presentation_published, profile_presentation_published_revision, profile_presentation_published_at, profile_presentation_draft, profile_presentation_draft_revision, profile_presentation_draft_updated_at",
    );
  });

  test("validates with private entitlement then saves through the CAS RPC", async () => {
    ownerResults.push({
      data: owner({ subscription_status: "PRO" }),
      error: null,
    });
    rpcSingle.mockResolvedValueOnce({
      data: {
        configuration: premium,
        revision: 3,
        updated_at: "2026-08-11T12:00:00.000Z",
      },
      error: null,
    });

    await expect(
      saveProfilePresentationDraft({
        userId,
        expectedRevision: 2,
        configuration: premium,
      }),
    ).resolves.toEqual({
      configuration: premium,
      revision: 3,
      updatedAt: "2026-08-11T12:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("save_profile_presentation_draft", {
      p_target_user_id: userId,
      p_expected_revision: 2,
      p_configuration: premium,
    });
  });

  test("maps local contract and entitlement failures to the bounded invalid code", async () => {
    ownerResults.push({ data: owner(), error: null });

    await expect(
      saveProfilePresentationDraft({
        userId,
        expectedRevision: 0,
        configuration: premium,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
      message: "INVALID_CONFIGURATION",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  test("publishes only through both draft and published revisions", async () => {
    rpcSingle.mockResolvedValueOnce({
      data: {
        configuration: basic,
        revision: 6,
        published_at: "2026-08-11T12:05:00.000Z",
      },
      error: null,
    });

    await expect(
      publishProfilePresentation({
        userId,
        expectedDraftRevision: 8,
        expectedPublishedRevision: 5,
      }),
    ).resolves.toEqual({
      configuration: basic,
      revision: 6,
      publishedAt: "2026-08-11T12:05:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("publish_profile_presentation", {
      p_target_user_id: userId,
      p_expected_draft_revision: 8,
      p_expected_published_revision: 5,
    });
  });

  test("maps database conflict and permission errors to bounded codes", async () => {
    rpcSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "40001", message: "provider detail" },
    });
    await expect(
      publishProfilePresentation({
        userId,
        expectedDraftRevision: 1,
        expectedPublishedRevision: 0,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "CONFLICT",
    });

    ownerResults.push({
      data: null,
      error: { code: "42501", message: "provider detail" },
    });
    await expect(getProfilePresentationState(userId)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "FORBIDDEN",
    });
  });
});
