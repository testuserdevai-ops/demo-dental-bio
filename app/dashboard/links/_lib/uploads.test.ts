import { beforeEach, describe, expect, mock, test } from "bun:test";

const upload = mock(
  async (
    _path: string,
    _file: File,
    _options: { upsert: boolean; contentType: string },
  ) => ({ error: null }),
);
const remove = mock(async () => ({ error: null }));
const rpc = mock(async () => ({ data: [], error: null }));
const getPublicUrl = mock((path: string) => ({
  data: {
    publicUrl: `https://storage.test/storage/v1/object/public/link-images/${path}`,
  },
}));
mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload, remove, getPublicUrl }) },
    rpc,
  }),
}));

const {
  LINK_IMAGE_MAX_BYTES,
  linkImagePath,
  uploadLinkImage,
  validateLinkImage,
} = await import("./uploads");

beforeEach(() => {
  upload.mockClear();
  remove.mockClear();
  rpc.mockClear();
});

describe("link image uploads", () => {
  test("rejects unsupported and oversized files before opening Storage", async () => {
    const unsupported = new File(["svg"], "icon.svg", {
      type: "image/svg+xml",
    });
    expect(validateLinkImage(unsupported)).toContain("JPEG");
    const oversized = new File(
      [new Uint8Array(LINK_IMAGE_MAX_BYTES + 1)],
      "large.webp",
      { type: "image/webp" },
    );
    expect((await uploadLinkImage(crypto.randomUUID(), oversized)).ok).toBe(
      false,
    );
    expect(upload).not.toHaveBeenCalled();
  });

  test("uses a generated owner-scoped object path and no upsert", async () => {
    const userId = "00000000-0000-4000-8000-000000000701";
    const result = await uploadLinkImage(
      userId,
      new File(["image"], "photo.png", { type: "image/png" }),
    );
    expect(result.ok).toBe(true);
    const [path, , options] = upload.mock.calls[0]!;
    expect(path).toMatch(
      /^00000000-0000-4000-8000-000000000701\/links\/[0-9a-f-]+\.png$/,
    );
    expect(options).toEqual({ upsert: false, contentType: "image/png" });
  });

  test("only extracts paths from the expected owner folder", () => {
    const userId = "00000000-0000-4000-8000-000000000701";
    expect(
      linkImagePath(
        `https://storage.test/storage/v1/object/public/link-images/${userId}/links/card.webp`,
        userId,
      ),
    ).toBe(`${userId}/links/card.webp`);
    expect(
      linkImagePath(
        "https://storage.test/storage/v1/object/public/link-images/other/links/card.webp",
        userId,
      ),
    ).toBeNull();
  });
});
