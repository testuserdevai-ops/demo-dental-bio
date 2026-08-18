import { createClient } from "@supabase/supabase-js";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

type LocalSupabaseStatus = {
  ANON_KEY?: string;
  API_URL?: string;
};

type SeedAccount = {
  email: string;
  password: string;
  username: string;
  role: "admin" | "user";
  subscriptionStatus: "PRO" | null;
};

const accounts: SeedAccount[] = [
  {
    email: "pro@dentalbio.local",
    password: "DentalBioPro123!",
    username: "pro-user",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "admin@dentalbio.local",
    password: "DentalBioAdmin123!",
    username: "admin-user",
    role: "admin",
    subscriptionStatus: null,
  },
  {
    email: "template-basic@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-basic",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-direct-booking@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-direct-booking",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-location-router@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-location-router",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-services-catalogue@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-services-catalogue",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-cosmetic-results@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-cosmetic-results",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-trust-first@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-trust-first",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-specialist-assessment@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-specialist-assessment",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-clinic-commerce@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-clinic-commerce",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "template-expert-educator@dentalbio.local",
    password: "DentalBioPro123!",
    username: "template-expert-educator",
    role: "user",
    subscriptionStatus: "PRO",
  },
];

const repositoryRoot = resolve(import.meta.dir, "..");
const STAGING_PROJECT_REF = "pcbakmokevyrpiqvbzni";
let expectedStorageOrigin = "http://127.0.0.1:54321";

export function resolveLocalSupabaseWorkdir(rawWorkdir?: string) {
  const candidate = rawWorkdir?.trim();
  if (!candidate) return null;

  const workdir = realpathSync(resolve(repositoryRoot, candidate));
  const repositoryRelative = relative(repositoryRoot, workdir);
  if (
    repositoryRelative === ".." ||
    repositoryRelative.startsWith(`..${sep}`) ||
    isAbsolute(repositoryRelative) ||
    !statSync(workdir).isDirectory()
  ) {
    throw new Error(
      "LOCAL_SUPABASE_WORKDIR must resolve to a repository directory.",
    );
  }
  return workdir;
}

export function localSupabaseStatusCommand(rawWorkdir?: string) {
  const workdir = resolveLocalSupabaseWorkdir(rawWorkdir);
  return {
    allowIsolatedPort: workdir !== null,
    command: [
      resolve(repositoryRoot, "node_modules/.bin/supabase"),
      "status",
      "--output",
      "json",
      ...(workdir ? ["--workdir", workdir] : []),
    ],
  };
}

export function validateLocalSupabaseApiUrl(
  rawApiUrl: string,
  allowIsolatedPort: boolean,
) {
  const apiUrl = new URL(rawApiUrl);
  const localHostnames = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
  const validPort = allowIsolatedPort
    ? apiUrl.port.length > 0
    : apiUrl.port === "54321";

  if (
    apiUrl.protocol !== "http:" ||
    !localHostnames.has(apiUrl.hostname) ||
    !validPort ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash
  ) {
    throw new Error(
      `Refusing to verify a non-local Supabase API (${apiUrl.origin}).`,
    );
  }

  return apiUrl;
}

export function localSupabaseStorageOrigin(
  rawApiUrl: string,
  allowIsolatedPort: boolean,
) {
  return validateLocalSupabaseApiUrl(rawApiUrl, allowIsolatedPort).origin;
}

const proFixture = {
  dentistryId: "11111111-1111-4111-8111-111111111120",
  treatmentIds: [
    "11111111-1111-4111-8111-111111111130",
    "11111111-1111-4111-8111-111111111131",
    "11111111-1111-4111-8111-111111111132",
  ],
  videoGroupId: 1_111_101,
  productGroupId: 1_111_102,
  videoIds: [1_111_201, 1_111_202],
  productIds: [1_111_301, 1_111_302],
  galleryId: 1_111_401,
  generalGalleryIds: [1_111_501, 1_111_502],
  reviewIds: [1_111_601, 1_111_602],
  externalReviewPageId: 1_111_701,
  linkGroupId: "11111111-1111-4111-8111-111111111180",
  linkIds: [
    "11111111-1111-4111-8111-111111111181",
    "11111111-1111-4111-8111-111111111182",
  ],
} as const;

const templateBasicFixture = {
  userId: "ba510000-0000-4000-8000-000000000001",
  dentistryId: "ba510000-0000-4000-8000-000000000002",
  locationId: "ba510000-0000-4000-8000-000000000003",
  treatmentIds: [
    "ba510000-0000-4000-8000-000000000006",
    "ba510000-0000-4000-8000-000000000007",
    "ba510000-0000-4000-8000-000000000008",
  ],
  videoGroupId: 1_511_101,
  productGroupId: 1_511_102,
  galleryId: 1_511_401,
  generalGalleryIds: [1_511_501, 1_511_502],
  reviewIds: [1_511_601, 1_511_602],
  externalReviewPageId: 1_511_701,
  blogGroupId: 1_511_801,
  linkGroupId: "ba510000-0000-4000-8000-000000000020",
  profileImage: "basic-profile.webp",
} as const;

const templateDirectBookingFixture = {
  userId: "db010000-0000-4000-8000-000000000001",
  dentistryId: "db010000-0000-4000-8000-000000000002",
  locationId: "db010000-0000-4000-8000-000000000003",
  treatmentIds: [
    "db010000-0000-4000-8000-000000000007",
    "db010000-0000-4000-8000-000000000006",
    "db010000-0000-4000-8000-000000000008",
  ],
  generalGalleryId: 1_611_501,
  reviewIds: [1_611_601, 1_611_602],
  externalReviewPageId: 1_611_701,
  profileImage: "direct-booking-profile.webp",
  locationImage:
    "db010000-0000-4000-8000-000000000001/dentistries/db010000-0000-4000-8000-000000000002/locations/db010000-0000-4000-8000-000000000003/owner-location-1.webp",
} as const;

const templateLocationRouterFixture = {
  userId: "10ca7100-0000-4000-8000-000000000001",
  dentistryId: "10ca7100-0000-4000-8000-000000000002",
  locationIds: [
    "10ca7100-0000-4000-8000-000000000101",
    "10ca7100-0000-4000-8000-000000000102",
    "10ca7100-0000-4000-8000-000000000103",
  ],
  generalGalleryIds: [1_627_501, 1_627_502, 1_627_503],
  reviewIds: [1_627_601, 1_627_602],
  profileImage: "location-router-profile.webp",
  locationImages: [
    {
      locationId: "10ca7100-0000-4000-8000-000000000101",
      file: "harbour-studio.webp",
      decorative: false,
    },
    {
      locationId: "10ca7100-0000-4000-8000-000000000102",
      file: "hove-family.webp",
      decorative: true,
    },
    {
      locationId: "10ca7100-0000-4000-8000-000000000103",
      file: "north-laine.webp",
      decorative: false,
    },
  ],
} as const;

const templateServicesCatalogueFixture = {
  userId: "5e010000-0000-4000-8000-000000000001",
  dentistryId: "5e010000-0000-4000-8000-000000000002",
  locationId: "5e010000-0000-4000-8000-000000000003",
  treatmentIds: [
    "5e010000-0000-4000-8000-000000000006",
    "5e010000-0000-4000-8000-000000000007",
    "5e010000-0000-4000-8000-000000000008",
    "5e010000-0000-4000-8000-000000000009",
    "5e010000-0000-4000-8000-00000000000a",
    "5e010000-0000-4000-8000-00000000000b",
  ],
  featuredTreatmentIds: [
    "5e010000-0000-4000-8000-000000000006",
    "5e010000-0000-4000-8000-000000000009",
    "5e010000-0000-4000-8000-00000000000a",
  ],
  generalGalleryIds: [1_711_501, 1_711_502],
  reviewIds: [1_711_601, 1_711_602, 1_711_603],
  externalReviewPageId: 1_711_701,
  linkGroupId: "5e010000-0000-4000-8000-000000000020",
  linkIds: [
    "5e010000-0000-4000-8000-000000000021",
    "5e010000-0000-4000-8000-000000000022",
    "5e010000-0000-4000-8000-000000000023",
  ],
  profileImage: "services-catalogue-profile-v2.webp",
  financeImage:
    "5e010000-0000-4000-8000-000000000001/services-catalogue-finance.webp",
} as const;

const templateTrustFirstFixture = {
  userId: "7f570000-0000-4000-8000-000000000001",
  dentistryId: "7f570000-0000-4000-8000-000000000002",
  locationId: "7f570000-0000-4000-8000-000000000003",
  treatmentIds: [
    "7f570000-0000-4000-8000-000000000006",
    "7f570000-0000-4000-8000-000000000007",
    "7f570000-0000-4000-8000-000000000008",
  ],
  galleryIds: [1_637_501, 1_637_502],
  reviewIds: [1_637_601, 1_637_602],
  linkIds: [
    "7f570000-0000-4000-8000-000000000021",
    "7f570000-0000-4000-8000-000000000022",
  ],
  linkGroupId: "7f570000-0000-4000-8000-000000000020",
  profileImage: "trust-first-profile.webp",
} as const;

const templateCosmeticResultsFixture = {
  userId: "c051e71c-0000-4000-8000-000000000001",
  dentistryId: "c051e71c-0000-4000-8000-000000000002",
  locationId: "c051e71c-0000-4000-8000-000000000003",
  treatmentIds: [
    "c051e71c-0000-4000-8000-000000000006",
    "c051e71c-0000-4000-8000-000000000007",
    "c051e71c-0000-4000-8000-000000000008",
  ],
  galleryIds: [1_641_401, 1_641_402],
  reviewIds: [1_641_601, 1_641_602],
  linkGroupId: "c051e71c-0000-4000-8000-000000000020",
  profileImage: "cosmetic-results-profile.webp",
} as const;

