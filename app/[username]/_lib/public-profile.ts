import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { usernameSchema } from "@/lib/auth/schemas";
import { publicProfileUsernameTag } from "@/lib/public-profile/cache-tags";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type DentistryRow = Database["public"]["Tables"]["dentistries"]["Row"];
type BlogRow = Database["public"]["Tables"]["blogs"]["Row"];
type GalleryRow = Database["public"]["Tables"]["galleries"]["Row"];
type GeneralGalleryRow =
  Database["public"]["Tables"]["general_galleries"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ExternalReviewPageRow =
  Database["public"]["Tables"]["external_review_pages"]["Row"];

export type PublicProfileIdentity = {
  user: Pick<
    UserRow,
    | "id"
    | "username"
    | "position"
    | "first_name"
    | "last_name"
    | "title"
    | "gdc_no"
    | "qualification"
    | "isVerified"
    | "use_dental_brand"
    | "subscription_status"
    | "registered_domain"
  >;
  dentistry: DentistryRow;
  profileImageUrl: string;
};

type PublicProfileContent = {
  treatments: PublicTreatment[];
  linkGroups: PublicLinkGroup[];
  blogGroups: PublicBlogGroup[];
  products: IndividualProductType[];
  videoGroups: GroupType[];
  galleries: PublicGallery[];
  generalGalleries: PublicGeneralGallery[];
  reviews: ReviewRow[];
  externalReviewPages: ExternalReviewPageRow[];
  locations: PublicLocation[];
  socials: PublicSocialLinks | null;
};

export type PublicProfileViewModel = PublicProfileIdentity &
  PublicProfileContent;

export const PUBLIC_PROFILE_CACHE_TTL_SECONDS = 300;
export const PUBLIC_PROFILE_IDENTITY_CACHE_TTL_SECONDS = 60;

type PersistentCache = <T>(
  loader: () => Promise<T>,
  keyParts: string[],
  options: { revalidate: number; tags: string[] },
) => () => Promise<T>;

export function publicProfileContentTags(profileId: string): string[] {
  return [
    `public-profile:${profileId}`,
    `profile:${profileId}`,
    `socials:${profileId}`,
    `treatments:${profileId}`,
    `links:${profileId}`,
    `galleries:${profileId}`,
    `reviews:${profileId}`,
    `external-review-page:${profileId}`,
    `blogs:${profileId}`,
    `videos:${profileId}`,
    `products:${profileId}`,
    `locations:${profileId}`,
  ];
}

export { publicProfileUsernameTag };

export function normalizePublicProfileUsername(value: string): string | null {
  const parsed = usernameSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

type PublicTreatment = {
  treatment_id: string;
  rank: number;
  treatments: {
    title: string | null;
    description: string | null;
    isService: boolean | null;
  } | null;
};

type PublicLinkGroup = {
  link_group_id: string;
  heading: string | null;
  rank: number;
  dentistry_links: {
    links: {
      link_id: string;
      title: string | null;
      link: string | null;
      is_active: boolean;
      rank: number;
      click_counter: number;
    };
  }[];
};

type PublicBlogGroup = {
  id: number;
  name: string | null;
  blogs: BlogRow[];
};

type PublicGallery = Pick<
  GalleryRow,
  | "id"
  | "before_image_url"
  | "after_image_url"
  | "title"
  | "before_image_label"
  | "after_image_label"
>;

type PublicGeneralGallery = Pick<
  GeneralGalleryRow,
  "id" | "image_url" | "title"
>;

type PublicLocation = {
  location_id: string | null;
  locations: {
    country: string | null;
    city: string | null;
    area: string | null;
    latitude: number | null;
    longitude: number | null;
    full_address: string | null;
    business_name: string | null;
  } | null;
};

export type PublicSocialLinks = {
  twitter_link?: string;
  instagram_link?: string;
  facebook_link?: string;
  tiktok_link?: string;
  linkedin_link?: string;
};

export function isPublicProfileRecord(
  user: Pick<UserRow, "id" | "username"> | null,
  dentistry: Pick<DentistryRow, "dentistry_id" | "user_id"> | null,
): boolean {
  return Boolean(user && dentistry && dentistry.user_id === user.id);
}

/**
 * Small, request-scoped memoizer used by the React cache-backed public loader.
 * Keeping this injectable lets the ownership and de-duplication rules stay
 * covered without a database or browser client in the test suite.
 */
export function createRequestMemoizedLoader<T>(
  load: (username: string) => Promise<T>,
) {
  const pending = new Map<string, Promise<T>>();

  return (username: string) => {
    const existing = pending.get(username);
    if (existing) return existing;

    const result = load(username);
    pending.set(username, result);
    return result;
  };
}

async function loadPublicProfileIdentity(
  username: string,
): Promise<PublicProfileIdentity | null> {
  const supabase = createPublicSupabaseClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      "id, username, position, first_name, last_name, title, gdc_no, qualification, isVerified, use_dental_brand, subscription_status, registered_domain",
    )
    .ilike("username", username)
    .maybeSingle();

  if (userError || !user) return null;

  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    dentistryError ||
    !user ||
    !dentistry ||
    !isPublicProfileRecord(user, dentistry)
  ) {
    return null;
  }

  const { data: files, error: storageError } = await supabase.storage
    .from("profile-pics")
    .list(dentistry.dentistry_id);

  if (storageError) throw storageError;

  const latestFile = files
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )[0];
  const profileImageUrl = latestFile
    ? supabase.storage
        .from("profile-pics")
        .getPublicUrl(`${dentistry.dentistry_id}/${latestFile.name}`).data
        .publicUrl
    : "/placeholder.webp";

  return { user, dentistry, profileImageUrl };
}

