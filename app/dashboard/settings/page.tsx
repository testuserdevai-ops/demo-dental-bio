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

// Server action to update user details
async function updateUserDetails(formData: FormData) {
  "use server";
  const targetUserId = formData.get('targetUserId') as string;
  const supabase = createClient();
  const userId = await getEffectiveUserId({ supabase, targetUserId });

  if (!userId) {
    return redirect("/login");
  }

  //offer-code check
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/offer-code`, { method: 'GET' });
  const serverOfferCode = await response.json()

  //birthday
  const calculateAge = (birthday: string) => {
    const today = new Date();
    const birthDate = new Date(birthday); // Convert birthday string to Date if necessary

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    // If the current month is before the birth month, or it's the birth month but the current day is before the birthday
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--; // Subtract 1 from age
    }

    return age;
  }

  const is_subscription_status = () => {
    if ((serverOfferCode.value != formData.get("offer_code")) || (calculateAge(formData.get("birthday") as string) > 27)) return "FREE"
    return "PRO"
  }

  const updatedUserDetails = {
    first_name: formData.get("first_name") as string,
    middle_name: formData.get("middle_name") as string,
    last_name: formData.get("last_name") as string,
    title: formData.get("title") as string,
    birthday: formData.get("birthday") as string,
    offer_code: formData.get("offer_code") as string,
    username: formData.get("username") as string,
    subscription_status: is_subscription_status()
  };

  const { error: updateError } = await supabase
    .from("users")
    .update(updatedUserDetails)
    .eq("id", userId);

  if (updateError) {
    return redirect("/error?message=failed_to_update_user_details");
  }

  return redirect('/dashboard')
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
