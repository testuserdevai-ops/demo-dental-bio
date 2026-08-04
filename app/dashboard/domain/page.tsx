import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
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
  let identity;
  try {
    identity = await resolveDashboardIdentity(targetUserId ?? null);
  } catch {
    redirect("/login");
  }

  const isPremiumPro = identity.shell.subscriptionStatus === "PREMIUM PRO";

  return (
    <div className="flex-col-gap mb-12">
      <h2 className="text-xl font-semibold text-dark">Custom Domain</h2>
      <IntroText>{featureDescriptions.domain}</IntroText>

      {!identity.scope.canManageSubscription ? (
        <div className="bg-surface-light rounded-[26px] p-6 text-center text-gray-600">
          <p className="font-semibold m-0">
            Custom domain management is unavailable while viewing another
            user&apos;s dashboard.
          </p>
        </div>
      ) : isPremiumPro ? (
        <DomainClient />
      ) : (
        <div className="bg-surface-light rounded-[26px] p-6 text-center text-gray-600">
          <p className="font-semibold mb-3">
            Connecting a custom domain is a Premium Pro feature.
          </p>
          <Link
            href="/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center items-center px-[20px] py-[10px] font-bold text-white rounded-[26px] bg-primary-1 hover:bg-deep-purple transition-all ease-in-out no-underline upgrade-now-btn"
          >
            Upgrade to Premium Pro
          </Link>
        </div>
      )}
    </div>
  );
}
