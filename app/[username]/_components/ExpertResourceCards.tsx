"use client";

import { useLegacyCounterAllowed } from "@/app/contexts/AnalyticsContext";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

import type { ExpertResource } from "../_lib/expert-educator-template";

export default function ExpertResourceCards({
  resources,
}: {
  resources: readonly ExpertResource[];
}) {
  const legacyCounterAllowed = useLegacyCounterAllowed();

  const trackLegacyCounter = (linkId: string) => {
    if (!legacyCounterAllowed) return;
    void fetch("/api/links/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    }).catch((error) => console.error("Error tracking link click:", error));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {resources.map((resource, index) => (
        <PublicProfileLinkCard
          analytics={{
            section: "links",
            position: index + 1,
            action: {
              type: "link_click",
              linkId: resource.link_id,
              groupId: resource.groupId,
            },
          }}
          href={resource.link!}
          key={resource.link_id}
          label={resource.title?.trim() || "Educational resource"}
          onClick={() => trackLegacyCounter(resource.link_id)}
          presentation={resolvePublicLinkPresentation({
            variant: resource.image_variant,
            imageUrl: resource.image_url,
            imageAlt: resource.image_alt,
            decorative: resource.image_decorative,
            featured: resource.is_featured,
          })}
        />
      ))}
    </div>
  );
}
