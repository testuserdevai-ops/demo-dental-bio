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
  const handleBlogClick = async (blogId: string, blogUrl: string) => {
    try {
      // Track the click
      await fetch('/api/blogs/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blogId }),
      });
    } catch (error) {
      console.error('Error tracking blog click:', error);
    }

    // Navigate to the blog page
    window.location.href = blogUrl;
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
          {blogs.map((blog, index) => (
            <button
              key={blog.id}
              className="toplinks-wrapper toplinks-without-image justify-center"
              title={blog.title}
              onClick={() => handleBlogClick(blog.id, `/${username}/blog/${blog.slug}`)}
            >
              {blog.title}
            </button>
          ))}
        </>}
    </div>
  )
}

export default BlogList;