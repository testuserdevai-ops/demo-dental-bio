"use client";

import {
  CalendarIcon,
  CheckCircleIcon,
  CreditCardIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
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
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import type { SubscriptionPlan } from "@/lib/subscription/contracts";
import { apiClient } from "@/services/apiClient";
import { toTitleCase } from "@/utils/functions/functions";

const currency = (amount: number, code: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code.toUpperCase(),
  }).format(amount);
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

export default function CurrentPlanCard({
  subscription,
  onRefresh,
}: {
  subscription: SubscriptionPlan;
  onRefresh(): Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const details = subscription.subscriptionDetails;
  const isTrial =
    details?.status === "trialing" &&
    subscription.trialEnd &&
    new Date(subscription.trialEnd) > new Date();
  const isCanceled = details?.cancelAtPeriodEnd || false;
  const status = details?.status || "active";

  const cancel = async () => {
    if (!details?.id) {
      setError("No active subscription found");
      return;
    }
    setPending(true);
    setError("");
    try {
      await apiClient.post("/api/subscription/cancel", {
        subscriptionId: details.id,
      });
      await onRefresh();
      setOpen(false);
      toast.success("Subscription canceled");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Subscription could not be canceled",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-dark">
              {subscription.planName}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              {isTrial ? (
                <>
                  <CalendarIcon aria-hidden="true" className="size-5" />
                  <span>Trial ends {date(subscription.trialEnd)}</span>
                </>
              ) : (
                <>
                  <CreditCardIcon aria-hidden="true" className="size-5" />
                  <span>
                    {currency(subscription.price, subscription.currency)}/
                    {subscription.billingCycle === "annually"
                      ? "year"
                      : "month"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            {(status === "active" && !isCanceled) || isTrial ? (
              <CheckCircleIcon
                aria-hidden="true"
                className="size-6 text-green-600"
                weight="fill"
              />
            ) : (
              <XCircleIcon
                aria-hidden="true"
                className="size-6 text-orange-600"
                weight="fill"
              />
            )}
            <span className={isCanceled ? "text-orange-700" : "text-green-700"}>
              {isCanceled ? "Canceling" : toTitleCase(status)}
            </span>
          </div>
        </div>

        {subscription.renewalDate && !isCanceled && !isTrial && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted p-4 text-muted-foreground">
            <CalendarIcon aria-hidden="true" className="size-5" />
            <span>Renews on {date(subscription.renewalDate)}</span>
          </div>
        )}
        {isCanceled && subscription.renewalDate && (
          <Alert className="mt-5">
            <AlertTitle>Cancellation scheduled</AlertTitle>
            <AlertDescription>
              Access is scheduled to end on {date(subscription.renewalDate)}.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className={buttonVariants()}
            href="/upgrade"
            target="_blank"
            rel="noopener noreferrer"
          >
            {subscription.planName === "FREE" ? "Upgrade Plan" : "Change Plan"}
          </Link>
          {!isCanceled && details && (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setError("")}
                >
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This ends the current subscription and may issue a prorated
                    refund. Paid access may end immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>Subscription was not canceled</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>
                    Keep Subscription
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pending}
                    onClick={(event) => {
                      event.preventDefault();
                      void cancel();
                    }}
                  >
                    {pending ? "Canceling…" : "Cancel subscription"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>

      {details && (
        <section className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-dark">
            Subscription details
          </h3>
          <dl className="mt-4 space-y-3">
            <div className="flex flex-col justify-between gap-1 sm:flex-row">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold">{toTitleCase(status)}</dd>
            </div>
            {details.currentPeriodStart && (
              <div className="flex flex-col justify-between gap-1 sm:flex-row">
                <dt className="text-muted-foreground">Current period start</dt>
                <dd className="font-semibold">
                  {date(details.currentPeriodStart)}
                </dd>
              </div>
            )}
            {details.currentPeriodEnd && (
              <div className="flex flex-col justify-between gap-1 sm:flex-row">
                <dt className="text-muted-foreground">Current period end</dt>
                <dd className="font-semibold">
                  {date(details.currentPeriodEnd)}
                </dd>
              </div>
            )}
            <div className="flex flex-col justify-between gap-1 sm:flex-row">
              <dt className="text-muted-foreground">Billing cycle</dt>
              <dd className="font-semibold capitalize">
                {subscription.billingCycle}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
