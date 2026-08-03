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
    <>
      {serverBlogGroups.length > 0 ? (
        <div className="text-center" id="blog">
          {serverBlogGroups.map((group, index) => (
            <BlogList
              key={group.id}
              username={username}
              groupId={group.id}
              groupname={group.name!}
              fetchedBlogs={group.blogs!}
            />
          ))}
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default BlogGroupList;
