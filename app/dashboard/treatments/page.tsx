import IntroText from "@/app/components/IntroText";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getTreatmentAggregate } from "./_lib/queries";
import TreatmentsClientWrapper from "./TreatmentsClientWrapper";

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { scope } = await resolveDashboardIdentity(targetUserId);
  const data = await getTreatmentAggregate(scope);

  return (
    <div className="py-2">
      <h2 className="mb-3 text-xl font-semibold text-dark">
        Treatments / Services
      </h2>
      <IntroText>
        On this page you can list your treatments, or if you run a non-clinical
        business, you can showcase your services, areas of expertise, or
        interests.
      </IntroText>
      <TreatmentsClientWrapper
        scopeId={scope.effectiveUserId}
        targetHint={scope.effectiveUserId}
        data={data}
        updatedAt={0}
      />
    </div>
  );
}
