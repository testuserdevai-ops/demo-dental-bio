"use client";

import React, { useState, useEffect } from "react";
import RoundedButton from "@/app/components/Button/RoundedButton";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  CheckCircleIcon,
  CreditCardIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { toTitleCase } from "@/utils/functions/functions";
import { apiClient } from "@/services/apiClient";

interface SubscriptionDetails {
  planName: string;
  price: number;
  currency: string;
  renewalDate: string | null;
  billingCycle: string | null;
  subscriptionDetails: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
  } | null;
  trialEnd: string | null;
}

export default function CurrentPlanCard() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);

      const data = await apiClient.get<SubscriptionDetails>(
        "/api/subscription/details",
      );

      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-1"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[26px] p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-[26px] p-6 border border-neutral-200">
        <p className="text-neutral-600">No active subscription found.</p>
      </div>
    );
  }

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  async function handleCancelSubscription() {
    setIsCanceling(true);
    try {
      const subscriptionId = subscription?.subscriptionDetails?.id;
      if (!subscriptionId) {
        throw new Error("No active subscription found");
      }

      // Cancel at period end instead of immediate cancellation with refund
      await apiClient.post("/api/subscription/cancel", {
        subscriptionId,
      });

      // Refresh subscription details
      await fetchSubscriptionDetails();
      setShowCancelConfirm(false);
      setShowSuccessMessage(true);
    } catch (err: any) {
      setShowCancelConfirm(false);
      setErrorMessage(err.message);
      setShowErrorMessage(true);
    } finally {
      setIsCanceling(false);
    }
  }

  const isTrial =
    subscription.subscriptionDetails?.status === "trialing" &&
    subscription.trialEnd &&
    new Date(subscription.trialEnd) > new Date();
  const isCanceled =
    subscription.subscriptionDetails?.cancelAtPeriodEnd || false;
  const status = subscription.subscriptionDetails?.status || "active";

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-xl sm:text-2xl font-bold text-dark mb-2">
              {subscription.planName}
            </h3>
            <div className="flex items-center gap-2 text-sm sm:text-base text-neutral-600">
              {isTrial ? (
                <>
                  <CalendarIcon size={20} />
                  <span className="break-words">
                    Trial ends {formatDate(subscription.trialEnd)}
                  </span>
                </>
              ) : (
                <>
                  <CreditCardIcon size={20} />
                  <span className="break-words">
                    {formatCurrency(subscription.price, subscription.currency)}/
                    {subscription.billingCycle === "annually"
                      ? "year"
                      : "month"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(status === "active" && !isCanceled) || isTrial ? (
              <CheckCircleIcon
                size={24}
                className="text-green-500"
                weight="fill"
              />
            ) : (
              <XCircleIcon
                size={24}
                className="text-orange-500"
                weight="fill"
              />
            )}
            <span
              className={`font-semibold text-sm sm:text-base whitespace-nowrap ${(status === "active" && !isCanceled) || isTrial ? "text-green-600" : "text-orange-600"}`}
            >
              {isCanceled ? "Canceling" : toTitleCase(status)}
            </span>
          </div>
        </div>

        {subscription.renewalDate && !isCanceled && !isTrial && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-[20px]">
            <div className="flex items-center gap-2 text-neutral-600">
              <CalendarIcon size={20} />
              <span>Renews on {formatDate(subscription.renewalDate)}</span>
            </div>
          </div>
        )}

        {isCanceled && subscription.renewalDate && (
          <div className="mt-4 p-4 bg-orange-50 rounded-[20px] border border-orange-200">
            <p className="text-orange-800">
              Your subscription will cancel on{" "}
              {formatDate(subscription.renewalDate)}. You'll continue to have
              access until then.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <FullRoundedButton
            onClick={() => window.open("/upgrade", "_blank")}
            className="w-full sm:w-auto"
          >
            {subscription.planName === "FREE" ? "Upgrade Plan" : "Change Plan"}
          </FullRoundedButton>
          {!isCanceled && subscription.subscriptionDetails && (
            <FullRoundedButton onClick={handleCancelClick} buttonType="danger">
              Cancel Subscription
            </FullRoundedButton>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmMessage
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onOk={handleCancelSubscription}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period."
        okText="Yes, Cancel"
        cancelText="Keep Subscription"
        type="danger"
        okLoading={isCanceling}
      />

      {/* Success Message */}
      <ConfirmMessage
        isOpen={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
        onOk={() => setShowSuccessMessage(false)}
        title="Subscription Canceled"
        description="Your subscription has been canceled successfully. You'll continue to have access until the end of your billing period."
        okText="OK"
        hideCancelButton={true}
      />

      {/* Error Message */}
      <ConfirmMessage
        isOpen={showErrorMessage}
        onClose={() => setShowErrorMessage(false)}
        onOk={() => setShowErrorMessage(false)}
        title="Error"
        description={
          errorMessage || "An error occurred while canceling your subscription."
        }
        okText="OK"
        type="danger"
        hideCancelButton={true}
      />

      {/* Subscription Details */}
      {subscription.subscriptionDetails && (
        <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200">
          <h4 className="text-base sm:text-lg font-semibold text-dark mb-4">
            Subscription Details
          </h4>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
              <span className="text-neutral-600 text-sm sm:text-base">
                Status:
              </span>
              <span className="font-semibold text-dark text-sm sm:text-base">
                {toTitleCase(status)}
              </span>
            </div>
            {subscription.subscriptionDetails.currentPeriodStart && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-neutral-600 text-sm sm:text-base">
                  Current Period Start:
                </span>
                <span className="font-semibold text-dark text-sm sm:text-base break-words">
                  {formatDate(
                    subscription.subscriptionDetails.currentPeriodStart,
                  )}
                </span>
              </div>
            )}
            {subscription.subscriptionDetails.currentPeriodEnd && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-neutral-600 text-sm sm:text-base">
                  Current Period End:
                </span>
                <span className="font-semibold text-dark text-sm sm:text-base break-words">
                  {formatDate(
                    subscription.subscriptionDetails.currentPeriodEnd,
                  )}
                </span>
              </div>
            )}
            {subscription.billingCycle && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-neutral-600 text-sm sm:text-base">
                  Billing Cycle:
                </span>
                <span className="font-semibold text-dark text-sm sm:text-base capitalize">
                  {subscription.billingCycle}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
