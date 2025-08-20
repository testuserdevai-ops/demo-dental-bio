'use client'
import { useCallback, useEffect, useState } from 'react';
import { useDrag, useDrop } from "react-dnd";
import BlogCard from '../components/BlogCard';
import AddNewBlog from './AddNewBlog';
import EditBlogModal from '../components/EditBlogModal';
import SkeletonLoader from '@/app/components/Loader/Loader';
import { usePreview } from '@/app/contexts/PreviewContext';
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";

function DraggableBlogCard({
  username,
  blog,
  itemType,
  index,
  onUpdate,
  onDelete,
  onEditItem,
  moveBlog,
  enabled,
}: {
  username: string;
  blog: BlogType,
  itemType: number;
  index: number;
  onUpdate: any;
  onDelete: any;
  onEditItem: any;
  moveBlog: any;
  enabled: boolean;
}) {
  const [, ref] = useDrag({
    type: "ItemType.BLOG" + itemType,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: "ItemType.BLOG" + itemType,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveBlog(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={enabled ? (node) => {
        if (node) ref(node);
        drop(node);
      } : undefined}
    >
      <BlogCard
        username={username}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEditItem={onEditItem}
        proAvailable={enabled}
        {...blog}
      />
    </div>
  );
}


const ManageBlogs = ({
  itemType,
  group_id,
  username,
  fetchedBlogs,
  targetUserId,
  enabled,
}: {
  itemType: number;
  group_id: string;
  username: string;
  fetchedBlogs: BlogType[];
  targetUserId: string;
  enabled: boolean;
}) => {
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(false);
  const [blogs, setBlogs] = useState<any[] | null>(null);
  const [initialBlogs, setInitialBlogs] = useState<any[] | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogType>({
    id: "",
    group_id,
    title: "",
    content: "",
    image_url: "",
    meta_title: "",
    meta_description: "",
    rank: 0,
    enabled: true,
    created_at: "",
    slug: "",
  });

  const { triggerReload } = usePreview();
  const { uploadFile } = useUppyWithSupabase({ bucketName: 'blog-images' });

  useEffect(() => {
    setBlogs(fetchedBlogs);
    setInitialBlogs(fetchedBlogs);

  }, [fetchedBlogs]);

  const handleAdd = async (blog: BlogType) => {
    setBlogs((prevBlogs) => {
      if (!prevBlogs) return [blog];
      return [...prevBlogs, blog];
    })

    triggerReload();
  }

  const handleEdit = async (blog: BlogType, image: File | null) => {
    if (image) {
      const url = await uploadFile(image);
      blog = { ...blog, image_url: url || "" };
    }

    const response = await fetch('/api/blogs', {
      method: 'PUT',
      body: JSON.stringify({ ...blog }),
    });

    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      // console.log(result);
      setBlogs((prevBlogs) => {
        return prevBlogs?.map((blog) => (blog.id === result.id ? result : blog))!;
      })
    }
    setIsEditingOpen(false);
    triggerReload();
  }

  const handleDelete = async (id: string) => {
    setBlogs((prevBlogs) => {
      if (!prevBlogs) return prevBlogs;
      return prevBlogs.filter(blog => blog.id !== id);
    });

    const response = await fetch('/api/blogs', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    if (data.error) {
      console.log("Failed to delete", data.error);
    }

    triggerReload();
  }

  const handleEditItem = async (id: string) => {
    await setEditingBlog(blogs?.at(blogs?.findIndex((blog) => blog.id === id)));
    setIsEditingOpen(true);
  }

  const updateOrder = async (updatedBlogs: any[]) => {
    const orderList = updatedBlogs.map((blog, index) => ({
      id: blog.id,
      rank: index,
    }));

    const data = { table: "blogs", datasToUpdate: orderList };

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
  const moveBlog = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedBlogs = Array.from(blogs!);
      const [movedBlog] = updatedBlogs.splice(fromIndex, 1);
      updatedBlogs.splice(toIndex, 0, movedBlog);
      setBlogs(updatedBlogs);

      updateOrder(updatedBlogs);
      setInitialBlogs(updatedBlogs);
    }, [blogs]);

  return (
    <div className='mb-4'>
      {/* <DndProvider backend={HTML5Backend}> */}
      {blogs ?
        blogs.length > 0 ?
          blogs.map((blog, index) => (
            <DraggableBlogCard
              key={blog.id}
              index={index}
              blog={blog}
              itemType={itemType}
              username={username}
              onUpdate={handleEdit}
              onDelete={handleDelete}
              onEditItem={handleEditItem}
              moveBlog={moveBlog}
              enabled={enabled}
            />
          )) :
          <div className='pb-10 text-lg text-gray-400 text-center'>There is no blog to show</div> :
        <SkeletonLoader />}
      {/* </DndProvider> */}

      <div className="flex justify-end mt-6">
        <AddNewBlog group_id={group_id} onAdd={handleAdd} username={username} targetUserId={targetUserId} enabled={enabled} />
      </div>

      <EditBlogModal
        username={username}
        isOpen={isEditingOpen}
        onClose={() => setIsEditingOpen(false)}
        onSubmit={handleEdit}
        {...editingBlog}
      />
    </div>
  );
};

export default ManageBlogs;
