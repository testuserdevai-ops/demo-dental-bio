import type { SubscriptionPaymentMethod } from "@/lib/subscription/contracts";

export interface PaymentMethodsProps {
  customerId: string | null;
  paymentMethods: SubscriptionPaymentMethod[];
  error: string | null;
  onRefresh(): Promise<unknown>;
}

export type PaymentMethod = SubscriptionPaymentMethod;
