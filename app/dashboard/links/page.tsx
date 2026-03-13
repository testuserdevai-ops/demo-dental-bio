import React from "react";
import { createClient } from "@/utils/supabase/server";

import { redirect } from "next/navigation";
import LinksPageClient from "./components/LinksPageClient";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

// Fetch authenticated user ID
async function getUserId(targetUserId: string) {
  "use server";
  const supabase = createClient();

  return getEffectiveUserId({ targetUserId, supabase });
}

// Fetch Dentistry ID based on user ID
async function getDentistryId(userId: string) {
  "use server";
  const supabase = createClient();
  const { data: dentistry, error } = await supabase
    .from("dentistries")
    .select("dentistry_id")
    .eq("user_id", userId)
    .single();

  if (error || !dentistry) {
    return redirect("/error?message=dentistry_not_found");
  }

  return dentistry.dentistry_id;
}

// Main page component
export default async function LinksPage({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId;
  const userId = await getUserId(targetUserId as string);
  const dentistryId = await getDentistryId(userId); // Fetch dentistry ID

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Links</h2>
      <IntroText>{featureDescriptions.links}</IntroText>
      <LinksPageClient dentistryId={dentistryId} />
    </div>
  );
}
