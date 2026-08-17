import { describe, expect, test } from "bun:test";

import { selectProfileVideos } from "./profile-videos";

describe("shared profile video selector", () => {
  test("normalizes loader numeric strings and deterministically orders enabled records", () => {
    const selected = selectProfileVideos([
      {
        id: "20",
        name: " Patient guides ",
        rank: "2",
        enabled: true,
        datas: [
          {
            id: "102",
            title: " Vimeo guide ",
            link: "https://vimeo.com/123456",
            rank: "2",
            enabled: true,
          },
          {
            id: "103",
            title: "Dailymotion guide",
            link: "https://dai.ly/x8abcde",
            rank: "2",
            enabled: true,
          },
          {
            id: "101",
            title: " YouTube guide ",
            link: "https://www.youtube.com/watch?v=abc_DEF-12",
            rank: "1",
            enabled: true,
          },
        ],
      },
      {
        id: 10,
        name: "Native video",
        rank: 1,
        enabled: true,
        datas: [
          {
            id: 99,
            title: "Practice tour",
            link: "https://cdn.example.test/tour.webm",
            rank: 1,
            enabled: true,
          },
        ],
      },
    ]);

    expect(
      selected.map(({ id, datas }) => [
        id,
        datas.map(({ id: videoId }) => videoId),
      ]),
    ).toEqual([
      ["10", ["99"]],
      ["20", ["101", "102", "103"]],
    ]);
    expect(selected[1]?.datas[0]).toMatchObject({
      title: "YouTube guide",
      link: "https://www.youtube.com/embed/abc_DEF-12",
      position: 1,
      presentation: {
        kind: "iframe",
        provider: "youtube",
        src: "https://www.youtube.com/embed/abc_DEF-12",
      },
    });
    expect(selected[0]?.datas[0]?.presentation).toEqual({
      kind: "native-video",
      src: "https://cdn.example.test/tour.webm",
    });
  });

  test("rejects look-alikes, unsafe URLs, nullable flags, blanks, and duplicates", () => {
    const valid = {
      id: 1,
      title: "A valid video",
      link: "https://youtu.be/abc_DEF-12",
      enabled: true,
    };
    expect(
      selectProfileVideos([
        null,
        {
          id: 1,
          name: "Group",
          enabled: true,
          datas: [
            valid,
            { ...valid, id: 2, link: "http://youtu.be/abc_DEF-12" },
            {
              ...valid,
              id: 3,
              link: "https://youtube.com.evil.test/watch?v=abc_DEF-12",
            },
            {
              ...valid,
              id: 4,
              link: "https://user:secret@youtube.com/watch?v=abc_DEF-12",
            },
            { ...valid, id: 5, title: " " },
            { ...valid, id: 6, enabled: null },
            valid,
          ],
        },
        { id: 2, name: "Disabled", enabled: false, datas: [valid] },
        { id: 3, name: "Null flag", enabled: null, datas: [valid] },
      ]),
    ).toEqual([
      {
        id: "1",
        name: "Group",
        rank: undefined,
        enabled: true,
        datas: [
          {
            id: "1",
            title: "A valid video",
            link: "https://www.youtube.com/embed/abc_DEF-12",
            rank: undefined,
            enabled: true,
            position: 1,
            presentation: {
              kind: "iframe",
              provider: "youtube",
              src: "https://www.youtube.com/embed/abc_DEF-12",
            },
          },
        ],
      },
    ]);
  });
});
