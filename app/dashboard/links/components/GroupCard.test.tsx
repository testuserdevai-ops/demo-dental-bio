import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("react-dnd", () => ({
  useDrag: () => [{}, () => undefined],
  useDrop: () => [{}, () => undefined],
}));

const { GroupCard } = await import("./GroupCard");

const link = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Book online",
  url: "https://example.com/book",
  isActive: true,
  rank: 1,
  imageUrl: null,
  imageVariant: "none" as const,
  imageAlt: null,
  imageDecorative: true,
  isFeatured: false,
};

const mutations = {
  createLink: { isPending: false, mutateAsync: mock() },
  updateLink: { isPending: false, mutateAsync: mock() },
};

describe("GroupCard", () => {
  it("releases the list scroller while a link editor is expanded", () => {
    render(
      <GroupCard
        group={{
          id: "00000000-0000-4000-8000-000000000002",
          heading: "Resources",
          rank: 1,
          links: [link],
        }}
        mutations={mutations as never}
        dragRef={mock()}
        index={0}
        total={1}
        onMove={mock()}
        afterSuccess={mock()}
        userId="00000000-0000-4000-8000-000000000003"
      />,
    );

    const list = document.querySelector("[data-link-list-editing]");
    expect(list?.getAttribute("data-link-list-editing")).toBe("false");
    expect(list?.className).toContain("max-h-[32rem]");
    expect(list?.className).toContain("overflow-y-auto");

    fireEvent.click(screen.getByRole("button", { name: "Edit Book online" }));
    expect(list?.getAttribute("data-link-list-editing")).toBe("true");
    expect(list?.className).not.toContain("max-h-");
    expect(list?.className).not.toContain("overflow-y-auto");
    expect(screen.getByRole("button", { name: "Update link" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(list?.getAttribute("data-link-list-editing")).toBe("false");
    expect(list?.className).toContain("overflow-y-auto");
  });
});
