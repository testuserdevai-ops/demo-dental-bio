import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const userId = "00000000-0000-4000-8000-000000000801";
const scope = {
  effectiveUserId: userId,
  dentistryId: "00000000-0000-4000-8000-000000000802",
  username: "question-owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));

const contentOptions = {
  treatments: [{ id: "11", label: "Invisalign" }],
  locations: [
    { id: "00000000-0000-4000-8000-000000000012", label: "City clinic" },
  ],
  reviews: [{ id: "21", label: "Review by Sam" }],
  galleries: [{ id: "31", label: "Smile case" }],
  links: [
    { id: "00000000-0000-4000-8000-000000000041", label: "Research article" },
  ],
  products: [{ id: "51", label: "Care guide" }],
};
const getQuestionContentOptions = mock(async () => contentOptions);

const direct = {
  schemaVersion: 1 as const,
  templateId: "direct-booking" as const,
  themeId: "warm-care" as const,
  layoutVariant: "classic-stack" as const,
  answers: { primaryAction: "booking" as const },
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    entitlement: { tier: "pro" as const },
    published: {
      saved: direct,
      effective: direct,
      revision: 1,
      publishedAt: null,
    },
    draft: {
      saved: direct,
      effective: direct,
      resolutionReason: "valid" as const,
      revision: 4,
      updatedAt: null,
    },
    ...overrides,
  };
}

const getProfilePresentationState = mock(async () => state());
const saveProfilePresentationDraft = mock(async (input: any) => ({
  saved: input.configuration,
  effective: input.configuration,
  resolutionReason: "valid" as const,
  revision: input.expectedRevision + 1,
  updatedAt: "2026-08-11T12:00:00.000Z",
}));

class ProfilePresentationPersistenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/profile-presentation/questions/content-options", () => ({
  getQuestionContentOptions,
}));
mock.module("@/lib/profile-presentation/repository", () => ({
  getProfilePresentationState,
  saveProfilePresentationDraft,
  ProfilePresentationPersistenceError,
}));

const { saveQuestionAnswers } = await import("./actions");

