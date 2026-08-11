"use client";

import { useLegacyCounterAllowed } from "@/app/contexts/AnalyticsContext";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

type PublicLink = {
  link_id: string;
  title: string | null;
  link: string | null;
  is_active: boolean | null;
  rank: number | null;
  image_url: string | null;
  image_variant: string;
  image_alt: string | null;
  image_decorative: boolean;
  is_featured: boolean;
};

type PublicLinkGroup = {
  link_group_id: string;
  heading: string | null;
  dentistry_links: { links: PublicLink | PublicLink[] }[];
};

export default function Links({
  serverLinkGroups,
}: {
  serverLinkGroups: PublicLinkGroup[];
}) {
  const legacyCounterAllowed = useLegacyCounterAllowed();
  const trackLinkCounter = (linkId: string) => {
    if (!legacyCounterAllowed) return;
    void fetch("/api/links/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    }).catch((error) => console.error("Error tracking link click:", error));
  };

  if (serverLinkGroups.length === 0) {
    return <section id="links" />;
  }

  return (
    <section id="links">
      <div className="flex flex-col gap-7">
        {serverLinkGroups.map((group) => {
          const sortedActiveLinks = group.dentistry_links
            .map(({ links }) => (Array.isArray(links) ? links[0] : links))
            .filter((link): link is PublicLink => Boolean(link))
            .filter((link) => link.is_active !== false)
            .sort((a, b) => {
              // Handle null ranks by pushing them to the end
              if (a.rank === null && b.rank === null) return 0;
              if (a.rank === null) return 1;
              if (b.rank === null) return -1;

              return a.rank - b.rank;
            });

          return (
            <div key={group.link_group_id}>
              {sortedActiveLinks.length > 0 && (
                <>
                  <h1 className="text-center text-[23px] md:text-[26px] mb-7 font-semibold">
                    {group.heading || "Untitled Group"}
                  </h1>

                  <div className="flex-col-gap">
                    {sortedActiveLinks.map((link, linkIndex) => (
                      <div key={link.link_id} className="col-12">
                        <div className="toplinks-main">
                          <PublicProfileLinkCard
                            href={link.link || "#"}
                            label={link.title || "Untitled Link"}
                            presentation={resolvePublicLinkPresentation({
                              variant: link.image_variant,
                              imageUrl: link.image_url,
                              imageAlt: link.image_alt,
                              decorative: link.image_decorative,
                              featured: link.is_featured,
                            })}
                            analytics={{
                              section: "links",
                              position: linkIndex + 1,
                              action: {
                                type: "link_click",
                                linkId: link.link_id,
                                groupId: group.link_group_id,
                              },
                            }}
                            onClick={() => trackLinkCounter(link.link_id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
