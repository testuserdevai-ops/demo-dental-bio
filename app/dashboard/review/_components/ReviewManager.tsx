"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  PencilSimple,
  Star,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useState, type SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
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
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { usePreview } from "@/app/contexts/PreviewContext";
import type { ActionResult } from "@/lib/forms/action-result";
import type { ReviewAggregate, ReviewViewModel } from "../_lib/queries";
import type {
  CreateReviewInput,
  DeleteReviewInput,
  ExternalReviewPageInput,
  ReorderReviewsInput,
  UpdateReviewInput,
} from "../_lib/schemas";
import { externalReviewPageSchema } from "../_lib/schemas";
import {
  removeReviewImages,
  retryReviewImageCleanup,
  reviewImagePath,
  uploadReviewImage,
} from "../_lib/uploads";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };
type ReviewMutations = {
  create?: Mutation<CreateReviewInput>;
  update?: Mutation<UpdateReviewInput>;
  remove?: Mutation<DeleteReviewInput>;
  reorder?: Mutation<ReorderReviewsInput>;
  externalPage?: Mutation<ExternalReviewPageInput>;
};
type ReviewFormValues = {
  reviewerName: string;
  content: string;
  stars: number;
  platform: string;
  createdAt: string;
  imageFile?: File;
};
const reviewFormSchema = z.object({
  reviewerName: z.string().trim().min(1, "Reviewer name is required").max(100),
  content: z.string().trim().min(1, "Review content is required").max(500),
  stars: z.number().int().min(1).max(5),
  platform: z.string().trim().min(1, "Platform is required").max(50),
  createdAt: z.string().min(1, "Review date is required"),
  imageFile: z
    .custom<File>(
      (value) =>
        value === undefined ||
        (typeof File !== "undefined" && value instanceof File),
      "Choose a valid image",
    )
    .optional(),
});

function localDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 16)
    : date.toISOString().slice(0, 16);
}

import { ReviewForm } from "./ReviewForm";

import { ExternalPageForm } from "./ExternalPageForm";

function sameOrder(left: ReviewViewModel[], right: ReviewViewModel[]) {
  return (
    left.map(({ id }) => id).join(",") === right.map(({ id }) => id).join(",")
  );
}

