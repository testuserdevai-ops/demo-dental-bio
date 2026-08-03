"use client";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import React, { useState } from "react";
import AddGalleryModal from "./components/AddGalleryModal";
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";
import { apiClient } from "@/services/apiClient";

type AddNewGalleryProps = {
  onAdd: (gallery: any) => void;
  onAddGeneral: (gallery: any) => void;
  targetUserId: string | null;
  enabled?: boolean;
};

const AddNewGallery: React.FC<AddNewGalleryProps> = ({
  onAdd,
  onAddGeneral,
  targetUserId,
  enabled = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { uploadFile } = useUppyWithSupabase({ bucketName: "gallery-images" });

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const uploadImage = async (image: File) => {
    const url = await uploadFile(image);
    return url || "";
  };

  const handleSubmit = async (formData: {
    title: string;
    before_image: File | null;
    after_image: File | null;
    before_image_label: string;
    after_image_label: string;
  }) => {
    const before_image_url = formData.before_image
      ? await uploadImage(formData.before_image)
      : "";
    const after_image_url = formData.after_image
      ? await uploadImage(formData.after_image)
      : "";
    try {
      const result = await apiClient.post("/api/galleries", {
        ...formData,
        before_image_url,
        after_image_url,
        targetUserId,
      });
      onAdd(result);
      closeModal();
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const handleGeneralSubmit = async (formData: {
    title: string;
    before_image: File | null;
  }) => {
    const general_image_url = formData.before_image
      ? await uploadImage(formData.before_image)
      : "";

    closeModal();
  };

  return (
    <>
      <FullRoundedButton onClick={openModal} disabled={!enabled}>
        Add Gallery
      </FullRoundedButton>

      <AddGalleryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onGeneralSubmit={handleGeneralSubmit} // Assuming you have a general submit handler
      />
    </>
  );
};

export default AddNewGallery;
