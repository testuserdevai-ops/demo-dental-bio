import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useBlogAggregate: () => ({}),
  useBlogMutations: () => ({}),
}));
mock.module("../_lib/uploads", () => ({
  uploadBlogImage: mock(async () => ({
    ok: true as const,
    data: {
      objectPath: "owner/blogs/new.jpg",
      publicUrl: "https://example.com/new.jpg",
    },
  })),
  removeBlogImages: mock(async () => {}),
  retryBlogImageCleanup: mock(async () => {}),
  blogImagePath: () => null,
}));
const triggerReload = mock(() => {});
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
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

afterEach(cleanup);

describe("BlogManager preview refresh", () => {
  beforeEach(() => triggerReload.mockClear());

  it("refreshes the preview exactly once after a successful mutation", async () => {
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

    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(updateBlog).toHaveBeenCalledTimes(1);
  });

  it("does not refresh the preview after a failed mutation", async () => {
    const updateBlog = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not update blog",
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
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not update blog",
      ),
    );
    expect(triggerReload).not.toHaveBeenCalled();
    expect(updateBlog).toHaveBeenCalledTimes(1);
  });
});
