'use client'
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import React, { useState } from "react"
import AddIndividualProductModal from "./AddIndividualProductModal";
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";
import { apiClient } from '@/services/apiClient';

type AddNewProductProps = {
  onAdd: (product: any) => void;
  targetUserId: string;
  enabled: boolean;
}

const AddIndividualProduct: React.FC<AddNewProductProps> = ({
  onAdd,
  targetUserId,
  enabled,
}: AddNewProductProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { uploadFile } = useUppyWithSupabase({ bucketName: 'product-images' });

  const openModal = () => {
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const handleSubmit = async (formData: IndividualProductType, image: File | null) => {
    const image_url = image ? (await uploadFile(image)) || "" : "";

    try {
      const result = await apiClient.post('/api/individual-products', { ...formData, image_url, targetUserId });
      onAdd(result);
      closeModal();
    } catch (error: any) {
      console.log(error.message);
    }
  };

  return (
    <>
      <FullRoundedButton onClick={openModal} className="mb-4" disabled={!enabled}>Add Product</FullRoundedButton>

      <AddIndividualProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  )
}

export default AddIndividualProduct;