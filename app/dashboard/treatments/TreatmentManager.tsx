"use client";

import { useEffect, useRef, useState } from "react";
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
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/app/components/ui/empty-state";
import { Spinner } from "@/app/components/ui/spinner";
import type { ActionResult } from "@/lib/forms/action-result";
import type { TreatmentItemViewModel } from "./_lib/queries";
import type {
  DeleteTreatmentInput,
  ReorderTreatmentsInput,
  UpdateTreatmentInput,
} from "./_lib/schemas";

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

export default function TreatmentManager({
  kind,
  items,
  loading,
  onUpdate: _onUpdate,
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const focusedId = useRef<string | null>(null);
  useEffect(() => setDraft(items), [items]);
  useEffect(() => {
    if (focusedId.current)
      document.getElementById(`treatment-${focusedId.current}`)?.focus();
  }, [draft]);
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    const updated = [...draft];
    const [moved] = updated.splice(index, 1);
    updated.splice(next, 0, moved);
    focusedId.current = moved.id;
    setDraft(updated);
    setAnnouncement(`${moved.title} moved to position ${next + 1}`);
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
      {draft.map((item, index) => (
        <div className="membar-cards mb-2 p-4" key={item.id}>
          <div className="flex items-center justify-between gap-2">
            <button
              id={`treatment-${item.id}`}
              type="button"
              className="member-heading font-semibold text-blue-600"
              onClick={() =>
                _onUpdate({
                  treatmentId: item.id,
                  title: item.title,
                  description: item.description,
                  kind,
                })
              }
            >
              {item.title}
            </button>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${item.title} up`}
              >
                Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => move(index, 1)}
                disabled={index === draft.length - 1}
                aria-label={`Move ${item.title} down`}
              >
                Down
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteTarget(item)}
                aria-label={`Delete ${item.title}`}
              >
                Delete
              </Button>
            </div>
          </div>
          <p>{item.description}</p>
        </div>
      ))}
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
        <AlertDialogContent>
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
    </section>
  );
}
