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

const { galleryImagePath, uploadGalleryImage } = await import("./uploads");

describe("gallery image uploads", () => {
  beforeEach(() => upload.mockClear());

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
});
