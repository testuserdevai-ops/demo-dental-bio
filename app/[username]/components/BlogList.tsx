"use client";
import { useNavbar } from "@/app/contexts/NavbarContext";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import {
  useAnalyticsRenderContext,
  useLegacyCounterAllowed,
} from "@/app/contexts/AnalyticsContext";
import React, { useEffect, useState } from "react";

type BlogListProps = {
  username: string;
  groupId: string;
  groupname: string;
  fetchedBlogs: BlogType[];
};

const BlogList: React.FC<BlogListProps> = ({
  groupname,
  fetchedBlogs,
  username,
  groupId,
}: BlogListProps) => {
  const { setNavItemState } = useNavbar();
  const renderContext = useAnalyticsRenderContext();
  const legacyCounterAllowed = useLegacyCounterAllowed();
  const [blogs, setBlogs] = useState<any[]>(fetchedBlogs);
  const articleAnalyticsContext =
    renderContext.kind === "public"
      ? ""
      : renderContext.kind === "test" ||
          (renderContext.kind === "excluded" &&
            renderContext.reason === "unverified_test")
        ? "?analyticsContext=test"
        : "?analyticsContext=preview";

  // Function to handle blog clicks and track them
  const trackBlogCounter = (blogId: string) => {
    if (!legacyCounterAllowed) return;
    void fetch("/api/blogs/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    }).catch((error) => console.error("Error tracking blog click:", error));
  };

  useEffect(() => {
    if (blogs.length > 0) {
      setNavItemState("Blog", true);
    }
  }, [blogs, setNavItemState]);

  return (
    <div className="text-center mb-4">
      {blogs.length > 0 && (
        <>
          <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-8">
            {groupname}
          </h1>
          <div className="flex-col-gap">
            {blogs.map((blog, index) => (
              <TrackedLink
                key={blog.id}
                href={`/${username}/blog/${blog.slug}${articleAnalyticsContext}`}
                className="toplinks-main flex justify-center toplinks-wrapper toplinks-without-image"
                rel="noopener noreferrer"
                analytics={{
                  section: "blogs",
                  position: index + 1,
                  action: {
                    type: "blog_click",
                    blogId: blog.id,
                    groupId,
                  },
                }}
                onClick={() => trackBlogCounter(blog.id)}
              >
                {blog.title}
              </TrackedLink>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BlogList;
