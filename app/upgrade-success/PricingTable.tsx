"use client";

import React, { useState, useEffect } from "react";
import Stripe from "stripe";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

interface PricingTableProps {
  email: string;
}

interface PlanDetails {
  features: string[];
  orangeFeatures: string[];
  cta: string;
  mostPopular: boolean;
}

interface Plan {
  productId?: string; // Added this line
  name: string;
  prices?: {
    monthly?: Stripe.Price;
    annually?: Stripe.Price;
  };
  features: string[];
  orangeFeatures: string[];
  cta: string;
  mostPopular: boolean;
  isFree?: boolean;
}

const planDetails: { [key: string]: PlanDetails } = {
  "PRO": {
    // Updated Details for PRO
    features: [
      "Reg No.",
      "About me",
      "Work: Multi-location",
      "Profile photo",
      "Unlimited links",
      "Link thumbnails",
      "Social icons",
      "Blogging (SEO)",
      "Gallery",
      "Videos tab",
      "Shop tab",
      "Blue tick verification",
    ],
    orangeFeatures: [
      "Blogging (SEO)",
      "Gallery",
      "Videos tab",
      "Shop tab",
      "Blue tick verification",
    ],
    cta: "Upgrade plan",
    mostPopular: true,
  },
  "PREMIUM PRO": {
    // Updated Details for PREMIUM PRO
    features: [
      "Reg No.",
      "About me",
      "Work: Multi-location",
      "Profile photo",
      "Unlimited links",
      "Link thumbnails",
      "Social icons",
      "Blogging (SEO)",
      "Gallery",
      "Videos tab",
      "Shop tab",
      "Blue tick verification",
      "Custom Domain Integration",
      "No Dentalbio Logo",
      "Priority Support",
    ],
    orangeFeatures: [
      "Blogging (SEO)",
      "Gallery",
      "Videos tab",
      "Shop tab",
      "Blue tick verification",
      "Custom Domain Integration",
      "No Dentalbio Logo",
      "Priority Support",
    ],
    cta: "Upgrade plan",
    mostPopular: false,
  },
  "FREE": {    // Updated Details for FREE
    features: [
      "Reg No.",
      "About me",
      "Work: Single location",
      "Profile photo",
      "Unlimited links",
      "Link thumbnails",
      "Social icons",
    ],
    orangeFeatures: [],
    cta: "Current",
    mostPopular: false,
  },
};

const planOrder: { [key: string]: number } = {
  'FREE': 1,
  'PRO': 2,
  'PREMIUM PRO': 3
};

