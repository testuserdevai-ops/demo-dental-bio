import { redirect } from "next/navigation";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { dashboardTargetHref } from "@/lib/dashboard/target";
import { PROFILE_THEME_CATALOG } from "@/lib/profile-presentation/catalog";
import { getProfilePresentationState } from "@/lib/profile-presentation/repository";

import { AppearanceChooser } from "./_components/AppearanceChooser";
import { resolveAppearancePreviewProfile } from "./_lib/profile-preview";

type AppearanceStep = "theme" | "template";

function isAppearanceStep(value: string | undefined): value is AppearanceStep {
  return value === "theme" || value === "template";
}

function fallbackNotice(
  state: Awaited<ReturnType<typeof getProfilePresentationState>>,
) {
  if (state.draft.resolutionReason === "malformed") {
    return "Your saved appearance could not be read, so Basic with Violet is selected safely. Your profile content has not been changed or deleted.";
  }
  if (state.draft.resolutionReason === "unsupported-version") {
    return "Your saved appearance came from a newer unsupported version, so Basic with Violet is selected safely. Your profile content has not been changed or deleted.";
  }
  if (state.draft.resolutionReason === "entitlement-fallback") {
    const savedTheme = state.draft.saved?.themeId;
    const savedThemeName = savedTheme
      ? PROFILE_THEME_CATALOG[savedTheme].displayName
      : "Your saved choice";
    return `${savedThemeName} is not available on your current plan, so Violet is selected for now. Your saved intent has not been published or deleted.`;
  }
  return undefined;
}

export default async function AppearanceOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; userId?: string }>;
}) {
  const params = await searchParams;
  let userId: string;
  let profile = resolveAppearancePreviewProfile({});
  try {
    const { scope, profileIdentity } = await resolveDashboardIdentity(
      params.userId,
    );
    userId = scope.effectiveUserId;
    profile = resolveAppearancePreviewProfile(profileIdentity ?? {});
  } catch {
    redirect("/login");
  }

  const state = await getProfilePresentationState(userId);
  const draftCanResume =
    state.draft.resolutionReason === "valid" ||
    state.draft.resolutionReason === "entitlement-fallback";
  const defaultStep: AppearanceStep = draftCanResume ? "template" : "theme";
  if (!isAppearanceStep(params.step)) {
    redirect(
      dashboardTargetHref(
        `/onboarding/appearance?step=${defaultStep}`,
        params.userId,
      ),
    );
  }
  const configuration =
    state.draft.resolutionReason === "missing"
      ? state.published.effective
      : state.draft.effective;

  return (
    <AppearanceChooser
      key={`${params.step}-${state.draft.revision}-${configuration.themeId}-${configuration.templateId}`}
      configuration={configuration}
      entitlementTier={state.entitlement.tier}
      revision={state.draft.revision}
      step={params.step}
      fallbackNotice={fallbackNotice(state)}
      profile={profile}
      targetUserId={params.userId}
    />
  );
}
