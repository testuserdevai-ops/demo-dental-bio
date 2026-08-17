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

  test("normalizes exact-host Twitch video and clip forms with a safe parent policy", () => {
    const links = [
      "https://www.twitch.tv/videos/123456789?parent=attacker.test&autoplay=true",
      "https://twitch.tv/dentalbio/clip/HelpfulClip_1?parent=attacker.test",
      "https://player.twitch.tv/?video=v987654321&parent=attacker.test&autoplay=true",
      "https://player.twitch.tv/?channel=dentalbio_live&parent=attacker.test",
      "https://player.twitch.tv/?collection=Collection_4",
      "https://clips.twitch.tv/DirectClip-2?parent=attacker.test",
      "https://clips.twitch.tv/embed?clip=EmbeddedClip_3&parent=attacker.test&autoplay=true",
    ];
    const [group] = selectProfileVideos([
      {
        id: 1,
        name: "Twitch guides",
        enabled: true,
        datas: links.map((link, index) => ({
          id: index + 1,
          title: `Twitch guide ${index + 1}`,
          link,
          rank: index + 1,
          enabled: true,
        })),
      },
    ]);

    expect(group?.datas.map(({ presentation }) => presentation)).toEqual([
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://player.twitch.tv/?video=v123456789",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://clips.twitch.tv/embed?clip=HelpfulClip_1",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://player.twitch.tv/?video=v987654321",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://player.twitch.tv/?channel=dentalbio_live",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://player.twitch.tv/?collection=Collection_4",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://clips.twitch.tv/embed?clip=DirectClip-2",
        parentPolicy: "current-host",
      },
      {
        kind: "iframe",
        provider: "twitch",
        src: "https://clips.twitch.tv/embed?clip=EmbeddedClip_3",
        parentPolicy: "current-host",
      },
    ]);
  });

  test("keeps every deliberately supported direct HTTPS media extension", () => {
    const extensions = [
      "mp4",
      "webm",
      "ogg",
      "mkv",
      "mov",
      "avi",
      "flv",
      "wmv",
      "3gp",
      "m4v",
      "m3u8",
      "mpd",
    ];
    const [group] = selectProfileVideos([
      {
        id: 1,
        name: "Direct media",
        enabled: true,
        datas: extensions.map((extension, index) => ({
          id: index + 1,
          title: `Direct ${extension}`,
          link: `https://cdn.example.test/video.${extension}`,
          rank: index + 1,
          enabled: true,
        })),
      },
    ]);

    expect(group?.datas).toHaveLength(extensions.length);
    expect(group?.datas.map(({ presentation }) => presentation)).toEqual(
      extensions.map((extension) => ({
        kind: "native-video",
        src: `https://cdn.example.test/video.${extension}`,
      })),
    );
    expect(
      selectProfileVideos([
        {
          id: 2,
          name: "Unsupported direct media",
          enabled: true,
          datas: [
            {
              id: 20,
              title: "Unsupported ogv",
              link: "https://cdn.example.test/video.ogv",
              enabled: true,
            },
          ],
        },
      ]),
    ).toEqual([]);
  });

  test("rejects malformed, spoofed, credentialed, and insecure Twitch destinations", () => {
    const links: unknown[] = [
      null,
      "http://twitch.tv/videos/123456789",
      "https://user:secret@twitch.tv/videos/123456789",
      "https://twitch.tv.evil.test/videos/123456789",
      "https://twitch.tv/videos/not-a-number",
      "https://twitch.tv/not-videos/123?video=v123456789",
      "https://player.twitch.tv/?channel=owner!",
      "https://player.twitch.tv/?parent=attacker.test",
      "https://player.twitch.tv/?video=v123456789&channel=owner",
      "https://player.twitch.tv/?video=v123456789&video=v987654321",
      "https://player.twitch.tv/?video=v123456789&clip=ConflictingClip",
      "https://clips.twitch.tv/embed?clip=",
      "https://clips.twitch.tv/embed?clip=FirstClip&clip=SecondClip",
      "https://clips.twitch.tv/not/embed?clip=SpoofedClip",
      "https://clips.twitch.tv/DirectClip?clip=ConflictingClip",
    ];
    const [group] = selectProfileVideos([
      {
        id: 1,
        name: "Twitch guides",
        enabled: true,
        datas: [
          ...links.map((link, index) => ({
            id: index + 1,
            title: `Rejected ${index + 1}`,
            link,
            enabled: true,
          })),
          {
            id: links.length + 1,
            title: "Valid fallback",
            link: "https://twitch.tv/videos/123456789",
            enabled: true,
          },
        ],
      },
    ]);

    expect(group?.datas.map(({ title }) => title)).toEqual(["Valid fallback"]);
  });
});
