import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import GalleryImage from "./GalleryImage";

afterEach(cleanup);

describe("GalleryImage", () => {
  test("opens the selected image in a visible contain-sized modal", () => {
    render(
      <AnalyticsProvider
        profileId="00000000-0000-4000-8000-000000000001"
        renderContext={{ kind: "preview" }}
      >
        <GalleryImage
          galleryId="00000000-0000-4000-8000-000000000002"
          position={1}
          src="http://localhost:3000/placeholder.webp"
          title="Smile transformation"
          subTitle="Before"
        />
      </AnalyticsProvider>,
    );

    expect(screen.getByText("Before").className).toContain(
      "text-[var(--profile-text-muted)]",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open Smile transformation" }),
    );

    const modalImage = screen.getByRole("img", {
      name: "Smile transformation",
    });
    expect(modalImage.style.objectFit).toBe("contain");
    expect(modalImage.parentElement?.className).toContain("w-full h-full");
    expect(modalImage.closest(".w-\\[90vw\\]")).toBeTruthy();
  });
});
