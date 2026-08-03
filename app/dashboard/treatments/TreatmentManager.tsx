"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import { treatmentSchema } from "@/lib/validation";
import { apiClient } from "@/services/apiClient";
import { createClient } from "@/utils/supabase/client";

const ITEM_TYPE = "treatment";
type TreatmentFormValues = { title: string; description: string };

function fieldError(message: string | undefined, label: string) {
  return message
    ?.replace("Title", `${label} title`)
    .replace("Description", `${label} description`);
}

export interface TreatmentItem {
  treatment_id: string;
  title: string;
  description: string;
  rank: number;
}

type TreatmentKind = "treatment" | "service";

const areArraysEqual = (first: TreatmentItem[], second: TreatmentItem[]) =>
  JSON.stringify(first.map((item) => item.treatment_id)) ===
  JSON.stringify(second.map((item) => item.treatment_id));

async function fetchItems(dentistryId: string, isService: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dentistry_treatments")
    .select("treatment_id, rank, treatments(title, description)")
    .eq("dentistry_id", dentistryId)
    .eq("treatments.isService", isService)
    .order("rank", { nullsFirst: true });
  if (error || !data) return [];
  return data
    .filter((entry: any) => entry.treatments !== null)
    .map((entry: any, index: number) => ({
      treatment_id: entry.treatment_id,
      title: entry.treatments.title,
      description: entry.treatments.description,
      rank: entry.rank !== null ? entry.rank : index + 1,
    }));
}

async function updateOrder(dentistryId: string, items: TreatmentItem[]) {
  const supabase = createClient();
  for (let index = 0; index < items.length; index += 1) {
    await supabase
      .from("dentistry_treatments")
      .update({ rank: index + 1 })
      .eq("treatment_id", items[index].treatment_id)
      .eq("dentistry_id", dentistryId);
  }
}

function ItemCard({
  item,
  index,
  onMove,
  onEdit,
  onDelete,
}: {
  item: TreatmentItem;
  index: number;
  onMove: (from: number, to: number) => void;
  onEdit: (item: TreatmentItem, trigger: HTMLButtonElement) => void;
  onDelete: (item: TreatmentItem, trigger: HTMLButtonElement) => void;
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
    <div
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className="membar-cards p-4"
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
          <div className="member-cards-actions mb-1 flex items-center justify-between gap-2">
            <div className="max-w-[500px]">
              <button
                type="button"
                onClick={(event) => onEdit(item, event.currentTarget)}
                className="member-heading flex items-center gap-2"
              >
                <span className="font-semibold text-blue-600 break-words break-all">
                  {item.title}
                </span>
                <PencilSimple aria-hidden="true" className="size-5" />
              </button>
              <p className="mb-0 max-w-[500px] break-words break-all">
                {item.description}
              </p>
            </div>
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
  );
}

