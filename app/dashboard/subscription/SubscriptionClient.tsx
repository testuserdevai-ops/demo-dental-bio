"use client";

import React from "react";
import CurrentPlanCard from "./components/CurrentPlanCard";
import BillingHistory from "./components/BillingHistory";
import PaymentMethods from "./components/PaymentMethods";

interface SubscriptionClientProps {
  userEmail: string;
  customerId: string | null;
  targetUserId?: string;
}

export default function SubscriptionClient({ userEmail, customerId, targetUserId }: SubscriptionClientProps) {
  return (
    <div className="w-full space-y-8">
      {/* Current Plan Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Current Plan</h3>
        <CurrentPlanCard targetUserId={targetUserId} />
      </div>

      {/* Payment Methods Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Payment Methods</h3>
        <PaymentMethods customerId={customerId} targetUserId={targetUserId} />
      </div>

      {/* Billing History Section */}
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold text-dark">Billing History</h3>
        <BillingHistory targetUserId={targetUserId} />
      </div>
    </div>
  );
}
