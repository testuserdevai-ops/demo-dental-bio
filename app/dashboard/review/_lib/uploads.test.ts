import { beforeEach, describe, expect, it, mock } from "bun:test";

const upload = mock(async (_path: string) => ({ error: null as unknown }));
const remove = mock(async () => ({ error: null as unknown }));
const getPublicUrl = mock((path: string) => ({
  data: { publicUrl: `https://storage.test/${path}` },
}));
mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload, remove, getPublicUrl }) },
  }),
}));

const { reviewImagePath, uploadReviewImage } = await import("./uploads");

describe("review image uploads", () => {
  beforeEach(() => upload.mockClear());

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
});
