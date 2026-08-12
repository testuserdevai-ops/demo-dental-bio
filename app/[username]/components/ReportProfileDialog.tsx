"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Warning } from "@phosphor-icons/react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import {
  reportCategories,
  reportCategoryLabels,
  submitProfileReportSchema,
} from "@/lib/reporting/contract";

import type { z } from "zod";

type ReportFormValues = z.input<typeof submitProfileReportSchema>;

type ReportProfileDialogProps = {
  brandName: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  profileId: string;
  username: string;
};

export function ReportProfileDialog({
  brandName,
  open,
  onOpenChange,
  profileId,
  username,
}: ReportProfileDialogProps) {
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(submitProfileReportSchema),
    defaultValues: {
      profileId,
      category: undefined,
      details: "",
      reporterEmail: "",
    },
  });
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [reference, setReference] = React.useState<string | null>(null);
  const [duplicate, setDuplicate] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(
    null,
  );

  function closeAndReset() {
    onOpenChange(false);
    setConfirmationOpen(false);
    setReference(null);
    setDuplicate(false);
    setSubmissionError(null);
    form.reset({
      profileId,
      category: undefined,
      details: "",
      reporterEmail: "",
    });
  }

  async function submitReport() {
    const parsed = submitProfileReportSchema.safeParse(form.getValues());
    if (!parsed.success) return;

    setSubmissionError(null);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);

    if (!response) {
      setSubmissionError(
        "The report could not be submitted. Your details are still here.",
      );
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      reference?: string;
      duplicate?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !payload?.reference) {
      setSubmissionError(
        payload?.error ??
          "The report could not be submitted. Your details are still here.",
      );
      return;
    }

    setReference(payload.reference);
    setDuplicate(Boolean(payload.duplicate));
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !form.formState.isSubmitting) closeAndReset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {reference ? (
            <>
              <DialogHeader>
                <DialogTitle>Report received</DialogTitle>
                <DialogDescription>
                  Thank you for helping us keep public profiles trustworthy.
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertTitle>
                  {duplicate ? "This concern is already recorded" : "Reference"}
                </AlertTitle>
                <AlertDescription>
                  Keep <strong>{reference}</strong> if you contact support. The
                  profile owner cannot see your contact details or internal
                  moderation notes.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" onClick={closeAndReset}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report @{username}</DialogTitle>
                <DialogDescription>
                  Tell the {brandName} moderation team what needs review. A
                  report does not automatically remove or suspend a profile.
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-5"
                onSubmit={form.handleSubmit(() => setConfirmationOpen(true))}
              >
                {submissionError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>Report not submitted</AlertTitle>
                    <AlertDescription>{submissionError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="report-category"
                  >
                    What is the concern?
                  </label>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="report-category"
                          aria-invalid={Boolean(form.formState.errors.category)}
                          aria-describedby={
                            form.formState.errors.category
                              ? "report-category-error"
                              : undefined
                          }
                        >
                          <SelectValue placeholder="Choose a report category" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {reportCategoryLabels[category]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.category ? (
                    <p
                      className="text-sm font-medium text-destructive"
                      id="report-category-error"
                    >
                      Choose the closest category.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="report-details"
                  >
                    Details <span className="font-normal">(optional)</span>
                  </label>
                  <Textarea
                    {...form.register("details")}
                    id="report-details"
                    maxLength={2000}
                    rows={5}
                    aria-invalid={Boolean(form.formState.errors.details)}
                    aria-describedby="report-details-help report-details-error"
                    placeholder="Describe what you saw. Do not include clinical or highly sensitive personal information."
                  />
                  <p
                    className="text-xs text-muted-foreground"
                    id="report-details-help"
                  >
                    Required when “Something else” is selected. 10–2,000
                    characters when provided.
                  </p>
                  {form.formState.errors.details ? (
                    <p
                      className="text-sm font-medium text-destructive"
                      id="report-details-error"
                    >
                      {form.formState.errors.details.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="report-email"
                  >
                    Contact email{" "}
                    <span className="font-normal">(optional)</span>
                  </label>
                  <Input
                    {...form.register("reporterEmail")}
                    autoComplete="email"
                    id="report-email"
                    maxLength={254}
                    type="email"
                    aria-invalid={Boolean(form.formState.errors.reporterEmail)}
                    aria-describedby="report-email-help report-email-error"
                    placeholder="you@example.com"
                  />
                  <p
                    className="text-xs text-muted-foreground"
                    id="report-email-help"
                  >
                    Used only if the moderation team needs clarification. It is
                    not shared with the profile owner and expires after one
                    year.
                  </p>
                  {form.formState.errors.reporterEmail ? (
                    <p
                      className="text-sm font-medium text-destructive"
                      id="report-email-error"
                    >
                      Enter a valid email address.
                    </p>
                  ) : null}
                </div>

                <Alert>
                  <Warning aria-hidden="true" className="size-5" />
                  <AlertTitle>Before you continue</AlertTitle>
                  <AlertDescription>
                    The immutable profile ID, current public URL, category,
                    details, and optional email are submitted to authorized
                    moderators. Reports are not anonymous to the moderation
                    team.
                  </AlertDescription>
                </Alert>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeAndReset}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Review report</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends the report to the {brandName} moderation queue. It does
              not immediately change the public profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmationOpen(false);
                void form.handleSubmit(submitReport)();
              }}
            >
              Submit report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
