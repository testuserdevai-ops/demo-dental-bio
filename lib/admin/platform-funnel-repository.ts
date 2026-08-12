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
  const plan = planValues[filters.plan];
  const { data, error } = await supabase.rpc("get_admin_platform_funnel", {
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
    ...(plan === null ? {} : { p_plan: plan }),
    ...(filters.domain === "all"
      ? {}
      : { p_registered_domain: filters.domain }),
    p_cohort: filters.cohort,
  });

  if (error) throw new Error("Unable to load the platform funnel");
  const parsed = platformFunnelPayloadSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("Platform funnel data was not recognized");
  return toPlatformFunnelModel(parsed.data, filters);
}
