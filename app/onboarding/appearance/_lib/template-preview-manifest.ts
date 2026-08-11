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
  "services-catalogue": {
    status: "available",
    src: "/previews/template-services-catalogue.webp",
    alt: "Services Catalogue profile with a large clinician portrait, clear care introduction, and prominent consultation action.",
  },
  "cosmetic-transformation": {
    status: "available",
    src: "/previews/template-cosmetic-results.webp",
    alt: "Cosmetic Transformation profile with a consultation hero, overlapping clinician portrait, immediate consultation action, and signature treatment card.",
  },
  "trust-first-family-practice": {
    status: "available",
    src: "/previews/template-trust-first.webp",
    alt: "Trust-First Family Practice profile showing warm patient photography, a reassurance statement, and immediate family booking and call actions.",
  },
  "specialist-assessment": {
    status: "available",
    src: "/previews/template-specialist-assessment.webp",
    alt: "Specialist Assessment profile with a clinician portrait, focused tooth-pain guidance, immediate assessment and consultation actions, and referral guidance.",
  },
  "expert-educator": {
    status: "available",
    src: "/previews/template-expert-educator.webp",
    alt: "Expert and Educator profile with a professional portrait, patient and professional audience paths, immediate consultation and collaboration actions, and editorial positioning.",
  },
  "clinic-commerce": {
    status: "available",
    src: "/previews/template-clinic-commerce.webp",
    alt: "Clinic and Commerce profile with a clinician portrait, clinic booking action, shop path, and a curated featured-product section.",
  },
} as const satisfies Record<ProfileTemplateId, TemplatePreview>;
