import { describe, expect, it } from "bun:test";

import { getExistingBuilderItems } from "./existing-builder-items";

const context = {
  scopeId: "scope",
  userId: "user",
  profile: {
    user: {
      title: "Dr Alex Morgan",
      position: "Dentist",
      gdcNo: "",
      qualification: "",
    },
    dentistry: {
      aboutTitle: "Welcome",
      aboutText: "",
      phone: "",
      contactEmail: "",
      website: "",
      bookingLink: "",
      bookingEnabled: false,
    },
    socials: {
      linkedin: "https://linkedin.example/alex",
      twitter: "",
      instagram: "https://instagram.example/alex",
      facebook: "",
      tiktok: "",
      other: "",
    },
    profilePicture: { objectPath: null, publicUrl: null },
  },
  links: {
    groups: [
      {
        id: "group-1",
        heading: "Resources",
        rank: 1,
        links: [
          {
            id: "link-1",
            title: "Existing guide",
            url: "https://example.com",
            isActive: false,
            rank: 1,
          },
        ],
      },
    ],
  },
  videos: {
    groups: [
      {
        id: 1,
        name: "Advice",
        enabled: true,
        rank: 1,
        videos: [
          {
            id: 2,
            groupId: 1,
            title: "Existing video",
            link: "https://video.example",
            enabled: true,
            rank: 1,
          },
        ],
      },
    ],
  },
  treatments: {
    treatments: [
      {
        id: "treatment-1",
        title: "Existing treatment",
        description: "",
        kind: "treatment" as const,
        rank: 1,
      },
    ],
    services: [],
  },
  locations: {
    title: "Locations",
    canAddLocation: true,
    locations: [
      {
        id: "location-1",
        businessName: "Existing clinic",
        fullAddress: "1 Dental Street",
        country: "UK",
        city: "London",
        area: "",
        latitude: 0,
        longitude: 0,
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
    ],
  },
  reviews: {
    reviews: [
      {
        id: 3,
        reviewerName: "Sam",
        content: "",
        stars: 5,
        imageUrl: "",
        platform: "Google",
        rank: 1,
        enabled: false,
        createdAt: "2026-08-12T00:00:00.000Z",
      },
    ],
    externalPage: null,
  },
  galleries: {
    dental: [
      {
        id: 4,
        title: "Existing smile case",
        beforeImageUrl: "",
        afterImageUrl: "",
        beforeLabel: "Before",
        afterLabel: "After",
        rank: 1,
        enabled: true,
        createdAt: "2026-08-12T00:00:00.000Z",
      },
    ],
    general: [],
  },
  products: {
    products: [
      {
        id: 5,
        name: "Existing guide",
        link: "https://shop.example",
        platform: "Shop",
        imageUrl: "",
        price: 10,
        currency: "GBP(£)",
        enabled: true,
        rank: 1,
      },
    ],
  },
} as any;

describe("getExistingBuilderItems", () => {
  it("shows complete prior link and video inventories, including inactive data", () => {
    expect(getExistingBuilderItems({ builder: "link", context })).toMatchObject(
      [
        {
          id: "link-1",
          label: "Existing guide",
          description: "Resources · Inactive · https://example.com",
        },
      ],
    );
    expect(
      getExistingBuilderItems({ builder: "video", context }),
    ).toMatchObject([
      {
        id: "2",
        label: "Existing video",
        description: "Advice · Active · https://video.example",
      },
    ]);
  });

  it("maps every inline builder to its previously saved owner content", () => {
    expect(
      getExistingBuilderItems({ builder: "profile", context }),
    ).toHaveLength(1);
    expect(
      getExistingBuilderItems({ builder: "socials", context }),
    ).toHaveLength(2);
    expect(
      getExistingBuilderItems({ builder: "treatment", context })[0]?.label,
    ).toBe("Existing treatment");
    expect(
      getExistingBuilderItems({ builder: "location", context })[0]?.label,
    ).toBe("Existing clinic");
    expect(
      getExistingBuilderItems({ builder: "review", context })[0]?.description,
    ).toBe("Inactive");
    expect(
      getExistingBuilderItems({ builder: "gallery", context })[0]?.label,
    ).toBe("Existing smile case");
    expect(
      getExistingBuilderItems({ builder: "product", context })[0]?.label,
    ).toBe("Existing guide");
  });
});
