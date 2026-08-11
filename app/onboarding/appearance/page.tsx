import { redirect } from "next/navigation";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { PROFILE_THEME_CATALOG } from "@/lib/profile-presentation/catalog";
import { resolveProfilePresentationConfiguration } from "@/lib/profile-presentation/contract";
import { getProfilePresentationState } from "@/lib/profile-presentation/repository";

import { AppearanceChooser } from "./_components/AppearanceChooser";

type AppearanceStep = "theme" | "template";

function isAppearanceStep(value: string | undefined): value is AppearanceStep {
  return value === "theme" || value === "template";
}

export default async function AppearanceOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  let userId: string;
  try {
    const { scope } = await resolveDashboardIdentity();
    userId = scope.effectiveUserId;
  } catch {
    redirect("/login");
  }

  const [params, state] = await Promise.all([
    searchParams,
    getProfilePresentationState(userId),
  ]);
  const defaultStep: AppearanceStep = state.draft ? "template" : "theme";
  if (!isAppearanceStep(params.step)) {
    redirect(`/onboarding/appearance?step=${defaultStep}`);
  }
  if (params.step === "template" && !state.draft) {
    redirect("/onboarding/appearance?step=theme");
  }

  const saved = state.draft?.configuration ?? state.published.saved;
  const resolved = resolveProfilePresentationConfiguration(
    saved,
    state.entitlement,
  );
  const unavailableTheme =
    saved.themeId !== resolved.configuration.themeId &&
    PROFILE_THEME_CATALOG[saved.themeId]?.minimumTier === "pro";

  return (
    <AppearanceChooser
      configuration={resolved.configuration}
      entitlementTier={state.entitlement.tier}
      revision={state.draft?.revision ?? 0}
      step={params.step}
      fallbackNotice={
        unavailableTheme
          ? `${PROFILE_THEME_CATALOG[saved.themeId].displayName} requires Pro, so Clinical Light is selected for now. Your saved intent has not been published or deleted.`
          : undefined
      }
    />
  );
}
