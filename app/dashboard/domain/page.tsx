import React from "react";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import DomainClient from "./DomainClient";

export const dynamic = "force-dynamic";

export default async function DomainPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { userId, subscriptionStatus } = await getAuthorizedUser(
    targetUserId as string,
  );

  if (!userId) {
    return redirect("/login");
  }

  const isPremiumPro = subscriptionStatus === "PREMIUM PRO";

  return (
    <div className="flex-col-gap mb-12">
      <h2 className="text-xl font-semibold text-dark">Custom Domain</h2>
      <IntroText>{featureDescriptions.domain}</IntroText>

      {isPremiumPro ? (
        <DomainClient />
      ) : (
        <div className="bg-surface-light rounded-[26px] p-6 text-center text-gray-600">
          <p className="font-semibold mb-3">
            Connecting a custom domain is a Premium Pro feature.
          </p>
          <a
            href="/upgrade"
            target="_blank"
            className="inline-block no-underline add-btn upgrade-now-btn"
          >
            <button>Upgrade to Premium Pro</button>
          </a>
        </div>
      )}
    </div>
  );
}
