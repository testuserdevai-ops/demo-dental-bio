"use client";

import {
  ArrowClockwise,
  SealCheck,
  ShieldWarning,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/app/components/ui/skeleton";
import { usePreview } from "@/app/contexts/PreviewContext";
import { apiClient } from "@/services/apiClient";
import {
  adminVerificationUserSchema,
  type AdminVerificationUser,
} from "../_lib/schemas";

type AdminVerificationPanelProps = { targetUserId: string };
const key = (targetUserId: string) =>
  ["admin", "verification-user", targetUserId] as const;

export default function AdminVerificationPanel({
  targetUserId,
}: AdminVerificationPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { triggerReload } = usePreview();
  const user = useQuery({
    queryKey: key(targetUserId),
    queryFn: async () => {
      const response = await apiClient.get<unknown>(
        `/api/admin/user?targetUserId=${encodeURIComponent(targetUserId)}`,
      );
      const parsed = adminVerificationUserSchema.safeParse(response);
      if (!parsed.success) throw new Error("Invalid target user response");
      return parsed.data;
    },
    retry: false,
  });
  const update = useMutation({
    mutationFn: (isVerified: boolean) =>
      apiClient.post("/api/admin/verification", {
        targetUserId,
        isVerified,
      }),
    retry: false,
    onSuccess: async (_response, isVerified) => {
      queryClient.setQueryData<AdminVerificationUser>(
        key(targetUserId),
        (current) => (current ? { ...current, isVerified } : current),
      );
      setConfirmOpen(false);
      triggerReload();
      toast.success(
        isVerified ? "Verification granted" : "Verification removed",
      );
    },
  });

  if (user.isPending) {
    return (
      <div className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (user.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Target account could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{user.error.message}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => user.refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const next = !user.data.isVerified;
  return (
    <section className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manage account verification</h2>
          <p className="text-sm text-muted-foreground">
            Grant or remove the verification badge for this account.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => user.refetch()}
          isPending={user.isFetching}
        >
          <ArrowClockwise aria-hidden="true" className="size-5" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {user.data.isVerified ? (
            <SealCheck
              aria-hidden="true"
              className="size-8 shrink-0 text-sky-500"
              weight="fill"
            />
          ) : (
            <ShieldWarning aria-hidden="true" className="size-8 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Account</p>
            <p className="truncate font-semibold">
              {user.data.username || user.data.id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              user.data.isVerified
                ? "bg-sky-100 text-sky-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {user.data.isVerified ? "Verified" : "Not verified"}
          </span>
          <Button
            type="button"
            variant={user.data.isVerified ? "destructive" : "default"}
            onClick={() => {
              update.reset();
              setConfirmOpen(true);
            }}
          >
            {user.data.isVerified ? "Remove verification" : "Mark as verified"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {next ? "Mark account as verified?" : "Remove verification?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {next
                ? "This grants a verification badge and updates trust indicators across the platform."
                : "The verification badge will be removed immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {update.isError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Verification status was not changed</AlertTitle>
              <AlertDescription>
                {update.error instanceof Error
                  ? update.error.message
                  : "The update failed"}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={update.isPending}
              onClick={(event) => {
                event.preventDefault();
                update.mutate(next);
              }}
            >
              {update.isPending
                ? "Updating…"
                : next
                  ? "Mark as verified"
                  : "Remove verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
