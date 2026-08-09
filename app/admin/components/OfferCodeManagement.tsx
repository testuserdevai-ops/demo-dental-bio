"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimple, PlusCircle, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { offerCodeSchema, type OfferCodeInput } from "./offer-code-schema";

type Offer = {
  id: number;
  university: string;
  offer_code: string;
};

type Editor = { mode: "create" } | { mode: "edit"; offer: Offer } | null;

async function requestOfferCodes(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Offer code request failed");
  }
  return response;
}

export default function OfferCodeManagement() {
  const [data, setData] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleteOffer, setDeleteOffer] = useState<Offer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const form = useForm<OfferCodeInput>({
    resolver: zodResolver(offerCodeSchema),
    defaultValues: { university: "", offer_code: "" },
  });

  const loadOfferCodes = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await requestOfferCodes("/api/offer-code");
      setData(await response.json());
    } catch (error) {
      setData([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Offer codes could not be loaded",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOfferCodes();
  }, []);

  const openCreate = () => {
    form.reset({ university: "", offer_code: "" });
    form.clearErrors();
    setEditor({ mode: "create" });
  };

  const openEdit = (offer: Offer) => {
    form.reset({ university: offer.university, offer_code: offer.offer_code });
    form.clearErrors();
    setEditor({ mode: "edit", offer });
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      if (editor?.mode === "edit") {
        await requestOfferCodes("/api/offer-code", {
          method: "PUT",
          body: JSON.stringify({ id: editor.offer.id, value: values }),
        });
      } else {
        await requestOfferCodes("/api/offer-code", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      await loadOfferCodes();
      setEditor(null);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Offer code could not be saved",
      });
    }
  });

  const handleDelete = async () => {
    if (!deleteOffer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await requestOfferCodes("/api/offer-code", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteOffer.id }),
      });
      await loadOfferCodes();
      setDeleteOffer(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Offer code could not be deleted",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = editor?.mode === "edit";
  const title = isEditing ? "Edit offer code" : "Add offer code";
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Offer Code Management</h1>
        <Button type="button" onClick={openCreate}>
          <PlusCircle aria-hidden="true" className="size-5" />
          Add offer code
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive" role="alert" className="mb-4">
          <AlertTitle>Offer codes could not be loaded</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadOfferCodes()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-3xl border border-border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                #
              </th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                University
              </th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                Offer code
              </th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 4 }).map((_, cellIndex) => (
                    <td
                      key={`skeleton-cell-${cellIndex}`}
                      className="px-4 py-3"
                    >
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No offer codes yet. Add one to get started.
                </td>
              </tr>
            ) : (
              data.map((offer, index) => (
                <tr key={offer.id}>
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{offer.university}</td>
                  <td className="px-4 py-3">{offer.offer_code}</td>
                  <td className="flex justify-center gap-2 px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openEdit(offer)}
                      aria-label={`Edit offer code for ${offer.university}`}
                    >
                      <PencilSimple aria-hidden="true" className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteOffer(offer);
                      }}
                      aria-label={`Delete offer code for ${offer.university}`}
                    >
                      <Trash aria-hidden="true" className="size-5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this university's offer code."
                : "Create an offer code for a university."}
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={submit} className="space-y-4">
            <Field
              id="offer-university"
              invalid={Boolean(form.formState.errors.university)}
            >
              <FieldLabel>University</FieldLabel>
              <Input
                autoComplete="organization"
                {...form.register("university")}
              />
              {form.formState.errors.university && (
                <FieldError assertive>
                  {form.formState.errors.university.message}
                </FieldError>
              )}
            </Field>
            <Field
              id="offer-code"
              invalid={Boolean(form.formState.errors.offer_code)}
            >
              <FieldLabel>Offer code</FieldLabel>
              <Input autoComplete="off" {...form.register("offer_code")} />
              {form.formState.errors.offer_code && (
                <FieldError assertive>
                  {form.formState.errors.offer_code.message}
                </FieldError>
              )}
            </Field>
            {rootError && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Offer code was not saved</AlertTitle>
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditor(null)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isPending={form.formState.isSubmitting}>
                {isEditing ? "Save changes" : "Add offer code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOffer !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleteOffer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the offer code for{" "}
              {deleteOffer?.university}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Offer code was not deleted</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete offer code"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
