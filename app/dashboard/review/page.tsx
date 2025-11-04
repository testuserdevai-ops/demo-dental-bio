import React from "react"
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ManageReviews from "./ManageReviews";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

const Review = async ({ searchParams }: { searchParams: { userId?: string } }) => {
  const supabase = createClient();
  const targetUserId = searchParams.userId;

  const userId = await getEffectiveUserId({ supabase, targetUserId });

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username, subscription_status, role, created_at, trial_end, position")
    .eq("id", userId)
    .single();

  if (!userData)
    return redirect("/dashboard");

  const proAvailable = (userData.subscription_status === "PRO" || userData.subscription_status === "PREMIUM PRO");

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Reviews</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.reviews}</IntroText>
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable &&
          <div className="absolute w-full h-full top-0 left-0 z-10" />}
        <ManageReviews targetUserId={(userId === targetUserId) && userId} enabled={proAvailable} />
      </div>
    </div>
  )
}

export default Review