export default function TreatmentManager({
  dentistryId,
  kind,
  newItem,
  onItemAdded,
}: {
  dentistryId: string;
  kind: TreatmentKind;
  newItem?: TreatmentItem | null;
  onItemAdded?: () => void;
}) {
  const label = kind === "service" ? "Service" : "Treatment";
  const [items, setItems] = useState<TreatmentItem[]>([]);
  const [initialItems, setInitialItems] = useState<TreatmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TreatmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreatmentItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasRearranged, setHasRearranged] = useState(false);
  const [formError, setFormError] = useState("");
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { title: "", description: "" },
  });
  const description = form.watch("description") ?? "";
  const overLimit = description.length > TREATMENT_DESCRIPTION_MAX_LENGTH;

  const loadItems = useCallback(async () => {
    setLoading(true);
    const fetched = await fetchItems(dentistryId, kind === "service");
    setItems(fetched);
    setInitialItems(fetched);
    setLoading(false);
  }, [dentistryId, kind]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);
  useEffect(() => {
    if (!newItem) return;
    setItems((current) => [...current, newItem]);
    setInitialItems((current) => [...current, newItem]);
    onItemAdded?.();
  }, [newItem, onItemAdded]);

  const moveItem = useCallback(
    (from: number, to: number) => {
      setItems((current) => {
        const updated = [...current];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        setHasRearranged(!areArraysEqual(updated, initialItems));
        return updated;
      });
    },
    [initialItems],
  );

  const openEdit = (item: TreatmentItem, trigger: HTMLButtonElement) => {
    editTriggerRef.current = trigger;
    setEditing(item);
    setFormError("");
    form.reset({ title: item.title, description: item.description });
  };

  const updateItem = async () => {
    if (!editing) return;
    setFormError("");
    const values = form.getValues();
    try {
      await apiClient.put("/api/treatments", {
        dentistryId,
        treatmentId: editing.treatment_id,
        title: values.title,
        description: values.description,
      });
      setItems((current) =>
        current.map((item) =>
          item.treatment_id === editing.treatment_id
            ? { ...item, ...values }
            : item,
        ),
      );
      setEditing(null);
      form.reset();
      void loadItems();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : `Unable to update ${label.toLowerCase()}`,
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error: unlinkError } = await supabase
        .from("dentistry_treatments")
        .delete()
        .eq("treatment_id", deleteTarget.treatment_id)
        .eq("dentistry_id", dentistryId);
      if (unlinkError) throw new Error(unlinkError.message);

      const { error: deleteError } = await supabase
        .from("treatments")
        .delete()
        .eq("treatment_id", deleteTarget.treatment_id);
      if (deleteError) throw new Error(deleteError.message);

      setDeleteTarget(null);
      await loadItems();
      window.dispatchEvent(new Event("iframeRefresh"));
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : `Unable to delete ${label.toLowerCase()}`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const saveOrder = async () => {
    await updateOrder(dentistryId, items);
    await loadItems();
    setHasRearranged(false);
    window.dispatchEvent(new Event("iframeRefresh"));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {items.length > 0 && (
        <h2 className="mb-3 text-lg font-semibold">Arrange {label}s</h2>
      )}
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner label={`Loading ${label.toLowerCase()}s`} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No {label.toLowerCase()}s yet</EmptyStateTitle>
          <EmptyStateDescription>
            Add one above to show it on your profile.
          </EmptyStateDescription>
        </EmptyState>
      ) : (
        <div>
          {items.map((item, index) => (
            <ItemCard
              key={item.treatment_id}
              item={item}
              index={index}
              onMove={moveItem}
              onEdit={openEdit}
              onDelete={(target, trigger) => {
                deleteTriggerRef.current = trigger;
                setDeleteError("");
                setDeleteTarget(target);
              }}
            />
          ))}
        </div>
      )}
      <div className="mb-4 mt-4 flex w-full justify-end">
        {hasRearranged && (
          <Button type="button" onClick={saveOrder}>
            Save {label.toLowerCase()} order
          </Button>
        )}
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
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
          <form onSubmit={form.handleSubmit(updateItem)} className="space-y-4">
            <Field
              id={`edit-${kind}-title`}
              invalid={Boolean(form.formState.errors.title)}
            >
              <FieldLabel>{label} title</FieldLabel>
              <Input
                {...form.register("title", {
                  onChange: () => setFormError(""),
                })}
              />
              <FieldDescription>
                Use a clear name for this {label.toLowerCase()}.
              </FieldDescription>
              {form.formState.errors.title && (
                <FieldError assertive>
                  {fieldError(form.formState.errors.title.message, label)}
                </FieldError>
              )}
            </Field>
            <Field
              id={`edit-${kind}-description`}
              invalid={overLimit || Boolean(form.formState.errors.description)}
            >
              <FieldLabel>{label} description</FieldLabel>
              <Textarea
                {...form.register("description", {
                  onChange: () => setFormError(""),
                })}
              />
              <FieldDescription
                className={`text-right text-sm ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
              >
                {description.length}/{TREATMENT_DESCRIPTION_MAX_LENGTH}
              </FieldDescription>
              {overLimit ? (
                <FieldError assertive className="text-right">
                  Character limit exceeded by{" "}
                  {description.length - TREATMENT_DESCRIPTION_MAX_LENGTH}
                </FieldError>
              ) : form.formState.errors.description ? (
                <FieldError assertive>
                  {fieldError(form.formState.errors.description.message, label)}
                </FieldError>
              ) : null}
            </Field>
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Could not update {label.toLowerCase()}</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="submit" isPending={form.formState.isSubmitting}>
                Update {label.toLowerCase()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
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
              This permanently removes {deleteTarget?.title}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Could not delete {label.toLowerCase()}</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              aria-busy={isDeleting || undefined}
            >
              {isDeleting ? "Deleting…" : `Delete ${label.toLowerCase()}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}
