import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ManageServices from "./ManageServices";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import IntroText from "../../components/IntroText"; // Adjusted import path
import TreatmentsClientWrapper from "./TreatmentsClientWrapper";

// Fetch authenticated user ID
async function getUserId(targetUserId: string) {
  "use server";
  const supabase = createClient();

  const userId = await getEffectiveUserId({ supabase, targetUserId });

  if (!userId) {
    return redirect("/error?message=user_not_found");
  }

  return userId;
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
export default async function TreatmentsPage({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId;
  const userId = await getUserId(targetUserId as string);
  const dentistryId = await getDentistryId(userId); // Fetch dentistry ID

  return (
    <div className="py-2">
      <h2 className="text-xl font-semibold text-dark mb-3">Treatments / Services</h2>
      <IntroText>On this page you can list your treatments, or if you run a non-clinical business, you can showcase your services, areas of expertise, or interests.</IntroText>
      <TreatmentsClientWrapper dentistryId={dentistryId} />
    </div>
  );
}
