import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

const { LinkForm } = await import("./LinkForm");

afterEach(cleanup);

describe("LinkForm media controls", () => {
  test("restores persisted layout, alt policy, featured state, and editor preview", async () => {
    render(
      <LinkForm
        groupId="00000000-0000-4000-8000-000000000701"
        userId="00000000-0000-4000-8000-000000000702"
        link={{
          id: "00000000-0000-4000-8000-000000000703",
          title: "Book a consultation",
          url: "https://example.test/book",
          isActive: true,
          rank: 1,
          imageUrl:
            "https://storage.test/storage/v1/object/public/link-images/owner/links/card.webp",
          imageVariant: "large-image",
          imageAlt: "Reception desk",
          imageDecorative: false,
          isFeatured: true,
        }}
        mutations={
          {
            updateLink: { isPending: false, mutateAsync: mock() },
            createLink: { isPending: false, mutateAsync: mock() },
          } as never
        }
        afterSuccess={mock()}
      />,
    );
    await act(async () => undefined);

    expect(
      (screen.getByLabelText("Large image") as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText("Decorative image") as HTMLButtonElement
      ).getAttribute("data-state"),
    ).toBe("unchecked");
    expect(screen.getByLabelText("Image description")).toBeTruthy();
    const preview = screen.getByTestId("link-editor-preview");
    expect(preview.getAttribute("data-link-image-variant")).toBe("large-image");
    expect(preview.getAttribute("data-link-featured")).toBe("true");
    expect(screen.getByRole("img", { name: "Reception desk" })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("No image"));
    });
    expect(preview.getAttribute("data-link-image-variant")).toBe("none");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
