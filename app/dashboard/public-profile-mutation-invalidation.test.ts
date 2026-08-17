import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { PublicProfileMutation } from "@/lib/public-profile/cache-tags";

mock.module("server-only", () => ({}));

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
  dentistryId: "00000000-0000-4000-8000-000000000811",
  username: "owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const invalidatePublicProfileCache = mock(
  (_mutation: PublicProfileMutation) => {},
);
const rpc = mock(
  async (
    method: string,
  ): Promise<{
    data: object[] | null;
    error: { code: string } | null;
  }> => {
    const rows: Record<string, object> = {
      create_dashboard_general_gallery: {
        id: 101,
        title: "Gallery",
        image_url: "https://example.test/gallery.jpg",
        rank: 0,
        enabled: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      create_dashboard_review: {
        id: 102,
        reviewer_name: "A reviewer",
        content: "Helpful",
        stars: 5,
        image_url: null,
        platform: "Google",
        rank: 0,
        enabled: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      create_dashboard_blog_group: {
        id: 103,
        name: "News",
        enabled: true,
        rank: 0,
      },
      create_dashboard_video_group: {
        id: 104,
        name: "Videos",
        enabled: true,
        rank: 0,
      },
      create_individual_product: {
        id: 105,
        name: "Product",
        link: "https://example.test/product",
        platform: "Store",
        image_url: "https://example.test/product.jpg",
        price: 10,
        currency: "GBP(£)",
        enabled: true,
        rank: 0,
      },
      create_dentistry_location_with_media: {
        location_id: "00000000-0000-4000-8000-000000000106",
        business_name: "Practice",
        full_address: "1 Main Street",
        country: "GB",
        city: "London",
        area: "West",
        latitude: 51.5,
        longitude: -0.1,
        image_url: null,
        image_alt: null,
        image_decorative: true,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      create_dashboard_external_review_page: {
        id: 107,
        link: "https://reviews.example.test/",
        rank: 1,
        enabled: true,
      },
      update_dashboard_external_review_page: {
        id: 107,
        link: "https://reviews.example.test/updated",
        rank: 1,
        enabled: false,
      },
    };
    return { data: rows[method] ? [rows[method]] : null, error: null };
  },
);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
}));

const gallery = await import("./gallery/actions");
const review = await import("./review/actions");
const blog = await import("./blog/actions");
const video = await import("./video/actions");
const shop = await import("./shop/actions");
const location = await import("./location/actions");

describe("public profile mutation cache invalidation", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({ scope });
    invalidatePublicProfileCache.mockReset();
    rpc.mockReset();
    rpc.mockImplementation(async (method: string) => {
      const rows: Record<string, object> = {
        create_dashboard_general_gallery: {
          id: 101,
          title: "Gallery",
          image_url: "https://example.test/gallery.jpg",
          rank: 0,
          enabled: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        create_dashboard_review: {
          id: 102,
          reviewer_name: "A reviewer",
          content: "Helpful",
          stars: 5,
          image_url: null,
          platform: "Google",
          rank: 0,
          enabled: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        create_dashboard_blog_group: {
          id: 103,
          name: "News",
          enabled: true,
          rank: 0,
        },
        create_dashboard_video_group: {
          id: 104,
          name: "Videos",
          enabled: true,
          rank: 0,
        },
        create_individual_product: {
          id: 105,
          name: "Product",
          link: "https://example.test/product",
          platform: "Store",
          image_url: "https://example.test/product.jpg",
          price: 10,
          currency: "GBP(£)",
          enabled: true,
          rank: 0,
        },
        create_dentistry_location_with_media: {
          location_id: "00000000-0000-4000-8000-000000000106",
          business_name: "Practice",
          full_address: "1 Main Street",
          country: "GB",
          city: "London",
          area: "West",
          latitude: 51.5,
          longitude: -0.1,
          image_url: null,
          image_alt: null,
          image_decorative: true,
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        create_dashboard_external_review_page: {
          id: 107,
          link: "https://reviews.example.test/",
          rank: 1,
          enabled: true,
        },
        update_dashboard_external_review_page: {
          id: 107,
          link: "https://reviews.example.test/updated",
          rank: 1,
          enabled: false,
        },
      };
      return { data: rows[method] ? [rows[method]] : null, error: null };
    });
  });

  it("invalidates the exact profile feature and entity after each successful mutation", async () => {
    await gallery.createGeneralGallery(undefined, {
      title: "Gallery",
      imageUrl: "https://example.test/gallery.jpg",
    });
    await review.createReview(undefined, {
      reviewerName: "A reviewer",
      content: "Helpful",
      stars: 5,
      imageUrl: "",
      platform: "Google",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await blog.createBlogGroup(undefined, { name: "News" });
    await video.createVideoGroup(undefined, { name: "Videos" });
    await shop.createProduct(undefined, {
      name: "Product",
      link: "https://example.test/product",
      platform: "Store",
      imageUrl: "https://example.test/product.jpg",
      price: 10,
      currency: "GBP(£)",
      enabled: true,
    });
    await location.createLocation(undefined, {
      id: "00000000-0000-4000-8000-000000000106",
      businessName: "Practice",
      fullAddress: "1 Main Street",
      country: "GB",
      city: "London",
      area: "West",
      latitude: 51.5,
      longitude: -0.1,
      imageUrl: null,
      imageAlt: "",
      imageDecorative: true,
    });
    await review.createExternalReviewPage(undefined, {
      link: "https://reviews.example.test",
    });
    await review.updateExternalReviewPage(undefined, {
      id: 107,
      link: "https://reviews.example.test/updated",
      enabled: false,
    });
    await review.reorderExternalReviewPages(undefined, { orderedIds: [107] });
    await review.deleteExternalReviewPage(undefined, { id: 107 });

    expect(invalidatePublicProfileCache.mock.calls).toEqual([
      [
        {
          profileId: scope.effectiveUserId,
          feature: "galleries",
          entities: [{ kind: "gallery", id: "101" }],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "reviews",
          entities: [{ kind: "review", id: "102" }],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "blogs",
          entities: [{ kind: "blog-group", id: "103" }],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "videos",
          entities: [{ kind: "video-group", id: "104" }],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "products",
          entities: [{ kind: "product", id: "105" }],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "locations",
          entities: [
            { kind: "location", id: "00000000-0000-4000-8000-000000000106" },
          ],
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "external-review-page",
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "external-review-page",
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "external-review-page",
        },
      ],
      [
        {
          profileId: scope.effectiveUserId,
          feature: "external-review-page",
        },
      ],
    ]);
  });

  it("does not invalidate after a failed authorized mutation", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "FAIL" } });
    await Promise.all([
      gallery.deleteGeneralGallery(undefined, { id: 101 }),
      review.deleteReview(undefined, { id: 102 }),
      blog.deleteBlogGroup(undefined, { id: 103 }),
      video.deleteVideoGroup(undefined, { id: 104 }),
      shop.deleteProduct(undefined, { id: 105 }),
      location.deleteLocation(undefined, {
        id: "00000000-0000-4000-8000-000000000106",
      }),
      review.createExternalReviewPage(undefined, {
        link: "https://reviews.example.test",
      }),
      review.updateExternalReviewPage(undefined, {
        id: 107,
        link: "https://reviews.example.test/updated",
        enabled: false,
      }),
      review.reorderExternalReviewPages(undefined, { orderedIds: [107] }),
      review.deleteExternalReviewPage(undefined, { id: 107 }),
    ]);
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();
  });
});
