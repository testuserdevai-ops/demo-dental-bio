"use server";

import { z } from "zod";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { dashboardTargetHref } from "@/lib/dashboard/target";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import {
  PROFILE_PRESENTATION_SCHEMA_VERSION,
  PROFILE_TEMPLATE_IDS,
  PROFILE_THEME_IDS,
} from "@/lib/profile-presentation/catalog";
import {
  resolveProfilePresentationConfiguration,
  type ProfilePresentationConfiguration,
} from "@/lib/profile-presentation/contract";
import {
  getProfilePresentationState,
  ProfilePresentationPersistenceError,
  publishProfilePresentation,
  saveProfilePresentationDraft,
} from "@/lib/profile-presentation/repository";
import {
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
} from "@/lib/public-profile/cache-invalidation";

const saveAppearanceChoiceSchema = z
  .object({
    step: z.enum(["theme", "template"]),
    expectedRevision: z.number().int().nonnegative(),
    themeId: z.enum(PROFILE_THEME_IDS),
    templateId: z.enum(PROFILE_TEMPLATE_IDS),
    confirmTemplateAnswerReset: z.boolean().optional().default(false),
    targetUserId: z.string().uuid().optional(),
  })
  .strict();

export type SaveAppearanceChoiceData = {
  configuration: ProfilePresentationConfiguration;
  revision: number;
  nextHref: string;
};

function persistenceMessage(error: ProfilePresentationPersistenceError) {
  switch (error.code) {
    case "CONFLICT":
      return actionError(
        "CONFLICT",
        "These choices changed in another tab. Reload the saved choices before continuing.",
      );
    case "FORBIDDEN":
      return actionError(
        "CHOICE_LOCKED",
        "That choice is not available on your current plan. Choose an available option to continue.",
      );
    case "INVALID_CONFIGURATION":
      return actionError(
        "INVALID_CHOICE",
        "That appearance combination is no longer available. Review your choices and try again.",
      );
    default:
      return actionError(
        "SAVE_FAILED",
        "We could not save your choices. Your selection is still here, so you can try again.",
      );
  }
}

export async function saveAppearanceChoice(
  input: unknown,
): Promise<ActionResult<SaveAppearanceChoiceData>> {
  const parsed = saveAppearanceChoiceSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  try {
    const { scope } = await resolveDashboardIdentity(parsed.data.targetUserId);
    const state = await getProfilePresentationState(scope.effectiveUserId);
    const savedSource = state.draft.saved ?? state.published.saved;
    const source = resolveProfilePresentationConfiguration(
      savedSource,
      state.entitlement,
    ).configuration;
    const templateChanged =
      parsed.data.step === "template" &&
      parsed.data.templateId !== source.templateId;
    const clearsTemplateAnswers =
      templateChanged && Object.keys(source.answers).length > 0;
    if (clearsTemplateAnswers && !parsed.data.confirmTemplateAnswerReset) {
      return actionError(
        "TEMPLATE_SWITCH_CONFIRMATION_REQUIRED",
        "Confirm that you want to clear the saved setup answers for the current template. Your profile content will stay unchanged.",
      );
    }
    const configuration: ProfilePresentationConfiguration = {
      schemaVersion: PROFILE_PRESENTATION_SCHEMA_VERSION,
      templateId:
        parsed.data.step === "template"
          ? parsed.data.templateId
          : source.templateId,
      themeId: parsed.data.themeId,
      layoutVariant: templateChanged ? "classic-stack" : source.layoutVariant,
      answers: templateChanged ? {} : source.answers,
    } as ProfilePresentationConfiguration;

    const draft = await saveProfilePresentationDraft({
      userId: scope.effectiveUserId,
      expectedRevision: parsed.data.expectedRevision,
      configuration,
      entitlement: state.entitlement,
    });
    if (!draft) {
      return actionError(
        "SAVE_FAILED",
        "We could not save your choices. Please try again.",
      );
    }

    if (parsed.data.step === "template") {
      await publishProfilePresentation({
        userId: scope.effectiveUserId,
        expectedDraftRevision: draft.revision,
        expectedPublishedRevision: state.published.revision,
      });
      invalidatePublicProfileCache({
        profileId: scope.effectiveUserId,
        feature: "profile",
      });
      invalidatePublicProfileIdentityCache([scope.username]);
    }

    return {
      ok: true,
      data: {
        configuration: draft.saved ?? draft.effective,
        revision: draft.revision,
        nextHref:
          parsed.data.step === "theme"
            ? dashboardTargetHref(
                "/onboarding/appearance?step=template",
                parsed.data.targetUserId,
              )
            : dashboardTargetHref(
                `/onboarding/questions?template=${(draft.saved ?? draft.effective).templateId}`,
                parsed.data.targetUserId,
              ),
      },
    };
  } catch (error) {
    if (error instanceof ProfilePresentationPersistenceError) {
      return persistenceMessage(error);
    }
    return actionError(
      "AUTHORIZATION_ERROR",
      "We could not verify this profile. Sign in again and retry.",
    );
  }
}
