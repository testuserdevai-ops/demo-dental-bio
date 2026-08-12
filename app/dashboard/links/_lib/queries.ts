import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardScope } from "@/lib/dashboard/types";

export type LinkViewModel = {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  rank: number;
  imageUrl: string | null;
  imageVariant: "none" | "small-icon" | "large-image";
  imageAlt: string | null;
  imageDecorative: boolean;
  isFeatured: boolean;
  campaignId: string | null;
  destinationUrl: string;
  campaignEnabled: boolean;
  campaignSource: string;
  campaignMedium: string;
  campaignName: string;
  campaignContent: string;
  campaignTerm: string;
};
export type LinkGroupViewModel = {
  id: string;
  heading: string;
  rank: number;
  links: LinkViewModel[];
};
export type LinkAggregate = { groups: LinkGroupViewModel[] };

export async function getLinkAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<LinkAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("link_groups")
    .select(
      "link_group_id, heading, rank, dentistry_links(link_id, links(link_id, title, link, is_active, rank, image_url, image_variant, image_alt, image_decorative, is_featured, analytics_campaign_id, analytics_campaigns(campaign_id, destination_url, source, medium, campaign, content, term)))",
    )
    .eq("dentistry_id", scope.dentistryId)
    .order("rank", { nullsFirst: false });
  if (error) throw new Error("Unable to load links");
  return {
    groups: (data ?? [])
      .flatMap((group, groupIndex) =>
        group.link_group_id
          ? [
              {
                id: group.link_group_id,
                heading: group.heading ?? "",
                rank: group.rank ?? groupIndex + 1,
                links: ((group.dentistry_links ?? []) as any[])
                  .flatMap((join, index) =>
                    join.link_id && join.links
                      ? (() => {
                          const campaign = Array.isArray(
                            join.links.analytics_campaigns,
                          )
                            ? join.links.analytics_campaigns[0]
                            : join.links.analytics_campaigns;
                          return [
                            {
                              id: join.link_id,
                              title: join.links.title ?? "",
                              url: join.links.link ?? "",
                              isActive: join.links.is_active ?? true,
                              rank: join.links.rank ?? index + 1,
                              imageUrl: join.links.image_url,
                              imageVariant: join.links.image_variant,
                              imageAlt: join.links.image_alt,
                              imageDecorative: join.links.image_decorative,
                              isFeatured: join.links.is_featured,
                              campaignId:
                                join.links.analytics_campaign_id ?? null,
                              destinationUrl:
                                campaign?.destination_url ??
                                join.links.link ??
                                "",
                              campaignEnabled: Boolean(campaign),
                              campaignSource: campaign?.source ?? "",
                              campaignMedium: campaign?.medium ?? "",
                              campaignName: campaign?.campaign ?? "",
                              campaignContent: campaign?.content ?? "",
                              campaignTerm: campaign?.term ?? "",
                            },
                          ];
                        })()
                      : [],
                  )
                  .sort((a, b) => a.rank - b.rank),
              },
            ]
          : [],
      )
      .sort((a, b) => a.rank - b.rank),
  };
}
