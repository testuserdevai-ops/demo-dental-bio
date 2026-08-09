import { beforeEach, describe, expect, it, mock } from "bun:test";

const upload = mock(async (_path: string, _file: File, _options: unknown) => ({
  error: null as any,
}));
const list = mock(async () => ({
  data: [{ name: "old.webp" }, { name: "new.webp" }],
  error: null as any,
}));
const remove = mock(async () => ({ error: null as any }));
const getPublicUrl = mock((path: string) => ({
  data: { publicUrl: `https://storage.test/${path}` },
}));
mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ upload, list, remove, getPublicUrl }) },
  }),
}));

const { uploadProfilePicture } = await import("./uploads");

describe("profile picture uploads", () => {
  beforeEach(() => {
    upload.mockClear();
    list.mockClear();
    remove.mockClear();
  });

  it("rejects unsafe files before Storage", async () => {
    const result = await uploadProfilePicture(
      crypto.randomUUID(),
      new File(["x"], "x.svg", { type: "image/svg+xml" }),
    );
    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads into the seeded dentistry folder before retryable stale cleanup", async () => {
    const dentistryId = "00000000-0000-4000-8000-000000000811";
    const result = await uploadProfilePicture(
      dentistryId,
      new File(["image"], "photo.png", { type: "image/png" }),
    );
    expect(result.ok).toBe(true);
    const path = upload.mock.calls[0]?.[0] as string;
    expect(path.startsWith(`${dentistryId}/profile-pic-`)).toBe(true);
    expect(path.endsWith(".webp")).toBe(true);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0] ?? Infinity,
    );
  });
});
