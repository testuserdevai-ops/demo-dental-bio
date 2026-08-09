import { beforeEach, describe, expect, it, mock } from "bun:test";

const upload = mock(async (_path: string, _file: File, _options: unknown) => ({
  error: null as unknown,
}));
const remove = mock(async () => ({ error: null as unknown }));
const rpc = mock(async (_name: string, _args: unknown) => ({
  data: null as unknown,
  error: null as unknown,
}));
const getPublicUrl = mock((path: string) => ({
  data: { publicUrl: `https://storage.test/${path}` },
}));
mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload, remove, getPublicUrl }) },
    rpc,
  }),
}));

const {
  galleryImagePath,
  removeGalleryImages,
  retryGalleryImageCleanup,
  uploadGalleryImage,
} = await import("./uploads");

describe("gallery image uploads", () => {
  beforeEach(() => {
    upload.mockClear();
    remove.mockClear();
    rpc.mockClear();
    remove.mockImplementation(async () => ({ error: null as unknown }));
    rpc.mockImplementation(async () => ({
      data: null as unknown,
      error: null as unknown,
    }));
  });

  it("rejects unsafe files before Storage", async () => {
    const result = await uploadGalleryImage(
      crypto.randomUUID(),
      new File(["x"], "x.svg", { type: "image/svg+xml" }),
    );
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uses the authorized user gallery folder and a unique path", async () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    const result = await uploadGalleryImage(
      userId,
      new File(["image"], "case.png", { type: "image/png" }),
    );
    expect(result.ok).toBe(true);
    const path = upload.mock.calls[0]?.[0] as string;
    expect(path.startsWith(`${userId}/gallery/`)).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("extracts only an owned gallery object path from a public URL", () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    expect(
      galleryImagePath(
        `https://storage.test/storage/v1/object/public/gallery-images/${userId}/gallery/case.webp`,
        userId,
      ),
    ).toBe(`${userId}/gallery/case.webp`);
    expect(
      galleryImagePath(
        "https://storage.test/storage/v1/object/public/gallery-images/other/gallery/case.webp",
        userId,
      ),
    ).toBeNull();
  });

  it("queues failed Storage cleanup for a later retry", async () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    const objectPath = `${userId}/gallery/stale.webp`;
    remove.mockImplementationOnce(async () => ({ error: { message: "down" } }));
    await removeGalleryImages([objectPath]);
    expect(rpc).toHaveBeenCalledWith("enqueue_dashboard_media_cleanup", {
      p_user_id: userId,
      p_bucket: "gallery-images",
      p_object_path: objectPath,
    });
  });

  it("removes and completes claimed cleanup jobs", async () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    rpc.mockImplementation(async (name: string) =>
      name === "claim_dashboard_media_cleanup"
        ? {
            data: [
              {
                job_id: "00000000-0000-4000-8000-000000000999",
                bucket: "gallery-images",
                object_path: `${userId}/gallery/stale.webp`,
              },
            ],
            error: null,
          }
        : { data: null, error: null },
    );
    await retryGalleryImageCleanup(userId);
    expect(rpc).toHaveBeenCalledWith("claim_dashboard_media_cleanup", {
      p_user_id: userId,
      p_bucket: "gallery-images",
    });
    expect(remove).toHaveBeenCalledWith([`${userId}/gallery/stale.webp`]);
    expect(rpc).toHaveBeenCalledWith("complete_dashboard_media_cleanup", {
      p_user_id: userId,
      p_job_ids: ["00000000-0000-4000-8000-000000000999"],
    });
  });
});
