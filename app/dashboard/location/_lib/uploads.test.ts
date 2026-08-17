import { beforeEach, describe, expect, it, mock } from "bun:test";

const upload = mock();
const remove = mock();
const rpc = mock();
const getPublicUrl = mock((path: string) => ({
  data: {
    publicUrl: `https://storage.test/storage/v1/object/public/location-images/${path}`,
  },
}));

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload, remove, getPublicUrl }),
    },
    rpc,
  }),
}));

const {
  LOCATION_IMAGE_MAX_BYTES,
  createLocationImagePath,
  locationImagePath,
  removeLocationImages,
  retryLocationImageCleanup,
  uploadLocationImage,
  validateLocationImage,
} = await import("./uploads");

const scope = {
  userId: "00000000-0000-4000-8000-000000000101",
  dentistryId: "00000000-0000-4000-8000-000000000102",
  locationId: "00000000-0000-4000-8000-000000000103",
};

describe("location image uploads", () => {
  beforeEach(() => {
    upload.mockReset();
    upload.mockResolvedValue({ error: null });
    remove.mockReset();
    remove.mockResolvedValue({ error: null });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [], error: null });
  });

  it("builds and parses the exact owner/dentistry/location path", () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
      "webp",
    );
    expect(path).toBe(
      `${scope.userId}/dentistries/${scope.dentistryId}/locations/${scope.locationId}/00000000-0000-4000-8000-000000000104.webp`,
    );
    expect(
      locationImagePath(
        `https://storage.test/storage/v1/object/public/location-images/${path}`,
        scope,
      ),
    ).toBe(path);
    expect(
      locationImagePath(
        `https://user:secret@storage.test/storage/v1/object/public/location-images/${path}`,
        scope,
      ),
    ).toBeNull();
    expect(
      locationImagePath(
        `https://storage.test/storage/v1/object/public/location-images/${scope.userId}/dentistries/${scope.dentistryId}/locations/00000000-0000-4000-8000-000000000999/file.webp`,
        scope,
      ),
    ).toBeNull();
    expect(() =>
      createLocationImagePath({ ...scope, locationId: "../foreign" }),
    ).toThrow("scope is invalid");
    expect(
      locationImagePath(
        `https://storage.test/storage/v1/object/public/location-images/${path}`,
        { ...scope, userId: "../foreign" },
      ),
    ).toBeNull();
  });

  it("validates type and size before uploading", async () => {
    const invalidType = new File(["x"], "location.gif", {
      type: "image/gif",
    });
    expect(validateLocationImage(invalidType)).toContain("JPEG");
    const tooLarge = new File(
      [new Uint8Array(LOCATION_IMAGE_MAX_BYTES + 1)],
      "location.webp",
      { type: "image/webp" },
    );
    expect(validateLocationImage(tooLarge)).toContain("8 MB");
    const result = await uploadLocationImage(scope, invalidType);
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads with browser storage and returns the scoped public URL", async () => {
    const result = await uploadLocationImage(
      scope,
      new File(["image"], "location.webp", { type: "image/webp" }),
    );
    expect(result.ok).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0]).toContain(
      `${scope.userId}/dentistries/${scope.dentistryId}/locations/${scope.locationId}/`,
    );
  });

  it("surfaces storage upload failure without returning a URL", async () => {
    upload.mockResolvedValueOnce({ error: new Error("storage unavailable") });
    const result = await uploadLocationImage(
      scope,
      new File(["image"], "location.webp", { type: "image/webp" }),
    );
    expect(result).toEqual({
      ok: false,
      code: "UPLOAD_FAILED",
      formError: "Location image could not be uploaded",
    });
  });

  it("queues abandoned media when direct removal fails", async () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
    );
    remove.mockResolvedValueOnce({ error: new Error("storage unavailable") });
    await removeLocationImages([path]);
    expect(rpc).toHaveBeenCalledWith("enqueue_dashboard_media_cleanup", {
      p_user_id: scope.userId,
      p_bucket: "location-images",
      p_object_path: path,
    });
  });

  it("still queues abandoned media when the Storage client throws", async () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
    );
    remove.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(removeLocationImages([path])).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("enqueue_dashboard_media_cleanup", {
      p_user_id: scope.userId,
      p_bucket: "location-images",
      p_object_path: path,
    });
  });

  it("inspects resolved enqueue errors and retries the failed cleanup job", async () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
    );
    remove.mockResolvedValueOnce({ error: new Error("storage unavailable") });
    rpc.mockResolvedValueOnce({ data: null, error: new Error("queue busy") });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(removeLocationImages([path])).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("claims, removes, and completes durable cleanup work", async () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
    );
    rpc.mockResolvedValueOnce({
      data: [
        {
          job_id: "00000000-0000-4000-8000-000000000105",
          bucket: "location-images",
          object_path: path,
        },
      ],
      error: null,
    });
    await retryLocationImageCleanup(scope.userId);
    expect(remove).toHaveBeenCalledWith([path]);
    expect(rpc).toHaveBeenLastCalledWith("complete_dashboard_media_cleanup", {
      p_user_id: scope.userId,
      p_job_ids: ["00000000-0000-4000-8000-000000000105"],
    });
  });

  it("leaves claimed cleanup work durable when Storage remains unavailable", async () => {
    const path = createLocationImagePath(
      scope,
      "00000000-0000-4000-8000-000000000104",
    );
    rpc.mockResolvedValueOnce({
      data: [
        {
          job_id: "00000000-0000-4000-8000-000000000105",
          bucket: "location-images",
          object_path: path,
        },
      ],
      error: null,
    });
    remove.mockResolvedValueOnce({ error: new Error("still unavailable") });
    await retryLocationImageCleanup(scope.userId);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      "complete_dashboard_media_cleanup",
      expect.anything(),
    );
  });
});