export function createPersistentPublicProfileIdentityLoader(
  load: (username: string) => Promise<PublicProfileIdentity | null>,
  persistentCache: PersistentCache = unstable_cache,
) {
  const cachedLoaders = new Map<
    string,
    () => Promise<PublicProfileIdentity | null>
  >();

  return (username: string): Promise<PublicProfileIdentity | null> => {
    const normalizedUsername = normalizePublicProfileUsername(username);
    if (!normalizedUsername) return Promise.resolve(null);

    let cachedLoader = cachedLoaders.get(normalizedUsername);
    if (!cachedLoader) {
      cachedLoader = persistentCache(
        () => load(normalizedUsername),
        ["public-profile-identity", normalizedUsername],
        {
          revalidate: PUBLIC_PROFILE_IDENTITY_CACHE_TTL_SECONDS,
          tags: [publicProfileUsernameTag(normalizedUsername)],
        },
      );
      cachedLoaders.set(normalizedUsername, cachedLoader);
    }

    return cachedLoader();
  };
}

const getPersistentPublicProfileIdentity =
  createPersistentPublicProfileIdentityLoader(loadPublicProfileIdentity);

export const getPublicProfileIdentity = cache(
  getPersistentPublicProfileIdentity,
);

async function loadPublicProfileContent(
  profileId: string,
  dentistryId: string,
): Promise<PublicProfileContent> {
  const supabase = createPublicSupabaseClient();
  const [
    { data: treatments },
    { data: linkGroups },
    { data: blogGroups },
    { data: products },
    { data: videoGroups },
    { data: galleries },
    { data: generalGalleries },
    { data: reviews },
    { data: externalReviewPages },
    { data: locations },
    { data: socials },
  ] = await Promise.all([
    supabase
      .from("dentistry_treatments")
      .select(
        "treatment_id, rank, treatments ( title, description, isService )",
      )
      .eq("dentistry_id", dentistryId)
      .order("rank"),
    supabase
      .from("link_groups")
      .select(
        "link_group_id, heading, rank, dentistry_links ( links ( link_id, title, link, is_active, rank, click_counter ) )",
      )
      .eq("dentistry_id", dentistryId)
      .order("rank"),
    supabase
      .from("blog_groups")
      .select("id, name, blogs (*)")
      .eq("user_id", profileId)
      .eq("enabled", true)
      .eq("blogs.enabled", true)
      .order("rank")
      .order("rank", { referencedTable: "blogs" }),
    supabase
      .from("products")
      .select(
        "id, name, link, platform, image_url, price, currency, rank, enabled",
      )
      .eq("user_id", profileId)
      .eq("enabled", true)
      .order("rank"),
    supabase
      .from("groups")
      .select("id, name, datas:videos (*)")
      .eq("user_id", profileId)
      .eq("type", "videos")
      .eq("enabled", true)
      .eq("videos.enabled", true)
      .order("rank")
      .order("rank", { referencedTable: "videos" }),
    supabase
      .from("galleries")
      .select(
        "id, before_image_url, after_image_url, title, before_image_label, after_image_label",
      )
      .eq("user_id", profileId)
      .eq("enabled", true)
      .order("rank"),
    supabase
      .from("general_galleries")
      .select("id, image_url, title")
      .eq("user_id", profileId)
      .eq("enabled", true)
      .order("rank"),
    supabase
      .from("reviews")
      .select("*")
      .eq("user_id", profileId)
      .eq("enabled", true)
      .order("rank"),
    supabase
      .from("external_review_pages")
      .select("*")
      .eq("user_id", profileId)
      .order("id", { ascending: false }),
    supabase
      .from("dentistry_locations")
      .select(
        "location_id, locations (country, city, area, latitude, longitude, full_address, business_name)",
      )
      .eq("dentistry_id", dentistryId),
    supabase
      .from("socials")
      .select(
        "twitter_link, instagram_link, facebook_link, tiktok_link, linkedin_link",
      )
      .eq("dentistry_id", dentistryId),
  ]);

  return {
    treatments: (treatments ?? []) as PublicTreatment[],
    linkGroups: (linkGroups ?? []).map((group) => ({
      link_group_id: group.link_group_id,
      heading: group.heading,
      rank: group.rank ?? 0,
      dentistry_links: group.dentistry_links.flatMap(({ links }) =>
        links
          ? [
              {
                links: {
                  link_id: links.link_id,
                  title: links.title,
                  link: links.link,
                  is_active: links.is_active ?? false,
                  rank: links.rank ?? 0,
                  click_counter: links.click_counter ?? 0,
                },
              },
            ]
          : [],
      ),
    })) as PublicLinkGroup[],
    blogGroups: (blogGroups ?? []) as PublicBlogGroup[],
    products: (products ?? []).map((product) => ({
      id: String(product.id),
      name: product.name ?? undefined,
      link: product.link ?? undefined,
      platform: product.platform ?? undefined,
      image_url: product.image_url ?? undefined,
      price: product.price?.toString(),
      currency: product.currency ?? undefined,
      rank: product.rank ?? undefined,
      enabled: product.enabled ?? undefined,
    })) as IndividualProductType[],
    videoGroups: (videoGroups ?? []).map((group) => ({
      id: String(group.id),
      name: group.name ?? undefined,
      datas: group.datas.map((video) => ({
        id: String(video.id),
        title: video.title ?? undefined,
        link: video.link ?? undefined,
        rank: video.rank ?? undefined,
        enabled: video.enabled ?? undefined,
      })),
    })) as GroupType[],
    galleries: (galleries ?? []) as PublicGallery[],
    generalGalleries: (generalGalleries ?? []) as PublicGeneralGallery[],
    reviews: reviews ?? [],
    externalReviewPages: externalReviewPages ?? [],
    locations: (locations ?? []) as PublicLocation[],
    socials: socials?.[0]
      ? {
          twitter_link: socials[0].twitter_link ?? undefined,
          instagram_link: socials[0].instagram_link ?? undefined,
          facebook_link: socials[0].facebook_link ?? undefined,
          tiktok_link: socials[0].tiktok_link ?? undefined,
          linkedin_link: socials[0].linkedin_link ?? undefined,
        }
      : null,
  };
}

export function createPersistentPublicProfileContentLoader(
  load: (
    profileId: string,
    dentistryId: string,
  ) => Promise<PublicProfileContent>,
  persistentCache: PersistentCache = unstable_cache,
) {
  return (profileId: string, dentistryId: string) =>
    persistentCache(
      () => load(profileId, dentistryId),
      ["public-profile-content", profileId, dentistryId],
      {
        revalidate: PUBLIC_PROFILE_CACHE_TTL_SECONDS,
        tags: publicProfileContentTags(profileId),
      },
    )();
}

const getPersistentPublicProfileContent =
  createPersistentPublicProfileContentLoader(loadPublicProfileContent);

export const getPublicProfile = cache(
  async (username: string): Promise<PublicProfileViewModel | null> => {
    const identity = await getPublicProfileIdentity(username);
    if (!identity) return null;

    const content = await getPersistentPublicProfileContent(
      identity.user.id,
      identity.dentistry.dentistry_id,
    );
    return { ...identity, ...content };
  },
);
