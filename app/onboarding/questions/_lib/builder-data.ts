import "server-only";

import { getProfileViewModel } from "@/app/dashboard/_lib/profile/queries";
import { getGalleryAggregate } from "@/app/dashboard/gallery/_lib/queries";
import { getLinkAggregate } from "@/app/dashboard/links/_lib/queries";
import { getLocationAggregate } from "@/app/dashboard/location/_lib/queries";
import { getReviewAggregate } from "@/app/dashboard/review/_lib/queries";
import { getProductAggregate } from "@/app/dashboard/shop/_lib/queries";
import { getTreatmentAggregate } from "@/app/dashboard/treatments/_lib/queries";
import { getVideoAggregate } from "@/app/dashboard/video/_lib/queries";
import type { DashboardScope } from "@/lib/dashboard/types";
import type { OnboardingBuilderData } from "../_components/existing-builder-items";

export const onboardingBuilderIds = [
  "profile",
  "socials",
  "treatment",
  "location",
  "review",
  "gallery",
  "product",
  "link",
  "video",
] as const;

export type OnboardingBuilderId = (typeof onboardingBuilderIds)[number];

function emptyBuilderData(): OnboardingBuilderData {
  return {
    profile: {
      user: { title: "", position: "", gdcNo: "", qualification: "" },
      dentistry: {
        aboutTitle: "",
        aboutText: "",
        phone: "",
        contactEmail: "",
        website: "",
        bookingLink: "",
        bookingEnabled: false,
      },
      socials: {
        linkedin: "",
        twitter: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        other: "",
      },
      profilePicture: { objectPath: null, publicUrl: null },
    },
    links: { groups: [] },
    videos: { groups: [] },
    treatments: {
      sectionTitles: {
        treatmentSectionTitle: "Treatments",
        serviceSectionTitle: "Services",
      },
      treatments: [],
      services: [],
    },
    locations: { title: "Locations", canAddLocation: false, locations: [] },
    reviews: { reviews: [], externalPage: null },
    galleries: { dental: [], general: [] },
    products: { products: [] },
  };
}

export async function getOnboardingBuilderData(
  builder: OnboardingBuilderId,
  scope: DashboardScope,
) {
  const data = emptyBuilderData();
  switch (builder) {
    case "profile":
    case "socials":
      data.profile = await getProfileViewModel(scope);
      break;
    case "treatment":
      data.treatments = await getTreatmentAggregate(scope);
      break;
    case "location":
      data.locations = await getLocationAggregate(scope);
      break;
    case "review":
      data.reviews = await getReviewAggregate(scope);
      break;
    case "gallery":
      data.galleries = await getGalleryAggregate(scope);
      break;
    case "product":
      data.products = await getProductAggregate(scope);
      break;
    case "link":
      data.links = await getLinkAggregate(scope);
      break;
    case "video":
      data.videos = await getVideoAggregate(scope);
      break;
  }
  return data;
}