describe("saveQuestionAnswers", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    getQuestionContentOptions.mockClear();
    getProfilePresentationState.mockReset();
    getProfilePresentationState.mockResolvedValue(state() as any);
    saveProfilePresentationDraft.mockReset();
    saveProfilePresentationDraft.mockImplementation(async (input: any) => ({
      saved: input.configuration,
      effective: input.configuration,
      resolutionReason: "valid" as const,
      revision: input.expectedRevision + 1,
      updatedAt: "2026-08-11T12:00:00.000Z",
    }));
  });

  it("rejects uncontrolled input before authentication", async () => {
    const result = await saveQuestionAnswers({
      templateId: "secret-template",
      expectedRevision: 0,
      baseAnswers: {},
      answers: {},
      intent: "autosave",
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      formError:
        "The saved question data was not recognized. Review your answers and try again.",
    });
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
  });

  it("saves only validated answers while preserving appearance and never publishing", async () => {
    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: {
        primaryAction: "booking",
        secondaryAction: "phone",
        featuredTreatmentIds: ["11"],
      },
      intent: "complete",
    });

    expect(result.ok).toBe(true);
    expect(saveProfilePresentationDraft).toHaveBeenCalledWith({
      userId,
      expectedRevision: 4,
      configuration: {
        ...direct,
        answers: {
          primaryAction: "booking",
          secondaryAction: "phone",
          featuredTreatmentIds: ["11"],
        },
      },
    });
    expect(
      JSON.stringify(saveProfilePresentationDraft.mock.calls),
    ).not.toContain("publish");
  });

  it("uses the same completion validation on the server", async () => {
    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: { primaryAction: "booking" },
      intent: "complete",
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_ANSWERS",
      fieldErrors: {
        featuredTreatmentIds: ["Choose an answer before continuing."],
      },
    });
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });

  it("rejects deleted or foreign entity IDs", async () => {
    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: {
        primaryAction: "booking",
        featuredTreatmentIds: ["999"],
      },
      intent: "autosave",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_ANSWERS",
      fieldErrors: { featuredTreatmentIds: ["Choose only available options."] },
    });
  });

  it("is idempotent when the authoritative draft already has the answers", async () => {
    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: direct.answers,
      intent: "autosave",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { revision: 4, completed: false },
    });
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });

  it("merges a stale edit when only an unrelated answer changed", async () => {
    const latest = {
      ...direct,
      answers: { ...direct.answers, secondaryAction: "email" as const },
    };
    getProfilePresentationState.mockResolvedValueOnce(
      state({
        draft: {
          saved: latest,
          effective: latest,
          resolutionReason: "valid",
          revision: 6,
          updatedAt: null,
        },
      }) as any,
    );

    await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: { ...direct.answers, featuredTreatmentIds: ["11"] },
      intent: "autosave",
    });

    expect(saveProfilePresentationDraft).toHaveBeenCalledWith({
      userId,
      expectedRevision: 6,
      configuration: {
        ...direct,
        answers: {
          primaryAction: "booking",
          secondaryAction: "email",
          featuredTreatmentIds: ["11"],
        },
      },
    });
  });

  it("does not overwrite the same field after a stale edit", async () => {
    const latest = {
      ...direct,
      answers: { primaryAction: "website" as const },
    };
    getProfilePresentationState.mockResolvedValueOnce(
      state({
        draft: {
          saved: latest,
          effective: latest,
          resolutionReason: "valid",
          revision: 6,
          updatedAt: null,
        },
      }) as any,
    );

    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: { primaryAction: "phone" },
      intent: "autosave",
    });

    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });

  it("retries one repository race without losing a non-conflicting remote answer", async () => {
    const latest = {
      ...direct,
      answers: { ...direct.answers, secondaryAction: "email" as const },
    };
    getProfilePresentationState
      .mockResolvedValueOnce(state() as any)
      .mockResolvedValueOnce(
        state({
          draft: {
            saved: latest,
            effective: latest,
            resolutionReason: "valid",
            revision: 5,
            updatedAt: null,
          },
        }) as any,
      );
    saveProfilePresentationDraft
      .mockRejectedValueOnce(
        new ProfilePresentationPersistenceError("CONFLICT"),
      )
      .mockImplementationOnce(async (input: any) => ({
        saved: input.configuration,
        effective: input.configuration,
        resolutionReason: "valid",
        revision: 6,
        updatedAt: "2026-08-11T12:05:00.000Z",
      }));

    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 4,
      baseAnswers: direct.answers,
      answers: { ...direct.answers, featuredTreatmentIds: ["11"] },
      intent: "autosave",
    });

    expect(result).toMatchObject({ ok: true, data: { revision: 6 } });
    expect(saveProfilePresentationDraft).toHaveBeenLastCalledWith({
      userId,
      expectedRevision: 5,
      configuration: {
        ...direct,
        answers: {
          primaryAction: "booking",
          secondaryAction: "email",
          featuredTreatmentIds: ["11"],
        },
      },
    });
  });

  it("locks malformed drafts and rejects a changed authoritative template", async () => {
    getProfilePresentationState.mockResolvedValueOnce(
      state({
        draft: {
          saved: null,
          effective: { ...direct, templateId: "basic", answers: {} },
          resolutionReason: "malformed",
          revision: 7,
          updatedAt: null,
        },
      }) as any,
    );
    expect(
      await saveQuestionAnswers({
        templateId: "direct-booking",
        expectedRevision: 7,
        baseAnswers: {},
        answers: {},
        intent: "autosave",
      }),
    ).toMatchObject({ ok: false, code: "CONFIGURATION_LOCKED" });

    getProfilePresentationState.mockResolvedValueOnce(
      state({
        draft: {
          saved: { ...direct, templateId: "basic", answers: {} },
          effective: { ...direct, templateId: "basic", answers: {} },
          resolutionReason: "valid",
          revision: 8,
          updatedAt: null,
        },
      }) as any,
    );
    expect(
      await saveQuestionAnswers({
        templateId: "direct-booking",
        expectedRevision: 8,
        baseAnswers: {},
        answers: {},
        intent: "autosave",
      }),
    ).toMatchObject({ ok: false, code: "TEMPLATE_CHANGED" });
  });

  it("does not let a direct action bypass the required appearance draft", async () => {
    getProfilePresentationState.mockResolvedValueOnce(
      state({
        draft: {
          saved: null,
          effective: direct,
          resolutionReason: "missing",
          revision: 0,
          updatedAt: null,
        },
      }) as any,
    );

    const result = await saveQuestionAnswers({
      templateId: "direct-booking",
      expectedRevision: 0,
      baseAnswers: {},
      answers: {},
      intent: "autosave",
    });

    expect(result).toMatchObject({ ok: false, code: "CONFIGURATION_LOCKED" });
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });
});
