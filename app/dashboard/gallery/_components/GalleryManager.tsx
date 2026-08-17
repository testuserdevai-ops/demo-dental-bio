"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  ImageSquare,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import {
  useEffect,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
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
import BlogImage from "@/app/components/Image/BlogImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { usePreview } from "@/app/contexts/PreviewContext";
import type { ActionResult } from "@/lib/forms/action-result";
import type {
  DentalGalleryViewModel,
  GeneralGalleryViewModel,
} from "../_lib/queries";
import type {
  CreateDentalGalleryInput,
  CreateGeneralGalleryInput,
  DeleteDentalGalleryInput,
  DeleteGeneralGalleryInput,
  ReorderDentalGalleriesInput,
  ReorderGeneralGalleriesInput,
  UpdateDentalGalleryInput,
  UpdateGeneralGalleryInput,
} from "../_lib/schemas";
import {
  galleryImagePath,
  removeGalleryImages,
  retryGalleryImageCleanup,
  uploadGalleryImage,
} from "../_lib/uploads";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };
type GalleryMutations = {
  createDental?: Mutation<CreateDentalGalleryInput>;
  updateDental?: Mutation<UpdateDentalGalleryInput>;
  deleteDental?: Mutation<DeleteDentalGalleryInput>;
  reorderDental?: Mutation<ReorderDentalGalleriesInput>;
  createGeneral?: Mutation<CreateGeneralGalleryInput>;
  updateGeneral?: Mutation<UpdateGeneralGalleryInput>;
  deleteGeneral?: Mutation<DeleteGeneralGalleryInput>;
  reorderGeneral?: Mutation<ReorderGeneralGalleriesInput>;
};
type Editor =
  | { kind: "dental"; item?: DentalGalleryViewModel }
  | { kind: "general"; item?: GeneralGalleryViewModel };
type DeleteTarget =
  | { kind: "dental"; item: DentalGalleryViewModel }
  | { kind: "general"; item: GeneralGalleryViewModel };
type GalleryFormValues = {
  title: string;
  beforeLabel: string;
  afterLabel: string;
  beforeFile?: File;
  afterFile?: File;
  imageFile?: File;
};

const optionalFile = z.custom<File>(
  (value) =>
    value === undefined ||
    (typeof File !== "undefined" && value instanceof File),
  "Choose a valid image",
);
function galleryFormSchema(editor: Editor) {
  return z
    .object({
      title: z.string().trim().min(1, "Title is required").max(100),
      beforeLabel: z.string().trim().max(50),
      afterLabel: z.string().trim().max(50),
      beforeFile: optionalFile.optional(),
      afterFile: optionalFile.optional(),
      imageFile: optionalFile.optional(),
    })
    .superRefine((value, context) => {
      if (editor.item) return;
      const required =
        editor.kind === "dental"
          ? (["beforeFile", "afterFile"] as const)
          : (["imageFile"] as const);
      for (const field of required)
        if (!value[field])
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Image is required",
          });
    });
}

import { GalleryForm } from "./GalleryForm";

function sameOrder<T extends { id: number }>(left: T[], right: T[]) {
  return (
    left.map(({ id }) => id).join(",") === right.map(({ id }) => id).join(",")
  );
}

import { GalleryImage } from "./GalleryImage";

import { GalleryCard } from "./GalleryCard";

