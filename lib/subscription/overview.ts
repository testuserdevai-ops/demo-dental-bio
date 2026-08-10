import "server-only";

import stripe from "@/app/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";

import type {
  SubscriptionInvoice,
  SubscriptionOverview,
  SubscriptionPaymentMethod,
  SubscriptionPlan,
} from "./contracts";

type SubscriptionAuthority = {
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  billingCycle: string | null;
  customerId: string | null;
};

type ProviderSubscription = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  trialEnd: number | null;
  priceId: string | null;
  unitAmount: number | null;
  currency: string | null;
};

export type SubscriptionOverviewDependencies = {
  readAuthority(userId: string): Promise<SubscriptionAuthority | null>;
  retrieveSubscription(id: string): Promise<ProviderSubscription>;
  listPaymentMethods(customerId: string): Promise<SubscriptionPaymentMethod[]>;
  listInvoices(customerId: string): Promise<{
    invoices: SubscriptionInvoice[];
    hasMore: boolean;
    nextCursor: string | null;
  }>;
};

function isoFromSeconds(value: number | null) {
  return value ? new Date(value * 1_000).toISOString() : null;
}

function initialPlan(authority: SubscriptionAuthority): SubscriptionPlan {
  return {
    planName: authority.subscriptionStatus || "FREE",
    price: 0,
    currency: "usd",
    renewalDate: authority.currentPeriodEnd,
    billingCycle: authority.billingCycle,
    subscriptionDetails: null,
    trialEnd: authority.trialEnd,
  };
}

export async function buildSubscriptionOverview(
  userId: string,
  dependencies: SubscriptionOverviewDependencies,
): Promise<SubscriptionOverview | null> {
  const authority = await dependencies.readAuthority(userId);
  if (!authority) return null;

  const plan = initialPlan(authority);
  const subscriptionPromise = authority.subscriptionId
    ? dependencies.retrieveSubscription(authority.subscriptionId)
    : null;
  const paymentMethodsPromise = authority.customerId
    ? dependencies.listPaymentMethods(authority.customerId)
    : null;
  const invoicesPromise = authority.customerId
    ? dependencies.listInvoices(authority.customerId)
    : null;

  const [subscriptionResult, paymentMethodsResult, invoicesResult] =
    await Promise.all([
      subscriptionPromise
        ? subscriptionPromise.then(
            (value) => ({ status: "fulfilled" as const, value }),
            () => ({ status: "rejected" as const }),
          )
        : null,
      paymentMethodsPromise
        ? paymentMethodsPromise.then(
            (value) => ({ status: "fulfilled" as const, value }),
            () => ({ status: "rejected" as const }),
          )
        : null,
      invoicesPromise
        ? invoicesPromise.then(
            (value) => ({ status: "fulfilled" as const, value }),
            () => ({ status: "rejected" as const }),
          )
        : null,
    ]);

  if (subscriptionResult?.status === "fulfilled") {
    const subscription = subscriptionResult.value;
    const controlledPlan = subscription.priceId
      ? PRICE_ID_TO_PLAN[subscription.priceId]
      : null;
    plan.planName = controlledPlan?.plan ?? plan.planName;
    plan.price = subscription.unitAmount ? subscription.unitAmount / 100 : 0;
    plan.currency = subscription.currency || "usd";
    plan.renewalDate = isoFromSeconds(subscription.currentPeriodEnd);
    plan.subscriptionDetails = {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: isoFromSeconds(subscription.currentPeriodStart),
      currentPeriodEnd: isoFromSeconds(subscription.currentPeriodEnd),
      trialEnd: isoFromSeconds(subscription.trialEnd),
    };
  }

  return {
    customerId: authority.customerId,
    plan,
    paymentMethods: {
      items:
        paymentMethodsResult?.status === "fulfilled"
          ? paymentMethodsResult.value
          : [],
      error:
        paymentMethodsResult?.status === "rejected"
          ? "Payment methods are temporarily unavailable."
          : null,
    },
    billingHistory: {
      invoices:
        invoicesResult?.status === "fulfilled"
          ? invoicesResult.value.invoices
          : [],
      hasMore:
        invoicesResult?.status === "fulfilled"
          ? invoicesResult.value.hasMore
          : false,
      nextCursor:
        invoicesResult?.status === "fulfilled"
          ? invoicesResult.value.nextCursor
          : null,
      error:
        invoicesResult?.status === "rejected"
          ? "Billing history is temporarily unavailable."
          : null,
    },
  };
}

const productionDependencies: SubscriptionOverviewDependencies = {
  async readAuthority(userId) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "subscription_id, subscription_status, current_period_end, trial_end, billing_cycle, customer_id",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`Subscription read failed: ${error.message}`);
    if (!data) return null;
    return {
      subscriptionId: data.subscription_id,
      subscriptionStatus: data.subscription_status,
      currentPeriodEnd: data.current_period_end,
      trialEnd: data.trial_end,
      billingCycle: data.billing_cycle,
      customerId: data.customer_id,
    };
  },
  async retrieveSubscription(id) {
    const subscription = await stripe.subscriptions.retrieve(id, {
      expand: ["items.data.price.product"],
    });
    const price = subscription.items.data[0]?.price;
    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      trialEnd: subscription.trial_end,
      priceId: price?.id ?? null,
      unitAmount: price?.unit_amount ?? null,
      currency: price?.currency ?? null,
    };
  },
  async listPaymentMethods(customerId) {
    const [paymentMethods, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.customers.retrieve(customerId),
    ]);
    const defaultId =
      !("deleted" in customer && customer.deleted) &&
      customer.invoice_settings?.default_payment_method
        ? String(customer.invoice_settings.default_payment_method)
        : null;
    return paymentMethods.data.flatMap((paymentMethod) => {
      if (!paymentMethod.card) return [];
      return [
        {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
          },
          isDefault: paymentMethod.id === defaultId,
        },
      ];
    });
  },
  async listInvoices(customerId) {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
      expand: ["data.charge", "data.payment_intent"],
    });
    return {
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1_000).toISOString(),
        periodStart: isoFromSeconds(invoice.period_start),
        periodEnd: isoFromSeconds(invoice.period_end),
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        invoicePdf: invoice.invoice_pdf ?? null,
        description:
          invoice.description ||
          invoice.lines.data[0]?.description ||
          "Subscription",
      })),
      hasMore: invoices.has_more,
      nextCursor: invoices.data.at(-1)?.id ?? null,
    };
  },
};

export async function getSubscriptionOverview(userId: string) {
  return buildSubscriptionOverview(userId, productionDependencies);
}
