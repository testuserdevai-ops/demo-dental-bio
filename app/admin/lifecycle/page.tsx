import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getAdminLifecycleAudit } from "@/lib/admin/lifecycle-audit-repository";
import { parseLifecycleAuditFilters } from "@/lib/admin/lifecycle-audit";

import { LifecycleOperatorAudit } from "./_components/LifecycleOperatorAudit";

export default async function AdminLifecyclePage({
  searchParams,
}: {
  searchParams: Promise<{
    owner?: string;
    campaign?: string;
    outcome?: string;
    limit?: string;
  }>;
}) {
  await requireAdminPageCapability("console:admin");
  const filters = parseLifecycleAuditFilters(await searchParams);
  if (!filters.ownerId) {
    return (
      <LifecycleOperatorAudit filters={filters} state={{ kind: "idle" }} />
    );
  }

  const state = await getAdminLifecycleAudit({
    ...filters,
    ownerId: filters.ownerId,
  })
    .then((data) => ({ kind: "ready" as const, data }))
    .catch(() => ({ kind: "unavailable" as const }));
  return <LifecycleOperatorAudit filters={filters} state={state} />;
}
