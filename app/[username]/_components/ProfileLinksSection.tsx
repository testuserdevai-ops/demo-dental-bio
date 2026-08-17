"use client";

import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import { useLegacyCounterAllowed } from "@/app/contexts/AnalyticsContext";
import { cn } from "@/lib/utils";

import { selectProfileLinks } from "../_lib/profile-links";

export default function ProfileLinksSection({
  anchorId = "links",
  linkGroups,
  moduleId,
  variant = "stack",
}: {
  anchorId?: string | null;
  linkGroups: unknown;
  moduleId: string;
  variant?: "stack" | "grid";
}) {
  const groups = selectProfileLinks(linkGroups);
  const legacyCounterAllowed = useLegacyCounterAllowed();
  if (groups.length === 0) return null;

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
      className="space-y-7"
      data-profile-module={`${moduleId}-links`}
      id={anchorId ?? undefined}
    >
      {groups.map((group) => (
        <div data-link-group-id={group.id} key={group.id}>
          {group.heading ? (
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
              {group.heading}
            </h2>
          ) : null}
          <div
            className={cn("grid gap-3", variant === "grid" && "sm:grid-cols-2")}
          >
            {group.links.map((link) => (
              <div
                data-link-id={link.id}
                data-link-position={link.position}
                key={link.id}
              >
                <PublicProfileLinkCard
                  analytics={{
                    section: "links",
                    position: link.position,
                    action: {
                      type: "link_click",
                      linkId: link.id,
                      groupId: link.groupId,
                    },
                  }}
                  href={link.href}
                  label={link.label}
                  onClick={() => trackLegacyCounter(link.id)}
                  presentation={link.presentation}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
