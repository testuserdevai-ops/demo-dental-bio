"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, PencilSimple, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import IntroText from "@/app/components/IntroText";
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
import { useDashboardScope } from "@/app/contexts/DashboardScopeContext";
import { usePreview } from "@/app/contexts/PreviewContext";
import GoogleMapAutocomplete from "../GoogleMapAutocomplete";
import { useLocationAggregate, useLocationMutations } from "../_lib/hooks";
import type { LocationAggregate, LocationViewModel } from "../_lib/queries";
import {
  createLocationSchema,
  locationTitleSchema,
  type CreateLocationInput,
  type LocationTitleInput,
} from "../_lib/schemas";
type Mutations = ReturnType<typeof useLocationMutations>;
function TitleForm({
  title,
  mutations,
  onDone,
}: {
  title: string;
  mutations: Mutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<LocationTitleInput>({
    resolver: zodResolver(locationTitleSchema),
    defaultValues: { title },
  });
  const submit = async (value: LocationTitleInput) => {
    setError("");
    const result = await mutations.saveTitle.mutateAsync(value);
    if (!result.ok) {
      applyActionResult(result, form, ["title"]);
      setError(result.formError ?? "Could not save location title");
      return;
    }
    onDone();
  };
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-3xl border bg-white p-4 shadow-sm"
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      <Field className="flex-1" invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Location title</FieldLabel>
        <Input {...form.register("title")} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Button type="submit" isPending={form.formState.isSubmitting}>
        Save title
      </Button>
      {error && (
        <Alert className="basis-full" variant="destructive" role="alert">
          <AlertTitle>Could not save title</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
function valuesFrom(formData: FormData, id: string): CreateLocationInput {
  const latitude = String(formData.get("latitude") ?? "").trim();
  const longitude = String(formData.get("longitude") ?? "").trim();
  return {
    businessName: String(formData.get("business_name") ?? ""),
    fullAddress: String(formData.get("full_address") ?? ""),
    country: String(formData.get("country") ?? ""),
    city: String(formData.get(`city-${id}`) ?? ""),
    area: String(formData.get("area") ?? ""),
    latitude: latitude ? Number(latitude) : Number.NaN,
    longitude: longitude ? Number(longitude) : Number.NaN,
  };
}
function LocationForm({
  location,
  authoritativeRevision,
  mutations,
  onDone,
}: {
  location?: LocationViewModel;
  authoritativeRevision?: string;
  mutations: Mutations;
  onDone(): void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const id = location?.id ?? "full_address";
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const parsed = createLocationSchema.safeParse(
      valuesFrom(new FormData(event.currentTarget), id),
    );
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        fields[
          key === "fullAddress"
            ? "address"
            : key === "businessName"
              ? "business_name"
              : key
        ] = issue.message;
      }
      setErrors(fields);
      return;
    }
    submitting.current = true;
    setPending(true);
    let result;
    try {
      result = await (location
        ? mutations.updateLocation.mutateAsync({
            ...parsed.data,
            id: location.id,
            expectedUpdatedAt: authoritativeRevision ?? location.updatedAt,
          })
        : mutations.createLocation.mutateAsync(parsed.data));
    } finally {
      submitting.current = false;
      setPending(false);
    }
    if (!result.ok) {
      setError(result.formError ?? "Could not save location");
      return;
    }
    onDone();
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <GoogleMapAutocomplete
        id={id}
        defaultAddress={location?.fullAddress ?? ""}
        cityname={location?.city ?? ""}
        defaultBusinessName={location?.businessName ?? ""}
        defaultCountry={location?.country ?? ""}
        defaultArea={location?.area ?? ""}
        defaultLatitude={location?.latitude}
        defaultLongitude={location?.longitude}
        errors={errors}
        onErrorClear={(field) =>
          setErrors((current) => ({ ...current, [field]: "" }))
        }
      />
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save location</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={pending}>
        {location ? "Update" : "Add"} location
      </Button>
    </form>
  );
}
export default function LocationManager({
  data,
  enabled,
  loading,
  mutations,
}: {
  data: LocationAggregate;
  enabled: boolean;
  loading: boolean;
  mutations: Mutations;
}) {
  const { triggerReload } = usePreview();
  const scope = useDashboardScope();
  const [editing, setEditing] = useState<LocationViewModel | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<LocationViewModel | null>(null);
  const [error, setError] = useState("");
  const remove = async () => {
    if (!deleting) return;
    const result = await mutations.deleteLocation.mutateAsync({
      id: deleting.id,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not delete location");
      return;
    }
    setDeleting(null);
    triggerReload();
  };
  if (loading) return <p aria-live="polite">Loading locations</p>;
  return (
    <section className="space-y-5" data-testid="location-manager">
      <TitleForm
        title={data.title}
        mutations={mutations}
        onDone={triggerReload}
      />
      {scope.canManageSubscription && !enabled && (
        <IntroText>
          <Link
            href="/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-3xl bg-primary px-5 py-3 font-bold text-white"
          >
            Upgrade your membership to add multiple locations
          </Link>
        </IntroText>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!data.canAddLocation}
          onClick={() => setEditing("new")}
        >
          Add location
        </Button>
      </div>
      {data.locations.length ? (
        data.locations.map((location) => (
          <article
            key={location.id}
            className="flex max-h-36 items-center gap-4 overflow-hidden rounded-3xl border bg-white p-5 shadow-sm"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <MapPin aria-hidden="true" className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">
                {location.businessName}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {location.fullAddress}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {location.city}
                {location.country ? `, ${location.country}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit ${location.businessName}`}
              onClick={() => setEditing(location)}
            >
              <PencilSimple aria-hidden="true" className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${location.businessName}`}
              onClick={() => setDeleting(location)}
            >
              <Trash aria-hidden="true" className="size-5" />
            </Button>
          </article>
        ))
      ) : (
        <p className="rounded-3xl border border-dashed bg-white p-8 text-center text-muted-foreground">
          No locations yet
        </p>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not manage locations</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Add location" : "Edit location"}
            </DialogTitle>
            <DialogDescription>
              Choose an address and confirm its details before saving.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <LocationForm
              location={editing === "new" ? undefined : editing}
              authoritativeRevision={
                editing === "new"
                  ? undefined
                  : (data.locations.find((item) => item.id === editing.id)
                      ?.updatedAt ?? editing.updatedAt)
              }
              mutations={mutations}
              onDone={() => {
                setEditing(null);
                triggerReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleting?.businessName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
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
export function LocationClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: LocationAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useLocationAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useLocationMutations({ scopeId, targetHint });
  return (
    <LocationManager
      data={query.data ?? data}
      enabled={enabled}
      loading={query.isLoading}
      mutations={mutations}
    />
  );
}
