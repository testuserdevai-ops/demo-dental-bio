import React from "react";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import DeleteBio from "./DeleteBio";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import SettingsForm from "./SettingsForm";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { replaceInString, resolveBrand } from "@/utils/functions/functions";
import { getDomainConfig } from "@/utils/domainConfig";

// Fetch authenticated user details
async function getUserDetails(targetUserId: string) {
  "use server";
  const supabase = await createClient();

  const userId = await getEffectiveUserId({ supabase, targetUserId });

  if (!userId) {
    return redirect("/login");
  }

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !userRecord) {
    return redirect("/error?message=user_not_found");
  }

  return userRecord;
}

async function handleDelete(targetUserId: string) {
  "use server"
  const { userId } = await getAuthorizedUser(targetUserId);
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  const response = await fetch(`${domainConfig.baseUrl}/api/auth/remove-account`, {
    method: 'POST',
    body: JSON.stringify({ id: userId })
  });

  const data = await response.json();

  if (data.error) {
    console.error(data.error);
  }

  return redirect("/");
}

// Main page component
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId: targetUserId } = await searchParams;
  const user = await getUserDetails(targetUserId as string); // Fetch user details
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Settings</h2>
      <IntroText>{replaceInString(featureDescriptions.settings, "{{brand}}", domainConfig.brandName)}</IntroText>

      {/* Form to update user details */}
      <SettingsForm user={user} targetUserId={targetUserId} />

      <hr className="mb-10 border-neutral-400" />

      <ForgotPasswordForm defaultEmail={user.email} />

      <DeleteBio targetUserId={targetUserId} handleDelete={handleDelete} />
    </div>
  );
}
