"use client";

import React from "react";
import CurrentPlanCard from "./components/CurrentPlanCard";
import BillingHistory from "./components/BillingHistory";
import PaymentMethods from "./components/PaymentMethods";

interface SubscriptionClientProps {
  customerId: string | null;
}

export default function SubscriptionClient({ customerId }: SubscriptionClientProps) {
  return (
    <div className="w-full space-y-8">
      {/* Current Plan Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Current Plan</h3>
        <CurrentPlanCard />
      </div>

      {/* Payment Methods Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Payment Methods</h3>
        <PaymentMethods customerId={customerId} />
      </div>

      {/* Billing History Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Billing History</h3>
        {customerId ? <BillingHistory /> : (
          <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200 text-center">
            <p className="text-neutral-600 text-sm sm:text-base">No billing history yet. Your invoices will appear here once you subscribe.</p>
          </div>
        )}
      </div>
    </div>
  );
}
