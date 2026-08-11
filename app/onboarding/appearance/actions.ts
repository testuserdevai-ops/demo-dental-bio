"use server";

import { z } from "zod";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
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
  saveProfilePresentationDraft,
} from "@/lib/profile-presentation/repository";

const saveAppearanceChoiceSchema = z
  .object({
    step: z.enum(["theme", "template"]),
    expectedRevision: z.number().int().nonnegative(),
    themeId: z.enum(PROFILE_THEME_IDS),
    templateId: z.enum(PROFILE_TEMPLATE_IDS),
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
    const { scope } = await resolveDashboardIdentity();
    const state = await getProfilePresentationState(scope.effectiveUserId);
    const savedSource = state.draft?.configuration ?? state.published.saved;
    const source = resolveProfilePresentationConfiguration(
      savedSource,
      state.entitlement,
    ).configuration;
    const templateChanged =
      parsed.data.step === "template" &&
      parsed.data.templateId !== source.templateId;
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
    });
    if (!draft) {
      return actionError(
        "SAVE_FAILED",
        "We could not save your choices. Please try again.",
      );
    }

    return {
      ok: true,
      data: {
        configuration: draft.configuration,
        revision: draft.revision,
        nextHref:
          parsed.data.step === "theme"
            ? "/onboarding/appearance?step=template"
            : `/onboarding/questions?template=${draft.configuration.templateId}`,
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
