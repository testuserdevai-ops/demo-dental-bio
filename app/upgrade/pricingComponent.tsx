"use client";

import React from "react";
import PricingTable from "./PricingTable";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function PricingComponent({ email }: { email: string }) {
  return (
    <div className="min-h-[100vh]">
      <Elements stripe={stripePromise}>
        <PricingTable email={email} /> {/* Show pricing table */}
      </Elements>
    </div>
  );
}
