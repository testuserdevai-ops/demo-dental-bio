"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useForm, useWatch } from "react-hook-form";
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
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { applyActionResult } from "@/app/components/forms/action-result";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/app/components/ui/empty-state";
import { Spinner } from "@/app/components/ui/spinner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { ActionResult } from "@/lib/forms/action-result";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import type { TreatmentItemViewModel } from "./_lib/queries";
import type {
  DeleteTreatmentInput,
  ReorderTreatmentsInput,
  UpdateTreatmentInput,
} from "./_lib/schemas";
import { createTreatmentInputSchema } from "./_lib/schemas";

type Kind = "treatment" | "service";
type UpdateMutation = (
  input: UpdateTreatmentInput,
) => Promise<ActionResult<TreatmentItemViewModel>>;
type DeleteMutation = (
  input: DeleteTreatmentInput,
) => Promise<ActionResult<void>>;
type ReorderMutation = (
  input: ReorderTreatmentsInput,
) => Promise<ActionResult<void>>;

const ITEM_TYPE = "treatment-card";

function TreatmentCard({
  item,
  index,
  onMove,
  onEdit,
  onDelete,
}: {
  item: TreatmentItemViewModel;
  index: number;
  onMove: (from: number, to: number) => void;
  onEdit: (item: TreatmentItemViewModel, trigger: HTMLButtonElement) => void;
  onDelete: (item: TreatmentItemViewModel, trigger: HTMLButtonElement) => void;
}) {
  const [, drag] = useDrag({ type: ITEM_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        onMove(dragged.index, index);
        dragged.index = index;
      }
    },
  });

  return (
    <article
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className="membar-cards mb-2 max-h-48 overflow-hidden rounded-3xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="cursor-move rounded-md p-1 hover:bg-purple-100 hover:text-deep-purple"
        >
          <CaretUp className="-mb-0.5" weight="bold" />
          <CaretDown className="-mt-0.5" weight="bold" />
        </div>
        <div className="w-full">
          <div className="member-cards-actions flex items-start justify-between gap-2">
            <div className="max-w-[500px]">
              <h3 className="member-heading break-words break-all font-semibold text-blue-600">
                {item.title}
              </h3>
              <p className="mb-0 line-clamp-3 max-w-[500px] break-words break-all">
                {item.description}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${item.title}`}
                onClick={(event) => onEdit(item, event.currentTarget)}
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${item.title}`}
                onClick={(event) => onDelete(item, event.currentTarget)}
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TreatmentManager({
  kind,
  items,
  loading,
  onUpdate,
  onDelete,
  onReorder,
}: {
  kind: Kind;
  items: TreatmentItemViewModel[];
  loading: boolean;
  onUpdate: UpdateMutation;
  onDelete: DeleteMutation;
  onReorder: ReorderMutation;
}) {
  const label = kind === "service" ? "Service" : "Treatment";
  const [draft, setDraft] = useState(items);
  const [deleteTarget, setDeleteTarget] =
    useState<TreatmentItemViewModel | null>(null);
  const [editing, setEditing] = useState<TreatmentItemViewModel | null>(null);
  const [editError, setEditError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const formAlertRef = useRef<HTMLDivElement | null>(null);
  const editForm = useForm<Omit<UpdateTreatmentInput, "treatmentId" | "kind">>({
    resolver: zodResolver(createTreatmentInputSchema.omit({ kind: true })),
    defaultValues: { title: "", description: "" },
  });
  const editDescription =
    useWatch({ control: editForm.control, name: "description" }) ?? "";
  useEffect(() => setDraft(items), [items]);
  const move = (from: number, to: number) => {
    setDraft((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length)
        return current;
      const updated = [...current];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };
  const cancelOrder = () => {
    setDraft(items);
    setAnnouncement(`${label} order cancelled`);
  };
  const saveOrder = async () => {
    setSaving(true);
    setError("");
    const result = await onReorder({
      orderedIds: draft.map((item) => item.id),
    });
    setSaving(false);
    if (!result.ok) {
      setDraft(items);
      setError(
        result.formError ?? `Unable to save ${label.toLowerCase()} order`,
      );
      return;
    }
    setAnnouncement(`${label} order saved`);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    const result = await onDelete({ treatmentId: deleteTarget.id });
    setSaving(false);
    if (!result.ok) {
      setError(result.formError ?? `Unable to delete ${label.toLowerCase()}`);
      return;
    }
    setDeleteTarget(null);
  };
  const openEdit = (
    item: TreatmentItemViewModel,
    trigger: HTMLButtonElement,
  ) => {
    editTriggerRef.current = trigger;
    setEditing(item);
    setEditError("");
    editForm.reset({ title: item.title, description: item.description });
  };
  const submitEdit = async (
    values: Omit<UpdateTreatmentInput, "treatmentId" | "kind">,
  ) => {
    if (!editing) return;
    setEditError("");
    const result = await onUpdate({ ...values, treatmentId: editing.id, kind });
    if (!result.ok) {
      applyActionResult(
        result,
        editForm,
        ["title", "description"],
        formAlertRef,
      );
      setEditError(
        result.formError ?? `Unable to update ${label.toLowerCase()}`,
      );
      return;
    }
    editForm.reset();
    setEditing(null);
  };
  const rearranged =
    draft.map((item) => item.id).join() !== items.map((item) => item.id).join();
  if (loading)
    return (
      <div className="flex justify-center py-6">
        <Spinner label={`Loading ${label.toLowerCase()}s`} />
      </div>
    );
  if (!items.length)
    return (
      <EmptyState>
        <EmptyStateTitle>No {label.toLowerCase()}s yet</EmptyStateTitle>
        <EmptyStateDescription>
          Add one above to show it on your profile.
        </EmptyStateDescription>
      </EmptyState>
    );
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Arrange {label}s</h2>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <DndProvider backend={HTML5Backend}>
        {draft.map((item, index) => (
          <TreatmentCard
            key={item.id}
            item={item}
            index={index}
            onMove={move}
            onEdit={openEdit}
            onDelete={(target, trigger) => {
              deleteTriggerRef.current = trigger;
              setDeleteTarget(target);
            }}
          />
        ))}
      </DndProvider>
      {error && <p role="alert">{error}</p>}
      {rearranged && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancelOrder}>
            Cancel order
          </Button>
          <Button type="button" onClick={saveOrder} isPending={saving}>
            Save {label.toLowerCase()} order
          </Button>
        </div>
      )}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !saving && setDeleteTarget(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            deleteTriggerRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.title}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={saving}
            >
              Delete {label.toLowerCase()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editTriggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit {label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              Update the name and description shown on your profile.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(submitEdit)}
            className="space-y-4"
          >
            <Field invalid={Boolean(editForm.formState.errors.title)}>
              <FieldLabel>{label} title</FieldLabel>
              <Input
                {...editForm.register("title", {
                  onChange: () => setEditError(""),
                })}
              />
              {editForm.formState.errors.title && (
                <FieldError assertive>
                  {editForm.formState.errors.title.message}
                </FieldError>
              )}
            </Field>
            <Field invalid={Boolean(editForm.formState.errors.description)}>
              <FieldLabel>{label} description</FieldLabel>
              <Textarea
                {...editForm.register("description", {
                  onChange: () => setEditError(""),
                })}
              />
              <FieldDescription className="text-right">
                {editDescription.length}/{TREATMENT_DESCRIPTION_MAX_LENGTH}
              </FieldDescription>
              {editForm.formState.errors.description && (
                <FieldError assertive>
                  {editForm.formState.errors.description.message}
                </FieldError>
              )}
            </Field>
            {editError && (
              <Alert
                ref={formAlertRef}
                tabIndex={-1}
                variant="destructive"
                role="alert"
              >
                <AlertTitle>Could not update {label.toLowerCase()}</AlertTitle>
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="submit" isPending={editForm.formState.isSubmitting}>
                Update {label.toLowerCase()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
