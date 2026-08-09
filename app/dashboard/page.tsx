import { dashboardTargetHint } from "@/lib/dashboard/target";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import ProfileDashboardClient from "./_components/ProfileDashboardClient";
import { getProfileViewModel } from "./_lib/profile/queries";

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; targetUserId?: string }>;
}) {
  const params = await searchParams;
  const targetHint = dashboardTargetHint(params.userId);
  const { scope } = await resolveDashboardIdentity(targetHint);
  const data = await getProfileViewModel(scope);
  return (
    <ProfileDashboardClient
      scopeId={scope.effectiveUserId}
      dentistryId={scope.dentistryId}
      targetHint={targetHint ?? undefined}
      data={data}
      updatedAt={0}
    />
  );
}
