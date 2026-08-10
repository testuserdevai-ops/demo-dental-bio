import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicBlogPageParams = {
  username: string;
  slug: string;
};

export type PublicBlogProfile = {
  id: string;
  username: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  isVerified: boolean | null;
  useDentalBrand: boolean | null;
  registeredDomain: string | null;
};

export type PublicBlog = {
  id: number;
  groupId: number;
  title: string;
  content: string;
  slug: string;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
};

export type PublicBlogDentistry = {
  dentistryId: string;
  aboutTitle: string | null;
  aboutText: string | null;
  phone: string | null;
  bookingLink: string | null;
  contactEmail: string | null;
  locationTitle: string | null;
};

export type PublicBlogPageViewModel = {
  profile: PublicBlogProfile;
  blog: PublicBlog;
  dentistry: PublicBlogDentistry | null;
  profilePictureUrl: string;
};

export type PublicBlogQueryDependencies = {
  getProfileByUsername: (username: string) => Promise<PublicBlogProfile | null>;
  getEnabledGroupIds: (profileId: string) => Promise<number[]>;
  getEnabledBlog: (
    slug: string,
    groupIds: number[],
  ) => Promise<PublicBlog | null>;
  getDentistry: (profileId: string) => Promise<PublicBlogDentistry | null>;
  getProfilePictureUrl: (dentistryId: string | null) => Promise<string>;
};

export async function getPublicBlogPageFromDependencies(
  { username, slug }: PublicBlogPageParams,
  dependencies: PublicBlogQueryDependencies,
): Promise<PublicBlogPageViewModel | null> {
  const profile = await dependencies.getProfileByUsername(username);
  if (!profile) return null;

  const groupIds = await dependencies.getEnabledGroupIds(profile.id);
  if (groupIds.length === 0) return null;

  const blog = await dependencies.getEnabledBlog(slug, groupIds);
  if (!blog) return null;

  const dentistry = await dependencies.getDentistry(profile.id);
  const profilePictureUrl = await dependencies.getProfilePictureUrl(
    dentistry?.dentistryId ?? null,
  );

  return { profile, blog, dentistry, profilePictureUrl };
}

export async function getPublicBlogPage(
  params: PublicBlogPageParams,
): Promise<PublicBlogPageViewModel | null> {
  const supabase = await createServerSupabaseClient();

  return getPublicBlogPageFromDependencies(params, {
    async getProfileByUsername(username) {
      const { data, error } = await supabase
        .from("public_profiles")
        .select(
          "profile_id,username,title,first_name,last_name,isVerified,use_dental_brand,registered_domain",
        )
        .eq("username", username)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.profile_id,
        username: data.username,
        title: data.title,
        firstName: data.first_name,
        lastName: data.last_name,
        isVerified: data.isVerified,
        useDentalBrand: data.use_dental_brand,
        registeredDomain: data.registered_domain,
      };
    },
    async getEnabledGroupIds(profileId) {
      const { data, error } = await supabase
        .from("blog_groups")
        .select("id")
        .eq("user_id", profileId)
        .eq("enabled", true);

      if (error) return [];
      return (data ?? []).map(({ id }) => id);
    },
    async getEnabledBlog(slug, groupIds) {
      const { data, error } = await supabase
        .from("blogs")
        .select(
          "id,group_id,title,content,slug,image_url,meta_title,meta_description,created_at",
        )
        .eq("slug", slug)
        .eq("enabled", true)
        .in("group_id", groupIds)
        .maybeSingle();

      if (error || !data || data.group_id === null) return null;

      return {
        id: data.id,
        groupId: data.group_id,
        title: data.title,
        content: data.content,
        slug: data.slug,
        imageUrl: data.image_url,
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        createdAt: data.created_at,
      };
    },
    async getDentistry(profileId) {
      const { data, error } = await supabase
        .from("dentistries")
        .select(
          "dentistry_id,about_title,about_text,phone,booking_link,contact_email,location_title",
        )
        .eq("user_id", profileId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        dentistryId: data.dentistry_id,
        aboutTitle: data.about_title,
        aboutText: data.about_text,
        phone: data.phone,
        bookingLink: data.booking_link,
        contactEmail: data.contact_email,
        locationTitle: data.location_title,
      };
    },
    async getProfilePictureUrl(dentistryId) {
      if (!dentistryId) return "/placeholder.webp";

      const { data, error } = await supabase.storage
        .from("profile-pics")
        .list(dentistryId);

      if (error || data.length === 0) return "/placeholder.webp";

      return (
        supabase.storage
          .from("profile-pics")
          .getPublicUrl(`${dentistryId}/${data[0].name}`).data.publicUrl ??
        "/placeholder.webp"
      );
    },
  });
}
