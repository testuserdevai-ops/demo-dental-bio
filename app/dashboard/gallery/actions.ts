"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidatePublicProfileCache } from "@/lib/public-profile/cache-invalidation";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import * as schema from "./_lib/schemas";
import type {
  DentalGalleryViewModel,
  GeneralGalleryViewModel,
} from "./_lib/queries";

type DentalRow = {
  id: number;
  title: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  before_image_label: string | null;
  after_image_label: string | null;
  rank: number | null;
  enabled: boolean | null;
  created_at: string;
};
type GeneralRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  rank: number | null;
  enabled: boolean | null;
  created_at: string;
};
const dental = (row: DentalRow): DentalGalleryViewModel => ({
  id: row.id,
  title: row.title ?? "",
  beforeImageUrl: row.before_image_url ?? "",
  afterImageUrl: row.after_image_url ?? "",
  beforeLabel: row.before_image_label ?? "",
  afterLabel: row.after_image_label ?? "",
  rank: row.rank ?? 0,
  enabled: row.enabled ?? true,
  createdAt: row.created_at,
});
const general = (row: GeneralRow): GeneralGalleryViewModel => ({
  id: row.id,
  title: row.title ?? "",
  imageUrl: row.image_url ?? "",
  rank: row.rank ?? 0,
  enabled: row.enabled ?? true,
  createdAt: row.created_at,
});
const failed = <T>(code: string): ActionResult<T> =>
  actionError(code, "Unable to manage galleries");
const invalidate = (profileId: string, ids: readonly number[]) =>
  invalidatePublicProfileCache({
    profileId,
    feature: "galleries",
    entities: ids.map((id) => ({ kind: "gallery" as const, id: String(id) })),
  });

export async function createDentalGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<DentalGalleryViewModel>> {
  const parsed = schema.createDentalGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("create_dashboard_gallery", {
      p_user_id: scope.effectiveUserId,
      p_title: value.title,
      p_before_image_url: value.beforeImageUrl,
      p_after_image_url: value.afterImageUrl,
      p_before_image_label: value.beforeLabel,
      p_after_image_label: value.afterLabel,
    });
    const row = data?.[0];
    if (error || !row) return failed("CREATE_FAILED");
    const result = dental(row);
    invalidate(scope.effectiveUserId, [result.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function updateDentalGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<DentalGalleryViewModel>> {
  const parsed = schema.updateDentalGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_gallery", {
      p_user_id: scope.effectiveUserId,
      p_id: value.id,
      p_title: value.title,
      p_before_image_url: value.beforeImageUrl,
      p_after_image_url: value.afterImageUrl,
      p_before_image_label: value.beforeLabel,
      p_after_image_label: value.afterLabel,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    if (error || !row) return failed("UPDATE_FAILED");
    const result = dental(row);
    invalidate(scope.effectiveUserId, [value.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function deleteDentalGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteDentalGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_gallery", {
      p_user_id: scope.effectiveUserId,
      p_id: parsed.data.id,
    });
    if (error) return failed("DELETE_FAILED");
    invalidate(scope.effectiveUserId, [parsed.data.id]);
    return { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function reorderDentalGalleries(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderDentalGalleriesSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_galleries", {
      p_user_id: scope.effectiveUserId,
      p_ids: parsed.data.orderedIds,
    });
    if (error) return failed("REORDER_FAILED");
    invalidate(scope.effectiveUserId, parsed.data.orderedIds);
    return { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function createGeneralGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<GeneralGalleryViewModel>> {
  const parsed = schema.createGeneralGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc(
      "create_dashboard_general_gallery",
      {
        p_user_id: scope.effectiveUserId,
        p_title: parsed.data.title,
        p_image_url: parsed.data.imageUrl,
      },
    );
    const row = data?.[0];
    if (error || !row) return failed("CREATE_FAILED");
    const result = general(row);
    invalidate(scope.effectiveUserId, [result.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function updateGeneralGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<GeneralGalleryViewModel>> {
  const parsed = schema.updateGeneralGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc(
      "update_dashboard_general_gallery",
      {
        p_user_id: scope.effectiveUserId,
        p_id: value.id,
        p_title: value.title,
        p_image_url: value.imageUrl,
        p_enabled: value.enabled,
      },
    );
    const row = data?.[0];
    if (error || !row) return failed("UPDATE_FAILED");
    const result = general(row);
    invalidate(scope.effectiveUserId, [value.id]);
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function deleteGeneralGallery(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteGeneralGallerySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_general_gallery", {
      p_user_id: scope.effectiveUserId,
      p_id: parsed.data.id,
    });
    if (error) return failed("DELETE_FAILED");
    invalidate(scope.effectiveUserId, [parsed.data.id]);
    return { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function reorderGeneralGalleries(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderGeneralGalleriesSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_general_galleries", {
      p_user_id: scope.effectiveUserId,
      p_ids: parsed.data.orderedIds,
    });
    if (error) return failed("REORDER_FAILED");
    invalidate(scope.effectiveUserId, parsed.data.orderedIds);
    return { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
