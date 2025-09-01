'use client'
import LinkTitle from "@/app/components/Link/LinkTitle";
import { useNavbar } from "@/app/contexts/NavbarContext";
import Link from "next/link";
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
  const handleBlogClick = async (blogId: string, blogUrl: string) => {
    try {
      await fetch("/api/blogs/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId }),
      });
    } catch (error) {
      console.error("Error tracking blog click:", error);
    }
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
              <Link
                key={index}
                href={`/${username}/blog/${blog.slug}`}
                className="flex justify-center toplinks-wrapper toplinks-without-image"
                rel="noopener noreferrer"
                onClick={() => handleBlogClick(blog.id, `/${username}/blog/${blog.slug}`)}
              >
                {blog.title}
              </Link>
            ))}
          </div>
        </>}
    </div>
  )
}

export default BlogList;