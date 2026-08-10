import React from "react";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import SubscriptionClient from "./SubscriptionClient";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { getSubscriptionOverview } from "@/lib/subscription/overview";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { userId, isAdmin } = await getAuthorizedUser(targetUserId as string);

  if (!userId) {
    return redirect("/login");
  }

  const overview = isAdmin ? null : await getSubscriptionOverview(userId);
  if (!isAdmin && !overview) return redirect("/login");

  return (
    <div className="flex-col-gap mb-12">
      <h2 className="text-xl font-semibold text-dark">Subscription</h2>

      {isAdmin ? (
        <IntroText>
          This subscription can be managed from the Admin Dashboard. Please use
          the dashboard tools to make any updates.
        </IntroText>
      ) : (
        <>
          <IntroText>
            {featureDescriptions.subscription ||
              "Manage your subscription, payment methods, and billing information."}
          </IntroText>
          <SubscriptionClient initialOverview={overview!} />
        </>
      )}
    </div>
  );
}
