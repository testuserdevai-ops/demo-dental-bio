import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  platformFunnelPayloadSchema,
  toPlatformFunnelModel,
  type PlatformFunnelFilters,
  type PlatformFunnelModel,
} from "./platform-funnel";

const planValues = {
  all: null,
  free: "FREE",
  pro: "PRO",
  premium: "PREMIUM PRO",
} as const;

export async function getAdminPlatformFunnel(
  filters: PlatformFunnelFilters,
): Promise<PlatformFunnelModel> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_admin_platform_funnel" as never,
    {
      p_start_date: filters.startDate,
      p_end_date: filters.endDate,
      p_plan: planValues[filters.plan],
      p_registered_domain: filters.domain === "all" ? null : filters.domain,
      p_cohort: filters.cohort,
    } as never,
  );

  if (error) throw new Error("Unable to load the platform funnel");
  const parsed = platformFunnelPayloadSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("Platform funnel data was not recognized");
  return toPlatformFunnelModel(parsed.data, filters);
}
