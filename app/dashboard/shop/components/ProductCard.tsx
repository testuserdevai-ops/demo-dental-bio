'use client'
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer } from "react"
import BaseCard from "@/app/components/Card/BaseCard"

type ProductCardProps = ProductType & {
  onUpdate: (product: ProductType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  onUpdate,
  onEditItem,
  onDelete,
  ...productProps
}: ProductCardProps) => {
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, productProps.enabled!);

  useEffect(() => {
    if (productProps.enabled !== isActive) {
      const product = {
        id: productProps.id, enabled: isActive
      }
      onUpdate(product, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(productProps.id!);
  }

  return (
    <BaseCard
      movable
      className="bg-white"
      handleType="caret"
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete product?"
      deleteConfirmDescription="Are you sure you want to delete the product?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
    >
      <div className="text-[14px] overflow-hidden">
        <div className="flex flex-1 items-center truncate gap-2">
          <div className="text-primary-1 font-bold truncate">{productProps.name}</div>
          <PencilSimpleIcon
            size={18}
            className="cursor-pointer flex-shrink-0 hover:text-primary-1"
            onClick={() => onEditItem(productProps.id!)}
          />
        </div>
      </div>
    </BaseCard>
  )
}

export default ProductCard;