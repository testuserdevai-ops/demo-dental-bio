'use client'
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import React, { useReducer, useState } from "react"
import AddBlogModal from "../components/AddBlogModal";
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";

type AddNewBlogProps = {
  group_id: string;
  onAdd: (blog: any) => void;
  username: string;
  targetUserId: string | null;
  enabled?: boolean;
}

const AddNewBlog: React.FC<AddNewBlogProps> = ({
  group_id,
  onAdd,
  username,
  targetUserId,
  enabled = false,
}: AddNewBlogProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { uploadFile } = useUppyWithSupabase({ bucketName: 'blog-images' });

  const openModal = () => {
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const handleSubmit = async (formData: { title: string; content: string; image: File | null; meta_title: string; meta_description: string; }) => {
    const image_url = formData.image ? (await uploadFile(formData.image)) || "" : "";

    const response = await fetch('/api/blogs', {
      method: 'POST',
      body: JSON.stringify({ ...formData, image_url, targetUserId }),
    });

    const result = await response.json();
    if (result.error) {
      console.error(result.error);
    } else {
      onAdd(result);
      closeModal();
    }
  };

  return (
    <>
      <FullRoundedButton onClick={enabled ? openModal : undefined} className="mb-4">Add Blog</FullRoundedButton>

      <AddBlogModal
        username={username}
        group_id={group_id}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  )
}

export default AddNewBlog;