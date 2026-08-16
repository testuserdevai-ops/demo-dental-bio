"use client";

import BlogImage from "@/app/components/Image/BlogImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import {
  useAnalyticsRenderContext,
  useLegacyCounterAllowed,
} from "@/app/contexts/AnalyticsContext";
import type { LocationRouterBlogSection } from "../_lib/location-router-template";

function getArticleAnalyticsContext(
  renderContext: ReturnType<typeof useAnalyticsRenderContext>,
) {
  if (renderContext.kind === "public") return "";
  if (
    renderContext.kind === "test" ||
    (renderContext.kind === "excluded" &&
      renderContext.reason === "unverified_test")
  ) {
    return "?analyticsContext=test";
  }
  return "?analyticsContext=preview";
}

export default function LocationRouterBlogs({
  sections,
  username,
}: {
  sections: readonly LocationRouterBlogSection[];
  username: string;
}) {
  const renderContext = useAnalyticsRenderContext();
  const legacyCounterAllowed = useLegacyCounterAllowed();
  if (sections.length === 0) return null;

  const articleAnalyticsContext = getArticleAnalyticsContext(renderContext);
  const trackLegacyCounter = (blogId: number) => {
    if (!legacyCounterAllowed) return;
    void fetch("/api/blogs/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    }).catch(() => undefined);
  };

  return (
    <div
      className="space-y-6"
      data-profile-module="location-router-blogs"
      id="blog"
    >
      {sections.map((group) => {
        const headingId = `location-router-blog-group-${group.id}`;
        return (
          <section
            aria-labelledby={headingId}
            className="space-y-3"
            data-blog-group={group.id}
            key={group.id}
          >
            <h2
              className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              id={headingId}
            >
              {group.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.blogs.map((blog) => (
                <TrackedLink
                  analytics={{
                    section: "blogs",
                    position: blog.position,
                    action: {
                      type: "blog_click",
                      blogId: blog.id,
                      groupId: group.id,
                    },
                  }}
                  className="group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground no-underline shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--profile-link)] hover:shadow-[var(--elevation-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                  data-blog-position={blog.position}
                  data-blog-post={blog.id}
                  href={`/${encodeURIComponent(username)}/blog/${encodeURIComponent(blog.slug)}${articleAnalyticsContext}`}
                  key={blog.id}
                  onClick={() => trackLegacyCounter(blog.id)}
                >
                  {blog.imageUrl ? (
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      <BlogImage
                        alt=""
                        className="size-full transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
                        layout="fill"
                        src={blog.imageUrl}
                      />
                    </div>
                  ) : null}
                  <h3 className="px-5 py-4 text-base font-bold leading-6 sm:text-lg">
                    {blog.title}
                  </h3>
                </TrackedLink>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
