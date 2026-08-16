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
  name: "Research",
  enabled: true,
  rank: 2,
  blogs: [],
};

type Scenario = {
  name: string;
  mutation: string;
  groups?: (typeof group)[];
  successData: unknown;
  act(): void;
  expectedArgument?: unknown;
};

const scenarios: Scenario[] = [
  {
    name: "group create",
    mutation: "createGroup",
    successData: secondGroup,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Add blog group" }));
      fireEvent.change(screen.getByLabelText("Group name"), {
        target: { value: "Research" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    },
    expectedArgument: { name: "Research" },
  },
  {
    name: "group edit",
    mutation: "updateGroup",
    successData: { ...group, name: "Clinical news" },
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Edit group News" }));
      fireEvent.change(screen.getByLabelText("Group name"), {
        target: { value: "Clinical news" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update group" }));
    },
    expectedArgument: { id: 1, name: "Clinical news", enabled: true },
  },
  {
    name: "group toggle",
    mutation: "updateGroup",
    successData: { ...group, enabled: false },
    act() {
      fireEvent.click(screen.getByRole("switch", { name: "Hide group News" }));
    },
    expectedArgument: { id: 1, name: "News", enabled: false },
  },
  {
    name: "group delete",
    mutation: "deleteGroup",
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete group News" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete blog group?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
    expectedArgument: { id: 1 },
  },
  {
    name: "group reorder",
    mutation: "reorderGroups",
    groups: [group, secondGroup] as (typeof group)[],
    successData: undefined,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Move News down" }));
      fireEvent.click(screen.getByRole("button", { name: "Save group order" }));
    },
    expectedArgument: { orderedIds: [2, 1] },
  },
  {
    name: "blog create",
    mutation: "createBlog",
    successData: secondBlog,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Add blog to News" }));
      fireEvent.change(screen.getByLabelText("Blog title"), {
        target: { value: "Second blog" },
      });
      fireEvent.change(screen.getByLabelText("Content"), {
        target: { value: "Second article content" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save blog" }));
    },
  },
  {
    name: "blog edit",
    mutation: "updateBlog",
    successData: { ...blog, title: "Edited blog" },
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Edit First blog" }));
      fireEvent.change(screen.getByLabelText("Blog title"), {
        target: { value: "Edited blog" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update blog" }));
    },
  },
  {
    name: "blog toggle",
    mutation: "updateBlog",
    successData: { ...blog, enabled: false },
    act() {
      fireEvent.click(screen.getByRole("switch", { name: "Hide First blog" }));
    },
  },
  {
    name: "blog delete",
    mutation: "deleteBlog",
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete First blog" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete blog?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
    expectedArgument: { id: 10 },
  },
  {
    name: "blog reorder",
    mutation: "reorderBlogs",
    groups: [{ ...group, blogs: [blog, secondBlog] }],
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Move First blog down" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Save blog order" }));
    },
    expectedArgument: { groupId: 1, orderedIds: [11, 10] },
  },
];

function renderScenario(scenario: Scenario, mutation: ReturnType<typeof mock>) {
  render(
    <BlogManager
      groups={scenario.groups ?? [group]}
      loading={false}
      enabled
      userId="owner"
      mutations={{ [scenario.mutation]: { mutateAsync: mutation } } as never}
    />,
  );
}

describe("BlogManager preview reload contract", () => {
  beforeEach(() => {
    removeBlogImages.mockClear();
    triggerReload.mockClear();
  });

  for (const scenario of scenarios) {
    it(`${scenario.name} reloads exactly once after success`, async () => {
      const mutation = mock(async () => ({
        ok: true as const,
        data: scenario.successData,
      }));
      renderScenario(scenario, mutation);

      scenario.act();

      await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
      if (scenario.expectedArgument) {
        expect(mutation).toHaveBeenCalledWith(scenario.expectedArgument);
      }
      await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    });

    it(`${scenario.name} never reloads after failure`, async () => {
      const mutation = mock(async () => ({
        ok: false as const,
        code: "MUTATION_FAILED",
        formError: "Could not save",
      }));
      renderScenario(scenario, mutation);

      scenario.act();

      await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      expect(triggerReload).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("Could not save");
    });
  }

  it("keeps an unsuccessful edit open with its draft", async () => {
    const updateBlog = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save blog",
    }));
    renderScenario(scenarios[6]!, updateBlog);
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
});
