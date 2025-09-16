import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PricingTable from "./PricingTable";
import Image from "next/image";
import Link from "next/link";
import React from "react";

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
      <div className="flex justify-center">
        <Link href={"/"}>
          <Image
            src="/logo.svg"
            width={150}
            height={40}
            alt="Footer logo"
            className="mb-10 mt-20"
          />
        </Link>
      </div>
    </>
  );
}
