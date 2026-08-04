"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import CurrentPlanCard from "./components/CurrentPlanCard";
import BillingHistory from "./components/BillingHistory";
import PaymentMethods from "./components/PaymentMethods";

import type { SubscriptionOverview } from "@/lib/subscription/contracts";
import { apiClient } from "@/services/apiClient";

const overviewKey = ["dashboard", "subscription", "overview"] as const;

export default function SubscriptionClient({
  initialOverview,
}: {
  initialOverview: SubscriptionOverview;
}) {
  const overview = useQuery({
    queryKey: overviewKey,
    queryFn: () =>
      apiClient.get<SubscriptionOverview>("/api/subscription/overview"),
    initialData: initialOverview,
    staleTime: 30_000,
  });
  const data = overview.data;

  return (
    <div className="w-full space-y-8" data-testid="subscription-manager">
      {/* Current Plan Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">
          Current Plan
        </h3>
        <CurrentPlanCard
          subscription={data.plan}
          onRefresh={() => overview.refetch()}
        />
      </div>

      {/* Payment Methods Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">
          Payment Methods
        </h3>
        <PaymentMethods
          customerId={data.customerId}
          paymentMethods={data.paymentMethods.items}
          error={data.paymentMethods.error}
          onRefresh={() => overview.refetch()}
        />
      </div>

      {/* Billing History Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">
          Billing History
        </h3>
        {data.customerId ? (
          <BillingHistory
            key={overview.dataUpdatedAt}
            initialPage={data.billingHistory}
          />
        ) : (
          <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
            <p className="text-neutral-600 text-sm sm:text-base">
              No billing history yet. Your invoices will appear here once you
              subscribe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
