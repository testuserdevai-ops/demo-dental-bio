import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Footer from "./Footer";
import PricingComponent from "./pricingComponent";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect("/login");
  }

  const email = userData.user.email ?? "";

  return (
    <>
      <PricingComponent email={email} />
      <Footer />
    </>
  );
}
