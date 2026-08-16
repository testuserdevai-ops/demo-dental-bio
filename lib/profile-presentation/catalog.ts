export const PROFILE_PRESENTATION_SCHEMA_VERSION = 1 as const;

export const PROFILE_TEMPLATE_IDS = [
  "basic",
  "direct-booking",
  "location-provider-router",
  "services-catalogue",
  "cosmetic-transformation",
  "trust-first-family-practice",
  "specialist-assessment",
  "expert-educator",
  "clinic-commerce",
] as const;

export type ProfileTemplateId = (typeof PROFILE_TEMPLATE_IDS)[number];

export const PROFILE_THEME_IDS = [
  "clinical-light",
  "warm-care",
  "editorial-expert",
  "modern-specialist",
  "premium-contrast",
] as const;

export type ProfileThemeId = (typeof PROFILE_THEME_IDS)[number];

export const PROFILE_LAYOUT_VARIANTS = [
  "classic-stack",
  "hero-overlap",
  "editorial-split",
  "section-navigator",
] as const;

export type ProfileLayoutVariant = (typeof PROFILE_LAYOUT_VARIANTS)[number];

export const PROFILE_MODULE_IDS = [
  "header",
  "profile",
  "hero",
  "identity",
  "social-contact",
  "primary-action",
  "secondary-action",
  "audience-switch",
  "booking-introduction",
  "location-selector",
  "selected-location",
  "other-locations",
  "location-reviews",
  "featured-treatments",
  "treatments",
  "services",
  "links",
  "blogs",
  "videos",
  "service-categories",
  "financing",
  "team",
  "reviews",
  "why-choose-us",
  "gallery",
  "biography",
  "assessment",
  "emergency-aftercare",
  "insurance",
  "credentials-affiliations",
  "featured-content",
  "resources",
  "events-courses",
  "newsletter-community",
  "products",
  "affiliate-disclosure",
  "locations-contact",
  "faq-resources",
  "footer",
] as const;

export type ProfileModuleId = (typeof PROFILE_MODULE_IDS)[number];

export type ProfilePresentationTier = "free" | "pro";

export type ProfileTemplateDefinition = {
  id: ProfileTemplateId;
  displayName: string;
  minimumTier: ProfilePresentationTier;
  moduleOrder: readonly ProfileModuleId[];
  allowedLayouts: readonly ProfileLayoutVariant[];
};

const allLayouts = PROFILE_LAYOUT_VARIANTS;

export const PROFILE_TEMPLATE_CATALOG = {
  basic: {
    id: "basic",
    displayName: "Basic",
    minimumTier: "free",
    moduleOrder: [
      "header",
      "profile",
      "treatments",
      "services",
      "links",
      "blogs",
      "videos",
      "gallery",
      "reviews",
      "locations-contact",
      "footer",
    ],
    allowedLayouts: ["classic-stack"],
  },
  "direct-booking": {
    id: "direct-booking",
    displayName: "Direct Booking",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "social-contact",
      "primary-action",
      "secondary-action",
      "featured-treatments",
      "locations-contact",
      "reviews",
    ],
    allowedLayouts: ["classic-stack"],
  },
  "location-provider-router": {
    id: "location-provider-router",
    displayName: "Location or Provider Router",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "booking-introduction",
      "location-selector",
      "selected-location",
      "other-locations",
      "location-reviews",
      "social-contact",
    ],
    allowedLayouts: ["classic-stack", "section-navigator"],
  },
  "services-catalogue": {
    id: "services-catalogue",
    displayName: "Services Catalogue",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "primary-action",
      "featured-treatments",
      "service-categories",
      "financing",
      "team",
      "reviews",
      "locations-contact",
      "faq-resources",
    ],
    allowedLayouts: ["classic-stack", "section-navigator"],
  },
  "cosmetic-transformation": {
    id: "cosmetic-transformation",
    displayName: "Cosmetic Transformation",
    minimumTier: "free",
    moduleOrder: [
      "hero",
      "identity",
      "primary-action",
      "featured-treatments",
      "gallery",
      "reviews",
      "treatments",
      "financing",
      "biography",
      "locations-contact",
    ],
    allowedLayouts: allLayouts,
  },
  "trust-first-family-practice": {
    id: "trust-first-family-practice",
    displayName: "Trust-First Family Practice",
    minimumTier: "free",
    moduleOrder: [
      "hero",
      "identity",
      "primary-action",
      "reviews",
      "why-choose-us",
      "team",
      "featured-treatments",
      "financing",
      "locations-contact",
      "resources",
    ],
    allowedLayouts: ["classic-stack", "hero-overlap", "editorial-split"],
  },
  "specialist-assessment": {
    id: "specialist-assessment",
    displayName: "Specialist Assessment",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "primary-action",
      "secondary-action",
      "featured-treatments",
      "assessment",
      "gallery",
      "reviews",
      "emergency-aftercare",
      "insurance",
      "faq-resources",
      "locations-contact",
    ],
    allowedLayouts: ["classic-stack", "section-navigator"],
  },
  "expert-educator": {
    id: "expert-educator",
    displayName: "Expert and Educator",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "audience-switch",
      "primary-action",
      "secondary-action",
      "credentials-affiliations",
      "featured-content",
      "resources",
      "events-courses",
      "newsletter-community",
      "social-contact",
    ],
    allowedLayouts: ["classic-stack", "editorial-split", "section-navigator"],
  },
  "clinic-commerce": {
    id: "clinic-commerce",
    displayName: "Clinic and Commerce",
    minimumTier: "free",
    moduleOrder: [
      "identity",
      "primary-action",
      "secondary-action",
      "audience-switch",
      "products",
      "affiliate-disclosure",
      "reviews",
      "newsletter-community",
      "social-contact",
    ],
    allowedLayouts: ["classic-stack", "editorial-split", "section-navigator"],
  },
} as const satisfies Record<ProfileTemplateId, ProfileTemplateDefinition>;

export const PROFILE_THEME_CATALOG = {
  "clinical-light": {
    id: "clinical-light",
    displayName: "Violet",
    minimumTier: "free",
  },
  "warm-care": {
    id: "warm-care",
    displayName: "Terracotta",
    minimumTier: "free",
  },
  "editorial-expert": {
    id: "editorial-expert",
    displayName: "Copper",
    minimumTier: "free",
  },
  "modern-specialist": {
    id: "modern-specialist",
    displayName: "Deep Cyan",
    minimumTier: "free",
  },
  "premium-contrast": {
    id: "premium-contrast",
    displayName: "Premium Contrast",
    minimumTier: "pro",
  },
} as const satisfies Record<
  ProfileThemeId,
  {
    id: ProfileThemeId;
    displayName: string;
    minimumTier: ProfilePresentationTier;
  }
>;

export const PROFILE_LAYOUT_CATALOG = {
  "classic-stack": {
    id: "classic-stack",
    displayName: "Classic stack",
    minimumTier: "free",
  },
  "hero-overlap": {
    id: "hero-overlap",
    displayName: "Hero overlap",
    minimumTier: "pro",
  },
  "editorial-split": {
    id: "editorial-split",
    displayName: "Editorial split",
    minimumTier: "pro",
  },
  "section-navigator": {
    id: "section-navigator",
    displayName: "Section navigator",
    minimumTier: "pro",
  },
} as const satisfies Record<
  ProfileLayoutVariant,
  {
    id: ProfileLayoutVariant;
    displayName: string;
    minimumTier: ProfilePresentationTier;
  }
>;
