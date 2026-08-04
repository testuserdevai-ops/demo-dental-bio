import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

import ProfilePictureUploader from "./ProfilePictureUploader";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import ProfileEditor from "./components/ProfileEditor";
import { profileSchema } from "@/lib/validation";
import SocialLinksEditor, {
  type SocialLinksFormState,
  type SocialLinksValues,
} from "./components/SocialLinksEditor";
import {
  parseSocialMediaProfile,
  socialPlatforms,
} from "@/utils/functions/socialMediaProfiles";

// Fetch the authenticated user ID
async function getUserId(targetUserId: string) {
  const supabase = await createClient();
  try {
    return getEffectiveUserId({ targetUserId, supabase });
  } catch (e) {
    redirect("/login");
  }
}

// Get detailed user information
async function getUserDetails(userId: string) {
  "use server";
  const supabase = await createClient();

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select(
      "id, email, first_name, last_name, title, position, gdc_no, qualification, isVerified",
    )
    .eq("id", userId)
    .single();

  if (userError || !userRecord) {
    return redirect("/error?message=user_not_found");
  }

  return userRecord;
}

// Check if Dentistry already exists or create a new one
async function getOrCreateDentistry(userId: string) {
  "use server";
  const supabase = await createClient();

  // Check if there's already a dentistry for the user
  const { data: dentistry, error } = await supabase
    .from("dentistries")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (dentistry) {
    return dentistry; // Return existing dentistry data
  }

  // If no dentistry exists, create a new one for the user

  // Fetch user's first_name, last_name, and email from the users table
  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", userId)
    .single();

  if (userError || !userRecord) {
    return redirect("/error?message=failed_to_fetch_user_data");
  }

  // Construct full name and ensure it doesn't have extra spaces
  const fullName = `${userRecord.first_name || ""} ${
    userRecord.last_name || ""
  }`.trim();

  // Prepare the new dentistry data
  const newDentistry = {
    user_id: userId,
    about_title: fullName || "", // Set to first_name + last_name
    about_text: "",
    phone: "",
    booking_link: "",
    website: "",
    contact_email: userRecord.email || "", // Set to user's email
  };

  const { data: insertedDentistry, error: insertError } = await supabase
    .from("dentistries")
    .insert([newDentistry])
    .select("*")
    .single();

  if (insertError) {
    return redirect("/error?message=failed_to_create_dentistry");
  }

  return insertedDentistry; // Return newly created dentistry data
}

// Check if social links exist, create if necessary
async function getOrCreateSocialLinks(dentistryId: string) {
  "use server";
  const supabase = await createClient();

  const { data: socialLinks, error } = await supabase
    .from("socials")
    .select("*")
    .eq("dentistry_id", dentistryId);

  if (socialLinks && socialLinks.length > 0) {
    return socialLinks[0];
  }

  // If no social links exist, create new empty records
  const newSocialLinks = {
    dentistry_id: dentistryId,
    twitter_link: "",
    instagram_link: "",
    facebook_link: "",
    tiktok_link: "",
    linkedin_link: "",
  };

  const { data: insertedSocials, error: insertError } = await supabase
    .from("socials")
    .insert([newSocialLinks])
    .select("*")
    .single();

  if (insertError) {
    return redirect("/error?message=failed_to_create_social_links");
  }

  return insertedSocials; // Return newly created social links
}

// Server Action to save or update Dentistry
async function saveDentistryDetails(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const userId = formData.get("userId") as string;
  const dentistry = await getOrCreateDentistry(userId);

  // Update dentistry fields
  const updatedDentistry = {
    about_title: formData.get("about_title") as string,
    about_text: formData.get("about_text") as string,
    phone: formData.get("phone") as string,
    booking_link: formData.get("booking_link") as string,
    booking_link_enabled: formData.get("booking_link_enabled"),
    contact_email: formData.get("contact_email") as string,
    website: formData.get("website") as string,
  };

  const { error: dentistryError } = await supabase
    .from("dentistries")
    .update(updatedDentistry)
    .eq("dentistry_id", dentistry.dentistry_id);

  if (dentistryError) {
    return redirect("/profile?error=failed_to_update_dentistry");
  }
}

