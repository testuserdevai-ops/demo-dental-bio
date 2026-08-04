export type SubscriptionPlan = {
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
};

export type SubscriptionPaymentMethod = {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
};

export type SubscriptionInvoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string | null;
  date: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  description: string;
};

export type SubscriptionOverview = {
  customerId: string | null;
  plan: SubscriptionPlan;
  paymentMethods: {
    items: SubscriptionPaymentMethod[];
    error: string | null;
  };
  billingHistory: {
    invoices: SubscriptionInvoice[];
    hasMore: boolean;
    nextCursor: string | null;
    error: string | null;
  };
};
