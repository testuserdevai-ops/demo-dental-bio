import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("./BasicProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="basic-renderer">{username}</div>
  ),
}));

const { default: PublicProfileTemplate } =
  await import("./PublicProfileTemplate");

describe("PublicProfileTemplate", () => {
  test("applies one resolved theme boundary around the Basic renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "basic",
          themeId: "warm-care",
          layoutVariant: "classic-stack",
          answers: {},
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate username="template-basic" profile={profile} />,
    );

    expect(screen.getByTestId("basic-renderer").textContent).toBe(
      "template-basic",
    );
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("warm-care");
  });
});
