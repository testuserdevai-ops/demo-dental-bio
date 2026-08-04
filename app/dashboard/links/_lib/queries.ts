import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardScope } from "@/lib/dashboard/types";

export type LinkViewModel = {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  rank: number;
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
): Promise<LinkAggregate> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("link_groups")
    .select(
      "link_group_id, heading, rank, dentistry_links(link_id, rank, links(link_id, title, link, isActive))",
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
                      ? [
                          {
                            id: join.link_id,
                            title: join.links.title ?? "",
                            url: join.links.link ?? "",
                            isActive: join.links.isActive ?? true,
                            rank: join.rank ?? index + 1,
                          },
                        ]
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
