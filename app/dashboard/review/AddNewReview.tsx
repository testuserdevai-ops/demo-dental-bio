'use client'
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import React, { useState } from "react"
import { toast } from 'react-toastify';
import AddReviewModal from "./components/AddReviewModal";

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

  const openModal = () => {
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const uploadImage = async (image: File) => {
    const formData = new FormData();
    formData.append('bucket_name', 'review-images');
    formData.append('image', image);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    const result = await response.json();

    if (response.ok) {
      // console.log(`Image uploaded successfully! URL: ${result.publicUrl}`);
      return result.publicUrl;
    } else {
      console.log(`Error: ${result.error}`);
    }
  }

  const handleSubmit = async (formData: ReviewType, image_file: File | null) => {
    const image_url = image_file ? await uploadImage(image_file) : "";
    // const image_url = '';

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