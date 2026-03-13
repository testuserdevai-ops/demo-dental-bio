import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

import SaveButton from "./components/SaveButton";
import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import ProfilePictureUploader from "./ProfilePictureUploader";
import LabeledInput from "./components/LabeledInput";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { validateSocialMediaInput } from "@/utils/functions/validateSociaMediaInput";
import { extractUsername } from "@/utils/functions/extractUsername";
import ProfileEditor from "./components/ProfileEditor";

// Fetch the authenticated user ID
async function getUserId(targetUserId: string) {
  const supabase = createClient();
  try {
    return getEffectiveUserId({ targetUserId, supabase });
  } catch (e) {
    redirect("/login");
  }
}

// Get detailed user information
async function getUserDetails(userId: string) {
  "use server";
  const supabase = createClient();

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, title, position, gdc_no, qualification, isVerified")
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
  const supabase = createClient();

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
  const fullName = `${userRecord.first_name || ""} ${userRecord.last_name || ""
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
  const supabase = createClient();

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
  const supabase = createClient();
  const userId = await getEffectiveUserId({ supabase, targetUserId: formData.get("userId") as string });
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
  const supabase = createClient();
  const userId = await getEffectiveUserId({ supabase, targetUserId: formData.get("userId") as string });

  // Update dentistry fields
  const updatedUserData = {
    position: formData.get("position") as string,
    gdc_no: formData.get("gdc_no") as string,
    qualification: formData.get("qualification") as string
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
async function saveSocialLinks(formData: FormData) {
  "use server";
  const supabase = createClient();
  const userId = await getEffectiveUserId({ supabase, targetUserId: formData.get("userId") as string });
  const dentistry = await getOrCreateDentistry(userId);

  // Update social links fields
  const updatedSocialLinks = {
    twitter_link: getValidatedSocialInput(formData.get("twitter_link") as string, 'twitter'),
    instagram_link: getValidatedSocialInput(formData.get("instagram_link") as string, 'instagram'),
    facebook_link: getValidatedSocialInput(formData.get("facebook_link") as string, 'facebook'),
    tiktok_link: getValidatedSocialInput(formData.get("tiktok_link") as string, 'tiktok'),
  };

  const { error: socialsError } = await supabase
    .from("socials")
    .update(updatedSocialLinks)
    .eq("dentistry_id", dentistry.dentistry_id);

  if (socialsError) {
    return redirect("/profile?error=failed_to_update_social_links");
  }
}

async function onSaveUserAndDentistryData(formData: FormData) {
  "use server";
  saveDentistryDetails(formData);
  saveUserDetails(formData);
}

function getValidatedSocialInput(input: string, platform: Platform): string {
  const res = validateSocialMediaInput(input, platform);
  return res.url ? res.url : "";
}

export default async function Profile({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId
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
        >
          <ProfileEditor user={user} dentistry={dentistry} userId={userId} />
        </form>

        {/* Social Links Form */}
        <form action={saveSocialLinks} className="flex-col-gap mb-6 mt-6">
          <input type="hidden" name="userId" value={userId} />
          <h2 className="text-lg font-semibold">Social Links</h2>
          <LabeledInput
            label="X Name"
            className="w-full text-base pl-7"
            name="twitter_link"
            defaultValue={extractUsername(socialLinks?.twitter_link, 'twitter') || ""}
          >
            <XLogoIcon
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>

          <LabeledInput
            label="Instagram Name"
            className="w-full text-base pl-7"
            name="instagram_link"
            defaultValue={extractUsername(socialLinks?.instagram_link, 'instagram') || ""}
          >
            <InstagramLogoIcon
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>

          <LabeledInput
            label="Facebook Name"
            className="w-full text-base pl-7"
            name="facebook_link"
            defaultValue={extractUsername(socialLinks?.facebook_link, 'facebook') || ""}
          >
            <FacebookLogoIcon
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>

          <LabeledInput
            label="Tiktok Name"
            className="w-full text-base pl-7"
            name="tiktok_link"
            defaultValue={extractUsername(socialLinks?.tiktok_link, 'tiktok') || ""}
          >
            <TiktokLogoIcon
              size={24}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
            />
          </LabeledInput>

          {/* Save Button for Social Links */}
          <div className="w-full flex items-end justify-end">
            <SaveButton />
          </div>
        </form>
      </div>
    </div>
  );
}
