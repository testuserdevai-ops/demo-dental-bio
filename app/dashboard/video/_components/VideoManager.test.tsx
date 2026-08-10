import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useVideoAggregate: () => ({}),
  useVideoMutations: () => ({}),
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload: () => {} }),
}));
const { default: VideoManager } = await import("./VideoManager");

const video = {
  id: 10,
  groupId: 1,
  title: "First video",
  link: "https://www.youtube.com/watch?v=example",
  enabled: true,
  rank: 1,
};
const group = {
  id: 1,
  name: "Guides",
  enabled: true,
  rank: 1,
  videos: [video],
};

describe("VideoManager", () => {
  it("keeps an unsuccessful edit open with its draft", async () => {
    const updateVideo = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save video",
    }));
    render(
      <VideoManager
        groups={[group]}
        loading={false}
        enabled
        mutations={{ updateVideo: { mutateAsync: updateVideo } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit First video" }));
    fireEvent.change(screen.getByLabelText("Video title"), {
      target: { value: "Draft title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update video" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      (screen.getByLabelText("Video title") as HTMLInputElement).value,
    ).toBe("Draft title");
  });

  it("updates visibility only after the authoritative mutation succeeds", async () => {
    const updateVideo = mock(async () => ({
      ok: true as const,
      data: { ...video, enabled: false },
    }));
    render(
      <VideoManager
        groups={[group]}
        loading={false}
        enabled
        mutations={{ updateVideo: { mutateAsync: updateVideo } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Hide First video" }));
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Show First video" }),
      ).toBeTruthy(),
    );
    expect(updateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
