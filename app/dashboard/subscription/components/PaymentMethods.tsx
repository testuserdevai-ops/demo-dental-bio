"use client";

import { PaymentMethodsList } from "./PaymentMethodsList";

import { CreditCard } from "@phosphor-icons/react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

import type { PaymentMethodsProps } from "./payment-methods-shared";

export default function PaymentMethods(props: PaymentMethodsProps) {
  if (!props.customerId || !stripePromise) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
        <CreditCard size={48} className="mx-auto text-neutral-400 mb-4" />
        <p className="text-neutral-600 text-sm sm:text-base mb-4">
          No customer account found. Please create a subscription first.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsList {...props} />
    </Elements>
  );
}