const templateSpecialistAssessmentFixture = {
  userId: "5a5e5500-0000-4000-8000-000000000001",
  dentistryId: "5a5e5500-0000-4000-8000-000000000002",
  locationId: "5a5e5500-0000-4000-8000-000000000101",
  treatmentIds: [
    "5a5e5500-0000-4000-8000-000000000201",
    "5a5e5500-0000-4000-8000-000000000202",
    "5a5e5500-0000-4000-8000-000000000203",
  ],
  linkGroupIds: [
    "5a5e5500-0000-4000-8000-000000000301",
    "5a5e5500-0000-4000-8000-000000000302",
  ],
  galleryIds: [1_655_501, 1_655_502],
  reviewIds: [1_655_601, 1_655_602],
  profileImage: "specialist-assessment-profile.webp",
} as const;

const templateClinicCommerceFixture = {
  userId: "c11c0000-0000-4000-8000-000000000001",
  dentistryId: "c11c0000-0000-4000-8000-000000000002",
  treatmentIds: [
    "c11c0000-0000-4000-8000-000000000006",
    "c11c0000-0000-4000-8000-000000000007",
    "c11c0000-0000-4000-8000-000000000008",
  ],
  productIds: [1_984_101, 1_984_102, 1_984_103, 1_984_104],
  linkGroupId: "c11c0000-0000-4000-8000-000000000020",
  profileImage: "clinic-commerce-profile.webp",
  productImages: [
    "electric-travel-set.webp",
    "sensitive-care-kit.webp",
    "everyday-travel-pouch.webp",
  ],
} as const;

const templateExpertEducatorFixture = {
  userId: "ed0ca700-0000-4000-8000-000000000001",
  dentistryId: "ed0ca700-0000-4000-8000-000000000002",
  locationId: "ed0ca700-0000-4000-8000-000000000003",
  featuredLinkId: "ed0ca700-0000-4000-8000-000000000021",
  linkGroupIds: [
    "ed0ca700-0000-4000-8000-000000000020",
    "ed0ca700-0000-4000-8000-000000000030",
  ],
  linkIds: [
    "ed0ca700-0000-4000-8000-000000000021",
    "ed0ca700-0000-4000-8000-000000000022",
    "ed0ca700-0000-4000-8000-000000000031",
    "ed0ca700-0000-4000-8000-000000000032",
  ],
  blogGroupIds: [1_651_801, 1_651_802],
  blogIds: [1_651_901, 1_651_902, 1_651_903, 1_651_904, 1_651_905, 1_651_906],
  profileImage: "expert-educator-profile.webp",
  linkImages: ["cracked-teeth.webp", "gum-health.webp", "masterclass.webp"],
} as const;

type LocalClient = ReturnType<typeof createLocalClient>;