// Server Action to save or update Dentistry
async function saveUserDetails(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const userId = formData.get("userId") as string;

  // Update dentistry fields
  const updatedUserData = {
    position: formData.get("position") as string,
    gdc_no: formData.get("gdc_no") as string,
    qualification: formData.get("qualification") as string,
  };

  const { error: userError } = await supabase
    .from("users")
    .update(updatedUserData)
    .eq("id", userId);

  if (userError) {
    return redirect("/profile?error=failed_to_update_user");
  }
}

// Server Action to save or update Social Links
async function saveSocialLinks(
  _state: SocialLinksFormState,
  formData: FormData,
): Promise<SocialLinksFormState> {
  "use server";
  const supabase = await createClient();
  const userId = formData.get("userId") as string;
  const dentistry = await getOrCreateDentistry(userId);

  const errors: SocialLinksFormState["errors"] = {};
  const normalized = {} as SocialLinksValues;
  for (const platform of socialPlatforms) {
    const result = parseSocialMediaProfile(
      formData.get(`${platform}_link`),
      platform,
    );
    if (!result.valid) errors[platform] = result.message;
    else normalized[platform] = result.url;
  }

  if (Object.keys(errors).length) {
    return {
      errors,
      message: "Correct the highlighted social profiles. Nothing was saved.",
    };
  }

  const updatedSocialLinks = Object.fromEntries(
    socialPlatforms.map((platform) => [
      `${platform}_link`,
      normalized[platform],
    ]),
  );

  const { error: socialsError } = await supabase
    .from("socials")
    .update(updatedSocialLinks)
    .eq("dentistry_id", dentistry.dentistry_id);

  if (socialsError) {
    return {
      errors: {},
      message: "Social links could not be saved. Please try again.",
    };
  }

  return { errors: {}, message: "Social links saved.", success: true };
}

async function onSaveUserAndDentistryData(formData: FormData) {
  "use server";

  const validation = profileSchema.safeParse({
    about_title: formData.get("about_title"),
    about_text: formData.get("about_text"),
    gdc_no: formData.get("gdc_no"),
    qualification: formData.get("qualification"),
    phone: formData.get("phone"),
    contact_email: formData.get("contact_email"),
    booking_link: formData.get("booking_link"),
    website: formData.get("website"),
  });

  if (!validation.success) {
    return redirect(
      "/profile?error=" +
        encodeURIComponent(validation.error.issues[0].message),
    );
  }

  await Promise.all([
    saveDentistryDetails(formData),
    saveUserDetails(formData),
  ]);
}

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const userId = await getUserId(targetUserId as string);
  const dentistry = await getOrCreateDentistry(userId);

  const socialLinks = await getOrCreateSocialLinks(dentistry.dentistry_id);
  const user = await getUserDetails(userId);

  return (
    <div className="py-10">
      <div id="columns">
        <ProfilePictureUploader dentistryId={dentistry.dentistry_id} />
        <form
          action={onSaveUserAndDentistryData}
          className="mb-6 mt-10"
          noValidate
        >
          <ProfileEditor user={user} dentistry={dentistry} userId={userId} />
        </form>

        <SocialLinksEditor
          action={saveSocialLinks}
          userId={userId}
          initialValues={{
            twitter: socialLinks?.twitter_link ?? "",
            instagram: socialLinks?.instagram_link ?? "",
            facebook: socialLinks?.facebook_link ?? "",
            tiktok: socialLinks?.tiktok_link ?? "",
            linkedin: socialLinks?.linkedin_link ?? "",
          }}
        />
      </div>
    </div>
  );
}
