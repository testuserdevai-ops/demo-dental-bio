"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: dental(row) };
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
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: dental(row) };
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
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
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
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
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
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: general(row) };
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
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: general(row) };
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
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
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
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
