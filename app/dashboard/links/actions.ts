"use server";
import { z } from "zod";
import { buildManagedCampaignUrl } from "@/lib/analytics/campaign-url";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidatePublicProfileCache } from "@/lib/public-profile/cache-invalidation";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import type { LinkGroupViewModel, LinkViewModel } from "./_lib/queries";
import * as schema from "./_lib/schemas";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;
type RpcResult = { data: unknown; error: unknown };

async function action<TInput, TOutput>(
  hint: string | undefined,
  input: unknown,
  validator: z.ZodType<TInput>,
  execute: (
    client: ServerSupabaseClient,
    dentistry: string,
    value: TInput,
  ) => PromiseLike<RpcResult>,
  code: string,
  map?: (data: unknown) => TOutput | undefined,
  invalidate?: (profileId: string, value: TInput, output: TOutput) => void,
): Promise<ActionResult<TOutput>> {
  const parsed = validator.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await execute(
      client,
      scope.dentistryId,
      parsed.data,
    );
    if (error) return actionError(code, "Unable to manage links");
    const output = map ? map(data) : (undefined as TOutput);
    if (map && output === undefined)
      return actionError(code, "Unable to manage links");
    const result = output as TOutput;
    invalidate?.(scope.effectiveUserId, parsed.data, result);
    return { ok: true, data: result };
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
    image_url?: string | null;
    image_variant?: "none" | "small-icon" | "large-image";
    image_alt?: string | null;
    image_decorative?: boolean;
    is_featured?: boolean;
    analytics_campaign_id?: string | null;
  };
  if (!value.link_id) return undefined;
  return {
    id: value.link_id,
    title: value.title ?? "",
    url: value.link ?? "",
    isActive: value.is_active ?? true,
    rank: value.rank ?? 0,
    imageUrl: value.image_url ?? null,
    imageVariant: value.image_variant ?? "none",
    imageAlt: value.image_alt ?? null,
    imageDecorative: value.image_decorative ?? true,
    isFeatured: value.is_featured ?? false,
    campaignId: value.analytics_campaign_id ?? null,
    destinationUrl: value.link ?? "",
    campaignEnabled: Boolean(value.analytics_campaign_id),
    campaignSource: "",
    campaignMedium: "",
    campaignName: "",
    campaignContent: "",
    campaignTerm: "",
  };
}

function campaignRpcArgs(
  value: schema.CreateLinkInput | schema.UpdateLinkInput,
) {
  return {
    p_url: buildManagedCampaignUrl(value.url, value),
    p_campaign_enabled: value.campaignEnabled,
    p_destination_url: value.url,
    p_campaign_source: value.campaignSource,
    p_campaign_medium: value.campaignMedium,
    p_campaign_name: value.campaignName,
    p_campaign_content: value.campaignContent,
    p_campaign_term: value.campaignTerm,
  };
}
export const createLinkGroup = async (h: string | undefined, i: unknown) =>
  action<schema.CreateLinkGroupInput, LinkGroupViewModel>(
    h,
    i,
    schema.createLinkGroupInputSchema,
    (client, d, v) =>
      client.rpc("create_link_group", {
        p_dentistry_id: d,
        p_heading: v.heading,
      }),
    "CREATE_FAILED",
    mapGroup,
    (profileId, _value, result) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link-group", id: result.id }],
      }),
  );
export const updateLinkGroup = async (h: string | undefined, i: unknown) =>
  action<schema.UpdateLinkGroupInput, LinkGroupViewModel>(
    h,
    i,
    schema.updateLinkGroupInputSchema,
    (client, d, v) =>
      client.rpc("update_link_group", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
        p_heading: v.heading,
      }),
    "UPDATE_FAILED",
    mapGroup,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link-group", id: value.linkGroupId }],
      }),
  );
export const deleteLinkGroup = async (h: string | undefined, i: unknown) =>
  action<schema.DeleteLinkGroupInput, void>(
    h,
    i,
    schema.deleteLinkGroupInputSchema,
    (client, d, v) =>
      client.rpc("delete_link_group", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
      }),
    "DELETE_FAILED",
    undefined,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link-group", id: value.linkGroupId }],
      }),
  );
export const reorderLinkGroups = async (h: string | undefined, i: unknown) =>
  action<schema.ReorderLinkGroupsInput, void>(
    h,
    i,
    schema.reorderLinkGroupsInputSchema,
    (client, d, v) =>
      client.rpc("reorder_link_groups", {
        p_dentistry_id: d,
        p_group_ids: v.orderedIds,
      }),
    "REORDER_FAILED",
    undefined,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: value.orderedIds.map((id) => ({ kind: "link-group", id })),
      }),
  );
export const createLink = async (h: string | undefined, i: unknown) =>
  action<schema.CreateLinkInput, LinkViewModel>(
    h,
    i,
    schema.createLinkInputSchema,
    (client, d, v) =>
      client.rpc("create_dentistry_link_with_media", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
        p_title: v.title,
        ...campaignRpcArgs(v),
        p_image_url: v.imageUrl ?? "",
        p_image_variant: v.imageVariant,
        p_image_alt: v.imageAlt ?? "",
        p_image_decorative: v.imageDecorative,
        p_is_featured: v.isFeatured,
      }),
    "CREATE_FAILED",
    mapLink,
    (profileId, _value, result) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link", id: result.id }],
      }),
  );
export const updateLink = async (h: string | undefined, i: unknown) =>
  action<schema.UpdateLinkInput, LinkViewModel>(
    h,
    i,
    schema.updateLinkInputSchema,
    (client, d, v) =>
      client.rpc("update_dentistry_link_with_media", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
        p_link_id: v.linkId,
        p_title: v.title,
        ...campaignRpcArgs(v),
        p_is_active: v.isActive,
        p_image_url: v.imageUrl ?? "",
        p_image_variant: v.imageVariant,
        p_image_alt: v.imageAlt ?? "",
        p_image_decorative: v.imageDecorative,
        p_is_featured: v.isFeatured,
      }),
    "UPDATE_FAILED",
    mapLink,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link", id: value.linkId }],
      }),
  );
export const deleteLink = async (h: string | undefined, i: unknown) =>
  action<schema.DeleteLinkInput, void>(
    h,
    i,
    schema.deleteLinkInputSchema,
    (client, d, v) =>
      client.rpc("delete_dentistry_link", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
        p_link_id: v.linkId,
      }),
    "DELETE_FAILED",
    undefined,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: [{ kind: "link", id: value.linkId }],
      }),
  );
export const reorderLinks = async (h: string | undefined, i: unknown) =>
  action<schema.ReorderLinksInput, void>(
    h,
    i,
    schema.reorderLinksInputSchema,
    (client, d, v) =>
      client.rpc("reorder_dentistry_links", {
        p_dentistry_id: d,
        p_group_id: v.linkGroupId,
        p_link_ids: v.orderedIds,
      }),
    "REORDER_FAILED",
    undefined,
    (profileId, value) =>
      invalidatePublicProfileCache({
        profileId,
        feature: "links",
        entities: value.orderedIds.map((id) => ({ kind: "link", id })),
      }),
  );