export default function GalleryManager({
  dental,
  general,
  loading,
  enabled,
  userId,
  mutations,
}: {
  dental: DentalGalleryViewModel[];
  general: GeneralGalleryViewModel[];
  loading: boolean;
  enabled: boolean;
  userId: string;
  mutations: GalleryMutations;
}) {
  const { triggerReload } = usePreview();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [dentalDraftState, setDentalDraftState] = useState(() => ({
    source: dental,
    value: dental,
  }));
  const dentalDraft =
    dentalDraftState.source === dental ? dentalDraftState.value : dental;
  const setDentalDraft = (next: SetStateAction<typeof dental>) => {
    setDentalDraftState((current) => {
      const currentDraft = current.source === dental ? current.value : dental;
      return {
        source: dental,
        value: typeof next === "function" ? next(currentDraft) : next,
      };
    });
  };
  const [generalDraftState, setGeneralDraftState] = useState(() => ({
    source: general,
    value: general,
  }));
  const generalDraft =
    generalDraftState.source === general ? generalDraftState.value : general;
  const setGeneralDraft = (next: SetStateAction<typeof general>) => {
    setGeneralDraftState((current) => {
      const currentDraft = current.source === general ? current.value : general;
      return {
        source: general,
        value: typeof next === "function" ? next(currentDraft) : next,
      };
    });
  };
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyCard, setBusyCard] = useState("");
  useEffect(() => {
    void retryGalleryImageCleanup(userId);
  }, [userId]);

  const move = <T extends { title: string }>(
    values: T[],
    setValues: (items: T[]) => void,
    index: number,
    direction: -1 | 1,
  ) => {
    const next = index + direction;
    if (next < 0 || next >= values.length) return;
    const changed = [...values];
    const [item] = changed.splice(index, 1);
    changed.splice(next, 0, item);
    setValues(changed);
    setNotice(`${item.title} moved to position ${next + 1}`);
  };

  const saveOrder = async (kind: "dental" | "general") => {
    const values = kind === "dental" ? dentalDraft : generalDraft;
    try {
      const result =
        kind === "dental"
          ? await mutations.reorderDental!.mutateAsync({
              orderedIds: values.map(({ id }) => id),
            })
          : await mutations.reorderGeneral!.mutateAsync({
              orderedIds: values.map(({ id }) => id),
            });
      if (!result.ok) {
        kind === "dental" ? setDentalDraft(dental) : setGeneralDraft(general);
        setError(result.formError ?? "Could not save gallery order");
        return;
      }
      setNotice(
        `${kind === "dental" ? "Dental" : "General"} gallery order saved`,
      );
      triggerReload();
    } catch {
      kind === "dental" ? setDentalDraft(dental) : setGeneralDraft(general);
      setError("Could not save gallery order");
    }
  };

  const toggle = async (target: DeleteTarget) => {
    const cardKey = `${target.kind}-${target.item.id}`;
    setBusyCard(cardKey);
    setError("");
    try {
      const result =
        target.kind === "dental"
          ? await mutations.updateDental!.mutateAsync({
              id: target.item.id,
              title: target.item.title,
              beforeImageUrl: target.item.beforeImageUrl,
              afterImageUrl: target.item.afterImageUrl,
              beforeLabel: target.item.beforeLabel,
              afterLabel: target.item.afterLabel,
              enabled: !target.item.enabled,
            })
          : await mutations.updateGeneral!.mutateAsync({
              id: target.item.id,
              title: target.item.title,
              imageUrl: target.item.imageUrl,
              enabled: !target.item.enabled,
            });
      if (!result.ok) {
        setError(result.formError ?? "Could not update gallery");
        return;
      }
      if (target.kind === "dental") {
        setDentalDraft((current) =>
          current.map((item) =>
            item.id === target.item.id
              ? { ...item, enabled: !target.item.enabled }
              : item,
          ),
        );
      } else {
        setGeneralDraft((current) =>
          current.map((item) =>
            item.id === target.item.id
              ? { ...item, enabled: !target.item.enabled }
              : item,
          ),
        );
      }
      setNotice(
        `${target.item.title} is now ${target.item.enabled ? "hidden" : "visible"}`,
      );
      triggerReload();
    } catch {
      setError("Could not update gallery");
    } finally {
      setBusyCard("");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const result =
        deleteTarget.kind === "dental"
          ? await mutations.deleteDental!.mutateAsync({
              id: deleteTarget.item.id,
            })
          : await mutations.deleteGeneral!.mutateAsync({
              id: deleteTarget.item.id,
            });
      if (!result.ok) {
        setError(result.formError ?? "Could not delete gallery");
        return;
      }
      const urls =
        deleteTarget.kind === "dental"
          ? [deleteTarget.item.beforeImageUrl, deleteTarget.item.afterImageUrl]
          : [deleteTarget.item.imageUrl];
      setDeleteTarget(null);
      triggerReload();
      try {
        await removeGalleryImages(
          urls
            .map((url) => galleryImagePath(url, userId))
            .filter((path): path is string => Boolean(path)),
        );
      } catch {
        setError(
          "Gallery deleted, but its stored image could not be cleaned up",
        );
      }
    } catch {
      setError("Could not delete gallery");
    }
  };

  if (loading) return <p aria-live="polite">Loading galleries</p>;
  return (
    <section className="space-y-6" data-testid="gallery-manager">
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              Before and after galleries
            </h3>
            <p className="text-sm text-muted-foreground">
              Show transformations with a clear before-and-after pair.
            </p>
          </div>
          <Button
            type="button"
            aria-label="Add dental gallery"
            disabled={!enabled}
            onClick={() => setEditor({ kind: "dental" })}
          >
            Add gallery
          </Button>
        </div>
        {dentalDraft.length ? (
          dentalDraft.map((item, index) => (
            <GalleryCard
              key={item.id}
              title={item.title}
              enabled={item.enabled}
              actionsEnabled={enabled && busyCard !== `dental-${item.id}`}
              imageColumns={2}
              position={index + 1}
              total={dentalDraft.length}
              images={
                <>
                  <GalleryImage
                    src={item.beforeImageUrl}
                    alt={`Before: ${item.title}`}
                    label={item.beforeLabel || "Before"}
                  />
                  <GalleryImage
                    src={item.afterImageUrl}
                    alt={`After: ${item.title}`}
                    label={item.afterLabel || "After"}
                  />
                </>
              }
              onMove={(direction) =>
                move(dentalDraft, setDentalDraft, index, direction)
              }
              onEdit={() => setEditor({ kind: "dental", item })}
              onToggle={() => void toggle({ kind: "dental", item })}
              onDelete={() => setDeleteTarget({ kind: "dental", item })}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
            <ImageSquare
              aria-hidden="true"
              className="mx-auto mb-2 size-8 text-muted-foreground"
            />
            <p className="font-medium">No before-and-after galleries yet</p>
          </div>
        )}
        {!sameOrder(dentalDraft, dental) && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDentalDraft(dental)}
            >
              Cancel order
            </Button>
            <Button type="button" onClick={() => void saveOrder("dental")}>
              Save dental gallery order
            </Button>
          </div>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">General gallery</h3>
            <p className="text-sm text-muted-foreground">
              Highlight your clinic, team, or recent work.
            </p>
          </div>
          <Button
            type="button"
            aria-label="Add general gallery"
            disabled={!enabled}
            onClick={() => setEditor({ kind: "general" })}
          >
            Add general gallery
          </Button>
        </div>
        {generalDraft.length ? (
          generalDraft.map((item, index) => (
            <GalleryCard
              key={item.id}
              title={item.title}
              enabled={item.enabled}
              actionsEnabled={enabled && busyCard !== `general-${item.id}`}
              imageColumns={1}
              position={index + 1}
              total={generalDraft.length}
              images={<GalleryImage src={item.imageUrl} alt={item.title} />}
              onMove={(direction) =>
                move(generalDraft, setGeneralDraft, index, direction)
              }
              onEdit={() => setEditor({ kind: "general", item })}
              onToggle={() => void toggle({ kind: "general", item })}
              onDelete={() => setDeleteTarget({ kind: "general", item })}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
            <ImageSquare
              aria-hidden="true"
              className="mx-auto mb-2 size-8 text-muted-foreground"
            />
            <p className="font-medium">No general gallery images yet</p>
          </div>
        )}
        {!sameOrder(generalDraft, general) && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGeneralDraft(general)}
            >
              Cancel order
            </Button>
            <Button type="button" onClick={() => void saveOrder("general")}>
              Save general gallery order
            </Button>
          </div>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.item ? "Edit" : "Add"}{" "}
              {editor?.kind === "general" ? "general " : ""}gallery
            </DialogTitle>
            <DialogDescription>
              Upload images and save the gallery to your profile.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <GalleryForm
              editor={editor}
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
            <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the gallery from your public profile.
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

export { GalleryClient } from "./GalleryClient";
