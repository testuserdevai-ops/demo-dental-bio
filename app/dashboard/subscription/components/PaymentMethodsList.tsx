"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle, CreditCard, Plus, Trash } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { apiClient } from "@/services/apiClient";
import type { PaymentMethodsProps } from "./payment-methods-shared";

type Confirmation = { kind: "default" | "remove"; id: string } | null;

export function PaymentMethodsList({
  customerId,
  paymentMethods,
  error,
  onRefresh,
}: PaymentMethodsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const stripe = useStripe();
  const elements = useElements();
  const manage = useMutation({
    mutationFn: async (action: Exclude<Confirmation, null>) => {
      if (action.kind === "remove")
        return apiClient.delete("/api/subscription/payment-methods", {
          paymentMethodId: action.id,
        });
      return apiClient.post("/api/subscription/payment-methods", {
        paymentMethodId: action.id,
      });
    },
    retry: false,
    onSuccess: async (_data, action) => {
      await onRefresh();
      setConfirmation(null);
      toast.success(
        action.kind === "remove"
          ? "Payment method removed"
          : "Default payment method updated",
      );
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!stripe || !elements) throw new Error("Payment form is not ready");
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Payment form is not ready");
      const result = await stripe.createPaymentMethod({ type: "card", card });
      if (result.error || !result.paymentMethod)
        throw result.error ?? new Error("Payment method could not be created");
      await apiClient.post("/api/subscription/payment-methods", {
        paymentMethodId: result.paymentMethod.id,
      });
      return card;
    },
    retry: false,
    onSuccess: async (card) => {
      card.clear();
      await onRefresh();
      setShowAddForm(false);
      toast.success("Payment method added");
    },
  });

  const clearCard = () => {
    elements?.getElement(CardElement)?.clear();
    add.reset();
    setShowAddForm(false);
  };

  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Payment methods could not be loaded</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!customerId) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
        <CreditCard
          aria-hidden="true"
          className="mx-auto mb-4 size-12 text-muted-foreground"
        />
        <p className="text-muted-foreground">
          No customer account found. Create a subscription first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {paymentMethods.length > 0 ? (
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const label = `${method.card.brand} ending ${method.card.last4}`;
            return (
              <article
                key={method.id}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <CreditCard
                    aria-hidden="true"
                    className="size-9 shrink-0 text-primary"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold capitalize">
                        {method.card.brand} •••• {method.card.last4}
                      </h4>
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle
                            aria-hidden="true"
                            className="size-4"
                            weight="fill"
                          />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires {String(method.card.expMonth).padStart(2, "0")}/
                      {method.card.expYear}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {!method.isDefault && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Set ${label} as default`}
                      onClick={() => {
                        manage.reset();
                        setConfirmation({ kind: "default", id: method.id });
                      }}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    aria-label={`Remove ${label}`}
                    onClick={() => {
                      manage.reset();
                      setConfirmation({ kind: "remove", id: method.id });
                    }}
                  >
                    <Trash aria-hidden="true" className="size-5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <CreditCard
            aria-hidden="true"
            className="mx-auto mb-4 size-12 text-muted-foreground"
          />
          <p className="text-muted-foreground">No payment methods found.</p>
        </div>
      )}

      {showAddForm ? (
        <form
          className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate();
          }}
        >
          <div>
            <h4 className="text-lg font-semibold">Add payment method</h4>
            <p className="text-sm text-muted-foreground">
              Card details are handled securely by Stripe.
            </p>
          </div>
          <div
            className="rounded-2xl border border-border bg-white p-4 focus-within:ring-2 focus-within:ring-ring"
            aria-label="Card details"
          >
            <CardElement
              options={{
                style: { base: { fontSize: "16px", color: "#1c1c21" } },
              }}
            />
          </div>
          {add.isError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Payment method was not added</AlertTitle>
              <AlertDescription>
                {add.error instanceof Error
                  ? add.error.message
                  : "The update failed"}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!stripe} isPending={add.isPending}>
              Add payment method
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearCard}
              disabled={add.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full border-dashed py-6"
          onClick={() => setShowAddForm(true)}
        >
          <Plus aria-hidden="true" className="size-5" />
          Add payment method
        </Button>
      )}

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.kind === "remove"
                ? "Remove payment method?"
                : "Set default payment method?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.kind === "remove"
                ? "This card will no longer be available for future payments."
                : "Future subscription payments will use this card by default."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {manage.isError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Payment method was not updated</AlertTitle>
              <AlertDescription>
                {manage.error instanceof Error
                  ? manage.error.message
                  : "The update failed"}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={manage.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmation || manage.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (confirmation) manage.mutate(confirmation);
              }}
            >
              {manage.isPending
                ? "Updating…"
                : confirmation?.kind === "remove"
                  ? "Remove"
                  : "Set as default"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