export default function ReviewManager({
  reviews,
  externalPage,
  loading,
  enabled,
  userId,
  mutations,
}: {
  reviews: ReviewViewModel[];
  externalPage: ReviewAggregate["externalPage"];
  loading: boolean;
  enabled: boolean;
  userId: string;
  mutations: ReviewMutations;
}) {
  const { triggerReload } = usePreview();
  const [editor, setEditor] = useState<ReviewViewModel | "create" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewViewModel | null>(
    null,
  );
  const [draftState, setDraftState] = useState(() => ({
    source: reviews,
    value: reviews,
  }));
  const draft = draftState.source === reviews ? draftState.value : reviews;
  const setDraft = (next: SetStateAction<typeof reviews>) => {
    setDraftState((current) => {
      const currentDraft = current.source === reviews ? current.value : reviews;
      return {
        source: reviews,
        value: typeof next === "function" ? next(currentDraft) : next,
      };
    });
  };
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyReviewId, setBusyReviewId] = useState<number | null>(null);
  useEffect(() => {
    void retryReviewImageCleanup(userId);
  }, [userId]);

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    const changed = [...draft];
    const [item] = changed.splice(index, 1);
    changed.splice(next, 0, item);
    setDraft(changed);
    setNotice(`${item.reviewerName} moved to position ${next + 1}`);
  };
  const saveOrder = async () => {
    const result = await mutations.reorder!.mutateAsync({
      orderedIds: draft.map(({ id }) => id),
    });
    if (!result.ok) {
      setDraft(reviews);
      setError(result.formError ?? "Could not save review order");
      return;
    }
    setNotice("Review order saved");
    triggerReload();
  };
  const toggle = async (item: ReviewViewModel) => {
    setBusyReviewId(item.id);
    setError("");
    const result = await mutations.update!.mutateAsync({
      id: item.id,
      reviewerName: item.reviewerName,
      content: item.content,
      stars: item.stars,
      imageUrl: item.imageUrl,
      platform: item.platform,
      createdAt: item.createdAt,
      enabled: !item.enabled,
    });
    setBusyReviewId(null);
    if (!result.ok) {
      setError(result.formError ?? "Could not update review");
      return;
    }
    setDraft((current) =>
      current.map((review) =>
        review.id === item.id ? { ...review, enabled: !item.enabled } : review,
      ),
    );
    setNotice(
      `${item.reviewerName} is now ${item.enabled ? "hidden" : "visible"}`,
    );
    triggerReload();
  };
  const remove = async () => {
    if (!deleteTarget) return;
    const result = await mutations.remove!.mutateAsync({ id: deleteTarget.id });
    if (!result.ok) {
      setError(result.formError ?? "Could not delete review");
      return;
    }
    const path = reviewImagePath(deleteTarget.imageUrl, userId);
    if (path) await removeReviewImages([path]);
    setDeleteTarget(null);
    triggerReload();
  };

  if (loading) return <p aria-live="polite">Loading reviews</p>;
  return (
    <section className="space-y-4" data-testid="review-manager">
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Your reviews</h3>
          <p className="text-sm text-muted-foreground">
            Manage the feedback displayed on your profile.
          </p>
        </div>
        <Button
          type="button"
          disabled={!enabled}
          onClick={() => setEditor("create")}
        >
          Add review
        </Button>
      </div>
      {draft.length ? (
        draft.map((item, index) => (
          <article
            key={item.id}
            className="flex max-h-44 min-h-28 flex-wrap items-center gap-3 overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-sm sm:max-h-40 sm:flex-nowrap sm:gap-4 sm:p-5"
          >
            <div className="flex shrink-0 flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Move ${item.reviewerName} up`}
                aria-label={`Move ${item.reviewerName} up`}
                disabled={!enabled || busyReviewId === item.id || index === 0}
                onClick={() => move(index, -1)}
              >
                <CaretUp aria-hidden="true" className="size-5" weight="bold" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Move ${item.reviewerName} down`}
                aria-label={`Move ${item.reviewerName} down`}
                disabled={
                  !enabled ||
                  busyReviewId === item.id ||
                  index === draft.length - 1
                }
                onClick={() => move(index, 1)}
              >
                <CaretDown
                  aria-hidden="true"
                  className="size-5"
                  weight="bold"
                />
              </Button>
            </div>
            <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-auto">
              <h4 className="truncate text-base font-semibold text-primary sm:text-lg">
                {item.reviewerName}
              </h4>
              <p className="line-clamp-2 text-sm text-foreground sm:text-base">
                {item.content}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="size-3.5" weight="fill" />
                  {item.stars}/5
                </span>
                <span aria-hidden="true">•</span>
                <span className="truncate">{item.platform}</span>
              </div>
            </div>
            <div className="ml-12 flex w-full items-center justify-end gap-1 sm:ml-0 sm:w-auto sm:shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Edit ${item.reviewerName}`}
                aria-label={`Edit ${item.reviewerName}`}
                disabled={!enabled || busyReviewId === item.id}
                onClick={() => setEditor(item)}
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title={`Delete ${item.reviewerName}`}
                aria-label={`Delete ${item.reviewerName}`}
                disabled={!enabled || busyReviewId === item.id}
                onClick={() => setDeleteTarget(item)}
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={item.enabled}
                disabled={!enabled || busyReviewId === item.id}
                aria-label={`${item.enabled ? "Hide" : "Show"} ${item.reviewerName}`}
                title={item.enabled ? "Hide from profile" : "Show on profile"}
                onClick={() => void toggle(item)}
              >
                {item.enabled ? (
                  <Eye aria-hidden="true" className="size-5 text-primary" />
                ) : (
                  <EyeSlash
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                )}
              </Button>
            </div>
          </article>
        ))
      ) : (
        <p>There is no review to show</p>
      )}
      {!sameOrder(draft, reviews) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft(reviews)}
          >
            Cancel order
          </Button>
          <Button type="button" onClick={() => void saveOrder()}>
            Save review order
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <ExternalPageForm
        link={externalPage?.link ?? ""}
        enabled={enabled}
        mutation={mutations.externalPage}
        onComplete={triggerReload}
      />
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor === "create" ? "Add" : "Edit"} review
            </DialogTitle>
            <DialogDescription>
              Add a review shown on your public profile.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <ReviewForm
              item={editor === "create" ? undefined : editor}
              userId={userId}
              mutations={mutations}
              onComplete={() => {
                setEditor(null);
                triggerReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the review from your public profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { ReviewClient } from "./ReviewClient";
