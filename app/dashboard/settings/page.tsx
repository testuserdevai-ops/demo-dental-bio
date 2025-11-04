import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import DeleteBio from "./DeleteBio";
import DownGradeBio from "./DownGradeBio";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import SettingsForm from "./SettingsForm";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Fetch authenticated user details
async function getUserDetails(targetUserId: string) {
  "use server";
  const supabase = createClient();

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

  const response = await fetch(`${baseUrl}/api/auth/remove-account`, {
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
export default async function SettingsPage({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId;
  const user = await getUserDetails(targetUserId as string); // Fetch user details

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Settings</h2>
      <IntroText>{featureDescriptions.settings}</IntroText>

      {/* Form to update user details */}
      <SettingsForm user={user} targetUserId={targetUserId} />

      <hr className="mb-10 border-neutral-400" />

      <ForgotPasswordForm defaultEmail={user.email} />

      <DownGradeBio />

      <DeleteBio targetUserId={targetUserId} handleDelete={handleDelete} />
    </div>
  );
}
