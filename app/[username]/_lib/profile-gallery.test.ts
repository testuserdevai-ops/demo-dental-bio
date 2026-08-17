import { describe, expect, test } from "bun:test";

import { selectProfileGallery } from "./profile-gallery";

describe("shared profile gallery selector", () => {
  test("keeps every eligible case and general image in supplied saved order", () => {
    const cases = Array.from({ length: 5 }, (_, index) => ({
      id: 101 + index,
      title: `Case ${index + 1}`,
      before_image_url: `/previews/case-${index + 1}-before.webp`,
      after_image_url: `https://cdn.example.com/case-${index + 1}-after.webp`,
      before_image_label: `Before ${index + 1}`,
      after_image_label: `After ${index + 1}`,
    }));
    const generalImages = Array.from({ length: 5 }, (_, index) => ({
      id: 201 + index,
      title: `Practice image ${index + 1}`,
      image_url: `/previews/practice-${index + 1}.webp`,
    }));

    const selected = selectProfileGallery(cases, generalImages);

    expect(selected.cases.map(({ id }) => id)).toEqual([
      101, 102, 103, 104, 105,
    ]);
    expect(selected.generalImages.map(({ id }) => id)).toEqual([
      201, 202, 203, 204, 205,
    ]);
    expect(
      [...selected.cases, ...selected.generalImages].map(
        ({ position }) => position,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("fails closed for malformed, disabled, blank, duplicate, and unsafe records", () => {
    const validCase = {
      id: 1,
      title: "  Valid result  ",
      before_image_url: "/previews/before.webp",
      after_image_url: "https://cdn.example.com/after.webp",
      before_image_label: " ",
      after_image_label: " Finished ",
    };
    const validGeneral = {
      id: 11,
      title: "  Welcoming practice  ",
      image_url: "/previews/practice.webp",
    };

    expect(
      selectProfileGallery(
        [
          null,
          validCase,
          { ...validCase, id: 2, enabled: false },
          { ...validCase, id: 3, enabled: null },
          { ...validCase, id: 4, title: " " },
          { ...validCase, id: 5, before_image_url: "javascript:alert(1)" },
          {
            ...validCase,
            id: 6,
            after_image_url: "https://user:secret@cdn.example.com/after.webp",
          },
          validCase,
        ],
        [
          undefined,
          validGeneral,
          { ...validGeneral, id: 12, enabled: false },
          { ...validGeneral, id: 13, enabled: null },
          { ...validGeneral, id: 14, title: "" },
          { ...validGeneral, id: 15, image_url: "/../private.webp" },
          validGeneral,
        ],
      ),
    ).toEqual({
      cases: [
        {
          id: 1,
          title: "Valid result",
          beforeImageUrl: "/previews/before.webp",
          afterImageUrl: "https://cdn.example.com/after.webp",
          beforeLabel: null,
          afterLabel: "Finished",
          position: 1,
        },
      ],
      generalImages: [
        {
          id: 11,
          title: "Welcoming practice",
          imageUrl: "/previews/practice.webp",
          position: 2,
        },
      ],
    });
    expect(selectProfileGallery(null, undefined)).toEqual({
      cases: [],
      generalImages: [],
    });
  });
});
