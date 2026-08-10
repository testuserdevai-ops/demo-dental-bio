"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as schema from "./_lib/schemas";
import type { ProductViewModel } from "./_lib/queries";
type Row = {
  id: number;
  name: string | null;
  link: string | null;
  platform: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  enabled: boolean | null;
  rank: number | null;
};
const map = (row: Row): ProductViewModel => ({
  id: row.id,
  name: row.name ?? "",
  link: row.link ?? "",
  platform: row.platform ?? "",
  imageUrl: row.image_url ?? "",
  price: row.price ?? 0,
  currency: row.currency ?? "GBP(£)",
  enabled: row.enabled ?? true,
  rank: row.rank ?? 0,
});
const failed = <T>(code: string): ActionResult<T> =>
  actionError(code, "Unable to manage products");
export async function createProduct(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<ProductViewModel>> {
  const parsed = schema.createProductSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const v = parsed.data;
    const { data, error } = await client.rpc("create_individual_product", {
      p_user_id: scope.effectiveUserId,
      p_name: v.name,
      p_url: v.link,
      p_platform: v.platform,
      p_image_url: v.imageUrl,
      p_price: v.price,
      p_currency: v.currency,
      p_enabled: v.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: map(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function updateProduct(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<ProductViewModel>> {
  const parsed = schema.updateProductSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const v = parsed.data;
    const { data, error } = await client.rpc("update_individual_product", {
      p_user_id: scope.effectiveUserId,
      p_product_id: v.id,
      p_name: v.name,
      p_url: v.link,
      p_platform: v.platform,
      p_image_url: v.imageUrl,
      p_price: v.price,
      p_currency: v.currency,
      p_enabled: v.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: map(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function deleteProduct(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteProductSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_individual_product", {
      p_user_id: scope.effectiveUserId,
      p_product_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function reorderProducts(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderProductsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_individual_products", {
      p_user_id: scope.effectiveUserId,
      p_product_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
