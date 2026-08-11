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

describe("LinkRow", () => {
  it("uses a compact white card and accessible ordering controls", () => {
    const onMove = mock();
    render(
      <LinkRow
        groupId="00000000-0000-4000-8000-000000000002"
        link={link}
        index={0}
        total={2}
        mutations={{} as never}
        onMove={onMove}
        afterSuccess={mock()}
        userId="00000000-0000-4000-8000-000000000003"
      />,
    );

    const card = screen.getByRole("article");
    expect(card.className).toContain("max-h-[18rem]");
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
  });
});
