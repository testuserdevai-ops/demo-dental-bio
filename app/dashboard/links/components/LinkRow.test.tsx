import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

mock.module("react-dnd", () => ({
  useDrag: () => [{}, () => undefined],
  useDrop: () => [{}, () => undefined],
}));

const { LinkRow } = await import("./LinkRow");

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

describe("LinkRow", () => {
  it("uses a white card without a row-level scroller and accessible ordering controls", () => {
    const onMove = mock();
    render(
      <LinkRow
        groupId="00000000-0000-4000-8000-000000000002"
        link={link}
        index={0}
        total={2}
        mutations={mutations as never}
        onMove={onMove}
        afterSuccess={mock()}
        userId="00000000-0000-4000-8000-000000000003"
      />,
    );

    const card = screen.getByRole("article");
    expect(card.className).not.toContain("max-h-");
    expect(card.className).not.toContain("overflow-y-auto");
    expect(card.className).toContain("bg-white");
    expect(
      (
        screen.getByRole("button", {
          name: "Move Book online up",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Move Book online down" }),
    );
    expect(onMove).toHaveBeenCalledWith(0, 1);
    expect(
      screen.getByRole("button", { name: "Hide Book online" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View analytics" }).getAttribute("href"),
    ).toBe(
      "/dashboard/analytics?tab=content&range=7d&contentAction=link_click&contentId=00000000-0000-4000-8000-000000000001",
    );
  });

  it("expands editing content naturally and reports state to its only list scroller", () => {
    const onEditingChange = mock();
    render(
      <LinkRow
        groupId="00000000-0000-4000-8000-000000000002"
        link={link}
        index={0}
        total={1}
        mutations={mutations as never}
        onMove={mock()}
        afterSuccess={mock()}
        userId="00000000-0000-4000-8000-000000000003"
        onEditingChange={onEditingChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Book online" }));
    const card = screen.getByRole("article");
    expect(card.getAttribute("data-link-row-editing")).toBe("true");
    expect(card.className).not.toContain("max-h-");
    expect(card.className).not.toContain("overflow-y-auto");
    expect(screen.getByRole("button", { name: "Update link" })).toBeTruthy();
    expect(onEditingChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
  });
});
