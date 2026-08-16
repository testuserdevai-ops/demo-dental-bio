import {
  PROFILE_TEMPLATE_CATALOG,
  type ProfileModuleId,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";

const templatePurposes = {
  basic: "Keep DentalBio's familiar, flexible profile layout.",
  "direct-booking":
    "Put one booking goal first for a solo dentist or small practice.",
  "location-provider-router":
    "Help patients choose the right location, clinician, or appointment path.",
  "services-catalogue":
    "Organise a broad treatment range into clear featured services and groups.",
  "cosmetic-transformation":
    "Lead with visual results, a signature treatment, and consultation action.",
  "trust-first-family-practice":
    "Build reassurance with reviews, people, payment details, and practical care information.",
  "specialist-assessment":
    "Guide patients toward an assessment or specialist consultation with less uncertainty.",
  "expert-educator":
    "Give patients and dental professionals distinct paths through your expertise.",
  "clinic-commerce":
    "Keep patient booking prominent while presenting products, courses, or resources separately.",
} as const satisfies Record<ProfileTemplateId, string>;

const moduleLabels: Partial<Record<ProfileModuleId, string>> = {
  profile: "Profile",
  identity: "Profile header",
  hero: "Featured introduction",
  treatments: "Treatments",
  "primary-action": "Booking action",
  "location-selector": "Choice selector",
  "featured-treatments": "Featured treatments",
  "service-categories": "Service groups",
  reviews: "Reviews",
  "audience-switch": "Audience paths",
  assessment: "Assessment",
  products: "Products",
};

export const PROFILE_TEMPLATE_CHOICES = Object.values(
  PROFILE_TEMPLATE_CATALOG,
).map((template) => ({
  id: template.id,
  name: template.displayName,
  purpose: templatePurposes[template.id],
  minimumTier: template.minimumTier,
  structure: template.moduleOrder
    .filter((moduleId) => moduleLabels[moduleId])
    .slice(0, 3)
    .map((moduleId) => moduleLabels[moduleId]!),
}));