const PricingTable: React.FC<PricingTableProps> = ({ email }) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "monthly"
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan>();
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly");
  };

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      const supabase = createClient();
      const userId = await getEffectiveUserId({ targetUserId: null, supabase });
      const { data, error } = await supabase.from('users').select('subscription_status, subscription_id').eq('id', userId);

      if (data && data.length > 0) {
        if (data[0].subscription_status === "PRO") {
          setSubscriptionStatus('PRO');
        } else if (data[0].subscription_status === "PREMIUM PRO") {
          setSubscriptionStatus('PREMIUM PRO');
        } else {
          setSubscriptionStatus('FREE');
        }
        setSubscriptionId(data[0].subscription_id);
      }
    };
    fetchSubscriptionStatus();
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
              features: planDetails[product.name]?.features || [],
              orangeFeatures: planDetails[product.name]?.orangeFeatures || [],
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
  }, []);

  useEffect(() => {
    setCurrentPlan(plans.filter(plan => plan.name === subscriptionStatus)[0]);
  }, [plans, subscriptionStatus]);

  const handleUpdate = async (priceId: string, planName: string) => {
    const response = await fetch("/api/subscribe", {
      method: "PUT",
      body: JSON.stringify({ priceId, subscription_status: planName })
    });

    const data = await response.json();
    console.log(data);

    setSubscriptionStatus(planName || "FREE");
  }

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
        window.location.href = data.url;
      } else {
        console.error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
    }
  }

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (subscriptionId) {
      handleUpdate(priceId, planName);
    } else {
      handleCreate(priceId);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-transparent flex-col md:flex-row justify-center md:justify-between gap-5 pb-10 md:pb-20 pt-20 md:pt-28 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl lg:text-4xl xl:text-5xl font-medium z-[9999] text-center">
          Unlock Pro features and SEO benefits
        </h2>

        <div className="flex justify-center items-center gap-3">
          <button
            className={`${billingCycle === "annually"
              ? " text-dark"
              : " text-white bg-primary-1"
              } py-2 md:py-3 border-primary-1 z-[9999] px-3 md:px-6 rounded-lg border`}
            onClick={toggleBillingCycle}
          >
            Monthly
          </button>
          <button
            className={`${billingCycle === "monthly"
              ? " text-dark"
              : " text-white bg-primary-1"
              } py-2 md:py-3 border-primary-1 z-[9999] px-3 md:px-6 rounded-lg border`}
            onClick={toggleBillingCycle}
          >
            Annually
          </button>
        </div>
      </div>

      <div className="blured-bg-1 mx-auto"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-5  w-full max-w-7xl mx-auto">
        <AnimatePresence mode="sync">
          {plans.map((plan) => {
            const key = billingCycle + plan.name;
            if (plan.isFree) {
              // Render the Free plan
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className={`relative border z-[9999] border-neutral-200 md:border-white shadow-xl md:shadow-sm h-min bg-white rounded-xl p-8 ${plan.mostPopular ? "" : " "
                    }`}
                >
                  {plan.mostPopular && (
                    <div className="absolute -top-5 right-5 font-medium rounded-lg px-3 py-3 bg-[#d46466] text-white text-sm">
                      Most popular
                    </div>
                  )}
                  <div className="block md:hidden mb-10">
                    <span className="flex justify-between items-center w-full text-center text-[22px] bg-green-600 text-white py-3 px-5 rounded-full font-semibold">
                      Current plan
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="text-left flex flex-col">
                    <h3 className="text-lg font-normal uppercase text-primary-orange-1">
                      {plan.name}
                    </h3>
                    <div className="text-5xl font-semibold">£0</div>
                    <p className="text-primary-orange-1">Free for life :)</p>
                  </div>
                  <hr className="my-6" />
                  <ul className="text-sm space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke={
                            plan.orangeFeatures.includes(feature)
                              ? "#E97348"
                              : "#7977ED"
                          } // Dynamic stroke color
                          className="size-7 mr-3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>

                        <span
                          className={`text-lg font-medium ${plan.orangeFeatures.includes(feature)
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
                    <span className="flex justify-between items-center w-full text-center text-[22px] bg-green-600 text-white py-3 px-5 rounded-full font-semibold">
                      Current plan
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </span>
                  </div>
                </motion.div>
              );
            } else {
              // Render paid plans
              const price = plan.prices?.[billingCycle];
              if (!price) return null; // Skip if no price for billing cycle

              const priceAmount = (price.unit_amount! / 100).toLocaleString(
                "en-GB",
                {
                  style: "currency",
                  currency: price.currency.toUpperCase(),
                  minimumFractionDigits: 0,
                }
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
                  className={`relative border border-neutral-200 md:border-white shadow-xl md:shadow-sm z-[9999] h-min bg-white rounded-xl p-8 ${plan.mostPopular ? "" : " "
                    }`}
                >
                  {plan.mostPopular && (
                    <div className="absolute -top-5 right-5 font-medium rounded-lg px-3 py-3 bg-[#d46466] text-white text-sm">
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
                      <li key={i} className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke={(plan.orangeFeatures.includes(feature) && !currentPlan?.features.includes(feature))
                            ? "#E97348"
                            : "#7977ED"
                          } // Dynamic stroke color
                          className="size-7 mr-3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>

                        <span
                          className={`text-lg truncate font-medium ${(plan.orangeFeatures.includes(feature) && !currentPlan?.features.includes(feature))
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
                      onClick={() => handleSubscribe(price.id, plan.name)}
                      className={`flex justify-between items-center w-full text-center text-[22px] bg-gradient-to-r text-white py-3 px-5 rounded-full font-semibold hover:opacity-90 transition ${plan.name === subscriptionStatus ? 'bg-green-600' : planOrder[plan.name] > planOrder[subscriptionStatus!] ? 'bg-gradient-to-r from-[#e7b274] to-[#d46466]' : 'bg-red-400'
                        }`}
                      disabled={plan.name === subscriptionStatus}
                    >
                      {plan.name === subscriptionStatus ? 'Current' : planOrder[plan.name] > planOrder[subscriptionStatus!] ? 'Upgrade Plan' : 'Downgrade Plan'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="size-7"
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
            }
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PricingTable;
