import { describe, expect, it } from "bun:test";
import {
  createVideoSchema,
  reorderVideosSchema,
  updateVideoSchema,
} from "./schemas";

const video = {
  groupId: 1,
  title: "A useful video",
  link: "https://www.youtube.com/watch?v=example",
  enabled: true,
};

describe("video schemas", () => {
  it("accepts the controlled video fields", () => {
    expect(createVideoSchema.parse(video)).toEqual(video);
    expect(updateVideoSchema.parse({ ...video, id: 1 })).toEqual({
      ...video,
      id: 1,
    });
  });

  it("rejects invalid URLs and submitted ownership fields", () => {
    expect(
      createVideoSchema.safeParse({ ...video, link: "not-a-url" }).success,
    ).toBe(false);
    expect(
      createVideoSchema.safeParse({ ...video, userId: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });

  it("requires duplicate-free ordering", () => {
    expect(
      reorderVideosSchema.safeParse({ groupId: 1, orderedIds: [1, 2] }).success,
    ).toBe(true);
    expect(
      reorderVideosSchema.safeParse({ groupId: 1, orderedIds: [1, 1] }).success,
    ).toBe(false);
  });
});
