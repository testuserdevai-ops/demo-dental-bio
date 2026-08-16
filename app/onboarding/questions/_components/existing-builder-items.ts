import type { GalleryAggregate } from "@/app/dashboard/gallery/_lib/queries";
import type { LinkAggregate } from "@/app/dashboard/links/_lib/queries";
import type { LocationAggregate } from "@/app/dashboard/location/_lib/queries";
import type { ProfileViewModel } from "@/app/dashboard/_lib/profile/queries";
import type { ReviewAggregate } from "@/app/dashboard/review/_lib/queries";
import type { ProductAggregate } from "@/app/dashboard/shop/_lib/queries";
import type { TreatmentAggregate } from "@/app/dashboard/treatments/_lib/queries";
import type { VideoAggregate } from "@/app/dashboard/video/_lib/queries";
import type { ProfileQuestion } from "@/lib/profile-presentation/questions/registry";

export type OnboardingBuilderContext = {
  scopeId: string;
  userId: string;
  targetHint?: string;
  profile: ProfileViewModel;
  links: LinkAggregate;
  videos: VideoAggregate;
  treatments: TreatmentAggregate;
  locations: LocationAggregate;
  reviews: ReviewAggregate;
  galleries: GalleryAggregate;
  products: ProductAggregate;
};

export type ExistingBuilderItem = {
  id: string;
  label: string;
  description?: string;
};

function nonEmpty(value: string) {
  return value.trim().length > 0;
}

export function getExistingBuilderItems(input: {
  builder: Extract<ProfileQuestion, { kind: "content-builder" }>["builder"];
  context: OnboardingBuilderContext;
}): ExistingBuilderItem[] {
  const { builder, context } = input;
  switch (builder) {
    case "profile": {
      const details = [
        context.profile.user.title,
        context.profile.dentistry.aboutTitle,
      ].filter(nonEmpty);
      return details.length
        ? [{ id: "profile", label: details.join(" · ") }]
        : [];
    }
    case "socials":
      return Object.entries(context.profile.socials).flatMap(
        ([platform, value]) =>
          nonEmpty(value)
            ? [
                {
                  id: platform,
                  label:
                    platform === "twitter"
                      ? "X / Twitter"
                      : `${platform[0]?.toUpperCase()}${platform.slice(1)}`,
                  description: value,
                },
              ]
            : [],
      );
    case "treatment":
      return [
        ...context.treatments.treatments.map((item) => ({
          id: item.id,
          label: item.title.trim() || "Untitled treatment",
          description: "Treatment",
        })),
        ...context.treatments.services.map((item) => ({
          id: item.id,
          label: item.title.trim() || "Untitled service",
          description: "Service",
        })),
      ];
    case "location":
      return context.locations.locations.map((item) => ({
        id: item.id,
        label: item.businessName.trim() || "Saved location",
        description: item.fullAddress.trim() || "Address not added",
      }));
    case "review":
      return context.reviews.reviews.map((item) => ({
        id: String(item.id),
        label:
          item.reviewerName.trim() ||
          (item.platform.trim()
            ? `${item.platform.trim()} review`
            : "Saved review"),
        description: item.enabled ? "Active" : "Inactive",
      }));
    case "gallery":
      return context.galleries.dental.map((item) => ({
        id: String(item.id),
        label: item.title.trim() || "Before-and-after case",
        description: item.enabled ? "Active" : "Inactive",
      }));
    case "product":
      return context.products.products.map((item) => ({
        id: String(item.id),
        label:
          item.name.trim() ||
          (item.platform.trim()
            ? `${item.platform.trim()} item`
            : "Saved product"),
        description: item.enabled ? "Active" : "Inactive",
      }));
    case "link":
      return context.links.groups.flatMap((group) =>
        group.links.map((link) => ({
          id: link.id,
          label: link.title.trim() || "Untitled link",
          description: [
            group.heading.trim(),
            link.isActive ? "Active" : "Inactive",
            link.url.trim(),
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      );
    case "video":
      return context.videos.groups.flatMap((group) =>
        group.videos.map((video) => ({
          id: String(video.id),
          label: video.title.trim() || "Untitled video",
          description: [
            group.name.trim(),
            video.enabled ? "Active" : "Inactive",
            video.link.trim(),
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      );
  }
}
