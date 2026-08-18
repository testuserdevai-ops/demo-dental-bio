"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useRef, useState, type SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
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
import { usePreview } from "@/app/contexts/PreviewContext";
import type { ActionResult } from "@/lib/forms/action-result";
import type { ExternalReviewPageViewModel } from "../_lib/queries";
import {
  createExternalReviewPageSchema,
  updateExternalReviewPageSchema,
  type CreateExternalReviewPageInput,
  type DeleteExternalReviewPageInput,
  type ReorderExternalReviewPagesInput,
  type UpdateExternalReviewPageInput,
} from "../_lib/schemas";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };
export type ExternalReviewPageMutations = {
  createExternalPage?: Mutation<CreateExternalReviewPageInput>;
  updateExternalPage?: Mutation<UpdateExternalReviewPageInput>;
  deleteExternalPage?: Mutation<DeleteExternalReviewPageInput>;
  reorderExternalPages?: Mutation<ReorderExternalReviewPagesInput>;
};

function sameOrder(
  left: ExternalReviewPageViewModel[],
  right: ExternalReviewPageViewModel[],
) {
  return (
    left.map(({ id }) => id).join(",") === right.map(({ id }) => id).join(",")
  );
}

function pageHost(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return link;
  }
}

function ExternalReviewPageForm({
  item,
  mutation,
  onComplete,
}: {
  item?: ExternalReviewPageViewModel;
  mutation?:
    | Mutation<CreateExternalReviewPageInput>
    | Mutation<UpdateExternalReviewPageInput>;
  onComplete(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<
    CreateExternalReviewPageInput | UpdateExternalReviewPageInput
  >({
    resolver: zodResolver(
      item ? updateExternalReviewPageSchema : createExternalReviewPageSchema,
    ),
    defaultValues: item
      ? { id: item.id, link: item.link, enabled: item.enabled }
      : { link: "" },
  });
  const submit = async (
    values: CreateExternalReviewPageInput | UpdateExternalReviewPageInput,
  ) => {
    let result: ActionResult<unknown>;
    try {
      result = item
        ? await (
            mutation as Mutation<UpdateExternalReviewPageInput>
          ).mutateAsync(values as UpdateExternalReviewPageInput)
        : await (
            mutation as Mutation<CreateExternalReviewPageInput>
          ).mutateAsync(values as CreateExternalReviewPageInput);
    } catch {
      setError("Could not save external review page");
      return;
    }
    if (!result.ok) {
      applyActionResult(result, form, ["link"]);
      setError(result.formError ?? "Could not save external review page");
      return;
    }
    setError("");
    onComplete();
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
      <Field invalid={Boolean(form.formState.errors.link)}>
        <FieldLabel>External review page URL</FieldLabel>
        <Input type="url" {...form.register("link")} />
        {form.formState.errors.link ? (
          <FieldError assertive>
            {form.formState.errors.link.message}
          </FieldError>
        ) : null}
      </Field>
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {item ? "Update external review page" : "Save external review page"}
      </Button>
    </form>
  );
}

export function ExternalReviewPagesManager({
  pages,
  enabled,
  mutations,
}: {
  pages: ExternalReviewPageViewModel[];
  enabled: boolean;
  mutations: ExternalReviewPageMutations;
}) {
  const { triggerReload } = usePreview();
  const [editor, setEditor] = useState<
    ExternalReviewPageViewModel | "create" | null
  >(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ExternalReviewPageViewModel | null>(null);
  const [draftState, setDraftState] = useState(() => ({
    source: pages,
    value: pages,
  }));
  const draft = draftState.source === pages ? draftState.value : pages;
  const setDraft = (next: SetStateAction<ExternalReviewPageViewModel[]>) => {
    setDraftState((current) => {
      const currentDraft = current.source === pages ? current.value : pages;
      return {
        source: pages,
        value: typeof next === "function" ? next(currentDraft) : next,
      };
    });
  };
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [orderPending, setOrderPending] = useState(false);
  const orderPendingRef = useRef(false);
  const busyIdRef = useRef<number | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    const changed = [...draft];
    const [item] = changed.splice(index, 1);
    changed.splice(next, 0, item);
    setDraft(changed);
    setNotice(`${pageHost(item.link)} moved to position ${next + 1}`);
  };
  const saveOrder = async () => {
    if (orderPendingRef.current) return;
    orderPendingRef.current = true;
    setOrderPending(true);
    setError("");
    let result: ActionResult<unknown>;
    try {
      result = await mutations.reorderExternalPages!.mutateAsync({
        orderedIds: draft.map(({ id }) => id),
      });
    } catch {
      setError("Could not save external review page order");
      return;
    } finally {
      orderPendingRef.current = false;
      setOrderPending(false);
    }
    if (!result.ok) {
      setError(result.formError ?? "Could not save external review page order");
      return;
    }
    setError("");
    setNotice("External review page order saved");
    triggerReload();
  };
  const toggle = async (item: ExternalReviewPageViewModel) => {
    if (busyIdRef.current !== null) return;
    busyIdRef.current = item.id;
    setBusyId(item.id);
    setError("");
    let result: ActionResult<unknown>;
    try {
      result = await mutations.updateExternalPage!.mutateAsync({
        id: item.id,
        link: item.link,
        enabled: !item.enabled,
      });
    } catch {
      setError("Could not update external review page");
      return;
    } finally {
      busyIdRef.current = null;
      setBusyId(null);
    }
    if (!result.ok) {
      setError(result.formError ?? "Could not update external review page");
      return;
    }
    setDraft((current) =>
      current.map((page) =>
        page.id === item.id ? { ...page, enabled: !item.enabled } : page,
      ),
    );
    setNotice(
      `${pageHost(item.link)} is now ${item.enabled ? "hidden" : "visible"}`,
    );
    triggerReload();
  };
  const remove = async () => {
    if (!deleteTarget || busyIdRef.current !== null) return;
    busyIdRef.current = deleteTarget.id;
    setBusyId(deleteTarget.id);
    setError("");
    try {
      const result = await mutations.deleteExternalPage!.mutateAsync({
        id: deleteTarget.id,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not delete external review page");
        return;
      }
      setDeleteTarget(null);
      triggerReload();
    } catch {
      setError("Could not delete external review page");
      return;
    } finally {
      busyIdRef.current = null;
      setBusyId(null);
    }
  };

  return (
    <section
      className="mt-8 space-y-4 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
      data-testid="external-review-pages-manager"
    >
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">External review pages</h3>
          <p className="text-sm text-muted-foreground">
            Manage the review destinations displayed on your profile.
          </p>
        </div>
        <Button
          type="button"
          disabled={!enabled}
          onClick={() => setEditor("create")}
        >
          Add external review page
        </Button>
      </div>

      {draft.length ? (
        draft.map((item, index) => (
          <article
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4 sm:flex-nowrap"
            key={item.id}
          >
            <div className="flex shrink-0 flex-col">
              <Button
                aria-label={`Move ${pageHost(item.link)} up`}
                disabled={!enabled || busyId === item.id || index === 0}
                onClick={() => move(index, -1)}
                size="icon"
                title={`Move ${pageHost(item.link)} up`}
                type="button"
                variant="ghost"
              >
                <CaretUp aria-hidden="true" className="size-5" weight="bold" />
              </Button>
              <Button
                aria-label={`Move ${pageHost(item.link)} down`}
                disabled={
                  !enabled || busyId === item.id || index === draft.length - 1
                }
                onClick={() => move(index, 1)}
                size="icon"
                title={`Move ${pageHost(item.link)} down`}
                type="button"
                variant="ghost"
              >
                <CaretDown
                  aria-hidden="true"
                  className="size-5"
                  weight="bold"
                />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-semibold">{pageHost(item.link)}</h4>
              <p className="truncate text-sm text-muted-foreground">
                {item.link}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label={`Edit ${pageHost(item.link)}`}
                disabled={!enabled || busyId === item.id}
                onClick={() => setEditor(item)}
                size="icon"
                title={`Edit ${pageHost(item.link)}`}
                type="button"
                variant="ghost"
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <Button
                aria-label={`Delete ${pageHost(item.link)}`}
                className="text-destructive hover:text-destructive"
                disabled={!enabled || busyId === item.id}
                onClick={() => setDeleteTarget(item)}
                size="icon"
                title={`Delete ${pageHost(item.link)}`}
                type="button"
                variant="ghost"
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
              <Button
                aria-label={`${item.enabled ? "Hide" : "Show"} ${pageHost(item.link)}`}
                aria-pressed={item.enabled}
                disabled={!enabled || busyId === item.id}
                onClick={() => void toggle(item)}
                size="icon"
                title={item.enabled ? "Hide from profile" : "Show on profile"}
                type="button"
                variant="ghost"
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
        <p>No external review pages have been added.</p>
      )}

      {!sameOrder(draft, pages) ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={orderPending}
            onClick={() => setDraft(pages)}
          >
            Cancel external review page order
          </Button>
          <Button
            type="button"
            isPending={orderPending}
            onClick={() => void saveOrder()}
          >
            Save external review page order
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor === "create" ? "Add" : "Edit"} external review page
            </DialogTitle>
            <DialogDescription>
              Add a secure review destination shown on your public profile.
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <ExternalReviewPageForm
              item={editor === "create" ? undefined : editor}
              mutation={
                editor === "create"
                  ? mutations.createExternalPage
                  : mutations.updateExternalPage
              }
              onComplete={() => {
                setEditor(null);
                triggerReload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete external review page?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the destination from your public profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleteTarget?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId === deleteTarget?.id}
              aria-busy={busyId === deleteTarget?.id || undefined}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
