"use server";

import { z } from "zod";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { actionError, type ActionResult } from "@/lib/forms/action-result";
import {
  PROFILE_TEMPLATE_IDS,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";
import type { ProfilePresentationConfiguration } from "@/lib/profile-presentation/contract";
import { getQuestionContentOptions } from "@/lib/profile-presentation/questions/content-options";
import {
  summarizeProfileQuestionAnswers,
  validateProfileQuestionAnswers,
  getProfileQuestionSet,
} from "@/lib/profile-presentation/questions/registry";
import { completeProfileOnboardingStep } from "@/lib/profile-presentation/onboarding-progress";
import {
  getProfilePresentationState,
  ProfilePresentationPersistenceError,
  publishProfilePresentation,
  saveProfilePresentationDraft,
  type ProfilePresentationState,
} from "@/lib/profile-presentation/repository";
import {
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
} from "@/lib/public-profile/cache-invalidation";

const answersSchema = z
  .record(z.string().min(1).max(64), z.unknown())
  .refine((answers) => Object.keys(answers).length <= 20, "Too many answers");

const saveQuestionAnswersSchema = z
  .object({
    templateId: z.enum(PROFILE_TEMPLATE_IDS),
    expectedRevision: z.number().int().nonnegative(),
    baseAnswers: answersSchema,
    answers: answersSchema,
    intent: z.enum(["autosave", "complete"]),
    targetUserId: z.string().uuid().optional(),
  })
  .strict();

const completeQuestionStepSchema = z
  .object({
    templateId: z.enum(PROFILE_TEMPLATE_IDS),
    stepId: z.string().min(1).max(64),
    targetUserId: z.string().uuid().optional(),
  })
  .strict();

export type CompleteQuestionStepData = {
  completedStepIds: string[];
  revision: number;
};

export async function completeQuestionStep(
  rawInput: unknown,
): Promise<ActionResult<CompleteQuestionStepData>> {
  const input = completeQuestionStepSchema.safeParse(rawInput);
  if (!input.success) {
    return actionError(
      "INVALID_REQUEST",
      "This setup step was not recognized.",
    );
  }
  const question = getProfileQuestionSet(input.data.templateId).questions.find(
    ({ id }) => id === input.data.stepId,
  );
  if (!question || question.kind !== "content-builder") {
    return actionError(
      "INVALID_REQUEST",
      "This setup step was not recognized.",
    );
  }

  try {
    const { scope } = await resolveDashboardIdentity(input.data.targetUserId);
    const state = await getProfilePresentationState(scope.effectiveUserId);
    if (state.draft.effective.templateId !== input.data.templateId) {
      return actionError(
        "TEMPLATE_CHANGED",
        "Your selected template changed. Reload setup to continue.",
      );
    }
    const progress = await completeProfileOnboardingStep({
      userId: scope.effectiveUserId,
      templateId: input.data.templateId,
      stepId: input.data.stepId,
    });
    return {
      ok: true,
      data: {
        completedStepIds: progress.completedStepIds,
        revision: progress.revision,
      },
    };
  } catch {
    return actionError(
      "SAVE_FAILED",
      "We could not save this setup progress. Your profile content was not removed.",
    );
  }
}

export type SaveQuestionAnswersData = {
  answers: Record<string, unknown>;
  revision: number;
  completed: boolean;
  summary: { questionId: string; label: string; value: string }[];
};

function savedConfiguration(state: ProfilePresentationState) {
  if (
    state.draft.resolutionReason === "missing" ||
    state.draft.resolutionReason === "malformed" ||
    state.draft.resolutionReason === "unsupported-version"
  ) {
    return null;
  }
  return state.draft.effective;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedFields(
  baseAnswers: Readonly<Record<string, unknown>>,
  answers: Readonly<Record<string, unknown>>,
) {
  return [
    ...new Set([...Object.keys(baseAnswers), ...Object.keys(answers)]),
  ].filter((key) => !sameValue(baseAnswers[key], answers[key]));
}

function mergeNonConflictingAnswers(input: {
  baseAnswers: Readonly<Record<string, unknown>>;
  answers: Readonly<Record<string, unknown>>;
  latestAnswers: Readonly<Record<string, unknown>>;
}) {
  const merged: Record<string, unknown> = { ...input.latestAnswers };
  for (const field of changedFields(input.baseAnswers, input.answers)) {
    if (!sameValue(input.latestAnswers[field], input.baseAnswers[field])) {
      return null;
    }
    if (field in input.answers) merged[field] = input.answers[field];
    else delete merged[field];
  }
  return merged;
}

function persistenceFailure(error: ProfilePresentationPersistenceError) {
  if (error.code === "CONFLICT") {
    return actionError(
      "CONFLICT",
      "These answers changed in another tab. Your answers are still here; reload the saved draft before trying again.",
    );
  }
  if (error.code === "INVALID_CONFIGURATION") {
    return actionError(
      "INVALID_ANSWERS",
      "Some answers are no longer valid for this template. Review the highlighted questions.",
    );
  }
  if (error.code === "FORBIDDEN") {
    return actionError(
      "CHOICE_LOCKED",
      "This draft is not available on the current plan. Review your appearance choices before continuing.",
    );
  }
  return actionError(
    "SAVE_FAILED",
    "We could not save your answers. They are still on this page, so you can try again.",
  );
}

async function publishCompletedQuestions(input: {
  userId: string;
  username: string;
  draftRevision: number;
  publishedRevision: number;
}) {
  await publishProfilePresentation({
    userId: input.userId,
    expectedDraftRevision: input.draftRevision,
    expectedPublishedRevision: input.publishedRevision,
  });
  invalidatePublicProfileCache({
    profileId: input.userId,
    feature: "profile",
  });
  invalidatePublicProfileIdentityCache([input.username]);
}

export async function saveQuestionAnswers(
  rawInput: unknown,
): Promise<ActionResult<SaveQuestionAnswersData>> {
  const input = saveQuestionAnswersSchema.safeParse(rawInput);
  if (!input.success) {
    return actionError(
      "INVALID_REQUEST",
      "The saved question data was not recognized. Review your answers and try again.",
    );
  }

  try {
    const { scope } = await resolveDashboardIdentity(input.data.targetUserId);
    const contentOptions = await getQuestionContentOptions(scope);
    let state = await getProfilePresentationState(scope.effectiveUserId);
    let configuration = savedConfiguration(state);
    if (!configuration) {
      return actionError(
        "CONFIGURATION_LOCKED",
        "Restart appearance setup before changing these answers. Your published profile has not changed.",
      );
    }
    if (configuration.templateId !== input.data.templateId) {
      return actionError(
        "TEMPLATE_CHANGED",
        "The selected template changed in another page. Your answers are still here; reload to continue with the saved template.",
      );
    }

    const validation = validateProfileQuestionAnswers({
      templateId: configuration.templateId,
      answers: input.data.answers,
      contentOptions,
      requireCompletion: input.data.intent === "complete",
    });
    if (!validation.success) {
      return {
        ok: false,
        code: "INVALID_ANSWERS",
        fieldErrors: Object.fromEntries(
          Object.entries(validation.fieldErrors).map(([field, message]) => [
            field,
            [message],
          ]),
        ),
      };
    }

    let nextAnswers = validation.answers;
    let expectedRevision = input.data.expectedRevision;
    if (state.draft.revision !== expectedRevision) {
      const merged = mergeNonConflictingAnswers({
        baseAnswers: input.data.baseAnswers,
        answers: nextAnswers,
        latestAnswers: configuration.answers,
      });
      if (!merged)
        return persistenceFailure(
          new ProfilePresentationPersistenceError("CONFLICT"),
        );
      nextAnswers = merged;
      expectedRevision = state.draft.revision;
    }

    if (sameValue(nextAnswers, configuration.answers)) {
      if (input.data.intent === "complete") {
        await publishCompletedQuestions({
          userId: scope.effectiveUserId,
          username: scope.username,
          draftRevision: state.draft.revision,
          publishedRevision: state.published.revision,
        });
      }
      return {
        ok: true,
        data: {
          answers: nextAnswers,
          revision: state.draft.revision,
          completed: input.data.intent === "complete",
          summary: summarizeProfileQuestionAnswers({
            templateId: configuration.templateId,
            answers: nextAnswers,
            contentOptions,
          }),
        },
      };
    }

    const save = async () =>
      saveProfilePresentationDraft({
        userId: scope.effectiveUserId,
        expectedRevision,
        configuration: {
          ...configuration,
          answers: nextAnswers,
        } as ProfilePresentationConfiguration,
      });

    let draft;
    try {
      draft = await save();
    } catch (error) {
      if (
        !(error instanceof ProfilePresentationPersistenceError) ||
        error.code !== "CONFLICT"
      ) {
        throw error;
      }
      state = await getProfilePresentationState(scope.effectiveUserId);
      configuration = savedConfiguration(state);
      if (
        !configuration ||
        configuration.templateId !== input.data.templateId
      ) {
        return actionError(
          "TEMPLATE_CHANGED",
          "The selected template changed in another page. Reload to continue with the saved template.",
        );
      }
      const merged = mergeNonConflictingAnswers({
        baseAnswers: input.data.baseAnswers,
        answers: input.data.answers,
        latestAnswers: configuration.answers,
      });
      if (!merged) return persistenceFailure(error);
      nextAnswers = merged;
      expectedRevision = state.draft.revision;
      draft = await save();
    }

    const saved = draft.saved ?? draft.effective;
    if (input.data.intent === "complete") {
      await publishCompletedQuestions({
        userId: scope.effectiveUserId,
        username: scope.username,
        draftRevision: draft.revision,
        publishedRevision: state.published.revision,
      });
    }
    return {
      ok: true,
      data: {
        answers: saved.answers as Record<string, unknown>,
        revision: draft.revision,
        completed: input.data.intent === "complete",
        summary: summarizeProfileQuestionAnswers({
          templateId: saved.templateId,
          answers: saved.answers,
          contentOptions,
        }),
      },
    };
  } catch (error) {
    if (error instanceof ProfilePresentationPersistenceError) {
      return persistenceFailure(error);
    }
    return actionError(
      "AUTHORIZATION_ERROR",
      "We could not verify this profile or load its content. Sign in again and retry.",
    );
  }
}
