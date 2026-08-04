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
  map?: (data: unknown) => TOutput | undefined,
): Promise<ActionResult<TOutput>> {
  const parsed = validator.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const { data, error } = await (
      await createServerSupabaseClient()
    ).rpc(name as never, args(scope.dentistryId, parsed.data) as never);
    if (error) return actionError(code, "Unable to manage links");
    const output = map ? map(data) : (undefined as TOutput);
    if (map && output === undefined)
      return actionError(code, "Unable to manage links");
    return { ok: true, data: output as TOutput };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to manage links");
  }
}

function mapGroup(data: unknown): LinkGroupViewModel | undefined {
  const row = Array.isArray(data) ? data[0] : undefined;
  if (!row || typeof row !== "object") return undefined;
  const value = row as {
    link_group_id?: string;
    heading?: string;
    rank?: number;
  };
  if (!value.link_group_id) return undefined;
  return {
    id: value.link_group_id,
    heading: value.heading ?? "",
    rank: value.rank ?? 0,
    links: [],
  };
}

function mapLink(data: unknown): LinkViewModel | undefined {
  const row = Array.isArray(data) ? data[0] : undefined;
  if (!row || typeof row !== "object") return undefined;
  const value = row as {
    link_id?: string;
    title?: string;
    link?: string;
    is_active?: boolean;
    rank?: number;
  };
  if (!value.link_id) return undefined;
  return {
    id: value.link_id,
    title: value.title ?? "",
    url: value.link ?? "",
    isActive: value.is_active ?? true,
    rank: value.rank ?? 0,
  };
}
export const createLinkGroup = async (h: string | undefined, i: unknown) =>
  action<schema.CreateLinkGroupInput, LinkGroupViewModel>(
    h,
    i,
    schema.createLinkGroupInputSchema,
    "create_link_group",
    (d, v) => ({ p_dentistry_id: d, p_heading: v.heading }),
    "CREATE_FAILED",
    mapGroup,
  );
export const updateLinkGroup = async (h: string | undefined, i: unknown) =>
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
    mapGroup,
  );
export const deleteLinkGroup = async (h: string | undefined, i: unknown) =>
  action<schema.DeleteLinkGroupInput, void>(
    h,
    i,
    schema.deleteLinkGroupInputSchema,
    "delete_link_group",
    (d, v) => ({ p_dentistry_id: d, p_group_id: v.linkGroupId }),
    "DELETE_FAILED",
  );
export const reorderLinkGroups = async (h: string | undefined, i: unknown) =>
  action<schema.ReorderLinkGroupsInput, void>(
    h,
    i,
    schema.reorderLinkGroupsInputSchema,
    "reorder_link_groups",
    (d, v) => ({ p_dentistry_id: d, p_group_ids: v.orderedIds }),
    "REORDER_FAILED",
  );
export const createLink = async (h: string | undefined, i: unknown) =>
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
    mapLink,
  );
export const updateLink = async (h: string | undefined, i: unknown) =>
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
    mapLink,
  );
export const deleteLink = async (h: string | undefined, i: unknown) =>
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
export const reorderLinks = async (h: string | undefined, i: unknown) =>
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
