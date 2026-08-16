"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidatePublicProfileCache } from "@/lib/public-profile/cache-invalidation";
import * as schema from "./_lib/schemas";
import type { LocationViewModel } from "./_lib/queries";
type Row = {
  location_id: string;
  business_name: string | null;
  full_address: string | null;
  country: string | null;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_alt: string | null;
  image_decorative: boolean;
  updated_at: string;
};
const map = (row: Row): LocationViewModel => ({
  id: row.location_id,
  businessName: row.business_name ?? "",
  fullAddress: row.full_address ?? "",
  country: row.country ?? "",
  city: row.city ?? "",
  area: row.area ?? "",
  latitude: row.latitude ?? 0,
  longitude: row.longitude ?? 0,
  imageUrl: row.image_url,
  imageAlt: row.image_alt ?? "",
  imageDecorative: row.image_decorative,
  updatedAt: row.updated_at,
});
const failed = <T>(
  code: string,
  message = "Unable to manage locations",
): ActionResult<T> => actionError(code, message);
const invalidate = (profileId: string, ids: readonly string[] = []) =>
  invalidatePublicProfileCache({
    profileId,
    feature: "locations",
    entities: ids.map((id) => ({ kind: "location" as const, id })),
  });
export async function saveLocationTitle(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<{ title: string }>> {
  const parsed = schema.locationTitleSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("save_dentistry_location_title", {
      p_dentistry_id: scope.dentistryId,
      p_title: parsed.data.title,
    });
    if (error || !data) return failed("UPDATE_FAILED");
    invalidate(scope.effectiveUserId);
    return { ok: true, data: { title: data } };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function createLocation(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<LocationViewModel>> {
  const parsed = schema.createLocationSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const v = parsed.data;
    const { data, error } = await client.rpc(
      "create_dentistry_location_with_media",
      {
        p_dentistry_id: scope.dentistryId,
        p_location_id: v.id,
        p_business_name: v.businessName,
        p_full_address: v.fullAddress,
        p_country: v.country,
        p_city: v.city,
        p_area: v.area,
        p_latitude: v.latitude,
        p_longitude: v.longitude,
        p_image_url: v.imageUrl,
        p_image_alt: v.imageDecorative ? null : v.imageAlt,
        p_image_decorative: v.imageDecorative,
      },
    );
    const row = data?.[0];
    if (error || !row)
      return failed(
        error?.code === "23514" ? "LIMIT_REACHED" : "CREATE_FAILED",
        error?.code === "23514"
          ? "Upgrade to add another location"
          : "Unable to create location",
      );
    const result = map(row);
    invalidate(scope.effectiveUserId, [result.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function updateLocation(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<LocationViewModel>> {
  const parsed = schema.updateLocationSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const v = parsed.data;
    const { data, error } = await client.rpc(
      "update_dentistry_location_with_media",
      {
        p_dentistry_id: scope.dentistryId,
        p_location_id: v.id,
        p_expected_updated_at: v.expectedUpdatedAt,
        p_business_name: v.businessName,
        p_full_address: v.fullAddress,
        p_country: v.country,
        p_city: v.city,
        p_area: v.area,
        p_latitude: v.latitude,
        p_longitude: v.longitude,
        p_image_url: v.imageUrl,
        p_image_alt: v.imageDecorative ? null : v.imageAlt,
        p_image_decorative: v.imageDecorative,
      },
    );
    const row = data?.[0];
    if (error?.code === "40001")
      return failed(
        "CONFLICT",
        "This location changed elsewhere. Your draft was kept; reload the latest version before saving.",
      );
    if (error || !row) return failed("UPDATE_FAILED");
    const result = map(row);
    invalidate(scope.effectiveUserId, [v.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function deleteLocation(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteLocationSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dentistry_location", {
      p_dentistry_id: scope.dentistryId,
      p_location_id: parsed.data.id,
    });
    if (error) return failed("DELETE_FAILED");
    invalidate(scope.effectiveUserId, [parsed.data.id]);
    return { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
