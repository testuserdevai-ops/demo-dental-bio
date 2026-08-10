"use client";

import React, { useState, useEffect } from "react";
import Stripe from "stripe";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  confirmMessageForPricing,
  planDetails,
} from "@/utils/global_constants";
import RoundedButton from "../components/Button/RoundedButton";
import { fillTemplate } from "@/utils/functions/functions";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Loader from "../components/Loader/Loader";
import { useRouter } from "next/navigation";
import { resolveBrand } from "@/utils/functions/functions";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

interface PricingTableProps {
  email: string;
}

const planOrder: { [key: string]: number } = {
  FREE: 1,
  PRO: 2,
  "PREMIUM PRO": 3,
};

export const isValidProrationAmount = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isFinite(amount);

const PricingTable: React.FC<PricingTableProps> = ({ email }) => {
  const stripe = useStripe()!;
  const elements = useElements()!;
  const domainConfig = useDomainConfig();
  const router = useRouter();

  const [cardComplete, setCardComplete] = useState(false);

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "monthly",
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [targetPlan, setTargetPlan] = useState<Plan>();
  const [targetPlanName, setTargetPlanName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSuccessfulProration, setHasSuccessfulProration] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [currentBillingCycle, setCurrentBillingCycle] = useState<
    "monthly" | "annually"
  >("monthly");
  const [operationType, setOperationType] = useState<string>("");

  const [confirmMessageData, setConfirmMessageData] = useState(
    confirmMessageForPricing.upgrade,
  );
  const requiresSuccessfulProration = Boolean(
    subscriptionId && targetPlanName !== "FREE",
  );
  const currentPlan = plans.find((plan) => plan.name === subscriptionStatus);

  const fetchSubscriptionStatus = async () => {
    const supabase = createClient();
    const userId = await getEffectiveUserId({ targetUserId: null, supabase });
    const { data, error } = await supabase
      .from("users")
      .select(
        "customer_id, subscription_status, subscription_id, billing_cycle",
      )
      .eq("id", userId)
      .single();

    if (error) {
      return;
    }

    if (data.subscription_status === "PRO") {
      setSubscriptionStatus("PRO");
    } else if (data.subscription_status === "PREMIUM PRO") {
      setSubscriptionStatus("PREMIUM PRO");
    } else {
      setSubscriptionStatus("FREE");
    }
    setSubscriptionId(data.subscription_id);
    setCurrentBillingCycle(data.billing_cycle ?? "monthly");
    setCustomerId(data.customer_id ?? "");
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete); // true if the card input is complete
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchSubscriptionStatus();
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        const prices: Stripe.Price[] = data.prices;

        // Group prices by product ID
        const productPrices: { [key: string]: Plan } = {};

        prices.forEach((price) => {
          const product = price.product as Stripe.Product;
          const productId = product.id;

          // Determine billing interval
          const interval = price.recurring?.interval;
          const billingKey =
            interval === "month"
              ? "monthly"
              : interval === "year"
                ? "annually"
                : null;

          if (!billingKey) return; // Skip non-recurring prices

          if (!productPrices[productId]) {
            // Initialize plan with details from planDetails mapping
            productPrices[productId] = {
              productId: productId, // Store the productId
              name: product.name,
              prices: {},
              features: resolveBrand(
                planDetails[product.name]?.features || [],
                domainConfig.brandName,
              ),
              orangeFeatures: resolveBrand(
                planDetails[product.name]?.orangeFeatures || [],
                domainConfig.brandName,
              ),
              cta: planDetails[product.name]?.cta || "Sign up",
              mostPopular: planDetails[product.name]?.mostPopular || false,
            };
          }

          // Assign price to billing cycle
          productPrices[productId].prices![billingKey] = price;
        });

        // Convert to array and sort plans
        const plansArray = Object.values(productPrices).sort((a, b) => {
          return planOrder[a.name] - planOrder[b.name];
        });

        setPlans(plansArray);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch prices:", error);
      }
    };

    fetchPrices();
  }, [domainConfig.brandName]);

  const handleUpdate = async () => {
    if (
      isCalculating ||
      isUpdating ||
      (requiresSuccessfulProration && !hasSuccessfulProration)
    ) {
      return;
    }

    setConfirmError(null);
    setIsUpdating(true);
    try {
      if (targetPlanName === "FREE") {
        const response = await fetch("/api/subscription/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionId,
          }),
        });
        if (!response.ok) throw new Error("Unable to cancel subscription");
      } else {
        const card = elements?.getElement(CardElement);
        if (!card) throw new Error("Payment details are unavailable");

        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: "card",
          card,
        });
        if (error || !paymentMethod) {
          throw error ?? new Error("Unable to create payment method");
        }

        if (subscriptionId) {
          const response = await fetch("/api/subscription/upgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId,
              subscriptionId,
              newPriceId: targetPlan?.prices![billingCycle].id,
              paymentMethodId: paymentMethod.id,
            }),
          });
          if (!response.ok) throw new Error("Unable to update subscription");
        } else {
          const response = await fetch("/api/subscription/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId,
              priceId: targetPlan?.prices![billingCycle].id,
              paymentMethodId: paymentMethod.id,
            }),
          });
          if (!response.ok) throw new Error("Unable to create subscription");

          const result = await response.json();
          if (result.status === "requires_action") {
            const { error: confirmationError } =
              await stripe.confirmCardPayment(result.clientSecret);
            if (confirmationError) throw confirmationError;
          }
        }
      }

      router.push("/upgrade-success");
      setIsConfirmationOpen(false);
      setHasSuccessfulProration(false);
    } catch (error) {
      console.error("Subscription update failed:", error);
      setConfirmError("Your plan could not be updated. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreate = async (priceId: string) => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId, email }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.assign(data.url);
      } else {
        console.error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
    }
  };

  const handleSubscribe = async (
    plan: Plan,
    priceId: string,
    planName: string,
  ) => {
    setConfirmError(null);
    setHasSuccessfulProration(false);
    setTargetPlan(plan);
    setTargetPlanName(planName);

    let details: Record<string, string | number> = {
      currentPlan: currentPlan?.name!,
      newPlan: plan.name,
      price: `£${plan.prices![billingCycle].unit_amount! / 100}`,
      interval: billingCycle,
      prorate: "Calcultaing...",
    };

    if (subscriptionId) {
      if (planName === "FREE") {
        setOperationType("cancel");
        setConfirmMessageData(confirmMessageForPricing.cancel);
        setIsConfirmationOpen(true);
        return;
      }

      let type = "";

      if (planName === currentPlan?.name) {
        if (billingCycle === "annually") {
          type = "switchToAnnual";
        } else {
          type = "switchToMonthly";
        }
      } else if (planName === "PRO") {
        type = "downgrade";
      } else {
        type = "upgrade";
      }

      setOperationType(type);

      setIsCalculating(true);
      setConfirmMessageData({
        ...confirmMessageForPricing[type],
        content: fillTemplate(confirmMessageForPricing[type].content, details),
      });
      setIsConfirmationOpen(true);

      try {
        const response = await fetch("/api/subscription/proration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            subscriptionId,
            newPriceId: priceId,
          }),
        });
        if (!response.ok) throw new Error("Unable to calculate proration");

        const { amountDue } = await response.json();
        if (!isValidProrationAmount(amountDue)) {
          throw new Error("Invalid proration amount");
        }
        details.prorate = `£${amountDue}`;
        setConfirmMessageData({
          ...confirmMessageForPricing[type],
          content: fillTemplate(
            confirmMessageForPricing[type].content,
            details,
          ),
        });
        setHasSuccessfulProration(true);
      } catch (error) {
        console.error("Subscription proration failed:", error);
        setHasSuccessfulProration(false);
        setConfirmError(
          "We could not calculate this change. Please try again.",
        );
      } finally {
        setIsCalculating(false);
      }
    } else {
      handleCreate(priceId);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="relative w-full px-3 md:px-6">
      {/* Current Plan Info Box */}
      <div className="flex items-center bg-transparent flex-col md:flex-row justify-center md:justify-between gap-5 pb-10 md:pb-20 pt-20 md:pt-28 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl lg:text-4xl xl:text-5xl font-medium z-[40] text-center">
          Unlock Pro features and SEO benefits
        </h2>

        <div className="flex justify-center items-center gap-3">
          <RoundedButton
            buttonType={billingCycle === "monthly" ? "primary" : "outlined"}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </RoundedButton>
          <RoundedButton
            buttonType={billingCycle === "annually" ? "primary" : "outlined"}
            onClick={() => setBillingCycle("annually")}
          >
            Annually
          </RoundedButton>
        </div>
      </div>
      <div className="blured-bg-1 mx-auto"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-5 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="sync">
          {plans.map((plan) => {
            const key = billingCycle + plan.name;
            // Render paid plans
            const price = plan.prices?.[billingCycle];
            if (!price) return null; // Skip if no price for billing cycle

            const priceAmount = (price.unit_amount! / 100).toLocaleString(
              "en-GB",
              {
                style: "currency",
                currency: price.currency.toUpperCase(),
                minimumFractionDigits: 0,
              },
            );

            const description =
              billingCycle === "monthly"
                ? "Per month"
                : `Each year, save £${(
                    (plan.prices?.monthly?.unit_amount! * 12 -
                      price.unit_amount!) /
                      100 || 0
                  ).toFixed(0)}`;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`relative border border-neutral-200 md:border-white shadow-xl md:shadow-sm z-[40] h-min bg-white rounded-xl p-8 md:p-4 lg:p-8 ${
                  plan.mostPopular ? "" : " "
                }`}
              >
                {plan.mostPopular && (
                  <div className="absolute -top-5 right-5 font-medium rounded-lg px-3 py-3 bg-accent-coral text-white text-sm">
                    Most popular
                  </div>
                )}

                <div className="text-left flex flex-col">
                  <h3 className="text-lg font-normal uppercase text-primary-orange-1">
                    {plan.name}
                  </h3>
                  <div className="text-5xl font-semibold">{priceAmount}</div>
                  <p className="text-primary-orange-1">{description}</p>
                </div>
                <hr className="my-6" />
                <ul className="text-sm space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke={
                          plan.orangeFeatures.includes(feature) &&
                          !currentPlan?.features.includes(feature)
                            ? "var(--color-accent-orange, #E97348)"
                            : "var(--color-accent-purple-light, #7977ED)"
                        } // Dynamic stroke color
                        className="w-5 h-5 min-w-5 mt-1 mr-3 aspect-square"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>

                      <span
                        className={`text-lg break-word font-medium ${
                          plan.orangeFeatures.includes(feature) &&
                          !currentPlan?.features.includes(feature)
                            ? "text-primary-orange-1"
                            : ""
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <button
                    onClick={() => handleSubscribe(plan, price.id, plan.name)}
                    className={`flex justify-between items-center w-full text-left text-xl md:text-base lg:text-[22px] bg-gradient-to-r text-white py-3 px-5 rounded-full font-semibold hover:opacity-90 transition ${
                      plan.name === subscriptionStatus
                        ? "bg-green-600"
                        : planOrder[plan.name] > planOrder[subscriptionStatus!]
                          ? "bg-gradient-to-r from-accent-amber to-accent-coral"
                          : "bg-red-400"
                    }`}
                    disabled={
                      plan.name === subscriptionStatus &&
                      (billingCycle === currentBillingCycle ||
                        plan.name === "FREE")
                    }
                  >
                    {plan.name === subscriptionStatus
                      ? billingCycle === currentBillingCycle ||
                        plan.name === "FREE"
                        ? "Current"
                        : "Change Cycle"
                      : planOrder[plan.name] > planOrder[subscriptionStatus!]
                        ? "Upgrade Plan"
                        : "Downgrade Plan"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-7 md:size-5 lg:size-7 min-w-7 md:min-w-5 lg:min-w-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={(open) => {
          if (!isCalculating && !isUpdating) {
            setIsConfirmationOpen(open);
            if (!open) {
              setConfirmError(null);
              setHasSuccessfulProration(false);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMessageData.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {confirmMessageData.content}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {operationType !== "cancel" && (
            <CardElement
              className="rounded border p-4"
              onChange={handleCardChange}
            />
          )}
          {confirmError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Plan was not updated</AlertTitle>
              <AlertDescription>{confirmError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isCalculating || isUpdating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmMessageData.type === "primary"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : undefined
              }
              disabled={
                isCalculating ||
                isUpdating ||
                (requiresSuccessfulProration && !hasSuccessfulProration) ||
                (operationType !== "cancel" && !cardComplete)
              }
              aria-busy={isCalculating || isUpdating || undefined}
              onClick={(event) => {
                event.preventDefault();
                void handleUpdate();
              }}
            >
              {isCalculating
                ? "Calculating…"
                : isUpdating
                  ? "Updating…"
                  : confirmMessageData.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PricingTable;
