import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";

type AvailableTemplatePreview = {
  status: "available";
  src: string;
  alt: string;
};

type UnavailableTemplatePreview = {
  status: "unavailable";
  src: "/previews/template-preview-pending.svg";
  alt: "";
  reason: string;
};

export type TemplatePreview =
  AvailableTemplatePreview | UnavailableTemplatePreview;

const pendingPreview: UnavailableTemplatePreview = {
  status: "unavailable",
  src: "/previews/template-preview-pending.svg",
  alt: "",
  reason: "A representative preview will appear when this template is ready.",
};

/**
 * Preview assets must be captured from the stable seeded showcase profile for
 * that exact renderer. Never substitute another template's screenshot.
 */
export const PROFILE_TEMPLATE_PREVIEWS = {
  basic: {
    status: "available",
    src: "/previews/preview-1.webp",
    alt: "Basic DentalBio profile with centered dentist identity, navigation, treatments, and stacked links.",
  },
  "direct-booking": {
    status: "available",
    src: "/previews/template-direct-booking.webp",
    alt: "Direct Booking profile with a clinician portrait, appointment action, supporting website link, featured treatments, and a practice location image.",
  },
  "location-provider-router": {
    status: "available",
    src: "/previews/template-location-router.webp",
    alt: "Location Router profile showing its practice introduction, labelled location selector, and selected practice address card.",
  },
  "services-catalogue": pendingPreview,
  "cosmetic-transformation": pendingPreview,
  "trust-first-family-practice": pendingPreview,
  "specialist-assessment": pendingPreview,
  "expert-educator": pendingPreview,
  "clinic-commerce": pendingPreview,
} as const satisfies Record<ProfileTemplateId, TemplatePreview>;
