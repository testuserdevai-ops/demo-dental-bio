import { dashboardTargetHint } from "@/lib/dashboard/target";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import ProfileDashboardClient from "./_components/ProfileDashboardClient";
import { getProfileViewModel } from "./_lib/profile/queries";
import { getProfilePresentationState } from "@/lib/profile-presentation/repository";
import { getProfileOnboardingProgress } from "@/lib/profile-presentation/onboarding-progress";

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; targetUserId?: string }>;
}) {
  const params = await searchParams;
  const targetHint = dashboardTargetHint(params.userId);
  const { scope } = await resolveDashboardIdentity(targetHint);
  const [data, presentation] = await Promise.all([
    getProfileViewModel(scope),
    getProfilePresentationState(scope.effectiveUserId),
  ]);
  const templateId = presentation.draft.effective.templateId;
  const progress = await getProfileOnboardingProgress(
    scope.effectiveUserId,
    templateId,
  );
  return (
    <ProfileDashboardClient
      completedStepIds={progress.completedStepIds}
      scopeId={scope.effectiveUserId}
      dentistryId={scope.dentistryId}
      targetHint={targetHint ?? undefined}
      data={data}
      hasAppearanceDraft={presentation.draft.resolutionReason !== "missing"}
      templateId={templateId}
      updatedAt={0}
    />
  );
}
