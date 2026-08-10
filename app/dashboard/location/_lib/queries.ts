import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export type LocationViewModel = {
  id: string;
  businessName: string;
  fullAddress: string;
  country: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};
export type LocationAggregate = {
  title: string;
  canAddLocation: boolean;
  locations: LocationViewModel[];
};
export async function getLocationAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<LocationAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const [dentistryResult, userResult] = await Promise.all([
    supabase
      .from("dentistries")
      .select(
        "location_title,dentistry_locations(locations(location_id,business_name,full_address,country,city,area,latitude,longitude,updated_at))",
      )
      .eq("dentistry_id", scope.dentistryId)
      .single(),
    supabase
      .from("users")
      .select("subscription_status,trial_end")
      .eq("id", scope.effectiveUserId)
      .single(),
  ]);
  if (dentistryResult.error || userResult.error)
    throw new Error("Unable to load locations");
  const rows = (dentistryResult.data.dentistry_locations ?? [])
    .flatMap((link) => (link.locations ? [link.locations] : []))
    .map((row) => ({
      id: row.location_id,
      businessName: row.business_name ?? "",
      fullAddress: row.full_address ?? "",
      country: row.country ?? "",
      city: row.city ?? "",
      area: row.area ?? "",
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
      updatedAt: row.updated_at,
    }));
  const paid =
    ["PRO", "PREMIUM PRO"].includes(
      userResult.data.subscription_status ?? "",
    ) ||
    Boolean(
      userResult.data.trial_end &&
      new Date(userResult.data.trial_end) > new Date(),
    );
  return {
    title: dentistryResult.data.location_title ?? "Locations",
    canAddLocation: paid || rows.length === 0,
    locations: rows,
  };
}
