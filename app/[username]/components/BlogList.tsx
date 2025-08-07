'use client'
import LinkTitle from "@/app/components/Link/LinkTitle";
import { useNavbar } from "@/app/contexts/NavbarContext";
import React, { useEffect, useState } from "react";

type BlogListProps = {
  username: string;
  groupname: string;
  fetchedBlogs: BlogType[];
}

const BlogList: React.FC<BlogListProps> = ({
  groupname,
  fetchedBlogs,
  username,
}: BlogListProps) => {
  const { setNavItemState } = useNavbar();
  const [blogs, setBlogs] = useState<any[]>(fetchedBlogs);

  // Function to handle blog clicks and track them
  const handleBlogClick = (blogId: string, blogUrl: string) => {
    // Track click in background
    fetch('/api/blogs/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    }).catch((error) => console.error('Error tracking blog click:', error));

    // Open link immediately
    window.open(blogUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (blogs.length > 0) {
      setNavItemState("Blog", true);
    }
  }, [blogs]);

  return (
    <div className="text-center mb-4">
      {(blogs.length > 0) &&
        <>
          <h1 className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-8">{groupname}</h1>
          <div className="toplinks-main flex flex-col gap-3">
            {blogs.map((blog, index) => (
              <a
                href={`/${username}/blog/${blog.slug}` || "#"}
                className="flex justify-center toplinks-wrapper toplinks-without-image"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault(); // prevent immediate navigation
                  handleBlogClick(blog.id, `/${username}/blog/${blog.slug}`);
                }}
              >
                {blog.title}
              </a>
            ))}
          </div>
        </>}
    </div>
  )
}

export default BlogList;