function createLocalClient(apiUrl: string, anonKey: string) {
  return createClient(apiUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function assertSeed(
  condition: unknown,
  section: string,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Local seed ${section} verification failed: ${detail}`);
  }
}

async function verifyBasicShowcase(supabase: LocalClient, userId: string) {
  assertSeed(
    userId === templateBasicFixture.userId,
    "Basic identity",
    "the authenticated user ID is not deterministic",
  );

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-basic")
    .single();
  assertQuery(profileError, "Basic public projection");
  assertSeed(
    profile?.profile_id === templateBasicFixture.userId &&
      profile.dentistry_id === templateBasicFixture.dentistryId &&
      profile.profile_presentation_revision === 1,
    "Basic public projection",
    "the private user/dentistry relationship or revision is incorrect",
  );
  const presentation = profile.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: unknown;
  };
  assertSeed(
    presentation.schemaVersion === 1 &&
      presentation.templateId === "basic" &&
      presentation.themeId === "clinical-light" &&
      presentation.layoutVariant === "classic-stack" &&
      JSON.stringify(presentation.answers) === "{}",
    "Basic presentation",
    "the published Basic/Clinical Light configuration is missing",
  );

  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select(
      "dentistry_id, about_title, about_text, booking_link_enabled, socials(instagram_link), dentistry_locations(location_id)",
    )
    .eq("user_id", userId)
    .single();
  assertQuery(dentistryError, "Basic profile");
  assertSeed(
    dentistry?.dentistry_id === templateBasicFixture.dentistryId &&
      dentistry.about_title === "Complete care for confident smiles" &&
      (dentistry.about_text?.length ?? 0) > 80 &&
      dentistry.booking_link_enabled === true &&
      firstRelated(dentistry.socials)?.instagram_link !== null &&
      firstRelated(dentistry.dentistry_locations)?.location_id ===
        templateBasicFixture.locationId,
    "Basic profile",
    "identity, social, booking, or location content is incomplete",
  );

  const [
    treatments,
    videoGroup,
    productGroup,
    blogGroup,
    gallery,
    generalGalleries,
    reviews,
    externalReviewPage,
    linkGroup,
  ] = await Promise.all([
    supabase
      .from("dentistry_treatments")
      .select("treatment_id, rank")
      .eq("dentistry_id", templateBasicFixture.dentistryId),
    supabase
      .from("groups")
      .select("id, datas:videos(id, enabled)")
      .eq("id", templateBasicFixture.videoGroupId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("groups")
      .select("id, datas:products(id, image_url, enabled)")
      .eq("id", templateBasicFixture.productGroupId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("blog_groups")
      .select("id, blogs(id, image_url, enabled)")
      .eq("id", templateBasicFixture.blogGroupId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("galleries")
      .select("id, before_image_url, after_image_url, enabled")
      .eq("id", templateBasicFixture.galleryId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("general_galleries")
      .select("id, image_url, enabled")
      .eq("user_id", userId)
      .in("id", [...templateBasicFixture.generalGalleryIds]),
    supabase
      .from("reviews")
      .select("id, image_url, enabled")
      .eq("user_id", userId)
      .in("id", [...templateBasicFixture.reviewIds]),
    supabase
      .from("external_review_pages")
      .select("id, link")
      .eq("id", templateBasicFixture.externalReviewPageId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("link_groups")
      .select("link_group_id, dentistry_links(links(link_id, is_active))")
      .eq("link_group_id", templateBasicFixture.linkGroupId)
      .eq("dentistry_id", templateBasicFixture.dentistryId)
      .single(),
  ]);

  for (const [section, result] of [
    ["Basic treatments", treatments],
    ["Basic videos", videoGroup],
    ["Basic products", productGroup],
    ["Basic blogs", blogGroup],
    ["Basic gallery", gallery],
    ["Basic general gallery", generalGalleries],
    ["Basic reviews", reviews],
    ["Basic external reviews", externalReviewPage],
    ["Basic links", linkGroup],
  ] as const) {
    assertQuery(result.error, section);
  }

  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateBasicFixture.treatmentIds.length &&
      templateBasicFixture.treatmentIds.every((id) =>
        treatments.data?.some(({ treatment_id }) => treatment_id === id),
      ) &&
      videoGroup.data?.datas.length === 2 &&
      videoGroup.data.datas.every(({ enabled }) => enabled === true) &&
      productGroup.data?.datas.length === 2 &&
      productGroup.data.datas.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      blogGroup.data?.blogs.length === 2 &&
      blogGroup.data.blogs.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      gallery.data?.enabled === true &&
      gallery.data.before_image_url?.startsWith("/previews/") &&
      gallery.data.after_image_url?.startsWith("/previews/") &&
      generalGalleries.data?.length === 2 &&
      generalGalleries.data.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      reviews.data?.length === 2 &&
      reviews.data.every(
        ({ enabled, image_url }) => enabled === true && Boolean(image_url),
      ) &&
      Boolean(externalReviewPage.data?.link) &&
      linkGroup.data?.dentistry_links.length === 2,
    "Basic content",
    "one or more public modules or representative images are missing",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateBasicFixture.dentistryId);
  assertQuery(profileImagesError, "Basic profile image");
  const profileImage = profileImages?.find(
    ({ name }) => name === templateBasicFixture.profileImage,
  );
  assertSeed(
    Boolean(profileImage),
    "Basic profile image",
    "the deterministic Storage object is missing",
  );
  const profileImageUrl = supabase.storage
    .from("profile-pics")
    .getPublicUrl(
      `${templateBasicFixture.dentistryId}/${templateBasicFixture.profileImage}`,
    ).data.publicUrl;
  const response = await fetch(profileImageUrl);
  assertSeed(
    response.ok && response.headers.get("content-type") === "image/webp",
    "Basic profile image",
    "the public profile image bytes are unavailable",
  );
}

async function verifyDirectBookingShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateDirectBookingFixture.userId,
    "Direct Booking identity",
    "the authenticated user ID is not deterministic",
  );

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision, treatment_section_title, service_section_title",
    )
    .eq("username", "template-direct-booking")
    .single();
  assertQuery(profileError, "Direct Booking public projection");
  assertSeed(
    profile?.profile_id === templateDirectBookingFixture.userId &&
      profile.dentistry_id === templateDirectBookingFixture.dentistryId &&
      profile.profile_presentation_revision === 1 &&
      profile.treatment_section_title === "Treatments chosen for you" &&
      profile.service_section_title === "Appointment services",
    "Direct Booking public projection",
    "the private user/dentistry relationship or revision is incorrect",
  );

  const presentation = profile.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: {
      primaryAction?: unknown;
      secondaryAction?: unknown;
      featuredTreatmentIds?: unknown;
    };
  };
  assertSeed(
    presentation.schemaVersion === 1 &&
      presentation.templateId === "direct-booking" &&
      presentation.themeId === "modern-specialist" &&
      presentation.layoutVariant === "classic-stack" &&
      presentation.answers?.primaryAction === "booking" &&
      presentation.answers.secondaryAction === "website" &&
      JSON.stringify(presentation.answers.featuredTreatmentIds) ===
        JSON.stringify(templateDirectBookingFixture.treatmentIds),
    "Direct Booking presentation",
    "the published template, theme, actions, or treatment order is incorrect",
  );

  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select(
      "dentistry_id, about_title, about_text, treatment_section_title, service_section_title, booking_link, booking_link_enabled, website, phone, contact_email, socials(instagram_link, linkedin_link), dentistry_locations(location_id, locations(image_url, image_alt, image_decorative))",
    )
    .eq("user_id", userId)
    .single();
  assertQuery(dentistryError, "Direct Booking profile");
  const directBookingLocationLinks = Array.isArray(
    dentistry.dentistry_locations,
  )
    ? dentistry.dentistry_locations
    : dentistry.dentistry_locations
      ? [dentistry.dentistry_locations]
      : [];
  const directBookingLocation = directBookingLocationLinks.find(
    ({ location_id }) =>
      location_id === templateDirectBookingFixture.locationId,
  );
  const directBookingLocationMedia = firstRelated(
    directBookingLocation?.locations ?? null,
  );
  assertSeed(
    dentistry?.dentistry_id === templateDirectBookingFixture.dentistryId &&
      (dentistry.about_title?.length ?? 0) > 40 &&
      (dentistry.about_text?.length ?? 0) > 100 &&
      dentistry.treatment_section_title === "Treatments chosen for you" &&
      dentistry.service_section_title === "Appointment services" &&
      dentistry.booking_link_enabled === true &&
      dentistry.booking_link?.startsWith("https://") &&
      dentistry.website?.startsWith("https://") &&
      Boolean(dentistry.phone) &&
      Boolean(dentistry.contact_email) &&
      Boolean(firstRelated(dentistry.socials)?.instagram_link) &&
      Boolean(firstRelated(dentistry.socials)?.linkedin_link),
    "Direct Booking profile",
    "identity, booking, contact, or social content is incomplete",
  );
  assertSeed(
    directBookingLocationMedia?.image_url ===
      `${expectedStorageOrigin}/storage/v1/object/public/location-images/${templateDirectBookingFixture.locationImage}` &&
      Boolean(directBookingLocationMedia.image_alt) &&
      directBookingLocationMedia.image_decorative === false,
    "Direct Booking location",
    "the owner-scoped location image, alt policy, or isolated origin is incorrect",
  );

  const [treatments, practiceImage, reviews, externalReviewPage] =
    await Promise.all([
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, rank, treatments(title, description, isService)")
        .eq("dentistry_id", templateDirectBookingFixture.dentistryId),
      supabase
        .from("general_galleries")
        .select("id, title, image_url, enabled")
        .eq("id", templateDirectBookingFixture.generalGalleryId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("reviews")
        .select("id, stars, image_url, enabled")
        .eq("user_id", userId)
        .in("id", [...templateDirectBookingFixture.reviewIds]),
      supabase
        .from("external_review_pages")
        .select("id, link")
        .eq("id", templateDirectBookingFixture.externalReviewPageId)
        .eq("user_id", userId)
        .single(),
    ]);
  for (const [section, result] of [
    ["Direct Booking treatments", treatments],
    ["Direct Booking practice image", practiceImage],
    ["Direct Booking reviews", reviews],
    ["Direct Booking external reviews", externalReviewPage],
  ] as const) {
    assertQuery(result.error, section);
  }
  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateDirectBookingFixture.treatmentIds.length &&
      templateDirectBookingFixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: treatment }) =>
            treatment_id === id &&
            Boolean(firstRelated(treatment)?.title) &&
            Boolean(firstRelated(treatment)?.description) &&
            firstRelated(treatment)?.isService === false,
        ),
      ),
    "Direct Booking treatments",
    "the representative treatment IDs or owner-authored fields are missing",
  );
  assertSeed(
    practiceImage.data?.enabled === true &&
      Boolean(practiceImage.data.title) &&
      practiceImage.data.image_url === "/previews/hero-image-3.webp",
    "Direct Booking practice image",
    "the representative general-gallery image is missing",
  );
  assertSeed(
    reviews.data?.length === 2 &&
      reviews.data.every(
        ({ enabled, image_url, stars }) =>
          enabled === true &&
          stars === 5 &&
          image_url?.startsWith("/previews/"),
      ),
    "Direct Booking reviews",
    "the representative review scores or images are missing",
  );
  assertSeed(
    externalReviewPage.data?.link?.startsWith("https://"),
    "Direct Booking external reviews",
    "the representative external review destination is missing",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateDirectBookingFixture.dentistryId);
  assertQuery(profileImagesError, "Direct Booking profile image");
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateDirectBookingFixture.profileImage,
    ),
    "Direct Booking profile image",
    "the deterministic Storage object is missing",
  );
  const profileImageUrl = supabase.storage
    .from("profile-pics")
    .getPublicUrl(
      `${templateDirectBookingFixture.dentistryId}/${templateDirectBookingFixture.profileImage}`,
    ).data.publicUrl;
  const response = await fetch(profileImageUrl);
  assertSeed(
    response.ok && response.headers.get("content-type") === "image/webp",
    "Direct Booking profile image",
    "the public profile image bytes are unavailable",
  );
  const locationResponse = await fetch(
    supabase.storage
      .from("location-images")
      .getPublicUrl(templateDirectBookingFixture.locationImage).data.publicUrl,
  );
  assertSeed(
    locationResponse.ok &&
      locationResponse.headers.get("content-type") === "image/webp",
    "Direct Booking location image",
    "the saved location image bytes are unavailable",
  );
}

async function verifyLocationRouterShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateLocationRouterFixture.userId,
    "Location router identity",
    "the authenticated user ID is not deterministic",
  );

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-location-router")
    .single();
  assertQuery(profileError, "Location router public projection");
  assertSeed(
    profile?.profile_id === templateLocationRouterFixture.userId &&
      profile.dentistry_id === templateLocationRouterFixture.dentistryId &&
      profile.profile_presentation_revision === 1,
    "Location router public projection",
    "the private user/dentistry relationship or revision is incorrect",
  );
  const presentation = profile.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: {
      routerKind?: unknown;
      defaultLocationId?: unknown;
    };
  };
  assertSeed(
    presentation.schemaVersion === 1 &&
      presentation.templateId === "location-provider-router" &&
      presentation.themeId === "warm-care" &&
      presentation.layoutVariant === "classic-stack" &&
      presentation.answers?.routerKind === "location" &&
      presentation.answers.defaultLocationId ===
        templateLocationRouterFixture.locationIds[0],
    "Location router presentation",
    "the published template, theme, and saved default are missing",
  );

  const [dentistry, galleries, reviews] = await Promise.all([
    supabase
      .from("dentistries")
      .select(
        "dentistry_id, about_title, about_text, phone, contact_email, booking_link, booking_link_enabled, socials(instagram_link), dentistry_locations(location_id, locations(business_name, full_address, latitude, longitude, image_url, image_alt, image_decorative))",
      )
      .eq("user_id", userId)
      .single(),
    supabase
      .from("general_galleries")
      .select("id, image_url, rank, enabled")
      .eq("user_id", userId)
      .in("id", [...templateLocationRouterFixture.generalGalleryIds])
      .order("rank"),
    supabase
      .from("reviews")
      .select("id, image_url, stars, enabled")
      .eq("user_id", userId)
      .in("id", [...templateLocationRouterFixture.reviewIds])
      .order("rank"),
  ]);
  assertQuery(dentistry.error, "Location router profile");
  assertQuery(galleries.error, "Location router gallery");
  assertQuery(reviews.error, "Location router reviews");
  const relatedLocations = dentistry.data?.dentistry_locations ?? [];
  assertSeed(
    dentistry.data?.dentistry_id ===
      templateLocationRouterFixture.dentistryId &&
      dentistry.data.about_title ===
        "One care team, three convenient practices" &&
      (dentistry.data.about_text?.length ?? 0) > 100 &&
      dentistry.data.booking_link_enabled === true &&
      Boolean(dentistry.data.booking_link) &&
      Boolean(dentistry.data.phone) &&
      Boolean(dentistry.data.contact_email) &&
      Boolean(firstRelated(dentistry.data.socials)?.instagram_link) &&
      relatedLocations.length === 3 &&
      new Set(
        relatedLocations.map(({ locations }) =>
          firstRelated(locations)?.image_url?.trim(),
        ),
      ).size === 3 &&
      relatedLocations.every(({ location_id, locations }) => {
        const media = templateLocationRouterFixture.locationImages.find(
          (item) => item.locationId === location_id,
        );
        const details = firstRelated(locations);
        return (
          Boolean(media) &&
          templateLocationRouterFixture.locationIds.includes(location_id) &&
          Boolean(details?.business_name) &&
          Boolean(details?.full_address) &&
          typeof details?.latitude === "number" &&
          typeof details?.longitude === "number" &&
          details?.image_url ===
            `${expectedStorageOrigin}/storage/v1/object/public/location-images/${templateLocationRouterFixture.userId}/dentistries/${templateLocationRouterFixture.dentistryId}/locations/${location_id}/${media?.file}` &&
          details?.image_decorative === media?.decorative &&
          (media?.decorative
            ? details?.image_alt === null
            : Boolean(details?.image_alt))
        );
      }),
    "Location router profile",
    "identity, routing locations, map data, or actions are incomplete",
  );
  assertSeed(
    galleries.data?.length === 3 &&
      galleries.data.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      reviews.data?.length === 2 &&
      reviews.data.every(
        ({ enabled, image_url, stars }) =>
          enabled === true && stars === 5 && Boolean(image_url),
      ),
    "Location router content",
    "representative gallery images or reviews are missing",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateLocationRouterFixture.dentistryId);
  assertQuery(profileImagesError, "Location router profile image");
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateLocationRouterFixture.profileImage,
    ),
    "Location router profile image",
    "the deterministic Storage object is missing",
  );
  const profileImageUrl = supabase.storage
    .from("profile-pics")
    .getPublicUrl(
      `${templateLocationRouterFixture.dentistryId}/${templateLocationRouterFixture.profileImage}`,
    ).data.publicUrl;
  const response = await fetch(profileImageUrl);
  assertSeed(
    response.ok && response.headers.get("content-type") === "image/webp",
    "Location router profile image",
    "the public profile image bytes are unavailable",
  );
  const locationResponses = await Promise.all(
    templateLocationRouterFixture.locationImages.map(({ locationId, file }) =>
      fetch(
        supabase.storage
          .from("location-images")
          .getPublicUrl(
            `${templateLocationRouterFixture.userId}/dentistries/${templateLocationRouterFixture.dentistryId}/locations/${locationId}/${file}`,
          ).data.publicUrl,
      ),
    ),
  );
  assertSeed(
    locationResponses.every(
      (item) => item.ok && item.headers.get("content-type") === "image/webp",
    ),
    "Location router location images",
    "one or more deterministic location image objects are unavailable",
  );
}

async function verifyServicesCatalogueShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateServicesCatalogueFixture.userId,
    "Services Catalogue identity",
    "the authenticated user ID is not deterministic",
  );

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-services-catalogue")
    .single();
  assertQuery(profileError, "Services Catalogue public projection");
  assertSeed(
    profile?.profile_id === templateServicesCatalogueFixture.userId &&
      profile.dentistry_id === templateServicesCatalogueFixture.dentistryId &&
      profile.profile_presentation_revision === 1,
    "Services Catalogue public projection",
    "the private user/dentistry relationship or revision is incorrect",
  );

  const presentation = profile.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: {
      featuredTreatmentIds?: unknown;
      showFinancingBeforeTeam?: unknown;
    };
  };
  assertSeed(
    presentation.schemaVersion === 1 &&
      presentation.templateId === "services-catalogue" &&
      presentation.themeId === "warm-care" &&
      presentation.layoutVariant === "section-navigator" &&
      presentation.answers?.showFinancingBeforeTeam === true &&
      JSON.stringify(presentation.answers.featuredTreatmentIds) ===
        JSON.stringify(templateServicesCatalogueFixture.featuredTreatmentIds),
    "Services Catalogue presentation",
    "the published template, theme, featured care, or practical ordering is incorrect",
  );

  const [dentistry, treatments, galleries, reviews, externalReview, linkGroup] =
    await Promise.all([
      supabase
        .from("dentistries")
        .select(
          "dentistry_id, about_title, about_text, website, booking_link, booking_link_enabled, phone, contact_email, socials(instagram_link, linkedin_link), dentistry_locations(location_id, locations(business_name, full_address, latitude, longitude))",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, rank, treatments(title, description, isService)")
        .eq("dentistry_id", templateServicesCatalogueFixture.dentistryId)
        .order("rank"),
      supabase
        .from("general_galleries")
        .select("id, image_url, rank, enabled")
        .eq("user_id", userId)
        .in("id", [...templateServicesCatalogueFixture.generalGalleryIds])
        .order("rank"),
      supabase
        .from("reviews")
        .select("id, content, stars, image_url, rank, enabled")
        .eq("user_id", userId)
        .in("id", [...templateServicesCatalogueFixture.reviewIds])
        .order("rank"),
      supabase
        .from("external_review_pages")
        .select("id, link")
        .eq("id", templateServicesCatalogueFixture.externalReviewPageId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("link_groups")
        .select(
          "link_group_id, heading, dentistry_links(links(link_id, title, link, is_active, rank, image_url, image_variant, image_alt, image_decorative, is_featured))",
        )
        .eq("link_group_id", templateServicesCatalogueFixture.linkGroupId)
        .eq("dentistry_id", templateServicesCatalogueFixture.dentistryId)
        .single(),
    ]);

  for (const [section, result] of [
    ["Services Catalogue profile", dentistry],
    ["Services Catalogue treatments", treatments],
    ["Services Catalogue gallery", galleries],
    ["Services Catalogue reviews", reviews],
    ["Services Catalogue external reviews", externalReview],
    ["Services Catalogue links", linkGroup],
  ] as const) {
    assertQuery(result.error, section);
  }

  const relatedLocation = firstRelated(dentistry.data?.dentistry_locations);
  const locationDetails = firstRelated(relatedLocation?.locations ?? null);
  const links = (linkGroup.data?.dentistry_links ?? [])
    .map(({ links: relatedLinks }) => firstRelated(relatedLinks))
    .filter((link) => link !== null)
    .sort((left, right) => left.rank - right.rank);
  assertSeed(
    dentistry.data?.dentistry_id ===
      templateServicesCatalogueFixture.dentistryId &&
      (dentistry.data.about_title?.length ?? 0) > 40 &&
      (dentistry.data.about_text?.length ?? 0) > 120 &&
      dentistry.data.booking_link_enabled === true &&
      dentistry.data.booking_link?.startsWith("https://") &&
      dentistry.data.website?.startsWith("https://") &&
      Boolean(dentistry.data.phone) &&
      Boolean(dentistry.data.contact_email) &&
      Boolean(firstRelated(dentistry.data.socials)?.instagram_link) &&
      Boolean(firstRelated(dentistry.data.socials)?.linkedin_link) &&
      relatedLocation?.location_id ===
        templateServicesCatalogueFixture.locationId &&
      Boolean(locationDetails?.business_name) &&
      Boolean(locationDetails?.full_address) &&
      typeof locationDetails?.latitude === "number" &&
      typeof locationDetails.longitude === "number",
    "Services Catalogue profile",
    "identity, booking, social, or mapped location content is incomplete",
  );
  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateServicesCatalogueFixture.treatmentIds.length &&
      templateServicesCatalogueFixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: relatedTreatment }) => {
            const treatment = firstRelated(relatedTreatment);
            return (
              treatment_id === id &&
              Boolean(treatment?.title) &&
              (treatment?.description?.length ?? 0) > 50
            );
          },
        ),
      ) &&
      treatments.data?.filter(
        ({ treatment_id, treatments: relatedTreatment }) =>
          templateServicesCatalogueFixture.treatmentIds.includes(
            treatment_id,
          ) && firstRelated(relatedTreatment)?.isService === true,
      ).length === 3,
    "Services Catalogue treatments",
    "the representative catalogue treatments and services are incomplete",
  );
  assertSeed(
    galleries.data?.length === 2 &&
      galleries.data.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      reviews.data?.length === 3 &&
      reviews.data.every(
        ({ enabled, image_url, stars, content }) =>
          enabled === true &&
          stars === 5 &&
          image_url?.startsWith("/previews/") &&
          (content?.length ?? 0) > 60,
      ) &&
      externalReview.data?.link?.startsWith("https://"),
    "Services Catalogue media and reviews",
    "the representative images, reviews, or external review link are incomplete",
  );
  assertSeed(
    linkGroup.data?.heading === "Patient guides, finance, and our team" &&
      links.length === 3 &&
      links.every(
        (link) =>
          templateServicesCatalogueFixture.linkIds.includes(link.link_id) &&
          link.is_active === true &&
          link.link.startsWith("https://"),
      ) &&
      links[0]?.image_variant === "large-image" &&
      links[0].is_featured === true &&
      links[0].image_url?.endsWith(
        `/link-images/${templateServicesCatalogueFixture.financeImage}`,
      ) &&
      links[1]?.image_variant === "small-icon" &&
      Boolean(links[1].image_alt) &&
      links[1].image_url?.endsWith(
        `/${templateServicesCatalogueFixture.profileImage}`,
      ) &&
      links[2]?.image_variant === "none",
    "Services Catalogue practical resources",
    "finance, team, and FAQ links or their media layouts are incomplete",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateServicesCatalogueFixture.dentistryId);
  assertQuery(profileImagesError, "Services Catalogue profile image");
  assertSeed(
    profileImages?.length === 1 &&
      profileImages[0]?.name === templateServicesCatalogueFixture.profileImage,
    "Services Catalogue profile media",
    "profile-pics must contain only the deterministic clinician portrait",
  );
  const profileImageUrl = supabase.storage
    .from("profile-pics")
    .getPublicUrl(
      `${templateServicesCatalogueFixture.dentistryId}/${templateServicesCatalogueFixture.profileImage}`,
    ).data.publicUrl;
  const response = await fetch(profileImageUrl);
  assertSeed(
    response.ok && response.headers.get("content-type") === "image/webp",
    "Services Catalogue profile image",
    "the public profile image bytes are unavailable",
  );
  const financeFolder =
    templateServicesCatalogueFixture.financeImage.split("/")[0];
  const financeFilename =
    templateServicesCatalogueFixture.financeImage.split("/")[1];
  const { data: financeImages, error: financeImagesError } =
    await supabase.storage.from("link-images").list(financeFolder);
  assertQuery(financeImagesError, "Services Catalogue finance image");
  assertSeed(
    financeImages?.some(({ name }) => name === financeFilename),
    "Services Catalogue finance image",
    "the deterministic planning image is missing from link-images",
  );
  const financeImageUrl = supabase.storage
    .from("link-images")
    .getPublicUrl(templateServicesCatalogueFixture.financeImage).data.publicUrl;
  const financeResponse = await fetch(financeImageUrl);
  assertSeed(
    financeResponse.ok &&
      financeResponse.headers.get("content-type") === "image/webp",
    "Services Catalogue finance image",
    "the public planning image bytes are unavailable",
  );
}

async function verifyClinicCommerceShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateClinicCommerceFixture.userId,
    "Clinic and Commerce identity",
    "the authenticated user ID is not deterministic",
  );
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-clinic-commerce")
    .single();
  assertQuery(profileError, "Clinic and Commerce public projection");
  const presentation = profile?.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: { defaultAudience?: unknown; featuredProductId?: unknown };
  };
  assertSeed(
    profile?.profile_id === templateClinicCommerceFixture.userId &&
      profile.dentistry_id === templateClinicCommerceFixture.dentistryId &&
      profile.profile_presentation_revision === 1 &&
      presentation.schemaVersion === 1 &&
      presentation.templateId === "clinic-commerce" &&
      presentation.themeId === "editorial-expert" &&
      presentation.layoutVariant === "classic-stack" &&
      presentation.answers?.defaultAudience === "shop" &&
      presentation.answers.featuredProductId === "1984101",
    "Clinic and Commerce presentation",
    "the published template, theme, audience, or featured product is missing",
  );

  const [dentistry, treatments, products, reviews, linkGroups] =
    await Promise.all([
      supabase
        .from("dentistries")
        .select(
          "dentistry_id, about_title, about_text, booking_link, booking_link_enabled, phone, contact_email",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, rank, treatments(title, description)")
        .eq("dentistry_id", templateClinicCommerceFixture.dentistryId)
        .order("rank"),
      supabase
        .from("products")
        .select(
          "id, user_id, name, link, platform, image_url, price, currency, rank, enabled",
        )
        .eq("user_id", userId)
        .order("rank"),
      supabase
        .from("reviews")
        .select("id, content, stars, rank, enabled")
        .eq("user_id", userId)
        .in("id", [1_984_201, 1_984_202])
        .order("rank"),
      supabase
        .from("link_groups")
        .select(
          "link_group_id, dentistry_links(links(link_id, title, link, is_active))",
        )
        .eq("dentistry_id", templateClinicCommerceFixture.dentistryId)
        .eq("link_group_id", templateClinicCommerceFixture.linkGroupId),
    ]);
  for (const [section, result] of [
    ["Clinic and Commerce profile", dentistry],
    ["Clinic and Commerce treatments", treatments],
    ["Clinic and Commerce products", products],
    ["Clinic and Commerce reviews", reviews],
    ["Clinic and Commerce community", linkGroups],
  ] as const)
    assertQuery(result.error, section);

  assertSeed(
    dentistry.data?.dentistry_id ===
      templateClinicCommerceFixture.dentistryId &&
      dentistry.data.about_title ===
        "Professional care, in clinic and at home" &&
      (dentistry.data.about_text?.length ?? 0) > 120 &&
      dentistry.data.booking_link_enabled === true &&
      dentistry.data.booking_link?.startsWith("https://") &&
      Boolean(dentistry.data.phone) &&
      Boolean(dentistry.data.contact_email),
    "Clinic and Commerce profile",
    "the booking-first clinic identity is incomplete",
  );
  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateClinicCommerceFixture.treatmentIds.length &&
      templateClinicCommerceFixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: treatment }) =>
            treatment_id === id &&
            Boolean(firstRelated(treatment)?.title) &&
            Boolean(firstRelated(treatment)?.description),
        ),
      ),
    "Clinic and Commerce treatments",
    "the clinic pathway is incomplete",
  );
  assertSeed(
    (products.data?.length ?? 0) >=
      templateClinicCommerceFixture.productIds.length &&
      templateClinicCommerceFixture.productIds.every((expectedId) =>
        products.data?.some(
          ({ currency, enabled, id, link, name, price }) =>
            id === expectedId &&
            enabled === true &&
            Boolean(name) &&
            link?.startsWith("https://") &&
            Number(price) > 0 &&
            currency === "GBP",
        ),
      ),
    "Clinic and Commerce products",
    "the image-rich curated product cards are incomplete",
  );
  assertSeed(
    reviews.data?.length === 2 &&
      reviews.data.every(
        ({ content, enabled, stars }) =>
          enabled === true && stars === 5 && (content?.length ?? 0) > 70,
      ) &&
      linkGroups.data?.length === 1 &&
      Boolean(
        firstRelated(
          firstRelated(linkGroups.data[0]?.dentistry_links)?.links,
        )?.link?.startsWith("https://"),
      ),
    "Clinic and Commerce trust content",
    "the reviews or community resource are incomplete",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateClinicCommerceFixture.dentistryId);
  assertQuery(profileImagesError, "Clinic and Commerce profile image");
  const productImageResponses = await Promise.all(
    templateClinicCommerceFixture.productImages.map((name) =>
      fetch(
        supabase.storage
          .from("product-images")
          .getPublicUrl(
            `${templateClinicCommerceFixture.userId}/products/${name}`,
          ).data.publicUrl,
      ),
    ),
  );
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateClinicCommerceFixture.profileImage,
    ) &&
      productImageResponses.every(
        (response) =>
          response.ok && response.headers.get("content-type") === "image/webp",
      ),
    "Clinic and Commerce Storage",
    "the deterministic profile or product imagery is missing",
  );
}

async function verifyTrustFirstShowcase(supabase: LocalClient, userId: string) {
  assertSeed(
    userId === templateTrustFirstFixture.userId,
    "Trust-First identity",
    "the authenticated user ID is not deterministic",
  );
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-trust-first")
    .single();
  assertQuery(profileError, "Trust-First public projection");
  const presentation = profile?.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: { featuredReviewIds?: unknown; priorityInformation?: unknown };
  };
  assertSeed(
    profile?.profile_id === templateTrustFirstFixture.userId &&
      profile.dentistry_id === templateTrustFirstFixture.dentistryId &&
      profile.profile_presentation_revision === 1 &&
      presentation.schemaVersion === 1 &&
      presentation.templateId === "trust-first-family-practice" &&
      presentation.themeId === "warm-care" &&
      presentation.layoutVariant === "classic-stack" &&
      JSON.stringify(presentation.answers?.featuredReviewIds) ===
        '["1637602","1637601"]' &&
      JSON.stringify(presentation.answers?.priorityInformation) ===
        '["anxiety-care","payment","accessibility"]',
    "Trust-First presentation",
    "the published template, theme, or reassurance answers are missing",
  );
  const [dentistry, treatments, galleries, reviews, linkGroup] =
    await Promise.all([
      supabase
        .from("dentistries")
        .select(
          "dentistry_id, about_title, about_text, phone, contact_email, booking_link, booking_link_enabled, dentistry_locations(location_id, locations(full_address, latitude, longitude))",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, rank, treatments(title, description, isService)")
        .eq("dentistry_id", templateTrustFirstFixture.dentistryId)
        .order("rank"),
      supabase
        .from("general_galleries")
        .select("id, image_url, rank, enabled")
        .eq("user_id", userId)
        .in("id", [...templateTrustFirstFixture.galleryIds])
        .order("rank"),
      supabase
        .from("reviews")
        .select("id, content, stars, image_url, rank, enabled")
        .eq("user_id", userId)
        .in("id", [...templateTrustFirstFixture.reviewIds])
        .order("rank"),
      supabase
        .from("link_groups")
        .select(
          "link_group_id, dentistry_links(links(link_id, title, link, is_active, rank, image_url, image_variant, image_alt, image_decorative, is_featured))",
        )
        .eq("dentistry_id", templateTrustFirstFixture.dentistryId)
        .eq("link_group_id", templateTrustFirstFixture.linkGroupId)
        .single(),
    ]);
  for (const [section, result] of [
    ["Trust-First profile", dentistry],
    ["Trust-First treatments", treatments],
    ["Trust-First gallery", galleries],
    ["Trust-First reviews", reviews],
    ["Trust-First resources", linkGroup],
  ] as const)
    assertQuery(result.error, section);
  const locationLinks = Array.isArray(dentistry.data?.dentistry_locations)
    ? dentistry.data.dentistry_locations
    : dentistry.data?.dentistry_locations
      ? [dentistry.data.dentistry_locations]
      : [];
  const location = locationLinks.find(
    ({ location_id }) => location_id === templateTrustFirstFixture.locationId,
  );
  assertSeed(
    dentistry.data?.dentistry_id === templateTrustFirstFixture.dentistryId &&
      dentistry.data.about_title ===
        "Gentle dental visits for every generation" &&
      (dentistry.data.about_text?.length ?? 0) > 150 &&
      dentistry.data.booking_link_enabled === true &&
      Boolean(dentistry.data.booking_link) &&
      Boolean(dentistry.data.phone) &&
      Boolean(dentistry.data.contact_email) &&
      location?.location_id === templateTrustFirstFixture.locationId &&
      Boolean(firstRelated(location.locations)?.full_address) &&
      typeof firstRelated(location.locations)?.latitude === "number" &&
      typeof firstRelated(location.locations)?.longitude === "number",
    "Trust-First profile",
    "reassurance, booking, contact, or map-ready location data is incomplete",
  );
  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateTrustFirstFixture.treatmentIds.length &&
      templateTrustFirstFixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: treatment }) =>
            treatment_id === id &&
            Boolean(firstRelated(treatment)?.title) &&
            Boolean(firstRelated(treatment)?.description) &&
            firstRelated(treatment)?.isService === false,
        ),
      ),
    "Trust-First treatments",
    "the representative family treatment inventory is incomplete",
  );
  assertSeed(
    galleries.data?.length === 2 &&
      galleries.data.every(
        ({ enabled, image_url }) =>
          enabled === true && image_url?.startsWith("/previews/"),
      ) &&
      reviews.data?.length === 2 &&
      reviews.data.every(
        ({ content, enabled, image_url, stars }) =>
          enabled === true &&
          stars === 5 &&
          (content?.length ?? 0) > 70 &&
          image_url?.startsWith("/previews/"),
      ),
    "Trust-First media and reviews",
    "image-rich hero content or review proof is incomplete",
  );
  const links = (linkGroup.data?.dentistry_links ?? [])
    .map(({ links }) => firstRelated(links))
    .filter((link) => link !== null)
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  assertSeed(
    links.length === 2 &&
      links.every(
        (link) =>
          templateTrustFirstFixture.linkIds.includes(link.link_id) &&
          link.is_active === true &&
          link.link?.startsWith("https://") &&
          link.image_url?.startsWith(
            `${expectedStorageOrigin}/storage/v1/object/public/link-images/`,
          ) &&
          Boolean(link.image_alt),
      ) &&
      links.map(({ image_variant }) => image_variant).join(",") ===
        "large-image,small-icon" &&
      links[0]?.is_featured === true,
    "Trust-First resources",
    "the large and small image resource variants are missing",
  );
  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateTrustFirstFixture.dentistryId);
  assertQuery(profileImagesError, "Trust-First profile image");
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateTrustFirstFixture.profileImage,
    ),
    "Trust-First profile image",
    "the deterministic Storage object is missing",
  );
}

async function verifyExpertEducatorShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateExpertEducatorFixture.userId,
    "Expert and Educator identity",
    "the authenticated user ID is not deterministic",
  );
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-expert-educator")
    .single();
  assertQuery(profileError, "Expert and Educator public projection");
  const presentation = profile?.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: { defaultAudience?: unknown; featuredContentId?: unknown };
  };
  assertSeed(
    profile?.profile_id === templateExpertEducatorFixture.userId &&
      profile.dentistry_id === templateExpertEducatorFixture.dentistryId &&
      profile.profile_presentation_revision === 1 &&
      presentation.schemaVersion === 1 &&
      presentation.templateId === "expert-educator" &&
      presentation.themeId === "editorial-expert" &&
      presentation.layoutVariant === "editorial-split" &&
      presentation.answers?.defaultAudience === "patients" &&
      presentation.answers.featuredContentId ===
        templateExpertEducatorFixture.featuredLinkId,
    "Expert and Educator presentation",
    "the template, editorial theme, audience, or featured content is incorrect",
  );

  const [dentistry, linkGroups, blogGroups] = await Promise.all([
    supabase
      .from("dentistries")
      .select(
        "dentistry_id, about_title, about_text, phone, contact_email, website, booking_link, booking_link_enabled, socials(linkedin_link, instagram_link), dentistry_locations(location_id, locations(business_name, full_address, latitude, longitude))",
      )
      .eq("user_id", userId)
      .single(),
    supabase
      .from("link_groups")
      .select(
        "link_group_id, heading, rank, dentistry_links(links(link_id, title, link, is_active, rank, image_url, image_variant, image_alt, image_decorative, is_featured))",
      )
      .eq("dentistry_id", templateExpertEducatorFixture.dentistryId)
      .in("link_group_id", [...templateExpertEducatorFixture.linkGroupIds])
      .order("rank"),
    supabase
      .from("blog_groups")
      .select("id, name, rank, enabled, blogs(id, title, slug, rank, enabled)")
      .eq("user_id", userId)
      .order("rank")
      .order("rank", { referencedTable: "blogs" }),
  ]);
  assertQuery(dentistry.error, "Expert and Educator profile");
  assertQuery(linkGroups.error, "Expert and Educator resources");
  assertQuery(blogGroups.error, "Expert and Educator blogs");
  const locationLinks = Array.isArray(dentistry.data?.dentistry_locations)
    ? dentistry.data.dentistry_locations
    : dentistry.data?.dentistry_locations
      ? [dentistry.data.dentistry_locations]
      : [];
  const location = locationLinks.find(
    ({ location_id }) =>
      location_id === templateExpertEducatorFixture.locationId,
  );
  assertSeed(
    dentistry.data?.dentistry_id ===
      templateExpertEducatorFixture.dentistryId &&
      (dentistry.data.about_title?.length ?? 0) > 40 &&
      (dentistry.data.about_text?.length ?? 0) > 150 &&
      dentistry.data.booking_link_enabled === true &&
      Boolean(dentistry.data.booking_link) &&
      Boolean(dentistry.data.contact_email) &&
      Boolean(dentistry.data.website) &&
      Boolean(firstRelated(dentistry.data.socials)?.linkedin_link) &&
      location?.location_id === templateExpertEducatorFixture.locationId &&
      Boolean(firstRelated(location.locations)?.business_name) &&
      Boolean(firstRelated(location.locations)?.full_address) &&
      typeof firstRelated(location.locations)?.latitude === "number",
    "Expert and Educator profile",
    "authority, consultation, social, or map-ready location data is incomplete",
  );
  const links = (linkGroups.data ?? []).flatMap((group) =>
    group.dentistry_links
      .map(({ links }) => firstRelated(links))
      .filter((link) => link !== null),
  );
  assertSeed(
    linkGroups.data?.map(({ heading }) => heading).join(",") ===
      "Patient guides,Professional learning and events" &&
      links.length === 4 &&
      links.every(
        (link) =>
          templateExpertEducatorFixture.linkIds.includes(link.link_id) &&
          link.is_active === true &&
          link.link?.startsWith("https://") &&
          Boolean(link.title),
      ) &&
      links.find(
        ({ link_id }) =>
          link_id === templateExpertEducatorFixture.featuredLinkId,
      )?.is_featured === true &&
      links.filter(({ image_url }) => Boolean(image_url)).length === 3 &&
      links.some(({ image_variant }) => image_variant === "large-image") &&
      links.some(({ image_variant }) => image_variant === "small-icon"),
    "Expert and Educator resources",
    "patient/professional paths, featured content, or media variants are missing",
  );
  const enabledBlogGroups = (blogGroups.data ?? []).filter(
    ({ enabled }) => enabled === true,
  );
  const enabledBlogs = enabledBlogGroups.flatMap(({ blogs }) =>
    blogs.filter(({ enabled }) => enabled === true),
  );
  assertSeed(
    enabledBlogGroups.map(({ id }) => id).join(",") ===
      templateExpertEducatorFixture.blogGroupIds.join(",") &&
      enabledBlogGroups.map(({ name }) => name).join(",") ===
        "Patient evidence library,Professional teaching notes" &&
      enabledBlogs.map(({ id }) => id).join(",") ===
        templateExpertEducatorFixture.blogIds.join(",") &&
      enabledBlogs.every(
        ({ slug, title }) =>
          Boolean(title?.trim()) &&
          /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(slug),
      ) &&
      blogGroups.data?.some(
        ({ id, enabled }) => id === 1_651_803 && enabled === false,
      ) &&
      blogGroups.data?.some(({ blogs }) =>
        blogs.some(({ id, enabled }) => id === 1_651_998 && enabled === false),
      ),
    "Expert and Educator blogs",
    "enabled groups/posts, deterministic order, valid routes, or disabled sentinels are incorrect",
  );

  const [
    { data: profileImages, error: profileError2 },
    { data: linkImages, error: linkError },
  ] = await Promise.all([
    supabase.storage
      .from("profile-pics")
      .list(templateExpertEducatorFixture.dentistryId),
    supabase.storage
      .from("link-images")
      .list(`${templateExpertEducatorFixture.userId}/links`),
  ]);
  assertQuery(profileError2, "Expert and Educator profile image");
  assertQuery(linkError, "Expert and Educator resource images");
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateExpertEducatorFixture.profileImage,
    ) &&
      templateExpertEducatorFixture.linkImages.every((expected) =>
        linkImages?.some(({ name }) => name === expected),
      ),
    "Expert and Educator Storage",
    "the deterministic profile or resource image objects are missing",
  );
}

async function verifyCosmeticResultsShowcase(
  supabase: LocalClient,
  userId: string,
) {
  assertSeed(
    userId === templateCosmeticResultsFixture.userId,
    "Cosmetic Transformation identity",
    "the authenticated user ID is not deterministic",
  );
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select(
      "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
    )
    .eq("username", "template-cosmetic-results")
    .single();
  assertQuery(profileError, "Cosmetic Transformation public projection");
  assertSeed(
    profile?.profile_id === templateCosmeticResultsFixture.userId &&
      profile.dentistry_id === templateCosmeticResultsFixture.dentistryId &&
      profile.profile_presentation_revision === 1,
    "Cosmetic Transformation public projection",
    "the private user/dentistry relationship or revision is incorrect",
  );
  const presentation = profile.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: {
      signatureTreatmentId?: unknown;
      consultationKind?: unknown;
      featuredGalleryIds?: unknown;
      featuredReviewIds?: unknown;
    };
  };
  assertSeed(
    presentation.schemaVersion === 1 &&
      presentation.templateId === "cosmetic-transformation" &&
      presentation.themeId === "premium-contrast" &&
      presentation.layoutVariant === "hero-overlap" &&
      presentation.answers?.signatureTreatmentId ===
        templateCosmeticResultsFixture.treatmentIds[0] &&
      presentation.answers.consultationKind === "free" &&
      JSON.stringify(presentation.answers.featuredGalleryIds) ===
        JSON.stringify(templateCosmeticResultsFixture.galleryIds.map(String)) &&
      JSON.stringify(presentation.answers.featuredReviewIds) ===
        JSON.stringify(templateCosmeticResultsFixture.reviewIds.map(String)),
    "Cosmetic Transformation presentation",
    "the template, theme, layout, or controlled result selections are incorrect",
  );
  const [dentistry, treatments, galleries, reviews, linkGroup] =
    await Promise.all([
      supabase
        .from("dentistries")
        .select(
          "dentistry_id, about_title, about_text, phone, contact_email, booking_link, booking_link_enabled, socials(instagram_link), dentistry_locations(location_id)",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, treatments(title, description, isService)")
        .eq("dentistry_id", templateCosmeticResultsFixture.dentistryId),
      supabase
        .from("galleries")
        .select(
          "id, title, before_image_url, after_image_url, before_image_label, after_image_label, enabled",
        )
        .eq("user_id", userId)
        .in("id", [...templateCosmeticResultsFixture.galleryIds])
        .order("rank"),
      supabase
        .from("reviews")
        .select("id, content, stars, enabled")
        .eq("user_id", userId)
        .in("id", [...templateCosmeticResultsFixture.reviewIds])
        .order("rank"),
      supabase
        .from("link_groups")
        .select(
          "link_group_id, heading, dentistry_links(links(link_id, title, link, is_active))",
        )
        .eq("link_group_id", templateCosmeticResultsFixture.linkGroupId)
        .single(),
    ]);
  assertQuery(dentistry.error, "Cosmetic Transformation profile");
  assertQuery(treatments.error, "Cosmetic Transformation treatments");
  assertQuery(galleries.error, "Cosmetic Transformation demo cases");
  assertQuery(reviews.error, "Cosmetic Transformation reviews");
  assertQuery(linkGroup.error, "Cosmetic Transformation planning links");
  const locationLinks = Array.isArray(dentistry.data?.dentistry_locations)
    ? dentistry.data.dentistry_locations
    : dentistry.data?.dentistry_locations
      ? [dentistry.data.dentistry_locations]
      : [];
  assertSeed(
    dentistry.data?.dentistry_id ===
      templateCosmeticResultsFixture.dentistryId &&
      (dentistry.data.about_title?.length ?? 0) > 40 &&
      (dentistry.data.about_text?.length ?? 0) > 100 &&
      dentistry.data.booking_link_enabled === true &&
      Boolean(dentistry.data.booking_link) &&
      Boolean(dentistry.data.phone) &&
      Boolean(dentistry.data.contact_email) &&
      Boolean(firstRelated(dentistry.data.socials)?.instagram_link) &&
      locationLinks.some(
        ({ location_id }) =>
          location_id === templateCosmeticResultsFixture.locationId,
      ),
    "Cosmetic Transformation profile",
    "identity, booking, contact, social, or location content is incomplete",
  );
  assertSeed(
    (treatments.data?.length ?? 0) >=
      templateCosmeticResultsFixture.treatmentIds.length &&
      templateCosmeticResultsFixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: treatment }) =>
            treatment_id === id &&
            Boolean(firstRelated(treatment)?.title) &&
            Boolean(firstRelated(treatment)?.description) &&
            firstRelated(treatment)?.isService === false,
        ),
      ),
    "Cosmetic Transformation treatments",
    "the representative treatment inventory is incomplete",
  );
  assertSeed(
    galleries.data?.length === 2 &&
      galleries.data.every(
        (gallery) =>
          gallery.enabled === true &&
          gallery.title?.startsWith("Fictional demo case") &&
          gallery.before_image_url?.startsWith("/previews/cosmetic-case-") &&
          gallery.after_image_url?.startsWith("/previews/cosmetic-case-") &&
          gallery.before_image_label?.includes("fictional demo") &&
          gallery.after_image_label?.includes("fictional demo"),
      ) &&
      reviews.data?.length === 2 &&
      reviews.data.every(
        ({ content, enabled, stars }) =>
          enabled === true && stars === 5 && (content?.length ?? 0) > 60,
      ) &&
      linkGroup.data?.heading === "Planning and payment" &&
      linkGroup.data.dentistry_links.length === 2,
    "Cosmetic Transformation evidence",
    "fictional demo cases, reviews, or planning links are incomplete",
  );
  const { data: profileImages, error: profileImagesError } =
    await supabase.storage
      .from("profile-pics")
      .list(templateCosmeticResultsFixture.dentistryId);
  assertQuery(profileImagesError, "Cosmetic Transformation profile image");
  assertSeed(
    profileImages?.some(
      ({ name }) => name === templateCosmeticResultsFixture.profileImage,
    ),
    "Cosmetic Transformation profile image",
    "the deterministic Storage object is missing",
  );
  const profileImageUrl = supabase.storage
    .from("profile-pics")
    .getPublicUrl(
      `${templateCosmeticResultsFixture.dentistryId}/${templateCosmeticResultsFixture.profileImage}`,
    ).data.publicUrl;
  const response = await fetch(profileImageUrl);
  assertSeed(
    response.ok && response.headers.get("content-type") === "image/webp",
    "Cosmetic Transformation profile image",
    "the public profile image bytes are unavailable",
  );
}

async function verifySpecialistAssessmentShowcase(
  supabase: LocalClient,
  userId: string,
) {
  const fixture = templateSpecialistAssessmentFixture;
  assertSeed(
    userId === fixture.userId,
    "Specialist Assessment identity",
    "the authenticated user ID is not deterministic",
  );

  const [profile, dentistry, treatments, linkGroups, galleries, reviews] =
    await Promise.all([
      supabase
        .from("public_profiles")
        .select(
          "profile_id, dentistry_id, username, profile_presentation, profile_presentation_revision",
        )
        .eq("username", "template-specialist-assessment")
        .single(),
      supabase
        .from("dentistries")
        .select(
          "dentistry_id, booking_link, booking_link_enabled, phone, contact_email, dentistry_locations(location_id, locations(business_name, full_address, latitude, longitude))",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dentistry_treatments")
        .select("treatment_id, treatments(title, description, isService)")
        .eq("dentistry_id", fixture.dentistryId),
      supabase
        .from("link_groups")
        .select("link_group_id, dentistry_links(links(title, link, is_active))")
        .eq("dentistry_id", fixture.dentistryId)
        .in("link_group_id", [...fixture.linkGroupIds]),
      supabase
        .from("general_galleries")
        .select("id, image_url, enabled")
        .eq("user_id", userId)
        .in("id", [...fixture.galleryIds]),
      supabase
        .from("reviews")
        .select("id, content, stars, enabled")
        .eq("user_id", userId)
        .in("id", [...fixture.reviewIds]),
    ]);

  for (const [section, result] of [
    ["Specialist Assessment public projection", profile],
    ["Specialist Assessment profile", dentistry],
    ["Specialist Assessment dentistry_treatments", treatments],
    ["Specialist Assessment link_groups", linkGroups],
    ["Specialist Assessment general_galleries", galleries],
    ["Specialist Assessment reviews", reviews],
  ] as const) {
    assertQuery(result.error, section);
  }

  const presentation = profile.data?.profile_presentation as {
    schemaVersion?: unknown;
    templateId?: unknown;
    themeId?: unknown;
    layoutVariant?: unknown;
    answers?: { primaryPath?: unknown; referralRequired?: unknown };
  };
  assertSeed(
    profile.data?.profile_id === fixture.userId &&
      profile.data.dentistry_id === fixture.dentistryId &&
      profile.data.profile_presentation_revision === 1 &&
      presentation.schemaVersion === 1 &&
      presentation.templateId === "specialist-assessment" &&
      presentation.themeId === "modern-specialist" &&
      presentation.layoutVariant === "section-navigator" &&
      presentation.answers?.primaryPath === "assessment" &&
      presentation.answers.referralRequired === true,
    "Specialist Assessment public projection",
    "the controlled renderer configuration is incorrect",
  );

  const resources =
    linkGroups.data?.flatMap(({ dentistry_links }) => dentistry_links) ?? [];
  assertSeed(
    (treatments.data?.length ?? 0) >= fixture.treatmentIds.length &&
      fixture.treatmentIds.every((id) =>
        treatments.data?.some(
          ({ treatment_id, treatments: treatment }) =>
            treatment_id === id &&
            Boolean(firstRelated(treatment)?.title) &&
            Boolean(firstRelated(treatment)?.description) &&
            firstRelated(treatment)?.isService === false,
        ),
      ),
    "Specialist Assessment treatments",
    "the representative assessment treatment inventory is incomplete",
  );
  assertSeed(
    linkGroups.data?.length === fixture.linkGroupIds.length &&
      resources.length === 5 &&
      galleries.data?.length === fixture.galleryIds.length &&
      reviews.data?.length === fixture.reviewIds.length,
    "Specialist Assessment evidence",
    "the task resources or evidence are incomplete",
  );

  const { data: profileImages, error: profileImagesError } =
    await supabase.storage.from("profile-pics").list(fixture.dentistryId);
  assertQuery(profileImagesError, "Specialist Assessment Storage object");
  assertSeed(
    profileImages?.some(({ name }) => name === fixture.profileImage),
    "Specialist Assessment Storage object",
    "specialist-assessment-profile.webp is missing",
  );
}

function assertQuery(
  error: { message: string } | null,
  section: string,
): asserts error is null {
  assertSeed(!error, section, error?.message ?? "query failed");
}

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function verifyProContent(supabase: LocalClient, userId: string) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("first_name, last_name, title, position, country")
    .eq("id", userId)
    .single();
  assertQuery(userError, "bio");
  assertSeed(user?.first_name === "Amelia", "bio", "first name is missing");
  assertSeed(user.last_name === "Hart", "bio", "last name is missing");
  assertSeed(user.title === "Dr", "bio", "title is missing");
  assertSeed(
    user.position === "Cosmetic Dentist",
    "bio",
    "position is missing",
  );
  assertSeed(user.country === "United Kingdom", "bio", "country is missing");

  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select(
      "dentistry_id, about_title, about_text, phone, contact_email, website, booking_link, booking_link_enabled, socials(twitter_link, instagram_link, facebook_link, tiktok_link, other_link)",
    )
    .eq("user_id", userId)
    .single();
  assertQuery(dentistryError, "bio");
  assertSeed(
    dentistry?.dentistry_id === proFixture.dentistryId,
    "bio",
    "fixed dentistry is missing",
  );
  assertSeed(
    dentistry.about_title === "Creating confident, healthy smiles",
    "bio",
    "about title is missing",
  );
  assertSeed(
    typeof dentistry.about_text === "string" &&
      dentistry.about_text.length > 80,
    "bio",
    "biography is not populated",
  );
  assertSeed(
    dentistry.contact_email === "hello@example.com" &&
      dentistry.phone === "+442000000000" &&
      dentistry.website === "https://example.com/dentalbio-demo" &&
      dentistry.booking_link === "https://example.com/dentalbio-demo/book" &&
      dentistry.booking_link_enabled === true,
    "bio",
    "contact or booking details are incomplete",
  );

  const social = firstRelated(dentistry.socials);
  assertSeed(
    social?.twitter_link === "https://x.com/dentalbio_demo" &&
      social.instagram_link === "https://www.instagram.com/dentalbio.demo/" &&
      social.facebook_link === "https://www.facebook.com/dentalbio-demo/" &&
      social.tiktok_link === "https://www.tiktok.com/@dentalbio.demo" &&
      social.other_link === "https://example.com/dentalbio-demo",
    "social",
    "all five social destinations must be populated",
  );

  const { data: treatmentRows, error: treatmentsError } = await supabase
    .from("dentistry_treatments")
    .select("treatment_id, rank, treatments(title, description, isService)")
    .eq("dentistry_id", proFixture.dentistryId)
    .in("treatment_id", [...proFixture.treatmentIds])
    .order("rank");
  assertQuery(treatmentsError, "treatments");
  assertSeed(
    treatmentRows?.length === 3 &&
      treatmentRows.map(({ rank }) => rank).join(",") === "1,2,3",
    "treatments",
    "three ranked dentistry treatments are required",
  );
  const treatments = treatmentRows.map(({ treatments }) =>
    firstRelated(treatments),
  );
  assertSeed(
    treatments.every(
      (treatment) => treatment && (treatment.description?.length ?? 0) > 20,
    ) &&
      treatments.filter((treatment) => treatment?.isService === false)
        .length === 2 &&
      treatments.filter((treatment) => treatment?.isService === true).length ===
        1,
    "treatments",
    "two treatments and one service must be connected",
  );

  const { data: videoGroup, error: videosError } = await supabase
    .from("groups")
    .select(
      "id, name, enabled, type, datas:videos(id, title, link, rank, enabled)",
    )
    .eq("id", proFixture.videoGroupId)
    .eq("user_id", userId)
    .single();
  assertQuery(videosError, "videos");
  const videos = videoGroup?.datas ?? [];
  assertSeed(
    videoGroup?.name === "Patient guides" &&
      videoGroup.type === "videos" &&
      videoGroup.enabled === true &&
      videos.length === 2 &&
      videos.every(
        (video) =>
          proFixture.videoIds.includes(video.id) &&
          video.enabled === true &&
          video.link?.startsWith("https://www.youtube.com/watch?v="),
      ) &&
      videos
        .map(({ rank }) => rank)
        .sort()
        .join(",") === "1,2",
    "videos",
    "the ranked video group and its two videos are incomplete",
  );

  const { data: galleries, error: galleriesError } = await supabase
    .from("galleries")
    .select(
      "id, title, before_image_url, after_image_url, before_image_label, after_image_label, rank, enabled",
    )
    .eq("id", proFixture.galleryId)
    .eq("user_id", userId);
  assertQuery(galleriesError, "gallery");
  const gallery = galleries?.[0];
  assertSeed(
    gallery?.enabled === true &&
      gallery.rank === 1 &&
      gallery.before_image_url === "/previews/hero-image-1.webp" &&
      gallery.after_image_url === "/previews/hero-image-2.webp" &&
      gallery.before_image_label === "Before treatment" &&
      gallery.after_image_label === "After treatment",
    "gallery",
    "the before-and-after gallery is incomplete",
  );

  const { data: generalGalleries, error: generalGalleriesError } =
    await supabase
      .from("general_galleries")
      .select("id, image_url, rank, enabled")
      .eq("user_id", userId)
      .in("id", [...proFixture.generalGalleryIds])
      .order("rank");
  assertQuery(generalGalleriesError, "gallery");
  assertSeed(
    generalGalleries?.length === 2 &&
      generalGalleries.every(
        (item) =>
          item.enabled === true &&
          typeof item.image_url === "string" &&
          item.image_url.startsWith("/previews/"),
      ) &&
      generalGalleries.map(({ rank }) => rank).join(",") === "1,2",
    "gallery",
    "two ranked general gallery images are required",
  );

  const { data: productGroup, error: productsError } = await supabase
    .from("groups")
    .select(
      "id, name, enabled, type, datas:products(id, name, link, platform, image_url, price, currency, rank, enabled, user_id)",
    )
    .eq("id", proFixture.productGroupId)
    .eq("user_id", userId)
    .single();
  assertQuery(productsError, "shop");
  const products = productGroup?.datas ?? [];
  assertSeed(
    productGroup?.name === "Smile care essentials" &&
      productGroup.type === "products" &&
      productGroup.enabled === true &&
      products.length === 2 &&
      products.every(
        (product) =>
          proFixture.productIds.includes(product.id) &&
          product.user_id === userId &&
          product.enabled === true &&
          product.platform === "Demo shop" &&
          product.currency === "GBP(£)" &&
          product.link?.startsWith(
            "https://example.com/dentalbio-demo/shop/",
          ) &&
          product.image_url?.startsWith("/previews/"),
      ) &&
      products
        .map(({ rank }) => rank)
        .sort()
        .join(",") === "1,2",
    "shop",
    "the ranked product group and its two products are incomplete",
  );

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select(
      "id, reviewer_name, content, stars, image_url, platform, rank, enabled",
    )
    .eq("user_id", userId)
    .in("id", [...proFixture.reviewIds])
    .order("rank");
  assertQuery(reviewsError, "reviews");
  assertSeed(
    reviews?.length === 2 &&
      reviews.every(
        (review) =>
          review.enabled === true &&
          review.stars === 5 &&
          (review.content?.length ?? 0) > 30 &&
          review.image_url?.startsWith("/"),
      ) &&
      reviews.map(({ rank }) => rank).join(",") === "1,2",
    "reviews",
    "two ranked five-star reviews are required",
  );
  const { data: reviewPage, error: reviewPageError } = await supabase
    .from("external_review_pages")
    .select("id, link")
    .eq("id", proFixture.externalReviewPageId)
    .eq("user_id", userId)
    .single();
  assertQuery(reviewPageError, "reviews");
  assertSeed(
    reviewPage?.link === "https://example.com/dentalbio-demo/reviews",
    "reviews",
    "the external reviews destination is missing",
  );

  const { data: linkGroup, error: linksError } = await supabase
    .from("link_groups")
    .select(
      "link_group_id, heading, rank, dentistry_links(links(link_id, title, link, is_active, rank))",
    )
    .eq("link_group_id", proFixture.linkGroupId)
    .eq("dentistry_id", proFixture.dentistryId)
    .single();
  assertQuery(linksError, "links");
  const links = (linkGroup?.dentistry_links ?? [])
    .map(({ links }) => firstRelated(links))
    .filter((link) => link !== null)
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  assertSeed(
    linkGroup?.heading === "Helpful resources" &&
      linkGroup.rank === 1 &&
      links.length === 2 &&
      links.every(
        (link) =>
          proFixture.linkIds.includes(link.link_id) &&
          link.is_active === true &&
          link.link?.startsWith("https://example.com/dentalbio-demo/"),
      ) &&
      links.map(({ rank }) => rank).join(",") === "1,2",
    "links",
    "the ranked link group and its two active links are incomplete",
  );

  console.log("Verified populated local Pro profile: all requested sections");
}

function getLocalSupabaseStatus(): Required<LocalSupabaseStatus> {
  const { allowIsolatedPort, command } = localSupabaseStatusCommand(
    process.env.LOCAL_SUPABASE_WORKDIR,
  );
  const status = Bun.spawnSync(command, {
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  if (!status.success) {
    throw new Error(
      `Local Supabase is unavailable: ${status.stderr.toString().trim()}`,
    );
  }

  const localStatus = JSON.parse(
    status.stdout.toString(),
  ) as LocalSupabaseStatus;

  if (!localStatus.API_URL || !localStatus.ANON_KEY) {
    throw new Error(
      "Local Supabase status did not return API_URL and ANON_KEY.",
    );
  }

  expectedStorageOrigin = localSupabaseStorageOrigin(
    localStatus.API_URL,
    allowIsolatedPort,
  );

  return {
    ANON_KEY: localStatus.ANON_KEY,
    API_URL: localStatus.API_URL,
  };
}

function getStagingSupabaseStatus(): Required<LocalSupabaseStatus> {
  const projectRef = process.env.STAGING_SUPABASE_PROJECT_REF?.trim();
  const apiUrl = process.env.STAGING_SUPABASE_URL?.trim();
  const anonKey = process.env.STAGING_SUPABASE_ANON_KEY?.trim();

  if (projectRef !== STAGING_PROJECT_REF) {
    throw new Error(
      `Refusing to verify any Supabase ref except ${STAGING_PROJECT_REF}.`,
    );
  }
  if (
    !apiUrl ||
    new URL(apiUrl).hostname !== `${STAGING_PROJECT_REF}.supabase.co`
  ) {
    throw new Error("The staging URL does not match the approved project ref.");
  }
  if (!anonKey) throw new Error("STAGING_SUPABASE_ANON_KEY is required.");

  expectedStorageOrigin = new URL(apiUrl).origin;
  return { ANON_KEY: anonKey, API_URL: apiUrl };
}

async function verifyAccount(
  apiUrl: string,
  anonKey: string,
  account: SeedAccount,
) {
  const supabase = createLocalClient(apiUrl, anonKey);

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

  if (authError || !authData.user) {
    throw new Error(
      `Password authentication failed for ${account.email}: ${authError?.message ?? "no user returned"}`,
    );
  }

  if (authData.user.email !== account.email) {
    throw new Error(`Authenticated the wrong user for ${account.email}.`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, username, role, subscription_status")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Public profile lookup failed for ${account.email}: ${profileError?.message ?? "no profile returned"}`,
    );
  }

  const actual = {
    id: profile.id,
    role: profile.role,
    subscriptionStatus: profile.subscription_status,
    username: profile.username,
  };
  const expected = {
    id: authData.user.id,
    role: account.role,
    subscriptionStatus: account.subscriptionStatus,
    username: account.username,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Public profile mismatch for ${account.email}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }

  if (account.email === "pro@dentalbio.local") {
    await verifyProContent(supabase, authData.user.id);
  }
  if (account.email === "template-basic@dentalbio.local") {
    await verifyBasicShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-direct-booking@dentalbio.local") {
    await verifyDirectBookingShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-location-router@dentalbio.local") {
    await verifyLocationRouterShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-services-catalogue@dentalbio.local") {
    await verifyServicesCatalogueShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-cosmetic-results@dentalbio.local") {
    await verifyCosmeticResultsShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-trust-first@dentalbio.local") {
    await verifyTrustFirstShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-specialist-assessment@dentalbio.local") {
    await verifySpecialistAssessmentShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-clinic-commerce@dentalbio.local") {
    await verifyClinicCommerceShowcase(supabase, authData.user.id);
  }
  if (account.email === "template-expert-educator@dentalbio.local") {
    await verifyExpertEducatorShowcase(supabase, authData.user.id);
  }

  console.log(`Verified local seed account: ${account.email}`);
}

async function main() {
  const staging = process.argv.includes("--staging");
  const templatesOnly = staging || process.argv.includes("--templates-only");
  const status = staging
    ? getStagingSupabaseStatus()
    : getLocalSupabaseStatus();
  const selectedAccounts = templatesOnly
    ? accounts.filter(({ email }) => email.startsWith("template-"))
    : accounts;

  for (const account of selectedAccounts) {
    await verifyAccount(status.API_URL, status.ANON_KEY, account);
  }

  console.log(
    staging
      ? `Staging template content and credential verification passed on ${STAGING_PROJECT_REF}.`
      : "Local Supabase seed verification passed.",
  );
}

if (import.meta.main) await main();
