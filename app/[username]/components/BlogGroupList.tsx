"use client";
import React from "react";
import BlogList from "./BlogList";

type BlogListProps = {
  username: string;
  serverBlogGroups: any[];
};

const BlogGroupList: React.FC<BlogListProps> = ({
  username,
  serverBlogGroups,
}) => {
  return (
    <div
      id="blog"
      className={serverBlogGroups.length > 0 ? "text-center" : undefined}
    >
      {serverBlogGroups.length > 0 ? (
        <>
          {serverBlogGroups.map((group, index) => (
            <BlogList
              key={group.id}
              username={username}
              groupId={group.id}
              groupname={group.name!}
              fetchedBlogs={group.blogs!}
            />
          ))}
        </>
      ) : null}
    </div>
  );
};

export default BlogGroupList;
