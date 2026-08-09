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
  removeReviewImages,
  retryReviewImageCleanup,
  reviewImagePath,
  uploadReviewImage,
} = await import("./uploads");

describe("review image uploads", () => {
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
    const result = await uploadReviewImage(
      crypto.randomUUID(),
      new File(["x"], "x.svg", { type: "image/svg+xml" }),
    );
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uses the authorized user review folder and a unique path", async () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    const result = await uploadReviewImage(
      userId,
      new File(["image"], "review.webp", { type: "image/webp" }),
    );
    expect(result.ok).toBe(true);
    const path = upload.mock.calls[0]?.[0] as string;
    expect(path.startsWith(`${userId}/review/`)).toBe(true);
    expect(path.endsWith(".webp")).toBe(true);
  });

  it("extracts only an owned review object path from a public URL", () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    expect(
      reviewImagePath(
        `https://storage.test/storage/v1/object/public/review-images/${userId}/review/avatar.webp`,
        userId,
      ),
    ).toBe(`${userId}/review/avatar.webp`);
    expect(
      reviewImagePath(
        "https://storage.test/storage/v1/object/public/review-images/other/review/avatar.webp",
        userId,
      ),
    ).toBeNull();
  });

  it("queues failed Storage cleanup for a later retry", async () => {
    const userId = "00000000-0000-4000-8000-000000000901";
    const objectPath = `${userId}/review/stale.webp`;
    remove.mockImplementationOnce(async () => ({ error: { message: "down" } }));
    await removeReviewImages([objectPath]);
    expect(rpc).toHaveBeenCalledWith("enqueue_dashboard_media_cleanup", {
      p_user_id: userId,
      p_bucket: "review-images",
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
                bucket: "review-images",
                object_path: `${userId}/review/stale.webp`,
              },
            ],
            error: null,
          }
        : { data: null, error: null },
    );
    await retryReviewImageCleanup(userId);
    expect(rpc).toHaveBeenCalledWith("claim_dashboard_media_cleanup", {
      p_user_id: userId,
      p_bucket: "review-images",
    });
    expect(remove).toHaveBeenCalledWith([`${userId}/review/stale.webp`]);
    expect(rpc).toHaveBeenCalledWith("complete_dashboard_media_cleanup", {
      p_user_id: userId,
      p_job_ids: ["00000000-0000-4000-8000-000000000999"],
    });
  });
});
