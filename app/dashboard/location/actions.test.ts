import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const ownerId = "00000000-0000-4000-8000-000000000001";
const dentistryId = "00000000-0000-4000-8000-000000000002";
const locationId = "00000000-0000-4000-8000-000000000003";
const imageUrl = `https://storage.test/storage/v1/object/public/location-images/${ownerId}/dentistries/${dentistryId}/locations/${locationId}/image.webp`;

const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: ownerId,
    dentistryId,
    username: "owner",
    canManageSubscription: true,
  },
}));
const row = {
  location_id: locationId,
  business_name: "Main clinic",
  full_address: "1 High Street",
  country: "UK",
  city: "London",
  area: "Central",
  latitude: 51.5,
  longitude: -0.1,
  image_url: imageUrl,
  image_alt: "Main clinic entrance",
  image_decorative: false,
  updated_at: "2026-08-17T00:00:00.000Z",
};
const rpc = mock(async () => ({ data: [row], error: null }));
const invalidatePublicProfileCache = mock(() => undefined);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
}));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));

const { createLocation, deleteLocation, updateLocation } =
  await import("./actions");

const input = {
  id: locationId,
  businessName: "Main clinic",
  fullAddress: "1 High Street",
  country: "UK",
  city: "London",
  area: "Central",
  latitude: 51.5,
  longitude: -0.1,
  imageUrl,
  imageAlt: "Main clinic entrance",
  imageDecorative: false,
};

describe("location actions", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({
      scope: {
        effectiveUserId: ownerId,
        dentistryId,
        username: "owner",
        canManageSubscription: true,
      },
    });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [row], error: null });
    invalidatePublicProfileCache.mockClear();
  });

  it("creates media through one scoped RPC and maps the authoritative row", async () => {
    const result = await createLocation(undefined, input);

    expect(rpc).toHaveBeenCalledWith("create_dentistry_location_with_media", {
      p_dentistry_id: dentistryId,
      p_location_id: locationId,
      p_business_name: "Main clinic",
      p_full_address: "1 High Street",
      p_country: "UK",
      p_city: "London",
      p_area: "Central",
      p_latitude: 51.5,
      p_longitude: -0.1,
      p_image_url: imageUrl,
      p_image_alt: "Main clinic entrance",
      p_image_decorative: false,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        id: locationId,
        businessName: "Main clinic",
        fullAddress: "1 High Street",
        country: "UK",
        city: "London",
        area: "Central",
        latitude: 51.5,
        longitude: -0.1,
        imageUrl,
        imageAlt: "Main clinic entrance",
        imageDecorative: false,
        updatedAt: "2026-08-17T00:00:00.000Z",
      },
    });
    expect(invalidatePublicProfileCache).toHaveBeenCalledWith({
      profileId: ownerId,
      feature: "locations",
      entities: [{ kind: "location", id: locationId }],
    });
  });

  it("sends an image-only update with the exact revision and clears decorative alt", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          ...row,
          image_alt: null,
          image_decorative: true,
          updated_at: "2026-08-17T00:01:00.000Z",
        },
      ],
      error: null,
    } as never);
    const result = await updateLocation(ownerId, {
      ...input,
      expectedUpdatedAt: row.updated_at,
      imageAlt: "",
      imageDecorative: true,
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(ownerId);
    expect(rpc).toHaveBeenCalledWith(
      "update_dentistry_location_with_media",
      expect.objectContaining({
        p_dentistry_id: dentistryId,
        p_location_id: locationId,
        p_expected_updated_at: row.updated_at,
        p_image_url: imageUrl,
        p_image_alt: "",
        p_image_decorative: true,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("uses the verified admin target scope instead of the actor identity", async () => {
    const managedOwnerId = "00000000-0000-4000-8000-000000000011";
    const managedDentistryId = "00000000-0000-4000-8000-000000000012";
    resolveDashboardIdentity.mockResolvedValueOnce({
      scope: {
        effectiveUserId: managedOwnerId,
        dentistryId: managedDentistryId,
        username: "managed-owner",
        canManageSubscription: false,
      },
    });
    const managedImageUrl = `https://storage.test/storage/v1/object/public/location-images/${managedOwnerId}/dentistries/${managedDentistryId}/locations/${locationId}/image.webp`;
    rpc.mockResolvedValueOnce({
      data: [{ ...row, image_url: managedImageUrl }],
      error: null,
    } as never);

    const result = await createLocation(managedOwnerId, {
      ...input,
      imageUrl: managedImageUrl,
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(managedOwnerId);
    expect(rpc).toHaveBeenCalledWith(
      "create_dentistry_location_with_media",
      expect.objectContaining({ p_dentistry_id: managedDentistryId }),
    );
    expect(result.ok).toBe(true);
    expect(invalidatePublicProfileCache).toHaveBeenCalledWith({
      profileId: managedOwnerId,
      feature: "locations",
      entities: [{ kind: "location", id: locationId }],
    });
  });

  it("returns a conflict without invalidating the successful public cache", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "40001", message: "internal details" },
    } as never);
    const result = await updateLocation(undefined, {
      ...input,
      expectedUpdatedAt: row.updated_at,
    });

    expect(result).toEqual({
      ok: false,
      code: "CONFLICT",
      formError:
        "This location changed elsewhere. Your draft was kept; reload the latest version before saving.",
    });
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();
  });

  it("rejects invalid or forged requests before cache invalidation", async () => {
    const invalid = await createLocation("forged", {
      ...input,
      imageUrl: "https://user:secret@storage.test/image.webp",
    });
    expect(invalid.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();

    resolveDashboardIdentity.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const forged = await deleteLocation("forged", { id: locationId });
    expect(forged).toEqual({
      ok: false,
      code: "AUTHORIZATION_ERROR",
      formError: "Unable to manage locations",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();
  });

  it("does not invalidate when an RPC fails or returns no authoritative row", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "private details" },
    } as never);
    expect((await createLocation(undefined, input)).ok).toBe(false);
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();

    rpc.mockResolvedValueOnce({ data: [], error: null } as never);
    expect(
      (
        await updateLocation(undefined, {
          ...input,
          expectedUpdatedAt: row.updated_at,
        })
      ).ok,
    ).toBe(false);
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();
  });
});
