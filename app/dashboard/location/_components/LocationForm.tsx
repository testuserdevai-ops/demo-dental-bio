"use client";

import { useEffect, useRef, useState } from "react";
import SafeImage from "@/app/components/Image/SafeImage";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { useDashboardScope } from "@/app/contexts/DashboardScopeContext";
import GoogleMapAutocomplete from "../GoogleMapAutocomplete";
import { useLocationMutations } from "../_lib/hooks";
import type { LocationViewModel } from "../_lib/queries";
import {
  locationFieldsSchema,
  locationMediaDraftSchema,
  type CreateLocationInput,
} from "../_lib/schemas";
import {
  LOCATION_IMAGE_ACCEPT,
  removeLocationImages,
  retryLocationImageCleanup,
  uploadLocationImage,
  validateLocationImage,
} from "../_lib/uploads";

type Mutations = ReturnType<typeof useLocationMutations>;
type LocationFieldsInput = Omit<
  CreateLocationInput,
  "id" | "imageUrl" | "imageAlt" | "imageDecorative"
>;

function valuesFrom(formData: FormData, id: string): LocationFieldsInput {
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

function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    fields[
      key === "fullAddress"
        ? "address"
        : key === "businessName"
          ? "business_name"
          : key
    ] = issue.message;
  }
  return fields;
}

