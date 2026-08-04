import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardScope } from "@/lib/dashboard/types";

export type ProfileViewModel = {
  user: {
    title: string;
    position: string;
    gdcNo: string;
    qualification: string;
  };
  dentistry: {
    aboutTitle: string;
    aboutText: string;
    phone: string;
    contactEmail: string;
    website: string;
    bookingLink: string;
    bookingEnabled: boolean;
  };
  socials: {
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    other: string;
  };
  profilePicture: { objectPath: string | null; publicUrl: string | null };
};

export async function getProfileViewModel(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<ProfileViewModel> {
  const supabase = client ?? (await createServerSupabaseClient());
  const [
    { data: user, error: userError },
    { data: dentistry, error: dentistryError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("title, position, gdc_no, qualification")
      .eq("id", scope.effectiveUserId)
      .single(),
    supabase
      .from("dentistries")
      .select(
        "dentistry_id, about_title, about_text, phone, contact_email, website, booking_link, booking_link_enabled, socials(twitter_link, instagram_link, facebook_link, tiktok_link, other_link)",
      )
      .eq("dentistry_id", scope.dentistryId)
      .single(),
  ]);
  if (userError || !user || dentistryError || !dentistry)
    throw new Error("Unable to load profile");

  const { data: files, error: storageError } = await supabase.storage
    .from("profile-pics")
    .list(scope.dentistryId);
  if (storageError) throw new Error("Unable to load profile picture");
  const latest = [...(files ?? [])].sort(
    (left, right) =>
      new Date(right.created_at ?? 0).getTime() -
      new Date(left.created_at ?? 0).getTime(),
  )[0];
  const objectPath = latest ? `${scope.dentistryId}/${latest.name}` : null;
  const publicUrl = objectPath
    ? supabase.storage.from("profile-pics").getPublicUrl(objectPath).data
        .publicUrl
    : null;
  const social = Array.isArray(dentistry.socials)
    ? dentistry.socials[0]
    : dentistry.socials;

  return {
    user: {
      title: user.title ?? "",
      position: user.position ?? "",
      gdcNo: user.gdc_no ?? "",
      qualification: user.qualification ?? "",
    },
    dentistry: {
      aboutTitle: dentistry.about_title ?? "",
      aboutText: dentistry.about_text ?? "",
      phone: dentistry.phone ?? "",
      contactEmail: dentistry.contact_email ?? "",
      website: dentistry.website ?? "",
      bookingLink: dentistry.booking_link ?? "",
      bookingEnabled: dentistry.booking_link_enabled ?? false,
    },
    socials: {
      twitter: social?.twitter_link ?? "",
      instagram: social?.instagram_link ?? "",
      facebook: social?.facebook_link ?? "",
      tiktok: social?.tiktok_link ?? "",
      other: social?.other_link ?? "",
    },
    profilePicture: { objectPath, publicUrl },
  };
}
