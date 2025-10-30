import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PricingTable from "./PricingTable";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import Footer from "./Footer";

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
      <div className="min-h-[100vh]">
        <PricingTable email={email} /> {/* Show pricing table */}
      </div>
      <Footer />
    </>
  );
}
