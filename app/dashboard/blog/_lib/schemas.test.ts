import { describe, expect, it } from "bun:test";
import {
  createBlogSchema,
  reorderBlogsSchema,
  updateBlogSchema,
} from "./schemas";

const blog = {
  groupId: 1,
  title: "A useful guide",
  slug: "a-useful-guide",
  content: "Useful content",
  metaTitle: "",
  metaDescription: "",
  imageUrl: "https://example.com/cover.webp",
  enabled: true,
};

describe("blog schemas", () => {
  it("accepts controlled blog fields", () => {
    expect(createBlogSchema.parse(blog)).toEqual(blog);
  });

  it("rejects unsafe image URLs and submitted ownership fields", () => {
    expect(
      createBlogSchema.safeParse({ ...blog, imageUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      createBlogSchema.safeParse({ ...blog, userId: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });

  it("permits a safe legacy asset path only on update", () => {
    const { groupId: _groupId, ...fields } = blog;
    const update = { ...fields, id: 1, imageUrl: "/images/blog-cover.webp" };
    expect(updateBlogSchema.safeParse(update).success).toBe(true);
    expect(createBlogSchema.safeParse(update).success).toBe(false);
  });

  it("requires duplicate-free ordering", () => {
    expect(
      reorderBlogsSchema.safeParse({ groupId: 1, orderedIds: [1, 2] }).success,
    ).toBe(true);
    expect(
      reorderBlogsSchema.safeParse({ groupId: 1, orderedIds: [1, 1] }).success,
    ).toBe(false);
  });
});
