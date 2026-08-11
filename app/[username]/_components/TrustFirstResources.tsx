"use client";

import { useLegacyCounterAllowed } from "@/app/contexts/AnalyticsContext";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

import type { PublicProfileViewModel } from "../_lib/public-profile";

export default function TrustFirstResources({
  linkGroups,
}: {
  linkGroups: PublicProfileViewModel["linkGroups"];
}) {
  const legacyCounterAllowed = useLegacyCounterAllowed();
  const resources = linkGroups
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((group) =>
      group.dentistry_links
        .map(({ links }) => ({ ...links, groupId: group.link_group_id }))
        .filter(({ is_active, link }) => is_active && Boolean(link?.trim()))
        .sort((a, b) => a.rank - b.rank),
    )
    .slice(0, 3);

  if (resources.length === 0) return null;

  const trackLegacyCounter = (linkId: string) => {
    if (!legacyCounterAllowed) return;
    void fetch("/api/links/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    }).catch((error) => console.error("Error tracking link click:", error));
  };

  return (
    <section
      aria-labelledby="trust-first-resources"
      className="space-y-4"
      id="links"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Before your visit
        </p>
        <h2 className="mt-1 text-2xl font-bold" id="trust-first-resources">
          Patient resources
        </h2>
      </div>
      <div className="grid gap-3">
        {resources.map((link, index) => (
          <PublicProfileLinkCard
            analytics={{
              section: "links",
              position: index + 1,
              action: {
                type: "link_click",
                linkId: link.link_id,
                groupId: link.groupId,
              },
            }}
            href={link.link!}
            key={link.link_id}
            label={link.title?.trim() || "Patient information"}
            onClick={() => trackLegacyCounter(link.link_id)}
            presentation={resolvePublicLinkPresentation({
              variant: link.image_variant,
              imageUrl: link.image_url,
              imageAlt: link.image_alt,
              decorative: link.image_decorative,
              featured: link.is_featured,
            })}
          />
        ))}
      </div>
    </section>
  );
}
