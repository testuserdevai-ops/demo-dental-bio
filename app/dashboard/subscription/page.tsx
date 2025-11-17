import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import SubscriptionClient from "./SubscriptionClient";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage({ searchParams }: { searchParams: { userId?: string } }) {
  const targetUserId = searchParams.userId;
  const { userId, isAdmin } = await getAuthorizedUser(targetUserId as string);

  if (!userId) {
    return redirect("/login");
  }

  const supabase = createClient();

  // Get user's email for the client component
  const { data: user } = await supabase
    .from("users")
    .select("email, customer_id")
    .eq("id", userId)
    .single();

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="flex-col-gap mb-12">
      <h2 className="text-xl font-semibold text-dark">Subscription</h2>

      {isAdmin ? <IntroText>This subscription can be managed from the Admin Dashboard. Please use the dashboard tools to make any updates.</IntroText> :
        <>
          <IntroText>{featureDescriptions.subscription || "Manage your subscription, payment methods, and billing information."}</IntroText>
          <SubscriptionClient userEmail={user.email} customerId={user.customer_id} targetUserId={targetUserId} />
        </>
      }
    </div>
  );
}

