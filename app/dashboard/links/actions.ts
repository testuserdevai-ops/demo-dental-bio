"use server";
import { z } from "zod";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import type { LinkGroupViewModel, LinkViewModel } from "./_lib/queries";
import * as schema from "./_lib/schemas";

async function action<TInput, TOutput>(
  hint: string | undefined,
  input: unknown,
  validator: z.ZodType<TInput>,
  name: string,
  args: (dentistry: string, value: TInput) => Record<string, unknown>,
  code: string,
): Promise<ActionResult<TOutput>> {
  const parsed = validator.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const { data, error } = await (
      await createServerSupabaseClient()
    ).rpc(name as never, args(scope.dentistryId, parsed.data) as never);
    if (error) return actionError(code, "Unable to manage links");
    return { ok: true, data: data as TOutput };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to manage links");
  }
}
export const createLinkGroup = (h: string | undefined, i: unknown) =>
  action<schema.CreateLinkGroupInput, LinkGroupViewModel>(
    h,
    i,
    schema.createLinkGroupInputSchema,
    "create_link_group",
    (d, v) => ({ p_dentistry_id: d, p_heading: v.heading }),
    "CREATE_FAILED",
  );
export const updateLinkGroup = (h: string | undefined, i: unknown) =>
  action<schema.UpdateLinkGroupInput, LinkGroupViewModel>(
    h,
    i,
    schema.updateLinkGroupInputSchema,
    "update_link_group",
    (d, v) => ({
      p_dentistry_id: d,
      p_group_id: v.linkGroupId,
      p_heading: v.heading,
    }),
    "UPDATE_FAILED",
  );
export const deleteLinkGroup = (h: string | undefined, i: unknown) =>
  action<schema.DeleteLinkGroupInput, void>(
    h,
    i,
    schema.deleteLinkGroupInputSchema,
    "delete_link_group",
    (d, v) => ({ p_dentistry_id: d, p_group_id: v.linkGroupId }),
    "DELETE_FAILED",
  );
export const reorderLinkGroups = (h: string | undefined, i: unknown) =>
  action<schema.ReorderLinkGroupsInput, void>(
    h,
    i,
    schema.reorderLinkGroupsInputSchema,
    "reorder_link_groups",
    (d, v) => ({ p_dentistry_id: d, p_group_ids: v.orderedIds }),
    "REORDER_FAILED",
  );
export const createLink = (h: string | undefined, i: unknown) =>
  action<schema.CreateLinkInput, LinkViewModel>(
    h,
    i,
    schema.createLinkInputSchema,
    "create_dentistry_link",
    (d, v) => ({
      p_dentistry_id: d,
      p_group_id: v.linkGroupId,
      p_title: v.title,
      p_url: v.url,
    }),
    "CREATE_FAILED",
  );
export const updateLink = (h: string | undefined, i: unknown) =>
  action<schema.UpdateLinkInput, LinkViewModel>(
    h,
    i,
    schema.updateLinkInputSchema,
    "update_dentistry_link",
    (d, v) => ({
      p_dentistry_id: d,
      p_group_id: v.linkGroupId,
      p_link_id: v.linkId,
      p_title: v.title,
      p_url: v.url,
      p_is_active: v.isActive,
    }),
    "UPDATE_FAILED",
  );
export const deleteLink = (h: string | undefined, i: unknown) =>
  action<schema.DeleteLinkInput, void>(
    h,
    i,
    schema.deleteLinkInputSchema,
    "delete_dentistry_link",
    (d, v) => ({
      p_dentistry_id: d,
      p_group_id: v.linkGroupId,
      p_link_id: v.linkId,
    }),
    "DELETE_FAILED",
  );
export const reorderLinks = (h: string | undefined, i: unknown) =>
  action<schema.ReorderLinksInput, void>(
    h,
    i,
    schema.reorderLinksInputSchema,
    "reorder_dentistry_links",
    (d, v) => ({
      p_dentistry_id: d,
      p_group_id: v.linkGroupId,
      p_link_ids: v.orderedIds,
    }),
    "REORDER_FAILED",
  );
