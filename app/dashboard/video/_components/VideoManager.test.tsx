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
  useVideoAggregate: () => ({}),
  useVideoMutations: () => ({}),
}));
const triggerReload = mock(() => {});
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
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
const secondVideo = { ...video, id: 11, title: "Second video", rank: 2 };
const group = {
  id: 1,
  name: "Guides",
  enabled: true,
  rank: 1,
  videos: [video],
};
const secondGroup = {
  id: 2,
  name: "Research",
  enabled: true,
  rank: 2,
  videos: [],
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
      fireEvent.click(screen.getByRole("button", { name: "Add video group" }));
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
    successData: { ...group, name: "Clinical guides" },
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Edit group Guides" }),
      );
      fireEvent.change(screen.getByLabelText("Group name"), {
        target: { value: "Clinical guides" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update group" }));
    },
    expectedArgument: { id: 1, name: "Clinical guides", enabled: true },
  },
  {
    name: "group toggle",
    mutation: "updateGroup",
    successData: { ...group, enabled: false },
    act() {
      fireEvent.click(
        screen.getByRole("switch", { name: "Hide group Guides" }),
      );
    },
    expectedArgument: { id: 1, name: "Guides", enabled: false },
  },
  {
    name: "group delete",
    mutation: "deleteGroup",
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete group Guides" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete video group?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
    expectedArgument: { id: 1 },
  },
  {
    name: "group reorder",
    mutation: "reorderGroups",
    groups: [group, secondGroup],
    successData: undefined,
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Move Guides down" }));
      fireEvent.click(screen.getByRole("button", { name: "Save group order" }));
    },
    expectedArgument: { orderedIds: [2, 1] },
  },
  {
    name: "video create",
    mutation: "createVideo",
    successData: secondVideo,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Add video to Guides" }),
      );
      fireEvent.change(screen.getByLabelText("Video title"), {
        target: { value: "Second video" },
      });
      fireEvent.change(screen.getByLabelText("Video URL"), {
        target: { value: secondVideo.link },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add video" }));
    },
  },
  {
    name: "video edit",
    mutation: "updateVideo",
    successData: { ...video, title: "Edited video" },
    act() {
      fireEvent.click(screen.getByRole("button", { name: "Edit First video" }));
      fireEvent.change(screen.getByLabelText("Video title"), {
        target: { value: "Edited video" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Update video" }));
    },
  },
  {
    name: "video toggle",
    mutation: "updateVideo",
    successData: { ...video, enabled: false },
    act() {
      fireEvent.click(screen.getByRole("switch", { name: "Hide First video" }));
    },
    expectedArgument: expect.objectContaining({ enabled: false }),
  },
  {
    name: "video delete",
    mutation: "deleteVideo",
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete First video" }),
      );
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "Delete video?" }),
        ).getByRole("button", { name: "Delete" }),
      );
    },
    expectedArgument: { id: 10 },
  },
  {
    name: "video reorder",
    mutation: "reorderVideos",
    groups: [{ ...group, videos: [video, secondVideo] }],
    successData: undefined,
    act() {
      fireEvent.click(
        screen.getByRole("button", { name: "Move First video down" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Save video order" }));
    },
    expectedArgument: { groupId: 1, orderedIds: [11, 10] },
  },
];

function renderScenario(scenario: Scenario, mutation: ReturnType<typeof mock>) {
  render(
    <VideoManager
      groups={scenario.groups ?? [group]}
      loading={false}
      enabled
      mutations={{ [scenario.mutation]: { mutateAsync: mutation } } as never}
    />,
  );
}

describe("VideoManager preview reload contract", () => {
  beforeEach(() => {
    triggerReload.mockClear();
  });

  for (const scenario of scenarios) {
    it(`${scenario.name} reloads exactly once after authoritative success`, async () => {
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

    it(`${scenario.name} keeps authoritative state and never reloads after rejection`, async () => {
      const mutation = mock(async () => ({
        ok: false as const,
        code: "MUTATION_FAILED",
        formError: "Could not save",
      }));
      renderScenario(scenario, mutation);

      scenario.act();

      await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
      expect(triggerReload).not.toHaveBeenCalled();
      if (scenario.name.includes("delete")) {
        expect(screen.getByRole("alertdialog")).toBeTruthy();
      } else {
        expect(screen.getByRole("alert").textContent).toContain(
          "Could not save",
        );
      }
    });
  }

  it("retains a rejected edit draft and skips preview reload", async () => {
    const updateVideo = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save video",
    }));
    renderScenario(scenarios[6]!, updateVideo);
    fireEvent.click(screen.getByRole("button", { name: "Edit First video" }));
    fireEvent.change(screen.getByLabelText("Video title"), {
      target: { value: "Draft title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update video" }));
    await waitFor(() => expect(updateVideo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      (screen.getByLabelText("Video title") as HTMLInputElement).value,
    ).toBe("Draft title");
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("rejects validation and delete cancellation without preview reload", async () => {
    renderScenario(
      scenarios[0]!,
      mock(async () => ({ ok: true as const })),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add video group" }));
    fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Group name").getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(triggerReload).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(
      screen.getByRole("button", { name: "Delete group Guides" }),
    );
    fireEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Delete video group?" }),
      ).getByRole("button", { name: "Cancel" }),
    );
    expect(screen.getByRole("heading", { name: "Guides" })).toBeTruthy();
    expect(triggerReload).not.toHaveBeenCalled();
  });
});
