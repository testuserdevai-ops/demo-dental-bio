'use client'
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import React, { useState } from "react"
import { toast } from 'react-toastify';
import AddReviewModal from "./components/AddReviewModal";
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";

type AddNewReviewProps = {
  onAdd: (review: any) => void;
  targetUserId: string | null;
  enabled: boolean;
}

const AddNewReview: React.FC<AddNewReviewProps> = ({
  onAdd,
  targetUserId,
  enabled,
}: AddNewReviewProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { uploadFile } = useUppyWithSupabase({ bucketName: 'review-images' });

  const openModal = () => {
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const handleSubmit = async (formData: ReviewType, image_file: File | null) => {
    const image_url = image_file ? (await uploadFile(image_file)) || "" : "";

    const response = await fetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...formData, image_url, targetUserId }),
    });

    const result = await response.json();
    if (result.error) {
      console.log(result.error);
      toast.error(`Failed to add review: ${result.error}`)
    } else {
      onAdd(result);
      closeModal();
    }
  };

  return (
    <>
      <FullRoundedButton onClick={openModal} className="mb-4" disabled={!enabled}>Add Review</FullRoundedButton>

      <AddReviewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreate={handleSubmit}
      />
    </>
  )
}

export default AddNewReview;