"use client";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import GoogleMapAutocomplete from "../GoogleMapAutocomplete";
import { useLocationMutations } from "../_lib/hooks";
import type { LocationViewModel } from "../_lib/queries";
import {
  createLocationSchema,
  type CreateLocationInput,
} from "../_lib/schemas";
type Mutations = ReturnType<typeof useLocationMutations>;
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

export { LocationForm };
