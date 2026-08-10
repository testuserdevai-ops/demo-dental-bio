"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import {
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
} from "@/lib/public-profile/cache-invalidation";
import { getProfileViewModel, type ProfileViewModel } from "./queries";
import { profileInputSchema, socialLinksInputSchema } from "./schemas";

export async function saveProfile(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<ProfileViewModel>> {
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { error } = await client.rpc("save_dashboard_profile", {
      p_user_id: scope.effectiveUserId,
      p_dentistry_id: scope.dentistryId,
      p_title: value.title,
      p_position: value.position,
      p_gdc_no: value.gdcNo,
      p_qualification: value.qualification,
      p_about_title: value.aboutTitle,
      p_about_text: value.aboutText,
      p_phone: value.phone,
      p_contact_email: value.contactEmail,
      p_website: value.website,
      p_booking_link: value.bookingLink,
      p_booking_enabled: value.bookingEnabled,
    });
    if (error) return actionError("SAVE_FAILED", "Profile could not be saved");
    const data = await getProfileViewModel(scope, client);
    invalidatePublicProfileCache({
      profileId: scope.effectiveUserId,
      feature: "profile",
    });
    invalidatePublicProfileIdentityCache([scope.username]);
    return { ok: true, data };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Profile could not be saved");
  }
}

export async function saveSocialLinks(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<ProfileViewModel["socials"]>> {
  const parsed = socialLinksInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("save_dashboard_socials", {
      p_dentistry_id: scope.dentistryId,
      p_linkedin: value.linkedin,
      p_twitter: value.twitter,
      p_instagram: value.instagram,
      p_facebook: value.facebook,
      p_tiktok: value.tiktok,
      p_other: value.other,
    });
    const row = data?.[0];
    if (error || !row)
      return actionError("SAVE_FAILED", "Social links could not be saved");
    invalidatePublicProfileCache({
      profileId: scope.effectiveUserId,
      feature: "socials",
    });
    return {
      ok: true,
      data: {
        linkedin: row.linkedin_link ?? "",
        twitter: row.twitter_link ?? "",
        instagram: row.instagram_link ?? "",
        facebook: row.facebook_link ?? "",
        tiktok: row.tiktok_link ?? "",
        other: row.other_link ?? "",
      },
    };
  } catch {
    return actionError(
      "AUTHORIZATION_ERROR",
      "Social links could not be saved",
    );
  }
}
