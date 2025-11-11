'use client'

import { useCallback, useEffect, useState } from "react";
import AddNewGroupForm from "./components/AddNewGroupForm";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableBlogGroup from "./components/DraggableBlogGroup";
import { usePreview } from "@/app/contexts/PreviewContext";
import ManageBlogs from "./ManageBlogs";
import SkeletonLoader from "@/app/components/Loader/SkeletonLoader";

type ManageBlogGroupProps = {
  username: string;
  targetUserId: string | null;
  enabled?: boolean;
}

const ManageBlogGroups: React.FC<ManageBlogGroupProps> = ({ username, targetUserId, enabled = false }) => {
  const [blogGroups, setBlogGroups] = useState<BlogGroupType[] | null>(null);
  const [initialBlogGroups, setInitialBlogGroups] = useState<BlogGroupType[]>([]);

  const { triggerReload } = usePreview();

  useEffect(() => {
    const fetchBlogGroups = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : '';

      const response = await fetch(`/api/blog-groups${query}`, {
        method: 'GET'
      });
      const data = await response.json();

      setBlogGroups(data);
      setInitialBlogGroups(data);
    };

    fetchBlogGroups();
  }, []);

  const handleAdd = (group: BlogGroupType) => {
    setBlogGroups((prevGroups) => {
      if (!prevGroups)
        return [group];
      return [...prevGroups, group];
    })
    triggerReload();
  }

  const handleUpdate = async (props: { id: string; name?: string; enabled?: boolean; }) => {

    const response = await fetch('/api/blog-groups', {
      method: 'PUT',
      body: JSON.stringify(props),
    });

    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      // console.log(result);
      setBlogGroups((prevGroups) => {
        return prevGroups?.map((group) => (group.id === result.id ? result : group))!;
      })

      triggerReload();
    }
  }

  const handleDelete = async ({ id }: { id: string }) => {
    setBlogGroups((prevGroups) => {
      if (!prevGroups) return prevGroups;
      return prevGroups.filter(group => group.id !== id);
    });

    const response = await fetch('/api/blog-groups', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    if (data.error) {
      console.log("Failed to delete", data.error);
    }

    triggerReload();
  }

  const updateOrder = async (updatedBlogs: any[]) => {
    const orderList = updatedBlogs.map((blog, index) => ({
      id: blog.id,
      rank: index,
    }));

    const data = { table: "blog_groups", datasToUpdate: orderList };

    // console.log(orderList);

    const response = await fetch('/api/update-order', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    const result = await response.json();

    if (response.ok) {
      console.log('update orders');
      triggerReload();
    } else {
      console.log(`Error: ${result.error}`)
    }
  }

  // Move treatment in the list
  const moveBlogGroup = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedBlogs = Array.from(blogGroups!);
      const [movedBlog] = updatedBlogs.splice(fromIndex, 1);
      updatedBlogs.splice(toIndex, 0, movedBlog);
      setBlogGroups(updatedBlogs);
      updateOrder(updatedBlogs);
      setInitialBlogGroups(updatedBlogs);
    }, [blogGroups]);

  if (!blogGroups) {
    return (
      <>
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
      </>
    )
  }

  return (
    <div>
      <AddNewGroupForm onAdd={handleAdd} targetUserId={targetUserId} enabled={enabled} />

      <DndProvider backend={HTML5Backend}>
        {blogGroups && blogGroups.map((group, index) => {
          return (
            <div key={group.id}>
              <DraggableBlogGroup
                index={index}
                key={group.id}
                blogGroup={group}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                moveBlogGroup={moveBlogGroup}
                enabled={enabled}
              />
              <ManageBlogs
                itemType={index}
                group_id={group.id}
                fetchedBlogs={group.blogs!}
                username={username}
                targetUserId={targetUserId!}
                enabled={enabled}
              />
              {(blogGroups.length > (index + 1)) &&
                <hr className="my-8" />}
            </div>
          )
        })}
        {blogGroups.length === 0 &&
          <div className='pb-10 text-lg text-gray-400 text-center'>There is no group</div>}
      </DndProvider>
    </div>
  )
}

export default ManageBlogGroups;