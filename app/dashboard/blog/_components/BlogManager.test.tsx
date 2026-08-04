import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useBlogAggregate: () => ({}),
  useBlogMutations: () => ({}),
}));
const removeBlogImages = mock(async () => {});
mock.module("../_lib/uploads", () => ({
  uploadBlogImage: mock(async () => ({
    ok: true as const,
    data: {
      objectPath: "owner/blogs/new.jpg",
      publicUrl: "https://example.com/new.jpg",
    },
  })),
  removeBlogImages,
  retryBlogImageCleanup: mock(async () => {}),
  blogImagePath: () => "owner/blogs/old.jpg",
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload: () => {} }),
}));
const { default: BlogManager } = await import("./BlogManager");

const blog = {
  id: 10,
  groupId: 1,
  title: "First blog",
  slug: "first-blog",
  content: "A concise preview",
  metaTitle: "",
  metaDescription: "",
  imageUrl: "",
  enabled: true,
  rank: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};
const group = { id: 1, name: "News", enabled: true, rank: 1, blogs: [blog] };

describe("BlogManager", () => {
  beforeEach(() => removeBlogImages.mockClear());

  it("keeps an unsuccessful edit open with its draft", async () => {
    const updateBlog = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save blog",
    }));
    render(
      <BlogManager
        groups={[group]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ updateBlog: { mutateAsync: updateBlog } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit First blog" }));
    fireEvent.change(screen.getByLabelText("Blog title"), {
      target: { value: "Draft title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update blog" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      (screen.getByLabelText("Blog title") as HTMLInputElement).value,
    ).toBe("Draft title");
  });

  it("updates visibility only after the authoritative mutation succeeds", async () => {
    const updateBlog = mock(async () => ({
      ok: true as const,
      data: { ...blog, enabled: false },
    }));
    render(
      <BlogManager
        groups={[group]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ updateBlog: { mutateAsync: updateBlog } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Hide First blog" }));
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Show First blog" }),
      ).toBeTruthy(),
    );
    expect(updateBlog).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
