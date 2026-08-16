import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
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
const secondBlog = {
  ...blog,
  id: 11,
  title: "Second blog",
  slug: "second-blog",
  rank: 2,
};
const group = { id: 1, name: "News", enabled: true, rank: 1, blogs: [blog] };
const secondGroup = {
  id: 2,
  name: "Guides",
  enabled: true,
  rank: 2,
  blogs: [],
};

type Operation = {
  name: string;
  mutation: string;
  groups: (typeof group)[];
  successData?: unknown;
  run(): Promise<void>;
};

const operations: Operation[] = [
  {
    name: "group create",
    mutation: "createGroup",
    groups: [group],
    run: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add blog group" }));
      fireEvent.change(screen.getByLabelText("Group name"), {
        target: { value: "New group" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    },
  },
  {
    name: "group edit",
    mutation: "updateGroup",
    groups: [group],
    successData: { ...group, name: "Updated group" },
    run: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit group News" }));
      fireEvent.change(screen.getByLabelText("Group name"), {
        target: { value: "Updated group" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update group" }));
    },
  },
  {
    name: "group reorder",
    mutation: "reorderGroups",
    groups: [group, secondGroup],
    run: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Move News down" }));
      fireEvent.click(screen.getByRole("button", { name: "Save group order" }));
    },
  },
  {
    name: "group toggle",
    mutation: "updateGroup",
    groups: [group],
    successData: { ...group, enabled: false },
    run: async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Hide group News" }));
    },
  },
  {
    name: "group delete",
    mutation: "deleteGroup",
    groups: [group],
    run: async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete group News" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete blog group?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
  },
  {
    name: "blog create",
    mutation: "createBlog",
    groups: [group],
    run: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add blog to News" }));
      fireEvent.change(screen.getByLabelText("Blog title"), {
        target: { value: "New blog" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "New blog content" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save blog" }));
    },
  },
  {
    name: "blog edit",
    mutation: "updateBlog",
    groups: [group],
    successData: { ...blog, title: "Updated blog" },
    run: async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit First blog" }));
      fireEvent.change(screen.getByLabelText("Blog title"), {
        target: { value: "Updated blog" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update blog" }));
    },
  },
  {
    name: "blog reorder",
    mutation: "reorderBlogs",
    groups: [{ ...group, blogs: [blog, secondBlog] }],
    run: async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Move First blog down" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Save blog order" }));
    },
  },
  {
    name: "blog toggle",
    mutation: "updateBlog",
    groups: [group],
    successData: { ...blog, enabled: false },
    run: async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Hide First blog" }));
    },
  },
  {
    name: "blog delete",
    mutation: "deleteBlog",
    groups: [group],
    run: async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete First blog" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete blog?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
  },
];

function renderOperation(
  operation: Operation,
  mutateAsync: ReturnType<typeof mock>,
) {
  render(
    <BlogManager
      groups={operation.groups}
      loading={false}
      enabled
      userId="owner"
      mutations={
        {
          [operation.mutation]: { mutateAsync },
        } as never
      }
    />,
  );
}

afterEach(cleanup);

describe("BlogManager preview refresh mutation matrix", () => {
  beforeEach(() => triggerReload.mockClear());

  for (const operation of operations) {
    it(`${operation.name}: refreshes exactly once after success`, async () => {
      const mutateAsync = mock(async () => ({
        ok: true as const,
        data: operation.successData,
      }));
      renderOperation(operation, mutateAsync);

      await operation.run();

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(triggerReload).toHaveBeenCalledTimes(1);
    });

    it(`${operation.name}: does not refresh after an action failure`, async () => {
      const mutateAsync = mock(async () => ({
        ok: false as const,
        code: "EXPECTED_FAILURE",
        formError: "Expected mutation failure",
      }));
      renderOperation(operation, mutateAsync);

      await operation.run();

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "Expected mutation failure",
        ),
      );
      expect(triggerReload).not.toHaveBeenCalled();
    });

    it(`${operation.name}: does not refresh after a rejected mutation`, async () => {
      const mutateAsync = mock(async () => {
        throw new Error("network unavailable");
      });
      renderOperation(operation, mutateAsync);

      await operation.run();

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
      expect(triggerReload).not.toHaveBeenCalled();
    });
  }
});
