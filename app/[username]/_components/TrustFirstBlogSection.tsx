"use client";

import { ArrowUpRight } from "@phosphor-icons/react";

import BlogImage from "@/app/components/Image/BlogImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import {
  useAnalyticsRenderContext,
  useLegacyCounterAllowed,
} from "@/app/contexts/AnalyticsContext";

import type { TrustFirstBlogGroup } from "../_lib/trust-first-template";

function analyticsContextSuffix(
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

export default function TrustFirstBlogSection({
  groups,
  username,
}: {
  groups: readonly TrustFirstBlogGroup[];
  username: string;
}) {
  const renderContext = useAnalyticsRenderContext();
  const legacyCounterAllowed = useLegacyCounterAllowed();
  const contextSuffix = analyticsContextSuffix(renderContext);

  if (groups.length === 0) return null;

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
      className="rounded-[var(--radius-xl)] bg-[var(--profile-muted)] p-5 sm:p-7"
      data-profile-module="trust-first-family-blogs"
      id="blogs"
    >
      <div className="space-y-7">
        {groups.map((group) => {
          const headingId = `trust-first-blog-group-${group.id}`;
          return (
            <section
              aria-labelledby={headingId}
              className="space-y-3"
              data-blog-group-id={group.id}
              key={group.id}
            >
              <h2
                className="text-2xl font-bold text-[var(--profile-on-muted)]"
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
                    className="group overflow-hidden rounded-[var(--radius-lg)] bg-card text-card-foreground no-underline shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--elevation-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                    data-blog-id={blog.id}
                    data-blog-position={blog.position}
                    href={`/${encodeURIComponent(username)}/blog/${encodeURIComponent(blog.slug)}${contextSuffix}`}
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
                    <span className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold leading-6 sm:min-h-20 sm:text-base">
                      <span>{blog.title}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                        size={20}
                        weight="bold"
                      />
                    </span>
                  </TrackedLink>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
