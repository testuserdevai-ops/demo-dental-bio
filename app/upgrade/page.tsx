import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Footer from "./Footer";
import PricingComponent from "./pricingComponent";

export default async function DashboardPage() {
  const supabase = createClient();

  // Fetch the authenticated user
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect("/login");
  }

  const email = userData.user.email ?? "";

  // For subscribed users, show the dashboard with the Manage Subscription button
  return (
    <>
      <PricingComponent email={email} />
      <Footer />
    </>
  );
}
