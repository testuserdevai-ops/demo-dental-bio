"use client";

import { ArrowUpRight } from "@phosphor-icons/react";

import BlogImage from "@/app/components/Image/BlogImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import {
  useAnalyticsRenderContext,
  useLegacyCounterAllowed,
} from "@/app/contexts/AnalyticsContext";

import type { ExpertBlogGroup } from "../_lib/expert-educator-template";

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

export default function ExpertBlogSection({
  groups,
  username,
}: {
  groups: readonly ExpertBlogGroup[];
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
    <div className="space-y-8 sm:space-y-10" id="blogs">
      {groups.map((group) => (
        <section
          aria-labelledby={`expert-blog-group-${group.id}`}
          className="space-y-4"
          data-blog-group-id={group.id}
          key={group.id}
        >
          <h2
            className="text-balance text-2xl font-bold tracking-tight sm:text-3xl"
            id={`expert-blog-group-${group.id}`}
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
                className="group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground no-underline shadow-[var(--elevation-card)] transition-transform hover:-translate-y-0.5"
                data-blog-id={blog.id}
                href={`/${username}/blog/${blog.slug}${contextSuffix}`}
                key={blog.id}
                onClick={() => trackLegacyCounter(blog.id)}
              >
                {blog.imageUrl ? (
                  <BlogImage
                    alt=""
                    className="aspect-[16/9] w-full bg-muted"
                    src={blog.imageUrl}
                  />
                ) : null}
                <span className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 text-left font-bold sm:min-h-20 sm:px-5">
                  <span>{blog.title}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    size={20}
                    weight="bold"
                  />
                </span>
              </TrackedLink>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