function LocationImageEditor({
  file,
  filePreview,
  existingUrl,
  imageAlt,
  decorative,
  removed,
  disabled,
  fileError,
  altError,
  onFile,
  onAlt,
  onDecorative,
  onRemove,
}: {
  file: File | null;
  filePreview: string;
  existingUrl: string | null;
  imageAlt: string;
  decorative: boolean;
  removed: boolean;
  disabled: boolean;
  fileError: string;
  altError: string;
  onFile(file: File | null): boolean;
  onAlt(value: string): void;
  onDecorative(value: boolean): void;
  onRemove(): void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = filePreview || (!removed ? existingUrl : null);
  const hasImage = Boolean(file || (!removed && existingUrl));

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
      <div>
        <h3 className="font-semibold">Location image</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the image that belongs to this location.
        </p>
      </div>
      {preview ? (
        <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
          <SafeImage
            alt={decorative ? "" : imageAlt || "Location image preview"}
            className="object-cover"
            fill
            sizes="(min-width: 640px) 480px, calc(100vw - 64px)"
            src={preview}
            unoptimized={preview.startsWith("blob:")}
          />
        </div>
      ) : null}
      <Field invalid={Boolean(fileError)}>
        <FieldLabel htmlFor="location-image">
          {hasImage ? "Replace location image" : "Add location image"}
        </FieldLabel>
        <Input
          accept={LOCATION_IMAGE_ACCEPT}
          disabled={disabled}
          id="location-image"
          onChange={(event) => {
            const accepted = onFile(event.target.files?.[0] ?? null);
            if (!accepted) event.currentTarget.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <FieldDescription>JPEG, PNG, or WebP, up to 8 MB.</FieldDescription>
        {fileError ? <FieldError assertive>{fileError}</FieldError> : null}
      </Field>
      {hasImage ? (
        <>
          <Field className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="location-image-decorative">
                Decorative image
              </FieldLabel>
              <FieldDescription>
                Turn this on when the image adds no information.
              </FieldDescription>
            </div>
            <label
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"
              htmlFor="location-image-decorative"
            >
              <Switch
                aria-label="Decorative image"
                checked={decorative}
                disabled={disabled}
                id="location-image-decorative"
                onCheckedChange={onDecorative}
              />
            </label>
          </Field>
          {!decorative ? (
            <Field invalid={Boolean(altError)}>
              <FieldLabel htmlFor="location-image-alt">
                Image description
              </FieldLabel>
              <Input
                disabled={disabled}
                id="location-image-alt"
                maxLength={180}
                onChange={(event) => onAlt(event.target.value)}
                value={imageAlt}
              />
              <FieldDescription>
                Describe what is visible for people using screen readers.
              </FieldDescription>
              {altError ? <FieldError assertive>{altError}</FieldError> : null}
            </Field>
          ) : null}
          <Button
            className="min-h-11"
            disabled={disabled}
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onRemove();
            }}
            type="button"
            variant="outline"
          >
            Remove location image
          </Button>
        </>
      ) : null}
    </div>
  );
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
  const scope = useDashboardScope();
  const [locationId] = useState(() => location?.id ?? crypto.randomUUID());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const filePreviewRef = useRef("");
  const [removed, setRemoved] = useState(false);
  const [imageAlt, setImageAlt] = useState(location?.imageAlt ?? "");
  const [decorative, setDecorative] = useState(
    location?.imageDecorative ?? true,
  );
  const [pendingPhase, setPendingPhase] = useState<"upload" | "save" | null>(
    null,
  );
  const submitting = useRef(false);
  const id = location?.id ?? "full_address";

  useEffect(
    () => () => {
      if (filePreviewRef.current) URL.revokeObjectURL(filePreviewRef.current);
    },
    [],
  );

  const replaceFile = (nextFile: File | null) => {
    if (filePreviewRef.current) URL.revokeObjectURL(filePreviewRef.current);
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : "";
    filePreviewRef.current = nextPreview;
    setFile(nextFile);
    setFilePreview(nextPreview);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setErrors({});

    const address = locationFieldsSchema.safeParse(
      valuesFrom(new FormData(event.currentTarget), id),
    );
    if (!address.success) {
      setErrors(fieldErrors(address.error.issues));
      return;
    }

    const hasImage = Boolean(file || (!removed && location?.imageUrl));
    const media = locationMediaDraftSchema.safeParse({
      hasImage,
      imageAlt,
      imageDecorative: hasImage ? decorative : true,
    });
    if (!media.success) {
      setErrors(fieldErrors(media.error.issues));
      return;
    }

    submitting.current = true;
    let uploadedPath: string | null = null;
    try {
      let imageUrl = removed ? null : (location?.imageUrl ?? null);
      if (file) {
        setPendingPhase("upload");
        const upload = await uploadLocationImage(
          {
            userId: scope.effectiveUserId,
            dentistryId: scope.dentistryId,
            locationId,
          },
          file,
        );
        if (!upload.ok) {
          setError(upload.formError ?? "Location image could not be uploaded");
          return;
        }
        uploadedPath = upload.data.objectPath;
        imageUrl = upload.data.publicUrl;
      }

      setPendingPhase("save");
      const input = {
        ...address.data,
        id: locationId,
        imageUrl,
        imageAlt: hasImage && !decorative ? imageAlt : "",
        imageDecorative: hasImage ? decorative : true,
      };
      const result = await (location
        ? mutations.updateLocation.mutateAsync({
            ...input,
            expectedUpdatedAt: authoritativeRevision ?? location.updatedAt,
          })
        : mutations.createLocation.mutateAsync(input));

      if (!result.ok) {
        if (uploadedPath) await removeLocationImages([uploadedPath]);
        setError(result.formError ?? "Could not save location");
        return;
      }

      await retryLocationImageCleanup(scope.effectiveUserId);
      onDone();
    } catch {
      if (uploadedPath) await removeLocationImages([uploadedPath]);
      setError("Could not save location");
    } finally {
      submitting.current = false;
      setPendingPhase(null);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <GoogleMapAutocomplete
        cityname={location?.city ?? ""}
        defaultAddress={location?.fullAddress ?? ""}
        defaultArea={location?.area ?? ""}
        defaultBusinessName={location?.businessName ?? ""}
        defaultCountry={location?.country ?? ""}
        defaultLatitude={location?.latitude}
        defaultLongitude={location?.longitude}
        errors={errors}
        id={id}
        onErrorClear={(field) =>
          setErrors((current) => ({ ...current, [field]: "" }))
        }
      />
      <LocationImageEditor
        decorative={decorative}
        disabled={Boolean(pendingPhase)}
        altError={errors.imageAlt || errors.imageDecorative || ""}
        fileError={errors.imageFile || ""}
        existingUrl={location?.imageUrl ?? null}
        file={file}
        filePreview={filePreview}
        imageAlt={imageAlt}
        onAlt={(value) => {
          setImageAlt(value);
          setErrors((current) => ({ ...current, imageAlt: "" }));
        }}
        onDecorative={(value) => {
          setDecorative(value);
          if (value) setImageAlt("");
          setErrors((current) => ({
            ...current,
            imageAlt: "",
            imageDecorative: "",
          }));
        }}
        onFile={(nextFile) => {
          if (!nextFile) return false;
          const validation = validateLocationImage(nextFile);
          if (validation) {
            setErrors((current) => ({ ...current, imageFile: validation }));
            return false;
          }
          replaceFile(nextFile);
          setRemoved(false);
          setErrors((current) => ({ ...current, imageFile: "" }));
          return true;
        }}
        onRemove={() => {
          replaceFile(null);
          setRemoved(true);
          setDecorative(true);
          setImageAlt("");
          setErrors((current) => ({
            ...current,
            imageAlt: "",
            imageDecorative: "",
            imageFile: "",
          }));
        }}
        removed={removed}
      />
      {pendingPhase ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {pendingPhase === "upload"
            ? "Uploading location image…"
            : "Saving location…"}
        </p>
      ) : null}
      {error ? (
        <Alert role="alert" variant="destructive">
          <AlertTitle>Could not save location</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="min-h-11"
        isPending={Boolean(pendingPhase)}
        type="submit"
      >
        {location ? "Update" : "Add"} location
      </Button>
    </form>
  );
}

export { LocationForm };
