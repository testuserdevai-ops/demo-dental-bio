import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useBlogAggregate: () => ({}),
  useBlogMutations: () => ({}),
}));
const removeBlogImages = mock(async () => {});
const triggerReload = mock(() => {});
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

describe("BlogManager", () => {
  beforeEach(() => {
    removeBlogImages.mockClear();
    triggerReload.mockClear();
  });

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
    expect(triggerReload).not.toHaveBeenCalled();
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
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("reloads the preview once after a successful create", async () => {
    const createGroup = mock(async () => ({
      ok: true as const,
      data: { id: 2, name: "Research", enabled: true, rank: 2, blogs: [] },
    }));
    render(
      <BlogManager
        groups={[group]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ createGroup: { mutateAsync: createGroup } } as never}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add blog group" }));
    fireEvent.change(screen.getByLabelText("Group name"), {
      target: { value: "Research" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add group" }));

    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(1));
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("never reloads the preview after a failed visibility mutation", async () => {
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

    fireEvent.click(screen.getByRole("switch", { name: "Hide First blog" }));

    await waitFor(() => expect(updateBlog).toHaveBeenCalledTimes(1));
    expect(triggerReload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not save blog",
    );
  });

  it("reloads the preview once after a successful reorder", async () => {
    const secondBlog = {
      ...blog,
      id: 11,
      title: "Second blog",
      slug: "second-blog",
      rank: 2,
    };
    const reorderBlogs = mock(async () => ({
      ok: true as const,
      data: undefined,
    }));
    render(
      <BlogManager
        groups={[{ ...group, blogs: [blog, secondBlog] }]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ reorderBlogs: { mutateAsync: reorderBlogs } } as never}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Move First blog down" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save blog order" }));

    await waitFor(() =>
      expect(reorderBlogs).toHaveBeenCalledWith({
        groupId: 1,
        orderedIds: [11, 10],
      }),
    );
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("reloads the preview once after a successful delete", async () => {
    const deleteBlog = mock(async () => ({
      ok: true as const,
      data: undefined,
    }));
    render(
      <BlogManager
        groups={[group]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ deleteBlog: { mutateAsync: deleteBlog } } as never}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete First blog" }));
    fireEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Delete blog?" }),
      ).getByRole("button", { name: "Delete" }),
    );

    await waitFor(() => expect(deleteBlog).toHaveBeenCalledWith({ id: 10 }));
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });
});
