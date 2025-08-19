'use client'
import LinkTitle from "@/app/components/Link/LinkTitle";
import React, { useEffect, useState } from "react";
import BlogList from "./BlogList";

type BlogListProps = {
  userId: string;
  username: string;
}

const BlogGroupList: React.FC<BlogListProps> = ({
  userId,
  username,
}) => {
  const [blogGroups, setBlogGroups] = useState<BlogGroupType[]>([]);

  useEffect(() => {
    const fetchBlogGroups = async () => {
      const query = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/blog-groups${query}`, {
        method: 'GET'
      });
      const data = await response.json();

      setBlogGroups(data);
    };

    fetchBlogGroups();
  }, []);

  return (
    <>
      {(blogGroups.length > 0) ?
        <div className="text-center" id="blog">
          {blogGroups.map((group, index) => (
            <BlogList
              key={group.id}
              username={username}
              groupname={group.name!}
              fetchedBlogs={group.blogs!}
            />
          ))}
        </div>
        : <></>}
    </>)
}

export default BlogGroupList;