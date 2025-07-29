import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SaveButton from "../components/SaveButton";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { titles } from "@/utils/global_constants";
// import { AdminServer } from "@/utils/functions/useAdminServer";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import DeleteBio from "./DeleteBio";
import DownGradeBio from"./DownGradeBio";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import UsernameInput from "./UsernameInput";
import SettingsForm from "./SettingsForm";

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

async function handleDelete (targetUserId: string) {
  "use server"
  const { userId } = await getAuthorizedUser(targetUserId as string);

  const response = await fetch('/api/dentistry', {
    method: 'DELETE',
    body: JSON.stringify({ id: userId })
  });

  const data = await response.json();

  if (data.error) {
    console.error(data.error);
  }

  return redirect("/dashboard");
}

// Main page component
export default async function SettingsPage({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId;
  const user = await getUserDetails(targetUserId as string); // Fetch user details

  return (
    <div >
      <div id="columns">
        <div className="text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4">These details are private, and will not be visible on your Dentalbio.</div>
        <h2 className="text-lg font-semibold text-dark mb-3">Settings</h2>

        {/* Form to update user details */}
        <SettingsForm user={user} targetUserId={targetUserId} />

        <hr className="mb-10 border-neutral-400" />

        <ForgotPasswordForm defaultEmail={user.email} />

        <DownGradeBio />

        <DeleteBio targetUserId={targetUserId} handleDelete={handleDelete} />
      </div>
    </div>
  );
}
